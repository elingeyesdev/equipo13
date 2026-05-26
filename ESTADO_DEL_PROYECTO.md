# Estado del Proyecto — Sistema de Costeo Estándar Productivo Universal (CosteoUniversal)

> **Documento para NotebookLM** — Resumen ejecutivo del estado actual del repositorio `equipo13` para alimentar a un asistente con todo el conocimiento del proyecto y poder pedirle guía sobre cómo avanzar.
>
> **Fecha de corte:** 2026-05-25
> **Equipo:** Jairo (backend + lógica), Sebastián (frontend + UX), Gerardo (datos demo + seeds)
> **Branch principal:** `develop` / `staging`

---

## 1. Propósito del proyecto

Sistema web multi-tenant para **costeo estándar productivo universal**: pensado originalmente para que una empresa pueda calcular el costo real de producción de cualquier producto (industrial, agro-ganadero, cárnico, lácteo), con motor de cálculo que cubra:

- **Materia Prima Directa (MPD)** — vía BOM/recetas
- **Mano de Obra Directa (MOD)** — vía etapas de producción × costo/hora
- **CIF (Costos Indirectos de Fabricación)** — prorrateo mensual
- **Punto de Equilibrio, margen, utilidad proyectada**
- **Comparador de escenarios de venta** (vivo / gancho / cortes / industrializado) — pieza diferenciadora del producto

El sistema atiende dos rubros principales con flujos distintos:

1. **Industrial** (lácteos, panadería, embutidos) — producto con receta + etapas + costo unitario.
2. **Agro-ganadero** (engorde bovino, porcino) — lote con bitácora, conversión alimenticia, faena, despiece, y posible puente al rubro industrial (cortes → insumos de productos cárnicos).

---

## 2. Stack técnico

| Capa | Tecnología | Notas |
|---|---|---|
| Frontend | **React 19 + Vite** (JavaScript, no TypeScript) | SPA. Navegación por `switch(page)` en `App.jsx` — **no usa React Router**. |
| Backend | **Node.js + Express** (ESM, `"type": "module"`) | MVC ligero: `controllers/` + `routes/` + `services/` + `middleware/`. Sin ORM — SQL directo via `pg`. |
| Base de datos | **PostgreSQL 16** | UUID-based (`gen_random_uuid()`), todas las tablas con `created_at`. Migraciones SQL incrementales en `backend/migrations/`. |
| Auth | JWT propio | `bcryptjs` para hash de password, `jsonwebtoken` para tokens. |
| Tests | `node --test` nativo | Solo 2 archivos: `inventarioFIFO.test.js`, `estandaresAnimales.test.js`. |
| **Dockerización** | **Docker + docker-compose** (recién agregado) | 3 servicios: `db`, `backend`, `frontend`. Con hot-reload activo en backend y frontend. Migraciones automáticas al arrancar. |

### Convenciones del repo

- Montos en `DECIMAL(18,4)` — nunca `float`.
- Borrado lógico (`activo = false`) en datos maestros — `DELETE` físico solo en bitácora.
- Motor de cálculo en `services/` como funciones puras (no en controllers).
- Rutas montadas en `/api/negocios/:negocioId/...` protegidas con `authMiddleware` + `negocioOwner`.
- Multi-tenant: un usuario → N negocios → datos aislados por `negocio_id`.

---

## 3. Estructura del repositorio

```
equipo13/
├── backend/
│   ├── app.js                    Entry Express (PORT 3000, CORS, monta rutas)
│   ├── migrations/               10 archivos SQL incrementales (001 → 010)
│   ├── seeds/                    2 plantillas: industria_carnica, industria_lactea (el rubro agro se enfoca en engorde porcino — seed pendiente)
│   ├── src/
│   │   ├── config/database.js    Pool pg + runMigration()
│   │   ├── routes/               4 archivos: auth, negocios, negocio, onboarding
│   │   ├── controllers/          16 controllers (ver §5)
│   │   ├── services/             4 servicios: calculoCosto, inventarioFIFO, estandaresAnimales, seedPlantilla
│   │   └── middleware/           auth.js + negocioOwner.js
│   └── tests/                    2 tests (inventarioFIFO, estandaresAnimales)
├── frontend/
│   └── src/
│       ├── App.jsx               Router con switch(page) — 13+ páginas
│       ├── layouts/AppLayout.jsx Sidebar + topbar
│       ├── components/ui.jsx     Btn, MoneyDisplay, StatusBadge, RubroBadge (sistema de diseño)
│       ├── config/api.js         apiFetch + VITE_API_URL
│       └── pages/                13 páginas raíz + carpeta agro/ con 7 páginas más
├── docker-compose.yml            Orquestador (db + backend + frontend)
├── .env.docker.example           Plantilla de variables
└── docs/                         (ignorado por git; planning interno)
```

---

## 4. Esquema de base de datos (20 tablas)

Resultado verificado con `\dt` tras correr las 10 migraciones:

| Categoría | Tablas |
|---|---|
| Identidad / multi-tenant | `users`, `negocios` |
| Catálogos base | `unidades_medida`, `categorias_insumos`, `equivalencias_unidades`, `proveedores` |
| Catálogo de insumos y productos | `insumos`, `productos`, `bom_items`, `etapas_produccion` |
| Compras e inventario FIFO | `compras_insumo`, `consumos_lote` |
| Costeo | `fichas_costo` |
| Agro-ganadero | `lotes`, `bitacora_lote`, `pesajes_lote`, `despiece_cortes` |
| Hoja de Vida del lote | `registro_diario_lote`, `registro_diario_item`, `catalogo_servicios` |

### Migraciones en orden cronológico (señalan el camino recorrido)

1. `001_initial_schema.sql` — Schema base (users, negocios, catálogos, BOM, etapas, fichas, lotes, bitácora).
2. `002_liquidacion_lote.sql` — Liquidación de lote ganadero.
3. `003_categoria_tipo.sql` — Tipificación de categorías (alimento, sanidad, mano_obra, otros).
4. `004_despiece.sql` — Tabla `despiece_cortes` para registrar cortes del canal.
5. `005_pesajes.sql` — Tabla `pesajes_lote` (serie temporal de pesos, no solo peso actual).
6. `006_bitacora_cantidad_kg.sql` — Normalizar bitácora a kg.
7. `007_bitacora_cantidad_precio.sql` — Precios en bitácora.
8. `008_inventario_fifo.sql` — Sistema FIFO completo (campo `cantidad_disponible`, índice FIFO con desempate por `created_at`, tabla `consumos_lote`, stock mínimo).
9. `009_hoja_vida_lote.sql` — Hoja de Vida (registro_diario_lote + items + catálogo de servicios).
10. `010_catalogo_servicios_mejoras.sql` — Unidad en catálogo de servicios + "realizado por" en items.

> Todas las migraciones usan `IF NOT EXISTS` → son **idempotentes**, se pueden re-ejecutar sin riesgo.

---

## 5. Inventario completo de funcionalidad — Backend

### 5.1 Routes registradas (`app.js`)

```
/api/auth          → auth.js          (register, login, me)
/api/negocios      → negocios.js      (CRUD de negocios del usuario)
/api/onboarding    → onboarding.js    (status + completar)
/api/negocios/:id  → negocio.js       (TODO lo demás, 60+ endpoints anidados)
/health            → health check     ({status:"ok"})
```

### 5.2 Controllers (16 archivos)

| Controller | Estado | Endpoints clave |
|---|---|---|
| `authController` | ✅ Completo | register, login, me |
| `negocioController` | ✅ Completo | CRUD + desactivar |
| `onboardingController` | ✅ Completo | status, completar (aplica seed de plantilla por rubro) |
| `unidadController` | ✅ Completo | CRUD |
| `categoriaController` | ✅ Completo | CRUD + tipo (alimento/sanidad/mano_obra/otros) |
| `proveedorController` | ✅ Completo | CRUD + archivar + compras por proveedor |
| `insumoController` | ✅ Completo | CRUD + archivar |
| `productoController` | ✅ Completo | CRUD + archivar |
| `bomController` | ✅ Completo | CRUD + reorder (drag & drop) |
| `etapaController` | ✅ Completo | CRUD + reorder |
| `fichaController` | ✅ Completo | calcular, listar, obtener |
| `loteController` | ✅ Completo (módulo grande) | CRUD lote, cerrar, liquidar, costos detalle, escenarios, ICA, diario producción, consumir insumo, listar consumos |
| `despieceController` | ✅ Implementado | get/create/delete cortes + **generar-insumos** (puente agro → industrial) |
| `compraController` | ✅ Implementado | listar, stock por insumo, crear, eliminar, reporte de consumo |
| `servicioController` | ✅ Implementado | CRUD catálogo de servicios + seed cerdos |
| `hojaVidaController` | ✅ Recién terminado | estandar del día, vista mensual, detalle día, guardar registro, confirmar día |

### 5.3 Services (motor de cálculo, funciones puras)

| Service | Propósito |
|---|---|
| `calculoCosto.js` | Cálculo de ficha de costo: MPD (BOM × precio) + MOD (etapa × costo/hora) → costo unitario, costo total, precio sugerido. **MOTOR PRINCIPAL.** |
| `inventarioFIFO.js` | Consumo FIFO real con `SELECT FOR UPDATE`, desempate por `created_at`, redondeo a 4 decimales. Genera `detalle_fifo` JSONB con qué capas se consumieron. |
| `estandaresAnimales.js` | Estándares precargados de alimentación / sanidad / agua por especie (cerdo, bovino) y fase del animal (iniciación / crecimiento / desarrollo / engorde). Usado por Hoja de Vida. |
| `seedPlantilla.js` | Aplica una plantilla (industria_carnica / industria_lactea) cuando el usuario crea un negocio en el onboarding. Plantilla `engorde_porcino` referenciada en el frontend pero **seed pendiente de implementar** — crea negocio vacío con warning. |

### 5.4 Middleware

- `auth.js` — Valida JWT y carga `req.user`.
- `negocioOwner.js` — Verifica que el `negocioId` en URL pertenezca al usuario autenticado.

---

## 6. Inventario completo de funcionalidad — Frontend

### 6.1 Páginas raíz (13)

| Página | Propósito |
|---|---|
| `Login.jsx` | Login + registro |
| `Onboarding.jsx` | Wizard: nombre negocio → rubro → plantilla (aplica seed) |
| `Dashboard.jsx` | Dashboard genérico (algunas tarjetas todavía con datos hardcoded — ver §8) |
| `Configuracion.jsx` | Ajustes del negocio |
| `Unidades.jsx` | CRUD unidades de medida |
| `Categorias.jsx` | CRUD categorías de insumos |
| `Proveedores.jsx` / `DetalleProveedor.jsx` | CRUD proveedores + ver compras por proveedor |
| `Insumos.jsx` | CRUD insumos del catálogo |
| `Productos.jsx` | CRUD productos + BOM + etapas (con drag & drop) |
| `FichaCosto.jsx` | Cálculo y vista de ficha de costo de un producto |
| `Compras.jsx` | Registro de compras de insumo (inventario FIFO) |
| `Historial.jsx` | Histórico de fichas calculadas |

### 6.2 Páginas agro (`pages/agro/`)

| Página | Propósito |
|---|---|
| `Lotes.jsx` | Lista lotes ganaderos con widget ICA |
| `Bitacora.jsx` | Registrar entradas de bitácora (alimentación, sanidad, MO) |
| `Liquidacion.jsx` | Comparador 3 escenarios (vivo / gancho / cortes) |
| `Despiece.jsx` | Registrar cortes del canal + botón "convertir en insumos" |
| `HojaVida.jsx` | Vista mensual de la hoja de vida del lote |
| `RegistroDia.jsx` | Detalle de un día (estándar esperado vs registrado, confirmar) |
| `CatalogoServicios.jsx` | CRUD catálogo de servicios (vacunación, desparasitación, etc.) |

### 6.3 Componentes y layout

- `AppLayout.jsx` — Sidebar con menú dinámico según rubro del negocio activo, topbar con selector de negocio.
- `components/ui.jsx` — Sistema de diseño: `Btn`, `MoneyDisplay`, `StatusBadge`, `RubroBadge`. **Es el design system del proyecto — no se rediseña, se reusa.**
- `config/api.js` — `apiFetch(path, options)` que automáticamente envía el JWT desde `localStorage`.

---

## 7. Flujos end-to-end implementados

### 7.1 Flujo industrial completo ✅
1. Usuario se registra → crea negocio rubro industrial → onboarding aplica seed `industria_lactea`.
2. Crea / edita catálogos (unidades, categorías, proveedores, insumos).
3. Registra compras → entra al stock FIFO.
4. Crea producto → define BOM (insumos × cantidad) → define etapas (tiempo × costo/hora).
5. Genera ficha de costo → ve costo unitario MPD + MOD + precio sugerido.

### 7.2 Flujo agro-ganadero (parcial) ⚠️
1. Crea negocio rubro agro → plantilla `engorde_porcino` (seed pendiente; hoy crea negocio vacío).
2. Crea lote (cabezas, peso inicial, costo adquisición).
3. Registra bitácora (alimentación / sanidad / mano_obra) **descontando del inventario FIFO**.
4. **Hoja de Vida del lote** (NUEVO): cada día muestra el estándar esperado para la especie/fase vs lo registrado; el usuario confirma el día y se cierran los consumos.
5. Cierra lote → liquida → ve 3 escenarios (vivo / gancho / cortes con costo derivado).
6. Despiece: registra cortes del canal → convierte cortes en insumos del catálogo.

### 7.3 Puente agro → industrial ✅ (diferenciador del producto)
Tras el despiece, los cortes generados (lomo, costilla, paleta…) aparecen como insumos en el catálogo con precio = `costo_kg_derivado`. El BOM de productos industriales (chorizo, jamón) puede referenciar esos cortes y la ficha de costo refleja el costo real heredado del lote. **Este flujo funcional fue el entregable del feedback del docente.**

---

## 8. Lo que falta o está flojo

### 8.1 GAP funcional importante (del `plan_alineacion_costeo.md`)

| Item | Estado | Sprint planeado |
|---|---|---|
| **CIF (Costos Indirectos de Fabricación)** | ✅ Implementado (prorrateo por kilos/horas/partes iguales). | Sprint 2 (Entregable 1) |
| **Punto de equilibrio, WIP** | ✅ PE dinámico por lote implementado (WIP pendiente). | Sprint 2 (Entregable 4) |
| **Inventario completo con valuación promedio ponderado** | ⚠️ Hay FIFO de compras→consumos, pero no página "Inventario" con stock global ni alertas. | Sprint 4 — parcial |
| **Ventas + Clientes** | ❌ No existen módulos. Sin esto no hay margen real medido. | Sprint 6 — pendiente |
| **Motor de decisión de venta** (vivo vs gancho vs cortes vs esperar con precios de mercado vivos) | ⚠️ Existe comparador estático, no consulta precios externos. | Sprint 7 — pendiente |
| **Precios de mercado con historial** | ❌ No hay tabla ni CRUD. | Sprint 7 — pendiente |
| **Mermas reales en producción** | ✅ Implementado registro de 4 nodos (Ayuno, Frío, Desposte, Horno) para peso neto. | Sprint 2 (Entregable 3) |
| **Asignación de costos conjuntos (joint costing) formal** | ⚠️ Hay despiece manual pero no método configurable (peso vs valor de mercado). | Sprint 5 — parcial |
| **Reportes exportables (PDF/Excel)** | ❌ No existen. | Sprint 8+ |

### 8.2 Tech debt y bugs conocidos (del `plan_saneamiento_sabado16.md`)

Algunos bugs documentados que **pueden o no estar corregidos** ya — habría que verificar con `git log`:

- **F1 Historial.jsx:** hardcodea `rubro: 'industrial'` ignorando el negocio activo.
- **F3 Liquidacion.jsx:** botón "Registrar liquidación" históricamente no llamaba al endpoint (puede estar corregido).
- **F10 Dashboard.jsx:** tarjetas con datos mock (`MOCK_BY_NEGOCIO`), PVP inventado con margen 30 % fijo.
- **F13 App.jsx:** al cambiar negocio, `activeLote` y `activeProductoId` quedan stale.
- **B5 (backend):** falta tabla `liquidaciones_lote` persistente (la liquidación se calcula on-the-fly pero no se archiva).

### 8.3 Decisiones arquitectónicas transversales pendientes

1. **React Router** — El `switch(page)` ya está al límite con 20+ páginas. No se ha migrado.
2. **Capa de modelos en backend** — Los controllers escriben SQL directo. Para joins complejos (inventario, faena) sería conveniente extraer a `src/models/`.
3. **Herramienta formal de migraciones** — Hoy se ejecutan en orden alfabético desde `backend/migrations/`. No hay registro de qué se aplicó (idempotencia salva, pero no es lo correcto a largo plazo). Sugerencia: `node-pg-migrate` o `dbmate`.
4. **TypeScript en frontend** — Considerado para más adelante (Sprint 6 según el plan). Hoy es JS puro.
5. **Tests** — Solo 2 archivos. Cada service puro nuevo debería tener test con datos del documento.

---

## 9. Cambios recientes (orden cronológico aproximado)

Basado en las migraciones y los planes encontrados:

1. **Sprint 1-2:** Auth, multi-tenant, CRUDs base, BOM, etapas, ficha de costo (motor MPD+MOD).
2. **Sprint 2 extra (lunes-martes 18-19/05):** Despiece + comparador de 3 escenarios + ICA + conversión cortes → insumos (entregable del feedback docente).
3. **Saneamiento (sábado 16/05):** Corrección de bugs visuales y conexiones frontend-backend, pulido del módulo agro.
4. **Inventario FIFO v2.1:** Compras de insumo con capas FIFO, consumos con `FOR UPDATE` y desempate por `created_at`, redondeo a 4 decimales.
5. **Hoja de Vida del lote:** Estándares por especie/fase, registro diario con confirmación, integración con FIFO al confirmar día.
6. **Dockerización (recién hecho hoy, 25/05):** docker-compose con db + backend + frontend, migraciones automáticas, hot-reload, `.env.docker.example`. Probado y funcionando.
7. **Sprint 2 (Costos & Rendimientos):**
   - CIF (Costos Indirectos de Fabricación) con prorrateo automático (kilos, horas, partes).
   - Mermas (4 nodos) para seguimiento de pérdida de peso.
   - Motor Dinámico de Punto de Equilibrio (PE = costo_total / peso_neto_util).

---

## 10. Preguntas estratégicas pendientes (qué sería útil consultarle al NotebookLM)

1. **Próximo Sprint:** ¿Atacamos Sprint 3 (CIF + punto de equilibrio + liquidación persistente) para cerrar deuda del MVP industrial, o pivoteamos a un Sprint híbrido que cubra Ventas (Sprint 6) para ya tener el ciclo end-to-end aunque sea simple?
2. **Asignación de costos conjuntos:** Hoy el despiece reparte por peso. ¿Cuándo justificar el método "valor de mercado" y cómo modelarlo limpiamente sin reinventar la rueda?
3. **React Router:** ¿Migración big-bang o gradual página por página? Hoy ya empieza a doler con 20+ páginas en `switch`.
4. **Herramienta de migraciones:** ¿`node-pg-migrate`, `dbmate`, `Knex migrate`? ¿Vale la pena el costo de migración ahora o esperamos a tener clientes piloto?
5. **Producción y mermas:** ¿Cómo modelar un "lote de producción industrial" (ej: lote de chorizo) sin chocar con el lote ganadero? ¿Mismas tablas con `tipo` o tablas separadas?
6. **Reportes:** Cuando llegue el momento, ¿generación en el backend (puppeteer/pdfkit) o en el frontend (jsPDF/react-pdf)?
7. **Multi-rubro en un mismo negocio:** El plan dice "un negocio = un rubro, los cárnicos serían 2 negocios linkeados". ¿Es la decisión correcta a largo plazo o lo replanteamos?
8. **Tests:** Estrategia mínima viable — ¿solo services puros, o también integration tests con base de datos efímera (testcontainers)?

---

## 11. Cómo arrancar el proyecto

### Local con Docker (recomendado)
```powershell
# Requisitos: Docker Desktop instalado y abierto
Copy-Item .env.docker.example .env
docker compose up -d --build
# Abrir http://localhost:5173
```

### Local sin Docker
```powershell
# Backend
cd backend
npm install
# Configurar backend/.env con DATABASE_URL apuntando a una postgres local
npm run db:migrate
npm run dev   # PORT 3000

# Frontend (en otra terminal)
cd frontend
npm install
npm run dev   # PORT 5173
```

### Tests
```powershell
cd backend
npm test
```

---

## 12. Documentos de planificación en el repo (lectura recomendada para contexto histórico)

| Archivo | Qué contiene |
|---|---|
| `proyecto costeo.md` | Documento original con la visión completa del producto (escrito por el docente o el equipo inicial). |
| `plan_alineacion_costeo.md` | Análisis brecha + roadmap por Sprints (3 a 8+). El plan estratégico. |
| `PLAN_LUNES_MARTES.md` | Sprint corto para preparar feedback del docente — despiece + escenarios. |
| `plan_saneamiento_sabado16.md` | Lista de bugs F1-F16 y mejoras UI U1-U10 detectadas en una revisión. |
| `plan_inventario_fifo_v2_1.md` | Plan detallado del inventario FIFO con las 4 correcciones aplicadas. |
| `plan_hoja_vida_lote.md` | Plan del módulo Hoja de Vida con estándares por especie y fase. |
| `guia_sprint2_implementacion.md` | Guía Sprint 2 (ignored by git, en local). |

---

## 13. Resumen ultra-corto

- **Stack:** Node + Express + PostgreSQL + React + Vite. Dockerizado y corriendo.
- **Implementado (~75% del MVP soñado):** Auth, multi-tenant, onboarding, CRUDs base, BOM + etapas, ficha de costo (MPD+MOD), inventario FIFO, lotes ganaderos + bitácora, hoja de vida, despiece, comparador de escenarios, puente agro→industrial, CIF prorrateado, registro de mermas, y cálculo dinámico de Punto de Equilibrio.
- **Pendiente:** Ventas + clientes, WIP, motor de decisión con precios de mercado, reportes, React Router, herramienta de migraciones, más tests.
- **Próxima decisión clave:** elegir entre cerrar deuda del motor de costos (Sprint 3) o avanzar al ciclo end-to-end con ventas (saltar a Sprint 6).
