import { pool } from '../config/database.js';

async function verificarProductoDelNegocio(productoId, negocioId) {
  const r = await pool.query(
    'SELECT id FROM productos WHERE id = $1 AND negocio_id = $2',
    [productoId, negocioId]
  );
  if (r.rowCount === 0) throw Object.assign(new Error('Producto no encontrado'), { status: 404 });
}

const BOM_SELECT = `
  SELECT
    b.*,
    i.nombre AS insumo_nombre,
    i.precio_unitario,
    u.nombre AS unidad_nombre,
    u.simbolo AS unidad_simbolo,
    (b.cantidad * i.precio_unitario) AS costo_parcial
  FROM bom_items b
  JOIN insumos i ON i.id = b.insumo_id
  LEFT JOIN unidades_medida u ON u.id = b.unidad_id
`;

export async function getBomItems(req, res) {
  const { negocioId, productoId } = req.params;

  try {
    await verificarProductoDelNegocio(productoId, negocioId);

    const result = await pool.query(
      `${BOM_SELECT} WHERE b.producto_id = $1 ORDER BY b.orden`,
      [productoId]
    );

    res.json(result.rows);
  } catch (err) {
    if (err.status) return res.status(err.status).json({ error: err.message });
    console.error(err);
    res.status(500).json({ error: err.message });
  }
}

export async function createBomItem(req, res) {
  const { negocioId, productoId } = req.params;
  const { insumo_id, cantidad, unidad_id } = req.body;

  if (!insumo_id || cantidad == null) {
    return res.status(400).json({ error: 'insumo_id y cantidad son requeridos' });
  }

  try {
    await verificarProductoDelNegocio(productoId, negocioId);

    const insumo = await pool.query(
      'SELECT id FROM insumos WHERE id = $1 AND negocio_id = $2',
      [insumo_id, negocioId]
    );
    if (insumo.rowCount === 0) {
      return res.status(400).json({ error: 'insumo_id no pertenece al negocio' });
    }

    const ordenResult = await pool.query(
      'SELECT COALESCE(MAX(orden), 0) + 1 AS next_orden FROM bom_items WHERE producto_id = $1',
      [productoId]
    );
    const orden = ordenResult.rows[0].next_orden;

    const created = await pool.query(
      `INSERT INTO bom_items (producto_id, insumo_id, cantidad, unidad_id, orden)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING id`,
      [productoId, insumo_id, cantidad, unidad_id || null, orden]
    );

    const result = await pool.query(
      `${BOM_SELECT} WHERE b.id = $1`,
      [created.rows[0].id]
    );

    res.status(201).json(result.rows[0]);
  } catch (err) {
    if (err.status) return res.status(err.status).json({ error: err.message });
    console.error(err);
    res.status(500).json({ error: err.message });
  }
}

export async function updateBomItem(req, res) {
  const { negocioId, productoId, bomId } = req.params;
  const { cantidad, unidad_id } = req.body;

  try {
    await verificarProductoDelNegocio(productoId, negocioId);

    const existente = await pool.query(
      'SELECT id FROM bom_items WHERE id = $1 AND producto_id = $2',
      [bomId, productoId]
    );
    if (existente.rowCount === 0) {
      return res.status(404).json({ error: 'Item BOM no encontrado' });
    }

    await pool.query(
      `UPDATE bom_items
       SET cantidad  = COALESCE($1, cantidad),
           unidad_id = COALESCE($2, unidad_id)
       WHERE id = $3`,
      [cantidad ?? null, unidad_id || null, bomId]
    );

    const result = await pool.query(
      `${BOM_SELECT} WHERE b.id = $1`,
      [bomId]
    );

    res.json(result.rows[0]);
  } catch (err) {
    if (err.status) return res.status(err.status).json({ error: err.message });
    console.error(err);
    res.status(500).json({ error: err.message });
  }
}

export async function deleteBomItem(req, res) {
  const { negocioId, productoId, bomId } = req.params;

  try {
    await verificarProductoDelNegocio(productoId, negocioId);

    const result = await pool.query(
      'DELETE FROM bom_items WHERE id = $1 AND producto_id = $2 RETURNING id',
      [bomId, productoId]
    );

    if (result.rowCount === 0) {
      return res.status(404).json({ error: 'Item BOM no encontrado' });
    }

    res.status(204).send();
  } catch (err) {
    if (err.status) return res.status(err.status).json({ error: err.message });
    console.error(err);
    res.status(500).json({ error: err.message });
  }
}

export async function reorderBom(req, res) {
  const { negocioId, productoId } = req.params;
  const { items } = req.body;

  if (!Array.isArray(items)) {
    return res.status(400).json({ error: 'items debe ser un array' });
  }

  try {
    await verificarProductoDelNegocio(productoId, negocioId);

    await Promise.all(
      items.map(({ id, orden }) =>
        pool.query(
          'UPDATE bom_items SET orden = $1 WHERE id = $2 AND producto_id = $3',
          [orden, id, productoId]
        )
      )
    );

    const result = await pool.query(
      `${BOM_SELECT} WHERE b.producto_id = $1 ORDER BY b.orden`,
      [productoId]
    );

    res.json(result.rows);
  } catch (err) {
    if (err.status) return res.status(err.status).json({ error: err.message });
    console.error(err);
    res.status(500).json({ error: err.message });
  }
}
