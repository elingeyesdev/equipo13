import pg from 'pg';
import dotenv from 'dotenv';
import { readFileSync, readdirSync } from 'fs';
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
    // Crear tabla de tracking de migraciones si no existe
    await client.query(`
      CREATE TABLE IF NOT EXISTS schema_migrations (
        version VARCHAR(255) PRIMARY KEY,
        applied_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    const migrationsDir = join(__dirname, '../../migrations');
    const files = readdirSync(migrationsDir)
      .filter((f) => f.endsWith('.sql'))
      .sort();

    // Obtener las ya aplicadas
    const { rows } = await client.query('SELECT version FROM schema_migrations');
    const applied = new Set(rows.map(r => r.version));

    let executedCount = 0;
    for (const file of files) {
      if (applied.has(file)) {
        continue;
      }

      console.log(`Ejecutando migración: ${file}...`);
      const sql = readFileSync(join(migrationsDir, file), 'utf8');

      await client.query('BEGIN');
      try {
        await client.query(sql);
        await client.query('INSERT INTO schema_migrations (version) VALUES ($1)', [file]);
        await client.query('COMMIT');
        console.log(`✓ Migración ejecutada con éxito: ${file}`);
        executedCount++;
      } catch (err) {
        await client.query('ROLLBACK');
        throw err;
      }
    }

    if (executedCount === 0) {
      console.log('Base de datos al día. Sin migraciones pendientes.');
    } else {
      console.log(`Todas las migraciones completadas (${executedCount} ejecutadas)`);
    }
  } catch (err) {
    console.error('Error en migración:', err.message);
    process.exit(1);
  } finally {
    client.release();
    await pool.end();
  }
}
