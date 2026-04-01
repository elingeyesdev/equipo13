const Material = require('../models/Material');

// ── GET /api/materials ─────────────────────────────────
exports.getAll = async (req, res) => {
  try {
    const filters = {};
    if (req.query.type) filters.type = req.query.type;
    if (req.query.category) filters.category = req.query.category;

    const items = await Material.findAll(filters);
    res.json({ success: true, data: items, count: items.length });
  } catch (error) {
    console.error('Error al obtener materiales:', error.message);
    res.status(500).json({ success: false, error: 'Error interno del servidor' });
  }
};

// ── GET /api/materials/:id ─────────────────────────────
exports.getById = async (req, res) => {
  try {
    const item = await Material.findById(req.params.id);
    if (!item) {
      return res.status(404).json({ success: false, error: 'Insumo/Material no encontrado' });
    }
    res.json({ success: true, data: item });
  } catch (error) {
    console.error('Error al obtener material:', error.message);
    res.status(500).json({ success: false, error: 'Error interno del servidor' });
  }
};

// ── POST /api/materials ────────────────────────────────
exports.create = async (req, res) => {
  try {
    const { id, sku, name, description, category, type, primary_unit_id, cost_standard, stage } = req.body;

    // Validaciones
    if (!id || !name || !type || !primary_unit_id) {
      return res.status(400).json({
        success: false,
        error: 'Campos requeridos: id, name, type, primary_unit_id'
      });
    }

    if (!['Industrial', 'Biológico'].includes(type)) {
      return res.status(400).json({
        success: false,
        error: 'Type debe ser "Industrial" o "Biológico"'
      });
    }

    if (await Material.exists(id)) {
      return res.status(409).json({ success: false, error: `Ya existe material con ID "${id}"` });
    }

    const item = await Material.create(req.body);
    res.status(201).json({ success: true, data: item });
  } catch (error) {
    // Si la unidad primaria no existe, tira error de llave foránea PostgreSQL (código '23503')
    if (error.code === '23503') {
      return res.status(400).json({ success: false, error: 'La unidad "primary_unit_id" asignada no existe.' });
    }
    console.error('Error al crear material:', error.message);
    res.status(500).json({ success: false, error: 'Error interno del servidor' });
  }
};

// ── PUT /api/materials/:id ─────────────────────────────
exports.update = async (req, res) => {
  try {
    const { id } = req.params;
    const { type, name, primary_unit_id } = req.body;

    if (!name || !type || !primary_unit_id) {
      return res.status(400).json({ success: false, error: 'Campos requeridos: name, type, primary_unit_id' });
    }

    if (!(await Material.exists(id))) {
      return res.status(404).json({ success: false, error: 'Insumo/Material no encontrado' });
    }

    const item = await Material.update(id, req.body);
    res.json({ success: true, data: item });
  } catch (error) {
    if (error.code === '23503') {
      return res.status(400).json({ success: false, error: 'La unidad "primary_unit_id" asignada no existe.' });
    }
    console.error('Error al actualizar material:', error.message);
    res.status(500).json({ success: false, error: 'Error interno del servidor' });
  }
};

// ── DELETE /api/materials/:id ──────────────────────────
exports.delete = async (req, res) => {
  try {
    const { id } = req.params;

    if (!(await Material.exists(id))) {
      return res.status(404).json({ success: false, error: 'Insumo no encontrado' });
    }

    await Material.delete(id);
    res.json({ success: true, message: `Material/Insumo "${id}" eliminado correctamente` });
  } catch (error) {
    if (error.message.includes('No se puede eliminar')) {
      return res.status(409).json({ success: false, error: error.message });
    }
    console.error('Error al eliminar material:', error.message);
    res.status(500).json({ success: false, error: 'Error interno del servidor' });
  }
};
