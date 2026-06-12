import { test } from 'node:test';
import assert from 'node:assert/strict';
import { crearOperario, listarOperarios, asignarLote } from '../src/controllers/operarioAdminController.js';
import { pool } from '../src/config/database.js';

function mockRes() {
  return {
    statusCode: 200, body: null,
    status(c) { this.statusCode = c; return this; },
    json(d) { this.body = d; return this; },
  };
}

test('listarOperarios: devuelve los operarios del negocio', async () => {
  const original = pool.query;
  pool.query = async () => ({ rows: [{ id: 'u1', nombre: 'Juan', username: 'juan-abc', activo: true }] });
  const res = mockRes();
  try {
    await listarOperarios({ params: { negocioId: 'n1' } }, res);
    assert.equal(res.body.length, 1);
    assert.equal(res.body[0].username, 'juan-abc');
  } finally { pool.query = original; }
});

test('crearOperario: 400 si falta nombre', async () => {
  const res = mockRes();
  await crearOperario({ params: { negocioId: 'n1' }, body: {} }, res);
  assert.equal(res.statusCode, 400);
});

test('crearOperario: crea user pin + membresía y devuelve credenciales temporales', async () => {
  const original = pool.connect;
  const queries = [];
  const fakeClient = {
    query: async (sql, params) => {
      queries.push(sql);
      if (sql.includes('INSERT INTO users')) return { rows: [{ id: 'u9', nombre: 'Ana', username: params[0] }] };
      return { rows: [] };
    },
    release() {},
  };
  pool.connect = async () => fakeClient;
  const res = mockRes();
  try {
    await crearOperario({ params: { negocioId: 'n1' }, body: { nombre: 'Ana' } }, res);
    assert.equal(res.statusCode, 201);
    assert.ok(res.body.username);
    assert.match(res.body.pin_temporal, /^\d{4}$/);
    assert.ok(queries.some(q => q.includes('INSERT INTO membresias')));
  } finally { pool.connect = original; }
});

test('asignarLote: inserta en operario_lote', async () => {
  const original = pool.query;
  let inserted = false;
  pool.query = async (sql) => {
    if (sql.includes('INSERT INTO operario_lote')) { inserted = true; return { rows: [{ id: 'a1' }] }; }
    return { rows: [{ id: 'l1', negocio_id: 'n1' }] };
  };
  const res = mockRes();
  try {
    await asignarLote({ params: { negocioId: 'n1', operarioId: 'u1' }, body: { lote_id: 'l1' } }, res);
    assert.equal(inserted, true);
  } finally { pool.query = original; }
});
