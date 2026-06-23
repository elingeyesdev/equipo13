import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { calcularEstadoPesaje, intervaloSugeridoPorEspecie } from '../src/services/pesajeProgramado.js';

describe('calcularEstadoPesaje', () => {
  const base = { fecha_entrada: '2026-06-01', pesaje_intervalo_dias: null, pesaje_activo: true };

  it('sin pesajes previos: cuenta desde fecha_entrada usando el intervalo del negocio', () => {
    const r = calcularEstadoPesaje({ lote: base, ultimoPesajeFecha: null, intervaloNegocio: 14, hoy: '2026-06-10' });
    assert.equal(r.activo, true);
    assert.equal(r.intervalo_efectivo, 14);
    assert.equal(r.proximo_pesaje_fecha, '2026-06-15');
    assert.equal(r.vencido, false);
    assert.equal(r.dias_atraso, 0);
  });

  it('con pesaje previo: cuenta desde el último pesaje', () => {
    const r = calcularEstadoPesaje({ lote: base, ultimoPesajeFecha: '2026-06-10', intervaloNegocio: 14, hoy: '2026-06-20' });
    assert.equal(r.proximo_pesaje_fecha, '2026-06-24');
    assert.equal(r.vencido, false);
  });

  it('vencido: hoy pasó la fecha del próximo pesaje', () => {
    const r = calcularEstadoPesaje({ lote: base, ultimoPesajeFecha: '2026-06-01', intervaloNegocio: 10, hoy: '2026-06-20' });
    assert.equal(r.proximo_pesaje_fecha, '2026-06-11');
    assert.equal(r.vencido, true);
    assert.equal(r.dias_atraso, 9);
  });

  it('override por lote tiene prioridad sobre el del negocio', () => {
    const lote = { ...base, pesaje_intervalo_dias: 30 };
    const r = calcularEstadoPesaje({ lote, ultimoPesajeFecha: null, intervaloNegocio: 14, hoy: '2026-06-10' });
    assert.equal(r.intervalo_efectivo, 30);
    assert.equal(r.proximo_pesaje_fecha, '2026-07-01');
  });

  it('pesaje_activo=false: devuelve { activo:false } sin recordatorio', () => {
    const lote = { ...base, pesaje_activo: false };
    const r = calcularEstadoPesaje({ lote, ultimoPesajeFecha: null, intervaloNegocio: 14, hoy: '2026-06-10' });
    assert.equal(r.activo, false);
    assert.equal(r.vencido, false);
  });
});

describe('intervaloSugeridoPorEspecie', () => {
  it('cerdo → 14', () => assert.equal(intervaloSugeridoPorEspecie('cerdo'), 14));
  it('bovino → 30', () => assert.equal(intervaloSugeridoPorEspecie('bovino'), 30));
  it('pollo/ave → 7', () => assert.equal(intervaloSugeridoPorEspecie('pollo'), 7));
  it('genérico/otro → null (hereda negocio)', () => assert.equal(intervaloSugeridoPorEspecie('alpaca'), null));
});
