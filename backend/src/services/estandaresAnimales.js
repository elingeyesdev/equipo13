// ─── ESTÁNDARES POR ESPECIE ──────────────────────────────────────────────────

const ESTANDARES = {
  cerdo: {
    fases: [
      {
        nombre: 'Iniciación',
        desde_dia: 0, hasta_dia: 63,
        peso_min_kg: 8, peso_max_kg: 25,
        alimentacion: [
          { descripcion: 'Balanceado iniciador', cantidad_por_cabeza_kg: 0.45, frecuencia: '3 veces al día' }
        ],
        agua_por_cabeza_litros: { min: 1, max: 2 },
        ica_referencia: { min: 1.5, max: 2.0 }
      },
      {
        nombre: 'Crecimiento',
        desde_dia: 64, hasta_dia: 119,
        peso_min_kg: 25, peso_max_kg: 50,
        alimentacion: [
          { descripcion: 'Balanceado crecimiento', cantidad_por_cabeza_kg: 1.5, frecuencia: '2 veces al día' }
        ],
        agua_por_cabeza_litros: { min: 2, max: 4 },
        ica_referencia: { min: 2.0, max: 2.5 }
      },
      {
        nombre: 'Desarrollo',
        desde_dia: 120, hasta_dia: 161,
        peso_min_kg: 50, peso_max_kg: 80,
        alimentacion: [
          { descripcion: 'Balanceado desarrollo', cantidad_por_cabeza_kg: 2.15, frecuencia: '2 veces al día' }
        ],
        agua_por_cabeza_litros: { min: 4, max: 6 },
        ica_referencia: { min: 2.5, max: 3.0 }
      },
      {
        nombre: 'Engorde/Finalización',
        desde_dia: 162, hasta_dia: 999,
        peso_min_kg: 80, peso_max_kg: 110,
        alimentacion: [
          { descripcion: 'Balanceado engorde', cantidad_por_cabeza_kg: 2.75, frecuencia: '2 veces al día' }
        ],
        agua_por_cabeza_litros: { min: 6, max: 8 },
        ica_referencia: { min: 2.5, max: 3.0 }
      }
    ],
    calendario_sanitario: [
      { dia_desde: 1,   dia_hasta: 7,   tipo: 'sanidad',  descripcion: 'Vitaminas A+D+E inyectable + electrolitos en agua (estrés de llegada)' },
      { dia_desde: 7,   dia_hasta: 7,   tipo: 'sanidad',  descripcion: 'Desparasitación interna – ivermectina o similar (primera dosis)' },
      { dia_desde: 14,  dia_hasta: 14,  tipo: 'sanidad',  descripcion: 'Vacuna Mycoplasma hyopneumoniae – dosis 1' },
      { dia_desde: 28,  dia_hasta: 28,  tipo: 'sanidad',  descripcion: 'Vacuna Mycoplasma hyopneumoniae – dosis 2 (refuerzo)' },
      { dia_desde: 45,  dia_hasta: 60,  tipo: 'sanidad',  descripcion: 'Vacuna Peste Porcina Clásica' },
      { dia_desde: 60,  dia_hasta: 60,  tipo: 'sanidad',  descripcion: 'Desparasitación externa – contra sarna y piojo (primera dosis)' },
      { dia_desde: 90,  dia_hasta: 90,  tipo: 'servicio', descripcion: 'Pesaje general del lote + ajuste de ración según respuesta' },
      { dia_desde: 120, dia_hasta: 120, tipo: 'sanidad',  descripcion: 'Desparasitación interna – segunda dosis' },
      { dia_desde: 120, dia_hasta: 120, tipo: 'sanidad',  descripcion: 'Desparasitación externa – segunda dosis' },
      { dia_desde: 150, dia_hasta: 150, tipo: 'servicio', descripcion: 'Pesaje + evaluación de conversión alimenticia' }
    ],
    servicios_periodicos: [
      { frecuencia: 'diario',    descripcion: 'Revisión visual del lote (comportamiento, apetito, signos de enfermedad)' },
      { frecuencia: 'cada3dias', descripcion: 'Limpieza de comederos y bebederos' },
      { frecuencia: 'semanal',   descripcion: 'Limpieza general del corral – remoción de estiércol' },
      { frecuencia: 'quincenal', descripcion: 'Desinfección del corral (cal o desinfectante)' },
      { frecuencia: 'mensual',   descripcion: 'Pesaje de muestra representativa del lote (mínimo 10%)' }
    ]
  },

  bovino: {
    fases: [
      {
        nombre: 'Recepción/Adaptación',
        desde_dia: 0, hasta_dia: 8,
        alimentacion: [
          { descripcion: 'Heno / fibra (paca)', cantidad_por_cabeza_kg: 4.5, frecuencia: 'Ad libitum (libre)' }
        ],
        ganancia_peso_kg_dia: { min: 0.5, max: 1.0 },
        ica_referencia: { min: 5.0, max: 7.0 }
      },
      {
        nombre: 'Transición',
        desde_dia: 9, hasta_dia: 16,
        alimentacion: [
          { descripcion: 'Heno / fibra', cantidad_por_cabeza_kg: 3.75, frecuencia: '2 veces al día' },
          { descripcion: 'Concentrado',  cantidad_por_cabeza_kg: 3.75, frecuencia: '2 veces al día' }
        ],
        ganancia_peso_kg_dia: { min: 1.0, max: 1.5 },
        ica_referencia: { min: 5.5, max: 7.0 }
      },
      {
        nombre: 'Crecimiento',
        desde_dia: 17, hasta_dia: 45,
        alimentacion: [
          { descripcion: 'Heno / fibra', cantidad_por_cabeza_kg: 2.75, frecuencia: '2 veces al día' },
          { descripcion: 'Concentrado',  cantidad_por_cabeza_kg: 6.25, frecuencia: '2 veces al día' }
        ],
        ganancia_peso_kg_dia: { min: 1.5, max: 1.8 },
        ica_referencia: { min: 6.0, max: 6.5 }
      },
      {
        nombre: 'Engorde/Finalización',
        desde_dia: 46, hasta_dia: 999,
        alimentacion: [
          { descripcion: 'Heno / fibra', cantidad_por_cabeza_kg: 1.65, frecuencia: '2 veces al día' },
          { descripcion: 'Concentrado',  cantidad_por_cabeza_kg: 9.35, frecuencia: '2 veces al día' }
        ],
        ganancia_peso_kg_dia: { min: 1.8, max: 2.2 },
        ica_referencia: { min: 6.0, max: 6.5 }
      }
    ],
    calendario_sanitario: [
      { dia_desde: 1,  dia_hasta: 1,  tipo: 'sanidad',  descripcion: 'Vitamina ADE inyectable + antiparasitario externo e interno (llegada)' },
      { dia_desde: 1,  dia_hasta: 1,  tipo: 'sanidad',  descripcion: 'Vacuna Triple Bovina (Carbunco, Edema, Septicemia) si no fue aplicada antes' },
      { dia_desde: 7,  dia_hasta: 7,  tipo: 'sanidad',  descripcion: 'Desparasitación interna – verificar si se hizo al llegar' },
      { dia_desde: 14, dia_hasta: 14, tipo: 'servicio', descripcion: 'Control general del lote + revisión de pezuñas' },
      { dia_desde: 30, dia_hasta: 30, tipo: 'servicio', descripcion: 'Pesaje + evaluación de ganancia de peso' },
      { dia_desde: 45, dia_hasta: 45, tipo: 'sanidad',  descripcion: 'Desparasitación interna – segunda dosis según protocolo' },
      { dia_desde: 60, dia_hasta: 60, tipo: 'servicio', descripcion: 'Pesaje + ajuste de ración según respuesta del lote' },
      { dia_desde: 90, dia_hasta: 90, tipo: 'servicio', descripcion: 'Pesaje final + evaluación para liquidación' }
    ],
    servicios_periodicos: [
      { frecuencia: 'diario',    descripcion: 'Verificar agua fresca disponible en bebederos' },
      { frecuencia: 'diario',    descripcion: 'Revisión visual del lote' },
      { frecuencia: 'cada2dias', descripcion: 'Limpieza de comederos' },
      { frecuencia: 'semanal',   descripcion: 'Limpieza general del corral o potrero' },
      { frecuencia: 'quincenal', descripcion: 'Revisión y tratamiento de pezuñas si necesario' },
      { frecuencia: 'mensual',   descripcion: 'Pesaje + control sanitario general' }
    ]
  }
};

/**
 * Devuelve el estándar esperado para un día específico de un lote.
 * @param {string} especie - 'cerdo' | 'bovino'
 * @param {number} edadActualDias - Edad del animal en días al momento de la consulta
 * @param {number} diasEnLote - Cuántos días lleva el animal en este lote
 * @returns {{ fase, alimentacion, agua, sanitario, servicios, ica_referencia }}
 */
export function getEstandarDia({ especie, edadActualDias, diasEnLote }) {
  const est = ESTANDARES[especie.toLowerCase()];
  if (!est) return null;

  // Para cerdos: la fase depende de la edad total del animal.
  // Para bovinos: la fase depende de cuántos días lleva en el lote.
  const diasParaFase = especie === 'cerdo' ? edadActualDias : diasEnLote;

  const fase = est.fases.find(f =>
    diasParaFase >= f.desde_dia && diasParaFase <= f.hasta_dia
  ) || est.fases[est.fases.length - 1];

  // Sanidad siempre por días en lote (día de llegada = día 1) para ambas especies.
  const sanitarioHoy = est.calendario_sanitario.filter(e =>
    diasEnLote >= e.dia_desde && diasEnLote <= e.dia_hasta
  );

  const serviciosHoy = est.servicios_periodicos.filter(s => {
    if (s.frecuencia === 'diario')    return true;
    if (s.frecuencia === 'cada2dias') return diasEnLote % 2 === 0;
    if (s.frecuencia === 'cada3dias') return diasEnLote % 3 === 0;
    if (s.frecuencia === 'semanal')   return diasEnLote % 7 === 0;
    if (s.frecuencia === 'quincenal') return diasEnLote % 15 === 0;
    if (s.frecuencia === 'mensual')   return diasEnLote % 30 === 0;
    return false;
  });

  return {
    fase: fase.nombre,
    alimentacion: fase.alimentacion,
    agua: fase.agua_por_cabeza_litros || null,
    ica_referencia: fase.ica_referencia || null,
    sanitario_hoy: sanitarioHoy,
    servicios_hoy: serviciosHoy
  };
}

/**
 * Devuelve el estándar para todo un mes (array de 30 días).
 */
export function getEstandarMes({ especie, edadInicioMes, diasEnLoteInicio, cabezas }) {
  const dias = [];
  for (let i = 0; i < 30; i++) {
    const std = getEstandarDia({
      especie,
      edadActualDias: edadInicioMes + i,
      diasEnLote: diasEnLoteInicio + i
    });
    const alimentacionLote = std?.alimentacion.map(a => ({
      ...a,
      cantidad_lote_kg: a.cantidad_por_cabeza_kg * cabezas
    }));
    dias.push({ dia_offset: i + 1, ...std, alimentacion_lote: alimentacionLote });
  }
  return dias;
}
