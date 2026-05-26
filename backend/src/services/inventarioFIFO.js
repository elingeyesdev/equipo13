/**
 * Redondea a 4 decimales para coincidir con DECIMAL(18,4) de PostgreSQL.
 * Evita el problema de flotantes de JS (ej: 0.1 + 0.2 = 0.30000000000000004)
 */
const r4 = n => Math.round(n * 10000) / 10000;

/**
 * Calcula un consumo FIFO.
 * NO toca la base de datos — eso lo hace el llamador en una transacción.
 *
 * @param {Object} params
 * @param {Array}  params.capasStock       - Capas ordenadas por fecha_compra ASC, created_at ASC
 *   Cada capa: { id, cantidad_disponible, precio_unitario, fecha_compra }
 * @param {number} params.cantidadRequerida - Cantidad a consumir
 * @returns {{ lineasFIFO, actualizaciones, costoTotal, precioPromedio }}
 * @throws {Error} si el stock es insuficiente
 */
export function calcularConsumoFIFO({ capasStock, cantidadRequerida }) {
  const stockTotal = capasStock.reduce(
    (s, c) => r4(s + parseFloat(c.cantidad_disponible)), 0
  );

  if (stockTotal < cantidadRequerida) {
    throw new Error(
      `Stock insuficiente. Requerido: ${cantidadRequerida}, disponible: ${stockTotal}`
    );
  }

  const lineasFIFO = [];
  const actualizaciones = [];
  let pendiente = cantidadRequerida;

  for (const capa of capasStock) {
    if (pendiente <= 0) break;

    const disponible = parseFloat(capa.cantidad_disponible);
    const precio     = parseFloat(capa.precio_unitario);
    const consumido  = Math.min(pendiente, disponible);
    const subtotal   = r4(consumido * precio);

    lineasFIFO.push({
      compra_id:       capa.id,
      fecha_compra:    capa.fecha_compra,
      cantidad:        r4(consumido),
      precio_unitario: precio,
      subtotal,
    });

    actualizaciones.push({
      compra_id:                 capa.id,
      nueva_cantidad_disponible: r4(disponible - consumido),
    });

    pendiente = r4(pendiente - consumido);
  }

  const costoTotal     = r4(lineasFIFO.reduce((s, l) => s + l.subtotal, 0));
  const precioPromedio = r4(costoTotal / cantidadRequerida);

  return { lineasFIFO, actualizaciones, costoTotal, precioPromedio };
}
