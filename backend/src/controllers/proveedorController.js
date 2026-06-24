import { pool } from '../config/database.js';

// ─────────────────────────────────────────────────────────────────────────────
// PROVEEDORES
// ─────────────────────────────────────────────────────────────────────────────

/**
 * GET /api/negocios/:negocioId/proveedores
 * Lista proveedores. Param query ?activo=true|false|all (default: solo activos).
 */
export async function getProveedores(req, res) {
  const { negocioId } = req.params;
  const { activo } = req.query;

  try {
    let query = `
      SELECT p.*,
             COALESCE((SELECT json_agg(i.nombre) FROM insumos i WHERE i.proveedor_id = p.id), '[]'::json) AS insumos
      FROM proveedores p
      WHERE p.negocio_id = $1
    `;
    const params = [negocioId];

    if (activo === 'false') {
      query += ' AND p.activo = false';
    } else if (activo === 'all') {
      // No filtrar por activo
    } else {
      // Default: solo activos
      query += ' AND p.activo = true';
    }

    query += ' ORDER BY nombre';

    const result = await pool.query(query, params);
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
}

/**
 * POST /api/negocios/:negocioId/proveedores
 * Crea un proveedor.
 * Body: { nombre, contacto, telefono, email, notas }
 */
export async function createProveedor(req, res) {
  const { negocioId } = req.params;
  const { nombre, contacto, telefono, email, notas } = req.body;

  if (!nombre) {
    return res.status(400).json({ error: 'nombre es requerido' });
  }

  try {
    const result = await pool.query(
      `INSERT INTO proveedores (negocio_id, nombre, contacto, telefono, email, notas)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING *`,
      [negocioId, nombre, contacto || null, telefono || null, email || null, notas || null]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
}

/**
 * PUT /api/negocios/:negocioId/proveedores/:id
 * Actualiza todos los campos editables.
 */
export async function updateProveedor(req, res) {
  const { negocioId, id } = req.params;
  const { nombre, contacto, telefono, email, notas } = req.body;

  try {
    const result = await pool.query(
      `UPDATE proveedores
       SET nombre   = COALESCE($1, nombre),
           contacto = COALESCE($2, contacto),
           telefono = COALESCE($3, telefono),
           email    = COALESCE($4, email),
           notas    = COALESCE($5, notas)
       WHERE id = $6 AND negocio_id = $7
       RETURNING *`,
      [nombre || null, contacto || null, telefono || null, email || null, notas || null, id, negocioId]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Proveedor no encontrado' });
    }
    res.json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
}

/**
 * PATCH /api/negocios/:negocioId/proveedores/:id/archivar
 * Toggle activo true/false (borrado lógico).
 */
export async function archivarProveedor(req, res) {
  const { negocioId, id } = req.params;

  try {
    const result = await pool.query(
      `UPDATE proveedores
       SET activo = NOT activo
       WHERE id = $1 AND negocio_id = $2
       RETURNING *`,
      [id, negocioId]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Proveedor no encontrado' });
    }
    res.json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
}

/**
 * GET /api/negocios/:negocioId/proveedores/:id/compras
 * Devuelve info del proveedor + historial de compras + stats agregadas.
 */
export async function getComprasByProveedor(req, res) {
  const { negocioId, id } = req.params;

  try {
    // Verificar que el proveedor pertenece al negocio
    const provRes = await pool.query(
      `SELECT id, nombre, contacto, telefono, email, notas, activo
       FROM proveedores
       WHERE id = $1 AND negocio_id = $2`,
      [id, negocioId]
    );
    if (provRes.rowCount === 0) {
      return res.status(404).json({ error: 'Proveedor no encontrado' });
    }

    // Historial de compras
    const comprasRes = await pool.query(
      `SELECT
         ci.id,
         ci.fecha_compra,
         ci.cantidad_comprada,
         ci.cantidad_disponible,
         ci.precio_unitario,
         ROUND(ci.cantidad_comprada * ci.precio_unitario, 2) AS total,
         ci.numero_factura,
         ci.notas,
         ci.created_at,
         i.nombre   AS insumo_nombre,
         um.simbolo AS unidad_simbolo
       FROM compras_insumo ci
       JOIN insumos i ON ci.insumo_id = i.id
       LEFT JOIN unidades_medida um ON ci.unidad_id = um.id
       WHERE ci.negocio_id = $1 AND ci.proveedor_id = $2
       ORDER BY ci.fecha_compra DESC, ci.created_at DESC`,
      [negocioId, id]
    );

    // Stats agregadas
    const statsRes = await pool.query(
      `SELECT
         COUNT(*)                                               AS total_compras,
         COALESCE(SUM(cantidad_comprada * precio_unitario), 0)  AS gasto_total,
         MIN(fecha_compra)                                      AS primera_compra,
         MAX(fecha_compra)                                      AS ultima_compra
       FROM compras_insumo
       WHERE negocio_id = $1 AND proveedor_id = $2`,
      [negocioId, id]
    );

    // Insumo más comprado (por monto total)
    const topRes = await pool.query(
      `SELECT i.nombre, SUM(ci.cantidad_comprada * ci.precio_unitario) AS monto
       FROM compras_insumo ci
       JOIN insumos i ON ci.insumo_id = i.id
       WHERE ci.negocio_id = $1 AND ci.proveedor_id = $2
       GROUP BY i.id, i.nombre
       ORDER BY monto DESC
       LIMIT 1`,
      [negocioId, id]
    );

    const s = statsRes.rows[0];
    res.json({
      proveedor: provRes.rows[0],
      compras:   comprasRes.rows,
      stats: {
        total_compras:  parseInt(s?.total_compras  || 0),
        gasto_total:    parseFloat(s?.gasto_total  || 0),
        primera_compra: s?.primera_compra || null,
        ultima_compra:  s?.ultima_compra  || null,
        top_insumo:     topRes.rows[0]?.nombre || null,
      },
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
}

/**
 * DELETE /api/negocios/:negocioId/proveedores/:id
 * Elimina permanentemente un proveedor.
 */
export async function deleteProveedor(req, res) {
  const { negocioId, id } = req.params;

  try {
    const result = await pool.query(
      'DELETE FROM proveedores WHERE id = $1 AND negocio_id = $2 RETURNING id',
      [id, negocioId]
    );

    if (result.rowCount === 0) {
      return res.status(404).json({ error: 'Proveedor no encontrado' });
    }

    res.json({ ok: true, id });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
}
