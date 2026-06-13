import { test } from 'node:test';
import assert from 'node:assert/strict';
import { ejecutarScraping } from '../src/controllers/ventasMlController.js';

function mockRes() {
  return { statusCode: 200, body: null,
    status(c){this.statusCode=c;return this;}, json(d){this.body=d;return this;} };
}

test('ejecutarScraping: reenvía al ml_service y devuelve su respuesta', async () => {
  const originalFetch = global.fetch;
  process.env.ML_SERVICE_URL = 'http://ml:8001';
  process.env.ML_SERVICE_TOKEN = 'secreto';
  global.fetch = async (url, opts) => {
    assert.ok(url.endsWith('/scraping/run'));
    assert.equal(opts.headers.Authorization, 'Bearer secreto');
    return { ok: true, status: 200, json: async () => ({ filas_insertadas: 5 }) };
  };
  const req = { params: { negocioId: 'n1' }, body: {} };
  const res = mockRes();
  try {
    await ejecutarScraping(req, res);
    assert.equal(res.body.filas_insertadas, 5);
  } finally { global.fetch = originalFetch; }
});
