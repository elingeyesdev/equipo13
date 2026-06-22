# Plan de implementación — ML dentro de Liquidación + Catálogo de cortes real

> **Para vibecoding con Antigravity.** Ejecutá un sub-paso a la vez (ej. "hacé la Fase 0.1"), verificá el **Criterio de aceptación**, y recién pasá al siguiente. Cada sub-paso trae un **Prompt Antigravity** listo para pegar. Al final, Jairo revisa todo.
>
> **Regla de oro:** un sub-paso = un commit. Si algo de una fase falla, no avances a la siguiente. Las fases están ordenadas por dependencia: 0 → 1 → 2 → 3 → 4 → 5.

---

## 1. La visión (qué estamos construyendo y por qué)

Hoy las "recomendaciones" están en dos lugares (el módulo ML *Recomendaciones de Venta* y el comparador de *Liquidación*) y el catálogo de cortes vive fragmentado en 3 sitios con nombres distintos. Objetivo:

1. **Una sola fuente de verdad para los cortes:** tabla `catalogo_cortes` en BD, por negocio, sembrada con la **plantilla porcina completa real** (no 5 cortes), editable desde una **pantalla dedicada**, consumida por Liquidación + Despiece + ML.
2. **El ML se consume DENTRO de Liquidación:** al elegir liquidar por **Gancho (por corte)** o **Despiece (producto)**, el sistema usa el motor ML para **pre-rellenar qué cortes/productos priorizar y sus precios** desde el mercado (últimos precios en BD + botón "Actualizar mercado" que dispara scraping on-demand). La pantalla *Recomendaciones de Venta* se mantiene como vista detallada/auditoría.
3. **Liquidación → Despiece como flujo encadenado:** al elegir Gancho/Despiece, el botón lleva al módulo Despiece (la acción) con el lote ya cargado; al volver, la liquidación usa los **kg y costos reales** del despiece.

### Flujo final (end-to-end)
```
CATÁLOGO DE CORTES (BD, por negocio, plantilla porcina completa, editable)
        │  (alimenta nombres/rendimientos a todos)
        ▼
LIQUIDACIÓN (decisión, ML embebido)
 ├─ Lote → comparador 3 escenarios (Pie / Gancho-por-corte / Despiece-producto)
 ├─ Gancho/Despiece → ML pre-rellena cortes/productos a priorizar + PVP del mercado
 │   (botón "Actualizar mercado" = scraping on-demand)
 ├─ "Siguiente: registrar despiece →"  ──────►  DESPIECE (acción: cortes reales → insumos → alimenta ML)
 │                                       ◄──────  "Volver a liquidación"
 └─ Finaliza usando KG + COSTOS REALES del despiece (Fase 4)
```

---

## 2. Modelo de datos y convenciones (leer antes de empezar)

### Tabla nueva `catalogo_cortes` (Fase 0.1)
| Columna | Tipo | Notas |
|---|---|---|
| `id` | uuid PK | `gen_random_uuid()` |
| `negocio_id` | uuid FK → negocios | `ON DELETE CASCADE` |
| `especie` | text | `'porcino'` por defecto (futuro: bovino, etc.) |
| `nombre` | text | **Nombre canónico real de mercado** (ej. "Pierna"). Es el `corte_canonico` que usa el ML. |
| `rendimiento_pct` | numeric(6,3) | % del peso canal (PCF) que representa el corte |
| `tipo` | text | `'primario' \| 'subproducto' \| 'recorte' \| 'descarte'` |
| `producto_sugerido` | text NULL | Producto industrial al que alimenta (ej. "Jamón") |
| `aliases` | text[] | Textos de scraping que matchean este corte (minúsculas) |
| `color` | text | Para barras de la UI (hex) |
| `orden` | int | Orden de despiece |
| `activo` | boolean | default `true` |
| `created_at` | timestamptz | default `now()` |

`UNIQUE (negocio_id, nombre)`. Migración idempotente con `IF NOT EXISTS` (seguir el patrón de `backend/migrations/`). **Próximo número: `023_catalogo_cortes.sql`.**

### Cómo se conecta con lo existente
- **ML / scraping:** el `corte_canonico` de `precio_mercado_historico` y `despiece_cortes.nombre` deben coincidir con `catalogo_cortes.nombre`. La tabla `corte_alias` (que usa el scraping para normalizar) se **siembra/actualiza automáticamente** desde `catalogo_cortes.aliases` (una fila por alias). **No se toca el algoritmo ML.**
- **Liquidación:** reemplaza `CORTES_DEFAULT`/`PRODUCTOS_DEFAULT` y el `localStorage` por lectura del catálogo (vía API).
- **Despiece:** el formulario de cortes ofrece los nombres del catálogo (autocompletar/select).

### Plantilla porcina estándar (datos del seed — Fase 0.2)
> Editable después en la pantalla Catálogo. Los % suman 100 sobre el canal fría (PCF).

| Nombre | Rend % | Tipo | Producto sugerido | aliases |
|---|---|---|---|---|
| Pierna | 24 | primario | Jamón | pierna, pernil |
| Paleta | 16 | primario | Chorizo | paleta, brazuelo |
| Lomo | 12 | primario | Lomo fresco | lomo |
| Costilla | 10 | primario | Costillar | costilla, costillar |
| Panceta | 9 | primario | Tocino | panceta, tocino |
| Chuleta | 8 | primario | Chuleta fresca | chuleta |
| Hueso/Carnaza | 5 | subproducto | — | hueso, carnaza |
| Bondiola | 4 | primario | Bondiola curada | bondiola, cabeza de lomo |
| Grasa | 4 | subproducto | Manteca | grasa, manteca |
| Cuero | 3 | subproducto | Chicharrón | cuero, corteza |
| Recortes | 3 | recorte | Chorizo | recorte, recortes |
| Patas | 2 | subproducto | Patitas | pata, manita, patita |

### Reglas para el agente
- Montos siempre `DECIMAL`/`numeric`, nunca `float` en BD.
- Multi-tenant: filtrar SIEMPRE por `negocio_id`; rutas bajo `/api/negocios/:negocioId/...` con `authMiddleware` + `negocioOwner`/`requireMembership`.
- Frontend: navegación por `switch(page)` en `App.jsx` (no React Router). Reusar `components/ui.jsx` (Btn, StatusBadge, MetricCard, InfoTip). No inventar design system.
- No romper los 30 tests del ml_service ni los del backend. Tras tocar `.py` del ml_service: `docker compose restart ml_service`.
- Defensivo: si un corte no tiene datos de mercado, la UI no debe romperse — simplemente no lo prioriza ni pre-rellena PVP.

---

## FASE 0 — Catálogo de cortes en BD (fundación)

### 0.1 — Migración de la tabla `catalogo_cortes`
- **Archivos:** `backend/migrations/023_catalogo_cortes.sql`
- **Qué hacer:** crear la tabla con las columnas de §2 (idempotente, `IF NOT EXISTS`, índices por `negocio_id`). Las migraciones se aplican solas al arrancar el backend.
- **Aceptación:** `docker compose restart backend` aplica la migración sin error; `\d catalogo_cortes` muestra la tabla.
- **Prompt Antigravity:** *"Creá la migración `backend/migrations/023_catalogo_cortes.sql` con la tabla `catalogo_cortes` según el modelo de datos del PLAN_ML_EN_LIQUIDACION.md §2 (idempotente, con UNIQUE(negocio_id, nombre) e índice por negocio_id). Seguí el estilo de las migraciones existentes."*

### 0.2 — Seed de la plantilla porcina + auto-carga al crear negocio
- **Archivos:** `backend/seeds/catalogoCortesPorcino.js` (nuevo), `backend/src/services/seedPlantilla.js`, `backend/seeds/engorde_porcino.js`
- **Qué hacer:** función `seedCatalogoCortesPorcino(negocioId, db)` que inserta las 12 filas de la tabla §2 (con `ON CONFLICT (negocio_id, nombre) DO NOTHING`). Llamarla desde `seedEngordePorcino` (y desde `aplicarPlantilla` cuando rubro sea agro/porcino) para que **al crear un negocio porcino se cargue sola la plantilla completa**.
- **Aceptación:** crear un negocio nuevo con plantilla `engorde_porcino` deja 12 cortes en `catalogo_cortes`.
- **Prompt Antigravity:** *"Creá `backend/seeds/catalogoCortesPorcino.js` con la plantilla porcina del PLAN §2 e invocala desde `seedEngordePorcino` en `backend/seeds/engorde_porcino.js`, con ON CONFLICT DO NOTHING."*

### 0.3 — Backfill de negocios existentes (incluida la demo "Granja Olmos")
- **Archivos:** `backend/scripts/backfill_catalogo_cortes.js` (nuevo) o un bloque idempotente en la migración 023.
- **Qué hacer:** para cada negocio agro/porcino sin filas en `catalogo_cortes`, insertar la plantilla. Necesario para que la demo actual tenga el catálogo sin recrear el negocio.
- **Aceptación:** el negocio demo (`9617c4ff-...`) queda con 12 cortes.
- **Prompt Antigravity:** *"Escribí un script idempotente que, para cada negocio con rubro agro/porcino sin cortes en catalogo_cortes, inserte la plantilla porcina. Que sea ejecutable con `docker compose exec backend node scripts/backfill_catalogo_cortes.js`."*

### 0.4 — Endpoints CRUD del catálogo + sync de `corte_alias`
- **Archivos:** `backend/src/controllers/catalogoCortesController.js` (nuevo), `backend/src/routes/negocio.js`
- **Qué hacer:** endpoints bajo `/:negocioId/catalogo-cortes`: `GET` (listar), `POST` (crear), `PUT /:id` (editar), `DELETE /:id` (borrar/`activo=false`). En POST/PUT, **sincronizar `corte_alias`**: por cada alias del corte, upsert en `corte_alias` (`negocio_id`, `alias_texto` minúscula, `corte_canonico = nombre`). Proteger con `authMiddleware` + `negocioOwner` (rol admin como el resto del módulo ML).
- **Aceptación:** crear un corte vía API agrega su fila y sus alias en `corte_alias`; el scraping luego matchea ese corte.
- **Prompt Antigravity:** *"Creá `catalogoCortesController.js` con CRUD para catalogo_cortes y montá las rutas en `negocio.js` bajo `/:negocioId/catalogo-cortes`. En crear/editar, sincronizá la tabla `corte_alias` desde el campo aliases. Seguí el patrón de `ventasMlController.js`."*

### 0.5 — Alinear el seed del ML al catálogo
- **Archivos:** `ml_service/seed_demo.py`
- **Qué hacer:** que `BASE` (precios sintéticos) y los cortes sembrados usen los **nombres del catálogo** (Pierna, Paleta, Lomo, Costilla, Panceta, Chuleta, Bondiola…) con precios bolivianos reales calibrados (banda ~40–60 Bs/kg, costo < precio). Mantener Pierna/Lomo con ≥365 días (Prophet) y el resto con 90 (Holt-Winters) para seguir demostrando la selección de modelo.
- **Aceptación:** `seed_demo.py <id>` siembra histórico para los cortes del catálogo; las recomendaciones salen con márgenes positivos.
- **Prompt Antigravity:** *"Actualizá `ml_service/seed_demo.py` para que los cortes y el dict BASE usen los nombres del catálogo del PLAN §2 con precios bolivianos calibrados (costo = base×0.6 < precio). Mantené Pierna y Lomo en 420 días (Prophet) y el resto en 90 (Holt-Winters)."*

---

## FASE 1 — Pantalla "Catálogo de cortes" + consumo en los módulos

### 1.1 — Página `CatalogoCortes.jsx` (CRUD claro)
- **Archivos:** `frontend/src/pages/agro/CatalogoCortes.jsx` (nuevo)
- **Qué hacer:** tabla editable: nombre, rendimiento %, tipo, producto sugerido, color, aliases (chips), activo. Botones agregar/editar/eliminar. Mostrar **suma de % y alerta si ≠ 100**. Reusar `components/ui.jsx`. Llama a los endpoints de 0.4.
- **Aceptación:** se pueden agregar/editar/quitar cortes y persisten en BD; la suma de % se valida visualmente.
- **Prompt Antigravity:** *"Creá la página `frontend/src/pages/agro/CatalogoCortes.jsx`: un CRUD para `/api/negocios/:id/catalogo-cortes` con validación de que los % sumen 100. Reusá Btn/StatusBadge/InfoTip de components/ui.jsx y el estilo de Despiece.jsx."*

### 1.2 — Routing + menú lateral
- **Archivos:** `frontend/src/App.jsx`, `frontend/src/layouts/AppLayout.jsx`
- **Qué hacer:** registrar `case 'catalogocortes'` en `App.jsx` y agregar el ítem al grupo "Lotes activos" de `NAV_AGRO` (ícono `scissors`/`menu`).
- **Aceptación:** el ítem "Catálogo de cortes" aparece en el sidebar agro y renderiza la página.
- **Prompt Antigravity:** *"Registrá la página CatalogoCortes en App.jsx (case 'catalogocortes') y agregá el ítem en NAV_AGRO dentro del grupo 'Lotes activos' en AppLayout.jsx."*

### 1.3 — Liquidación y Despiece leen el catálogo desde la API
- **Archivos:** `frontend/src/pages/agro/Liquidacion.jsx`, `frontend/src/pages/agro/Despiece.jsx`
- **Qué hacer:** reemplazar `CORTES_DEFAULT` / `PRODUCTOS_DEFAULT` / `localStorage (cortes_pcf_*)` por un fetch a `/catalogo-cortes`. Derivar de ahí la distribución de cortes y el mapa corte→producto (`producto_sugerido`). En Despiece, el campo "nombre del corte" pasa a ser un select/autocomplete con los nombres del catálogo. Mantener fallback si el catálogo está vacío.
- **Aceptación:** ambas pantallas muestran los cortes del catálogo (mismos nombres en toda la app). Editar el catálogo se refleja en Liquidación/Despiece.
- **Prompt Antigravity:** *"En Liquidacion.jsx y Despiece.jsx, reemplazá los cortes hardcodeados/localStorage por un fetch a /api/negocios/:id/catalogo-cortes. En Despiece, convertí el input de nombre de corte en un select con los nombres del catálogo. Dejá fallback si viene vacío."*

---

## FASE 2 — Navegación encadenada Liquidación ↔ Despiece (Enfoque A)

### 2.1 — Pasar el lote activo a Despiece
- **Archivos:** `frontend/src/App.jsx`
- **Qué hacer:** en `renderPage`, pasar `activeLote` y `setActiveLote` a `<Despiece>`. (`navigate` ya existe; Liquidación ya tiene `setActiveLote`.)
- **Aceptación:** Despiece recibe el lote activo como prop.
- **Prompt Antigravity:** *"En App.jsx, pasá activeLote y setActiveLote como props a Despiece en el case 'despiece'."*

### 2.2 — CTA "Siguiente: registrar despiece →" en Liquidación
- **Archivos:** `frontend/src/pages/agro/Liquidacion.jsx`
- **Qué hacer:** cuando `escenarioElegido` ∈ {`gancho`, `despiece`}, el botón principal del flujo pasa a ser "Siguiente: registrar despiece →": hace `setActiveLote(loteData)` y `onNavigate('despiece')`. El botón "Liquidar" queda para finalizar (al volver del despiece). Para `pie`, el flujo no cambia.
- **Aceptación:** elegir Gancho/Despiece y tocar el botón lleva al módulo Despiece con ese lote seleccionado.
- **Prompt Antigravity:** *"En Liquidacion.jsx, cuando el escenario elegido sea 'gancho' o 'despiece', mostrá un botón 'Siguiente: registrar despiece →' que haga setActiveLote(loteData) y onNavigate('despiece'). No cambies el flujo de 'pie'."*

### 2.3 — Despiece preselecciona el lote + "Volver a liquidación"
- **Archivos:** `frontend/src/pages/agro/Despiece.jsx`
- **Qué hacer:** si llega `activeLote`, preseleccionarlo (en vez del primero). Agregar botón "← Volver a liquidación" que haga `onNavigate('liquidacion')` (el lote sigue en `activeLote`).
- **Aceptación:** se entra a Despiece con el lote correcto y se vuelve a su liquidación.
- **Prompt Antigravity:** *"En Despiece.jsx, si viene activeLote preseleccioná ese lote, y agregá un botón 'Volver a liquidación' que navegue a 'liquidacion'."*

### 2.4 — Sacar "Despiece" del menú lateral
- **Archivos:** `frontend/src/layouts/AppLayout.jsx`
- **Qué hacer:** quitar el subítem `{ id: 'despiece' }` de `NAV_AGRO` (línea ~26). El `case 'despiece'` en App.jsx se mantiene (se llega solo vía liquidación).
- **Aceptación:** "Despiece" ya no está en el sidebar; solo se llega desde Liquidación.
- **Prompt Antigravity:** *"En AppLayout.jsx, quitá el subítem 'despiece' del grupo 'Lotes activos' en NAV_AGRO. No toques el case en App.jsx."*

---

## FASE 3 — ML embebido en Liquidación (auto-relleno) — el corazón

### 3.1 — Traer recomendaciones del ML en Liquidación
- **Archivos:** `frontend/src/pages/agro/Liquidacion.jsx`
- **Qué hacer:** al seleccionar `gancho`/`despiece`, hacer `apiFetch('/api/negocios/:id/recomendaciones')` (usa últimos precios en BD). Guardar el array de items (corte, canal, precio_referencia, margen_kg, tendencia, accion, precio_pronosticado). Estado de carga + manejo de error (si el ML está caído, mostrar aviso y seguir con datos manuales).
- **Aceptación:** entrar a Gancho/Despiece dispara la consulta y se ven los datos del ML en consola/estado.
- **Prompt Antigravity:** *"En Liquidacion.jsx, al elegir escenario gancho/despiece, traé las recomendaciones de /api/negocios/:id/recomendaciones y guardalas en estado, con loading y manejo de error (no romper si el ML falla)."*

### 3.2 — Botón "Actualizar mercado" (scraping on-demand)
- **Archivos:** `frontend/src/pages/agro/Liquidacion.jsx`
- **Qué hacer:** botón que hace `POST /api/negocios/:id/scraping/run` y luego re-fetch de recomendaciones. Spinner mientras corre. Mostrar timestamp de "última actualización".
- **Aceptación:** el botón scrapea y refresca los precios/recomendaciones visibles.
- **Prompt Antigravity:** *"Agregá en Liquidacion.jsx un botón 'Actualizar mercado' que haga POST /api/negocios/:id/scraping/run y luego recargue las recomendaciones, con indicador de carga y fecha de última actualización."*

### 3.3 — Gancho = venta por corte (rework del escenario + pre-relleno ML)
- **Archivos:** `frontend/src/pages/agro/Liquidacion.jsx`
- **Qué hacer:** convertir el escenario **Gancho** de "precio único de canal" a **venta por corte**: tabla con un renglón por corte del catálogo, columna PVP/kg mayorista **pre-rellenada con `precio_referencia` (canal mayorista) del ML**, ordenada por `margen_kg` desc, con badge **"prioridad ML"** + flecha tendencia en el top. `ingresoGancho = Σ(kg_corte × pvp_corte)` donde `kg_corte = pcf × rendimiento_pct/100`. El usuario puede editar cada PVP. Mantener un fallback (precio único) si no hay datos ML.
- **Aceptación:** en Gancho se ven los cortes ordenados por prioridad ML con PVP pre-cargado; el ingreso es la suma por corte; editar un PVP recalcula.
- **Prompt Antigravity:** *"En Liquidacion.jsx, reescribí el escenario Gancho como venta por corte: una fila por corte del catálogo con PVP/kg pre-rellenado desde el precio mayorista del ML, ordenadas por margen, con badge 'prioridad ML'. ingresoGancho = suma(kg_corte × pvp). Permití editar cada PVP y dejá fallback de precio único."*

### 3.4 — Despiece/producto = pre-selección y PVP de productos por ML
- **Archivos:** `frontend/src/pages/agro/Liquidacion.jsx`
- **Qué hacer:** en el Simulador Industrial, usar el mapa `corte → producto_sugerido` del catálogo. Ordenar/pre-seleccionar los productos por margen derivado del ML (margen del corte de origen). Pre-rellenar el `pvp` de cada producto con el precio de mercado del corte/producto (heurística: precio_referencia del corte de origen × factor, o precio del producto si existe). Badge "prioridad ML" en los productos top. El usuario ajusta.
- **Aceptación:** al entrar a Despiece, los productos vienen ordenados/pre-seleccionados por prioridad ML con PVP sugerido; editable.
- **Prompt Antigravity:** *"En el Simulador Industrial de Liquidacion.jsx, ordená y pre-seleccioná los productos según el margen del ML del corte de origen (usando producto_sugerido del catálogo) y pre-rellená sus PVP desde el precio de mercado. Marcá los top con 'prioridad ML'. Todo editable."*

### 3.5 — Manejo defensivo de cortes/productos sin datos ML
- **Archivos:** `frontend/src/pages/agro/Liquidacion.jsx`
- **Qué hacer:** cortes del catálogo sin recomendación ML → se muestran sin badge ni PVP pre-cargado (input vacío), nunca rompen el cálculo. Subproductos/descarte no se priorizan para venta.
- **Aceptación:** con catálogo de 12 cortes y ML cubriendo solo algunos, la pantalla funciona sin errores.
- **Prompt Antigravity:** *"Asegurá en Liquidacion.jsx que los cortes/productos sin dato del ML se muestren sin pre-relleno y no rompan los cálculos; excluí subproductos/descarte de la priorización de venta."*

### 3.6 — Enlace a la vista detallada
- **Archivos:** `frontend/src/pages/agro/Liquidacion.jsx`
- **Qué hacer:** un link/botón "Ver análisis completo del mercado →" que navegue a `recomendaciones` (la pantalla detallada se mantiene como auditoría con MAE/MAPE).
- **Aceptación:** desde Liquidación se llega a la vista detallada del ML.
- **Prompt Antigravity:** *"Agregá en Liquidacion.jsx un botón 'Ver análisis completo del mercado' que navegue a 'recomendaciones'."*

---

## FASE 4 — Liquidación con números reales del despiece (Enfoque B)

### 4.1 — Leer el despiece real al volver
- **Archivos:** `frontend/src/pages/agro/Liquidacion.jsx`
- **Qué hacer:** al montar/volver con un lote que ya tiene despiece, hacer `GET /api/negocios/:id/lotes/:loteId/despiece`. Si hay cortes reales: usar `peso_canal_total` real como PCF y el `peso_kg` real por corte (en vez del % estándar), y `costo_kg_derivado` real como costo base (reemplaza `costoKgCrudo = costoTotalLote/pcf`).
- **Aceptación:** si el lote tiene despiece registrado, la liquidación usa esos kg/costos reales; si no, cae al cálculo por % del catálogo.
- **Prompt Antigravity:** *"En Liquidacion.jsx, si el lote tiene despiece registrado (GET .../despiece), usá el peso real por corte y el costo_kg_derivado real en los escenarios Gancho/Despiece, en lugar de los % estándar y el costo uniforme. Si no hay despiece, mantené el cálculo actual por catálogo."*

### 4.2 — Indicador "datos reales vs proyección"
- **Archivos:** `frontend/src/pages/agro/Liquidacion.jsx`
- **Qué hacer:** badge que indique si los números vienen del **despiece real** o de la **proyección por catálogo**, para que el usuario sepa qué está viendo.
- **Aceptación:** la UI muestra claramente la fuente de los kg/costos.
- **Prompt Antigravity:** *"Agregá un badge en Liquidacion.jsx que diga 'datos reales del despiece' o 'proyección por catálogo' según corresponda."*

---

## FASE 5 — Datos demo y verificación

### 5.1 — Re-seed coherente para la demo
- **Archivos:** `ml_service/seed_demo.py`, script de backfill (0.3)
- **Qué hacer:** correr backfill del catálogo + `seed_demo.py` del negocio demo + sembrar `corte_alias` desde el catálogo. Verificar que Pierna/Lomo disparen Prophet.
- **Aceptación:** demo lista: catálogo completo, histórico ML, alias poblados.
- **Prompt Antigravity:** *"Documentá y dejá ejecutable la secuencia: backfill catálogo → seed_demo.py <id> → verificar alias. Confirmá que las recomendaciones salen con modo 'forecast'."*

### 5.2 — Checklist de verificación end-to-end
- [ ] Crear negocio porcino nuevo carga 12 cortes en `catalogo_cortes`.
- [ ] Pantalla Catálogo: agregar/editar/quitar persiste y valida suma 100%.
- [ ] Editar un corte se refleja en Liquidación y Despiece (mismos nombres en toda la app).
- [ ] Liquidación → elegir Gancho → cortes ordenados por prioridad ML con PVP pre-cargado.
- [ ] "Actualizar mercado" scrapea y refresca.
- [ ] Liquidación → elegir Despiece → productos pre-seleccionados por ML.
- [ ] "Siguiente: registrar despiece →" lleva a Despiece con el lote correcto.
- [ ] "Volver a liquidación" regresa; los kg/costos reales se reflejan (badge "datos reales").
- [ ] "Despiece" ya no está en el sidebar; "Recomendaciones de Venta" sí (vista detallada).
- [ ] Tests del ml_service y backend siguen verdes.

---

## 3. Riesgos y notas

- **Cortes sin histórico ML:** al pasar de 5 a 12 cortes, los nuevos no tienen serie de precios → el ML no los pronostica. Es esperado; la UI los muestra sin pre-relleno (Fase 3.5). Para la demo, los cortes con historial (Pierna/Lomo/etc.) son los que lucen el ML.
- **Dos vocabularios:** la Fase 0–1 elimina la fragmentación; verificá que `despiece_cortes.nombre`, `precio_mercado_historico.corte_canonico` y `catalogo_cortes.nombre` queden alineados. Lo que ya estaba sembrado con nombres viejos puede necesitar el backfill/re-seed (5.1).
- **Reescritura del escenario Gancho (3.3):** es el cambio más invasivo de la UI. Hacelo en su propio commit y probalo aislado. Mantené el fallback de precio único.
- **Orden demo-seguro:** Fases 0→3 ya entregan la visión completa (catálogo real + ML embebido + navegación). La Fase 4 (números reales) es aditiva: si falla, desactivala (cae a proyección por catálogo) sin romper la demo.
- **ml_service:** tras editar `.py`, `docker compose restart ml_service` (uvicorn cachea imports).

---

## 4. Resumen de archivos tocados

| Capa | Archivos |
|---|---|
| Migración | `backend/migrations/023_catalogo_cortes.sql` |
| Seeds/scripts | `backend/seeds/catalogoCortesPorcino.js`, `backend/seeds/engorde_porcino.js`, `backend/scripts/backfill_catalogo_cortes.js`, `ml_service/seed_demo.py` |
| Backend | `backend/src/controllers/catalogoCortesController.js`, `backend/src/services/seedPlantilla.js`, `backend/src/routes/negocio.js` |
| Frontend nuevo | `frontend/src/pages/agro/CatalogoCortes.jsx` |
| Frontend modificado | `frontend/src/App.jsx`, `frontend/src/layouts/AppLayout.jsx`, `frontend/src/pages/agro/Liquidacion.jsx`, `frontend/src/pages/agro/Despiece.jsx` |
| Sin tocar | Algoritmos ML (`ml_service/ml/*.py`), proxies ML del backend |
