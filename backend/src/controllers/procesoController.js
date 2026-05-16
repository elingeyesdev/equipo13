import { pool } from '../config/database.js';

// ─────────────────────────────────────────────────────────────
// CATÁLOGO DE PROCESOS
// ─────────────────────────────────────────────────────────────

/** GET /api/negocios/:negocioId/procesos */
export const getProcesos = async (req, res) => {
  const { negocioId } = req.params;
  try {
    const { rows } = await pool.query(
      `SELECT p.*,
              COALESCE(
                json_agg(
                  json_build_object(
                    'id',               pi.id,
                    'insumo_id',        pi.insumo_id,
                    'insumo_nombre',    i.nombre,
                    'cantidad_por_cabeza', pi.cantidad_por_cabeza,
                    'precio_unitario',  i.precio_unitario,
                    'unidad_simbolo',   u.simbolo
                  )
                ) FILTER (WHERE pi.id IS NOT NULL), '[]'
              ) AS insumos_requeridos
       FROM procesos p
       LEFT JOIN proceso_insumos pi ON pi.proceso_id = p.id
       LEFT JOIN insumos i ON i.id = pi.insumo_id
       LEFT JOIN unidades_medida u ON u.id = pi.unidad_id
       WHERE p.negocio_id = $1 AND p.activo = true
       GROUP BY p.id
       ORDER BY p.tipo, p.nombre`,
      [negocioId]
    );
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
};

/** POST /api/negocios/:negocioId/procesos */
export const createProceso = async (req, res) => {
  const { negocioId } = req.params;
  const {
    nombre, tipo, descripcion,
    categoria_origen, categoria_destino,
    dias_duracion, peso_umbral,
    produce_insumo_id, produce_cantidad,
    insumos_requeridos = [],
  } = req.body;

  if (!nombre || !tipo) return res.status(400).json({ error: 'nombre y tipo son requeridos' });

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const { rows } = await client.query(
      `INSERT INTO procesos
         (negocio_id, nombre, tipo, descripcion,
          categoria_origen, categoria_destino,
          dias_duracion, peso_umbral,
          produce_insumo_id, produce_cantidad)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)
       RETURNING *`,
      [negocioId, nombre, tipo, descripcion || null,
       categoria_origen || null, categoria_destino || null,
       dias_duracion || null, peso_umbral || null,
       produce_insumo_id || null, produce_cantidad || null]
    );
    const proceso = rows[0];

    for (const ins of insumos_requeridos) {
      await client.query(
        `INSERT INTO proceso_insumos (proceso_id, insumo_id, cantidad_por_cabeza, unidad_id)
         VALUES ($1,$2,$3,$4)`,
        [proceso.id, ins.insumo_id, ins.cantidad_por_cabeza, ins.unidad_id || null]
      );
    }

    await client.query('COMMIT');
    res.status(201).json(proceso);
  } catch (err) {
    await client.query('ROLLBACK');
    console.error(err);
    res.status(500).json({ error: err.message });
  } finally {
    client.release();
  }
};

/** PUT /api/negocios/:negocioId/procesos/:id */
export const updateProceso = async (req, res) => {
  const { negocioId, id } = req.params;
  const {
    nombre, tipo, descripcion,
    categoria_origen, categoria_destino,
    dias_duracion, peso_umbral,
    produce_insumo_id, produce_cantidad,
    insumos_requeridos,
  } = req.body;

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const { rows } = await client.query(
      `UPDATE procesos SET
         nombre = COALESCE($1, nombre),
         tipo = COALESCE($2, tipo),
         descripcion = COALESCE($3, descripcion),
         categoria_origen = COALESCE($4, categoria_origen),
         categoria_destino = COALESCE($5, categoria_destino),
         dias_duracion = COALESCE($6, dias_duracion),
         peso_umbral = COALESCE($7, peso_umbral),
         produce_insumo_id = COALESCE($8, produce_insumo_id),
         produce_cantidad = COALESCE($9, produce_cantidad)
       WHERE id = $10 AND negocio_id = $11
       RETURNING *`,
      [nombre||null, tipo||null, descripcion||null,
       categoria_origen||null, categoria_destino||null,
       dias_duracion||null, peso_umbral||null,
       produce_insumo_id||null, produce_cantidad||null,
       id, negocioId]
    );
    if (!rows.length) { await client.query('ROLLBACK'); return res.status(404).json({ error: 'Proceso no encontrado' }); }

    if (Array.isArray(insumos_requeridos)) {
      await client.query('DELETE FROM proceso_insumos WHERE proceso_id = $1', [id]);
      for (const ins of insumos_requeridos) {
        await client.query(
          `INSERT INTO proceso_insumos (proceso_id, insumo_id, cantidad_por_cabeza, unidad_id)
           VALUES ($1,$2,$3,$4)`,
          [id, ins.insumo_id, ins.cantidad_por_cabeza, ins.unidad_id || null]
        );
      }
    }

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

/** DELETE /api/negocios/:negocioId/procesos/:id  (borrado lógico) */
export const deleteProceso = async (req, res) => {
  const { negocioId, id } = req.params;
  try {
    await pool.query(
      `UPDATE procesos SET activo = false WHERE id = $1 AND negocio_id = $2`,
      [id, negocioId]
    );
    res.json({ message: 'Proceso archivado' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
};

// ─────────────────────────────────────────────────────────────
// LOTE_PROCESOS  (asignación y ejecución)
// ─────────────────────────────────────────────────────────────

/** GET /api/negocios/:negocioId/lotes/:loteId/procesos */
export const getLoteProcesos = async (req, res) => {
  const { negocioId, loteId } = req.params;
  try {
    const loteCheck = await pool.query(
      'SELECT id, cabezas_activas FROM lotes WHERE id=$1 AND negocio_id=$2',
      [loteId, negocioId]
    );
    if (!loteCheck.rows.length) return res.status(404).json({ error: 'Lote no encontrado' });

    const { rows } = await pool.query(
      `SELECT lp.*,
              p.nombre AS proceso_nombre,
              p.tipo   AS proceso_tipo,
              p.categoria_origen,
              p.categoria_destino,
              p.dias_duracion
       FROM lote_procesos lp
       JOIN procesos p ON p.id = lp.proceso_id
       WHERE lp.lote_id = $1
       ORDER BY
         CASE lp.estado
           WHEN 'En curso'   THEN 1
           WHEN 'Pendiente'  THEN 2
           WHEN 'Finalizado' THEN 3
           ELSE 4
         END,
         lp.fecha_fin ASC NULLS LAST`,
      [loteId]
    );
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
};

/**
 * POST /api/negocios/:negocioId/lotes/:loteId/procesos
 * Asigna un proceso a un lote.  Calcula costo proyectado automáticamente.
 */
export const asignarProceso = async (req, res) => {
  const { negocioId, loteId } = req.params;
  const { proceso_id, fecha_inicio, fecha_fin, notas } = req.body;

  if (!proceso_id) return res.status(400).json({ error: 'proceso_id es requerido' });

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // Verificar lote y obtener cabezas activas
    const loteRes = await client.query(
      'SELECT id, cabezas_activas FROM lotes WHERE id=$1 AND negocio_id=$2',
      [loteId, negocioId]
    );
    if (!loteRes.rows.length) { await client.query('ROLLBACK'); return res.status(404).json({ error: 'Lote no encontrado' }); }
    const { cabezas_activas } = loteRes.rows[0];

    // Calcular costo proyectado: SUM(cantidad_por_cabeza * precio_unitario) * cabezas_activas
    const costoRes = await client.query(
      `SELECT COALESCE(SUM(pi.cantidad_por_cabeza * i.precio_unitario), 0) AS costo_por_cabeza
       FROM proceso_insumos pi
       JOIN insumos i ON i.id = pi.insumo_id
       WHERE pi.proceso_id = $1`,
      [proceso_id]
    );
    const costoPorCabeza = parseFloat(costoRes.rows[0].costo_por_cabeza) || 0;
    const costoProyectado = costoPorCabeza * (cabezas_activas || 0);

    const { rows } = await client.query(
      `INSERT INTO lote_procesos
         (lote_id, proceso_id, estado, fecha_inicio, fecha_fin, costo_proyectado, notas)
       VALUES ($1,$2,'Pendiente',$3,$4,$5,$6)
       RETURNING *`,
      [loteId, proceso_id, fecha_inicio||null, fecha_fin||null, costoProyectado, notas||null]
    );

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
 * PATCH /api/negocios/:negocioId/lotes/:loteId/procesos/:lpId/estado
 * Cambia estado de un LoteProceso.
 * Al pasar a "Finalizado":
 *   1. Descuenta stock de cada insumo requerido.
 *   2. Si el proceso produce un insumo, incrementa su stock.
 *   3. Registra el gasto en bitacora_lote.
 *   4. Si hay cambio de categoría (tipo_animal), actualiza el lote.
 */
export const cambiarEstadoProceso = async (req, res) => {
  const { negocioId, loteId, lpId } = req.params;
  const { estado, notas } = req.body;

  const VALID = ['Pendiente', 'En curso', 'Finalizado', 'Cancelado'];
  if (!VALID.includes(estado)) return res.status(400).json({ error: 'Estado inválido' });

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // Cargar lote_proceso + proceso + lote
    const lpRes = await client.query(
      `SELECT lp.*, p.nombre AS proceso_nombre, p.tipo AS proceso_tipo,
              p.categoria_destino, p.produce_insumo_id, p.produce_cantidad,
              l.cabezas_activas, l.negocio_id AS lote_negocio_id, l.tipo_animal
       FROM lote_procesos lp
       JOIN procesos p ON p.id = lp.proceso_id
       JOIN lotes l ON l.id = lp.lote_id
       WHERE lp.id=$1 AND lp.lote_id=$2`,
      [lpId, loteId]
    );
    if (!lpRes.rows.length) { await client.query('ROLLBACK'); return res.status(404).json({ error: 'Asignación no encontrada' }); }
    const lp = lpRes.rows[0];

    if (lp.lote_negocio_id !== negocioId) { await client.query('ROLLBACK'); return res.status(403).json({ error: 'Acceso denegado' }); }

    // Si pasamos a Finalizado, ejecutar lógica de inventario y bitácora
    if (estado === 'Finalizado' && lp.estado !== 'Finalizado') {
      const cabezas = lp.cabezas_activas || 0;

      // Obtener insumos requeridos del proceso
      const insumosRes = await client.query(
        `SELECT pi.*, i.nombre AS insumo_nombre, i.precio_unitario, i.stock_actual
         FROM proceso_insumos pi
         JOIN insumos i ON i.id = pi.insumo_id
         WHERE pi.proceso_id = $1`,
        [lp.proceso_id]
      );

      let costoEjecutado = 0;
      for (const ins of insumosRes.rows) {
        const cantTotal = parseFloat(ins.cantidad_por_cabeza) * cabezas;
        const costo = cantTotal * parseFloat(ins.precio_unitario);
        costoEjecutado += costo;

        // Descontar stock (no permitir negativo)
        const nuevoStock = Math.max(0, parseFloat(ins.stock_actual || 0) - cantTotal);
        await client.query(
          'UPDATE insumos SET stock_actual = $1 WHERE id = $2',
          [nuevoStock, ins.insumo_id]
        );
      }

      // Registrar en bitácora
      if (costoEjecutado > 0) {
        await client.query(
          `INSERT INTO bitacora_lote (lote_id, fecha, tipo, detalle, monto, es_baja)
           VALUES ($1, CURRENT_DATE, $2, $3, $4, false)`,
          [
            loteId,
            lp.proceso_tipo === 'Sanidad' ? 'Sanidad / Medicamento' : 'Alimentacion / Insumo',
            `Proceso: ${lp.proceso_nombre}`,
            costoEjecutado,
          ]
        );
      }

      // Producción circular: si el proceso genera un insumo, agregar stock
      if (lp.produce_insumo_id && lp.produce_cantidad) {
        const producido = parseFloat(lp.produce_cantidad) * cabezas;
        await client.query(
          'UPDATE insumos SET stock_actual = stock_actual + $1 WHERE id = $2',
          [producido, lp.produce_insumo_id]
        );
      }

      // Cambio de categoría (tipo_animal) del lote
      if (lp.categoria_destino && lp.tipo_animal !== lp.categoria_destino) {
        await client.query(
          'UPDATE lotes SET tipo_animal = $1 WHERE id = $2',
          [lp.categoria_destino, loteId]
        );
      }

      // Actualizar lote_proceso con costo real y fecha de finalización
      const { rows } = await client.query(
        `UPDATE lote_procesos
         SET estado='Finalizado', fecha_finalizado=CURRENT_DATE,
             costo_ejecutado=$1, notas=COALESCE($2,notas)
         WHERE id=$3 RETURNING *`,
        [costoEjecutado, notas||null, lpId]
      );
      await client.query('COMMIT');
      return res.json(rows[0]);
    }

    // Cambio de estado simple (sin Finalizado)
    const { rows } = await client.query(
      `UPDATE lote_procesos
       SET estado=$1, notas=COALESCE($2,notas),
           fecha_finalizado = CASE WHEN $1='Finalizado' THEN CURRENT_DATE ELSE fecha_finalizado END
       WHERE id=$3 RETURNING *`,
      [estado, notas||null, lpId]
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

/** DELETE /api/negocios/:negocioId/lotes/:loteId/procesos/:lpId */
export const eliminarLoteProceso = async (req, res) => {
  const { negocioId, loteId, lpId } = req.params;
  try {
    const check = await pool.query(
      `SELECT lp.id FROM lote_procesos lp
       JOIN lotes l ON l.id = lp.lote_id
       WHERE lp.id=$1 AND lp.lote_id=$2 AND l.negocio_id=$3`,
      [lpId, loteId, negocioId]
    );
    if (!check.rows.length) return res.status(404).json({ error: 'Asignación no encontrada' });
    await pool.query('DELETE FROM lote_procesos WHERE id=$1', [lpId]);
    res.json({ message: 'Asignación eliminada' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
};

// ─────────────────────────────────────────────────────────────
// ALERTAS
// ─────────────────────────────────────────────────────────────

/**
 * GET /api/negocios/:negocioId/procesos/alertas
 * Retorna procesos Pendientes o En curso con fecha_fin <= hoy+3 días.
 */
export const getAlertas = async (req, res) => {
  const { negocioId } = req.params;
  try {
    const { rows } = await pool.query(
      `SELECT lp.*, p.nombre AS proceso_nombre, p.tipo AS proceso_tipo,
              l.identificador AS lote_identificador, l.cabezas_activas,
              (lp.fecha_fin - CURRENT_DATE) AS dias_restantes
       FROM lote_procesos lp
       JOIN procesos p ON p.id = lp.proceso_id
       JOIN lotes l ON l.id = lp.lote_id
       WHERE l.negocio_id = $1
         AND lp.estado IN ('Pendiente', 'En curso')
         AND (lp.fecha_fin IS NULL OR lp.fecha_fin <= CURRENT_DATE + INTERVAL '3 days')
       ORDER BY lp.fecha_fin ASC NULLS LAST`,
      [negocioId]
    );
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
};

// ─────────────────────────────────────────────────────────────
// SERVICIO: Costo por cabeza de un lote
// ─────────────────────────────────────────────────────────────

/**
 * GET /api/negocios/:negocioId/lotes/:loteId/costo-por-cabeza
 * Calcula en el backend: costo_total / cabezas_activas
 * Desglosa por categoría (adquisicion, alimentacion, sanidad, mo).
 */
export const getCostoPorCabeza = async (req, res) => {
  const { negocioId, loteId } = req.params;
  try {
    const loteRes = await pool.query(
      `SELECT l.*,
              l.costo_adquisicion + COALESCE((
                SELECT SUM(b.monto) FROM bitacora_lote b
                WHERE b.lote_id=l.id AND b.es_baja=false AND b.monto IS NOT NULL
              ),0) AS costo_total,
              COALESCE((SELECT SUM(b.monto) FROM bitacora_lote b WHERE b.lote_id=l.id AND b.es_baja=false AND b.tipo ILIKE '%sanidad%'),0) AS costo_sanidad,
              COALESCE((SELECT SUM(b.monto) FROM bitacora_lote b WHERE b.lote_id=l.id AND b.es_baja=false AND b.tipo ILIKE '%mano%'),0) AS costo_mo,
              COALESCE((SELECT SUM(b.monto) FROM bitacora_lote b WHERE b.lote_id=l.id AND b.es_baja=false AND b.tipo ILIKE '%aliment%'),0) AS costo_aliment
       FROM lotes l WHERE l.id=$1 AND l.negocio_id=$2`,
      [loteId, negocioId]
    );
    if (!loteRes.rows.length) return res.status(404).json({ error: 'Lote no encontrado' });

    const l = loteRes.rows[0];
    const cabezas = l.cabezas_activas || 1;
    const costoTotal = parseFloat(l.costo_total) || 0;
    const costoAdq   = parseFloat(l.costo_adquisicion) || 0;
    const costoSan   = parseFloat(l.costo_sanidad) || 0;
    const costoMO    = parseFloat(l.costo_mo) || 0;
    const costoAlim  = parseFloat(l.costo_aliment) || 0;

    res.json({
      lote_id:         loteId,
      cabezas_activas: cabezas,
      costo_total:     costoTotal,
      costo_por_cabeza: costoTotal / cabezas,
      desglose: {
        adquisicion: costoAdq,
        alimentacion: costoAlim,
        sanidad:      costoSan,
        mano_obra:    costoMO,
        otros:        costoTotal - costoAdq - costoAlim - costoSan - costoMO,
      },
      desglose_por_cabeza: {
        adquisicion: costoAdq  / cabezas,
        alimentacion: costoAlim / cabezas,
        sanidad:      costoSan  / cabezas,
        mano_obra:    costoMO   / cabezas,
        otros:        (costoTotal - costoAdq - costoAlim - costoSan - costoMO) / cabezas,
      },
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
};
