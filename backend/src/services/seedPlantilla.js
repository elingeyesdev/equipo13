export async function aplicarPlantilla(plantilla, negocioId, db) {
  if (plantilla === 'industria_lactea') {
    const { seedIndustriaLactea } = await import('../../seeds/industria_lactea.js');
    await seedIndustriaLactea(negocioId, db);
    return;
  }

  if (plantilla === 'industria_carnica') {
    const { seedIndustriaCarnica } = await import('../../seeds/industria_carnica.js');
    await seedIndustriaCarnica(negocioId, db);
    return;
  }

  console.warn(`Plantilla no implementada aún: ${plantilla}. Se creará el negocio vacío.`);
}
