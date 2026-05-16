# Plan de Alineación — Sistema de Costeo Estándar Productivo Universal

**Documento de referencia:** `proyecto costeo.md`
**Fecha:** 2026-05-14
**Branch actual:** `staging`

---

## 1. Análisis del estado actual

### 1.1 Stack confirmado
- **Backend:** Node.js + Express + PostgreSQL. Estructura MVC ligera (`controllers/`, `routes/`, `middleware/`, `services/`). Sin capa de modelos formales — los controllers escriben SQL directo contra el pool.
- **Frontend:** React 19 + Vite, **JavaScript (JSX) — no TypeScript**. SPA con un único `App.jsx` que renderiza páginas vía `switch (page)` sobre estado local (no hay React Router).
- **DB:** Un solo archivo de migración `001_initial_schema.sql` con 13 tablas UUID-based. No hay migraciones incrementales.

### 1.2 Lo que YA está implementado
| Área | Estado | Archivos clave |
|---|---|---|
| Auth JWT (registro/login/me) | ✅ | `controllers/authController.js`, `middleware/auth.js` |
| Negocios multi-tenant (un usuario → N negocios) | ✅ | `controllers/negocioController.js`, `middleware/negocioOwner.js` |
| Onboarding wizard (rubro + plantilla) | ✅ | `pages/Onboarding.jsx`, `controllers/onboardingController.js` |
| CRUDs base | ✅ | unidades, categorías, proveedores, insumos, productos |
| BOM / Receta por producto | ✅ | `controllers/bomController.js`, tabla `bom_items` |
| Etapas de producción (tiempo + costo/hora) | ✅ | `controllers/etapaController.js`, tabla `etapas_produccion` |
| Motor MPD + MOD (cálculo puro) | ✅ | `services/calculoCosto.js`, tabla `fichas_costo` |
| Lotes ganaderos + bitácora (UI) | ✅ parcial | `pages/agro/Lotes.jsx`, `Bitacora.jsx`, tablas `lotes`, `bitacora_lote` |
| Seeds plantilla | ✅ | `seeds/industria_lactea.js`, `seeds/engorde_bovino.js` |

### 1.3 Lo que está como placeholder o falta
- **CIF (Costos Indirectos de Fabricación):** placeholder en frontend (`GastosCIFPlaceholder`), no hay tabla ni motor.
- **Liquidación de lote ganadero:** página existe pero **no hay motor de cálculo** (costo/kg vivo, costo/kg canal).
- **Punto de equilibrio, WIP, margen, utilidad proyectada:** marcados como Sprint 3, no implementados.
- **Historial de pesajes:** la tabla `lotes` solo guarda peso inicial/actual, no la serie temporal.
- **Faena / despiece industrial:** no existe — el modelo BOM es unidireccional (insumos → 1 producto), no soporta "1 animal → N productos con merma".
- **Inventario:** no hay módulo. No se descuentan insumos al producir.
- **Compras:** no hay módulo. Los insumos se crean con precio plano, sin trazabilidad de lote de compra.
- **Ventas y rentabilidad real:** no existen módulos.
- **Comparador de escenarios de venta:** la pieza de "inteligencia" del documento (vivo vs gancho vs cortes vs esperar) no existe.

---

## 2. Brecha entre lo actual y la visión `proyecto costeo.md`

El documento describe **dos productos en uno**:

1. **Costeo agro-ganadero:** ciclo de vida del animal (compra → engorde → faena → venta) con motor de decisión "cómo conviene vender".
2. **Costeo industrial cárnico (ERP tipo Embutidos Colonia Piraí):** transformación animal → productos terminados con recetas, rendimientos, mermas, lotes de producción y rentabilidad por línea.

El sistema actual cubre **~30% del MVP descrito**:
- ✅ El esqueleto multi-tenant, auth y onboarding está sólido y reutilizable.
- ✅ El concepto de "producto con receta + etapas" cubre la parte industrial básica (un yogur, un queso).
- ❌ **No modela transformación "1 → N"** (un cerdo → chorizo + jamón + tocino + grasa). El BOM actual es `producto → insumos`, pero el documento pide `materia prima animal → múltiples productos terminados con rendimientos`.
- ❌ **No hay ciclo de vida del lote ganadero** con costos acumulados día a día.
- ❌ **No hay módulo de decisión de venta**, que es el diferenciador clave del documento.

### 2.1 Decisión arquitectónica central que falta tomar
El documento mezcla dos paradigmas de costeo:
- **Por orden de producción (job costing):** un lote de chorizo de 500 kg → costo unitario.
- **Por subproductos con asignación por valor de mercado o peso:** un cerdo se "explota" en N productos y hay que repartir el costo del animal entre ellos.

Hoy el motor solo hace el primero. Para alinearse hay que introducir **costeo conjunto (joint costing)** o al menos un mecanismo de asignación de costos del animal a los cortes/productos derivados.

---

## 3. Estrategia de alineación

El proyecto está bien posicionado para evolucionar **incrementalmente** sin reescribir. Recomendación:

1. **No tirar nada.** El esquema actual (`negocios`, `insumos`, `productos`, `bom_items`, `lotes`) es compatible con la visión.
2. **Cerrar primero el motor de costos para ambos rubros** (CIF, liquidación ganadera). Eso ya estaba comprometido como Sprint 3.
3. **Agregar capas nuevas** (compras, faena/despiece, producción por lote, inventario, ventas) cada una como migración incremental.
4. **El motor de decisión de venta** se construye al final, encima de los datos de costos + precios de mercado.

### 3.1 Principio de diseño
- Mantener la **separación clara** entre rubro `industrial` y `agro_ganadero` que ya existe.
- Cuando un negocio combina ambos (caso embutidoras), se modela como **dos negocios linkeados** o se agrega un tercer rubro `industrial_carnico` que comparte tablas de ambos.

---

## 4. Roadmap por Sprints

Cada Sprint = ~1 semana de trabajo del equipo (3 personas). Tareas marcadas `[BE]` backend, `[FE]` frontend, `[DB]` migración, `[QA]` test/validación.

---

### 🟢 Sprint 3 — Cerrar el motor de costos (lo prometido)

**Objetivo:** Que cualquier negocio (industrial o agro) tenga **costo unitario real** incluyendo CIF, y que un lote ganadero genere una liquidación con costo/kg vivo y costo/kg canal.

#### Backend
- `[DB]` Migración `002_cif_y_liquidacion.sql`:
  - Tabla `gastos_cif` (`id`, `negocio_id`, `concepto`, `monto_mensual`, `metodo_prorrateo`, `activo`).
  - Tabla `liquidaciones_lote` (`id`, `lote_id`, `fecha_cierre`, `peso_final_total`, `peso_canal_total`, `costo_total`, `costo_kg_vivo`, `costo_kg_canal`, `detalle JSONB`).
  - Tabla `pesajes_lote` (`id`, `lote_id`, `fecha`, `peso_promedio`, `cabezas_pesadas`, `notas`) — separar de bitacora para tener la serie temporal.
- `[BE]` `controllers/cifController.js` — CRUD + endpoint `GET /api/negocios/:id/cif/prorrateo-mensual`.
- `[BE]` Extender `services/calculoCosto.js`:
  - Añadir cálculo de **CIF unitario** (prorrateo mensual ÷ producción estimada).
  - Añadir cálculo de **punto de equilibrio** = CF / (precio − CV unitario).
  - Añadir cálculo de **margen y utilidad por unidad y por lote**.
- `[BE]` `services/calculoLiquidacion.js` (NUEVO) — pure function: suma de bitácora + CIF prorrateado + compra inicial → costo/kg vivo y canal.
- `[BE]` Endpoint `POST /api/negocios/:id/lotes/:loteId/liquidar`.

#### Frontend
- `[FE]` Reemplazar `GastosCIFPlaceholder` por página real `pages/GastosCIF.jsx` con CRUD.
- `[FE]` Extender `pages/FichaCosto.jsx`: agregar tabla CIF y métricas de PE/margen ya presentes en el diseño pero sin datos.
- `[FE]` Completar `pages/agro/Liquidacion.jsx` con datos reales: tarjetas costo/kg vivo, costo/kg canal, escenarios de venta básicos (vivo vs gancho).

#### QA
- `[QA]` Tests unitarios de `calculoCosto.js` y `calculoLiquidacion.js` (datos sintéticos con resultado conocido).

---

### 🟡 Sprint 4 — Compras, inventario y trazabilidad

**Objetivo:** Que cuando se "compra insumo X" o "compra de animales" quede registrada y el inventario refleje stock real. Sin inventario no hay merma medible.

#### Backend
- `[DB]` Migración `003_compras_inventario.sql`:
  - Tabla `compras` (`id`, `negocio_id`, `proveedor_id`, `fecha`, `tipo` ['insumo'|'animal'], `total`, `notas`).
  - Tabla `compra_items` (`id`, `compra_id`, `insumo_id` NULL, `lote_id` NULL, `cantidad`, `unidad_id`, `precio_unitario`, `subtotal`).
  - Tabla `movimientos_inventario` (`id`, `negocio_id`, `insumo_id`, `tipo` ['entrada'|'salida'|'ajuste'|'merma'], `cantidad`, `referencia_tipo`, `referencia_id`, `fecha`).
- `[BE]` `controllers/compraController.js` con creación atómica (compra + items + movimientos de entrada).
- `[BE]` `services/inventario.js`:
  - `getStock(insumoId)` — suma de movimientos.
  - `registrarSalidaPorProduccion(productoId, cantidad)` — descuenta insumos según BOM.
  - `registrarMerma(insumoId, cantidad, motivo)`.

#### Frontend
- `[FE]` Nueva página `pages/Compras.jsx` con tabla de compras y modal "Nueva compra" (selecciona proveedor → agrega items).
- `[FE]` Nueva página `pages/Inventario.jsx` con stock actual por insumo, valuación a precio promedio ponderado, alertas de stock bajo.
- `[FE]` Para rubro ganadero: "Compra de animales" alimenta directamente el lote (crear lote desde compra).

---

### 🟠 Sprint 5 — Faena, despiece y costeo conjunto

**Objetivo:** Cuando un negocio cárnico procesa un animal, el sistema reparte el costo del animal entre los productos derivados.

#### Backend
- `[DB]` Migración `004_faena_despiece.sql`:
  - Tabla `faenas` (`id`, `negocio_id`, `lote_id`, `fecha`, `peso_vivo_total`, `peso_canal_total`, `cabezas`, `costo_faena`, `mermas_peso`).
  - Tabla `cortes` (`id`, `negocio_id`, `nombre`, `tipo_animal`, `peso_promedio_estandar`, `precio_mercado`) — catálogo: lomo, costilla, jamón, etc.
  - Tabla `faena_cortes` (`id`, `faena_id`, `corte_id`, `peso_obtenido`, `costo_asignado`, `destino` ['venta_directa'|'produccion'|'merma']).
  - Tabla `transformaciones` (`id`, `negocio_id`, `corte_id`, `producto_id`, `cantidad_corte`, `cantidad_producto`) — relaciona "20 kg de carne magra → 25 kg chorizo".
- `[BE]` `services/asignacionCostos.js`:
  - **Método peso:** asigna costo del animal proporcional al peso de cada corte.
  - **Método valor de mercado:** asigna proporcional al precio de venta esperado.
  - El negocio elige método en su configuración.
- `[BE]` Endpoint `POST /api/negocios/:id/faenas` que en una sola transacción cierra el lote, crea la faena, distribuye los cortes y registra entradas a inventario.

#### Frontend
- `[FE]` Nueva página `pages/Faena.jsx` — wizard de 3 pasos: lote a faenar → registrar pesos por corte → revisar asignación de costos → confirmar.
- `[FE]` Nueva página `pages/Cortes.jsx` — catálogo editable de cortes por tipo de animal.
- `[FE]` Activar plantilla **`embutidos_porcinos`** en el onboarding (paralela a `industria_lactea`).

---

### 🔵 Sprint 6 — Producción por lote, mermas reales y ventas

**Objetivo:** Que producir un lote de chorizo descuente insumos, registre merma real (peso entrada vs peso salida) y que vender genere un movimiento.

#### Backend
- `[DB]` Migración `005_produccion_ventas.sql`:
  - Tabla `lotes_produccion` (`id`, `negocio_id`, `producto_id`, `codigo` ['CH-2026-001'], `fecha_inicio`, `fecha_fin`, `cantidad_planificada`, `cantidad_obtenida`, `merma_porcentaje`, `costo_total`, `costo_unitario`, `operario`, `notas`).
  - Tabla `clientes` (`id`, `negocio_id`, `nombre`, `tipo` ['supermercado'|'distribuidor'|'restaurante'|'final'], `contacto`).
  - Tabla `ventas` (`id`, `negocio_id`, `cliente_id`, `fecha`, `total`, `estado`).
  - Tabla `venta_items` (`id`, `venta_id`, `producto_id`, `lote_produccion_id`, `cantidad`, `precio_unitario`, `costo_unitario_snapshot`).
- `[BE]` `controllers/loteProduccionController.js`:
  - Al cerrar lote: calcula merma = (planificada − obtenida) / planificada, descuenta insumos reales, congela costo unitario.
- `[BE]` `controllers/ventaController.js`:
  - Al crear venta: descuenta producto terminado del inventario, guarda snapshot de costo para reportar margen real.

#### Frontend
- `[FE]` Página `pages/LotesProduccion.jsx` — listar lotes con estados (planificado/en proceso/cerrado), merma calculada.
- `[FE]` Página `pages/Ventas.jsx` — registro de ventas.
- `[FE]` Página `pages/Clientes.jsx` — CRUD básico.

---

### 🟣 Sprint 7 — Inteligencia: dashboard y motor de decisión

**Objetivo:** El diferenciador del documento — responder "¿cómo me conviene vender?" y "¿qué producto deja más?".

#### Backend
- `[BE]` `services/escenariosVenta.js`:
  - Para un lote ganadero, calcula utilidad proyectada bajo: venta vivo, venta kilo gancho, venta faeneado entero, venta por cortes.
  - Toma precios de mercado de un nuevo CRUD `precios_mercado` (tabla con histórico).
- `[BE]` `services/rentabilidad.js`:
  - Margen por producto = (precio venta promedio − costo unitario snapshot) / precio.
  - Top productos por margen y por volumen.
  - Detección de líneas con merma anómala (>X% sobre histórico).
- `[BE]` Endpoint `GET /api/negocios/:id/dashboard` agregando ventas del día, producción del día, costo promedio, merma, productos top, stock crítico, utilidad mensual.

#### Frontend
- `[FE]` Renovar `pages/Dashboard.jsx` con las tarjetas que pide el documento (líneas 956–966).
- `[FE]` Nueva página `pages/EscenariosVenta.jsx` (solo agro): comparativa visual de las 4 estrategias de venta con utilidad proyectada y recomendación destacada.
- `[FE]` Nueva página `pages/Rentabilidad.jsx` (industrial): ranking de margen por producto, alertas de merma alta.
- `[FE]` Nueva página `pages/PreciosMercado.jsx` — registro manual semanal de precios de referencia.

---

### ⚪ Sprint 8+ — Hardening y features de escala (opcional)

- Reportes exportables (PDF/Excel).
- App móvil para registro de pesajes en campo.
- Integración con balanzas (Bluetooth / serial).
- Lectura de códigos QR para identificar lotes.
- Multi-sucursal.
- Predicción ML del mejor momento de venta (cuando haya suficiente histórico).
- Facturación electrónica (Bolivia: integración con SIAT).

---

## 5. Cambios estructurales transversales recomendados

### 5.1 Routing en frontend
El `switch (page)` actual en `App.jsx` no escala a 20+ páginas. **Migrar a React Router v6** en el primer Sprint que toque navegación nueva (Sprint 3 o 4). Beneficio adicional: URLs compartibles, back/forward del navegador.

### 5.2 Capa de modelos en backend
Hoy los controllers escriben SQL directo. A medida que crece la complejidad (joins de inventario, faena con asignación), introducir una carpeta `src/models/` con funciones puras `(pool, args) => Promise<row>`. No hace falta un ORM completo, solo encapsular el SQL.

### 5.3 Migraciones incrementales
Reemplazar el `001_initial_schema.sql` monolítico por una herramienta de migraciones (sugerencia: `node-pg-migrate` o `dbmate`). Crítico antes de Sprint 4 para no romper datos en cada cambio.

### 5.4 Tests
Solo hay tests planificados para `calculoCosto.js`. Cada nuevo servicio puro (`calculoLiquidacion`, `asignacionCostos`, `escenariosVenta`) **debe tener tests con datos del documento** (ej. el ejemplo del cerdo de 120 kg → 90 kg canal). Esto protege la lógica de negocio durante la evolución.

### 5.5 Tipado
Considerar migrar el frontend a TypeScript en Sprint 6 (cuando los flujos de venta/dashboard ya tienen muchos shapes). Hoy es prematuro.

---

## 6. Resumen de prioridades

| Prioridad | Item | Razón |
|---|---|---|
| 🔴 P0 | Sprint 3 (CIF + liquidación) | Cierra deuda del MVP actual. Sin esto, el sistema "miente" en el costo. |
| 🔴 P0 | React Router | El switch-case ya está al límite con 13 páginas. |
| 🟠 P1 | Sprint 4 (compras + inventario) | Sin inventario, mermas y ventas son ficción. |
| 🟠 P1 | Sprint 5 (faena + despiece) | Es el corazón del documento — diferencia el sistema de cualquier ERP genérico. |
| 🟡 P2 | Sprint 6 (producción + ventas) | Cierra el ciclo end-to-end. |
| 🟢 P3 | Sprint 7 (dashboard + motor decisión) | El "wow" comercial, pero requiere los anteriores como base. |
| ⚪ P4 | Sprint 8+ | Solo si hay tracción real con clientes piloto. |

---

## 7. Riesgos y supuestos

- **Riesgo principal:** El equipo de 3 personas puede no llegar a Sprint 7 antes de fin de semestre. Recomendación: priorizar Sprints 3-4 para cubrir el rubro industrial completo, luego elegir entre Sprint 5 (cárnico) o Sprint 7 (inteligencia agro) según qué cliente piloto consigan primero.
- **Supuesto:** Los precios de mercado se ingresan manualmente. Conectar APIs (Senasag, mercados regionales) es Sprint 8+.
- **Supuesto:** Un negocio = un rubro. Si un cliente real combina (engorda y faena), se modela con dos negocios linkeados.
- **Decisión pendiente:** método por defecto de asignación de costos conjuntos en faena (peso vs valor de mercado). Recomiendo **valor de mercado** porque refleja mejor la realidad económica, pero requiere mantener tabla de precios actualizada.

---

**Próximo paso sugerido:** abrir el Sprint 3 como issue/milestone y empezar por la migración `002_cif_y_liquidacion.sql`, que desbloquea todo lo demás del motor de costos.
