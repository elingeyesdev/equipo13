# Gestión de Negocios en Configuración — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Agregar sub-sección "Mis negocios" en Configuración para listar, crear (con plantilla), editar, desactivar (soft delete) y eliminar definitivamente negocios del usuario.

**Architecture:** Backend recibe 2 endpoints nuevos (PATCH desactivar, DELETE remove) y correcciones en `create` (transacción + plantilla), `getAll` (filtro inactivos) y `update` (campo `activo`). Frontend agrega `NegociosSection` a `Configuracion.jsx` con 4 modales gestionados con estado local; `App.jsx` pasa `loadNegocios` para sincronizar el sidebar tras mutaciones.

**Tech Stack:** Node.js + Express + PostgreSQL (backend, ES modules); React 19 con inline styles (frontend, sin router externo, sin framework de tests en frontend)

---

## Mapa de archivos

| Archivo | Tipo | Responsabilidad |
|---------|------|-----------------|
| `backend/src/controllers/negocioController.js` | Modify | Fix create, getAll, update; add desactivar, remove |
| `backend/src/routes/negocios.js` | Modify | Agregar rutas PATCH y DELETE |
| `frontend/src/App.jsx` | Modify | loadNegocios inteligente; pasar props a Configuracion |
| `frontend/src/pages/Configuracion.jsx` | Modify | Add sub-menu + NegociosSection + 4 modales |

---

## Task 1: Backend — corregir y extender negocioController.js

**Files:**
- Modify: `backend/src/controllers/negocioController.js`

- [ ] **Step 1: Reemplazar el contenido completo de negocioController.js**

```javascript
import { pool } from '../config/database.js';
import { aplicarPlantilla } from '../services/seedPlantilla.js';

export async function getAll(req, res) {
  const includeInactivos = req.query.includeInactivos === 'true';
  try {
    let q = `SELECT id, nombre, rubro, sub_rubro, plantilla, moneda, activo, created_at
             FROM negocios WHERE user_id = $1`;
    if (!includeInactivos) q += ' AND activo = true';
    q += ' ORDER BY created_at ASC';
    const result = await pool.query(q, [req.user.id]);
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
}

export async function create(req, res) {
  const { nombre, rubro, sub_rubro, plantilla, moneda } = req.body;
  if (!nombre) return res.status(400).json({ error: 'El nombre es requerido' });
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const result = await client.query(
      `INSERT INTO negocios (user_id, nombre, rubro, sub_rubro, plantilla, moneda)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING *`,
      [req.user.id, nombre, rubro ?? null, sub_rubro ?? null, plantilla ?? null, moneda ?? 'BOB']
    );
    const negocio = result.rows[0];
    if (plantilla) await aplicarPlantilla(plantilla, negocio.id, client);
    await client.query('COMMIT');
    res.status(201).json(negocio);
  } catch (err) {
    await client.query('ROLLBACK');
    console.error(err);
    res.status(500).json({ error: err.message });
  } finally {
    client.release();
  }
}

export async function getOne(req, res) {
  const { id } = req.params;
  try {
    const result = await pool.query(
      'SELECT * FROM negocios WHERE id = $1 AND user_id = $2',
      [id, req.user.id]
    );
    if (!result.rows[0]) return res.status(404).json({ error: 'Negocio no encontrado' });
    res.json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
}

export async function update(req, res) {
  const { id } = req.params;
  const { nombre, moneda, sub_rubro, activo } = req.body;
  try {
    const result = await pool.query(
      `UPDATE negocios
       SET nombre    = COALESCE($1, nombre),
           moneda    = COALESCE($2, moneda),
           sub_rubro = COALESCE($3, sub_rubro),
           activo    = COALESCE($4, activo)
       WHERE id = $5 AND user_id = $6
       RETURNING *`,
      [nombre ?? null, moneda ?? null, sub_rubro ?? null, activo ?? null, id, req.user.id]
    );
    if (!result.rows[0]) return res.status(404).json({ error: 'Negocio no encontrado' });
    res.json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
}

export async function desactivar(req, res) {
  const { id } = req.params;
  try {
    const result = await pool.query(
      `UPDATE negocios SET activo = false
       WHERE id = $1 AND user_id = $2
       RETURNING *`,
      [id, req.user.id]
    );
    if (!result.rows[0]) return res.status(404).json({ error: 'Negocio no encontrado' });
    res.json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
}

export async function remove(req, res) {
  const { id } = req.params;
  try {
    const check = await pool.query(
      'SELECT activo FROM negocios WHERE id = $1 AND user_id = $2',
      [id, req.user.id]
    );
    if (!check.rows[0]) return res.status(404).json({ error: 'Negocio no encontrado' });
    if (check.rows[0].activo) {
      return res.status(409).json({ error: 'Desactivá el negocio antes de eliminarlo definitivamente' });
    }
    await pool.query('DELETE FROM negocios WHERE id = $1 AND user_id = $2', [id, req.user.id]);
    res.json({ ok: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
}
```

- [ ] **Step 2: Commit**

```bash
git add backend/src/controllers/negocioController.js
git commit -m "feat: negocioController — create con plantilla, getAll filtro inactivos, update activo, desactivar, remove"
```

---

## Task 2: Backend — agregar rutas PATCH y DELETE

**Files:**
- Modify: `backend/src/routes/negocios.js`

- [ ] **Step 1: Reemplazar el contenido de negocios.js**

```javascript
import { Router } from 'express';
import { authMiddleware } from '../middleware/auth.js';
import { getAll, create, getOne, update, desactivar, remove } from '../controllers/negocioController.js';

const router = Router();

router.get('/',                   authMiddleware, getAll);
router.post('/',                  authMiddleware, create);
router.get('/:id',                authMiddleware, getOne);
router.put('/:id',                authMiddleware, update);
router.patch('/:id/desactivar',   authMiddleware, desactivar);
router.delete('/:id',             authMiddleware, remove);

export default router;
```

- [ ] **Step 2: Verificar que el servidor levanta sin errores**

Con el servidor corriendo (`npm run dev` en `/backend`), ejecutar:
```bash
curl -s http://localhost:3000/api/negocios -H "Authorization: Bearer <token_de_prueba>"
```
Resultado esperado: array JSON de negocios (puede ser vacío o con datos).

- [ ] **Step 3: Commit**

```bash
git add backend/src/routes/negocios.js
git commit -m "feat: rutas PATCH desactivar y DELETE remove en negocios"
```

---

## Task 3: Frontend — App.jsx, loadNegocios inteligente + props a Configuracion

**Files:**
- Modify: `frontend/src/App.jsx`

- [ ] **Step 1: Actualizar `loadNegocios` para manejar negocioId inválido**

Reemplazar la función `loadNegocios` existente (líneas 59-64 aprox.) con:

```javascript
const loadNegocios = async () => {
  try {
    const data = await apiFetch('/api/negocios');
    setNegocios(data);
    setNegocioId(prev => {
      if (data.find(n => n.id === prev)) return prev;
      return data[0]?.id ?? null;
    });
  } catch (e) {}
};
```

- [ ] **Step 2: Pasar `negocios` y `loadNegocios` al case `config` en `renderPage`**

Buscar la línea:
```javascript
case 'config':      return <Configuracion negocioId={negocioId} onNavigate={navigate} user={user} />;
```
Reemplazarla con:
```javascript
case 'config':      return <Configuracion negocioId={negocioId} onNavigate={navigate} user={user} negocios={negocios} loadNegocios={loadNegocios} />;
```

- [ ] **Step 3: Commit**

```bash
git add frontend/src/App.jsx
git commit -m "feat: App — loadNegocios inteligente, props negocios+loadNegocios a Configuracion"
```

---

## Task 4: Frontend — Configuracion.jsx, sub-menú + NegociosSection (lista y cards)

**Files:**
- Modify: `frontend/src/pages/Configuracion.jsx`

- [ ] **Step 1: Agregar "Mis negocios" al SUB_MENU y nuevas props**

En la definición del componente `Configuracion`, agregar `negocios` y `loadNegocios` a las props y añadir la entrada al `SUB_MENU`:

```javascript
const Configuracion = ({ negocioId, onNavigate, user, negocios = [], loadNegocios }) => {
```

En el array `SUB_MENU`, agregar al principio:
```javascript
{ id: 'negocios',   label: 'Mis negocios',     icon: 'building'    },
```

En `renderContent`, agregar el nuevo case antes del `return null` final:
```javascript
if (subPage === 'negocios') return (
  <NegociosSection
    negocioId={negocioId}
    loadNegocios={loadNegocios}
    accentColor={accentColor}
  />
);
```

- [ ] **Step 2: Agregar el componente NegociosSection con carga de datos y cards**

Insertar este componente antes de la definición de `Configuracion` en el mismo archivo:

```javascript
const MONEDAS_OPTS = ['BOB', 'USD', 'ARS', 'PEN'];

const PLANTILLAS_POR_RUBRO = {
  industrial:    [{ value: 'industria_lactea', label: 'Industria láctea' }],
  agro_ganadero: [{ value: 'engorde_bovino',   label: 'Engorde bovino'  }],
};

const RUBRO_COLOR = {
  industrial:    'var(--accent-industrial)',
  agro_ganadero: 'var(--accent-agro)',
};

const NegocioCard = ({ negocio, enUso, esUnicoActivo, onEditar, onDesactivar, onReactivar, onEliminar }) => {
  const [hov, setHov] = useState(false);
  const isAgro = negocio.rubro === 'agro_ganadero';
  const color  = RUBRO_COLOR[negocio.rubro] || 'var(--text-tertiary)';

  return (
    <div
      onMouseEnter={() => setHov(true)}
      onMouseLeave={() => setHov(false)}
      style={{
        display: 'flex', alignItems: 'center', gap: '12px',
        padding: '12px 14px', borderRadius: '8px',
        border: `1px solid ${enUso ? color + '44' : 'var(--border-subtle)'}`,
        background: enUso ? color + '08' : 'var(--bg-tertiary)',
        transition: 'border-color 0.15s',
      }}
    >
      <Icon name={isAgro ? 'cow' : 'building'} size={18} style={{ color, flexShrink: 0 }} />
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: '14px', fontWeight: 500, color: 'var(--text-primary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
          {negocio.nombre}
        </div>
        <div style={{ display: 'flex', gap: '6px', marginTop: '4px', flexWrap: 'wrap' }}>
          <RubroBadge rubro={negocio.rubro} />
          {!negocio.activo && (
            <span style={{ padding: '2px 7px', borderRadius: '4px', fontSize: '11px', fontWeight: 500, color: 'var(--text-tertiary)', background: 'var(--bg-secondary)', border: '1px solid var(--border-subtle)' }}>
              Inactivo
            </span>
          )}
          {enUso && (
            <span style={{ padding: '2px 7px', borderRadius: '4px', fontSize: '11px', fontWeight: 500, color, background: color + '15', border: `1px solid ${color}33` }}>
              ● En uso
            </span>
          )}
        </div>
      </div>
      {(hov || enUso) && (
        <div style={{ display: 'flex', gap: '6px', flexShrink: 0 }}>
          {negocio.activo && (
            <button onClick={() => onEditar(negocio)}
              style={{ padding: '5px 10px', borderRadius: '5px', border: '1px solid var(--border-subtle)', background: 'var(--bg-secondary)', color: 'var(--text-secondary)', fontSize: '12px', cursor: 'pointer', fontFamily: 'var(--font-sans)' }}
              onMouseEnter={e => e.currentTarget.style.color = 'var(--text-primary)'}
              onMouseLeave={e => e.currentTarget.style.color = 'var(--text-secondary)'}
            >Editar</button>
          )}
          {negocio.activo && !enUso && !esUnicoActivo && (
            <button onClick={() => onDesactivar(negocio)}
              style={{ padding: '5px 10px', borderRadius: '5px', border: '1px solid var(--border-subtle)', background: 'var(--bg-secondary)', color: 'var(--accent-warning)', fontSize: '12px', cursor: 'pointer', fontFamily: 'var(--font-sans)' }}
            >Desactivar</button>
          )}
          {!negocio.activo && (
            <>
              <button onClick={() => onReactivar(negocio)}
                style={{ padding: '5px 10px', borderRadius: '5px', border: '1px solid var(--border-subtle)', background: 'var(--bg-secondary)', color: 'var(--accent-success)', fontSize: '12px', cursor: 'pointer', fontFamily: 'var(--font-sans)' }}
              >Reactivar</button>
              <button onClick={() => onEliminar(negocio)}
                style={{ padding: '5px 10px', borderRadius: '5px', border: '1px solid var(--accent-danger)33', background: 'transparent', color: 'var(--accent-danger)', fontSize: '12px', cursor: 'pointer', fontFamily: 'var(--font-sans)' }}
              >Eliminar definitivamente</button>
            </>
          )}
        </div>
      )}
    </div>
  );
};

const NegociosSection = ({ negocioId, loadNegocios, accentColor }) => {
  const [todos, setTodos]               = useState([]);
  const [loadingList, setLoadingList]   = useState(true);
  const [inactivosOpen, setInactivosOpen] = useState(false);
  const [modalCrear, setModalCrear]     = useState(false);
  const [modalEditar, setModalEditar]   = useState(null);   // negocio | null
  const [modalDesact, setModalDesact]   = useState(null);   // negocio | null
  const [modalElim, setModalElim]       = useState(null);   // negocio | null

  const cargarTodos = async () => {
    setLoadingList(true);
    try {
      const data = await apiFetch('/api/negocios?includeInactivos=true');
      setTodos(data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoadingList(false);
    }
  };

  useEffect(() => { cargarTodos(); }, []);

  const refresh = async () => {
    await cargarTodos();
    await loadNegocios();
  };

  const activos   = todos.filter(n => n.activo);
  const inactivos = todos.filter(n => !n.activo);
  const esUnicoActivo = activos.length === 1;

  const handleReactivar = async (negocio) => {
    try {
      await apiFetch(`/api/negocios/${negocio.id}`, {
        method: 'PUT',
        body: JSON.stringify({ activo: true }),
      });
      await refresh();
    } catch (e) {
      console.error(e);
    }
  };

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px' }}>
        <div>
          <div style={{ fontSize: '17px', fontWeight: 500, color: 'var(--text-primary)', marginBottom: '4px' }}>Mis negocios</div>
          <div style={{ fontSize: '13px', color: 'var(--text-tertiary)' }}>Gestioná todos tus negocios registrados.</div>
        </div>
        <Btn accentColor={accentColor} icon="plus" onClick={() => setModalCrear(true)}>Nuevo negocio</Btn>
      </div>

      {loadingList ? (
        <div style={{ fontSize: '13px', color: 'var(--text-tertiary)', padding: '24px 0' }}>Cargando…</div>
      ) : (
        <>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {activos.map(n => (
              <NegocioCard
                key={n.id}
                negocio={n}
                enUso={n.id === negocioId}
                esUnicoActivo={esUnicoActivo}
                onEditar={setModalEditar}
                onDesactivar={setModalDesact}
                onReactivar={handleReactivar}
                onEliminar={setModalElim}
              />
            ))}
          </div>

          {inactivos.length > 0 && (
            <div style={{ marginTop: '20px' }}>
              <button
                onClick={() => setInactivosOpen(o => !o)}
                style={{ display: 'flex', alignItems: 'center', gap: '6px', background: 'transparent', border: 'none', cursor: 'pointer', color: 'var(--text-tertiary)', fontSize: '12px', fontFamily: 'var(--font-sans)', padding: '4px 0', marginBottom: '8px' }}
              >
                <Icon name={inactivosOpen ? 'chevronDown' : 'chevronRight'} size={13} />
                Inactivos ({inactivos.length})
              </button>
              {inactivosOpen && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {inactivos.map(n => (
                    <NegocioCard
                      key={n.id}
                      negocio={n}
                      enUso={false}
                      esUnicoActivo={false}
                      onEditar={setModalEditar}
                      onDesactivar={setModalDesact}
                      onReactivar={handleReactivar}
                      onEliminar={setModalElim}
                    />
                  ))}
                </div>
              )}
            </div>
          )}
        </>
      )}

      {modalCrear  && <ModalCrear  accentColor={accentColor} onClose={() => setModalCrear(false)}  onDone={refresh} />}
      {modalEditar && <ModalEditar accentColor={accentColor} negocio={modalEditar} onClose={() => setModalEditar(null)} onDone={refresh} />}
      {modalDesact && <ModalDesactivar accentColor={accentColor} negocio={modalDesact} onClose={() => setModalDesact(null)} onDone={refresh} />}
      {modalElim   && <ModalEliminar   accentColor={accentColor} negocio={modalElim}   onClose={() => setModalElim(null)}   onDone={refresh} />}
    </div>
  );
};
```

También agregar la importación de `apiFetch` y `useEffect` / `useState` al tope del archivo si no están ya:
```javascript
import React, { useState, useEffect } from 'react';
import { apiFetch } from '../config/api.js';
```

- [ ] **Step 3: Verificar que "Mis negocios" aparece en el menú de Configuración (sin modales aún)**

Abrir la app en el browser, ir a Configuración, verificar que aparece la sub-sección "Mis negocios" con la lista de negocios. Los botones de modales pueden mostrar errores en consola porque los componentes de modal aún no existen — es esperado.

- [ ] **Step 4: Commit**

```bash
git add frontend/src/pages/Configuracion.jsx
git commit -m "feat: Configuracion — sub-menu Mis negocios + NegocioCard + NegociosSection skeleton"
```

---

## Task 5: Frontend — ModalCrear

**Files:**
- Modify: `frontend/src/pages/Configuracion.jsx`

- [ ] **Step 1: Insertar el componente ModalCrear antes de NegocioCard**

```javascript
const Overlay = ({ children }) => (
  <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.55)', zIndex: 400, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
    <div style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border-mid)', borderRadius: '10px', width: '480px', maxHeight: '85vh', overflowY: 'auto', boxShadow: 'var(--shadow-lg)' }}>
      {children}
    </div>
  </div>
);

const ModalHeader = ({ title, onClose }) => (
  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '18px 20px', borderBottom: '1px solid var(--border-subtle)' }}>
    <span style={{ fontSize: '15px', fontWeight: 500, color: 'var(--text-primary)' }}>{title}</span>
    <button onClick={onClose} style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: 'var(--text-tertiary)', display: 'flex', alignItems: 'center' }}>
      <Icon name="x" size={16} />
    </button>
  </div>
);

const ModalCrear = ({ accentColor, onClose, onDone }) => {
  const [nombre,    setNombre]    = useState('');
  const [rubro,     setRubro]     = useState('industrial');
  const [plantilla, setPlantilla] = useState('');
  const [moneda,    setMoneda]    = useState('BOB');
  const [loading,   setLoading]   = useState(false);
  const [error,     setError]     = useState('');

  const plantillasDisponibles = [
    { value: '', label: 'Sin plantilla' },
    ...(PLANTILLAS_POR_RUBRO[rubro] || []),
  ];

  const handleRubroChange = (nuevoRubro) => {
    setRubro(nuevoRubro);
    setPlantilla('');
  };

  const handleSubmit = async () => {
    if (!nombre.trim()) { setError('El nombre es requerido.'); return; }
    setLoading(true); setError('');
    try {
      await apiFetch('/api/negocios', {
        method: 'POST',
        body: JSON.stringify({ nombre: nombre.trim(), rubro, plantilla: plantilla || null, moneda }),
      });
      onDone();
      onClose();
    } catch (e) {
      setError(e?.error || 'Error al crear el negocio.');
    } finally {
      setLoading(false);
    }
  };

  const inputStyle = {
    background: 'var(--bg-tertiary)', border: '1px solid var(--border-subtle)',
    borderRadius: '6px', color: 'var(--text-primary)', padding: '8px 12px',
    fontSize: '14px', outline: 'none', fontFamily: 'var(--font-sans)', width: '100%',
  };

  return (
    <Overlay>
      <ModalHeader title="Nuevo negocio" onClose={onClose} />
      <div style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
        <div>
          <label style={{ fontSize: '11px', color: 'var(--text-tertiary)', fontWeight: 500, letterSpacing: '0.07em', textTransform: 'uppercase', display: 'block', marginBottom: '6px' }}>Nombre</label>
          <input value={nombre} onChange={e => setNombre(e.target.value)} placeholder="Ej: Fábrica de quesos El Valle" style={inputStyle}
            onFocus={e => e.target.style.borderColor = accentColor}
            onBlur={e => e.target.style.borderColor = 'var(--border-subtle)'}
          />
        </div>

        <div>
          <label style={{ fontSize: '11px', color: 'var(--text-tertiary)', fontWeight: 500, letterSpacing: '0.07em', textTransform: 'uppercase', display: 'block', marginBottom: '8px' }}>Rubro</label>
          <div style={{ display: 'flex', gap: '8px' }}>
            {[{ value: 'industrial', label: 'Industrial' }, { value: 'agro_ganadero', label: 'Agro-ganadero' }].map(r => (
              <button key={r.value} onClick={() => handleRubroChange(r.value)} style={{
                padding: '7px 16px', borderRadius: '6px', cursor: 'pointer', fontFamily: 'var(--font-sans)', fontSize: '13px',
                border: `1px solid ${rubro === r.value ? accentColor : 'var(--border-subtle)'}`,
                background: rubro === r.value ? accentColor + '1A' : 'var(--bg-tertiary)',
                color: rubro === r.value ? accentColor : 'var(--text-secondary)',
                fontWeight: rubro === r.value ? 500 : 400,
              }}>{r.label}</button>
            ))}
          </div>
        </div>

        <div>
          <label style={{ fontSize: '11px', color: 'var(--text-tertiary)', fontWeight: 500, letterSpacing: '0.07em', textTransform: 'uppercase', display: 'block', marginBottom: '8px' }}>Plantilla inicial</label>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
            {plantillasDisponibles.map(p => (
              <button key={p.value} onClick={() => setPlantilla(p.value)} style={{
                padding: '7px 16px', borderRadius: '6px', cursor: 'pointer', fontFamily: 'var(--font-sans)', fontSize: '13px',
                border: `1px solid ${plantilla === p.value ? accentColor : 'var(--border-subtle)'}`,
                background: plantilla === p.value ? accentColor + '1A' : 'var(--bg-tertiary)',
                color: plantilla === p.value ? accentColor : 'var(--text-secondary)',
                fontWeight: plantilla === p.value ? 500 : 400,
              }}>{p.label}</button>
            ))}
          </div>
        </div>

        <div>
          <label style={{ fontSize: '11px', color: 'var(--text-tertiary)', fontWeight: 500, letterSpacing: '0.07em', textTransform: 'uppercase', display: 'block', marginBottom: '6px' }}>Moneda</label>
          <select value={moneda} onChange={e => setMoneda(e.target.value)} style={{ ...inputStyle, width: '140px', cursor: 'pointer' }}>
            {MONEDAS_OPTS.map(m => <option key={m} value={m}>{m}</option>)}
          </select>
        </div>

        {error && <div style={{ fontSize: '13px', color: 'var(--accent-danger)', padding: '8px 12px', background: 'var(--accent-danger)10', borderRadius: '6px' }}>{error}</div>}
      </div>
      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', padding: '12px 20px', borderTop: '1px solid var(--border-subtle)' }}>
        <Btn variant="secondary" onClick={onClose} disabled={loading}>Cancelar</Btn>
        <Btn accentColor={accentColor} onClick={handleSubmit} disabled={loading} icon={loading ? 'loader' : 'check'}>
          {loading ? 'Creando…' : 'Crear negocio'}
        </Btn>
      </div>
    </Overlay>
  );
};
```

- [ ] **Step 2: Verificar el modal en el browser**

Ir a Configuración → Mis negocios → click "Nuevo negocio". El modal debe abrirse, cambiar el rubro debe cambiar las plantillas disponibles, y crear un negocio válido debe cerrarlo y refrescar la lista.

- [ ] **Step 3: Commit**

```bash
git add frontend/src/pages/Configuracion.jsx
git commit -m "feat: ModalCrear negocio con rubro, plantilla y moneda"
```

---

## Task 6: Frontend — ModalEditar

**Files:**
- Modify: `frontend/src/pages/Configuracion.jsx`

- [ ] **Step 1: Insertar ModalEditar justo antes de ModalCrear**

```javascript
const ModalEditar = ({ accentColor, negocio, onClose, onDone }) => {
  const [nombre,  setNombre]  = useState(negocio.nombre);
  const [moneda,  setMoneda]  = useState(negocio.moneda || 'BOB');
  const [loading, setLoading] = useState(false);
  const [error,   setError]   = useState('');

  const handleSubmit = async () => {
    if (!nombre.trim()) { setError('El nombre es requerido.'); return; }
    setLoading(true); setError('');
    try {
      await apiFetch(`/api/negocios/${negocio.id}`, {
        method: 'PUT',
        body: JSON.stringify({ nombre: nombre.trim(), moneda }),
      });
      onDone();
      onClose();
    } catch (e) {
      setError(e?.error || 'Error al guardar.');
    } finally {
      setLoading(false);
    }
  };

  const inputStyle = {
    background: 'var(--bg-tertiary)', border: '1px solid var(--border-subtle)',
    borderRadius: '6px', color: 'var(--text-primary)', padding: '8px 12px',
    fontSize: '14px', outline: 'none', fontFamily: 'var(--font-sans)', width: '100%',
  };

  return (
    <Overlay>
      <ModalHeader title="Editar negocio" onClose={onClose} />
      <div style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
        <div>
          <label style={{ fontSize: '11px', color: 'var(--text-tertiary)', fontWeight: 500, letterSpacing: '0.07em', textTransform: 'uppercase', display: 'block', marginBottom: '6px' }}>Nombre</label>
          <input value={nombre} onChange={e => setNombre(e.target.value)} style={inputStyle}
            onFocus={e => e.target.style.borderColor = accentColor}
            onBlur={e => e.target.style.borderColor = 'var(--border-subtle)'}
          />
        </div>
        <div>
          <label style={{ fontSize: '11px', color: 'var(--text-tertiary)', fontWeight: 500, letterSpacing: '0.07em', textTransform: 'uppercase', display: 'block', marginBottom: '6px' }}>Moneda</label>
          <select value={moneda} onChange={e => setMoneda(e.target.value)} style={{ ...inputStyle, width: '140px', cursor: 'pointer' }}>
            {MONEDAS_OPTS.map(m => <option key={m} value={m}>{m}</option>)}
          </select>
        </div>
        {error && <div style={{ fontSize: '13px', color: 'var(--accent-danger)', padding: '8px 12px', background: 'var(--accent-danger)10', borderRadius: '6px' }}>{error}</div>}
      </div>
      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', padding: '12px 20px', borderTop: '1px solid var(--border-subtle)' }}>
        <Btn variant="secondary" onClick={onClose} disabled={loading}>Cancelar</Btn>
        <Btn accentColor={accentColor} onClick={handleSubmit} disabled={loading} icon={loading ? 'loader' : 'save'}>
          {loading ? 'Guardando…' : 'Guardar cambios'}
        </Btn>
      </div>
    </Overlay>
  );
};
```

- [ ] **Step 2: Verificar en browser**

Click "Editar" en una card → modal pre-cargado con nombre y moneda actuales → guardar → lista se actualiza.

- [ ] **Step 3: Commit**

```bash
git add frontend/src/pages/Configuracion.jsx
git commit -m "feat: ModalEditar negocio (nombre + moneda)"
```

---

## Task 7: Frontend — ModalDesactivar y ModalEliminar

**Files:**
- Modify: `frontend/src/pages/Configuracion.jsx`

- [ ] **Step 1: Insertar ModalDesactivar justo antes de ModalEditar**

```javascript
const ModalDesactivar = ({ accentColor, negocio, onClose, onDone }) => {
  const [loading, setLoading] = useState(false);
  const [error,   setError]   = useState('');

  const handleConfirmar = async () => {
    setLoading(true); setError('');
    try {
      await apiFetch(`/api/negocios/${negocio.id}/desactivar`, { method: 'PATCH' });
      onDone();
      onClose();
    } catch (e) {
      setError(e?.error || 'Error al desactivar.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Overlay>
      <ModalHeader title="Desactivar negocio" onClose={onClose} />
      <div style={{ padding: '20px 20px 8px' }}>
        <p style={{ fontSize: '14px', color: 'var(--text-secondary)', lineHeight: 1.6, margin: 0 }}>
          Esto ocultará <strong style={{ color: 'var(--text-primary)' }}>{negocio.nombre}</strong> del selector de negocios.
          Sus datos se conservan y podrás reactivarlo después.
        </p>
        {error && <div style={{ fontSize: '13px', color: 'var(--accent-danger)', padding: '8px 12px', background: 'var(--accent-danger)10', borderRadius: '6px', marginTop: '12px' }}>{error}</div>}
      </div>
      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', padding: '16px 20px', borderTop: '1px solid var(--border-subtle)' }}>
        <Btn variant="secondary" onClick={onClose} disabled={loading}>Cancelar</Btn>
        <Btn accentColor="var(--accent-danger)" onClick={handleConfirmar} disabled={loading} icon={loading ? 'loader' : 'eyeOff'}>
          {loading ? 'Desactivando…' : 'Desactivar'}
        </Btn>
      </div>
    </Overlay>
  );
};
```

- [ ] **Step 2: Insertar ModalEliminar justo después de ModalDesactivar**

```javascript
const ModalEliminar = ({ accentColor, negocio, onClose, onDone }) => {
  const [confirmText, setConfirmText] = useState('');
  const [loading,     setLoading]     = useState(false);
  const [error,       setError]       = useState('');
  const puedeEliminar = confirmText.trim() === negocio.nombre.trim();

  const handleEliminar = async () => {
    if (!puedeEliminar) return;
    setLoading(true); setError('');
    try {
      await apiFetch(`/api/negocios/${negocio.id}`, { method: 'DELETE' });
      onDone();
      onClose();
    } catch (e) {
      setError(e?.error || 'Error al eliminar.');
    } finally {
      setLoading(false);
    }
  };

  const inputStyle = {
    background: 'var(--bg-tertiary)', border: '1px solid var(--border-subtle)',
    borderRadius: '6px', color: 'var(--text-primary)', padding: '8px 12px',
    fontSize: '14px', outline: 'none', fontFamily: 'var(--font-sans)', width: '100%',
  };

  return (
    <Overlay>
      <ModalHeader title="Eliminar definitivamente" onClose={onClose} />
      <div style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
        <div style={{ padding: '12px', background: 'var(--accent-danger)0D', border: '1px solid var(--accent-danger)33', borderRadius: '6px' }}>
          <p style={{ fontSize: '13px', color: 'var(--accent-danger)', margin: 0, lineHeight: 1.6 }}>
            Esta acción es <strong>irreversible</strong>. Se eliminarán todos los insumos, productos,
            lotes y fichas de <strong>{negocio.nombre}</strong>.
          </p>
        </div>
        <div>
          <label style={{ fontSize: '12px', color: 'var(--text-secondary)', display: 'block', marginBottom: '6px' }}>
            Escribí el nombre del negocio para confirmar:
          </label>
          <input
            value={confirmText}
            onChange={e => setConfirmText(e.target.value)}
            placeholder={negocio.nombre}
            style={inputStyle}
            onFocus={e => e.target.style.borderColor = 'var(--accent-danger)'}
            onBlur={e => e.target.style.borderColor = 'var(--border-subtle)'}
          />
        </div>
        {error && <div style={{ fontSize: '13px', color: 'var(--accent-danger)', padding: '8px 12px', background: 'var(--accent-danger)10', borderRadius: '6px' }}>{error}</div>}
      </div>
      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', padding: '12px 20px', borderTop: '1px solid var(--border-subtle)' }}>
        <Btn variant="secondary" onClick={onClose} disabled={loading}>Cancelar</Btn>
        <Btn
          accentColor="var(--accent-danger)"
          onClick={handleEliminar}
          disabled={!puedeEliminar || loading}
          icon={loading ? 'loader' : 'trash'}
        >
          {loading ? 'Eliminando…' : 'Eliminar definitivamente'}
        </Btn>
      </div>
    </Overlay>
  );
};
```

- [ ] **Step 3: Verificar en browser**

- "Desactivar" en una card activa (no en uso, no única) → modal de advertencia → confirmar → negocio pasa a sección Inactivos.
- "Eliminar definitivamente" en una card inactiva → campo de texto → escribir nombre exacto → botón se habilita → confirmar → negocio desaparece de la lista.
- Intentar eliminar un negocio activo vía API directa (curl) → debe recibir 409.

- [ ] **Step 4: Commit**

```bash
git add frontend/src/pages/Configuracion.jsx
git commit -m "feat: ModalDesactivar y ModalEliminar definitivamente con confirmación por nombre"
```

---

## Task 8: Verificación final integral

- [ ] **Step 1: Smoke test — flujo completo crear**

1. Ir a Configuración → Mis negocios
2. Click "Nuevo negocio"
3. Nombre: "Test Agro", Rubro: Agro-ganadero, Plantilla: Engorde bovino, Moneda: BOB
4. Click "Crear negocio"
5. Verificar que el nuevo negocio aparece en la lista Y en el selector del sidebar

- [ ] **Step 2: Smoke test — editar**

1. Click "Editar" en cualquier negocio activo
2. Cambiar nombre → Guardar → verificar que el cambio se refleja en la card Y en el NegocioSelector del sidebar

- [ ] **Step 3: Smoke test — desactivar y reactivar**

1. Click "Desactivar" en un negocio activo que NO esté en uso
2. Confirmar → negocio pasa a sección "Inactivos"
3. Abrir sección Inactivos → click "Reactivar" → negocio vuelve a sección activos

- [ ] **Step 4: Smoke test — desactivar negocio activo en uso**

1. Asegurar que solo hay un negocio activo en uso (no debe mostrar botón Desactivar)
2. Verificar que si hay dos negocios activos, al desactivar el que está "En uso", el sistema cambia automáticamente al otro

- [ ] **Step 5: Smoke test — eliminar definitivamente**

1. Con un negocio en estado Inactivo, click "Eliminar definitivamente"
2. Escribir el nombre incorrecto → botón deshabilitado
3. Escribir el nombre exacto → botón se habilita → confirmar → desaparece de la lista

- [ ] **Step 6: Commit final**

```bash
git add -A
git commit -m "feat: gestión de negocios en Configuración — completo"
```
