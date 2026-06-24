import { test } from 'node:test';
import assert from 'node:assert/strict';
import { updateConfigPesaje } from '../src/controllers/hojaVidaController.js';
import { pool } from '../src/config/database.js';

function mockRes(){return{statusCode:200,body:null,status(c){this.statusCode=c;return this;},json(d){this.body=d;return this;}};}

test('updateConfigPesaje actualiza sin tocar columnas inexistentes (no updated_at)', async () => {
  const original = pool.query;
  let sql = '';
  pool.query = async (q) => { sql = q; return { rowCount: 1 }; };
  const req = { params: { negocioId: 'n1', loteId: 'l1' }, body: { pesaje_activo: false, pesaje_intervalo_dias: 20 } };
  const res = mockRes();
  try {
    await updateConfigPesaje(req, res);
    assert.match(sql, /UPDATE lotes/);
    assert.match(sql, /pesaje_activo/);
    assert.match(sql, /pesaje_intervalo_dias/);
    assert.ok(!/updated_at/.test(sql), 'no debe referenciar updated_at (la columna no existe en lotes)');
    assert.equal(res.statusCode, 200);
  } finally { pool.query = original; }
});

test('updateConfigPesaje devuelve 404 si el lote no existe', async () => {
  const original = pool.query;
  pool.query = async () => ({ rowCount: 0 });
  const req = { params: { negocioId: 'n1', loteId: 'lx' }, body: { pesaje_activo: true, pesaje_intervalo_dias: 14 } };
  const res = mockRes();
  try {
    await updateConfigPesaje(req, res);
    assert.equal(res.statusCode, 404);
  } finally { pool.query = original; }
});
