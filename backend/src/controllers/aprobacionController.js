import { pool } from '../config/database.js';

// GET /api/negocios/:negocioId/pendientes/registros
export async function listarRegistrosPendientes(req, res) {
  const { negocioId } = req.params;
  try {
    const { rows } = await pool.query(
      `SELECT r.id, r.lote_id, r.fecha, r.notas_del_dia, r.peso_promedio_kg, r.created_at,
              l.identificador AS lote_identificador,
              COUNT(i.id) AS items_count
         FROM registro_diario_lote r
         JOIN lotes l ON l.id = r.lote_id
         LEFT JOIN registro_diario_item i ON i.registro_diario_id = r.id
        WHERE r.negocio_id = $1 AND r.confirmado = false
        GROUP BY r.id, l.identificador
        ORDER BY r.fecha DESC, r.created_at DESC`,
      [negocioId]
    );
    res.json(rows);
  } catch (err) {
    console.error('listarRegistrosPendientes error:', err);
    res.status(500).json({ error: err.message });
  }
}
