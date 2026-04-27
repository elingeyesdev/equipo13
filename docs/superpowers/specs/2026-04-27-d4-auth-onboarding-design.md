# D-4 · Integración Auth + Onboarding en Frontend

**Fecha:** 2026-04-27  
**Sprint:** 2 — Entrega 28/04  
**Tarea de referencia:** TAREA D-4 del guia_sprint2_implementacion.md  
**Enfoque elegido:** Opción A — Auth state en App.jsx + nueva página Login.jsx

---

## Objetivo

Conectar el frontend React al backend Express para autenticación (login/registro/logout) y onboarding guiado. El diseño visual existente no debe modificarse. Solo se agrega lógica de API y manejo de estado.

---

## Archivos

### Archivos nuevos

| Archivo | Propósito |
|---|---|
| `frontend/src/config/api.js` | Helper `apiFetch` con token Bearer automático |
| `frontend/src/pages/Login.jsx` | Pantalla login/registro con mismo estilo que Onboarding |
| `frontend/.env.example` | Variable `VITE_API_URL=http://localhost:3000` |

### Archivos modificados

| Archivo | Cambio principal |
|---|---|
| `frontend/src/App.jsx` | Auth state + init effect + funciones auth + ruteo |
| `frontend/src/pages/Onboarding.jsx` | Paso 3 llama `POST /api/onboarding/completar` |
| `frontend/src/layouts/AppLayout.jsx` | Props `negocios` + `onLogout`; elimina NEGOCIOS hardcodeado |

---

## api.js

```js
export const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:3000';

export const apiFetch = async (path, options = {}) => {
  const token = localStorage.getItem('cu_token');
  const res = await fetch(API_BASE + path, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...options.headers,
    },
  });
  if (!res.ok) throw await res.json();
  return res.json();
};
```

---

## App.jsx — Estado y funciones de auth

### Estado nuevo

```js
const [user, setUser] = useState(null);        // null = no autenticado
const [negocios, setNegocios] = useState([]);  // lista real de la DB
const [loading, setLoading] = useState(true);  // mientras verifica token al inicio
```

El estado anterior `onboarded` (boolean) se elimina — su función la cumple `user.onboarding_completado`.

### Init effect (al montar la app)

1. Leer `localStorage.getItem('cu_token')`
2. Si existe: llamar `GET /api/auth/me`
   - Si ok: `setUser(data)` → si `onboarding_completado`, llamar `loadNegocios()`
   - Si falla (401/red): limpiar token de localStorage
3. `setLoading(false)`

### loadNegocios (función auxiliar interna)

```js
const loadNegocios = async () => {
  const data = await apiFetch('/api/negocios');
  setNegocios(data);
  if (data.length > 0) setNegocioId(prev => prev ?? data[0].id);
};
```

### Funciones de auth

```js
const login = async (email, password) => {
  const data = await apiFetch('/api/auth/login', {
    method: 'POST', body: JSON.stringify({ email, password })
  });
  localStorage.setItem('cu_token', data.token);
  setUser(data.user);
  if (data.user.onboarding_completado) await loadNegocios();
};

const register = async (email, password, nombre) => {
  const data = await apiFetch('/api/auth/register', {
    method: 'POST', body: JSON.stringify({ email, password, nombre })
  });
  localStorage.setItem('cu_token', data.token);
  setUser(data.user);
  // sin loadNegocios — usuario nuevo no tiene negocios aún
};

const logout = () => {
  localStorage.removeItem('cu_token');
  localStorage.removeItem('cu_state_v2');
  setUser(null);
  setNegocios([]);
  setNegocioId(null);
};
```

### Ruteo (if-chain en App.jsx)

```
loading = true       → spinner centrado
user = null          → <Login onLogin={login} onRegister={register} />
!onboarding_completado → <Onboarding onComplete={handleOnboardingComplete} />
onboarding_completado  → <AppLayout negocios={negocios} onLogout={logout} ...>
```

### onComplete del Onboarding

```js
const handleOnboardingComplete = async (negocioId) => {
  setUser(u => ({ ...u, onboarding_completado: true }));
  setNegocioId(negocioId);
  await loadNegocios();
};
```

---

## Login.jsx — UI

### Estructura visual

Idéntica a Onboarding: panel izquierdo oscuro fijo (40%, `#1e3a5f`) + panel derecho con formulario. Reutiliza `Input` y `Btn` de `ui.jsx`.

- Panel izquierdo: logo CU, icono `building` grande (opacity 0.08), tagline del producto
- Panel derecho: dos tabs `Iniciar sesión` / `Crear cuenta` que alternan el formulario
- Campos: Email, Contraseña (siempre); Nombre (solo en registro)
- Submit con Enter (`onKeyDown`) y con botón
- Botón deshabilitado + texto "Iniciando sesión…" / "Creando cuenta…" durante el fetch
- Error del backend mostrado bajo el botón (`error.error`), sin `alert()`

### Props

```js
Login({ onLogin, onRegister })
// onLogin(email, password) → puede lanzar
// onRegister(email, password, nombre) → puede lanzar
```

Login.jsx captura el throw de apiFetch y muestra el mensaje de error localmente.

---

## Onboarding.jsx — Conexión al backend

### Mapeo de template IDs a nombres de plantilla

```js
const TEMPLATE_PLANTILLA = {
  t1: 'industria_lactea',
  t2: 'panificacion',
  t3: 'textileria',
  t4: 'engorde_bovino',
  t5: 'lecheria',
  t6: 'metalmecanica',
  blank: null,
};
```

### Paso 3 — reemplaza el timer puro

Al entrar en el paso 3:
1. Arranca la animación de loading steps (igual que ahora, solo visual)
2. Llama `POST /api/onboarding/completar`:
```js
{
  negocios: [{
    nombre,
    rubro: rubro === 'ambos' ? 'industrial' : rubro,
    sub_rubro: subrubros[0] || null,
    plantilla: TEMPLATE_PLANTILLA[template] || null,
  }]
}
```
3. Si OK: llama `onComplete(data.negocios[0])` (el UUID del negocio creado)
4. Si error: muestra mensaje en rojo con opción de reintentar (no avanza el wizard)

La animación de steps sigue siendo visual (timer), pero el botón "Entrar al dashboard" solo aparece cuando la API responde OK (no solo cuando termina la animación).

---

## AppLayout.jsx — Cambios

### Firma actualizada

```js
// Antes
const AppLayout = ({ page, onNavigate, negocioId, onNegocioChange, children })

// Después
const AppLayout = ({ page, onNavigate, negocioId, onNegocioChange, negocios, onLogout, children })
```

### Eliminaciones

- Eliminar `const NEGOCIOS = [...]` hardcodeado
- Eliminar el `export { NEGOCIOS }` (App.jsx ya no lo importa)

### Additions

- `NegocioSelector` recibe `negocios` prop en lugar del array local
- Menú de admin agrega opción "Cerrar sesión" que llama `onLogout()`

---

## Manejo de errores

| Escenario | Comportamiento |
|---|---|
| Token expirado al init | Limpia token, muestra Login |
| Login con credenciales incorrectas | Error visible bajo formulario |
| Email ya registrado | Error "El email ya está registrado" bajo formulario |
| Onboarding falla en API | Mensaje de error en paso 3, botón "Reintentar" |
| Red caída en cualquier fetch | El error de red se propaga como string genérico |

---

## Definition of Done

- Puedo registrarme desde el frontend (sin datos previos)
- Completo el onboarding eligiendo industria láctea → dashboard
- El dashboard muestra datos del negocio recién creado (negocioId real de la DB)
- Recargo la página y sigo logueado (token persiste en localStorage)
- El negocio tiene los datos del seed cargados (verificable en otras pantallas)
- El selector de negocio en el sidebar muestra el negocio real (no "Lácteos del Valle" hardcodeado)
- Logout limpia la sesión y vuelve a Login
