# Plan de rediseño — Dashboard Agro

**Fecha:** 2026-06-23
**Alcance:** rediseño completo del `DashboardAgro` (solo rubro agro/ganadero). El `DashboardIndustrial` queda intacto.
**Objetivo de defensa:** mostrar de un vistazo evolución de pesos, eficiencia (ICA), composición de costos y mortandad de todos los lotes activos, con drill-down a la Hoja de Vida.

---

## 1. Contexto

### Estado actual

`frontend/src/pages/Dashboard.jsx` → `DashboardAgro` (líneas 195-382):

- 4 métricas: Lotes activos, Animales en engorde, Costo total, Costo/cabeza.
- Tabla de lotes activos con columna **ICA siempre vacía (`—`)**.
- Card de "Último lote cerrado" cuando existe `liquidacion_jsonb`.
- "Actividad reciente" basada en `created_at` de los lotes.
- Sin gráficos ni series temporales.
- Carga datos de un único endpoint: `GET /api/negocios/:id/lotes`.

### Datos disponibles y no explotados

| Tabla | Para qué |
|---|---|
| `pesajes_lote` | Serie temporal de pesos por lote (fecha, peso_prom_kg, origen) |
| `bitacora_lote` | Costos desagregados por categoría (`Alimentación`, `Sanidad / Medicamento`, `Mano de obra`, etc.) con fecha y monto |
| `consumos_lote` | Consumo diario de insumos por lote (cantidad + costo FIFO real) |
| `eventos_operario` | Bajas registradas con fecha (`tipo = 'baja'`) |
| `registro_mermas` | Mermas por lote |
| `lotes.cabezas_inicio` vs `cabezas_activas` | Mortandad acumulada |
| `lotes.costo_adquisicion` | Costo de entrada de animales |

### Componente reusable existente

[`frontend/src/components/MiniLineChart.jsx`](frontend/src/components/MiniLineChart.jsx) — chart SVG simple. **Lo conservamos para sparklines en tabla**; los gráficos grandes pasan a Recharts.

---

## 2. Decisiones de diseño

| Decisión | Elección |
|---|---|
| Rubro objetivo | Solo `agro_ganadero` |
| Alcance | Rediseño completo del `DashboardAgro` |
| Librería de gráficos | **Recharts** (`npm install recharts`) |
| Widgets nuevos | Evolución de pesos · ICA · Composición de costos · Mortandad |
| Rango de tiempo | Selector configurable: 7d / 30d / 90d / Todo (default 30d) |
| Click en serie/lote | Navega a la Hoja de Vida de ese lote |
| Card "Último lote cerrado" + "Actividad reciente" | Se mantienen, reposicionadas |
| Dashboard industrial | Sin cambios |
| Benchmark de ICA | Hardcoded en **2.5** (estándar engorde porcino confinamiento) |

---

## 3. Layout

Grilla principal de 12 columnas con `gap=16px`. Cada fila explicada abajo.

```
┌─ Header: negocio + RubroBadge + selector rango + botón "Registrar lote" ─┐
├─────────────┬────────────┬─────────────┬──────────────────────────────────┤
│ KPI Lotes   │ KPI Animal.│ KPI Costo   │ KPI ICA promedio                 │
│ (#)         │ (% bajas)  │ (Bs/cab)    │ (color vs benchmark 2.5)         │
├─────────────┴────────────┼─────────────┴──────────────────────────────────┤
│ Evolución de pesos       │ Composición de costos                          │
│ (line multi-serie)       │ (donut chart)                                  │
├──────────────────────────┼────────────────────────────────────────────────┤
│ ICA real por lote        │ Mortandad acumulada                            │
│ (horizontal bar +        │ (area chart por mes)                           │
│  línea vertical en 2.5)  │                                                │
├──────────────────────────┴────────────────────────────────────────────────┤
│ Tabla de lotes activos (con sparkline de peso + ICA + click → Hoja Vida)  │
├───────────────────────────────────────────────────────────────────────────┤
│ Último lote cerrado (condicional)                                         │
├───────────────────────────────────────────────────────────────────────────┤
│ Actividad reciente                                                        │
└───────────────────────────────────────────────────────────────────────────┘
```

**Breakpoint mobile (<768px):** las filas de 2 columnas pasan a 1 columna apilada. KPIs pasan de 4 columnas a 2x2.

---

## 4. Widgets — especificación detallada

### 4.1 KPI cards (fila de 4)

Reutilizar `<MetricCard>` existente. Cuatro cards:

| # | Label | Valor | Sub | Color del acento |
|---|---|---|---|---|
| 1 | Lotes activos | `lotes.length` | "en engorde" | `--accent-agro` |
| 2 | Animales en engorde | `Σ cabezas_activas` | "% bajas: X%" | neutro |
| 3 | Costo total acumulado | `Bs X` (formato compacto si > 10k) | "Bs Y/cabeza" | neutro |
| 4 | ICA promedio | `1.85` (2 decimales) | "estándar 2.5" — verde si ≤ benchmark, rojo si > | dinámico según valor |

### 4.2 Gráfico — Evolución de peso por lote

- **Tipo:** Recharts `<LineChart>` con una `<Line>` por lote activo.
- **Eje X:** fecha (formato `dd MMM`).
- **Eje Y:** peso promedio kg.
- **Series:** una por lote, color asignado de paleta `['#2E7D32','#1976D2','#ED6C02','#9C27B0','#0097A7']` cíclica.
- **Datos:** `pesajes_lote` filtrados por rango seleccionado.
- **Punto inicial:** se inyecta sintéticamente `(fecha_entrada, peso_inicial_prom)` para que cada lote arranque visualmente desde día 0.
- **Tooltip:** muestra fecha, peso, ganancia desde último pesaje.
- **Click en una serie:** navega a Hoja de Vida del lote.
- **Empty state:** si no hay pesajes en el rango → mensaje "Sin pesajes registrados en este período".

### 4.3 Gráfico — Composición de costos

- **Tipo:** Recharts `<PieChart>` con `innerRadius` para hacerlo donut.
- **Slices:**
  - Adquisición (suma de `lotes.costo_adquisicion` activos)
  - Alimentación (`bitacora_lote.tipo IN ('Alimentación','Alimento','Concentrado')` — usar `LIKE 'Alim%'` para tolerar variaciones)
  - Sanidad (`tipo = 'Sanidad / Medicamento'`)
  - Mano de obra (`tipo = 'Mano de obra'`)
  - Otros (resto de tipos sumados)
- **Colores fijos:**
  - Adquisición `#6B7280` (gris)
  - Alimentación `#2E7D32` (verde agro)
  - Sanidad `#1976D2` (azul)
  - Mano de obra `#ED6C02` (naranja)
  - Otros `#9CA3AF` (gris claro)
- **Centro del donut:** total acumulado formato `Bs Xk`.
- **Leyenda:** abajo, con `% del total` y monto absoluto.
- **Filtro de rango:** sí, respeta el selector (sumas con `fecha BETWEEN`).

### 4.4 Gráfico — ICA por lote

- **Tipo:** Recharts `<BarChart layout="vertical">`.
- **Eje Y:** identificador de lote.
- **Eje X:** ICA calculado (sin unidad).
- **Color de cada barra:**
  - Verde (`#2E7D32`) si ICA ≤ 2.5
  - Naranja (`#ED6C02`) si 2.5 < ICA ≤ 3.0
  - Rojo (`#D32F2F`) si ICA > 3.0
- **Referencia:** `<ReferenceLine x={2.5} stroke="#666" strokeDasharray="3 3" label="Estándar 2.5" />`.
- **Cálculo del ICA por lote** (helper backend, ver §5.3):
  ```
  ICA = total_kg_alimento_consumido / total_kg_ganancia_lote
  total_kg_ganancia_lote = (peso_actual_prom - peso_inicial_prom) × cabezas_activas
  ```
  - Si `total_kg_ganancia_lote <= 0` → devolver `null` y el lote no aparece (excluido de promedio también).
- **Tooltip:** kg alimento, kg ganancia, ICA.
- **Click en barra:** navega a Hoja de Vida.

### 4.5 Gráfico — Mortandad acumulada

- **Tipo:** Recharts `<AreaChart>` con una serie por lote (apilada).
- **Eje X:** mes (`MMM yyyy`).
- **Eje Y:** número acumulado de bajas.
- **Datos:** `eventos_operario WHERE tipo='baja' AND estado='aplicado'`, agrupado por `DATE_TRUNC('month', created_at)` y `lote_id`, acumulado.
- **Color:** mismo color asignado al lote en el gráfico de pesos (consistencia visual cross-widget).
- **Empty state:** si no hay bajas → card con `"Sin bajas registradas — todos los lotes en buena salud"`.
- **Tooltip:** muestra bajas del mes por lote + total acumulado.

### 4.6 Tabla — Lotes activos (rediseñada)

Mismas columnas que hoy pero con dos cambios:

- **Nueva columna "Tendencia peso"**: `<MiniLineChart>` reducido (~80×24px) con los últimos 8 pesajes del lote.
- **Columna ICA**: ahora muestra el valor real calculado por el backend (formato `1.85` o `—` si no calculable).
- **Click en fila**: navega a `hoja-vida` con `loteId` (hoy va a `lotes` general).

### 4.7 Último lote cerrado

Sin cambios funcionales. Se mueve debajo de la tabla. Mismo layout actual.

### 4.8 Actividad reciente

Sin cambios funcionales. Se mueve al pie del dashboard. Mismo layout actual.

---

## 5. Backend

### 5.1 Nuevo endpoint

```
GET /api/negocios/:negocioId/dashboard?rango=30d
Auth: admin del negocio
```

**Query param `rango`:** `7d` | `30d` | `90d` | `todo`. Default `30d`. Se traduce a un `WHERE fecha >= NOW() - INTERVAL` en SQL.

**Response shape:**
```json
{
  "kpis": {
    "lotes_activos": 3,
    "cabezas_activas": 65,
    "cabezas_inicio": 70,
    "mortandad_pct": 7.14,
    "costo_total": 28450.50,
    "costo_por_cabeza": 437.70,
    "ica_promedio": 1.85
  },
  "pesos_por_lote": [
    {
      "lote_id": "uuid",
      "identificador": "LOTE-CERD-001",
      "color": "#2E7D32",
      "puntos": [
        { "fecha": "2026-05-25", "peso": 8.5 },
        { "fecha": "2026-06-09", "peso": 14.2 },
        { "fecha": "2026-06-24", "peso": 20.0 }
      ]
    }
  ],
  "costos_categoria": [
    { "categoria": "Adquisición",  "monto": 12000, "color": "#6B7280" },
    { "categoria": "Alimentación", "monto": 11200, "color": "#2E7D32" },
    { "categoria": "Sanidad",      "monto":  3200, "color": "#1976D2" },
    { "categoria": "Mano de obra", "monto":  1800, "color": "#ED6C02" },
    { "categoria": "Otros",        "monto":   250, "color": "#9CA3AF" }
  ],
  "ica_por_lote": [
    {
      "lote_id": "uuid",
      "identificador": "LOTE-CERD-001",
      "ica": 1.78,
      "kg_alimento": 1320,
      "kg_ganancia": 741.5,
      "status": "bueno"   // bueno | aceptable | malo
    }
  ],
  "mortandad_serie": [
    { "mes": "2026-04", "LOTE-CERD-001": 1, "LOTE-CERD-002": 0 },
    { "mes": "2026-05", "LOTE-CERD-001": 2, "LOTE-CERD-002": 1 }
  ],
  "lotes_resumen": [
    {
      "id": "uuid",
      "identificador": "LOTE-CERD-001",
      "tipo_animal": "Cerdo",
      "dias": 30,
      "cabezas_activas": 48,
      "cabezas_inicio": 50,
      "costo_total": 18420,
      "ica": 1.78,
      "pesajes_recientes": [8.5, 12.1, 14.2, 17.5, 20.0]
    }
  ],
  "ultimo_liquidado": null,    // o el objeto liquidacion_jsonb existente
  "actividad_reciente": [
    { "tipo": "lote_creado", "texto": "...", "fecha": "..." }
  ]
}
```

### 5.2 Nuevo controller

`backend/src/controllers/dashboardController.js` — un único `getDashboard(req, res)` que orquesta 6 queries en paralelo (`Promise.all`) y compone la respuesta. Mantiene la convención existente del proyecto (queries SQL crudas con `pool`).

### 5.3 Helpers de cálculo

Inline en el controller (no merece módulo separado a esta escala):

- **`calcularICA(loteId, fechaDesde, fechaHasta)`**:
  ```sql
  SELECT SUM(rdi.cantidad) FILTER (WHERE i.unidad_id = (SELECT id FROM unidades_medida WHERE simbolo = 'kg'))
  FROM registro_diario_item rdi
  JOIN registro_diario_lote rdl ON rdl.id = rdi.registro_diario_id
  JOIN insumos i ON i.id = rdi.insumo_id
  JOIN categorias_insumos c ON c.id = i.categoria_id
  WHERE rdl.lote_id = $1
    AND rdl.confirmado = TRUE
    AND c.tipo = 'alimento'
    AND rdl.fecha BETWEEN $2 AND $3
  ```
  Luego: `kg_ganancia = (peso_actual - peso_inicial) * cabezas_activas`.
  ICA = ratio. `status`: `bueno` ≤ 2.5, `aceptable` ≤ 3.0, `malo` > 3.0.

- **`mortandadSerieByMes(negocioId, fechaDesde)`**:
  ```sql
  SELECT lote_id, DATE_TRUNC('month', created_at)::date AS mes, COUNT(*) AS bajas
  FROM eventos_operario
  WHERE negocio_id = $1 AND tipo = 'baja' AND estado = 'aplicado' AND created_at >= $2
  GROUP BY lote_id, mes
  ORDER BY mes
  ```
  Acumulado per-lote en JS antes de pivotar a la forma `{mes, LOTE-001: 2, ...}`.

### 5.4 Ruta

En `backend/src/routes/negocio.js`:
```js
import { getDashboard } from '../controllers/dashboardController.js';
// ...
router.get('/:negocioId/dashboard', authMiddleware, negocioOwner, getDashboard);
```

---

## 6. Frontend

### 6.1 Estructura de archivos nueva

```
frontend/src/pages/Dashboard.jsx                     ← se reduce; queda como router
frontend/src/pages/dashboard/
  ├── DashboardAgro.jsx                              ← nuevo, reemplaza el inline
  ├── DashboardIndustrial.jsx                        ← se mueve aquí sin cambios
  ├── components/
  │   ├── RangoSelector.jsx
  │   ├── KpiRow.jsx
  │   ├── WeightEvolutionChart.jsx
  │   ├── CostBreakdownDonut.jsx
  │   ├── IcaBarChart.jsx
  │   ├── MortalitySeriesChart.jsx
  │   ├── LotesActivosTable.jsx
  │   └── colors.js                                  ← paleta agro fija
```

El `Dashboard.jsx` queda con sólo el switch de rubro (≤30 líneas).

### 6.2 Hook de datos

Un único hook local `useDashboardAgro(negocioId, rango)` dentro de `DashboardAgro.jsx`:
- `useState` para `data`, `loading`, `error`, `rango`.
- `useEffect` con dependencia `[negocioId, rango]` → `apiFetch('/dashboard?rango=...')`.
- Retorna `{ data, loading, error, rango, setRango }`.

### 6.3 Selector de rango

Componente `<RangoSelector value onChange />` — 4 botones tipo tab. Persiste solo en estado de React (no localStorage, no URL — YAGNI para mañana).

### 6.4 Recharts — configuración estándar

Cada widget usa `<ResponsiveContainer width="100%" height={260}>`. Componer con:
- `<Tooltip contentStyle={{ background: 'var(--bg-secondary)', border: '1px solid var(--border-subtle)' }}>` para coherencia con el theme.
- `<CartesianGrid strokeDasharray="3 3" stroke="var(--border-subtle)" vertical={false}>`.
- `<XAxis />` y `<YAxis />` con `tick={{ fontSize: 11, fill: 'var(--text-tertiary)' }}`.

### 6.5 Navegación al click

Recharts expone `onClick` en `<Line>`, `<Bar>`, etc. con payload del datum. Handler:
```js
const handleSerieClick = (loteId) => onNavigate('hoja-vida', { loteId });
```
La ruta `hoja-vida` debe existir o reusar la que ya navega a la hoja del lote (verificar en `AppLayout.jsx` el routing actual).

---

## 7. Seeder — incrementos para una demo presentable

`backend/seeds/engorde_porcino.js`:

1. **Bajas distribuidas en el tiempo** para que la gráfica de mortandad no esté plana ni vacía. Cada lote genera 1-3 eventos `baja` en `eventos_operario` con `created_at` espaciado a lo largo del período del lote (en lugar del actual único evento en LOTE-CERD-003).
2. **Verificar que el lote `LOTE-CERD-001` tenga `peso_inicial_prom` < `peso_actual_prom`** para que el ICA sea calculable (ya cumple: 8.5 → 20.0).
3. **Confirmar que los `pesajes_lote` sembrados tienen al menos 3 puntos por lote** en el rango de 30 días (sino la gráfica de evolución se ve pobre). Si hace falta, agregar pesajes intermedios.

---

## 8. Tareas (orden de implementación)

| # | Tarea | Archivo(s) | Estimado |
|---|---|---|---|
| 1 | Crear `dashboardController.js` con `getDashboard` y helpers | `backend/src/controllers/dashboardController.js` | 60min |
| 2 | Registrar ruta en `negocio.js` | `backend/src/routes/negocio.js` | 5min |
| 3 | Probar endpoint con curl: KPIs, pesos, costos, ICA, mortandad | — | 15min |
| 4 | Mejorar seeder: bajas distribuidas + pesajes adicionales si hace falta | `backend/seeds/engorde_porcino.js` | 20min |
| 5 | `npm install recharts` en `frontend/` | `frontend/package.json` | 2min |
| 6 | Crear estructura `frontend/src/pages/dashboard/` y mover el `DashboardIndustrial` sin tocar | nuevos archivos | 10min |
| 7 | Implementar `colors.js`, `RangoSelector`, `KpiRow` | `dashboard/components/` | 20min |
| 8 | Implementar `WeightEvolutionChart` | `WeightEvolutionChart.jsx` | 30min |
| 9 | Implementar `CostBreakdownDonut` | `CostBreakdownDonut.jsx` | 20min |
| 10 | Implementar `IcaBarChart` con `ReferenceLine` | `IcaBarChart.jsx` | 25min |
| 11 | Implementar `MortalitySeriesChart` | `MortalitySeriesChart.jsx` | 25min |
| 12 | Implementar `LotesActivosTable` con sparkline | `LotesActivosTable.jsx` | 25min |
| 13 | Componer `DashboardAgro.jsx` con grilla + hook de datos | `DashboardAgro.jsx` | 30min |
| 14 | Validar drill-down al click → Hoja de Vida (verificar ruta existente) | — | 10min |
| 15 | Smoke test visual y ajustes de colores/espaciado | — | 20min |

**Estimado total:** ~5 horas de trabajo enfocado.

---

## 9. Riesgos y mitigaciones

| Riesgo | Mitigación |
|---|---|
| Categoría "Alimentación" en `bitacora_lote` puede tener nombres variados | Usar `LIKE 'Alim%'` en SQL, y mostrar el conteo de "Otros" para detectar gaps. |
| Recharts puede chocar con React 19 | Verificar peer deps en `npm install`; fallback a Chart.js si falla. |
| Click en serie de Recharts es por punto, no por línea entera | Aceptable: el tooltip ya identifica el lote, click en cualquier punto navega. |
| ICA no calculable si peso_actual = peso_inicial (lote nuevo) | Devolver `null`, excluir del promedio y mostrar `—` en la tabla. |
| Rango "todo" puede traer cientos de pesajes en un futuro | Para la demo no es problema (4 lotes, ~10 pesajes c/u). Cap en backend a 365d si llegara a serlo. |

---

## 10. Fuera de alcance (NO se hace en esta iteración)

- Forecast/proyección de fecha de venta (toca el ML service).
- Top insumos consumidos del mes.
- Alertas de stock bajo y tareas vencidas en el dashboard.
- Modo "filtrar dashboard por lote individual" (drill-down a Hoja de Vida cubre la necesidad).
- Lifting del dashboard industrial.
- Persistencia del `rango` en URL o localStorage.
- Refresh automático del dashboard (polling/WebSocket).

---

## 11. Criterios de aceptación

- [ ] `GET /api/negocios/:id/dashboard?rango=30d` responde con la shape descrita en §5.1.
- [ ] El dashboard agro muestra 4 KPIs (incluyendo ICA promedio con color).
- [ ] El gráfico de pesos muestra ≥ 2 lotes con sus series.
- [ ] El donut suma 100% y muestra las 4 categorías principales + "Otros".
- [ ] La gráfica de ICA muestra una línea de referencia en `x=2.5` con label "Estándar".
- [ ] La gráfica de mortandad muestra al menos 2 meses de datos para los lotes sembrados.
- [ ] La tabla de lotes activos muestra un sparkline de peso y un ICA real por lote.
- [ ] Clickear en una serie/lote en cualquier gráfico navega a la Hoja de Vida de ese lote.
- [ ] Cambiar el selector de rango recarga los gráficos.
- [ ] El `DashboardIndustrial` sigue funcionando idéntico a hoy.
- [ ] No hay errores en consola del navegador ni en el log del backend.
