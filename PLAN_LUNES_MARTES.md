# Plan de implementación — Lunes 18/05 → Martes 19/05

> **Objetivo:** llegar al martes con el flujo completo end-to-end del feedback del docente (compra → engorde → faena → despiece → cortes como insumos → producto industrial → comparador de escenarios) para recibir su feedback intermedio y correcciones.
>
> **Duración real:** Lunes 13:00 → 21:00 (~8h efectivas por persona) + ensayo martes AM.
>
> **Equipo:** Jairo (backend + lógica de cadena), Sebastián (frontend + UX), Gerardo (datos demo + guion).

---

## 1. Diagnóstico — qué hay vs qué pide el docente

| Lo que pide el docente | Estado real en el repo | Brecha |
|---|---|---|
| Compra de lote con peso y costo | ✅ `lotes` + `loteController.createLote` | — |
| Bitácora de alimentación / sanidad / MO | ✅ `bitacora_lote` + categorías clasificadas (migración 003) | — |
| Pesajes históricos (evolución) | ⚠️ Solo `peso_actual_prom` único en `lotes` | Falta tabla histórica |
| Conversión alimenticia (ICa) | ❌ No se calcula | Endpoint + UI |
| Faena (peso vivo → canal, rendimiento) | ⚠️ Existe dentro de `liquidarLote` pero no como módulo independiente con persistencia previa | Refactor menor |
| Despiece (cortes del canal) | ❌ No existe | **GAP PRINCIPAL** |
| Recetas / BOM industrial | ✅ `bom_items` + `etapas_produccion` + ficha de costo (MPD+MOD) | — |
| Puente despiece → BOM industrial | ❌ No existe | **GAP PRINCIPAL** (el corte debe poder ser insumo) |
| Comparador de 3 escenarios (vivo / gancho / cortes) | ⚠️ Solo pie y gancho en `liquidarLote` | Falta cortes |
| Mermas en producción | ❌ | Nice-to-have, fuera de scope hoy |
| CIF prorrateados | ❌ Placeholder | Fuera de scope hoy |
| Dashboard rentabilidad por producto | ⚠️ Existe Dashboard genérico | Widget extra |

**Recomendación arquitectónica — Opción A del prompt:** extender lo existente con Faena+Despiece, conectando agro→industrial vía "cortes que se convierten en insumos". Es lo más realista para 1 día y cierra el discurso del docente sin pivotar nada.

---

## 2. Tareas por integrante

### Jairo — backend + lógica de cadena (~8h)

| # | Tarea | Archivos | Horas |
|---|---|---|---|
| J1 | **Migración 004 + 005**: tabla `despiece_cortes` (id UUID, lote_id, nombre, peso_kg, porcentaje_canal, costo_kg_derivado, insumo_generado_id) y tabla `pesajes_lote` (lote_id, fecha, peso_prom_kg) | `backend/migrations/004_despiece.sql`, `005_pesajes.sql` | 1.5 |
| J2 | **Endpoints despiece**: `GET / POST / DELETE /negocios/:nid/lotes/:id/despiece`. El POST recibe array de cortes y los persiste; calcula `costo_kg_derivado = costo_total_lote / peso_canal_total` | `backend/src/controllers/despieceController.js`, ruta en `routes/negocio.js` | 2 |
| J3 | **Convertir cortes → insumos**: `POST /lotes/:id/despiece/generar-insumos`. Crea filas en `insumos` con `precio_unitario = costo_kg_derivado` y guarda `insumo_generado_id` en la fila del corte. **EL puente agro → industrial** | mismo controller | 1.5 |
| J4 | **Comparador 3 escenarios**: `GET /lotes/:id/escenarios` → devuelve `{ vivo, gancho, cortes }` con ingreso, costo, utilidad, margen; recomienda ganador | `backend/src/controllers/loteController.js` (nueva función `getEscenarios`) | 1.5 |
| J5 | **ICa**: `GET /lotes/:id/ica` → consume bitácora con categoría `alimento` y compara con `(peso_actual - peso_inicial) × cabezas`. Devuelve `{ kg_alimento, kg_ganados, ica, referencia: '2.5-3.0' }` | `backend/src/controllers/loteController.js` | 1 |
| J6 | Smoke test con curl/Postman de los 4 endpoints nuevos antes de merge a `develop` | — | 0.5 |

### Sebastián — frontend + UX (~8h)

| # | Tarea | Archivos | Horas |
|---|---|---|---|
| S1 | **Página Despiece** (`pages/agro/Despiece.jsx`): selector de lote liquidado, formulario para agregar cortes (nombre, peso_kg), auto-cálculo de % canal y costo/kg en vivo, tabla resumen | `frontend/src/pages/agro/Despiece.jsx` + entrada en `App.jsx` y sidebar (`AppLayout.jsx`) | 2.5 |
| S2 | Botón **"Convertir cortes en insumos"** en la misma página → llama J3, muestra confirmación con la lista de insumos creados y link a Insumos | `pages/agro/Despiece.jsx` | 1 |
| S3 | **Tercer escenario "Por cortes"** en `Liquidacion.jsx`: tabla editable de cortes × precio mercado, suma ingreso, resta gastos faena, compara con pie/gancho. Llamar `GET /escenarios` para mostrar recomendación | `frontend/src/pages/agro/Liquidacion.jsx` | 2 |
| S4 | **Widget ICa** en `Lotes.jsx` (card en cada lote) + tooltip con referencia 2.5–3.0. Color verde si ≤3.0, ámbar 3.0–3.5, rojo >3.5 | `frontend/src/pages/agro/Lotes.jsx` | 1 |
| S5 | **Dashboard**: widget "Rentabilidad por lote (último cerrado)" mostrando margen del mejor escenario | `frontend/src/pages/Dashboard.jsx` | 1 |
| S6 | QA de integración: probar flujo completo en navegador, capturar 4–5 screenshots para el guion de demo | — | 0.5 |

### Gerardo — datos demo + guion (~5h)

| # | Tarea | Archivos | Horas |
|---|---|---|---|
| G1 | **Seed plantilla "Industria cárnica"**: 1 negocio agro, 1 lote de 50 cerdos (peso inicial 8.5 kg, costo adq 350 Bs/cabeza), bitácora de 28 días (alimento 2800 kg distribuido, sanidad 600 Bs, MO 1200 Bs), pesajes intermedios (3 fechas), 6 cortes típicos (lomo, costilla, paleta, jamón, panceta, grasa), 2 productos industriales (chorizo 70/20/10, morcilla) con BOM apuntando a esos cortes. Registrarlo en `seeds/plantillas/index.js` | `backend/seeds/plantillas/industria_carnica.js`, `backend/seeds/plantillas/index.js` | 3.5 |
| G2 | **Guion de demo (10 min)**: paso a paso con clicks exactos, números esperados en pantalla (rendimiento canal 74.5 %, ICa 2.8, costo/kg vivo ≈ 18 Bs, costo/kg canal ≈ 24 Bs, escenario ganador), guion para cada miembro. Incluir frases para conectar con el feedback del docente ("aquí vemos la cadena de transformación que pediste") | `docs/demo_martes.md` | 1.5 |

---

## 3. Cronograma

| Hora | Jairo | Sebastián | Gerardo |
|---|---|---|---|
| L 13:00 – 15:00 | J1 migraciones | S1 Despiece UI estática | G1 parte 1 (lote + bitácora) |
| L 15:00 – 17:00 | J2 + J3 endpoints despiece | S1 fin + S2 botón insumos | G1 parte 2 (cortes + productos) |
| L 17:00 – 19:00 | J4 escenarios | S3 3er escenario | G1 fin + correr seed |
| L 19:00 – 21:00 | J5 + J6 | S4 + S5 + S6 | G2 guion |
| **M 08:00 – 09:30** | **Ensayo completo del demo en vivo, todos juntos. Fix de bugs visibles.** | | |
| **M 10:00** | **Reunión con docente — pedir feedback con el guion de G2** | | |

**Punto de sincronización crítico:** a las 17:00 J2+J3 deben estar mergeados a `develop` para que Sebastián pueda integrar S2 contra endpoints reales.

---

## 4. Los 3 cálculos que DEBEN funcionar en la demo

1. **Rendimiento de canal** — ya funciona en `liquidarLote` (`peso_canal / peso_vivo × 100`). Endpoint: `POST /negocios/:nid/lotes/:id/liquidar`.
2. **Costo/kg canal con desglose por categoría** — ya funciona (`getCostosDetalle` + `liquidarLote`). Demostrar el desglose `alimento / sanidad / mano_obra / otros`.
3. **Comparador de 3 escenarios con recomendación** — **NUEVO (J4 + S3)**. Endpoint: `GET /negocios/:nid/lotes/:id/escenarios`. Este es **EL** entregable que demuestra que entendieron el feedback.

### Ejemplo numérico esperado (con seed de G1)

- Lote: 50 cerdos, peso inicial 8.5 kg → peso final 95 kg, costo adquisición 17 500 Bs
- Bitácora: 2 800 kg alimento (~14 000 Bs) + sanidad 600 Bs + MO 1 200 Bs = **costo total 33 300 Bs**
- Faena: peso vivo total = 50 × 95 = **4 750 kg** → rendimiento 75 % → peso canal **3 562 kg**
- **ICa** = 2 800 / (50 × 86.5) = **0.65** ⚠️ (ajustar números del seed si sale fuera de rango 2.5–3.0)
- **Costo/kg vivo** = 33 300 / 4 750 = **7.01 Bs/kg**
- **Costo/kg canal** = 33 300 / 3 562 = **9.35 Bs/kg**
- **Escenarios:**
  - Vivo (22 Bs/kg): ingreso 104 500 → utilidad **71 200 Bs**
  - Gancho (32 Bs/kg): ingreso 113 984 → utilidad **80 684 Bs**
  - Cortes (lomo 55, costilla 38, paleta 30, jamón 42, panceta 35, grasa 12 Bs/kg): ingreso ~135 000 → utilidad ~**101 000 Bs** ⇒ **ganador**

> **Nota:** Gerardo debe ajustar los pesos finales del seed para que ICa caiga en 2.5–3.0 (rango realista). Con 50 cerdos y 2 800 kg alimento, el aumento de peso debe ser ~1 000 kg → peso final por cabeza ~28.5 kg si parten de 8.5 kg. Revisar.

---

## 5. Reglas operativas para el día

- **Branches**: `feat/despiece-backend` (Jairo), `feat/despiece-frontend` (Sebastián), `feat/seed-carnica` (Gerardo). Merge a `develop` al cierre de cada bloque.
- **Stack inamovible**: Node.js + Express + PostgreSQL, React 19 + Vite.
- **Convenciones del repo**:
  - Todos los montos en `DECIMAL(18,4)` — nunca `float`.
  - Borrado lógico (`activo = false`) en datos maestros — nunca `DELETE` físico salvo en bitácora.
  - Motor de cálculo en `services/` como función pura (no en controllers).
  - Rutas montadas en `/api/negocios/:negocioId/...` con `authMiddleware` + `negocioOwner`.
- **Si algo se atrasa**: bajar S5 (widget dashboard) y G2 puede acortarse a 30 min. **No bajar J3** (es el puente conceptual que pide el docente).
- **Frontend ya tiene diseño visual completo de Claude Design** — no rediseñar, solo conectar lógica usando los componentes de `components/ui.jsx` (Btn, MoneyDisplay, StatusBadge, RubroBadge).

---

## 6. Checklist final pre-demo (martes 08:00)

- [ ] `npm run db:migrate` aplica 004 y 005 sin errores
- [ ] `npm run db:seed:demo` carga la plantilla `industria_carnica` sin errores
- [ ] Login con usuario demo → ver lote de 50 cerdos en `/lotes`
- [ ] Click en lote → ver ICa con color (verde/ámbar)
- [ ] Ir a bitácora → ver 28 días de movimientos
- [ ] Liquidar lote → ver los 3 escenarios con recomendación
- [ ] Ir a Despiece → registrar cortes → "Convertir en insumos"
- [ ] Ir a Insumos → ver los 6 cortes nuevos con precios derivados
- [ ] Ir a Productos → chorizo → ver BOM con cortes → ver ficha de costo con costo unitario real
- [ ] Dashboard muestra widget de rentabilidad del lote liquidado
