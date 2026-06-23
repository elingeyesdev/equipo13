import { test } from 'node:test';
import assert from 'node:assert/strict';
import { getDetalleDia } from '../src/controllers/hojaVidaController.js';
import { pool } from '../src/config/database.js';

function mockRes(){return{statusCode:200,body:null,status(c){this.statusCode=c;return this;},json(d){this.body=d;return this;}};}

test('getDetalleDia incluye objeto pesaje con vencido y proximo_pesaje_fecha', async () => {
  const original = pool.query;
  pool.query = async (sql) => {
    if (/FROM lotes/.test(sql)) return { rows: [{
      id: 'l1', identificador: 'L-1', tipo_animal: 'cerdo',
      fecha_entrada: new Date('2026-06-01T00:00:00Z'),
      edad_promedio_dias: 60, pesaje_intervalo_dias: 10, pesaje_activo: true,
    }] };
    if (/MAX\(fecha\)/.test(sql)) return { rows: [{ ultimo: null }] };
    if (/pesaje_intervalo_dias FROM negocios/.test(sql)) return { rows: [{ pesaje_intervalo_dias: 14 }] };
    if (/FROM registro_diario_lote/.test(sql)) return { rows: [] };
    return { rows: [] };
  };
  const req = { params: { negocioId: 'n1', loteId: 'l1', fecha: '2026-06-20' } };
  const res = mockRes();
  try {
    await getDetalleDia(req, res);
    assert.ok(res.body.pesaje);
    assert.equal(res.body.pesaje.vencido, true);      // entrada 06-01 + 10d = 06-11 < 06-20
    assert.equal(res.body.pesaje.proximo_pesaje_fecha, '2026-06-11');
  } finally { pool.query = original; }
});
