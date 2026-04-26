import { pool } from '../config/database.js';
import { calcularCosto } from '../services/calculoCosto.js';

const BOM_CALC_SELECT = `
  SELECT
    b.cantidad,
    i.nombre,
    i.precio_unitario,
    u.simbolo AS simbolo_unidad
  FROM bom_items b
  JOIN insumos i ON i.id = b.insumo_id
  LEFT JOIN unidades_medida u ON u.id = b.unidad_id
  WHERE b.producto_id = $1
  ORDER BY b.orden
`;

const ETAPA_CALC_SELECT = `
  SELECT nombre, tiempo_minutos, costo_hora
  FROM etapas_produccion
  WHERE producto_id = $1
  ORDER BY orden
`;

export async function calcularFicha(req, res) {
  const { negocioId } = req.params;
  const { producto_id, lote_cantidad } = req.body;

  if (!producto_id || !lote_cantidad) {
    return res.status(400).json({ error: 'producto_id y lote_cantidad son requeridos' });
  }

  try {
    const prod = await pool.query(
      'SELECT id FROM productos WHERE id = $1 AND negocio_id = $2',
      [producto_id, negocioId]
    );
    if (prod.rowCount === 0) {
      return res.status(404).json({ error: 'Producto no encontrado en este negocio' });
    }

    const [bomResult, etapasResult] = await Promise.all([
      pool.query(BOM_CALC_SELECT, [producto_id]),
      pool.query(ETAPA_CALC_SELECT, [producto_id]),
    ]);

    if (bomResult.rowCount === 0 && etapasResult.rowCount === 0) {
      return res.status(400).json({ error: 'Este producto no tiene receta ni etapas definidas' });
    }

    const resultado = calcularCosto({
      bomItems: bomResult.rows,
      etapas: etapasResult.rows,
      lotesCantidad: parseInt(lote_cantidad, 10),
    });

    const ficha = await pool.query(
      `INSERT INTO fichas_costo (
        producto_id, negocio_id, lote_cantidad,
        mpd_unitario, mod_unitario, costo_unitario_total,
        mpd_lote, mod_lote, costo_lote_total,
        detalle_mpd, detalle_mod
      ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)
      RETURNING id, calculado_en`,
      [
        producto_id, negocioId, resultado.lote_cantidad,
        resultado.mpd.unitario, resultado.mod.unitario, resultado.costo_unitario_total,
        resultado.mpd.lote, resultado.mod.lote, resultado.costo_lote_total,
        JSON.stringify(resultado.mpd.detalle), JSON.stringify(resultado.mod.detalle),
      ]
    );

    res.status(201).json({
      id: ficha.rows[0].id,
      calculado_en: ficha.rows[0].calculado_en,
      ...resultado,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
}

export async function getFichas(req, res) {
  const { negocioId } = req.params;

  try {
    const result = await pool.query(
      `SELECT f.*, p.nombre AS producto_nombre
       FROM fichas_costo f
       JOIN productos p ON p.id = f.producto_id
       WHERE f.negocio_id = $1
       ORDER BY f.calculado_en DESC`,
      [negocioId]
    );
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
}

export async function getFichaById(req, res) {
  const { negocioId, id } = req.params;

  try {
    const result = await pool.query(
      `SELECT f.*, p.nombre AS producto_nombre
       FROM fichas_costo f
       JOIN productos p ON p.id = f.producto_id
       WHERE f.id = $1 AND f.negocio_id = $2`,
      [id, negocioId]
    );

    if (result.rowCount === 0) {
      return res.status(404).json({ error: 'Ficha no encontrada' });
    }

    res.json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
}
