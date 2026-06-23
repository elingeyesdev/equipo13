// Presets de cadencia de pesaje para los selectores de la UI.
export const PRESETS_PESAJE = [
  { label: 'Semanal (7 días)', dias: 7 },
  { label: 'Cada 10 días', dias: 10 },
  { label: 'Quincenal (15 días)', dias: 15 },
  { label: 'Mensual (30 días)', dias: 30 },
  { label: 'Personalizado…', dias: null }, // null → mostrar input numérico libre
];

// Sugerido por especie (espejo del backend, solo para pre-seleccionar en la UI).
const SUGERIDOS = { cerdo: 14, bovino: 30, pollo: 7, ave: 7, gallina: 7 };
export function intervaloSugeridoPorEspecie(tipoAnimal) {
  if (!tipoAnimal) return 14;
  return SUGERIDOS[tipoAnimal.toLowerCase()] ?? 14;
}
