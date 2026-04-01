const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

async function runMigrations() {
  console.log('🔄 Iniciando proceso de migración...');

  // 1. Conectarnos a la base de datos por defecto 'postgres' para crear la nuestra
  const defaultPool = new Pool({
    user: process.env.DB_USER,
    host: process.env.DB_HOST,
    database: 'postgres', // Nos conectamos a la BD por defecto
    password: process.env.DB_PASSWORD,
    port: process.env.DB_PORT,
  });

  try {
    const dbName = process.env.DB_NAME;
    
    // Verificar si la base de datos existe
    const { rows } = await defaultPool.query(`SELECT datname FROM pg_database WHERE datname = $1`, [dbName]);
    
    if (rows.length === 0) {
      console.log(`🛠️ La base de datos "${dbName}" no existe. Creándola...`);
      // CREATE DATABASE no se puede correr dentro de una transacción, ni con parámetros
      await defaultPool.query(`CREATE DATABASE ${dbName}`);
      console.log(`✅ Base de datos "${dbName}" creada con éxito.`);
    } else {
      console.log(`ℹ️ La base de datos "${dbName}" ya existe.`);
    }
  } catch (err) {
    console.error('❌ Error al verificar/crear la base de datos:', err.message);
    process.exit(1);
  } finally {
    await defaultPool.end(); // Cerramos la conexión por defecto
  }

  // 2. Ahora sí, nos conectamos a nuestra base de datos para correr las tablas
  const appPool = new Pool({
    user: process.env.DB_USER,
    host: process.env.DB_HOST,
    database: process.env.DB_NAME, // Ahora a nuestra BD
    password: process.env.DB_PASSWORD,
    port: process.env.DB_PORT,
  });

  try {
    const migrationsDir = path.join(__dirname, 'migrations');
    const files = fs.readdirSync(migrationsDir).filter(f => f.endsWith('.sql')).sort();

    if (files.length === 0) {
      console.log('ℹ️ No se encontraron archivos de migración (.sql) en src/migrations/');
    }

    // Ejecutar cada archivo .sql en orden
    for (const file of files) {
      console.log(`\n⏳ Ejecutando migración: ${file}...`);
      const filePath = path.join(migrationsDir, file);
      const sql = fs.readFileSync(filePath, 'utf8');

      await appPool.query(sql);
      console.log(`✅ Migración ${file} aplicada con éxito.`);
    }

    console.log('\n🎉 ¡Todas las migraciones se ejecutaron correctamente!');

  } catch (err) {
    console.error('\n❌ Error ejecutando migraciones:', err.message);
  } finally {
    await appPool.end(); // Siempre cerramos la conexión al terminar
  }
}

// Ejecutar la función
runMigrations();
