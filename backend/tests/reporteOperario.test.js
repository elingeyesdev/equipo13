import { test } from 'node:test';
import assert from 'node:assert/strict';
import { getReporteProductividad } from '../src/controllers/reporteOperarioController.js';
import { pool } from '../src/config/database.js';

test('getReporteProductividad - devuelve stats por operario', async () => {
  const originalQuery = pool.query;

  pool.query = async (sql, params) => {
    assert.equal(params[0], 'n1');
    return {
      rows: [
        {
          id: 'u1',
          nombre: 'Op1',
          total_tareas: 2,
          tareas_completadas: 1,
          total_checklist: 0,
          checklist_completados: 0,
          total_eventos: 3,
          eventos_baja: 2,
          eventos_incidente: 1
        }
      ]
    };
  };

  const req = {
    params: { negocioId: 'n1' }
  };

  let jsonResult = null;
  const res = {
    json: (data) => { jsonResult = data; },
    status: (code) => res
  };

  try {
    await getReporteProductividad(req, res);
    assert.equal(jsonResult.length, 1);
    const rep = jsonResult[0];
    assert.equal(rep.nombre, 'Op1');
    assert.equal(rep.total_tareas, 2);
    assert.equal(rep.eventos_baja, 2);
  } finally {
    pool.query = originalQuery;
  }
});
