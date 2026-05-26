import { pool } from '../config/database.js';

// GET /api/negocios/:negocioId/precios-mercado?canal=minorista
export const getPreciosMercado = async (req, res) => {
  const { negocioId } = req.params;
  const { canal } = req.query;

  try {
    let query = `
      SELECT * FROM precios_mercado_cortes 
      WHERE negocio_id = $1
    `;
    const params = [negocioId];

    if (canal) {
      query += ` AND canal = $2`;
      params.push(canal);
    }

    query += ` ORDER BY fecha_vigencia DESC, corte_nombre ASC`;

    const { rows } = await pool.query(query, params);
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
};

// POST /api/negocios/:negocioId/precios-mercado
export const createPrecioMercado = async (req, res) => {
  const { negocioId } = req.params;
  const { corte_nombre, precio_unitario, canal, fecha_vigencia } = req.body;

  if (!corte_nombre || !precio_unitario || !canal || !fecha_vigencia) {
    return res.status(400).json({ error: 'Faltan campos requeridos' });
  }

  try {
    const { rows } = await pool.query(
      `INSERT INTO precios_mercado_cortes 
        (negocio_id, corte_nombre, precio_unitario, canal, fecha_vigencia)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING *`,
      [negocioId, corte_nombre, precio_unitario, canal, fecha_vigencia]
    );

    res.status(201).json(rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
};

// PUT /api/negocios/:negocioId/precios-mercado/:id
export const updatePrecioMercado = async (req, res) => {
  const { negocioId, id } = req.params;
  const { corte_nombre, precio_unitario, canal, fecha_vigencia, activo } = req.body;

  try {
    const check = await pool.query('SELECT id FROM precios_mercado_cortes WHERE id = $1 AND negocio_id = $2', [id, negocioId]);
    if (!check.rows.length) {
      return res.status(404).json({ error: 'Precio de mercado no encontrado' });
    }

    const { rows } = await pool.query(
      `UPDATE precios_mercado_cortes 
       SET corte_nombre = COALESCE($1, corte_nombre),
           precio_unitario = COALESCE($2, precio_unitario),
           canal = COALESCE($3, canal),
           fecha_vigencia = COALESCE($4, fecha_vigencia),
           activo = COALESCE($5, activo)
       WHERE id = $6 AND negocio_id = $7
       RETURNING *`,
      [corte_nombre, precio_unitario, canal, fecha_vigencia, activo, id, negocioId]
    );

    res.json(rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
};

// DELETE /api/negocios/:negocioId/precios-mercado/:id
export const deletePrecioMercado = async (req, res) => {
  const { negocioId, id } = req.params;
  try {
    const { rows } = await pool.query(
      'DELETE FROM precios_mercado_cortes WHERE id = $1 AND negocio_id = $2 RETURNING *',
      [id, negocioId]
    );

    if (!rows.length) {
      return res.status(404).json({ error: 'Precio de mercado no encontrado' });
    }

    res.json({ ok: true, deleted: rows[0] });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
};
