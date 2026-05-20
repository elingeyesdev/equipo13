import { pool } from '../config/database.js';

// GET /negocios/:negocioId/lotes/:id/despiece
export const getDespiece = async (req, res) => {
  const { negocioId, id } = req.params;
  try {
    const loteCheck = await pool.query(
      'SELECT id FROM lotes WHERE id = $1 AND negocio_id = $2',
      [id, negocioId]
    );
    if (!loteCheck.rows.length) {
      return res.status(404).json({ error: 'Lote no encontrado' });
    }

    const { rows: cortes } = await pool.query(
      `SELECT dc.*, i.nombre AS insumo_nombre
       FROM despiece_cortes dc
       LEFT JOIN insumos i ON i.id = dc.insumo_generado_id
       WHERE dc.lote_id = $1
       ORDER BY dc.created_at ASC`,
      [id]
    );

    const peso_canal_total = cortes.reduce((acc, c) => acc + Number(c.peso_kg), 0);
    res.json({ cortes, peso_canal_total });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
};

// POST /negocios/:negocioId/lotes/:id/despiece
// Body: { cortes: [{ nombre, peso_kg }] }
// Reemplaza todos los cortes existentes del lote (sin insumo generado).
// Calcula costo_kg_derivado = costo_total_lote / peso_canal_total.
export const createDespiece = async (req, res) => {
  const { negocioId, id } = req.params;
  const { cortes } = req.body;

  if (!Array.isArray(cortes) || cortes.length === 0) {
    return res.status(400).json({ error: 'cortes debe ser un array no vacío' });
  }

  for (const c of cortes) {
    if (!c.nombre || !c.peso_kg || Number(c.peso_kg) <= 0) {
      return res.status(400).json({
        error: 'Cada corte requiere nombre y peso_kg > 0',
      });
    }
  }

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const loteCheck = await client.query(
      'SELECT id, costo_adquisicion FROM lotes WHERE id = $1 AND negocio_id = $2 FOR UPDATE',
      [id, negocioId]
    );
    if (!loteCheck.rows.length) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: 'Lote no encontrado' });
    }

    // Costo total del lote (adquisición + bitácora)
    const costoBitacora = await client.query(
      `SELECT COALESCE(SUM(monto), 0) AS total
       FROM bitacora_lote
       WHERE lote_id = $1 AND es_baja = false AND monto IS NOT NULL`,
      [id]
    );
    const costo_adquisicion = Number(loteCheck.rows[0].costo_adquisicion) || 0;
    const costo_total_lote = costo_adquisicion + Number(costoBitacora.rows[0].total);

    // Peso canal total = suma de todos los cortes
    const peso_canal_total = cortes.reduce((acc, c) => acc + Number(c.peso_kg), 0);
    const costo_kg_derivado = peso_canal_total > 0 ? costo_total_lote / peso_canal_total : 0;

    // Eliminar cortes previos que no hayan generado insumo (los ya vinculados se preservan)
    await client.query(
      'DELETE FROM despiece_cortes WHERE lote_id = $1 AND insumo_generado_id IS NULL',
      [id]
    );

    const insertados = [];
    for (const c of cortes) {
      const peso_kg = Number(c.peso_kg);
      const porcentaje_canal = peso_canal_total > 0 ? (peso_kg / peso_canal_total) * 100 : 0;

      const { rows } = await client.query(
        `INSERT INTO despiece_cortes
           (lote_id, nombre, peso_kg, porcentaje_canal, costo_kg_derivado)
         VALUES ($1, $2, $3, $4, $5)
         RETURNING *`,
        [id, c.nombre.trim(), peso_kg, porcentaje_canal, costo_kg_derivado]
      );
      insertados.push(rows[0]);
    }

    await client.query('COMMIT');
    res.status(201).json({
      cortes: insertados,
      peso_canal_total,
      costo_total_lote,
      costo_kg_derivado,
    });
  } catch (err) {
    await client.query('ROLLBACK');
    console.error(err);
    res.status(500).json({ error: err.message });
  } finally {
    client.release();
  }
};

// POST /negocios/:negocioId/lotes/:id/despiece/generar-insumos
// Por cada corte sin insumo_generado_id crea un insumo con precio_unitario = costo_kg_derivado
// y guarda el id del insumo creado en el corte. Puente agro → industrial.
export const generarInsumos = async (req, res) => {
  const { negocioId, id } = req.params;

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const loteCheck = await client.query(
      'SELECT id, identificador FROM lotes WHERE id = $1 AND negocio_id = $2 FOR UPDATE',
      [id, negocioId]
    );
    if (!loteCheck.rows.length) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: 'Lote no encontrado' });
    }
    const loteIdentificador = loteCheck.rows[0].identificador;

    const { rows: cortesHuerfanos } = await client.query(
      `SELECT * FROM despiece_cortes
       WHERE lote_id = $1 AND insumo_generado_id IS NULL
       ORDER BY created_at ASC`,
      [id]
    );

    if (!cortesHuerfanos.length) {
      await client.query('ROLLBACK');
      return res.status(409).json({
        error: 'Todos los cortes ya tienen insumo generado o no hay cortes registrados',
      });
    }

    // Buscar unidad "kg" del negocio para asignarla al insumo (opcional, no falla si no existe)
    const unidadKg = await client.query(
      `SELECT id FROM unidades_medida
       WHERE negocio_id = $1 AND (simbolo ILIKE 'kg' OR nombre ILIKE 'kilogramo%')
       LIMIT 1`,
      [negocioId]
    );
    const unidad_id = unidadKg.rows[0]?.id ?? null;

    const creados = [];
    for (const corte of cortesHuerfanos) {
      const { rows: insumoRows } = await client.query(
        `INSERT INTO insumos
           (negocio_id, nombre, precio_unitario, unidad_id, es_variable, notas, activo)
         VALUES ($1, $2, $3, $4, false, $5, true)
         RETURNING *`,
        [
          negocioId,
          corte.nombre,
          corte.costo_kg_derivado,
          unidad_id,
          `Generado desde despiece del lote ${loteIdentificador}`,
        ]
      );
      const insumo = insumoRows[0];

      await client.query(
        'UPDATE despiece_cortes SET insumo_generado_id = $1 WHERE id = $2',
        [insumo.id, corte.id]
      );

      creados.push({ corte_id: corte.id, corte_nombre: corte.nombre, insumo });
    }

    await client.query('COMMIT');
    res.status(201).json({ generados: creados.length, insumos: creados });
  } catch (err) {
    await client.query('ROLLBACK');
    console.error(err);
    res.status(500).json({ error: err.message });
  } finally {
    client.release();
  }
};

// DELETE /negocios/:negocioId/lotes/:id/despiece/:corteId
export const deleteCorte = async (req, res) => {
  const { negocioId, id, corteId } = req.params;
  try {
    const loteCheck = await pool.query(
      'SELECT id FROM lotes WHERE id = $1 AND negocio_id = $2',
      [id, negocioId]
    );
    if (!loteCheck.rows.length) {
      return res.status(404).json({ error: 'Lote no encontrado' });
    }

    const { rows } = await pool.query(
      'DELETE FROM despiece_cortes WHERE id = $1 AND lote_id = $2 RETURNING *',
      [corteId, id]
    );
    if (!rows.length) {
      return res.status(404).json({ error: 'Corte no encontrado' });
    }

    res.json({ ok: true, deleted: rows[0] });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
};
