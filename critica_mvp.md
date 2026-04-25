# Crítica técnica del MVP — UPC System
> Analiza cada sección corriendo el sistema en paralelo para verificar cada punto.

---

## 🔴 CRÍTICO — Rompen la exactitud del sistema

### 1. El simulador no aplica conversiones de unidad — los números son incorrectos

**Dónde verlo:** Ve a Calculadora BOM → agrega el insumo `Lámina de Acero (RM-001)` con unidad `g` (gramos) y cantidad `30000`. Luego ve al Simulador → crea una simulación.

**El problema:** El material `RM-001` tiene `cost_standard = $45.00` definido para su unidad primaria `kg`. Si el ítem BOM lo especifica en `g`, el cálculo que ejecuta el sistema es:

```
30000 g × $45.00 = $1,350,000   ← INCORRECTO
```

Lo correcto sería aplicar la conversión `kg → g` (factor 1000) antes de multiplicar:

```
30000 g ÷ 1000 × $45.00 = $1,350   ← CORRECTO
```

**En el código:** `CostSimulation.js` línea 69 — solo hace `quantity_scaled × unit_cost` sin pasar por la tabla `unit_conversions` que ya existe en la BD. El módulo de Equivalencias tiene la tabla y los datos, pero **nunca es invocado** desde ningún cálculo.

**Sprint donde debió resolverse:** Sprint 0 (al diseñar el modelo de costos).

---

### 2. `acquisition_cost` del inventario y `cost_standard` del material son mundos separados

**Dónde verlo:** Ve a Carga Masiva → sube un lote del insumo `RM-001` con `acquisition_cost = $60.00`. Luego abre Insumos y Materia Prima → el `cost_standard` de `RM-001` sigue siendo `$45.00`. Ve al Simulador — sigue usando $45.00.

**El problema:** Cuando llega un lote de materia prima a un precio distinto al estándar, el sistema no tiene ningún flujo para actualizar o alertar sobre la diferencia. El inventario y el costeo estándar no se hablan. En un sistema de costeo real, esta diferencia se llama **variación de precio de compra** y es el dato más valioso del sistema.

**Consecuencia:** El simulador puede mostrar $62.35/m para un cable, pero el inventario puede reflejar que compraste el cobre a $60/kg en lugar de $45/kg. Nadie lo sabe hasta que alguien lo revisa manualmente.

**Sprint donde debió resolverse:** Sprint 1 (al construir el simulador).

---

### 3. Las Plantillas de Rubro no hacen nada funcional

**Dónde verlo:** Ve a Plantillas de Rubro → crea una plantilla "Industria Textil". Ahora ve a Calculadora BOM → crea un BOM y selecciona esa plantilla. Observa qué cambia.

**El problema:** Absolutamente nada cambia. La tabla `production_templates` solo tiene `id`, `name`, `description`, `type`. No tiene relación con etapas de producción, no filtra qué etapas son válidas para ese rubro, no pre-carga nada. El `template_id` en la tabla `boms` es un campo que se guarda pero no se usa en ningún cálculo ni en ninguna vista.

**Lo que debería hacer:** Una plantilla "Industria Textil" debería definir qué etapas de producción le corresponden (Corte, Costura, Acabado) y cuando un BOM la selecciona, mostrar automáticamente solo esas etapas y en ese orden.

**Sprint donde debió resolverse:** Sprint 1 (Entregable 2 — Configurador de Plantillas).

---

## 🟠 ALTO — Hacen el sistema difícil de usar como MVP

### 4. No existe una pantalla de inicio / dashboard

**Dónde verlo:** Abre el sistema en `http://localhost:5173`. Observa a qué página llegas.

**El problema:** El sistema redirige inmediatamente a `/units` (Unidades de Medida), que es el módulo menos relevante para un usuario nuevo. No hay ninguna vista que responda las preguntas básicas: ¿Cuántos productos tengo costeados? ¿Cuál es el producto más caro? ¿Cuántas simulaciones hay activas? ¿Qué módulos debo completar primero?

Un evaluador que abre el sistema por primera vez no entiende hacia dónde ir.

**Sprint donde debió resolverse:** Sprint 0.

---

### 5. El módulo de inventario usa dólares (USD), el simulador usa pesos (MXN)

**Dónde verlo:** Ve a Control de Lotes / Inventario → observa el formato del `Costo de Adquisición`. Luego ve al Simulador de Costos → observa los totales.

**El problema:** En `InventoryManagementPage.tsx` línea ~82:
```typescript
new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' })
```
El inventario muestra `$45.00` en dólares. El simulador muestra `$45.00` en pesos mexicanos. Son el mismo número pero distinta moneda — en un sistema de costeo esto es un error grave de consistencia que puede confundir a cualquier presentador.

**Sprint donde debió resolverse:** Sprint 0 (definir la moneda del sistema).

---

### 6. `window.confirm` sigue en BOM e Inventario

**Dónde verlo:** Ve a Calculadora BOM → intenta eliminar un insumo de una etapa. Verás el cuadro de diálogo nativo del navegador. El módulo de Plantillas de Rubro ya lo reemplazó con un modal personalizado (Gerardo), pero BOM (líneas 138 y 185) e Inventario lo siguen usando.

**El problema:** El modal nativo de `window.confirm` es bloqueante, no se puede estilizar, no puede mostrar el nombre del ítem con formato y en algunos entornos (VSCode browser, algunos navegadores) está directamente deshabilitado. Es inconsistente con el diseño del sistema.

**Sprint donde debió resolverse:** Sprint 1.

---

### 7. No hay factor de merma/desperdicio por insumo en el BOM

**Dónde verlo:** Ve a Calculadora BOM → agrega cualquier insumo → observa los campos disponibles: Etapa, Insumo, Cantidad, Unidad, Nota.

**El problema:** La nota es texto libre. No hay un campo numérico `wastage_pct` (% de merma). En manufactura real, si necesitas 1 kg de acero por pieza pero el proceso genera 15% de desperdicio, la cantidad real a comprar es 1.176 kg. Sin este campo, el simulador es una calculadora de materiales perfectos — algo que no existe en producción real.

**La nota de texto "rendimiento 70%" que aparece en la guía de prueba no afecta ningún cálculo.** Es decorativa.

**Sprint donde debió resolverse:** Sprint 1 (Entregable 3 — Calculadora BOM).

---

### 8. Un producto solo puede tener una receta BOM — sin versiones

**Dónde verlo:** Ve a Calculadora BOM → intenta crear un segundo BOM para `RM-004 Cable de Cobre`. Recibirás el error: *"Ya existe una lista BOM para este producto."*

**El problema:** En manufactura es completamente normal tener múltiples versiones de una receta: versión con proveedor A, versión con proveedor B, versión reducida de costos, receta en desarrollo vs. receta aprobada. El constraint `UNIQUE` en `product_id` de la tabla `boms` hace imposible comparar alternativas de producción.

**Consecuencia directa en el simulador:** No puedes simular "¿qué pasa si cambio la fórmula?" sin borrar la receta actual primero.

**Sprint donde debió resolverse:** Sprint 1.

---

## 🟡 MEDIO — Limitan el valor real del sistema

### 9. El costo del simulador solo cubre materiales — falta mano de obra y overhead

**El problema conceptual:** El "Costo Estándar" en teoría contable tiene tres componentes:

```
Costo Estándar = Material Directo + Mano de Obra Directa + CIF (Costo Indirecto de Fabricación)
```

El simulador actual calcula únicamente **Material Directo**. Una empresa que use este sistema para tomar decisiones de precio creerá que su costo es $62.35/m cuando en realidad, sumando mano de obra y costos fijos, puede ser $95/m.

No hay ninguna tabla, campo ni UI para registrar tarifas de mano de obra por etapa ni CIF por proceso.

---

### 10. No hay distinción entre "insumo" y "producto terminado" en el catálogo

**Dónde verlo:** Ve a Insumos y Materia Prima → intenta crear el material `PROD-001 Cable terminado` con `type = Industrial`. Se crea igual que cualquier insumo. Ahora crea un BOM donde `PROD-001` sea el producto. Luego intenta agregar `PROD-001` como insumo de otro BOM.

**El problema:** No hay ningún campo `role` o `is_finished_good` que distinga si un material es materia prima, semielaborado o producto terminado. El sistema no puede saber qué materiales son "componibles" y cuáles son "finales". En multi-nivel de BOM esto se vuelve un caos.

---

### 11. El módulo de Equivalencias y Conversiones no tiene validación de circularidad

**Dónde verlo:** Ve a Equivalencias → intenta crear la conversión `kg → g` con factor 1000. Luego crea `g → kg` con factor 0.001. Luego crea `kg → mg` con factor 1,000,000. No hay ninguna alerta de que estas conversiones podrían entrar en conflicto o formar ciclos.

**El problema más grave:** Puedes crear `kg → g = 1000` y `g → kg = 2` simultáneamente (inconsistente) y el sistema lo acepta sin error.

---

### 12. Carga Masiva no actualiza `cost_standard` — solo crea lotes de inventario

**Dónde verlo:** Descarga la plantilla CSV de Carga Masiva. Observa que tiene columna `acquisition_cost`. Sube un archivo con `acquisition_cost = $99.00` para `RM-001`. Ve a Insumos → `RM-001` sigue con `cost_standard = $45.00`.

**El problema:** El flujo de carga masiva crea registros en `inventory_batches` pero nunca toca `materials.cost_standard`. Si el objetivo del sistema es gestionar el **costo estándar**, la carga masiva debería al menos preguntar "¿actualizar el costo estándar con el costo de adquisición de este lote?".

---

## Resumen de prioridades

| # | Problema | Impacto | Sprint sugerido |
|---|---|---|---|
| 1 | Sin conversión de unidad en cálculo de costos | Los números son incorrectos | Sprint 0 |
| 2 | Inventario y cost_standard desconectados | Dato inútil | Sprint 1 |
| 3 | Plantillas sin relación con etapas | Módulo decorativo | Sprint 1 |
| 4 | Sin dashboard de inicio | Mala primera impresión | Sprint 0 |
| 5 | Moneda inconsistente (USD vs MXN) | Error de presentación | Sprint 0 |
| 6 | `window.confirm` en BOM e Inventario | Inconsistencia UX | Sprint 1 |
| 7 | Sin factor de merma numérico en BOM | Costos siempre subestimados | Sprint 1 |
| 8 | Un BOM por producto, sin versiones | No se pueden comparar recetas | Sprint 1 |
| 9 | Sin mano de obra ni overhead en costeo | Costo incompleto teóricamente | Sprint 2 |
| 10 | Sin distinción insumo vs producto terminado | Inconsistencia de catálogo | Sprint 0 |
| 11 | Conversiones sin validación de consistencia | Datos corruptos silenciosos | Sprint 1 |
| 12 | Carga masiva no actualiza costo estándar | Flujo roto | Sprint 1 |
