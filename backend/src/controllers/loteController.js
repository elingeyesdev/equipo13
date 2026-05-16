import { pool } from '../config/database.js';

// ──────────────────────────────────────────────
// LOTES
// ──────────────────────────────────────────────

export const getLotes = async (req, res) => {
  const { negocioId } = req.params;
  try {
    const { rows } = await pool.query(
      `SELECT l.*,
              l.costo_adquisicion + COALESCE((
                SELECT SUM(b.monto)
                FROM bitacora_lote b
                WHERE b.lote_id = l.id AND b.es_baja = false AND b.monto IS NOT NULL
              ), 0) AS costo_total,
              COALESCE((
                SELECT SUM(b.monto)
                FROM bitacora_lote b
                WHERE b.lote_id = l.id AND b.es_baja = false AND b.tipo = 'Sanidad / Medicamento' AND b.monto IS NOT NULL
              ), 0) AS costo_sanidad,
              COALESCE((
                SELECT SUM(b.monto)
                FROM bitacora_lote b
                WHERE b.lote_id = l.id AND b.es_baja = false AND b.tipo = 'Mano de obra' AND b.monto IS NOT NULL
              ), 0) AS costo_mo
       FROM lotes l
       WHERE l.negocio_id = $1
       ORDER BY l.created_at DESC`,
      [negocioId]
    );
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
};

export const getLoteById = async (req, res) => {
  const { negocioId, id } = req.params;
  try {
    const { rows } = await pool.query(
      `SELECT l.*,
              l.costo_adquisicion + COALESCE((
                SELECT SUM(b.monto)
                FROM bitacora_lote b
                WHERE b.lote_id = l.id AND b.es_baja = false AND b.monto IS NOT NULL
              ), 0) AS costo_total,
              COALESCE((
                SELECT SUM(b.monto)
                FROM bitacora_lote b
                WHERE b.lote_id = l.id AND b.es_baja = false AND b.tipo = 'Sanidad / Medicamento' AND b.monto IS NOT NULL
              ), 0) AS costo_sanidad,
              COALESCE((
                SELECT SUM(b.monto)
                FROM bitacora_lote b
                WHERE b.lote_id = l.id AND b.es_baja = false AND b.tipo = 'Mano de obra' AND b.monto IS NOT NULL
              ), 0) AS costo_mo
       FROM lotes l
       WHERE l.id = $1 AND l.negocio_id = $2`,
      [id, negocioId]
    );
    if (!rows.length) return res.status(404).json({ error: 'Lote no encontrado' });
    res.json(rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
};

export const createLote = async (req, res) => {
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
    const { rows } = await pool.query(
      `INSERT INTO lotes
         (negocio_id, identificador, tipo_animal, fecha_entrada,
          cabezas_inicio, cabezas_activas,
          peso_inicial_prom, peso_actual_prom,
          costo_adquisicion, activo)
       VALUES ($1,$2,$3,$4,$5,$5,$6,$6,$7,true)
       RETURNING *`,
      [
        negocioId,
        identificador,
        tipo_animal,
        fecha_entrada || null,
        cabezas_inicio || 0,
        peso_inicial_prom || 0,
        costo_adquisicion || 0,
      ]
    );
    res.status(201).json(rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
};

export const updateLote = async (req, res) => {
  const { negocioId, id } = req.params;
  const { peso_actual_prom, cabezas_activas } = req.body;
  try {
    const { rows } = await pool.query(
      `UPDATE lotes
       SET peso_actual_prom = COALESCE($1, peso_actual_prom),
           cabezas_activas  = COALESCE($2, cabezas_activas)
       WHERE id = $3 AND negocio_id = $4
       RETURNING *`,
      [peso_actual_prom, cabezas_activas, id, negocioId]
    );
    if (!rows.length) return res.status(404).json({ error: 'Lote no encontrado' });
    res.json(rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
};

export const cerrarLote = async (req, res) => {
  const { negocioId, id } = req.params;
  try {
    const { rows } = await pool.query(
      `UPDATE lotes SET activo = false
       WHERE id = $1 AND negocio_id = $2
       RETURNING *`,
      [id, negocioId]
    );
    if (!rows.length) return res.status(404).json({ error: 'Lote no encontrado' });
    res.json(rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
};

// ──────────────────────────────────────────────
// BITÁCORA
// ──────────────────────────────────────────────

export const getBitacora = async (req, res) => {
  const { loteId } = req.params;
  try {
    const { rows } = await pool.query(
      `SELECT * FROM bitacora_lote
       WHERE lote_id = $1
       ORDER BY fecha DESC, created_at DESC`,
      [loteId]
    );
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
};

export const createBitacoraEntry = async (req, res) => {
  const { negocioId, loteId } = req.params;
  const { fecha, tipo, detalle, monto, es_baja, cabezas_baja, peso_baja, causa } = req.body;

  if (!tipo) return res.status(400).json({ error: 'tipo es requerido' });

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // Verificar que el lote pertenece al negocio
    const loteCheck = await client.query(
      'SELECT id, cabezas_activas FROM lotes WHERE id = $1 AND negocio_id = $2',
      [loteId, negocioId]
    );
    if (!loteCheck.rows.length) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: 'Lote no encontrado en este negocio' });
    }

    // Insertar registro en bitácora
    const { rows } = await client.query(
      `INSERT INTO bitacora_lote
         (lote_id, fecha, tipo, detalle, monto, es_baja, cabezas_baja, peso_baja, causa)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)
       RETURNING *`,
      [
        loteId,
        fecha || new Date().toISOString().split('T')[0],
        tipo,
        detalle || null,
        es_baja ? null : (monto || null),
        es_baja || false,
        cabezas_baja || null,
        peso_baja || null,
        causa || null,
      ]
    );

    // Si es baja, reducir cabezas_activas del lote
    if (es_baja && cabezas_baja) {
      const { cabezas_activas } = loteCheck.rows[0];
      const nuevas = Math.max(0, cabezas_activas - cabezas_baja);
      await client.query(
        'UPDATE lotes SET cabezas_activas = $1 WHERE id = $2',
        [nuevas, loteId]
      );
    }

    await client.query('COMMIT');
    res.status(201).json(rows[0]);
  } catch (err) {
    await client.query('ROLLBACK');
    console.error(err);
    res.status(500).json({ error: err.message });
  } finally {
    client.release();
  }
};

/**
 * PUT /api/negocios/:negocioId/lotes/:loteId/bitacora/:id
 * Edita un registro de bitácora. Guarda el estado anterior en bitacora_lote_historial.
 */
export const updateBitacoraEntry = async (req, res) => {
  const { negocioId, loteId, id } = req.params;
  const { fecha, tipo, detalle, monto, causa } = req.body;
  const userId = req.user?.id || null;

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // Verificar lote pertenece al negocio
    const loteCheck = await client.query(
      'SELECT id FROM lotes WHERE id = $1 AND negocio_id = $2',
      [loteId, negocioId]
    );
    if (!loteCheck.rows.length) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: 'Lote no encontrado' });
    }

    // Obtener estado actual del registro
    const current = await client.query(
      'SELECT * FROM bitacora_lote WHERE id = $1 AND lote_id = $2',
      [id, loteId]
    );
    if (!current.rows.length) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: 'Registro de bitácora no encontrado' });
    }

    const anterior = current.rows[0];

    // Actualizar el registro
    const { rows } = await client.query(
      `UPDATE bitacora_lote
       SET fecha   = COALESCE($1, fecha),
           tipo    = COALESCE($2, tipo),
           detalle = COALESCE($3, detalle),
           monto   = COALESCE($4, monto),
           causa   = COALESCE($5, causa)
       WHERE id = $6 AND lote_id = $7
       RETURNING *`,
      [
        fecha    || null,
        tipo     || null,
        detalle  || null,
        monto    !== undefined ? monto : null,
        causa    || null,
        id,
        loteId,
      ]
    );

    // Guardar en historial de auditoría
    await client.query(
      `INSERT INTO bitacora_lote_historial
         (bitacora_id, lote_id, accion, datos_anteriores, datos_nuevos, usuario_id)
       VALUES ($1, $2, 'EDICION', $3, $4, $5)`,
      [id, loteId, JSON.stringify(anterior), JSON.stringify(rows[0]), userId]
    );

    await client.query('COMMIT');
    res.json(rows[0]);
  } catch (err) {
    await client.query('ROLLBACK');
    console.error(err);
    res.status(500).json({ error: err.message });
  } finally {
    client.release();
  }
};

/**
 * DELETE /api/negocios/:negocioId/lotes/:loteId/bitacora/:id
 * Elimina un registro de bitácora. Guarda copia completa en bitacora_lote_historial.
 */
export const deleteBitacoraEntry = async (req, res) => {
  const { negocioId, loteId, id } = req.params;
  const userId = req.user?.id || null;

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // Verificar lote pertenece al negocio
    const loteCheck = await client.query(
      'SELECT id, cabezas_activas FROM lotes WHERE id = $1 AND negocio_id = $2',
      [loteId, negocioId]
    );
    if (!loteCheck.rows.length) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: 'Lote no encontrado' });
    }

    // Obtener registro antes de borrar
    const current = await client.query(
      'SELECT * FROM bitacora_lote WHERE id = $1 AND lote_id = $2',
      [id, loteId]
    );
    if (!current.rows.length) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: 'Registro de bitácora no encontrado' });
    }

    const registro = current.rows[0];

    // Si era una baja, restaurar cabezas_activas
    if (registro.es_baja && registro.cabezas_baja) {
      const { cabezas_activas } = loteCheck.rows[0];
      await client.query(
        'UPDATE lotes SET cabezas_activas = $1 WHERE id = $2',
        [cabezas_activas + registro.cabezas_baja, loteId]
      );
    }

    // Guardar en historial de auditoría ANTES de eliminar
    await client.query(
      `INSERT INTO bitacora_lote_historial
         (bitacora_id, lote_id, accion, datos_anteriores, datos_nuevos, usuario_id)
       VALUES ($1, $2, 'ELIMINACION', $3, NULL, $4)`,
      [id, loteId, JSON.stringify(registro), userId]
    );

    // Eliminar el registro
    await client.query('DELETE FROM bitacora_lote WHERE id = $1 AND lote_id = $2', [id, loteId]);

    await client.query('COMMIT');
    res.json({ message: 'Registro eliminado y guardado en historial' });
  } catch (err) {
    await client.query('ROLLBACK');
    console.error(err);
    res.status(500).json({ error: err.message });
  } finally {
    client.release();
  }
};

/**
 * GET /api/negocios/:negocioId/lotes/:loteId/bitacora/historial
 * Obtiene el historial de auditoría (ediciones y eliminaciones) de la bitácora del lote.
 */
export const getBitacoraHistorial = async (req, res) => {
  const { negocioId, loteId } = req.params;
  try {
    // Verificar que el lote pertenece al negocio
    const loteCheck = await pool.query(
      'SELECT id FROM lotes WHERE id = $1 AND negocio_id = $2',
      [loteId, negocioId]
    );
    if (!loteCheck.rows.length) {
      return res.status(404).json({ error: 'Lote no encontrado' });
    }

    const { rows } = await pool.query(
      `SELECT h.*, u.nombre AS usuario_nombre, u.email AS usuario_email
       FROM bitacora_lote_historial h
       LEFT JOIN users u ON u.id = h.usuario_id
       WHERE h.lote_id = $1
       ORDER BY h.created_at DESC`,
      [loteId]
    );
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
};
