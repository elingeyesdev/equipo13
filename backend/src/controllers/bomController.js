const Bom = require('../models/Bom');
const Material = require('../models/Material');
const { pool } = require('../config/db');

async function assertStageMatchesProductType(stageId, productType) {
  const { rows } = await pool.query(`SELECT type FROM production_stages WHERE id = $1`, [stageId]);
  const stage = rows[0];
  if (!stage) {
    const err = new Error('Etapa de producción no encontrada');
    err.statusCode = 404;
    throw err;
  }
  if (stage.type !== productType) {
    const err = new Error('La etapa no corresponde al tipo de producto (Industrial / Biológico)');
    err.statusCode = 400;
    throw err;
  }
}

async function assertMaterialMatchesLine(materialId, productType) {
  const mat = await Material.findById(materialId);
  if (!mat) {
    const err = new Error('Insumo no encontrado');
    err.statusCode = 404;
    throw err;
  }
  if (mat.type !== productType) {
    const err = new Error('El insumo debe ser del mismo rubro que el producto');
    err.statusCode = 400;
    throw err;
  }
}

exports.getAll = async (req, res) => {
  try {
    const items = await Bom.findAll();
    res.json({ success: true, data: items, count: items.length });
  } catch (error) {
    console.error('Error al listar BOMs:', error.message);
    res.status(500).json({ success: false, error: 'Error interno del servidor' });
  }
};

exports.getById = async (req, res) => {
  try {
    const bom = await Bom.findById(req.params.id);
    if (!bom) {
      return res.status(404).json({ success: false, error: 'Lista BOM no encontrada' });
    }
    res.json({ success: true, data: bom });
  } catch (error) {
    console.error('Error al obtener BOM:', error.message);
    res.status(500).json({ success: false, error: 'Error interno del servidor' });
  }
};

exports.create = async (req, res) => {
  try {
    const { product_id, name, base_quantity, template_id } = req.body;
    if (!product_id) {
      return res.status(400).json({ success: false, error: 'product_id es obligatorio' });
    }
    if (!(await Material.exists(product_id))) {
      return res.status(400).json({ success: false, error: 'El producto (material) no existe' });
    }
    const existing = await Bom.findByProductId(product_id);
    if (existing) {
      return res.status(409).json({
        success: false,
        error: 'Ya existe una lista BOM para este producto. Edítela o elimínela antes de crear otra.',
      });
    }
    const qty = base_quantity != null ? Number(base_quantity) : 1;
    if (Number.isNaN(qty) || qty <= 0) {
      return res.status(400).json({ success: false, error: 'base_quantity debe ser un número mayor que 0' });
    }
    const row = await Bom.create({ product_id, name, base_quantity: qty, template_id });
    const full = await Bom.findById(row.id);
    res.status(201).json({ success: true, data: full });
  } catch (error) {
    if (error.code === '23505') {
      return res.status(409).json({
        success: false,
        error: 'Ya existe una lista BOM para este producto.',
      });
    }
    console.error('Error al crear BOM:', error.message);
    res.status(500).json({ success: false, error: 'Error interno del servidor' });
  }
};

exports.update = async (req, res) => {
  try {
    const id = Number(req.params.id);
    const { name, base_quantity, template_id } = req.body;
    const existing = await Bom.findById(id);
    if (!existing) {
      return res.status(404).json({ success: false, error: 'Lista BOM no encontrada' });
    }
    const qty = base_quantity != null ? Number(base_quantity) : Number(existing.base_quantity);
    if (Number.isNaN(qty) || qty <= 0) {
      return res.status(400).json({ success: false, error: 'base_quantity debe ser un número mayor que 0' });
    }
    const row = await Bom.update(id, {
      name: name !== undefined ? name : existing.name,
      base_quantity: qty,
      template_id: template_id !== undefined ? template_id : existing.template_id,
    });
    const full = await Bom.findById(row.id);
    res.json({ success: true, data: full });
  } catch (error) {
    console.error('Error al actualizar BOM:', error.message);
    res.status(500).json({ success: false, error: 'Error interno del servidor' });
  }
};

exports.remove = async (req, res) => {
  try {
    const id = Number(req.params.id);
    const ok = await Bom.delete(id);
    if (!ok) {
      return res.status(404).json({ success: false, error: 'Lista BOM no encontrada' });
    }
    res.json({ success: true, message: 'Lista BOM eliminada' });
  } catch (error) {
    console.error('Error al eliminar BOM:', error.message);
    res.status(500).json({ success: false, error: 'Error interno del servidor' });
  }
};

exports.addItem = async (req, res) => {
  try {
    const bomId = Number(req.params.id);
    const { stage_id, material_id, quantity, unit_id, note } = req.body;

    if (!stage_id || !material_id || quantity == null || !unit_id) {
      return res.status(400).json({
        success: false,
        error: 'Campos requeridos: stage_id, material_id, quantity, unit_id',
      });
    }

    const bom = await Bom.findById(bomId);
    if (!bom) {
      return res.status(404).json({ success: false, error: 'Lista BOM no encontrada' });
    }

    const productType = bom.product_type;
    if (material_id === bom.product_id) {
      return res.status(400).json({ success: false, error: 'El insumo no puede ser el mismo producto terminado' });
    }

    await assertStageMatchesProductType(stage_id, productType);
    await assertMaterialMatchesLine(material_id, productType);

    const q = Number(quantity);
    if (Number.isNaN(q) || q <= 0) {
      return res.status(400).json({ success: false, error: 'La cantidad debe ser mayor que 0' });
    }

    const row = await Bom.addItem(bomId, {
      stage_id,
      material_id,
      quantity: q,
      unit_id,
      note,
    });
    const full = await Bom.findById(bomId);
    res.status(201).json({ success: true, data: row, bom: full });
  } catch (error) {
    if (error.code === '23505') {
      return res.status(409).json({
        success: false,
        error: 'Ya existe una línea para este insumo en esta etapa.',
      });
    }
    if (error.statusCode) {
      return res.status(error.statusCode).json({ success: false, error: error.message });
    }
    if (error.code === '23503') {
      return res.status(400).json({ success: false, error: 'Etapa, insumo o unidad no válidos.' });
    }
    console.error('Error al agregar ítem BOM:', error.message);
    res.status(500).json({ success: false, error: 'Error interno del servidor' });
  }
};

exports.updateItem = async (req, res) => {
  try {
    const bomId = Number(req.params.id);
    const itemId = Number(req.params.itemId);
    const { stage_id, material_id, quantity, unit_id, note } = req.body;

    const bom = await Bom.findById(bomId);
    if (!bom) {
      return res.status(404).json({ success: false, error: 'Lista BOM no encontrada' });
    }

    const item = bom.items.find((i) => i.id === itemId);
    if (!item) {
      return res.status(404).json({ success: false, error: 'Línea de BOM no encontrada' });
    }

    const productType = bom.product_type;
    const nextStage = stage_id != null ? stage_id : item.stage_id;
    const nextMat = material_id != null ? material_id : item.material_id;
    if (nextMat === bom.product_id) {
      return res.status(400).json({ success: false, error: 'El insumo no puede ser el mismo producto terminado' });
    }

    await assertStageMatchesProductType(nextStage, productType);
    await assertMaterialMatchesLine(nextMat, productType);

    const q = quantity != null ? Number(quantity) : Number(item.quantity);
    if (Number.isNaN(q) || q <= 0) {
      return res.status(400).json({ success: false, error: 'La cantidad debe ser mayor que 0' });
    }

    const nextUnit = unit_id != null ? unit_id : item.unit_id;

    const nextNote =
      note !== undefined ? (note === '' || note === null ? null : note) : item.note;

    const row = await Bom.updateItem(itemId, bomId, {
      stage_id: nextStage,
      material_id: nextMat,
      quantity: q,
      unit_id: nextUnit,
      note: nextNote,
    });
    if (!row) {
      return res.status(404).json({ success: false, error: 'No se pudo actualizar la línea' });
    }
    const full = await Bom.findById(bomId);
    res.json({ success: true, data: row, bom: full });
  } catch (error) {
    if (error.code === '23505') {
      return res.status(409).json({
        success: false,
        error: 'Ya existe una línea para este insumo en esta etapa.',
      });
    }
    if (error.statusCode) {
      return res.status(error.statusCode).json({ success: false, error: error.message });
    }
    if (error.code === '23503') {
      return res.status(400).json({ success: false, error: 'Etapa, insumo o unidad no válidos.' });
    }
    console.error('Error al actualizar ítem BOM:', error.message);
    res.status(500).json({ success: false, error: 'Error interno del servidor' });
  }
};

exports.removeItem = async (req, res) => {
  try {
    const bomId = Number(req.params.id);
    const itemId = Number(req.params.itemId);
    const ok = await Bom.deleteItem(itemId, bomId);
    if (!ok) {
      return res.status(404).json({ success: false, error: 'Línea no encontrada' });
    }
    const full = await Bom.findById(bomId);
    res.json({ success: true, message: 'Línea eliminada', bom: full });
  } catch (error) {
    console.error('Error al eliminar ítem BOM:', error.message);
    res.status(500).json({ success: false, error: 'Error interno del servidor' });
  }
};
