import { pool } from '../config/database.js';

const COMPRA_SELECT = `
  SELECT c.*,
         i.nombre   AS insumo_nombre,
         um.simbolo AS unidad_simbolo,
         p.nombre   AS proveedor_nombre
  FROM compras_insumo c
  JOIN insumos i ON i.id = c.insumo_id
  LEFT JOIN unidades_medida um ON um.id = c.unidad_id
  LEFT JOIN proveedores p ON p.id = c.proveedor_id
`;

async function verificarInsumoDelNegocio(insumoId, negocioId) {
  const result = await pool.query(
    'SELECT id FROM insumos WHERE id = $1 AND negocio_id = $2',
    [insumoId, negocioId]
  );
  return result.rowCount > 0;
}

async function verificarProveedorDelNegocio(proveedorId, negocioId) {
  if (!proveedorId) return true;
  const result = await pool.query(
    'SELECT id FROM proveedores WHERE id = $1 AND negocio_id = $2',
    [proveedorId, negocioId]
  );
  return result.rowCount > 0;
}

async function obtenerCompraPorId(id, negocioId) {
  const result = await pool.query(
    `${COMPRA_SELECT} WHERE c.id = $1 AND c.negocio_id = $2`,
    [id, negocioId]
  );
  return result.rows[0] || null;
}

/**
 * GET /api/negocios/:negocioId/compras
 */
export async function listarCompras(req, res) {
  const { negocioId } = req.params;
  const { insumo_id, fecha_desde, fecha_hasta } = req.query;

  try {
    const result = await pool.query(
      `${COMPRA_SELECT}
       WHERE c.negocio_id = $1
         AND ($2::uuid IS NULL OR c.insumo_id = $2)
         AND ($3::date IS NULL OR c.fecha_compra >= $3)
         AND ($4::date IS NULL OR c.fecha_compra <= $4)
       ORDER BY c.fecha_compra DESC, c.created_at DESC`,
      [
        negocioId,
        insumo_id || null,
        fecha_desde || null,
        fecha_hasta || null,
      ]
    );
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
}

/**
 * GET /api/negocios/:negocioId/compras/:insumoId/stock
 */
export async function stockPorInsumo(req, res) {
  const { negocioId, insumoId } = req.params;

  try {
    const insumoResult = await pool.query(
      `SELECT i.id, i.nombre, um.simbolo AS unidad_simbolo
       FROM insumos i
       LEFT JOIN unidades_medida um ON um.id = i.unidad_id
       WHERE i.id = $1 AND i.negocio_id = $2`,
      [insumoId, negocioId]
    );

    if (insumoResult.rowCount === 0) {
      return res.status(404).json({ error: 'Insumo no encontrado' });
    }

    const capasResult = await pool.query(
      `SELECT c.id, c.fecha_compra, c.cantidad_comprada,
              c.cantidad_disponible, c.precio_unitario,
              c.numero_factura, c.created_at,
              p.nombre AS proveedor_nombre
       FROM compras_insumo c
       LEFT JOIN proveedores p ON p.id = c.proveedor_id
       WHERE c.insumo_id = $1 AND c.negocio_id = $2
       ORDER BY c.fecha_compra ASC, c.created_at ASC`,
      [insumoId, negocioId]
    );

    const capas = capasResult.rows;
    const stock_total = capas.reduce(
      (s, c) => s + parseFloat(c.cantidad_disponible || 0),
      0
    );

    res.json({
      insumo: insumoResult.rows[0],
      stock_total,
      capas,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
}

/**
 * POST /api/negocios/:negocioId/compras
 */
export async function crearCompra(req, res) {
  const { negocioId } = req.params;
  const {
    insumo_id,
    fecha_compra,
    cantidad_comprada,
    precio_unitario,
    proveedor_id,
    unidad_id,
    numero_factura,
    notas,
  } = req.body;

  if (!insumo_id) {
    return res.status(400).json({ error: 'insumo_id es requerido' });
  }
  if (!fecha_compra) {
    return res.status(400).json({ error: 'fecha_compra es requerida' });
  }
  if (!cantidad_comprada || parseFloat(cantidad_comprada) <= 0) {
    return res.status(400).json({ error: 'La cantidad debe ser mayor a 0' });
  }
  if (!precio_unitario || parseFloat(precio_unitario) <= 0) {
    return res.status(400).json({ error: 'El precio debe ser mayor a 0' });
  }

  try {
    if (!(await verificarInsumoDelNegocio(insumo_id, negocioId))) {
      return res.status(403).json({ error: 'El insumo no pertenece a este negocio' });
    }

    if (proveedor_id && !(await verificarProveedorDelNegocio(proveedor_id, negocioId))) {
      return res.status(403).json({ error: 'El proveedor no pertenece a este negocio' });
    }

    if (unidad_id) {
      const unidadResult = await pool.query(
        'SELECT id FROM unidades_medida WHERE id = $1 AND negocio_id = $2',
        [unidad_id, negocioId]
      );
      if (unidadResult.rowCount === 0) {
        return res.status(403).json({ error: 'La unidad no pertenece a este negocio' });
      }
    }

    const insertResult = await pool.query(
      `INSERT INTO compras_insumo
         (negocio_id, insumo_id, proveedor_id, fecha_compra,
          cantidad_comprada, cantidad_disponible, precio_unitario,
          unidad_id, numero_factura, notas)
       VALUES ($1, $2, $3, $4, $5, $5, $6, $7, $8, $9)
       RETURNING id`,
      [
        negocioId,
        insumo_id,
        proveedor_id || null,
        fecha_compra,
        cantidad_comprada,
        precio_unitario,
        unidad_id || null,
        numero_factura || null,
        notas || null,
      ]
    );

    const compra = await obtenerCompraPorId(insertResult.rows[0].id, negocioId);
    res.status(201).json(compra);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
}

/**
 * DELETE /api/negocios/:negocioId/compras/:id
 */
export async function eliminarCompra(req, res) {
  const { negocioId, id } = req.params;

  try {
    const result = await pool.query(
      `SELECT id, cantidad_comprada, cantidad_disponible
       FROM compras_insumo
       WHERE id = $1 AND negocio_id = $2`,
      [id, negocioId]
    );

    if (result.rowCount === 0) {
      return res.status(404).json({ error: 'Compra no encontrada' });
    }

    const compra = result.rows[0];
    const disponible = parseFloat(compra.cantidad_disponible);
    const comprada = parseFloat(compra.cantidad_comprada);

    if (disponible < comprada) {
      return res.status(409).json({
        error: 'No se puede eliminar: esta compra ya tiene consumos registrados. Para corregir, registrá un ajuste.',
      });
    }

    await pool.query(
      'DELETE FROM compras_insumo WHERE id = $1 AND negocio_id = $2',
      [id, negocioId]
    );

    res.json({ ok: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
}
