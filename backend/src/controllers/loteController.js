import { pool } from '../config/database.js';
import { calcularConsumoFIFO } from '../services/inventarioFIFO.js';

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

export const getCostosDetalle = async (req, res) => {
  const { negocioId, id } = req.params;
  try {
    const loteCheck = await pool.query(
      'SELECT id FROM lotes WHERE id = $1 AND negocio_id = $2',
      [id, negocioId]
    );
    if (!loteCheck.rows.length) {
      return res.status(404).json({ error: 'Lote no encontrado' });
    }

    const { rows } = await pool.query(
      `SELECT
         COALESCE(
           c.tipo,
           CASE
             WHEN b.tipo ILIKE '%aliment%'
               OR b.tipo ILIKE '%balanceado%'
               OR b.tipo ILIKE '%forraje%'
               OR b.tipo ILIKE '%pastura%'
               OR b.tipo ILIKE '%silaje%'
               OR b.tipo ILIKE '%suplement%'
               OR b.tipo ILIKE '%grano%'
               OR b.tipo ILIKE '%maiz%'
               OR b.tipo ILIKE '%maíz%'
               OR b.tipo ILIKE '%heno%'        THEN 'alimento'
             WHEN b.tipo ILIKE '%sanidad%'
               OR b.tipo ILIKE '%medicament%'
               OR b.tipo ILIKE '%vacuna%'
               OR b.tipo ILIKE '%veterinari%'
               OR b.tipo ILIKE '%antibiot%'
               OR b.tipo ILIKE '%desparasit%'  THEN 'sanidad'
             WHEN b.tipo ILIKE '%mano de obra%'
               OR b.tipo ILIKE '%jornal%'
               OR b.tipo ILIKE '%peón%'
               OR b.tipo ILIKE '%peon%'
               OR b.tipo ILIKE '%personal%'    THEN 'mano_obra'
             ELSE                                   'otros'
           END
         ) AS bucket,
         COALESCE(SUM(b.monto), 0)::float AS total
       FROM bitacora_lote b
       LEFT JOIN lotes l ON l.id = b.lote_id
       LEFT JOIN categorias_insumos c
         ON c.nombre = b.tipo AND c.negocio_id = l.negocio_id
       WHERE b.lote_id = $1
         AND b.es_baja = false
         AND b.monto IS NOT NULL
       GROUP BY bucket`,
      [id]
    );

    const detalle = { alimento: 0, sanidad: 0, mano_obra: 0, otros: 0 };
    for (const row of rows) {
      if (row.bucket in detalle) {
        detalle[row.bucket] = Number(row.total);
      } else {
        detalle.otros += Number(row.total);
      }
    }
    const total = detalle.alimento + detalle.sanidad + detalle.mano_obra + detalle.otros;
    res.json({ ...detalle, total });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
};

// ──────────────────────────────────────────────
// ESCENARIOS
// ──────────────────────────────────────────────

// POST /negocios/:negocioId/lotes/:id/escenarios
// Body: { pvp_vivo, pvp_gancho, gastos_faena?, rendimiento_canal?, precios_cortes?: [{ corte_id, pvp }] }
// Devuelve { vivo, gancho, cortes, recomendacion, desglose }
export const getEscenarios = async (req, res) => {
  const { negocioId, id } = req.params;
  const {
    pvp_vivo,
    pvp_gancho,
    gastos_faena,
    rendimiento_canal,
    precios_cortes,
  } = req.body;

  const pvpVivo = Number(pvp_vivo);
  const pvpGancho = Number(pvp_gancho);
  const gastosFaena = gastos_faena == null ? 0 : Number(gastos_faena);
  const rendCanalParam = rendimiento_canal == null ? 75 : Number(rendimiento_canal);

  if (!Number.isFinite(pvpVivo) || pvpVivo < 0) {
    return res.status(400).json({ error: 'pvp_vivo es requerido y debe ser >= 0' });
  }
  if (!Number.isFinite(pvpGancho) || pvpGancho < 0) {
    return res.status(400).json({ error: 'pvp_gancho es requerido y debe ser >= 0' });
  }

  try {
    const { rows: loteRows } = await pool.query(
      `SELECT l.*,
              l.costo_adquisicion + COALESCE((
                SELECT SUM(b.monto)
                FROM bitacora_lote b
                WHERE b.lote_id = l.id AND b.es_baja = false AND b.monto IS NOT NULL
              ), 0) AS costo_base
       FROM lotes l
       WHERE l.id = $1 AND l.negocio_id = $2`,
      [id, negocioId]
    );
    if (!loteRows.length) {
      return res.status(404).json({ error: 'Lote no encontrado' });
    }
    const lote = loteRows[0];
    const costo_base = Number(lote.costo_base);

    // Pesos: usar liquidacion_jsonb si el lote ya fue liquidado, sino estimar con datos actuales
    let peso_total_pie, peso_total_gancho, rendCanalUsado;
    const liq = lote.liquidacion_jsonb;
    if (liq && liq.peso_total_pie) {
      peso_total_pie = Number(liq.peso_total_pie);
      peso_total_gancho = Number(liq.peso_total_gancho);
      rendCanalUsado = Number(liq.rendimiento_canal);
    } else {
      const cabezas = Number(lote.cabezas_activas) || 0;
      const pesoProm = Number(lote.peso_actual_prom) || 0;
      peso_total_pie = cabezas * pesoProm;
      rendCanalUsado = rendCanalParam;
      peso_total_gancho = peso_total_pie * rendCanalUsado / 100;
    }

    // Gastos de faena solo aplican a venta canal/cortes, no a venta en vivo
    const costo_con_faena = costo_base + gastosFaena;

    // Escenario 1 — Vivo
    const ingreso_vivo = peso_total_pie * pvpVivo;
    const utilidad_vivo = ingreso_vivo - costo_base;
    const margen_vivo = ingreso_vivo > 0 ? (utilidad_vivo / ingreso_vivo) * 100 : null;

    // Escenario 2 — Gancho
    const ingreso_gancho = peso_total_gancho * pvpGancho;
    const utilidad_gancho = ingreso_gancho - costo_con_faena;
    const margen_gancho = ingreso_gancho > 0 ? (utilidad_gancho / ingreso_gancho) * 100 : null;

    // Escenario 3 — Por cortes (opcional, solo si vienen precios)
    let escenario_cortes = null;
    const cortesInput = Array.isArray(precios_cortes) ? precios_cortes : [];
    if (cortesInput.length > 0) {
      const { rows: cortesDB } = await pool.query(
        'SELECT * FROM despiece_cortes WHERE lote_id = $1',
        [id]
      );
      const cortesMap = new Map(cortesDB.map(c => [c.id, c]));

      let ingreso_cortes = 0;
      const desglose = [];
      for (const pc of cortesInput) {
        const corte = cortesMap.get(pc.corte_id);
        if (!corte) continue;
        const pvp = Number(pc.pvp);
        if (!Number.isFinite(pvp) || pvp < 0) continue;
        const subtotal = Number(corte.peso_kg) * pvp;
        ingreso_cortes += subtotal;
        desglose.push({ nombre: corte.nombre, peso_kg: Number(corte.peso_kg), pvp, subtotal });
      }

      const utilidad_cortes = ingreso_cortes - costo_con_faena;
      const margen_cortes = ingreso_cortes > 0 ? (utilidad_cortes / ingreso_cortes) * 100 : null;
      escenario_cortes = {
        ingreso: ingreso_cortes,
        costo: costo_con_faena,
        utilidad: utilidad_cortes,
        margen: margen_cortes,
        desglose,
      };
    }

    // Recomendación: escenario con mayor utilidad
    const opciones = [
      { key: 'vivo', utilidad: utilidad_vivo },
      { key: 'gancho', utilidad: utilidad_gancho },
    ];
    if (escenario_cortes !== null) {
      opciones.push({ key: 'cortes', utilidad: escenario_cortes.utilidad });
    }
    const ganador = opciones.reduce((best, op) => op.utilidad > best.utilidad ? op : best);

    res.json({
      vivo:   { ingreso: ingreso_vivo,   costo: costo_base,       utilidad: utilidad_vivo,   margen: margen_vivo },
      gancho: { ingreso: ingreso_gancho, costo: costo_con_faena,  utilidad: utilidad_gancho, margen: margen_gancho },
      cortes: escenario_cortes,
      recomendacion: ganador.key,
      desglose: {
        peso_total_pie,
        peso_total_gancho,
        rendimiento_canal: rendCanalUsado,
        costo_base,
        gastos_faena: gastosFaena,
        costo_con_faena,
      },
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
};

// ──────────────────────────────────────────────
// ICa — Conversión alimenticia
// ──────────────────────────────────────────────

// GET /negocios/:negocioId/lotes/:id/ica
// ICa = kg_alimento_consumido / kg_ganados
// kg_ganados = (peso_actual_prom - peso_inicial_prom) × cabezas_activas
// kg_alimento = SUM(cantidad_kg) de entradas de tipo alimento en bitácora
export const getIca = async (req, res) => {
  const { negocioId, id } = req.params;
  try {
    const { rows: loteRows } = await pool.query(
      'SELECT * FROM lotes WHERE id = $1 AND negocio_id = $2',
      [id, negocioId]
    );
    if (!loteRows.length) {
      return res.status(404).json({ error: 'Lote no encontrado' });
    }
    const lote = loteRows[0];

    // kg de alimento consumido (suma de cantidad_kg en entradas clasificadas como alimento)
    const { rows: alimentoRows } = await pool.query(
      `SELECT COALESCE(SUM(b.cantidad_kg), 0) AS kg_alimento
       FROM bitacora_lote b
       LEFT JOIN lotes l ON l.id = b.lote_id
       LEFT JOIN categorias_insumos c
         ON c.nombre = b.tipo AND c.negocio_id = l.negocio_id
       WHERE b.lote_id = $1
         AND b.es_baja = false
         AND b.cantidad_kg IS NOT NULL
         AND COALESCE(
               c.tipo,
               CASE
                 WHEN b.tipo ILIKE '%aliment%'
                   OR b.tipo ILIKE '%balanceado%'
                   OR b.tipo ILIKE '%forraje%'
                   OR b.tipo ILIKE '%pastura%'
                   OR b.tipo ILIKE '%silaje%'
                   OR b.tipo ILIKE '%suplement%'
                   OR b.tipo ILIKE '%grano%'
                   OR b.tipo ILIKE '%maiz%'
                   OR b.tipo ILIKE '%maíz%'
                   OR b.tipo ILIKE '%heno%' THEN 'alimento'
                 ELSE 'otros'
               END
             ) = 'alimento'`,
      [id]
    );
    const kg_alimento = Number(alimentoRows[0].kg_alimento);

    // kg ganados por el lote completo
    const pesoActual = Number(lote.peso_actual_prom) || 0;
    const pesoInicial = Number(lote.peso_inicial_prom) || 0;
    const cabezas = Number(lote.cabezas_activas) || 0;
    const kg_ganados = (pesoActual - pesoInicial) * cabezas;

    if (kg_ganados <= 0) {
      return res.status(422).json({
        error: 'No se puede calcular ICa: el peso actual no supera el peso inicial o no hay cabezas activas',
        kg_alimento,
        kg_ganados,
      });
    }

    const ica = kg_alimento / kg_ganados;

    // Clasificación según referencia para cerdos (2.5–3.0)
    let estado;
    if (ica <= 3.0) estado = 'verde';
    else if (ica <= 3.5) estado = 'ambar';
    else estado = 'rojo';

    res.json({
      kg_alimento,
      kg_ganados,
      ica,
      referencia: '2.5-3.0',
      estado,
    });
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

    // Insertar registro en bitácora
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

export const updateBitacoraEntry = async (req, res) => {
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
