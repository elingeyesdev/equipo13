const { pool } = require('../config/db');

class ProductionTemplate {
  // ── GET ALL ──────────────────────────────────────
  // Filtra opcionalmente por type ('Industrial' | 'Biológico')
  static async findAll(type) {
    let query = `SELECT * FROM production_templates`;
    const params = [];

    if (type && (type === 'Industrial' || type === 'Biológico')) {
      query += ` WHERE type = $1`;
      params.push(type);
    }

    query += ` ORDER BY type, name ASC`;
    const { rows } = await pool.query(query, params);
    return rows;
  }

  // ── GET BY ID ────────────────────────────────────
  static async findById(id) {
    const { rows } = await pool.query(
      `SELECT * FROM production_templates WHERE id = $1`,
      [id]
    );
    return rows[0] || null;
  }

  // ── CREATE ───────────────────────────────────────
  static async create({ name, description, type }) {
    const { rows } = await pool.query(
      `INSERT INTO production_templates (name, description, type)
       VALUES ($1, $2, $3)
       RETURNING *`,
      [name, description || null, type]
    );
    return rows[0];
  }

  // ── UPDATE ───────────────────────────────────────
  static async update(id, { name, description, type }) {
    const { rows } = await pool.query(
      `UPDATE production_templates
       SET name = $1, description = $2, type = $3, updated_at = CURRENT_TIMESTAMP
       WHERE id = $4
       RETURNING *`,
      [name, description || null, type, id]
    );
    return rows[0] || null;
  }

  // ── DELETE ───────────────────────────────────────
  // Valida que no esté referenciada por ningún BOM antes de borrar
  static async delete(id) {
    const { rows: usedInBoms } = await pool.query(
      `SELECT id FROM boms WHERE template_id = $1 LIMIT 1`,
      [id]
    );
    if (usedInBoms.length > 0) {
      throw new Error(
        'No se puede eliminar la plantilla porque está siendo usada por una o más Recetas (BOM).'
      );
    }

    const { rowCount } = await pool.query(
      `DELETE FROM production_templates WHERE id = $1`,
      [id]
    );
    return rowCount > 0;
  }

  // ── EXISTS ───────────────────────────────────────
  static async exists(id) {
    const { rows } = await pool.query(
      `SELECT 1 FROM production_templates WHERE id = $1`,
      [id]
    );
    return rows.length > 0;
  }
}

module.exports = ProductionTemplate;
