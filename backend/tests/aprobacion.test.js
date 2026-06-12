import { test } from 'node:test';
import assert from 'node:assert/strict';
import { listarRegistrosPendientes } from '../src/controllers/aprobacionController.js';
import { pool } from '../src/config/database.js';

function mockRes() {
  return { statusCode: 200, body: null,
    status(c){this.statusCode=c;return this;}, json(d){this.body=d;return this;} };
}

test('listarRegistrosPendientes: registros sin confirmar del negocio', async () => {
  const original = pool.query;
  pool.query = async (sql, params) => {
    assert.match(sql, /confirmado = false/);
    assert.deepEqual(params, ['n1']);
    return { rows: [{ id: 'r1', lote_identificador: 'L-01', fecha: '2026-06-12', operario_nombre: 'Juan', items_count: 3 }] };
  };
  const req = { params: { negocioId: 'n1' } };
  const res = mockRes();
  try {
    await listarRegistrosPendientes(req, res);
    assert.equal(res.body.length, 1);
    assert.equal(res.body[0].lote_identificador, 'L-01');
  } finally { pool.query = original; }
});
