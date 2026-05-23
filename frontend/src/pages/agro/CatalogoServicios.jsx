import React, { useState, useRef, useEffect } from 'react';
import { Icon } from '../../icons.jsx';
import { StatusBadge, Btn } from '../../components/ui.jsx';
import { apiFetch } from '../../config/api.js';

const UNIDADES = ['visita', 'cabeza', 'hora', 'muestra', 'viaje', 'dosis', 'otro'];

const ServicioDrawer = ({ servicio, onClose, onSave, accentColor }) => {
  const [form, setForm] = useState(
    servicio || { nombre: '', descripcion: '', unidad: 'visita', costo_base: '' }
  );
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));
  const ref = useRef(null);

  useEffect(() => {
    const h = e => { if (ref.current && !ref.current.contains(e.target)) onClose(); };
    setTimeout(() => document.addEventListener('mousedown', h), 0);
    return () => document.removeEventListener('mousedown', h);
  }, []);

  const iField = (label, key, placeholder = '') => (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
      <label style={{ fontSize: '11px', color: 'var(--text-tertiary)', fontWeight: 500, letterSpacing: '0.07em', textTransform: 'uppercase' }}>{label}</label>
      <input value={form[key] || ''} onChange={e => set(key, e.target.value)} placeholder={placeholder}
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
          <span style={{ fontSize: '15px', fontWeight: 500, color: 'var(--text-primary)' }}>{servicio ? 'Editar servicio' : 'Nuevo servicio'}</span>
          <button onClick={onClose} style={{ background: 'transparent', border: 'none', color: 'var(--text-tertiary)', cursor: 'pointer' }}><Icon name="x" size={16} /></button>
        </div>
        <div style={{ flex: 1, overflowY: 'auto', padding: '24px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {iField('Nombre del servicio', 'nombre', 'Ej. Visita veterinaria')}
          {iField('Descripción', 'descripcion', 'Detalle opcional del servicio')}

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <label style={{ fontSize: '11px', color: 'var(--text-tertiary)', fontWeight: 500, letterSpacing: '0.07em', textTransform: 'uppercase' }}>Unidad</label>
              <select value={form.unidad || 'visita'} onChange={e => set('unidad', e.target.value)}
                style={{ background: 'var(--bg-tertiary)', border: '1px solid var(--border-subtle)', borderRadius: '6px', color: 'var(--text-primary)', padding: '8px 12px', fontSize: '13px', outline: 'none', fontFamily: 'var(--font-sans)', cursor: 'pointer' }}>
                {UNIDADES.map(u => <option key={u} value={u}>{u}</option>)}
              </select>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <label style={{ fontSize: '11px', color: 'var(--text-tertiary)', fontWeight: 500, letterSpacing: '0.07em', textTransform: 'uppercase' }}>Costo base (Bs)</label>
              <input type="number" min="0" step="0.01" value={form.costo_base || ''} onChange={e => set('costo_base', e.target.value)}
                placeholder="Referencia opcional"
                style={{ background: 'var(--bg-tertiary)', border: '1px solid var(--border-subtle)', borderRadius: '6px', color: 'var(--text-primary)', padding: '8px 12px', fontSize: '13px', outline: 'none', fontFamily: 'IBM Plex Mono, monospace' }}
                onFocus={e => e.target.style.borderColor = accentColor}
                onBlur={e => e.target.style.borderColor = 'var(--border-subtle)'}
              />
            </div>
          </div>

          <div style={{ padding: '10px 14px', background: accentColor + '10', border: `1px solid ${accentColor}22`, borderRadius: '6px', fontSize: '12px', color: 'var(--text-secondary)', lineHeight: 1.6 }}>
            El costo base es solo de referencia. El costo real se ingresa al momento de registrar el servicio en cada día de producción.
          </div>
        </div>
        <div style={{ padding: '16px 24px', borderTop: '1px solid var(--border-subtle)', display: 'flex', gap: '8px' }}>
          <Btn variant="secondary" onClick={onClose}>Cancelar</Btn>
          <Btn accentColor={accentColor} icon="save" onClick={() => { onSave(form); onClose(); }} disabled={!form.nombre}>Guardar servicio</Btn>
        </div>
      </div>
      <style>{`@keyframes slideIn { from { transform: translateX(100%); } to { transform: translateX(0); } }`}</style>
    </div>
  );
};

const CatalogoServicios = ({ negocioId }) => {
  const accentColor = 'var(--accent-agro)';
  const [servicios, setServicios] = useState([]);
  const [mostrarArchivados, setMostrarArchivados] = useState(false);
  const [drawer, setDrawer] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [seeding, setSeeding] = useState(false);

  const cargar = async () => {
    if (!negocioId) return;
    setLoading(true);
    setError('');
    try {
      const data = await apiFetch(`/api/negocios/${negocioId}/servicios?activo=all`);
      setServicios(data);
    } catch (e) {
      setError(e?.error || 'No se pudo cargar el catálogo');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { cargar(); setMostrarArchivados(false); }, [negocioId]);

  const handleSave = async form => {
    try {
      setError('');
      const payload = {
        nombre:      form.nombre,
        descripcion: form.descripcion || null,
        unidad:      form.unidad || 'visita',
        costo_base:  form.costo_base ? parseFloat(form.costo_base) : null,
      };
      if (form.id) {
        await apiFetch(`/api/negocios/${negocioId}/servicios/${form.id}`, { method: 'PUT', body: JSON.stringify(payload) });
      } else {
        await apiFetch(`/api/negocios/${negocioId}/servicios`, { method: 'POST', body: JSON.stringify(payload) });
      }
      await cargar();
    } catch (e) {
      setError(e?.error || 'No se pudo guardar el servicio');
    }
  };

  const handleSeed = async () => {
    if (!confirm('¿Cargar los 16 servicios sugeridos para engorde de cerdos? Solo funciona si el catálogo está vacío.')) return;
    setSeeding(true);
    setError('');
    try {
      await apiFetch(`/api/negocios/${negocioId}/servicios/seed-cerdos`, { method: 'POST' });
      await cargar();
    } catch (e) {
      setError(e?.error || 'No se pudo cargar la plantilla');
    } finally {
      setSeeding(false);
    }
  };

  const activos    = servicios.filter(s => s.activo);
  const archivados = servicios.filter(s => !s.activo);
  const visibles   = mostrarArchivados ? servicios : activos;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '12px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <h1 style={{ fontSize: '22px', fontWeight: 400, color: 'var(--text-primary)', letterSpacing: '-0.02em' }}>Catálogo de servicios</h1>
          <span style={{ background: accentColor + '1A', color: accentColor, border: `1px solid ${accentColor}33`, borderRadius: '5px', padding: '2px 10px', fontSize: '12px', fontFamily: 'var(--font-mono)' }}>{activos.length} activos</span>
        </div>
        <div style={{ display: 'flex', gap: '8px' }}>
          {activos.length === 0 && !loading && (
            <Btn variant="secondary" icon="download" onClick={handleSeed} loading={seeding}>
              Plantilla para cerdos
            </Btn>
          )}
          <Btn icon="plus" accentColor={accentColor} onClick={() => setDrawer('new')}>Nuevo servicio</Btn>
        </div>
      </div>

      {error && <div style={{ color: 'var(--accent-danger)', fontSize: '13px' }}>{error}</div>}

      <div style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border-subtle)', borderRadius: '8px', overflow: 'hidden' }}>
        <div style={{ display: 'grid', gridTemplateColumns: '2fr 80px 110px 80px 80px', padding: '8px 20px', borderBottom: '1px solid var(--border-subtle)', gap: '12px' }}>
          {['Servicio', 'Unidad', 'Costo base', 'Estado', ''].map((h, i) => (
            <div key={i} style={{ fontSize: '11px', color: 'var(--text-tertiary)', fontWeight: 500, letterSpacing: '0.05em' }}>{h}</div>
          ))}
        </div>

        {loading && (
          <div style={{ padding: '28px 20px', color: 'var(--text-tertiary)', fontSize: '13px' }}>Cargando catálogo…</div>
        )}

        {!loading && visibles.length === 0 && (
          <div style={{ padding: '48px 20px', textAlign: 'center', color: 'var(--text-tertiary)', fontSize: '13px' }}>
            <Icon name="tool" size={28} style={{ display: 'block', margin: '0 auto 10px' }} />
            El catálogo está vacío. Creá servicios manualmente o cargá la plantilla para cerdos.
          </div>
        )}

        {!loading && visibles.map((sv, i) => (
          <div key={sv.id}
            style={{ display: 'grid', gridTemplateColumns: '2fr 80px 110px 80px 80px', padding: '13px 20px', borderBottom: i < visibles.length - 1 ? '1px solid var(--border-subtle)' : 'none', gap: '12px', alignItems: 'center', opacity: sv.activo ? 1 : 0.5, transition: 'background 0.1s' }}
            onMouseEnter={e => e.currentTarget.style.background = 'var(--bg-tertiary)'}
            onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
          >
            <div>
              <div style={{ fontSize: '13px', color: 'var(--text-primary)', fontWeight: 500, marginBottom: '2px' }}>{sv.nombre}</div>
              {sv.descripcion && <div style={{ fontSize: '11px', color: 'var(--text-tertiary)' }}>{sv.descripcion}</div>}
            </div>
            <div style={{ fontSize: '12px', color: 'var(--text-secondary)', fontFamily: 'var(--font-mono)' }}>{sv.unidad}</div>
            <div style={{ fontSize: '12px', color: 'var(--text-tertiary)', fontFamily: 'var(--font-mono)' }}>
              {sv.costo_base ? `Bs ${parseFloat(sv.costo_base).toLocaleString('es-BO', { minimumFractionDigits: 2 })}` : '—'}
            </div>
            <div><StatusBadge label={sv.activo ? 'Activo' : 'Archivado'} color={sv.activo ? 'var(--accent-success)' : 'var(--text-tertiary)'} /></div>
            <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
              <button onClick={() => setDrawer(sv)}
                style={{ background: 'transparent', border: 'none', color: 'var(--text-tertiary)', cursor: 'pointer', padding: '4px' }}
                onMouseEnter={e => e.currentTarget.style.color = 'var(--text-primary)'}
                onMouseLeave={e => e.currentTarget.style.color = 'var(--text-tertiary)'}
              ><Icon name="edit" size={14} /></button>
              <button onClick={async () => {
                try {
                  setError('');
                  await apiFetch(`/api/negocios/${negocioId}/servicios/${sv.id}/archivar`, { method: 'PATCH' });
                  await cargar();
                } catch (e) { setError(e?.error || 'Error al archivar'); }
              }}
                title={sv.activo ? 'Archivar' : 'Restaurar'}
                style={{ background: 'transparent', border: 'none', color: sv.activo ? 'var(--text-tertiary)' : 'var(--accent-success)', cursor: 'pointer', padding: '4px' }}
                onMouseEnter={e => e.currentTarget.style.color = sv.activo ? 'var(--accent-warning)' : 'var(--accent-success)'}
                onMouseLeave={e => e.currentTarget.style.color = sv.activo ? 'var(--text-tertiary)' : 'var(--accent-success)'}
              ><Icon name={sv.activo ? 'archive' : 'refresh'} size={14} /></button>
            </div>
          </div>
        ))}

        {archivados.length > 0 && (
          <button onClick={() => setMostrarArchivados(v => !v)}
            style={{ width: '100%', padding: '10px 20px', background: 'transparent', border: 'none', borderTop: '1px solid var(--border-subtle)', color: 'var(--text-tertiary)', cursor: 'pointer', fontSize: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}
            onMouseEnter={e => e.currentTarget.style.color = 'var(--text-secondary)'}
            onMouseLeave={e => e.currentTarget.style.color = 'var(--text-tertiary)'}
          >
            <Icon name={mostrarArchivados ? 'chevronUp' : 'chevronDown'} size={13} />
            {mostrarArchivados ? `Ocultar ${archivados.length} archivado${archivados.length > 1 ? 's' : ''}` : `Mostrar ${archivados.length} archivado${archivados.length > 1 ? 's' : ''}`}
          </button>
        )}
      </div>

      {drawer && (
        <ServicioDrawer
          servicio={drawer === 'new' ? null : drawer}
          onClose={() => setDrawer(null)}
          onSave={handleSave}
          accentColor={accentColor}
        />
      )}
    </div>
  );
};

export default CatalogoServicios;
