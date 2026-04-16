const Category = require('../models/Category');

exports.getAllCategories = async (req, res) => {
  try {
    const { target_module, type } = req.query;
    const categories = await Category.findAll({ target_module, type });
    res.json(categories);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching categories', error: error.message });
  }
};

exports.getCategoryById = async (req, res) => {
  try {
    const { id } = req.params;
    const category = await Category.findById(id);
    if (!category) return res.status(404).json({ message: 'Category not found' });
    res.json(category);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching category', error: error.message });
  }
};

exports.createCategory = async (req, res) => {
  try {
    const { name, description, target_module, type } = req.body;
    
    if (!name || !target_module || !type) {
      return res.status(400).json({ message: 'Missing required fields: name, target_module, type' });
    }

    const newCategory = await Category.create({ name, description, target_module, type });
    res.status(201).json(newCategory);
  } catch (error) {
    if (error.code === '23505') { // postgres unique violation
      return res.status(400).json({ message: 'Ya existe una categoría con ese nombre para este módulo y tipo.' });
    }
    res.status(500).json({ message: 'Error creating category', error: error.message });
  }
};

exports.updateCategory = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, description, target_module, type } = req.body;

    const exists = await Category.exists(id);
    if (!exists) return res.status(404).json({ message: 'Category not found' });

    const updatedCategory = await Category.update(id, { name, description, target_module, type });
    res.json(updatedCategory);
  } catch (error) {
     if (error.code === '23505') { 
      return res.status(400).json({ message: 'Ya existe una categoría con ese nombre para este módulo y tipo.' });
    }
    res.status(500).json({ message: 'Error updating category', error: error.message });
  }
};

exports.deleteCategory = async (req, res) => {
  try {
    const { id } = req.params;
    
    const exists = await Category.exists(id);
    if (!exists) return res.status(404).json({ message: 'Category not found' });

    await Category.delete(id);
    res.status(204).send();
  } catch (error) {
    if (error.message.includes('siendo usada')) {
        return res.status(400).json({ message: error.message });
    }
    res.status(500).json({ message: 'Error deleting category', error: error.message });
  }
};
