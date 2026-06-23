import { pool } from '../config/database.js';
import { aplicarPlantilla } from '../services/seedPlantilla.js';
import { provisionarNegocioNuevo } from '../services/provisionNegocio.js';

export async function getAll(req, res) {
  const includeInactivos = req.query.includeInactivos === 'true';
  try {
    let q = `SELECT id, nombre, rubro, sub_rubro, plantilla, moneda, activo, created_at
             FROM negocios WHERE user_id = $1`;
    if (!includeInactivos) q += ' AND activo = true';
    q += ' ORDER BY created_at ASC';
    const result = await pool.query(q, [req.user.id]);
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
}

export async function create(req, res) {
  const { nombre, rubro, sub_rubro, plantilla, moneda } = req.body;
  if (!nombre) return res.status(400).json({ error: 'El nombre es requerido' });
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const result = await client.query(
      `INSERT INTO negocios (user_id, nombre, rubro, sub_rubro, plantilla, moneda)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING *`,
      [req.user.id, nombre, rubro ?? null, sub_rubro ?? null, plantilla ?? null, moneda ?? 'BOB']
    );
    const negocio = result.rows[0];
    await provisionarNegocioNuevo(client, { userId: req.user.id, negocioId: negocio.id });
    if (plantilla) await aplicarPlantilla(plantilla, negocio.id, client);
    await client.query('COMMIT');
    // Releer para incluir el codigo recién asignado en la respuesta.
    const { rows } = await pool.query('SELECT * FROM negocios WHERE id = $1', [negocio.id]);
    res.status(201).json(rows[0] || negocio);
  } catch (err) {
    await client.query('ROLLBACK');
    console.error(err);
    res.status(500).json({ error: err.message });
  } finally {
    client.release();
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
  const { nombre, moneda, sub_rubro, activo, pesaje_intervalo_dias } = req.body;
  try {
    const result = await pool.query(
      `UPDATE negocios
       SET nombre                = COALESCE($1, nombre),
           moneda                = COALESCE($2, moneda),
           sub_rubro             = COALESCE($3, sub_rubro),
           activo                = COALESCE($4, activo),
           pesaje_intervalo_dias = COALESCE($5, pesaje_intervalo_dias)
       WHERE id = $6 AND user_id = $7
       RETURNING *`,
      [nombre ?? null, moneda ?? null, sub_rubro ?? null, activo ?? null,
       pesaje_intervalo_dias ?? null, id, req.user.id]
    );
    if (!result.rows[0]) return res.status(404).json({ error: 'Negocio no encontrado' });
    res.json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
}

export async function desactivar(req, res) {
  const { id } = req.params;
  try {
    const result = await pool.query(
      `UPDATE negocios SET activo = false
       WHERE id = $1 AND user_id = $2
       RETURNING *`,
      [id, req.user.id]
    );
    if (!result.rows[0]) return res.status(404).json({ error: 'Negocio no encontrado' });
    res.json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
}

export async function remove(req, res) {
  const { id } = req.params;
  try {
    const check = await pool.query(
      'SELECT activo FROM negocios WHERE id = $1 AND user_id = $2',
      [id, req.user.id]
    );
    if (!check.rows[0]) return res.status(404).json({ error: 'Negocio no encontrado' });
    if (check.rows[0].activo) {
      return res.status(409).json({ error: 'Desactivá el negocio antes de eliminarlo definitivamente' });
    }
    await pool.query('DELETE FROM negocios WHERE id = $1 AND user_id = $2', [id, req.user.id]);
    res.json({ ok: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
}
