import { pool } from '../config/database.js';
import { getEstandarDia } from '../services/estandaresAnimales.js';
import { calcularConsumoFIFO } from '../services/inventarioFIFO.js';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function diffDays(fechaEntrada, fecha) {
  const d1 = new Date(fechaEntrada instanceof Date
    ? fechaEntrada.toISOString().split('T')[0]
    : fechaEntrada);
  const d2 = new Date(fecha instanceof Date
    ? fecha.toISOString().split('T')[0]
    : fecha);
  return Math.round((d2 - d1) / (1000 * 60 * 60 * 24));
}

function padDate(year, month, day) {
  return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
}

async function loadLote(negocioId, loteId) {
  const { rows } = await pool.query(
    'SELECT * FROM lotes WHERE id = $1 AND negocio_id = $2',
    [loteId, negocioId]
  );
  return rows[0] || null;
}

async function loadItemsConDetalle(registroId) {
  const { rows } = await pool.query(
    `SELECT rdi.*,
            i.nombre   AS insumo_nombre,
            um.simbolo AS unidad_simbolo,
            cs.nombre  AS catalogo_servicio_nombre
     FROM registro_diario_item rdi
     LEFT JOIN insumos i             ON i.id  = rdi.insumo_id
     LEFT JOIN unidades_medida um    ON um.id = rdi.unidad_id
     LEFT JOIN catalogo_servicios cs ON cs.id = rdi.servicio_id
     WHERE rdi.registro_diario_id = $1
     ORDER BY rdi.created_at`,
    [registroId]
  );
  return rows;
}

// ─── GET /:negocioId/lotes/:loteId/estandar?fecha=YYYY-MM-DD ─────────────────

export async function getEstandarDelDia(req, res) {
  const { negocioId, loteId } = req.params;
  const fecha = req.query.fecha || new Date().toISOString().split('T')[0];

  try {
    const lote = await loadLote(negocioId, loteId);
    if (!lote) return res.status(404).json({ error: 'Lote no encontrado' });

    const fechaEntrada = lote.fecha_entrada
      ? lote.fecha_entrada.toISOString().split('T')[0]
      : fecha;

    const diasEnLote = diffDays(fechaEntrada, fecha);
    const edadActualDias = (lote.edad_promedio_dias || 0) + diasEnLote;

    const estandar = getEstandarDia({
      especie: lote.tipo_animal,
      edadActualDias,
      diasEnLote,
    });

    res.json({
      lote: { id: lote.id, identificador: lote.identificador, tipo_animal: lote.tipo_animal },
      fecha,
      dias_en_lote: diasEnLote,
      edad_actual_dias: edadActualDias,
      estandar,
    });
  } catch (err) {
    console.error('getEstandarDelDia error:', err);
    res.status(500).json({ error: err.message });
  }
}

// ─── GET /:negocioId/lotes/:loteId/hoja-de-vida?anio=2025&mes=5 ──────────────

export async function getVistaMensual(req, res) {
  const { negocioId, loteId } = req.params;
  const anio = parseInt(req.query.anio) || new Date().getFullYear();
  const mes  = parseInt(req.query.mes)  || new Date().getMonth() + 1;

  try {
    const lote = await loadLote(negocioId, loteId);
    if (!lote) return res.status(404).json({ error: 'Lote no encontrado' });

    const fechaEntrada = lote.fecha_entrada
      ? lote.fecha_entrada.toISOString().split('T')[0]
      : null;

    const diasEnMes = new Date(anio, mes, 0).getDate();
    const fechaInicio = padDate(anio, mes, 1);
    const fechaFin    = padDate(anio, mes, diasEnMes);

    // Cargar todos los registros del mes con sus items
    const { rows: registros } = await pool.query(
      `SELECT rdl.*,
              json_agg(
                json_build_object(
                  'id',              rdi.id,
                  'tipo',            rdi.tipo,
                  'insumo_id',       rdi.insumo_id,
                  'cantidad',        rdi.cantidad,
                  'unidad_id',       rdi.unidad_id,
                  'costo_real',      rdi.costo_real,
                  'servicio_nombre', rdi.servicio_nombre,
                  'costo_servicio',  rdi.costo_servicio
                )
                ORDER BY rdi.created_at
              ) FILTER (WHERE rdi.id IS NOT NULL) AS items
       FROM registro_diario_lote rdl
       LEFT JOIN registro_diario_item rdi ON rdi.registro_diario_id = rdl.id
       WHERE rdl.lote_id = $1
         AND rdl.negocio_id = $2
         AND rdl.fecha >= $3
         AND rdl.fecha <= $4
       GROUP BY rdl.id`,
      [loteId, negocioId, fechaInicio, fechaFin]
    );

    // Indexar registros por fecha (YYYY-MM-DD string)
    const registrosPorFecha = {};
    for (const r of registros) {
      const key = r.fecha instanceof Date
        ? r.fecha.toISOString().split('T')[0]
        : String(r.fecha).split('T')[0];
      registrosPorFecha[key] = r;
    }

    // Construir el array de días del mes
    const dias = [];
    let fasePredominante = null;

    for (let d = 1; d <= diasEnMes; d++) {
      const fechaDia = padDate(anio, mes, d);
      const diasEnLote = fechaEntrada ? diffDays(fechaEntrada, fechaDia) : 0;
      const edadActualDias = (lote.edad_promedio_dias || 0) + diasEnLote;

      const estandar = getEstandarDia({
        especie: lote.tipo_animal,
        edadActualDias,
        diasEnLote,
      });

      if (d === 15 && estandar) fasePredominante = estandar.fase;

      const registro = registrosPorFecha[fechaDia] || null;

      dias.push({
        fecha: fechaDia,
        dia_del_mes: d,
        dias_en_lote: diasEnLote,
        fase: estandar?.fase || null,
        confirmado: registro?.confirmado || false,
        tiene_registro: registro !== null,
        estandar_resumido: estandar
          ? { alimentacion: estandar.alimentacion, sanitario_hoy: estandar.sanitario_hoy }
          : null,
        registro: registro
          ? { id: registro.id, items: registro.items || [], notas_del_dia: registro.notas_del_dia, confirmado_en: registro.confirmado_en }
          : null,
      });
    }

    res.json({
      lote: { id: lote.id, identificador: lote.identificador, tipo_animal: lote.tipo_animal },
      mes,
      anio,
      fase_predominante: fasePredominante,
      dias,
    });
  } catch (err) {
    console.error('getVistaMensual error:', err);
    res.status(500).json({ error: err.message });
  }
}

// ─── GET /:negocioId/lotes/:loteId/hoja-de-vida/:fecha ───────────────────────

export async function getDetalleDia(req, res) {
  const { negocioId, loteId, fecha } = req.params;

  try {
    const lote = await loadLote(negocioId, loteId);
    if (!lote) return res.status(404).json({ error: 'Lote no encontrado' });

    const fechaEntrada = lote.fecha_entrada
      ? lote.fecha_entrada.toISOString().split('T')[0]
      : fecha;

    const diasEnLote = diffDays(fechaEntrada, fecha);
    const edadActualDias = (lote.edad_promedio_dias || 0) + diasEnLote;

    const estandar = getEstandarDia({
      especie: lote.tipo_animal,
      edadActualDias,
      diasEnLote,
    });

    // Cargar registro del día
    const { rows: regRows } = await pool.query(
      `SELECT * FROM registro_diario_lote
       WHERE lote_id = $1 AND negocio_id = $2 AND fecha = $3`,
      [loteId, negocioId, fecha]
    );
    const registro = regRows[0] || null;

    let items = [];
    if (registro) {
      items = await loadItemsConDetalle(registro.id);
    }

    res.json({
      lote: { id: lote.id, identificador: lote.identificador, tipo_animal: lote.tipo_animal },
      fecha,
      dias_en_lote: diasEnLote,
      edad_actual_dias: edadActualDias,
      estandar,
      registro: registro ? { ...registro, items } : null,
    });
  } catch (err) {
    console.error('getDetalleDia error:', err);
    res.status(500).json({ error: err.message });
  }
}

// ─── POST /:negocioId/lotes/:loteId/hoja-de-vida/:fecha ──────────────────────

export async function guardarRegistroDia(req, res) {
  const { negocioId, loteId, fecha } = req.params;
  const { notas_del_dia, items = [] } = req.body;

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // Verificar que el lote existe en el negocio
    const loteCheck = await client.query(
      'SELECT id FROM lotes WHERE id = $1 AND negocio_id = $2',
      [loteId, negocioId]
    );
    if (!loteCheck.rows.length) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: 'Lote no encontrado' });
    }

    // Buscar registro existente
    const regCheck = await client.query(
      `SELECT * FROM registro_diario_lote
       WHERE lote_id = $1 AND fecha = $2 FOR UPDATE`,
      [loteId, fecha]
    );

    let registroId;

    if (regCheck.rows.length) {
      const reg = regCheck.rows[0];
      if (reg.confirmado) {
        await client.query('ROLLBACK');
        return res.status(409).json({ error: 'Este día ya fue confirmado y no puede modificarse' });
      }
      // Actualizar notas y eliminar items anteriores
      await client.query(
        'UPDATE registro_diario_lote SET notas_del_dia = $1 WHERE id = $2',
        [notas_del_dia || null, reg.id]
      );
      await client.query(
        'DELETE FROM registro_diario_item WHERE registro_diario_id = $1',
        [reg.id]
      );
      registroId = reg.id;
    } else {
      // Crear nuevo registro
      const { rows } = await client.query(
        `INSERT INTO registro_diario_lote
           (negocio_id, lote_id, fecha, notas_del_dia)
         VALUES ($1, $2, $3, $4)
         RETURNING id`,
        [negocioId, loteId, fecha, notas_del_dia || null]
      );
      registroId = rows[0].id;
    }

    // Insertar items
    for (const item of items) {
      await client.query(
        `INSERT INTO registro_diario_item
           (registro_diario_id, tipo,
            insumo_id, cantidad, unidad_id,
            servicio_id, servicio_nombre, costo_servicio, realizado_por)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
        [
          registroId,
          item.tipo,
          item.tipo === 'insumo' ? (item.insumo_id  || null) : null,
          item.tipo === 'insumo' ? (item.cantidad   || null) : null,
          item.tipo === 'insumo' ? (item.unidad_id  || null) : null,
          item.tipo === 'servicio' ? (item.servicio_id    || null) : null,
          item.tipo === 'servicio' ? (item.servicio_nombre || null) : null,
          item.tipo === 'servicio' ? (item.costo_servicio  || null) : null,
          item.tipo === 'servicio' ? (item.realizado_por   || null) : null,
        ]
      );
    }

    await client.query('COMMIT');
    const { rows: regRows } = await pool.query(
      'SELECT * FROM registro_diario_lote WHERE id = $1',
      [registroId]
    );
    const savedItems = await loadItemsConDetalle(registroId);
    res.json({ ...regRows[0], items: savedItems });
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('guardarRegistroDia error:', err);
    res.status(500).json({ error: err.message });
  } finally {
    client.release();
  }
}

// ─── POST /:negocioId/lotes/:loteId/hoja-de-vida/:fecha/confirmar ────────────

export async function confirmarDia(req, res) {
  const { negocioId, loteId, fecha } = req.params;

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // 1. Cargar y bloquear registro
    const regResult = await client.query(
      `SELECT * FROM registro_diario_lote
       WHERE lote_id = $1 AND negocio_id = $2 AND fecha = $3
       FOR UPDATE`,
      [loteId, negocioId, fecha]
    );
    if (!regResult.rows.length) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: 'No hay registro para esta fecha. Guardá un borrador primero.' });
    }
    const registro = regResult.rows[0];
    if (registro.confirmado) {
      await client.query('ROLLBACK');
      return res.status(409).json({ error: 'Este día ya fue confirmado' });
    }

    // 2. Cargar todos los items del registro
    const itemsResult = await client.query(
      'SELECT * FROM registro_diario_item WHERE registro_diario_id = $1',
      [registro.id]
    );

    // 3. Para cada item tipo 'insumo': ejecutar FIFO
    for (const item of itemsResult.rows) {
      if (item.tipo !== 'insumo' || !item.insumo_id || !item.cantidad) continue;

      const insumoCheck = await client.query(
        'SELECT id, nombre FROM insumos WHERE id = $1 AND negocio_id = $2',
        [item.insumo_id, negocioId]
      );
      if (!insumoCheck.rows.length) {
        await client.query('ROLLBACK');
        return res.status(404).json({ error: `Insumo no encontrado: ${item.insumo_id}` });
      }

      // Cargar capas FIFO con bloqueo
      const capasResult = await client.query(
        `SELECT id, cantidad_disponible, precio_unitario, fecha_compra
         FROM compras_insumo
         WHERE insumo_id = $1 AND negocio_id = $2 AND cantidad_disponible > 0
         ORDER BY fecha_compra ASC, created_at ASC
         FOR UPDATE`,
        [item.insumo_id, negocioId]
      );

      let resultado;
      try {
        resultado = calcularConsumoFIFO({
          capasStock: capasResult.rows,
          cantidadRequerida: parseFloat(item.cantidad),
        });
      } catch (fifoErr) {
        await client.query('ROLLBACK');
        const insumoNombre = insumoCheck.rows[0].nombre;
        const stockActual = capasResult.rows.reduce(
          (s, c) => s + parseFloat(c.cantidad_disponible), 0
        );
        return res.status(422).json({
          error: `Stock insuficiente de ${insumoNombre}. Disponible: ${stockActual}, registrado: ${item.cantidad}. Actualizá el registro o comprá más insumos.`,
          insumo: insumoNombre,
          disponible: stockActual,
          requerido: parseFloat(item.cantidad),
        });
      }

      // Actualizar capas FIFO
      for (const act of resultado.actualizaciones) {
        await client.query(
          'UPDATE compras_insumo SET cantidad_disponible = $1 WHERE id = $2',
          [act.nueva_cantidad_disponible, act.compra_id]
        );
      }

      // Guardar costo real y detalle FIFO en el item
      await client.query(
        `UPDATE registro_diario_item
         SET costo_real = $1, detalle_fifo = $2
         WHERE id = $3`,
        [resultado.costoTotal, JSON.stringify(resultado.lineasFIFO), item.id]
      );
    }

    // 4. Marcar registro como confirmado
    const confirmResult = await client.query(
      `UPDATE registro_diario_lote
       SET confirmado = true, confirmado_en = NOW()
       WHERE id = $1
       RETURNING *`,
      [registro.id]
    );

    await client.query('COMMIT');

    // Cargar items DESPUÉS del COMMIT: loadItemsConDetalle usa el pool (fuera de
    // la transacción), así que leerlo antes devolvía costo_real sin el UPDATE.
    const itemsFinales = await loadItemsConDetalle(registro.id);
    res.json({ ...confirmResult.rows[0], items: itemsFinales });
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('confirmarDia error:', err);
    res.status(500).json({ error: err.message });
  } finally {
    client.release();
  }
}
