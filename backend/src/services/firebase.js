import { pool } from '../config/database.js';

/**
 * Mock Service for Firebase Cloud Messaging
 * Simulate sending push notifications to an user's devices
 */

export async function notificar(userId, titulo, cuerpo) {
  try {
    const { rows } = await pool.query(
      `SELECT fcm_token FROM dispositivos WHERE user_id = $1`,
      [userId]
    );

    if (rows.length === 0) {
      console.log(`[MOCK FCM] No hay dispositivos registrados para el usuario ${userId}`);
      return;
    }

    const tokens = rows.map(r => r.fcm_token);
    
    console.log(`[MOCK FCM] Enviando notificación a user ${userId} (${tokens.length} dispositivos)`);
    console.log(`[MOCK FCM] Título: "${titulo}" | Cuerpo: "${cuerpo}"`);
    console.log(`[MOCK FCM] Tokens:`, tokens);
    
  } catch (error) {
    console.error(`[MOCK FCM] Error al notificar al usuario ${userId}:`, error);
  }
}
