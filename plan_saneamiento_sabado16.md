# Plan de saneamiento — Sábado 16/05/2026

**Equipo:** Jairo · Sebastián · Gerardo
**Rama de trabajo:** `develop` (creada desde `staging`)
**Estado al iniciar:** frontend conectado a backend, flujos principales funcionando pero con bugs ocultos y UI inconsistente.

**Énfasis del día:** dejar el módulo de **ganadería (agro)** pulcro y sin deuda visible. El domingo vamos a empezar implementaciones nuevas sobre ese módulo, por lo que hoy NO se implementa nada nuevo — solo se limpia, se corrigen bugs y se prepara el terreno.

---

## 1. Bugs y huecos detectados

### 1.1 Frontend

| # | Archivo | Bug / problema | Severidad |
|---|---|---|---|
| F1 | `pages/Historial.jsx:106` | Hardcodea `rubro: 'industrial'`. Si el negocio activo es agro, el historial igual se muestra como industrial. No recibe `negocio` desde `App.jsx`. | Alta |
| F2 | `pages/agro/Liquidacion.jsx:16,38,160` | El mapeo reasigna `l.id ← identificador`, perdiendo el UUID real para llamar al backend. `parseInt(e.target.value) \|\| e.target.value` es frágil. | Alta |
| F3 | `pages/agro/Liquidacion.jsx:281-303` | Botón "Registrar liquidación y cerrar lote" **no llama a ningún endpoint** — solo cierra el modal. Engaña al usuario. | Crítica |
| F4 | `pages/agro/Liquidacion.jsx:74` | `alimentoConsumido = 2970` constante hardcoded. El ICA mostrado es falso. | Alta |
| F5 | `pages/agro/Liquidacion.jsx:71-72` | División por cero si `pesoTotalPie` o `pesoGancho` son 0 → muestra `Infinity` o `NaN`. | Media |
| F6 | `pages/agro/Bitacora.jsx:68-79` | El `useEffect` que selecciona insumo y costo sobreescribe lo que el usuario edita al cambiar categoría. UX confuso. | Media |
| F7 | `pages/agro/Bitacora.jsx:271-272` | El label fijo "Sacos / Costo por saco" no aplica a Sanidad / Mano de obra. Debería ser dinámico según la unidad del insumo. | Media |
| F8 | `pages/agro/Bitacora.jsx:206` | Mismo patrón `parseInt \|\| string` para selectedLoteId. | Baja |
| F9 | `pages/agro/Lotes.jsx:133-135,144-147` | Cálculo de `alimento`, `sanidad`, `moObra` depende de strings exactos (`'Sanidad / Medicamento'`, `'Mano de obra'`) que pueden no coincidir con las categorías reales — desglose falla en silencio. `convAliment` siempre 0. | Alta |
| F10 | `pages/Dashboard.jsx:11,89-96,134,263` | Sigue usando `MOCK_BY_NEGOCIO` para algo. PVP/Margen industriales se inventan con 30% fijo. Tarjetas "Sprint 2" / "Mejor ICA — " mienten. | Media |
| F11 | `pages/FichaCosto.jsx:169,179,186` | Tres placeholders dicen "Sprint 2" cuando ya estamos pasados. | Baja |
| F12 | `App.jsx:24,34` | `GastosCIFPlaceholder` dice "Sprint 2". Sigue siendo placeholder. | Baja |
| F13 | `App.jsx:117-122,166` | Al cambiar negocio, `activeLote` y `activeProductoId` quedan stale → si volvés a Bitácora ves el lote del negocio anterior. | Alta |
| F14 | `layouts/AppLayout.jsx:152-154` | Botón de campana (notificaciones) decorativo, no hace nada. UX engañoso. | Baja |
| F15 | `pages/Historial.jsx:130` | `pvp = costoUnitario * 1.3` calculado en frontend, no en backend. Engaña al usuario igual que F10. | Media |
| F16 | `pages/agro/Lotes.jsx:140-148` | "Bajas" = `cabezas_inicio - cabezas_activas` — incorrecto si se hicieron ajustes manuales. | Baja |

### 1.2 Backend (solo Jairo)

| # | Archivo | Falta / bug | Severidad |
|---|---|---|---|
| B1 | `controllers/loteController.js` | **No existe endpoint** `POST /lotes/:id/liquidar` que persista la liquidación. El frontend lo necesita para F3. | Crítica |
| B2 | `controllers/loteController.js:20,25` | Filtros por tipo usan strings literales hardcoded — frágil. Debería filtrar por `categoria_id` joined con `categorias_insumos`, o aceptar que el frontend reagrupe. | Alta |
| B3 | `controllers/loteController.js` | Faltan `updateBitacoraEntry` y `deleteBitacoraEntry` — si el usuario se equivoca registrando un gasto, no puede corregirlo. | Media |
| B4 | `controllers/loteController.js:132-147` | `cerrarLote` existe pero solo flippea `activo=false`. No guarda los datos de la liquidación (peso final, costo/kg, escenario elegido). | Alta |
| B5 | Migración | Falta tabla `liquidaciones_lote` para que la liquidación sea consultable después (cierra el ciclo del plan de alineación). | Media (opcional si no llegamos) |

---

## 2. Mejoras de UI/UX (sin tocar lógica)

| # | Pantalla | Mejora |
|---|---|---|
| U1 | **Liquidación** | Sacar el `<select>` del título — moverlo arriba como banner separado con resumen del lote (igual que Bitácora). Título queda limpio. |
| U2 | **Liquidación** | Cards "Venta en pie" y "Venta gancho" están apretadas con el input PVP en el header. Mover PVP fuera (a la columna izquierda, junto a Rendimiento). Las cards quedan solo de **resultado**. |
| U3 | **Liquidación** | Si `utilPie < 0` y `utilGancho < 0`, ocultar el badge "Recomendado" y mostrar un aviso amarillo "Ningún escenario es rentable con estos precios". |
| U4 | **Liquidación** | Sacar el bloque ICA hardcoded o mostrarlo solo cuando haya bitácora real de alimentos. |
| U5 | **Bitácora** | Label dinámico: "Cantidad (\<unidad\>)" / "Precio unitario" en vez de "Sacos / Costo por saco". |
| U6 | **Lotes** | La card es muy alta — colapsar el desglose de costos en un acordeón. |
| U7 | **Dashboard agro** | Sacar la tarjeta "Mejor ICA — " hasta tener el dato. Reemplazar por "Costo / cabeza promedio". |
| U8 | **Dashboard industrial** | Sacar la tarjeta "Punto de equilibrio · Próximamente" y "Distribución de costos · Próximamente". Reemplazar por algo real (productos sin ficha calculada). |
| U9 | **FichaCosto** | Reemplazar los tres placeholders "Sprint 2" por uno solo, más discreto, abajo de todo, que diga "CIF, PE y WIP llegan en el próximo sprint." |
| U10 | **AppLayout** | Sacar el botón de campana o cambiarle el cursor a `default` con tooltip "próximamente". |

---

## 3. Modalidad de trabajo y rama

- **Rama de trabajo:** `develop`, creada hoy desde `staging`.
- **Una tarea = un commit** en `develop`. Cada commit tiene mensaje convencional (`fix(...)`, `feat(...)`, etc.).
- **No se hace merge a `staging`** hasta el final del día y solo si pasa el smoke test.
- **Vibecoding:** cada tarea trae un *Prompt* para pegarle a Claude/Cursor y un *Definition of Done* con cómo comprobar que quedó bien.
- **Horarios:**
  - **Sebastián** — 09:00 a 13:00 (mañana) y 14:00 a 15:00 (tarde temprano). ~5h efectivas. Carga todo el frontend del día.
  - **Gerardo** — 16:00 a 18:00. ~2h efectivas. Dos tareas concretas de agro.
  - **Jairo** — 18:00 en adelante (noche). Solo **backend** + smoke test final + merge.

---

## 4. Plan ejecutable (buckets para Planner)

> **Convención por bucket:** `1.5.X (fix) Nombre` + checklist + prompt + Definition of Done + comandos git.
> Cada bucket = un commit en `develop`. Hacer `git pull origin develop` **antes de cada commit** para no pisar al compañero.

---

### 1.5.1 (fix) Setup rama develop

**Lista de comprobación (3 de 3 elementos completados)**
- [ ] Crear rama `develop` desde `staging` y pushearla a origin
- [ ] Sebastián y Gerardo hacen `git checkout develop` exitoso
- [ ] Avisar al grupo de WhatsApp que `develop` ya existe

**Asignado:** Jairo (lo deja listo antes de las 09:00).
**Tiempo:** 10 min.

**Prompt para vibecoding:** *(no aplica — es solo git)*

**Definition of Done:**
- `git branch -a` muestra `develop` local y `remotes/origin/develop`.
- Los otros dos confirman por WhatsApp que el `git checkout develop` les funcionó.

**Comandos:**
```bash
git checkout staging
git pull origin staging
git checkout -b develop
git push -u origin develop
```

---

## 🟢 SEBASTIÁN — 09:00 a 15:00 (con almuerzo 13:00–14:00)

> **Antes de empezar el día:** `git checkout develop && git pull origin develop`.
> **Antes de cada commit:** volver a hacer `git pull origin develop` para traer lo que subió otro.
>
> **Orden sugerido:** hacer las tareas de la 1.5.2 a la 1.5.6 en la mañana (bugs visibles + rediseño de Liquidación). Después del almuerzo, 1.5.7 a 1.5.11 son más chicas y de "conectar cables".
>
> **⚠️ Importante sobre 1.5.8 y 1.5.11:** dependen de endpoints que Jairo crea recién a la noche. Codificalas contra el contrato documentado en el prompt — la integración real se prueba en el smoke test (1.5.17). Mientras tanto, dejá la llamada hecha pero esperá un 404 si la probás antes.

### 1.5.2 (fix) Dashboard sin mocks ni PVP inventado

**Lista de comprobación (4 de 4 elementos completados)**
- [ ] Eliminar el import y todos los usos de `MOCK_BY_NEGOCIO` en `pages/Dashboard.jsx`
- [ ] Sacar la columna PVP de la tabla "Productos — últimas fichas" (o marcarla como "sugerido" con tooltip)
- [ ] Eliminar la lógica `costoUnitario * 1.3` y `* 0.3` para PVP/Margen
- [ ] Verificar que `npm run dev` arranca sin warnings nuevos en consola

**Prompt para vibecoding:**
> "En `frontend/src/pages/Dashboard.jsx` necesito eliminar todo lo relacionado con `MOCK_BY_NEGOCIO`: el import, las constantes y los lugares donde se usa. También quiero sacar de la tabla 'Productos — últimas fichas' la columna PVP, porque la calculamos en frontend multiplicando por 1.3 y eso es mentira. Si la tabla queda muy vacía, dejá la columna pero renombrala 'PVP sugerido' con un icono de tooltip que diga 'Cálculo provisional — el PVP real lo define el usuario'. No toques nada más del archivo."

**Definition of Done:**
- `git grep MOCK_BY_NEGOCIO` ya no muestra resultados en `pages/Dashboard.jsx`.
- Abrir el dashboard con negocio industrial: la tabla muestra productos reales sin columna PVP "inventada", o con el tooltip claro.
- No hay errores rojos en la consola del browser al cargar `/dashboard`.

**Commit:**
```bash
git pull origin develop
git add .
git commit -m "fix(web): eliminar mocks y PVP inventado del Dashboard"
git push origin develop
```

---

### 1.5.3 (fix) Dashboard con tarjetas reales

**Lista de comprobación (4 de 4 elementos completados)**
- [ ] Tarjeta "Mejor ICA — " del dashboard agro reemplazada por "Costo / cabeza promedio"
- [ ] Tarjeta "Punto de equilibrio · Próximamente" del dashboard industrial reemplazada por "Productos sin ficha"
- [ ] Tarjeta "Distribución de costos · Próximamente" reemplazada por una métrica real (ej: cantidad de fichas calculadas este mes)
- [ ] Todas las tarjetas muestran un número, no un guion ni "Próximamente"

**Prompt para vibecoding:**
> "En `frontend/src/pages/Dashboard.jsx` hay tres tarjetas-placeholder. Reemplazalas por tarjetas con datos reales que se calculen desde lo que ya viene de la API:
> 1. **Agro — 'Mejor ICA'**: cambiala por **'Costo / cabeza promedio'**: sumar el costo total de todos los lotes activos del negocio agro y dividir entre la suma de cabezas activas. Si no hay lotes, mostrar '—'.
> 2. **Industrial — 'Punto de equilibrio · Próximamente'**: cambiala por **'Productos sin ficha'**: cantidad de productos del negocio que aún no tienen una ficha de costo asociada.
> 3. **Industrial — 'Distribución de costos · Próximamente'**: cambiala por **'Fichas calculadas este mes'**: cuántas fichas únicas se crearon en el mes calendario actual.
> Usá el mismo componente de tarjeta que ya existe, no inventes uno nuevo. Si no encontrás datos para alguno, dejá el valor en '—' pero NO pongas 'Próximamente'."

**Definition of Done:**
- Las tres tarjetas muestran un número (o `—` si no hay datos), nunca "Próximamente" ni "Sprint 2".
- Cambiar de negocio (agro ⇄ industrial) actualiza la tarjeta correspondiente.
- Si el negocio no tiene datos cargados, las tarjetas muestran `—` sin romper la UI.

**Commit:**
```bash
git pull origin develop
git add frontend/src/pages/Dashboard.jsx
git commit -m "fix(web): tarjetas del Dashboard con datos reales"
git push origin develop
```

---

### 1.5.4 (fix) Limpieza de placeholders "Sprint 2" y campana decorativa

**Lista de comprobación (4 de 4 elementos completados)**
- [ ] Reemplazar los 3 placeholders "Sprint 2" en `pages/FichaCosto.jsx` por uno solo más discreto al final
- [ ] Cambiar el texto "Sprint 2" en `App.jsx` (`GastosCIFPlaceholder`) por "Próximo sprint"
- [ ] Quitar el botón de campana de `layouts/AppLayout.jsx`
- [ ] `git grep "Sprint 2"` devuelve 0 resultados en archivos `.jsx`

**Prompt para vibecoding:**
> "Tenemos textos 'Sprint 2' regados que ya están desactualizados. Quiero limpiarlos:
> 1. En `frontend/src/pages/FichaCosto.jsx`, líneas 169, 179, 186 — los tres placeholders 'Sprint 2' actuales son demasiado prominentes. Eliminá los tres y dejá un único bloque discreto al final del componente que diga: *'CIF, Punto de Equilibrio y WIP llegan en el próximo sprint.'* Estilo gris claro, sin íconos llamativos.
> 2. En `frontend/src/App.jsx` líneas 24 y 34, en `GastosCIFPlaceholder`, cambiá cualquier mención de 'Sprint 2' por 'Próximo sprint'.
> 3. En `frontend/src/layouts/AppLayout.jsx` líneas 152-154 hay un botón de campana decorativo. Eliminalo del JSX completamente — ocupa lugar y engaña al usuario.
> No toques lógica, solo textos y un nodo de JSX."

**Definition of Done:**
- `git grep "Sprint 2"` no devuelve nada en `frontend/src/**/*.jsx`.
- La campana ya no aparece en el header en ninguna pantalla.
- FichaCosto se ve más limpia y el mensaje final es informativo, no llamativo.

**Commit:**
```bash
git pull origin develop
git add frontend/src/pages/FichaCosto.jsx frontend/src/App.jsx frontend/src/layouts/AppLayout.jsx
git commit -m "fix(web): limpiar placeholders Sprint 2 y campana decorativa"
git push origin develop
```

---

### 1.5.5 (fix) LoteCard con desglose colapsable 🐄 GANADERÍA

**Lista de comprobación (3 de 3 elementos completados)**
- [ ] El desglose de costos (alimento, sanidad, mano de obra, otros) queda dentro de un acordeón cerrado por defecto
- [ ] El acordeón abre y cierra con un chevron animado al hacer click
- [ ] La card en estado cerrado ocupa al menos un 40% menos de alto vertical

**Prompt para vibecoding:**
> "En `frontend/src/pages/agro/Lotes.jsx`, dentro del componente que renderiza cada card de lote, el bloque de desglose de costos (alimento, sanidad, mano de obra, otros) hace que la card sea demasiado alta. Necesito colapsar ese bloque en un acordeón:
> - Estado inicial: cerrado.
> - Header del acordeón: un botón con 'Ver desglose de costos' + chevron `▶` que rota a `▼` al abrir.
> - No uses ninguna librería nueva — implementalo con un `useState(false)` y CSS/Tailwind.
> - La animación de rotación del chevron debe ser suave (transition).
> - El resto de la card (cabezas, días, costo total) sigue visible siempre.
> No toques cálculos ni el resto del componente."

**Definition of Done:**
- Al cargar `/agro/lotes` las cards se ven compactas (sin el desglose).
- Click en "Ver desglose de costos" expande el detalle.
- El chevron rota visualmente al hacer click.
- Toda la información que estaba antes sigue accesible, solo que escondida.

**Commit:**
```bash
git pull origin develop
git add frontend/src/pages/agro/Lotes.jsx
git commit -m "fix(web): LoteCard con desglose de costos colapsable"
git push origin develop
```

---

### 1.5.6 (fix) Liquidación — rediseño de layout 🐄 GANADERÍA

**Lista de comprobación (5 de 5 elementos completados)**
- [ ] El `<select>` de lote sale del título y queda como banner superior con resumen del lote (igual estilo que Bitácora)
- [ ] El título queda limpio: solo "Liquidación de lote"
- [ ] El input "PVP $/kg" sale del header de cada card y se mueve a la columna izquierda, debajo de "Rendimiento canal"
- [ ] Las cards "Venta en pie" y "Venta gancho" muestran solo resultados (costo/kg, utilidad, margen)
- [ ] El badge "Recomendado" aparece solo cuando al menos un escenario tiene utilidad ≥ 0

**Prompt para vibecoding:**
> "En `frontend/src/pages/agro/Liquidacion.jsx` quiero reorganizar el layout sin tocar la lógica de cálculo. Cambios:
> 1. **Banner de lote**: hoy el `<select>` para elegir lote está mezclado con el título de la página. Sacalo del título — el título queda 'Liquidación de lote'. Arriba del contenido principal, agregá un banner gris claro con: el `<select>` de lote, y al lado el resumen (cabezas iniciales, días activo, costo total acumulado). Mirá `pages/agro/Bitacora.jsx` para usar exactamente el mismo estilo de banner.
> 2. **PVP fuera de las cards**: los inputs 'PVP $/kg pie' y 'PVP $/kg gancho' hoy están dentro del header de cada card de escenario y se ven apretados. Movelos a la columna izquierda (donde están Cabezas, Peso prom final, Rendimiento canal). Cada input PVP queda en su propia fila debajo de Rendimiento.
> 3. **Cards solo de resultado**: las cards 'Venta en pie' y 'Venta gancho' ahora deben mostrar **solo** los números calculados (peso total, costo/kg, ingreso, utilidad, margen). Nada de inputs.
> 4. **Badge 'Recomendado'**: hoy aparece siempre en la card con mejor utilidad. Cambialo a: aparecer solo si esa utilidad es ≥ 0. Si ambos escenarios son negativos, ninguna card lleva el badge.
> No toques los cálculos (`pesoTotalPie`, `costoKgVivo`, etc.), solo el JSX y la ubicación de los inputs."

**Definition of Done:**
- Al entrar a `/agro/liquidacion` con un lote seleccionado se ve: banner superior con select+resumen, columna izquierda con todos los inputs (incluidos los dos PVP), dos cards de resultado limpias a la derecha.
- Cambiar el lote desde el banner actualiza el resumen y los cálculos.
- Si ponés PVP bajos que dan utilidad negativa en ambos escenarios, ninguna card muestra el badge "Recomendado".
- En mobile (DevTools 375px) la columna izquierda y las cards se apilan vertical sin romperse.

**Commit:**
```bash
git pull origin develop
git add frontend/src/pages/agro/Liquidacion.jsx
git commit -m "fix(web): rediseñar layout de Liquidación (banner + PVP fuera de cards)"
git push origin develop
```

---

### 1.5.7 (fix) Inputs numéricos con patrón anti-NaN

**Lista de comprobación (3 de 3 elementos completados)**
- [ ] Identificar todos los `parseInt(...) || 0` y `parseFloat(...) || 0` en los formularios principales (Liquidación, Bitácora, Lotes, FichaCosto)
- [ ] Reemplazarlos por un patrón que permita borrar el campo y volver a tipear desde "0." sin que se rompa
- [ ] Probar a mano en cada formulario: borrar un input numérico, dejarlo vacío, y volver a tipear

**Prompt para vibecoding:**
> "En los formularios de la app tenemos el siguiente problema: muchos inputs numéricos usan `value={x} onChange={e => setX(parseFloat(e.target.value) || 0)}`. Esto rompe la UX porque si el usuario borra el campo, queda visualmente en '0' y no puede empezar a escribir '0.5' (porque '0.' parsea a 0 y se reescribe).
> Quiero aplicar este patrón en su lugar:
> ```js
> const [xRaw, setXRaw] = useState('');
> const x = parseFloat(xRaw) || 0;  // este es el valor numérico que usa la lógica
> // en el input:
> value={xRaw}
> onChange={e => setXRaw(e.target.value)}
> ```
> Aplicalo en todos los inputs numéricos de estos archivos:
> - `frontend/src/pages/agro/Liquidacion.jsx`
> - `frontend/src/pages/agro/Bitacora.jsx`
> - `frontend/src/pages/agro/Lotes.jsx`
> - `frontend/src/pages/FichaCosto.jsx`
> Si en alguno ya hay un patrón similar (revisá `Liquidacion.jsx` línea ~84), respetalo y replicalo. No modifiques la lógica de cálculo, solo cómo se guarda y muestra el valor."

**Definition of Done:**
- Abrir Liquidación, borrar el contenido de un input numérico → queda vacío (no en "0").
- Tipear "0.5" letra por letra → muestra correctamente cada paso ("0", "0.", "0.5").
- Los cálculos siguen funcionando con los mismos resultados que antes.

**Commit:**
```bash
git pull origin develop
git add frontend/src/pages/agro/Liquidacion.jsx frontend/src/pages/agro/Bitacora.jsx frontend/src/pages/agro/Lotes.jsx frontend/src/pages/FichaCosto.jsx
git commit -m "fix(web): inputs numéricos permiten campo vacío y decimal incompleto"
git push origin develop
```

---

### 1.5.8 (fix) Frontend Liquidación — UUID correcto y llamada al endpoint 🐄 GANADERÍA

> ⚠️ **El endpoint backend lo crea Jairo en 1.5.14 (de noche).** Vos codificás la llamada contra el contrato que está en ese bucket. Si lo probás antes de la noche vas a recibir 404 — es esperado. La integración real se valida en 1.5.17 (smoke test).

**Lista de comprobación (4 de 4 elementos completados)**
- [ ] El mapeo del array de lotes en `pages/agro/Liquidacion.jsx` mantiene `l._id` (UUID real) separado de `l.id` (display)
- [ ] El botón "Registrar liquidación y cerrar lote" llama a `POST /lotes/:loteId/liquidar` con el body correcto
- [ ] Estados de loading (botón disabled + texto "Registrando...") y error (banner rojo con mensaje del backend) implementados
- [ ] Al éxito, redirigir a `/agro/lotes` y refrescar la lista (el lote ya no aparece como activo)

**Prompt para vibecoding:**
> "En `frontend/src/pages/agro/Liquidacion.jsx`:
> 1. **UUID separado** (líneas ~16, 38, 160): el código actual hace `{ ...l, id: l.identificador }` y pierde el UUID real. Cambiá el mapeo para que mantenga ambos: `{ ...l, _id: l.id, id: l.identificador }`. Donde se use el ID para identificar al lote en llamadas al backend, usá `_id`. Donde se muestre al usuario, usá `id`.
> 2. **Conectar el botón** (líneas ~281-303): el botón 'Registrar liquidación y cerrar lote' hoy solo cierra el modal. Cambialo para que llame `POST /lotes/{lote._id}/liquidar` con este body: `{ cabezas_venta, peso_prom_final, rendimiento_canal, escenario, pvp_kg, gastos_finales }` (todos números). Usá el cliente HTTP que ya use el resto del proyecto (revisá cómo lo hace `Bitacora.jsx` o `Lotes.jsx`).
> 3. **Loading + error**: mientras la llamada está en curso, el botón debe estar disabled y mostrar 'Registrando...'. Si responde error (400/404/409/500), mostrar un banner rojo arriba del modal con el mensaje del backend (`err.response.data.message` o similar).
> 4. **Éxito**: cerrar el modal, navegar a `/agro/lotes` (usá `useNavigate` de `react-router-dom`), y refrescar la lista de lotes.
> No toques los cálculos, solo el botón y el manejo del UUID. **Importante: el endpoint POST /lotes/:id/liquidar lo crea Jairo más tarde — vos solo dejá la llamada hecha contra ese contrato.**"

**Definition of Done:**
- Click al botón "Registrar liquidación" → botón muestra "Registrando..." y queda disabled.
- Si el backend devuelve un error (mientras no exista, vas a recibir 404): aparece banner rojo, modal no se cierra.
- Si el backend devuelve 200 (recién a la noche con Jairo): te redirige a `/agro/lotes`.
- En el código: `git grep "l\.id = l\.identificador"` o similar ya no aparece — el mapeo usa `_id` para el UUID.

**Commit:**
```bash
git pull origin develop
git add frontend/src/pages/agro/Liquidacion.jsx
git commit -m "fix(web): Liquidación llama endpoint /liquidar con UUID correcto"
git push origin develop
```

---

### 1.5.9 (fix) Historial recibe negocio activo

**Lista de comprobación (3 de 3 elementos completados)**
- [ ] `pages/Historial.jsx` recibe `negocio` como prop desde `App.jsx`
- [ ] Eliminado el hardcoded `rubro: 'industrial'` de la línea ~106
- [ ] El cálculo `pvp = costoUnitario * 1.3` (línea ~130) eliminado o reemplazado por el valor que venga del backend

**Prompt para vibecoding:**
> "Dos cambios chicos pero importantes:
> 1. **`frontend/src/App.jsx`**: cuando se renderiza `<Historial />` (alrededor de las líneas donde se rutean las páginas), pasale el prop `negocio={negocioActivo}` (o como se llame el estado de negocio activo en `App.jsx`).
> 2. **`frontend/src/pages/Historial.jsx`**:
>    - Aceptá `negocio` como prop.
>    - Eliminá el hardcoded `rubro: 'industrial'` (línea ~106) y usá `negocio.rubro` (o `negocio.tipo`, según como esté nombrado).
>    - Eliminá el cálculo `pvp = costoUnitario * 1.3` (línea ~130) y la columna PVP de la tabla (o renombrala 'PVP sugerido' con tooltip, igual que se hizo en Dashboard).
> Si el componente no estaba preparado para recibir `negocio`, agregá el prop al destructuring de los argumentos."

**Definition of Done:**
- Estar en negocio agro, ir a `/historial` → la página muestra el rubro 'agro' (no 'industrial') donde corresponda.
- Cambiar a negocio industrial → el historial cambia.
- La columna PVP ya no muestra cálculos "inventados".

**Commit:**
```bash
git pull origin develop
git add frontend/src/App.jsx frontend/src/pages/Historial.jsx
git commit -m "fix(web): Historial recibe negocio activo y sin PVP inventado"
git push origin develop
```

---

### 1.5.10 (fix) App.jsx limpia estado al cambiar negocio

**Lista de comprobación (3 de 3 elementos completados)**
- [ ] En el handler `onNegocioChange` de `App.jsx`, resetear `activeLote = null` y `activeProductoId = null`
- [ ] Verificar que cambiar de negocio agro → industrial → agro no muestra el lote/producto del anterior
- [ ] Si hay otros estados específicos del negocio (ej. filtros, búsquedas), también resetearlos

**Prompt para vibecoding:**
> "En `frontend/src/App.jsx` (alrededor de las líneas 117-122 y 166), cuando el usuario cambia de negocio activo, los estados `activeLote` y `activeProductoId` quedan stale. Eso hace que si volvés a Bitácora después de cambiar de negocio, ves el lote del negocio anterior.
> Encontrá el handler `onNegocioChange` (o como esté nombrado el callback que cambia el negocio activo) y agregá ahí mismo: `setActiveLote(null)` y `setActiveProductoId(null)`. Si hay otros estados que dependen del negocio (filtros, página activa, etc.) y que tendría sentido resetear, hacelo también.
> Si el cambio de negocio dispara un useEffect en lugar de un handler directo, ponelo en ese useEffect."

**Definition of Done:**
- Flujo manual: estar en negocio agro, entrar a Bitácora, seleccionar un lote, volver al dashboard. Cambiar a negocio industrial. Volver a Bitácora → no aparece nada seleccionado.
- Hacer el mismo flujo con productos en el lado industrial.

**Commit:**
```bash
git pull origin develop
git add frontend/src/App.jsx
git commit -m "fix(web): limpiar estado activo al cambiar de negocio"
git push origin develop
```

---

### 1.5.11 (fix) Frontend Lotes — consumir endpoint de desglose 🐄 GANADERÍA

> ⚠️ **El endpoint backend lo crea Jairo en 1.5.16 (de noche).** Codificá la llamada contra el contrato del bucket 1.5.16. Hasta que Jairo lo suba vas a tener 404 — es esperado.

**Lista de comprobación (4 de 4 elementos completados)**
- [ ] `pages/agro/Lotes.jsx` deja de filtrar la bitácora por strings literales (`'Sanidad / Medicamento'`, `'Mano de obra'`)
- [ ] En su lugar, llama a `GET /lotes/:id/costos-detalle` para cada lote (o uno solo agregado, según lo que devuelva Jairo)
- [ ] El desglose en la card usa los valores que vienen del backend tal cual (alimento, sanidad, mano_obra, otros, total)
- [ ] Si `convAliment` no se puede calcular sin ICA, se elimina del display

**Prompt para vibecoding:**
> "En `frontend/src/pages/agro/Lotes.jsx`, líneas 133-148, hoy el desglose de costos por categoría se calcula en el frontend filtrando entradas de bitácora por strings hardcoded ('Sanidad / Medicamento', 'Mano de obra'). Eso es frágil — si renombran una categoría se rompe en silencio.
> Cambialo para que llame al endpoint `GET /lotes/:loteId/costos-detalle` (lo crea Jairo a la noche, contrato: devuelve `{ alimento: number, sanidad: number, mano_obra: number, otros: number, total: number }`). Por cada lote en la lista, llamá el endpoint y usá esos valores tal cual en la card.
> Si `convAliment` (conversión alimenticia) hoy aparece siempre como 0 y no podemos calcularlo aún, eliminá esa key del JSX.
> **Importante**: el endpoint no existe todavía. Implementá la llamada (con axios o lo que use el proyecto), manejá el error con un fallback a `'—'` por categoría, y dejalo así. Cuando Jairo suba 1.5.16 a la noche y refrescemos la pantalla, los números van a aparecer solos."

**Definition of Done:**
- En el código: ya no aparecen strings literales `'Sanidad / Medicamento'`, `'Mano de obra'` como filtros de bitácora en `Lotes.jsx`.
- Hasta que el endpoint exista: la card muestra `—` en cada categoría sin romperse.
- Cuando el endpoint exista (a la noche post-merge de Jairo): los valores aparecen correctos.

**Commit:**
```bash
git pull origin develop
git add frontend/src/pages/agro/Lotes.jsx
git commit -m "fix(web): Lotes consume endpoint /costos-detalle en vez de filtrar por strings"
git push origin develop
```

---

## 🟡 GERARDO — 16:00 a 18:00

> **Antes de empezar:** `git checkout develop && git pull origin develop` (te trae todo lo de Sebastián).
> Tus dos tareas son chicas y concretas, ambas sobre **ganadería**. Cada una es un commit.

### 1.5.12 (fix) Liquidación — protección por cero e ICA real 🐄 GANADERÍA

**Lista de comprobación (4 de 4 elementos completados)**
- [ ] Si `pesoTotalPie === 0` o `pesoGancho === 0`, mostrar `'—'` en lugar de `Infinity` o `NaN` en costo/kg
- [ ] Eliminar la constante `alimentoConsumido = 2970` de `pages/agro/Liquidacion.jsx:74`
- [ ] Calcular el ICA real solamente si hay entradas de bitácora de categoría alimento — si no, mostrar "Sin datos de alimentación" en lugar del bloque ICA
- [ ] Si `cabezasVenta === 0` en ambos escenarios, mostrar un banner gris "Ingresá cantidades para ver el escenario"

**Prompt para vibecoding:**
> "En `frontend/src/pages/agro/Liquidacion.jsx` hay tres problemas a corregir, todos en el mismo archivo:
> 1. **División por cero** (líneas ~71-72): si `pesoTotalPie` o `pesoGancho` son 0, los costos por kg se muestran como `Infinity` o `NaN`. Hacé una guarda: si el divisor es 0, el valor mostrado debe ser el string `'—'`. La utilidad y el margen también deben quedar en `'—'` cuando no se pueden calcular.
> 2. **ICA hardcoded** (línea ~74): existe `const alimentoConsumido = 2970;`. Eliminala. En su lugar, recibí (o calculá desde el lote actual) la suma real de los montos de bitácora cuya categoría sea alimento. Si esa suma es 0 o no hay bitácora cargada, **no muestres el bloque ICA**: en su lugar, mostrá una caja con el texto 'Sin datos de alimentación en bitácora — el ICA se calculará cuando registres alimentos.' Si hay datos, calculá el ICA real (alimento consumido en kg / kg ganados) y mostralo.
> 3. **Banner sin datos**: si `cabezasVenta` es 0 (ni siquiera empezó a escribir) o todos los inputs de venta están vacíos, mostrá un banner gris claro arriba de las cards de escenario que diga 'Ingresá cantidades para ver el escenario'. Las cards de resultado quedan ocultas o en estado vacío hasta que haya datos.
> No toques el layout que rehizo Sebastián (banner superior y PVP a la izquierda)."

**Definition of Done:**
- Entrar a Liquidación con un lote sin bitácora de alimentos → el bloque ICA muestra el mensaje "Sin datos de alimentación".
- Poner `cabezasVenta = 0` o vacío → aparece banner gris, no `NaN` ni `Infinity` en pantalla.
- Cargar al menos una entrada de bitácora de tipo alimento (en otro tab, en `/agro/bitacora`) → el ICA aparece con un número real.
- Si el lote tiene `pesoTotalPie = 0`, los costos/kg muestran `'—'`.

**Commit:**
```bash
git pull origin develop
git add frontend/src/pages/agro/Liquidacion.jsx
git commit -m "fix(web): proteger Liquidación contra divisiones por cero y quitar ICA hardcoded"
git push origin develop
```

---

### 1.5.13 (fix) Bitácora — form respeta usuario y label dinámico 🐄 GANADERÍA

**Lista de comprobación (4 de 4 elementos completados)**
- [ ] El `useEffect` que autocompleta cantidad y precio NO sobreescribe lo que el usuario ya tipeó manualmente
- [ ] El label "Sacos / Costo por saco" cambia dinámicamente según la unidad del insumo (`Cantidad (kg)`, `Cantidad (dosis)`, etc.)
- [ ] Si el tipo de movimiento es "Mano de obra" u "Otras pérdidas", se ocultan los campos de cantidad/precio unitario y solo se muestra Monto + Descripción
- [ ] Probar en `/agro/bitacora`: cargar una entrada de alimento, otra de sanidad, otra de mano de obra → cada una muestra los campos correctos

**Prompt para vibecoding:**
> "En `frontend/src/pages/agro/Bitacora.jsx` hay tres mejoras al formulario:
> 1. **El form no debe pisar al usuario** (alrededor de líneas 68-79): hoy hay un `useEffect` que cuando cambiás de categoría auto-rellena `cantidad` y `precioUnitario` con los valores del insumo. Eso está bien para la primera vez, PERO si el usuario ya tipeó algo a mano (lo cambió respecto al default), no debe sobreescribirse al cambiar de categoría/insumo. Llevá una bandera (ej. `userEditedCantidad`, `userEditedPrecio`) que se vuelve `true` la primera vez que el usuario toca cada campo, y el `useEffect` solo autocompleta si esas banderas son `false`. Cuando el usuario cambia de insumo a propósito (en el select), reseteá las banderas a `false`.
> 2. **Label dinámico** (líneas ~271-272): el label fijo 'Sacos / Costo por saco' no aplica a sanidad, mano de obra, etc. Cambialo a `Cantidad (<unidad>)` y `Precio unitario`, donde `<unidad>` sale del insumo seleccionado (`insumo.unidad`, ej. 'kg', 'L', 'dosis'). Si no hay unidad definida, usá `Cantidad` a secas.
> 3. **Tipos sin cantidad/precio**: cuando el tipo de movimiento sea 'Mano de obra' o 'Otras pérdidas' (revisá el `<select>` actual de tipo), ocultá los inputs de cantidad y precio unitario, y dejá solo Monto y Descripción. (Parte de eso quizás ya está hecho — verificalo y completalo si falta.)
> No toques el endpoint ni la estructura del payload — solo UX del form."

**Definition of Done:**
- En `/agro/bitacora`, seleccionar un insumo, ver cantidad y precio autocompletados. Cambiar cantidad manualmente. Cambiar de categoría → la cantidad que escribiste se mantiene.
- Cambiar el `<select>` del insumo a otro insumo → cantidad y precio se actualizan (porque cambiaste insumo a propósito).
- Seleccionar un insumo de sanidad con unidad "dosis" → el label dice "Cantidad (dosis)".
- Seleccionar tipo "Mano de obra" → solo aparecen los campos Monto + Descripción.

**Commit:**
```bash
git pull origin develop
git add frontend/src/pages/agro/Bitacora.jsx
git commit -m "fix(web): Bitácora respeta entrada del usuario y label dinámico por unidad"
git push origin develop
```

---

## 🔵 JAIRO — 18:00 en adelante (noche, solo backend + cierre)

> **Antes de empezar:** `git checkout develop && git pull origin develop` (te trae todo el frontend ya pulido por Seba y Gerardo).
> Tus tres tareas son endpoints backend que el frontend ya está esperando. Cuando los pushees, las pantallas de Sebastián empiezan a funcionar end-to-end. Después de los tres backends, smoke test + merge.

### 1.5.14 (fix) Backend — endpoint POST /lotes/:id/liquidar 🐄 GANADERÍA

**Lista de comprobación (4 de 4 elementos completados)**
- [ ] Endpoint `POST /lotes/:loteId/liquidar` creado en `controllers/loteController.js` y registrado en su router
- [ ] Recibe `{ cabezas_venta, peso_prom_final, rendimiento_canal, escenario, pvp_kg, gastos_finales }` y calcula `costo_kg_vivo`, `costo_kg_canal`, utilidad, margen
- [ ] Persiste el resultado: agrega columna `liquidacion_jsonb JSONB` a `lotes` con migración. En la **misma transacción** marca `lotes.activo = false`
- [ ] Probado con Postman/Thunder: 200 OK con cuerpo válido + verificar en BD que `activo=false` y los datos quedaron guardados

**Prompt para vibecoding:**
> "En el backend del proyecto (`backend/controllers/loteController.js` y su router asociado, posiblemente `backend/routes/...`), necesito crear el endpoint `POST /lotes/:loteId/liquidar`.
> - **Body esperado:** `{ cabezas_venta: number, peso_prom_final: number, rendimiento_canal: number, escenario: 'pie' | 'gancho', pvp_kg: number, gastos_finales?: number }`.
> - **Cálculos del lado del servidor:** `peso_total_pie = cabezas_venta * peso_prom_final`, `peso_total_gancho = peso_total_pie * rendimiento_canal / 100`, `costo_total = sum(bitacora_lote.monto) + (gastos_finales || 0)`, `costo_kg_vivo = costo_total / peso_total_pie`, `costo_kg_canal = costo_total / peso_total_gancho`, `ingreso = pvp_kg * peso_total_{pie|gancho}` según escenario, `utilidad = ingreso - costo_total`, `margen = utilidad / ingreso * 100`.
> - **Persistencia:** agregá una columna `liquidacion_jsonb JSONB` a la tabla `lotes` (migración nueva) y guardá ahí todo el objeto calculado con timestamp. **En la misma transacción**, hacé `UPDATE lotes SET activo = false, liquidacion_jsonb = $1 WHERE id = $loteId`.
> - **Respuesta:** 200 con el objeto liquidación completo. 400 si faltan campos. 404 si el lote no existe. 409 si el lote ya está liquidado (`activo = false`).
> - Usá `pg` / la librería que ya use el resto del controller. No instales nada nuevo.
> Manejá la transacción con `BEGIN/COMMIT/ROLLBACK` correctamente."

**Definition of Done:**
- Crear un lote de prueba en BD, registrarle bitácora, llamar el endpoint con Postman → respuesta 200 con utilidad calculada correctamente.
- En BD: `SELECT activo, liquidacion_jsonb FROM lotes WHERE id = '<id>'` muestra `activo = false` y el JSONB completo.
- Llamar dos veces el endpoint con el mismo `loteId` → la segunda devuelve 409.
- Si pasás un body sin `cabezas_venta` → 400.
- El frontend que ya subió Sebastián (1.5.8) ahora funciona: liquidación → modal → "Registrar" → redirige a `/agro/lotes`.

**Commit:**
```bash
git pull origin develop
git add backend/controllers/loteController.js backend/routes/ backend/migrations/
git commit -m "feat(api): endpoint POST /lotes/:id/liquidar persiste liquidación"
git push origin develop
```

---

### 1.5.15 (fix) Backend — PUT y DELETE de bitácora con reversión de bajas 🐄 GANADERÍA

**Lista de comprobación (4 de 4 elementos completados)**
- [ ] Endpoint `PUT /bitacora/:id` actualiza una entrada y, si la entrada original era una baja, ajusta `cabezas_activas` del lote correctamente
- [ ] Endpoint `DELETE /bitacora/:id` elimina la entrada y, si era una baja, revierte la baja (suma cabezas al lote)
- [ ] Todo dentro de transacción `BEGIN/COMMIT/ROLLBACK`
- [ ] Probado con Postman: editar un alimento, eliminar una baja → revisar BD que las cabezas vuelvan

**Prompt para vibecoding:**
> "En `backend/controllers/loteController.js` faltan los handlers `updateBitacoraEntry` y `deleteBitacoraEntry`. Agregalos y registralos en el router como:
> - `PUT /bitacora/:id` — actualiza una entrada de `bitacora_lote`.
> - `DELETE /bitacora/:id` — elimina una entrada.
> Lógica especial: si la entrada original tenía `es_baja = true` y `cabezas_baja > 0`, al **borrar** la entrada hay que revertir esa baja: `UPDATE lotes SET cabezas_activas = cabezas_activas + <cabezas_baja>`. Al **actualizar** una entrada que cambia `es_baja` o `cabezas_baja`, hay que calcular la diferencia y ajustar el lote correspondiente.
> Todo dentro de una transacción `BEGIN/COMMIT/ROLLBACK`. Si algo falla, ROLLBACK y devolver 500 con mensaje claro.
> Validá que el `id` exista (404 si no) y que el usuario tenga permiso sobre el lote dueño de esa entrada (mirá cómo lo valida el GET correspondiente)."

**Definition of Done:**
- Crear un lote con 100 cabezas. Registrar una baja de 5 cabezas → BD: `cabezas_activas = 95`.
- `DELETE /bitacora/:id` sobre esa baja → BD: `cabezas_activas = 100` (revertido).
- `PUT /bitacora/:id` cambiando el monto de un alimento → BD: monto actualizado, cabezas sin cambio.
- Errores devuelven códigos correctos (404, 400, 500).

**Commit:**
```bash
git pull origin develop
git add backend/controllers/loteController.js backend/routes/
git commit -m "feat(api): PUT y DELETE de bitácora con reversión de bajas"
git push origin develop
```

---

### 1.5.16 (fix) Backend — desglose de costos por categoria_id 🐄 GANADERÍA

**Lista de comprobación (4 de 4 elementos completados)**
- [ ] Endpoint `GET /lotes/:id/costos-detalle` devuelve `{ alimento, sanidad, mano_obra, otros, total }` agrupado por tipo de categoría (no por string literal)
- [ ] La clasificación se hace por un campo de `categorias_insumos` (ej. `tipo` o `slug`), no por nombre literal. Si ese campo no existe, agregalo con migración y populá valores razonables
- [ ] Devuelve 404 si el lote no existe
- [ ] La pantalla `/agro/lotes` que ya consume el endpoint (Sebastián 1.5.11) muestra los números correctos

**Prompt para vibecoding:**
> "En `backend/controllers/loteController.js` agregá un endpoint `GET /lotes/:loteId/costos-detalle` que devuelva el desglose agrupado por categoría.
> - Hacé un `JOIN` entre `bitacora_lote` y `categorias_insumos` por `categoria_id`.
> - Devolvé un objeto como `{ alimento: 1234.5, sanidad: 200, mano_obra: 500, otros: 100, total: 2034.5 }`.
> - La clasificación de cada categoría como 'alimento'/'sanidad'/'mano_obra'/'otros' debe hacerse por un campo en `categorias_insumos` (ej. `tipo` o `slug`), NO por el nombre literal. Si ese campo no existe en la tabla, agregalo con una migración (`ALTER TABLE categorias_insumos ADD COLUMN tipo TEXT`) y populá los valores razonables con un UPDATE basado en los nombres actuales.
> - Si el lote no existe: 404.
> - Si no hay bitácora cargada: devolver todos los valores en 0 (no error).
> Usá la misma librería de DB que el resto del controller."

**Definition of Done:**
- Postman: `GET /lotes/<id>/costos-detalle` con un lote con bitácora variada → respuesta con los 5 montos correctos.
- Renombrar una categoría en BD (ej. `UPDATE categorias_insumos SET nombre = 'Sanidad veterinaria' WHERE ...`) y volver a llamar el endpoint → **sigue devolviendo el monto correcto** en `sanidad` (porque agrupa por tipo/slug, no por nombre).
- La página `/agro/lotes` (que ya consume el endpoint desde 1.5.11 de Sebastián) ahora muestra el desglose correcto en cada card.

**Commit:**
```bash
git pull origin develop
git add backend/controllers/loteController.js backend/routes/ backend/migrations/
git commit -m "feat(api): endpoint GET /lotes/:id/costos-detalle por tipo de categoría"
git push origin develop
```

---

### 1.5.17 (fix) Smoke test cruzado y merge a staging 🐄 GANADERÍA

**Lista de comprobación (5 de 5 elementos completados)**
- [ ] **Flujo agro completo**: crear lote bovino → bitácora (1 alimento + 1 sanidad + 1 baja) → liquidación con ambos escenarios → cerrar. Sin errores en consola.
- [ ] **Flujo industrial completo**: producto → BOM → calcular ficha → historial → ver detalle. Sin errores en consola.
- [ ] **Cambio de negocio**: agro → industrial → agro, sin que se filtren datos entre ellos.
- [ ] `git grep "Sprint 2"`, `git grep "MOCK_BY_NEGOCIO"`, `git grep "alimentoConsumido = 2970"` devuelven 0 resultados.
- [ ] Merge `develop` → `staging` hecho solo si los 4 puntos anteriores pasaron.

**Prompt para vibecoding:** *(no aplica — es testing manual y merge)*

**Definition of Done:**
- Capturas de pantalla del flujo agro funcionando end-to-end pegadas en el grupo del equipo.
- BD muestra el lote del smoke test con `activo = false` y `liquidacion_jsonb` populado.
- `git log staging..develop` muestra todos los commits del día limpios.
- Después del merge: `git checkout staging && git pull && npm run dev` arranca sin errores.

**Comandos (solo si todo OK):**
```bash
git checkout staging
git pull origin staging
git merge develop --no-ff -m "merge: saneamiento sábado 16/05 desde develop"
git push origin staging
```

> ⚠️ Si algún punto del smoke test falla, **no mergear**. Dejar `develop` como está y resolver el lunes.

---

## 5. Orden de ejecución (horario condensado)

```
08:50–09:00   Jairo: 1.5.1 setup develop (deja la rama lista)
09:00–13:00   Sebastián: 1.5.2 → 1.5.6 (las pesadas: dashboard, limpieza, acordeón, rediseño Liquidación)
13:00–14:00   ALMUERZO Sebastián
14:00–15:00   Sebastián: 1.5.7 → 1.5.11 (las chicas: inputs anti-NaN, llamadas al backend "a ciegas", Historial, App.jsx)
16:00–17:00   Gerardo: 1.5.12 (Liquidación: protección por cero + ICA real)
17:00–18:00   Gerardo: 1.5.13 (Bitácora form polish)
18:00–20:00   Jairo: 1.5.14 (backend liquidar) — esto desbloquea el frontend que dejó Sebastián
20:00–21:00   Jairo: 1.5.15 (PUT/DELETE bitácora)
21:00–22:30   Jairo: 1.5.16 (backend desglose por categoria_id) — desbloquea Lotes.jsx
22:30–00:00   Jairo: 1.5.17 smoke test + merge a staging
```

**Sincronización clave:**
- Sebastián tiene mucha carga (10 buckets). Si a las 14:30 no terminó 1.5.7, puede saltar 1.5.7 (postponer a domingo) y priorizar 1.5.8 → 1.5.11 que son el contrato del backend de Jairo.
- 1.5.8 y 1.5.11 quedan "rotas" en el navegador desde que Sebastián las sube hasta que Jairo termina backend a la noche. Eso es esperado: estamos en `develop`, no en producción.
- Jairo encuentra a las 18:00 todo el frontend ya preparado para sus endpoints. Solo conecta backend y corre smoke test.

---

## 6. Definition of Done global del día

- [ ] Rama `develop` con todos los commits 1.5.1 → 1.5.17 pusheados.
- [ ] Flujo **ganadería** completo funciona sin errores: crear lote → bitácora → liquidación → cerrar (queda persistido en BD).
- [ ] Flujo industrial completo funciona: producto → BOM → calcular → historial → ver detalle.
- [ ] Cambiar de negocio (industrial ⇄ agro) no muestra datos del negocio anterior.
- [ ] No quedan textos "Sprint 2" en pantallas visibles.
- [ ] No quedan botones decorativos (campana, "Registrar liquidación" que no hacía nada).
- [ ] Liquidación queda persistida en BD y el lote queda con `activo=false`.
- [ ] Merge `develop → staging` hecho y validado.

---

## 7. Lo que NO entra hoy (consciente)

- **Tabla `liquidaciones_lote` normalizada** — con `liquidacion_jsonb` en `lotes` alcanza. La tabla histórica es Sprint 3.
- **CIF, Punto de equilibrio, WIP** — siguen como placeholder honesto ("Próximo sprint").
- **React Router refactor** — no entra.
- **Faena / despiece** — fuera de scope.
- **Implementaciones nuevas en ganadería** — explícitamente NO. Hoy solo se deja pulcro. Domingo empezamos a sumar features sobre esta base limpia.
