const { pool } = require('../config/db');

class ProductionStage {
  static async findAll(type) {
    let query = `
      SELECT id, name, description, type, sequence_order, created_at, updated_at 
      FROM production_stages
    `;
    const params = [];
    if (type && (type === 'Industrial' || type === 'Biológico')) {
      query += ` WHERE type = $1 `;
      params.push(type);
    }
    
    query += ` ORDER BY type, sequence_order ASC`;
    
    const { rows } = await pool.query(query, params);
    return rows;
  }

  static async findById(id) {
    const { rows } = await pool.query(`SELECT * FROM production_stages WHERE id = $1`, [id]);
    return rows[0];
  }

  static async create({ name, description, type }) {
    // Determine the next sequence_order for this type
    const seqResult = await pool.query(`
      SELECT COALESCE(MAX(sequence_order), 0) + 1 AS next_order
      FROM production_stages
      WHERE type = $1
    `, [type]);
    const nextOrder = seqResult.rows[0].next_order;

    const { rows } = await pool.query(
      `INSERT INTO production_stages (name, description, type, sequence_order)
       VALUES ($1, $2, $3, $4) RETURNING *`,
      [name, description || null, type, nextOrder]
    );
    return rows[0];
  }

  static async update(id, { name, description, type }) {
    const { rows } = await pool.query(
      `UPDATE production_stages
       SET name = $1, description = $2, type = $3, updated_at = CURRENT_TIMESTAMP
       WHERE id = $4 RETURNING *`,
      [name, description || null, type, id]
    );
    return rows[0];
  }

  static async updateOrder(updates) {
    // updates is an array of objects: [{ id: 1, sequence_order: 1 }, { id: 2, sequence_order: 2 }]
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      
      for (const item of updates) {
        await client.query(
          `UPDATE production_stages SET sequence_order = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2`,
          [item.sequence_order, item.id]
        );
      }

      await client.query('COMMIT');
    } catch (e) {
      await client.query('ROLLBACK');
      throw e;
    } finally {
      client.release();
    }
  }

  static async delete(id) {
    // Check if stage is used in BOMs
    const checkBom = await pool.query(`SELECT 1 FROM bom_items WHERE stage_id = $1 LIMIT 1`, [id]);
    if (checkBom.rowCount > 0) {
      throw new Error('No se puede eliminar la etapa de producción porque ya está en uso en una Receta/BOM.');
    }

    const { rows } = await pool.query(`DELETE FROM production_stages WHERE id = $1 RETURNING *`, [id]);
    return rows[0];
  }
}

module.exports = ProductionStage;
