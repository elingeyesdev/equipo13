import React, { useState, useRef, useEffect } from 'react';
import { Icon } from '../icons.jsx';
import { StatusBadge, MoneyDisplay, Btn } from '../components/ui.jsx';
import { apiFetch } from '../config/api.js';

const Field = ({ label, children }) => (
  <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
    <label style={{ fontSize: '11px', color: 'var(--text-tertiary)', fontWeight: 500, letterSpacing: '0.07em', textTransform: 'uppercase' }}>{label}</label>
    {children}
  </div>
);

const TInput = ({ value, onChange, type = 'text', placeholder = '', mono = false, accentColor }) => (
  <input value={value} onChange={e => onChange(e.target.value)} type={type} placeholder={placeholder}
    style={{ background: 'var(--bg-tertiary)', border: '1px solid var(--border-subtle)', borderRadius: '6px', color: 'var(--text-primary)', padding: '8px 12px', fontSize: '14px', fontFamily: mono ? 'var(--font-mono)' : 'var(--font-sans)', outline: 'none', width: '100%' }}
    onFocus={e => e.target.style.borderColor = accentColor}
    onBlur={e => e.target.style.borderColor = 'var(--border-subtle)'}
  />
);

const InsumoDrawer = ({
  insumo,
  onClose,
  onSave,
  accentColor,
  categorias,
  unidades,
  proveedores
}) => {
  const [form, setForm] = useState(() => {
    if (insumo) {
      return {
        ...insumo,
        precio_unitario: insumo.precio_unitario != null ? parseFloat(insumo.precio_unitario).toString() : ''
      };
    }
    return {
      nombre: '',
      codigo_sku: '',
      categoria_id: '',
      unidad_id: '',
      precio_unitario: '',
      proveedor_id: '',
      es_variable: true,
      notas: ''
    };
  });
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));
  const drawerRef = useRef(null);

  useEffect(() => {
    const handler = e => { if (drawerRef.current && !drawerRef.current.contains(e.target)) onClose(); };
    setTimeout(() => document.addEventListener('mousedown', handler), 0);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const selectStyle = hasVal => ({
    width: '100%', background: 'var(--bg-tertiary)', border: '1px solid var(--border-subtle)',
    color: hasVal ? 'var(--text-primary)' : 'var(--text-tertiary)',
    borderRadius: '6px', padding: '8px 12px', fontSize: '13px', outline: 'none', cursor: 'pointer',
  });

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', zIndex: 300, display: 'flex', justifyContent: 'flex-end' }}>
      <div ref={drawerRef} style={{
        width: '420px', background: 'var(--bg-secondary)',
        borderLeft: '1px solid var(--border-mid)',
        height: '100%', display: 'flex', flexDirection: 'column',
        animation: 'slideIn 0.2s ease',
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '20px 24px', borderBottom: '1px solid var(--border-subtle)' }}>
          <span style={{ fontSize: '15px', fontWeight: 500, color: 'var(--text-primary)' }}>{insumo ? 'Editar insumo' : 'Nuevo insumo'}</span>
          <button onClick={onClose} style={{ background: 'transparent', border: 'none', color: 'var(--text-tertiary)', cursor: 'pointer', padding: '4px' }}>
            <Icon name="x" size={16} />
          </button>
        </div>

        <div style={{ flex: 1, overflowY: 'auto', padding: '24px', display: 'flex', flexDirection: 'column', gap: '18px' }}>
          <Field label="Nombre del insumo"><TInput value={form.nombre} onChange={v => set('nombre', v)} placeholder="Ej. Leche entera" accentColor={accentColor} /></Field>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
            <Field label="Código SKU"><TInput value={form.codigo_sku || ''} onChange={v => set('codigo_sku', v)} placeholder="INS-XXX" mono accentColor={accentColor} /></Field>
            <Field label="Unidad de medida">
              <select value={form.unidad_id || ''} onChange={e => set('unidad_id', e.target.value)}
                style={selectStyle(!!form.unidad_id)}
                onFocus={e => e.target.style.borderColor = accentColor}
                onBlur={e => e.target.style.borderColor = 'var(--border-subtle)'}
              >
                <option value="">— Seleccionar —</option>
                {unidades.map(u => (
                  <option key={u.id} value={u.id}>{u.nombre} ({u.simbolo})</option>
                ))}
              </select>
            </Field>
          </div>
          <Field label="Precio por unidad">
            <div style={{ position: 'relative' }}>
              <span style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', fontSize: '12px', color: 'var(--text-tertiary)', fontFamily: 'var(--font-mono)', pointerEvents: 'none' }}>Bs</span>
              <input value={form.precio_unitario} onChange={e => set('precio_unitario', e.target.value)} type="number" placeholder="0.00"
                style={{ width: '100%', background: 'var(--bg-tertiary)', border: '1px solid var(--border-subtle)', borderRadius: '6px', color: 'var(--text-primary)', padding: '8px 12px 8px 30px', fontSize: '14px', fontFamily: 'var(--font-mono)', outline: 'none' }}
                onFocus={e => e.target.style.borderColor = accentColor}
                onBlur={e => e.target.style.borderColor = 'var(--border-subtle)'}
              />
            </div>
          </Field>
          <Field label="Proveedor">
            <select value={form.proveedor_id || ''} onChange={e => set('proveedor_id', e.target.value)}
              style={selectStyle(!!form.proveedor_id)}
              onFocus={e => e.target.style.borderColor = accentColor}
              onBlur={e => e.target.style.borderColor = 'var(--border-subtle)'}
            >
              <option value="">— Seleccionar proveedor —</option>
              {proveedores.map(p => <option key={p.id} value={p.id}>{p.nombre}</option>)}
            </select>
          </Field>
          <Field label="Categoría">
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
              {categorias.map(cat => (
                <button key={cat.id} onClick={() => set('categoria_id', cat.id)} style={{
                  padding: '5px 12px', borderRadius: '5px', cursor: 'pointer', fontSize: '12px', fontFamily: 'var(--font-sans)',
                  border: `1px solid ${form.categoria_id === cat.id ? (cat.color || accentColor) : 'var(--border-subtle)'}`,
                  background: form.categoria_id === cat.id ? (cat.color || accentColor) + '18' : 'var(--bg-tertiary)',
                  color: form.categoria_id === cat.id ? (cat.color || accentColor) : 'var(--text-secondary)',
                  transition: 'all 0.15s',
                }}>{cat.nombre}</button>
              ))}
            </div>
          </Field>
          <Field label="Tipo de costo">
            <div style={{ display: 'flex', gap: '8px' }}>
              {[{ v: true, l: 'Variable' }, { v: false, l: 'Fijo' }].map(t => (
                <button key={t.l} onClick={() => set('es_variable', t.v)} style={{
                  flex: 1, padding: '8px', borderRadius: '6px', cursor: 'pointer', fontSize: '13px', fontFamily: 'var(--font-sans)',
                  border: `1px solid ${form.es_variable === t.v ? accentColor : 'var(--border-subtle)'}`,
                  background: form.es_variable === t.v ? accentColor + '18' : 'var(--bg-tertiary)',
                  color: form.es_variable === t.v ? accentColor : 'var(--text-secondary)',
                  transition: 'all 0.15s',
                }}>{t.l}</button>
              ))}
            </div>
          </Field>
        </div>

        <div style={{ padding: '16px 24px', borderTop: '1px solid var(--border-subtle)', display: 'flex', gap: '8px' }}>
          <Btn variant="secondary" onClick={onClose}>Cancelar</Btn>
          <Btn accentColor={accentColor} onClick={() => onSave(form)} icon="save">Guardar insumo</Btn>
        </div>
      </div>
      <style>{`@keyframes slideIn { from { transform: translateX(100%); } to { transform: translateX(0); } }`}</style>
    </div>
  );
};

const Insumos = ({ negocioId }) => {
  const negocio = { id: negocioId, nombre: 'Mi negocio', rubro: 'industrial' };
  const isAgro = negocio.rubro === 'agro_ganadero';
  const accentColor = isAgro ? 'var(--accent-agro)' : 'var(--accent-industrial)';

  const [insumos, setInsumos] = useState([]);
  const [categorias, setCategorias] = useState([]);
  const [unidades, setUnidades] = useState([]);
  const [proveedores, setProveedores] = useState([]);
  const [mostrarArchivados, setMostrarArchivados] = useState(false);
  const [search, setSearch] = useState('');
  const [catFilter, setCatFilter] = useState('Todas');
  const [tipoFilter, setTipoFilter] = useState('todos');
  const [drawer, setDrawer] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const cargarTodo = async () => {
      if (!negocioId) return;
      setLoading(true);
      setError('');
      try {
        const [insumosData, proveedoresData, categoriasData, unidadesData] = await Promise.all([
          apiFetch(`/api/negocios/${negocioId}/insumos?activo=all`),
          apiFetch(`/api/negocios/${negocioId}/proveedores?activo=all`),
          apiFetch(`/api/negocios/${negocioId}/categorias`),
          apiFetch(`/api/negocios/${negocioId}/unidades`)
        ]);
        setInsumos(insumosData);
        setProveedores(proveedoresData);
        setCategorias(categoriasData);
        setUnidades(unidadesData);
      } catch (e) {
        setError(e?.error || 'No se pudieron cargar los datos de insumos');
      } finally {
        setLoading(false);
      }
    };
    cargarTodo();
    setMostrarArchivados(false);
  }, [negocioId]);

  const activosAll = insumos.filter(i => i.activo !== false);
  const archivados = insumos.filter(i => i.activo === false);
  const base       = mostrarArchivados ? insumos : activosAll;

  const filtered = base.filter(ins => {
    const sku = ins.codigo_sku || '';
    const matchSearch = ins.nombre.toLowerCase().includes(search.toLowerCase()) || sku.toLowerCase().includes(search.toLowerCase());
    const matchCat = catFilter === 'Todas' || ins.categoria_id === catFilter;
    const matchTipo = tipoFilter === 'todos' || (tipoFilter === 'variable' ? ins.es_variable !== false : ins.es_variable === false);
    return matchSearch && matchCat && matchTipo;
  });

  const recargarInsumos = async () => {
    const data = await apiFetch(`/api/negocios/${negocioId}/insumos?activo=all`);
    setInsumos(data);
  };

  const handleSave = async form => {
    try {
      setError('');
      const payload = {
        nombre: form.nombre,
        codigo_sku: form.codigo_sku || null,
        categoria_id: form.categoria_id || null,
        unidad_id: form.unidad_id || null,
        precio_unitario: form.precio_unitario === '' ? 0 : Number(form.precio_unitario),
        proveedor_id: form.proveedor_id || null,
        es_variable: form.es_variable,
        notas: form.notas || null
      };
      if (form.id) {
        await apiFetch(`/api/negocios/${negocioId}/insumos/${form.id}`, {
          method: 'PUT',
          body: JSON.stringify(payload)
        });
      } else {
        await apiFetch(`/api/negocios/${negocioId}/insumos`, {
          method: 'POST',
          body: JSON.stringify(payload)
        });
      }
      await recargarInsumos();
      setDrawer(null);
    } catch (e) {
      setError(e?.error || 'No se pudo guardar el insumo');
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <h1 style={{ fontSize: '22px', fontWeight: 400, color: 'var(--text-primary)', letterSpacing: '-0.02em' }}>Insumos</h1>
          <span style={{ background: accentColor + '1A', color: accentColor, border: `1px solid ${accentColor}33`, borderRadius: '5px', padding: '2px 10px', fontSize: '12px', fontFamily: 'var(--font-mono)', fontWeight: 500 }}>{activosAll.length}</span>
        </div>
        <div style={{ display: 'flex', gap: '8px' }}>
          <Btn variant="secondary" icon="upload" size="sm">Importar CSV</Btn>
          <Btn icon="plus" accentColor={accentColor} onClick={() => setDrawer('new')}>Nuevo insumo</Btn>
        </div>
      </div>

      {error && (
        <div style={{ color: 'var(--accent-danger)', fontSize: '13px' }}>{error}</div>
      )}

      <div style={{ display: 'flex', gap: '12px', alignItems: 'center', flexWrap: 'wrap' }}>
        <div style={{ position: 'relative', flex: '1', minWidth: '200px' }}>
          <span style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }}>
            <Icon name="search" size={14} style={{ color: 'var(--text-tertiary)' }} />
          </span>
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Buscar por nombre o código…"
            style={{ width: '100%', background: 'var(--bg-secondary)', border: '1px solid var(--border-subtle)', borderRadius: '6px', color: 'var(--text-primary)', padding: '8px 12px 8px 34px', fontSize: '13px', fontFamily: 'var(--font-sans)', outline: 'none' }}
            onFocus={e => e.target.style.borderColor = accentColor}
            onBlur={e => e.target.style.borderColor = 'var(--border-subtle)'}
          />
        </div>
        <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
          {['Todas', ...categorias.map(c => c.id)].map(cat => (
            <button key={cat} onClick={() => setCatFilter(cat)} style={{
              padding: '5px 12px', borderRadius: '5px', cursor: 'pointer', fontSize: '12px', fontFamily: 'var(--font-sans)',
              border: `1px solid ${catFilter === cat ? (categorias.find(c => c.id === cat)?.color || accentColor) : 'var(--border-subtle)'}`,
              background: catFilter === cat ? (categorias.find(c => c.id === cat)?.color || accentColor) + '18' : 'var(--bg-secondary)',
              color: catFilter === cat ? (categorias.find(c => c.id === cat)?.color || accentColor) : 'var(--text-secondary)',
              transition: 'all 0.15s',
            }}>{cat === 'Todas' ? 'Todas' : (categorias.find(c => c.id === cat)?.nombre || 'Sin categoría')}</button>
          ))}
        </div>
        <div style={{ width: '1px', height: '24px', background: 'var(--border-subtle)' }} />
        {['todos', 'variable', 'fijo'].map(t => (
          <button key={t} onClick={() => setTipoFilter(t)} style={{
            padding: '5px 12px', borderRadius: '5px', cursor: 'pointer', fontSize: '12px', fontFamily: 'var(--font-sans)',
            border: `1px solid ${tipoFilter === t ? accentColor : 'var(--border-subtle)'}`,
            background: tipoFilter === t ? accentColor + '18' : 'var(--bg-secondary)',
            color: tipoFilter === t ? accentColor : 'var(--text-secondary)',
            transition: 'all 0.15s', textTransform: t === 'todos' ? 'none' : 'capitalize',
          }}>{t === 'todos' ? 'Todos' : t.charAt(0).toUpperCase() + t.slice(1)}</button>
        ))}
      </div>

      <div style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border-subtle)', borderRadius: '8px', overflow: 'hidden' }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'minmax(200px, 2fr) 180px 70px 120px 160px 80px 80px', padding: '8px 16px', borderBottom: '1px solid var(--border-subtle)', gap: '12px' }}>
          {['Insumo', 'Categoría', 'Unidad', 'Precio/u', 'Proveedor', 'Tipo', ''].map((h, i) => (
            <div key={i} style={{ fontSize: '11px', color: 'var(--text-tertiary)', letterSpacing: '0.05em', fontWeight: 500, textAlign: i === 3 ? 'right' : 'left' }}>{h}</div>
          ))}
        </div>

        {loading && (
          <div style={{ padding: '40px', textAlign: 'center', color: 'var(--text-tertiary)', fontSize: '14px' }}>
            Cargando insumos...
          </div>
        )}

        {!loading && filtered.length === 0 && (
          <div style={{ padding: '40px', textAlign: 'center', color: 'var(--text-tertiary)', fontSize: '14px' }}>
            No se encontraron insumos con esos filtros.
          </div>
        )}

        {!loading && filtered.map((ins, i) => {
          const isArchived = ins.activo === false;
          const catColor = ins.categoria_color || 'var(--text-tertiary)';
          const tipoLabel = ins.es_variable !== false ? 'variable' : 'fijo';
          return (
            <div key={ins.id}
              style={{ display: 'grid', gridTemplateColumns: 'minmax(200px, 2fr) 180px 70px 120px 160px 80px 80px', padding: '11px 16px', borderBottom: i < filtered.length - 1 ? '1px solid var(--border-subtle)' : 'none', gap: '12px', alignItems: 'center', transition: 'background 0.1s', opacity: isArchived ? 0.5 : 1 }}
              onMouseEnter={e => e.currentTarget.style.background = 'var(--bg-tertiary)'}
              onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
            >
              <div>
                <div style={{ fontSize: '13px', color: 'var(--text-primary)', fontWeight: 500, marginBottom: '2px' }}>{ins.nombre}</div>
                <div style={{ fontSize: '11px', color: 'var(--text-tertiary)', fontFamily: 'var(--font-mono)' }}>{ins.codigo_sku || 'Sin SKU'}</div>
              </div>
              <div><StatusBadge label={ins.categoria_nombre || 'Sin categoría'} color={catColor} /></div>
              <div style={{ fontSize: '13px', color: 'var(--text-tertiary)', fontFamily: 'var(--font-mono)' }}>{ins.unidad_simbolo || '-'}</div>
              <div style={{ textAlign: 'right' }}><MoneyDisplay value={ins.precio_unitario} size="sm" /></div>
              <div style={{ fontSize: '12px', color: 'var(--text-secondary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{ins.proveedor_nombre || '—'}</div>
              <div><StatusBadge label={tipoLabel} color={ins.es_variable !== false ? accentColor : 'var(--text-tertiary)'} /></div>
              <div style={{ display: 'flex', gap: '6px' }}>
                <button onClick={() => setDrawer(ins)} title="Editar" style={{ background: 'transparent', border: 'none', color: 'var(--text-tertiary)', cursor: 'pointer', padding: '4px', borderRadius: '4px', transition: 'color 0.15s' }}
                  onMouseEnter={e => e.currentTarget.style.color = 'var(--text-primary)'}
                  onMouseLeave={e => e.currentTarget.style.color = 'var(--text-tertiary)'}
                ><Icon name="edit" size={14} /></button>
                {isArchived ? (
                  <button onClick={async () => {
                    try {
                      setError('');
                      await apiFetch(`/api/negocios/${negocioId}/insumos/${ins.id}/archivar`, { method: 'PATCH' });
                      await recargarInsumos();
                    } catch (e) {
                      setError(e?.error || 'No se pudo restaurar insumo');
                    }
                  }} title="Restaurar"
                    style={{ background: 'transparent', border: 'none', color: 'var(--accent-success)', cursor: 'pointer', padding: '4px', borderRadius: '4px' }}
                  ><Icon name="refresh" size={14} /></button>
                ) : (
                  <button onClick={async () => {
                    try {
                      setError('');
                      await apiFetch(`/api/negocios/${negocioId}/insumos/${ins.id}/archivar`, { method: 'PATCH' });
                      await recargarInsumos();
                    } catch (e) {
                      setError(e?.error || 'No se pudo archivar insumo');
                    }
                  }} title="Archivar"
                    style={{ background: 'transparent', border: 'none', color: 'var(--text-tertiary)', cursor: 'pointer', padding: '4px', borderRadius: '4px', transition: 'color 0.15s' }}
                    onMouseEnter={e => e.currentTarget.style.color = 'var(--accent-warning)'}
                    onMouseLeave={e => e.currentTarget.style.color = 'var(--text-tertiary)'}
                  ><Icon name="archive" size={14} /></button>
                )}
                <button onClick={async () => {
                  if (!confirm('¿Eliminar este insumo permanentemente?')) return;
                  try {
                    setError('');
                    await apiFetch(`/api/negocios/${negocioId}/insumos/${ins.id}`, { method: 'DELETE' });
                    await recargarInsumos();
                  } catch (e) {
                    setError(e?.error || 'No se pudo eliminar el insumo');
                  }
                }} title="Eliminar"
                  style={{ background: 'transparent', border: 'none', color: 'var(--text-tertiary)', cursor: 'pointer', padding: '4px', borderRadius: '4px', transition: 'color 0.15s' }}
                  onMouseEnter={e => e.currentTarget.style.color = 'var(--accent-danger)'}
                  onMouseLeave={e => e.currentTarget.style.color = 'var(--text-tertiary)'}
                ><Icon name="trash" size={14} /></button>
              </div>
            </div>
          );
        })}

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
        <InsumoDrawer
          insumo={drawer === 'new' ? null : drawer}
          onClose={() => setDrawer(null)}
          onSave={handleSave}
          accentColor={accentColor}
          categorias={categorias}
          unidades={unidades}
          proveedores={proveedores.filter(p => p.activo)}
        />
      )}
    </div>
  );
};

export default Insumos;
