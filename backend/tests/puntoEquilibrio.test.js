/**
 * Tests unitarios: Motor Dinámico del Punto de Equilibrio
 *
 * El servicio calcularPuntoEquilibrio() requiere una conexión a base de datos.
 * Para testear la lógica pura extraemos el cálculo en una función helper testeable
 * que sigue exactamente la misma fórmula del servicio.
 *
 * Casos cubiertos:
 *   1. Lote con cabezas y peso, sin mermas     → PE = costo_total / (cabezas × peso)
 *   2. Lote con mermas significativas          → PE > caso 1 (más caro por kg útil)
 *   3. peso_neto_util = 0                      → PE = null (sin división por cero)
 */

import { test } from 'node:test';
import assert from 'node:assert/strict';

// ── Lógica pura extraída del servicio (misma fórmula) ──────────
const r4 = n => Math.round(n * 10000) / 10000;

/**
 * Calcula el punto de equilibrio sin I/O (versión pura para tests).
 *
 * @param {{ costo_total: number, cabezas: number, peso_prom: number, merma_total_kg: number }} p
 * @returns {{ peso_bruto_total: number, peso_neto_util: number, punto_equilibrio_bs_por_kg: number|null }}
 */
function calcularPE({ costo_total, cabezas, peso_prom, merma_total_kg }) {
  const peso_bruto_total = r4(cabezas * peso_prom);
  const peso_neto_util   = r4(Math.max(0, peso_bruto_total - merma_total_kg));
  const punto_equilibrio_bs_por_kg = peso_neto_util > 0
    ? r4(costo_total / peso_neto_util)
    : null;
  return { peso_bruto_total, peso_neto_util, punto_equilibrio_bs_por_kg };
}

// ── CASO 1: Sin mermas ──────────────────────────────────────────
test('PE Caso 1: sin mermas → PE = costo_total / (cabezas × peso)', () => {
  const costo_total    = 50000;  // Bs
  const cabezas        = 100;
  const peso_prom      = 120;    // kg por animal
  const merma_total_kg = 0;

  const { peso_bruto_total, peso_neto_util, punto_equilibrio_bs_por_kg } = calcularPE({
    costo_total, cabezas, peso_prom, merma_total_kg,
  });

  // peso_bruto = 100 × 120 = 12 000 kg
  assert.equal(peso_bruto_total, 12000, 'Peso bruto debe ser 12 000 kg');

  // Sin mermas: neto = bruto
  assert.equal(peso_neto_util, 12000, 'Peso neto debe ser igual al bruto cuando no hay mermas');

  // PE = 50 000 / 12 000 = 4.1667 Bs/kg
  const peEsperado = r4(50000 / 12000);
  assert.equal(punto_equilibrio_bs_por_kg, peEsperado, 'PE debe ser costo_total / peso_bruto');
  assert.ok(punto_equilibrio_bs_por_kg > 0, 'PE debe ser positivo');
});

// ── CASO 2: Con mermas significativas ───────────────────────────
test('PE Caso 2: con mermas → PE mayor que sin mermas (kg útil reducido)', () => {
  const costo_total    = 50000;
  const cabezas        = 100;
  const peso_prom      = 120;
  const merma_total_kg = 2000;   // 2 000 kg de merma acumulada en 4 nodos

  const sinMermas = calcularPE({ costo_total, cabezas, peso_prom, merma_total_kg: 0 });
  const conMermas = calcularPE({ costo_total, cabezas, peso_prom, merma_total_kg });

  // Peso neto debe ser menor
  assert.equal(conMermas.peso_neto_util, r4(12000 - 2000), 'Peso neto debe descontar las mermas');
  assert.equal(conMermas.peso_neto_util, 10000);

  // PE mayor al tener menos kg útiles con el mismo costo
  assert.ok(
    conMermas.punto_equilibrio_bs_por_kg > sinMermas.punto_equilibrio_bs_por_kg,
    'PE con mermas debe ser mayor que PE sin mermas'
  );

  // PE = 50 000 / 10 000 = 5.0000
  assert.equal(conMermas.punto_equilibrio_bs_por_kg, 5.0, 'PE debe ser 5.0 Bs/kg con 10 000 kg netos');

  // Diferencia exacta: 5.0 - 4.1667 > 0
  const diferencia = r4(conMermas.punto_equilibrio_bs_por_kg - sinMermas.punto_equilibrio_bs_por_kg);
  assert.ok(diferencia > 0, `Diferencia de PE (${diferencia} Bs/kg) debe ser positiva`);
});

// ── CASO 3: Peso neto = 0 (sin división por cero) ───────────────
test('PE Caso 3: peso_neto_util = 0 → PE = null (no división por cero)', () => {
  // Las mermas son iguales o mayores al peso total → peso_neto = 0
  const costo_total    = 50000;
  const cabezas        = 100;
  const peso_prom      = 120;
  const merma_total_kg = 12000; // merma = 100% del peso bruto

  const { peso_bruto_total, peso_neto_util, punto_equilibrio_bs_por_kg } = calcularPE({
    costo_total, cabezas, peso_prom, merma_total_kg,
  });

  assert.equal(peso_bruto_total, 12000);
  assert.equal(peso_neto_util, 0, 'Peso neto debe ser 0 (clamped con Math.max)');
  assert.equal(punto_equilibrio_bs_por_kg, null, 'PE debe ser null cuando peso_neto_util = 0');
});

// ── CASO BONUS: mermas mayores que el peso (clamping a 0) ───────
test('PE Caso bonus: mermas > peso_bruto → peso_neto clampea a 0, PE = null', () => {
  const { peso_neto_util, punto_equilibrio_bs_por_kg } = calcularPE({
    costo_total: 1000,
    cabezas: 10,
    peso_prom: 50,
    merma_total_kg: 99999, // imposible, pero debe manejarse
  });

  assert.equal(peso_neto_util, 0, 'Nunca debe retornar peso negativo');
  assert.equal(punto_equilibrio_bs_por_kg, null);
});

// ── CASO: Precisión DECIMAL(18,4) ───────────────────────────────
test('PE: redondeo a 4 decimales consistente con convencion del proyecto', () => {
  // PE = 100 000 / 3 = 33333.3333...
  const { punto_equilibrio_bs_por_kg } = calcularPE({
    costo_total: 100000,
    cabezas: 1,
    peso_prom: 3,
    merma_total_kg: 0,
  });

  // Debe estar redondeado a 4 decimales
  const decimals = (String(punto_equilibrio_bs_por_kg).split('.')[1] || '').length;
  assert.ok(decimals <= 4, 'PE debe tener máximo 4 decimales');
  assert.equal(punto_equilibrio_bs_por_kg, 33333.3333);
});
