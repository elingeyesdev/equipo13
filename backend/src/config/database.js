import pg from 'pg';
import dotenv from 'dotenv';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

dotenv.config();

const { Pool } = pg;

export const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

const __dirname = dirname(fileURLToPath(import.meta.url));

export async function runMigration() {
  const client = await pool.connect();
  try {
    const sql = readFileSync(join(__dirname, '../../migrations/001_initial_schema.sql'), 'utf8');
    await client.query(sql);
    console.log('Migración ejecutada correctamente');
  } catch (err) {
    console.error('Error en migración:', err.message);
    process.exit(1);
  } finally {
    client.release();
    await pool.end();
  }
}
