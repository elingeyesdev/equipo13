import { pool } from '../config/database.js';

// Mapeo de rango -> intervalo SQL. 'todo' = sin filtro de fecha.
const RANGO_TO_DAYS = { '7d': 7, '30d': 30, '90d': 90, 'todo': null };

function parseRango(raw) {
  return Object.prototype.hasOwnProperty.call(RANGO_TO_DAYS, raw) ? raw : '30d';
}

function fechaDesdePorRango(rango) {
  const dias = RANGO_TO_DAYS[rango];
  if (dias === null) return null;
  const d = new Date();
  d.setDate(d.getDate() - dias);
  return d.toISOString().slice(0, 10); // 'YYYY-MM-DD'
}

// Paleta cíclica para series de lotes (consistente entre los 3 charts).
export const PALETA_LOTES = ['#2E7D32', '#1976D2', '#ED6C02', '#9C27B0', '#0097A7', '#5D4037'];

export function colorParaLote(idx) {
  return PALETA_LOTES[idx % PALETA_LOTES.length];
}

// Umbrales de ICA alineados con backend/src/controllers/analisisController.js:332
// (verde <=3.0, ámbar <=3.5, rojo >3.5). El benchmark visual ideal es 2.5.
export function statusIca(ica) {
  if (ica == null) return 'sin_dato';
  if (ica <= 3.0) return 'bueno';
  if (ica <= 3.5) return 'aceptable';
  return 'malo';
}

export async function getDashboard(req, res) {
  const { negocioId } = req.params;
  const rango = parseRango(req.query.rango);
  const fechaDesde = fechaDesdePorRango(rango);

  try {
    // KPIs agregados de lotes activos
    const kpisResult = await pool.query(
      `SELECT
         COUNT(*)::int AS lotes_activos,
         COALESCE(SUM(l.cabezas_inicio), 0)::int AS cabezas_inicio,
         COALESCE(SUM(l.cabezas_activas), 0)::int AS cabezas_activas,
         COALESCE(SUM(l.costo_adquisicion), 0)::float AS costo_adquisicion_total,
         COALESCE((
           SELECT SUM(b.monto)
           FROM bitacora_lote b
           JOIN lotes l2 ON l2.id = b.lote_id
           WHERE l2.negocio_id = $1
             AND l2.activo = TRUE
             AND b.es_baja = false
             AND b.monto IS NOT NULL
         ), 0)::float AS costo_bitacora_total
       FROM lotes l
       WHERE l.negocio_id = $1 AND l.activo = TRUE`,
      [negocioId]
    );
    const k = kpisResult.rows[0];
    const cabezasActivas = Number(k.cabezas_activas);
    const cabezasInicio = Number(k.cabezas_inicio);
    const costoTotal = Number(k.costo_adquisicion_total) + Number(k.costo_bitacora_total);

    // Pesos históricos por lote activo, filtrados por rango.
    // El punto inicial sintético (fecha_entrada, peso_inicial_prom) se inyecta
    // siempre para que cada serie empiece desde el día 0 del lote.
    const pesosResult = await pool.query(
      `SELECT l.id AS lote_id, l.identificador, l.fecha_entrada, l.peso_inicial_prom,
              p.fecha, p.peso_prom_kg
       FROM lotes l
       LEFT JOIN pesajes_lote p ON p.lote_id = l.id
         AND ($2::date IS NULL OR p.fecha >= $2)
       WHERE l.negocio_id = $1 AND l.activo = TRUE
       ORDER BY l.identificador, p.fecha`,
      [negocioId, fechaDesde]
    );
    // Agrupar por lote_id
    const pesosMap = new Map();
    for (const row of pesosResult.rows) {
      if (!pesosMap.has(row.lote_id)) {
        const fechaEntradaIso = row.fecha_entrada ? new Date(row.fecha_entrada).toISOString().slice(0, 10) : null;
        const incluirInicial = fechaEntradaIso && (!fechaDesde || fechaEntradaIso >= fechaDesde);
        pesosMap.set(row.lote_id, {
          lote_id: row.lote_id,
          identificador: row.identificador,
          color: colorParaLote(pesosMap.size),
          puntos: incluirInicial && row.peso_inicial_prom != null
            ? [{ fecha: fechaEntradaIso, peso: Number(row.peso_inicial_prom) }]
            : [],
        });
      }
      if (row.fecha && row.peso_prom_kg != null) {
        pesosMap.get(row.lote_id).puntos.push({
          fecha: new Date(row.fecha).toISOString().slice(0, 10),
          peso: Number(row.peso_prom_kg),
        });
      }
    }
    const pesos_por_lote = Array.from(pesosMap.values());

    // Composición de costos: adquisición + categorías de bitácora_lote.
    // Mapea cualquier tipo que contenga 'aliment', 'balanceado', 'forraje' a "Alimentación"
    // para tolerar variaciones del seeder y del catálogo de servicios.
    const costosResult = await pool.query(
      `WITH bitac AS (
         SELECT
           CASE
             WHEN b.tipo ILIKE '%aliment%'
               OR b.tipo ILIKE '%balanceado%'
               OR b.tipo ILIKE '%forraje%'
               OR b.tipo ILIKE '%pastura%'
               OR b.tipo ILIKE '%silaje%'
               OR b.tipo ILIKE '%grano%' THEN 'Alimentación'
             WHEN b.tipo ILIKE '%sanidad%' OR b.tipo ILIKE '%medic%' THEN 'Sanidad'
             WHEN b.tipo ILIKE '%mano%obra%' OR b.tipo = 'Mano de obra' THEN 'Mano de obra'
             ELSE 'Otros'
           END AS categoria,
           SUM(b.monto)::float AS monto
         FROM bitacora_lote b
         JOIN lotes l ON l.id = b.lote_id
         WHERE l.negocio_id = $1
           AND l.activo = TRUE
           AND b.es_baja = false
           AND b.monto IS NOT NULL
           AND ($2::date IS NULL OR b.fecha >= $2)
         GROUP BY categoria
       ),
       adq AS (
         SELECT 'Adquisición' AS categoria, COALESCE(SUM(costo_adquisicion), 0)::float AS monto
         FROM lotes
         WHERE negocio_id = $1 AND activo = TRUE
       )
       SELECT * FROM adq
       UNION ALL
       SELECT * FROM bitac
       ORDER BY monto DESC`,
      [negocioId, fechaDesde]
    );
    const COLORES_CAT = {
      'Adquisición':  '#6B7280',
      'Alimentación': '#2E7D32',
      'Sanidad':      '#1976D2',
      'Mano de obra': '#ED6C02',
      'Otros':        '#9CA3AF',
    };
    const costos_categoria = costosResult.rows
      .filter(r => Number(r.monto) > 0)
      .map(r => ({
        categoria: r.categoria,
        monto: +Number(r.monto).toFixed(2),
        color: COLORES_CAT[r.categoria] || '#9CA3AF',
      }));

    // ICA por lote: kg de alimento consumido / kg de ganancia.
    // Usa el mismo patrón que analisisController.getIca (categoría + fallback ILIKE).
    const icaResult = await pool.query(
      `SELECT l.id AS lote_id, l.identificador,
              l.peso_inicial_prom, l.peso_actual_prom, l.cabezas_activas,
              COALESCE((
                SELECT SUM(b.cantidad_kg)
                FROM bitacora_lote b
                LEFT JOIN categorias_insumos c
                  ON c.nombre = b.tipo AND c.negocio_id = l.negocio_id
                WHERE b.lote_id = l.id
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
                      ) = 'alimento'
              ), 0)::float AS kg_alimento
       FROM lotes l
       WHERE l.negocio_id = $1 AND l.activo = TRUE
       ORDER BY l.identificador`,
      [negocioId]
    );
    const ica_por_lote = icaResult.rows.map(r => {
      const pesoActual = Number(r.peso_actual_prom) || 0;
      const pesoInicial = Number(r.peso_inicial_prom) || 0;
      const cabezas = Number(r.cabezas_activas) || 0;
      const kgGanancia = (pesoActual - pesoInicial) * cabezas;
      const kgAlimento = Number(r.kg_alimento);
      const ica = kgGanancia > 0 ? +(kgAlimento / kgGanancia).toFixed(2) : null;
      return {
        lote_id: r.lote_id,
        identificador: r.identificador,
        ica,
        kg_alimento: +kgAlimento.toFixed(2),
        kg_ganancia: +kgGanancia.toFixed(2),
        status: statusIca(ica),
      };
    });
    // Promedio ponderado por kg de ganancia (más justo que media simple).
    const totalGan = ica_por_lote.reduce((s, r) => s + (r.ica != null ? r.kg_ganancia : 0), 0);
    const totalAli = ica_por_lote.reduce((s, r) => s + (r.ica != null ? r.kg_alimento : 0), 0);
    const ica_promedio = totalGan > 0 ? +(totalAli / totalGan).toFixed(2) : null;

    // Mortandad acumulada por mes y por lote (área apilada en el frontend).
    const mortResult = await pool.query(
      `SELECT
         to_char(date_trunc('month', e.created_at), 'YYYY-MM') AS mes,
         l.identificador,
         COUNT(*)::int AS bajas
       FROM eventos_operario e
       JOIN lotes l ON l.id = e.lote_id
       WHERE e.negocio_id = $1
         AND e.tipo = 'baja'
         AND e.estado = 'aplicado'
         AND ($2::date IS NULL OR e.created_at >= $2::date)
       GROUP BY mes, l.identificador
       ORDER BY mes`,
      [negocioId, fechaDesde]
    );
    // Pivot a forma { mes, [identificador]: bajasAcumuladas }
    const mortByMes = new Map();
    const identsVistos = new Set();
    for (const r of mortResult.rows) {
      identsVistos.add(r.identificador);
      if (!mortByMes.has(r.mes)) mortByMes.set(r.mes, { mes: r.mes });
      mortByMes.get(r.mes)[r.identificador] = (mortByMes.get(r.mes)[r.identificador] || 0) + Number(r.bajas);
    }
    // Convertir a array ordenado y acumular por lote
    const mesesOrdenados = Array.from(mortByMes.values()).sort((a, b) => a.mes.localeCompare(b.mes));
    const acumPorLote = {};
    const mortandad_serie = mesesOrdenados.map(row => {
      const punto = { mes: row.mes };
      for (const ident of identsVistos) {
        acumPorLote[ident] = (acumPorLote[ident] || 0) + (row[ident] || 0);
        punto[ident] = acumPorLote[ident];
      }
      return punto;
    });

    // Último lote cerrado y actividad reciente (resumen para las cards del pie).
    const [liquidResult, actividadResult] = await Promise.all([
      pool.query(
        `SELECT id, identificador, tipo_animal, liquidacion_jsonb
         FROM lotes
         WHERE negocio_id = $1 AND activo = FALSE AND liquidacion_jsonb IS NOT NULL
         ORDER BY (liquidacion_jsonb->>'liquidado_en')::timestamptz DESC
         LIMIT 1`,
        [negocioId]
      ),
      pool.query(
        `SELECT id, identificador, tipo_animal, cabezas_inicio, created_at
         FROM lotes
         WHERE negocio_id = $1
         ORDER BY created_at DESC
         LIMIT 5`,
        [negocioId]
      ),
    ]);
    const ultimo_liquidado = liquidResult.rows[0] || null;
    const actividad_reciente = actividadResult.rows.map(l => ({
      tipo: 'lote_creado',
      texto: `Nuevo lote: ${l.identificador} · ${l.cabezas_inicio} ${l.tipo_animal === 'Cerdo' ? 'cerdos' : 'animales'}`,
      fecha: l.created_at,
    }));

    // Resumen de lotes activos con últimos pesajes para la tabla del dashboard.
    const resumenResult = await pool.query(
      `SELECT l.id, l.identificador, l.tipo_animal, l.cabezas_inicio,
              l.cabezas_activas, l.fecha_entrada,
              l.costo_adquisicion + COALESCE((
                SELECT SUM(b.monto)
                FROM bitacora_lote b
                WHERE b.lote_id = l.id AND b.es_baja = false AND b.monto IS NOT NULL
              ), 0)::float AS costo_total,
              COALESCE((
                SELECT array_agg(peso_prom_kg ORDER BY fecha DESC)
                FROM (
                  SELECT peso_prom_kg, fecha
                  FROM pesajes_lote
                  WHERE lote_id = l.id
                  ORDER BY fecha DESC
                  LIMIT 8
                ) ult
              ), '{}') AS pesajes_recientes
       FROM lotes l
       WHERE l.negocio_id = $1 AND l.activo = TRUE
       ORDER BY l.created_at DESC`,
      [negocioId]
    );
    const icaByLoteId = new Map(ica_por_lote.map(r => [r.lote_id, r.ica]));
    const lotes_resumen = resumenResult.rows.map(r => ({
      id: r.id,
      identificador: r.identificador,
      tipo_animal: r.tipo_animal,
      cabezas_activas: Number(r.cabezas_activas),
      cabezas_inicio: Number(r.cabezas_inicio),
      dias: r.fecha_entrada ? Math.floor((Date.now() - new Date(r.fecha_entrada).getTime()) / 86400000) : 0,
      costo_total: +Number(r.costo_total).toFixed(2),
      ica: icaByLoteId.get(r.id) ?? null,
      // Recharts y el sparkline esperan orden cronológico ascendente.
      pesajes_recientes: (r.pesajes_recientes || []).map(Number).reverse(),
    }));

    res.json({
      rango,
      fecha_desde: fechaDesde,
      kpis: {
        lotes_activos: Number(k.lotes_activos),
        cabezas_activas: cabezasActivas,
        cabezas_inicio: cabezasInicio,
        mortandad_pct: cabezasInicio > 0
          ? +(((cabezasInicio - cabezasActivas) / cabezasInicio) * 100).toFixed(2)
          : 0,
        costo_total: +costoTotal.toFixed(2),
        costo_por_cabeza: cabezasActivas > 0 ? +(costoTotal / cabezasActivas).toFixed(2) : 0,
        ica_promedio,
      },
      pesos_por_lote,
      costos_categoria,
      ica_por_lote,
      mortandad_serie,
      lotes_resumen,
      ultimo_liquidado,
      actividad_reciente,
    });
  } catch (err) {
    console.error('getDashboard error:', err);
    res.status(500).json({ error: err.message });
  }
}
