import test from 'node:test';
import assert from 'node:assert/strict';
import { pool } from '../src/config/database.js';
import { completarTarea, getChecklistDia } from '../src/controllers/tareaController.js';

test('completarTarea: actualiza estado a completada', async (t) => {
  const mockRows = [{ id: 't1', estado: 'completada' }];
  t.mock.method(pool, 'query', async () => ({ rows: mockRows }));

  const req = { params: { id: 't1' }, user: { id: 'u1' } };
  let jsonRes;
  const res = {
    json: (data) => { jsonRes = data; },
    status: () => res
  };

  await completarTarea(req, res);
  
  assert.equal(jsonRes.id, 't1');
  assert.equal(jsonRes.estado, 'completada');
  t.mock.restoreAll();
});

test('getChecklistDia: inserta filas y devuelve lista', async (t) => {
  const mockClient = {
    query: t.mock.fn(async (q) => {
      if (q.startsWith('SELECT')) return { rows: [{ id: 'c1', titulo: 'Alimentar' }] };
      return { rows: [] };
    }),
    release: t.mock.fn()
  };
  t.mock.method(pool, 'connect', async () => mockClient);

  const req = { params: { loteId: 'l1' }, query: { fecha: '2026-06-12' }, user: { id: 'u1' } };
  let jsonRes;
  const res = {
    json: (data) => { jsonRes = data; },
    status: () => res
  };

  await getChecklistDia(req, res);
  
  assert.equal(mockClient.query.mock.callCount(), 4); // BEGIN, INSERT, SELECT, COMMIT
  assert.equal(jsonRes[0].titulo, 'Alimentar');
  t.mock.restoreAll();
});
