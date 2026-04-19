const ProductionTemplate = require('../models/ProductionTemplate');

// ── GET /api/templates ─────────────────────────────────────
exports.getAll = async (req, res) => {
  try {
    const { type } = req.query;
    const templates = await ProductionTemplate.findAll(type);
    res.json(templates);
  } catch (error) {
    console.error('Error al obtener plantillas:', error.message);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
};

// ── GET /api/templates/:id ────────────────────────────────
exports.getById = async (req, res) => {
  try {
    const template = await ProductionTemplate.findById(req.params.id);
    if (!template) {
      return res.status(404).json({ error: 'Plantilla no encontrada' });
    }
    res.json(template);
  } catch (error) {
    console.error('Error al obtener plantilla:', error.message);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
};

// ── POST /api/templates ───────────────────────────────────
exports.create = async (req, res) => {
  try {
    const { name, description, type } = req.body;

    if (!name || !type) {
      return res.status(400).json({ error: 'Los campos nombre y tipo son obligatorios' });
    }

    if (!['Industrial', 'Biológico'].includes(type)) {
      return res.status(400).json({ error: 'El tipo debe ser "Industrial" o "Biológico"' });
    }

    const newTemplate = await ProductionTemplate.create({ name, description, type });
    res.status(201).json(newTemplate);
  } catch (error) {
    console.error('Error al crear plantilla:', error.message);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
};

// ── PUT /api/templates/:id ────────────────────────────────
exports.update = async (req, res) => {
  try {
    const { name, description, type } = req.body;

    if (!name || !type) {
      return res.status(400).json({ error: 'Los campos nombre y tipo son obligatorios' });
    }

    if (!['Industrial', 'Biológico'].includes(type)) {
      return res.status(400).json({ error: 'El tipo debe ser "Industrial" o "Biológico"' });
    }

    if (!(await ProductionTemplate.exists(req.params.id))) {
      return res.status(404).json({ error: 'Plantilla no encontrada' });
    }

    const updated = await ProductionTemplate.update(req.params.id, { name, description, type });
    res.json(updated);
  } catch (error) {
    console.error('Error al actualizar plantilla:', error.message);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
};

// ── DELETE /api/templates/:id ─────────────────────────────
exports.remove = async (req, res) => {
  try {
    if (!(await ProductionTemplate.exists(req.params.id))) {
      return res.status(404).json({ error: 'Plantilla no encontrada' });
    }

    await ProductionTemplate.delete(req.params.id);
    res.status(204).send();
  } catch (error) {
    if (error.message.includes('en uso') || error.message.includes('siendo usada')) {
      return res.status(400).json({ error: error.message });
    }
    console.error('Error al eliminar plantilla:', error.message);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
};
