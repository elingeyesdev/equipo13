import { pool } from '../config/database.js';

// ─────────────────────────────────────────────────────────────────────────────
// UNIDADES DE MEDIDA
// ─────────────────────────────────────────────────────────────────────────────

/**
 * GET /api/negocios/:negocioId/unidades
 * Lista todas las unidades de medida del negocio.
 */
export async function getUnidades(req, res) {
  const { negocioId } = req.params;
  try {
    const result = await pool.query(
      `SELECT * FROM unidades_medida
       WHERE negocio_id = $1
       ORDER BY tipo, nombre`,
      [negocioId]
    );
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
}

/**
 * POST /api/negocios/:negocioId/unidades
 * Crea una unidad de medida.
 * Body: { nombre, simbolo, tipo }
 */
export async function createUnidad(req, res) {
  const { negocioId } = req.params;
  const { nombre, simbolo, tipo } = req.body;

  if (!nombre || !simbolo) {
    return res.status(400).json({ error: 'nombre y simbolo son requeridos' });
  }

  try {
    const result = await pool.query(
      `INSERT INTO unidades_medida (negocio_id, nombre, simbolo, tipo)
       VALUES ($1, $2, $3, $4)
       RETURNING *`,
      [negocioId, nombre, simbolo, tipo || null]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
}

/**
 * PUT /api/negocios/:negocioId/unidades/:id
 * Actualiza nombre, simbolo, tipo.
 * Verifica que el id pertenece al negocio.
 */
export async function updateUnidad(req, res) {
  const { negocioId, id } = req.params;
  const { nombre, simbolo, tipo } = req.body;

  try {
    const result = await pool.query(
      `UPDATE unidades_medida
       SET nombre  = COALESCE($1, nombre),
           simbolo = COALESCE($2, simbolo),
           tipo    = COALESCE($3, tipo)
       WHERE id = $4 AND negocio_id = $5
       RETURNING *`,
      [nombre || null, simbolo || null, tipo || null, id, negocioId]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Unidad no encontrada' });
    }
    res.json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
}

/**
 * DELETE /api/negocios/:negocioId/unidades/:id
 * Elimina solo si ningún insumo ni producto la usa (verificar FKs).
 * Si está en uso, devolver 409 con mensaje.
 */
export async function deleteUnidad(req, res) {
  const { negocioId, id } = req.params;

  try {
    // Verificar que la unidad pertenece al negocio
    const unidad = await pool.query(
      'SELECT id FROM unidades_medida WHERE id = $1 AND negocio_id = $2',
      [id, negocioId]
    );
    if (unidad.rows.length === 0) {
      return res.status(404).json({ error: 'Unidad no encontrada' });
    }

    // Verificar si está en uso por insumos
    const insumoCheck = await pool.query(
      'SELECT COUNT(*)::int AS total FROM insumos WHERE unidad_id = $1',
      [id]
    );

    // Verificar si está en uso por productos
    const productoCheck = await pool.query(
      'SELECT COUNT(*)::int AS total FROM productos WHERE unidad_id = $1',
      [id]
    );

    // Verificar si está en uso por bom_items
    const bomCheck = await pool.query(
      'SELECT COUNT(*)::int AS total FROM bom_items WHERE unit_id = $1',
      [id]
    );

    // Verificar si está en uso por equivalencias
    const equivCheck = await pool.query(
      `SELECT COUNT(*)::int AS total FROM equivalencias_unidades
       WHERE unidad_origen_id = $1 OR unidad_destino_id = $1`,
      [id]
    );

    const totalEnUso =
      insumoCheck.rows[0].total +
      productoCheck.rows[0].total +
      bomCheck.rows[0].total +
      equivCheck.rows[0].total;

    if (totalEnUso > 0) {
      return res.status(409).json({
        error: 'No se puede eliminar la unidad porque está en uso',
        detalles: {
          insumos: insumoCheck.rows[0].total,
          productos: productoCheck.rows[0].total,
          bom_items: bomCheck.rows[0].total,
          equivalencias: equivCheck.rows[0].total,
        },
      });
    }

    await pool.query(
      'DELETE FROM unidades_medida WHERE id = $1 AND negocio_id = $2',
      [id, negocioId]
    );
    res.json({ message: 'Unidad eliminada correctamente' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
}
