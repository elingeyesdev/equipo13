export function calcularCosto({ bomItems, etapas, lotesCantidad }) {
  const detalleMPD = bomItems.map(item => ({
    insumo: item.nombre,
    cantidad: parseFloat(item.cantidad),
    unidad: item.simbolo_unidad,
    precio: parseFloat(item.precio_unitario),
    subtotal: parseFloat(item.cantidad) * parseFloat(item.precio_unitario),
  }));
  const mpd_unitario = detalleMPD.reduce((sum, x) => sum + x.subtotal, 0);

  const detalleMOD = etapas.map(etapa => ({
    etapa: etapa.nombre,
    minutos: parseFloat(etapa.tiempo_minutos),
    costo_hora: parseFloat(etapa.costo_hora),
    subtotal: (parseFloat(etapa.tiempo_minutos) / 60) * parseFloat(etapa.costo_hora),
  }));
  const mod_unitario = detalleMOD.reduce((sum, x) => sum + x.subtotal, 0);

  const costo_unitario_total = mpd_unitario + mod_unitario;
  const mpd_lote = mpd_unitario * lotesCantidad;
  const mod_lote = mod_unitario * lotesCantidad;
  const costo_lote_total = costo_unitario_total * lotesCantidad;

  return {
    lote_cantidad: lotesCantidad,
    mpd: { unitario: mpd_unitario, lote: mpd_lote, detalle: detalleMPD },
    mod: { unitario: mod_unitario, lote: mod_lote, detalle: detalleMOD },
    costo_unitario_total,
    costo_lote_total,
  };
}
