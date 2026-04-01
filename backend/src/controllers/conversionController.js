const UnitConversion = require('../models/UnitConversion');

// ── GET /api/conversions ─────────────────────────────────
exports.getAll = async (req, res) => {
  try {
    const items = await UnitConversion.findAll();
    res.json({ success: true, data: items, count: items.length });
  } catch (error) {
    console.error('Error al obtener conversiones:', error.message);
    res.status(500).json({ success: false, error: 'Error interno del servidor' });
  }
};

// ── GET /api/conversions/:id ─────────────────────────────
exports.getById = async (req, res) => {
  try {
    const item = await UnitConversion.findById(req.params.id);
    if (!item) {
      return res.status(404).json({ success: false, error: 'Conversión no encontrada' });
    }
    res.json({ success: true, data: item });
  } catch (error) {
    console.error('Error al obtener conversión:', error.message);
    res.status(500).json({ success: false, error: 'Error interno del servidor' });
  }
};

// ── POST /api/conversions ────────────────────────────────
exports.create = async (req, res) => {
  try {
    const { source_unit_id, target_unit_id, factor, type, note } = req.body;

    if (!source_unit_id || !target_unit_id || !factor) {
      return res.status(400).json({
        success: false,
        error: 'Campos requeridos: source_unit_id, target_unit_id, factor'
      });
    }

    if (source_unit_id === target_unit_id) {
      return res.status(400).json({ success: false, error: 'No puedes convertir una unidad a sí misma.' });
    }

    const duplicate = await UnitConversion.findByUnits(source_unit_id, target_unit_id);
    if (duplicate) {
      return res.status(409).json({ success: false, error: 'Ya existe una conversión registrada entre estas dos unidades.' });
    }

    const item = await UnitConversion.create(req.body);
    res.status(201).json({ success: true, data: item });
  } catch (error) {
    if (error.code === '23503') {
      return res.status(400).json({ success: false, error: 'La unidad "source" o "target" asignada no existe.' });
    }
    console.error('Error al crear conversión:', error.message);
    res.status(500).json({ success: false, error: 'Error interno del servidor' });
  }
};

// ── PUT /api/conversions/:id ─────────────────────────────
exports.update = async (req, res) => {
  try {
    const { id } = req.params;
    const { source_unit_id, target_unit_id, factor } = req.body;

    if (!source_unit_id || !target_unit_id || !factor) {
      return res.status(400).json({ success: false, error: 'Campos requeridos: source_unit_id, target_unit_id, factor' });
    }

    if (source_unit_id === target_unit_id) {
      return res.status(400).json({ success: false, error: 'No puedes convertir una unidad a sí misma.' });
    }

    const duplicate = await UnitConversion.findByUnits(source_unit_id, target_unit_id);
    if (duplicate && duplicate.id != id) {
      return res.status(409).json({ success: false, error: 'Estás tratando de duplicar otra conversión existente entre estas dos unidades.' });
    }

    if (!(await UnitConversion.exists(id))) {
      return res.status(404).json({ success: false, error: 'Conversión no encontrada' });
    }

    const item = await UnitConversion.update(id, req.body);
    res.json({ success: true, data: item });
  } catch (error) {
    if (error.code === '23503') {
      return res.status(400).json({ success: false, error: 'La unidad "source" o "target" asignada no existe.' });
    }
    console.error('Error al actualizar conversión:', error.message);
    res.status(500).json({ success: false, error: 'Error interno del servidor' });
  }
};

// ── DELETE /api/conversions/:id ──────────────────────────
exports.delete = async (req, res) => {
  try {
    const { id } = req.params;

    if (!(await UnitConversion.exists(id))) {
      return res.status(404).json({ success: false, error: 'Conversión no encontrada' });
    }

    await UnitConversion.delete(id);
    res.json({ success: true, message: `Conversión "${id}" eliminada correctamente` });
  } catch (error) {
    console.error('Error al eliminar conversión:', error.message);
    res.status(500).json({ success: false, error: 'Error interno del servidor' });
  }
};
