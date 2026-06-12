import { pool } from '../config/database.js';
import { aplicarPlantilla } from '../services/seedPlantilla.js';
import { provisionarNegocioNuevo } from '../services/provisionNegocio.js';

export async function status(req, res) {
  try {
    const result = await pool.query(
      'SELECT onboarding_completado FROM users WHERE id = $1',
      [req.user.id]
    );
    if (!result.rows[0]) return res.status(404).json({ error: 'Usuario no encontrado' });
    res.json({ completado: result.rows[0].onboarding_completado });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
}

export async function completar(req, res) {
  const { negocios } = req.body;
  if (!Array.isArray(negocios) || negocios.length === 0) {
    return res.status(400).json({ error: 'Se requiere al menos un negocio' });
  }

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const negociosCreados = [];
    for (const { nombre, rubro, sub_rubro, plantilla } of negocios) {
      const result = await client.query(
        `INSERT INTO negocios (user_id, nombre, rubro, sub_rubro, plantilla)
         VALUES ($1, $2, $3, $4, $5)
         RETURNING id`,
        [req.user.id, nombre, rubro ?? null, sub_rubro ?? null, plantilla ?? null]
      );
      const negocioId = result.rows[0].id;
      negociosCreados.push(negocioId);

      await provisionarNegocioNuevo(client, { userId: req.user.id, negocioId });

      if (plantilla) {
        await aplicarPlantilla(plantilla, negocioId, client);
      }
    }

    await client.query(
      'UPDATE users SET onboarding_completado = true WHERE id = $1',
      [req.user.id]
    );

    await client.query('COMMIT');
    res.json({ ok: true, negocios: negociosCreados });
  } catch (err) {
    await client.query('ROLLBACK');
    console.error(err);
    res.status(500).json({ error: err.message });
  } finally {
    client.release();
  }
}
