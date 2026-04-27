# PROMPT CLAUDE DESIGN — CosteoUniversal · Mockup Completo Sprint 1 y 2

Continuamos el mockup de CosteoUniversal. Necesito que implementes los cambios y pantallas que se detallan a continuación sobre lo que ya existe.

---

## CAMBIO GLOBAL: TOGGLE DARK / LIGHT MODE

Agregar un botón de toggle en la topbar (ícono de sol/luna, Lucide `Sun` / `Moon`). Al hacer clic alterna entre el tema oscuro actual y un tema claro. Implementar con una clase `data-theme="light"` en el `<html>` y CSS variables que cambien según el atributo. El estado debe persistir en `localStorage`.

**Tokens del tema claro:**
```css
[data-theme="light"] {
  --bg-primary: #F8FAFC;
  --bg-secondary: #FFFFFF;
  --bg-tertiary: #F1F5F9;
  --border-subtle: #E2E8F0;
  --border-medium: #CBD5E1;
  --text-primary: #0F172A;
  --text-secondary: #475569;
  --text-tertiary: #94A3B8;
  --accent-industrial: #2563EB;
  --accent-agro: #16A34A;
}
```

---

## PANTALLAS A COMPLETAR

### PANTALLA: PRODUCTOS (rubro Industrial)

Ruta: `/app/:negocioId/productos`

**Header:**
```
Productos                                    [+ Nuevo producto]
12 productos · Industria láctea
```

**Lista de productos** — cards en grid 3 columnas (no tabla):

Cada card:
```
┌────────────────────────────────┐
│  Queso fresco 500g    [activo] │
│  SKU: QF-001                   │
│  ─────────────────────────     │
│  Última ficha: hace 2h         │
│  Costo unit.   Bs  38.70       │
│  Precio suger. Bs  50.31       │
│  Margen        30%    ▲        │
│                                │
│  [Ver receta]  [Calcular costo]│
└────────────────────────────────┘
```
- `IBM Plex Mono` para los valores monetarios
- Badge verde si tiene ficha reciente (< 7 días), amber si es antigua, gris si no tiene
- El botón "Calcular costo" es el CTA principal (color del rubro)

**Modal "Nuevo producto"** — drawer lateral derecho:
- Nombre del producto
- Código SKU (opcional)
- Descripción (textarea)
- Unidad de medida del producto terminado (selector)
- Botón "Guardar y agregar receta →"

---

### PANTALLA: RECETA / BOM del producto

Ruta: `/app/:negocioId/productos/:id/receta`

**Dos secciones verticales:**

**Sección 1 — Materias primas (BOM):**
```
RECETA — Materias primas por unidad producida
                                        [+ Agregar insumo]
─────────────────────────────────────────────────────────
Insumo           Cantidad   Unidad   Precio/u    Costo
─────────────────────────────────────────────────────────
Leche entera      5.000      L       Bs  4.80    Bs 24.00   [✏] [🗑]
Cuajo enzimático  0.003      kg      Bs 420.00   Bs  1.26   [✏] [🗑]
─────────────────────────────────────────────────────────
                                   TOTAL MPD     Bs 27.34
```

**Sección 2 — Etapas de producción:**
```
ETAPAS DE PRODUCCIÓN                   [+ Agregar etapa]
─────────────────────────────────────────────────────────
#   Etapa              Tiempo    Costo/h    Costo/unid
─────────────────────────────────────────────────────────
1   Pasteurización     4 min     Bs 18.50   Bs  1.23   [✏] [🗑]
2   Coagulación       12 min     Bs 18.50   Bs  3.70   [✏] [🗑]
─────────────────────────────────────────────────────────
                                 TOTAL MOD  Bs  8.75
```

Drag & drop para reordenar etapas (handle ⠿ al inicio de cada fila).

---

### PANTALLA: PROVEEDORES

Ruta: `/app/:negocioId/proveedores`

**Header:**
```
Proveedores                               [+ Nuevo proveedor]
8 proveedores activos
```

**Lista** — tabla simple:
```
Proveedor                  Contacto              Insumos    Estado
────────────────────────────────────────────────────────────────────
Lácteos del Valle S.R.L.   Juan Pérez · 71234567    4       [activo]
Distribuidora Química       info@quimica.bo          3       [activo]
Envases Plásticos Moderna   comercial@moderna.bo     2       [activo]
```
- Columna "Insumos" muestra cuántos insumos del catálogo tienen ese proveedor asignado (clickable, filtra la lista de insumos)
- Badge verde/gris para activo/inactivo

**Drawer "Nuevo/Editar proveedor":**
- Nombre
- Contacto (nombre de la persona)
- Teléfono
- Email
- Notas
- Lista de insumos asociados (solo lectura, referencial)

---

### PANTALLA: UNIDADES DE MEDIDA

Ruta: `/app/:negocioId/configuracion/unidades`

**Dos secciones en la misma página:**

**Sección 1 — Unidades:**
```
UNIDADES DE MEDIDA                        [+ Nueva unidad]
──────────────────────────────────────────────────────────
Nombre          Símbolo    Tipo        Acciones
──────────────────────────────────────────────────────────
Kilogramo        kg        Peso         [✏] [🗑]
Gramo             g        Peso         [✏] [🗑]
Litro             L        Volumen      [✏] [🗑]
Mililitro        ml        Volumen      [✏] [🗑]
Unidad          unid       Cantidad     [✏] [🗑]
```

**Sección 2 — Equivalencias:**
```
EQUIVALENCIAS Y CONVERSIONES              [+ Nueva equivalencia]
──────────────────────────────────────────────────────────────
De          →   A           Factor       Ejemplo
──────────────────────────────────────────────────────────────
1 kg        =   1000 g      × 1000       [✏] [🗑]
1 L         =   1000 ml     × 1000       [✏] [🗑]
```

---

### PANTALLA: CATEGORÍAS DE INSUMOS

Ruta: `/app/:negocioId/configuracion/categorias`

Lista simple de categorías con chips de colores asignables:
```
CATEGORÍAS DE INSUMOS                    [+ Nueva categoría]
─────────────────────────────────────────────────────────
●  Materia prima principal     34 insumos    [✏] [🗑]
●  Insumos químicos y cultivos  8 insumos    [✏] [🗑]
●  Empaque y presentación       6 insumos    [✏] [🗑]
```
Al crear/editar una categoría, el usuario elige un color de una paleta de 8 opciones (dots de colores).

---

### PANTALLA: HISTORIAL DE FICHAS

Ruta: `/app/:negocioId/historial`

**Header:**
```
Historial de fichas de costo
23 fichas calculadas
```

**Filtros:** Producto (dropdown), Fecha (rango), Lote (input)

**Lista de fichas** — tabla:
```
Fecha          Producto              Lote   Costo unit.   PVP        Margen
────────────────────────────────────────────────────────────────────────────
28 Abr 10:32   Queso fresco 500g     100    Bs  38.70    Bs  50.31    30%    [Ver]
27 Abr 15:18   Yogur natural 250ml   200    Bs  12.40    Bs  16.12    30%    [Ver]
```

Al hacer clic en "Ver" se abre un drawer con la ficha completa en modo lectura (misma UI que la ficha de costo pero sin inputs editables, solo resultados).

---

### PANTALLA: CONFIGURACIÓN

Ruta: `/app/:negocioId/configuracion`

**Layout:** sidebar izquierdo con sub-secciones, contenido a la derecha.

Sub-secciones:
- Datos del negocio (nombre, rubro, moneda)
- Unidades de medida → enlaza a la pantalla de unidades
- Categorías → enlaza a la pantalla de categorías
- Apariencia (aquí va el toggle dark/light de forma más explícita, con preview)
- Mi cuenta (nombre, email, cambiar contraseña) — marcar como "Próximamente" los roles

**Pantalla "Datos del negocio":**
Formulario simple con: nombre, sub-rubro (solo lectura con ícono de candado y tooltip "Para cambiar el rubro creá un nuevo negocio"), moneda (selector BOB/USD/ARS/PEN).

**Sección "Roles de usuario"** — marcar como `[EN DESARROLLO]`:
```
┌─────────────────────────────────────────────────────┐
│  🔒  Roles y permisos           EN DESARROLLO       │
│                                                     │
│  Próximamente podrás invitar operarios y            │
│  asignarles acceso solo a registro de gastos        │
│  y bitácora de alimentación.                        │
└─────────────────────────────────────────────────────┘
```

---

## SECCIÓN NUEVA COMPLETA: RUBRO AGRO-GANADERO (ENGORDE)

Este rubro tiene una lógica de costeo completamente diferente al industrial. No se "fabrica" un producto — se **transforma** un animal desde su peso inicial hasta su peso de venta. El costo se acumula a lo largo del tiempo en una bitácora.

### Concepto central a transmitir en la UI:

> Un **Lote** es un grupo de animales que entran juntos, se alimentan juntos, y se venden juntos. El costo total del lote se divide entre los kg producidos. Las bajas (muertes) no desaparecen del costo — su peso y costo de adquisición se diluyen en los animales que sobreviven.

### Menú lateral cuando el negocio activo es agro-ganadero:

```
Dashboard
─────────────
Lotes activos         ← reemplaza "Productos"
Bitácora              ← nuevo
Liquidación           ← nuevo
─────────────
Insumos (alimentos)
Proveedores
─────────────
Configuración
  Unidades
  Categorías
```

---

### PANTALLA: LOTES ACTIVOS

Ruta: `/app/:negocioId/lotes`

**Header:**
```
Lotes de engorde                          [+ Registrar lote]
3 lotes activos · 247 animales en total
```

**Cards de lotes** — una card por lote, más grande que las de productos:

```
┌────────────────────────────────────────────────────────────┐
│  Lote #L-2024-003              Cerdo · 45 días en engorde  │
│  ────────────────────────────────────────────────────────  │
│                                                            │
│  Animales: 48 activos  (entró con 50, 2 bajas)            │
│  Peso inicial prom.:  8.5 kg/cab    Entrada: 15 Mar 2025   │
│                                                            │
│  COSTO ACUMULADO AL DÍA                                    │
│  Adquisición   Bs  4,800   ████░░░░░░  42%                │
│  Alimento      Bs  5,940   █████░░░░░  52%                │
│  Sanidad       Bs    480   █░░░░░░░░░   4%                │
│  Mano de obra  Bs    240   ░░░░░░░░░░   2%                │
│  ─────────────────────────                                 │
│  Total lote    Bs 11,460                                   │
│  Costo/cabeza  Bs    238.75                                │
│  Conv. aliment.  2.8 kg alimento / 1 kg ganado             │
│                                                            │
│  [Ver bitácora]    [Registrar gasto]    [Liquidar lote]    │
└────────────────────────────────────────────────────────────┘
```

- La conversión alimenticia (`kg alimento ÷ kg ganancia de peso`) es la métrica clave — mostrarla prominente
- Barra de progreso horizontal para cada categoría de costo

**Modal "Registrar nuevo lote":**
```
Registrar lote de engorde
─────────────────────────
Tipo de animal:  [Cerdo ▾]   (Cerdo / Bovino / Ovino / Otro)
Identificador:   [ L-2024-004        ]
Fecha de entrada: [ 28/04/2025       ]

ANIMALES DE ENTRADA
Cantidad:         [ 50    ] cabezas
Peso promedio:    [  8.5  ] kg/cabeza   Peso total: 425 kg
Costo adquisición: [ 96.00 ] Bs/cabeza  Total: Bs 4,800

(Nota: el costo de adquisición incluye el animal y el flete de compra)

                                [Cancelar]  [Registrar lote →]
```

---

### PANTALLA: BITÁCORA DE UN LOTE

Ruta: `/app/:negocioId/lotes/:loteId/bitacora`

**Header del lote (sticky):**
```
← Lotes        Lote #L-2024-003 · Cerdo · 48 animales activos
               45 días en engorde · Costo acumulado: Bs 11,460
```

**Dos paneles lado a lado:**

**Panel izquierdo — Registrar entrada (formulario persistente):**
```
REGISTRAR GASTO / EVENTO
─────────────────────────
Tipo:  [Alimentación ▾]
       Alimentación
       Sanidad / Medicamento
       Mano de obra
       Baja (muerte/pérdida)
       Otro gasto

── Si tipo = Alimentación ──
Alimento:     [Balanceado iniciador ▾]
Sacos:        [ 10    ] sacos de 40kg
Costo/saco:   [ 85.00 ] Bs
Total:        Bs 850.00 (calculado)

── Si tipo = Baja ──
Cantidad de bajas:  [ 1  ] cabeza(s)
Peso estimado:      [ 9.2 ] kg
Causa (opcional):   [ Enfermedad respiratoria ]
⚠️  El costo de esta(s) baja(s) se redistribuirá
   entre los animales sobrevivientes del lote.

Fecha: [ hoy ▾ ]
Notas: [                    ]

               [Registrar →]
```

**Panel derecho — Historial de registros:**
```
BITÁCORA DEL LOTE
──────────────────────────────────────────────────────
Fecha      Tipo           Detalle                Monto
──────────────────────────────────────────────────────
28 Abr     Alimentación   10 sacos balanceado  Bs 850
25 Abr     Sanidad        Vacuna Newcastle ×50 Bs 240
22 Abr     Baja           1 cabeza · Enf. resp.  —
                          [costo redistribuido]
20 Abr     Alimentación   12 sacos balanceado  Bs 1,020
15 Mar     ENTRADA        50 cabezas · 8.5kg   Bs 4,800
──────────────────────────────────────────────────────
```

La fila de "Baja" tiene un ícono distinto (triángulo amber) y no muestra monto porque el costo ya fue redistribuido automáticamente.

---

### PANTALLA: LIQUIDACIÓN DEL LOTE (la más importante en agro)

Ruta: `/app/:negocioId/lotes/:loteId/liquidacion`

Esta pantalla es el equivalente a la "Ficha de costo" del industrial. El dueño ingresa el peso final y ve su utilidad en dos modalidades.

**Header:**
```
Calculadora de liquidación — Lote #L-2024-003
Cerdo · 48 animales · 45 días de engorde
```

**Panel de entrada (inputs):**
```
DATOS FINALES DEL LOTE
──────────────────────────────────────────────────────
Animales vivos para venta:    [ 48  ] cabezas
Peso promedio final:          [ 95  ] kg/cabeza
Peso total en pie:            4,560 kg  (calculado)

Gastos de venta:
  Transporte al matadero:     [ 350 ] Bs
  Comisión intermediario:     [   0 ] Bs
  Gastos de faena (si aplica):[ 480 ] Bs  (solo si vende gancho)
  Otros:                      [   0 ] Bs

Rendimiento canal:            [ 75  ] %  (estándar cerdo: 72-78%)
  → Peso gancho estimado:     3,420 kg  (calculado)
```

**Resultado — DOS columnas comparativas:**

```
─────────────────────────────────────────────────────────────────
                    VENTA EN PIE (VIVO)    VENTA GANCHO (FAENADO)
─────────────────────────────────────────────────────────────────
Precio mercado/kg:    [ 22.00 ] Bs/kg       [ 32.00 ] Bs/kg
                      (editable)            (editable)

Ingreso bruto:         Bs 100,320            Bs 109,440
Costo total lote:      Bs  11,460            Bs  11,460
Gastos de venta:       Bs     350            Bs     830
                                             (incluye faena)
─────────────────────────────────────────────────────────────────
UTILIDAD NETA:         Bs  88,510  ✓         Bs  97,150  ✓✓
Utilidad/cabeza:       Bs   1,844            Bs   2,024
Utilidad/kg:           Bs   19.41            Bs   21.28
Margen sobre costo:       772%                  848%
─────────────────────────────────────────────────────────────────
Costo total/kg vivo:   Bs    2.51
Costo total/kg gancho: Bs    3.35
─────────────────────────────────────────────────────────────────

CONVERSIÓN ALIMENTICIA DEL LOTE
  Alimento consumido total:    kg de alimento registrados
  Ganancia de peso total:      (peso final - peso inicial) × cabezas
  Índice conversión:           X kg alimento / 1 kg ganado
  (Referencia: cerdo eficiente = 2.5-3.0 · bovino = 6.0-8.0)
```

La columna "gancho" tiene un badge "Recomendado" si genera más utilidad.
Los inputs de precio de mercado tienen un pequeño ícono de info con tooltip "Precio de referencia del mercado local. Actualizalo antes de calcular."

**Botón de acción principal:**
`[Registrar liquidación y cerrar lote]` — cierra el lote y lo mueve al historial.

---

### ADAPTACIONES EN OTRAS PANTALLAS PARA AGRO-GANADERO

**Insumos (cuando rubro = agro_ganadero):**
- Renombrar columna "Insumo" → "Alimento / Insumo"
- Agregar columna "Tipo": `[Alimento ▾]` con opciones: Alimento balanceado, Forraje/Heno, Suplemento mineral, Medicamento/Vacuna, Otro
- Los alimentos tienen un campo extra: "Peso por unidad de compra" (ej: saco de 40kg) — esto permite que en la bitácora el operario ingrese "sacos" y el sistema calcule kg automáticamente

**Dashboard (cuando rubro = agro_ganadero):**
Métricas distintas:
```
┌──────────────┐ ┌──────────────┐ ┌──────────────┐ ┌──────────────┐
│ Lotes activos│ │ Animales     │ │ Costo total  │ │ Mejor ICa    │
│              │ │ en engorde   │ │ acumulado    │ │ del período  │
│      3       │ │    247       │ │ Bs 34,200    │ │  2.8 kg/kg   │
└──────────────┘ └──────────────┘ └──────────────┘ └──────────────┘
```
ICa = Índice de Conversión alimenticia. Es el KPI más importante para un ganadero.

---

## PANTALLAS "EN DESARROLLO" (mostrar placeholder, no funcionales)

Las siguientes pantallas existen en el menú pero muestran un estado vacío con mensaje:

**Gastos CIF** (industrial):
```
┌─────────────────────────────────────────────────────────────────┐
│                                                                 │
│   [ícono construcción]                                          │
│   Esta sección estará disponible en el Sprint 3                 │
│                                                                 │
│   Aquí podrás registrar tus costos indirectos mensuales         │
│   (electricidad, alquiler, mantenimiento) para que el           │
│   sistema los prorratee automáticamente en cada ficha.          │
│                                                                 │
│   Por ahora, en la ficha de costo podés usar el                 │
│   método simplificado de % sobre MPD+MOD.                       │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

**Gastos adicionales del lote** (agro — para el CIF equivalente):
Mismo placeholder pero dice "Aquí podrás registrar gastos fijos del campo (alquiler de pasturas, agua, amortización de instalaciones) que se prorratearán entre los lotes activos."

---

## REGLAS DE DISEÑO QUE DEBEN MANTENERSE

- `IBM Plex Sans` para todo el texto de interfaz
- `IBM Plex Mono` **siempre** para valores monetarios, pesos, porcentajes y cualquier número calculado
- Sidebar con franja vertical del color del rubro: `#2563EB` industrial · `#16A34A` agro-ganadero
- Cuando hay múltiples negocios, el selector de negocio activo en la topbar muestra un dot del color del rubro
- El toggle dark/light debe estar en la topbar, ícono Lucide `Sun`/`Moon`, sin label
- Borrado lógico: los elementos archivados/inactivos muestran badge gris "Archivado" y aparecen al final de las listas, nunca desaparecen del UI
- Todos los montos en Bs (o la moneda configurada del negocio) — el símbolo de moneda siempre antes del número
- Las bajas en la bitácora ganadera siempre en color amber (advertencia), nunca rojo — no son errores, son eventos esperados del proceso

---

## DATOS MOCK PARA LAS PANTALLAS NUEVAS

Usar estos datos hardcodeados para el mockup agro-ganadero:

**Negocio:** "Granja Los Pinos · Ganadero"
**Lote activo de ejemplo:**
- ID: L-2025-003, tipo: Cerdo
- Entrada: 15 Mar 2025, 50 cabezas, 8.5 kg/cab, Bs 96/cab
- Bajas: 2 (quedan 48 activos)
- Días en engorde: 45
- Peso actual estimado: 75 kg/cab (proyección lineal desde peso inicial)
- Bitácora: 6 registros de alimentación, 1 sanidad, 2 bajas
- Costo acumulado: Bs 11,460 (adquisición + alimento + sanidad + MO)
- Conversión alimenticia actual: 2.8 kg alimento / 1 kg ganado

**Alimentos registrados:**
- Balanceado iniciador (saco 40kg): Bs 85/saco
- Balanceado crecimiento (saco 40kg): Bs 78/saco
- Suplemento mineral (bolsa 25kg): Bs 145/bolsa

Asegurarse de que todos los cálculos en el mockup sean coherentes entre sí (el costo acumulado = suma de todos los registros de la bitácora).
