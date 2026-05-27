import { test } from 'node:test';
import assert from 'node:assert/strict';
import { getMermas, registrarPesaje, getResumenMermas } from '../src/controllers/mermaController.js';

// ── Mock del pool de base de datos ──────────────────────────────
import { pool } from '../src/config/database.js';

test('Mermas: getMermas retorna la lista de mermas del negocio', async () => {
  const mockRows = [
    { id: 1, negocio_id: 10, lote_id: 20, tipo: 'AYUNO', peso_inicial: 100, peso_final: 95, kg_merma: 5, porcentaje_merma: 5.0, activo: true },
    { id: 2, negocio_id: 10, lote_id: 20, tipo: 'FRIO', peso_inicial: 95, peso_final: 92, kg_merma: 3, porcentaje_merma: 3.15, activo: true }
  ];

  // Guardar original
  const originalQuery = pool.query;
  
  // Mockear query
  pool.query = async (sql, params) => {
    assert.match(sql, /SELECT/i);
    assert.deepEqual(params[0], '10');
    return { rows: mockRows };
  };

  const req = {
    params: { negocioId: '10' },
    query: {}
  };

  let jsonResult = null;
  const res = {
    json: (data) => { jsonResult = data; }
  };

  try {
    await getMermas(req, res);
    assert.deepEqual(jsonResult, mockRows, 'Debe retornar las filas de mermas mockeadas');
  } finally {
    // Restaurar original
    pool.query = originalQuery;
  }
});

test('Mermas: registrarPesaje valida datos correctamente', async () => {
  const req = {
    params: { negocioId: '10', loteId: '20' },
    body: { tipo: 'INVALIDO', peso_inicial: 100, peso_final: 90 }
  };

  let statusResult = null;
  let jsonResult = null;
  const res = {
    status: (code) => {
      statusResult = code;
      return {
        json: (data) => { jsonResult = data; }
      };
    }
  };

  await registrarPesaje(req, res);
  assert.equal(statusResult, 400);
  assert.match(jsonResult.error, /tipo es requerido/);
});

test('Mermas: getResumenMermas calcula mermas globales y por nodo', async () => {
  const mockLote = { identificador: 'L-01', tipo_animal: 'Cerdo' };
  const mockNodos = [
    { tipo: 'AYUNO', registros: 1, total_peso_inicial: 1000, total_peso_final: 950, total_kg_merma: 50, promedio_porcentaje_merma: 5.0 },
    { tipo: 'FRIO', registros: 1, total_peso_inicial: 950, total_peso_final: 920, total_kg_merma: 30, promedio_porcentaje_merma: 3.15 }
  ];

  const originalQuery = pool.query;

  pool.query = async (sql, params) => {
    if (sql.includes('lotes')) {
      return { rows: [mockLote] };
    }
    if (sql.includes('registro_mermas')) {
      return { rows: mockNodos };
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
    await getResumenMermas(req, res);
    assert.deepEqual(jsonResult.lote, mockLote);
    assert.equal(jsonResult.totales.total_peso_inicial, 1950, 'Peso inicial acumulado');
    assert.equal(jsonResult.totales.total_kg_merma, 80, 'Kg merma acumulado');
    assert.equal(jsonResult.totales.porcentaje_merma_global, 4.1026, 'Porcentaje global rounded');
  } finally {
    pool.query = originalQuery;
  }
});
