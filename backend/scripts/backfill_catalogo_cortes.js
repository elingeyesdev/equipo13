import { pool } from '../src/config/database.js';
import { seedCatalogoCortesPorcino } from '../seeds/catalogoCortesPorcino.js';

async function main() {
  console.log('Iniciando backfill de catalogo_cortes...');
  try {
    // Procesamos TODOS los negocios agro. seedCatalogoCortesPorcino es idempotente
    // (ON CONFLICT DO NOTHING en catalogo_cortes, DO UPDATE en corte_alias), así que
    // re-correrlo sobre un negocio que ya tiene catálogo no duplica nada y, sobre todo,
    // sincroniza corte_alias en negocios sembrados antes de que existiera ese sync.
    const { rows: negocios } = await pool.query(`
      SELECT n.id
      FROM negocios n
      WHERE n.rubro = 'agro_ganadero'
    `);

    console.log(`Negocios agro a procesar (idempotente): ${negocios.length}`);

    for (const n of negocios) {
      await seedCatalogoCortesPorcino(n.id, pool);
      console.log(`Plantilla porcina sembrada para negocio: ${n.id}`);
    }

    console.log('Backfill completado exitosamente.');
  } catch (error) {
    console.error('Error en backfill:', error);
  } finally {
    await pool.end();
  }
}

main();
