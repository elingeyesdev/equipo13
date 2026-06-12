import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { pool } from '../config/database.js';

const MAX_INTENTOS = 5;
const BLOQUEO_MIN = 15;

function signOperarioToken(user, negocioId) {
  return jwt.sign(
    { id: user.id, rol: 'operario', negocio_id: negocioId },
    process.env.JWT_SECRET,
    { expiresIn: '30d' }
  );
}

// POST /api/auth/operario/login  { codigo_negocio, username, pin }
export async function loginOperario(req, res) {
  const { codigo_negocio, username, pin } = req.body || {};
  if (!codigo_negocio || !username || !pin) {
    return res.status(400).json({ error: 'Código de negocio, usuario y PIN son requeridos' });
  }
  try {
    const negResult = await pool.query(
      'SELECT id, nombre, codigo FROM negocios WHERE UPPER(codigo) = UPPER($1) AND activo = true',
      [codigo_negocio]
    );
    const negocio = negResult.rows[0];
    if (!negocio) return res.status(401).json({ error: 'Credenciales inválidas' });

    const userResult = await pool.query(
      `SELECT u.* FROM users u
         JOIN membresias m ON m.user_id = u.id
        WHERE LOWER(u.username) = LOWER($1)
          AND m.negocio_id = $2 AND m.rol = 'operario'
          AND m.activo = true AND u.tipo = 'pin'`,
      [username, negocio.id]
    );
    const user = userResult.rows[0];
    if (!user) return res.status(401).json({ error: 'Credenciales inválidas' });

    if (user.bloqueado_hasta && new Date(user.bloqueado_hasta) > new Date()) {
      return res.status(423).json({ error: 'Cuenta bloqueada temporalmente. Contactá al administrador.' });
    }

    const ok = user.pin_hash && await bcrypt.compare(pin, user.pin_hash);
    if (!ok) {
      const intentos = (user.pin_intentos_fallidos || 0) + 1;
      const bloqueo = intentos >= MAX_INTENTOS ? new Date(Date.now() + BLOQUEO_MIN * 60000) : null;
      await pool.query(
        'UPDATE users SET pin_intentos_fallidos = $1, bloqueado_hasta = $2 WHERE id = $3',
        [bloqueo ? 0 : intentos, bloqueo, user.id]
      );
      return res.status(401).json({ error: 'Credenciales inválidas' });
    }

    await pool.query(
      'UPDATE users SET pin_intentos_fallidos = 0, bloqueado_hasta = NULL WHERE id = $1',
      [user.id]
    );

    res.json({
      token: signOperarioToken(user, negocio.id),
      user: { id: user.id, nombre: user.nombre, username: user.username, rol: 'operario' },
      negocio: { id: negocio.id, nombre: negocio.nombre, codigo: negocio.codigo },
    });
  } catch (err) {
    console.error('loginOperario error:', err);
    res.status(500).json({ error: err.message });
  }
}
