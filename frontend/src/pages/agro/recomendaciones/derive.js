export function rankItems(items) {
  if (!items || !items.length) return [];
  
  // Clone to avoid mutating the original
  const sorted = [...items].sort((a, b) => {
    // margen_total = margen_kg * kg_disponibles
    const mtA = (a.margen_kg || 0) * (a.kg_disponibles || 0);
    const mtB = (b.margen_kg || 0) * (b.kg_disponibles || 0);
    return mtB - mtA;
  });

  return sorted.map((it, idx) => ({
    ...it,
    rank: idx + 1,
    margen_total: (it.margen_kg || 0) * (it.kg_disponibles || 0),
  }));
}

export function nivelConfianza(item, metaModelos = []) {
  const meta = metaModelos.find(
    m => m.corte_canonico === item.corte_canonico && m.canal === item.canal_sugerido
  );
  const mae = meta?.metricas?.mae;
  const mape = meta?.metricas?.mape;

  let nivel = 'media';
  if (item.confianza_nivel) {
    nivel = item.confianza_nivel;
  } else if (mape !== undefined && mape !== null) {
    if (mape < 5) nivel = 'alta';
    else if (mape < 15) nivel = 'media';
    else nivel = 'baja';
  }

  const color = 
    nivel === 'alta' ? 'var(--accent-success)' :
    nivel === 'media' ? 'var(--accent-warning)' :
    'var(--accent-danger)';

  return { nivel, color, mae, mape };
}

export function accionVisual(accion) {
  switch (accion) {
    case 'vender_ahora':
      return { label: 'Vender ahora', color: 'var(--accent-success)', icon: 'checkCircle' };
    case 'esperar':
      return { label: 'Esperar', color: 'var(--accent-warning)', icon: 'history' };
    case 'no_vender':
      return { label: 'Revisar costo', color: 'var(--accent-danger)', icon: 'alertTriangle' };
    default:
      return { label: accion || '—', color: 'var(--text-secondary)', icon: 'info' };
  }
}

export function razonRecomendacion(item, horizonte = 7) {
  if (!item) return '';
  const { accion, rank, margen_kg, margen_pronosticado, ingreso_estimado } = item;
  
  const mKg = Number(margen_kg || 0).toLocaleString('es-BO', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  const mPron = Number(margen_pronosticado || 0).toLocaleString('es-BO', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  const iEst = Number(ingreso_estimado || 0).toLocaleString('es-BO', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

  if (accion === 'no_vender') {
    return `Margen negativo (Bs ${mKg}/kg). Revisá costo o no vendas a este precio.`;
  }
  if (accion === 'esperar') {
    return `#${rank} en margen. Precio subiendo: esperando ~${horizonte}d el margen pasaría de Bs ${mKg} a ${mPron}/kg.`;
  }
  if (accion === 'vender_ahora') {
    return `#${rank} por ingreso (Bs ${iEst}). Precio estable/bajando → vendé ahora.`;
  }
  return '';
}
