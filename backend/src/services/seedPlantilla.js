import { seedIndustriaLactea } from '../../seeds/industria_lactea.js';

/**
 * Aplica el seed de plantilla al negocio dado.
 * Recibe un cliente pg ya dentro de una transacción.
 * Sólo lanza el error hacia arriba — el caller hace rollback.
 */
export async function aplicarPlantilla(plantilla, negocioId, db) {
  switch (plantilla) {
    case 'industria_lactea':
      await seedIndustriaLactea(negocioId, db);
      break;
    default:
      // Plantilla desconocida o no tiene seed: simplemente no aplica datos demo
      break;
  }
}
