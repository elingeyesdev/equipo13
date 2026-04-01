const Unit = require('../models/Unit');

// ── GET /api/units ─────────────────────────────────
// Lista todas las unidades. Soporta ?category=Industrial o ?category=Biológico
exports.getAll = async (req, res) => {
  try {
    const { category } = req.query;
    const units = await Unit.findAll(category || null);
    res.json({ success: true, data: units, count: units.length });
  } catch (error) {
    console.error('Error al obtener unidades:', error.message);
    res.status(500).json({ success: false, error: 'Error interno del servidor' });
  }
};

// ── GET /api/units/:id ─────────────────────────────
// Obtiene una unidad por su ID
exports.getById = async (req, res) => {
  try {
    const unit = await Unit.findById(req.params.id);
    if (!unit) {
      return res.status(404).json({ success: false, error: 'Unidad no encontrada' });
    }
    res.json({ success: true, data: unit });
  } catch (error) {
    console.error('Error al obtener unidad:', error.message);
    res.status(500).json({ success: false, error: 'Error interno del servidor' });
  }
};

// ── POST /api/units ────────────────────────────────
// Crea una nueva unidad de medida
exports.create = async (req, res) => {
  try {
    const { id, name, abbreviation, base_unit_id, category } = req.body;

    // Validaciones
    if (!id || !name || !abbreviation || !category) {
      return res.status(400).json({
        success: false,
        error: 'Campos requeridos: id, name, abbreviation, category'
      });
    }

    if (!['Industrial', 'Biológico'].includes(category)) {
      return res.status(400).json({
        success: false,
        error: 'Categoría debe ser "Industrial" o "Biológico"'
      });
    }

    // Verificar que el ID no exista
    if (await Unit.exists(id)) {
      return res.status(409).json({
        success: false,
        error: `Ya existe una unidad con el ID "${id}"`
      });
    }

    // Si se proporcionó base_unit_id, verificar que exista
    if (base_unit_id && !(await Unit.exists(base_unit_id))) {
      return res.status(400).json({
        success: false,
        error: `La unidad base "${base_unit_id}" no existe`
      });
    }

    const unit = await Unit.create({ id, name, abbreviation, base_unit_id, category });
    res.status(201).json({ success: true, data: unit });
  } catch (error) {
    console.error('Error al crear unidad:', error.message);
    res.status(500).json({ success: false, error: 'Error interno del servidor' });
  }
};

// ── PUT /api/units/:id ─────────────────────────────
// Actualiza una unidad existente
exports.update = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, abbreviation, base_unit_id, category } = req.body;

    // Validaciones
    if (!name || !abbreviation || !category) {
      return res.status(400).json({
        success: false,
        error: 'Campos requeridos: name, abbreviation, category'
      });
    }

    if (!['Industrial', 'Biológico'].includes(category)) {
      return res.status(400).json({
        success: false,
        error: 'Categoría debe ser "Industrial" o "Biológico"'
      });
    }

    // Verificar que la unidad exista
    if (!(await Unit.exists(id))) {
      return res.status(404).json({ success: false, error: 'Unidad no encontrada' });
    }

    // Si se proporcionó base_unit_id, verificar que exista y no sea la misma unidad
    if (base_unit_id) {
      if (base_unit_id === id) {
        return res.status(400).json({
          success: false,
          error: 'Una unidad no puede ser su propia unidad base'
        });
      }
      if (!(await Unit.exists(base_unit_id))) {
        return res.status(400).json({
          success: false,
          error: `La unidad base "${base_unit_id}" no existe`
        });
      }
    }

    const unit = await Unit.update(id, { name, abbreviation, base_unit_id, category });
    res.json({ success: true, data: unit });
  } catch (error) {
    console.error('Error al actualizar unidad:', error.message);
    res.status(500).json({ success: false, error: 'Error interno del servidor' });
  }
};

// ── DELETE /api/units/:id ──────────────────────────
// Elimina una unidad (protege contra eliminación si tiene dependientes)
exports.delete = async (req, res) => {
  try {
    const { id } = req.params;

    if (!(await Unit.exists(id))) {
      return res.status(404).json({ success: false, error: 'Unidad no encontrada' });
    }

    await Unit.delete(id);
    res.json({ success: true, message: `Unidad "${id}" eliminada correctamente` });
  } catch (error) {
    // Si el modelo lanza error por dependencias, devolvemos 409 Conflict
    if (error.message.includes('No se puede eliminar')) {
      return res.status(409).json({ success: false, error: error.message });
    }
    console.error('Error al eliminar unidad:', error.message);
    res.status(500).json({ success: false, error: 'Error interno del servidor' });
  }
};
