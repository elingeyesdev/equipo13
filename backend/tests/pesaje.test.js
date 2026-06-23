import { test } from 'node:test';
import assert from 'node:assert/strict';
import { registrarPesajeDueno } from '../src/controllers/pesajeController.js';
import { pool } from '../src/config/database.js';

function mockRes(){return{statusCode:200,body:null,status(c){this.statusCode=c;return this;},json(d){this.body=d;return this;}};}

test('registrarPesajeDueno: rechaza peso <= 0', async () => {
  const req = { params: { negocioId: 'n1', loteId: 'l1' }, user: { id: 'u1' }, body: { peso_prom_kg: 0 } };
  const res = mockRes();
  await registrarPesajeDueno(req, res);
  assert.equal(res.statusCode, 400);
});

test('registrarPesajeDueno: inserta pesaje (origen dueno) y actualiza peso_actual_prom', async () => {
  const original = pool.connect;
  const qs = [];
  pool.connect = async () => ({ query: async (sql) => {
    qs.push(sql);
    if (/SELECT id FROM lotes/.test(sql)) return { rows: [{ id: 'l1' }] };
    if (/INSERT INTO pesajes_lote/.test(sql)) return { rows: [{ id: 'p1' }] };
    return { rows: [{}] };
  }, release(){} });
  const req = { params: { negocioId: 'n1', loteId: 'l1' }, user: { id: 'u1' },
    body: { fecha: '2026-06-23', peso_prom_kg: 42.5, n_cabezas_muestra: 10, notas: 'muestra' } };
  const res = mockRes();
  try {
    await registrarPesajeDueno(req, res);
    assert.equal(res.statusCode, 201);
    assert.ok(qs.some(q => /INSERT INTO pesajes_lote/.test(q) && /ON CONFLICT/.test(q) && /DO UPDATE/.test(q)));
    assert.ok(qs.some(q => /UPDATE lotes/.test(q) && /peso_actual_prom/.test(q)));
  } finally { pool.connect = original; }
});
