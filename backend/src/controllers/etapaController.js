import { pool } from '../config/database.js';

async function verificarProductoDelNegocio(productoId, negocioId) {
  const r = await pool.query(
    'SELECT id FROM productos WHERE id = $1 AND negocio_id = $2',
    [productoId, negocioId]
  );
  if (r.rowCount === 0) throw Object.assign(new Error('Producto no encontrado'), { status: 404 });
}

const ETAPA_SELECT = `
  SELECT
    e.*,
    (e.tiempo_minutos / 60.0 * e.costo_hora) AS costo_etapa
  FROM etapas_produccion e
`;

export async function getEtapas(req, res) {
  const { negocioId, productoId } = req.params;

  try {
    await verificarProductoDelNegocio(productoId, negocioId);

    const result = await pool.query(
      `${ETAPA_SELECT} WHERE e.producto_id = $1 ORDER BY e.orden`,
      [productoId]
    );

    res.json(result.rows);
  } catch (err) {
    if (err.status) return res.status(err.status).json({ error: err.message });
    console.error(err);
    res.status(500).json({ error: err.message });
  }
}

export async function createEtapa(req, res) {
  const { negocioId, productoId } = req.params;
  const { nombre, descripcion, tiempo_minutos, costo_hora } = req.body;

  if (!nombre || tiempo_minutos == null || costo_hora == null) {
    return res.status(400).json({ error: 'nombre, tiempo_minutos y costo_hora son requeridos' });
  }

  try {
    await verificarProductoDelNegocio(productoId, negocioId);

    const ordenResult = await pool.query(
      'SELECT COALESCE(MAX(orden), 0) + 1 AS next_orden FROM etapas_produccion WHERE producto_id = $1',
      [productoId]
    );
    const orden = ordenResult.rows[0].next_orden;

    const created = await pool.query(
      `INSERT INTO etapas_produccion (producto_id, nombre, descripcion, tiempo_minutos, costo_hora, orden)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING id`,
      [productoId, nombre, descripcion || null, tiempo_minutos, costo_hora, orden]
    );

    const result = await pool.query(
      `${ETAPA_SELECT} WHERE e.id = $1`,
      [created.rows[0].id]
    );

    res.status(201).json(result.rows[0]);
  } catch (err) {
    if (err.status) return res.status(err.status).json({ error: err.message });
    console.error(err);
    res.status(500).json({ error: err.message });
  }
}

export async function updateEtapa(req, res) {
  const { negocioId, productoId, etapaId } = req.params;
  const { nombre, descripcion, tiempo_minutos, costo_hora } = req.body;

  try {
    await verificarProductoDelNegocio(productoId, negocioId);

    const existente = await pool.query(
      'SELECT id FROM etapas_produccion WHERE id = $1 AND producto_id = $2',
      [etapaId, productoId]
    );
    if (existente.rowCount === 0) {
      return res.status(404).json({ error: 'Etapa no encontrada' });
    }

    await pool.query(
      `UPDATE etapas_produccion
       SET nombre         = COALESCE($1, nombre),
           descripcion    = COALESCE($2, descripcion),
           tiempo_minutos = COALESCE($3, tiempo_minutos),
           costo_hora     = COALESCE($4, costo_hora)
       WHERE id = $5`,
      [nombre || null, descripcion || null, tiempo_minutos ?? null, costo_hora ?? null, etapaId]
    );

    const result = await pool.query(
      `${ETAPA_SELECT} WHERE e.id = $1`,
      [etapaId]
    );

    res.json(result.rows[0]);
  } catch (err) {
    if (err.status) return res.status(err.status).json({ error: err.message });
    console.error(err);
    res.status(500).json({ error: err.message });
  }
}

export async function deleteEtapa(req, res) {
  const { negocioId, productoId, etapaId } = req.params;

  try {
    await verificarProductoDelNegocio(productoId, negocioId);

    const result = await pool.query(
      'DELETE FROM etapas_produccion WHERE id = $1 AND producto_id = $2 RETURNING id',
      [etapaId, productoId]
    );

    if (result.rowCount === 0) {
      return res.status(404).json({ error: 'Etapa no encontrada' });
    }

    res.status(204).send();
  } catch (err) {
    if (err.status) return res.status(err.status).json({ error: err.message });
    console.error(err);
    res.status(500).json({ error: err.message });
  }
}

export async function reorderEtapas(req, res) {
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
          'UPDATE etapas_produccion SET orden = $1 WHERE id = $2 AND producto_id = $3',
          [orden, id, productoId]
        )
      )
    );

    const result = await pool.query(
      `${ETAPA_SELECT} WHERE e.producto_id = $1 ORDER BY e.orden`,
      [productoId]
    );

    res.json(result.rows);
  } catch (err) {
    if (err.status) return res.status(err.status).json({ error: err.message });
    console.error(err);
    res.status(500).json({ error: err.message });
  }
}
