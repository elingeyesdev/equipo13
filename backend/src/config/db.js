const { Pool } = require('pg');
require('dotenv').config();

// Pool maneja automáticamente múltiples clientes/conexiones a PostgreSQL 
// Es la forma más eficiente de conectar un servidor Node
const pool = new Pool({
  user: process.env.DB_USER,
  host: process.env.DB_HOST,
  database: process.env.DB_NAME,
  password: process.env.DB_PASSWORD,
  port: process.env.DB_PORT,
});

pool.on('error', (err, client) => {
  console.error('Error inesperado en el Pool de PostgreSQL', err);
  process.exit(-1);
});

module.exports = {
  // Exportar 'query' pre-envuelve la ejecución de SQL y liberación del cliente
  query: (text, params) => pool.query(text, params),
  pool,
};
