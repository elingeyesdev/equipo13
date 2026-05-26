import { pool } from '../config/database.js';
import { prorratearCIF } from '../services/calculoCif.js';

const CATEGORIAS_VALIDAS = ['servicios', 'alquiler', 'depreciacion', 'otros'];
const METODOS_PRORRATEO  = ['kilos', 'horas', 'partes_iguales'];

// GET /api/negocios/:negocioId/cif?activo=true|false|all
export async function getGastosCIF(req, res) {
  const { negocioId } = req.params;
  const { activo } = req.query;
  try {
    let q = 'SELECT * FROM gastos_cif WHERE negocio_id = $1';
    if (activo === 'false') q += ' AND activo = false';
    else if (activo !== 'all') q += ' AND activo = true';
    q += ' ORDER BY created_at DESC';
    const { rows } = await pool.query(q, [negocioId]);
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
}

// POST /api/negocios/:negocioId/cif
export async function createGastoCIF(req, res) {
  const { negocioId } = req.params;
  const { concepto, categoria, monto_mensual, metodo_prorrateo, notas } = req.body;

  if (!concepto || typeof concepto !== 'string' || !concepto.trim()) {
    return res.status(400).json({ error: 'concepto es requerido' });
  }
  if (monto_mensual == null || isNaN(Number(monto_mensual)) || Number(monto_mensual) < 0) {
    return res.status(400).json({ error: 'monto_mensual debe ser un número >= 0' });
  }
  if (!METODOS_PRORRATEO.includes(metodo_prorrateo)) {
    return res.status(400).json({ error: `metodo_prorrateo debe ser uno de: ${METODOS_PRORRATEO.join(', ')}` });
  }
  if (categoria && !CATEGORIAS_VALIDAS.includes(categoria)) {
    return res.status(400).json({ error: `categoria debe ser una de: ${CATEGORIAS_VALIDAS.join(', ')}` });
  }

  try {
    const { rows } = await pool.query(
      `INSERT INTO gastos_cif
         (negocio_id, concepto, categoria, monto_mensual, metodo_prorrateo, notas)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING *`,
      [negocioId, concepto.trim(), categoria || null, Number(monto_mensual), metodo_prorrateo, notas || null],
    );
    res.status(201).json(rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
}

// PUT /api/negocios/:negocioId/cif/:id
export async function updateGastoCIF(req, res) {
  const { negocioId, id } = req.params;
  const { concepto, categoria, monto_mensual, metodo_prorrateo, notas } = req.body;

  if (categoria != null && !CATEGORIAS_VALIDAS.includes(categoria)) {
    return res.status(400).json({ error: `categoria inválida (válidas: ${CATEGORIAS_VALIDAS.join(', ')})` });
  }
  if (metodo_prorrateo != null && !METODOS_PRORRATEO.includes(metodo_prorrateo)) {
    return res.status(400).json({ error: `metodo_prorrateo inválido (válidos: ${METODOS_PRORRATEO.join(', ')})` });
  }
  if (monto_mensual != null && (isNaN(Number(monto_mensual)) || Number(monto_mensual) < 0)) {
    return res.status(400).json({ error: 'monto_mensual debe ser un número >= 0' });
  }

  try {
    const { rows } = await pool.query(
      `UPDATE gastos_cif
       SET concepto         = COALESCE($1, concepto),
           categoria        = COALESCE($2, categoria),
           monto_mensual    = COALESCE($3, monto_mensual),
           metodo_prorrateo = COALESCE($4, metodo_prorrateo),
           notas            = COALESCE($5, notas)
       WHERE id = $6 AND negocio_id = $7
       RETURNING *`,
      [
        concepto || null,
        categoria || null,
        monto_mensual != null ? Number(monto_mensual) : null,
        metodo_prorrateo || null,
        notas ?? null,
        id,
        negocioId,
      ],
    );
    if (!rows.length) return res.status(404).json({ error: 'Gasto CIF no encontrado' });
    res.json(rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
}

// PATCH /api/negocios/:negocioId/cif/:id/archivar  (toggle activo ↔ archivado)
export async function archivarGastoCIF(req, res) {
  const { negocioId, id } = req.params;
  try {
    const { rows } = await pool.query(
      `UPDATE gastos_cif SET activo = NOT activo
       WHERE id = $1 AND negocio_id = $2
       RETURNING *`,
      [id, negocioId],
    );
    if (!rows.length) return res.status(404).json({ error: 'Gasto CIF no encontrado' });
    res.json(rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
}

// DELETE /api/negocios/:negocioId/cif/:id  (físico — usar archivar para soft delete)
export async function deleteGastoCIF(req, res) {
  const { negocioId, id } = req.params;
  try {
    const { rowCount } = await pool.query(
      'DELETE FROM gastos_cif WHERE id = $1 AND negocio_id = $2',
      [id, negocioId],
    );
    if (!rowCount) return res.status(404).json({ error: 'Gasto CIF no encontrado' });
    res.json({ ok: true, id });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
}

// GET /api/negocios/:negocioId/cif/prorrateo/:loteId
// Devuelve el CIF que le corresponde a ese lote, con el desglose por gasto.
export async function getProrrateoCIF(req, res) {
  const { negocioId, loteId } = req.params;
  try {
    // 1. Gastos CIF activos del negocio
    const { rows: gastos } = await pool.query(
      'SELECT * FROM gastos_cif WHERE negocio_id = $1 AND activo = true',
      [negocioId],
    );

    // 2. Datos del lote target
    const { rows: loteRows } = await pool.query(
      `SELECT cabezas_activas, peso_actual_prom
         FROM lotes
        WHERE id = $1 AND negocio_id = $2`,
      [loteId, negocioId],
    );
    if (!loteRows.length) return res.status(404).json({ error: 'Lote no encontrado' });
    const lote = loteRows[0];
    const loteKilos = (Number(lote.cabezas_activas) || 0) * (Number(lote.peso_actual_prom) || 0);

    // 3. Totales del negocio (suma sobre todos los lotes activos)
    const { rows: totRows } = await pool.query(
      `SELECT
         COALESCE(SUM(cabezas_activas * peso_actual_prom), 0) AS total_kilos,
         COUNT(*)                                              AS lotes_activos
         FROM lotes
        WHERE negocio_id = $1 AND activo = true`,
      [negocioId],
    );
    const totalKilosNegocio   = Number(totRows[0].total_kilos)    || 0;
    const lotesActivosNegocio = Number(totRows[0].lotes_activos)  || 1;

    // Horas: pendiente de implementación cuando se trackeen horas reales en lotes
    // industriales. Por ahora se pasa 0 (el método 'horas' resulta en 0 hasta entonces).
    const loteHoras         = 0;
    const totalHorasNegocio = 0;

    const resultado = prorratearCIF({
      gastos,
      loteKilos,
      loteHoras,
      totalKilosNegocio,
      totalHorasNegocio,
      lotesActivosNegocio,
    });

    res.json({
      lote_id: loteId,
      lote_kilos: loteKilos,
      total_kilos_negocio: totalKilosNegocio,
      lotes_activos_negocio: lotesActivosNegocio,
      ...resultado,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
}
