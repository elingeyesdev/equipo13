// S-2: Gerardo implementa los seeds reales aquí

export async function aplicarPlantilla(plantilla, negocioId, db) {
  if (plantilla === 'industria_lactea') {
    const { seedIndustriaLactea } = await import('../../seeds/industria_lactea.js');
    await seedIndustriaLactea(negocioId, db);
  }
}
