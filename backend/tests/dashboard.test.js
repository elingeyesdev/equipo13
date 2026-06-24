import { test } from 'node:test';
import assert from 'node:assert/strict';
import { pool } from '../src/config/database.js';
import { getDashboard, statusIca, colorParaLote } from '../src/controllers/dashboardController.js';

function mockRes() {
  return {
    statusCode: 200, body: null,
    status(c){this.statusCode=c;return this;},
    json(d){this.body=d;return this;},
  };
}

test('statusIca: clasifica según umbrales del proyecto', () => {
  assert.equal(statusIca(null), 'sin_dato');
  assert.equal(statusIca(2.5), 'bueno');
  assert.equal(statusIca(3.0), 'bueno');
  assert.equal(statusIca(3.1), 'aceptable');
  assert.equal(statusIca(3.5), 'aceptable');
  assert.equal(statusIca(3.6), 'malo');
});

test('colorParaLote: cicla la paleta', () => {
  const c0 = colorParaLote(0);
  const c6 = colorParaLote(6);
  assert.equal(c0, c6, 'el índice 6 debe reciclar el color 0');
});

test('getDashboard: KPIs reflejan suma de cabezas y % mortandad', async () => {
  const original = pool.query;
  // Stub que devuelve respuestas según la query que llega.
  pool.query = async (sql) => {
    if (sql.includes('FROM lotes') && sql.includes('SUM(l.cabezas_inicio)')) {
      return { rows: [{
        lotes_activos: 2,
        cabezas_inicio: 100,
        cabezas_activas: 95,
        costo_adquisicion_total: 12000,
        costo_bitacora_total: 3000,
      }] };
    }
    // El resto (pesos, costos, ICA, mortandad, último liquidado, actividad)
    // devuelve vacío en este test mínimo.
    return { rows: [] };
  };
  try {
    const req = { params: { negocioId: 'n1' }, query: {} };
    const res = mockRes();
    await getDashboard(req, res);
    assert.equal(res.statusCode, 200);
    assert.equal(res.body.kpis.lotes_activos, 2);
    assert.equal(res.body.kpis.cabezas_activas, 95);
    assert.equal(res.body.kpis.cabezas_inicio, 100);
    assert.equal(res.body.kpis.mortandad_pct, 5);
    assert.equal(res.body.kpis.costo_total, 15000);
    // 15000 / 95 ≈ 157.89
    assert.ok(Math.abs(res.body.kpis.costo_por_cabeza - 157.8947) < 0.01);
  } finally { pool.query = original; }
});
