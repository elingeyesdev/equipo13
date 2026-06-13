import { mlPost } from '../services/mlClient.js';
import { pool } from '../config/database.js';

// POST /api/negocios/:negocioId/scraping/run
export async function ejecutarScraping(req, res) {
  const { negocioId } = req.params;
  try {
    const data = await mlPost('/scraping/run', { negocio_id: negocioId });
    res.json(data);
  } catch (err) {
    console.error('ejecutarScraping error:', err);
    res.status(err.statusCode || 500).json({ error: err.message });
  }
}

// GET /:negocioId/fuentes-scraping
export async function listarFuentes(req, res) {
  try {
    const { rows } = await pool.query(
      'SELECT * FROM fuentes_scraping WHERE negocio_id = $1 ORDER BY nombre',
      [req.params.negocioId]);
    res.json(rows);
  } catch (err) { console.error(err); res.status(500).json({ error: err.message }); }
}

// POST /:negocioId/fuentes-scraping
export async function crearFuente(req, res) {
  const { nombre, url, tipo, config, canal } = req.body || {};
  if (!nombre || !url || !tipo) return res.status(400).json({ error: 'nombre, url y tipo son requeridos' });
  try {
    const { rows } = await pool.query(
      `INSERT INTO fuentes_scraping (negocio_id, nombre, url, tipo, config, canal)
       VALUES ($1,$2,$3,$4,$5,$6) RETURNING *`,
      [req.params.negocioId, nombre, url, tipo, config || {}, canal || 'minorista']);
    res.status(201).json(rows[0]);
  } catch (err) { console.error(err); res.status(500).json({ error: err.message }); }
}

// PUT /:negocioId/fuentes-scraping/:id
export async function actualizarFuente(req, res) {
  const { nombre, url, tipo, config, canal, activo } = req.body || {};
  try {
    const { rows } = await pool.query(
      `UPDATE fuentes_scraping SET nombre=$1, url=$2, tipo=$3, config=$4, canal=$5, activo=$6
        WHERE id=$7 AND negocio_id=$8 RETURNING *`,
      [nombre, url, tipo, config || {}, canal, activo !== false, req.params.id, req.params.negocioId]);
    if (!rows.length) return res.status(404).json({ error: 'Fuente no encontrada' });
    res.json(rows[0]);
  } catch (err) { console.error(err); res.status(500).json({ error: err.message }); }
}

// DELETE /:negocioId/fuentes-scraping/:id
export async function eliminarFuente(req, res) {
  try {
    await pool.query('DELETE FROM fuentes_scraping WHERE id=$1 AND negocio_id=$2',
      [req.params.id, req.params.negocioId]);
    res.json({ ok: true });
  } catch (err) { console.error(err); res.status(500).json({ error: err.message }); }
}

// GET /:negocioId/corte-alias  |  POST  |  DELETE /:id
export async function listarAlias(req, res) {
  try {
    const { rows } = await pool.query(
      'SELECT * FROM corte_alias WHERE negocio_id=$1 ORDER BY corte_canonico, alias_texto',
      [req.params.negocioId]);
    res.json(rows);
  } catch (err) { console.error(err); res.status(500).json({ error: err.message }); }
}

export async function crearAlias(req, res) {
  const { alias_texto, corte_canonico } = req.body || {};
  if (!alias_texto || !corte_canonico) return res.status(400).json({ error: 'alias_texto y corte_canonico son requeridos' });
  try {
    const { rows } = await pool.query(
      `INSERT INTO corte_alias (negocio_id, alias_texto, corte_canonico) VALUES ($1,$2,$3)
       ON CONFLICT (negocio_id, alias_texto) DO UPDATE SET corte_canonico = EXCLUDED.corte_canonico
       RETURNING *`,
      [req.params.negocioId, alias_texto, corte_canonico]);
    res.status(201).json(rows[0]);
  } catch (err) { console.error(err); res.status(500).json({ error: err.message }); }
}

export async function eliminarAlias(req, res) {
  try {
    await pool.query('DELETE FROM corte_alias WHERE id=$1 AND negocio_id=$2',
      [req.params.id, req.params.negocioId]);
    res.json({ ok: true });
  } catch (err) { console.error(err); res.status(500).json({ error: err.message }); }
}

// GET /:negocioId/precios-historico?corte=&canal=
export async function listarHistorico(req, res) {
  const { corte, canal } = req.query;
  try {
    const cond = ['negocio_id = $1']; const params = [req.params.negocioId];
    if (corte) { params.push(corte); cond.push(`corte_canonico = $${params.length}`); }
    if (canal) { params.push(canal); cond.push(`canal = $${params.length}`); }
    const { rows } = await pool.query(
      `SELECT corte_canonico, canal, precio_kg, fecha FROM precio_mercado_historico
        WHERE ${cond.join(' AND ')} ORDER BY fecha DESC LIMIT 500`, params);
    res.json(rows);
  } catch (err) { console.error(err); res.status(500).json({ error: err.message }); }
}

// GET /:negocioId/scrape-runs
export async function listarScrapeRuns(req, res) {
  try {
    const { rows } = await pool.query(
      `SELECT sr.*, f.nombre AS fuente_nombre FROM scrape_run sr
         LEFT JOIN fuentes_scraping f ON f.id = sr.fuente_id
        WHERE sr.negocio_id = $1 ORDER BY sr.started_at DESC LIMIT 100`,
      [req.params.negocioId]);
    res.json(rows);
  } catch (err) { console.error(err); res.status(500).json({ error: err.message }); }
}
