import { pool } from '../config/database.js';

export async function getServicios(req, res) {
  const { negocioId } = req.params;
  const { activo } = req.query;
  try {
    let q = 'SELECT * FROM catalogo_servicios WHERE negocio_id = $1';
    if (activo === 'false') q += ' AND activo = false';
    else if (activo !== 'all') q += ' AND activo = true';
    q += ' ORDER BY nombre';
    const { rows } = await pool.query(q, [negocioId]);
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
}

export async function createServicio(req, res) {
  const { negocioId } = req.params;
  const { nombre, descripcion, unidad, costo_base } = req.body;
  if (!nombre) return res.status(400).json({ error: 'nombre es requerido' });
  try {
    const { rows } = await pool.query(
      `INSERT INTO catalogo_servicios (negocio_id, nombre, descripcion, unidad, costo_base)
       VALUES ($1, $2, $3, $4, $5) RETURNING *`,
      [negocioId, nombre, descripcion || null, unidad || 'visita', costo_base || null]
    );
    res.status(201).json(rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
}

export async function updateServicio(req, res) {
  const { negocioId, id } = req.params;
  const { nombre, descripcion, unidad, costo_base } = req.body;
  try {
    const { rows } = await pool.query(
      `UPDATE catalogo_servicios
       SET nombre      = COALESCE($1, nombre),
           descripcion = $2,
           unidad      = COALESCE($3, unidad),
           costo_base  = $4
       WHERE id = $5 AND negocio_id = $6
       RETURNING *`,
      [nombre || null, descripcion || null, unidad || null, costo_base || null, id, negocioId]
    );
    if (!rows.length) return res.status(404).json({ error: 'Servicio no encontrado' });
    res.json(rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
}

export async function archivarServicio(req, res) {
  const { negocioId, id } = req.params;
  try {
    const { rows } = await pool.query(
      `UPDATE catalogo_servicios SET activo = NOT activo
       WHERE id = $1 AND negocio_id = $2 RETURNING *`,
      [id, negocioId]
    );
    if (!rows.length) return res.status(404).json({ error: 'Servicio no encontrado' });
    res.json(rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
}

const SERVICIOS_CERDO = [
  { nombre: 'Visita veterinaria',           descripcion: 'Visita de rutina del médico veterinario',          unidad: 'visita' },
  { nombre: 'Consulta de emergencia',        descripcion: 'Atención veterinaria de urgencia',                 unidad: 'visita' },
  { nombre: 'Análisis de laboratorio',       descripcion: 'Análisis de sangre, heces o agua',                unidad: 'muestra' },
  { nombre: 'Castración',                    descripcion: 'Castración de lechones machos',                    unidad: 'cabeza' },
  { nombre: 'Corte de colmillos',            descripcion: 'Clipeo de colmillos en lechones',                  unidad: 'cabeza' },
  { nombre: 'Corte de cola',                 descripcion: 'Descole preventivo de lechones',                   unidad: 'cabeza' },
  { nombre: 'Areteo / Identificación',       descripcion: 'Colocación de aretes o tatuaje de identificación', unidad: 'cabeza' },
  { nombre: 'Muestreo de pesos',             descripcion: 'Pesaje y muestreo estadístico del lote',           unidad: 'visita' },
  { nombre: 'Desinfección de instalaciones', descripcion: 'Desinfección de galpones por empresa externa',     unidad: 'visita' },
  { nombre: 'Control de roedores',           descripcion: 'Servicio de desratización',                        unidad: 'visita' },
  { nombre: 'Control de moscas/vectores',    descripcion: 'Aplicación de insecticidas por empresa externa',   unidad: 'visita' },
  { nombre: 'Retiro de cadáveres',           descripcion: 'Recolección y disposición de animales muertos',    unidad: 'visita' },
  { nombre: 'Retiro de estiércol/purín',     descripcion: 'Extracción de purín del galpón',                   unidad: 'viaje' },
  { nombre: 'Transporte a matadero',         descripcion: 'Flete de animales para faena',                     unidad: 'viaje' },
  { nombre: 'Visita técnica nutricional',    descripcion: 'Consultoría de nutricionista externo',             unidad: 'visita' },
  { nombre: 'Auditoría de bioseguridad',     descripcion: 'Evaluación externa de protocolos sanitarios',      unidad: 'visita' },
];

export async function seedServiciosCerdos(req, res) {
  const { negocioId } = req.params;
  try {
    const { rows: [{ count }] } = await pool.query(
      'SELECT COUNT(*) FROM catalogo_servicios WHERE negocio_id = $1',
      [negocioId]
    );
    if (parseInt(count) > 0) {
      return res.status(409).json({ error: 'El catálogo ya tiene servicios. Agregá los que necesitás manualmente.' });
    }
    for (const s of SERVICIOS_CERDO) {
      await pool.query(
        `INSERT INTO catalogo_servicios (negocio_id, nombre, descripcion, unidad)
         VALUES ($1, $2, $3, $4)`,
        [negocioId, s.nombre, s.descripcion, s.unidad]
      );
    }
    const { rows } = await pool.query(
      'SELECT * FROM catalogo_servicios WHERE negocio_id = $1 ORDER BY nombre',
      [negocioId]
    );
    res.status(201).json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
}
