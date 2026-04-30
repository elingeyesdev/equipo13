export async function aplicarPlantilla(plantilla, negocioId, db) {
  if (plantilla === 'industria_lactea') {
    const { seedIndustriaLactea } = await import('../../seeds/industria_lactea.js');
    await seedIndustriaLactea(negocioId, db);
    return;
  }

  if (plantilla === 'engorde_bovino') {
    const { seedEngordeBovino } = await import('../../seeds/engorde_bovino.js');
    await seedEngordeBovino(negocioId, db);
    return;
  }

  console.warn(`Plantilla no implementada aún: ${plantilla}. Se creará el negocio vacío.`);
}
