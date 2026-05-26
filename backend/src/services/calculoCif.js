// Servicio puro de prorrateo de Costos Indirectos de Fabricación (CIF).
//
// Distribuye los gastos mensuales fijos/variables del negocio (luz, agua, gas,
// alquiler, depreciación, etc.) entre los lotes de producción según el método
// elegido por el usuario para cada gasto:
//   - 'kilos'          → proporcional a los kilos procesados por el lote.
//   - 'horas'          → proporcional a las horas de producción del lote.
//   - 'partes_iguales' → dividido en partes iguales entre los lotes activos.
//
// Es función pura: no toca la base de datos. El controller carga los datos y
// se los pasa por argumento. Esto simplifica los tests y el razonamiento.

const round4 = (n) => Math.round(n * 10000) / 10000;

/**
 * @param {object} args
 * @param {Array}  args.gastos                 - filas de gastos_cif del negocio
 * @param {number} args.loteKilos              - kilos procesados por el lote
 * @param {number} args.loteHoras              - horas de producción del lote
 * @param {number} args.totalKilosNegocio      - kilos totales procesados por todos los lotes activos
 * @param {number} args.totalHorasNegocio      - horas totales de producción del negocio
 * @param {number} args.lotesActivosNegocio    - cantidad de lotes activos (para partes_iguales)
 * @returns {{ cif_total_prorrateado: number, detalle: Array }}
 */
export function prorratearCIF({
  gastos = [],
  loteKilos = 0,
  loteHoras = 0,
  totalKilosNegocio = 0,
  totalHorasNegocio = 0,
  lotesActivosNegocio = 1,
}) {
  const detalle = [];
  let total = 0;

  for (const gasto of gastos) {
    if (gasto.activo === false) continue;

    const monto = Number(gasto.monto_mensual) || 0;
    let asignado = 0;
    let baseCalculo = '';

    switch (gasto.metodo_prorrateo) {
      case 'kilos': {
        if (totalKilosNegocio > 0) {
          asignado = monto * (loteKilos / totalKilosNegocio);
        }
        baseCalculo = `${loteKilos} kg / ${totalKilosNegocio} kg`;
        break;
      }
      case 'horas': {
        if (totalHorasNegocio > 0) {
          asignado = monto * (loteHoras / totalHorasNegocio);
        }
        baseCalculo = `${loteHoras} h / ${totalHorasNegocio} h`;
        break;
      }
      case 'partes_iguales': {
        if (lotesActivosNegocio > 0) {
          asignado = monto / lotesActivosNegocio;
        }
        baseCalculo = `1 / ${lotesActivosNegocio} lotes`;
        break;
      }
      default:
        throw new Error(`Método de prorrateo desconocido: ${gasto.metodo_prorrateo}`);
    }

    asignado = round4(asignado);
    detalle.push({
      concepto: gasto.concepto,
      categoria: gasto.categoria || null,
      monto: round4(monto),
      metodo: gasto.metodo_prorrateo,
      base_calculo: baseCalculo,
      asignado,
    });
    total += asignado;
  }

  return {
    cif_total_prorrateado: round4(total),
    detalle,
  };
}
