# Dashboard Agro Redesign — Implementation Plan

> **For agentic workers:** Implement task-by-task in order. Steps use checkbox (`- [ ]`) syntax for tracking. Each task ends with a commit so progress is incremental and recoverable. Do NOT batch multiple tasks before committing.

**Goal:** Reemplazar el `DashboardAgro` actual por un tablero con 4 KPIs, 4 gráficos (evolución de peso, composición de costos, ICA por lote, mortandad acumulada) y una tabla con sparkline, todo alimentado por un único endpoint nuevo. El `DashboardIndustrial` queda intacto.

**Architecture:**
- **Backend**: nuevo `dashboardController.js` con un endpoint agregador `GET /api/negocios/:negocioId/dashboard?rango=...` que ejecuta 6 queries en paralelo y devuelve un payload listo para render. Reutiliza el patrón SQL de detección "alimento" que ya existe en `analisisController.getIca` (categoría + fallback ILIKE).
- **Frontend**: extrae componentes en `frontend/src/pages/dashboard/` y usa Recharts para los 4 gráficos. Sin estado global: cada cambio de rango re-pega al endpoint.
- **Convención del proyecto**: ES modules, queries SQL crudas con `pg.pool`, `node:test` para backend, JSX con CSS-in-JS inline para frontend.

**Tech Stack:**
- Backend: Node 20 + Express + `pg` (Pool), tests con `node:test`
- Frontend: React 19 + Vite + Recharts (a instalar)
- DB: PostgreSQL 16 (corriendo en Docker `equipo13-db`)

**Spec de referencia:** [PLAN_REDISENO_DASHBOARD_AGRO.md](PLAN_REDISENO_DASHBOARD_AGRO.md)

**Endpoint base del backend:** `http://localhost:3000`
**Credenciales admin demo:** `gerardo@demo.com` / `demo1234`
**Negocio demo:** `Granja Olmos` (código `GRANJA`)

---

## Convenciones para todas las tareas

- **Working dir base:** `C:\Users\Jairo\Documents\Sistema de Costeo Estandar Productivo Universal\equipo13`
- **Antes de cada commit**: verificá que el backend no rompe con `cd backend && npm test` cuando hayas tocado backend. El frontend no tiene tests, así que en frontend confiá en el smoke test de la Task 17.
- **Si tocás un controller del backend**: el contenedor levantado con `node --watch app.js` recarga solo, pero a veces no detecta archivos nuevos importados. Tras cualquier import nuevo, ejecutar `docker compose restart backend` desde `equipo13/`.
- **Commits**: usá los mensajes literales que indica cada Task.

---

## Resumen de archivos

| Acción | Path | Responsabilidad |
|---|---|---|
| Crear | `backend/src/controllers/dashboardController.js` | Endpoint agregador del dashboard |
| Modificar | `backend/src/routes/negocio.js` | Registrar la ruta |
| Crear | `backend/tests/dashboard.test.js` | Tests unitarios del controller |
| Modificar | `backend/seeds/engorde_porcino.js` | Distribuir bajas en el tiempo |
| Modificar | `frontend/package.json` | Añadir dep recharts |
| Crear | `frontend/src/pages/dashboard/colors.js` | Paleta agro y helpers de color |
| Crear | `frontend/src/pages/dashboard/RangoSelector.jsx` | Botones 7d/30d/90d/Todo |
| Crear | `frontend/src/pages/dashboard/KpiRow.jsx` | Fila de 4 MetricCards |
| Crear | `frontend/src/pages/dashboard/WeightEvolutionChart.jsx` | LineChart multi-serie |
| Crear | `frontend/src/pages/dashboard/CostBreakdownDonut.jsx` | PieChart donut |
| Crear | `frontend/src/pages/dashboard/IcaBarChart.jsx` | BarChart horizontal + ReferenceLine |
| Crear | `frontend/src/pages/dashboard/MortalitySeriesChart.jsx` | AreaChart apilado |
| Crear | `frontend/src/pages/dashboard/LotesActivosTable.jsx` | Tabla con sparkline |
| Crear | `frontend/src/pages/dashboard/DashboardAgro.jsx` | Composición del dashboard |
| Modificar | `frontend/src/pages/Dashboard.jsx` | Solo el switch por rubro |
| Modificar | `frontend/src/App.jsx` | Extender `navigate` para `opts.lote` |

---

# Phase 1 — Backend: endpoint agregador

## Task 1: Crear esqueleto del controller con shape de respuesta hardcoded

**Files:**
- Create: `backend/src/controllers/dashboardController.js`

- [ ] **Step 1: Crear el archivo del controller con un handler stub**

Contenido completo de `backend/src/controllers/dashboardController.js`:

```js
import { pool } from '../config/database.js';

// Mapeo de rango -> intervalo SQL. 'todo' = sin filtro de fecha.
const RANGO_TO_DAYS = { '7d': 7, '30d': 30, '90d': 90, 'todo': null };

function parseRango(raw) {
  return Object.prototype.hasOwnProperty.call(RANGO_TO_DAYS, raw) ? raw : '30d';
}

function fechaDesdePorRango(rango) {
  const dias = RANGO_TO_DAYS[rango];
  if (dias === null) return null;
  const d = new Date();
  d.setDate(d.getDate() - dias);
  return d.toISOString().slice(0, 10); // 'YYYY-MM-DD'
}

// Paleta cíclica para series de lotes (consistente entre los 3 charts).
export const PALETA_LOTES = ['#2E7D32', '#1976D2', '#ED6C02', '#9C27B0', '#0097A7', '#5D4037'];

export function colorParaLote(idx) {
  return PALETA_LOTES[idx % PALETA_LOTES.length];
}

// Umbrales de ICA alineados con backend/src/controllers/analisisController.js:332
// (verde <=3.0, ámbar <=3.5, rojo >3.5). El benchmark visual ideal es 2.5.
export function statusIca(ica) {
  if (ica == null) return 'sin_dato';
  if (ica <= 3.0) return 'bueno';
  if (ica <= 3.5) return 'aceptable';
  return 'malo';
}

export async function getDashboard(req, res) {
  const { negocioId } = req.params;
  const rango = parseRango(req.query.rango);
  const fechaDesde = fechaDesdePorRango(rango);

  try {
    res.json({
      rango,
      fecha_desde: fechaDesde,
      kpis: {
        lotes_activos: 0,
        cabezas_activas: 0,
        cabezas_inicio: 0,
        mortandad_pct: 0,
        costo_total: 0,
        costo_por_cabeza: 0,
        ica_promedio: null,
      },
      pesos_por_lote: [],
      costos_categoria: [],
      ica_por_lote: [],
      mortandad_serie: [],
      lotes_resumen: [],
      ultimo_liquidado: null,
      actividad_reciente: [],
    });
  } catch (err) {
    console.error('getDashboard error:', err);
    res.status(500).json({ error: err.message });
  }
}
```

- [ ] **Step 2: Verificar que el archivo compila (sintaxis)**

Ejecutar:
```bash
cd backend
node --check src/controllers/dashboardController.js
```
Expected: sin output (exit 0).

- [ ] **Step 3: Commit**

```bash
cd "C:/Users/Jairo/Documents/Sistema de Costeo Estandar Productivo Universal/equipo13"
git add backend/src/controllers/dashboardController.js
git commit -m "feat(dashboard): crear esqueleto de dashboardController con shape de respuesta"
```

---

## Task 2: Registrar la ruta y validarla con curl

**Files:**
- Modify: `backend/src/routes/negocio.js`

- [ ] **Step 1: Agregar import del controller**

En `backend/src/routes/negocio.js`, ubicar la sección de imports (cerca del top, junto a los otros `import ... from '../controllers/...js'`) y agregar:

```js
import { getDashboard } from '../controllers/dashboardController.js';
```

- [ ] **Step 2: Registrar la ruta**

En `backend/src/routes/negocio.js`, buscar la línea con `router.get('/:negocioId/lotes'` (usar Grep). Agregar inmediatamente DEBAJO de las rutas de lotes (cerca de la línea 255):

```js
// Dashboard agregador — un solo endpoint para todos los widgets del Dashboard Agro
router.get('/:negocioId/dashboard', authMiddleware, negocioOwner, getDashboard);
```

- [ ] **Step 3: Reiniciar backend para tomar los cambios**

```bash
cd "C:/Users/Jairo/Documents/Sistema de Costeo Estandar Productivo Universal/equipo13"
docker compose restart backend
```
Esperar ~3 segundos hasta `Servidor corriendo en http://localhost:3000`. Verificar con:
```bash
docker compose logs --tail=5 backend
```

- [ ] **Step 4: Probar el endpoint con curl**

```bash
TOKEN=$(curl -s -X POST http://localhost:3000/api/auth/login -H "Content-Type: application/json" -d '{"email":"gerardo@demo.com","password":"demo1234"}' | sed 's/.*"token":"\([^"]*\)".*/\1/')
NEG_ID=$(docker exec equipo13-db psql -U postgres -d equipo13 -tA -c "SELECT id FROM negocios WHERE codigo='GRANJA';")
curl -s "http://localhost:3000/api/negocios/$NEG_ID/dashboard?rango=30d" -H "Authorization: Bearer $TOKEN" | head -c 400
```
Expected (ejemplo):
```
{"rango":"30d","fecha_desde":"2026-05-25","kpis":{"lotes_activos":0,...},"pesos_por_lote":[],...
```

- [ ] **Step 5: Commit**

```bash
git add backend/src/routes/negocio.js
git commit -m "feat(dashboard): registrar ruta GET /:negocioId/dashboard"
```

---

## Task 3: Implementar KPIs reales con tests

**Files:**
- Modify: `backend/src/controllers/dashboardController.js`
- Create: `backend/tests/dashboard.test.js`

- [ ] **Step 1: Escribir test unitario que falla**

Crear `backend/tests/dashboard.test.js`:

```js
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
```

- [ ] **Step 2: Ejecutar el test, verificar que falla**

```bash
cd backend
node --test tests/dashboard.test.js
```
Expected: 3 tests, los dos primeros pass, el tercero **FAIL** (porque el controller actual devuelve `lotes_activos: 0` hardcoded).

- [ ] **Step 3: Implementar los KPIs en el controller**

Reemplazar el cuerpo del `try { res.json(...) }` dentro de `getDashboard` en `backend/src/controllers/dashboardController.js` por:

```js
    // KPIs agregados de lotes activos
    const kpisResult = await pool.query(
      `SELECT
         COUNT(*)::int AS lotes_activos,
         COALESCE(SUM(l.cabezas_inicio), 0)::int AS cabezas_inicio,
         COALESCE(SUM(l.cabezas_activas), 0)::int AS cabezas_activas,
         COALESCE(SUM(l.costo_adquisicion), 0)::float AS costo_adquisicion_total,
         COALESCE((
           SELECT SUM(b.monto)
           FROM bitacora_lote b
           JOIN lotes l2 ON l2.id = b.lote_id
           WHERE l2.negocio_id = $1
             AND l2.activo = TRUE
             AND b.es_baja = false
             AND b.monto IS NOT NULL
         ), 0)::float AS costo_bitacora_total
       FROM lotes l
       WHERE l.negocio_id = $1 AND l.activo = TRUE`,
      [negocioId]
    );
    const k = kpisResult.rows[0];
    const cabezasActivas = Number(k.cabezas_activas);
    const cabezasInicio = Number(k.cabezas_inicio);
    const costoTotal = Number(k.costo_adquisicion_total) + Number(k.costo_bitacora_total);

    res.json({
      rango,
      fecha_desde: fechaDesde,
      kpis: {
        lotes_activos: Number(k.lotes_activos),
        cabezas_activas: cabezasActivas,
        cabezas_inicio: cabezasInicio,
        mortandad_pct: cabezasInicio > 0
          ? +(((cabezasInicio - cabezasActivas) / cabezasInicio) * 100).toFixed(2)
          : 0,
        costo_total: +costoTotal.toFixed(2),
        costo_por_cabeza: cabezasActivas > 0 ? +(costoTotal / cabezasActivas).toFixed(2) : 0,
        ica_promedio: null,
      },
      pesos_por_lote: [],
      costos_categoria: [],
      ica_por_lote: [],
      mortandad_serie: [],
      lotes_resumen: [],
      ultimo_liquidado: null,
      actividad_reciente: [],
    });
```

- [ ] **Step 4: Re-ejecutar el test, debe pasar**

```bash
cd backend
node --test tests/dashboard.test.js
```
Expected: 3/3 PASS.

- [ ] **Step 5: Verificar end-to-end con curl**

```bash
docker compose restart backend
# Esperar 3 segundos
sleep 3
TOKEN=$(curl -s -X POST http://localhost:3000/api/auth/login -H "Content-Type: application/json" -d '{"email":"gerardo@demo.com","password":"demo1234"}' | sed 's/.*"token":"\([^"]*\)".*/\1/')
NEG_ID=$(docker exec equipo13-db psql -U postgres -d equipo13 -tA -c "SELECT id FROM negocios WHERE codigo='GRANJA';")
curl -s "http://localhost:3000/api/negocios/$NEG_ID/dashboard?rango=30d" -H "Authorization: Bearer $TOKEN" | sed 's/.*"kpis"/KPIS/' | head -c 200
```
Expected: KPIs con `lotes_activos > 0`, `cabezas_activas > 0`, `costo_total > 0`.

- [ ] **Step 6: Commit**

```bash
cd "C:/Users/Jairo/Documents/Sistema de Costeo Estandar Productivo Universal/equipo13"
git add backend/src/controllers/dashboardController.js backend/tests/dashboard.test.js
git commit -m "feat(dashboard): KPIs con suma de cabezas, mortandad % y costo total"
```

---

## Task 4: Agregar serie de pesos por lote

**Files:**
- Modify: `backend/src/controllers/dashboardController.js`

- [ ] **Step 1: Implementar query de pesos**

En `backend/src/controllers/dashboardController.js`, justo DEBAJO del bloque que asigna `const k = kpisResult.rows[0];` y ANTES del `res.json(...)`, insertar:

```js
    // Pesos históricos por lote activo, filtrados por rango.
    // El punto inicial sintético (fecha_entrada, peso_inicial_prom) se inyecta
    // siempre para que cada serie empiece desde el día 0 del lote.
    const pesosResult = await pool.query(
      `SELECT l.id AS lote_id, l.identificador, l.fecha_entrada, l.peso_inicial_prom,
              p.fecha, p.peso_prom_kg
       FROM lotes l
       LEFT JOIN pesajes_lote p ON p.lote_id = l.id
         AND ($2::date IS NULL OR p.fecha >= $2)
       WHERE l.negocio_id = $1 AND l.activo = TRUE
       ORDER BY l.identificador, p.fecha`,
      [negocioId, fechaDesde]
    );
    // Agrupar por lote_id
    const pesosMap = new Map();
    for (const row of pesosResult.rows) {
      if (!pesosMap.has(row.lote_id)) {
        const fechaEntradaIso = row.fecha_entrada ? new Date(row.fecha_entrada).toISOString().slice(0, 10) : null;
        const incluirInicial = fechaEntradaIso && (!fechaDesde || fechaEntradaIso >= fechaDesde);
        pesosMap.set(row.lote_id, {
          lote_id: row.lote_id,
          identificador: row.identificador,
          color: colorParaLote(pesosMap.size),
          puntos: incluirInicial && row.peso_inicial_prom != null
            ? [{ fecha: fechaEntradaIso, peso: Number(row.peso_inicial_prom) }]
            : [],
        });
      }
      if (row.fecha && row.peso_prom_kg != null) {
        pesosMap.get(row.lote_id).puntos.push({
          fecha: new Date(row.fecha).toISOString().slice(0, 10),
          peso: Number(row.peso_prom_kg),
        });
      }
    }
    const pesos_por_lote = Array.from(pesosMap.values());
```

- [ ] **Step 2: Cambiar `pesos_por_lote: []` en la respuesta JSON por `pesos_por_lote`**

Localizar `pesos_por_lote: []` dentro del `res.json(...)` y reemplazarlo por `pesos_por_lote,`.

- [ ] **Step 3: Verificar con curl**

```bash
docker compose restart backend
sleep 3
TOKEN=$(curl -s -X POST http://localhost:3000/api/auth/login -H "Content-Type: application/json" -d '{"email":"gerardo@demo.com","password":"demo1234"}' | sed 's/.*"token":"\([^"]*\)".*/\1/')
NEG_ID=$(docker exec equipo13-db psql -U postgres -d equipo13 -tA -c "SELECT id FROM negocios WHERE codigo='GRANJA';")
curl -s "http://localhost:3000/api/negocios/$NEG_ID/dashboard?rango=todo" -H "Authorization: Bearer $TOKEN" | grep -oE '"pesos_por_lote":\[[^]]+\]' | head -c 400
```
Expected: array no vacío con al menos 1 lote y sus puntos `{fecha, peso}`.

- [ ] **Step 4: Commit**

```bash
git add backend/src/controllers/dashboardController.js
git commit -m "feat(dashboard): serie temporal de pesos por lote activo"
```

---

## Task 5: Agregar composición de costos por categoría

**Files:**
- Modify: `backend/src/controllers/dashboardController.js`

- [ ] **Step 1: Implementar query de costos por categoría**

En el controller, después del bloque de `pesos_por_lote`, insertar:

```js
    // Composición de costos: adquisición + categorías de bitácora_lote.
    // Mapea cualquier tipo que contenga 'aliment', 'balanceado', 'forraje' a "Alimentación"
    // para tolerar variaciones del seeder y del catálogo de servicios.
    const costosResult = await pool.query(
      `WITH bitac AS (
         SELECT
           CASE
             WHEN b.tipo ILIKE '%aliment%'
               OR b.tipo ILIKE '%balanceado%'
               OR b.tipo ILIKE '%forraje%'
               OR b.tipo ILIKE '%pastura%'
               OR b.tipo ILIKE '%silaje%'
               OR b.tipo ILIKE '%grano%' THEN 'Alimentación'
             WHEN b.tipo ILIKE '%sanidad%' OR b.tipo ILIKE '%medic%' THEN 'Sanidad'
             WHEN b.tipo ILIKE '%mano%obra%' OR b.tipo = 'Mano de obra' THEN 'Mano de obra'
             ELSE 'Otros'
           END AS categoria,
           SUM(b.monto)::float AS monto
         FROM bitacora_lote b
         JOIN lotes l ON l.id = b.lote_id
         WHERE l.negocio_id = $1
           AND l.activo = TRUE
           AND b.es_baja = false
           AND b.monto IS NOT NULL
           AND ($2::date IS NULL OR b.fecha >= $2)
         GROUP BY categoria
       ),
       adq AS (
         SELECT 'Adquisición' AS categoria, COALESCE(SUM(costo_adquisicion), 0)::float AS monto
         FROM lotes
         WHERE negocio_id = $1 AND activo = TRUE
       )
       SELECT * FROM adq
       UNION ALL
       SELECT * FROM bitac
       ORDER BY monto DESC`,
      [negocioId, fechaDesde]
    );
    const COLORES_CAT = {
      'Adquisición':  '#6B7280',
      'Alimentación': '#2E7D32',
      'Sanidad':      '#1976D2',
      'Mano de obra': '#ED6C02',
      'Otros':        '#9CA3AF',
    };
    const costos_categoria = costosResult.rows
      .filter(r => Number(r.monto) > 0)
      .map(r => ({
        categoria: r.categoria,
        monto: +Number(r.monto).toFixed(2),
        color: COLORES_CAT[r.categoria] || '#9CA3AF',
      }));
```

- [ ] **Step 2: Cambiar `costos_categoria: []` por `costos_categoria` en `res.json`**

- [ ] **Step 3: Verificar con curl**

```bash
docker compose restart backend
sleep 3
TOKEN=$(curl -s -X POST http://localhost:3000/api/auth/login -H "Content-Type: application/json" -d '{"email":"gerardo@demo.com","password":"demo1234"}' | sed 's/.*"token":"\([^"]*\)".*/\1/')
NEG_ID=$(docker exec equipo13-db psql -U postgres -d equipo13 -tA -c "SELECT id FROM negocios WHERE codigo='GRANJA';")
curl -s "http://localhost:3000/api/negocios/$NEG_ID/dashboard?rango=todo" -H "Authorization: Bearer $TOKEN" | grep -oE '"costos_categoria":\[[^]]+\]'
```
Expected: array con al menos `Adquisición` y `Alimentación`, montos > 0.

- [ ] **Step 4: Commit**

```bash
git add backend/src/controllers/dashboardController.js
git commit -m "feat(dashboard): composición de costos por categoría (adquisición + bitácora)"
```

---

## Task 6: Agregar ICA por lote (reutiliza patrón SQL de analisisController)

**Files:**
- Modify: `backend/src/controllers/dashboardController.js`

- [ ] **Step 1: Implementar query de ICA por lote**

En el controller, después del bloque de `costos_categoria`, insertar:

```js
    // ICA por lote: kg de alimento consumido / kg de ganancia.
    // Usa el mismo patrón que analisisController.getIca (categoría + fallback ILIKE).
    const icaResult = await pool.query(
      `SELECT l.id AS lote_id, l.identificador,
              l.peso_inicial_prom, l.peso_actual_prom, l.cabezas_activas,
              COALESCE((
                SELECT SUM(b.cantidad_kg)
                FROM bitacora_lote b
                LEFT JOIN categorias_insumos c
                  ON c.nombre = b.tipo AND c.negocio_id = l.negocio_id
                WHERE b.lote_id = l.id
                  AND b.es_baja = false
                  AND b.cantidad_kg IS NOT NULL
                  AND COALESCE(
                        c.tipo,
                        CASE
                          WHEN b.tipo ILIKE '%aliment%'
                            OR b.tipo ILIKE '%balanceado%'
                            OR b.tipo ILIKE '%forraje%'
                            OR b.tipo ILIKE '%pastura%'
                            OR b.tipo ILIKE '%silaje%'
                            OR b.tipo ILIKE '%suplement%'
                            OR b.tipo ILIKE '%grano%'
                            OR b.tipo ILIKE '%maiz%'
                            OR b.tipo ILIKE '%maíz%'
                            OR b.tipo ILIKE '%heno%' THEN 'alimento'
                          ELSE 'otros'
                        END
                      ) = 'alimento'
              ), 0)::float AS kg_alimento
       FROM lotes l
       WHERE l.negocio_id = $1 AND l.activo = TRUE
       ORDER BY l.identificador`,
      [negocioId]
    );
    const ica_por_lote = icaResult.rows.map(r => {
      const pesoActual = Number(r.peso_actual_prom) || 0;
      const pesoInicial = Number(r.peso_inicial_prom) || 0;
      const cabezas = Number(r.cabezas_activas) || 0;
      const kgGanancia = (pesoActual - pesoInicial) * cabezas;
      const kgAlimento = Number(r.kg_alimento);
      const ica = kgGanancia > 0 ? +(kgAlimento / kgGanancia).toFixed(2) : null;
      return {
        lote_id: r.lote_id,
        identificador: r.identificador,
        ica,
        kg_alimento: +kgAlimento.toFixed(2),
        kg_ganancia: +kgGanancia.toFixed(2),
        status: statusIca(ica),
      };
    });
    // Promedio ponderado por kg de ganancia (más justo que media simple).
    const totalGan = ica_por_lote.reduce((s, r) => s + (r.ica != null ? r.kg_ganancia : 0), 0);
    const totalAli = ica_por_lote.reduce((s, r) => s + (r.ica != null ? r.kg_alimento : 0), 0);
    const ica_promedio = totalGan > 0 ? +(totalAli / totalGan).toFixed(2) : null;
```

- [ ] **Step 2: Inyectar ICA en los KPIs y en la respuesta**

En `res.json(...)`:
- Cambiar `ica_promedio: null` por `ica_promedio,` dentro del bloque `kpis`.
- Cambiar `ica_por_lote: []` por `ica_por_lote,`.

- [ ] **Step 3: Verificar con curl**

```bash
docker compose restart backend
sleep 3
TOKEN=$(curl -s -X POST http://localhost:3000/api/auth/login -H "Content-Type: application/json" -d '{"email":"gerardo@demo.com","password":"demo1234"}' | sed 's/.*"token":"\([^"]*\)".*/\1/')
NEG_ID=$(docker exec equipo13-db psql -U postgres -d equipo13 -tA -c "SELECT id FROM negocios WHERE codigo='GRANJA';")
curl -s "http://localhost:3000/api/negocios/$NEG_ID/dashboard?rango=todo" -H "Authorization: Bearer $TOKEN" | grep -oE '"ica_por_lote":\[[^]]+\]'
echo
curl -s "http://localhost:3000/api/negocios/$NEG_ID/dashboard?rango=todo" -H "Authorization: Bearer $TOKEN" | grep -oE '"ica_promedio":[^,}]+'
```
Expected: array con un objeto por lote activo, `ica` numérico o `null`. `ica_promedio` no `null`.

- [ ] **Step 4: Commit**

```bash
git add backend/src/controllers/dashboardController.js
git commit -m "feat(dashboard): ICA por lote y promedio ponderado"
```

---

## Task 7: Agregar mortandad serie temporal y último liquidado + actividad reciente

**Files:**
- Modify: `backend/src/controllers/dashboardController.js`

- [ ] **Step 1: Implementar query de mortandad serie**

En el controller, después del bloque de `ica_por_lote`/`ica_promedio`, insertar:

```js
    // Mortandad acumulada por mes y por lote (área apilada en el frontend).
    const mortResult = await pool.query(
      `SELECT
         to_char(date_trunc('month', e.created_at), 'YYYY-MM') AS mes,
         l.identificador,
         COUNT(*)::int AS bajas
       FROM eventos_operario e
       JOIN lotes l ON l.id = e.lote_id
       WHERE e.negocio_id = $1
         AND e.tipo = 'baja'
         AND e.estado = 'aplicado'
         AND ($2::date IS NULL OR e.created_at >= $2::date)
       GROUP BY mes, l.identificador
       ORDER BY mes`,
      [negocioId, fechaDesde]
    );
    // Pivot a forma { mes, [identificador]: bajasAcumuladas }
    const mortByMes = new Map();
    const identsVistos = new Set();
    for (const r of mortResult.rows) {
      identsVistos.add(r.identificador);
      if (!mortByMes.has(r.mes)) mortByMes.set(r.mes, { mes: r.mes });
      mortByMes.get(r.mes)[r.identificador] = (mortByMes.get(r.mes)[r.identificador] || 0) + Number(r.bajas);
    }
    // Convertir a array ordenado y acumular por lote
    const mesesOrdenados = Array.from(mortByMes.values()).sort((a, b) => a.mes.localeCompare(b.mes));
    const acumPorLote = {};
    const mortandad_serie = mesesOrdenados.map(row => {
      const punto = { mes: row.mes };
      for (const ident of identsVistos) {
        acumPorLote[ident] = (acumPorLote[ident] || 0) + (row[ident] || 0);
        punto[ident] = acumPorLote[ident];
      }
      return punto;
    });
```

- [ ] **Step 2: Implementar último liquidado y actividad reciente**

Inmediatamente después, agregar:

```js
    // Último lote cerrado y actividad reciente (resumen para las cards del pie).
    const [liquidResult, actividadResult] = await Promise.all([
      pool.query(
        `SELECT id, identificador, tipo_animal, liquidacion_jsonb
         FROM lotes
         WHERE negocio_id = $1 AND activo = FALSE AND liquidacion_jsonb IS NOT NULL
         ORDER BY (liquidacion_jsonb->>'liquidado_en')::timestamptz DESC
         LIMIT 1`,
        [negocioId]
      ),
      pool.query(
        `SELECT id, identificador, tipo_animal, cabezas_inicio, created_at
         FROM lotes
         WHERE negocio_id = $1
         ORDER BY created_at DESC
         LIMIT 5`,
        [negocioId]
      ),
    ]);
    const ultimo_liquidado = liquidResult.rows[0] || null;
    const actividad_reciente = actividadResult.rows.map(l => ({
      tipo: 'lote_creado',
      texto: `Nuevo lote: ${l.identificador} · ${l.cabezas_inicio} ${l.tipo_animal === 'Cerdo' ? 'cerdos' : 'animales'}`,
      fecha: l.created_at,
    }));
```

- [ ] **Step 3: Inyectar en la respuesta**

Cambiar en `res.json(...)`:
- `mortandad_serie: []` → `mortandad_serie,`
- `ultimo_liquidado: null` → `ultimo_liquidado,`
- `actividad_reciente: []` → `actividad_reciente,`

- [ ] **Step 4: Verificar con curl**

```bash
docker compose restart backend
sleep 3
TOKEN=$(curl -s -X POST http://localhost:3000/api/auth/login -H "Content-Type: application/json" -d '{"email":"gerardo@demo.com","password":"demo1234"}' | sed 's/.*"token":"\([^"]*\)".*/\1/')
NEG_ID=$(docker exec equipo13-db psql -U postgres -d equipo13 -tA -c "SELECT id FROM negocios WHERE codigo='GRANJA';")
curl -s "http://localhost:3000/api/negocios/$NEG_ID/dashboard?rango=todo" -H "Authorization: Bearer $TOKEN" | grep -oE '"mortandad_serie":\[[^]]*\]'
echo
curl -s "http://localhost:3000/api/negocios/$NEG_ID/dashboard?rango=todo" -H "Authorization: Bearer $TOKEN" | grep -oE '"actividad_reciente":\[[^]]+\]' | head -c 200
```
Expected: ambos arrays presentes (la mortandad puede venir vacía pre-seeder mejorado).

- [ ] **Step 5: Commit**

```bash
git add backend/src/controllers/dashboardController.js
git commit -m "feat(dashboard): mortandad serie + último liquidado + actividad reciente"
```

---

## Task 8: Agregar lotes_resumen con pesajes recientes para el sparkline

**Files:**
- Modify: `backend/src/controllers/dashboardController.js`

- [ ] **Step 1: Implementar query de resumen de lotes**

En el controller, después del bloque de actividad reciente, insertar:

```js
    // Resumen de lotes activos con últimos pesajes para la tabla del dashboard.
    const resumenResult = await pool.query(
      `SELECT l.id, l.identificador, l.tipo_animal, l.cabezas_inicio,
              l.cabezas_activas, l.fecha_entrada,
              l.costo_adquisicion + COALESCE((
                SELECT SUM(b.monto)
                FROM bitacora_lote b
                WHERE b.lote_id = l.id AND b.es_baja = false AND b.monto IS NOT NULL
              ), 0)::float AS costo_total,
              COALESCE((
                SELECT array_agg(peso_prom_kg ORDER BY fecha DESC)
                FROM (
                  SELECT peso_prom_kg, fecha
                  FROM pesajes_lote
                  WHERE lote_id = l.id
                  ORDER BY fecha DESC
                  LIMIT 8
                ) ult
              ), '{}') AS pesajes_recientes
       FROM lotes l
       WHERE l.negocio_id = $1 AND l.activo = TRUE
       ORDER BY l.created_at DESC`,
      [negocioId]
    );
    const icaByLoteId = new Map(ica_por_lote.map(r => [r.lote_id, r.ica]));
    const lotes_resumen = resumenResult.rows.map(r => ({
      id: r.id,
      identificador: r.identificador,
      tipo_animal: r.tipo_animal,
      cabezas_activas: Number(r.cabezas_activas),
      cabezas_inicio: Number(r.cabezas_inicio),
      dias: r.fecha_entrada ? Math.floor((Date.now() - new Date(r.fecha_entrada).getTime()) / 86400000) : 0,
      costo_total: +Number(r.costo_total).toFixed(2),
      ica: icaByLoteId.get(r.id) ?? null,
      // Recharts y el sparkline esperan orden cronológico ascendente.
      pesajes_recientes: (r.pesajes_recientes || []).map(Number).reverse(),
    }));
```

- [ ] **Step 2: Inyectar en la respuesta**

Cambiar `lotes_resumen: []` por `lotes_resumen,`.

- [ ] **Step 3: Verificar end-to-end con curl**

```bash
docker compose restart backend
sleep 3
TOKEN=$(curl -s -X POST http://localhost:3000/api/auth/login -H "Content-Type: application/json" -d '{"email":"gerardo@demo.com","password":"demo1234"}' | sed 's/.*"token":"\([^"]*\)".*/\1/')
NEG_ID=$(docker exec equipo13-db psql -U postgres -d equipo13 -tA -c "SELECT id FROM negocios WHERE codigo='GRANJA';")
curl -s "http://localhost:3000/api/negocios/$NEG_ID/dashboard?rango=todo" -H "Authorization: Bearer $TOKEN" > /tmp/dashboard_response.json
wc -c /tmp/dashboard_response.json
node -e "const r = require('/tmp/dashboard_response.json'); console.log('keys:', Object.keys(r)); console.log('lotes_resumen[0]:', JSON.stringify(r.lotes_resumen[0], null, 2));"
```
Expected: `lotes_resumen[0]` con `id, identificador, ica, pesajes_recientes: [num, num, ...]`.

- [ ] **Step 4: Asegurarse de que ningún test rompió**

```bash
cd backend
node --test tests/*.test.js 2>&1 | tail -20
```
Expected: todos PASS, especialmente `dashboard.test.js`.

- [ ] **Step 5: Commit**

```bash
cd "C:/Users/Jairo/Documents/Sistema de Costeo Estandar Productivo Universal/equipo13"
git add backend/src/controllers/dashboardController.js
git commit -m "feat(dashboard): lotes_resumen con últimos pesajes para sparkline"
```

---

# Phase 2 — Seeder: bajas distribuidas

## Task 9: Distribuir eventos de baja en el seeder

**Files:**
- Modify: `backend/seeds/engorde_porcino.js`

- [ ] **Step 1: Localizar el final del `createLoteConRegistros`**

Abrir `backend/seeds/engorde_porcino.js`. La función `createLoteConRegistros` (line ~201) tiene un loop `for (let dia = 1; dia <= diasDeRegistros; dia++)`. Justo DESPUÉS de cerrar ese loop (después de su `}` de cierre) y ANTES del `return loteId` o del cierre de la función, agregar:

```js
    // Eventos de baja distribuidos: una baja en el día 8 y otra en el día 22.
    // Esto puebla `eventos_operario` para que la gráfica de mortandad muestre
    // datos reales en el dashboard, sin depender de bajas manuales del operario.
    // Estado 'aplicado' es lo que el dashboard cuenta (estado='pendiente' se filtra).
    // Además decrementamos cabezas_activas para que el KPI de mortandad % no quede en 0.
    const bajasFechas = [8, 22].filter(d => d <= diasDeRegistros);
    for (const diaBaja of bajasFechas) {
      const fechaBaja = dateOffset(-(diasDeRegistros - diaBaja));
      await db.query(
        `INSERT INTO eventos_operario (negocio_id, lote_id, tipo, estado, payload, created_at)
         VALUES ($1, $2, 'baja', 'aplicado',
                 '{"causa": "Síndrome respiratorio", "cantidad": 1}'::jsonb,
                 $3::date + INTERVAL '10 hours')`,
        [negocioId, loteId, fechaBaja]
      );
    }
    if (bajasFechas.length > 0) {
      await db.query(
        `UPDATE lotes SET cabezas_activas = GREATEST(cabezas_activas - $2, 0) WHERE id = $1`,
        [loteId, bajasFechas.length]
      );
    }
```

- [ ] **Step 2: Verificar sintaxis**

```bash
cd backend
node --check seeds/engorde_porcino.js
```
Expected: sin output.

- [ ] **Step 3: Re-seed la BD para activar las bajas**

```bash
cd "C:/Users/Jairo/Documents/Sistema de Costeo Estandar Productivo Universal/equipo13"
docker compose down -v
docker compose up -d
# Esperar ~30 segundos a que el seed corra
sleep 30
docker compose logs backend | grep -E "(seed-demo|Servidor)"
```
Expected: ver `[seed-demo] Demo lista. Login: gerardo@demo.com / demo1234 (negocio: Granja Olmos)` y `Servidor corriendo en http://localhost:3000`.

- [ ] **Step 4: Verificar las bajas sembradas**

```bash
docker exec equipo13-db psql -U postgres -d equipo13 -c "SELECT lote_id, tipo, created_at::date FROM eventos_operario WHERE tipo='baja' ORDER BY created_at;"
```
Expected: al menos 4-6 filas (2 por cada lote activo), con fechas distribuidas (no todas el mismo día).

- [ ] **Step 5: Verificar que el endpoint de mortandad ya muestra serie**

```bash
TOKEN=$(curl -s -X POST http://localhost:3000/api/auth/login -H "Content-Type: application/json" -d '{"email":"gerardo@demo.com","password":"demo1234"}' | sed 's/.*"token":"\([^"]*\)".*/\1/')
NEG_ID=$(docker exec equipo13-db psql -U postgres -d equipo13 -tA -c "SELECT id FROM negocios WHERE codigo='GRANJA';")
curl -s "http://localhost:3000/api/negocios/$NEG_ID/dashboard?rango=todo" -H "Authorization: Bearer $TOKEN" | grep -oE '"mortandad_serie":\[[^]]+\]' | head -c 300
```
Expected: array con al menos un objeto `{mes, LOTE-CERD-001, LOTE-CERD-002, ...}`.

- [ ] **Step 6: Commit**

```bash
git add backend/seeds/engorde_porcino.js
git commit -m "feat(seed): distribuir eventos de baja en días 8 y 22 de cada lote"
```

---

# Phase 3 — Frontend: setup y componentes base

## Task 10: Instalar Recharts y crear estructura de carpetas

**Files:**
- Modify: `frontend/package.json` (vía npm install)
- Create: `frontend/src/pages/dashboard/colors.js`

- [ ] **Step 1: Instalar Recharts en el contenedor frontend**

```bash
cd "C:/Users/Jairo/Documents/Sistema de Costeo Estandar Productivo Universal/equipo13"
docker exec equipo13-frontend npm install recharts
```
Expected: termina sin errores. Si hay warning de peer deps con React 19, ignorar — Recharts funciona con React 19 desde la 2.13. Si la install falla por peer deps duras, ejecutar `docker exec equipo13-frontend npm install recharts --legacy-peer-deps`.

- [ ] **Step 2: Verificar que recharts quedó en package.json**

```bash
grep recharts frontend/package.json
```
Expected: línea con `"recharts": "^2..."` o similar.

- [ ] **Step 3: Crear la carpeta de dashboard y el helper de colores**

Crear `frontend/src/pages/dashboard/colors.js`:

```js
// Paleta cíclica para series de lotes (debe coincidir con backend dashboardController.PALETA_LOTES).
export const PALETA_LOTES = ['#2E7D32', '#1976D2', '#ED6C02', '#9C27B0', '#0097A7', '#5D4037'];

export const colorParaLote = (idx) => PALETA_LOTES[idx % PALETA_LOTES.length];

// Color del valor de ICA según status del backend.
export const colorIca = (status) => {
  switch (status) {
    case 'bueno':     return '#2E7D32';
    case 'aceptable': return '#ED6C02';
    case 'malo':      return '#D32F2F';
    default:          return '#9CA3AF';
  }
};

export const COLORES_CATEGORIA = {
  'Adquisición':  '#6B7280',
  'Alimentación': '#2E7D32',
  'Sanidad':      '#1976D2',
  'Mano de obra': '#ED6C02',
  'Otros':        '#9CA3AF',
};
```

- [ ] **Step 4: Commit**

```bash
git add frontend/package.json frontend/package-lock.json frontend/src/pages/dashboard/colors.js
git commit -m "feat(dashboard): instalar recharts y crear paleta compartida del frontend"
```

---

## Task 11: Crear RangoSelector

**Files:**
- Create: `frontend/src/pages/dashboard/RangoSelector.jsx`

- [ ] **Step 1: Crear el componente**

Crear `frontend/src/pages/dashboard/RangoSelector.jsx`:

```jsx
import React from 'react';

const OPCIONES = [
  { value: '7d',   label: '7d' },
  { value: '30d',  label: '30d' },
  { value: '90d',  label: '90d' },
  { value: 'todo', label: 'Todo' },
];

const RangoSelector = ({ value, onChange }) => (
  <div style={{
    display: 'inline-flex',
    background: 'var(--bg-tertiary)',
    border: '1px solid var(--border-subtle)',
    borderRadius: '6px',
    padding: '2px',
    gap: '2px',
  }}>
    {OPCIONES.map(op => {
      const activo = op.value === value;
      return (
        <button
          key={op.value}
          type="button"
          onClick={() => onChange(op.value)}
          style={{
            padding: '4px 12px',
            fontSize: '12px',
            fontWeight: activo ? 600 : 500,
            color: activo ? 'var(--text-primary)' : 'var(--text-tertiary)',
            background: activo ? 'var(--bg-secondary)' : 'transparent',
            border: activo ? '1px solid var(--border-subtle)' : '1px solid transparent',
            borderRadius: '4px',
            cursor: 'pointer',
            transition: 'all 0.15s',
            fontFamily: 'inherit',
          }}
        >
          {op.label}
        </button>
      );
    })}
  </div>
);

export default RangoSelector;
```

- [ ] **Step 2: Commit**

```bash
git add frontend/src/pages/dashboard/RangoSelector.jsx
git commit -m "feat(dashboard): RangoSelector para 7d/30d/90d/Todo"
```

---

## Task 12: Crear KpiRow

**Files:**
- Create: `frontend/src/pages/dashboard/KpiRow.jsx`

- [ ] **Step 1: Crear el componente**

Crear `frontend/src/pages/dashboard/KpiRow.jsx`:

```jsx
import React from 'react';
import { Icon } from '../../icons.jsx';
import { MetricCard, InfoTip } from '../../components/ui.jsx';
import { colorIca } from './colors.js';

const fmtBs = (n) => `Bs ${Number(n).toLocaleString('es-BO', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
const fmtBsCompacto = (n) => Math.abs(n) >= 10000 ? `Bs ${(n / 1000).toFixed(1)}k` : fmtBs(n);

const KpiRow = ({ kpis, loading }) => {
  const accent = 'var(--accent-agro)';
  const icaStatus = kpis?.ica_promedio == null
    ? 'sin_dato'
    : kpis.ica_promedio <= 3.0 ? 'bueno'
    : kpis.ica_promedio <= 3.5 ? 'aceptable'
    : 'malo';
  const icaColor = colorIca(icaStatus);

  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '12px' }}>
      <MetricCard
        label="Lotes activos"
        labelExtra={<InfoTip text="Lotes con animales en curso. Se cierra al liquidar desde la sección Liquidación." />}
        value={loading ? '...' : kpis.lotes_activos}
        sub="en engorde"
        icon={<Icon name="cow" size={16} />}
        accentColor={accent}
        mono={false}
      />
      <MetricCard
        label="Animales en engorde"
        labelExtra={<InfoTip text="Suma de cabezas activas. La mortandad se calcula sobre cabezas_inicio." />}
        value={loading ? '...' : kpis.cabezas_activas}
        sub={loading ? '' : `mortandad ${kpis.mortandad_pct.toFixed(1)}%`}
        icon={<Icon name="layers" size={16} />}
        mono={false}
      />
      <MetricCard
        label="Costo total acumulado"
        value={loading ? '...' : fmtBsCompacto(kpis.costo_total)}
        sub={loading ? '' : `${fmtBs(kpis.costo_por_cabeza)}/cabeza`}
        icon={<Icon name="dollarSign" size={16} />}
        mono={false}
      />
      <MetricCard
        label="ICA promedio"
        labelExtra={<InfoTip text="Conversión alimenticia ponderada por kg de ganancia. Verde ≤ 3.0, ámbar ≤ 3.5, rojo > 3.5. Benchmark ideal: 2.5." />}
        value={loading ? '...' : (kpis.ica_promedio != null ? kpis.ica_promedio.toFixed(2) : '—')}
        sub="benchmark 2.5"
        icon={<Icon name="trendingUp" size={16} style={{ color: icaColor }} />}
        accentColor={icaColor}
        mono={false}
      />
    </div>
  );
};

export default KpiRow;
```

- [ ] **Step 2: Commit**

```bash
git add frontend/src/pages/dashboard/KpiRow.jsx
git commit -m "feat(dashboard): KpiRow con 4 métricas incluyendo ICA promedio"
```

---

# Phase 4 — Frontend: gráficos

## Task 13: WeightEvolutionChart

**Files:**
- Create: `frontend/src/pages/dashboard/WeightEvolutionChart.jsx`

- [ ] **Step 1: Crear el componente**

Crear `frontend/src/pages/dashboard/WeightEvolutionChart.jsx`:

```jsx
import React from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { SectionCard } from '../../components/ui.jsx';

// Transforma el array por-lote del backend al shape que entiende Recharts:
// [{ fecha: '2026-05-25', 'LOTE-CERD-001': 8.5, 'LOTE-CERD-002': 9.0 }, ...]
function pivotPesos(pesosPorLote) {
  const map = new Map();
  for (const lote of pesosPorLote) {
    for (const p of lote.puntos) {
      if (!map.has(p.fecha)) map.set(p.fecha, { fecha: p.fecha });
      map.get(p.fecha)[lote.identificador] = p.peso;
    }
  }
  return Array.from(map.values()).sort((a, b) => a.fecha.localeCompare(b.fecha));
}

const formatFecha = (iso) => {
  const d = new Date(iso);
  return d.toLocaleDateString('es-BO', { day: '2-digit', month: 'short' });
};

const WeightEvolutionChart = ({ pesosPorLote, onLoteClick }) => {
  const data = pivotPesos(pesosPorLote || []);
  const hayDatos = data.length > 0 && pesosPorLote?.some(l => l.puntos.length > 0);

  return (
    <SectionCard title="Evolución de peso por lote">
      {!hayDatos ? (
        <div style={{ height: 260, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-tertiary)', fontSize: '13px' }}>
          Sin pesajes registrados en este período.
        </div>
      ) : (
        <ResponsiveContainer width="100%" height={260}>
          <LineChart data={data} margin={{ top: 10, right: 20, left: 0, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--border-subtle)" vertical={false} />
            <XAxis
              dataKey="fecha"
              tickFormatter={formatFecha}
              tick={{ fontSize: 11, fill: 'var(--text-tertiary)' }}
              stroke="var(--border-subtle)"
            />
            <YAxis
              tick={{ fontSize: 11, fill: 'var(--text-tertiary)' }}
              stroke="var(--border-subtle)"
              label={{ value: 'kg', angle: -90, position: 'insideLeft', style: { fontSize: 11, fill: 'var(--text-tertiary)' } }}
            />
            <Tooltip
              contentStyle={{ background: 'var(--bg-secondary)', border: '1px solid var(--border-subtle)', borderRadius: '6px', fontSize: '12px' }}
              labelFormatter={formatFecha}
              formatter={(value) => [`${value} kg`, '']}
            />
            <Legend wrapperStyle={{ fontSize: '12px', paddingTop: '8px' }} />
            {pesosPorLote.map(lote => (
              <Line
                key={lote.lote_id}
                type="monotone"
                dataKey={lote.identificador}
                stroke={lote.color}
                strokeWidth={2}
                dot={{ r: 3, fill: lote.color, style: { cursor: 'pointer' } }}
                activeDot={{ r: 5, onClick: () => onLoteClick && onLoteClick(lote) }}
                connectNulls
              />
            ))}
          </LineChart>
        </ResponsiveContainer>
      )}
    </SectionCard>
  );
};

export default WeightEvolutionChart;
```

- [ ] **Step 2: Commit**

```bash
git add frontend/src/pages/dashboard/WeightEvolutionChart.jsx
git commit -m "feat(dashboard): WeightEvolutionChart con multi-serie y click navega a lote"
```

---

## Task 14: CostBreakdownDonut

**Files:**
- Create: `frontend/src/pages/dashboard/CostBreakdownDonut.jsx`

- [ ] **Step 1: Crear el componente**

Crear `frontend/src/pages/dashboard/CostBreakdownDonut.jsx`:

```jsx
import React from 'react';
import { PieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { SectionCard } from '../../components/ui.jsx';

const fmtBs = (n) => `Bs ${Number(n).toLocaleString('es-BO', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
const fmtBsCompacto = (n) => Math.abs(n) >= 10000 ? `Bs ${(n / 1000).toFixed(1)}k` : fmtBs(n);

const CostBreakdownDonut = ({ costosCategoria }) => {
  const total = (costosCategoria || []).reduce((s, c) => s + c.monto, 0);
  const hayDatos = total > 0;

  // Etiqueta personalizada que muestra % en cada slice
  const renderLabel = ({ cx, cy, midAngle, innerRadius, outerRadius, percent }) => {
    if (percent < 0.06) return null; // no spammear slices chicos
    const RADIAN = Math.PI / 180;
    const r = innerRadius + (outerRadius - innerRadius) * 0.55;
    const x = cx + r * Math.cos(-midAngle * RADIAN);
    const y = cy + r * Math.sin(-midAngle * RADIAN);
    return (
      <text x={x} y={y} fill="#fff" fontSize="12" fontWeight="600" textAnchor={x > cx ? 'start' : 'end'} dominantBaseline="central">
        {`${(percent * 100).toFixed(0)}%`}
      </text>
    );
  };

  return (
    <SectionCard title="Composición de costos">
      {!hayDatos ? (
        <div style={{ height: 260, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-tertiary)', fontSize: '13px' }}>
          Sin costos registrados en este período.
        </div>
      ) : (
        <div style={{ position: 'relative' }}>
          <ResponsiveContainer width="100%" height={260}>
            <PieChart>
              <Pie
                data={costosCategoria}
                dataKey="monto"
                nameKey="categoria"
                cx="50%"
                cy="50%"
                innerRadius={60}
                outerRadius={95}
                paddingAngle={2}
                label={renderLabel}
                labelLine={false}
              >
                {costosCategoria.map((c, i) => <Cell key={i} fill={c.color} />)}
              </Pie>
              <Tooltip
                contentStyle={{ background: 'var(--bg-secondary)', border: '1px solid var(--border-subtle)', borderRadius: '6px', fontSize: '12px' }}
                formatter={(value, name) => [fmtBs(value), name]}
              />
              <Legend
                verticalAlign="bottom"
                wrapperStyle={{ fontSize: '12px', paddingTop: '8px' }}
                formatter={(value) => {
                  const slice = costosCategoria.find(c => c.categoria === value);
                  return `${value} — ${fmtBs(slice.monto)}`;
                }}
              />
            </PieChart>
          </ResponsiveContainer>
          {/* Total absoluto en el centro del donut */}
          <div style={{
            position: 'absolute',
            top: '50%', left: '50%',
            transform: 'translate(-50%, calc(-50% - 28px))',
            textAlign: 'center',
            pointerEvents: 'none',
          }}>
            <div style={{ fontSize: '11px', color: 'var(--text-tertiary)', letterSpacing: '0.05em' }}>TOTAL</div>
            <div style={{ fontSize: '18px', fontWeight: 600, color: 'var(--text-primary)', fontFamily: 'IBM Plex Mono, monospace' }}>{fmtBsCompacto(total)}</div>
          </div>
        </div>
      )}
    </SectionCard>
  );
};

export default CostBreakdownDonut;
```

- [ ] **Step 2: Commit**

```bash
git add frontend/src/pages/dashboard/CostBreakdownDonut.jsx
git commit -m "feat(dashboard): CostBreakdownDonut con total al centro y % en slices"
```

---

## Task 15: IcaBarChart

**Files:**
- Create: `frontend/src/pages/dashboard/IcaBarChart.jsx`

- [ ] **Step 1: Crear el componente**

Crear `frontend/src/pages/dashboard/IcaBarChart.jsx`:

```jsx
import React from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ReferenceLine, Cell, ResponsiveContainer } from 'recharts';
import { SectionCard } from '../../components/ui.jsx';
import { colorIca } from './colors.js';

const IcaBarChart = ({ icaPorLote, onLoteClick }) => {
  // Filtrar lotes sin dato de ICA: no aportan a la visualización.
  const data = (icaPorLote || []).filter(r => r.ica != null);
  const hayDatos = data.length > 0;

  return (
    <SectionCard title="ICA real por lote">
      {!hayDatos ? (
        <div style={{ height: 260, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-tertiary)', fontSize: '13px' }}>
          Aún no hay datos suficientes para calcular el ICA. Necesita pesaje inicial y actual del lote.
        </div>
      ) : (
        <ResponsiveContainer width="100%" height={260}>
          <BarChart data={data} layout="vertical" margin={{ top: 10, right: 30, left: 30, bottom: 10 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--border-subtle)" horizontal={false} />
            <XAxis
              type="number"
              tick={{ fontSize: 11, fill: 'var(--text-tertiary)' }}
              stroke="var(--border-subtle)"
              domain={[0, dataMax => Math.max(4, dataMax + 0.5)]}
            />
            <YAxis
              type="category"
              dataKey="identificador"
              tick={{ fontSize: 11, fill: 'var(--text-secondary)', fontFamily: 'IBM Plex Mono, monospace' }}
              stroke="var(--border-subtle)"
              width={120}
            />
            <Tooltip
              contentStyle={{ background: 'var(--bg-secondary)', border: '1px solid var(--border-subtle)', borderRadius: '6px', fontSize: '12px' }}
              formatter={(value, name, props) => [
                `${value} (${props.payload.kg_alimento.toFixed(0)} kg alim / ${props.payload.kg_ganancia.toFixed(0)} kg gan)`,
                'ICA',
              ]}
            />
            <ReferenceLine x={2.5} stroke="#666" strokeDasharray="3 3"
              label={{ value: 'Ideal 2.5', position: 'top', fill: '#666', fontSize: 10 }} />
            <Bar dataKey="ica" radius={[0, 4, 4, 0]} onClick={(d) => onLoteClick && onLoteClick(d)} style={{ cursor: 'pointer' }}>
              {data.map((entry, i) => (
                <Cell key={i} fill={colorIca(entry.status)} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      )}
    </SectionCard>
  );
};

export default IcaBarChart;
```

- [ ] **Step 2: Commit**

```bash
git add frontend/src/pages/dashboard/IcaBarChart.jsx
git commit -m "feat(dashboard): IcaBarChart con benchmark 2.5 y semáforo por status"
```

---

## Task 16: MortalitySeriesChart

**Files:**
- Create: `frontend/src/pages/dashboard/MortalitySeriesChart.jsx`

- [ ] **Step 1: Crear el componente**

Crear `frontend/src/pages/dashboard/MortalitySeriesChart.jsx`:

```jsx
import React from 'react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { SectionCard } from '../../components/ui.jsx';
import { colorParaLote } from './colors.js';

const formatMes = (mes) => {
  // mes viene como 'YYYY-MM'
  const [y, m] = mes.split('-');
  const d = new Date(Number(y), Number(m) - 1, 1);
  return d.toLocaleDateString('es-BO', { month: 'short', year: '2-digit' });
};

const MortalitySeriesChart = ({ mortandadSerie }) => {
  const data = mortandadSerie || [];
  // Identificadores de lote = keys distintas a 'mes'
  const lotes = data.length > 0
    ? Array.from(new Set(data.flatMap(d => Object.keys(d).filter(k => k !== 'mes'))))
    : [];

  if (data.length === 0 || lotes.length === 0) {
    return (
      <SectionCard title="Mortandad acumulada">
        <div style={{ height: 260, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-tertiary)', fontSize: '13px', textAlign: 'center', padding: '0 16px' }}>
          Sin bajas registradas — todos los lotes en buena salud.
        </div>
      </SectionCard>
    );
  }

  return (
    <SectionCard title="Mortandad acumulada">
      <ResponsiveContainer width="100%" height={260}>
        <AreaChart data={data} margin={{ top: 10, right: 20, left: 0, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="var(--border-subtle)" vertical={false} />
          <XAxis
            dataKey="mes"
            tickFormatter={formatMes}
            tick={{ fontSize: 11, fill: 'var(--text-tertiary)' }}
            stroke="var(--border-subtle)"
          />
          <YAxis
            tick={{ fontSize: 11, fill: 'var(--text-tertiary)' }}
            stroke="var(--border-subtle)"
            allowDecimals={false}
            label={{ value: 'bajas acum.', angle: -90, position: 'insideLeft', style: { fontSize: 11, fill: 'var(--text-tertiary)' } }}
          />
          <Tooltip
            contentStyle={{ background: 'var(--bg-secondary)', border: '1px solid var(--border-subtle)', borderRadius: '6px', fontSize: '12px' }}
            labelFormatter={formatMes}
          />
          <Legend wrapperStyle={{ fontSize: '12px', paddingTop: '8px' }} />
          {lotes.map((ident, i) => (
            <Area
              key={ident}
              type="monotone"
              dataKey={ident}
              stackId="1"
              stroke={colorParaLote(i)}
              fill={colorParaLote(i)}
              fillOpacity={0.4}
            />
          ))}
        </AreaChart>
      </ResponsiveContainer>
    </SectionCard>
  );
};

export default MortalitySeriesChart;
```

- [ ] **Step 2: Commit**

```bash
git add frontend/src/pages/dashboard/MortalitySeriesChart.jsx
git commit -m "feat(dashboard): MortalitySeriesChart con área apilada por lote"
```

---

## Task 17: LotesActivosTable con sparkline

**Files:**
- Create: `frontend/src/pages/dashboard/LotesActivosTable.jsx`

- [ ] **Step 1: Crear el componente**

Crear `frontend/src/pages/dashboard/LotesActivosTable.jsx`:

```jsx
import React from 'react';
import { LineChart, Line, ResponsiveContainer } from 'recharts';
import { Btn, MoneyDisplay } from '../../components/ui.jsx';
import { colorIca, colorParaLote } from './colors.js';

const Sparkline = ({ values, color }) => {
  if (!values || values.length < 2) {
    return <span style={{ fontSize: '11px', color: 'var(--text-tertiary)' }}>—</span>;
  }
  const data = values.map((v, i) => ({ i, v }));
  return (
    <div style={{ width: 80, height: 26 }}>
      <ResponsiveContainer>
        <LineChart data={data}>
          <Line type="monotone" dataKey="v" stroke={color} strokeWidth={1.5} dot={false} isAnimationActive={false} />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
};

const LotesActivosTable = ({ lotes, onLoteClick }) => {
  const accent = 'var(--accent-agro)';
  return (
    <div style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border-subtle)', borderRadius: '8px', overflow: 'hidden' }}>
      <div style={{ padding: '14px 20px', borderBottom: '1px solid var(--border-subtle)' }}>
        <span style={{ fontSize: '13px', fontWeight: 500, color: 'var(--text-primary)' }}>Lotes activos</span>
      </div>
      <div style={{
        display: 'grid',
        gridTemplateColumns: '1fr 70px 70px 90px 110px 90px 80px 90px',
        padding: '8px 20px',
        borderBottom: '1px solid var(--border-subtle)',
        gap: '8px',
        fontSize: '11px',
        color: 'var(--text-tertiary)',
        fontWeight: 500,
      }}>
        <span>Lote</span>
        <span>Tipo</span>
        <span style={{ textAlign: 'right' }}>Días</span>
        <span style={{ textAlign: 'right' }}>Animales</span>
        <span style={{ textAlign: 'right' }}>Costo total</span>
        <span style={{ textAlign: 'center' }}>Tendencia</span>
        <span style={{ textAlign: 'right' }}>ICA</span>
        <span></span>
      </div>
      {(!lotes || lotes.length === 0) ? (
        <div style={{ padding: '24px', textAlign: 'center', color: 'var(--text-tertiary)', fontSize: '13px' }}>No hay lotes activos.</div>
      ) : (
        lotes.map((l, i) => {
          const sparkColor = colorParaLote(i);
          const icaTxt = l.ica != null ? l.ica.toFixed(2) : '—';
          const icaStatus = l.ica == null ? 'sin_dato' : l.ica <= 3.0 ? 'bueno' : l.ica <= 3.5 ? 'aceptable' : 'malo';
          return (
            <div
              key={l.id}
              style={{
                display: 'grid',
                gridTemplateColumns: '1fr 70px 70px 90px 110px 90px 80px 90px',
                padding: '10px 20px',
                borderBottom: i < lotes.length - 1 ? '1px solid var(--border-subtle)' : 'none',
                gap: '8px',
                alignItems: 'center',
                cursor: 'pointer',
                transition: 'background 0.1s',
              }}
              onMouseEnter={e => e.currentTarget.style.background = 'var(--bg-tertiary)'}
              onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
              onClick={() => onLoteClick && onLoteClick(l)}
            >
              <span style={{ fontSize: '13px', fontWeight: 500, color: 'var(--text-primary)', fontFamily: 'IBM Plex Mono, monospace' }}>{l.identificador}</span>
              <span style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>{l.tipo_animal}</span>
              <span style={{ textAlign: 'right', fontFamily: 'IBM Plex Mono, monospace', fontSize: '13px', color: 'var(--text-secondary)' }}>{l.dias}d</span>
              <span style={{ textAlign: 'right', fontFamily: 'IBM Plex Mono, monospace', fontSize: '13px', color: 'var(--text-primary)' }}>{l.cabezas_activas} cab.</span>
              <div style={{ textAlign: 'right' }}><MoneyDisplay value={l.costo_total} size="sm" /></div>
              <div style={{ display: 'flex', justifyContent: 'center' }}>
                <Sparkline values={l.pesajes_recientes} color={sparkColor} />
              </div>
              <span style={{ textAlign: 'right', fontFamily: 'IBM Plex Mono, monospace', fontSize: '13px', fontWeight: 600, color: colorIca(icaStatus) }}>{icaTxt}</span>
              <div onClick={e => e.stopPropagation()}>
                <Btn variant="ghost" size="sm" accentColor={accent} onClick={() => onLoteClick && onLoteClick(l)}>Ver →</Btn>
              </div>
            </div>
          );
        })
      )}
    </div>
  );
};

export default LotesActivosTable;
```

- [ ] **Step 2: Commit**

```bash
git add frontend/src/pages/dashboard/LotesActivosTable.jsx
git commit -m "feat(dashboard): LotesActivosTable con sparkline de peso y ICA por lote"
```

---

# Phase 5 — Composición y wiring

## Task 18: Extender App.jsx para navegar a Hoja de Vida con lote

**Files:**
- Modify: `frontend/src/App.jsx`

- [ ] **Step 1: Localizar el `navigate` en App.jsx**

Abrir `frontend/src/App.jsx`. La función está en líneas 121-124:

```js
const navigate = (p, opts) => {
  if (opts?.productoId) setActiveProductoId(opts.productoId);
  setPage(p);
};
```

- [ ] **Step 2: Extender `navigate` para aceptar `opts.lote`**

Reemplazar esa función por:

```js
const navigate = (p, opts) => {
  if (opts?.productoId) setActiveProductoId(opts.productoId);
  if (opts?.lote) setActiveLote(opts.lote);
  setPage(p);
};
```

- [ ] **Step 3: Verificar que el archivo sigue válido (la app debe seguir corriendo)**

```bash
# Recargar Vite (el contenedor frontend hace HMR)
docker compose logs --tail=10 frontend
```
Expected: no errores, HMR updates loggeado.

- [ ] **Step 4: Commit**

```bash
git add frontend/src/App.jsx
git commit -m "feat(navigate): aceptar opts.lote para drill-down al detalle del lote"
```

---

## Task 19: Crear DashboardAgro componiendo todos los widgets

**Files:**
- Create: `frontend/src/pages/dashboard/DashboardAgro.jsx`

- [ ] **Step 1: Crear el componente**

Crear `frontend/src/pages/dashboard/DashboardAgro.jsx`:

```jsx
import React, { useState, useEffect, useCallback } from 'react';
import { RubroBadge, Btn, SectionCard, StatusBadge, InfoTip } from '../../components/ui.jsx';
import { Icon } from '../../icons.jsx';
import { apiFetch } from '../../config/api.js';
import RangoSelector from './RangoSelector.jsx';
import KpiRow from './KpiRow.jsx';
import WeightEvolutionChart from './WeightEvolutionChart.jsx';
import CostBreakdownDonut from './CostBreakdownDonut.jsx';
import IcaBarChart from './IcaBarChart.jsx';
import MortalitySeriesChart from './MortalitySeriesChart.jsx';
import LotesActivosTable from './LotesActivosTable.jsx';

const timeAgo = (dateStr) => {
  if (!dateStr) return '—';
  const diff = Date.now() - new Date(dateStr).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 60) return `hace ${m || 1}m`;
  const h = Math.floor(m / 60);
  if (h < 24) return `hace ${h}h`;
  return `hace ${Math.floor(h / 24)}d`;
};

const DashboardAgro = ({ negocio, onNavigate }) => {
  const accentColor = 'var(--accent-agro)';
  const [rango, setRango] = useState('30d');
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    apiFetch(`/api/negocios/${negocio.id}/dashboard?rango=${rango}`)
      .then(setData)
      .catch(e => console.error('dashboard fetch error:', e))
      .finally(() => setLoading(false));
  }, [negocio.id, rango]);

  // Click en lote (chart o tabla) -> navega a su hoja de vida.
  // `activeLote` en App.jsx espera { _id, id, tipo, ... }, donde _id es el UUID
  // y `id` es el identificador human-readable.
  const handleLoteClick = useCallback((lote) => {
    const id = lote.lote_id || lote.id;
    const identificador = lote.identificador || lote.id;
    onNavigate('hojavida', { lote: { _id: id, id: identificador, tipo: lote.tipo_animal || 'Cerdo' } });
  }, [onNavigate]);

  const kpis = data?.kpis;
  const ultimo = data?.ultimo_liquidado;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '12px' }}>
        <div>
          <div style={{ fontSize: '22px', fontWeight: 400, color: 'var(--text-primary)', letterSpacing: '-0.02em', marginBottom: '4px' }}>{negocio.nombre}</div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <RubroBadge rubro={negocio.rubro} />
            <span style={{ fontSize: '13px', color: 'var(--text-tertiary)' }}>Temporada 2026</span>
          </div>
        </div>
        <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
          <RangoSelector value={rango} onChange={setRango} />
          <Btn onClick={() => onNavigate('lotes')} accentColor={accentColor} icon="plus">Registrar lote</Btn>
        </div>
      </div>

      {/* KPI row */}
      <KpiRow kpis={kpis || { lotes_activos: 0, cabezas_activas: 0, mortandad_pct: 0, costo_total: 0, costo_por_cabeza: 0, ica_promedio: null }} loading={loading} />

      {/* Charts grid 2x2 */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '16px' }}>
        <WeightEvolutionChart pesosPorLote={data?.pesos_por_lote || []} onLoteClick={handleLoteClick} />
        <CostBreakdownDonut costosCategoria={data?.costos_categoria || []} />
        <IcaBarChart icaPorLote={data?.ica_por_lote || []} onLoteClick={handleLoteClick} />
        <MortalitySeriesChart mortandadSerie={data?.mortandad_serie || []} />
      </div>

      {/* Tabla de lotes activos */}
      <LotesActivosTable lotes={data?.lotes_resumen || []} onLoteClick={handleLoteClick} />

      {/* Último lote cerrado (condicional) */}
      {ultimo && ultimo.liquidacion_jsonb && (() => {
        const liq = ultimo.liquidacion_jsonb;
        const utilidad = parseFloat(liq.utilidad);
        const margen = liq.margen != null ? parseFloat(liq.margen) : null;
        const escenario_label = liq.escenario === 'pie' ? 'Venta en pie' : 'Venta gancho';
        const fechaCierre = new Date(liq.liquidado_en).toLocaleDateString('es-BO', { day: '2-digit', month: 'short', year: 'numeric' });
        return (
          <div style={{ background: 'var(--bg-secondary)', border: `1px solid ${accentColor}33`, borderRadius: '8px', overflow: 'hidden' }}>
            <div style={{ padding: '12px 20px', borderBottom: `1px solid ${accentColor}22`, background: accentColor + '08', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <span style={{ fontSize: '13px', fontWeight: 500, color: 'var(--text-primary)' }}>Último lote cerrado</span>
                <InfoTip text="Resultado del último lote liquidado." />
              </div>
              <Btn variant="ghost" size="sm" icon="arrowRight" onClick={() => onNavigate('lotes')}>Ver lotes</Btn>
            </div>
            <div style={{ padding: '16px 20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '20px', flexWrap: 'wrap' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                  <span style={{ fontSize: '14px', fontWeight: 600, color: 'var(--text-primary)', fontFamily: 'IBM Plex Mono, monospace' }}>#{ultimo.identificador}</span>
                  <StatusBadge label={ultimo.tipo_animal} color={accentColor} />
                  <span style={{ padding: '2px 8px', borderRadius: '4px', fontSize: '11px', fontWeight: 600, color: accentColor, background: accentColor + '18', border: `1px solid ${accentColor}33` }}>{escenario_label}</span>
                </div>
                <span style={{ fontSize: '12px', color: 'var(--text-tertiary)' }}>Cerrado el {fechaCierre} · {liq.cabezas_venta} cab. · {liq.peso_prom_final} kg/cab promedio</span>
              </div>
              <div style={{ display: 'flex', gap: '28px', flexWrap: 'wrap' }}>
                {[
                  { label: 'Ingreso total', val: `Bs ${parseFloat(liq.ingreso).toLocaleString('es-BO', { minimumFractionDigits: 0 })}`, color: 'var(--text-primary)' },
                  { label: 'Utilidad neta', val: `${utilidad >= 0 ? '+' : ''}Bs ${utilidad.toLocaleString('es-BO', { minimumFractionDigits: 0 })}`, color: utilidad >= 0 ? 'var(--accent-success)' : 'var(--accent-danger)' },
                  { label: 'Margen s/ ingreso', val: margen != null ? `${margen.toFixed(1)}%` : '—', color: margen != null && margen >= 0 ? 'var(--accent-success)' : 'var(--accent-danger)' },
                ].map((m, i) => (
                  <div key={i} style={{ display: 'flex', flexDirection: 'column', gap: '2px', textAlign: 'right' }}>
                    <span style={{ fontSize: '10px', color: 'var(--text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>{m.label}</span>
                    <span style={{ fontFamily: 'IBM Plex Mono, monospace', fontSize: '16px', fontWeight: 600, color: m.color }}>{m.val}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        );
      })()}

      {/* Actividad reciente */}
      <SectionCard title="Actividad reciente">
        {loading ? (
          <div style={{ fontSize: '13px', color: 'var(--text-tertiary)' }}>Cargando...</div>
        ) : (data?.actividad_reciente?.length || 0) === 0 ? (
          <div style={{ fontSize: '13px', color: 'var(--text-tertiary)' }}>Sin actividad reciente.</div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {data.actividad_reciente.map((item, i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <div style={{ width: 28, height: 28, borderRadius: '6px', background: 'var(--accent-success)1A', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <Icon name="plus" size={13} style={{ color: 'var(--accent-success)' }} />
                </div>
                <div style={{ flex: 1, fontSize: '13px', color: 'var(--text-secondary)' }}>{item.texto}</div>
                <div style={{ fontSize: '11px', color: 'var(--text-tertiary)', whiteSpace: 'nowrap' }}>{timeAgo(item.fecha)}</div>
              </div>
            ))}
          </div>
        )}
      </SectionCard>
    </div>
  );
};

export default DashboardAgro;
```

- [ ] **Step 2: Commit**

```bash
git add frontend/src/pages/dashboard/DashboardAgro.jsx
git commit -m "feat(dashboard): componer DashboardAgro con grilla 2x2 + tabla + ultimo + actividad"
```

---

## Task 20: Adelgazar Dashboard.jsx para que use el nuevo DashboardAgro

**Files:**
- Modify: `frontend/src/pages/Dashboard.jsx`

- [ ] **Step 1: Leer el archivo actual para conocer el `DashboardIndustrial`**

Abrir `frontend/src/pages/Dashboard.jsx` y verificar que el componente `DashboardIndustrial` (líneas 6-193) no haga falta tocar.

- [ ] **Step 2: Reescribir Dashboard.jsx eliminando el agro inline**

Reemplazar el contenido COMPLETO de `frontend/src/pages/Dashboard.jsx` por:

```jsx
import React, { useState } from 'react';
import { Icon } from '../icons.jsx';
import { RubroBadge, Btn, MetricCard, MoneyDisplay, StatusBadge, SectionCard, InfoTip } from '../components/ui.jsx';
import { apiFetch } from '../config/api.js';
import DashboardAgro from './dashboard/DashboardAgro.jsx';

/* ── INDUSTRIAL dashboard ─────────────────────────────────── */
const DashboardIndustrial = ({ negocio, onNavigate }) => {
  const negocioId = negocio.id;
  const accentColor = 'var(--accent-industrial)';

  const [ultimasFichas, setUltimasFichas] = useState([]);
  const [metricas, setMetricas] = useState({
    productos: 0,
    insumos: 0,
    ultimaFicha: 'Ninguna',
    ultimaFichaProd: '—',
    productosSinFicha: '—',
    fichasEsteMes: '—',
    actividad: []
  });

  const currentMonthText = React.useMemo(() => new Date().toLocaleDateString('es-BO', { month: 'long', year: 'numeric' }), []);

  React.useEffect(() => {
    Promise.all([
      apiFetch(`/api/negocios/${negocioId}/productos`),
      apiFetch(`/api/negocios/${negocioId}/insumos?activo=all`),
      apiFetch(`/api/negocios/${negocioId}/fichas`)
    ]).then(([prod, ins, fichas]) => {
      const timeAgo = (dateStr) => {
        if (!dateStr) return '—';
        const diff = Date.now() - new Date(dateStr).getTime();
        const m = Math.floor(diff / 60000);
        if (m < 60) return `hace ${m || 1}m`;
        const h = Math.floor(m / 60);
        if (h < 24) return `hace ${h}h`;
        return `hace ${Math.floor(h/24)}d`;
      };

      const sortedFichas = (fichas || []).sort((a,b) => new Date(b.calculado_en) - new Date(a.calculado_en));
      const uFicha = sortedFichas[0];

      let allActivities = [];
      (fichas || []).forEach(f => {
        allActivities.push({
          icon: 'calculator',
          text: `Ficha calculada: ${f.producto_nombre}`,
          date: new Date(f.calculado_en),
          time: timeAgo(f.calculado_en),
          color: 'var(--accent-industrial)'
        });
      });
      (prod || []).forEach(p => {
        if (p.created_at) {
          allActivities.push({
            icon: 'package',
            text: `Producto registrado: ${p.nombre}`,
            date: new Date(p.created_at),
            time: timeAgo(p.created_at),
            color: 'var(--accent-success)'
          });
        }
      });
      (ins || []).forEach(i => {
        if (i.created_at) {
          allActivities.push({
            icon: 'plus',
            text: `Insumo agregado: ${i.nombre}`,
            date: new Date(i.created_at),
            time: timeAgo(i.created_at),
            color: 'var(--text-secondary)'
          });
        }
      });

      allActivities.sort((a, b) => b.date - a.date);
      const topActivities = allActivities.slice(0, 4);

      const prodActivos = (prod || []).filter(p => p.activo !== false);
      const productosConFicha = new Set((fichas || []).map(f => f.producto_id));
      const sinFicha = prodActivos.filter(p => !productosConFicha.has(p.id)).length;

      const now = new Date();
      const fichasMes = (fichas || []).filter(f => {
        const d = new Date(f.calculado_en);
        return d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth();
      }).length;

      setMetricas({
        productos: prod.length,
        insumos: ins.length,
        ultimaFicha: uFicha ? timeAgo(uFicha.calculado_en) : 'Ninguna',
        ultimaFichaProd: uFicha ? uFicha.producto_nombre : '—',
        productosSinFicha: sinFicha,
        fichasEsteMes: fichasMes,
        actividad: topActivities.length > 0 ? topActivities : [{ icon: 'info', text: 'No hay actividad reciente', time: '', color: 'var(--text-tertiary)' }]
      });

      const fichasMapeadas = sortedFichas.slice(0, 4).map(f => {
        const p = prod.find(pr => pr.id === f.producto_id);
        const costoUnit = parseFloat(f.costo_unitario_total || 0);
        return {
          id: f.id,
          producto_id: f.producto_id,
          nombre: f.producto_nombre || (p ? p.nombre : 'Desconocido'),
          sku: (p && p.codigo_sku) ? p.codigo_sku : 'Sin SKU',
          costoUnit,
          fichaReciente: true
        };
      });
      setUltimasFichas(fichasMapeadas);

    }).catch(e => console.error(e));
  }, [negocioId]);


  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <div style={{ fontSize: '22px', fontWeight: 400, color: 'var(--text-primary)', letterSpacing: '-0.02em', marginBottom: '4px' }}>{negocio.nombre}</div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <RubroBadge rubro={negocio.rubro} />
            <span style={{ fontSize: '13px', color: 'var(--text-tertiary)' }}>Temporada 2026</span>
          </div>
        </div>
        <Btn onClick={() => onNavigate('fichas')} accentColor={accentColor} icon="plus">Nueva ficha de costo</Btn>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '12px' }}>
        <MetricCard label="Productos" value={metricas.productos} sub="con receta activa" icon={<Icon name="package" size={16} />} accentColor={accentColor} mono={false} />
        <MetricCard label="Insumos registrados" value={metricas.insumos} sub="en el catálogo" icon={<Icon name="layers" size={16} />} mono={false} />
        <MetricCard label="Última ficha calculada" value={metricas.ultimaFicha} sub={metricas.ultimaFichaProd} icon={<Icon name="history" size={16} />} mono={false} />
        <MetricCard label="Productos sin ficha" value={metricas.productosSinFicha} sub="sin costo calculado" icon={<Icon name="trendingUp" size={16} />} accentColor={accentColor} mono={false} />
      </div>

      <div style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border-subtle)', borderRadius: '8px', overflow: 'hidden' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '14px 20px', borderBottom: '1px solid var(--border-subtle)' }}>
          <span style={{ fontSize: '13px', fontWeight: 500, color: 'var(--text-primary)' }}>Productos — últimas fichas</span>
          <Btn variant="ghost" size="sm" icon="arrowRight" onClick={() => onNavigate('productos')}>Ver todos</Btn>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 120px 100px 120px', padding: '8px 20px', borderBottom: '1px solid var(--border-subtle)', gap: '8px' }}>
          {['Producto', 'Costo unitario', 'Estado ficha', ''].map((h, i) => (
            <div key={i} style={{ fontSize: '11px', color: 'var(--text-tertiary)', letterSpacing: '0.05em', fontWeight: 500, textAlign: i === 1 ? 'right' : 'left' }}>{h}</div>
          ))}
        </div>
        {ultimasFichas.length === 0 ? (
          <div style={{ padding: '24px', textAlign: 'center', color: 'var(--text-tertiary)', fontSize: '13px' }}>No hay fichas de costo calculadas.</div>
        ) : ultimasFichas.map((p, i) => (
          <div key={p.id} style={{ display: 'grid', gridTemplateColumns: '1fr 120px 100px 120px', padding: '12px 20px', borderBottom: i < ultimasFichas.length - 1 ? '1px solid var(--border-subtle)' : 'none', gap: '8px', alignItems: 'center', cursor: 'pointer', transition: 'background 0.1s' }}
            onMouseEnter={e => e.currentTarget.style.background = 'var(--bg-tertiary)'}
            onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
            onClick={() => onNavigate('historial', { fichaId: p.id })}
          >
            <div>
              <div style={{ fontSize: '13px', color: 'var(--text-primary)', fontWeight: 500, marginBottom: '2px' }}>{p.nombre}</div>
              <div style={{ fontSize: '11px', color: 'var(--text-tertiary)', fontFamily: 'IBM Plex Mono, monospace' }}>{p.sku}</div>
            </div>
            <div style={{ textAlign: 'right' }}><MoneyDisplay value={p.costoUnit} size="sm" /></div>
            <div style={{ textAlign: 'right' }}>
              <StatusBadge label={p.fichaReciente ? 'Reciente' : 'Sin ficha'} color={p.fichaReciente ? 'var(--accent-success)' : 'var(--text-tertiary)'} />
            </div>
            <div><Btn variant="ghost" size="sm" accentColor={accentColor} onClick={e => { e.stopPropagation(); onNavigate('historial', { fichaId: p.id }); }}>Ver ficha →</Btn></div>
          </div>
        ))}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
        <SectionCard title="Actividad reciente">
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {metricas.actividad.map((item, i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <div style={{ width: 28, height: 28, borderRadius: '6px', background: item.color + '1A', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <Icon name={item.icon} size={13} style={{ color: item.color }} />
                </div>
                <div style={{ flex: 1, fontSize: '13px', color: 'var(--text-secondary)' }}>{item.text}</div>
                <div style={{ fontSize: '11px', color: 'var(--text-tertiary)', whiteSpace: 'nowrap' }}>{item.time}</div>
              </div>
            ))}
          </div>
        </SectionCard>
        <MetricCard
          label="Fichas calculadas este mes"
          value={metricas.fichasEsteMes}
          sub={currentMonthText}
          icon={<Icon name="calculator" size={16} />}
          accentColor={accentColor}
          mono={false}
        />
      </div>
    </div>
  );
};

const Dashboard = ({ negocio, onNavigate }) => {
  if (!negocio) {
    return (
      <div style={{ display: 'flex', height: '60vh', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ fontSize: '13px', color: 'var(--text-tertiary)' }}>Cargando información del negocio...</div>
      </div>
    );
  }

  const rubro = negocio.rubro || 'industrial';

  return rubro === 'agro_ganadero'
    ? <DashboardAgro negocio={negocio} onNavigate={onNavigate} />
    : <DashboardIndustrial negocio={negocio} onNavigate={onNavigate} />;
};

export default Dashboard;
```

- [ ] **Step 3: Commit**

```bash
git add frontend/src/pages/Dashboard.jsx
git commit -m "feat(dashboard): cablear DashboardAgro nuevo, conservar DashboardIndustrial intacto"
```

---

# Phase 6 — Smoke test y ajustes

## Task 21: Smoke test end-to-end en el navegador

**Files:** ninguno (solo verificación visual)

- [ ] **Step 1: Asegurar que todos los servicios están up**

```bash
cd "C:/Users/Jairo/Documents/Sistema de Costeo Estandar Productivo Universal/equipo13"
docker compose ps
```
Expected: `equipo13-backend`, `equipo13-db`, `equipo13-frontend`, `equipo13-ml` todos Up.

- [ ] **Step 2: Re-ejecutar todos los tests del backend**

```bash
cd backend
node --test tests/*.test.js 2>&1 | tail -10
```
Expected: todos PASS, ningún test rompió.

- [ ] **Step 3: Abrir el dashboard en el navegador**

Abrir manualmente `http://localhost:5173` en el navegador. Login: `gerardo@demo.com` / `demo1234`.

Verificar visualmente que aparece:

- [ ] 4 KPIs arriba (Lotes activos, Animales con `mortandad X%`, Costo total con `Bs/cabeza`, ICA promedio con color).
- [ ] Selector de rango (7d/30d/90d/Todo) en el header funcionando: al cambiarlo, los charts se recargan.
- [ ] **WeightEvolutionChart**: muestra ≥ 2 series con colores distintos.
- [ ] **CostBreakdownDonut**: muestra slices con % y total absoluto al centro.
- [ ] **IcaBarChart**: barras horizontales con línea vertical en `2.5` etiquetada "Ideal 2.5".
- [ ] **MortalitySeriesChart**: muestra área apilada (gracias a las bajas sembradas en Task 9).
- [ ] **LotesActivosTable**: sparkline por fila + ICA real (no "—").
- [ ] **Click en una serie del WeightEvolutionChart** → navega a la Hoja de Vida del lote.
- [ ] **Click en una barra del IcaBarChart** → navega a la Hoja de Vida del lote.
- [ ] **Click en una fila de la tabla** → navega a la Hoja de Vida del lote.
- [ ] Cambiar el negocio a uno industrial → el `DashboardIndustrial` se ve idéntico a antes.

- [ ] **Step 4: Verificar console del navegador**

Abrir DevTools (F12) → Console. Expected: sin errores rojos. Warnings de Recharts (`defaultProps` deprecation en React 18+) son aceptables.

- [ ] **Step 5: Si algo falla en Step 3**

Aplicar el fix correspondiente y volver al Step 3. Antes de cualquier fix, identificar el problema concreto en consola del navegador o en `docker compose logs backend`. Documentar el fix en el commit.

- [ ] **Step 6: Commit final si hubo ajustes**

Si Step 5 requirió cambios:
```bash
git add -A
git commit -m "fix(dashboard): ajustes del smoke test"
```

Si no, no hace falta commit adicional.

---

## Task 22: Documentar cambios y cerrar

**Files:** ninguno

- [ ] **Step 1: Verificar el árbol de commits**

```bash
cd "C:/Users/Jairo/Documents/Sistema de Costeo Estandar Productivo Universal/equipo13"
git log --oneline -25
```
Expected: ver los ~17 commits del plan, todos con prefijo `feat(dashboard):` / `feat(seed):` / `feat(navigate):` / `fix(dashboard):`.

- [ ] **Step 2: Verificación final del estado limpio**

```bash
git status
```
Expected: `nothing to commit, working tree clean`.

- [ ] **Step 3: Listo para la defensa**

El dashboard agro está rediseñado con:
- 4 KPIs incluyendo ICA promedio
- 4 gráficos (pesos, costos, ICA, mortandad)
- Tabla con sparkline + ICA real
- Selector de rango funcional
- Drill-down al click → Hoja de Vida

---

## Apéndice — Rollback rápido si algo se rompe

Si después de cualquier task algo se ve mal en la defensa y necesitás volver al dashboard anterior:

```bash
# Encontrar el commit anterior a la Task 20
git log --oneline | grep "feat(dashboard): cablear DashboardAgro"
# Tomar el hash del commit anterior y:
git revert <hash_del_commit_de_la_Task_20>
```

Eso restaura el dashboard agro inline original sin afectar el endpoint backend (que queda disponible para usar después).
