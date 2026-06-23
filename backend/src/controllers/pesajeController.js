import { pool } from '../config/database.js';

// POST /api/negocios/:negocioId/lotes/:loteId/pesajes
// Body: { fecha?, peso_prom_kg, n_cabezas_muestra?, notas? }
export async function registrarPesajeDueno(req, res) {
  const { negocioId, loteId } = req.params;
  const { fecha, peso_prom_kg, n_cabezas_muestra, notas } = req.body || {};

  const peso = Number(peso_prom_kg);
  if (!Number.isFinite(peso) || peso <= 0) {
    return res.status(400).json({ error: 'peso_prom_kg debe ser mayor a 0' });
  }

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const loteCheck = await client.query(
      'SELECT id FROM lotes WHERE id = $1 AND negocio_id = $2',
      [loteId, negocioId]
    );
    if (!loteCheck.rows.length) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: 'Lote no encontrado en este negocio' });
    }

    const { rows } = await client.query(
      `INSERT INTO pesajes_lote
         (lote_id, fecha, peso_prom_kg, origen, registrado_por, n_cabezas_muestra, notas)
       VALUES ($1, COALESCE($2, CURRENT_DATE), $3, 'dueno', $4, $5, $6)
       ON CONFLICT (lote_id, fecha) DO UPDATE SET
         peso_prom_kg      = EXCLUDED.peso_prom_kg,
         origen            = EXCLUDED.origen,
         registrado_por    = EXCLUDED.registrado_por,
         n_cabezas_muestra = EXCLUDED.n_cabezas_muestra,
         notas             = EXCLUDED.notas
       RETURNING *`,
      [loteId, fecha || null, peso, req.user.id, n_cabezas_muestra || null, notas || null]
    );

    await client.query(
      'UPDATE lotes SET peso_actual_prom = $1 WHERE id = $2 AND negocio_id = $3',
      [peso, loteId, negocioId]
    );

    await client.query('COMMIT');
    res.status(201).json(rows[0]);
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('registrarPesajeDueno error:', err);
    res.status(500).json({ error: err.message });
  } finally {
    client.release();
  }
}

// GET /api/negocios/:negocioId/lotes/:loteId/pesajes
export async function listarPesajes(req, res) {
  const { negocioId, loteId } = req.params;
  try {
    const { rows } = await pool.query(
      `SELECT p.* FROM pesajes_lote p
       JOIN lotes l ON l.id = p.lote_id
       WHERE p.lote_id = $1 AND l.negocio_id = $2
       ORDER BY p.fecha DESC, p.created_at DESC`,
      [loteId, negocioId]
    );
    res.json(rows);
  } catch (err) {
    console.error('listarPesajes error:', err);
    res.status(500).json({ error: err.message });
  }
}
