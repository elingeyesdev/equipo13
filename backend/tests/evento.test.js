import { test } from 'node:test';
import assert from 'node:assert/strict';
import { crearEvento, aprobarBaja } from '../src/controllers/eventoController.js';
import { pool } from '../src/config/database.js';

function mockRes(){return{statusCode:200,body:null,status(c){this.statusCode=c;return this;},json(d){this.body=d;return this;}};}

test('crearEvento baja → estado pendiente, no toca el lote', async () => {
  const original = pool.connect;
  const qs = [];
  pool.connect = async () => ({ query: async (sql) => { qs.push(sql); return { rows: [{ id: 'e1', estado: 'pendiente' }] }; }, release(){} });
  const req = { params: { loteId: 'l1' }, user: { id: 'u1', negocio_id: 'n1' },
    body: { tipo: 'baja', payload: { cabezas: 2, causa: 'enfermedad' }, fotos: [] } };
  const res = mockRes();
  try {
    await crearEvento(req, res);
    assert.equal(res.body.estado, 'pendiente');
    assert.ok(!qs.some(q => /UPDATE lotes/.test(q)));
  } finally { pool.connect = original; }
});

test('aprobarBaja descuenta cabezas y registra bitácora', async () => {
  const original = pool.connect;
  const qs = [];
  pool.connect = async () => ({ query: async (sql) => {
    qs.push(sql);
    if (/FROM eventos_operario/.test(sql)) return { rows: [{ id: 'e1', lote_id: 'l1', estado: 'pendiente', payload: { cabezas: 2, causa: 'x' } }] };
    return { rows: [{}] };
  }, release(){} });
  const req = { params: { negocioId: 'n1', eventoId: 'e1' }, user: { id: 'admin1' }, body: {} };
  const res = mockRes();
  try {
    await aprobarBaja(req, res);
    assert.ok(qs.some(q => /UPDATE lotes/.test(q) && /cabezas_activas/.test(q)));
    assert.ok(qs.some(q => /INSERT INTO bitacora_lote/.test(q)));
  } finally { pool.connect = original; }
});
