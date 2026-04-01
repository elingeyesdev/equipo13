const db = require('../config/db');

class Unit {

  // ── GET ALL ──────────────────────────────────────
  // Obtiene todas las unidades, opcionalmente filtradas por categoría
  static async findAll(category = null) {
    let query = `
      SELECT u.*, bu.name AS base_unit_name
      FROM units u
      LEFT JOIN units bu ON u.base_unit_id = bu.id
    `;
    const params = [];

    if (category) {
      query += ' WHERE u.category = $1';
      params.push(category);
    }

    query += ' ORDER BY u.category, u.name';

    const { rows } = await db.query(query, params);
    return rows;
  }

  // ── GET BY ID ────────────────────────────────────
  static async findById(id) {
    const { rows } = await db.query(
      `SELECT u.*, bu.name AS base_unit_name
       FROM units u
       LEFT JOIN units bu ON u.base_unit_id = bu.id
       WHERE u.id = $1`,
      [id]
    );
    return rows[0] || null;
  }

  // ── CREATE ───────────────────────────────────────
  static async create({ id, name, abbreviation, base_unit_id, category }) {
    const { rows } = await db.query(
      `INSERT INTO units (id, name, abbreviation, base_unit_id, category)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING *`,
      [id, name, abbreviation, base_unit_id || null, category]
    );
    return rows[0];
  }

  // ── UPDATE ───────────────────────────────────────
  static async update(id, { name, abbreviation, base_unit_id, category }) {
    const { rows } = await db.query(
      `UPDATE units
       SET name = $1, abbreviation = $2, base_unit_id = $3, category = $4
       WHERE id = $5
       RETURNING *`,
      [name, abbreviation, base_unit_id || null, category, id]
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
