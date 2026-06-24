// Paleta cíclica para series de lotes (debe coincidir con backend dashboardController.PALETA_LOTES).
export const PALETA_LOTES = ['#2E7D32', '#1976D2', '#ED6C02', '#9C27B0', '#0097A7', '#5D4037'];

export const colorParaLote = (idx) => PALETA_LOTES[idx % PALETA_LOTES.length];

// Color del valor de ICA según status del backend.
export const colorIca = (status) => {
  switch (status) {
    case 'bueno':     return '#2E7D32';
    case 'aceptable': return '#ED6C02';
    case 'malo':      return '#D32F2F';
    default:          return '#9CA3AF';
  }
};

export const COLORES_CATEGORIA = {
  'Adquisición':  '#6B7280',
  'Alimentación': '#2E7D32',
  'Sanidad':      '#1976D2',
  'Mano de obra': '#ED6C02',
  'Otros':        '#9CA3AF',
};
