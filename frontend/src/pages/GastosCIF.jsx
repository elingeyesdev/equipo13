import React, { useState, useEffect, useRef } from 'react';
import { Icon } from '../icons.jsx';
import { Btn, StatusBadge, MoneyDisplay } from '../components/ui.jsx';
import { apiFetch } from '../config/api.js';

const CATEGORIAS = [
  { value: 'servicios',    label: 'Servicios (luz, agua, gas)' },
  { value: 'alquiler',     label: 'Alquiler' },
  { value: 'depreciacion', label: 'Depreciación de maquinaria' },
  { value: 'otros',        label: 'Otros' },
];

const METODOS = [
  { value: 'kilos',          label: 'Por kilos procesados' },
  { value: 'horas',          label: 'Por horas de producción' },
  { value: 'partes_iguales', label: 'Partes iguales entre lotes activos' },
];

const Field = ({ label, children }) => (
  <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
    <label style={{ fontSize: '11px', color: 'var(--text-tertiary)', fontWeight: 500, letterSpacing: '0.07em', textTransform: 'uppercase' }}>{label}</label>
    {children}
  </div>
);

const Drawer = ({ gasto, onClose, onSave, accentColor }) => {
  const [form, setForm] = useState(gasto || {
    concepto: '', categoria: 'servicios', monto_mensual: '', metodo_prorrateo: 'kilos', notas: '',
  });
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));
  const ref = useRef(null);

  useEffect(() => {
    const h = e => { if (ref.current && !ref.current.contains(e.target)) onClose(); };
    setTimeout(() => document.addEventListener('mousedown', h), 0);
    return () => document.removeEventListener('mousedown', h);
  }, []);

  const inputStyle = { background: 'var(--bg-tertiary)', border: '1px solid var(--border-subtle)', borderRadius: '6px', color: 'var(--text-primary)', padding: '8px 12px', fontSize: '13px', outline: 'none', fontFamily: 'var(--font-sans)' };

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', zIndex: 300, display: 'flex', justifyContent: 'flex-end' }}>
      <div ref={ref} style={{ width: '440px', background: 'var(--bg-secondary)', borderLeft: '1px solid var(--border-mid)', height: '100%', display: 'flex', flexDirection: 'column' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '20px 24px', borderBottom: '1px solid var(--border-subtle)' }}>
          <span style={{ fontSize: '15px', fontWeight: 500 }}>{gasto?.id ? 'Editar gasto CIF' : 'Nuevo gasto CIF'}</span>
          <button onClick={onClose} style={{ background: 'transparent', border: 'none', color: 'var(--text-tertiary)', cursor: 'pointer' }}><Icon name="x" size={16} /></button>
        </div>
        <div style={{ flex: 1, overflowY: 'auto', padding: '24px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <Field label="Concepto">
            <input value={form.concepto || ''} onChange={e => set('concepto', e.target.value)} placeholder="Ej. Electricidad galpón" style={inputStyle} />
          </Field>
          <Field label="Categoría">
            <select value={form.categoria || 'servicios'} onChange={e => set('categoria', e.target.value)} style={{ ...inputStyle, cursor: 'pointer' }}>
              {CATEGORIAS.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
            </select>
          </Field>
          <Field label="Monto mensual (Bs)">
            <input type="number" min="0" step="0.01" value={form.monto_mensual || ''} onChange={e => set('monto_mensual', e.target.value)} placeholder="0.00" style={{ ...inputStyle, fontFamily: 'IBM Plex Mono, monospace' }} />
          </Field>
          <Field label="Método de prorrateo">
            <select value={form.metodo_prorrateo || 'kilos'} onChange={e => set('metodo_prorrateo', e.target.value)} style={{ ...inputStyle, cursor: 'pointer' }}>
              {METODOS.map(m => <option key={m.value} value={m.value}>{m.label}</option>)}
            </select>
          </Field>
          <Field label="Notas (opcional)">
            <textarea value={form.notas || ''} onChange={e => set('notas', e.target.value)} rows={3} style={{ ...inputStyle, resize: 'vertical' }} />
          </Field>
          <div style={{ padding: '10px 14px', background: accentColor + '10', border: `1px solid ${accentColor}22`, borderRadius: '6px', fontSize: '12px', color: 'var(--text-secondary)', lineHeight: 1.6 }}>
            El método de prorrateo decide cómo se distribuye este gasto entre los lotes activos al calcular costos.
          </div>
        </div>
        <div style={{ padding: '16px 24px', borderTop: '1px solid var(--border-subtle)', display: 'flex', gap: '8px' }}>
          <Btn variant="secondary" onClick={onClose}>Cancelar</Btn>
          <Btn accentColor={accentColor} icon="save" onClick={() => { onSave(form); onClose(); }} disabled={!form.concepto || !form.monto_mensual}>Guardar</Btn>
        </div>
      </div>
    </div>
  );
};

const GastosCIF = ({ negocioId, rubro }) => {
  const isAgro = rubro === 'agro_ganadero';
  const accentColor = isAgro ? 'var(--accent-agro)' : 'var(--accent-industrial)';
  const [gastos, setGastos]     = useState([]);
  const [drawer, setDrawer]     = useState(null);
  const [loading, setLoading]   = useState(true);
  const [error, setError]       = useState('');
  const [mostrarArchivados, setMostrarArchivados] = useState(false);

  const cargar = async () => {
    if (!negocioId) return;
    setLoading(true);
    setError('');
    try {
      setGastos(await apiFetch(`/api/negocios/${negocioId}/cif?activo=all`));
    } catch (e) {
      setError(e?.error || 'No se pudo cargar la lista de gastos CIF');
    } finally {
      setLoading(false);
    }
  };
  useEffect(() => { cargar(); }, [negocioId]);

  const handleSave = async (form) => {
    try {
      const payload = {
        concepto: form.concepto,
        categoria: form.categoria,
        monto_mensual: parseFloat(form.monto_mensual),
        metodo_prorrateo: form.metodo_prorrateo,
        notas: form.notas || null,
      };
      if (form.id) {
        await apiFetch(`/api/negocios/${negocioId}/cif/${form.id}`, { method: 'PUT', body: JSON.stringify(payload) });
      } else {
        await apiFetch(`/api/negocios/${negocioId}/cif`, { method: 'POST', body: JSON.stringify(payload) });
      }
      await cargar();
    } catch (e) {
      setError(e?.error || 'No se pudo guardar el gasto');
    }
  };

  const toggleArchivar = async (id) => {
    try {
      await apiFetch(`/api/negocios/${negocioId}/cif/${id}/archivar`, { method: 'PATCH' });
      await cargar();
    } catch (e) {
      setError(e?.error || 'No se pudo archivar');
    }
  };

  const activos    = gastos.filter(g => g.activo);
  const archivados = gastos.filter(g => !g.activo);
  const visibles   = mostrarArchivados ? gastos : activos;
  const totalMensual = activos.reduce((s, g) => s + parseFloat(g.monto_mensual || 0), 0);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '12px' }}>
        <div>
          <h1 style={{ fontSize: '22px', fontWeight: 400, color: 'var(--text-primary)', letterSpacing: '-0.02em', margin: 0 }}>Costos Indirectos de Fabricación (CIF)</h1>
          <div style={{ fontSize: '13px', color: 'var(--text-tertiary)', marginTop: '4px' }}>
            {activos.length} {activos.length === 1 ? 'gasto activo' : 'gastos activos'} · Total mensual: <span style={{ fontFamily: 'IBM Plex Mono, monospace', color: 'var(--text-secondary)' }}>Bs {totalMensual.toLocaleString('es-BO', { minimumFractionDigits: 2 })}</span>
          </div>
        </div>
        <Btn icon="plus" accentColor={accentColor} onClick={() => setDrawer('new')}>Nuevo gasto</Btn>
      </div>

      {error && <div style={{ color: 'var(--accent-danger)', fontSize: '13px' }}>{error}</div>}

      <div style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border-subtle)', borderRadius: '8px', overflow: 'hidden' }}>
        <div style={{ display: 'grid', gridTemplateColumns: '2fr 140px 130px 160px 80px 80px', padding: '8px 20px', borderBottom: '1px solid var(--border-subtle)', gap: '12px' }}>
          {['Concepto', 'Categoría', 'Monto mensual', 'Prorrateo', 'Estado', ''].map((h, i) => (
            <div key={i} style={{ fontSize: '11px', color: 'var(--text-tertiary)', fontWeight: 500, letterSpacing: '0.05em' }}>{h}</div>
          ))}
        </div>

        {loading && <div style={{ padding: '28px 20px', color: 'var(--text-tertiary)', fontSize: '13px' }}>Cargando gastos…</div>}

        {!loading && visibles.length === 0 && (
          <div style={{ padding: '48px 20px', textAlign: 'center', color: 'var(--text-tertiary)', fontSize: '13px' }}>
            <Icon name="dollarSign" size={28} style={{ display: 'block', margin: '0 auto 10px' }} />
            No hay gastos CIF registrados. Creá uno para que se prorratee automáticamente en los lotes.
          </div>
        )}

        {!loading && visibles.map((g, i) => {
          const cat = CATEGORIAS.find(c => c.value === g.categoria);
          const met = METODOS.find(m => m.value === g.metodo_prorrateo);
          return (
            <div key={g.id}
              style={{ display: 'grid', gridTemplateColumns: '2fr 140px 130px 160px 80px 80px', padding: '13px 20px', borderBottom: i < visibles.length - 1 ? '1px solid var(--border-subtle)' : 'none', gap: '12px', alignItems: 'center', opacity: g.activo ? 1 : 0.5 }}>
              <div>
                <div style={{ fontSize: '13px', color: 'var(--text-primary)', fontWeight: 500 }}>{g.concepto}</div>
                {g.notas && <div style={{ fontSize: '11px', color: 'var(--text-tertiary)' }}>{g.notas}</div>}
              </div>
              <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>{cat?.label || g.categoria || '—'}</div>
              <div style={{ textAlign: 'right' }}><MoneyDisplay value={parseFloat(g.monto_mensual)} size="sm" /></div>
              <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>{met?.label || g.metodo_prorrateo}</div>
              <div><StatusBadge label={g.activo ? 'Activo' : 'Archivado'} color={g.activo ? 'var(--accent-success)' : 'var(--text-tertiary)'} /></div>
              <div style={{ display: 'flex', gap: '6px' }}>
                <button onClick={() => setDrawer(g)} style={{ background: 'transparent', border: 'none', color: 'var(--text-tertiary)', cursor: 'pointer', padding: '4px' }}><Icon name="edit" size={14} /></button>
                <button onClick={() => toggleArchivar(g.id)} title={g.activo ? 'Archivar' : 'Restaurar'} style={{ background: 'transparent', border: 'none', color: g.activo ? 'var(--text-tertiary)' : 'var(--accent-success)', cursor: 'pointer', padding: '4px' }}><Icon name={g.activo ? 'archive' : 'refresh'} size={14} /></button>
              </div>
            </div>
          );
        })}

        {archivados.length > 0 && (
          <button onClick={() => setMostrarArchivados(v => !v)}
            style={{ width: '100%', padding: '10px 20px', background: 'transparent', border: 'none', borderTop: '1px solid var(--border-subtle)', color: 'var(--text-tertiary)', cursor: 'pointer', fontSize: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}>
            <Icon name={mostrarArchivados ? 'chevronUp' : 'chevronDown'} size={13} />
            {mostrarArchivados ? `Ocultar ${archivados.length} archivado${archivados.length > 1 ? 's' : ''}` : `Mostrar ${archivados.length} archivado${archivados.length > 1 ? 's' : ''}`}
          </button>
        )}
      </div>

      {drawer && (
        <Drawer
          gasto={drawer === 'new' ? null : drawer}
          onClose={() => setDrawer(null)}
          onSave={handleSave}
          accentColor={accentColor}
        />
      )}
    </div>
  );
};

export default GastosCIF;
