import React, { useState } from 'react';
import { Icon } from '../icons.jsx';
import { StatusBadge, Btn } from '../components/ui.jsx';
import { apiFetch } from '../config/api.js';

const UNIDADES_INIT = [
  { id: 'u1', nombre: 'Kilogramo',  simbolo: 'kg',  tipo: 'Peso'     },
  { id: 'u2', nombre: 'Gramo',      simbolo: 'g',   tipo: 'Peso'     },
  { id: 'u3', nombre: 'Litro',      simbolo: 'L',   tipo: 'Volumen'  },
  { id: 'u4', nombre: 'Mililitro',  simbolo: 'ml',  tipo: 'Volumen'  },
  { id: 'u5', nombre: 'Unidad',     simbolo: 'u',   tipo: 'Cantidad' },
  { id: 'u6', nombre: 'Docena',     simbolo: 'doc', tipo: 'Cantidad' },
  { id: 'u7', nombre: 'Caja',       simbolo: 'caja',tipo: 'Cantidad' },
  { id: 'u8', nombre: 'Metro',      simbolo: 'm',   tipo: 'Longitud' },
];
const EQUIV_INIT = [
  { id: 'e1', de: 'kg',  a: 'g',  factor: 1000, ejemplo: '1 kg = 1,000 g'  },
  { id: 'e2', de: 'L',   a: 'ml', factor: 1000, ejemplo: '1 L = 1,000 ml' },
  { id: 'e3', de: 'doc', a: 'u',  factor: 12,   ejemplo: '1 doc = 12 u'    },
];

const TIPOS = ['Peso', 'Volumen', 'Cantidad', 'Longitud', 'Otro'];
const TIPO_COLORS = { Peso: 'var(--accent-industrial)', Volumen: 'var(--accent-agro)', Cantidad: 'var(--accent-warning)', Longitud: '#8B5CF6', Otro: 'var(--text-tertiary)' };

const Unidades = ({ negocioId }) => {
  const negocio = { id: negocioId, nombre: 'Mi negocio', rubro: 'industrial' };
  const accentColor = negocio.rubro === 'agro_ganadero' ? 'var(--accent-agro)' : 'var(--accent-industrial)';
  const [unidades, setUnidades] = useState([]);
  const [equiv, setEquiv] = useState(EQUIV_INIT);
  const [newU, setNewU] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const cargarUnidades = async () => {
    if (!negocioId) return;
    setLoading(true);
    setError('');
    try {
      const data = await apiFetch(`/api/negocios/${negocioId}/unidades`);
      setUnidades(data);
    } catch (e) {
      setError(e?.error || 'No se pudo cargar unidades');
    } finally {
      setLoading(false);
    }
  };

  React.useEffect(() => {
    cargarUnidades();
  }, [negocioId]);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '28px' }}>
      <h1 style={{ fontSize: '22px', fontWeight: 400, color: 'var(--text-primary)', letterSpacing: '-0.02em' }}>Configuración de Unidades</h1>
      {error && <div style={{ color: 'var(--accent-danger)', fontSize: '13px' }}>{error}</div>}

      {/* Unidades */}
      <div style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border-subtle)', borderRadius: '8px', overflow: 'hidden' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '14px 20px', borderBottom: '1px solid var(--border-subtle)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <span style={{ fontSize: '11px', fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase', color: accentColor }}>Unidades de medida</span>
            <span style={{ fontFamily: 'var(--font-mono)', fontSize: '11px', color: 'var(--text-tertiary)' }}>{unidades.length}</span>
          </div>
          <Btn variant="ghost" size="sm" icon="plus" accentColor={accentColor} onClick={() => setNewU({ nombre: '', simbolo: '', tipo: 'Peso' })}>Nueva unidad</Btn>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 100px 120px 80px', padding: '8px 20px', borderBottom: '1px solid var(--border-subtle)', gap: '12px' }}>
          {['Nombre', 'Símbolo', 'Tipo', ''].map((h, i) => (
            <div key={i} style={{ fontSize: '11px', color: 'var(--text-tertiary)', fontWeight: 500, letterSpacing: '0.05em' }}>{h}</div>
          ))}
        </div>
        {loading && (
          <div style={{ padding: '28px 20px', color: 'var(--text-tertiary)', fontSize: '13px' }}>
            Cargando unidades...
          </div>
        )}

        {!loading && unidades.map((u, i) => (
          <div key={u.id} style={{ display: 'grid', gridTemplateColumns: '1fr 100px 120px 80px', padding: '11px 20px', borderBottom: i < unidades.length - 1 ? '1px solid var(--border-subtle)' : 'none', gap: '12px', alignItems: 'center', transition: 'background 0.1s' }}
            onMouseEnter={e => e.currentTarget.style.background = 'var(--bg-tertiary)'}
            onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
          >
            <span style={{ fontSize: '13px', color: 'var(--text-primary)' }}>{u.nombre}</span>
            <span style={{ fontFamily: 'var(--font-mono)', fontSize: '13px', color: 'var(--text-secondary)' }}>{u.simbolo}</span>
            <StatusBadge label={u.tipo} color={TIPO_COLORS[u.tipo] || 'var(--text-tertiary)'} />
            <div style={{ display: 'flex', gap: '4px' }}>
              <button onClick={() => setNewU(u)} style={{ background: 'transparent', border: 'none', color: 'var(--text-tertiary)', cursor: 'pointer', padding: '4px' }}
                onMouseEnter={e => e.currentTarget.style.color = 'var(--text-primary)'} onMouseLeave={e => e.currentTarget.style.color = 'var(--text-tertiary)'}
              ><Icon name="edit" size={14} /></button>
              <button onClick={async () => {
                try {
                  setError('');
                  await apiFetch(`/api/negocios/${negocioId}/unidades/${u.id}`, { method: 'DELETE' });
                  await cargarUnidades();
                } catch (e) {
                  setError(e?.error || 'No se pudo eliminar la unidad');
                }
              }} style={{ background: 'transparent', border: 'none', color: 'var(--text-tertiary)', cursor: 'pointer', padding: '4px' }}
                onMouseEnter={e => e.currentTarget.style.color = 'var(--accent-danger)'} onMouseLeave={e => e.currentTarget.style.color = 'var(--text-tertiary)'}
              ><Icon name="trash" size={14} /></button>
            </div>
          </div>
        ))}

        {newU && (
          <div style={{ padding: '12px 20px', background: 'var(--bg-tertiary)', borderTop: '1px solid var(--border-subtle)', display: 'grid', gridTemplateColumns: '1fr 100px 120px 1fr', gap: '12px', alignItems: 'flex-end' }}>
            {[
              { label: 'Nombre', key: 'nombre', placeholder: 'Ej. Tonelada' },
              { label: 'Símbolo', key: 'simbolo', placeholder: 't' },
            ].map(f => (
              <div key={f.key} style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                <label style={{ fontSize: '10px', color: 'var(--text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>{f.label}</label>
                <input value={newU[f.key]} onChange={e => setNewU(p => ({ ...p, [f.key]: e.target.value }))} placeholder={f.placeholder}
                  style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border-subtle)', borderRadius: '5px', color: 'var(--text-primary)', padding: '6px 10px', fontSize: '13px', outline: 'none', fontFamily: 'var(--font-sans)' }}
                  onFocus={e => e.target.style.borderColor = accentColor} onBlur={e => e.target.style.borderColor = 'var(--border-subtle)'}
                />
              </div>
            ))}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
              <label style={{ fontSize: '10px', color: 'var(--text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Tipo</label>
              <select value={newU.tipo} onChange={e => setNewU(p => ({ ...p, tipo: e.target.value }))} style={{ height: '33px' }}>
                {TIPOS.map(t => <option key={t}>{t}</option>)}
              </select>
            </div>
            <div style={{ display: 'flex', gap: '6px' }}>
              <Btn variant="secondary" size="sm" onClick={() => setNewU(null)}>Cancelar</Btn>
              <Btn size="sm" accentColor={accentColor} onClick={async () => {
                try {
                  setError('');
                  const payload = {
                    nombre: newU.nombre,
                    simbolo: newU.simbolo,
                    tipo: newU.tipo || null
                  };
                  if (newU.id) {
                    await apiFetch(`/api/negocios/${negocioId}/unidades/${newU.id}`, {
                      method: 'PUT',
                      body: JSON.stringify(payload)
                    });
                  } else {
                    await apiFetch(`/api/negocios/${negocioId}/unidades`, {
                      method: 'POST',
                      body: JSON.stringify(payload)
                    });
                  }
                  setNewU(null);
                  await cargarUnidades();
                } catch (e) {
                  setError(e?.error || 'No se pudo guardar la unidad');
                }
              }}>{newU.id ? 'Actualizar' : 'Agregar'}</Btn>
            </div>
          </div>
        )}
      </div>

      {/* Equivalencias */}
      <div style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border-subtle)', borderRadius: '8px', overflow: 'hidden' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '14px 20px', borderBottom: '1px solid var(--border-subtle)' }}>
          <span style={{ fontSize: '11px', fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase', color: accentColor }}>Equivalencias y conversiones</span>
          <Btn variant="ghost" size="sm" icon="plus" accentColor={accentColor} onClick={() => {}}>Nueva equivalencia</Btn>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '80px 16px 80px 120px 1fr 80px', padding: '8px 20px', borderBottom: '1px solid var(--border-subtle)', gap: '12px' }}>
          {['De', '', 'A', 'Factor', 'Ejemplo', ''].map((h, i) => (
            <div key={i} style={{ fontSize: '11px', color: 'var(--text-tertiary)', fontWeight: 500, letterSpacing: '0.05em' }}>{h}</div>
          ))}
        </div>
        {equiv.map((e, i) => (
          <div key={e.id} style={{ display: 'grid', gridTemplateColumns: '80px 16px 80px 120px 1fr 80px', padding: '11px 20px', borderBottom: i < equiv.length - 1 ? '1px solid var(--border-subtle)' : 'none', gap: '12px', alignItems: 'center', transition: 'background 0.1s' }}
            onMouseEnter={el => el.currentTarget.style.background = 'var(--bg-tertiary)'}
            onMouseLeave={el => el.currentTarget.style.background = 'transparent'}
          >
            <span style={{ fontFamily: 'var(--font-mono)', fontSize: '13px', color: 'var(--text-primary)', fontWeight: 500 }}>1 {e.de}</span>
            <span style={{ color: 'var(--text-tertiary)', fontSize: '13px' }}>=</span>
            <span style={{ fontFamily: 'var(--font-mono)', fontSize: '13px', color: accentColor }}>{e.factor.toLocaleString()} {e.a}</span>
            <span style={{ fontFamily: 'var(--font-mono)', fontSize: '12px', color: 'var(--text-tertiary)' }}>× {e.factor.toLocaleString()}</span>
            <span style={{ fontSize: '12px', color: 'var(--text-tertiary)' }}>{e.ejemplo}</span>
            <div style={{ display: 'flex', gap: '4px' }}>
              <button onClick={() => setEquiv(p => p.filter(x => x.id !== e.id))} style={{ background: 'transparent', border: 'none', color: 'var(--text-tertiary)', cursor: 'pointer', padding: '4px' }}
                onMouseEnter={el => el.currentTarget.style.color = 'var(--accent-danger)'} onMouseLeave={el => el.currentTarget.style.color = 'var(--text-tertiary)'}
              ><Icon name="trash" size={14} /></button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default Unidades;
