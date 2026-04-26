import { pool } from '../config/database.js';

const PRODUCTO_SELECT = `
  SELECT
    p.*,
    u.nombre AS unidad_nombre,
    u.simbolo AS unidad_simbolo,
    (SELECT COUNT(*) FROM bom_items WHERE producto_id = p.id)::int AS bom_count,
    EXISTS(SELECT 1 FROM etapas_produccion WHERE producto_id = p.id) AS tiene_etapas
  FROM productos p
  LEFT JOIN unidades_medida u ON u.id = p.unidad_id
`;

export async function getProductos(req, res) {
  const { negocioId } = req.params;
  const { activo } = req.query;

  try {
    let query = `${PRODUCTO_SELECT} WHERE p.negocio_id = $1`;
    const params = [negocioId];

    if (activo === 'false') {
      query += ' AND p.activo = false';
    } else if (activo !== 'all') {
      query += ' AND p.activo = true';
    }

    query += ' ORDER BY p.nombre';
    const result = await pool.query(query, params);
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
}

export async function getProductoById(req, res) {
  const { negocioId, id } = req.params;

  try {
    const result = await pool.query(
      `${PRODUCTO_SELECT} WHERE p.negocio_id = $1 AND p.id = $2`,
      [negocioId, id]
    );

    if (result.rowCount === 0) {
      return res.status(404).json({ error: 'Producto no encontrado' });
    }

    res.json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
}

export async function createProducto(req, res) {
  const { negocioId } = req.params;
  const { nombre, codigo_sku, descripcion, unidad_id } = req.body;

  if (!nombre) {
    return res.status(400).json({ error: 'nombre es requerido' });
  }

  try {
    if (unidad_id) {
      const u = await pool.query(
        'SELECT id FROM unidades_medida WHERE id = $1 AND negocio_id = $2',
        [unidad_id, negocioId]
      );
      if (u.rowCount === 0) {
        return res.status(400).json({ error: 'unidad_id no pertenece al negocio' });
      }
    }

    const created = await pool.query(
      `INSERT INTO productos (negocio_id, nombre, codigo_sku, descripcion, unidad_id)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING id`,
      [negocioId, nombre, codigo_sku || null, descripcion || null, unidad_id || null]
    );

    const result = await pool.query(
      `${PRODUCTO_SELECT} WHERE p.negocio_id = $1 AND p.id = $2`,
      [negocioId, created.rows[0].id]
    );

    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
}

export async function updateProducto(req, res) {
  const { negocioId, id } = req.params;
  const { nombre, codigo_sku, descripcion, unidad_id } = req.body;

  try {
    const existente = await pool.query(
      'SELECT id FROM productos WHERE id = $1 AND negocio_id = $2',
      [id, negocioId]
    );

    if (existente.rowCount === 0) {
      return res.status(404).json({ error: 'Producto no encontrado' });
    }

    if (unidad_id) {
      const u = await pool.query(
        'SELECT id FROM unidades_medida WHERE id = $1 AND negocio_id = $2',
        [unidad_id, negocioId]
      );
      if (u.rowCount === 0) {
        return res.status(400).json({ error: 'unidad_id no pertenece al negocio' });
      }
    }

    await pool.query(
      `UPDATE productos
       SET nombre      = COALESCE($1, nombre),
           codigo_sku  = COALESCE($2, codigo_sku),
           descripcion = COALESCE($3, descripcion),
           unidad_id   = COALESCE($4, unidad_id)
       WHERE id = $5 AND negocio_id = $6`,
      [nombre || null, codigo_sku || null, descripcion || null, unidad_id || null, id, negocioId]
    );

    const result = await pool.query(
      `${PRODUCTO_SELECT} WHERE p.negocio_id = $1 AND p.id = $2`,
      [negocioId, id]
    );

    res.json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
}

export async function archivarProducto(req, res) {
  const { negocioId, id } = req.params;

  try {
    const toggled = await pool.query(
      `UPDATE productos SET activo = NOT activo
       WHERE id = $1 AND negocio_id = $2
       RETURNING id`,
      [id, negocioId]
    );

    if (toggled.rowCount === 0) {
      return res.status(404).json({ error: 'Producto no encontrado' });
    }

    const result = await pool.query(
      `${PRODUCTO_SELECT} WHERE p.negocio_id = $1 AND p.id = $2`,
      [negocioId, id]
    );

    res.json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
}
