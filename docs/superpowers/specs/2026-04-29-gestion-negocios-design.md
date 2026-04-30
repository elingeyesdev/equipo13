# Diseño: Gestión de Negocios en Configuración

**Fecha:** 2026-04-29  
**Estado:** Aprobado

## Resumen

Agregar una sub-sección "Mis negocios" dentro de la página Configuración que permita al usuario ver todos sus negocios, crear nuevos con un formulario directo, editar nombre y moneda, desactivar (soft delete) y eliminar permanentemente (hard delete con confirmación por nombre).

## Arquitectura y flujo de datos

Los cambios tocan backend (2 endpoints nuevos + fix en `create`) y frontend (`Configuracion.jsx` + `App.jsx`).

`App.jsx` ya gestiona el array `negocios` y la función `loadNegocios()`. Se pasan como props a `Configuracion` junto con callbacks de mutación. Tras cualquier mutación exitosa, se llama `loadNegocios()` para sincronizar el `NegocioSelector` del sidebar con el estado real.

Si el negocio desactivado o eliminado era el negocio activo (`negocioId`), `App.jsx` cambia automáticamente al primer negocio activo disponible.

## Backend

### Archivos modificados

**`backend/src/controllers/negocioController.js`**

- `create` (fix): después del INSERT, llama a `aplicarPlantilla(plantilla, negocioId, client)` dentro de una transacción, igual que lo hace el onboarding controller. Actualmente este paso está ausente.
- `getAll` (modificación): acepta query param `?includeInactivos=true`. Si no se envía, sigue filtrando `activo = true` (comportamiento actual sin romper nada).
- `desactivar` (nueva): `PATCH /:id/desactivar` → `UPDATE negocios SET activo = false WHERE id = $1 AND user_id = $2 RETURNING *`. Retorna 404 si no existe o no pertenece al usuario.
- `remove` (nueva): `DELETE /:id` → verifica primero que `activo = false`; si está activo retorna 409 con mensaje "Desactivá el negocio antes de eliminarlo". Si está inactivo ejecuta `DELETE FROM negocios WHERE id = $1 AND user_id = $2` (la FK CASCADE elimina todos los datos asociados).

**`backend/src/routes/negocios.js`**

Agregar:
```
router.patch('/:id/desactivar', authMiddleware, desactivar);
router.delete('/:id',           authMiddleware, remove);
```

### Resumen de endpoints

| Método | Ruta | Descripción |
|--------|------|-------------|
| GET | `/api/negocios` | Lista activos (sin cambio) |
| GET | `/api/negocios?includeInactivos=true` | Lista activos + inactivos |
| POST | `/api/negocios` | Crea + aplica plantilla (fix) |
| PUT | `/api/negocios/:id` | Edita nombre, moneda, sub_rubro (sin cambio) |
| PATCH | `/api/negocios/:id/desactivar` | Soft delete |
| DELETE | `/api/negocios/:id` | Hard delete (requiere activo=false) |

## Frontend

### `App.jsx`

- Pasar `negocios` y `loadNegocios` como props a `Configuracion`.
- Después de desactivar o eliminar el negocio activo: `setNegocioId(negocios.find(n => n.activo)?.id ?? null)`.

### `Configuracion.jsx`

- Agregar al `SUB_MENU`: `{ id: 'negocios', label: 'Mis negocios', icon: 'building' }`.
- Recibir props nuevas: `negocios`, `loadNegocios`.
- Renderizar `<NegociosSection>` cuando `subPage === 'negocios'`.

### Componente `NegociosSection` (dentro de `Configuracion.jsx`)

**Estado local:**
- `todos`: array con activos + inactivos (cargado vía `GET ?includeInactivos=true` al montar)
- `loading`: boolean
- `modalCrear / modalEditar / modalDesactivar / modalEliminar`: null | negocio

**Lista:**
- Cards compactas: ícono de rubro + nombre + badges (rubro, "Inactivo", "En uso")
- Activos listados primero; inactivos en sección colapsable al final con header "Inactivos (N)"
- Hover revela botones de acción

**Acciones por card:**

| Estado | Acciones disponibles |
|--------|---------------------|
| Activo, en uso | Editar |
| Activo, no en uso, hay otros activos | Editar, Desactivar |
| Activo, único negocio activo | Editar (sin Desactivar — debe existir al menos uno activo) |
| Inactivo | Reactivar, Eliminar definitivamente |

Reactivar es el inverso del soft-delete: `PUT /api/negocios/:id` con `{ activo: true }` — requiere agregar `activo` como campo actualizable en el controller `update` (actualmente solo actualiza `nombre`, `moneda`, `sub_rubro`).

**Botón "Nuevo negocio":** arriba a la derecha del encabezado de sección.

### Modales

**Modal Crear:**
- Campos: Nombre (input texto, requerido), Rubro (chips: Industrial / Agro-ganadero), Plantilla (chips según rubro + opción "Sin plantilla"), Moneda (select: BOB, USD, ARS, PEN)
- Plantillas disponibles: Industrial → `industria_lactea`; Agro-ganadero → `engorde_bovino`
- Submit: `POST /api/negocios`, cierra modal, llama `loadNegocios()`

**Modal Editar:**
- Campos: Nombre (input), Moneda (select)
- Submit: `PUT /api/negocios/:id`, cierra modal, llama `loadNegocios()`

**Modal Desactivar:**
- Mensaje de advertencia: "Esto ocultará el negocio. Sus datos se conservan y podrás reactivarlo después."
- Botones: Cancelar / Desactivar (rojo)
- Submit: `PATCH /api/negocios/:id/desactivar`, llama `loadNegocios()`

**Modal Eliminar definitivamente:**
- Mensaje de advertencia: "Esta acción es irreversible. Se eliminarán todos los insumos, productos, lotes y fichas de este negocio."
- Campo de texto: el usuario debe escribir el nombre exacto del negocio para habilitar el botón de confirmar
- Submit: `DELETE /api/negocios/:id`, llama `loadNegocios()`

### Estados de carga y errores

- Botones de submit con `disabled` + spinner durante la petición
- Errores de API mostrados como texto rojo inline dentro del modal (no cierran el modal)

## UX — Cards de negocio

```
┌─────────────────────────────────────────────────────────┐
│ [🏭]  Planta Demo Láctea     [Industrial] [● En uso]   │
│                                              [Editar]   │
├─────────────────────────────────────────────────────────┤
│ [🐄]  Ganadería El Valle     [Agro-ganadero]           │
│                              [Editar] [Desactivar]      │
└─────────────────────────────────────────────────────────┘

▼ Inactivos (1)
┌─────────────────────────────────────────────────────────┐
│ [🏭]  Negocio Viejo          [Industrial] [Inactivo]   │
│                     [Reactivar] [Eliminar definitivamente]│
└─────────────────────────────────────────────────────────┘
```

## Archivos a crear/modificar

| Archivo | Cambio |
|---------|--------|
| `backend/src/controllers/negocioController.js` | Fix `create`, mod `getAll`, mod `update` (add `activo`), add `desactivar`, add `remove` |
| `backend/src/routes/negocios.js` | Add PATCH y DELETE routes |
| `frontend/src/App.jsx` | Pasar `negocios` + `loadNegocios` a Configuracion; manejar negocioId tras desactivar |
| `frontend/src/pages/Configuracion.jsx` | Add sub-sección + componente NegociosSection + 4 modales |
