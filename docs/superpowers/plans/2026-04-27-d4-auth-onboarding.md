# D-4 Auth + Onboarding Frontend Integration — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Conectar el frontend React al backend Express para autenticación (login/registro/logout) y onboarding guiado, sin modificar el diseño visual existente.

**Architecture:** Auth state (user, negocios, loading) vive en App.jsx. Login.jsx es una pantalla nueva con el mismo estilo visual que Onboarding. AppLayout recibe la lista real de negocios como prop en lugar del array hardcodeado. Onboarding.jsx llama al backend en el paso final y devuelve el UUID real del negocio creado.

**Tech Stack:** React 19, Vite, fetch API nativo, localStorage para token JWT

---

## Archivos

| Acción | Archivo |
|---|---|
| Crear | `frontend/src/config/api.js` |
| Crear | `frontend/src/pages/Login.jsx` |
| Crear | `frontend/.env.example` |
| Modificar | `frontend/src/App.jsx` |
| Modificar | `frontend/src/layouts/AppLayout.jsx` |
| Modificar | `frontend/src/pages/Onboarding.jsx` |

---

## Task 1: Crear api.js y .env.example

**Files:**
- Create: `frontend/src/config/api.js`
- Create: `frontend/.env.example`

- [ ] **Step 1: Crear el directorio config y el helper apiFetch**

Crear `frontend/src/config/api.js` con este contenido exacto:

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

- [ ] **Step 2: Crear .env.example**

Crear `frontend/.env.example`:

```
VITE_API_URL=http://localhost:3000
```

- [ ] **Step 3: Verificar que compila**

```bash
cd frontend && npm run build
```

Esperado: sin errores. Si hay error de "Cannot find module", verificar la ruta del archivo.

- [ ] **Step 4: Commit**

```bash
git add frontend/src/config/api.js frontend/.env.example
git commit -m "feat: add apiFetch helper and env example"
```

---

## Task 2: Crear Login.jsx

**Files:**
- Create: `frontend/src/pages/Login.jsx`

- [ ] **Step 1: Crear Login.jsx con panel izquierdo + formulario de tabs**

Crear `frontend/src/pages/Login.jsx`:

```jsx
import React, { useState } from 'react';
import { Icon } from '../icons.jsx';
import { Input, Btn } from '../components/ui.jsx';

const Login = ({ onLogin, onRegister }) => {
  const [tab, setTab] = useState('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [nombre, setNombre] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const handleSubmit = async () => {
    if (!email || !password) return;
    setLoading(true);
    setError(null);
    try {
      if (tab === 'login') {
        await onLogin(email, password);
      } else {
        await onRegister(email, password, nombre);
      }
    } catch (err) {
      setError(err?.error || 'Error al conectar con el servidor');
    } finally {
      setLoading(false);
    }
  };

  const switchTab = t => { setTab(t); setError(null); };

  return (
    <div style={{ display: 'flex', height: '100vh', overflow: 'hidden' }}>
      {/* Panel izquierdo */}
      <div style={{
        width: '40%', flexShrink: 0,
        background: '#1e3a5f',
        display: 'flex', flexDirection: 'column',
        justifyContent: 'flex-end',
        padding: '48px 40px',
        position: 'relative',
        overflow: 'hidden',
      }}>
        <div style={{
          position: 'absolute', inset: 0, opacity: 0.05,
          backgroundImage: 'linear-gradient(var(--border-mid) 1px, transparent 1px), linear-gradient(90deg, var(--border-mid) 1px, transparent 1px)',
          backgroundSize: '32px 32px',
        }} />
        <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -60%)', opacity: 0.08 }}>
          <Icon name="building" size={240} style={{ color: '#fff' }} />
        </div>
        <div style={{ position: 'relative', zIndex: 1 }}>
          <div style={{
            width: 36, height: 36, background: 'var(--accent-industrial)', borderRadius: '8px',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            marginBottom: '20px', fontSize: '15px', fontWeight: 700, color: '#fff', fontFamily: 'var(--font-mono)',
          }}>CU</div>
          <div style={{ fontSize: '28px', color: '#fff', fontWeight: 400, lineHeight: 1.2, marginBottom: '12px', letterSpacing: '-0.02em' }}>
            Costeo estándar<br />para tu producción
          </div>
          <div style={{ fontSize: '14px', color: '#ffffff88', lineHeight: 1.6 }}>
            Calculá el costo real de cada producto. Tomá decisiones con números, no con intuición.
          </div>
        </div>
      </div>

      {/* Panel derecho */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', background: 'var(--bg-primary)' }}>
        <div style={{ flex: 1, overflowY: 'auto', padding: '48px', display: 'flex', flexDirection: 'column', maxWidth: '440px' }}>
          {/* Tabs */}
          <div style={{ display: 'flex', marginBottom: '36px', borderBottom: '1px solid var(--border-subtle)' }}>
            {[
              { key: 'login', label: 'Iniciar sesión' },
              { key: 'register', label: 'Crear cuenta' },
            ].map(({ key, label }) => (
              <button
                key={key}
                onClick={() => switchTab(key)}
                style={{
                  padding: '10px 20px', border: 'none', cursor: 'pointer',
                  fontFamily: 'var(--font-sans)', background: 'transparent', fontSize: '14px',
                  color: tab === key ? 'var(--text-primary)' : 'var(--text-tertiary)',
                  fontWeight: tab === key ? 500 : 400,
                  borderBottom: tab === key ? '2px solid var(--accent-industrial)' : '2px solid transparent',
                  marginBottom: '-1px', transition: 'color 0.15s',
                }}
              >
                {label}
              </button>
            ))}
          </div>

          {/* Formulario */}
          <form
            onSubmit={e => { e.preventDefault(); handleSubmit(); }}
            style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}
          >
            {tab === 'register' && (
              <Input
                label="Nombre"
                value={nombre}
                onChange={setNombre}
                placeholder="Tu nombre"
                onFocusColor="var(--accent-industrial)"
              />
            )}
            <Input
              label="Email"
              type="email"
              value={email}
              onChange={setEmail}
              placeholder="tu@email.com"
              onFocusColor="var(--accent-industrial)"
            />
            <Input
              label="Contraseña"
              type="password"
              value={password}
              onChange={setPassword}
              placeholder="••••••••"
              onFocusColor="var(--accent-industrial)"
            />

            <div style={{ marginTop: '8px' }}>
              <Btn
                disabled={loading || !email || !password}
                size="lg"
                accentColor="var(--accent-industrial)"
              >
                {loading
                  ? (tab === 'login' ? 'Iniciando sesión…' : 'Creando cuenta…')
                  : (tab === 'login' ? 'Iniciar sesión' : 'Crear cuenta')}
              </Btn>
            </div>

            {error && (
              <div style={{
                padding: '10px 14px', borderRadius: '6px',
                background: 'var(--accent-danger)15',
                border: '1px solid var(--accent-danger)33',
                fontSize: '13px', color: 'var(--accent-danger)',
              }}>
                {error}
              </div>
            )}
          </form>
        </div>
      </div>
    </div>
  );
};

export default Login;
```

- [ ] **Step 2: Verificar que compila sin errores**

```bash
cd frontend && npm run build
```

Esperado: sin errores de compilación.

- [ ] **Step 3: Commit**

```bash
git add frontend/src/pages/Login.jsx
git commit -m "feat: add Login page with login/register tabs"
```

---

## Task 3: Actualizar AppLayout.jsx

**Files:**
- Modify: `frontend/src/layouts/AppLayout.jsx`

Hay 4 cambios específicos en este archivo: (1) eliminar el array `NEGOCIOS` hardcodeado, (2) actualizar la firma del componente, (3) reemplazar `NEGOCIOS` con la prop `negocios` en 3 lugares, (4) conectar el botón logout.

- [ ] **Step 1: Eliminar NEGOCIOS hardcodeado y actualizar firma del componente**

Reemplazar las líneas 28-45 (array NEGOCIOS + firma de AppLayout):

**Antes:**
```js
const NEGOCIOS = [
  { id: 'n1', nombre: 'Lácteos del Valle',   rubro: 'industrial' },
  { id: 'n2', nombre: 'Granja Los Pinos',    rubro: 'agro_ganadero' },
  { id: 'n3', nombre: 'Textilería Andina',   rubro: 'industrial' },
];

/* ── Theme hook ───────────────────────────────────────────── */
```

**Después:** (eliminar el bloque NEGOCIOS completo, dejar solo el comentario del Theme hook)

```js
/* ── Theme hook ───────────────────────────────────────────── */
```

Luego cambiar la firma del componente (línea ~45):

**Antes:**
```js
const AppLayout = ({ page, onNavigate, negocioId, onNegocioChange, children }) => {
```

**Después:**
```js
const AppLayout = ({ page, onNavigate, negocioId, onNegocioChange, negocios = [], onLogout, children }) => {
```

- [ ] **Step 2: Reemplazar NEGOCIOS con la prop negocios en la línea del negocio activo**

**Antes (línea ~55):**
```js
const negocio = NEGOCIOS.find(n => n.id === negocioId) || NEGOCIOS[0];
```

**Después:**
```js
const negocio = negocios.find(n => n.id === negocioId) || negocios[0] || { rubro: 'industrial' };
```

- [ ] **Step 3: Reemplazar NEGOCIOS en el NegocioSelector del sidebar**

**Antes (línea ~112):**
```jsx
<NegocioSelector negocios={NEGOCIOS} selected={negocioId} onSelect={id => { onNegocioChange(id); onNavigate('dashboard'); }} />
```

**Después:**
```jsx
<NegocioSelector negocios={negocios} selected={negocioId} onSelect={id => { onNegocioChange(id); onNavigate('dashboard'); }} />
```

- [ ] **Step 4: Reemplazar NEGOCIOS en la sección "Mis negocios" del dropdown de admin**

**Antes (línea ~192):**
```jsx
{NEGOCIOS.map(n => {
```

**Después:**
```jsx
{negocios.map(n => {
```

También en el mismo bloque (línea ~196):
```jsx
// antes:
<button key={n.id} onClick={() => { onNegocioChange(n.id); setAdminOpen(false); }}
// no cambia — solo cambia el array que se mapea
```

- [ ] **Step 5: Conectar el botón "Cerrar sesión" al prop onLogout**

**Antes (línea ~218):**
```jsx
<button onClick={() => alert('Sesión cerrada (mockup)')}
```

**Después:**
```jsx
<button onClick={() => { onLogout(); setAdminOpen(false); }}
```

- [ ] **Step 6: Actualizar el export — eliminar NEGOCIOS del export**

**Antes (última línea del archivo):**
```js
export { AppLayout, NEGOCIOS, useTheme };
```

**Después:**
```js
export { AppLayout, useTheme };
```

- [ ] **Step 7: Verificar que compila**

```bash
cd frontend && npm run build
```

Esperado: puede haber un error de "NEGOCIOS is not exported" en App.jsx — eso se resuelve en la siguiente tarea. Si el único error es ese, el paso está correcto.

- [ ] **Step 8: Commit**

```bash
git add frontend/src/layouts/AppLayout.jsx
git commit -m "feat: AppLayout accepts real negocios prop and onLogout"
```

---

## Task 4: Actualizar App.jsx

**Files:**
- Modify: `frontend/src/App.jsx`

Este es el cambio más grande. Reemplaza el componente `App` completo.

- [ ] **Step 1: Actualizar los imports al inicio del archivo**

**Antes:**
```js
import React, { useState, useEffect } from 'react';
import { Icon } from './icons.jsx';
import { AppLayout, NEGOCIOS } from './layouts/AppLayout.jsx';
import { Btn } from './components/ui.jsx';
import Onboarding from './pages/Onboarding.jsx';
```

**Después:**
```js
import React, { useState, useEffect } from 'react';
import { Icon } from './icons.jsx';
import { AppLayout } from './layouts/AppLayout.jsx';
import { Btn } from './components/ui.jsx';
import { apiFetch } from './config/api.js';
import Login from './pages/Login.jsx';
import Onboarding from './pages/Onboarding.jsx';
```

- [ ] **Step 2: Eliminar STORAGE_KEY y loadState**

**Antes:**
```js
const savedTheme = localStorage.getItem('cu_theme') || 'dark';
document.documentElement.setAttribute('data-theme', savedTheme);

const STORAGE_KEY = 'cu_state_v2';

const loadState = () => {
  try { const raw = localStorage.getItem(STORAGE_KEY); if (raw) return JSON.parse(raw); } catch (e) {}
  return null;
};
```

**Después** (solo dejar el tema):
```js
const savedTheme = localStorage.getItem('cu_theme') || 'dark';
document.documentElement.setAttribute('data-theme', savedTheme);
```

- [ ] **Step 3: Reemplazar el componente App completo**

**Antes** (desde `const App = () => {` hasta el cierre `};`):
```js
const App = () => {
  const saved = loadState();
  const [onboarded, setOnboarded] = useState(saved?.onboarded ?? false);
  const [page, setPage] = useState(saved?.page ?? 'dashboard');
  const [negocioId, setNegocioId] = useState(saved?.negocioId ?? 'n1');
  const [activeLote, setActiveLote] = useState(null);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ onboarded, page, negocioId }));
  }, [onboarded, page, negocioId]);

  const negocio = NEGOCIOS.find(n => n.id === negocioId) || NEGOCIOS[0];

  const navigate = p => setPage(p);

  const renderPage = () => {
    switch (page) {
      case 'dashboard':   return <Dashboard negocioId={negocioId} onNavigate={navigate} />;
      case 'fichas':      return <FichaCosto negocioId={negocioId} />;
      case 'productos':   return <Productos negocioId={negocioId} onNavigate={navigate} />;
      case 'insumos':     return <Insumos negocioId={negocioId} />;
      case 'proveedores': return <Proveedores negocioId={negocioId} />;
      case 'historial':   return <Historial negocioId={negocioId} />;
      case 'gastos':      return <GastosCIFPlaceholder rubro={negocio.rubro} />;
      case 'unidades':    return <Unidades negocioId={negocioId} />;
      case 'categorias':  return <Categorias negocioId={negocioId} />;
      case 'config':      return <Configuracion negocioId={negocioId} onNavigate={navigate} />;
      case 'lotes':       return <Lotes negocioId={negocioId} onNavigate={navigate} setActiveLote={setActiveLote} />;
      case 'bitacora':    return <Bitacora negocioId={negocioId} activeLote={activeLote} />;
      case 'liquidacion': return <Liquidacion negocioId={negocioId} activeLote={activeLote} />;
      default:
        return (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '60vh', gap: '16px' }}>
            <Icon name="info" size={32} style={{ color: 'var(--text-tertiary)' }} />
            <div style={{ fontSize: '14px', color: 'var(--text-tertiary)' }}>Pantalla <strong style={{ color: 'var(--text-secondary)' }}>{page}</strong> — en construcción</div>
            <Btn variant="secondary" onClick={() => navigate('dashboard')} icon="chevronLeft">Volver al dashboard</Btn>
          </div>
        );
    }
  };

  if (!onboarded) return <Onboarding onComplete={() => setOnboarded(true)} />;

  return (
    <AppLayout page={page} onNavigate={navigate} negocioId={negocioId} onNegocioChange={id => { setNegocioId(id); navigate('dashboard'); }}>
      {renderPage()}
    </AppLayout>
  );
};
```

**Después:**
```js
const App = () => {
  const [user, setUser] = useState(null);
  const [negocios, setNegocios] = useState([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState('dashboard');
  const [negocioId, setNegocioId] = useState(null);
  const [activeLote, setActiveLote] = useState(null);

  const loadNegocios = async () => {
    try {
      const data = await apiFetch('/api/negocios');
      setNegocios(data);
      setNegocioId(prev => prev ?? (data[0]?.id || null));
    } catch (e) {}
  };

  useEffect(() => {
    const init = async () => {
      const token = localStorage.getItem('cu_token');
      if (token) {
        try {
          const userData = await apiFetch('/api/auth/me');
          setUser(userData);
          if (userData.onboarding_completado) await loadNegocios();
        } catch (e) {
          localStorage.removeItem('cu_token');
        }
      }
      setLoading(false);
    };
    init();
  }, []);

  const login = async (email, password) => {
    const data = await apiFetch('/api/auth/login', {
      method: 'POST', body: JSON.stringify({ email, password }),
    });
    localStorage.setItem('cu_token', data.token);
    setUser(data.user);
    if (data.user.onboarding_completado) await loadNegocios();
  };

  const register = async (email, password, nombre) => {
    const data = await apiFetch('/api/auth/register', {
      method: 'POST', body: JSON.stringify({ email, password, nombre }),
    });
    localStorage.setItem('cu_token', data.token);
    setUser(data.user);
  };

  const logout = () => {
    localStorage.removeItem('cu_token');
    localStorage.removeItem('cu_state_v2');
    setUser(null);
    setNegocios([]);
    setNegocioId(null);
    setPage('dashboard');
  };

  const handleOnboardingComplete = async (newNegocioId) => {
    setUser(u => ({ ...u, onboarding_completado: true }));
    setNegocioId(newNegocioId);
    await loadNegocios();
  };

  const navigate = p => setPage(p);

  const renderPage = () => {
    const negocio = negocios.find(n => n.id === negocioId);
    switch (page) {
      case 'dashboard':   return <Dashboard negocioId={negocioId} onNavigate={navigate} />;
      case 'fichas':      return <FichaCosto negocioId={negocioId} />;
      case 'productos':   return <Productos negocioId={negocioId} onNavigate={navigate} />;
      case 'insumos':     return <Insumos negocioId={negocioId} />;
      case 'proveedores': return <Proveedores negocioId={negocioId} />;
      case 'historial':   return <Historial negocioId={negocioId} />;
      case 'gastos':      return <GastosCIFPlaceholder rubro={negocio?.rubro || 'industrial'} />;
      case 'unidades':    return <Unidades negocioId={negocioId} />;
      case 'categorias':  return <Categorias negocioId={negocioId} />;
      case 'config':      return <Configuracion negocioId={negocioId} onNavigate={navigate} />;
      case 'lotes':       return <Lotes negocioId={negocioId} onNavigate={navigate} setActiveLote={setActiveLote} />;
      case 'bitacora':    return <Bitacora negocioId={negocioId} activeLote={activeLote} />;
      case 'liquidacion': return <Liquidacion negocioId={negocioId} activeLote={activeLote} />;
      default:
        return (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '60vh', gap: '16px' }}>
            <Icon name="info" size={32} style={{ color: 'var(--text-tertiary)' }} />
            <div style={{ fontSize: '14px', color: 'var(--text-tertiary)' }}>Pantalla <strong style={{ color: 'var(--text-secondary)' }}>{page}</strong> — en construcción</div>
            <Btn variant="secondary" onClick={() => navigate('dashboard')} icon="chevronLeft">Volver al dashboard</Btn>
          </div>
        );
    }
  };

  if (loading) return (
    <div style={{ display: 'flex', height: '100vh', alignItems: 'center', justifyContent: 'center', background: 'var(--bg-primary)' }}>
      <div style={{ fontSize: '13px', color: 'var(--text-tertiary)' }}>Cargando…</div>
    </div>
  );

  if (!user) return <Login onLogin={login} onRegister={register} />;

  if (!user.onboarding_completado) return <Onboarding onComplete={handleOnboardingComplete} />;

  return (
    <AppLayout
      page={page}
      onNavigate={navigate}
      negocioId={negocioId}
      onNegocioChange={id => { setNegocioId(id); navigate('dashboard'); }}
      negocios={negocios}
      onLogout={logout}
    >
      {renderPage()}
    </AppLayout>
  );
};
```

- [ ] **Step 4: Actualizar el shortcut de teclado (Shift+O) para limpiar auth en lugar de state**

**Antes (última línea):**
```js
window.addEventListener('keydown', e => {
  if (e.shiftKey && e.key === 'O') { localStorage.removeItem(STORAGE_KEY); location.reload(); }
});
```

**Después:**
```js
window.addEventListener('keydown', e => {
  if (e.shiftKey && e.key === 'O') { localStorage.removeItem('cu_token'); location.reload(); }
});
```

- [ ] **Step 5: Verificar que compila sin errores**

```bash
cd frontend && npm run build
```

Esperado: sin errores. Si hay error "NEGOCIOS is not exported" ya fue resuelto en Task 3. Si hay otro error, verificar que todos los imports coincidan.

- [ ] **Step 6: Verificar en el navegador**

```bash
cd frontend && npm run dev
```

Abrir `http://localhost:5173`. Esperado: aparece la pantalla Login (panel izquierdo oscuro + tabs login/registro). La app no debe mostrar el dashboard sin estar autenticado.

- [ ] **Step 7: Commit**

```bash
git add frontend/src/App.jsx
git commit -m "feat: add auth state, init effect, and routing to App.jsx"
```

---

## Task 5: Actualizar Onboarding.jsx

**Files:**
- Modify: `frontend/src/pages/Onboarding.jsx`

- [ ] **Step 1: Agregar import de apiFetch y estados nuevos**

Al inicio del archivo, agregar el import:

```js
import { apiFetch } from '../config/api.js';
```

Dentro del componente `Onboarding`, después de los estados existentes, agregar:

```js
const [createdNegocioId, setCreatedNegocioId] = useState(null);
const [apiError, setApiError] = useState(null);
```

- [ ] **Step 2: Agregar el mapeo TEMPLATE_PLANTILLA**

Agregar justo después de `const LOADING_STEPS = [...]` (fuera del componente):

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

- [ ] **Step 3: Reemplazar el useEffect del paso 3 con llamada a API**

**Antes:**
```js
useEffect(() => {
  if (step !== 3) return;
  let i = 0;
  setLoadingStep(0);
  const iv = setInterval(() => {
    i++;
    if (i >= LOADING_STEPS.length) {
      clearInterval(iv);
      setTimeout(() => setDone(true), 300);
    } else {
      setLoadingStep(i);
    }
  }, 600);
  return () => clearInterval(iv);
}, [step]);
```

**Después:**
```js
useEffect(() => {
  if (step !== 3) return;

  setApiError(null);
  setDone(false);
  setCreatedNegocioId(null);

  let i = 0;
  let animDone = false;
  let apiDone = false;
  let resolvedNegocioId = null;

  const tryComplete = () => {
    if (animDone && apiDone) {
      setCreatedNegocioId(resolvedNegocioId);
      setDone(true);
    }
  };

  setLoadingStep(0);
  const iv = setInterval(() => {
    i++;
    if (i >= LOADING_STEPS.length) {
      clearInterval(iv);
      animDone = true;
      tryComplete();
    } else {
      setLoadingStep(i);
    }
  }, 600);

  apiFetch('/api/onboarding/completar', {
    method: 'POST',
    body: JSON.stringify({
      negocios: [{
        nombre,
        rubro,
        sub_rubro: subrubros[0] || null,
        plantilla: TEMPLATE_PLANTILLA[template] || null,
      }],
    }),
  })
    .then(data => {
      apiDone = true;
      resolvedNegocioId = data.negocios[0];
      tryComplete();
    })
    .catch(err => {
      clearInterval(iv);
      setApiError(err?.error || 'Error al crear el negocio. Intentá de nuevo.');
    });

  return () => clearInterval(iv);
}, [step]);
```

- [ ] **Step 4: Eliminar el botón "Ambos rubros" del paso 0**

En el JSX del paso 0 (`{step === 0 && ...}`), eliminar este bloque completo:

```jsx
<button onClick={() => setRubro('ambos')} style={{
  width: '100%', padding: '12px', borderRadius: '8px', cursor: 'pointer',
  border: `2px solid ${rubro === 'ambos' ? 'var(--accent-warning)' : 'var(--border-subtle)'}`,
  background: rubro === 'ambos' ? 'var(--accent-warning)10' : 'var(--bg-secondary)',
  color: rubro === 'ambos' ? 'var(--accent-warning)' : 'var(--text-secondary)',
  fontSize: '14px', fontFamily: 'var(--font-sans)', transition: 'all 0.2s',
}}>
  Ambos rubros
</button>
```

- [ ] **Step 5: Actualizar el botón "Entrar al dashboard" en el paso 3 para pasar el negocioId real**

En el JSX del paso 3 (`{step === 3 && ...}`), reemplazar el bloque de `done`:

**Antes:**
```jsx
{done && (
  <Btn onClick={onComplete} accentColor={accentColor} size="lg">
    Entrar al dashboard <Icon name="arrowRight" size={15} />
  </Btn>
)}
```

**Después:**
```jsx
{apiError && (
  <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
    <div style={{
      padding: '10px 14px', borderRadius: '6px',
      background: 'var(--accent-danger)15',
      border: '1px solid var(--accent-danger)33',
      fontSize: '13px', color: 'var(--accent-danger)',
    }}>
      {apiError}
    </div>
    <Btn variant="secondary" onClick={() => setStep(2)}>← Volver a elegir plantilla</Btn>
  </div>
)}
{done && !apiError && (
  <Btn onClick={() => onComplete(createdNegocioId)} accentColor={accentColor} size="lg">
    Entrar al dashboard <Icon name="arrowRight" size={15} />
  </Btn>
)}
```

- [ ] **Step 6: Verificar que compila**

```bash
cd frontend && npm run build
```

Esperado: sin errores.

- [ ] **Step 7: Verificar flujo completo en el navegador**

Con backend corriendo en `http://localhost:3000`:

1. Abrir `http://localhost:5173` → ver pantalla Login
2. Hacer clic en "Crear cuenta" → llenar email, contraseña, nombre → submit
3. Aparece el wizard de onboarding (4 pasos)
4. Paso 0: elegir Industrial (sin botón "Ambos rubros")
5. Paso 1: ingresar nombre del negocio
6. Paso 2: elegir "Industria láctea" (t1)
7. Paso 3: ver la animación de loading → esperar que termina la API → aparece "Entrar al dashboard"
8. Clic → ver el dashboard con el negocio real
9. El selector en el sidebar muestra el nombre real del negocio (no "Lácteos del Valle" hardcodeado)
10. Recargar la página → seguir logueado, ver el dashboard directamente
11. Abrir el menú de usuario → "Cerrar sesión" → vuelve a Login

- [ ] **Step 8: Commit final**

```bash
git add frontend/src/pages/Onboarding.jsx
git commit -m "feat: connect Onboarding step 3 to backend API"
```

---

## Self-Review Check

**Spec coverage:**
- ✅ `api.js` con `apiFetch` y `API_BASE` → Task 1
- ✅ `.env.example` → Task 1
- ✅ `Login.jsx` con tabs login/registro, error display, loading state → Task 2
- ✅ `AppLayout.jsx` sin NEGOCIOS hardcodeado, acepta `negocios` y `onLogout` → Task 3
- ✅ `App.jsx`: estado user/negocios/loading, init effect, login/register/logout/loadNegocios/handleOnboardingComplete → Task 4
- ✅ Ruteo: loading → Login → Onboarding → AppLayout → Task 4
- ✅ `Onboarding.jsx`: eliminar 'ambos', TEMPLATE_PLANTILLA, API call en paso 3, error handling → Task 5
- ✅ `onComplete(negocioId)` pasa UUID real → Task 5 + Task 4

**Placeholder scan:** sin TBDs, todo el código es concreto y completo.

**Type consistency:** `onComplete(newNegocioId: string)` — definido en Task 4 (handleOnboardingComplete) y llamado en Task 5 (onComplete(createdNegocioId)). Coincide.
