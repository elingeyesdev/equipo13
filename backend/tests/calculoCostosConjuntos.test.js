import { test } from 'node:test';
import assert from 'node:assert';
import { asignarCostosConjuntos } from '../src/services/calculoCostosConjuntos.js';

test('Asignar costos conjuntos: método valor de ventas', async (t) => {
  await t.test('debe calcular correctamente los costos derivados', () => {
    const cortes = [
      { nombre: 'Pernil', peso_kg: 20 },
      { nombre: 'Chuleta', peso_kg: 15 },
      { nombre: 'Tocino', peso_kg: 5 }
    ];
    const preciosMercado = {
      'Pernil': 50,
      'Chuleta': 40,
      'Tocino': 10
    };
    const costoCanalFria = 1000;
    const costoOperativoDesposte = 200;

    const resultados = asignarCostosConjuntos({
      cortes,
      preciosMercado,
      costoCanalFria,
      costoOperativoDesposte
    });

    // Valores mercado: Pernil (1000), Chuleta (600), Tocino (50) => Total = 1650
    // Costo conjunto: 1200
    // Proporciones: Pernil (1000/1650 = 0.6061), Chuleta (600/1650 = 0.3636), Tocino (50/1650 = 0.0303)
    // Costo asignado: Pernil (1200 * 0.6061 = 727.2727), Chuleta (1200 * 0.3636 = 436.3636), Tocino (1200 * 0.0303 = 36.3636)
    // Costo por kg: Pernil (727.2727 / 20 = 36.3636), Chuleta (436.3636 / 15 = 29.0909), Tocino (36.3636 / 5 = 7.2727)

    assert.strictEqual(resultados.length, 3);
    const pernil = resultados.find(r => r.nombre === 'Pernil');
    assert.strictEqual(pernil.valor_mercado, 1000);
    assert.strictEqual(pernil.proporcion, 0.6061);
    assert.strictEqual(pernil.costo_asignado, 727.2727);
    assert.strictEqual(pernil.costo_kg, 36.3636);

    const chuleta = resultados.find(r => r.nombre === 'Chuleta');
    assert.strictEqual(chuleta.costo_kg, 29.0909);
    
    const tocino = resultados.find(r => r.nombre === 'Tocino');
    assert.strictEqual(tocino.costo_kg, 7.2727);
  });

  await t.test('debe lanzar un error si falta un precio de mercado', () => {
    const cortes = [
      { nombre: 'Pernil', peso_kg: 20 },
      { nombre: 'CorteSinPrecio', peso_kg: 10 }
    ];
    const preciosMercado = {
      'Pernil': 50
    };

    assert.throws(
      () => asignarCostosConjuntos({
        cortes,
        preciosMercado,
        costoCanalFria: 1000,
        costoOperativoDesposte: 200
      }),
      {
        message: 'Falta el precio de mercado para el corte: CorteSinPrecio'
      }
    );
  });
});
