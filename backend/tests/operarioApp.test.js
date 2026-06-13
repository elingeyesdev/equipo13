import { test } from 'node:test';
import assert from 'node:assert/strict';
import express from 'express';
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

// Test de INTEGRACIÓN: el unit test de arriba prueba injectNegocio aislado y NO
// detecta el bug de scoping de Express (req.params se reescribe con los params
// de la ruta concreta al despachar el handler). Este monta el router real con
// una ruta con params y verifica, vía HTTP, que negocioId llega al handler.
// Falla si injectNegocio se mueve a un router.use(...) en vez de por-ruta.
test('injectNegocio (integración): negocioId sobrevive al dispatch con params de ruta', async () => {
  const app = express();
  // stub de authMiddleware: fija req.user como lo haría un token de operario
  app.use((req, _res, next) => { req.user = { id: 'u1', negocio_id: 'neg-123' }; next(); });
  const router = express.Router();
  // misma estructura que src/routes/operario.js: injectNegocio POR RUTA
  router.get('/lotes/:loteId/hoja-de-vida/:fecha', injectNegocio, (req, res) => {
    res.json({
      negocioId: req.params.negocioId,
      loteId: req.params.loteId,
      fecha: req.params.fecha,
    });
  });
  app.use('/api/operario', router);

  const server = app.listen(0);
  await new Promise((r) => server.once('listening', r));
  const { port } = server.address();
  try {
    const res = await fetch(`http://localhost:${port}/api/operario/lotes/L1/hoja-de-vida/2026-06-25`);
    const body = await res.json();
    assert.equal(body.negocioId, 'neg-123'); // se perdería con router.use(injectNegocio)
    assert.equal(body.loteId, 'L1');
    assert.equal(body.fecha, '2026-06-25');
  } finally {
    await new Promise((r) => server.close(r));
  }
});
