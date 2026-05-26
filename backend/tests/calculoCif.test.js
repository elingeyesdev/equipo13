import { test } from 'node:test';
import assert from 'node:assert/strict';
import { prorratearCIF } from '../src/services/calculoCif.js';

test('prorratea por kilos: 1000 × (500/2000) = 250', () => {
  const result = prorratearCIF({
    gastos: [
      { concepto: 'Electricidad', categoria: 'servicios', monto_mensual: 1000, metodo_prorrateo: 'kilos', activo: true },
    ],
    loteKilos: 500,
    totalKilosNegocio: 2000,
  });

  assert.equal(result.cif_total_prorrateado, 250);
  assert.equal(result.detalle.length, 1);
  assert.equal(result.detalle[0].asignado, 250);
  assert.equal(result.detalle[0].metodo, 'kilos');
});

test('prorratea por horas: 3000 × (40/200) = 600', () => {
  const result = prorratearCIF({
    gastos: [
      { concepto: 'Alquiler', categoria: 'alquiler', monto_mensual: 3000, metodo_prorrateo: 'horas', activo: true },
    ],
    loteHoras: 40,
    totalHorasNegocio: 200,
  });

  assert.equal(result.cif_total_prorrateado, 600);
  assert.equal(result.detalle[0].metodo, 'horas');
});

test('prorratea en partes iguales: 600 / 3 lotes = 200', () => {
  const result = prorratearCIF({
    gastos: [
      { concepto: 'Depreciación maquinaria', categoria: 'depreciacion', monto_mensual: 600, metodo_prorrateo: 'partes_iguales', activo: true },
    ],
    lotesActivosNegocio: 3,
  });

  assert.equal(result.cif_total_prorrateado, 200);
  assert.equal(result.detalle[0].metodo, 'partes_iguales');
});

test('suma múltiples gastos con métodos distintos', () => {
  const result = prorratearCIF({
    gastos: [
      { concepto: 'Luz',          categoria: 'servicios',    monto_mensual: 1000, metodo_prorrateo: 'kilos',          activo: true },
      { concepto: 'Alquiler',     categoria: 'alquiler',     monto_mensual: 3000, metodo_prorrateo: 'horas',          activo: true },
      { concepto: 'Depreciación', categoria: 'depreciacion', monto_mensual:  600, metodo_prorrateo: 'partes_iguales', activo: true },
    ],
    loteKilos: 500, totalKilosNegocio: 2000,
    loteHoras:  40, totalHorasNegocio: 200,
    lotesActivosNegocio: 3,
  });

  // 250 + 600 + 200 = 1050
  assert.equal(result.cif_total_prorrateado, 1050);
  assert.equal(result.detalle.length, 3);
});

test('ignora gastos inactivos', () => {
  const result = prorratearCIF({
    gastos: [
      { concepto: 'Activo',   monto_mensual: 1000, metodo_prorrateo: 'kilos', activo: true  },
      { concepto: 'Inactivo', monto_mensual: 5000, metodo_prorrateo: 'kilos', activo: false },
    ],
    loteKilos: 500,
    totalKilosNegocio: 2000,
  });

  assert.equal(result.cif_total_prorrateado, 250);
  assert.equal(result.detalle.length, 1);
  assert.equal(result.detalle[0].concepto, 'Activo');
});

test('evita división por cero cuando totalKilosNegocio es 0', () => {
  const result = prorratearCIF({
    gastos: [
      { concepto: 'Luz', monto_mensual: 1000, metodo_prorrateo: 'kilos', activo: true },
    ],
    loteKilos: 500,
    totalKilosNegocio: 0,
  });

  assert.equal(result.cif_total_prorrateado, 0);
  assert.equal(result.detalle[0].asignado, 0);
});

test('evita división por cero cuando totalHorasNegocio es 0', () => {
  const result = prorratearCIF({
    gastos: [
      { concepto: 'Alquiler', monto_mensual: 3000, metodo_prorrateo: 'horas', activo: true },
    ],
    loteHoras: 40,
    totalHorasNegocio: 0,
  });

  assert.equal(result.cif_total_prorrateado, 0);
});

test('redondea a 4 decimales (evita centavos fantasma)', () => {
  const result = prorratearCIF({
    gastos: [
      { concepto: 'Luz', monto_mensual: 100, metodo_prorrateo: 'kilos', activo: true },
    ],
    loteKilos: 1,
    totalKilosNegocio: 3,
  });

  // 100 × (1/3) = 33.3333… → 33.3333
  assert.equal(result.cif_total_prorrateado, 33.3333);
});

test('lanza error con metodo_prorrateo desconocido', () => {
  assert.throws(
    () => prorratearCIF({
      gastos: [
        { concepto: 'X', monto_mensual: 100, metodo_prorrateo: 'invalido', activo: true },
      ],
    }),
    /Método de prorrateo desconocido/,
  );
});

test('retorna 0 y detalle vacío cuando no hay gastos', () => {
  const result = prorratearCIF({ gastos: [] });
  assert.equal(result.cif_total_prorrateado, 0);
  assert.deepEqual(result.detalle, []);
});
