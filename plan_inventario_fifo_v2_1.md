# Plan de Implementación — Sistema de Inventario FIFO (Versión Corregida)
## Correcciones aplicadas post-revisión · CosteoUniversal

> Las 4 correcciones de Gemini son válidas y están aplicadas aquí.
> Este archivo reemplaza al plan anterior.

---

## Las 4 correcciones aplicadas

### Corrección 1 — Desempate de fechas en el índice FIFO
**Problema:** Dos compras del mismo insumo el mismo día tienen orden ambiguo con `DATE ASC` solo.  
**Fix:** Agregar `created_at ASC` como criterio de desempate en el índice y en **todos** los queries que ordenan por FIFO.

### Corrección 2 — Redondeo de flotantes en JavaScript
**Problema:** `0.1 + 0.2 = 0.30000000000000004` en JS. Con cantidades y precios grandes se acumulan centavos fantasma.  
**Fix:** Redondear subtotales y totales a 4 decimales antes de retornar del servicio FIFO.

### Corrección 3 — `SELECT FOR UPDATE` en el consumo
**Problema:** Sin bloqueo de filas, dos consumos simultáneos leen el mismo stock y se pisan mutuamente.  
**Fix:** Agregar `FOR UPDATE` al SELECT de capas dentro de la transacción.

### Corrección 4 — El preview de costo puede quedar desactualizado
**Problema:** Entre que el usuario ve el estimado y hace clic en "Registrar", otro consumo pudo agotar el stock barato.  
**Fix:** El costo definitivo que devuelve el POST reemplaza inmediatamente al estimado en la UI.

---

## TAREA 1 — Migración de base de datos
**Archivo:** `backend/migrations/008_inventario_fifo.sql`
**Asignado:** Gerardo
**Tiempo:** 1h

**Prompt para Claude Code:**
> "Crea `backend/migrations/008_inventario_fifo.sql` con exactamente este contenido:
>
> ```sql
> -- 1. Agregar columna de alerta de stock mínimo al catálogo
> ALTER TABLE insumos
>   ADD COLUMN IF NOT EXISTS stock_minimo_alerta DECIMAL(18,4) DEFAULT NULL;
>
> -- 2. Tabla de compras de insumos (cada línea de compra = una capa FIFO)
> CREATE TABLE IF NOT EXISTS compras_insumo (
>   id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
>   negocio_id          UUID NOT NULL REFERENCES negocios(id) ON DELETE CASCADE,
>   insumo_id           UUID NOT NULL REFERENCES insumos(id),
>   proveedor_id        UUID REFERENCES proveedores(id),
>   fecha_compra        DATE NOT NULL,
>   cantidad_comprada   DECIMAL(18,4) NOT NULL CHECK (cantidad_comprada > 0),
>   cantidad_disponible DECIMAL(18,4) NOT NULL CHECK (cantidad_disponible >= 0),
>   precio_unitario     DECIMAL(18,4) NOT NULL CHECK (precio_unitario > 0),
>   unidad_id           UUID REFERENCES unidades_medida(id),
>   numero_factura      VARCHAR(100),
>   notas               TEXT,
>   created_at          TIMESTAMP DEFAULT NOW()
> );
>
> -- Índice FIFO con desempate por created_at (corrección: evita ambigüedad
> -- cuando hay dos compras del mismo insumo en el mismo día)
> CREATE INDEX IF NOT EXISTS idx_compras_fifo
>   ON compras_insumo(insumo_id, fecha_compra ASC, created_at ASC)
>   WHERE cantidad_disponible > 0;
>
> -- 3. Tabla de consumos registrados desde bitácora
> CREATE TABLE IF NOT EXISTS consumos_lote (
>   id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
>   negocio_id      UUID NOT NULL REFERENCES negocios(id) ON DELETE CASCADE,
>   lote_id         UUID NOT NULL REFERENCES lotes(id) ON DELETE CASCADE,
>   insumo_id       UUID NOT NULL REFERENCES insumos(id),
>   fecha_consumo   DATE NOT NULL,
>   cantidad_total  DECIMAL(18,4) NOT NULL CHECK (cantidad_total > 0),
>   costo_total     DECIMAL(18,4) NOT NULL,
>   precio_promedio DECIMAL(18,4) NOT NULL,
>   detalle_fifo    JSONB NOT NULL DEFAULT '[]',
>   notas           TEXT,
>   created_at      TIMESTAMP DEFAULT NOW()
> );
>
> CREATE INDEX IF NOT EXISTS idx_consumos_lote
>   ON consumos_lote(lote_id, fecha_consumo DESC);
>
> CREATE INDEX IF NOT EXISTS idx_consumos_insumo
>   ON consumos_lote(insumo_id, fecha_consumo DESC);
> ```
>
> Luego registrar este archivo en el script `npm run db:migrate` de `backend/package.json`, después de `007_...sql`. Ejecutar la migración y verificar con `\dt` que las tablas `compras_insumo` y `consumos_lote` existen."

**Definition of Done:**
- `npm run db:migrate` corre sin errores
- `\d compras_insumo` muestra las columnas con sus tipos y constraints
- El índice `idx_compras_fifo` tiene tres columnas: `insumo_id`, `fecha_compra`, `created_at`

---

## TAREA 2 — Servicio FIFO puro con redondeo correcto
**Archivo:** `backend/src/services/inventarioFIFO.js`
**Asignado:** Jairo
**Tiempo:** 1h

**Prompt para Claude Code:**
> "Crea `backend/src/services/inventarioFIFO.js` con esta implementación. La función es pura — no importa pg ni ningún módulo de base de datos.
>
> ```javascript
> /**
>  * Redondea a 4 decimales para coincidir con DECIMAL(18,4) de PostgreSQL.
>  * Evita el problema de flotantes de JS (ej: 0.1 + 0.2 = 0.30000000000000004)
>  */
> const r4 = n => Math.round(n * 10000) / 10000;
>
> /**
>  * Calcula un consumo FIFO.
>  * NO toca la base de datos — eso lo hace el llamador en una transacción.
>  *
>  * @param {Object} params
>  * @param {Array}  params.capasStock       - Capas ordenadas por fecha_compra ASC, created_at ASC
>  *   Cada capa: { id, cantidad_disponible, precio_unitario, fecha_compra }
>  * @param {number} params.cantidadRequerida - Cantidad a consumir
>  * @returns {{ lineasFIFO, actualizaciones, costoTotal, precioPromedio }}
>  * @throws {Error} si el stock es insuficiente
>  */
> export function calcularConsumoFIFO({ capasStock, cantidadRequerida }) {
>   const stockTotal = capasStock.reduce(
>     (s, c) => r4(s + parseFloat(c.cantidad_disponible)), 0
>   );
>
>   if (stockTotal < cantidadRequerida) {
>     throw new Error(
>       `Stock insuficiente. Requerido: ${cantidadRequerida}, disponible: ${stockTotal}`
>     );
>   }
>
>   const lineasFIFO = [];
>   const actualizaciones = [];
>   let pendiente = cantidadRequerida;
>
>   for (const capa of capasStock) {
>     if (pendiente <= 0) break;
>
>     const disponible = parseFloat(capa.cantidad_disponible);
>     const precio     = parseFloat(capa.precio_unitario);
>     const consumido  = Math.min(pendiente, disponible);
>     const subtotal   = r4(consumido * precio);              // ← redondeo corrección 2
>
>     lineasFIFO.push({
>       compra_id:      capa.id,
>       fecha_compra:   capa.fecha_compra,
>       cantidad:       r4(consumido),
>       precio_unitario: precio,
>       subtotal,
>     });
>
>     actualizaciones.push({
>       compra_id:                capa.id,
>       nueva_cantidad_disponible: r4(disponible - consumido),
>     });
>
>     pendiente = r4(pendiente - consumido);
>   }
>
>   const costoTotal     = r4(lineasFIFO.reduce((s, l) => s + l.subtotal, 0));
>   const precioPromedio = r4(costoTotal / cantidadRequerida);
>
>   return { lineasFIFO, actualizaciones, costoTotal, precioPromedio };
> }
> ```
>
> Escribir los tests en `backend/tests/inventarioFIFO.test.js` (usar Node.js built-in test runner o el que ya esté en el proyecto):
>
> **CASO 1 — Una sola capa:**
> - capasStock: `[{ id:'A', cantidad_disponible:'100', precio_unitario:'10.00', fecha_compra:'2025-01-01' }]`
> - cantidadRequerida: 30
> - Esperado: `costoTotal === 300`, `precioPromedio === 10`, `lineasFIFO.length === 1`, `actualizaciones[0].nueva_cantidad_disponible === 70`
>
> **CASO 2 — Dos capas, precio diferente (el caso clave):**
> - capasStock: `[{ id:'A', cantidad_disponible:'20', precio_unitario:'10.00', fecha_compra:'2025-03-01' }, { id:'B', cantidad_disponible:'50', precio_unitario:'15.00', fecha_compra:'2025-04-01' }]`
> - cantidadRequerida: 30
> - Esperado: `costoTotal === 350`, `precioPromedio === 11.6667`, `lineasFIFO[0].cantidad === 20`, `lineasFIFO[1].cantidad === 10`, compra A queda en 0, compra B queda en 40
>
> **CASO 3 — Stock insuficiente:**
> - capasStock: `[{ id:'A', cantidad_disponible:'20', precio_unitario:'10.00', fecha_compra:'2025-01-01' }]`
> - cantidadRequerida: 50
> - Esperado: lanza Error con mensaje que incluye 'insuficiente'
>
> **CASO 4 — Redondeo correcto (caso flotante):**
> - capasStock: `[{ id:'A', cantidad_disponible:'10', precio_unitario:'0.1', fecha_compra:'2025-01-01' }]`
> - cantidadRequerida: 3
> - Esperado: `costoTotal === 0.3` (NO 0.30000000000000004)"

**Definition of Done:**
- Los 4 tests pasan
- No hay ningún `import` de `pg` ni similar en este archivo
- `costoTotal` del Caso 4 es exactamente `0.3`

---

## TAREA 3 — Controller y endpoints de Compras
**Archivo:** `backend/src/controllers/compraController.js` + agregar rutas en `backend/src/routes/negocio.js`
**Asignado:** Sebastián
**Tiempo:** 2h

**Prompt para Claude Code:**
> "Crea `backend/src/controllers/compraController.js` con estos 4 métodos. Todos usan async/await con try/catch que devuelve `res.status(500).json({ error: err.message })`.
>
> **IMPORTANTE:** Los valores monetarios se pasan como strings al query parametrizado de pg — no usar parseFloat al insertar. Ejemplo correcto: `[req.body.precio_unitario]` no `[parseFloat(req.body.precio_unitario)]`.
>
> ---
>
> **`listarCompras(req, res)`**
> ```sql
> SELECT c.*,
>        i.nombre  AS insumo_nombre,
>        um.simbolo AS unidad_simbolo,
>        p.nombre  AS proveedor_nombre
> FROM compras_insumo c
> JOIN insumos i          ON i.id  = c.insumo_id
> LEFT JOIN unidades_medida um ON um.id = c.unidad_id
> LEFT JOIN proveedores p ON p.id  = c.proveedor_id
> WHERE c.negocio_id = $1
>   AND ($2::uuid IS NULL OR c.insumo_id = $2)
>   AND ($3::date IS NULL OR c.fecha_compra >= $3)
>   AND ($4::date IS NULL OR c.fecha_compra <= $4)
> ORDER BY c.fecha_compra DESC, c.created_at DESC
> ```
> Parámetros del query extraídos de `req.query`: `insumo_id`, `fecha_desde`, `fecha_hasta` (todos opcionales, pasar `null` si no vienen).
>
> ---
>
> **`stockPorInsumo(req, res)`**
> Recibe `:insumoId`. Verificar que el insumo pertenece al negocio:
> ```sql
> SELECT id FROM insumos WHERE id = $1 AND negocio_id = $2
> ```
> Si no existe → 404.
>
> Luego obtener capas y stock total:
> ```sql
> SELECT c.id, c.fecha_compra, c.cantidad_comprada,
>        c.cantidad_disponible, c.precio_unitario,
>        c.numero_factura, c.created_at,
>        p.nombre AS proveedor_nombre
> FROM compras_insumo c
> LEFT JOIN proveedores p ON p.id = c.proveedor_id
> WHERE c.insumo_id = $1 AND c.negocio_id = $2
> ORDER BY c.fecha_compra ASC, c.created_at ASC
> ```
> Devolver:
> ```json
> {
>   "insumo": { "id", "nombre", "unidad_simbolo" },
>   "stock_total": <suma de cantidad_disponible>,
>   "capas": [...]
> }
> ```
>
> ---
>
> **`crearCompra(req, res)`**
> Body requerido: `insumo_id`, `fecha_compra`, `cantidad_comprada`, `precio_unitario`.
> Body opcional: `proveedor_id`, `unidad_id`, `numero_factura`, `notas`.
>
> Validaciones:
> - `insumo_id` presente → si no, 400
> - `cantidad_comprada > 0` → si no, 400 con 'La cantidad debe ser mayor a 0'
> - `precio_unitario > 0` → si no, 400 con 'El precio debe ser mayor a 0'
> - `fecha_compra` presente → si no, 400
> - Verificar que `insumo_id` pertenece al negocio → si no, 403
>
> INSERT:
> ```sql
> INSERT INTO compras_insumo
>   (negocio_id, insumo_id, proveedor_id, fecha_compra,
>    cantidad_comprada, cantidad_disponible, precio_unitario,
>    unidad_id, numero_factura, notas)
> VALUES ($1,$2,$3,$4,$5,$5,$6,$7,$8,$9)
> RETURNING *
> ```
> Nota: `cantidad_disponible = cantidad_comprada` al crear (mismo valor, parámetro $5 dos veces).
>
> Devolver la compra creada con los mismos joins que `listarCompras`.
>
> ---
>
> **`eliminarCompra(req, res)`**
> Buscar la compra. Si no existe o no pertenece al negocio → 404.
> Si `cantidad_disponible < cantidad_comprada` → 409:
> `{ error: 'No se puede eliminar: esta compra ya tiene consumos registrados. Para corregir, registrá un ajuste.' }`
> Si `cantidad_disponible === cantidad_comprada` → DELETE y 200 `{ ok: true }`.
>
> ---
>
> Agregar al router en `src/routes/negocio.js` (con middleware `auth` y `negocioOwner`):
> ```
> GET    /:negocioId/compras                        → listarCompras
> GET    /:negocioId/compras/:insumoId/stock        → stockPorInsumo
> POST   /:negocioId/compras                        → crearCompra
> DELETE /:negocioId/compras/:id                    → eliminarCompra
> ```"

**Definition of Done:**
- POST /compras crea compra con `cantidad_disponible = cantidad_comprada`
- GET /compras filtra por `insumo_id` correctamente
- GET /compras/:insumoId/stock devuelve `stock_total` correcto
- DELETE falla con 409 si ya tiene consumos, borra si está intacta

---

## TAREA 4 — Adaptar Catálogo (modificar insumos existentes)
**Archivos:** `backend/src/controllers/insumoController.js` + `frontend/src/pages/Insumos.jsx`
**Asignado:** Sebastián
**Tiempo:** 1.5h
**Puede hacerse en paralelo con Tarea 3**

**Prompt para Claude Code:**
> "Modificar el módulo de insumos para convertirlo en 'Catálogo'. Cambios quirúrgicos — no reescribir lo que ya funciona.
>
> **Backend — `insumoController.js`:**
>
> En el SELECT de listar insumos y de obtener uno por id, agregar este subquery como campo calculado:
> ```sql
> (
>   SELECT COALESCE(SUM(ci.cantidad_disponible), 0)
>   FROM compras_insumo ci
>   WHERE ci.insumo_id = i.id
> ) AS stock_total
> ```
> Donde `i` es el alias de la tabla `insumos`.
>
> En el POST (crear insumo): si llega `precio_unitario` en el body, ignorarlo — no insertarlo.
> En el PUT (actualizar insumo): igual, ignorar `precio_unitario`.
>
> **Frontend — `frontend/src/pages/Insumos.jsx`:**
>
> 1. Cambiar el `<h1>` o título de la página de 'Insumos' a 'Catálogo de insumos'
> 2. En la tabla principal, agregar columna 'Stock disponible' entre la columna de unidad y la de categoría. Mostrar el valor `stock_total` del insumo con su símbolo de unidad (ej: '350 kg'). Si `stock_total === 0`, mostrar en amber: '⚠ Sin stock'.
> 3. En el formulario de crear/editar insumo (drawer o modal), eliminar el campo de precio unitario si existe. Solo eliminar ese campo — no tocar los demás.
> 4. NO cambiar las rutas de API (siguen siendo /insumos). NO cambiar el diseño visual salvo los 3 puntos anteriores."

**Definition of Done:**
- GET /insumos devuelve campo `stock_total` en cada insumo
- La tabla en UI muestra la columna Stock con valor correcto
- Crear un insumo no requiere ni acepta precio
- Un insumo sin compras muestra '⚠ Sin stock'

---

## TAREA 5 — Endpoint consumir con FIFO + transacción + `FOR UPDATE`
**Archivo:** `backend/src/controllers/loteController.js` (agregar método `consumirInsumo`)
**Asignado:** Jairo
**Tiempo:** 2.5h — **La tarea más crítica**

**Prompt para Claude Code:**
> "Agregar el método `consumirInsumo` en `backend/src/controllers/loteController.js` e importar `calcularConsumoFIFO` desde `../services/inventarioFIFO.js`.
>
> **Ruta:** POST `/:negocioId/lotes/:loteId/consumir` (registrar en `negocio.js` con auth + negocioOwner)
>
> **Body:** `{ insumo_id, cantidad, fecha_consumo, notas }`
>
> **Implementación completa — debe usar una transacción pg:**
>
> ```javascript
> export async function consumirInsumo(req, res) {
>   const { negocioId, loteId } = req.params;
>   const { insumo_id, cantidad, fecha_consumo, notas } = req.body;
>
>   // Validar inputs
>   if (!insumo_id || !cantidad || parseFloat(cantidad) <= 0 || !fecha_consumo) {
>     return res.status(400).json({ error: 'insumo_id, cantidad (> 0) y fecha_consumo son requeridos' });
>   }
>
>   const client = await pool.connect();
>   try {
>     await client.query('BEGIN');
>
>     // 1. Verificar que el lote existe, pertenece al negocio y está activo
>     const loteResult = await client.query(
>       'SELECT id FROM lotes WHERE id = $1 AND negocio_id = $2 AND activo = true',
>       [loteId, negocioId]
>     );
>     if (!loteResult.rows.length) {
>       await client.query('ROLLBACK');
>       return res.status(404).json({ error: 'Lote no encontrado o inactivo' });
>     }
>
>     // 2. Verificar que el insumo pertenece al negocio
>     const insumoResult = await client.query(
>       'SELECT id, nombre FROM insumos WHERE id = $1 AND negocio_id = $2',
>       [insumo_id, negocioId]
>     );
>     if (!insumoResult.rows.length) {
>       await client.query('ROLLBACK');
>       return res.status(404).json({ error: 'Insumo no encontrado' });
>     }
>
>     // 3. Cargar capas FIFO con FOR UPDATE para evitar consumos concurrentes
>     //    (corrección: sin FOR UPDATE, dos consumos simultáneos pueden corromper el stock)
>     const capasResult = await client.query(
>       `SELECT id, cantidad_disponible, precio_unitario, fecha_compra
>        FROM compras_insumo
>        WHERE insumo_id = $1 AND negocio_id = $2 AND cantidad_disponible > 0
>        ORDER BY fecha_compra ASC, created_at ASC
>        FOR UPDATE`,
>       [insumo_id, negocioId]
>     );
>
>     // 4. Ejecutar algoritmo FIFO (función pura, lanza Error si stock insuficiente)
>     let resultado;
>     try {
>       resultado = calcularConsumoFIFO({
>         capasStock: capasResult.rows,
>         cantidadRequerida: parseFloat(cantidad),
>       });
>     } catch (fifoError) {
>       await client.query('ROLLBACK');
>       return res.status(422).json({ error: fifoError.message });
>     }
>
>     const { lineasFIFO, actualizaciones, costoTotal, precioPromedio } = resultado;
>
>     // 5. Actualizar cantidad_disponible en cada capa afectada
>     for (const act of actualizaciones) {
>       await client.query(
>         'UPDATE compras_insumo SET cantidad_disponible = $1 WHERE id = $2',
>         [act.nueva_cantidad_disponible, act.compra_id]
>       );
>     }
>
>     // 6. Insertar registro del consumo
>     const consumoResult = await client.query(
>       `INSERT INTO consumos_lote
>          (negocio_id, lote_id, insumo_id, fecha_consumo,
>           cantidad_total, costo_total, precio_promedio, detalle_fifo, notas)
>        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
>        RETURNING *`,
>       [
>         negocioId, loteId, insumo_id, fecha_consumo,
>         cantidad, costoTotal, precioPromedio,
>         JSON.stringify(lineasFIFO),
>         notas || null,
>       ]
>     );
>
>     await client.query('COMMIT');
>
>     return res.status(201).json({
>       consumo: consumoResult.rows[0],
>       precio_promedio: precioPromedio,
>       costo_total: costoTotal,
>       detalle_fifo: lineasFIFO,
>     });
>
>   } catch (err) {
>     await client.query('ROLLBACK');
>     console.error('consumirInsumo error:', err);
>     return res.status(500).json({ error: err.message });
>   } finally {
>     client.release();
>   }
> }
> ```
>
> Agregar también el endpoint GET para listar consumos de un lote:
>
> **Ruta:** GET `/:negocioId/lotes/:loteId/consumos`
> ```sql
> SELECT cl.*,
>        i.nombre AS insumo_nombre,
>        um.simbolo AS unidad_simbolo
> FROM consumos_lote cl
> JOIN insumos i ON i.id = cl.insumo_id
> LEFT JOIN unidades_medida um ON um.id = i.unidad_id
> WHERE cl.lote_id = $1 AND cl.negocio_id = $2
> ORDER BY cl.fecha_consumo DESC, cl.created_at DESC
> ```
>
> Registrar ambas rutas en `negocio.js`:
> ```
> POST /:negocioId/lotes/:loteId/consumir   → loteController.consumirInsumo
> GET  /:negocioId/lotes/:loteId/consumos   → loteController.listarConsumos
> ```"

**Definition of Done — verificar con este escenario exacto:**
1. Crear insumo 'Balanceado iniciador' en el catálogo
2. POST /compras: 20kg a Bs 10/kg, fecha 2025-03-01 → compra A
3. POST /compras: 50kg a Bs 15/kg, fecha 2025-04-01 → compra B
4. POST /lotes/:id/consumir: `{ insumo_id, cantidad: 30, fecha_consumo: "2025-05-01" }`
5. Verificar en DB: compra A tiene `cantidad_disponible = 0`, compra B tiene `cantidad_disponible = 40`
6. En `consumos_lote`: `cantidad_total = 30`, `costo_total = 350`, `precio_promedio = 11.6667`
7. `detalle_fifo` contiene exactamente 2 líneas: `{cantidad:20, precio:10}` y `{cantidad:10, precio:15}`
8. POST /consumir con cantidad 200 (más que el stock) → devuelve 422 con mensaje de stock insuficiente

---

## TAREA 6 — Reporte de consumo por insumo
**Archivo:** `backend/src/controllers/compraController.js` (agregar método)
**Asignado:** Gerardo (desde las 20:00)
**Tiempo:** 1h

**Prompt para Claude Code:**
> "Agregar el método `reporteConsumo` a `backend/src/controllers/compraController.js`.
>
> **Ruta:** GET `/:negocioId/catalogo/:insumoId/consumos`
> **Query params opcionales:** `fecha_desde`, `fecha_hasta`
>
> Verificar que `insumoId` pertenece al negocio. Si no → 404.
>
> Query principal:
> ```sql
> SELECT cl.id, cl.fecha_consumo, cl.cantidad_total, cl.costo_total,
>        cl.precio_promedio, cl.detalle_fifo, cl.notas,
>        l.identificador AS lote_identificador, l.id AS lote_id
> FROM consumos_lote cl
> JOIN lotes l ON l.id = cl.lote_id
> WHERE cl.insumo_id = $1 AND cl.negocio_id = $2
>   AND ($3::date IS NULL OR cl.fecha_consumo >= $3)
>   AND ($4::date IS NULL OR cl.fecha_consumo <= $4)
> ORDER BY cl.fecha_consumo DESC
> ```
>
> Query de stock actual:
> ```sql
> SELECT COALESCE(SUM(cantidad_disponible), 0) AS stock_total
> FROM compras_insumo
> WHERE insumo_id = $1 AND negocio_id = $2
> ```
>
> Query de insumo (para nombre y unidad):
> ```sql
> SELECT i.id, i.nombre, um.simbolo AS unidad_simbolo
> FROM insumos i
> LEFT JOIN unidades_medida um ON um.id = i.unidad_id
> WHERE i.id = $1
> ```
>
> Devolver:
> ```json
> {
>   'insumo': { 'id', 'nombre', 'unidad_simbolo' },
>   'stock_actual': 40.0,
>   'consumos_por_lote': [ ...filas del query principal... ],
>   'resumen_periodo': {
>     'total_cantidad': <suma de cantidad_total>,
>     'total_costo': <suma de costo_total>,
>     'cantidad_consumos': <count de filas>
>   }
> }
> ```
>
> Registrar en `negocio.js`:
> GET `/:negocioId/catalogo/:insumoId/consumos` → compraController.reporteConsumo"

**Definition of Done:**
- Después del escenario de prueba de Tarea 5, este endpoint devuelve 1 consumo del lote con `cantidad_total = 30`
- `stock_actual` devuelve 40 (lo que quedó en la compra B)
- `resumen_periodo.total_costo` devuelve 350

---

## TAREA 7 — Frontend: Pantalla de Compras
**Archivo:** `frontend/src/pages/Compras.jsx` (nuevo) + modificar `AppLayout.jsx` + `App.jsx`
**Asignado:** Sebastián
**Tiempo:** 2h

**Prompt para Claude Code:**
> "Crear `frontend/src/pages/Compras.jsx`. Usar el mismo estilo visual del proyecto (estilos inline, variables CSS, componentes de `ui.jsx`). Copiar el patrón de Proveedores.jsx como referencia de estructura.
>
> **Header de la página:**
> ```
> Compras de insumos                      [+ Registrar compra]
> ```
>
> **Filtros (fila horizontal):**
> - Selector 'Insumo' (dropdown, cargar desde GET /insumos con opción 'Todos')
> - Input 'Fecha desde' (date)
> - Input 'Fecha hasta' (date)
> - Botón 'Filtrar' que llama GET /compras con los query params
>
> **Tabla de compras** (columnas):
> Fecha | Insumo | Cantidad comprada | Precio/unidad | Total | Disponible | Proveedor | Factura | Acciones
>
> La columna 'Disponible' tiene lógica de color:
> - Verde: `cantidad_disponible === cantidad_comprada` (intacta)
> - Amber: `cantidad_disponible > 0 && cantidad_disponible < cantidad_comprada` (parcial)
> - Gris con tachado: `cantidad_disponible === 0` (agotada)
>
> Los valores monetarios en `IBM Plex Mono`.
>
> **Acciones por fila:**
> - Botón eliminar (ícono trash): solo visible si `cantidad_disponible === cantidad_comprada`. Si la API devuelve 409, mostrar el mensaje de error en un alert o toast.
>
> **Drawer 'Registrar compra'** (lado derecho, animación slide, mismo patrón que en Proveedores.jsx):
> Campos:
> 1. Insumo (*): SELECT con GET /insumos. Al seleccionar, cargar el stock actual (GET /compras/:insumoId/stock) y mostrar debajo: 'Stock actual: X [unidad]'
> 2. Proveedor (opcional): SELECT con GET /proveedores
> 3. Fecha de compra (*): date, default hoy
> 4. Cantidad (*): input numérico
> 5. Unidad: muestra la unidad del insumo seleccionado (solo lectura)
> 6. Precio unitario (*): input numérico en Bs
> 7. Total: campo solo lectura calculado en tiempo real = cantidad × precio
> 8. Número de factura (opcional): input texto
> 9. Notas (opcional): textarea
>
> Al guardar → POST /compras → cerrar drawer → refetch de la lista.
>
> Agregar en `AppLayout.jsx` en el menú agro (NAV_AGRO):
> `{ id: 'compras', label: 'Compras', icon: 'shoppingCart' }`
> entre 'insumos' y 'proveedores'.
>
> Agregar en `App.jsx` en el switch de `renderPage()`:
> `case 'compras': return <Compras negocioId={negocioId} />;`"

**Definition of Done:**
- La página carga y muestra las compras del negocio
- Registrar una compra nueva aparece en la lista inmediatamente
- La columna Disponible cambia de color según el estado
- El total se actualiza en tiempo real mientras tipeo cantidad o precio
- Al seleccionar un insumo en el drawer, aparece el stock actual debajo

---

## TAREA 8 — Frontend: Consumo desde Bitácora con detalle FIFO expandible
**Archivo:** `frontend/src/pages/agro/Bitacora.jsx` (modificar)
**Asignado:** Jairo
**Tiempo:** 2h

**Prompt para Claude Code:**
> "Modificar `frontend/src/pages/agro/Bitacora.jsx`. El diseño visual existente NO cambia. Solo agregar el tipo 'Consumo de insumo' al formulario y su representación en el historial.
>
> **Cambio 1 — Nuevo tipo en el selector:**
> Agregar 'Consumo de insumo' a la lista de tipos de evento (junto a Alimentación, Sanidad, Baja, etc.).
>
> **Cambio 2 — Formulario cuando tipo === 'Consumo de insumo':**
> ```
> Insumo (*):    [SELECT ▾]   ← GET /api/negocios/:id/insumos
>                              Mostrar 'Nombre — X unidad disponibles' en cada opción
> Cantidad (*):  [___________]
> Unidad:        [kg]         ← solo lectura, viene del insumo seleccionado
> Fecha (*):     [hoy]
> Notas:         [___________]
> ```
>
> Preview de costo (debajo del campo cantidad, actualizar al cambiar cantidad):
> - Llamar GET /compras/:insumoId/stock al seleccionar el insumo
> - Calcular con las capas: tomar los primeros N kg en orden FIFO y estimar el costo
> - Mostrar: 'Costo estimado: Bs 350.00 (prom. Bs 11.67/kg)' en color text-secondary, tamaño 12px
> - Agregar nota pequeña: '* El precio final se confirma al registrar'
>
> Al hacer clic en 'Registrar →':
> - POST /api/negocios/:negocioId/lotes/:loteId/consumir
> - Si 422 (stock insuficiente): mostrar error en rojo dentro del formulario — no cerrar el drawer
> - Si 201 (éxito): usar el `costo_total` y `detalle_fifo` del response (NO el estimado previo) para mostrar la fila en la bitácora — CORRECCIÓN: el costo definitivo del response reemplaza al estimado
>
> **Cambio 3 — Fila de tipo 'Consumo' en el historial:**
> Mostrar igual que las otras filas pero con un botón expandible:
> ```
> [ícono layers]  Consumo    X kg de [nombre insumo]    Bs 350.00  [▼]
>                                                        prom. Bs 11.67/kg
> ```
>
> Al hacer clic en [▼], expandir una sub-fila con la tabla FIFO:
> ```
> ┌─────────────────────────────────────────────────────────────────┐
> │  Compra del 01/03/2025   20 kg × Bs 10.00 = Bs 200.00          │
> │  Compra del 01/04/2025   10 kg × Bs 15.00 = Bs 150.00          │
> │  ────────────────────────────────────────────────────────────── │
> │  Precio promedio: Bs 11.67/kg                 Total: Bs 350.00  │
> └─────────────────────────────────────────────────────────────────┘
> ```
> El estado del toggle (expandido/colapsado) es local en el componente, no persiste.
>
> Al cargar la bitácora, los consumos ya guardados vienen de GET /lotes/:loteId/consumos.
> El campo `detalle_fifo` de cada consumo ya tiene el array de líneas para renderizar la tabla expandible."

**Definition of Done:**
- Puedo registrar un consumo de 30kg del insumo con dos capas de precio
- La fila aparece con Bs 350.00 (precio del response, no del estimado)
- El botón [▼] expande y muestra las 2 líneas FIFO correctamente
- Si intento consumir más del stock disponible, el formulario muestra el error sin cerrarse

---

## TAREA 9 — Frontend: Reporte en pantalla Compras (Gerardo, desde las 20:00)
**Archivo:** `frontend/src/pages/Compras.jsx` (agregar sección)
**Asignado:** Gerardo
**Tiempo:** 1.5h
**Depende de:** Tarea 7 ya terminada

**Prompt para Claude Code:**
> "En la página `Compras.jsx` ya existente, agregar una sección de reporte debajo de la tabla de compras. Separar visualmente con un divider y un título de sección.
>
> **Título:** 'Reporte de consumo por insumo'
>
> **Controles:**
> - Selector de insumo (dropdown, misma lista que arriba)
> - Fecha desde / Fecha hasta (date inputs opcionales)
> - Botón 'Ver reporte'
>
> Al hacer clic → GET /api/negocios/:negocioId/catalogo/:insumoId/consumos?fecha_desde=&fecha_hasta=
>
> **Mostrar resultado:**
>
> Cards de resumen (fila horizontal):
> ```
> ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐
> │ Stock actual    │  │ Total consumido │  │ Total gastado   │
> │ 40 kg           │  │ 30 kg           │  │ Bs 350.00       │
> └─────────────────┘  └─────────────────┘  └─────────────────┘
> ```
>
> Tabla de consumos por lote:
> ```
> Fecha       Lote        Cantidad    Precio prom.    Total       Detalle
> ─────────────────────────────────────────────────────────────────────
> 01/05/2025  MAY-06      30 kg       Bs 11.67/kg     Bs 350.00   [▼]
> ```
>
> El botón [▼] expande el detalle FIFO igual que en la bitácora:
> ```
> Compra del 01/03/2025   20 kg × Bs 10.00 = Bs 200.00
> Compra del 01/04/2025   10 kg × Bs 15.00 = Bs 150.00
> Precio promedio: Bs 11.67/kg              Total: Bs 350.00
> ```
>
> Si no hay consumos para el filtro seleccionado, mostrar: 'No se registraron consumos de [nombre insumo] en el período seleccionado.'"

**Definition of Done:**
- El reporte muestra las cards con stock, total consumido y total gastado
- La tabla lista los consumos por lote
- El detalle FIFO expandible funciona igual que en la bitácora
- Sin consumos muestra el mensaje vacío correcto

---

## Cronograma del día

```
10:30  ┌─ TODOS: Leer este plan y aclarar dudas (15 min)
       │
10:45  ├─ Jairo:     T2 — Servicio FIFO + tests
       ├─ Sebastián: T3 — Controller Compras (backend)
       │  (T1 ya hecho o Gerardo lo hace ahora si no está)
       │
12:00  ├─ Jairo:     T5 — Endpoint consumir (empieza cuando T2 termine)
       ├─ Sebastián: T4 — Adaptar Catálogo (cuando T3 termine)
       │
14:00  │  ALMUERZO / PAUSA
       │
15:00  ├─ Jairo:     T8 — Frontend Bitácora (cuando T5 esté en backend)
       ├─ Sebastián: T7 — Frontend Compras (cuando T3+T4 estén)
       │
17:00  ├─ Jairo:     T6 — Reporte backend (rápido, 1h)
       ├─ Sebastián: T9 — Reporte frontend (cuando T7 esté)
       │
19:00  ├─ Jairo + Sebastián: Testing del flujo completo juntos
       │  Escenario: crear compras A y B → consumir 30kg → ver detalle FIFO
       │
20:00  ├─ Gerardo:   T9 — Reporte frontend (si Sebastián no terminó)
       │              O: testing y bugfixes de lo que encuentre roto
       │
21:00+ └─ Merge + smoke test final del flujo completo
```

---

## Flujo completo de verificación al terminar

1. Admin abre **Catálogo** → insumos sin precio, columna Stock en '⚠ Sin stock'
2. Admin abre **Compras** → registra Compra A: 20kg a Bs 10/kg (01/03)
3. Admin registra Compra B: 50kg a Bs 15/kg (01/04)
4. Tabla Compras: A=20kg verde, B=50kg verde
5. Admin abre **Bitácora** del Lote MAY-06 → tipo 'Consumo de insumo' → Balanceado 30kg
6. Preview muestra: 'Costo estimado: Bs 350.00 (prom. Bs 11.67/kg)'
7. Registrar → fila aparece con **Bs 350.00** (precio del response, no del estimado)
8. Clic en **[▼]** → expande: '20kg × Bs 10 = Bs 200 | 10kg × Bs 15 = Bs 150'
9. Tabla Compras: A=0kg gris, B=40kg amber
10. Catálogo: 'Balanceado' muestra 'Stock: 40 kg'
11. **Reporte**: seleccionar Balanceado → ver 'Lote MAY-06 consumió 30 kg — Bs 350.00'
12. Intentar consumir 200kg → error '⚠ Stock insuficiente. Disponible: 40 kg, requerido: 200 kg'
