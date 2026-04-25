import { pool } from '../config/database.js';

// ─────────────────────────────────────────────────────────────────────────────
// LOTES
// ─────────────────────────────────────────────────────────────────────────────

/**
 * GET /api/negocios/:negocioId/lotes
 * Lista lotes del negocio con costo_total calculado.
 */
export async function getLotes(req, res) {
  const { negocioId } = req.params;
  try {
    const result = await pool.query(
      `SELECT
         l.*,
         COALESCE(l.costo_adquisicion, 0) + COALESCE(gastos.total_gastos, 0) AS costo_total
       FROM lotes l
       LEFT JOIN (
         SELECT lote_id, SUM(monto) AS total_gastos
         FROM bitacora_lote
         WHERE es_baja = false AND monto IS NOT NULL
         GROUP BY lote_id
       ) gastos ON gastos.lote_id = l.id
       WHERE l.negocio_id = $1
       ORDER BY l.created_at DESC`,
      [negocioId]
    );
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
}

/**
 * GET /api/negocios/:negocioId/lotes/:id
 * Detalle de un lote con costo_total.
 */
export async function getLoteById(req, res) {
  const { negocioId, id } = req.params;
  try {
    const result = await pool.query(
      `SELECT
         l.*,
         COALESCE(l.costo_adquisicion, 0) + COALESCE(gastos.total_gastos, 0) AS costo_total
       FROM lotes l
       LEFT JOIN (
         SELECT lote_id, SUM(monto) AS total_gastos
         FROM bitacora_lote
         WHERE es_baja = false AND monto IS NOT NULL
         GROUP BY lote_id
       ) gastos ON gastos.lote_id = l.id
       WHERE l.id = $1 AND l.negocio_id = $2`,
      [id, negocioId]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Lote no encontrado' });
    }
    res.json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
}

/**
 * POST /api/negocios/:negocioId/lotes
 * Crea un lote. cabezas_activas = cabezas_inicio, peso_actual_prom = peso_inicial_prom.
 */
export async function createLote(req, res) {
  const { negocioId } = req.params;
  const {
    identificador,
    tipo_animal,
    fecha_entrada,
    cabezas_inicio,
    peso_inicial_prom,
    costo_adquisicion,
  } = req.body;

  if (!identificador || !tipo_animal) {
    return res.status(400).json({ error: 'identificador y tipo_animal son requeridos' });
  }

  try {
    const result = await pool.query(
      `INSERT INTO lotes
         (negocio_id, identificador, tipo_animal, fecha_entrada,
          cabezas_inicio, cabezas_activas,
          peso_inicial_prom, peso_actual_prom, costo_adquisicion)
       VALUES ($1, $2, $3, $4, $5, $5, $6, $6, $7)
       RETURNING *`,
      [
        negocioId,
        identificador,
        tipo_animal,
        fecha_entrada || null,
        cabezas_inicio || null,
        peso_inicial_prom || null,
        costo_adquisicion || null,
      ]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
}

/**
 * PUT /api/negocios/:negocioId/lotes/:id
 * Actualiza peso_actual_prom y cabezas_activas (ajustes manuales).
 */
export async function updateLote(req, res) {
  const { negocioId, id } = req.params;
  const { peso_actual_prom, cabezas_activas } = req.body;
  try {
    const result = await pool.query(
      `UPDATE lotes
       SET peso_actual_prom = COALESCE($1, peso_actual_prom),
           cabezas_activas  = COALESCE($2, cabezas_activas)
       WHERE id = $3 AND negocio_id = $4
       RETURNING *`,
      [peso_actual_prom ?? null, cabezas_activas ?? null, id, negocioId]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Lote no encontrado' });
    }
    res.json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
}

/**
 * PATCH /api/negocios/:negocioId/lotes/:id/cerrar
 * Cierra el lote (activo = false).
 */
export async function cerrarLote(req, res) {
  const { negocioId, id } = req.params;
  try {
    const result = await pool.query(
      `UPDATE lotes SET activo = false
       WHERE id = $1 AND negocio_id = $2
       RETURNING *`,
      [id, negocioId]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Lote no encontrado' });
    }
    res.json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// BITÁCORA
// ─────────────────────────────────────────────────────────────────────────────

/**
 * GET /api/negocios/:negocioId/lotes/:loteId/bitacora
 * Lista registros de bitácora del lote, más recientes primero.
 */
export async function getBitacora(req, res) {
  const { negocioId, loteId } = req.params;
  try {
    // Verificar que el lote pertenece al negocio
    const loteCheck = await pool.query(
      'SELECT id FROM lotes WHERE id = $1 AND negocio_id = $2',
      [loteId, negocioId]
    );
    if (loteCheck.rows.length === 0) {
      return res.status(403).json({ error: 'Lote no pertenece a este negocio' });
    }

    const result = await pool.query(
      `SELECT * FROM bitacora_lote
       WHERE lote_id = $1
       ORDER BY fecha DESC, created_at DESC`,
      [loteId]
    );
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
}

/**
 * POST /api/negocios/:negocioId/lotes/:loteId/bitacora
 * Registra una entrada en la bitácora.
 * Si es_baja = true, descuenta cabezas_baja de lotes.cabezas_activas.
 */
export async function createBitacora(req, res) {
  const { negocioId, loteId } = req.params;
  const { fecha, tipo, detalle, monto, es_baja, cabezas_baja, peso_baja, causa } = req.body;

  if (!tipo) {
    return res.status(400).json({ error: 'tipo es requerido' });
  }

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // Verificar que el lote pertenece al negocio
    const loteCheck = await client.query(
      'SELECT id, cabezas_activas FROM lotes WHERE id = $1 AND negocio_id = $2',
      [loteId, negocioId]
    );
    if (loteCheck.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(403).json({ error: 'Lote no pertenece a este negocio' });
    }

    // Insertar registro de bitácora
    // Si es baja, el monto es null (costo ya en adquisición)
    const montoFinal = es_baja ? null : (monto ?? null);

    const result = await client.query(
      `INSERT INTO bitacora_lote
         (lote_id, fecha, tipo, detalle, monto, es_baja, cabezas_baja, peso_baja, causa)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
       RETURNING *`,
      [
        loteId,
        fecha || null,
        tipo,
        detalle || null,
        montoFinal,
        es_baja ?? false,
        cabezas_baja || null,
        peso_baja || null,
        causa || null,
      ]
    );

    // Si es baja, restar cabezas_activas
    if (es_baja && cabezas_baja) {
      await client.query(
        `UPDATE lotes
         SET cabezas_activas = GREATEST(0, cabezas_activas - $1)
         WHERE id = $2`,
        [cabezas_baja, loteId]
      );
    }

    await client.query('COMMIT');
    res.status(201).json(result.rows[0]);
  } catch (err) {
    await client.query('ROLLBACK');
    console.error(err);
    res.status(500).json({ error: err.message });
  } finally {
    client.release();
  }
}
