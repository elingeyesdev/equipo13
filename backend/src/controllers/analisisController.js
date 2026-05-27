import { pool } from '../config/database.js';
import { prorratearCIF } from '../services/calculoCif.js';
import { calcularPuntoEquilibrio } from '../services/puntoEquilibrio.js';

// ──────────────────────────────────────────────
// COSTOS Y DETALLES
// ──────────────────────────────────────────────

export const getCostosDetalle = async (req, res) => {
  const { negocioId, id } = req.params;
  try {
    const loteCheck = await pool.query(
      'SELECT id, costo_adquisicion FROM lotes WHERE id = $1 AND negocio_id = $2',
      [id, negocioId]
    );
    if (!loteCheck.rows.length) {
      return res.status(404).json({ error: 'Lote no encontrado' });
    }
    const costo_adquisicion = parseFloat(loteCheck.rows[0].costo_adquisicion) || 0;

    const { rows } = await pool.query(
      `SELECT
         COALESCE(
           c.tipo,
           CASE
             WHEN b.tipo ILIKE '%aliment%'
               OR b.tipo ILIKE '%balanceado%'
               OR b.tipo ILIKE '%forraje%'
               OR b.tipo ILIKE '%pastura%'
               OR b.tipo ILIKE '%silaje%'
               OR b.tipo ILIKE '%suplement%'
               OR b.tipo ILIKE '%grano%'
               OR b.tipo ILIKE '%maiz%'
               OR b.tipo ILIKE '%maíz%'
               OR b.tipo ILIKE '%heno%'        THEN 'alimento'
             WHEN b.tipo ILIKE '%sanidad%'
               OR b.tipo ILIKE '%medicament%'
               OR b.tipo ILIKE '%vacuna%'
               OR b.tipo ILIKE '%veterinari%'
               OR b.tipo ILIKE '%antibiot%'
               OR b.tipo ILIKE '%desparasit%'  THEN 'sanidad'
             WHEN b.tipo ILIKE '%mano de obra%'
               OR b.tipo ILIKE '%jornal%'
               OR b.tipo ILIKE '%peón%'
               OR b.tipo ILIKE '%peon%'
               OR b.tipo ILIKE '%personal%'    THEN 'mano_obra'
             ELSE                                   'otros'
           END
         ) AS bucket,
         COALESCE(SUM(b.monto), 0)::float AS total
       FROM bitacora_lote b
       LEFT JOIN lotes l ON l.id = b.lote_id
       LEFT JOIN categorias_insumos c
         ON c.nombre = b.tipo AND c.negocio_id = l.negocio_id
       WHERE b.lote_id = $1
         AND b.es_baja = false
         AND b.monto IS NOT NULL
       GROUP BY bucket`,
      [id]
    );

    const detalle = { alimento: 0, sanidad: 0, mano_obra: 0, otros: 0 };
    for (const row of rows) {
      if (row.bucket in detalle) {
        detalle[row.bucket] = Number(row.total);
      } else {
        detalle.otros += Number(row.total);
      }
    }

    // CIF prorrateado (Sprint 2 Entregable 1): suma los gastos indirectos
    // mensuales del negocio prorrateados según el método configurado.
    const { rows: gastos } = await pool.query(
      'SELECT * FROM gastos_cif WHERE negocio_id = $1 AND activo = true',
      [negocioId],
    );
    let cif = 0;
    let cif_detalle = [];
    if (gastos.length) {
      const { rows: loteRows } = await pool.query(
        'SELECT cabezas_activas, peso_actual_prom FROM lotes WHERE id = $1',
        [id],
      );
      const loteKilos = (Number(loteRows[0]?.cabezas_activas) || 0) * (Number(loteRows[0]?.peso_actual_prom) || 0);
      const { rows: totRows } = await pool.query(
        `SELECT COALESCE(SUM(cabezas_activas * peso_actual_prom), 0) AS total_kilos, COUNT(*) AS lotes_activos
           FROM lotes WHERE negocio_id = $1 AND activo = true`,
        [negocioId],
      );
      const prorrateo = prorratearCIF({
        gastos,
        loteKilos,
        totalKilosNegocio: Number(totRows[0].total_kilos) || 0,
        lotesActivosNegocio: Number(totRows[0].lotes_activos) || 1,
      });
      cif = prorrateo.cif_total_prorrateado;
      cif_detalle = prorrateo.detalle;
    }

    const total = costo_adquisicion + detalle.alimento + detalle.sanidad + detalle.mano_obra + detalle.otros + cif;
    res.json({ adquisicion: costo_adquisicion, ...detalle, cif, cif_detalle, total });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
};

// ──────────────────────────────────────────────
// ESCENARIOS
// ──────────────────────────────────────────────

export const getEscenarios = async (req, res) => {
  const { negocioId, id } = req.params;
  const {
    pvp_vivo,
    pvp_gancho,
    gastos_faena,
    rendimiento_canal,
    precios_cortes,
  } = req.body;

  const pvpVivo = Number(pvp_vivo);
  const pvpGancho = Number(pvp_gancho);
  const gastosFaena = gastos_faena == null ? 0 : Number(gastos_faena);
  const rendCanalParam = rendimiento_canal == null ? 75 : Number(rendimiento_canal);

  if (!Number.isFinite(pvpVivo) || pvpVivo < 0) {
    return res.status(400).json({ error: 'pvp_vivo es requerido y debe ser >= 0' });
  }
  if (!Number.isFinite(pvpGancho) || pvpGancho < 0) {
    return res.status(400).json({ error: 'pvp_gancho es requerido y debe ser >= 0' });
  }

  try {
    const { rows: loteRows } = await pool.query(
      `SELECT l.*,
              l.costo_adquisicion + COALESCE((
                SELECT SUM(b.monto)
                FROM bitacora_lote b
                WHERE b.lote_id = l.id AND b.es_baja = false AND b.monto IS NOT NULL
              ), 0) AS costo_base
       FROM lotes l
       WHERE l.id = $1 AND l.negocio_id = $2`,
      [id, negocioId]
    );
    if (!loteRows.length) {
      return res.status(404).json({ error: 'Lote no encontrado' });
    }
    const lote = loteRows[0];
    const costo_base = Number(lote.costo_base);

    // Pesos: usar liquidacion_jsonb si el lote ya fue liquidado, sino estimar con datos actuales
    let peso_total_pie, peso_total_gancho, rendCanalUsado;
    const liq = lote.liquidacion_jsonb;
    if (liq && liq.peso_total_pie) {
      peso_total_pie = Number(liq.peso_total_pie);
      peso_total_gancho = Number(liq.peso_total_gancho);
      rendCanalUsado = Number(liq.rendimiento_canal);
    } else {
      const cabezas = Number(lote.cabezas_activas) || 0;
      const pesoProm = Number(lote.peso_actual_prom) || 0;
      peso_total_pie = cabezas * pesoProm;
      rendCanalUsado = rendCanalParam;
      peso_total_gancho = peso_total_pie * rendCanalUsado / 100;
    }

    // Gastos de faena solo aplican a venta canal/cortes, no a venta en vivo
    const costo_con_faena = costo_base + gastosFaena;

    // Escenario 1 — Vivo
    const ingreso_vivo = peso_total_pie * pvpVivo;
    const utilidad_vivo = ingreso_vivo - costo_base;
    const margen_vivo = ingreso_vivo > 0 ? (utilidad_vivo / ingreso_vivo) * 100 : null;

    // Escenario 2 — Gancho
    const ingreso_gancho = peso_total_gancho * pvpGancho;
    const utilidad_gancho = ingreso_gancho - costo_con_faena;
    const margen_gancho = ingreso_gancho > 0 ? (utilidad_gancho / ingreso_gancho) * 100 : null;

    // Escenario 3 — Por cortes (opcional, solo si vienen precios)
    let escenario_cortes = null;
    const cortesInput = Array.isArray(precios_cortes) ? precios_cortes : [];
    if (cortesInput.length > 0) {
      const { rows: cortesDB } = await pool.query(
        'SELECT * FROM despiece_cortes WHERE lote_id = $1',
        [id]
      );
      const cortesMap = new Map(cortesDB.map(c => [c.id, c]));

      let ingreso_cortes = 0;
      const desglose = [];
      for (const pc of cortesInput) {
        const corte = cortesMap.get(pc.corte_id);
        if (!corte) continue;
        const pvp = Number(pc.pvp);
        if (!Number.isFinite(pvp) || pvp < 0) continue;
        const subtotal = Number(corte.peso_kg) * pvp;
        ingreso_cortes += subtotal;
        desglose.push({ nombre: corte.nombre, peso_kg: Number(corte.peso_kg), pvp, subtotal });
      }

      const utilidad_cortes = ingreso_cortes - costo_con_faena;
      const margen_cortes = ingreso_cortes > 0 ? (utilidad_cortes / ingreso_cortes) * 100 : null;
      escenario_cortes = {
        ingreso: ingreso_cortes,
        costo: costo_con_faena,
        utilidad: utilidad_cortes,
        margen: margen_cortes,
        desglose,
      };
    }

    // Recomendación: escenario con mayor utilidad
    const opciones = [
      { key: 'vivo', utilidad: utilidad_vivo },
      { key: 'gancho', utilidad: utilidad_gancho },
    ];
    if (escenario_cortes !== null) {
      opciones.push({ key: 'cortes', utilidad: escenario_cortes.utilidad });
    }
    const ganador = opciones.reduce((best, op) => op.utilidad > best.utilidad ? op : best);

    res.json({
      vivo:   { ingreso: ingreso_vivo,   costo: costo_base,       utilidad: utilidad_vivo,   margen: margen_vivo },
      gancho: { ingreso: ingreso_gancho, costo: costo_con_faena,  utilidad: utilidad_gancho, margen: margen_gancho },
      cortes: escenario_cortes,
      recomendacion: ganador.key,
      desglose: {
        peso_total_pie,
        peso_total_gancho,
        rendimiento_canal: rendCanalUsado,
        costo_base,
        gastos_faena: gastosFaena,
        costo_con_faena,
      },
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
};

// ──────────────────────────────────────────────
// ICA — Conversión alimenticia
// ──────────────────────────────────────────────

export const getIca = async (req, res) => {
  const { negocioId, id } = req.params;
  try {
    const { rows: loteRows } = await pool.query(
      'SELECT * FROM lotes WHERE id = $1 AND negocio_id = $2',
      [id, negocioId]
    );
    if (!loteRows.length) {
      return res.status(404).json({ error: 'Lote no encontrado' });
    }
    const lote = loteRows[0];

    const { rows: alimentoRows } = await pool.query(
      `SELECT COALESCE(SUM(b.cantidad_kg), 0) AS kg_alimento
       FROM bitacora_lote b
       LEFT JOIN lotes l ON l.id = b.lote_id
       LEFT JOIN categorias_insumos c
         ON c.nombre = b.tipo AND c.negocio_id = l.negocio_id
       WHERE b.lote_id = $1
         AND b.es_baja = false
         AND b.cantidad_kg IS NOT NULL
         AND COALESCE(
               c.tipo,
               CASE
                 WHEN b.tipo ILIKE '%aliment%'
                   OR b.tipo ILIKE '%balanceado%'
                   OR b.tipo ILIKE '%forraje%'
                   OR b.tipo ILIKE '%pastura%'
                   OR b.tipo ILIKE '%silaje%'
                   OR b.tipo ILIKE '%suplement%'
                   OR b.tipo ILIKE '%grano%'
                   OR b.tipo ILIKE '%maiz%'
                   OR b.tipo ILIKE '%maíz%'
                   OR b.tipo ILIKE '%heno%' THEN 'alimento'
                 ELSE 'otros'
               END
             ) = 'alimento'`,
      [id]
    );
    const kg_alimento = Number(alimentoRows[0].kg_alimento);

    const pesoActual = Number(lote.peso_actual_prom) || 0;
    const pesoInicial = Number(lote.peso_inicial_prom) || 0;
    const cabezas = Number(lote.cabezas_activas) || 0;
    const kg_ganados = (pesoActual - pesoInicial) * cabezas;

    if (kg_ganados <= 0) {
      return res.status(422).json({
        error: 'No se puede calcular ICa: el peso actual no supera el peso inicial o no hay cabezas activas',
        kg_alimento,
        kg_ganados,
      });
    }

    const ica = kg_alimento / kg_ganados;

    let estado;
    if (ica <= 3.0) estado = 'verde';
    else if (ica <= 3.5) estado = 'ambar';
    else estado = 'rojo';

    res.json({
      kg_alimento,
      kg_ganados,
      ica,
      referencia: '2.5-3.0',
      estado,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
};

// ──────────────────────────────────────────────
// PUNTO DE EQUILIBRIO
// ──────────────────────────────────────────────

export const getPuntoEquilibrio = async (req, res) => {
  const { negocioId, loteId } = req.params;
  try {
    const resultado = await calcularPuntoEquilibrio(pool, { negocioId, loteId });
    res.json(resultado);
  } catch (err) {
    console.error(err);
    const status = err.status || 500;
    res.status(status).json({ error: err.message });
  }
};
