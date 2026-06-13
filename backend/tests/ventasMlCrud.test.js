import { test } from 'node:test';
import assert from 'node:assert/strict';
import { crearFuente, listarFuentes } from '../src/controllers/ventasMlController.js';
import { pool } from '../src/config/database.js';

function mockRes(){return{statusCode:200,body:null,status(c){this.statusCode=c;return this;},json(d){this.body=d;return this;}};}

test('crearFuente: 400 si faltan campos', async () => {
  const res = mockRes();
  await crearFuente({ params: { negocioId: 'n1' }, body: { nombre: 'X' } }, res);
  assert.equal(res.statusCode, 400);
});

test('listarFuentes: devuelve filas del negocio', async () => {
  const original = pool.query;
  pool.query = async () => ({ rows: [{ id: 'f1', nombre: 'IC Norte', tipo: 'static' }] });
  const res = mockRes();
  try { await listarFuentes({ params: { negocioId: 'n1' } }, res);
        assert.equal(res.body[0].nombre, 'IC Norte'); }
  finally { pool.query = original; }
});
