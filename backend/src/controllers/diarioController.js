import { pool } from '../config/database.js';
import { calcularConsumoFIFO } from '../services/inventarioFIFO.js';

// ──────────────────────────────────────────────
// DIARIO DE PRODUCCIÓN
// ──────────────────────────────────────────────

export const getDiario = async (req, res) => {
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

export const createDiarioEntry = async (req, res) => {
  const { negocioId, loteId } = req.params;
  const { fecha, tipo, detalle, monto, cantidad_kg, es_baja, cabezas_baja, peso_baja, causa, cantidad, precio_unitario } = req.body;

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

    // Insertar registro en diario
    const { rows } = await client.query(
      `INSERT INTO bitacora_lote
         (lote_id, fecha, tipo, detalle, monto, cantidad_kg, es_baja, cabezas_baja, peso_baja, causa, cantidad, precio_unitario)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12)
       RETURNING *`,
      [
        loteId,
        fecha || new Date().toISOString().split('T')[0],
        tipo,
        detalle || null,
        es_baja ? null : (monto || null),
        cantidad_kg || null,
        es_baja || false,
        cabezas_baja || null,
        peso_baja || null,
        causa || null,
        cantidad || null,
        precio_unitario || null,
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

export const updateDiarioEntry = async (req, res) => {
  const { negocioId, loteId, id } = req.params;
  const { fecha, tipo, detalle, monto, cantidad_kg, es_baja, cabezas_baja, peso_baja, causa, cantidad, precio_unitario } = req.body;

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
      return res.status(404).json({ error: 'Entrada de diario no encontrada' });
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
    const nuevaCantidadKg = cantidad_kg !== undefined ? cantidad_kg : prev.cantidad_kg;
    const nuevaCantidad = cantidad !== undefined ? cantidad : prev.cantidad;
    const nuevoPrecioUnitario = precio_unitario !== undefined ? precio_unitario : prev.precio_unitario;

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
           cantidad_kg = $5,
           es_baja = $6,
           cabezas_baja = $7,
           peso_baja = $8,
           causa = $9,
           cantidad = $10,
           precio_unitario = $11
       WHERE id = $12
       RETURNING *`,
      [
        nuevaFecha,
        nuevoTipo,
        nuevoDetalle,
        nuevoMonto,
        nuevaCantidadKg ?? null,
        nuevoEsBaja,
        nuevoEsBaja ? (nuevoCabezasBaja || null) : null,
        nuevoPesoBaja,
        nuevoCausa,
        nuevaCantidad ?? null,
        nuevoPrecioUnitario ?? null,
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

export const deleteDiarioEntry = async (req, res) => {
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
      return res.status(404).json({ error: 'Entrada de diario no encontrada' });
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

// ──────────────────────────────────────────────
// CONSUMO DE INSUMOS (FIFO)
// ──────────────────────────────────────────────

export async function consumirInsumo(req, res) {
  const { negocioId, loteId } = req.params;
  const { insumo_id, cantidad, fecha_consumo, notas } = req.body;

  if (!insumo_id || !cantidad || parseFloat(cantidad) <= 0 || !fecha_consumo) {
    return res.status(400).json({ error: 'insumo_id, cantidad (> 0) y fecha_consumo son requeridos' });
  }

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const loteResult = await client.query(
      'SELECT id FROM lotes WHERE id = $1 AND negocio_id = $2 AND activo = true',
      [loteId, negocioId]
    );
    if (!loteResult.rows.length) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: 'Lote no encontrado o inactivo' });
    }

    const insumoResult = await client.query(
      'SELECT id, nombre FROM insumos WHERE id = $1 AND negocio_id = $2',
      [insumo_id, negocioId]
    );
    if (!insumoResult.rows.length) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: 'Insumo no encontrado' });
    }

    const capasResult = await client.query(
      `SELECT id, cantidad_disponible, precio_unitario, fecha_compra
       FROM compras_insumo
       WHERE insumo_id = $1 AND negocio_id = $2 AND cantidad_disponible > 0
       ORDER BY fecha_compra ASC, created_at ASC
       FOR UPDATE`,
      [insumo_id, negocioId]
    );

    let resultado;
    try {
      resultado = calcularConsumoFIFO({
        capasStock: capasResult.rows,
        cantidadRequerida: parseFloat(cantidad),
      });
    } catch (fifoError) {
      await client.query('ROLLBACK');
      return res.status(422).json({ error: fifoError.message });
    }

    const { lineasFIFO, actualizaciones, costoTotal, precioPromedio } = resultado;

    for (const act of actualizaciones) {
      await client.query(
        'UPDATE compras_insumo SET cantidad_disponible = $1 WHERE id = $2',
        [act.nueva_cantidad_disponible, act.compra_id]
      );
    }

    const consumoResult = await client.query(
      `INSERT INTO consumos_lote
         (negocio_id, lote_id, insumo_id, fecha_consumo,
          cantidad_total, costo_total, precio_promedio, detalle_fifo, notas)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
       RETURNING *`,
      [
        negocioId, loteId, insumo_id, fecha_consumo,
        cantidad, costoTotal, precioPromedio,
        JSON.stringify(lineasFIFO),
        notas || null,
      ]
    );

    await client.query('COMMIT');

    return res.status(201).json({
      consumo: consumoResult.rows[0],
      precio_promedio: precioPromedio,
      costo_total: costoTotal,
      detalle_fifo: lineasFIFO,
    });

  } catch (err) {
    await client.query('ROLLBACK');
    console.error('consumirInsumo error:', err);
    return res.status(500).json({ error: err.message });
  } finally {
    client.release();
  }
}

export async function listarConsumos(req, res) {
  const { negocioId, loteId } = req.params;
  try {
    const { rows } = await pool.query(
      `SELECT cl.*,
              i.nombre AS insumo_nombre,
              um.simbolo AS unidad_simbolo
       FROM consumos_lote cl
       JOIN insumos i ON i.id = cl.insumo_id
       LEFT JOIN unidades_medida um ON um.id = i.unidad_id
       WHERE cl.lote_id = $1 AND cl.negocio_id = $2
       ORDER BY cl.fecha_consumo DESC, cl.created_at DESC`,
      [loteId, negocioId]
    );
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
}
