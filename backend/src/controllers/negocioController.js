import { pool } from '../config/database.js';

export async function getAll(req, res) {
  try {
    const result = await pool.query(
      `SELECT id, nombre, rubro, sub_rubro, plantilla, moneda, activo, created_at
       FROM negocios WHERE user_id = $1 AND activo = true ORDER BY created_at ASC`,
      [req.user.id]
    );
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
}

export async function create(req, res) {
  const { nombre, rubro, sub_rubro, plantilla, moneda } = req.body;
  if (!nombre) return res.status(400).json({ error: 'El nombre es requerido' });
  try {
    const result = await pool.query(
      `INSERT INTO negocios (user_id, nombre, rubro, sub_rubro, plantilla, moneda)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING *`,
      [req.user.id, nombre, rubro ?? null, sub_rubro ?? null, plantilla ?? null, moneda ?? 'BOB']
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
}

export async function getOne(req, res) {
  const { id } = req.params;
  try {
    const result = await pool.query(
      'SELECT * FROM negocios WHERE id = $1 AND user_id = $2',
      [id, req.user.id]
    );
    if (!result.rows[0]) return res.status(404).json({ error: 'Negocio no encontrado' });
    res.json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
}

export async function update(req, res) {
  const { id } = req.params;
  const { nombre, moneda, sub_rubro } = req.body;
  try {
    const result = await pool.query(
      `UPDATE negocios
       SET nombre    = COALESCE($1, nombre),
           moneda    = COALESCE($2, moneda),
           sub_rubro = COALESCE($3, sub_rubro)
       WHERE id = $4 AND user_id = $5
       RETURNING *`,
      [nombre ?? null, moneda ?? null, sub_rubro ?? null, id, req.user.id]
    );
    if (!result.rows[0]) return res.status(404).json({ error: 'Negocio no encontrado' });
    res.json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
}
