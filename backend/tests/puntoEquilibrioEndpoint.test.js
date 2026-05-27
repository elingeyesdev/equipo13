import { test } from 'node:test';
import assert from 'node:assert/strict';
import { getPuntoEquilibrio } from '../src/controllers/analisisController.js';
import { pool } from '../src/config/database.js';

test('Punto de Equilibrio: getPuntoEquilibrio returns calculated PE structured response', async () => {
  const originalQuery = pool.query;

  // Mock pool queries executed by calcularPuntoEquilibrio service
  pool.query = async (sql, params) => {
    if (sql.includes('FROM lotes')) {
      return {
        rows: [{
          id: '20',
          identificador: 'L-01',
          tipo_animal: 'Cerdo',
          cabezas_activas: 100,
          peso_actual_prom: 120,
          costo_adquisicion: 10000
        }]
      };
    }
    if (sql.includes('FROM bitacora_lote')) {
      // For both detailed bitacora query
      return {
        rows: [
          { tipo: 'Alimento', total: 5000 },
          { tipo: 'Mano de obra', total: 2000 }
        ]
      };
    }
    if (sql.includes('FROM gastos_cif')) {
      return { rows: [] };
    }
    if (sql.includes('FROM registro_mermas')) {
      return { rows: [] };
    }
    return { rows: [] };
  };

  const req = {
    params: { negocioId: '10', loteId: '20' }
  };

  let jsonResult = null;
  const res = {
    json: (data) => { jsonResult = data; }
  };

  try {
    await getPuntoEquilibrio(req, res);
    assert.equal(jsonResult.lote_id, '20');
    assert.equal(jsonResult.lote_identificador, 'L-01');
    assert.equal(jsonResult.desglose_costos.mpd, 15000); // 10000 adq + 5000 alimento
    assert.equal(jsonResult.desglose_costos.mod, 2000); // 2000 mano de obra
    assert.equal(jsonResult.pesos.bruto_total_kg, 12000); // 100 * 120
    assert.equal(jsonResult.pesos.neto_util_kg, 12000); // no mermas
    assert.equal(jsonResult.punto_equilibrio_bs_por_kg, 1.4167); // 17000 / 12000 = 1.41666...
  } finally {
    pool.query = originalQuery;
  }
});
