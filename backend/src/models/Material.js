const db = require('../config/db');

class Material {

  // ── GET ALL ──────────────────────────────────────
  // Lista materiales. Opcionalmente filtra por type ('Industrial', 'Biológico') o category
  static async findAll(filters = {}) {
    let query = `
      SELECT m.*, u.name AS primary_unit_name, u.abbreviation AS primary_unit_abbreviation
      FROM materials m
      JOIN units u ON m.primary_unit_id = u.id
      WHERE 1=1
    `;
    const params = [];
    let paramCounter = 1;

    if (filters.type) {
      query += ` AND m.type = $${paramCounter}`;
      params.push(filters.type);
      paramCounter++;
    }
    
    if (filters.category) {
      query += ` AND m.category = $${paramCounter}`;
      params.push(filters.category);
      paramCounter++;
    }

    query += ' ORDER BY m.type DESC, m.name ASC';

    const { rows } = await db.query(query, params);
    return rows;
  }

  // ── GET BY ID ────────────────────────────────────
  static async findById(id) {
    const { rows } = await db.query(
      `SELECT m.*, u.name AS primary_unit_name, u.abbreviation AS primary_unit_abbreviation
       FROM materials m
       JOIN units u ON m.primary_unit_id = u.id
       WHERE m.id = $1`,
      [id]
    );
    return rows[0] || null;
  }

  // ── CREATE ───────────────────────────────────────
  static async create({ id, sku, name, description, category, type, primary_unit_id, cost_standard, stage }) {
    const { rows } = await db.query(
      `INSERT INTO materials (id, sku, name, description, category, type, primary_unit_id, cost_standard, stage)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
       RETURNING *`,
      [id, sku || null, name, description || null, category || null, type, primary_unit_id, cost_standard || null, stage || null]
    );
    return rows[0];
  }

  // ── UPDATE ───────────────────────────────────────
  static async update(id, { sku, name, description, category, type, primary_unit_id, cost_standard, stage }) {
    const { rows } = await db.query(
      `UPDATE materials
       SET sku = $1, name = $2, description = $3, category = $4, type = $5, primary_unit_id = $6, cost_standard = $7, stage = $8, updated_at = CURRENT_TIMESTAMP
       WHERE id = $9
       RETURNING *`,
      [sku || null, name, description || null, category || null, type, primary_unit_id, cost_standard || null, stage || null, id]
    );
    return rows[0] || null;
  }

  // ── DELETE ───────────────────────────────────────
  static async delete(id) {
    // Verificar si hay lotes en inventario unidos a este material
    const { rows: inventory } = await db.query(
      'SELECT id FROM inventory_batches WHERE material_id = $1 LIMIT 1',
      [id]
    );

    if (inventory.length > 0) {
      throw new Error('No se puede eliminar: Existen lotes/inventario registrados con este insumo.');
    }

    const { rowCount } = await db.query('DELETE FROM materials WHERE id = $1', [id]);
    return rowCount > 0;
  }

  // ── CHECK EXISTENCE ──────────────────────────────
  static async exists(id) {
    const { rows } = await db.query('SELECT 1 FROM materials WHERE id = $1', [id]);
    return rows.length > 0;
  }
}

module.exports = Material;
