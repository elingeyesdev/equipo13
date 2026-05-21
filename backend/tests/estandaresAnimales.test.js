import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { getEstandarDia } from '../src/services/estandaresAnimales.js';

describe('getEstandarDia — cerdos', () => {
  it('cerdo 30 días → fase Iniciación, alimento iniciador 0.45 kg/cab', () => {
    const result = getEstandarDia({ especie: 'cerdo', edadActualDias: 30, diasEnLote: 2 });
    assert.equal(result.fase, 'Iniciación');
    assert.equal(result.alimentacion[0].cantidad_por_cabeza_kg, 0.45);
    assert.ok(result.alimentacion[0].descripcion.toLowerCase().includes('iniciador'));
  });

  it('cerdo 45 días → fase Iniciación', () => {
    const result = getEstandarDia({ especie: 'cerdo', edadActualDias: 45, diasEnLote: 17 });
    assert.equal(result.fase, 'Iniciación');
  });

  it('cerdo 63 días → último día de Iniciación', () => {
    const result = getEstandarDia({ especie: 'cerdo', edadActualDias: 63, diasEnLote: 35 });
    assert.equal(result.fase, 'Iniciación');
  });

  it('cerdo 100 días → fase Crecimiento', () => {
    const result = getEstandarDia({ especie: 'cerdo', edadActualDias: 100, diasEnLote: 72 });
    assert.equal(result.fase, 'Crecimiento');
  });

  it('cerdo 180 días → fase Engorde/Finalización', () => {
    const result = getEstandarDia({ especie: 'cerdo', edadActualDias: 180, diasEnLote: 152 });
    assert.equal(result.fase, 'Engorde/Finalización');
  });

  it('cerdo día 7 en lote (edadActual 35) → sanitarioHoy incluye Desparasitación interna', () => {
    const result = getEstandarDia({ especie: 'cerdo', edadActualDias: 35, diasEnLote: 7 });
    const tieneDesparasitacion = result.sanitario_hoy.some(e =>
      e.descripcion.toLowerCase().includes('desparasitación interna')
    );
    assert.ok(tieneDesparasitacion, 'Debe incluir desparasitación interna en día 7');
  });

  it('cerdo → devuelve agua y referencia ICA', () => {
    const result = getEstandarDia({ especie: 'cerdo', edadActualDias: 30, diasEnLote: 2 });
    assert.ok(result.agua !== null);
    assert.ok(result.ica_referencia !== null);
  });
});

describe('getEstandarDia — bovinos', () => {
  it('bovino día 5 en lote → fase Recepción/Adaptación', () => {
    const result = getEstandarDia({ especie: 'bovino', edadActualDias: 730, diasEnLote: 5 });
    assert.equal(result.fase, 'Recepción/Adaptación');
  });

  it('bovino día 50 en lote → fase Engorde/Finalización', () => {
    const result = getEstandarDia({ especie: 'bovino', edadActualDias: 780, diasEnLote: 50 });
    assert.equal(result.fase, 'Engorde/Finalización');
  });

  it('bovino día 9 → fase Transición', () => {
    const result = getEstandarDia({ especie: 'bovino', edadActualDias: 740, diasEnLote: 9 });
    assert.equal(result.fase, 'Transición');
  });

  it('bovino día 20 → fase Crecimiento', () => {
    const result = getEstandarDia({ especie: 'bovino', edadActualDias: 750, diasEnLote: 20 });
    assert.equal(result.fase, 'Crecimiento');
  });

  it('bovino → agua es null (no aplica para bovinos)', () => {
    const result = getEstandarDia({ especie: 'bovino', edadActualDias: 730, diasEnLote: 5 });
    assert.equal(result.agua, null);
  });
});

describe('getEstandarDia — especie inválida', () => {
  it('especie desconocida → null', () => {
    const result = getEstandarDia({ especie: 'pez', edadActualDias: 10, diasEnLote: 5 });
    assert.equal(result, null);
  });
});
