import React, { useState, useRef, useEffect } from 'react';
import { Icon } from '../icons.jsx';
import { StatusBadge, Btn } from '../components/ui.jsx';
import { apiFetch } from '../config/api.js';

const PrecioMercadoDrawer = ({ precio, onClose, onSave, accentColor }) => {
  const [form, setForm] = useState(
    precio || { corte_nombre: '', precio_unitario: '', canal: 'minorista', fecha_vigencia: new Date().toISOString().split('T')[0] }
  );
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));
  const ref = useRef(null);

  useEffect(() => {
    const h = e => { if (ref.current && !ref.current.contains(e.target)) onClose(); };
    setTimeout(() => document.addEventListener('mousedown', h), 0);
    return () => document.removeEventListener('mousedown', h);
  }, [onClose]);

  const iField = (label, key, placeholder = '', type = 'text') => (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
      <label style={{ fontSize: '11px', color: 'var(--text-tertiary)', fontWeight: 500, letterSpacing: '0.07em', textTransform: 'uppercase' }}>{label}</label>
      <input type={type} value={form[key] || ''} onChange={e => set(key, e.target.value)} placeholder={placeholder}
        style={{ background: 'var(--bg-tertiary)', border: '1px solid var(--border-subtle)', borderRadius: '6px', color: 'var(--text-primary)', padding: '8px 12px', fontSize: '13px', outline: 'none', fontFamily: 'var(--font-sans)' }}
        onFocus={e => e.target.style.borderColor = accentColor}
        onBlur={e => e.target.style.borderColor = 'var(--border-subtle)'}
      />
    </div>
  );

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', zIndex: 300, display: 'flex', justifyContent: 'flex-end' }}>
      <div ref={ref} style={{ width: '420px', background: 'var(--bg-secondary)', borderLeft: '1px solid var(--border-mid)', height: '100%', display: 'flex', flexDirection: 'column', animation: 'slideIn 0.2s ease' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '20px 24px', borderBottom: '1px solid var(--border-subtle)' }}>
          <span style={{ fontSize: '15px', fontWeight: 500, color: 'var(--text-primary)' }}>{precio ? 'Editar precio' : 'Nuevo precio de mercado'}</span>
          <button onClick={onClose} style={{ background: 'transparent', border: 'none', color: 'var(--text-tertiary)', cursor: 'pointer' }}><Icon name="x" size={16} /></button>
        </div>
        <div style={{ flex: 1, overflowY: 'auto', padding: '24px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {iField('Corte (Nombre)', 'corte_nombre', 'Ej. Pernil')}
          
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <label style={{ fontSize: '11px', color: 'var(--text-tertiary)', fontWeight: 500, letterSpacing: '0.07em', textTransform: 'uppercase' }}>Precio / Kg (Bs)</label>
              <input type="number" min="0.0001" step="0.01" value={form.precio_unitario || ''} onChange={e => set('precio_unitario', e.target.value)}
                placeholder="Ej. 55.00"
                style={{ background: 'var(--bg-tertiary)', border: '1px solid var(--border-subtle)', borderRadius: '6px', color: 'var(--text-primary)', padding: '8px 12px', fontSize: '13px', outline: 'none', fontFamily: 'IBM Plex Mono, monospace' }}
                onFocus={e => e.target.style.borderColor = accentColor}
                onBlur={e => e.target.style.borderColor = 'var(--border-subtle)'}
              />
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <label style={{ fontSize: '11px', color: 'var(--text-tertiary)', fontWeight: 500, letterSpacing: '0.07em', textTransform: 'uppercase' }}>Canal</label>
              <select value={form.canal || 'minorista'} onChange={e => set('canal', e.target.value)}
                style={{ background: 'var(--bg-tertiary)', border: '1px solid var(--border-subtle)', borderRadius: '6px', color: 'var(--text-primary)', padding: '8px 12px', fontSize: '13px', outline: 'none', fontFamily: 'var(--font-sans)', cursor: 'pointer' }}>
                <option value="minorista">Minorista</option>
                <option value="mayorista">Mayorista</option>
              </select>
            </div>
          </div>

          {iField('Fecha Vigencia', 'fecha_vigencia', '', 'date')}

          <div style={{ padding: '10px 14px', background: accentColor + '10', border: `1px solid ${accentColor}22`, borderRadius: '6px', fontSize: '12px', color: 'var(--text-secondary)', lineHeight: 1.6 }}>
            El precio de mercado se utiliza para prorratear los costos conjuntos en la sala de desposte usando el método "valor de ventas en el punto de separación".
          </div>
        </div>
        <div style={{ padding: '16px 24px', borderTop: '1px solid var(--border-subtle)', display: 'flex', gap: '8px' }}>
          <Btn variant="secondary" onClick={onClose}>Cancelar</Btn>
          <Btn accentColor={accentColor} icon="save" onClick={() => { onSave(form); onClose(); }} disabled={!form.corte_nombre || !form.precio_unitario || !form.fecha_vigencia}>Guardar precio</Btn>
        </div>
      </div>
      <style>{`@keyframes slideIn { from { transform: translateX(100%); } to { transform: translateX(0); } }`}</style>
    </div>
  );
};

const PreciosMercado = ({ negocioId }) => {
  const accentColor = 'var(--accent-info)';
  const [precios, setPrecios] = useState([]);
  const [filtroCanal, setFiltroCanal] = useState('');
  const [drawer, setDrawer] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const cargar = async () => {
    if (!negocioId) return;
    setLoading(true);
    setError('');
    try {
      const url = filtroCanal ? `/api/negocios/${negocioId}/precios-mercado?canal=${filtroCanal}` : `/api/negocios/${negocioId}/precios-mercado`;
      const data = await apiFetch(url);
      setPrecios(data);
    } catch (e) {
      setError(e?.error || 'No se pudo cargar los precios de mercado');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { cargar(); }, [negocioId, filtroCanal]);

  const handleSave = async form => {
    try {
      setError('');
      const payload = {
        corte_nombre:    form.corte_nombre,
        precio_unitario: parseFloat(form.precio_unitario),
        canal:           form.canal,
        fecha_vigencia:  form.fecha_vigencia,
      };
      if (form.id) {
        await apiFetch(`/api/negocios/${negocioId}/precios-mercado/${form.id}`, { method: 'PUT', body: JSON.stringify(payload) });
      } else {
        await apiFetch(`/api/negocios/${negocioId}/precios-mercado`, { method: 'POST', body: JSON.stringify(payload) });
      }
      await cargar();
    } catch (e) {
      setError(e?.error || 'No se pudo guardar el precio');
    }
  };

  const handleDelete = async (id) => {
    if (!confirm('¿Seguro que deseas eliminar este precio?')) return;
    try {
      setError('');
      await apiFetch(`/api/negocios/${negocioId}/precios-mercado/${id}`, { method: 'DELETE' });
      await cargar();
    } catch (e) {
      setError(e?.error || 'Error al eliminar');
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '12px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <h1 style={{ fontSize: '22px', fontWeight: 400, color: 'var(--text-primary)', letterSpacing: '-0.02em' }}>Precios de Mercado</h1>
          <span style={{ background: accentColor + '1A', color: accentColor, border: `1px solid ${accentColor}33`, borderRadius: '5px', padding: '2px 10px', fontSize: '12px', fontFamily: 'var(--font-mono)' }}>{precios.length} registros</span>
        </div>
        <div style={{ display: 'flex', gap: '8px' }}>
          <select value={filtroCanal} onChange={e => setFiltroCanal(e.target.value)} style={{ background: 'var(--bg-tertiary)', border: '1px solid var(--border-subtle)', borderRadius: '6px', color: 'var(--text-primary)', padding: '6px 12px', fontSize: '13px', outline: 'none' }}>
            <option value="">Todos los canales</option>
            <option value="minorista">Minorista</option>
            <option value="mayorista">Mayorista</option>
          </select>
          <Btn icon="plus" accentColor={accentColor} onClick={() => setDrawer('new')}>Nuevo precio</Btn>
        </div>
      </div>

      {error && <div style={{ color: 'var(--accent-danger)', fontSize: '13px' }}>{error}</div>}

      <div style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border-subtle)', borderRadius: '8px', overflow: 'hidden' }}>
        <div style={{ display: 'grid', gridTemplateColumns: '2fr 100px 100px 120px 80px', padding: '8px 20px', borderBottom: '1px solid var(--border-subtle)', gap: '12px' }}>
          {['Corte', 'Canal', 'Precio (Bs/Kg)', 'Vigencia', ''].map((h, i) => (
            <div key={i} style={{ fontSize: '11px', color: 'var(--text-tertiary)', fontWeight: 500, letterSpacing: '0.05em' }}>{h}</div>
          ))}
        </div>

        {loading && (
          <div style={{ padding: '28px 20px', color: 'var(--text-tertiary)', fontSize: '13px' }}>Cargando precios…</div>
        )}

        {!loading && precios.length === 0 && (
          <div style={{ padding: '48px 20px', textAlign: 'center', color: 'var(--text-tertiary)', fontSize: '13px' }}>
            <Icon name="tag" size={28} style={{ display: 'block', margin: '0 auto 10px' }} />
            No hay precios de mercado registrados.
          </div>
        )}

        {!loading && precios.map((p, i) => (
          <div key={p.id}
            style={{ display: 'grid', gridTemplateColumns: '2fr 100px 100px 120px 80px', padding: '13px 20px', borderBottom: i < precios.length - 1 ? '1px solid var(--border-subtle)' : 'none', gap: '12px', alignItems: 'center', transition: 'background 0.1s' }}
            onMouseEnter={e => e.currentTarget.style.background = 'var(--bg-tertiary)'}
            onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
          >
            <div style={{ fontSize: '13px', color: 'var(--text-primary)', fontWeight: 500 }}>{p.corte_nombre}</div>
            <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
              <StatusBadge label={p.canal} color={p.canal === 'mayorista' ? 'var(--accent-warning)' : 'var(--accent-info)'} />
            </div>
            <div style={{ fontSize: '12px', color: 'var(--text-primary)', fontFamily: 'var(--font-mono)' }}>
              {parseFloat(p.precio_unitario).toLocaleString('es-BO', { minimumFractionDigits: 2 })}
            </div>
            <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
              {new Date(p.fecha_vigencia).toLocaleDateString('es-BO')}
            </div>
            <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
              <button onClick={() => setDrawer({ ...p, fecha_vigencia: p.fecha_vigencia.split('T')[0] })}
                style={{ background: 'transparent', border: 'none', color: 'var(--text-tertiary)', cursor: 'pointer', padding: '4px' }}
                onMouseEnter={e => e.currentTarget.style.color = 'var(--text-primary)'}
                onMouseLeave={e => e.currentTarget.style.color = 'var(--text-tertiary)'}
              ><Icon name="edit" size={14} /></button>
              <button onClick={() => handleDelete(p.id)}
                style={{ background: 'transparent', border: 'none', color: 'var(--text-tertiary)', cursor: 'pointer', padding: '4px' }}
                onMouseEnter={e => e.currentTarget.style.color = 'var(--accent-danger)'}
                onMouseLeave={e => e.currentTarget.style.color = 'var(--text-tertiary)'}
              ><Icon name="trash" size={14} /></button>
            </div>
          </div>
        ))}
      </div>

      {drawer && (
        <PrecioMercadoDrawer
          precio={drawer === 'new' ? null : drawer}
          onClose={() => setDrawer(null)}
          onSave={handleSave}
          accentColor={accentColor}
        />
      )}
    </div>
  );
};

export default PreciosMercado;
