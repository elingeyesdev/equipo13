import pg from 'pg';
import dotenv from 'dotenv';
dotenv.config({ path: './backend/.env' });

const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:5432/equipo13' });

async function check() {
  try {
    const res = await pool.query("SELECT column_name FROM information_schema.columns WHERE table_name = 'bitacora_lote'");
    console.log(res.rows.map(r => r.column_name));
    
    const data = await pool.query("SELECT * FROM bitacora_lote ORDER BY created_at DESC LIMIT 5");
    console.log(data.rows);
  } catch (e) {
    console.error(e);
  } finally {
    await pool.end();
  }
}
check();
