import { pool } from '../config/database.js';

export async function negocioOwner(req, res, next) {
  const { negocioId } = req.params;
  try {
    const result = await pool.query(
      'SELECT id, nombre FROM negocios WHERE id = $1 AND user_id = $2 AND activo = true',
      [negocioId, req.user.id]
    );
    if (result.rowCount === 0) {
      return res.status(403).json({ error: 'Acceso denegado a este negocio' });
    }
    req.negocio = result.rows[0];
    next();
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
}
