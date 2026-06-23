import { pool } from '../config/database.js';
import { notificar } from '../services/firebase.js';

// POST /api/operario/lotes/:loteId/eventos
export async function crearEvento(req, res) {
  const { loteId } = req.params;
  const negocioId = req.user.negocio_id;
  const { tipo, payload = {}, fotos = [] } = req.body || {};
  if (!['baja', 'pesaje', 'incidente', 'stock_bajo'].includes(tipo)) {
    return res.status(400).json({ error: 'Tipo de evento inválido' });
  }
  // Validación server-side del payload (defensa en profundidad; el cliente ya valida).
  if (tipo === 'pesaje') {
    const p = Number(payload.peso_promedio);
    if (!Number.isFinite(p) || p <= 0) {
      return res.status(400).json({ error: 'peso_promedio debe ser mayor a 0' });
    }
  }
  if (tipo === 'baja') {
    const c = parseInt(payload.cabezas);
    if (!Number.isInteger(c) || c <= 0) {
      return res.status(400).json({ error: 'cabezas debe ser mayor a 0' });
    }
  }
  // Las fotos deben ser rutas generadas por el servidor (/uploads/...), no URLs arbitrarias.
  if (!Array.isArray(fotos) || !fotos.every((f) => typeof f === 'string' && f.startsWith('/uploads/'))) {
    return res.status(400).json({ error: 'Fotos inválidas' });
  }
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    // baja => pendiente; el resto => aplicado al instante
    const estado = tipo === 'baja' ? 'pendiente' : 'aplicado';

    const evRes = await client.query(
      `INSERT INTO eventos_operario (negocio_id, lote_id, operario_user_id, tipo, payload, fotos, estado)
       VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING *`,
      [negocioId, loteId, req.user.id, tipo, JSON.stringify(payload), JSON.stringify(fotos), estado]
    );

    // Efecto inmediato del pesaje. El INSERT NO se silencia: si falla, la
    // transacción completa hace rollback (consistencia entre evento, pesajes_lote
    // y peso_actual_prom).
    if (tipo === 'pesaje') {
      await client.query(
        `INSERT INTO pesajes_lote (lote_id, fecha, peso_prom_kg, origen, registrado_por)
         VALUES ($1, CURRENT_DATE, $2, 'operario', $3)`,
        [loteId, payload.peso_promedio, req.user.id]
      );
      await client.query(
        'UPDATE lotes SET peso_actual_prom = $1 WHERE id = $2 AND negocio_id = $3',
        [payload.peso_promedio, loteId, negocioId]
      );
    }

    await client.query('COMMIT');
    res.status(201).json(evRes.rows[0]);
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('crearEvento error:', err);
    res.status(500).json({ error: err.message });
  } finally {
    client.release();
  }
}

// POST /api/negocios/:negocioId/pendientes/bajas/:eventoId/aprobar  { notas? }
export async function aprobarBaja(req, res) {
  const { negocioId, eventoId } = req.params;
  const { notas } = req.body || {};
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const evRes = await client.query(
      `SELECT * FROM eventos_operario
        WHERE id = $1 AND negocio_id = $2 AND tipo = 'baja' AND estado = 'pendiente'
        FOR UPDATE`,
      [eventoId, negocioId]
    );
    if (!evRes.rows.length) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: 'Baja pendiente no encontrada' });
    }
    const ev = evRes.rows[0];
    const cabezas = parseInt(ev.payload.cabezas) || 0;
    const causa = ev.payload.causa || 'Baja reportada por operario';
    const pesoBaja = ev.payload.peso_baja ?? null;

    // Descontar cabezas activas (sin bajar de 0)
    await client.query(
      `UPDATE lotes SET cabezas_activas = GREATEST(cabezas_activas - $1, 0)
        WHERE id = $2 AND negocio_id = $3`,
      [cabezas, ev.lote_id, negocioId]
    );

    // Registrar en la bitácora de bajas existente
    await client.query(
      `INSERT INTO bitacora_lote (lote_id, fecha, tipo, detalle, es_baja, cabezas_baja, peso_baja, causa)
       VALUES ($1, CURRENT_DATE, 'Baja', $2, true, $3, $4, $5)`,
      [ev.lote_id, causa, cabezas, pesoBaja, causa]
    );

    const upd = await client.query(
      `UPDATE eventos_operario
          SET estado = 'aprobado', revisado_por = $1, revisado_en = NOW(), notas_admin = $2
        WHERE id = $3 RETURNING *`,
      [req.user.id, notas || null, eventoId]
    );

    await client.query('COMMIT');
    
    notificar(ev.operario_user_id, 'Baja aprobada', `Tu solicitud de baja de ${cabezas} cabezas fue aprobada.`);
    
    res.json(upd.rows[0]);
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('aprobarBaja error:', err);
    res.status(500).json({ error: err.message });
  } finally {
    client.release();
  }
}

// POST /api/negocios/:negocioId/pendientes/bajas/:eventoId/rechazar
export async function rechazarBaja(req, res) {
  const { negocioId, eventoId } = req.params;
  try {
    const { rowCount, rows } = await pool.query(
      `UPDATE eventos_operario SET estado = 'rechazado', revisado_por = $1, revisado_en = NOW(), notas_admin = $2
        WHERE id = $3 AND negocio_id = $4 AND tipo = 'baja' AND estado = 'pendiente' RETURNING *`,
      [req.user.id, req.body?.notas || null, eventoId, negocioId]
    );
    if (!rowCount) return res.status(404).json({ error: 'Baja pendiente no encontrada' });
    
    notificar(rows[0].operario_user_id, 'Baja rechazada', 'Tu solicitud de baja fue rechazada.');
    
    res.json(rows[0]);
  } catch (err) {
    console.error('rechazarBaja error:', err);
    res.status(500).json({ error: err.message });
  }
}

// GET /api/negocios/:negocioId/eventos?estado=&tipo=  (feed admin: incidentes, stock, bajas)
export async function listarEventos(req, res) {
  const { negocioId } = req.params;
  const { estado, tipo } = req.query;
  try {
    const cond = ['e.negocio_id = $1']; const params = [negocioId];
    if (estado) { params.push(estado); cond.push(`e.estado = $${params.length}`); }
    if (tipo)   { params.push(tipo);   cond.push(`e.tipo = $${params.length}`); }
    const { rows } = await pool.query(
      `SELECT e.*, l.identificador AS lote_identificador, u.nombre AS operario_nombre
         FROM eventos_operario e
         JOIN lotes l ON l.id = e.lote_id
         JOIN users u ON u.id = e.operario_user_id
        WHERE ${cond.join(' AND ')}
        ORDER BY e.created_at DESC`,
      params
    );
    res.json(rows);
  } catch (err) {
    console.error('listarEventos error:', err);
    res.status(500).json({ error: err.message });
  }
}

// GET /api/operario/eventos  (mi historial)
export async function misEventos(req, res) {
  try {
    const { rows } = await pool.query(
      `SELECT e.*, l.identificador AS lote_identificador
         FROM eventos_operario e JOIN lotes l ON l.id = e.lote_id
        WHERE e.operario_user_id = $1 AND e.negocio_id = $2
        ORDER BY e.created_at DESC LIMIT 100`,
      [req.user.id, req.user.negocio_id]
    );
    res.json(rows);
  } catch (err) {
    console.error('misEventos error:', err);
    res.status(500).json({ error: err.message });
  }
}
