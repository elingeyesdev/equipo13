import { test } from 'node:test';
import assert from 'node:assert/strict';
import { requireMembership, requireLoteAsignado } from '../src/middleware/membership.js';
import { pool } from '../src/config/database.js';

function mockRes() {
  return {
    statusCode: 200,
    body: null,
    status(c) { this.statusCode = c; return this; },
    json(d) { this.body = d; return this; },
  };
}

test('requireMembership: 403 si no hay membresía', async () => {
  const original = pool.query;
  pool.query = async () => ({ rows: [] });
  const req = { params: { negocioId: 'n1' }, user: { id: 'u1' } };
  const res = mockRes();
  let called = false;
  try {
    await requireMembership()(req, res, () => { called = true; });
    assert.equal(res.statusCode, 403);
    assert.equal(called, false);
  } finally { pool.query = original; }
});

test('requireMembership: deja pasar y setea req.membresia', async () => {
  const original = pool.query;
  pool.query = async () => ({ rows: [{ rol: 'operario', nombre: 'Granja' }] });
  const req = { params: { negocioId: 'n1' }, user: { id: 'u1' } };
  const res = mockRes();
  let called = false;
  try {
    await requireMembership()(req, res, () => { called = true; });
    assert.equal(called, true);
    assert.equal(req.membresia.rol, 'operario');
  } finally { pool.query = original; }
});

test('requireMembership("admin"): 403 si el rol es operario', async () => {
  const original = pool.query;
  pool.query = async () => ({ rows: [{ rol: 'operario', nombre: 'Granja' }] });
  const req = { params: { negocioId: 'n1' }, user: { id: 'u1' } };
  const res = mockRes();
  try {
    await requireMembership('admin')(req, res, () => {});
    assert.equal(res.statusCode, 403);
  } finally { pool.query = original; }
});

test('requireLoteAsignado: 403 si el lote no está asignado', async () => {
  const original = pool.query;
  pool.query = async () => ({ rows: [] });
  const req = { params: { loteId: 'l1' }, user: { id: 'u1' } };
  const res = mockRes();
  try {
    await requireLoteAsignado(req, res, () => {});
    assert.equal(res.statusCode, 403);
  } finally { pool.query = original; }
});
