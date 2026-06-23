// Lógica pura del pesaje programado. Sin dependencias de DB.

// Normaliza una fecha (Date o string ISO/'YYYY-MM-DD') a 'YYYY-MM-DD'.
function toYMD(d) {
  if (!d) return null;
  if (d instanceof Date) return d.toISOString().split('T')[0];
  return String(d).split('T')[0];
}

// Suma días a una fecha 'YYYY-MM-DD' y devuelve 'YYYY-MM-DD' (UTC, sin desfase).
function addDays(fechaStr, dias) {
  const [y, m, d] = fechaStr.split('-').map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d));
  dt.setUTCDate(dt.getUTCDate() + dias);
  return dt.toISOString().split('T')[0];
}

// Diferencia en días entre dos fechas 'YYYY-MM-DD' (b - a).
function diffDays(aStr, bStr) {
  const [ay, am, ad] = aStr.split('-').map(Number);
  const [by, bm, bd] = bStr.split('-').map(Number);
  const a = Date.UTC(ay, am - 1, ad);
  const b = Date.UTC(by, bm - 1, bd);
  return Math.round((b - a) / 86400000);
}

/**
 * Calcula el estado del recordatorio de pesaje de un lote.
 * @param {object} p.lote - { fecha_entrada, pesaje_intervalo_dias, pesaje_activo }
 * @param {string|null} p.ultimoPesajeFecha - 'YYYY-MM-DD' del último pesaje, o null.
 * @param {number} p.intervaloNegocio - default del negocio en días.
 * @param {string} p.hoy - 'YYYY-MM-DD'.
 */
export function calcularEstadoPesaje({ lote, ultimoPesajeFecha, intervaloNegocio, hoy }) {
  if (lote.pesaje_activo === false) {
    return { activo: false, vencido: false, dias_atraso: 0 };
  }
  const intervaloEfectivo = lote.pesaje_intervalo_dias ?? intervaloNegocio;
  const hoyStr = toYMD(hoy);
  const baseStr = toYMD(ultimoPesajeFecha) ?? toYMD(lote.fecha_entrada) ?? hoyStr;
  const proximo = addDays(baseStr, intervaloEfectivo);
  const atraso = Math.max(0, diffDays(proximo, hoyStr));
  return {
    activo: true,
    intervalo_efectivo: intervaloEfectivo,
    ultimo_pesaje_fecha: toYMD(ultimoPesajeFecha),
    proximo_pesaje_fecha: proximo,
    dias_atraso: atraso,
    vencido: atraso > 0,
  };
}

const SUGERIDOS = { cerdo: 14, bovino: 30, pollo: 7, ave: 7, gallina: 7 };

/** Intervalo sugerido por especie en días, o null si no hay sugerencia (hereda negocio). */
export function intervaloSugeridoPorEspecie(tipoAnimal) {
  if (!tipoAnimal) return null;
  return SUGERIDOS[tipoAnimal.toLowerCase()] ?? null;
}
