# Plan de Implementación — Rediseño del módulo "Recomendaciones de venta"

> **Para:** ejecución asistida (Antigravity / vibecoding).
> **Fecha:** 2026-06-22 · **Objetivo:** defender el proyecto ante un jurado de docentes con un módulo claro, que *recomiende qué cortes priorizar y por qué*, no una planilla.
> **Regla de oro:** todo cambio debe poder revertirse. Si una tarea de motor (Fase 0) falla o introduce riesgo, la UI debe seguir funcionando con los datos actuales. **Una Vista Decisión impecable vence a un motor a medio cablear.**

---

## 0. Contexto imprescindible (leer antes de tocar nada)

**Stack:** monorepo en `equipo13/`. Frontend React (Vite, puerto 5173, sin TypeScript, estilos inline con CSS vars). Backend Node/Express (puerto 3000) que **proxea** a un microservicio Python ML (FastAPI, puerto 8001). Postgres (puerto host 5433 → 5432 interno). Todo corre en Docker (`docker compose`). Tras editar Python, **reiniciar** `ml_service` (uvicorn cachea imports): `docker compose restart ml_service`.

**El módulo hoy** vive en una sola página: `equipo13/frontend/src/pages/agro/RecomendacionesVenta.jsx`. Renderiza una tabla de **14 columnas** en grid de px fijos, con un sub-componente `AlertasPrecio` colgando al fondo y un `Sparkline` SVG inline.

**Flujo de datos actual:**
```
UI → GET /api/negocios/:id/recomendaciones (Node) → POST /recomendaciones/generar (Python)
   → GET /api/negocios/:id/recomendaciones/meta (Node, lee Postgres directo)
   → GET /api/negocios/:id/precios-historico (Node, para el sparkline)
   → GET /api/negocios/:id/alertas-precio (Node → Python)
```

**Hallazgo clave:** `POST /recomendaciones/generar` (`ml_service/app/main.py:63`) **ya persiste** una fila en `recomendacion_venta` + N filas en `recomendacion_item` en **cada** llamada (`ml/repo.py:43`). Es decir, el historial ya se escribe — pero **no hay endpoint para leerlo** y se ensucia en cada recálculo. La "ficha del día" es, por tanto, *leer + fijar*, no construir desde cero.

**Componentes UI reutilizables** (`equipo13/frontend/src/components/ui.jsx`, export en línea 573):
`MetricCard, StatusBadge, Btn, Divider, SectionCard, InfoTip, InfoBanner, FormulaHint, ChipSelector, Input`.
- `ChipSelector` → usar para el **toggle de vista** y el **selector de horizonte**.
- `SectionCard` → contenedor de cada bloque.
- `InfoTip` → tooltip de confianza (MAE/MAPE).

**Íconos disponibles** (`equipo13/frontend/src/icons.jsx`, uso `<Icon name="..." />`):
`wallet, fileText, layers, history, chevronDown, chevronUp, checkCircle, filter, download, save, trendingUp, arrowUp, arrowDown, alertTriangle, info, refresh`. (No hay `clock`/`bookmark`/`grid`/`list`: usar `history` para "esperar", `save` para fichas, `layers`/`fileText` para el toggle de vista.)

**CSS vars del tema** (no hardcodear colores): `--accent-agro, --accent-industrial, --accent-success, --accent-warning, --accent-danger, --text-primary, --text-secondary, --text-tertiary, --bg-secondary, --bg-tertiary, --border-subtle, --font-mono`.

---

## 1. Diseño objetivo (qué queremos lograr)

**Reframe:** de "planilla de 14 columnas" → **lista de decisión rankeada**. Dos vistas conmutables:

### Vista Decisión (default) — una tarjeta por corte, ordenadas por prioridad
Prioridad = contribución al margen total (`margen_kg × kg_disponibles`). Cada tarjeta:
- **Ranking** (#1, #2…) + nombre del corte grande.
- **Píldora de acción** dominante (Vender ahora / Esperar / Revisar costo), color-coded, arriba-izquierda. *Resuelve "la decisión está escondida".*
- **Razón en lenguaje natural**: ej. *"#1 en margen total (Bs 1.240). Precio estable y confiable → vendé ahora."*
- Números jerarquizados: **Precio** (con banda "≈48–53 Bs"), **Margen/kg**, **Kg a vender**, **Ingreso estimado**. El pronóstico se integra en la banda/razón, **no** como columnas duplicadas en itálica. *Resuelve "duplicación visual confusa".*
- **Sparkline** más grande + **semáforo de confianza** (verde/amarillo/rojo desde MAPE) con tooltip mostrando modelo + MAE/MAPE reales. *Resuelve "la confianza engaña" y conecta la métrica con cada corte.*
- Badge de **alerta** si el corte tiene una alerta de precio activa.

### Vista Tabla (toggle) — para el analista
La tabla detallada, pero limpia: **Acción como primera columna**, encabezados **agrupados** ("Actual" | "Pronóstico"), header **sticky**, scroll horizontal manejado (no desborde). *Resuelve "no es responsive / se desborda".*

### Controles globales (header)
- Toggle **Decisión | Tabla** (`ChipSelector`).
- Selector de **horizonte** 3 / 7 / 14 / 30 días (`ChipSelector`) → refetch con `?horizonte=`.
- Botones: **Re-calcular**, **Guardar ficha del día**, **CSV**, **PDF**.

### Alertas
Integradas **arriba** como banda contextual con contador (y badge por corte en su tarjeta). *Resuelve "las alertas cuelgan al fondo".*

### Ficha del día
Botón "Guardar ficha del día" → **fija** la recomendación actual con un nombre. Panel "Fichas guardadas" lista las fijadas y permite reabrir cualquiera en solo-lectura.

**Fuera de alcance (YAGNI):** perecibilidad, optimización multicanal real, app móvil. El canal (minorista/mayorista) se sigue eligiendo por debajo pero **deja de ser protagonista** en la UI.

---

## 2. Mapa de archivos a tocar

| Capa | Archivo | Cambio |
|---|---|---|
| Motor ML | `equipo13/ml_service/ml/forecast.py` | Exponer banda (`precio_min/max`) + nivel de confianza desde MAPE. |
| Motor ML | `equipo13/ml_service/ml/recommend.py` | Propagar banda y `confianza_nivel` al item. |
| DB | `equipo13/backend/migrations/021_recomendacion_fichas.sql` | **Nuevo.** `ALTER TABLE recomendacion_venta` (fijada, nombre). |
| Backend Node | `equipo13/backend/src/controllers/ventasMlController.js` | 3 endpoints nuevos de fichas + 1 de banda en items. |
| Backend Node | `equipo13/backend/src/routes/negocio.js` | Registrar rutas de fichas. |
| Frontend | `equipo13/frontend/src/pages/agro/RecomendacionesVenta.jsx` | Reescritura: orquestador + Vista Decisión + Vista Tabla limpia. |
| Frontend | `equipo13/frontend/src/pages/agro/recomendaciones/` | **Nueva carpeta** con sub-componentes (ver Fase 4). |

> **Principio de aislamiento:** partir el `.jsx` monolítico (actualmente ~325 líneas con 3 componentes) en archivos pequeños y enfocados. Es más fácil de razonar y de editar con vibecoding.

---

## 3. Fases (ejecutar en orden; cada fase es verificable de forma aislada)

### Fase 0 — Motor: exponer banda de precio y confianza real *(opcional pero recomendado; bajo riesgo)*

> Si esta fase da problemas, **saltarla**: el frontend debe degradar con elegancia (sin banda → muestra solo el precio puntual; sin `confianza_nivel` → deriva el semáforo en el front desde `metricas.mape` que ya viene en el endpoint `/meta`).

**0.1 — `ml_service/ml/forecast.py`: añadir banda + nivel de confianza.**

En `_pronosticar_prophet`, Prophet ya calcula `yhat_lower`/`yhat_upper`; hoy se descartan. Capturarlos del último punto:
```python
fila = forecast_final.iloc[-1]
pronosticado = round(float(fila["yhat"]), 4)
precio_min = round(float(fila["yhat_lower"]), 4)
precio_max = round(float(fila["yhat_upper"]), 4)
# ... añadir al dict de retorno:
#   "precio_min": precio_min, "precio_max": precio_max,
#   "confianza_nivel": _nivel_confianza(mape),
```
Añadir un helper de nivel (semáforo) por MAPE:
```python
def _nivel_confianza(mape: float | None) -> str:
    if mape is None:        return "media"
    if mape < 5:            return "alta"
    if mape < 15:           return "media"
    return "baja"
```
Para Holt-Winters y fallback (no tienen intervalo nativo): `precio_min = precio_max = None`, y `confianza_nivel = "media"` (HW) / `"baja"` (fallback). **No inventar bandas** donde no hay incertidumbre real.

**0.2 — `ml_service/ml/recommend.py`: propagar al item.**

En `enriquecer_con_forecast`, junto a `precio_pronosticado`:
```python
it["precio_min"] = f.get("precio_min")
it["precio_max"] = f.get("precio_max")
it["confianza_nivel"] = f.get("confianza_nivel")
```
> No cambiar la lógica de `accion` ni de `margen` — ya reconcilia margen<0 → `no_vender`. **No tocar** `optimize.py`.

**0.3 — Tests.** Correr `docker compose exec ml_service pytest` (los tests existentes en `ml_service/tests/` no deben romperse; los nuevos campos son aditivos). Reiniciar: `docker compose restart ml_service`.

**Criterio de aceptación Fase 0:** `POST /recomendaciones/generar` devuelve items con `precio_min`, `precio_max`, `confianza_nivel` (los dos primeros pueden ser `null` para HW/fallback). Tests verdes.

---

### Fase 1 — DB + Backend Node: fichas guardadas

**1.1 — Migración `equipo13/backend/migrations/021_recomendacion_fichas.sql` (nuevo):**
```sql
-- Migración 021 — Fichas guardadas de recomendaciones de venta
ALTER TABLE recomendacion_venta
  ADD COLUMN IF NOT EXISTS fijada BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS nombre VARCHAR(255);

CREATE INDEX IF NOT EXISTS idx_recomendacion_fijada
  ON recomendacion_venta (negocio_id, fijada, generada_en DESC);
```
> Verificar cómo se aplican migraciones (el backend las corre al arrancar; ver `docker compose logs backend`). Si no se auto-aplica, ejecutarla a mano: `docker compose exec db psql -U postgres -d costeo -f /ruta/021...` o vía `psql -c`.

**1.2 — `ventasMlController.js`: 3 endpoints nuevos** (Postgres directo, igual que `getModelosMeta`).

```js
// POST /api/negocios/:negocioId/recomendaciones/:recId/fijar  { nombre }
export async function fijarRecomendacion(req, res) {
  const { nombre } = req.body || {};
  try {
    const { rows } = await pool.query(
      `UPDATE recomendacion_venta SET fijada = TRUE, nombre = $1
        WHERE id = $2 AND negocio_id = $3 RETURNING id, nombre, generada_en, fijada`,
      [nombre || `Ficha ${new Date().toISOString().slice(0,10)}`, req.params.recId, req.params.negocioId]);
    if (!rows.length) return res.status(404).json({ error: 'Recomendación no encontrada' });
    res.json(rows[0]);
  } catch (err) { console.error('fijarRecomendacion error:', err); res.status(500).json({ error: err.message }); }
}

// GET /api/negocios/:negocioId/recomendaciones/fichas  → lista de fijadas
export async function listarFichas(req, res) {
  try {
    const { rows } = await pool.query(
      `SELECT id, nombre, generada_en, horizonte_dias, modo, resumen
         FROM recomendacion_venta
        WHERE negocio_id = $1 AND fijada = TRUE
        ORDER BY generada_en DESC LIMIT 50`, [req.params.negocioId]);
    res.json(rows);
  } catch (err) { console.error('listarFichas error:', err); res.status(500).json({ error: err.message }); }
}

// GET /api/negocios/:negocioId/recomendaciones/fichas/:recId  → cabecera + items
export async function getFicha(req, res) {
  try {
    const cab = await pool.query(
      `SELECT id, nombre, generada_en, horizonte_dias, modo, resumen
         FROM recomendacion_venta WHERE id = $1 AND negocio_id = $2`,
      [req.params.recId, req.params.negocioId]);
    if (!cab.rows.length) return res.status(404).json({ error: 'Ficha no encontrada' });
    const items = await pool.query(
      `SELECT corte_canonico, canal_sugerido, precio_referencia, costo_kg, margen_kg,
              kg_disponibles, ingreso_estimado, tendencia, precio_pronosticado, accion, confianza
         FROM recomendacion_item WHERE recomendacion_id = $1`, [req.params.recId]);
    res.json({ ...cab.rows[0], items: items.rows });
  } catch (err) { console.error('getFicha error:', err); res.status(500).json({ error: err.message }); }
}
```
> El `id` de la recomendación generada ya viene en la respuesta de `getRecomendaciones` (Python devuelve `{id, modo, items, resumen}`). **Verificar** que `ventasMlController.getRecomendaciones` reenvíe ese `id` tal cual (hoy hace `res.json(data)`, así que sí lo reenvía).

**1.3 — `negocio.js`: registrar rutas** (junto a las de `recomendaciones`, ~línea 322; mismo `requireMembership('admin')`):
```js
router.get( '/:negocioId/recomendaciones/fichas',          authMiddleware, requireMembership('admin'), listarFichas);
router.get( '/:negocioId/recomendaciones/fichas/:recId',   authMiddleware, requireMembership('admin'), getFicha);
router.post('/:negocioId/recomendaciones/:recId/fijar',    authMiddleware, requireMembership('admin'), fijarRecomendacion);
```
> **Orden de rutas:** registrar `/recomendaciones/fichas` **antes** que cualquier `/recomendaciones/:param` para que Express no capture "fichas" como parámetro. Importar las 3 funciones nuevas en el import del controller.

**Criterio de aceptación Fase 1:** con un `recId` real, `POST .../fijar` devuelve `fijada:true`; `GET .../fichas` lo lista; `GET .../fichas/:recId` devuelve cabecera + items.

---

### Fase 2 — Frontend: lógica compartida (hook + helpers)

Crear `equipo13/frontend/src/pages/agro/recomendaciones/` con:

**2.1 — `useRecomendaciones.js`** — extraer el `cargar()` actual a un hook que exponga `{ items, resumen, modo, metaModelos, historico, alertas, cargando, error, recId, horizonte, setHorizonte, recargar }`. Incluir el `?horizonte=` en la URL de `/recomendaciones`.

**2.2 — `derive.js`** — funciones puras (fáciles de testear, sin React):
- `rankItems(items)`: ordena por `margen_total` desc (= `margen_kg × kg_disponibles`) y devuelve cada item con `rank` (1-based). *Esto materializa "qué priorizar".*
- `nivelConfianza(item, meta)`: usa `item.confianza_nivel` si vino del motor; si no, lo deriva de `meta.metricas.mape` (alta <5, media <15, baja). Devuelve `{ nivel, color, mae, mape }`.
- `razonRecomendacion(item)`: genera el texto del "por qué". Ejemplos de reglas:
  - `accion === 'no_vender'` → *"Margen negativo (Bs {margen_kg}/kg). Revisá costo o no vendas a este precio."*
  - `accion === 'esperar'` → *"#{rank} en margen. Precio subiendo: esperando ~{horizonte}d el margen pasaría de Bs {margen_kg} a {margen_pronosticado}/kg."*
  - `accion === 'vender_ahora'` → *"#{rank} por ingreso (Bs {ingreso_estimado}). Precio estable/bajando → vendé ahora."*
  Mantener el texto corto (1–2 frases) y en es-BO.
- `accionVisual(accion)`: `{ label, color, icon }` — `vender_ahora`→`{ 'Vender ahora', success, checkCircle }`, `esperar`→`{ 'Esperar', warning, history }`, `no_vender`→`{ 'Revisar costo', danger, alertTriangle }`.

> **Por qué el ranking y la razón viven en el front:** cero riesgo para el motor el día antes de la demo, y son presentación pura. El motor ya entrega los números; el front los *narra*.

---

### Fase 3 — Frontend: Vista Decisión (tarjetas)

**3.1 — `RecomendacionCard.jsx`** — una tarjeta por item. Estructura (usar `SectionCard` o un `div` con borde/`--bg-secondary`):
```
┌─────────────────────────────────────────────┐
│ [#1]  Lomo                  ●Vender ahora     │  ← rank + nombre + píldora acción (grande)
│ "#1 por ingreso (Bs 1.240). Precio estable…"  │  ← razón (text-secondary, 13px)
│                                               │
│  Precio        Margen/kg     Kg a vender      │  ← 3-4 métricas en fila, jerarquizadas
│  48.50          15.20         82.0 kg         │
│  ≈46–51 Bs                    Ingreso 3.977   │
│                                               │
│  [sparkline 30d]      ●Confianza alta (i)     │  ← sparkline grande + semáforo + InfoTip MAE/MAPE
└─────────────────────────────────────────────┘
```
- La **píldora de acción** es el elemento visual más fuerte (fondo de color tenue + texto del color, ícono). No un texto chico al final.
- La **banda de precio** (`≈{precio_min}–{precio_max}`) solo si `precio_min != null`; si no, omitir esa línea.
- **Semáforo de confianza**: punto coloreado + label ("alta/media/baja") + `InfoTip` que al hover muestra `Modelo {modelo} · MAE {mae} Bs · MAPE {mape}% · {n_puntos} pts` (cruzar con `metaModelos` por `corte_canonico`).
- Si el corte tiene alerta activa (cruzar con `alertas` por `corte_canonico`): badge `⚠ +15%` arriba a la derecha.
- **Sparkline**: reutilizar el componente `Sparkline` actual pero a `w=120 h=36` y con relleno tenue bajo la línea (area). Extraerlo a `recomendaciones/Sparkline.jsx`.

**3.2 — `VistaDecision.jsx`** — recibe `items` rankeados y los mapea a `RecomendacionCard`. Grid responsive:
```js
display:'grid', gridTemplateColumns:'repeat(auto-fill, minmax(340px, 1fr))', gap:'14px'
```
Las tarjetas fluyen y nunca se desbordan. La #1 puede ir a ancho completo (destacada) si querés un "héroe".

**Criterio de aceptación Fase 3:** en pantalla se ven tarjetas ordenadas por prioridad; la acción es lo primero que se lee; ninguna columna duplicada; responsive (probar a 1280px y 768px sin scroll horizontal).

---

### Fase 4 — Frontend: Vista Tabla limpia + orquestador

**4.1 — `VistaTabla.jsx`** — la tabla actual reordenada/limpiada:
- **Acción = primera columna.**
- Encabezados **agrupados** en dos niveles: grupo "Actual" (Precio, Margen/kg, Kg, Ingreso) y grupo "Pronóstico" (Precio pron., Margen pron., Confianza). Sparkline y Tendencia en su propia columna.
- Header **sticky** (`position: sticky; top: 0`).
- Contenedor con `overflow-x: auto` y `min-width` en la grilla, para que en pantallas chicas **scrollee horizontal** en vez de desbordar/aplastar.
- Quitar la columna "Canal sugerido" del lugar prominente (moverla al final o a un tooltip): el usuario indicó que el canal no es prioridad.

**4.2 — `RecomendacionesVenta.jsx` (orquestador, reescrito):**
- Header con título + `StatusBadge` (Pronóstico ML / Heurístico) + controles: `ChipSelector` vista (Decisión|Tabla), `ChipSelector` horizonte (3|7|14|30), botones Re-calcular / Guardar ficha / CSV / PDF.
- Banda de **resumen** (`MetricCard` ×3: Ingreso total, Margen total, Cortes) — mantener.
- Banda de **alertas integrada arriba** (ver 4.3).
- Render condicional: `vista === 'decision' ? <VistaDecision/> : <VistaTabla/>`.
- Estados `cargando` / `error` / `vacío` — conservar los actuales (ya están bien), pero el `error` ahora aplica a ambas vistas.
- `exportarCSV` y `window.print()` — conservar.

**4.3 — `BandaAlertas.jsx`** — extraer el `AlertasPrecio` actual a un banner superior: contador + lista colapsable. Mantener el botón "Recalcular alertas". Mover **arriba** del contenido de recomendaciones.

**Criterio de aceptación Fase 4:** toggle cambia entre vistas sin recargar datos; tabla no se desborda (scrollea); alertas arriba; horizonte refetchea.

---

### Fase 5 — Frontend: Ficha del día

**5.1 — Botón "Guardar ficha del día"** en el header. Al hacer clic: pedir nombre (un `prompt()` simple es aceptable para la demo, o un mini-modal con `Input`), luego `POST /api/negocios/:id/recomendaciones/:recId/fijar` con `{ nombre }`. Usar el `recId` que devolvió el último `getRecomendaciones`. Feedback: toast/`StatusBadge` "Ficha guardada".

**5.2 — `PanelFichas.jsx`** — panel/sección colapsable "Fichas guardadas" (ícono `save`): lista `GET .../recomendaciones/fichas` (nombre, fecha, ingreso/margen del `resumen`). Al hacer clic en una ficha: `GET .../fichas/:recId` y mostrar sus items en **modo solo-lectura** (reusar `VistaDecision`/`VistaTabla` con un flag `readonly` que oculte botones de acción). Un botón "Volver a hoy" restaura la recomendación viva.

> Nota: como `generar` persiste en cada recálculo, las no-fijadas se acumulan. Para la demo no molesta (solo listamos `fijada=TRUE`). Limpieza opcional post-demo: un `DELETE FROM recomendacion_venta WHERE fijada=FALSE AND generada_en < now()-interval '7 days'`.

**Criterio de aceptación Fase 5:** guardar una ficha, verla en el panel, reabrirla en solo-lectura, volver a hoy.

---

### Fase 6 — Pulido final

- **Responsive:** verificar 1440 / 1280 / 768 px. Vista Decisión fluye; Vista Tabla scrollea. Nada se aplasta a fuentes <12px.
- **Print/PDF:** el `@media print` actual oculta botones; verificar que la Vista Decisión imprima legible (forzar 1 columna en print).
- **Estados vacío/error:** confirmar que ambos siguen claros (el de error ya sugiere "verificá ml_service").
- **Consistencia de tema:** ningún color hardcodeado; todo vía CSS vars.
- **Limpieza:** borrar código muerto del `.jsx` viejo; el orquestador no debe pasar de ~150 líneas (la lógica vive en los sub-componentes y `derive.js`).

---

## 4. Criterios de aceptación globales (checklist de demo)

- [ ] La página abre en **Vista Decisión**: tarjetas rankeadas, acción visible de un vistazo.
- [ ] Cada tarjeta dice **por qué** (texto en lenguaje natural) y qué cantidad vender.
- [ ] **Confianza** es un semáforo conectado a cada corte, con MAE/MAPE reales en tooltip (no el % constante suelto).
- [ ] **Banda de precio** visible donde hay Prophet; ausente (sin inventar) donde no.
- [ ] **Toggle** Decisión|Tabla funciona; la Tabla tiene Acción primera, header sticky y no se desborda.
- [ ] **Selector de horizonte** recalcula (3/7/14/30).
- [ ] **Alertas** arriba, con badge por corte afectado.
- [ ] **Guardar ficha del día** → aparece en "Fichas guardadas" → se reabre en solo-lectura.
- [ ] Responsive a 768px sin scroll horizontal en Vista Decisión.
- [ ] `pytest` del ml_service en verde; backend levanta sin errores de migración.

---

## 5. Runbook de verificación

```powershell
cd "C:\Users\Jairo\Documents\Sistema de Costeo Estandar Productivo Universal\equipo13"
docker compose up -d --build
docker compose restart ml_service        # tras editar Python
docker compose exec ml_service pytest     # Fase 0
docker compose logs backend | Select-String "migrac"   # confirmar migración 021
curl http://localhost:3000/health
curl http://localhost:8001/health
```
Login demo: `gerardo@demo.com` / `demo1234`, negocio "Granja Olmos". Navegar a Recomendaciones de venta y recorrer el checklist de §4.

> Si Docker entra en bucle de crash del "Inference manager": cerrar Docker, renombrar `%LOCALAPPDATA%\Docker\run`, `wsl --shutdown`, reabrir. `DB_PORT=5433` en `.env` (Postgres 18 nativo ocupa el 5432).

---

## 6. Riesgos y qué NO tocar

| Riesgo | Mitigación |
|---|---|
| Fase 0 (Prophet) rompe el endpoint | Es opcional. El front degrada: sin banda muestra precio puntual; el semáforo se deriva de `/meta` (que ya trae MAPE). Revertir `forecast.py`/`recommend.py` y seguir. |
| Migración 021 no auto-aplica | Aplicarla a mano con `psql`. Es idempotente (`IF NOT EXISTS`). |
| Colisión de rutas Express (`/fichas` vs `/:param`) | Registrar `/recomendaciones/fichas` antes de cualquier `/recomendaciones/:x`. |
| Reescritura del `.jsx` introduce regresiones | Partir en sub-componentes pequeños; conservar `exportarCSV`, estados vacío/error y el `Sparkline` tal cual (solo agrandado). |

**No tocar** (fuera de alcance, congelado para la demo): `optimize.py` (optimización por topes), app móvil Flutter, módulos de Operarios/Mermas/CIF, lógica de despiece y costeo conjunto. Cada cambio fuera de la línea de este plan es riesgo puro a un día de presentar.

---

### TL;DR de ejecución
1. **(Opcional)** Fase 0: banda + confianza real en el motor. Si falla, saltar.
2. Fase 1: migración 021 + 3 endpoints de fichas en Node.
3. Fase 2–4: partir el `.jsx`, hook + helpers, **Vista Decisión** (tarjetas rankeadas con razón y semáforo), **Vista Tabla** limpia, toggle, horizonte, alertas arriba.
4. Fase 5: guardar/leer fichas del día.
5. Fase 6: responsive + pulido. Verificar §4.
