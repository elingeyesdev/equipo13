# Módulo de Operarios (app móvil + roles en la web)

Guía operativa del módulo de operarios: roles/membresías, app móvil Flutter,
y los flujos de registro diario, eventos, tareas y reportes.

## Conceptos

- **Negocio**: unidad de trabajo (granja). Tiene un **código** corto y único
  (formato `AA-1234`) que el operario usa para iniciar sesión.
- **Roles (membresías)**: cada usuario pertenece a uno o más negocios con un rol:
  - **admin**: dueño/gestor. Usa la **web** (email + contraseña).
  - **operario**: trabajador de campo. Usa la **app móvil** (código de negocio +
    usuario + PIN). Ve **solo los lotes que tiene asignados**.
- **Borrador → confirmar (integridad de costos)**: el operario **nunca** confirma
  el registro diario. Guarda un **borrador**; el admin lo **confirma** en la web,
  y solo entonces corre el FIFO de inventario y se fija el costo real.

## Puesta en marcha

```bash
# Backend (requiere DATABASE_URL y JWT_SECRET en backend/.env)
cd backend && npm install && npm run db:migrate && npm start

# Web admin
cd frontend && npm install && npm run dev

# App móvil (operarios)
cd app_movil && flutter pub get && flutter run
#   La baseUrl se configura con --dart-define=API_URL=...  (por defecto http://10.0.2.2:3000)
```

Los negocios creados (en onboarding o desde la web) reciben automáticamente su
`codigo` y la membresía `admin` del dueño.

## Cómo crear un operario (web admin)

1. Menú **Operarios**. Arriba se muestra el **código del negocio** (los operarios
   lo necesitan para ingresar).
2. "Crear operario" con el nombre → se generan **usuario** y **PIN temporal**.
   Anotalos: el PIN no se vuelve a mostrar (podés regenerarlo con **Reset PIN**).
3. Asigná lotes al operario con los checkboxes (también podés activar/desactivar
   la cuenta).

## Login del operario (app móvil)

`POST /api/auth/operario/login` con `{ codigo_negocio, username, pin }`.
Tras **5 PIN incorrectos** la cuenta se bloquea **15 min** (el admin puede
resetear el PIN para desbloquear). El token lleva `{ id, rol: 'operario', negocio_id }`.

## Flujo diario (registro → borrador → confirmar)

1. Operario: abre un lote → calendario (hoja de vida) → un día → agrega insumos +
   cantidades → **Guardar borrador**.
2. Admin (web): menú **Pendientes** → ve los borradores → **Confirmar**. Eso corre
   el FIFO y fija el costo real. Un día confirmado ya no es editable.

## Eventos de campo (flujo mixto)

El operario reporta eventos con fotos de evidencia desde el lote:

| Evento | Efecto |
|--------|--------|
| **Pesaje** | Inmediato: registra en `pesajes_lote` y actualiza el peso del lote. |
| **Incidente / Stock bajo** | Inmediato: queda en el feed del admin (solo lectura). |
| **Baja / mortandad** | **Pendiente**: el admin la aprueba/rechaza en **Pendientes**. Al aprobar, descuenta cabezas y registra en la bitácora. |

## Tareas y rutinas

- **Tareas puntuales**: el admin asigna una tarea (título, lote opcional, operario,
  fecha) → el operario la ve en "Mis tareas" y la marca **Completar**.
- **Rutinas (checklists)**: el admin define una plantilla (ítems) y la asigna a
  combinaciones **lote ↔ operario** → el operario ve el **checklist del día** en el
  detalle del lote y tilda los ítems. El checklist se materializa por
  `(ítem, lote, operario, fecha)`: dos operarios del mismo lote tienen checklists
  independientes.

Web: menú **Rutinas y Tareas** (dos pestañas).

## Reportes

Menú **Productividad**: por operario, tareas completadas, % de checklist, eventos
totales, bajas e incidentes. (`GET /api/negocios/:negocioId/operarios/reportes`).

## Notificaciones push (estado actual)

> ⚠️ **Mockeadas**: hoy `notificar()` (backend `services/firebase.js`) solo
> registra en consola y el cliente Flutter genera un token simulado. **No se
> entrega ninguna notificación real todavía.**

La infraestructura ya está lista para enchufar **firebase-admin** cuando haya
credenciales: tabla `dispositivos` (token FCM por usuario), endpoint de registro
`POST /api/operario/dispositivos`, y los disparos ya cableados (nueva tarea, lote
asignado, PIN reseteado, baja aprobada/rechazada). Para activarlo: agregar
`firebase-admin` a las dependencias, cargar el Service Account y reemplazar el
cuerpo de `notificar()` por el envío real a los `fcm_token` del usuario.

## Endpoints clave

**Operario** (token operario, prefijo `/api/operario`): `POST /auth/operario/login`
· `GET /lotes` · `GET/POST /lotes/:loteId/hoja-de-vida[/:fecha]` (borrador) ·
`POST /lotes/:loteId/eventos` · `GET /eventos` · `GET /tareas` ·
`POST /tareas/:id/completar` · `GET /lotes/:loteId/checklist` ·
`POST /checklist/:id/toggle` · `POST /upload` · `POST /dispositivos`.

**Admin** (token admin, prefijo `/api/negocios/:negocioId`): `…/operarios` (CRUD,
reset-pin, asignar/quitar lotes) · `…/pendientes/registros` · `…/lotes/:loteId/hoja-de-vida/:fecha/confirmar`
· `…/eventos` · `…/pendientes/bajas/:eventoId/(aprobar|rechazar)` · `…/tareas` ·
`…/plantillas` · `…/operarios/reportes`.
