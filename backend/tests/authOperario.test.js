import { test } from 'node:test';
import assert from 'node:assert/strict';
import bcrypt from 'bcryptjs';
import { loginOperario } from '../src/controllers/authOperarioController.js';
import { pool } from '../src/config/database.js';

process.env.JWT_SECRET = process.env.JWT_SECRET || 'test-secret';

function mockRes() {
  return {
    statusCode: 200, body: null,
    status(c) { this.statusCode = c; return this; },
    json(d) { this.body = d; return this; },
  };
}

test('loginOperario: 400 si faltan campos', async () => {
  const res = mockRes();
  await loginOperario({ body: {} }, res);
  assert.equal(res.statusCode, 400);
});

test('loginOperario: éxito devuelve token y negocio', async () => {
  const original = pool.query;
  const pinHash = await bcrypt.hash('1234', 10);
  let updateCalled = false;
  pool.query = async (sql) => {
    if (sql.includes('FROM negocios')) return { rows: [{ id: 'n1', nombre: 'Granja', codigo: 'AB-1234' }] };
    if (sql.includes('FROM users')) return { rows: [{ id: 'u1', nombre: 'Juan', username: 'juan-abc', pin_hash: pinHash, bloqueado_hasta: null, pin_intentos_fallidos: 0 }] };
    if (sql.startsWith('UPDATE users')) { updateCalled = true; return { rows: [] }; }
    return { rows: [] };
  };
  const res = mockRes();
  try {
    await loginOperario({ body: { codigo_negocio: 'AB-1234', username: 'juan-abc', pin: '1234' } }, res);
    assert.equal(res.statusCode, 200);
    assert.ok(res.body.token);
    assert.equal(res.body.negocio.id, 'n1');
    assert.equal(updateCalled, true);
  } finally { pool.query = original; }
});

test('loginOperario: PIN incorrecto → 401', async () => {
  const original = pool.query;
  const pinHash = await bcrypt.hash('9999', 10);
  pool.query = async (sql) => {
    if (sql.includes('FROM negocios')) return { rows: [{ id: 'n1', nombre: 'Granja', codigo: 'AB-1234' }] };
    if (sql.includes('FROM users')) return { rows: [{ id: 'u1', pin_hash: pinHash, bloqueado_hasta: null, pin_intentos_fallidos: 0 }] };
    return { rows: [] };
  };
  const res = mockRes();
  try {
    await loginOperario({ body: { codigo_negocio: 'AB-1234', username: 'juan-abc', pin: '1234' } }, res);
    assert.equal(res.statusCode, 401);
  } finally { pool.query = original; }
});

test('loginOperario: cuenta bloqueada → 423', async () => {
  const original = pool.query;
  pool.query = async (sql) => {
    if (sql.includes('FROM negocios')) return { rows: [{ id: 'n1', nombre: 'Granja', codigo: 'AB-1234' }] };
    if (sql.includes('FROM users')) return { rows: [{ id: 'u1', pin_hash: 'x', bloqueado_hasta: new Date(Date.now() + 600000) }] };
    return { rows: [] };
  };
  const res = mockRes();
  try {
    await loginOperario({ body: { codigo_negocio: 'AB-1234', username: 'juan-abc', pin: '1234' } }, res);
    assert.equal(res.statusCode, 423);
  } finally { pool.query = original; }
});
