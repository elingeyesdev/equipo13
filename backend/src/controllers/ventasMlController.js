import { mlPost } from '../services/mlClient.js';

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
