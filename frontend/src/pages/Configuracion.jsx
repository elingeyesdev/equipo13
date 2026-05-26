import React, { useState, useEffect } from 'react';
import { Icon } from '../icons.jsx';
import { useTheme } from '../layouts/AppLayout.jsx';
import { Btn, RubroBadge } from '../components/ui.jsx';
import { apiFetch } from '../config/api.js';

const MONEDAS = ['BOB (Bs)', 'USD ($)', 'ARS ($)', 'PEN (S/)'];
const MONEDAS_OPTS = ['BOB', 'USD', 'ARS', 'PEN'];

const PLANTILLAS_POR_RUBRO = {
  industrial:    [{ value: 'industria_lactea', label: 'Industria láctea' }],
  agro_ganadero: [{ value: 'engorde_porcino', label: 'Engorde porcino bajo confinamiento' }],
};

const RUBRO_COLOR = {
  industrial:    'var(--accent-industrial)',
  agro_ganadero: 'var(--accent-agro)',
};

/* ── Helpers de UI ──────────────────────────────────────────── */

const SubMenuItem = ({ item, active, onClick, accentColor }) => (
  <button onClick={onClick} style={{
    display: 'flex', alignItems: 'center', gap: '10px',
    padding: '9px 12px', borderRadius: '6px', width: '100%',
    border: 'none', cursor: 'pointer', fontSize: '13px',
    background: active ? accentColor + '18' : 'transparent',
    color: active ? accentColor : 'var(--text-secondary)',
    fontFamily: 'var(--font-sans)', fontWeight: active ? 500 : 400,
    transition: 'all 0.15s', textAlign: 'left',
  }}
    onMouseEnter={e => { if (!active) e.currentTarget.style.background = 'var(--bg-tertiary)'; }}
    onMouseLeave={e => { if (!active) e.currentTarget.style.background = 'transparent'; }}
  >
    <Icon name={item.icon} size={14} style={{ flexShrink: 0 }} />
    {item.label}
  </button>
);

const FieldRow = ({ label, children, hint }) => (
  <div style={{ display: 'grid', gridTemplateColumns: '180px 1fr', gap: '20px', alignItems: 'flex-start', padding: '16px 0', borderBottom: '1px solid var(--border-subtle)' }}>
    <div>
      <div style={{ fontSize: '13px', color: 'var(--text-primary)', fontWeight: 500, marginBottom: '3px' }}>{label}</div>
      {hint && <div style={{ fontSize: '12px', color: 'var(--text-tertiary)', lineHeight: 1.4 }}>{hint}</div>}
    </div>
    {children}
  </div>
);

/* ── Overlay y ModalHeader compartidos ─────────────────────── */

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

/* ── ModalDesactivar ────────────────────────────────────────── */

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
        <Btn accentColor="var(--accent-danger)" onClick={handleConfirmar} disabled={loading}>
          {loading ? 'Desactivando…' : 'Desactivar'}
        </Btn>
      </div>
    </Overlay>
  );
};

/* ── ModalEliminar ──────────────────────────────────────────── */

const ModalEliminar = ({ negocio, onClose, onDone }) => {
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
          icon="trash"
        >
          {loading ? 'Eliminando…' : 'Eliminar definitivamente'}
        </Btn>
      </div>
    </Overlay>
  );
};

/* ── ModalEditar ────────────────────────────────────────────── */

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
        <Btn accentColor={accentColor} onClick={handleSubmit} disabled={loading} icon="save">
          {loading ? 'Guardando…' : 'Guardar cambios'}
        </Btn>
      </div>
    </Overlay>
  );
};

/* ── ModalCrear ─────────────────────────────────────────────── */

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
        <Btn accentColor={accentColor} onClick={handleSubmit} disabled={loading} icon="check">
          {loading ? 'Creando…' : 'Crear negocio'}
        </Btn>
      </div>
    </Overlay>
  );
};

/* ── NegocioCard ────────────────────────────────────────────── */

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

/* ── NegociosSection ────────────────────────────────────────── */

const NegociosSection = ({ negocioId, loadNegocios, accentColor }) => {
  const [todos, setTodos]                 = useState([]);
  const [loadingList, setLoadingList]     = useState(true);
  const [inactivosOpen, setInactivosOpen] = useState(false);
  const [modalCrear, setModalCrear]       = useState(false);
  const [modalEditar, setModalEditar]     = useState(null);
  const [modalDesact, setModalDesact]     = useState(null);
  const [modalElim, setModalElim]         = useState(null);

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

  const activos       = todos.filter(n => n.activo);
  const inactivos     = todos.filter(n => !n.activo);
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

      {modalCrear  && <ModalCrear      accentColor={accentColor} onClose={() => setModalCrear(false)}  onDone={refresh} />}
      {modalEditar && <ModalEditar     accentColor={accentColor} negocio={modalEditar} onClose={() => setModalEditar(null)} onDone={refresh} />}
      {modalDesact && <ModalDesactivar accentColor={accentColor} negocio={modalDesact} onClose={() => setModalDesact(null)} onDone={refresh} />}
      {modalElim   && <ModalEliminar   negocio={modalElim}       onClose={() => setModalElim(null)}     onDone={refresh} />}
    </div>
  );
};

/* ── Configuracion ──────────────────────────────────────────── */

const Configuracion = ({ negocioId, onNavigate, user, negocios = [], loadNegocios }) => {
  const negocio = negocios.find(n => n.id === negocioId) || { id: negocioId, nombre: 'Mi negocio', rubro: 'industrial' };
  const isAgro = negocio.rubro === 'agro_ganadero';
  const accentColor = isAgro ? 'var(--accent-agro)' : 'var(--accent-industrial)';
  const [subPage, setSubPage] = useState('negocios');
  const [theme, toggleTheme] = useTheme();
  const [nombre, setNombre] = useState(negocio.nombre);
  const [moneda, setMoneda] = useState('BOB (Bs)');

  useEffect(() => {
    setNombre(negocio.nombre);
  }, [negocio.nombre]);

  const SUB_MENU = [
    { id: 'negocios',   label: 'Mis negocios',      icon: 'building'    },
    { id: 'datos',      label: 'Datos del negocio',  icon: 'building'    },
    { id: 'unidades',   label: 'Unidades de medida', icon: 'ruler'       },
    { id: 'categorias', label: 'Categorías',          icon: 'tag'         },
    { id: 'apariencia', label: 'Apariencia',          icon: 'eye'         },
    { id: 'cuenta',     label: 'Mi cuenta',           icon: 'user'        },
  ];

  const renderContent = () => {
    if (subPage === 'negocios') return (
      <NegociosSection
        negocioId={negocioId}
        loadNegocios={loadNegocios}
        accentColor={accentColor}
      />
    );

    if (subPage === 'datos') return (
      <div>
        <div style={{ marginBottom: '24px' }}>
          <div style={{ fontSize: '17px', fontWeight: 500, color: 'var(--text-primary)', marginBottom: '4px' }}>Datos del negocio</div>
          <div style={{ fontSize: '13px', color: 'var(--text-tertiary)' }}>Información general de tu empresa o emprendimiento.</div>
        </div>
        <FieldRow label="Nombre del negocio" hint="Aparece en todos los reportes y documentos.">
          <input value={nombre} onChange={e => setNombre(e.target.value)}
            style={{ background: 'var(--bg-tertiary)', border: '1px solid var(--border-subtle)', borderRadius: '6px', color: 'var(--text-primary)', padding: '8px 12px', fontSize: '14px', outline: 'none', fontFamily: 'var(--font-sans)', width: '100%' }}
            onFocus={e => e.target.style.borderColor = accentColor} onBlur={e => e.target.style.borderColor = 'var(--border-subtle)'}
          />
        </FieldRow>
        <FieldRow label="Rubro" hint="Para cambiar el rubro, creá un nuevo negocio.">
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <RubroBadge rubro={negocio.rubro} />
            <div style={{ display: 'flex', alignItems: 'center', gap: '5px', color: 'var(--text-tertiary)', fontSize: '12px' }}>
              <Icon name="lock" size={13} />
              No modificable
            </div>
          </div>
        </FieldRow>
        <FieldRow label="Moneda" hint="Símbolo que aparece en todos los valores.">
          <select value={moneda} onChange={e => setMoneda(e.target.value)} style={{ width: '180px' }}>
            {MONEDAS.map(m => <option key={m}>{m}</option>)}
          </select>
        </FieldRow>
        <div style={{ marginTop: '24px', display: 'flex', justifyContent: 'flex-end' }}>
          <Btn accentColor={accentColor} icon="save">Guardar cambios</Btn>
        </div>
      </div>
    );

    if (subPage === 'unidades') return (
      <div>
        <div style={{ marginBottom: '20px' }}>
          <div style={{ fontSize: '17px', fontWeight: 500, color: 'var(--text-primary)', marginBottom: '4px' }}>Unidades de medida</div>
          <div style={{ fontSize: '13px', color: 'var(--text-tertiary)' }}>Gestioná las unidades usadas en insumos y productos.</div>
        </div>
        <Btn accentColor={accentColor} icon="arrowRight" onClick={() => onNavigate('unidades')}>Ir a Unidades de medida</Btn>
      </div>
    );

    if (subPage === 'categorias') return (
      <div>
        <div style={{ marginBottom: '20px' }}>
          <div style={{ fontSize: '17px', fontWeight: 500, color: 'var(--text-primary)', marginBottom: '4px' }}>Categorías de insumos</div>
          <div style={{ fontSize: '13px', color: 'var(--text-tertiary)' }}>Organizá tus insumos en categorías con colores.</div>
        </div>
        <Btn accentColor={accentColor} icon="arrowRight" onClick={() => onNavigate('categorias')}>Ir a Categorías</Btn>
      </div>
    );

    if (subPage === 'apariencia') return (
      <div>
        <div style={{ marginBottom: '24px' }}>
          <div style={{ fontSize: '17px', fontWeight: 500, color: 'var(--text-primary)', marginBottom: '4px' }}>Apariencia</div>
          <div style={{ fontSize: '13px', color: 'var(--text-tertiary)' }}>Ajustá el aspecto visual del sistema.</div>
        </div>
        <FieldRow label="Tema de color" hint="El tema oscuro es más cómodo para sesiones largas de trabajo.">
          <div style={{ display: 'flex', gap: '10px' }}>
            {['dark', 'light'].map(t => (
              <button key={t} onClick={() => { if (theme !== t) toggleTheme(); }} style={{
                padding: '12px 20px', borderRadius: '8px', cursor: 'pointer', border: `2px solid ${theme === t ? accentColor : 'var(--border-subtle)'}`,
                background: theme === t ? accentColor + '12' : 'var(--bg-tertiary)',
                display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px',
                fontFamily: 'var(--font-sans)', transition: 'all 0.15s',
              }}>
                <Icon name={t === 'dark' ? 'moon' : 'sun'} size={20} style={{ color: theme === t ? accentColor : 'var(--text-tertiary)' }} />
                <span style={{ fontSize: '12px', color: theme === t ? accentColor : 'var(--text-secondary)', fontWeight: theme === t ? 500 : 400 }}>
                  {t === 'dark' ? 'Oscuro' : 'Claro'}
                </span>
                {theme === t && <span style={{ fontSize: '10px', color: accentColor }}>● Activo</span>}
              </button>
            ))}
          </div>
        </FieldRow>
      </div>
    );

    if (subPage === 'cuenta') return (
      <div>
        <div style={{ marginBottom: '24px' }}>
          <div style={{ fontSize: '17px', fontWeight: 500, color: 'var(--text-primary)', marginBottom: '4px' }}>Mi cuenta</div>
          <div style={{ fontSize: '13px', color: 'var(--text-tertiary)' }}>Información personal y seguridad.</div>
        </div>
        <FieldRow label="Nombre completo">
          <input defaultValue={user?.nombre || ''} style={{ background: 'var(--bg-tertiary)', border: '1px solid var(--border-subtle)', borderRadius: '6px', color: 'var(--text-primary)', padding: '8px 12px', fontSize: '14px', outline: 'none', fontFamily: 'var(--font-sans)', width: '100%' }}
            onFocus={e => e.target.style.borderColor = accentColor} onBlur={e => e.target.style.borderColor = 'var(--border-subtle)'}
          />
        </FieldRow>
        <FieldRow label="Email">
          <input defaultValue={user?.email || ''} disabled style={{ opacity: 0.7, background: 'var(--bg-tertiary)', border: '1px solid var(--border-subtle)', borderRadius: '6px', color: 'var(--text-primary)', padding: '8px 12px', fontSize: '14px', outline: 'none', fontFamily: 'var(--font-sans)', width: '100%' }}
            onFocus={e => e.target.style.borderColor = accentColor} onBlur={e => e.target.style.borderColor = 'var(--border-subtle)'}
          />
        </FieldRow>
        <div style={{ marginTop: '28px', background: 'var(--bg-secondary)', border: '1px solid var(--border-subtle)', borderRadius: '8px', padding: '20px 24px', display: 'flex', alignItems: 'flex-start', gap: '16px' }}>
          <div style={{ color: 'var(--text-tertiary)', flexShrink: 0 }}><Icon name="lock" size={20} /></div>
          <div style={{ flex: 1 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '8px' }}>
              <span style={{ fontSize: '14px', fontWeight: 500, color: 'var(--text-primary)' }}>Roles y permisos</span>
              <span style={{ padding: '2px 8px', borderRadius: '4px', fontSize: '11px', fontWeight: 600, color: 'var(--accent-warning)', background: 'var(--accent-warning)18', border: '1px solid var(--accent-warning)33', letterSpacing: '0.05em' }}>EN DESARROLLO</span>
            </div>
            <p style={{ fontSize: '13px', color: 'var(--text-secondary)', lineHeight: 1.6 }}>
              Próximamente podrás invitar operarios y asignarles acceso solo a registro de gastos y diario de producción.
            </p>
          </div>
        </div>
      </div>
    );

    return null;
  };

  return (
    <div style={{ display: 'flex', gap: '28px' }}>
      <div style={{ width: '200px', flexShrink: 0 }}>
        <div style={{ fontSize: '11px', color: 'var(--text-tertiary)', letterSpacing: '0.07em', textTransform: 'uppercase', marginBottom: '10px', paddingLeft: '12px' }}>Configuración</div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
          {SUB_MENU.map(item => <SubMenuItem key={item.id} item={item} active={subPage === item.id} onClick={() => setSubPage(item.id)} accentColor={accentColor} />)}
        </div>
      </div>
      <div style={{ flex: 1, background: 'var(--bg-secondary)', border: '1px solid var(--border-subtle)', borderRadius: '8px', padding: '24px 28px' }}>
        {renderContent()}
      </div>
    </div>
  );
};

export default Configuracion;
