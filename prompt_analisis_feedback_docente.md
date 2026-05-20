# Prompt para Claude Code — Análisis del proyecto y plan de implementación según feedback del docente

## Contexto que necesitás leer primero

Este es un proyecto universitario llamado **"Sistema de Costeo Estándar Universal Productivo"** para la materia Proyecto de Sistemas II. El docente revisó el proyecto y expresó que no está yendo en la dirección correcta. A continuación se detalla lo que el docente quiere que el sistema haga, seguido de lo que ya existe en el proyecto. Tu tarea es analizar ambos, identificar las brechas, y proponer un plan de implementación concreto.

---

## Lo que el docente quiere: resumen del feedback

El docente describió un sistema que va más allá de un simple registro de gastos. Quiere un **motor de costeo con cadena de transformación**. Los puntos clave son:

### 1. Flujo de transformación completo
El sistema debe modelar cómo una materia prima (animal vivo) se transforma en múltiples productos terminados:

```
COMPRA DEL ANIMAL (con peso, precio/kg, proveedor)
    ↓
ENGORDE / CRIANZA (alimentación, sanidad, mano de obra — costos acumulados)
    ↓
FAENA (registro de peso vivo → peso canal, cálculo de rendimiento canal)
    ↓
DESPIECE (división en cortes: lomo, costilla, jamón, grasa, hueso, etc.)
    ↓
PRODUCCIÓN / FORMULACIÓN (recetas: chorizo = 70% carne + 20% grasa + 5% hielo + 5% condimentos)
    ↓
COSTEO REAL (costos directos + indirectos + mermas)
    ↓
ESCENARIOS DE VENTA (vivo vs. kilo gancho vs. faeneado vs. por cortes)
    ↓
RENTABILIDAD (margen por producto, línea más rentable, alertas)
```

### 2. Cálculos que el sistema debe poder hacer

**Rendimiento de canal:**
```
Rendimiento_canal = (peso_canal / peso_vivo) × 100
Ejemplo: 110 kg vivo → 82 kg canal = 74.5% rendimiento
```

**Conversión alimenticia (ICa):**
```
ICa = kg_alimento_consumido / kg_ganados
Ejemplo: 280 kg alimento / 100 kg ganados = 2.8 (referencia cerdo eficiente: 2.5-3.0)
```

**Costo por kg vivo:**
```
Costo/kg_vivo = costo_total_acumulado / peso_vivo_actual
```

**Costo por kg canal:**
```
Costo/kg_canal = (costo_total + gastos_faena) / peso_canal
```

**Costo unitario de producto terminado:**
```
Costo_unitario = costo_total_lote / cantidad_producida
```

Con distribución por rendimiento, subproductos y mermas.

**Merma:**
```
Merma = (peso_perdido / peso_inicial) × 100
Ejemplo: 500 kg mezcla → 470 kg producto final = 6% merma
```

**Escenarios de venta comparativos:**
- Venta en vivo: peso_vivo × precio_mercado/kg_vivo
- Venta kilo gancho: peso_canal × precio_mercado/kg_canal
- Venta faeneada por cortes: Σ(peso_corte × precio_corte) — gastos_faena
- Recomendación automática: qué escenario maximiza la utilidad neta

### 3. Entidades principales que mencionó

- **Animal/Lote**: fecha compra, peso inicial, precio compra, raza, proveedor, edad
- **Registro de alimentación**: alimento, cantidad, costo, fecha
- **Registro sanitario**: vacunas, antibióticos, vitaminas, desparasitantes
- **Pesajes históricos**: evolución de peso por fecha (para calcular ICa)
- **Faena**: peso vivo, peso canal, rendimiento
- **Despiece**: cortes obtenidos con peso y destino
- **Recetas/Formulaciones**: proporciones de ingredientes por producto
- **Lotes de producción**: producto, cantidad, receta usada, merma
- **Costos indirectos**: agua, electricidad, alquiler, depreciación, mano de obra, transporte

### 4. Lo que el docente dijo que diferencia un buen sistema de uno genérico

> "La mayoría de sistemas venden, facturan, controlan stock. Pero NO saben cuánto cuesta realmente producir un chorizo. Tu software sí."

El valor diferencial está en el **costeo preciso con distribución de costos** a través de toda la cadena de transformación.

---

## Lo que ya existe en el proyecto

Analizá los archivos del proyecto actual (backend y frontend) y documentá lo que encontrás. En particular buscá:

1. **Schema de base de datos** (migrations/) — ¿qué tablas existen?
2. **Endpoints implementados** (routes/ y controllers/) — ¿qué funciona?
3. **Motor de cálculo** (services/) — ¿qué cálculos hay?
4. **Frontend** (src/pages/) — ¿qué pantallas existen?
5. **Datos de ejemplo/seeds** — ¿qué datos demo hay cargados?

---

## Tu tarea

Después de leer el feedback del docente y analizar el proyecto actual, hacé lo siguiente:

### PASO 1 — Mapa de brechas
Creá una tabla comparativa:

| Lo que el docente quiere | ¿Existe en el proyecto? | Estado |
|---|---|---|
| Registro de lote con peso y costo de adquisición | ... | ✅ / ⚠️ parcial / ❌ falta |
| Bitácora de alimentación por lote | ... | ... |
| Pesajes históricos (evolución de peso) | ... | ... |
| Módulo de faena (peso vivo → canal) | ... | ... |
| Despiece (cortes por animal) | ... | ... |
| Recetas/formulaciones de productos | ... | ... |
| Cálculo de rendimiento canal | ... | ... |
| Cálculo de conversión alimenticia (ICa) | ... | ... |
| Costo por kg vivo | ... | ... |
| Costo por kg canal | ... | ... |
| Comparador de escenarios de venta | ... | ... |
| Mermas en producción | ... | ... |
| Costos indirectos prorrateados | ... | ... |
| Dashboard de rentabilidad por producto | ... | ... |

### PASO 2 — Decisión de arquitectura

El proyecto actual tiene dos rubros separados: **Industrial** (lácteos, textil, metalmecánica) y **Agro-ganadero** (engorde de animales). El feedback del docente describe principalmente una industria cárnica/embutidora que es un **híbrido**: tiene la parte ganadera (engorde) Y la parte industrial (transformación en embutidos).

Evaluá y recomendá UNA de estas opciones:

**Opción A — Integrar en el rubro existente:**
- El flujo ganadero ya existente (Lotes → Bitácora → Liquidación) se extiende con Faena y Despiece
- El flujo industrial ya existente (Productos → BOM → Ficha de costo) se extiende con Mermas y Rendimientos
- Un negocio puede tener ambos rubros conectados (el despiece alimenta el inventario de materias primas del módulo industrial)

**Opción B — Agregar un tercer rubro "Industria cárnica":**
- Flujo propio desde compra de animal hasta venta de embutido
- Más trabajo, pero más claro para el docente
- El rubro industrial lácteo/textil queda separado

**Opción C — Pivotar el proyecto:**
- Hacer del rubro industrial el módulo de "transformación" y del agro el de "cría/engorde"
- El flujo completo del docente (engorde → faena → despiece → embutidos) es EL caso de uso central
- Los rubros actuales se reconfiguran como plantillas de este flujo

Justificá tu recomendación considerando: tiempo disponible (quedan ~3 días para la presentación del Sprint 2), lo que ya está implementado, y qué opción demuestra mejor comprensión del feedback del docente.

### PASO 3 — Plan de implementación priorizado

Basándote en la opción que recomendaste, creá un plan con estas columnas:

| # | Tarea | Qué implementa del feedback | Archivo(s) a crear/modificar | Horas estimadas | Prioridad (1=crítico) |
|---|---|---|---|---|---|

Ordenar por prioridad. Las tareas de prioridad 1 son las que el docente vería en una demo de 10 minutos. Las de prioridad 2 son las que hacen el sistema más completo. Las de prioridad 3 son deseables pero no críticas para el Sprint 2.

**Restricciones del plan:**
- Stack actual inamovible: Node.js + Express + PostgreSQL + React 19 + Vite
- Backend organizado MVC estilo Laravel (controllers/, models/, routes/, middleware/, services/)
- El frontend ya tiene diseño visual completo de Claude Design — no rediseñar, solo conectar lógica
- El motor de cálculo debe estar en services/ como función pura (no en controllers)
- Todos los montos monetarios en DECIMAL(18,4) — nunca float
- Borrado lógico siempre (activo = false) — nunca DELETE físico en datos maestros

### PASO 4 — Los 3 cálculos que DEBEN funcionar en la demo

Identificá los 3 cálculos más importantes según el feedback del docente y para cada uno:

1. **Nombre del cálculo**
2. **Fórmula exacta**
3. **Endpoint que lo expone** (método + ruta)
4. **Datos de entrada necesarios**
5. **Ejemplo con números concretos** (usa datos reales del seed si existen)

Estos 3 cálculos son los que hay que mostrar sí o sí en la presentación. Si el resto del sistema no está, al menos estos deben funcionar.

### PASO 5 — Datos demo para la presentación

Proponé un escenario de datos mock concreto y congruente que demuestre el flujo completo del docente en una demo de 10 minutos. Incluí los números exactos (pesos, precios, costos) para que los resultados del sistema se vean claros e impresionantes.

El escenario debería mostrar:
- Un lote de cerdos con costos acumulados reales
- El cálculo del costo por kg vivo y por kg canal
- Al menos 1 producto terminado con su costo calculado
- La comparación de escenarios de venta con utilidad neta
