import { pool } from '../config/database.js';

export async function registrarDispositivo(req, res) {
  try {
    const { fcm_token, plataforma } = req.body;
    const userId = req.user.id;

    if (!fcm_token) {
      return res.status(400).json({ error: 'Falta fcm_token' });
    }

    // Upsert the token
    await pool.query(
      `INSERT INTO dispositivos (user_id, fcm_token, plataforma) 
       VALUES ($1, $2, $3)
       ON CONFLICT (fcm_token) 
       DO UPDATE SET user_id = EXCLUDED.user_id, plataforma = EXCLUDED.plataforma, actualizado_en = CURRENT_TIMESTAMP`,
      [userId, fcm_token, plataforma]
    );

    res.json({ message: 'Dispositivo registrado exitosamente' });
  } catch (error) {
    console.error('Error registrando dispositivo:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
}
