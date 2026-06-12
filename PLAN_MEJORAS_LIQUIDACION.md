# Plan de mejoras — Módulo de Liquidación

> Plan de trabajo para corregir bugs y completar funcionalidad del módulo
> `pages/agro/Liquidacion.jsx`. Cada ítem trae contexto, archivos a tocar,
> cambios concretos y criterio de aceptación para poder ejecutarlo aislado.

---

## Resumen ejecutivo

El módulo de liquidación está funcionalmente activo pero tiene 2 bugs reales,
4 huecos funcionales que limitan su uso real y varias mejoras de UX que
agilizarían la operación. El simulador industrial (escenario 3) quedó con
cortes dinámicos pero los productos siguen hardcoded, y hay decisiones de
producto que el sistema toma por el usuario sin darle opción de override.

**Total de ítems:** 17 (2 bugs, 4 huecos funcionales, 4 UX, 4 simulador, 3 modelo).

---

## 1. Bugs (prioridad ALTA — fix rápido)

### 1.1 CSS inválido en el modal de error de confirmación

- **Tipo:** bug visual
- **Archivo:** `frontend/src/pages/agro/Liquidacion.jsx:1137`
- **Síntoma:** el bloque rojo de error en el modal de confirmación no muestra
  fondo ni borde porque el CSS es inválido.
- **Causa:** se concatena un sufijo hex a una `var(--accent-danger)`:
  ```js
  background: 'var(--accent-danger)12'   // produce "red12" → inválido
  border:     '1px solid var(--accent-danger)44'
  ```
  El patrón `var(...)NN` solo funciona si el valor de la variable es un literal
  hexadecimal `#rrggbb`. Si es `red`, `rgb(...)` o cualquier otro formato, falla
  silenciosamente.
- **Cambio:**
  - Reemplazar por `color-mix(in srgb, var(--accent-danger) 8%, transparent)`
    para fondo y `... 30%, transparent` para borde.
  - Alternativa: definir variables `--accent-danger-soft` y `--accent-danger-mid`
    en el CSS global.
- **Criterio de aceptación:** al provocar un error en `handleConfirmLiquidar`
  (ej. desconectar el backend), el banner del modal se ve con fondo rojo claro
  y borde rojo medio.
- **Estimación:** 5 min.

### 1.2 Botón "Registrar liquidación" sin estado deshabilitado

- **Tipo:** bug de UX
- **Archivo:** `frontend/src/pages/agro/Liquidacion.jsx:1123`
- **Síntoma:** si no hay lote seleccionado o `cabezasVenta === 0`, el botón
  abre el modal y al confirmar el backend devuelve error genérico.
- **Cambio:**
  - Calcular `puedeLiquidar = !!loteData && cabezasVenta > 0 && pesoPromFinal > 0`.
  - Pasar `disabled={!puedeLiquidar}` y opacidad reducida al botón.
  - Agregar un `InfoTip` que liste los datos faltantes cuando esté disabled.
- **Criterio de aceptación:** con un lote sin datos cargados, el botón se ve
  apagado y al hacer hover muestra qué falta para habilitarlo.
- **Estimación:** 15 min.

---

## 2. Huecos funcionales (prioridad ALTA)

### 2.1 Selector manual de escenario

- **Tipo:** feature bloqueante
- **Problema:** hoy el sistema calcula `mejorEscenario` automáticamente y eso
  es lo que se confirma. Si la planta de despiece no está disponible, no hay
  comprador para gancho, o el usuario quiere forzar un escenario por motivos
  comerciales, no puede.
- **Archivo:** `frontend/src/pages/agro/Liquidacion.jsx`
- **Cambios:**
  - Nuevo estado `escenarioElegido` (default = `mejorEscenario`, se sincroniza
    cuando cambia el cálculo automático y el usuario no ha tocado el selector
    manualmente — usar bandera `escenarioTocado`).
  - Bloque de 3 radio cards (Pie / Gancho / Despiece) arriba del botón final,
    con badge "Recomendado" en el que el sistema sugiere.
  - `handleConfirmLiquidar` usa `escenarioElegido` en lugar de `mejorEscenario`.
  - Si el usuario elige un escenario peor que el recomendado, mostrar mensaje
    informativo: *"Estás eligiendo un escenario con Bs X menos de utilidad
    que el recomendado. ¿Confirmás?"*.
- **Criterio de aceptación:**
  - Puedo seleccionar manualmente cualquiera de los 3 escenarios.
  - La selección manual persiste mientras edito otros campos (no se sobrescribe).
  - La liquidación guardada respeta el escenario elegido por mí.
- **Estimación:** 1.5–2 h.

### 2.2 Persistencia de PVPs y mermas térmicas del simulador

- **Tipo:** mejora de consistencia
- **Problema:** hoy solo se persiste la distribución de cortes (% sobre PCF).
  Los PVPs (Jamón, Chorizo, Tocino, Chuleta, Subprod.) y las mermas térmicas
  (jamón 20%, chorizo 10%, tocino 12%) se resetean al recargar la página.
- **Archivo:** `frontend/src/pages/agro/Liquidacion.jsx`
- **Cambios:**
  - Nueva clave `sim_industrial_${negocioId}` en `localStorage`.
  - Estado consolidado `{ pvp: { jamon, chorizo, tocino, chuleta, subprod },
    merma: { jamon, chorizo, tocino } }`.
  - Mismo patrón que los cortes: `useEffect` que guarda al cambiar, lectura
    inicial con fallback a defaults.
- **Criterio de aceptación:** edito PVPs y mermas, recargo la página, los
  valores siguen ahí. Cambio de negocio → cada uno tiene su propio set.
- **Estimación:** 30 min.

### 2.3 Validaciones al confirmar liquidación

- **Tipo:** prevención de errores
- **Archivo:** `frontend/src/pages/agro/Liquidacion.jsx` (función
  `handleConfirmLiquidar` y modal de confirmación)
- **Cambios:** antes de mostrar el modal o al abrirlo, mostrar advertencias
  para los siguientes casos:
  - `escenarioElegido === 'despiece' && simTotalIngreso === 0` → bloquear
    confirmación. Mensaje: *"No ingresaste precios de venta para los productos
    industriales."*
  - `escenarioElegido === 'despiece' && !cortesValid` → advertencia (no bloqueo):
    *"La distribución de cortes no suma 100%. La utilidad proyectada puede ser
    inexacta."*
  - `utilidadDelEscenarioElegido < 0` → confirmación extra: *"Este escenario
    proyecta pérdida de Bs X. ¿Querés confirmarlo de todas formas?"*
  - `cabezasVenta > loteData.cabezasActivas` → bloquear. Mensaje: *"No podés
    vender más cabezas de las que hay activas en el lote."*
- **Criterio de aceptación:** los 4 casos producen el feedback correspondiente
  y no permiten cierres accidentales.
- **Estimación:** 1 h.

### 2.4 Activar mermas reales en la cascada de pesos

- **Tipo:** completar modelo de datos
- **Archivo:** `frontend/src/pages/agro/Liquidacion.jsx`
- **Problema:** hoy `kgAyuno = 0` y `kgFrio = 0` están hardcoded. La cascada
  PV → PV ayunado → PCC → PCF asume merma cero, lo que sobreestima la utilidad
  real en cualquier escenario.
- **Cambios:**
  - 2 inputs nuevos en sección "2. Rendimiento y precios":
    - "Merma ayuno/transporte (%)" — default 3% para cerdo, 4% para bovino.
    - "Merma deshidratación frío (%)" — default 1.5%.
  - Recalcular: `pvAyunado = pvGranja * (1 - mAyuno/100)`,
    `pcf = pcc * (1 - mFrio/100)`.
  - El componente `KgBreakdown` ya soporta mostrar la merma en rojo cuando
    `kgMerma > 0` (cambio hecho en iteración previa) — se activa solo.
  - Tooltips con valores de referencia por especie.
- **Criterio de aceptación:** al ingresar 3% de merma ayuno, el desglose
  muestra la fila roja con el peso perdido y la utilidad baja proporcionalmente.
- **Estimación:** 45 min.

---

## 3. Mejoras de UX (prioridad MEDIA)

### 3.1 Modal de confirmación con tabla resumen

- **Tipo:** UX crítica (operación irreversible)
- **Archivo:** `frontend/src/pages/agro/Liquidacion.jsx:1132`
- **Problema:** hoy el modal solo dice "se moverá al historial con escenario X".
  El usuario confirma una operación irreversible sin ver los números finales.
- **Cambios:** reemplazar el `<p>` actual por una tabla resumen:
  ```
  Lote:                 #LOTE-CERD-001
  Escenario:            Despiece Industrial
  Cabezas vendidas:     50
  Peso liquidado:       3.560 kg (PCF)
  ─────────────────────────────────────
  Ingreso bruto:        Bs 11.392
  Costo del lote:       Bs 17.500
  Gastos de venta:      Bs   850
  ─────────────────────────────────────
  Utilidad neta:        Bs −6.958 (rojo)
  Utilidad/cabeza:      Bs −139
  Margen s/ costo:      −40%
  ```
- **Criterio de aceptación:** el modal muestra los 9 valores antes del botón
  Confirmar. Si la utilidad es negativa, se ve en rojo y aparece la advertencia
  extra del ítem 2.3.
- **Estimación:** 45 min.

### 3.2 Comparador unificado de escenarios (tabla única)

- **Tipo:** UX
- **Problema:** Pie y Gancho están en 2 columnas; Despiece está abajo en
  otra estructura. Comparar requiere mirar 3 zonas distintas.
- **Archivo:** `frontend/src/pages/agro/Liquidacion.jsx`
- **Cambios:**
  - Reemplazar las cards `ResultCol` × 2 + sección Despiece por una **tabla**
    con 3 columnas (Pie / Gancho / Despiece) y filas alineadas:
    - Kilos útiles
    - Costo / kg
    - Ingreso bruto
    - Gastos de venta
    - Utilidad neta
    - Utilidad / cabeza
    - Utilidad / kg
    - Margen
  - La columna ganadora se resalta con el color y badge "Recomendado".
  - Mantener el editor de cortes y el detalle del simulador en su acordeón
    separado debajo.
- **Criterio de aceptación:** veo los 3 escenarios alineados horizontalmente,
  puedo comparar utilidades de un vistazo.
- **Estimación:** 2 h.
- **Dependencia:** facilita implementar 2.1 (selector manual).

### 3.3 Punto de equilibrio por escenario

- **Tipo:** feature de análisis
- **Archivo:** `frontend/src/pages/agro/Liquidacion.jsx`
- **Cambios:** mostrar en cada escenario el "PVP mínimo para no perder":
  ```
  pvpMinPie    = (costoTotalLote + gastosVenta)       / pvAyunado
  pvpMinGancho = (costoTotalLote + gastosGanchoTotal) / pcf
  ```
  Para despiece es más complejo (mix variable). Empezar por Pie y Gancho.
  Mostrar como tooltip: *"Necesitás vender a Bs X/kg o más para cubrir
  costos. Tu PVP actual: Bs Y."*
- **Criterio de aceptación:** veo el PVP mínimo de equilibrio al lado del
  PVP ingresado, en cada escenario.
- **Estimación:** 30 min.

### 3.4 Liquidación parcial del lote

- **Tipo:** feature funcional
- **Problema:** hoy si vendo 30 de 50 cerdos tengo que cerrar el lote entero.
- **Archivos:**
  - Frontend: `Liquidacion.jsx`
  - Backend: `controllers/loteController.js` (función `liquidarLote`)
- **Cambios:**
  - Frontend: cuando `cabezasVenta < loteData.cabezasActivas`, mostrar toggle:
    - ☐ Cerrar lote completo (descarta el resto)
    - ☑ Mantener el lote activo con las cabezas restantes
  - Backend: si `mantener_activo = true`, en vez de cambiar el estado del lote,
    solo se descuentan las cabezas vendidas y se guarda un registro en una
    nueva tabla `liquidaciones_parciales` (id, lote_id, fecha, cabezas, peso,
    escenario, utilidad, mix_produccion).
  - Recalcular costos prorrateados: cuando hay liquidación parcial, el lote
    activo "se queda con" el costo acumulado proporcional a las cabezas que
    siguen vivas.
- **Criterio de aceptación:** puedo liquidar 20 cabezas y el lote queda con
  30 activas y el costo proporcional. Puedo liquidar las otras 30 después.
- **Estimación:** 4–6 h (requiere migración de DB).

---

## 4. Mejoras del simulador industrial (prioridad MEDIA)

### 4.1 Productos del simulador también dinámicos

- **Tipo:** completar la flexibilidad iniciada con los cortes
- **Problema:** los cortes ya son add/remove/edit pero los productos
  (Jamón, Chorizo, Tocino, Chuleta Fresca, Subproductos) siguen hardcoded.
  Si una empresa hace "Hamburguesa" o "Lomo curado", no puede modelarlo.
- **Archivo:** `frontend/src/pages/agro/Liquidacion.jsx`
- **Cambios:**
  - Estado `productosList: [{ id, nombre, corteId, mermaTermicaPct, pvp,
    notas }]`, persistido en `localStorage` por negocio.
  - Botón "+ Agregar producto" en la tabla del simulador.
  - Cada producto tiene un `<select>` para elegir corte de origen (la lista
    viene de `cortesNum`).
  - Permite múltiples productos del mismo corte (ej. 2 cortes de pernil:
    jamón cocido + jamón crudo).
  - Migración: al cargar por primera vez, sembrar la lista con los 5
    productos default (Jamón → pernil, Chorizo → paleta, etc.) para que
    nada cambie visualmente para usuarios existentes.
- **Criterio de aceptación:** puedo agregar un producto nuevo "Hamburguesa
  premium" que sale del corte "Paleta", con su propia merma y PVP, y se
  contabiliza en la utilidad del despiece.
- **Estimación:** 4–5 h.
- **Dependencia:** habilita 4.2 (monetizar cortes extra) gratis.

### 4.2 Monetizar cortes "extra" creados por el usuario

- **Tipo:** consecuencia de 4.1
- **Estado actual:** los cortes extra que el usuario agrega aparecen en la
  barra y suman a la distribución de PCF, pero no entran en la utilidad
  porque no tienen producto asociado.
- **Resuelto por:** ítem 4.1.

### 4.3 Routing automático extensible (no solo chuleta → chorizo)

- **Tipo:** mejora del motor de recomendación
- **Estado actual:** hay un único `simChuletaAChorizo` que decide si la
  chuleta va a chuleta fresca o a chorizo según el margen.
- **Cambios:**
  - Generalizar: cada producto puede tener "rutas alternativas"
    (`alternativas: [{ corteId, productoDestinoId }]`).
  - El motor compara márgenes y sugiere la ruta óptima.
- **Estimación:** 3 h.
- **Dependencia:** depende de 4.1.

### 4.4 Vista "qué pasa si" (análisis de sensibilidad)

- **Tipo:** feature de análisis
- **Cambios:** al hacer hover sobre un PVP, mostrar mini gráfico o texto:
  *"Si subís este PVP en Bs 1, la utilidad del escenario sube en Bs X."*
  Calculado simple: `delta_utilidad = kg_final * delta_pvp`.
- **Estimación:** 1.5 h.

---

## 5. Mejoras del modelo de datos (prioridad BAJA-MEDIA)

### 5.1 Plantillas de despiece por especie

- **Tipo:** mejora de defaults
- **Problema:** la distribución estándar de cortes (`CORTES_DEFAULT`) asume
  cerdo. El sistema dice ser universal pero solo viene con un preset.
- **Cambios:**
  - Convertir `CORTES_DEFAULT` en `CORTES_PRESETS = { cerdo: [...], bovino:
    [...], ovino: [...], pollo: [...] }`.
  - Al abrir el simulador por primera vez, usar el preset según `loteData.tipo`.
  - En el editor, dropdown "Cargar preset: [Cerdo / Bovino / Ovino / Pollo]"
    que sobreescribe la lista actual.
- **Estimación:** 1.5 h (lo más lento es investigar los % reales por especie).

### 5.2 Rendimiento canal por defecto según especie

- **Tipo:** UX
- **Cambios:** precargar el % de rendimiento canal según `loteData.tipo`:
  - Cerdo: 75%
  - Bovino: 55%
  - Ovino: 50%
  - Pollo: 70%

  Mostrar la fuente como tooltip: *"Estándar para cerdo de mercado en
  confinamiento."*.
- **Estimación:** 20 min.

### 5.3 Margen sobre venta (además de margen sobre costo)

- **Tipo:** completar métricas
- **Cambios:** agregar fila "Margen s/ venta" en cada escenario:
  ```
  margenVenta = utilidad / ingreso * 100
  ```
  Es el indicador comercial estándar (lo que ve un contador).
- **Estimación:** 15 min.

### 5.4 Histórico de cortes editados

- **Tipo:** trazabilidad
- **Cambios:** al guardar la liquidación, ya se persiste
  `distribucion_cortes_full` en `mix_produccion`. Aprovechar eso para mostrar
  en la pantalla de Historial el mix usado en cada liquidación cerrada.
- **Estimación:** 1 h (incluye trabajo en `Historial.jsx`).

### 5.5 Indicador de confianza del ICA

- **Tipo:** UX
- **Problema:** hoy el ICA se calcula con cualquier cantidad de registros.
  Si hay 1 o 2 entradas de alimento, el valor es ruidoso.
- **Cambios:** mostrar al lado del ICA un badge:
  - ≥ 20 registros → "Confianza alta"
  - 10–19 → "Confianza media"
  - < 10 → "Confianza baja — pocos registros de alimento"
- **Estimación:** 20 min.

### 5.6 Exportar liquidación a PDF/Excel

- **Tipo:** feature de output
- **Cambios:** botón "Exportar resumen" en el modal de confirmación que genera
  un PDF con cabecera (lote, fecha, escenario), tabla resumen y desglose del
  mix industrial. Existen skills `pdf` y `xlsx` disponibles.
- **Estimación:** 2 h.

### 5.7 Costos de procesamiento separados (planta, empaques)

- **Tipo:** completar modelo
- **Problema:** cuando se vende despiezado, los gastos de planta (mano de obra
  de despiezadores, empaque al vacío, etiquetado) hoy quedan dentro de "gastos
  de faena" o "otros". No se modelan explícitamente.
- **Cambios:** sección "4. Gastos de procesamiento (solo despiece)" con
  inputs separados: mano de obra de planta (Bs/kg PCF), empaques (Bs/kg
  producto final), refrigeración. Solo se suma al escenario despiece.
- **Estimación:** 1 h.

### 5.8 Trazabilidad post-venta

- **Tipo:** feature de gestión
- **Cambios:** al confirmar liquidación, paso opcional para vincular la
  venta a un cliente y opcionalmente generar nº de factura/recibo.
  Requiere tabla `clientes` y `ventas` en backend (probablemente ya existen
  parcialmente).
- **Estimación:** 4–6 h.

---

## 6. Roadmap sugerido

### Sprint 1 — "Sanear lo que ya está" (1 día efectivo)

Objetivo: dejar el módulo robusto antes de agregar cosas nuevas.

1. **1.1** Fix CSS modal (5 min)
2. **1.2** Botón disabled con tooltip (15 min)
3. **2.2** Persistencia PVPs y mermas térmicas (30 min)
4. **2.4** Mermas reales en cascada (45 min)
5. **5.2** Rendimiento canal por especie (20 min)
6. **5.3** Margen sobre venta (15 min)
7. **5.5** Confianza del ICA (20 min)

**Total estimado:** ~2.5 h.

### Sprint 2 — "Empoderar al usuario" (1–2 días efectivos)

Objetivo: que el usuario tenga control real y no se le impongan decisiones.

8. **2.1** Selector manual de escenario (2 h)
9. **2.3** Validaciones al confirmar (1 h)
10. **3.1** Modal de confirmación con resumen (45 min)
11. **3.2** Tabla comparativa unificada (2 h)
12. **3.3** Punto de equilibrio (30 min)

**Total estimado:** ~6.5 h.

### Sprint 3 — "Flexibilidad total del despiece" (2 días efectivos)

Objetivo: el simulador deja de ser específico de cerdo.

13. **5.1** Presets por especie (1.5 h)
14. **4.1** Productos del simulador dinámicos (4–5 h)
15. **4.3** Routing extensible (3 h)
16. **4.4** Análisis "qué pasa si" (1.5 h)
17. **5.7** Costos de procesamiento separados (1 h)

**Total estimado:** ~11 h.

### Sprint 4 — "Cierre operativo" (2 días efectivos)

Objetivo: que el módulo encaje con el flujo real de venta.

18. **3.4** Liquidación parcial (4–6 h)
19. **5.4** Histórico de mix editado (1 h)
20. **5.6** Exportar a PDF/Excel (2 h)
21. **5.8** Trazabilidad post-venta (4–6 h)

**Total estimado:** ~13 h.

---

## 7. Notas técnicas transversales

### Sobre persistencia local

Los items 2.2, 4.1, 5.1 escriben a `localStorage` con claves del tipo
`<feature>_${negocioId}`. Conviene centralizar en un helper
`storage.get(key, negocioId, fallback)` y `storage.set(key, negocioId, value)`
para mantener consistencia. Hoy hay 2 implementaciones inline distintas.

### Sobre migración del mix_produccion

El campo `mix_produccion` se guarda como JSONB en la liquidación. Los items
que cambian su estructura (4.1 sobre todo) deben mantener compatibilidad
hacia atrás: liquidaciones viejas siguen renderizándose en el historial
con los productos hardcoded; nuevas usan la lista dinámica.

### Sobre el cálculo de mermas

Cuando se activen las mermas reales (2.4), revisar también:
- El backend de `liquidarLote` ya acepta `merma_ayuno`, `merma_frio`,
  `merma_desposte` en el request (ver `loteController.js:151`). Solo hay que
  enviarlos desde el frontend.
- Las referencias estándar por especie deberían venir de una tabla de
  constantes biológicas, no hardcodeadas en el frontend.

### Sobre testing

Ningún ítem incluye tests automatizados porque el proyecto no parece tener
un setup de testing activo. Si se agrega Jest/Vitest, los puntos más
importantes a cubrir son:
- Cálculos del simulador con cortes editados (4.1).
- Routing del chorizo cuando chuleta cambia de margen (4.3).
- Mermas en cascada (2.4).
- Validaciones del confirm (2.3).

---

## 8. Definición de "Hecho" para cada ítem

Para considerar un ítem cerrado:

1. El cambio compila sin errores (`node -e "require('@babel/parser')..."` o
   `npm run build`).
2. El cambio se probó manualmente en el navegador con un lote demo
   (`LOTE-CERD-001` del seed `engorde_porcino`).
3. El criterio de aceptación del ítem se cumple.
4. No se rompió ningún otro flujo (probar al menos: liquidar pie, gancho,
   despiece; navegar a Historial; cambiar de lote; cambiar de negocio).
5. Los tooltips e `InfoTip` agregados son consistentes con el patrón del
   módulo (ver iteraciones anteriores).
