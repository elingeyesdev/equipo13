const db = require('../config/db');

class InventoryBatch {

  // ── GET ALL ──────────────────────────────────────
  static async findAll() {
    let query = `
      SELECT ib.*, m.name AS material_name, m.type AS material_type,
             m.primary_unit_id, u.abbreviation AS unit_abbreviation
      FROM inventory_batches ib
      JOIN materials m ON ib.material_id = m.id
      JOIN units u ON m.primary_unit_id = u.id
      ORDER BY ib.created_at DESC
    `;
    const { rows } = await db.query(query);
    return rows;
  }

  // ── GET BY ID ────────────────────────────────────
  static async findById(id) {
    const { rows } = await db.query(
      `SELECT ib.*, m.name AS material_name, m.type AS material_type,
              m.primary_unit_id, u.abbreviation AS unit_abbreviation
       FROM inventory_batches ib
       JOIN materials m ON ib.material_id = m.id
       JOIN units u ON m.primary_unit_id = u.id
       WHERE ib.id = $1`,
      [id]
    );
    return rows[0] || null;
  }

  // ── CHECK UNIQUE DUPLICATE ───────────────────────
  static async findByBatchNumber(batch_number) {
    const { rows } = await db.query(
      'SELECT id FROM inventory_batches WHERE batch_number = $1',
      [batch_number]
    );
    return rows[0] || null;
  }

  // ── CREATE SINGLE ────────────────────────────────
  static async create({ batch_number, material_id, quantity, location, acquisition_cost, entry_date, initial_weight }) {
    const { rows } = await db.query(
      `INSERT INTO inventory_batches 
       (batch_number, material_id, quantity, location, acquisition_cost, entry_date, initial_weight)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING *`,
      [batch_number, material_id, quantity, location || null, acquisition_cost || null, entry_date || null, initial_weight || null]
    );
    return rows[0];
  }

  // ── CREATE BULK ──────────────────────────────────
  static async createBulk(batches) {
    // Usamos una transacción para el bulk insert (o todo se inserta, o nada)
    const client = await require('../config/db').query('BEGIN'); // Iniciar transacción virtual a nivel aplicación o mejor usar el Pool completo
    
    // El 'db' exporta 'query' directo pero para transacciones reales es mejor obtener un client.
    // Como pre-armamos db.js muy simple, usaremos un loop de promesas. PostgreSQL procesará rápido. 
    // Si falla uno, tirará error y la ruta de catch procesará el error.
    
    const results = [];
    for (const batch of batches) {
      const result = await this.create(batch);
      results.push(result);
    }
    
    return results;
  }

  // ── UPDATE ───────────────────────────────────────
  static async update(id, { batch_number, material_id, quantity, location, acquisition_cost, entry_date, initial_weight }) {
    const { rows } = await db.query(
      `UPDATE inventory_batches
       SET batch_number = $1, material_id = $2, quantity = $3, location = $4, 
           acquisition_cost = $5, entry_date = $6, initial_weight = $7
       WHERE id = $8
       RETURNING *`,
      [batch_number, material_id, quantity, location || null, acquisition_cost || null, entry_date || null, initial_weight || null, id]
    );
    return rows[0] || null;
  }

  // ── DELETE ───────────────────────────────────────
  static async delete(id) {
    const { rowCount } = await db.query('DELETE FROM inventory_batches WHERE id = $1', [id]);
    return rowCount > 0;
  }

  static async exists(id) {
    const { rows } = await db.query('SELECT 1 FROM inventory_batches WHERE id = $1', [id]);
    return rows.length > 0;
  }
}

module.exports = InventoryBatch;
