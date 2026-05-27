/**
 * Servicio puro: Motor Dinámico del Punto de Equilibrio para un lote.
 *
 * Concepto:
 *   punto_equilibrio = costo_total_lote / peso_neto_util_final
 *   donde:
 *     costo_total_lote     = MPD (adquisición + insumos) + MOD + CIF prorrateado
 *     peso_neto_util_final = peso_bruto_total - SUM(merma_kg de los 4 nodos)
 *
 * Dependencias:
 *   - prorratearCIF  (services/calculoCif.js)   — Entregable 1 de Jairo
 *   - tabla registro_mermas                      — Entregable 3 de Gerardo
 */

import { prorratearCIF } from './calculoCif.js';

const r4 = n => Math.round(n * 10000) / 10000;

/**
 * Calcula el Punto de Equilibrio dinámico de un lote.
 *
 * @param {import('pg').Pool} pool
 * @param {{ negocioId: string, loteId: string }} params
 * @returns {Promise<object>} JSON estructurado con desglose_costos, pesos y punto_equilibrio_bs_por_kg
 */
export async function calcularPuntoEquilibrio(pool, { negocioId, loteId }) {
  // ── 1. Cargar datos básicos del lote ─────────────────────────
  const loteRes = await pool.query(
    `SELECT id, identificador, tipo_animal,
            cabezas_activas, peso_actual_prom, costo_adquisicion
     FROM lotes
     WHERE id = $1 AND negocio_id = $2`,
    [loteId, negocioId]
  );
  if (!loteRes.rows.length) {
    throw Object.assign(new Error('Lote no encontrado'), { status: 404 });
  }
  const lote = loteRes.rows[0];

  const cabezas   = r4(Number(lote.cabezas_activas)  || 0);
  const pesoProm  = r4(Number(lote.peso_actual_prom) || 0);
  const costoAdq  = r4(Number(lote.costo_adquisicion) || 0);

  // ── 2. costo_mpd = adquisición + Balanceado/Alimentación de bitácora ─
  // Traemos también TODOS los costos no-baja para manejar el desglose fino
  const bitDetalleRes = await pool.query(
    `SELECT tipo, COALESCE(SUM(monto), 0)::float AS total
     FROM bitacora_lote
     WHERE lote_id = $1 AND es_baja = false AND monto IS NOT NULL
     GROUP BY tipo`,
    [loteId]
  );

  // Construir desglose por tipo
  const porTipo = {};
  for (const row of bitDetalleRes.rows) {
    porTipo[row.tipo] = Number(row.total);
  }

  // MPD: adquisición + insumos de alimentación/balanceado
  const sumAlimento = Object.entries(porTipo)
    .filter(([t]) => /aliment|balanceado|insumo|alim/i.test(t))
    .reduce((acc, [, v]) => acc + v, 0);
  const costo_mpd = r4(costoAdq + sumAlimento);

  // ── 3. costo_mod ──────────────────────────────────────────────
  const costo_mod = r4(
    Object.entries(porTipo)
      .filter(([t]) => /mano.de.obra|mdo|mod/i.test(t))
      .reduce((acc, [, v]) => acc + v, 0)
  );

  // ── 4. costo_sanidad ─────────────────────────────────────────
  const costo_sanidad = r4(
    Object.entries(porTipo)
      .filter(([t]) => /sanidad|medicament|veterin|salud/i.test(t))
      .reduce((acc, [, v]) => acc + v, 0)
  );

  // ── 5. CIF prorrateado ───────────────────────────────────────
  // Cargar gastos CIF activos del negocio
  const cifGastosRes = await pool.query(
    `SELECT * FROM gastos_cif WHERE negocio_id = $1 AND activo = true`,
    [negocioId]
  );

  // Para prorratear necesitamos datos de contexto del negocio
  const lotesActivosRes = await pool.query(
    `SELECT COUNT(*)::int AS cant FROM lotes WHERE negocio_id = $1 AND activo = true`,
    [negocioId]
  );
  const totalKilosRes = await pool.query(
    `SELECT COALESCE(SUM(cabezas_activas * peso_actual_prom), 0)::float AS total
     FROM lotes WHERE negocio_id = $1 AND activo = true`,
    [negocioId]
  );

  const peso_bruto_lote = r4(cabezas * pesoProm);
  const lotesActivos    = lotesActivosRes.rows[0].cant || 1;
  const totalKilos      = r4(Number(totalKilosRes.rows[0].total) || 1);

  const { cif_total_prorrateado, detalle: detalle_cif } = prorratearCIF({
    gastos: cifGastosRes.rows,
    loteKilos: peso_bruto_lote,
    loteHoras: 0,
    totalKilosNegocio: totalKilos,
    totalHorasNegocio: 0,
    lotesActivosNegocio: lotesActivos,
  });
  const costo_cif = r4(cif_total_prorrateado);

  // ── 6. costo_total ───────────────────────────────────────────
  const costo_total = r4(costo_mpd + costo_mod + costo_sanidad + costo_cif);

  // ── 7. peso_bruto_total ──────────────────────────────────────
  const peso_bruto_total = peso_bruto_lote; // ya calculado arriba

  // ── 8. merma_total_kg y desglose por tipo ───────────────────
  const mermasRes = await pool.query(
    `SELECT tipo,
            SUM(kg_merma)::float           AS kg,
            SUM(peso_inicial)::float       AS peso_inicial,
            AVG(porcentaje_merma)::float   AS pct_prom
     FROM registro_mermas
     WHERE lote_id = $1 AND activo = true
     GROUP BY tipo
     ORDER BY tipo ASC`,
    [loteId]
  );

  const mermas_por_tipo = {};
  let merma_total_kg = 0;
  for (const m of mermasRes.rows) {
    mermas_por_tipo[m.tipo] = {
      kg: r4(Number(m.kg)),
      peso_inicial: r4(Number(m.peso_inicial)),
      pct_promedio: r4(Number(m.pct_prom)),
    };
    merma_total_kg = r4(merma_total_kg + Number(m.kg));
  }

  // ── 9. peso_neto_util ────────────────────────────────────────
  const peso_neto_util = r4(Math.max(0, peso_bruto_total - merma_total_kg));

  // ── 10. punto_equilibrio ─────────────────────────────────────
  const punto_equilibrio_bs_por_kg = peso_neto_util > 0
    ? r4(costo_total / peso_neto_util)
    : null;

  // ── 11. Respuesta estructurada ───────────────────────────────
  return {
    lote_id: loteId,
    lote_identificador: lote.identificador,
    desglose_costos: {
      mpd:     costo_mpd,
      mod:     costo_mod,
      sanidad: costo_sanidad,
      cif:     costo_cif,
      total:   costo_total,
      detalle_cif,
    },
    pesos: {
      bruto_total_kg: peso_bruto_total,
      merma_total_kg,
      neto_util_kg:   peso_neto_util,
      mermas_por_tipo,
    },
    punto_equilibrio_bs_por_kg,
  };
}
