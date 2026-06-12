import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { pool } from '../config/database.js';

function signToken(user) {
  return jwt.sign(
    { id: user.id, email: user.email, rol: 'admin' },
    process.env.JWT_SECRET,
    { expiresIn: '7d' }
  );
}

function userPayload(user) {
  return {
    id: user.id,
    email: user.email,
    nombre: user.nombre,
    onboarding_completado: user.onboarding_completado,
  };
}

export async function register(req, res) {
  const { email, password, nombre } = req.body;
  if (!email || !password) {
    return res.status(400).json({ error: 'Email y contraseña son requeridos' });
  }
  try {
    const existing = await pool.query('SELECT id FROM users WHERE email = $1', [email]);
    if (existing.rows.length > 0) {
      return res.status(409).json({ error: 'El email ya está registrado' });
    }
    const password_hash = await bcrypt.hash(password, 10);
    const result = await pool.query(
      'INSERT INTO users (email, password_hash, nombre) VALUES ($1, $2, $3) RETURNING id, email, nombre, onboarding_completado',
      [email, password_hash, nombre || null]
    );
    const user = result.rows[0];
    res.status(201).json({ token: signToken(user), user: userPayload(user) });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
}

export async function login(req, res) {
  const { email, password } = req.body;
  if (!email || !password) {
    return res.status(400).json({ error: 'Email y contraseña son requeridos' });
  }
  try {
    const result = await pool.query(
      'SELECT id, email, nombre, password_hash, onboarding_completado FROM users WHERE email = $1',
      [email]
    );
    const user = result.rows[0];
    if (!user || !(await bcrypt.compare(password, user.password_hash))) {
      return res.status(401).json({ error: 'Credenciales inválidas' });
    }
    res.json({ token: signToken(user), user: userPayload(user) });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
}

export async function me(req, res) {
  try {
    const result = await pool.query(
      'SELECT id, email, nombre, onboarding_completado FROM users WHERE id = $1',
      [req.user.id]
    );
    if (!result.rows[0]) {
      return res.status(404).json({ error: 'Usuario no encontrado' });
    }
    res.json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
}
