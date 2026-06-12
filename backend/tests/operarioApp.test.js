import { test } from 'node:test';
import assert from 'node:assert/strict';
import { misLotes } from '../src/controllers/operarioAppController.js';
import { injectNegocio } from '../src/middleware/injectNegocio.js';
import { pool } from '../src/config/database.js';

function mockRes() {
  return { statusCode: 200, body: null,
    status(c){this.statusCode=c;return this;}, json(d){this.body=d;return this;} };
}

test('injectNegocio: copia negocio_id del token a params', () => {
  const req = { user: { negocio_id: 'n1' }, params: {} };
  let called = false;
  injectNegocio(req, {}, () => { called = true; });
  assert.equal(req.params.negocioId, 'n1');
  assert.equal(called, true);
});

test('misLotes: devuelve solo lotes asignados al operario', async () => {
  const original = pool.query;
  pool.query = async (sql, params) => {
    assert.match(sql, /operario_lote/);
    assert.deepEqual(params, ['u1', 'n1']);
    return { rows: [{ id: 'l1', identificador: 'L-01', tipo_animal: 'Cerdo', cabezas_activas: 100, tiene_registro_hoy: false }] };
  };
  const req = { user: { id: 'u1', negocio_id: 'n1' }, params: { negocioId: 'n1' } };
  const res = mockRes();
  try {
    await misLotes(req, res);
    assert.equal(res.body.length, 1);
    assert.equal(res.body[0].identificador, 'L-01');
  } finally { pool.query = original; }
});
