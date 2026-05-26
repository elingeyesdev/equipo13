import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { calcularConsumoFIFO } from '../src/services/inventarioFIFO.js';

describe('calcularConsumoFIFO', () => {
  it('CASO 1 — una sola capa', () => {
    const result = calcularConsumoFIFO({
      capasStock: [{
        id: 'A',
        cantidad_disponible: '100',
        precio_unitario: '10.00',
        fecha_compra: '2025-01-01',
      }],
      cantidadRequerida: 30,
    });

    assert.equal(result.costoTotal, 300);
    assert.equal(result.precioPromedio, 10);
    assert.equal(result.lineasFIFO.length, 1);
    assert.equal(result.actualizaciones[0].nueva_cantidad_disponible, 70);
  });

  it('CASO 2 — dos capas, precio diferente', () => {
    const result = calcularConsumoFIFO({
      capasStock: [
        { id: 'A', cantidad_disponible: '20', precio_unitario: '10.00', fecha_compra: '2025-03-01' },
        { id: 'B', cantidad_disponible: '50', precio_unitario: '15.00', fecha_compra: '2025-04-01' },
      ],
      cantidadRequerida: 30,
    });

    assert.equal(result.costoTotal, 350);
    assert.equal(result.precioPromedio, 11.6667);
    assert.equal(result.lineasFIFO[0].cantidad, 20);
    assert.equal(result.lineasFIFO[1].cantidad, 10);
    assert.equal(
      result.actualizaciones.find((a) => a.compra_id === 'A').nueva_cantidad_disponible,
      0
    );
    assert.equal(
      result.actualizaciones.find((a) => a.compra_id === 'B').nueva_cantidad_disponible,
      40
    );
  });

  it('CASO 3 — stock insuficiente', () => {
    assert.throws(
      () => calcularConsumoFIFO({
        capasStock: [{
          id: 'A',
          cantidad_disponible: '20',
          precio_unitario: '10.00',
          fecha_compra: '2025-01-01',
        }],
        cantidadRequerida: 50,
      }),
      (err) => err.message.includes('insuficiente')
    );
  });

  it('CASO 4 — redondeo correcto (caso flotante)', () => {
    const result = calcularConsumoFIFO({
      capasStock: [{
        id: 'A',
        cantidad_disponible: '10',
        precio_unitario: '0.1',
        fecha_compra: '2025-01-01',
      }],
      cantidadRequerida: 3,
    });

    assert.equal(result.costoTotal, 0.3);
    assert.notEqual(result.costoTotal, 0.30000000000000004);
  });
});
