# Plan de Implementación — Hoja de Vida del Lote
## CosteoUniversal · Módulo Agro-ganadero

> Contexto: Este módulo se construye sobre el sistema de inventario FIFO ya implementado.
> La bitácora existente convive con este módulo — no se reemplaza, se complementa.

---

## Concepto central

La **Hoja de Vida** es el historial organizado de un lote, dividido por meses, donde cada día tiene:
- **Lo esperado** (estándar precargado según especie y fase del animal)
- **Lo registrado** (lo que en realidad pasó)
- **Estado de confirmación** (confirmado = descuenta del inventario)

La bitácora actual sigue existiendo como registro rápido de eventos. La Hoja de Vida es la vista estructurada, organizada y con referencia estándar de todo el ciclo de vida del lote.

---

## Estándares precargados por especie y fase

Estos valores van hardcodeados en el backend como constantes. Son promedios de referencia basados en literatura técnica veterinaria.

### CERDO (Sus scrofa domesticus)

**Determinación de fase por edad del lote al día actual:**

```
Iniciación:   0  – 63  días de vida (0 –  9 semanas) | Peso aprox:  8 – 25 kg
Crecimiento:  64 – 119 días de vida (9  – 17 semanas) | Peso aprox: 25 – 50 kg
Desarrollo:  120 – 161 días de vida (17 – 23 semanas) | Peso aprox: 50 – 80 kg
Engorde:     162 – 210 días de vida (23 – 30 semanas) | Peso aprox: 80 – 110 kg
```

**Estándar por fase:**

| Fase | Alimento/cab/día | Frecuencia | Agua/cab/día |
|------|-----------------|------------|-------------|
| Iniciación | 0.3 – 0.6 kg balanceado iniciador | 3 veces/día | 1 – 2 L |
| Crecimiento | 1.2 – 1.8 kg balanceado crecimiento | 2 veces/día | 2 – 4 L |
| Desarrollo | 1.8 – 2.5 kg balanceado desarrollo | 2 veces/día | 4 – 6 L |
| Engorde | 2.5 – 3.0 kg balanceado engorde | 2 veces/día | 6 – 8 L |

**Calendario sanitario estándar cerdo (por día de vida):**

```
Día 1–7    (llegada): Vitaminas A+D+E inyectable, electrolitos en agua
Día 7:     Desparasitación interna (ivermectina o similar)
Día 14:    Vacuna Mycoplasma hyopneumoniae (dosis 1)
Día 28:    Vacuna Mycoplasma (dosis 2 refuerzo)
Día 45–60: Vacuna Peste Porcina Clásica
Día 60:    Desparasitación externa (contra sarna y piojo)
Día 90:    Control general + pesaje + ajuste de ración
Día 120:   Desparasitación interna (2da dosis)
Día 120:   Desparasitación externa (2da dosis)
Día 150:   Pesaje + evaluación de conversión alimenticia
```

**Servicios estándar cerdo:**

```
Diario:    Revisión visual de animales (comportamiento, apetito, signos de enfermedad)
Cada 3 días: Limpieza de comederos y bebederos
Semanal:   Limpieza general del corral (remoción de estiércol)
Quincenal: Desinfección del corral (cal o desinfectante)
Mensual:   Pesaje de muestra representativa (mínimo 10% del lote)
```

**Conversión alimenticia referencia:** 2.5 – 3.0 kg alimento / 1 kg ganado (cerdo eficiente)

---

### BOVINO DE ENGORDE (Bos taurus / Bos indicus)

**Determinación de fase por edad y peso promedio al ingreso:**

```
Recepción/Adaptación: Días 1–8    | Consumo: 4–5 kg/cab/día (solo fibra)
Transición:           Días 9–16   | Consumo: 6–9 kg/cab/día (50% fibra + 50% concentrado)
Crecimiento:          Días 17–45  | Consumo: 8–10 kg/cab/día (30% fibra + 70% concentrado)
Engorde/Finalización: Días 46–90  | Consumo: 10–12 kg/cab/día (15% fibra + 85% concentrado)
```

**Estándar por fase bovino:**

| Fase | Heno/paca (kg/cab/día) | Concentrado (kg/cab/día) | Total |
|------|----------------------|------------------------|-------|
| Recepción | 4.0 – 5.0 | 0 | 4–5 kg |
| Transición | 3.0 – 4.5 | 3.0 – 4.5 | 6–9 kg |
| Crecimiento | 2.5 – 3.0 | 5.5 – 7.0 | 8–10 kg |
| Engorde | 1.5 – 1.8 | 8.5 – 10.2 | 10–12 kg |

**Ganancia de peso esperada:** mínimo 1.8 kg/animal/día en engorde.
**Conversión alimenticia referencia:** 6.0 – 6.5 kg alimento / 1 kg ganado.

**Calendario sanitario estándar bovino:**

```
Llegada (día 1):  Vitamina ADE inyectable, antiparasitario externo e interno
Día 1:            Vacuna Triple Bovina (Carbunco, Edema, Septicemia) si no está aplicada
Día 7:            Desparasitación interna (si no se hizo al llegar)
Día 14:           Control general, revisión de pezuñas
Día 30:           Pesaje + evaluación ganancia de peso
Día 45:           Desparasitación interna (2da dosis según protocolo)
Día 60:           Pesaje + ajuste de ración según respuesta
Día 60:           Vacuna de refuerzo si aplica
Día 90:           Pesaje final + evaluación de liquidación
```

**Servicios estándar bovino:**

```
Diario:    Suministro de agua fresca (verificar bebederos)
Diario:    Revisión visual del lote
Cada 2 días: Limpieza de comederos
Semanal:   Limpieza general del corral o potrero
Quincenal: Revisión y tratamiento de pezuñas si es necesario
Mensual:   Pesaje + control sanitario general
```

---

## Lógica de fases automáticas

El sistema calcula la fase actual del animal en tiempo real usando:

```
edad_actual_dias = edad_al_ingreso_dias + dias_desde_ingreso_al_lote
fase_actual = determinarFase(especie, edad_actual_dias)
```

Para bovinos, la fase también considera el peso promedio de ingreso. Si el lote ingresó con peso < 200 kg, empieza en Recepción. Si ingresó con 300+ kg, puede empezar en Transición directamente.

Esto se guarda como función pura en `services/estandaresAnimales.js`.

---

## Cambio en la creación de lotes

Agregar el campo **`edad_promedio_dias`** al formulario de registro de lote. Es el único campo nuevo requerido para que funcione el sistema de fases. En el modal actual de "Registrar lote" agregar:

```
Edad promedio al ingreso:  [___] días
                           (Ej: lechones de 28 días = 28)
```

Con este dato + `fecha_entrada` el sistema puede calcular la edad en cualquier día futuro y determinar la fase correspondiente.

---

## Modelo de datos nuevo

### Nuevas tablas

**`registro_diario_lote`** — el registro real de cada día:
```sql
CREATE TABLE registro_diario_lote (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  negocio_id      UUID NOT NULL REFERENCES negocios(id) ON DELETE CASCADE,
  lote_id         UUID NOT NULL REFERENCES lotes(id) ON DELETE CASCADE,
  fecha           DATE NOT NULL,
  confirmado      BOOLEAN NOT NULL DEFAULT FALSE,
  confirmado_en   TIMESTAMP,
  notas_del_dia   TEXT,
  created_at      TIMESTAMP DEFAULT NOW(),
  UNIQUE(lote_id, fecha)  -- un solo registro por día por lote
);
```

**`registro_diario_item`** — cada ítem dentro del día (insumo o servicio):
```sql
CREATE TABLE registro_diario_item (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  registro_diario_id  UUID NOT NULL REFERENCES registro_diario_lote(id) ON DELETE CASCADE,
  tipo                VARCHAR(20) NOT NULL CHECK (tipo IN ('insumo', 'servicio')),

  -- Si tipo = 'insumo'
  insumo_id           UUID REFERENCES insumos(id),
  cantidad            DECIMAL(18,4),
  unidad_id           UUID REFERENCES unidades_medida(id),
  -- El costo se llena al confirmar (viene del FIFO)
  costo_real          DECIMAL(18,4),
  detalle_fifo        JSONB,           -- igual que consumos_lote

  -- Si tipo = 'servicio'
  servicio_id         UUID REFERENCES catalogo_servicios(id),   -- nullable hasta que exista el catálogo
  servicio_nombre     VARCHAR(255),    -- nombre libre por ahora
  costo_servicio      DECIMAL(18,4),

  created_at          TIMESTAMP DEFAULT NOW()
);
```

**`catalogo_servicios`** — el futuro catálogo (crear ya con campo nullable para migración):
```sql
CREATE TABLE catalogo_servicios (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  negocio_id  UUID NOT NULL REFERENCES negocios(id) ON DELETE CASCADE,
  nombre      VARCHAR(255) NOT NULL,
  descripcion TEXT,
  costo_base  DECIMAL(18,4),   -- costo referencial, puede editarse al registrar
  activo      BOOLEAN DEFAULT TRUE,
  created_at  TIMESTAMP DEFAULT NOW()
);
```

### Modificación a tabla lotes existente:
```sql
ALTER TABLE lotes ADD COLUMN IF NOT EXISTS edad_promedio_dias INT DEFAULT 0;
```

---

## Endpoints nuevos

```
-- Hoja de vida: vista mensual
GET  /:negocioId/lotes/:loteId/hoja-de-vida
     Query: ?anio=2025&mes=5
     Devuelve: { lote, fase_actual, estandar_del_mes, dias: [{fecha, confirmado, items, estandar_dia}] }

-- Detalle de un día específico
GET  /:negocioId/lotes/:loteId/hoja-de-vida/:fecha
     Devuelve: { registro (o null si no hay), estandar_dia, lote, fase_actual }

-- Guardar/actualizar registro del día (antes de confirmar)
POST /:negocioId/lotes/:loteId/hoja-de-vida/:fecha
     Body: { notas_del_dia, items: [{tipo, insumo_id, cantidad, unidad_id, servicio_nombre, costo_servicio}] }
     Crea o reemplaza el registro_diario_lote y sus items. NO descuenta inventario.

-- Confirmar el día (descuenta inventario)
POST /:negocioId/lotes/:loteId/hoja-de-vida/:fecha/confirmar
     Transacción:
       1. Para cada item tipo 'insumo': ejecutar FIFO (igual que /consumir)
       2. Guardar costo_real y detalle_fifo en cada registro_diario_item
       3. Marcar registro_diario_lote.confirmado = true
       4. Devolver el registro confirmado con costos reales

-- Estándar del día (endpoint auxiliar para preview)
GET  /:negocioId/lotes/:loteId/estandar?fecha=YYYY-MM-DD
     Devuelve el estándar calculado para esa fecha según edad y especie del lote
```

---

## TAREA 1 — Migración de base de datos
**Archivo:** `backend/migrations/009_hoja_vida_lote.sql`
**Asignado:** Gerardo
**Tiempo:** 1h
**Depende de:** migración 008 (inventario FIFO) ya ejecutada

**Prompt para Claude Code:**
> "Crea `backend/migrations/009_hoja_vida_lote.sql`:
>
> ```sql
> -- 1. Agregar edad promedio al lote
> ALTER TABLE lotes
>   ADD COLUMN IF NOT EXISTS edad_promedio_dias INT DEFAULT 0;
>
> -- 2. Catálogo de servicios (futuro, crear ya para FK)
> CREATE TABLE IF NOT EXISTS catalogo_servicios (
>   id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
>   negocio_id  UUID NOT NULL REFERENCES negocios(id) ON DELETE CASCADE,
>   nombre      VARCHAR(255) NOT NULL,
>   descripcion TEXT,
>   costo_base  DECIMAL(18,4),
>   activo      BOOLEAN NOT NULL DEFAULT TRUE,
>   created_at  TIMESTAMP DEFAULT NOW()
> );
>
> -- 3. Registro diario del lote
> CREATE TABLE IF NOT EXISTS registro_diario_lote (
>   id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
>   negocio_id      UUID NOT NULL REFERENCES negocios(id) ON DELETE CASCADE,
>   lote_id         UUID NOT NULL REFERENCES lotes(id) ON DELETE CASCADE,
>   fecha           DATE NOT NULL,
>   confirmado      BOOLEAN NOT NULL DEFAULT FALSE,
>   confirmado_en   TIMESTAMP,
>   notas_del_dia   TEXT,
>   created_at      TIMESTAMP DEFAULT NOW(),
>   CONSTRAINT uq_registro_lote_fecha UNIQUE (lote_id, fecha)
> );
>
> CREATE INDEX IF NOT EXISTS idx_registro_diario_lote
>   ON registro_diario_lote(lote_id, fecha DESC);
>
> -- 4. Items del registro diario
> CREATE TABLE IF NOT EXISTS registro_diario_item (
>   id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
>   registro_diario_id  UUID NOT NULL REFERENCES registro_diario_lote(id) ON DELETE CASCADE,
>   tipo                VARCHAR(20) NOT NULL CHECK (tipo IN ('insumo', 'servicio')),
>   insumo_id           UUID REFERENCES insumos(id),
>   cantidad            DECIMAL(18,4),
>   unidad_id           UUID REFERENCES unidades_medida(id),
>   costo_real          DECIMAL(18,4),
>   detalle_fifo        JSONB,
>   servicio_id         UUID REFERENCES catalogo_servicios(id),
>   servicio_nombre     VARCHAR(255),
>   costo_servicio      DECIMAL(18,4),
>   created_at          TIMESTAMP DEFAULT NOW()
> );
>
> CREATE INDEX IF NOT EXISTS idx_registro_diario_item
>   ON registro_diario_item(registro_diario_id);
> ```
>
> Agregar al script `db:migrate` en `package.json` después de `008_...sql`. Ejecutar y verificar con `\dt`."

**Definition of Done:**
- 3 tablas nuevas creadas: `catalogo_servicios`, `registro_diario_lote`, `registro_diario_item`
- `lotes` tiene columna `edad_promedio_dias`
- El UNIQUE constraint `uq_registro_lote_fecha` existe

---

## TAREA 2 — Servicio de estándares animales (función pura)
**Archivo:** `backend/src/services/estandaresAnimales.js`
**Asignado:** Jairo
**Tiempo:** 1.5h
**Depende de:** nada (pura lógica, sin DB)

**Prompt para Claude Code:**
> "Crea `backend/src/services/estandaresAnimales.js`. Esta función es completamente pura — no importa pg ni ningún módulo externo. Es el repositorio de conocimiento veterinario precargado del sistema.
>
> ```javascript
> // ─── ESTÁNDARES POR ESPECIE ─────────────────────────────────────────────────
>
> const ESTANDARES = {
>   cerdo: {
>     fases: [
>       {
>         nombre: 'Iniciación',
>         desde_dia: 0, hasta_dia: 63,
>         peso_min_kg: 8, peso_max_kg: 25,
>         alimentacion: [
>           { descripcion: 'Balanceado iniciador', cantidad_por_cabeza_kg: 0.45, frecuencia: '3 veces al día' }
>         ],
>         agua_por_cabeza_litros: { min: 1, max: 2 },
>         ica_referencia: { min: 1.5, max: 2.0 }
>       },
>       {
>         nombre: 'Crecimiento',
>         desde_dia: 64, hasta_dia: 119,
>         peso_min_kg: 25, peso_max_kg: 50,
>         alimentacion: [
>           { descripcion: 'Balanceado crecimiento', cantidad_por_cabeza_kg: 1.5, frecuencia: '2 veces al día' }
>         ],
>         agua_por_cabeza_litros: { min: 2, max: 4 },
>         ica_referencia: { min: 2.0, max: 2.5 }
>       },
>       {
>         nombre: 'Desarrollo',
>         desde_dia: 120, hasta_dia: 161,
>         peso_min_kg: 50, peso_max_kg: 80,
>         alimentacion: [
>           { descripcion: 'Balanceado desarrollo', cantidad_por_cabeza_kg: 2.15, frecuencia: '2 veces al día' }
>         ],
>         agua_por_cabeza_litros: { min: 4, max: 6 },
>         ica_referencia: { min: 2.5, max: 3.0 }
>       },
>       {
>         nombre: 'Engorde/Finalización',
>         desde_dia: 162, hasta_dia: 999,
>         peso_min_kg: 80, peso_max_kg: 110,
>         alimentacion: [
>           { descripcion: 'Balanceado engorde', cantidad_por_cabeza_kg: 2.75, frecuencia: '2 veces al día' }
>         ],
>         agua_por_cabeza_litros: { min: 6, max: 8 },
>         ica_referencia: { min: 2.5, max: 3.0 }
>       }
>     ],
>     calendario_sanitario: [
>       { dia_desde: 1,   dia_hasta: 7,   tipo: 'sanidad',  descripcion: 'Vitaminas A+D+E inyectable + electrolitos en agua (estrés de llegada)' },
>       { dia_desde: 7,   dia_hasta: 7,   tipo: 'sanidad',  descripcion: 'Desparasitación interna — ivermectina o similar (primera dosis)' },
>       { dia_desde: 14,  dia_hasta: 14,  tipo: 'sanidad',  descripcion: 'Vacuna Mycoplasma hyopneumoniae — dosis 1' },
>       { dia_desde: 28,  dia_hasta: 28,  tipo: 'sanidad',  descripcion: 'Vacuna Mycoplasma hyopneumoniae — dosis 2 (refuerzo)' },
>       { dia_desde: 45,  dia_hasta: 60,  tipo: 'sanidad',  descripcion: 'Vacuna Peste Porcina Clásica' },
>       { dia_desde: 60,  dia_hasta: 60,  tipo: 'sanidad',  descripcion: 'Desparasitación externa — contra sarna y piojo (primera dosis)' },
>       { dia_desde: 90,  dia_hasta: 90,  tipo: 'servicio', descripcion: 'Pesaje general del lote + ajuste de ración según respuesta' },
>       { dia_desde: 120, dia_hasta: 120, tipo: 'sanidad',  descripcion: 'Desparasitación interna — segunda dosis' },
>       { dia_desde: 120, dia_hasta: 120, tipo: 'sanidad',  descripcion: 'Desparasitación externa — segunda dosis' },
>       { dia_desde: 150, dia_hasta: 150, tipo: 'servicio', descripcion: 'Pesaje + evaluación de conversión alimenticia' }
>     ],
>     servicios_periodicos: [
>       { frecuencia: 'diario',     descripcion: 'Revisión visual del lote (comportamiento, apetito, signos de enfermedad)' },
>       { frecuencia: 'cada3dias',  descripcion: 'Limpieza de comederos y bebederos' },
>       { frecuencia: 'semanal',    descripcion: 'Limpieza general del corral — remoción de estiércol' },
>       { frecuencia: 'quincenal',  descripcion: 'Desinfección del corral (cal o desinfectante)' },
>       { frecuencia: 'mensual',    descripcion: 'Pesaje de muestra representativa del lote (mínimo 10%)' }
>     ]
>   },
>
>   bovino: {
>     fases: [
>       {
>         nombre: 'Recepción/Adaptación',
>         desde_dia_en_lote: 0, hasta_dia_en_lote: 8,
>         alimentacion: [
>           { descripcion: 'Heno / fibra (paca)', cantidad_por_cabeza_kg: 4.5, frecuencia: 'Ad libitum (libre)' }
>         ],
>         ganancia_peso_kg_dia: { min: 0.5, max: 1.0 },
>         ica_referencia: { min: 5.0, max: 7.0 }
>       },
>       {
>         nombre: 'Transición',
>         desde_dia_en_lote: 9, hasta_dia_en_lote: 16,
>         alimentacion: [
>           { descripcion: 'Heno / fibra', cantidad_por_cabeza_kg: 3.75, frecuencia: '2 veces al día' },
>           { descripcion: 'Concentrado', cantidad_por_cabeza_kg: 3.75, frecuencia: '2 veces al día' }
>         ],
>         ganancia_peso_kg_dia: { min: 1.0, max: 1.5 },
>         ica_referencia: { min: 5.5, max: 7.0 }
>       },
>       {
>         nombre: 'Crecimiento',
>         desde_dia_en_lote: 17, hasta_dia_en_lote: 45,
>         alimentacion: [
>           { descripcion: 'Heno / fibra', cantidad_por_cabeza_kg: 2.75, frecuencia: '2 veces al día' },
>           { descripcion: 'Concentrado', cantidad_por_cabeza_kg: 6.25, frecuencia: '2 veces al día' }
>         ],
>         ganancia_peso_kg_dia: { min: 1.5, max: 1.8 },
>         ica_referencia: { min: 6.0, max: 6.5 }
>       },
>       {
>         nombre: 'Engorde/Finalización',
>         desde_dia_en_lote: 46, hasta_dia_en_lote: 999,
>         alimentacion: [
>           { descripcion: 'Heno / fibra', cantidad_por_cabeza_kg: 1.65, frecuencia: '2 veces al día' },
>           { descripcion: 'Concentrado', cantidad_por_cabeza_kg: 9.35, frecuencia: '2 veces al día' }
>         ],
>         ganancia_peso_kg_dia: { min: 1.8, max: 2.2 },
>         ica_referencia: { min: 6.0, max: 6.5 }
>       }
>     ],
>     calendario_sanitario: [
>       { dia_desde: 1,  dia_hasta: 1,  tipo: 'sanidad',  descripcion: 'Vitamina ADE inyectable + antiparasitario externo e interno (llegada)' },
>       { dia_desde: 1,  dia_hasta: 1,  tipo: 'sanidad',  descripcion: 'Vacuna Triple Bovina (Carbunco, Edema, Septicemia) si no fue aplicada antes' },
>       { dia_desde: 7,  dia_hasta: 7,  tipo: 'sanidad',  descripcion: 'Desparasitación interna — verificar si se hizo al llegar' },
>       { dia_desde: 14, dia_hasta: 14, tipo: 'servicio', descripcion: 'Control general del lote + revisión de pezuñas' },
>       { dia_desde: 30, dia_hasta: 30, tipo: 'servicio', descripcion: 'Pesaje + evaluación de ganancia de peso' },
>       { dia_desde: 45, dia_hasta: 45, tipo: 'sanidad',  descripcion: 'Desparasitación interna — segunda dosis según protocolo' },
>       { dia_desde: 60, dia_hasta: 60, tipo: 'servicio', descripcion: 'Pesaje + ajuste de ración según respuesta del lote' },
>       { dia_desde: 90, dia_hasta: 90, tipo: 'servicio', descripcion: 'Pesaje final + evaluación para liquidación' }
>     ],
>     servicios_periodicos: [
>       { frecuencia: 'diario',    descripcion: 'Verificar agua fresca disponible en bebederos' },
>       { frecuencia: 'diario',    descripcion: 'Revisión visual del lote' },
>       { frecuencia: 'cada2dias', descripcion: 'Limpieza de comederos' },
>       { frecuencia: 'semanal',   descripcion: 'Limpieza general del corral o potrero' },
>       { frecuencia: 'quincenal', descripcion: 'Revisión y tratamiento de pezuñas si necesario' },
>       { frecuencia: 'mensual',   descripcion: 'Pesaje + control sanitario general' }
>     ]
>   }
> };
>
> /**
>  * Devuelve el estándar esperado para un día específico de un lote.
>  * @param {string} especie - 'cerdo' | 'bovino'
>  * @param {number} edadActualDias - Edad del animal en días al momento de la consulta
>  * @param {number} diasEnLote - Cuántos días lleva el animal en este lote
>  * @returns {{ fase, alimentacion, agua, sanitario, servicios, ica_referencia }}
>  */
> export function getEstandarDia({ especie, edadActualDias, diasEnLote }) {
>   const est = ESTANDARES[especie.toLowerCase()];
>   if (!est) return null;
>
>   // Para cerdos: la fase depende de la edad total del animal
>   // Para bovinos: la fase depende de cuántos días lleva en el lote
>   const diasParaFase = especie === 'cerdo' ? edadActualDias : diasEnLote;
>
>   const fase = est.fases.find(f =>
>     diasParaFase >= f.desde_dia && diasParaFase <= (f.hasta_dia || f.hasta_dia_en_lote || 999)
>   ) || est.fases[est.fases.length - 1];
>
>   // Eventos sanitarios que aplican a este día específico
>   const sanitarioHoy = est.calendario_sanitario.filter(e =>
>     diasParaFase >= e.dia_desde && diasParaFase <= e.dia_hasta
>   );
>
>   // Servicios periódicos que aplican HOY según su frecuencia
>   const serviciosHoy = est.servicios_periodicos.filter(s => {
>     if (s.frecuencia === 'diario') return true;
>     if (s.frecuencia === 'cada2dias') return diasEnLote % 2 === 0;
>     if (s.frecuencia === 'cada3dias') return diasEnLote % 3 === 0;
>     if (s.frecuencia === 'semanal') return diasEnLote % 7 === 0;
>     if (s.frecuencia === 'quincenal') return diasEnLote % 15 === 0;
>     if (s.frecuencia === 'mensual') return diasEnLote % 30 === 0;
>     return false;
>   });
>
>   return {
>     fase: fase.nombre,
>     alimentacion: fase.alimentacion,
>     agua: fase.agua_por_cabeza_litros || null,
>     ica_referencia: fase.ica_referencia || null,
>     sanitario_hoy: sanitarioHoy,
>     servicios_hoy: serviciosHoy
>   };
> }
>
> /**
>  * Devuelve el estándar para todo un mes (array de 30 días).
>  */
> export function getEstandarMes({ especie, edadInicioMes, diasEnLoteInicio, cabezas }) {
>   const dias = [];
>   for (let i = 0; i < 30; i++) {
>     const std = getEstandarDia({
>       especie,
>       edadActualDias: edadInicioMes + i,
>       diasEnLote: diasEnLoteInicio + i
>     });
>     // Multiplicar alimentación por cabezas para el total del lote
>     const alimentacionLote = std?.alimentacion.map(a => ({
>       ...a,
>       cantidad_lote_kg: a.cantidad_por_cabeza_kg * cabezas
>     }));
>     dias.push({ dia_offset: i + 1, ...std, alimentacion_lote: alimentacionLote });
>   }
>   return dias;
> }
> ```
>
> Escribir tests para `getEstandarDia`:
> - Cerdo con 30 días de vida → fase 'Iniciación', alimento iniciador ~0.45 kg/cab
> - Cerdo con 100 días de vida → fase 'Crecimiento'
> - Cerdo con 180 días de vida → fase 'Engorde/Finalización'
> - Bovino día 5 en lote → fase 'Recepción/Adaptación'
> - Bovino día 50 en lote → fase 'Engorde/Finalización'
> - Cerdo día 7 en lote (edadActual 35) → sanitarioHoy incluye 'Desparasitación interna'"

**Definition of Done:**
- Todos los tests pasan
- `getEstandarDia` para cerdo de 45 días devuelve fase 'Iniciación'
- `getEstandarDia` para cerdo de 180 días devuelve 'Engorde/Finalización'
- No hay ningún import de pg en este archivo

---

## TAREA 3 — Controller Hoja de Vida + endpoint estándar
**Archivo:** `backend/src/controllers/hojaVidaController.js` + rutas en `negocio.js`
**Asignado:** Jairo
**Tiempo:** 2.5h
**Depende de:** T1 + T2

**Prompt para Claude Code:**
> "Crea `backend/src/controllers/hojaVidaController.js`. Importar `getEstandarDia` y `getEstandarMes` de `../services/estandaresAnimales.js` y `calcularConsumoFIFO` de `../services/inventarioFIFO.js`.
>
> **`getEstandarDelDia(req, res)`**
> GET `/:negocioId/lotes/:loteId/estandar?fecha=YYYY-MM-DD`
> - Cargar el lote para obtener `especie` (tipo_animal), `fecha_entrada`, `edad_promedio_dias`, `cabezas_activas`
> - Calcular `diasEnLote = diferencia en días entre fecha y fecha_entrada`
> - Calcular `edadActualDias = edad_promedio_dias + diasEnLote`
> - Llamar `getEstandarDia({ especie, edadActualDias, diasEnLote })`
> - Devolver el estándar + los datos calculados del lote
>
> **`getVistaMensual(req, res)`**
> GET `/:negocioId/lotes/:loteId/hoja-de-vida?anio=2025&mes=5`
> - Calcular el rango de fechas del mes (día 1 al último día del mes)
> - Cargar todos los `registro_diario_lote` del lote en ese rango, con sus `registro_diario_item`
> - Para cada día del mes (1 al último), generar un objeto con:
>   ```json
>   {
>     "fecha": "2025-05-15",
>     "dia_del_mes": 15,
>     "dias_en_lote": 45,
>     "fase": "Engorde/Finalización",
>     "confirmado": false,
>     "tiene_registro": true,
>     "estandar_resumido": { "alimentacion": [...], "sanitario_hoy": [...] },
>     "registro": { "id": "...", "items": [...], "notas_del_dia": "..." } // null si no hay
>   }
>   ```
> - Devolver: `{ lote, mes, anio, fase_predominante, dias: [...] }`
>
> **`getDetalleDia(req, res)`**
> GET `/:negocioId/lotes/:loteId/hoja-de-vida/:fecha`
> - Cargar el `registro_diario_lote` de esa fecha (con items JOIN insumos, unidades, servicios)
> - Cargar el estándar completo del día con `getEstandarDia`
> - Devolver ambos juntos para que el frontend muestre lado a lado
>
> **`guardarRegistroDia(req, res)`**
> POST `/:negocioId/lotes/:loteId/hoja-de-vida/:fecha`
> Body: `{ notas_del_dia, items: [{tipo, insumo_id, cantidad, unidad_id, servicio_nombre, costo_servicio}] }`
> - Si ya existe un `registro_diario_lote` para esa fecha y lote:
>   - Si está confirmado: devolver 409 'Este día ya fue confirmado y no puede modificarse'
>   - Si no está confirmado: DELETE de sus items y reemplazar con los nuevos
> - Si no existe: crear el registro y los items
> - NO modificar inventario. `confirmado` = false.
> - Devolver el registro guardado
>
> **`confirmarDia(req, res)`**
> POST `/:negocioId/lotes/:loteId/hoja-de-vida/:fecha/confirmar`
> Esta es la operación más crítica — usar transacción pg.
> ```
> BEGIN
> 1. Cargar registro_diario_lote. Si no existe → 404. Si confirmado → 409.
> 2. Cargar todos los registro_diario_item del registro.
> 3. Para cada item tipo 'insumo':
>    a. Cargar capas FIFO (FOR UPDATE) del insumo
>    b. Llamar calcularConsumoFIFO()
>    c. Actualizar cantidad_disponible en compras_insumo
>    d. UPDATE el registro_diario_item con costo_real y detalle_fifo
> 4. Marcar registro_diario_lote.confirmado = true, confirmado_en = NOW()
> COMMIT
> ```
> Si algún insumo no tiene stock suficiente: ROLLBACK y 422 con mensaje indicando cuál insumo falló.
> Devolver el registro completo con costos reales.
>
> Registrar en `negocio.js`:
> ```
> GET  /:negocioId/lotes/:loteId/estandar                        → getEstandarDelDia
> GET  /:negocioId/lotes/:loteId/hoja-de-vida                    → getVistaMensual
> GET  /:negocioId/lotes/:loteId/hoja-de-vida/:fecha             → getDetalleDia
> POST /:negocioId/lotes/:loteId/hoja-de-vida/:fecha             → guardarRegistroDia
> POST /:negocioId/lotes/:loteId/hoja-de-vida/:fecha/confirmar   → confirmarDia
> ```
> Todos con auth + negocioOwner."

**Definition of Done:**
- GET hoja-de-vida?mes=5 devuelve array de 31 días con `tiene_registro` correcto
- GET hoja-de-vida/:fecha devuelve estándar del día según especie y edad
- POST guardar no descuenta inventario
- POST confirmar descuenta inventario y falla con 422 si no hay stock
- Un día confirmado no puede modificarse (409)

---

## TAREA 4 — Modificar creación de lotes (agregar edad)
**Archivos:** `backend/src/controllers/loteController.js` + `frontend/src/pages/agro/Lotes.jsx`
**Asignado:** Sebastián
**Tiempo:** 1h
**Depende de:** T1 (migración con el campo edad_promedio_dias)

**Prompt para Claude Code:**
> "Modificación quirúrgica en el módulo de lotes para agregar la edad promedio al ingreso.
>
> **Backend — loteController.js:**
> En el método `crearLote`: agregar `edad_promedio_dias` al INSERT desde `req.body`. Default 0 si no viene. Agregar al SELECT de listar y detalle.
>
> **Frontend — Lotes.jsx:**
> En el modal 'Registrar lote', agregar este campo después de 'Fecha de entrada':
> ```
> Edad promedio al ingreso:  [___] días
> Ejemplo: lechones de 28 días → ingresar 28
> ```
> Tipo: input numérico, mínimo 0, default 0.
> Incluir el valor en el POST al crear el lote.
> No cambiar nada más del modal ni del diseño."

**Definition of Done:**
- El modal de crear lote tiene el campo de edad
- Al crear un lote con edad 28, el campo `edad_promedio_dias = 28` queda en DB
- GET /lotes devuelve `edad_promedio_dias` en cada lote

---

## TAREA 5 — Frontend: Pantalla Hoja de Vida (vista mensual)
**Archivo:** `frontend/src/pages/agro/HojaVida.jsx` (nuevo) + `AppLayout.jsx` + `App.jsx`
**Asignado:** Sebastián
**Tiempo:** 2.5h
**Depende de:** T3 + T4

**Prompt para Claude Code:**
> "Crear `frontend/src/pages/agro/HojaVida.jsx`. Seguir el mismo estilo visual del proyecto (estilos inline, variables CSS, componentes de ui.jsx).
>
> Esta página recibe `negocioId` y `activeLote` como props (igual que Bitacora.jsx).
>
> **Header:**
> ```
> ← Lotes    Hoja de Vida — Lote #L-2025-003 · Cerdo
>            Fase actual: Engorde/Finalización · Día 45 en lote
> ```
>
> **Navegación de meses** (fila horizontal):
> ```
> [← Mes anterior]   Mayo 2025   [Mes siguiente →]
> ```
> Por defecto muestra el mes actual. Los botones cargan el mes anterior/siguiente llamando a la API.
>
> **Grid de días del mes** (similar a un calendario pero en lista o grid):
> Mostrar los días del mes en orden. Cada día es una fila o card compacta con:
> ```
> Día 15 · Martes           [● Confirmado] / [○ Sin registrar] / [◌ Registrado sin confirmar]
> Fase: Engorde             Alimentación esperada: 2.75 kg/cab (275 kg lote)
> Registro: [ver si hay items guardados o '— sin registro']
>                                                              [Abrir día →]
> ```
>
> Código de colores para estado del día:
> - Verde: confirmado
> - Amber: tiene registro pero no confirmado
> - Gris: sin registro (neutral, no es error)
> - Azul (accent-agro): hoy
>
> Días con eventos sanitarios esperados muestran un ícono de jeringa o similar.
>
> Botón 'Abrir día →' navega a la pantalla de detalle del día (nueva página o drawer grande).
>
> Agregar en AppLayout.jsx en NAV_AGRO:
> `{ id: 'hojavida', label: 'Hoja de Vida', icon: 'clipboardList' }`
> entre 'bitacora' y 'liquidacion'.
>
> Agregar en App.jsx:
> `case 'hojavida': return <HojaVida negocioId={negocioId} activeLote={activeLote} />;`"

**Definition of Done:**
- La pantalla carga y muestra los días del mes actual
- Los días sin registro aparecen en gris
- Los días confirmados aparecen en verde
- Los botones de navegación de meses funcionan
- El botón 'Abrir día →' navega al detalle

---

## TAREA 6 — Frontend: Pantalla detalle del día
**Archivo:** `frontend/src/pages/agro/RegistroDia.jsx` (nuevo)
**Asignado:** Jairo
**Tiempo:** 3h — La pantalla más compleja del módulo
**Depende de:** T3 + T5

**Prompt para Claude Code:**
> "Crear `frontend/src/pages/agro/RegistroDia.jsx`. Esta es la pantalla más importante del módulo Hoja de Vida.
>
> Recibe como props: `negocioId`, `activeLote`, `fecha` (string YYYY-MM-DD).
>
> Al montar, hacer dos llamadas en paralelo:
> 1. GET /hoja-de-vida/:fecha → registro actual (puede ser null)
> 2. (incluido en la respuesta) estándar del día
>
> **Layout: dos columnas**
>
> **Columna izquierda (40%) — Lo esperado (estándar del día):**
> Card con fondo ligeramente diferente (`bg-tertiary`), borde izquierdo del color del rubro agro.
>
> Título: 'Lo esperado hoy'
> Subtítulo: 'Fase: [nombre de fase] · Día [N] en lote'
>
> Sección Alimentación:
> ```
> ALIMENTACIÓN ESTIMADA
> ─────────────────────────────────
> Balanceado engorde    2.75 kg/cab
>                       275 kg lote (×100 cab)
> Frecuencia: 2 veces al día
> ```
>
> Sección Sanidad (solo si hay eventos hoy):
> ```
> SANIDAD DEL DÍA  ⚕
> ─────────────────────────────────
> • Pesaje general del lote
> • Ajuste de ración según respuesta
> ```
>
> Sección Servicios esperados:
> ```
> SERVICIOS
> ─────────────────────────────────
> • Revisión visual del lote
> • Limpieza de comederos (cada 3 días)
> ```
>
> **Columna derecha (60%) — Lo registrado:**
>
> Si el día está CONFIRMADO: mostrar solo lectura con badge 'Confirmado ✓' y lista de items con costos reales. No mostrar formulario.
>
> Si NO está confirmado: mostrar el formulario de registro.
>
> **Formulario de registro:**
>
> Lista de items ya guardados (si hay), con botón eliminar cada uno.
>
> Botón '+ Agregar insumo':
> Abre un mini-formulario inline (no modal):
> ```
> Insumo:    [SELECT ▾ — con stock disponible al lado]
> Cantidad:  [___]  [unidad del insumo]
> ```
> Botón '+ Agregar servicio':
> ```
> Servicio:  [input texto libre]
> Costo:     [___] Bs
> ```
>
> Campo de notas del día (textarea, opcional).
>
> **Botón principal al final:**
> `[Guardar borrador]` — llama POST /hoja-de-vida/:fecha sin confirmar
> `[Confirmar día y descontar inventario]` — llama POST /confirmar
>
> El botón Confirmar tiene un diálogo de confirmación: '¿Confirmar el registro del [fecha]? Esta acción descontará del inventario y no puede deshacerse.'
>
> Si el POST /confirmar devuelve 422 (stock insuficiente), mostrar el error en rojo sin cerrar la pantalla: '⚠ Stock insuficiente de [insumo]. Disponible: X kg, registrado: Y kg. Actualizá el registro o comprá más insumos.'
>
> Después de confirmar exitosamente: mostrar badge 'Confirmado ✓' y cambiar la columna derecha a modo solo lectura con los costos reales del FIFO."

**Definition of Done:**
- Las dos columnas se muestran correctamente (estándar | registro)
- Puedo agregar un insumo y un servicio al registro
- 'Guardar borrador' guarda sin descontar inventario
- 'Confirmar' pide confirmación y descuenta del inventario
- Si no hay stock suficiente, el error aparece sin cerrar la pantalla
- Un día confirmado no muestra el formulario sino solo lectura

---

## Tabla resumen

| # | Tarea | Tipo | Horas | Depende | Asignado |
|---|-------|------|-------|---------|---------|
| 1 | Migración DB (3 tablas nuevas + campo edad) | DB | 1h | migración 008 | Gerardo |
| 2 | Servicio estándares animales (puro) | Backend | 1.5h | — | Jairo |
| 3 | Controller Hoja de Vida (5 endpoints) | Backend | 2.5h | T1+T2 | Jairo |
| 4 | Agregar campo edad a Lotes (backend+frontend) | Full-stack | 1h | T1 | Sebastián |
| 5 | Frontend: Vista mensual (HojaVida.jsx) | Frontend | 2.5h | T3+T4 | Sebastián |
| 6 | Frontend: Detalle del día (RegistroDia.jsx) | Frontend | 3h | T3+T5 | Jairo |
| | **Total** | | **~11.5h** | | |

---

## Restricciones para prompts de vibe-coding

1. **El UNIQUE constraint `(lote_id, fecha)` en `registro_diario_lote` es intencional.** Un lote solo puede tener un registro por día. Si Claude Code hace INSERT sin verificar existencia, va a romper en el segundo POST al mismo día. El endpoint POST debe hacer upsert o verificar primero.

2. **`confirmarDia` debe usar `FOR UPDATE` igual que en el FIFO.** Copiar el mismo patrón de `consumirInsumo` de la tarea anterior. El campo `confirmado` debe verificarse dentro de la transacción, no fuera.

3. **El estándar se calcula en runtime, nunca se guarda en DB.** No crear ninguna tabla de "estándar guardado". El servicio `estandaresAnimales.js` siempre lo calcula al vuelo con la edad y especie del lote.

4. **Para bovinos la fase depende de `dias_en_lote`, para cerdos de `edad_total_dias`.** Son lógicas distintas. Si Claude Code las confunde, las fases bovinas van a ser incorrectas.

5. **El campo `servicio_nombre` es texto libre por ahora.** No intentar conectarlo al `catalogo_servicios` todavía. El `servicio_id` se deja nullable en la tabla y se conectará cuando se implemente el catálogo.

---

## Flujo completo de verificación al terminar

1. Crear lote de cerdos con edad 28 días al ingreso
2. Ir a **Hoja de Vida** del lote → ver el mes actual con todos los días en gris
3. Hacer clic en el día de hoy → ver columna izquierda con estándar calculado (fase según 28 + N días)
4. Si el lote tiene 35 días de vida → debe mostrar fase 'Iniciación', alimento ~0.45 kg/cab
5. Agregar un insumo 'Balanceado iniciador' con cantidad apropiada para el lote
6. Agregar servicio 'Limpieza de corral' con costo Bs 50
7. Guardar borrador → el día aparece en amber en el calendario mensual
8. Confirmar el día → el día pasa a verde, el inventario de balanceado se descuenta
9. Intentar editar el día confirmado → debe mostrar solo lectura
10. Ir a **Compras** → verificar que el stock de Balanceado disminuyó correctamente
