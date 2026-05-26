# Plan de Implementación — Sprint 2

> **Branch base:** `develop` (todas las features parten y vuelven a `develop`)
> **Equipo:** Jairo, Gael, Gerardo
> **Cantidad de entregables:** 4 (1 Jairo · 1 Gael · 2 Gerardo)
> **Stack:** Node.js + Express + PostgreSQL · React 19 + Vite · sin React Router · `pg` directo · servicios puros en `services/`

---

## Convenciones del repo (vale para los 3)

- **Montos** en `DECIMAL(18,4)` — **nunca** `float`.
- **Borrado lógico** (`activo = false`) en datos maestros. `DELETE` físico solo en bitácora/registros.
- **Servicios puros** en `backend/src/services/` (funciones puras, sin tocar `pool` directamente cuando sea posible — reciben los datos como argumento).
- **Rutas** se montan en `backend/src/routes/negocio.js`, bajo `/api/negocios/:negocioId/...` y siempre llevan `authMiddleware` + `negocioOwner`.
- **Migraciones** SQL idempotentes (`IF NOT EXISTS`) en `backend/migrations/` numeradas en orden (la última es `010`; las nuevas van **011, 012, 013**).
- **Frontend**: sin React Router. Las páginas se registran en `frontend/src/App.jsx` con el `switch(page)`. Reusar componentes de `frontend/src/components/ui.jsx` (`Btn`, `MoneyDisplay`, `StatusBadge`, `RubroBadge`).
- **Hot reload activo en Docker** → editás archivos y se recargan solos en backend y frontend. Migraciones nuevas requieren `docker compose restart backend` para que `db:migrate` corra de nuevo.

---

## Flujo de trabajo común

Cada integrante:
1. Arranca desde `develop` actualizado.
2. Crea su feature branch.
3. Hace commits chicos y descriptivos (uno por sub-tarea — no megacommit final).
4. Pushea su branch al remoto.
5. Abre PR a `develop` cuando termina.

### Setup inicial (todos lo corren una vez antes de empezar)

```powershell
git checkout develop
git pull origin develop
docker compose down -v
docker compose up -d --build
```

---

# 🟢 Entregable 1 — Jairo: Módulo de Costos Indirectos de Fabricación (CIF)

**Branch:** `feat/cif-modulo`

## Lista de comprobación
1. CRUD funcional para gastos mensuales (luz, agua, gas, alquiler, depreciación).
2. Lógica de prorrateo según kilos procesados o horas de producción del lote.
3. Inyección automática de CIF prorrateado al costo total del lote.
4. UI en frontend para listar, agregar y editar gastos del mes.

## Prompt para vibecoding

> **Pegale esto a Claude Code / Cursor cuando arranques cada sub-tarea. Adaptá las secciones según el commit en el que estés.**

```
Contexto del proyecto:
- Stack: Node.js + Express + PostgreSQL (pool `pg` directo) en backend; React 19 + Vite en frontend.
- Estructura backend: controllers/, services/, routes/, middleware/. Las rutas anidadas
  bajo /api/negocios/:negocioId/* viven en backend/src/routes/negocio.js y siempre llevan
  authMiddleware + negocioOwner.
- Convenciones: DECIMAL(18,4) para todo dinero. Soft delete con activo=false. Servicios
  puros como funciones que reciben datos, no acoplados al pool si se puede.
- Frontend: sin React Router. Páginas registradas en frontend/src/App.jsx mediante
  switch(page). Componentes UI reutilizables en frontend/src/components/ui.jsx
  (Btn, MoneyDisplay, StatusBadge).
- Última migración: 010_catalogo_servicios_mejoras.sql. La próxima debe llamarse
  011_cif_gastos.sql y ser idempotente (CREATE TABLE IF NOT EXISTS).

Tarea: implementar el módulo de Costos Indirectos de Fabricación (CIF).

Especificación de la migración 011_cif_gastos.sql:
- Tabla gastos_cif:
    id UUID PK default gen_random_uuid()
    negocio_id UUID NOT NULL REFERENCES negocios(id) ON DELETE CASCADE
    concepto VARCHAR(255) NOT NULL              -- "Electricidad", "Agua", "Alquiler galpón", etc.
    categoria VARCHAR(50)                       -- 'servicios' | 'alquiler' | 'depreciacion' | 'otros'
    monto_mensual DECIMAL(18,4) NOT NULL CHECK (monto_mensual >= 0)
    metodo_prorrateo VARCHAR(20) NOT NULL CHECK (metodo_prorrateo IN ('kilos','horas','partes_iguales'))
    activo BOOLEAN NOT NULL DEFAULT TRUE
    notas TEXT
    created_at TIMESTAMP DEFAULT NOW()
- Índice por negocio_id + activo.

Endpoints (backend/src/controllers/cifController.js + routes/negocio.js):
- GET    /api/negocios/:negocioId/cif?activo=true  → lista de gastos
- POST   /api/negocios/:negocioId/cif              → crea (valida concepto + monto + metodo_prorrateo)
- PUT    /api/negocios/:negocioId/cif/:id          → actualiza
- PATCH  /api/negocios/:negocioId/cif/:id/archivar → toggle activo
- DELETE /api/negocios/:negocioId/cif/:id          → solo si no tiene aplicaciones referenciadas
- GET    /api/negocios/:negocioId/cif/prorrateo/:loteId
          → devuelve { cif_total_prorrateado, detalle: [{ concepto, monto, base_calculo, asignado }] }

Servicio puro (backend/src/services/calculoCif.js):
- export function prorratearCIF({ gastos, loteKilos, loteHoras, totalKilosNegocio, totalHorasNegocio }):
    - Para metodo='kilos': asignado = monto * (loteKilos / totalKilosNegocio)
    - Para metodo='horas': asignado = monto * (loteHoras / totalHorasNegocio)
    - Para metodo='partes_iguales': asignado = monto / numero_lotes_activos_negocio
    - Redondear a 4 decimales para evitar centavos fantasma.
    - Devolver array con detalle por concepto + total.

Integración con cálculo de costo del lote:
- En loteController.getCostosDetalle (existe ya), sumar el CIF prorrateado al costo total
  y agregarlo al detalle bajo la key "cif". El campo "otros" no debe duplicarlo.

Frontend (frontend/src/pages/GastosCIF.jsx):
- Reemplazar el placeholder actual (GastosCIFPlaceholder en App.jsx).
- Tabla con columnas: Concepto · Categoría · Monto mensual · Método prorrateo · Estado · Acciones.
- Botón "Nuevo gasto" abre un drawer (mismo patrón visual de CatalogoServicios.jsx).
- Formulario: concepto, categoria (select), monto_mensual (number), metodo_prorrateo (select), notas (textarea).
- Reusar Btn, MoneyDisplay, StatusBadge. Color accentColor = 'var(--accent-industrial)' (rubro industrial).
- Endpoint llamado vía apiFetch (frontend/src/config/api.js).

Después de implementar:
1. docker compose restart backend  (para correr la migración nueva)
2. Verifica con:
   docker compose exec db psql -U postgres -d equipo13 -c "\d gastos_cif"
3. Crea un gasto desde la UI y verifica que getCostosDetalle de un lote incluye el CIF prorrateado.
```

## Plan de commits

| # | Mensaje | Archivos tocados |
|---|---|---|
| 1 | `feat(cif): add migration 011 for gastos_cif table` | `backend/migrations/011_cif_gastos.sql` |
| 2 | `feat(cif): add calculoCif service with prorrateo logic` | `backend/src/services/calculoCif.js` + test |
| 3 | `feat(cif): add cifController with CRUD endpoints` | `backend/src/controllers/cifController.js` |
| 4 | `feat(cif): wire CIF routes in negocio.js` | `backend/src/routes/negocio.js` |
| 5 | `feat(cif): inject CIF into lote cost detail` | `backend/src/controllers/loteController.js` |
| 6 | `feat(cif): replace GastosCIFPlaceholder with real page` | `frontend/src/pages/GastosCIF.jsx` + `frontend/src/App.jsx` |
| 7 | `docs(cif): update ESTADO_DEL_PROYECTO.md` | `ESTADO_DEL_PROYECTO.md` |

## Comandos git

```powershell
# Setup
git checkout develop
git pull origin develop
git checkout -b feat/cif-modulo

# Después de cada commit
git add <archivos-específicos>
git commit -m "feat(cif): add migration 011 for gastos_cif table"
# ... repetir para los 7 commits

# Push al remoto
git push -u origin feat/cif-modulo

# Cuando termines, abrir PR a develop desde GitHub o:
gh pr create --base develop --head feat/cif-modulo --title "feat: módulo CIF (Entregable 1 Sprint 2)" --body "Implementa CRUD + prorrateo + integración + UI según Sprint 2."
```

## Definition of Done
- [ ] `docker compose restart backend` aplica la migración sin error.
- [ ] `psql ... -c "\d gastos_cif"` muestra la tabla con todos los campos.
- [ ] Desde la UI se pueden crear, editar y archivar gastos CIF.
- [ ] `GET /api/negocios/:nid/cif/prorrateo/:loteId` devuelve el desglose esperado.
- [ ] El costo total del lote (en la página de Lotes) ahora incluye el CIF.

---

# 🔵 Entregable 2 — Gael: Motor de Asignación de Costos Conjuntos

**Branch:** `feat/costos-conjuntos`

## Lista de comprobación
1. Servicio `calculoCostosConjuntos.js` con método "valor de ventas en el punto de separación".
2. Suma del costo de la canal fría + costo operativo de desposte.
3. UI para actualizar precios de mercado de cada corte (pernil, chuleta, costilla, etc.).
4. Guardado automático del nuevo costo unitario en el inventario FIFO de cada corte derivado.

## Prompt para vibecoding

```
Contexto del proyecto:
- Stack: Node.js + Express + PostgreSQL (pool pg directo); React 19 + Vite, sin React Router.
- Las rutas anidadas viven en backend/src/routes/negocio.js, todas con authMiddleware + negocioOwner.
- Convención: DECIMAL(18,4) para dinero, servicios puros como funciones.
- Última migración: 011_cif_gastos.sql (de Jairo). La tuya debe ser 012_precios_mercado.sql.
- Ya existe la tabla despiece_cortes (migración 004) con: lote_id, nombre, peso_kg,
  porcentaje_canal, costo_kg_derivado, insumo_generado_id.
- Ya existe el endpoint POST /lotes/:id/despiece/generar-insumos que crea filas en
  insumos a partir de los cortes. Tu motor va a REEMPLAZAR el cálculo simple actual
  (que usa peso) por el método de valor de ventas.

Tarea: implementar el motor de asignación de costos conjuntos para una sala de desposte
de cerdos, usando el método "valor de ventas en el punto de separación".

Concepto:
  costo_corte_i = costo_total_conjunto × (valor_mercado_corte_i / suma_valores_mercado)
  donde:
    costo_total_conjunto = costo_canal_fria + costo_operativo_desposte
    valor_mercado_corte_i = peso_corte_i × precio_mercado_corte_i

Especificación de la migración 012_precios_mercado.sql:
- Tabla precios_mercado_cortes:
    id UUID PK default gen_random_uuid()
    negocio_id UUID NOT NULL REFERENCES negocios(id) ON DELETE CASCADE
    corte_nombre VARCHAR(255) NOT NULL     -- 'Pernil', 'Chuleta', 'Costilla', 'Tocino', ...
    precio_unitario DECIMAL(18,4) NOT NULL CHECK (precio_unitario > 0)
    canal VARCHAR(20) NOT NULL CHECK (canal IN ('minorista', 'mayorista'))
    fecha_vigencia DATE NOT NULL
    activo BOOLEAN NOT NULL DEFAULT TRUE
    created_at TIMESTAMP DEFAULT NOW()
- Índice (negocio_id, corte_nombre, fecha_vigencia DESC).

Servicio puro (backend/src/services/calculoCostosConjuntos.js):
- export function asignarCostosConjuntos({
    cortes,         // [{ nombre, peso_kg }]
    preciosMercado, // { 'Pernil': 55, 'Chuleta': 38, ... }
    costoCanalFria, // DECIMAL
    costoOperativoDesposte // DECIMAL
  }):
    1. Para cada corte, valor_mercado = peso_kg × precio. Si no hay precio para
       ese corte, lanzar Error claro indicando qué falta.
    2. valor_total = suma de valores.
    3. costo_total = costoCanalFria + costoOperativoDesposte.
    4. Para cada corte:
         proporcion = valor_mercado / valor_total
         costo_asignado = costo_total × proporcion
         costo_kg = costo_asignado / peso_kg
    5. Retornar [{ nombre, peso_kg, valor_mercado, proporcion, costo_asignado, costo_kg }].
    6. Redondear a 4 decimales.

Controller (backend/src/controllers/precioMercadoController.js):
- GET    /api/negocios/:negocioId/precios-mercado?canal=minorista
- POST   /api/negocios/:negocioId/precios-mercado            (corte_nombre, precio_unitario, canal, fecha_vigencia)
- PUT    /api/negocios/:negocioId/precios-mercado/:id
- DELETE /api/negocios/:negocioId/precios-mercado/:id

Controller (backend/src/controllers/despieceController.js — extender el existente):
- POST /api/negocios/:negocioId/lotes/:loteId/despiece/asignar-costos-conjuntos
    body: { costo_operativo_desposte, canal: 'minorista'|'mayorista' }
    - Carga los cortes del lote desde despiece_cortes.
    - Carga el costo total del lote desde lotes (adquisición + bitácora confirmada).
      Ese es el "costo canal fría".
    - Carga precios_mercado_cortes vigentes (más reciente por corte, canal dado).
    - Llama al servicio puro.
    - Para cada corte: UPDATE despiece_cortes SET costo_kg_derivado = ?.
    - Si insumo_generado_id IS NOT NULL: UPDATE insumos SET precio_unitario = ?.
    - Y si hay filas en compras_insumo asociadas (FIFO), UPDATE precio_unitario también.
    - Responde con el detalle del cálculo.

Frontend:
1. Nueva página frontend/src/pages/PreciosMercado.jsx — CRUD simple con tabla y drawer
   (mismo patrón visual de CatalogoServicios). Registrar en App.jsx en el switch(page).
2. Extender frontend/src/pages/agro/Despiece.jsx:
   - Botón "Asignar costos por valor de ventas" (al lado del existente "Generar insumos").
   - Modal con input "Costo operativo de desposte" + select de canal.
   - Llama al endpoint y muestra una tabla comparativa: por peso vs. por valor de ventas.

Después de implementar:
1. docker compose restart backend
2. Carga precios desde la UI (ej: Pernil=55, Chuleta=38, Costilla=42, Tocino=18 Bs/kg).
3. En el lote LOTE-CERD-001, registra cortes (puede usar el botón existente del despiece).
4. Asigna costos conjuntos y verifica que los costos por corte son razonables
   (los cortes premium absorben más costo).
```

## Plan de commits

| # | Mensaje | Archivos tocados |
|---|---|---|
| 1 | `feat(costos-conjuntos): add migration 012 for precios_mercado_cortes` | `backend/migrations/012_precios_mercado.sql` |
| 2 | `feat(costos-conjuntos): add calculoCostosConjuntos pure service` | `backend/src/services/calculoCostosConjuntos.js` + test |
| 3 | `feat(costos-conjuntos): add precioMercadoController CRUD` | `backend/src/controllers/precioMercadoController.js` |
| 4 | `feat(costos-conjuntos): extend despieceController with valor-ventas assignment` | `backend/src/controllers/despieceController.js` |
| 5 | `feat(costos-conjuntos): register routes in negocio.js` | `backend/src/routes/negocio.js` |
| 6 | `feat(costos-conjuntos): add PreciosMercado frontend page` | `frontend/src/pages/PreciosMercado.jsx` + `frontend/src/App.jsx` |
| 7 | `feat(costos-conjuntos): add valor-ventas button to Despiece page` | `frontend/src/pages/agro/Despiece.jsx` |
| 8 | `docs(costos-conjuntos): update ESTADO_DEL_PROYECTO.md` | `ESTADO_DEL_PROYECTO.md` |

## Comandos git

```powershell
git checkout develop
git pull origin develop
git checkout -b feat/costos-conjuntos

# 1 commit por sub-tarea
git add <archivos>
git commit -m "feat(costos-conjuntos): add migration 012 for precios_mercado_cortes"
# ... repetir

git push -u origin feat/costos-conjuntos
gh pr create --base develop --head feat/costos-conjuntos --title "feat: motor de costos conjuntos (Entregable 2 Sprint 2)" --body "Implementa método valor de ventas en el punto de separación."
```

## Definition of Done
- [ ] Migración 012 aplicada.
- [ ] CRUD de precios de mercado funcional desde la UI.
- [ ] En Despiece, el botón "Asignar costos por valor de ventas" actualiza `despiece_cortes.costo_kg_derivado` y `insumos.precio_unitario`.
- [ ] Test unitario del servicio puro cubre al menos: cortes con precios, corte sin precio (lanza error), redondeo a 4 decimales.

---

# 🟠 Entregable 3 — Gerardo (1 de 2): Sistema Transaccional de Mermas (4 Nodos)

**Branch:** `feat/mermas-4-nodos`

## Lista de comprobación
1. Migración 013 con tabla `registro_mermas` + ENUM `tipo_merma` (AYUNO, FRIO, DESPOSTE, HORNO).
2. Endpoints para registrar pesajes en los 4 nodos.
3. Cálculo automático (en DB o backend) de kg de merma y % sobre peso inicial.
4. UI de captura rápida (mobile-first) para operarios de planta.

## Prompt para vibecoding

```
Contexto del proyecto:
- Stack: Node.js + Express + PostgreSQL; React 19 + Vite, sin React Router.
- Rutas anidadas en backend/src/routes/negocio.js, con authMiddleware + negocioOwner.
- Convención: DECIMAL(18,4) para todo, soft delete con activo=false.
- Última migración previa: 012_precios_mercado.sql (de Gael).
  La tuya debe ser 013_registro_mermas.sql.
- Ya existe la tabla lotes (migración 001).

Tarea: implementar el sistema de captura transaccional de mermas en los 4 nodos
críticos del proceso porcino: AYUNO/Transporte, Cámara de FRIO, DESPOSTE
(hueso/grasa), HORNO (térmica).

Especificación de la migración 013_registro_mermas.sql:
- ENUM tipo_merma (crear con DO $$ ... EXCEPTION ... END $$ para idempotencia):
    CREATE TYPE tipo_merma AS ENUM ('AYUNO', 'FRIO', 'DESPOSTE', 'HORNO');
- Tabla registro_mermas:
    id UUID PK default gen_random_uuid()
    negocio_id UUID NOT NULL REFERENCES negocios(id) ON DELETE CASCADE
    lote_id UUID NOT NULL REFERENCES lotes(id) ON DELETE CASCADE
    tipo tipo_merma NOT NULL
    fecha TIMESTAMP NOT NULL DEFAULT NOW()
    peso_inicial_kg DECIMAL(10,4) NOT NULL CHECK (peso_inicial_kg > 0)
    peso_final_kg   DECIMAL(10,4) NOT NULL CHECK (peso_final_kg >= 0)
    -- Columnas calculadas (generadas):
    merma_kg        DECIMAL(10,4) GENERATED ALWAYS AS (peso_inicial_kg - peso_final_kg) STORED
    merma_pct       DECIMAL(7,4)  GENERATED ALWAYS AS (
                      CASE WHEN peso_inicial_kg > 0
                           THEN ((peso_inicial_kg - peso_final_kg) / peso_inicial_kg) * 100
                           ELSE 0 END
                    ) STORED
    operario        VARCHAR(255)
    notas           TEXT
    created_at      TIMESTAMP DEFAULT NOW()
- Índice (lote_id, tipo, fecha DESC).
- CHECK constraint: peso_final_kg <= peso_inicial_kg (no se gana peso en una merma).

Controller (backend/src/controllers/mermaController.js):
- GET    /api/negocios/:negocioId/lotes/:loteId/mermas
            → array de mermas del lote, ordenado por fecha DESC
- GET    /api/negocios/:negocioId/lotes/:loteId/mermas/resumen
            → { total_merma_kg, por_tipo: { AYUNO: {kg, pct}, FRIO: {...}, ... } }
- POST   /api/negocios/:negocioId/lotes/:loteId/mermas
            body: { tipo, peso_inicial_kg, peso_final_kg, operario, notas }
            Valida: tipo en ENUM, pesos > 0, final <= inicial.
- DELETE /api/negocios/:negocioId/lotes/:loteId/mermas/:id
            (soft delete via flag activo=false → AGREGAR esa columna también a la migración)

Rutas registradas en backend/src/routes/negocio.js (todas con authMiddleware + negocioOwner).

Frontend — Componente de captura rápida (frontend/src/pages/agro/CapturaMermas.jsx):
- Pensado para tablets/teléfonos en planta: BOTONES GRANDES, fuente grande,
  contraste alto, sin scroll innecesario.
- Layout:
   1. Header con selector de lote (dropdown grande).
   2. 4 tarjetas grandes (una por nodo: AYUNO, FRIO, DESPOSTE, HORNO) con icono
      grande, color distintivo, y el total de merma acumulada visible.
   3. Al tocar una tarjeta, modal con 2 inputs grandes (peso inicial / peso final)
      + botón "Registrar" + cierre.
- Reusar Btn (variant='primary'), pero hacer un wrap propio para botones GRANDES
  (height: 64px, fontSize: 18px).
- Color por nodo: AYUNO #F59E0B, FRIO #3B82F6, DESPOSTE #EF4444, HORNO #F97316.
- Registrar la página en App.jsx (switch(page)) bajo el rubro agro_ganadero.
- Mostrar resumen visible: "Merma total acumulada del lote: 12.5 kg (5.2%)".

Después de implementar:
1. docker compose restart backend
2. Verifica el ENUM con:
   docker compose exec db psql -U postgres -d equipo13 -c "\dT+ tipo_merma"
3. Desde la UI, registra mermas de prueba en LOTE-CERD-001 y verifica que el
   resumen se actualiza correctamente.
```

## Plan de commits

| # | Mensaje | Archivos tocados |
|---|---|---|
| 1 | `feat(mermas): add migration 013 with ENUM and registro_mermas table` | `backend/migrations/013_registro_mermas.sql` |
| 2 | `feat(mermas): add mermaController with CRUD endpoints` | `backend/src/controllers/mermaController.js` |
| 3 | `feat(mermas): wire merma routes in negocio.js` | `backend/src/routes/negocio.js` |
| 4 | `feat(mermas): add fast-capture UI for plant operators` | `frontend/src/pages/agro/CapturaMermas.jsx` + `frontend/src/App.jsx` |
| 5 | `feat(mermas): add accumulated merma summary widget` | `frontend/src/pages/agro/CapturaMermas.jsx` |
| 6 | `docs(mermas): update ESTADO_DEL_PROYECTO.md` | `ESTADO_DEL_PROYECTO.md` |

## Comandos git

```powershell
git checkout develop
git pull origin develop
git checkout -b feat/mermas-4-nodos

git add <archivos>
git commit -m "feat(mermas): add migration 013 with ENUM and registro_mermas table"
# ... 6 commits

git push -u origin feat/mermas-4-nodos
gh pr create --base develop --head feat/mermas-4-nodos --title "feat: sistema transaccional de mermas (Entregable 3 Sprint 2)" --body "4 nodos: AYUNO, FRIO, DESPOSTE, HORNO. UI de captura rápida para planta."
```

## Definition of Done
- [ ] ENUM `tipo_merma` y tabla `registro_mermas` creados.
- [ ] Las columnas `merma_kg` y `merma_pct` son `GENERATED ALWAYS AS` (auto-calculadas, no se reciben del body).
- [ ] Desde la UI se pueden registrar mermas en los 4 nodos.
- [ ] El resumen acumulado del lote se actualiza al instante.
- [ ] Validación: peso_final ≤ peso_inicial bloqueada en backend con mensaje claro.

---

# 🟣 Entregable 4 — Gerardo (2 de 2): Motor Dinámico del Punto de Equilibrio

**Branch:** `feat/punto-equilibrio` *(empezar este DESPUÉS de mergear Entregables 1 y 3, que son dependencias)*

## Lista de comprobación
1. Servicio que consolida costos: MPD + MOD + CIF prorrateado.
2. Consulta del peso neto del lote descontando las mermas de los 4 nodos.
3. División exacta: Costo total / Peso neto = Punto de Equilibrio (costo por kg útil).
4. Endpoint + visualización en la ficha de costo del frontend.

## Prompt para vibecoding

```
Contexto del proyecto:
- Stack: Node.js + Express + PostgreSQL; React 19 + Vite, sin React Router.
- Rutas anidadas en backend/src/routes/negocio.js, con authMiddleware + negocioOwner.
- Convención: DECIMAL(18,4) para dinero, servicios puros.
- DEPENDENCIAS YA MERGEADAS A develop:
   - Entregable 1 (CIF): services/calculoCif.js con prorratearCIF(), tabla gastos_cif.
   - Entregable 3 (Mermas): tabla registro_mermas con columnas generadas merma_kg, merma_pct.
- Ya existe services/calculoCosto.js con el motor MPD + MOD para fichas de producto.
- Ya existe loteController.getCostosDetalle que devuelve { adquisicion, alimento, sanidad, mano_obra, otros, total }.

Tarea: implementar el motor dinámico del Punto de Equilibrio para un lote.

Concepto:
  punto_equilibrio = costo_total_lote / peso_neto_util_final
  donde:
    costo_total_lote   = MPD (adquisición + insumos consumidos)
                       + MOD (mano de obra desde bitácora/registros)
                       + CIF prorrateado (del servicio de Jairo)
    peso_neto_util_final = peso_actual_total_lote - SUM(merma_kg de los 4 nodos)
  El resultado se interpreta como: "cuánto cuesta cada kg que SÍ vamos a poder vender".

Servicio puro (backend/src/services/puntoEquilibrio.js):
- export async function calcularPuntoEquilibrio(pool, { negocioId, loteId }):
    1. Cargar el lote (cabezas_activas, peso_actual_prom, costo_adquisicion).
    2. costo_mpd = costo_adquisicion + SUM(monto WHERE tipo='Balanceado' AND es_baja=false) en bitacora_lote.
    3. costo_mod = SUM(monto WHERE tipo='Mano de obra' AND es_baja=false) en bitacora_lote.
    4. costo_otros = SUM(monto WHERE tipo='Sanidad / Medicamento' AND es_baja=false).
    5. Llamar prorratearCIF (del servicio de Jairo) para obtener cif_total_prorrateado.
    6. costo_total = costo_mpd + costo_mod + costo_otros + cif.
    7. peso_bruto_total = cabezas_activas × peso_actual_prom.
    8. merma_total_kg   = SUM(merma_kg FROM registro_mermas WHERE lote_id=:loteId AND activo=true).
    9. peso_neto_util   = peso_bruto_total - merma_total_kg.
   10. punto_equilibrio = peso_neto_util > 0 ? costo_total / peso_neto_util : null.
   11. Devolver JSON estructurado:
       {
         lote_id,
         desglose_costos: { mpd, mod, sanidad, cif, total },
         pesos:           { bruto_total_kg, merma_total_kg, neto_util_kg, mermas_por_tipo: {...} },
         punto_equilibrio_bs_por_kg
       }

Controller (extender backend/src/controllers/loteController.js):
- GET /api/negocios/:negocioId/lotes/:loteId/punto-equilibrio
    → llama calcularPuntoEquilibrio y retorna el JSON tal cual.

Frontend (extender frontend/src/pages/FichaCosto.jsx o crear una sección nueva):
- Si la ficha está aplicada a un producto industrial: agregar una tarjeta "Punto de
  Equilibrio Real" que muestre el costo por kg neto útil.
- En Lotes.jsx también, en la tarjeta del lote, agregar un widget "PE: Bs X.XX/kg"
  cuando el endpoint responde con valor no nulo.
- Reusar MoneyDisplay para mostrar el valor.

Test unitario obligatorio (backend/tests/puntoEquilibrio.test.js):
- Caso 1: lote con cabezas y peso, sin mermas → PE = costo / (cab × peso).
- Caso 2: lote con mermas significativas → PE > caso 1.
- Caso 3: peso_neto_util = 0 → PE = null (no division by zero).

Después de implementar:
1. docker compose restart backend
2. Verifica con curl:
   curl -X GET http://localhost:3000/api/negocios/{nid}/lotes/{loteId}/punto-equilibrio -H "Authorization: Bearer ..."
3. Cargar mermas (Entregable 3) en LOTE-CERD-001 y comparar el PE antes y después.
```

## Plan de commits

| # | Mensaje | Archivos tocados |
|---|---|---|
| 1 | `feat(punto-equilibrio): add puntoEquilibrio service with consolidated costs` | `backend/src/services/puntoEquilibrio.js` |
| 2 | `feat(punto-equilibrio): add unit tests for PE calculation edge cases` | `backend/tests/puntoEquilibrio.test.js` |
| 3 | `feat(punto-equilibrio): expose endpoint in loteController` | `backend/src/controllers/loteController.js` |
| 4 | `feat(punto-equilibrio): register PE route in negocio.js` | `backend/src/routes/negocio.js` |
| 5 | `feat(punto-equilibrio): show PE in lote card and ficha de costo` | `frontend/src/pages/agro/Lotes.jsx` + `frontend/src/pages/FichaCosto.jsx` |
| 6 | `docs(punto-equilibrio): update ESTADO_DEL_PROYECTO.md with Sprint 2 status` | `ESTADO_DEL_PROYECTO.md` |

## Comandos git

```powershell
# IMPORTANTE: arrancar este DESPUÉS de que Entregables 1 (Jairo) y 3 (Gerardo) estén
# mergeados a develop.
git checkout develop
git pull origin develop
git checkout -b feat/punto-equilibrio

git add <archivos>
git commit -m "feat(punto-equilibrio): add puntoEquilibrio service with consolidated costs"
# ... 6 commits

# Correr los tests antes de pushear
docker compose exec backend npm test

git push -u origin feat/punto-equilibrio
gh pr create --base develop --head feat/punto-equilibrio --title "feat: motor dinámico de punto de equilibrio (Entregable 4 Sprint 2)" --body "Consolida MPD + MOD + CIF y descuenta mermas para calcular PE real."
```

## Definition of Done
- [ ] Servicio puro con tests unitarios pasando.
- [ ] `GET /punto-equilibrio` devuelve el JSON estructurado.
- [ ] El PE se muestra en la tarjeta del lote.
- [ ] Comparar antes/después de cargar mermas → el PE aumenta correctamente.

---

# 📅 Orden de ejecución y dependencias

```
┌────────────────────────────────────┐
│  Jairo: Entregable 1 (CIF)         │──┐
└────────────────────────────────────┘  │
                                        ├──→ ┌──────────────────────────────────────┐
┌────────────────────────────────────┐  │    │  Gerardo: Entregable 4 (PE)          │
│  Gael: Entregable 2 (Costos Conj.) │  │    │  ⚠️ Requiere E1 y E3 mergeados ya    │
└────────────────────────────────────┘  │    └──────────────────────────────────────┘
                                        │
┌────────────────────────────────────┐  │
│  Gerardo: Entregable 3 (Mermas)    │──┘
└────────────────────────────────────┘
```

- **Día 1-2 (paralelo):** Jairo (E1), Gael (E2), Gerardo (E3).
- **Día 3:** mergear E1, E2, E3 a develop. Sincronizar dependencias.
- **Día 4:** Gerardo arranca E4 con E1 y E3 ya en develop.
- **Día 5:** Mergear E4. Sincronizar staging con develop:
  ```powershell
  git checkout staging
  git pull origin staging
  git checkout develop -- .
  git add -A
  git commit -m "Sync staging con develop (Sprint 2 completo)"
  git push origin staging
  ```

---

# 🚨 Reglas operativas

1. **Antes de empezar cada día:** `git pull origin develop` en tu rama (haz rebase con `git pull --rebase origin develop`).
2. **Antes de cada commit:** verifica que el código compila y los tests pasan:
   ```powershell
   docker compose logs backend --tail=30   # ver si hay errores
   docker compose exec backend npm test    # correr tests
   ```
3. **Si el backend crashea después de un cambio:** mirá los logs (`docker compose logs backend --tail=80`).
4. **Si tu migración necesita aplicarse:** `docker compose restart backend` la corre automáticamente (gracias al entrypoint).
5. **No commitear archivos generados:** `node_modules/`, `dist/`, `.env`, `.env.docker.example` ya está bien en .gitignore.
6. **Mensajes de commit:** usar prefijos `feat:`, `fix:`, `docs:`, `test:`, `refactor:`. Sub-scope entre paréntesis: `feat(cif): ...`.
7. **PR a develop:** describe qué hace, cómo probarlo, y screenshots si toca UI.
8. **Coordinar mediante GitHub:** abrir issues si encuentran bugs en código de otro.

---

# 📋 Checklist final del Sprint (cuando los 4 entregables estén en develop)

- [ ] Las 3 migraciones nuevas (011, 012, 013) corren limpias en un reset (`docker compose down -v && up`).
- [ ] El seed `engorde_porcino.js` sigue funcionando sin errores.
- [ ] La UI no rompe: dashboard, lotes, hoja de vida, despiece, fichas, CIF, precios mercado, mermas, todo funcional.
- [ ] Tests unitarios pasando: `docker compose exec backend npm test`.
- [ ] `ESTADO_DEL_PROYECTO.md` actualizado por cada integrante en su PR.
- [ ] Staging sincronizado con develop después de validar.
