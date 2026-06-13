import bcrypt from 'bcryptjs';
import { pool } from '../config/database.js';
import { generarPin, generarUsername } from '../utils/codigos.js';

// GET /api/negocios/:negocioId/operarios
export async function listarOperarios(req, res) {
  const { negocioId } = req.params;
  try {
    const { rows } = await pool.query(
      `SELECT u.id, u.nombre, u.username, m.activo,
              (u.bloqueado_hasta IS NOT NULL AND u.bloqueado_hasta > NOW()) AS bloqueado,
              COALESCE(json_agg(json_build_object('lote_id', ol.lote_id, 'identificador', l.identificador))
                       FILTER (WHERE ol.id IS NOT NULL AND ol.activo), '[]') AS lotes
         FROM users u
         JOIN membresias m ON m.user_id = u.id AND m.negocio_id = $1 AND m.rol = 'operario'
         LEFT JOIN operario_lote ol ON ol.operario_user_id = u.id AND ol.negocio_id = $1
         LEFT JOIN lotes l ON l.id = ol.lote_id
        GROUP BY u.id, m.activo
        ORDER BY u.nombre`,
      [negocioId]
    );
    res.json(rows);
  } catch (err) {
    console.error('listarOperarios error:', err);
    res.status(500).json({ error: err.message });
  }
}

// POST /api/negocios/:negocioId/operarios  { nombre }
export async function crearOperario(req, res) {
  const { negocioId } = req.params;
  const { nombre } = req.body || {};
  if (!nombre) return res.status(400).json({ error: 'El nombre es requerido' });

  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const pin = generarPin();
    const pinHash = await bcrypt.hash(pin, 10);

    // username único: reintenta si colisiona
    let username, ok = false, intentos = 0;
    while (!ok && intentos < 5) {
      username = generarUsername(nombre);
      const dup = await client.query('SELECT 1 FROM users WHERE username = $1', [username]);
      ok = dup.rows.length === 0;
      intentos++;
    }

    const userRes = await client.query(
      `INSERT INTO users (nombre, username, pin_hash, tipo)
       VALUES ($1, $2, $3, 'pin')
       RETURNING id, nombre, username`,
      [nombre, username, pinHash]
    );
    const user = userRes.rows[0];

    await client.query(
      `INSERT INTO membresias (user_id, negocio_id, rol) VALUES ($1, $2, 'operario')`,
      [user.id, negocioId]
    );

    await client.query('COMMIT');
    res.status(201).json({ ...user, pin_temporal: pin });
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('crearOperario error:', err);
    res.status(500).json({ error: err.message });
  } finally {
    client.release();
  }
}

// POST /api/negocios/:negocioId/operarios/:operarioId/reset-pin
export async function resetPin(req, res) {
  const { negocioId, operarioId } = req.params;
  try {
    const memb = await pool.query(
      `SELECT 1 FROM membresias WHERE user_id = $1 AND negocio_id = $2 AND rol = 'operario'`,
      [operarioId, negocioId]
    );
    if (!memb.rows.length) return res.status(404).json({ error: 'Operario no encontrado' });

    const pin = generarPin();
    const pinHash = await bcrypt.hash(pin, 10);
    await pool.query(
      'UPDATE users SET pin_hash = $1, pin_intentos_fallidos = 0, bloqueado_hasta = NULL WHERE id = $2',
      [pinHash, operarioId]
    );
    res.json({ pin_temporal: pin });
  } catch (err) {
    console.error('resetPin error:', err);
    res.status(500).json({ error: err.message });
  }
}

// PATCH /api/negocios/:negocioId/operarios/:operarioId  { activo }
export async function setActivoOperario(req, res) {
  const { negocioId, operarioId } = req.params;
  const { activo } = req.body || {};
  try {
    const { rowCount } = await pool.query(
      `UPDATE membresias SET activo = $1
        WHERE user_id = $2 AND negocio_id = $3 AND rol = 'operario'`,
      [activo !== false, operarioId, negocioId]
    );
    if (!rowCount) return res.status(404).json({ error: 'Operario no encontrado' });
    res.json({ ok: true, activo: activo !== false });
  } catch (err) {
    console.error('setActivoOperario error:', err);
    res.status(500).json({ error: err.message });
  }
}

// POST /api/negocios/:negocioId/operarios/:operarioId/lotes  { lote_id }
export async function asignarLote(req, res) {
  const { negocioId, operarioId } = req.params;
  const { lote_id } = req.body || {};
  if (!lote_id) return res.status(400).json({ error: 'lote_id es requerido' });
  try {
    // El operario debe ser miembro de este negocio (evita asignar lotes a
    // operarios de otro negocio conociendo los UUIDs).
    const memb = await pool.query(
      `SELECT 1 FROM membresias WHERE user_id = $1 AND negocio_id = $2 AND rol = 'operario'`,
      [operarioId, negocioId]
    );
    if (!memb.rows.length) return res.status(404).json({ error: 'Operario no encontrado' });

    const lote = await pool.query(
      'SELECT id FROM lotes WHERE id = $1 AND negocio_id = $2',
      [lote_id, negocioId]
    );
    if (!lote.rows.length) return res.status(404).json({ error: 'Lote no encontrado' });

    const { rows } = await pool.query(
      `INSERT INTO operario_lote (operario_user_id, lote_id, negocio_id, activo)
       VALUES ($1, $2, $3, true)
       ON CONFLICT (operario_user_id, lote_id)
       DO UPDATE SET activo = true
       RETURNING id`,
      [operarioId, lote_id, negocioId]
    );
    res.status(201).json({ id: rows[0].id });
  } catch (err) {
    console.error('asignarLote error:', err);
    res.status(500).json({ error: err.message });
  }
}

// DELETE /api/negocios/:negocioId/operarios/:operarioId/lotes/:loteId
export async function desasignarLote(req, res) {
  const { negocioId, operarioId, loteId } = req.params;
  try {
    await pool.query(
      'UPDATE operario_lote SET activo = false WHERE operario_user_id = $1 AND lote_id = $2 AND negocio_id = $3',
      [operarioId, loteId, negocioId]
    );
    res.json({ ok: true });
  } catch (err) {
    console.error('desasignarLote error:', err);
    res.status(500).json({ error: err.message });
  }
}
