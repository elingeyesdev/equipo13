const InventoryBatch = require('../models/InventoryBatch');

// ── GET /api/inventory ─────────────────────────────────
exports.getAll = async (req, res) => {
  try {
    const items = await InventoryBatch.findAll();
    res.json({ success: true, data: items, count: items.length });
  } catch (error) {
    console.error('Error al obtener lotes/inventario:', error.message);
    res.status(500).json({ success: false, error: 'Error interno del servidor' });
  }
};

// ── GET /api/inventory/:id ─────────────────────────────
exports.getById = async (req, res) => {
  try {
    const item = await InventoryBatch.findById(req.params.id);
    if (!item) {
      return res.status(404).json({ success: false, error: 'Lote no encontrado' });
    }
    res.json({ success: true, data: item });
  } catch (error) {
    console.error('Error al obtener lote:', error.message);
    res.status(500).json({ success: false, error: 'Error interno del servidor' });
  }
};

// ── POST /api/inventory ────────────────────────────────
exports.create = async (req, res) => {
  try {
    const { batch_number, material_id, quantity } = req.body;

    if (!batch_number || !material_id || quantity === undefined) {
      return res.status(400).json({
        success: false,
        error: 'Campos requeridos: batch_number, material_id, quantity'
      });
    }

    if (await InventoryBatch.findByBatchNumber(batch_number)) {
      return res.status(409).json({ success: false, error: `El número de lote "${batch_number}" ya existe.` });
    }

    const item = await InventoryBatch.create(req.body);
    res.status(201).json({ success: true, data: item });
  } catch (error) {
    if (error.code === '23503') {
      return res.status(400).json({ success: false, error: 'El material_id asignado no existe.' });
    }
    console.error('Error al registrar inventario:', error.message);
    res.status(500).json({ success: false, error: 'Error interno del servidor' });
  }
};

// ── POST /api/inventory/bulk ───────────────────────────
// Carga masiva desde CSV. Espera un arreglo JSON Body: [ {batch_number, ...}, {...} ]
exports.createBulk = async (req, res) => {
  try {
    const batches = req.body;
    
    if (!Array.isArray(batches) || batches.length === 0) {
      return res.status(400).json({ success: false, error: 'Se esperaba un arreglo con datos de lotes' });
    }

    // Validar estructura básica antes de procesar
    for (let i = 0; i < batches.length; i++) {
        if (!batches[i].batch_number || !batches[i].material_id || batches[i].quantity === undefined) {
             return res.status(400).json({ 
                 success: false, 
                 error: `El registro en el índice ${i} no tiene los campos requeridos (batch_number, material_id, quantity)` 
             });
        }
    }

    const items = await InventoryBatch.createBulk(batches);
    res.status(201).json({ success: true, message: `Se insertaron ${items.length} registros exitosamente`, data: items });
  } catch (error) {
    if (error.code === '23503') {
      return res.status(400).json({ success: false, error: 'Uno o más material_id asignados en la carga masiva no existen.' });
    }
    if (error.code === '23505') { // Unique violation
        return res.status(409).json({ success: false, error: 'Uno o más números de lote enviados ya existen en la base de datos.' });
    }
    console.error('Error al procesar carga masiva:', error.message);
    res.status(500).json({ success: false, error: 'Error interno del servidor' });
  }
};

// ── PUT /api/inventory/:id ─────────────────────────────
exports.update = async (req, res) => {
  try {
    const { id } = req.params;
    const { batch_number, material_id, quantity } = req.body;

    if (!batch_number || !material_id || quantity === undefined) {
      return res.status(400).json({ success: false, error: 'Campos requeridos: batch_number, material_id, quantity' });
    }

    const duplicate = await InventoryBatch.findByBatchNumber(batch_number);
    if (duplicate && duplicate.id != id) {
      return res.status(409).json({ success: false, error: 'Estás tratando de duplicar otro número de lote existente.' });
    }

    if (!(await InventoryBatch.exists(id))) {
      return res.status(404).json({ success: false, error: 'Lote no encontrado' });
    }

    const item = await InventoryBatch.update(id, req.body);
    res.json({ success: true, data: item });
  } catch (error) {
    if (error.code === '23503') {
      return res.status(400).json({ success: false, error: 'El material_id asignado no existe.' });
    }
    console.error('Error al actualizar inventario:', error.message);
    res.status(500).json({ success: false, error: 'Error interno del servidor' });
  }
};

// ── DELETE /api/inventory/:id ──────────────────────────
exports.delete = async (req, res) => {
  try {
    const { id } = req.params;

    if (!(await InventoryBatch.exists(id))) {
      return res.status(404).json({ success: false, error: 'Lote no encontrado' });
    }

    await InventoryBatch.delete(id);
    res.json({ success: true, message: `Lote "${id}" eliminado correctamente` });
  } catch (error) {
    console.error('Error al eliminar lote:', error.message);
    res.status(500).json({ success: false, error: 'Error interno del servidor' });
  }
};
