import { pool } from '../config/database.js';

// ─────────────────────────────────────────────────────────────────────────────
// CATEGORÍAS DE INSUMOS
// ─────────────────────────────────────────────────────────────────────────────

/**
 * GET /api/negocios/:negocioId/categorias
 * Lista categorías con campo extra: cantidad de insumos que usan esa categoría.
 */
export async function getCategorias(req, res) {
  const { negocioId } = req.params;
  try {
    const result = await pool.query(
      `SELECT
         c.*,
         COALESCE(cnt.cantidad_insumos, 0)::int AS cantidad_insumos
       FROM categorias_insumos c
       LEFT JOIN (
         SELECT categoria_id, COUNT(*) AS cantidad_insumos
         FROM insumos
         WHERE activo = true
         GROUP BY categoria_id
       ) cnt ON cnt.categoria_id = c.id
       WHERE c.negocio_id = $1
       ORDER BY c.nombre`,
      [negocioId]
    );
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
}

/**
 * POST /api/negocios/:negocioId/categorias
 * Crea una categoría.
 * Body: { nombre, color, descripcion }
 */
export async function createCategoria(req, res) {
  const { negocioId } = req.params;
  const { nombre, color, descripcion } = req.body;

  if (!nombre) {
    return res.status(400).json({ error: 'nombre es requerido' });
  }

  try {
    const result = await pool.query(
      `INSERT INTO categorias_insumos (negocio_id, nombre, color, descripcion)
       VALUES ($1, $2, $3, $4)
       RETURNING *`,
      [negocioId, nombre, color || null, descripcion || null]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
}

/**
 * PUT /api/negocios/:negocioId/categorias/:id
 * Actualiza nombre, color, descripcion.
 */
export async function updateCategoria(req, res) {
  const { negocioId, id } = req.params;
  const { nombre, color, descripcion } = req.body;

  try {
    const result = await pool.query(
      `UPDATE categorias_insumos
       SET nombre      = COALESCE($1, nombre),
           color       = COALESCE($2, color),
           descripcion = COALESCE($3, descripcion)
       WHERE id = $4 AND negocio_id = $5
       RETURNING *`,
      [nombre || null, color || null, descripcion || null, id, negocioId]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Categoría no encontrada' });
    }
    res.json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
}

/**
 * DELETE /api/negocios/:negocioId/categorias/:id
 * Si tiene insumos asignados, poner categoria_id = NULL en esos insumos
 * antes de eliminar (no bloquear).
 */
export async function deleteCategoria(req, res) {
  const { negocioId, id } = req.params;

  try {
    // Verificar que la categoría pertenece al negocio
    const categoria = await pool.query(
      'SELECT id FROM categorias_insumos WHERE id = $1 AND negocio_id = $2',
      [id, negocioId]
    );
    if (categoria.rows.length === 0) {
      return res.status(404).json({ error: 'Categoría no encontrada' });
    }

    // Desasociar insumos que usan esta categoría (poner NULL)
    await pool.query(
      'UPDATE insumos SET categoria_id = NULL WHERE categoria_id = $1',
      [id]
    );

    // Eliminar la categoría
    await pool.query(
      'DELETE FROM categorias_insumos WHERE id = $1 AND negocio_id = $2',
      [id, negocioId]
    );

    res.json({ message: 'Categoría eliminada correctamente' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
}
