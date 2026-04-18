const ProductionStage = require('../models/ProductionStage');

const getAll = async (req, res) => {
  try {
    const { type } = req.query;
    const stages = await ProductionStage.findAll(type);
    res.json(stages);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Error al obtener etapas de producción' });
  }
};

const getById = async (req, res) => {
  try {
    const stage = await ProductionStage.findById(req.params.id);
    if (!stage) {
      return res.status(404).json({ error: 'Etapa no encontrada' });
    }
    res.json(stage);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Error al obtener la etapa de producción' });
  }
};

const create = async (req, res) => {
  try {
    const { name, description, type } = req.body;
    if (!name || !type) {
      return res.status(400).json({ error: 'Nombre y tipo son obligatorios' });
    }
    const newStage = await ProductionStage.create({ name, description, type });
    res.status(201).json(newStage);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Error al crear la etapa de producción' });
  }
};

const update = async (req, res) => {
  try {
    const { name, description, type } = req.body;
    if (!name || !type) {
      return res.status(400).json({ error: 'Nombre y tipo son obligatorios' });
    }
    const updatedStage = await ProductionStage.update(req.params.id, { name, description, type });
    if (!updatedStage) {
      return res.status(404).json({ error: 'Etapa no encontrada' });
    }
    res.json(updatedStage);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Error al actualizar la etapa de producción' });
  }
};

const updateOrder = async (req, res) => {
  try {
    const { updates } = req.body; // Expects an array: [{ id: 1, sequence_order: 1 }, ...]
    if (!Array.isArray(updates) || updates.length === 0) {
      return res.status(400).json({ error: 'Falta arreglo con las actualizaciones de orden' });
    }
    await ProductionStage.updateOrder(updates);
    res.json({ message: 'Orden actualizado correctamente' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Error al reorganizar la secuencia de las etapas' });
  }
};

const remove = async (req, res) => {
  try {
    await ProductionStage.delete(req.params.id);
    res.status(204).send();
  } catch (error) {
    if (error.message.includes('en uso')) {
      return res.status(400).json({ error: error.message });
    }
    console.error(error);
    res.status(500).json({ error: 'Error al eliminar la etapa de producción' });
  }
};

module.exports = {
  getAll,
  getById,
  create,
  update,
  updateOrder,
  remove,
};
