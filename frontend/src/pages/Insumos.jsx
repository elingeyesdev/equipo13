import React, { useState, useRef, useEffect } from 'react';
import { Icon } from '../icons.jsx';
import { MOCK_BY_NEGOCIO, StatusBadge, MoneyDisplay, Btn } from '../components/ui.jsx';

const CATEGORIAS = ['Todas', 'Lácteos', 'Aditivos', 'Empaques', 'Limpieza', 'Energía', 'Mantenimiento'];
const CAT_COLORS = {
  'Lácteos': 'var(--accent-industrial)', 'Aditivos': 'var(--accent-warning)',
  'Empaques': 'var(--accent-success)', 'Limpieza': '#8B5CF6', 'Energía': '#EC4899',
  'Mantenimiento': 'var(--text-tertiary)',
};

const InsumoDrawer = ({ insumo, onClose, onSave, accentColor, negocioId }) => {
  const [form, setForm] = useState(insumo || {
    nombre: '', sku: '', categoria: 'Materia prima', unidad: '', precio: '', proveedor: '', variable: true,
  });
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));
  const drawerRef = useRef(null);
  const proveedoresList = MOCK_BY_NEGOCIO[negocioId]?.proveedores || [];

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
  const Field = ({ label, children }) => (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
      <label style={{ fontSize: '11px', color: 'var(--text-tertiary)', fontWeight: 500, letterSpacing: '0.07em', textTransform: 'uppercase' }}>{label}</label>
      {children}
    </div>
  );
  const TInput = ({ value, onChange, type = 'text', placeholder = '', mono = false }) => (
    <input value={value} onChange={e => onChange(e.target.value)} type={type} placeholder={placeholder}
      style={{ background: 'var(--bg-tertiary)', border: '1px solid var(--border-subtle)', borderRadius: '6px', color: 'var(--text-primary)', padding: '8px 12px', fontSize: '14px', fontFamily: mono ? 'var(--font-mono)' : 'var(--font-sans)', outline: 'none', width: '100%' }}
      onFocus={e => e.target.style.borderColor = accentColor}
      onBlur={e => e.target.style.borderColor = 'var(--border-subtle)'}
    />
  );

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
          <Field label="Nombre del insumo"><TInput value={form.nombre} onChange={v => set('nombre', v)} placeholder="Ej. Leche entera" /></Field>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
            <Field label="Código SKU"><TInput value={form.sku} onChange={v => set('sku', v)} placeholder="INS-XXX" mono /></Field>
            <Field label="Unidad de medida">
              <select value={form.unidad || ''} onChange={e => set('unidad', e.target.value)}
                style={selectStyle(!!form.unidad)}
                onFocus={e => e.target.style.borderColor = accentColor}
                onBlur={e => e.target.style.borderColor = 'var(--border-subtle)'}
              >
                <option value="">— Seleccionar —</option>
                {['kg','g','L','ml','u','doc','caja','m','cab','jornal'].map(u => (
                  <option key={u} value={u}>{u}</option>
                ))}
              </select>
            </Field>
          </div>
          <Field label="Precio por unidad">
            <div style={{ position: 'relative' }}>
              <span style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', fontSize: '12px', color: 'var(--text-tertiary)', fontFamily: 'var(--font-mono)', pointerEvents: 'none' }}>Bs</span>
              <input value={form.precio} onChange={e => set('precio', e.target.value)} type="number" placeholder="0.00"
                style={{ width: '100%', background: 'var(--bg-tertiary)', border: '1px solid var(--border-subtle)', borderRadius: '6px', color: 'var(--text-primary)', padding: '8px 12px 8px 30px', fontSize: '14px', fontFamily: 'var(--font-mono)', outline: 'none' }}
                onFocus={e => e.target.style.borderColor = accentColor}
                onBlur={e => e.target.style.borderColor = 'var(--border-subtle)'}
              />
            </div>
          </Field>
          <Field label="Proveedor">
            <select value={form.proveedor || ''} onChange={e => set('proveedor', e.target.value)}
              style={selectStyle(!!form.proveedor)}
              onFocus={e => e.target.style.borderColor = accentColor}
              onBlur={e => e.target.style.borderColor = 'var(--border-subtle)'}
            >
              <option value="">— Seleccionar proveedor —</option>
              {proveedoresList.map(p => <option key={p} value={p}>{p}</option>)}
            </select>
          </Field>
          <Field label="Categoría">
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
              {CATEGORIAS.filter(c => c !== 'Todas').map(cat => (
                <button key={cat} onClick={() => set('categoria', cat)} style={{
                  padding: '5px 12px', borderRadius: '5px', cursor: 'pointer', fontSize: '12px', fontFamily: 'var(--font-sans)',
                  border: `1px solid ${form.categoria === cat ? (CAT_COLORS[cat] || accentColor) : 'var(--border-subtle)'}`,
                  background: form.categoria === cat ? (CAT_COLORS[cat] || accentColor) + '18' : 'var(--bg-tertiary)',
                  color: form.categoria === cat ? (CAT_COLORS[cat] || accentColor) : 'var(--text-secondary)',
                  transition: 'all 0.15s',
                }}>{cat}</button>
              ))}
            </div>
          </Field>
          <Field label="Tipo de costo">
            <div style={{ display: 'flex', gap: '8px' }}>
              {[{v:true,l:'Variable'},{v:false,l:'Fijo'}].map(t => (
                <button key={t.l} onClick={() => set('variable', t.v)} style={{
                  flex: 1, padding: '8px', borderRadius: '6px', cursor: 'pointer', fontSize: '13px', fontFamily: 'var(--font-sans)',
                  border: `1px solid ${form.variable === t.v ? accentColor : 'var(--border-subtle)'}`,
                  background: form.variable === t.v ? accentColor + '18' : 'var(--bg-tertiary)',
                  color: form.variable === t.v ? accentColor : 'var(--text-secondary)',
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

  const [insumos, setInsumos] = useState(() => MOCK_BY_NEGOCIO[negocioId]?.insumos || []);
  const [mostrarArchivados, setMostrarArchivados] = useState(false);
  const [search, setSearch] = useState('');
  const [catFilter, setCatFilter] = useState('Todas');
  const [tipoFilter, setTipoFilter] = useState('todos');
  const [drawer, setDrawer] = useState(null);

  useEffect(() => {
    setInsumos(MOCK_BY_NEGOCIO[negocioId]?.insumos || []);
    setMostrarArchivados(false);
  }, [negocioId]);

  const activosAll = insumos.filter(i => i.activo !== false);
  const archivados = insumos.filter(i => i.activo === false);
  const base       = mostrarArchivados ? insumos : activosAll;

  const filtered = base.filter(ins => {
    const matchSearch = ins.nombre.toLowerCase().includes(search.toLowerCase()) || ins.sku.toLowerCase().includes(search.toLowerCase());
    const matchCat  = catFilter === 'Todas' || ins.categoria === catFilter;
    const matchTipo = tipoFilter === 'todos' || (tipoFilter === 'variable' ? ins.variable !== false : ins.variable === false);
    return matchSearch && matchCat && matchTipo;
  });

  const handleSave = form => {
    if (form.id) {
      setInsumos(prev => prev.map(i => i.id === form.id ? { ...i, ...form } : i));
    } else {
      setInsumos(prev => [...prev, { ...form, id: `i${Date.now()}`, activo: true }]);
    }
    setDrawer(null);
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
          {CATEGORIAS.map(cat => (
            <button key={cat} onClick={() => setCatFilter(cat)} style={{
              padding: '5px 12px', borderRadius: '5px', cursor: 'pointer', fontSize: '12px', fontFamily: 'var(--font-sans)',
              border: `1px solid ${catFilter === cat ? (CAT_COLORS[cat] || accentColor) : 'var(--border-subtle)'}`,
              background: catFilter === cat ? (CAT_COLORS[cat] || accentColor) + '18' : 'var(--bg-secondary)',
              color: catFilter === cat ? (CAT_COLORS[cat] || accentColor) : 'var(--text-secondary)',
              transition: 'all 0.15s',
            }}>{cat}</button>
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
        <div style={{ display: 'grid', gridTemplateColumns: '2fr 120px 64px 120px 160px 80px 80px', padding: '8px 16px', borderBottom: '1px solid var(--border-subtle)', gap: '8px' }}>
          {['Insumo', 'Categoría', 'Unidad', 'Precio/u', 'Proveedor', 'Tipo', ''].map((h, i) => (
            <div key={i} style={{ fontSize: '11px', color: 'var(--text-tertiary)', letterSpacing: '0.05em', fontWeight: 500, textAlign: i === 3 ? 'right' : 'left' }}>{h}</div>
          ))}
        </div>

        {filtered.length === 0 && (
          <div style={{ padding: '40px', textAlign: 'center', color: 'var(--text-tertiary)', fontSize: '14px' }}>
            No se encontraron insumos con esos filtros.
          </div>
        )}

        {filtered.map((ins, i) => {
          const isArchived = ins.activo === false;
          const catColor = ins.catColor || CAT_COLORS[ins.categoria] || 'var(--text-tertiary)';
          const tipoLabel = ins.variable !== false ? 'variable' : 'fijo';
          return (
            <div key={ins.id}
              style={{ display: 'grid', gridTemplateColumns: '2fr 120px 64px 120px 160px 80px 80px', padding: '11px 16px', borderBottom: i < filtered.length - 1 ? '1px solid var(--border-subtle)' : 'none', gap: '8px', alignItems: 'center', transition: 'background 0.1s', opacity: isArchived ? 0.5 : 1 }}
              onMouseEnter={e => e.currentTarget.style.background = 'var(--bg-tertiary)'}
              onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
            >
              <div>
                <div style={{ fontSize: '13px', color: 'var(--text-primary)', fontWeight: 500, marginBottom: '2px' }}>{ins.nombre}</div>
                <div style={{ fontSize: '11px', color: 'var(--text-tertiary)', fontFamily: 'var(--font-mono)' }}>{ins.sku}</div>
              </div>
              <div><StatusBadge label={ins.categoria} color={catColor} /></div>
              <div style={{ fontSize: '13px', color: 'var(--text-tertiary)', fontFamily: 'var(--font-mono)' }}>{ins.unidad}</div>
              <div style={{ textAlign: 'right' }}><MoneyDisplay value={ins.precio} size="sm" /></div>
              <div style={{ fontSize: '12px', color: 'var(--text-secondary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{ins.proveedor}</div>
              <div><StatusBadge label={tipoLabel} color={ins.variable !== false ? accentColor : 'var(--text-tertiary)'} /></div>
              <div style={{ display: 'flex', gap: '6px' }}>
                <button onClick={() => setDrawer(ins)} title="Editar" style={{ background: 'transparent', border: 'none', color: 'var(--text-tertiary)', cursor: 'pointer', padding: '4px', borderRadius: '4px', transition: 'color 0.15s' }}
                  onMouseEnter={e => e.currentTarget.style.color = 'var(--text-primary)'}
                  onMouseLeave={e => e.currentTarget.style.color = 'var(--text-tertiary)'}
                ><Icon name="edit" size={14} /></button>
                {isArchived ? (
                  <button onClick={() => setInsumos(p => p.map(x => x.id === ins.id ? { ...x, activo: true } : x))} title="Restaurar"
                    style={{ background: 'transparent', border: 'none', color: 'var(--accent-success)', cursor: 'pointer', padding: '4px', borderRadius: '4px' }}
                  ><Icon name="refresh" size={14} /></button>
                ) : (
                  <button onClick={() => setInsumos(p => p.map(x => x.id === ins.id ? { ...x, activo: false } : x))} title="Archivar"
                    style={{ background: 'transparent', border: 'none', color: 'var(--text-tertiary)', cursor: 'pointer', padding: '4px', borderRadius: '4px', transition: 'color 0.15s' }}
                    onMouseEnter={e => e.currentTarget.style.color = 'var(--accent-warning)'}
                    onMouseLeave={e => e.currentTarget.style.color = 'var(--text-tertiary)'}
                  ><Icon name="archive" size={14} /></button>
                )}
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
          negocioId={negocioId}
        />
      )}
    </div>
  );
};

export default Insumos;
