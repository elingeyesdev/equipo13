# PROMPT PARA CLAUDE DESIGN — Sistema de Costeo Estándar Universal Productivo

---

## CONTEXTO DEL PROYECTO

Diseñar la interfaz de usuario para **"CosteoUniversal"**, un sistema web de costeo estándar productivo orientado a pequeñas y medianas empresas en Bolivia y Latinoamérica. Los usuarios son dueños de fábricas, talleres, fincas ganaderas y emprendimientos productivos — personas que entienden su negocio pero no son contadores ni tecnólogos.

**El sistema tiene dos grandes rubros** que deben sentirse como productos distintos dentro de la misma app:
- **Industrial** — fábricas, talleres, manufactura (textil, alimentaria, metalmecánica, plásticos)
- **Agro-ganadero** — fincas de engorde, lecherías, producción animal

**Stack:**
- React 19 + Vite
- Tailwind CSS (si no está, instalarlo)
- Recharts para gráficos

---

## IDENTIDAD VISUAL

**Nombre del producto:** CosteoUniversal

**Dirección estética:** Industrial-refinada. No un SaaS genérico azul/blanco. Pensar en la estética de las herramientas de manufactura: precisión, densidad de información, seriedad. Algo entre Linear (limpieza extrema) y las interfaces de ERP industriales modernas. Oscura por defecto con modo claro opcional.

**Paleta de colores:**

Para el tema oscuro (por defecto):
- Background primario: `#0F1117` (casi negro, tinte azul muy sutil)
- Background secundario (cards): `#161B27`
- Background terciario (inputs, hovers): `#1E2535`
- Borde sutil: `#2A3347`
- Borde medio: `#384258`
- Texto primario: `#E8ECF4`
- Texto secundario: `#8B95A8`
- Texto terciario: `#525E73`
- Acento industrial (azul-acero): `#3B82F6` para rubro industrial
- Acento agro (verde-tierra): `#22C55E` para rubro agro-ganadero
- Acento advertencia: `#F59E0B`
- Acento peligro: `#EF4444`
- Acento éxito: `#10B981`

Para el tema claro (opcional):
- Background: `#F8FAFC`
- Cards: `#FFFFFF`
- Texto: `#0F172A`

**Tipografía:**
- Display/headings: `IBM Plex Sans` — weight 400 y 500 (no bold extremo, seriedad industrial)
- Monoespaciada para números y cálculos: `IBM Plex Mono` — los números de costo SIEMPRE en mono
- Ambas disponibles en Google Fonts

**Iconografía:**
- Lucide React — stroke width 1.5px, nunca filled

---

## COMPONENTES A DISEÑAR (en orden de prioridad)

---

### 1. ONBOARDING WIZARD (máxima prioridad)

Es el primer contacto del usuario con el producto. Debe transmitir seriedad y claridad.

**Layout general:**
- Pantalla dividida: lado izquierdo 40% con imagen/ilustración contextual + tagline, lado derecho 60% con el formulario del paso actual
- En mobile: solo el formulario, la imagen desaparece
- Barra de progreso de pasos en la parte superior del panel derecho (dots o línea con números)
- El fondo del panel izquierdo cambia según el rubro seleccionado: azul oscuro para industrial, verde oscuro para agro-ganadero

**Paso 1 — Selección de rubro:**

Dos tarjetas grandes (full-width en el panel, lado a lado) que el usuario puede clickear:

```
┌─────────────────────────┐  ┌─────────────────────────┐
│                         │  │                         │
│   [ícono fábrica]       │  │   [ícono animal/campo]  │
│   Industrial            │  │   Agro-ganadero         │
│                         │  │                         │
│   Fábricas, talleres,   │  │   Fincas, ganadería,    │
│   manufactura           │  │   producción animal     │
│                         │  │                         │
└─────────────────────────┘  └─────────────────────────┘
         ┌──────────────────────────┐
         │  Ambos rubros            │
         └──────────────────────────┘
```

Al seleccionar, la tarjeta elegida se resalta con el color del rubro (borde azul o verde, fondo sutil).

**Paso 2 — Datos del negocio:**
- Input de nombre con label claro
- Selector de sub-rubro como chips/pills seleccionables (no dropdown)
- Diseño limpio, mucho espacio en blanco, sin ruido visual

**Paso 3 — Selección de plantilla:**
Grid de tarjetas 2x2 (o 2x3). Cada tarjeta:
```
┌──────────────────────────────┐
│  [badge de rubro]            │
│                              │
│  Industria láctea            │
│  ─────────────────           │
│  Queso fresco, yogur,        │
│  mantequilla                 │
│                              │
│  Incluye:                    │
│  • 9 insumos de ejemplo      │
│  • 2 productos con receta    │
│  • 7 etapas de producción    │
│  • Fichas de costo listas    │
└──────────────────────────────┘
```
La tarjeta seleccionada tiene borde del color del rubro y checkmark.

**Paso 4 — Loading y confirmación:**
Lista de checks animados que aparecen secuencialmente mientras se cargan los datos. Cuando termina, animación suave de "check final" y botón para entrar al dashboard.

---

### 2. LAYOUT PRINCIPAL (shell de la aplicación)

**Sidebar izquierdo** (colapsable, 240px expandido / 60px colapsado):

```
┌────────────────────┐
│  CU  CosteoUniv.  │  ← logo + nombre
├────────────────────┤
│  [selector negocio]│  ← dropdown si hay múltiples negocios
│  "Lácteos del Valle│
│   Industrial  ●   │  ← badge de rubro con color
├────────────────────┤
│  Dashboard         │
│  Productos         │
│  Insumos           │
│  Proveedores       │
│  Gastos CIF        │
│  Historial fichas  │
├────────────────────┤
│  Configuración     │
│  Unidades          │
│  Categorías        │
└────────────────────┘
```

El sidebar tiene una línea vertical del color del rubro activo (azul si industrial, verde si agro).

**Topbar** (64px):
- Breadcrumb de navegación actual
- Selector rápido de negocio si hay más de uno (dropdown compacto)
- Avatar del usuario + menú

**Área de contenido:** padding 24px, máximo 1200px de ancho centrado.

---

### 3. DASHBOARD PRINCIPAL

Layout con cards de resumen arriba y lista de productos con fichas abajo.

**Row de métricas (4 cards):**
```
┌──────────────┐ ┌──────────────┐ ┌──────────────┐ ┌──────────────┐
│ Productos    │ │ Insumos      │ │ Última ficha │ │ P. Equilibrio│
│              │ │              │ │ calculada    │ │              │
│     12       │ │     34       │ │  hace 2h     │ │  197 unid/mes│
└──────────────┘ └──────────────┘ └──────────────┘ └──────────────┘
```

**Lista de productos con última ficha:**
Tabla o lista de cards con: nombre del producto, costo unitario (en mono), precio sugerido (en mono, verde), margen %, última actualización, botón "Ver ficha".

**Banner si no hay fichas:**
Card con ilustración simple (línea de producción estilizada) y CTA "Calculá tu primer costo →"

---

### 4. PANTALLA DE FICHA DE COSTO (la más importante)

Esta pantalla es donde ocurre la magia del sistema. Necesita transmitir precisión y confianza.

**Header de la pantalla:**
```
Queso fresco 500g                        [Guardar ficha]
Industria láctea · Lote de 100 unidades
```

**Controles de lote y margen (top de la pantalla, siempre visibles):**
Row horizontal con:
- "Tamaño del lote" + input numérico (no slider, el usuario quiere precisión) + slider opcional al lado
- "Margen de utilidad" + input % + slider
- "Costos fijos mensuales" + input numérico en Bs
Estos tres controles disparan recálculo inmediato (debounce 300ms).

**Sección MPD — Materia Prima Directa:**

Tabla de datos densa pero legible:
```
MATERIA PRIMA DIRECTA                               variable
──────────────────────────────────────────────────────────────────────
Insumo               Cant.   Unidad   Precio/u      /unidad      /lote
──────────────────────────────────────────────────────────────────────
Leche entera          5.000    L       Bs 4.80      Bs  24.00   Bs 2,400.00
Cuajo enzimático      0.003    kg      Bs 420.00    Bs   1.26   Bs   126.00
Sal refinada          0.015    kg      Bs 8.50      Bs   0.13   Bs    12.75
...
──────────────────────────────────────────────────────────────────────
                                        TOTAL MPD   Bs  27.34   Bs 2,734.00
```

Usar `IBM Plex Mono` para todas las columnas numéricas. Alinear decimales. Fondo ligeramente diferente en la fila de total.

**Sección MOD — Mano de Obra Directa:**

```
MANO DE OBRA DIRECTA                                variable
──────────────────────────────────────────────────────────────────────
Etapa                  Tiempo    Costo/h          /unidad      /lote
──────────────────────────────────────────────────────────────────────
Pasteurización         4 min     Bs 18.50        Bs   1.23   Bs   123.33
Coagulación           12 min     Bs 18.50        Bs   3.70   Bs   370.00
...
──────────────────────────────────────────────────────────────────────
                                        TOTAL MOD   Bs   8.75   Bs   875.00
```

**Sección CIF:**

Toggle entre dos modos (pills/tabs):
- "% sobre MPD+MOD" (modo simple)  
- "Prorrateo de gastos" (modo avanzado)

En modo simple: slider grande + campo numérico mostrando el % y el resultado calculado.
En modo avanzado: tabla de gastos CIF del negocio con columna "monto prorrateado a este lote".

**Cards de resultado (4 métricas grandes):**

```
┌──────────────────────┐ ┌──────────────────────┐
│ Costo unitario       │ │ Precio sugerido       │
│                      │ │                       │
│  Bs 38.70            │ │  Bs 50.31             │
│  MPD + MOD + CIF     │ │  con 30% de margen    │
└──────────────────────┘ └──────────────────────┘
┌──────────────────────┐ ┌──────────────────────┐
│ Utilidad / unidad    │ │ Utilidad del lote     │
│                      │ │                       │
│  Bs 11.61            │ │  Bs 1,161.00          │
│  ▲ 30% del costo     │ │  100 unidades         │
└──────────────────────┘ └──────────────────────┘
```
Los valores en `IBM Plex Mono` tamaño 28px, verde para utilidad.

**Punto de Equilibrio:**

Box destacado con fondo ligeramente diferente:
```
┌─────────────────────────────────────────────────────────────┐
│  Punto de equilibrio                                        │
│                                                             │
│  Costos fijos / (PVP − CV unitario)                         │
│  Bs 3,000 ÷ Bs 15.21  =  197 unidades / mes                │
│                                                             │
│  Necesitás vender 197 unidades por mes para cubrir          │
│  todos tus costos fijos.                                    │
└─────────────────────────────────────────────────────────────┘
```

**Barras WIP (Work In Process):**

Barras horizontales apiladas, una por etapa. Cada barra muestra el costo acumulado hasta ese punto. Las barras crecen a la derecha, con el color del rubro (azul para industrial). La última barra llega al 100%.

```
Inicio (materiales)   ████████░░░░░░░░░░░░  Bs 2,734
Pasteurización        █████████░░░░░░░░░░░  Bs 2,857
Coagulación           ███████████░░░░░░░░░  Bs 3,227
Desuerado             █████████████░░░░░░░  Bs 3,520
Empaque               ██████████████░░░░░░  Bs 3,650
CIF prorrateado        ████████████████████  Bs 4,460
```

---

### 5. PANTALLA DE GESTIÓN DE INSUMOS

Tabla densa con buscador y filtros. Diseño que permita ver muchos datos sin agobiar.

Header con: título "Insumos" + badge de cantidad total + botón "Nuevo insumo" + botón "Importar CSV".

Filtros en fila horizontal debajo del header: Categoría (chips), Tipo (todos/variable/fijo), Proveedor (dropdown).

Tabla con columnas:
- Nombre + código SKU en línea pequeña abajo
- Categoría (badge de color)
- Unidad
- Precio/unidad (mono, resaltado)
- Proveedor
- Variable/Fijo (badge)
- Acciones (editar, archivar)

Modal de "Nuevo / Editar insumo":
- Drawer lateral (slide desde la derecha), no popup centrado
- Formulario vertical con los campos del insumo
- Preview del impacto: "Este insumo está en X recetas"

---

### 6. COMPONENTES REUTILIZABLES A CREAR

Crear estos componentes en `/src/components/ui/`:

**`MoneyDisplay`:** Muestra un valor monetario siempre en `IBM Plex Mono`, con símbolo de moneda, separadores de miles, 2 decimales. Props: `value`, `currency="BOB"`, `size="md"`, `color="default|green|red"`.

**`RubroBadge`:** Badge pequeño con color del rubro. Props: `rubro="industrial|agro_ganadero"`. Industrial → azul, agro → verde.

**`CostTable`:** Tabla de costeo reutilizable para MPD, MOD y CIF. Props: `rows`, `columns`, `subtotalRow`.

**`NegocioSelector`:** Dropdown en la topbar para cambiar el negocio activo. Muestra nombre, rubro con badge.

**`WIPBars`:** Componente de barras horizontales de WIP. Props: `stages` (array de {nombre, costo_acumulado, costo_total}).

**`PuntoEquilibrioCard`:** Card del punto de equilibrio con fórmula visible.

---

## ENTREGABLES ESPERADOS DE CLAUDE DESIGN

1. Todos los componentes listados en `/src/components/ui/` como archivos `.jsx` individuales
2. Sistema de temas en `/src/styles/theme.js` o variables CSS con los tokens de diseño definidos
3. Layout principal (sidebar + topbar + area de contenido) en `/src/layouts/AppLayout.jsx`
4. Pantalla de onboarding completa en `/src/pages/Onboarding.jsx`
5. Dashboard en `/src/pages/Dashboard.jsx`
6. Ficha de costo en `/src/pages/FichaCosto.jsx` (sin lógica de backend, solo UI con datos mockeados)
7. Pantalla de insumos en `/src/pages/Insumos.jsx` (con datos mockeados)

Los componentes deben funcionar con datos mockeados hardcodeados — no conectar con el backend todavía. Eso lo hace el equipo de desarrollo después. El foco es que cada pantalla se vea exactamente como debería verse con datos reales.

---

## NOTAS DE TONO

- **No usar gradientes morados sobre fondo blanco** — es el cliché del SaaS genérico
- **No usar Inter o Roboto** — usar IBM Plex Sans como se especificó
- **Los números siempre en IBM Plex Mono** — es la diferencia entre verse como una calculadora de Excel y un sistema profesional
- **Densidad de información media-alta** — el usuario es un empresario que quiere ver datos, no un consumidor que necesita que se le explique todo con ilustraciones
- **El color del rubro es el único acento** — no agregar colores decorativos. Azul es industrial, verde es agro, amber es alerta, rojo es error, verde claro es éxito/positivo
