import { test } from 'node:test';
import assert from 'node:assert/strict';
import { updateLote, createLote } from '../src/controllers/loteController.js';
import { pool } from '../src/config/database.js';

function mockRes(){return{statusCode:200,body:null,status(c){this.statusCode=c;return this;},json(d){this.body=d;return this;}};}

test('updateLote acepta pesaje_intervalo_dias y pesaje_activo', async () => {
  const original = pool.query;
  let sql = '';
  pool.query = async (q) => { sql = q; return { rows: [{ id: 'l1' }] }; };
  const req = { params: { negocioId: 'n1', id: 'l1' }, body: { pesaje_intervalo_dias: 30, pesaje_activo: false } };
  const res = mockRes();
  try {
    await updateLote(req, res);
    assert.match(sql, /pesaje_intervalo_dias/);
    assert.match(sql, /pesaje_activo/);
  } finally { pool.query = original; }
});

test('createLote sin override usa el sugerido por especie (cerdo → 14)', async () => {
  const original = pool.query;
  let params = [];
  pool.query = async (_q, p) => { params = p; return { rows: [{ id: 'l1' }] }; };
  const req = { params: { negocioId: 'n1' }, body: { identificador: 'L-1', tipo_animal: 'cerdo' } };
  const res = mockRes();
  try {
    await createLote(req, res);
    assert.ok(params.includes(14)); // el intervalo sugerido para cerdo entró como parámetro
  } finally { pool.query = original; }
});
