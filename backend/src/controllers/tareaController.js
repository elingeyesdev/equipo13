import { pool } from '../config/database.js';
import { notificar } from '../services/firebase.js';

// ==========================================
// OPERARIO
// ==========================================

// GET /api/operario/lotes/:loteId/checklist?fecha=YYYY-MM-DD
export async function getChecklistDia(req, res) {
  const { loteId } = req.params;
  const fecha = req.query.fecha || new Date().toISOString().split('T')[0];
  const userId = req.user.id;
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    // Crear filas faltantes para los items de las plantillas asignadas a este lote+operario
    await client.query(
      `INSERT INTO checklist_dia (plantilla_item_id, lote_id, operario_user_id, fecha)
       SELECT tpi.id, $1, $2, $3::date
         FROM tarea_plantilla_asignacion tpa
         JOIN tarea_plantilla tp        ON tp.id = tpa.plantilla_id AND tp.activo = true
         JOIN tarea_plantilla_item tpi  ON tpi.plantilla_id = tp.id
        WHERE tpa.lote_id = $1 AND tpa.operario_user_id = $2
       ON CONFLICT (plantilla_item_id, lote_id, operario_user_id, fecha) DO NOTHING`,
      [loteId, userId, fecha]
    );
    const { rows } = await client.query(
      `SELECT cd.id, tpi.titulo, cd.completado, tpi.orden
         FROM checklist_dia cd
         JOIN tarea_plantilla_item tpi ON tpi.id = cd.plantilla_item_id
        WHERE cd.lote_id = $1 AND cd.operario_user_id = $2 AND cd.fecha = $3::date
        ORDER BY tpi.orden, tpi.titulo`,
      [loteId, userId, fecha]
    );
    await client.query('COMMIT');
    res.json(rows);
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('getChecklistDia error:', err);
    res.status(500).json({ error: err.message });
  } finally {
    client.release();
  }
}

// POST /api/operario/checklist/:id/toggle
export async function toggleChecklist(req, res) {
  try {
    const { rows } = await pool.query(
      `UPDATE checklist_dia
          SET completado = NOT completado,
              completado_en = CASE WHEN NOT completado THEN NOW() ELSE NULL END
        WHERE id = $1 AND operario_user_id = $2 RETURNING *`,
      [req.params.id, req.user.id]
    );
    if (!rows.length) return res.status(404).json({ error: 'Ítem no encontrado' });
    res.json(rows[0]);
  } catch (err) {
    console.error('toggleChecklist error:', err);
    res.status(500).json({ error: err.message });
  }
}

// GET /api/operario/tareas
export async function misTareas(req, res) {
  try {
    const { rows } = await pool.query(
      `SELECT t.*, l.identificador AS lote_identificador
         FROM tareas t LEFT JOIN lotes l ON l.id = t.lote_id
        WHERE t.asignado_a = $1 AND t.negocio_id = $2 AND t.estado = 'pendiente'
        ORDER BY t.fecha_objetivo NULLS LAST, t.created_at`,
      [req.user.id, req.user.negocio_id]
    );
    res.json(rows);
  } catch (err) {
    console.error('misTareas error:', err);
    res.status(500).json({ error: err.message });
  }
}

// POST /api/operario/tareas/:id/completar
export async function completarTarea(req, res) {
  try {
    const { rows } = await pool.query(
      `UPDATE tareas SET estado = 'completada', completada_en = NOW()
        WHERE id = $1 AND asignado_a = $2 AND estado = 'pendiente' RETURNING *`,
      [req.params.id, req.user.id]
    );
    if (!rows.length) return res.status(404).json({ error: 'Tarea no encontrada' });
    res.json(rows[0]);
  } catch (err) {
    console.error('completarTarea error:', err);
    res.status(500).json({ error: err.message });
  }
}


// ==========================================
// ADMIN
// ==========================================

export async function crearTarea(req, res) {
  const { negocioId } = req.params;
  const { titulo, descripcion, lote_id, fecha_objetivo, asignado_a } = req.body;
  if (!titulo || !titulo.trim()) {
    return res.status(400).json({ error: 'El título es requerido' });
  }
  try {
    // El operario asignado debe ser miembro del negocio; el lote (si se indica) también.
    if (asignado_a) {
      const m = await pool.query(
        `SELECT 1 FROM membresias WHERE user_id = $1 AND negocio_id = $2 AND rol = 'operario'`,
        [asignado_a, negocioId]
      );
      if (!m.rows.length) return res.status(404).json({ error: 'Operario no encontrado' });
    }
    if (lote_id) {
      const l = await pool.query('SELECT 1 FROM lotes WHERE id = $1 AND negocio_id = $2', [lote_id, negocioId]);
      if (!l.rows.length) return res.status(404).json({ error: 'Lote no encontrado' });
    }
    const { rows } = await pool.query(
      `INSERT INTO tareas (negocio_id, lote_id, titulo, descripcion, fecha_objetivo, asignado_a, created_by)
       VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *`,
      [negocioId, lote_id || null, titulo, descripcion || null, fecha_objetivo || null, asignado_a || null, req.user.id]
    );
    
    if (asignado_a) {
      notificar(asignado_a, 'Nueva tarea asignada', `Se te asignó una nueva tarea: ${titulo}`);
    }
    
    res.status(201).json(rows[0]);
  } catch (err) {
    console.error('crearTarea error:', err);
    res.status(500).json({ error: err.message });
  }
}

export async function listarTareas(req, res) {
  const { negocioId } = req.params;
  const { estado } = req.query;
  try {
    let q = `SELECT t.*, l.identificador as lote_identificador, u.nombre as operario_nombre 
             FROM tareas t
             LEFT JOIN lotes l ON l.id = t.lote_id
             LEFT JOIN users u ON u.id = t.asignado_a
             WHERE t.negocio_id = $1`;
    const params = [negocioId];
    if (estado) {
      params.push(estado);
      q += ` AND t.estado = $2`;
    }
    q += ` ORDER BY t.created_at DESC`;
    const { rows } = await pool.query(q, params);
    res.json(rows);
  } catch (err) {
    console.error('listarTareas error:', err);
    res.status(500).json({ error: err.message });
  }
}

export async function crearPlantilla(req, res) {
  const { negocioId } = req.params;
  const { nombre, items, asignaciones } = req.body;
  if (!nombre || !nombre.trim()) {
    return res.status(400).json({ error: 'El nombre es requerido' });
  }
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const { rows } = await client.query(
      `INSERT INTO tarea_plantilla (negocio_id, nombre) VALUES ($1, $2) RETURNING id`,
      [negocioId, nombre]
    );
    const plantillaId = rows[0].id;

    if (items && items.length > 0) {
      for (let i = 0; i < items.length; i++) {
        await client.query(
          `INSERT INTO tarea_plantilla_item (plantilla_id, titulo, orden) VALUES ($1, $2, $3)`,
          [plantillaId, items[i], i]
        );
      }
    }

    if (asignaciones && asignaciones.length > 0) {
      for (const asig of asignaciones) {
        // El lote y el operario de cada asignación deben pertenecer al negocio.
        const lote = await client.query('SELECT 1 FROM lotes WHERE id = $1 AND negocio_id = $2', [asig.lote_id, negocioId]);
        const memb = await client.query(
          `SELECT 1 FROM membresias WHERE user_id = $1 AND negocio_id = $2 AND rol = 'operario'`,
          [asig.operario_user_id, negocioId]
        );
        if (!lote.rows.length || !memb.rows.length) {
          await client.query('ROLLBACK');
          return res.status(404).json({ error: 'Lote u operario de la asignación no pertenece al negocio' });
        }
        await client.query(
          `INSERT INTO tarea_plantilla_asignacion (plantilla_id, lote_id, operario_user_id) VALUES ($1, $2, $3)`,
          [plantillaId, asig.lote_id, asig.operario_user_id]
        );
        notificar(asig.operario_user_id, 'Nueva rutina asignada', `Se te asignó la rutina: ${nombre}`);
      }
    }

    await client.query('COMMIT');
    res.status(201).json({ id: plantillaId, nombre });
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('crearPlantilla error:', err);
    res.status(500).json({ error: err.message });
  } finally {
    client.release();
  }
}

export async function listarPlantillas(req, res) {
  const { negocioId } = req.params;
  try {
    const { rows } = await pool.query(
      `SELECT tp.*,
        (SELECT COALESCE(json_agg(tpi.titulo ORDER BY tpi.orden), '[]') FROM tarea_plantilla_item tpi WHERE tpi.plantilla_id = tp.id) as items,
        (SELECT COALESCE(json_agg(json_build_object('lote_id', tpa.lote_id, 'operario_user_id', tpa.operario_user_id)), '[]') 
         FROM tarea_plantilla_asignacion tpa WHERE tpa.plantilla_id = tp.id) as asignaciones
       FROM tarea_plantilla tp
       WHERE tp.negocio_id = $1
       ORDER BY tp.created_at DESC`,
      [negocioId]
    );
    res.json(rows);
  } catch (err) {
    console.error('listarPlantillas error:', err);
    res.status(500).json({ error: err.message });
  }
}

export async function togglePlantillaActiva(req, res) {
  const { negocioId, id } = req.params;
  try {
    const { rows } = await pool.query(
      `UPDATE tarea_plantilla SET activo = NOT activo WHERE id = $1 AND negocio_id = $2 RETURNING *`,
      [id, negocioId]
    );
    if (!rows.length) return res.status(404).json({ error: 'Plantilla no encontrada' });
    res.json(rows[0]);
  } catch (err) {
    console.error('togglePlantilla error:', err);
    res.status(500).json({ error: err.message });
  }
}
