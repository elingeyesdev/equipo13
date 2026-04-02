const db = require('../config/db');

class UnitConversion {

  // ── GET ALL ──────────────────────────────────────
  static async findAll() {
    let query = `
      SELECT uc.*, 
        su.name AS source_unit_name, su.abbreviation AS source_unit_abbrev,
        tu.name AS target_unit_name, tu.abbreviation AS target_unit_abbrev
      FROM unit_conversions uc
      JOIN units su ON uc.source_unit_id = su.id
      JOIN units tu ON uc.target_unit_id = tu.id
      ORDER BY uc.type, uc.id
    `;
    const { rows } = await db.query(query);
    return rows;
  }

  // ── GET BY ID ────────────────────────────────────
  static async findById(id) {
    const { rows } = await db.query(
      `SELECT uc.*, 
        su.name AS source_unit_name, su.abbreviation AS source_unit_abbrev,
        tu.name AS target_unit_name, tu.abbreviation AS target_unit_abbrev
       FROM unit_conversions uc
       JOIN units su ON uc.source_unit_id = su.id
       JOIN units tu ON uc.target_unit_id = tu.id
       WHERE uc.id = $1`,
      [id]
    );
    return rows[0] || null;
  }

  // ── CHECK UNIQUE DUPLICATE ───────────────────────
  static async findByUnits(source, target) {
    const { rows } = await db.query(
      'SELECT id FROM unit_conversions WHERE source_unit_id = $1 AND target_unit_id = $2',
      [source, target]
    );
    return rows[0] || null;
  }

  // ── CREATE ───────────────────────────────────────
  static async create({ source_unit_id, target_unit_id, factor, type, note }) {
    const { rows } = await db.query(
      `INSERT INTO unit_conversions (source_unit_id, target_unit_id, factor, type, note)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING *`,
      [source_unit_id, target_unit_id, factor, type || null, note || null]
    );
    return rows[0];
  }

  // ── UPDATE ───────────────────────────────────────
  static async update(id, { source_unit_id, target_unit_id, factor, type, note }) {
    const { rows } = await db.query(
      `UPDATE unit_conversions
       SET source_unit_id = $1, target_unit_id = $2, factor = $3, type = $4, note = $5
       WHERE id = $6
       RETURNING *`,
      [source_unit_id, target_unit_id, factor, type || null, note || null, id]
    );
    return rows[0] || null;
  }

  // ── DELETE ───────────────────────────────────────
  static async delete(id) {
    const { rowCount } = await db.query('DELETE FROM unit_conversions WHERE id = $1', [id]);
    return rowCount > 0;
  }

  static async exists(id) {
    const { rows } = await db.query('SELECT 1 FROM unit_conversions WHERE id = $1', [id]);
    return rows.length > 0;
  }
}

module.exports = UnitConversion;
