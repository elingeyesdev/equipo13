// Control de acceso basado en membresía (RBAC multi-tenant).
import { pool } from '../config/database.js';

const RANK = { operario: 1, admin: 2 };

// Valida que req.user tenga membresía activa en :negocioId.
// rolMin opcional ('operario' | 'admin') exige un rol mínimo.
export function requireMembership(rolMin = null) {
  return async (req, res, next) => {
    const { negocioId } = req.params;
    try {
      const { rows } = await pool.query(
        `SELECT m.rol, n.nombre
           FROM membresias m
           JOIN negocios n ON n.id = m.negocio_id
          WHERE m.negocio_id = $1 AND m.user_id = $2
            AND m.activo = true AND n.activo = true`,
        [negocioId, req.user.id]
      );
      if (!rows.length) {
        return res.status(403).json({ error: 'Acceso denegado a este negocio' });
      }
      const { rol, nombre } = rows[0];
      if (rolMin && RANK[rol] < RANK[rolMin]) {
        return res.status(403).json({ error: 'Permiso insuficiente' });
      }
      req.membresia = { rol, negocio_id: negocioId };
      req.negocio = { id: negocioId, nombre };
      next();
    } catch (err) {
      console.error('requireMembership error:', err);
      res.status(500).json({ error: err.message });
    }
  };
}

// Para endpoints de operario: valida que el lote del path esté asignado al usuario.
export async function requireLoteAsignado(req, res, next) {
  const { loteId } = req.params;
  try {
    const { rows } = await pool.query(
      `SELECT 1 FROM operario_lote
        WHERE operario_user_id = $1 AND lote_id = $2 AND activo = true`,
      [req.user.id, loteId]
    );
    if (!rows.length) {
      return res.status(403).json({ error: 'Lote no asignado' });
    }
    next();
  } catch (err) {
    console.error('requireLoteAsignado error:', err);
    res.status(500).json({ error: err.message });
  }
}
