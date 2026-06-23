import { test } from 'node:test';
import assert from 'node:assert/strict';
import { getDetalleDia } from '../src/controllers/hojaVidaController.js';
import { pool } from '../src/config/database.js';

function mockRes(){return{statusCode:200,body:null,status(c){this.statusCode=c;return this;},json(d){this.body=d;return this;}};}

test('getDetalleDia incluye objeto pesaje con vencido y proximo_pesaje_fecha', async () => {
  const original = pool.query;
  pool.query = async (sql) => {
    if (/FROM lotes/.test(sql)) return { rows: [{
      id: 'l1', identificador: 'L-1', tipo_animal: 'cerdo',
      fecha_entrada: new Date('2026-06-01T00:00:00Z'),
      edad_promedio_dias: 60, pesaje_intervalo_dias: 10, pesaje_activo: true,
    }] };
    if (/FROM pesajes_lote/.test(sql)) return { rows: [] }; // sin pesajes previos
    if (/pesaje_intervalo_dias FROM negocios/.test(sql)) return { rows: [{ pesaje_intervalo_dias: 14 }] };
    if (/FROM registro_diario_lote/.test(sql)) return { rows: [] };
    return { rows: [] };
  };
  const req = { params: { negocioId: 'n1', loteId: 'l1', fecha: '2026-06-20' } };
  const res = mockRes();
  try {
    await getDetalleDia(req, res);
    assert.ok(res.body.pesaje);
    assert.equal(res.body.pesaje.vencido, true);      // entrada 06-01 + 10d = 06-11 < 06-20
    assert.equal(res.body.pesaje.proximo_pesaje_fecha, '2026-06-11');
    assert.equal(res.body.pesaje.ultimo_peso_kg, null); // sin pesajes previos
  } finally { pool.query = original; }
});

test('getDetalleDia: con pesaje previo expone ultimo_peso_kg y cuenta desde ese pesaje', async () => {
  const original = pool.query;
  pool.query = async (sql) => {
    if (/FROM lotes/.test(sql)) return { rows: [{
      id: 'l1', identificador: 'L-1', tipo_animal: 'cerdo',
      fecha_entrada: new Date('2026-06-01T00:00:00Z'),
      edad_promedio_dias: 60, pesaje_intervalo_dias: 10, pesaje_activo: true,
    }] };
    if (/FROM pesajes_lote/.test(sql)) return { rows: [{ fecha: new Date('2026-06-15T00:00:00Z'), peso_prom_kg: '42.50' }] };
    if (/pesaje_intervalo_dias FROM negocios/.test(sql)) return { rows: [{ pesaje_intervalo_dias: 14 }] };
    if (/FROM registro_diario_lote/.test(sql)) return { rows: [] };
    return { rows: [] };
  };
  const req = { params: { negocioId: 'n1', loteId: 'l1', fecha: '2026-06-20' } };
  const res = mockRes();
  try {
    await getDetalleDia(req, res);
    assert.equal(res.body.pesaje.ultimo_peso_kg, 42.5);
    assert.equal(res.body.pesaje.proximo_pesaje_fecha, '2026-06-25'); // 06-15 + 10d
    assert.equal(res.body.pesaje.vencido, false);                     // hoy 06-20 < 06-25
  } finally { pool.query = original; }
});

test('getDetalleDia: expone pesaje_del_dia cuando hay pesaje en la fecha vista', async () => {
  const original = pool.query;
  pool.query = async (sql) => {
    if (/FROM lotes/.test(sql)) return { rows: [{
      id: 'l1', identificador: 'L-1', tipo_animal: 'cerdo',
      fecha_entrada: new Date('2026-06-01T00:00:00Z'),
      edad_promedio_dias: 60, pesaje_intervalo_dias: 10, pesaje_activo: true,
    }] };
    // último pesaje (para el estado del recordatorio)
    if (/ORDER BY fecha DESC/.test(sql)) return { rows: [{ fecha: new Date('2026-06-09T00:00:00Z'), peso_prom_kg: '20.00' }] };
    // pesaje EXACTO de la fecha vista
    if (/fecha = \$2/.test(sql)) return { rows: [{ id: 'pz1', peso_prom_kg: '20.00', n_cabezas_muestra: 10, notas: null, origen: 'dueno' }] };
    if (/pesaje_intervalo_dias FROM negocios/.test(sql)) return { rows: [{ pesaje_intervalo_dias: 14 }] };
    if (/FROM registro_diario_lote/.test(sql)) return { rows: [] };
    return { rows: [] };
  };
  const req = { params: { negocioId: 'n1', loteId: 'l1', fecha: '2026-06-09' } };
  const res = mockRes();
  try {
    await getDetalleDia(req, res);
    assert.ok(res.body.pesaje_del_dia, 'debe incluir pesaje_del_dia');
    assert.equal(Number(res.body.pesaje_del_dia.peso_prom_kg), 20);
  } finally { pool.query = original; }
});
