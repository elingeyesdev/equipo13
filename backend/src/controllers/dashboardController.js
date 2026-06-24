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
        ica_promedio: null,
      },
      pesos_por_lote: [],
      costos_categoria: [],
      ica_por_lote: [],
      mortandad_serie: [],
      lotes_resumen: [],
      ultimo_liquidado: null,
      actividad_reciente: [],
    });
  } catch (err) {
    console.error('getDashboard error:', err);
    res.status(500).json({ error: err.message });
  }
}
