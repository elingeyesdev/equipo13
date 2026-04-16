const db = require('../config/db');

class Unit {

  // ── GET ALL ──────────────────────────────────────
  // Obtiene todas las unidades, opcionalmente filtradas por type y category_id
  static async findAll(type = null, category_id = null) {
    let query = `
      SELECT u.*, bu.name AS base_unit_name, c.name AS category_name
      FROM units u
      LEFT JOIN units bu ON u.base_unit_id = bu.id
      LEFT JOIN categories c ON u.category_id = c.id
      WHERE 1=1
    `;
    const params = [];
    let paramCounter = 1;

    if (type) {
      query += ` AND u.type = $${paramCounter}`;
      params.push(type);
      paramCounter++;
    }

    if (category_id) {
       query += ` AND u.category_id = $${paramCounter}`;
       params.push(category_id);
       paramCounter++;
    }

    query += ' ORDER BY u.type, u.name';

    const { rows } = await db.query(query, params);
    return rows;
  }

  // ── GET BY ID ────────────────────────────────────
  static async findById(id) {
    const { rows } = await db.query(
      `SELECT u.*, bu.name AS base_unit_name, c.name AS category_name
       FROM units u
       LEFT JOIN units bu ON u.base_unit_id = bu.id
       LEFT JOIN categories c ON u.category_id = c.id
       WHERE u.id = $1`,
      [id]
    );
    return rows[0] || null;
  }

  // ── CREATE ───────────────────────────────────────
  static async create({ id, name, abbreviation, base_unit_id, type, category_id }) {
    const { rows } = await db.query(
      `INSERT INTO units (id, name, abbreviation, base_unit_id, type, category_id)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING *`,
      [id, name, abbreviation, base_unit_id || null, type, category_id || null]
    );
    return rows[0];
  }

  // ── UPDATE ───────────────────────────────────────
  static async update(id, { name, abbreviation, base_unit_id, type, category_id }) {
    const { rows } = await db.query(
      `UPDATE units
       SET name = $1, abbreviation = $2, base_unit_id = $3, type = $4, category_id = $5
       WHERE id = $6
       RETURNING *`,
      [name, abbreviation, base_unit_id || null, type, category_id || null, id]
    );
    return rows[0] || null;
  }

  // ── DELETE ───────────────────────────────────────
  static async delete(id) {
    // Primero verificar si otras unidades dependen de esta (base_unit_id)
    const { rows: dependents } = await db.query(
      'SELECT id, name FROM units WHERE base_unit_id = $1',
      [id]
    );

    if (dependents.length > 0) {
      const names = dependents.map(d => d.name).join(', ');
      throw new Error(
        `No se puede eliminar: las siguientes unidades dependen de esta: ${names}`
      );
    }

    const { rowCount } = await db.query(
      'DELETE FROM units WHERE id = $1',
      [id]
    );
    return rowCount > 0;
  }

  // ── CHECK EXISTENCE ──────────────────────────────
  static async exists(id) {
    const { rows } = await db.query(
      'SELECT 1 FROM units WHERE id = $1',
      [id]
    );
    return rows.length > 0;
  }
}

module.exports = Unit;
