const db = require('../config/db');

class Category {
  // ── GET ALL ──────────────────────────────────────
  // Filtra por target_module ('Units', 'Materials') y/o type ('Industrial', 'Biológico')
  static async findAll(filters = {}) {
    let query = 'SELECT * FROM categories WHERE 1=1';
    const params = [];
    let paramCounter = 1;

    if (filters.target_module) {
      query += ` AND target_module = $${paramCounter}`;
      params.push(filters.target_module);
      paramCounter++;
    }

    if (filters.type) {
      query += ` AND type = $${paramCounter}`;
      params.push(filters.type);
      paramCounter++;
    }

    query += ' ORDER BY target_module, type, name';

    const { rows } = await db.query(query, params);
    return rows;
  }

  // ── GET BY ID ────────────────────────────────────
  static async findById(id) {
    const { rows } = await db.query('SELECT * FROM categories WHERE id = $1', [id]);
    return rows[0] || null;
  }

  // ── CREATE ───────────────────────────────────────
  static async create({ name, description, target_module, type }) {
    const { rows } = await db.query(
      `INSERT INTO categories (name, description, target_module, type)
       VALUES ($1, $2, $3, $4)
       RETURNING *`,
      [name, description || null, target_module, type]
    );
    return rows[0];
  }

  // ── UPDATE ───────────────────────────────────────
  static async update(id, { name, description, target_module, type }) {
    const { rows } = await db.query(
      `UPDATE categories
       SET name = $1, description = $2, target_module = $3, type = $4, updated_at = CURRENT_TIMESTAMP
       WHERE id = $5
       RETURNING *`,
      [name, description || null, target_module, type, id]
    );
    return rows[0] || null;
  }

  // ── DELETE ───────────────────────────────────────
  static async delete(id) {
    // Primero, validar que no esté siendo usada en Units ni Materials
    const { rows: usedInUnits } = await db.query('SELECT id FROM units WHERE category_id = $1 LIMIT 1', [id]);
    if (usedInUnits.length > 0) {
      throw new Error('No se puede eliminar la categoría porque está siendo usada por una o más Unidades de Medida.');
    }

    const { rows: usedInMaterials } = await db.query('SELECT id FROM materials WHERE category_id = $1 LIMIT 1', [id]);
    if (usedInMaterials.length > 0) {
      throw new Error('No se puede eliminar la categoría porque está siendo usada por uno o más Insumos.');
    }

    const { rowCount } = await db.query('DELETE FROM categories WHERE id = $1', [id]);
    return rowCount > 0;
  }

  static async exists(id) {
    const { rows } = await db.query('SELECT 1 FROM categories WHERE id = $1', [id]);
    return rows.length > 0;
  }
}

module.exports = Category;
