import { pool } from '../config/database.js';

const INSUMO_SELECT = `
  SELECT
    i.*,
    (
      SELECT COALESCE(SUM(ci.cantidad_disponible), 0)
      FROM compras_insumo ci
      WHERE ci.insumo_id = i.id
    ) AS stock_total,
    c.nombre AS categoria_nombre,
    c.color AS categoria_color,
    u.nombre AS unidad_nombre,
    u.simbolo AS unidad_simbolo,
    p.nombre AS proveedor_nombre
  FROM insumos i
  LEFT JOIN categorias_insumos c ON c.id = i.categoria_id
  LEFT JOIN unidades_medida u ON u.id = i.unidad_id
  LEFT JOIN proveedores p ON p.id = i.proveedor_id
`;

async function verificarRelacionDelNegocio(tabla, id, negocioId, nombreCampo) {
  if (!id) return;

  const result = await pool.query(
    `SELECT id FROM ${tabla} WHERE id = $1 AND negocio_id = $2`,
    [id, negocioId]
  );

  if (result.rowCount === 0) {
    throw new Error(`${nombreCampo} no pertenece al negocio`);
  }
}

async function validarRelaciones(negocioId, { categoria_id, unidad_id, proveedor_id }) {
  await verificarRelacionDelNegocio('categorias_insumos', categoria_id, negocioId, 'categoria_id');
  await verificarRelacionDelNegocio('unidades_medida', unidad_id, negocioId, 'unidad_id');
  await verificarRelacionDelNegocio('proveedores', proveedor_id, negocioId, 'proveedor_id');
}

/**
 * GET /api/negocios/:negocioId/insumos
 * Lista insumos del negocio con filtros y joins.
 */
export async function getInsumos(req, res) {
  const { negocioId } = req.params;
  const { activo, categoria, search } = req.query;

  try {
    const params = [negocioId];
    let idx = 2;
    let query = `${INSUMO_SELECT} WHERE i.negocio_id = $1`;

    if (activo === 'false') {
      query += ` AND i.activo = false`;
    } else if (activo !== 'all') {
      query += ` AND i.activo = true`;
    }

    if (categoria) {
      query += ` AND i.categoria_id = $${idx}`;
      params.push(categoria);
      idx += 1;
    }

    if (search) {
      query += ` AND i.nombre ILIKE $${idx}`;
      params.push(`%${search}%`);
      idx += 1;
    }

    query += ` ORDER BY i.nombre`;

    const result = await pool.query(query, params);
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
}

/**
 * GET /api/negocios/:negocioId/insumos/:id
 * Detalle de un insumo con joins.
 */
export async function getInsumoById(req, res) {
  const { negocioId, id } = req.params;

  try {
    const result = await pool.query(
      `${INSUMO_SELECT}
       WHERE i.negocio_id = $1 AND i.id = $2`,
      [negocioId, id]
    );

    if (result.rowCount === 0) {
      return res.status(404).json({ error: 'Insumo no encontrado' });
    }

    res.json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
}

/**
 * POST /api/negocios/:negocioId/insumos
 * Crea un insumo.
 */
export async function createInsumo(req, res) {
  const { negocioId } = req.params;
  const {
    nombre,
    codigo_sku,
    categoria_id,
    unidad_id,
    proveedor_id,
    es_variable,
    notas
  } = req.body;

  if (!nombre) {
    return res.status(400).json({ error: 'nombre es requerido' });
  }

  try {
    await validarRelaciones(negocioId, { categoria_id, unidad_id, proveedor_id });

    const created = await pool.query(
      `INSERT INTO insumos (
        negocio_id,
        nombre,
        codigo_sku,
        categoria_id,
        unidad_id,
        proveedor_id,
        es_variable,
        notas
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      RETURNING id`,
      [
        negocioId,
        nombre,
        codigo_sku || null,
        categoria_id || null,
        unidad_id || null,
        proveedor_id || null,
        es_variable ?? true,
        notas || null
      ]
    );

    const result = await pool.query(
      `${INSUMO_SELECT}
       WHERE i.negocio_id = $1 AND i.id = $2`,
      [negocioId, created.rows[0].id]
    );

    res.status(201).json(result.rows[0]);
  } catch (err) {
    if (
      err.message.includes('categoria_id no pertenece al negocio') ||
      err.message.includes('unidad_id no pertenece al negocio') ||
      err.message.includes('proveedor_id no pertenece al negocio')
    ) {
      return res.status(400).json({ error: err.message });
    }

    console.error(err);
    res.status(500).json({ error: err.message });
  }
}

/**
 * PUT /api/negocios/:negocioId/insumos/:id
 * Actualiza un insumo.
 */
export async function updateInsumo(req, res) {
  const { negocioId, id } = req.params;
  const {
    nombre,
    codigo_sku,
    categoria_id,
    unidad_id,
    proveedor_id,
    es_variable,
    notas
  } = req.body;

  try {
    const existente = await pool.query(
      'SELECT id FROM insumos WHERE id = $1 AND negocio_id = $2',
      [id, negocioId]
    );

    if (existente.rowCount === 0) {
      return res.status(404).json({ error: 'Insumo no encontrado' });
    }

    await validarRelaciones(negocioId, { categoria_id, unidad_id, proveedor_id });

    await pool.query(
      `UPDATE insumos
       SET nombre = COALESCE($1, nombre),
           codigo_sku = COALESCE($2, codigo_sku),
           categoria_id = COALESCE($3, categoria_id),
           unidad_id = COALESCE($4, unidad_id),
           proveedor_id = COALESCE($5, proveedor_id),
           es_variable = COALESCE($6, es_variable),
           notas = COALESCE($7, notas)
       WHERE id = $8 AND negocio_id = $9`,
      [
        nombre || null,
        codigo_sku || null,
        categoria_id || null,
        unidad_id || null,
        proveedor_id || null,
        es_variable ?? null,
        notas || null,
        id,
        negocioId
      ]
    );

    const result = await pool.query(
      `${INSUMO_SELECT}
       WHERE i.negocio_id = $1 AND i.id = $2`,
      [negocioId, id]
    );

    res.json(result.rows[0]);
  } catch (err) {
    if (
      err.message.includes('categoria_id no pertenece al negocio') ||
      err.message.includes('unidad_id no pertenece al negocio') ||
      err.message.includes('proveedor_id no pertenece al negocio')
    ) {
      return res.status(400).json({ error: err.message });
    }

    console.error(err);
    res.status(500).json({ error: err.message });
  }
}

/**
 * PATCH /api/negocios/:negocioId/insumos/:id/archivar
 * Toggle activo (borrado lógico).
 */
export async function archivarInsumo(req, res) {
  const { negocioId, id } = req.params;

  try {
    await pool.query(
      `UPDATE insumos
       SET activo = NOT activo
       WHERE id = $1 AND negocio_id = $2`,
      [id, negocioId]
    );

    const result = await pool.query(
      `${INSUMO_SELECT}
       WHERE i.negocio_id = $1 AND i.id = $2`,
      [negocioId, id]
    );

    if (result.rowCount === 0) {
      return res.status(404).json({ error: 'Insumo no encontrado' });
    }

    res.json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
}

/**
 * DELETE /api/negocios/:negocioId/insumos/:id
 * Elimina permanentemente un insumo.
 */
export async function deleteInsumo(req, res) {
  const { negocioId, id } = req.params;

  try {
    const result = await pool.query(
      'DELETE FROM insumos WHERE id = $1 AND negocio_id = $2 RETURNING id',
      [id, negocioId]
    );

    if (result.rowCount === 0) {
      return res.status(404).json({ error: 'Insumo no encontrado' });
    }

    res.json({ ok: true, id });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
}
