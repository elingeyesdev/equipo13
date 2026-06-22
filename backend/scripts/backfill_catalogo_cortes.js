import { pool } from '../src/config/database.js';
import { seedCatalogoCortesPorcino } from '../seeds/catalogoCortesPorcino.js';

async function main() {
  console.log('Iniciando backfill de catalogo_cortes...');
  try {
    const { rows: negocios } = await pool.query(`
      SELECT n.id 
      FROM negocios n
      WHERE n.rubro = 'agro_ganadero' 
        AND NOT EXISTS (
          SELECT 1 FROM catalogo_cortes c WHERE c.negocio_id = n.id
        )
    `);

    console.log(`Negocios a backfillear: ${negocios.length}`);

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
