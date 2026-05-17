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

export const liquidarLote = async (req, res) => {
  const { negocioId, id } = req.params;
  const {
    cabezas_venta,
    peso_prom_final,
    rendimiento_canal,
    escenario,
    pvp_kg,
    gastos_finales,
  } = req.body;

  const cabezas = Number(cabezas_venta);
  const pesoProm = Number(peso_prom_final);
  const rend = Number(rendimiento_canal);
  const pvp = Number(pvp_kg);
  const gastos = gastos_finales == null ? 0 : Number(gastos_finales);

  if (
    !Number.isFinite(cabezas) || cabezas <= 0 ||
    !Number.isFinite(pesoProm) || pesoProm <= 0 ||
    !Number.isFinite(rend) || rend <= 0 ||
    !Number.isFinite(pvp) || pvp <= 0 ||
    !Number.isFinite(gastos) || gastos < 0
  ) {
    return res.status(400).json({
      error: 'cabezas_venta, peso_prom_final, rendimiento_canal y pvp_kg son requeridos y deben ser > 0; gastos_finales debe ser >= 0',
    });
  }
  if (escenario !== 'pie' && escenario !== 'gancho') {
    return res.status(400).json({ error: 'escenario debe ser "pie" o "gancho"' });
  }

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const loteCheck = await client.query(
      'SELECT id, activo FROM lotes WHERE id = $1 AND negocio_id = $2 FOR UPDATE',
      [id, negocioId]
    );
    if (!loteCheck.rows.length) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: 'Lote no encontrado' });
    }
    if (loteCheck.rows[0].activo === false) {
      await client.query('ROLLBACK');
      return res.status(409).json({ error: 'El lote ya fue liquidado' });
    }

    const costoBitacora = await client.query(
      `SELECT COALESCE(SUM(monto), 0)::float AS total
       FROM bitacora_lote
       WHERE lote_id = $1 AND es_baja = false AND monto IS NOT NULL`,
      [id]
    );
    const costoAdq = await client.query(
      'SELECT COALESCE(costo_adquisicion, 0)::float AS adq FROM lotes WHERE id = $1',
      [id]
    );

    const peso_total_pie = cabezas * pesoProm;
    const peso_total_gancho = peso_total_pie * rend / 100;
    const costo_total = Number(costoAdq.rows[0].adq) + Number(costoBitacora.rows[0].total) + gastos;
    const costo_kg_vivo = peso_total_pie > 0 ? costo_total / peso_total_pie : null;
    const costo_kg_canal = peso_total_gancho > 0 ? costo_total / peso_total_gancho : null;
    const peso_venta = escenario === 'pie' ? peso_total_pie : peso_total_gancho;
    const ingreso = pvp * peso_venta;
    const utilidad = ingreso - costo_total;
    const margen = ingreso > 0 ? (utilidad / ingreso) * 100 : null;

    const liquidacion = {
      cabezas_venta: cabezas,
      peso_prom_final: pesoProm,
      rendimiento_canal: rend,
      escenario,
      pvp_kg: pvp,
      gastos_finales: gastos,
      peso_total_pie,
      peso_total_gancho,
      costo_total,
      costo_kg_vivo,
      costo_kg_canal,
      ingreso,
      utilidad,
      margen,
      liquidado_en: new Date().toISOString(),
    };

    const { rows } = await client.query(
      `UPDATE lotes
       SET activo = false,
           liquidacion_jsonb = $1
       WHERE id = $2 AND negocio_id = $3
       RETURNING *`,
      [liquidacion, id, negocioId]
    );

    await client.query('COMMIT');
    res.json({ ...rows[0], liquidacion });
  } catch (err) {
    await client.query('ROLLBACK');
    console.error(err);
    res.status(500).json({ error: err.message });
  } finally {
    client.release();
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

export const updateBitacoraEntry = async (req, res) => {
  const { negocioId, loteId, id } = req.params;
  const { fecha, tipo, detalle, monto, es_baja, cabezas_baja, peso_baja, causa } = req.body;

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // Bloquear el lote dueño y validar pertenencia
    const loteCheck = await client.query(
      'SELECT id, cabezas_activas FROM lotes WHERE id = $1 AND negocio_id = $2 FOR UPDATE',
      [loteId, negocioId]
    );
    if (!loteCheck.rows.length) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: 'Lote no encontrado en este negocio' });
    }

    // Cargar la entrada original (debe pertenecer al lote indicado)
    const orig = await client.query(
      'SELECT * FROM bitacora_lote WHERE id = $1 AND lote_id = $2',
      [id, loteId]
    );
    if (!orig.rows.length) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: 'Entrada de bitácora no encontrada' });
    }
    const prev = orig.rows[0];

    // Merge: si el campo no viene en el body, se mantiene el original
    const nuevoTipo = tipo ?? prev.tipo;
    if (!nuevoTipo) {
      await client.query('ROLLBACK');
      return res.status(400).json({ error: 'tipo es requerido' });
    }
    const nuevaFecha = fecha ?? prev.fecha;
    const nuevoDetalle = detalle !== undefined ? detalle : prev.detalle;
    const nuevoCausa = causa !== undefined ? causa : prev.causa;
    const nuevoPesoBaja = peso_baja !== undefined ? peso_baja : prev.peso_baja;
    const nuevoEsBaja = es_baja !== undefined ? !!es_baja : prev.es_baja;
    const nuevoCabezasBaja = cabezas_baja !== undefined ? cabezas_baja : prev.cabezas_baja;
    const nuevoMonto = nuevoEsBaja ? null : (monto !== undefined ? monto : prev.monto);

    // Diferencia de cabezas_baja: revertir lo viejo (suma) y aplicar lo nuevo (resta)
    const prevCabBaja = prev.es_baja && prev.cabezas_baja ? Number(prev.cabezas_baja) : 0;
    const newCabBaja = nuevoEsBaja && nuevoCabezasBaja ? Number(nuevoCabezasBaja) : 0;
    const delta = prevCabBaja - newCabBaja; // positivo: el lote recupera cabezas

    if (delta !== 0) {
      const cabezasActuales = Number(loteCheck.rows[0].cabezas_activas) || 0;
      const nuevas = Math.max(0, cabezasActuales + delta);
      await client.query(
        'UPDATE lotes SET cabezas_activas = $1 WHERE id = $2',
        [nuevas, loteId]
      );
    }

    const { rows } = await client.query(
      `UPDATE bitacora_lote
       SET fecha = $1,
           tipo = $2,
           detalle = $3,
           monto = $4,
           es_baja = $5,
           cabezas_baja = $6,
           peso_baja = $7,
           causa = $8
       WHERE id = $9
       RETURNING *`,
      [
        nuevaFecha,
        nuevoTipo,
        nuevoDetalle,
        nuevoMonto,
        nuevoEsBaja,
        nuevoEsBaja ? (nuevoCabezasBaja || null) : null,
        nuevoPesoBaja,
        nuevoCausa,
        id,
      ]
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

export const deleteBitacoraEntry = async (req, res) => {
  const { negocioId, loteId, id } = req.params;

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const loteCheck = await client.query(
      'SELECT id, cabezas_activas FROM lotes WHERE id = $1 AND negocio_id = $2 FOR UPDATE',
      [loteId, negocioId]
    );
    if (!loteCheck.rows.length) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: 'Lote no encontrado en este negocio' });
    }

    const orig = await client.query(
      'SELECT * FROM bitacora_lote WHERE id = $1 AND lote_id = $2',
      [id, loteId]
    );
    if (!orig.rows.length) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: 'Entrada de bitácora no encontrada' });
    }
    const prev = orig.rows[0];

    // Si era baja, revertir las cabezas al lote
    if (prev.es_baja && prev.cabezas_baja) {
      const cabezasActuales = Number(loteCheck.rows[0].cabezas_activas) || 0;
      const nuevas = cabezasActuales + Number(prev.cabezas_baja);
      await client.query(
        'UPDATE lotes SET cabezas_activas = $1 WHERE id = $2',
        [nuevas, loteId]
      );
    }

    await client.query('DELETE FROM bitacora_lote WHERE id = $1', [id]);

    await client.query('COMMIT');
    res.json({ ok: true, deleted: prev });
  } catch (err) {
    await client.query('ROLLBACK');
    console.error(err);
    res.status(500).json({ error: err.message });
  } finally {
    client.release();
  }
};
