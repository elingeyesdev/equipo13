const { pool } = require('../config/db');

class Bom {
  static async findAll() {
    const { rows } = await pool.query(
      `SELECT b.id, b.product_id, b.name, b.base_quantity, b.template_id, b.created_at, b.updated_at,
              m.name AS product_name, m.type AS product_type,
              m.primary_unit_id AS product_primary_unit_id,
              u.abbreviation AS product_unit_abbreviation
       FROM boms b
       JOIN materials m ON b.product_id = m.id
       JOIN units u ON m.primary_unit_id = u.id
       ORDER BY m.type DESC, m.name ASC`
    );
    return rows;
  }

  static async findById(id) {
    const bomResult = await pool.query(
      `SELECT b.*, m.name AS product_name, m.type AS product_type, m.description AS product_description,
              m.primary_unit_id AS product_primary_unit_id,
              pu.name AS product_unit_name, pu.abbreviation AS product_unit_abbreviation
       FROM boms b
       JOIN materials m ON b.product_id = m.id
       JOIN units pu ON m.primary_unit_id = pu.id
       WHERE b.id = $1`,
      [id]
    );
    const bom = bomResult.rows[0];
    if (!bom) return null;

    const itemsResult = await pool.query(
      `SELECT bi.id, bi.bom_id, bi.stage_id, bi.material_id, bi.quantity, bi.unit_id, bi.note,
              bi.created_at, bi.updated_at,
              s.name AS stage_name, s.sequence_order AS stage_sequence_order, s.type AS stage_type,
              mat.name AS material_name, mat.type AS material_type,
              un.name AS unit_name, un.abbreviation AS unit_abbreviation
       FROM bom_items bi
       JOIN production_stages s ON bi.stage_id = s.id
       JOIN materials mat ON bi.material_id = mat.id
       JOIN units un ON bi.unit_id = un.id
       WHERE bi.bom_id = $1
       ORDER BY s.sequence_order ASC, bi.id ASC`,
      [id]
    );

    return { ...bom, items: itemsResult.rows };
  }

  static async create({ product_id, name, base_quantity, template_id }) {
    const { rows } = await pool.query(
      `INSERT INTO boms (product_id, name, base_quantity, template_id)
       VALUES ($1, $2, COALESCE($3, 1), $4)
       RETURNING *`,
      [product_id, name || null, base_quantity, template_id || null]
    );
    return rows[0];
  }

  static async update(id, { name, base_quantity, template_id }) {
    const { rows } = await pool.query(
      `UPDATE boms
       SET name = $1,
           base_quantity = $2,
           template_id = $3,
           updated_at = CURRENT_TIMESTAMP
       WHERE id = $4
       RETURNING *`,
      [name ?? null, base_quantity, template_id ?? null, id]
    );
    return rows[0] || null;
  }

  static async delete(id) {
    const { rowCount } = await pool.query('DELETE FROM boms WHERE id = $1', [id]);
    return rowCount > 0;
  }

  static async findByProductId(productId) {
    const { rows } = await pool.query('SELECT id FROM boms WHERE product_id = $1', [productId]);
    return rows[0] || null;
  }

  static async addItem(bomId, { stage_id, material_id, quantity, unit_id, note }) {
    const { rows } = await pool.query(
      `INSERT INTO bom_items (bom_id, stage_id, material_id, quantity, unit_id, note)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING *`,
      [bomId, stage_id, material_id, quantity, unit_id, note || null]
    );
    return rows[0];
  }

  static async updateItem(itemId, bomId, { stage_id, material_id, quantity, unit_id, note }) {
    const { rows } = await pool.query(
      `UPDATE bom_items
       SET stage_id = $1,
           material_id = $2,
           quantity = $3,
           unit_id = $4,
           note = $5,
           updated_at = CURRENT_TIMESTAMP
       WHERE id = $6 AND bom_id = $7
       RETURNING *`,
      [stage_id, material_id, quantity, unit_id, note ?? null, itemId, bomId]
    );
    return rows[0] || null;
  }

  static async deleteItem(itemId, bomId) {
    const { rowCount } = await pool.query('DELETE FROM bom_items WHERE id = $1 AND bom_id = $2', [
      itemId,
      bomId,
    ]);
    return rowCount > 0;
  }

  static async getBomProductType(bomId) {
    const { rows } = await pool.query(
      `SELECT m.type FROM boms b JOIN materials m ON b.product_id = m.id WHERE b.id = $1`,
      [bomId]
    );
    return rows[0]?.type || null;
  }

  static async getBomProductId(bomId) {
    const { rows } = await pool.query(`SELECT product_id FROM boms WHERE id = $1`, [bomId]);
    return rows[0]?.product_id || null;
  }
}

module.exports = Bom;
