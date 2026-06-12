import { pool } from '../config/database.js';

// ──────────────────────────────────────────────
// LOTES CRUD & LIFECYCLE
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
    edad_promedio_dias,
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
          costo_adquisicion, edad_promedio_dias, activo)
       VALUES ($1,$2,$3,$4,$5,$5,$6,$6,$7,$8,true)
       RETURNING *`,
      [
        negocioId,
        identificador,
        tipo_animal,
        fecha_entrada || null,
        cabezas_inicio || 0,
        peso_inicial_prom || 0,
        costo_adquisicion || 0,
        edad_promedio_dias != null ? parseInt(edad_promedio_dias) : 0,
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
    merma_ayuno,
    merma_frio,
    merma_desposte,
    mix_produccion,
    mantener_activo,        // bool: liquidación parcial (no cierra el lote)
  } = req.body;

  const cabezas = Number(cabezas_venta);
  const pesoProm = Number(peso_prom_final);
  const rend = Number(rendimiento_canal);
  const pvp = Number(pvp_kg);
  const gastos = gastos_finales == null ? 0 : Number(gastos_finales);
  const pctAyuno    = merma_ayuno    == null ? 5   : Math.max(0, Math.min(100, Number(merma_ayuno)));
  const pctFrio     = merma_frio     == null ? 1.5 : Math.max(0, Math.min(100, Number(merma_frio)));
  const pctDesposte = merma_desposte == null ? 4   : Math.max(0, Math.min(100, Number(merma_desposte)));

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
  if (!['pie', 'gancho', 'despiece'].includes(escenario)) {
    return res.status(400).json({ error: 'escenario debe ser "pie", "gancho" o "despiece"' });
  }

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const loteCheck = await client.query(
      'SELECT id, activo, cabezas_activas, identificador FROM lotes WHERE id = $1 AND negocio_id = $2 FOR UPDATE',
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
    const cabezasActivasActuales = Number(loteCheck.rows[0].cabezas_activas) || 0;
    if (cabezas > cabezasActivasActuales) {
      await client.query('ROLLBACK');
      return res.status(400).json({
        error: `No se pueden vender ${cabezas} cabezas: el lote tiene ${cabezasActivasActuales} activas.`,
      });
    }
    // Liquidación parcial: hay cabezas remanentes Y el flag está activo
    const esParcial = !!mantener_activo && cabezas < cabezasActivasActuales;

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

    const pv_granja = cabezas * pesoProm;
    // Cascada de mermas secuencial
    const pv_ayunado          = pv_granja * (1 - pctAyuno / 100);
    const pcc                 = pv_ayunado * rend / 100;
    const pcf                 = pcc * (1 - pctFrio / 100);
    const peso_util_industrial = pcf * (1 - pctDesposte / 100);

    // Peso para cada escenario
    const peso_venta =
      escenario === 'pie'     ? pv_ayunado :
      escenario === 'gancho'  ? pcf :
                                peso_util_industrial;

    const costoBitacoraTotal = Number(costoBitacora.rows[0].total);
    const costoAdqTotal      = Number(costoAdq.rows[0].adq);

    // Para liquidación parcial: imputamos el costo proporcional a la fracción
    // de cabezas vendidas (cabezas_venta / cabezas_activas_actuales). El lote
    // remanente conserva el resto.
    const ratioVendido = esParcial ? (cabezas / cabezasActivasActuales) : 1;
    const costo_imputado = (costoAdqTotal + costoBitacoraTotal) * ratioVendido;
    const costo_total    = costo_imputado + gastos;
    const ingreso        = pvp * peso_venta;
    const utilidad       = ingreso - costo_total;
    const margen         = ingreso > 0 ? (utilidad / ingreso) * 100 : null;
    const costo_kg_vivo  = pv_ayunado > 0 ? costo_total / pv_ayunado : null;
    const costo_kg_canal = pcf > 0 ? costo_total / pcf : null;

    const liquidacion = {
      cabezas_venta: cabezas,
      peso_prom_final: pesoProm,
      rendimiento_canal: rend,
      escenario,
      pvp_kg: pvp,
      gastos_finales: gastos,
      es_parcial: esParcial,
      ratio_vendido: ratioVendido,
      cabezas_activas_pre: cabezasActivasActuales,
      cabezas_activas_post: cabezasActivasActuales - cabezas,
      // Pesos por etapa
      pv_granja,
      pv_ayunado,
      pcc,
      pcf,
      peso_util_industrial,
      peso_venta,
      // Mermas registradas
      merma_ayuno: pctAyuno,
      merma_frio: pctFrio,
      merma_desposte: pctDesposte,
      kg_merma_ayuno: pv_granja - pv_ayunado,
      kg_merma_frio: pcc - pcf,
      kg_merma_desposte: pcf - peso_util_industrial,
      // Financieros
      costo_imputado,
      costo_total,
      costo_kg_vivo,
      costo_kg_canal,
      ingreso,
      utilidad,
      margen,
      liquidado_en: new Date().toISOString(),
      // Mix de producción industrial (solo cuando escenario = 'despiece')
      ...(mix_produccion ? { mix_produccion } : {}),
    };

    let rows;
    if (esParcial) {
      // 1. Guardar snapshot de la parcial.
      await client.query(
        `INSERT INTO liquidaciones_parciales (
           lote_id, negocio_id, cabezas_venta, peso_prom_final,
           escenario, pvp_kg, gastos_finales,
           ingreso_total, costo_imputado, utilidad, liquidacion_jsonb
         ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)`,
        [id, negocioId, cabezas, pesoProm, escenario, pvp, gastos,
         ingreso, costo_imputado, utilidad, liquidacion],
      );

      // 2. Decrementar cabezas_activas.
      const cabezas_post = cabezasActivasActuales - cabezas;

      // 3. Registrar débito en bitácora: monto NEGATIVO igual al costo
      //    imputado (sin contar gastos de venta, que son específicos de la
      //    parcial y no se transfieren al lote remanente). Esto hace que
      //    las consultas existentes que computan el costo del lote
      //    (costo_adquisicion + SUM(bitacora.monto)) reflejen el costo neto
      //    del lote remanente automáticamente.
      await client.query(
        `INSERT INTO bitacora_lote (lote_id, fecha, tipo, detalle, monto)
         VALUES ($1, NOW(), 'Liquidación parcial', $2, $3)`,
        [id, `${cabezas} cabezas vendidas (escenario ${escenario}). Costo imputado descontado del lote.`, -costo_imputado],
      );

      // 4. Actualizar cabezas activas del lote. Activo sigue en true.
      const upd = await client.query(
        `UPDATE lotes
         SET cabezas_activas = $1
         WHERE id = $2 AND negocio_id = $3
         RETURNING *`,
        [cabezas_post, id, negocioId],
      );
      rows = upd.rows;
    } else {
      const upd = await client.query(
        `UPDATE lotes
         SET activo = false,
             liquidacion_jsonb = $1,
             cabezas_activas = 0
         WHERE id = $2 AND negocio_id = $3
         RETURNING *`,
        [liquidacion, id, negocioId],
      );
      rows = upd.rows;
    }

    await client.query('COMMIT');
    res.json({ ...rows[0], liquidacion, es_parcial: esParcial });
  } catch (err) {
    await client.query('ROLLBACK');
    console.error(err);
    res.status(500).json({ error: err.message });
  } finally {
    client.release();
  }
};
