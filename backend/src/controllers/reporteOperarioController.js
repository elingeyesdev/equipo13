import { pool } from '../config/database.js';

export async function getReporteProductividad(req, res) {
  const { negocioId } = req.params;
  try {
    const { rows } = await pool.query(
      `
      WITH operarios AS (
        SELECT u.id, u.nombre
        FROM users u
        JOIN membresias m ON m.user_id = u.id AND m.negocio_id = $1 AND m.rol = 'operario'
      ),
      tareas_stats AS (
        SELECT asignado_a AS user_id,
               COUNT(*) AS total_tareas,
               SUM(CASE WHEN estado = 'completada' THEN 1 ELSE 0 END) AS tareas_completadas
        FROM tareas
        WHERE negocio_id = $1 AND asignado_a IS NOT NULL
        GROUP BY asignado_a
      ),
      checklist_stats AS (
        SELECT cd.operario_user_id AS user_id,
               COUNT(*) AS total_checklist,
               SUM(CASE WHEN cd.completado THEN 1 ELSE 0 END) AS checklist_completados
        FROM checklist_dia cd
        JOIN lotes l ON l.id = cd.lote_id
        WHERE l.negocio_id = $1 AND cd.operario_user_id IS NOT NULL
        GROUP BY cd.operario_user_id
      ),
      eventos_stats AS (
        SELECT operario_user_id AS user_id,
               COUNT(*) AS total_eventos,
               SUM(CASE WHEN tipo = 'baja' THEN 1 ELSE 0 END) AS eventos_baja,
               SUM(CASE WHEN tipo = 'incidente' THEN 1 ELSE 0 END) AS eventos_incidente
        FROM eventos_operario
        WHERE negocio_id = $1 AND operario_user_id IS NOT NULL
        GROUP BY operario_user_id
      )
      SELECT
        o.id,
        o.nombre,
        COALESCE(t.total_tareas, 0)::int AS total_tareas,
        COALESCE(t.tareas_completadas, 0)::int AS tareas_completadas,
        COALESCE(c.total_checklist, 0)::int AS total_checklist,
        COALESCE(c.checklist_completados, 0)::int AS checklist_completados,
        COALESCE(e.total_eventos, 0)::int AS total_eventos,
        COALESCE(e.eventos_baja, 0)::int AS eventos_baja,
        COALESCE(e.eventos_incidente, 0)::int AS eventos_incidente
      FROM operarios o
      LEFT JOIN tareas_stats t ON t.user_id = o.id
      LEFT JOIN checklist_stats c ON c.user_id = o.id
      LEFT JOIN eventos_stats e ON e.user_id = o.id
      ORDER BY o.nombre
      `,
      [negocioId]
    );
    res.json(rows);
  } catch (error) {
    console.error('getReporteProductividad error:', error);
    res.status(500).json({ error: error.message });
  }
}
