import { pool } from '../config/database.js';

// Tipos de merma válidos (los 4 nodos)
const TIPOS_MERMA = ['AYUNO', 'FRIO', 'DESPOSTE', 'HORNO'];

// Helper redondeo 4 decimales
const r4 = n => Math.round(n * 10000) / 10000;

// ─────────────────────────────────────────────────────────────
// GET /api/negocios/:negocioId/mermas
// Lista todos los registros de mermas con filtros opcionales
// Query params: lote_id, tipo, fecha_inicio, fecha_fin
// ─────────────────────────────────────────────────────────────
export const getMermas = async (req, res) => {
  const { negocioId } = req.params;
  const { lote_id, tipo, fecha_inicio, fecha_fin } = req.query;

  try {
    let conditions = ['rm.negocio_id = $1', 'rm.activo = TRUE'];
    const params = [negocioId];
    let idx = 2;

    if (lote_id) {
      conditions.push(`rm.lote_id = $${idx++}`);
      params.push(lote_id);
    }
    if (tipo && TIPOS_MERMA.includes(tipo.toUpperCase())) {
      conditions.push(`rm.tipo = $${idx++}`);
      params.push(tipo.toUpperCase());
    }
    if (fecha_inicio) {
      conditions.push(`rm.fecha >= $${idx++}`);
      params.push(fecha_inicio);
    }
    if (fecha_fin) {
      conditions.push(`rm.fecha <= $${idx++}`);
      params.push(fecha_fin);
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    const { rows } = await pool.query(
      `SELECT
         rm.*,
         l.identificador AS lote_identificador,
         l.tipo_animal
       FROM registro_mermas rm
       JOIN lotes l ON l.id = rm.lote_id
       ${whereClause}
       ORDER BY rm.fecha DESC, rm.created_at DESC`,
      params
    );
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
};

// ─────────────────────────────────────────────────────────────
// GET /api/negocios/:negocioId/mermas/:id
// Obtiene un registro de merma por ID
// ─────────────────────────────────────────────────────────────
export const getMermaById = async (req, res) => {
  const { negocioId, id } = req.params;
  try {
    const { rows } = await pool.query(
      `SELECT rm.*, l.identificador AS lote_identificador, l.tipo_animal
       FROM registro_mermas rm
       JOIN lotes l ON l.id = rm.lote_id
       WHERE rm.id = $1 AND rm.negocio_id = $2 AND rm.activo = TRUE`,
      [id, negocioId]
    );
    if (!rows.length) return res.status(404).json({ error: 'Registro de merma no encontrado' });
    res.json(rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
};

// ─────────────────────────────────────────────────────────────
// POST /api/negocios/:negocioId/lotes/:loteId/mermas
// Registra pesaje en un nodo de merma
// Body: { tipo, peso_inicial, peso_final, fecha?, operario?, notas? }
// ─────────────────────────────────────────────────────────────
export const registrarPesaje = async (req, res) => {
  const { negocioId, loteId } = req.params;
  const { tipo, peso_inicial, peso_final, fecha, operario, notas } = req.body;

  // Validaciones
  if (!tipo || !TIPOS_MERMA.includes(tipo.toUpperCase())) {
    return res.status(400).json({
      error: `tipo es requerido y debe ser uno de: ${TIPOS_MERMA.join(', ')}`
    });
  }
  if (peso_inicial === undefined || peso_inicial === null || parseFloat(peso_inicial) <= 0) {
    return res.status(400).json({ error: 'peso_inicial debe ser mayor a 0' });
  }
  if (peso_final === undefined || peso_final === null || parseFloat(peso_final) < 0) {
    return res.status(400).json({ error: 'peso_final debe ser mayor o igual a 0' });
  }
  if (parseFloat(peso_final) > parseFloat(peso_inicial)) {
    return res.status(400).json({ error: 'peso_final no puede ser mayor que peso_inicial' });
  }

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // Validar que el lote pertenece al negocio
    const loteRes = await client.query(
      'SELECT id, identificador FROM lotes WHERE id = $1 AND negocio_id = $2 AND activo = TRUE',
      [loteId, negocioId]
    );
    if (!loteRes.rows.length) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: 'Lote no encontrado o inactivo' });
    }

    // Insertar el registro (kg_merma y porcentaje_merma son columnas GENERATED)
    const { rows } = await client.query(
      `INSERT INTO registro_mermas
         (negocio_id, lote_id, tipo, peso_inicial, peso_final, fecha, operario, notas)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
       RETURNING *`,
      [
        negocioId,
        loteId,
        tipo.toUpperCase(),
        r4(parseFloat(peso_inicial)),
        r4(parseFloat(peso_final)),
        fecha || new Date().toISOString().split('T')[0],
        operario || null,
        notas || null,
      ]
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

// ─────────────────────────────────────────────────────────────
// PUT /api/negocios/:negocioId/mermas/:id
// Actualiza un registro de merma (antes de confirmarlo)
// ─────────────────────────────────────────────────────────────
export const updateMerma = async (req, res) => {
  const { negocioId, id } = req.params;
  const { peso_inicial, peso_final, fecha, operario, notas } = req.body;

  // Validaciones opcionales
  if (peso_inicial !== undefined && parseFloat(peso_inicial) <= 0) {
    return res.status(400).json({ error: 'peso_inicial debe ser mayor a 0' });
  }
  if (peso_final !== undefined && parseFloat(peso_final) < 0) {
    return res.status(400).json({ error: 'peso_final debe ser mayor o igual a 0' });
  }

  try {
    // 1. Obtener registro previo
    const orig = await pool.query(
      `SELECT * FROM registro_mermas WHERE id = $1 AND negocio_id = $2 AND activo = TRUE`,
      [id, negocioId]
    );
    if (!orig.rows.length) {
      return res.status(404).json({ error: 'Registro de merma no encontrado' });
    }
    const prev = orig.rows[0];

    // 2. Hacer merge (se mantiene el anterior si no viene en el body; si viene se usa, permitiendo vaciar notas/operario)
    const nuevoPesoInicial = peso_inicial !== undefined ? r4(parseFloat(peso_inicial)) : prev.peso_inicial;
    const nuevoPesoFinal   = peso_final !== undefined ? r4(parseFloat(peso_final)) : prev.peso_final;
    const nuevaFecha       = fecha !== undefined ? fecha : prev.fecha;
    const nuevoOperario    = operario !== undefined ? operario : prev.operario;
    const nuevasNotas      = notas !== undefined ? notas : prev.notas;

    // 3. Ejecutar UPDATE
    const { rows } = await pool.query(
      `UPDATE registro_mermas
       SET
         peso_inicial = $1,
         peso_final   = $2,
         fecha        = $3,
         operario     = $4,
         notas        = $5
       WHERE id = $6 AND negocio_id = $7 AND activo = TRUE
       RETURNING *`,
      [
        nuevoPesoInicial,
        nuevoPesoFinal,
        nuevaFecha,
        nuevoOperario,
        nuevasNotas,
        id,
        negocioId,
      ]
    );
    res.json(rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
};

// ─────────────────────────────────────────────────────────────
// DELETE /api/negocios/:negocioId/mermas/:id   (soft delete)
// ─────────────────────────────────────────────────────────────
export const deleteMerma = async (req, res) => {
  const { negocioId, id } = req.params;
  try {
    const { rowCount } = await pool.query(
      `UPDATE registro_mermas SET activo = FALSE
       WHERE id = $1 AND negocio_id = $2 AND activo = TRUE`,
      [id, negocioId]
    );
    if (!rowCount) return res.status(404).json({ error: 'Registro de merma no encontrado' });
    res.json({ message: 'Registro de merma eliminado' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
};

// ─────────────────────────────────────────────────────────────
// GET /api/negocios/:negocioId/lotes/:loteId/mermas/resumen
// Resumen consolidado de mermas por nodo para un lote
// ─────────────────────────────────────────────────────────────
export const getResumenMermas = async (req, res) => {
  const { negocioId, loteId } = req.params;

  try {
    // Validar lote
    const loteRes = await pool.query(
      'SELECT identificador, tipo_animal FROM lotes WHERE id = $1 AND negocio_id = $2',
      [loteId, negocioId]
    );
    if (!loteRes.rows.length) {
      return res.status(404).json({ error: 'Lote no encontrado' });
    }

    const { rows } = await pool.query(
      `SELECT
         tipo,
         COUNT(*)                        AS registros,
         SUM(peso_inicial)               AS total_peso_inicial,
         SUM(peso_final)                 AS total_peso_final,
         SUM(kg_merma)                   AS total_kg_merma,
         AVG(porcentaje_merma)           AS promedio_porcentaje_merma,
         MAX(porcentaje_merma)           AS max_porcentaje_merma,
         MIN(porcentaje_merma)           AS min_porcentaje_merma,
         MAX(fecha)                      AS ultimo_registro
       FROM registro_mermas
       WHERE lote_id = $1 AND negocio_id = $2 AND activo = TRUE
       GROUP BY tipo
       ORDER BY tipo ASC`,
      [loteId, negocioId]
    );

    // Calcular totales globales del lote
    const totales = rows.reduce(
      (acc, r) => {
        acc.total_peso_inicial = r4(acc.total_peso_inicial + parseFloat(r.total_peso_inicial || 0));
        acc.total_kg_merma = r4(acc.total_kg_merma + parseFloat(r.total_kg_merma || 0));
        return acc;
      },
      { total_peso_inicial: 0, total_kg_merma: 0 }
    );

    res.json({
      lote: loteRes.rows[0],
      por_nodo: rows,
      totales: {
        ...totales,
        porcentaje_merma_global: totales.total_peso_inicial > 0
          ? r4((totales.total_kg_merma / totales.total_peso_inicial) * 100)
          : 0,
      },
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
};
