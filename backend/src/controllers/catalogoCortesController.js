import { pool } from '../config/database.js';

// GET /api/negocios/:negocioId/catalogo-cortes
export async function listarCatalogoCortes(req, res) {
  try {
    const { rows } = await pool.query(
      'SELECT * FROM catalogo_cortes WHERE negocio_id = $1 AND activo = true ORDER BY orden ASC, nombre ASC',
      [req.params.negocioId]
    );
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
}

async function syncAliases(negocioId, nombreCorte, aliasesTextArray) {
  if (!aliasesTextArray || !aliasesTextArray.length) return;
  for (const alias of aliasesTextArray) {
    const lowerAlias = alias.toLowerCase().trim();
    if (!lowerAlias) continue;
    await pool.query(
      `INSERT INTO corte_alias (negocio_id, alias_texto, corte_canonico) 
       VALUES ($1, $2, $3)
       ON CONFLICT (negocio_id, alias_texto) 
       DO UPDATE SET corte_canonico = EXCLUDED.corte_canonico`,
      [negocioId, lowerAlias, nombreCorte]
    );
  }
}

// POST /api/negocios/:negocioId/catalogo-cortes
export async function crearCatalogoCorte(req, res) {
  const { negocioId } = req.params;
  const { nombre, rendimiento_pct, tipo, producto_sugerido, aliases, color, orden } = req.body || {};
  
  if (!nombre || !rendimiento_pct || !tipo) {
    return res.status(400).json({ error: 'nombre, rendimiento_pct y tipo son requeridos' });
  }

  try {
    const { rows } = await pool.query(
      `INSERT INTO catalogo_cortes (negocio_id, nombre, rendimiento_pct, tipo, producto_sugerido, aliases, color, orden)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING *`,
      [negocioId, nombre, rendimiento_pct, tipo, producto_sugerido, aliases || [], color || '#CBD5E1', orden || 0]
    );
    
    await syncAliases(negocioId, nombre, aliases);
    
    res.status(201).json(rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
}

// PUT /api/negocios/:negocioId/catalogo-cortes/:id
export async function actualizarCatalogoCorte(req, res) {
  const { negocioId, id } = req.params;
  const { nombre, rendimiento_pct, tipo, producto_sugerido, aliases, color, orden, activo } = req.body || {};

  try {
    const { rows } = await pool.query(
      `UPDATE catalogo_cortes 
       SET nombre=$1, rendimiento_pct=$2, tipo=$3, producto_sugerido=$4, aliases=$5, color=$6, orden=$7, activo=$8
       WHERE id=$9 AND negocio_id=$10 RETURNING *`,
      [nombre, rendimiento_pct, tipo, producto_sugerido, aliases || [], color, orden, activo !== false, id, negocioId]
    );
    
    if (!rows.length) return res.status(404).json({ error: 'Corte no encontrado' });
    
    await syncAliases(negocioId, nombre, aliases);
    
    res.json(rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
}

// DELETE /api/negocios/:negocioId/catalogo-cortes/:id
export async function eliminarCatalogoCorte(req, res) {
  const { negocioId, id } = req.params;
  try {
    const { rowCount } = await pool.query(
      'UPDATE catalogo_cortes SET activo=false WHERE id=$1 AND negocio_id=$2',
      [id, negocioId]
    );
    if (rowCount === 0) return res.status(404).json({ error: 'Corte no encontrado' });
    res.json({ ok: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
}
