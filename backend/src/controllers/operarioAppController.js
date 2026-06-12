import { pool } from '../config/database.js';

// GET /api/operario/lotes
export async function misLotes(req, res) {
  const negocioId = req.user.negocio_id;
  const hoy = new Date().toISOString().split('T')[0];
  try {
    const { rows } = await pool.query(
      `SELECT l.id, l.identificador, l.tipo_animal, l.cabezas_activas,
              l.fecha_entrada, l.peso_actual_prom,
              EXISTS (
                SELECT 1 FROM registro_diario_lote r
                 WHERE r.lote_id = l.id AND r.fecha = CURRENT_DATE
              ) AS tiene_registro_hoy,
              EXISTS (
                SELECT 1 FROM registro_diario_lote r
                 WHERE r.lote_id = l.id AND r.fecha = CURRENT_DATE AND r.confirmado
              ) AS confirmado_hoy
         FROM operario_lote ol
         JOIN lotes l ON l.id = ol.lote_id
        WHERE ol.operario_user_id = $1 AND ol.negocio_id = $2
          AND ol.activo = true AND l.activo = true
        ORDER BY l.identificador`,
      [req.user.id, negocioId]
    );
    res.json(rows);
  } catch (err) {
    console.error('misLotes error:', err);
    res.status(500).json({ error: err.message });
  }
}

// GET /api/operario/perfil  (datos de sesión + catálogos básicos)
export async function miPerfil(req, res) {
  try {
    const { rows } = await pool.query(
      `SELECT u.id, u.nombre, u.username, n.id AS negocio_id, n.nombre AS negocio_nombre, n.moneda
         FROM users u
         JOIN negocios n ON n.id = $2
        WHERE u.id = $1`,
      [req.user.id, req.user.negocio_id]
    );
    if (!rows.length) return res.status(404).json({ error: 'Operario no encontrado' });
    res.json(rows[0]);
  } catch (err) {
    console.error('miPerfil error:', err);
    res.status(500).json({ error: err.message });
  }
}

// GET /api/operario/insumos  (para el formulario de registro)
export async function listarInsumosOperario(req, res) {
  try {
    const { rows } = await pool.query(
      `SELECT i.id, i.nombre, i.unidad_id, um.simbolo AS unidad_simbolo
         FROM insumos i
         LEFT JOIN unidades_medida um ON um.id = i.unidad_id
        WHERE i.negocio_id = $1 AND i.activo = true
        ORDER BY i.nombre`,
      [req.user.negocio_id]
    );
    res.json(rows);
  } catch (err) {
    console.error('listarInsumosOperario error:', err);
    res.status(500).json({ error: err.message });
  }
}
