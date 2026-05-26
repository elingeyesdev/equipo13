/**
 * Motor de asignación de costos conjuntos usando el método "valor de ventas en el punto de separación"
 */

export function asignarCostosConjuntos({
  cortes, // Array de objetos { nombre, peso_kg }
  preciosMercado, // Objeto { 'NombreCorte': precio, ... }
  costoCanalFria, // Número (DECIMAL)
  costoOperativoDesposte // Número (DECIMAL)
}) {
  const costoTotalConjunto = Number(costoCanalFria) + Number(costoOperativoDesposte);

  let valorTotalVentas = 0;
  const cortesConValorMercado = cortes.map(corte => {
    const precio = preciosMercado[corte.nombre];
    if (precio === undefined || precio === null) {
      throw new Error(`Falta el precio de mercado para el corte: ${corte.nombre}`);
    }

    const valorMercado = Number(corte.peso_kg) * Number(precio);
    valorTotalVentas += valorMercado;

    return {
      ...corte,
      valor_mercado: valorMercado
    };
  });

  if (valorTotalVentas <= 0) {
    throw new Error('El valor total de ventas de los cortes debe ser mayor a 0');
  }

  const resultados = cortesConValorMercado.map(corte => {
    const proporcion = corte.valor_mercado / valorTotalVentas;
    const costoAsignado = costoTotalConjunto * proporcion;
    const costoKg = costoAsignado / Number(corte.peso_kg);

    return {
      nombre: corte.nombre,
      peso_kg: Number(corte.peso_kg),
      valor_mercado: Number(corte.valor_mercado.toFixed(4)),
      proporcion: Number(proporcion.toFixed(4)),
      costo_asignado: Number(costoAsignado.toFixed(4)),
      costo_kg: Number(costoKg.toFixed(4))
    };
  });

  return resultados;
}
