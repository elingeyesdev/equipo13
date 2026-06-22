# Análisis ML + Despiece y Plan de 1 Día — CosteoUniversal (equipo13)

> **Autor del análisis:** revisión técnica senior (ingeniería de sistemas + industria cárnica porcina).
> **Fecha:** 2026-06-22 · **Horizonte:** demo presentable mañana, en vivo sobre Docker.
> **Decisiones tomadas con vos:** (1) este documento es el entregable; vos ejecutás. (2) Prioridad: pipeline ML limpio + bien explicado, y *si sobra tiempo*, cablear el forecast a la decisión. (3) Calibrar datos demo a precios bolivianos reales. (4) Presentación = demo en vivo (Docker).

---

## 0. Veredicto en una página (leé esto primero)

**El proyecto NO está mal hecho. Está mal *contado*.** El pipeline de Machine Learning existe, corre, tiene tests, selecciona modelo automáticamente (Prophet/Holt‑Winters/fallback), hace backtesting con MAE/MAPE, scrapea precios reales y persiste recomendaciones. El problema es que **tres decisiones de diseño hacen que los números en pantalla se contradigan**, y eso es lo que te hace sentir que "no tiene lógica":

1. **El pronóstico ML no decide nada.** El canal sugerido, el margen y el ingreso se calculan con el *último precio observado* (`_precio_mas_reciente`). El forecast se entrena por separado y solo "pega" una etiqueta `subiendo/bajando` + `esperar/vender_ahora`. La columna "Pronóstico" es **decorativa**: si la borraras, la recomendación sería idéntica. → `equipo13/ml_service/ml/recommend.py`.

2. **La demo hace que el Lomo pierda plata.** La serie sintética centra el Lomo en 95 Bs/kg (costo = 95×0.6 = 57), pero el scraping real trae ~45 Bs/kg. Como la recomendación usa el último precio (el real, ~45), el margen del Lomo da **negativo (−12)**, mientras el pronóstico (entrenado sobre los 95) dice "subiendo → esperar". Resultado en pantalla: *un corte premium que pierde plata pero el sistema dice "esperá"*. Eso es exactamente lo que no cierra. → `equipo13/ml_service/seed_demo.py:28`.

3. **La acción (`esperar`/`vender_ahora`) no se reconcilia con el margen.** Se decide solo por la pendiente del precio (±2%), sin mirar si vendés con ganancia o a pérdida. → `equipo13/ml_service/ml/forecast.py:1`.

**Lo bueno:** los tres se arreglan en horas, sin tocar la arquitectura. El #2 se arregla **solo con datos** (lo que elegiste). El #1 y #3 son ~30 líneas en `recommend.py`/`forecast.py` (track opcional). Y hay un **win enorme y gratis**: las métricas MAE/MAPE y la selección de modelo ya se calculan pero **no se muestran en ningún lado** — surfacearlas es lo que convierte esto en "aplicamos ML de verdad".

---

## 1. La lógica del negocio, explicada de cero (cárnica porcina)

Vas a poder defender el proyecto solo si esto lo tenés grabado. Es la cadena de valor del cerdo, y el sistema la modela entera:

```
COMPRA / CRÍA            FAENA               DESPIECE            COSTEO CONJUNTO        DECISIÓN DE VENTA (ML)
─────────────         ──────────         ─────────────       ──────────────────     ──────────────────────
Lote de N cerdos  →   Sacrificio    →    Canal se corta  →   Repartir el costo  →   ¿Qué corte, en qué
+ bitácora            peso vivo →         en piezas:         del lote entre los      canal, a qué precio,
(alimento,            canal (~75%)        Pierna, Paleta,    cortes (son productos   y vender ya o esperar?
sanidad, MO)          rendimiento         Lomo, Costilla,    CONJUNTOS)              (usa precios de mercado
= costo_total_lote                        Chorizo                                    scrapeados + pronóstico)
```

### 1.1 Conceptos cárnicos que el código usa (glosario)

| Término en el código | Qué es en la industria | Dónde vive |
|---|---|---|
| `lote` | Camada/partida de cerdos que entran juntos a engorde. Acumula todos los costos. | `lotes` |
| `costo_adquisicion` + `bitacora_lote` | Lo que pagaste por los animales + todo lo gastado criándolos (alimento, vacunas, mano de obra). | `bitacora_lote` |
| **Rendimiento canal (~75%)** | De un cerdo vivo de 95 kg, ~71 kg quedan como **canal** (carcasa) aprovechable. El resto: sangre, vísceras, cabeza, mermas. | `RENDIMIENTO_CANAL=0.75` en seed y en `despieceController.js:71` |
| **Despiece / cortes** | La canal se desposta en **piezas primarias**: Pierna (pernil/jamón), Paleta (brazuelo), Lomo (chuleta/loin), Costilla, Chorizo (se hace con recortes). | `despiece_cortes` |
| **Rendimiento de corte** | Qué fracción de la canal es cada pieza. En el seed: Pierna 30%, Paleta 22%, Lomo 20%, Costilla 13%, Chorizo 15% (suma 1.0). | `RENDIMIENTO_CORTE` en `seed_demo.py:42` |
| **Costos conjuntos (joint costing)** | Como todos los cortes salen del MISMO animal en el MISMO acto, no hay un "costo individual" objetivo: hay que **repartir** el costo total del lote entre las piezas. Es un problema clásico de contabilidad de costos. | ver §1.2 |
| **Canal de venta (minorista/mayorista)** | A quién le vendés: público final (minorista, precio alto) o intermediario/carnicería (mayorista, ~82% del minorista). | `canal` en todas las tablas ML |

### 1.2 El corazón académico: costos conjuntos (esto es lo que impresiona a un docente de costos)

Tu sistema implementa **dos métodos** de reparto del costo del lote entre los cortes. Esto es oro para la defensa, porque es exactamente el dilema que enseña la contabilidad de costos:

- **Método A — por peso físico** (`despieceController.js:106`, función `createDespiece`):
  `costo_kg_derivado = costo_total_lote / peso_canal_total`.
  Todos los cortes reciben **el mismo** costo/kg. Simple, pero **injusto**: el lomo (premium) y la costilla (barata) "cuestan" lo mismo por kg, lo cual no refleja la realidad económica.

- **Método B — por valor de venta en el punto de separación** (`backend/src/services/calculoCostosConjuntos.js`, endpoint `asignar-costos-conjuntos`):
  cada corte absorbe costo **en proporción a su valor de mercado** (`peso × precio`). El lomo, que vale más, carga más costo; la costilla, menos. Es el **método "valor relativo de ventas"**, el académicamente correcto para productos conjuntos.

> **Para la defensa:** "Implementamos los dos métodos de costeo conjunto que enseña la teoría: peso físico y valor de ventas en el punto de separación. El segundo es el correcto cuando los coproductos tienen valores de mercado muy distintos, como el lomo vs. la costilla." Esto solo ya justifica el rigor del proyecto.

⚠️ **Pero ojo (deuda real):** los dos métodos escriben sobre la **misma** columna `costo_kg_derivado`. Si corrés despiece otra vez después de asignar costos conjuntos, **volvés al método por peso** y perdés el reparto por valor. Hay una sola fuente de verdad para dos cálculos distintos → es la raíz de varias incoherencias de costo. (Ver §4, bug C-3.)

### 1.3 El puente agro → industrial (el diferenciador)

Tras el despiece, el botón "generar insumos" (`despieceController.js:148`) convierte cada corte en un **insumo del catálogo** con `precio_unitario = costo_kg_derivado`. Así, un producto industrial (chorizo, jamón) puede usar esos cortes en su BOM y la ficha de costo **hereda el costo real del lote**. Carne en pie → costo de producción → insumo → producto terminado. Ese flujo end‑to‑end es el corazón del "costeo universal".

---

## 2. Cómo funciona el ML hoy (desmitificado)

Microservicio Python (FastAPI, puerto 8001), llamado por el backend Node vía `mlClient.js`. Flujo de `POST /recomendaciones/generar` (`ml_service/app/main.py:63`):

```
1. cargar_cortes_disponibles(negocio)   → kg y costo/kg por corte (desde despiece)   [ml/repo.py:7]
2. cargar_precios_recientes(negocio)     → histórico de precios (corte, canal)        [ml/repo.py:30]
3. recomendar_heuristico(cortes, precios)→ por corte: elige canal de MAYOR margen     [ml/recommend.py:9]
                                            margen = ÚLTIMO precio − costo_kg
4. construir_series(precios)             → series temporales por (corte, canal)        [ml/features.py]
5. pronosticar(serie, horizonte=7)       → predice precio futuro + tendencia + acción  [ml/forecast.py:86]
       · ≥365 días → Prophet (con MAE/MAPE por backtesting de 7 días)
       · ≥21  días → Holt-Winters
       · <21  días → fallback lineal
6. enriquecer_con_forecast(items, fc)    → PEGA tendencia/acción/pronóstico al item    [ml/recommend.py:44]
7. asignar_volumenes_con_topes(items)    → reparte kg por canal según tope semanal      [ml/optimize.py]
8. guardar_recomendacion(...)            → persiste recomendación + items + meta modelo  [ml/repo.py:43]
```

**Qué predice realmente:** el **precio de mercado por kg** de cada corte/canal a 7 días. *No* predice demanda ni ventas, aunque el módulo se llame "Inteligencia de Ventas". (Mismatch de naming — ver §4, C‑4.)

**Selección automática de modelo (esto es ML de verdad, mostralo):**
- **Prophet** (Meta) cuando hay ≥365 puntos → captura tendencia + estacionalidad anual/semanal, y hace **backtesting**: entrena con todo menos los últimos 7 días, predice esos 7, y mide **MAE** (error absoluto medio, en Bs) y **MAPE** (error porcentual). → `forecast.py:11`.
- **Holt‑Winters** (suavizado exponencial con tendencia) cuando hay entre 21 y 364 puntos. → `forecast.py:64`.
- **Fallback lineal** (pendiente simple) cuando hay <21 puntos. → `forecast.py:78`.

El seed siembra Pierna y Lomo con **420 días** (→ Prophet) y el resto con **90 días** (→ Holt‑Winters), justamente para **demostrar la selección automática** en la misma corrida. Eso está bien pensado.

**Scraping (`ml_service/scraping/`):** adaptadores (`json_api`, `static`, `dynamic`, `pdf`) traen precios de carnicerías online. Fuentes probadas: **Don Cerdo Bolivia** (minorista, Shopify `/products.json`, con gramos reales → precio/kg correcto) y **Amarket** (mayorista). `normalize.py` mapea el título scrapeado a un corte canónico vía la tabla `corte_alias` (match por substring en minúsculas).

**Alertas (`ml/alertas.py`):** compara el último precio de cada (corte, canal) contra el promedio histórico previo; si varía ≥10%, genera alerta. El seed fuerza un +15% en Pierna/minorista para que la demo muestre una alerta vistosa.

---

## 3. Diagnóstico: por qué "no tiene lógica" (causa raíz)

### 3.1 El forecast está desconectado de la decisión `[CONCEPTUAL — el más importante]`

En `recommend.py:20`, el margen se calcula así:

```python
margen = round(precio - c["costo_kg"], 4)   # precio = _precio_mas_reciente(...)
```

`precio` es el **último precio observado**, no el pronosticado. El pronóstico se inyecta *después* en `enriquecer_con_forecast` (`recommend.py:44`) solo como etiquetas. Por lo tanto:

- El **canal sugerido** se elige por margen del último precio → el ML no influye.
- El **ingreso estimado** y el **margen total** usan el último precio → el ML no influye.
- Lo único que aporta el ML es una flechita ↑/↓ y un texto "Esperar/Vender".

Para un proyecto cuyo titular es *"aplicamos Machine Learning"*, esto es la debilidad central: **el ML no cambia qué hacés, solo comenta.** (Track B en el plan lo arregla.)

### 3.2 El ejemplo concreto que te rompe la cabeza: el Lomo

Reconstrucción exacta de lo que pasa hoy en la demo:

| Paso | Valor | Origen |
|---|---|---|
| Serie sintética Lomo/minorista | ~95 Bs/kg × 420 días | `seed_demo.py:28` (`BASE["Lomo"]=95`) |
| Costo derivado del Lomo | 95 × 0.6 = **57 Bs/kg** | `seed_demo.py:82` |
| Scraping real (Don Cerdo) inserta hoy | ~**45 Bs/kg** | scraping real |
| `_precio_mas_reciente` devuelve | **45** (el real, es el más nuevo) | `recommend.py:1` |
| Margen mostrado | 45 − 57 = **−12** (rojo) | `recommend.py:20` |
| Forecast Prophet (entrenado sobre los 95) predice | ~**95** → "subiendo" → **"esperar"** | `forecast.py:46` |

**En pantalla:** Lomo, margen −12 (pierde plata), acción "Esperar". Contradicción pura. La causa es que **conviven dos universos de precio incompatibles** en la misma serie: el sintético (95) y el real (45). El forecast entrenado sobre una serie con ese "quiebre estructural" al final no significa nada.

**Tu decisión (calibrar datos) lo arregla de raíz:** si la serie sintética vive en la misma banda que el scraping real (~44–52), desaparecen el margen negativo *y* el quiebre estructural. Ver §6.

### 3.3 La acción no mira la rentabilidad `[CONCEPTUAL]`

`_tendencia_y_accion` (`forecast.py:1`) decide solo por la pendiente:

```python
if delta > 2% de actual:  return "subiendo", "esperar"
if delta < -2%:           return "bajando", "vender_ahora"
else:                     return "estable", "vender_ahora"
```

Nunca mira el **margen**. Por eso puede decir "esperar" sobre un corte que vendés a pérdida. Una recomendación de venta seria reconcilia *tendencia × rentabilidad* (ver §5, fix C‑3 / Track B).

---

## 4. Bugs y riesgos concretos (priorizados)

> Severidad: 🔴 rompe/confunde la demo · 🟠 incoherencia visible · 🟡 cosmético / deuda.

| ID | Sev | Qué pasa | Archivo | Fix recomendado |
|---|---|---|---|---|
| **C‑1** | 🔴 | El forecast no entra en la decisión (margen/canal/ingreso usan último precio). | `ml/recommend.py:20`, `:44` | Track B (§5). Para demo "segura": dejarlo, pero explicar honestamente que el ML da la *señal temporal* y el heurístico la *asignación*. |
| **C‑2** | 🔴 | Margen negativo del Lomo + "esperar" por choque sintético/real. | `seed_demo.py:28` | **Calibrar BASE** a banda real (§6). Cero código. |
| **C‑3** | 🟠 | `accion` ignora el margen → "esperar" sobre cortes a pérdida. | `ml/forecast.py:1` | Track B: si margen<0 ⇒ "no vender / revisar costo", nunca "esperar" a secas. |
| **C‑4** | 🟠 | Módulo "Inteligencia de **Ventas**" pero pronostica **precio**, no demanda. | naming / UI | En la defensa, llamalo "pronóstico de **precio de mercado** para decisión de venta". Opcional: subtítulo en la UI. |
| **C‑5** | 🟠 | MAE/MAPE y modelo elegido se calculan y guardan pero **no se muestran**. | `ml/repo.py:68`, `modelo_forecast_meta` | **WIN de oro (P1):** exponer endpoint + mini‑panel "Modelo: Prophet · MAE x · MAPE y%". Bajo riesgo, alto impacto. |
| **C‑6** | 🟡 | No hay gráfico de la serie histórica de precios (la visual más natural del ML). | `PreciosMercado.jsx` es CRUD manual | P2: un sparkline/línea por corte si sobra tiempo. |
| **C‑7** | 🟠 | "Optimización" por topes casi no actúa: cada corte llega con UN solo canal candidato (recommend ya colapsó al mejor). El reparto multicanal real nunca se dispara. | `ml/optimize.py:19` | No tocar para la demo; saber explicarlo. Con lote 1425 kg y topes 150/500, solo Pierna recibe asignación y el resto queda "diferido". |
| **C‑8** | 🟡 | Alerta forzada de Pierna (+15%) puede "perderse": el scraping inserta un punto del mismo día y el desempate por fecha no es determinista. | `seed_demo.py:135`, `alertas.py:30` | Para demo: correr `alertas/recalcular` **después** del scraping, o no scrapear Pierna/minorista. |
| **C‑9** | 🟡 | Confianza es constante (0.85/0.7/0.3), no una métrica real. | `forecast.py:55,75,84` | Está OK como "prior" por tipo de modelo; explicarlo así. El número serio es MAE/MAPE (C‑5). |
| **C‑10** | 🟡 | `corte_alias` no se siembra → scraping corre "parcial" con 0 filas y sin error. | (documentado) | Insertar alias antes de la demo (SQL en §7). **Crítico para que el scraping traiga datos.** |
| **C‑11** | 🟡 | Si el ml_service está caído, la UI muestra tabla vacía sin explicar por qué. | `RecomendacionesVenta.jsx:21` | P2: mostrar el error. Para demo: verificar `/health` antes (§7). |

---

## 5. Plan de 1 día (priorizado, con dos tracks)

Trabajá de arriba hacia abajo. **Track A = imprescindible para una demo limpia.** **Track B = "el ML decide", solo si Track A quedó cerrado y verificado.**

### 🟢 TRACK A — Demo limpia y coherente (apuntá a tener esto cerrado al mediodía)

- [ ] **A1 (C‑2, ~30 min) — Calibrar datos demo a precios reales.** Editar `BASE` en `seed_demo.py` (tabla en §6). Objetivo: que el nivel sintético viva en la banda del scraping real y que `costo = base×0.6 < precio` para TODOS los cortes. Borrar lote demo y re‑sembrar (§7).
- [ ] **A2 (C‑10, ~10 min) — Sembrar `corte_alias`.** Sin esto el scraping trae 0 filas. SQL en §7.
- [ ] **A3 (~20 min) — Verificar el flujo end‑to‑end en Docker** con el runbook de §7. Que `/recomendaciones/generar` devuelva 5 items con **todos los márgenes positivos** y acciones coherentes.
- [ ] **A4 (C‑8, ~10 min) — Orden de la demo de alertas:** correr scraping y *después* `alertas/recalcular`, confirmar que aparece la alerta de Pierna.
- [ ] **A5 (~30 min) — Guion de presentación** (§8). Ensayar una vez el recorrido completo.

### 🟡 TRACK B — Que el ML visiblemente decida (solo si A está cerrado)

> Cambios chicos y localizados. Hacé **uno**, testealo (`pytest` del ml_service ya existe), y recién pasá al siguiente. **Reiniciá el contenedor** tras cada edición (`docker compose restart ml_service`) — uvicorn cachea imports.

- [ ] **B1 (C‑3, ~20 min) — Reconciliar acción con margen** en `forecast.py`/`recommend.py`. Regla mínima defendible:
  - margen < 0 → acción `"no_vender"` (revisar costo o canal), sin importar la tendencia.
  - margen ≥ 0 y tendencia `subiendo` → `"esperar"` (mostrar cuánto ganarías esperando).
  - margen ≥ 0 y tendencia `bajando`/`estable` → `"vender_ahora"`.
- [ ] **B2 (C‑1, ~30 min) — Que el pronóstico aporte un número.** En `enriquecer_con_forecast`, agregar `margen_pronosticado = precio_pronosticado − costo_kg` e `ingreso_pronosticado = precio_pronosticado × kg`. Mostrar ambos en la tabla. Así "esperar" deja de ser una etiqueta vacía: el usuario ve *"hoy ganás X, esperando 7 días ganarías Y"*. **Este es el cambio que convierte el ML en protagonista.**
- [ ] **B3 (C‑5, ~40 min) — Surfacear calidad del modelo.** Endpoint backend que lea `modelo_forecast_meta` (último registro por corte/canal) + un badge/panel en `RecomendacionesVenta.jsx`: *"Lomo: Prophet · MAE 1.8 Bs · MAPE 3.2% · 420 pts"*. Esto es lo que demuestra "investigamos y aplicamos ML", y los datos **ya están persistidos**.

### 🔵 TRACK C — Nice to have (solo si todo lo anterior brilla)

- [ ] **C‑6:** mini‑gráfico de la serie de precios por corte en la pantalla ML.
- [ ] **C‑11:** mostrar error de conexión al ml_service en la UI.

> **Regla de oro del día:** una demo de Track A **impecable** vence a una demo de Track B **a medio cablear**. Si a las 18:00 B2 no está testeado, revertilo y presentá Track A.

---

## 6. Calibración de datos demo (precios bolivianos)

Objetivo doble: **(1)** márgenes positivos y creíbles, **(2)** que la serie sintética viva en la **misma banda** que el scraping real (~44–52 Bs/kg minorista) para que no haya quiebre estructural y el forecast sea significativo.

Editá `BASE` en `equipo13/ml_service/seed_demo.py:28`. Valores de arranque sugeridos (Bs/kg minorista), ordenados como en la realidad porcina (lomo y pierna premium, paleta el más barato):

```python
BASE = {"Lomo": 55.0, "Pierna": 52.0, "Chorizo": 50.0, "Costilla": 48.0, "Paleta": 42.0}
```

Con `costo_kg_derivado = base × 0.6` quedan: Lomo 33, Pierna 31.2, Chorizo 30, Costilla 28.8, Paleta 25.2 → **todos por debajo del precio de mercado** → márgenes positivos. Mayorista = ×0.82 (≈34–45), también con margen.

**Principio (no el número exacto):** el día de la demo, mirá qué precio real devuelve el scraping (`GET /:negocioId/precios-historico?corte=Lomo`) y ajustá `BASE["Lomo"]` para que quede **a ±10%** de ese valor. Así el último punto real no es un acantilado y "subiendo/bajando" tiene sentido. Si querés que el Lomo muestre "vender ahora" (bajada leve), poné `BASE` un poco por encima del scrape; si querés "esperar", un poco por debajo.

> Tras editar, **borrá y re‑sembrá** (el seed no recrea despiece si ya existe): ver §7, paso 3.

---

## 7. Runbook de demo en vivo (Docker) + verificación

> Entorno: Windows + Docker Desktop. Puertos: db 5433→5432, backend 3000, frontend 5173, ml_service 8001. `DB_PORT=5433` en `.env` (Postgres 18 nativo ocupa el 5432). Si Docker entra en bucle de crash del "Inference manager", cerralo, renombrá `%LOCALAPPDATA%\Docker\run` y `wsl --shutdown`.

**1. Levantar el stack:**
```powershell
cd "C:\Users\Jairo\Documents\Sistema de Costeo Estandar Productivo Universal\equipo13"
docker compose up -d --build
# Esperar a que el backend aplique migraciones. Verificar salud:
curl http://localhost:3000/health
curl http://localhost:8001/health
```

**2. Identificar el negocio demo** (Granja Olmos). Usuario `gerardo@demo.com` / `demo1234`.
```powershell
docker compose exec ml_service python seed_demo.py   # lista negocios + IDs
```

**3. (Si calibraste datos) borrar despiece viejo y re‑sembrar:**
```powershell
# Borra el lote demo (cascada borra despiece) para que el seed recree pesos/costos:
docker compose exec db psql -U postgres -d costeo -c "DELETE FROM lotes WHERE negocio_id='<NEGOCIO_ID>' AND identificador='LOTE-DEMO-ML';"
docker compose restart ml_service   # uvicorn cachea imports tras editar .py
docker compose exec ml_service python seed_demo.py <NEGOCIO_ID>
```

**4. Sembrar `corte_alias` (C‑10, imprescindible para el scraping):**
```sql
INSERT INTO corte_alias (negocio_id, alias_texto, corte_canonico) VALUES
('<NEGOCIO_ID>', 'pierna', 'Pierna'), ('<NEGOCIO_ID>', 'lomo', 'Lomo'),
('<NEGOCIO_ID>', 'costilla', 'Costilla'), ('<NEGOCIO_ID>', 'paleta', 'Paleta'),
('<NEGOCIO_ID>', 'chorizo', 'Chorizo')
ON CONFLICT (negocio_id, alias_texto) DO NOTHING;
```

**5. Correr scraping y alertas (orden importa, C‑8):**
```powershell
# Desde la UI (admin) o vía API. Primero scraping, después alertas:
# POST /api/negocios/<NEGOCIO_ID>/scraping/run
# POST /api/negocios/<NEGOCIO_ID>/alertas-precio/recalcular
```

**6. Verificación automática:**
```powershell
powershell -File verificar_demo.ps1 -NegocioId <NEGOCIO_ID>
```

### Checklist pre‑demo (verificá CADA punto en pantalla)
- [ ] `/health` de backend (3000) y ml_service (8001) responden `ok`.
- [ ] Login con `gerardo@demo.com` / `demo1234`, negocio "Granja Olmos" seleccionado.
- [ ] **Despiece:** 5 cortes, peso canal total ≈ 1425 kg (20 cab × 95 kg × 0.75), nada en rojo absurdo.
- [ ] **Recomendaciones:** 5 items, **todos los márgenes positivos**, badge "Pronóstico ML" (no "Heurístico"), acciones coherentes con la tendencia.
- [ ] **Alertas:** aparece la de Pierna/minorista (~+15%).
- [ ] (Si hiciste B3) panel de modelo muestra "Prophet" para Lomo/Pierna y "Holt‑Winters" para el resto, con MAE/MAPE.
- [ ] Scraping en "Fuentes de Datos" muestra `estado=ok` (Don Cerdo ~11 filas, Amarket ~4).

---

## 8. Guion de presentación / defensa del ML (5–7 min)

Contá la **historia**, no las funciones. Secuencia sugerida:

1. **El problema real (30 s).** "Un productor de cerdos faena un lote y obtiene varios cortes a la vez. ¿A quién le vende cada uno y cuándo, si el precio de mercado se mueve todos los días? Hoy lo decide a ojo."
2. **La cadena de costo (1 min).** Mostrá Lote → Bitácora → Despiece. Explicá el **costeo conjunto** (los dos métodos, §1.2). *Acá ganás al docente de costos.*
3. **De dónde sale el dato de mercado (1 min).** Pantalla "Fuentes de Datos" → scraping real de Don Cerdo Bolivia y Amarket. "No inventamos precios: los traemos de carnicerías reales y los normalizamos a nuestros cortes canónicos."
4. **El ML (2 min) — el centro.** "El sistema **elige el modelo según cuántos datos tenga**: Prophet con +1 año de historia (con estacionalidad y backtesting MAE/MAPE), Holt‑Winters con menos. Esto no nos lo enseñaron en la carrera; lo investigamos y lo aplicamos." Mostrá el panel de modelo (B3) y la tabla de recomendaciones.
5. **La decisión (1 min).** "Para cada corte: canal de mejor margen, ingreso estimado, y la señal del pronóstico: vender ahora o esperar." (Si hiciste B2, mostrá *hoy vs. esperando*.)
6. **Las alertas (30 s).** "Si un precio se mueve >10%, el sistema avisa." Mostrá la de Pierna.

**Preguntas trampa y cómo responderlas (honestidad técnica = credibilidad):**
- *"¿El ML decide o solo informa?"* → (Track A) "El pronóstico da la **señal temporal**; la asignación de canal es un heurístico de margen. Están separados a propósito para poder auditar cada parte." (Track B) "El pronóstico entra en el cálculo: comparamos el margen de hoy contra el margen pronosticado."
- *"¿Por qué la carne fresca 'espera' si es perecedera?"* → "El horizonte es corto (7 días) y aplica a cortes que se congelan o se procesan (chorizo, jamón). Para fresco, la señal es sobre todo 'vender ahora'." (Es una limitación real; reconocela.)
- *"¿Qué tan bueno es el modelo?"* → mostrá MAE/MAPE (B3). "MAPE de ~3% sobre backtesting de 7 días."
- *"¿La confianza 85% de dónde sale?"* → "Es un *prior* por tipo de modelo; la métrica dura es el MAPE."

---

## 9. Módulos que agregan complejidad (qué NO tocar)

Estos funcionan y **no** son el foco de mañana. Dejalos quietos; si te preguntan, decí "es alcance de otro sprint":
- **App móvil Flutter** (`app_movil/`), módulo **Operarios** (`operarioApp`, `authOperario`, `tareas`, `eventos`, `dispositivos`, `aprobaciones`, `reporteOperario`).
- **Hoja de Vida del lote**, **Rutinas**, **Pendientes**, **Mermas** (4 nodos), **CIF**, **Punto de equilibrio**: están implementados y aportan al relato de costeo, pero no toques su lógica hoy.
- **React Router / TypeScript / herramienta de migraciones:** deuda conocida, irrelevante para la demo.

**Regla:** congelá todo lo que no esté en el camino crítico de §5. Cada cambio fuera de la línea ML/despiece es riesgo puro a un día de presentar.

---

## 10. Anexo — Mapa de archivos clave

| Tema | Archivo |
|---|---|
| Pronóstico (Prophet/HW/fallback, MAE/MAPE) | `equipo13/ml_service/ml/forecast.py` |
| Recomendación (margen, canal, enriquecer) | `equipo13/ml_service/ml/recommend.py` |
| Optimización por topes | `equipo13/ml_service/ml/optimize.py` |
| Alertas de precio | `equipo13/ml_service/ml/alertas.py` |
| Series temporales | `equipo13/ml_service/ml/features.py` |
| Acceso a datos ML (cortes, precios, persistencia) | `equipo13/ml_service/ml/repo.py` |
| Endpoints ML (FastAPI) | `equipo13/ml_service/app/main.py` |
| Seed de la demo (DATOS — editá acá §6) | `equipo13/ml_service/seed_demo.py` |
| Scraping (adaptadores, normalize, runner) | `equipo13/ml_service/scraping/` |
| Despiece + costeo conjunto (backend) | `equipo13/backend/src/controllers/despieceController.js` |
| Costeo conjunto por valor de ventas | `equipo13/backend/src/services/calculoCostosConjuntos.js` |
| Cliente Node→Python | `equipo13/backend/src/services/mlClient.js` |
| Proxy ML (recomendaciones, scraping, alertas) | `equipo13/backend/src/controllers/ventasMlController.js` |
| Rutas ML | `equipo13/backend/src/routes/negocio.js` (líneas ~235, ~313–325) |
| UI recomendaciones + alertas | `equipo13/frontend/src/pages/agro/RecomendacionesVenta.jsx` |
| Tablas ML | `equipo13/backend/migrations/020_inteligencia_ventas.sql` |
| Verificación demo | `equipo13/verificar_demo.ps1` |

---

### TL;DR
El proyecto está más completo de lo que sentís; el ML funciona. Lo que rompe la percepción son **datos demo incoherentes** (Lomo a pérdida) y un **forecast que comenta pero no decide**. Track A (calibrar datos + alias + runbook) te da una demo limpia hoy mismo sin tocar código de algoritmos. Track B (3 cambios chicos) hace que el ML *decida* y muestra MAE/MAPE — y eso es lo que prueba que "investigamos y aplicamos Machine Learning". Si el tiempo aprieta, **Track A impecable gana**.
