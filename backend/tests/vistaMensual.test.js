import { test } from 'node:test';
import assert from 'node:assert/strict';
import { getVistaMensual } from '../src/controllers/hojaVidaController.js';
import { pool } from '../src/config/database.js';

function mockRes(){return{statusCode:200,body:null,status(c){this.statusCode=c;return this;},json(d){this.body=d;return this;}};}

test('getVistaMensual: marca flags de actividad (alimento/sanidad/servicio/pesaje)', async () => {
  const original = pool.query;
  pool.query = async (sql) => {
    if (/FROM lotes/.test(sql)) return { rows: [{
      id: 'l1', identificador: 'L-1', tipo_animal: 'cerdo',
      fecha_entrada: new Date('2026-06-01T00:00:00Z'), edad_promedio_dias: 30,
    }] };
    if (/FROM registro_diario_lote/.test(sql)) return { rows: [{
      id: 'r1', fecha: new Date('2026-06-05T00:00:00Z'), confirmado: true, notas_del_dia: null, confirmado_en: null,
      items: [
        { tipo: 'insumo',   categoria_tipo: 'alimento' },
        { tipo: 'servicio', categoria_tipo: null },
      ],
    }] };
    if (/FROM pesajes_lote/.test(sql)) return { rows: [{ fecha: new Date('2026-06-05T00:00:00Z') }] };
    return { rows: [] };
  };
  const req = { params: { negocioId: 'n1', loteId: 'l1' }, query: { anio: '2026', mes: '6' } };
  const res = mockRes();
  try {
    await getVistaMensual(req, res);
    const dia5 = res.body.dias.find(d => d.dia_del_mes === 5);
    assert.equal(dia5.tiene_alimento, true);
    assert.equal(dia5.tiene_servicio, true);
    assert.equal(dia5.tiene_pesaje, true);
    assert.equal(dia5.tiene_sanidad, false);
  } finally { pool.query = original; }
});
