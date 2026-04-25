export async function aplicarPlantilla(plantilla, negocioId, db) {
  if (plantilla !== 'industria_lactea') {
    throw new Error(`Plantilla no soportada: ${plantilla}`);
  }

  const { seedIndustriaLactea } = await import('../../seeds/industria_lactea.js');
  await seedIndustriaLactea(negocioId, db);
}
