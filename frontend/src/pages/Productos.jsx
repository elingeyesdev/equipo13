import React, { useState, useRef, useEffect } from 'react';
import { Icon } from '../icons.jsx';
import { MOCK_BY_NEGOCIO, StatusBadge, MoneyDisplay, Btn } from '../components/ui.jsx';

const UNIDADES_OPT = ['u', 'kg', 'L', 'g', 'ml', 'docena', 'caja'];

const ProductoDrawer = ({ producto, onClose, onSave, accentColor, onNavigate }) => {
  const [form, setForm] = useState(producto || { nombre: '', sku: '', desc: '', unidad: 'u', activo: true });
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));
  const ref = useRef(null);

  useEffect(() => {
    const h = e => { if (ref.current && !ref.current.contains(e.target)) onClose(); };
    setTimeout(() => document.addEventListener('mousedown', h), 0);
    return () => document.removeEventListener('mousedown', h);
  }, []);

  const iField = (label, key, opts = {}) => (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
      <label style={{ fontSize: '11px', color: 'var(--text-tertiary)', fontWeight: 500, letterSpacing: '0.07em', textTransform: 'uppercase' }}>{label}</label>
      <input value={form[key]} onChange={e => set(key, e.target.value)} placeholder={opts.placeholder || ''}
        style={{ background: 'var(--bg-tertiary)', border: '1px solid var(--border-subtle)', borderRadius: '6px', color: 'var(--text-primary)', padding: '8px 12px', fontSize: '14px', outline: 'none', width: '100%', fontFamily: 'IBM Plex Sans, sans-serif' }}
        onFocus={e => e.target.style.borderColor = accentColor}
        onBlur={e => e.target.style.borderColor = 'var(--border-subtle)'}
        {...opts}
      />
    </div>
  );

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', zIndex: 300, display: 'flex', justifyContent: 'flex-end' }}>
      <div ref={ref} style={{ width: '420px', background: 'var(--bg-secondary)', borderLeft: '1px solid var(--border-mid)', height: '100%', display: 'flex', flexDirection: 'column', animation: 'slideIn 0.2s ease' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '20px 24px', borderBottom: '1px solid var(--border-subtle)' }}>
          <span style={{ fontSize: '15px', fontWeight: 500, color: 'var(--text-primary)' }}>{producto ? 'Editar producto' : 'Nuevo producto'}</span>
          <button onClick={onClose} style={{ background: 'transparent', border: 'none', color: 'var(--text-tertiary)', cursor: 'pointer' }}><Icon name="x" size={16} /></button>
        </div>
        <div style={{ flex: 1, overflowY: 'auto', padding: '24px', display: 'flex', flexDirection: 'column', gap: '18px' }}>
          {iField('Nombre del producto', 'nombre', { placeholder: 'Ej. Queso fresco 500g' })}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
            {iField('Código SKU (opcional)', 'sku', { placeholder: 'QF-001' })}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <label style={{ fontSize: '11px', color: 'var(--text-tertiary)', fontWeight: 500, letterSpacing: '0.07em', textTransform: 'uppercase' }}>Unidad de medida</label>
              <select value={form.unidad} onChange={e => set('unidad', e.target.value)} style={{ height: '37px' }}>
                {UNIDADES_OPT.map(u => <option key={u} value={u}>{u}</option>)}
              </select>
            </div>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            <label style={{ fontSize: '11px', color: 'var(--text-tertiary)', fontWeight: 500, letterSpacing: '0.07em', textTransform: 'uppercase' }}>Descripción</label>
            <textarea value={form.desc} onChange={e => set('desc', e.target.value)} rows={3} placeholder="Descripción breve del producto terminado…" />
          </div>
        </div>
        <div style={{ padding: '16px 24px', borderTop: '1px solid var(--border-subtle)', display: 'flex', gap: '8px' }}>
          <Btn variant="secondary" onClick={onClose}>Cancelar</Btn>
          <Btn accentColor={accentColor} onClick={() => { onSave(form); }} icon="save">
            {producto ? 'Guardar cambios' : 'Guardar y agregar receta →'}
          </Btn>
        </div>
      </div>
      <style>{`@keyframes slideIn { from { transform: translateX(100%); } to { transform: translateX(0); } }`}</style>
    </div>
  );
};

const RecetaDrawer = ({ producto, onClose, accentColor }) => {
  const ref = useRef(null);
  const [bom, setBom] = useState([
    { id: 1, nombre: 'Leche entera',     cantidad: 5.000, unidad: 'L',  precio: 4.80   },
    { id: 2, nombre: 'Cuajo enzimático', cantidad: 0.003, unidad: 'kg', precio: 420.00 },
    { id: 3, nombre: 'Sal refinada',     cantidad: 0.015, unidad: 'kg', precio: 8.50   },
    { id: 4, nombre: 'Empaque film',     cantidad: 1,     unidad: 'u',  precio: 0.80   },
  ]);
  const [etapas, setEtapas] = useState([
    { id: 1, nombre: 'Pasteurización', tiempo: 4,  costoH: 18.50 },
    { id: 2, nombre: 'Coagulación',    tiempo: 12, costoH: 18.50 },
    { id: 3, nombre: 'Desuerado',      tiempo: 20, costoH: 18.50 },
    { id: 4, nombre: 'Salazón',        tiempo: 8,  costoH: 18.50 },
    { id: 5, nombre: 'Empaque',        tiempo: 6,  costoH: 18.50 },
  ]);

  useEffect(() => {
    const h = e => { if (ref.current && !ref.current.contains(e.target)) onClose(); };
    setTimeout(() => document.addEventListener('mousedown', h), 0);
    return () => document.removeEventListener('mousedown', h);
  }, []);

  const totalMPD = bom.reduce((s, r) => s + r.cantidad * r.precio, 0);
  const totalMOD = etapas.reduce((s, e) => s + (e.tiempo / 60) * e.costoH, 0);

  const Row = ({ row, onDel }) => (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 70px 50px 90px 80px 48px', gap: '6px', padding: '8px 0', borderBottom: '1px solid var(--border-subtle)', alignItems: 'center' }}>
      <span style={{ fontSize: '13px', color: 'var(--text-primary)' }}>{row.nombre}</span>
      <span style={{ fontFamily: 'IBM Plex Mono, monospace', fontSize: '12px', color: 'var(--text-secondary)', textAlign: 'right' }}>{row.cantidad.toFixed(3)}</span>
      <span style={{ fontSize: '12px', color: 'var(--text-tertiary)' }}>{row.unidad}</span>
      <span style={{ fontFamily: 'IBM Plex Mono, monospace', fontSize: '12px', color: 'var(--text-secondary)', textAlign: 'right' }}>Bs {row.precio.toFixed(2)}</span>
      <span style={{ fontFamily: 'IBM Plex Mono, monospace', fontSize: '12px', color: accentColor, textAlign: 'right' }}>Bs {(row.cantidad * row.precio).toFixed(2)}</span>
      <div style={{ display: 'flex', gap: '2px', justifyContent: 'flex-end' }}>
        <button onClick={onDel} style={{ background: 'transparent', border: 'none', color: 'var(--text-tertiary)', cursor: 'pointer', padding: '2px' }}><Icon name="trash" size={13} /></button>
      </div>
    </div>
  );

  const EtapaRow = ({ et, idx, onDel }) => {
    const costoU = (et.tiempo / 60) * et.costoH;
    return (
      <div style={{ display: 'grid', gridTemplateColumns: '20px 20px 1fr 60px 80px 80px 40px', gap: '6px', padding: '8px 0', borderBottom: '1px solid var(--border-subtle)', alignItems: 'center' }}>
        <span style={{ color: 'var(--text-tertiary)', cursor: 'grab' }}><Icon name="grip" size={12} /></span>
        <span style={{ fontFamily: 'IBM Plex Mono, monospace', fontSize: '11px', color: 'var(--text-tertiary)' }}>{idx + 1}</span>
        <span style={{ fontSize: '13px', color: 'var(--text-primary)' }}>{et.nombre}</span>
        <span style={{ fontFamily: 'IBM Plex Mono, monospace', fontSize: '12px', color: 'var(--text-secondary)', textAlign: 'right' }}>{et.tiempo} min</span>
        <span style={{ fontFamily: 'IBM Plex Mono, monospace', fontSize: '12px', color: 'var(--text-secondary)', textAlign: 'right' }}>Bs {et.costoH.toFixed(2)}</span>
        <span style={{ fontFamily: 'IBM Plex Mono, monospace', fontSize: '12px', color: accentColor, textAlign: 'right' }}>Bs {costoU.toFixed(2)}</span>
        <button onClick={onDel} style={{ background: 'transparent', border: 'none', color: 'var(--text-tertiary)', cursor: 'pointer', padding: '2px' }}><Icon name="trash" size={13} /></button>
      </div>
    );
  };

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', zIndex: 300, display: 'flex', justifyContent: 'flex-end' }}>
      <div ref={ref} style={{ width: '680px', background: 'var(--bg-secondary)', borderLeft: '1px solid var(--border-mid)', height: '100%', display: 'flex', flexDirection: 'column', animation: 'slideIn 0.2s ease' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '20px 24px', borderBottom: '1px solid var(--border-subtle)' }}>
          <div>
            <div style={{ fontSize: '15px', fontWeight: 500, color: 'var(--text-primary)' }}>Receta — {producto.nombre}</div>
            <div style={{ fontSize: '12px', color: 'var(--text-tertiary)', marginTop: '2px' }}>Cantidades por unidad producida</div>
          </div>
          <button onClick={onClose} style={{ background: 'transparent', border: 'none', color: 'var(--text-tertiary)', cursor: 'pointer' }}><Icon name="x" size={16} /></button>
        </div>
        <div style={{ flex: 1, overflowY: 'auto', padding: '24px', display: 'flex', flexDirection: 'column', gap: '28px' }}>
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
              <span style={{ fontSize: '11px', fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase', color: accentColor }}>Materias primas (BOM)</span>
              <Btn variant="ghost" size="sm" icon="plus" accentColor={accentColor}>Agregar insumo</Btn>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 70px 50px 90px 80px 48px', gap: '6px', padding: '6px 0', borderBottom: '1px solid var(--border-mid)', marginBottom: '2px' }}>
              {['Insumo', 'Cantidad', 'Unidad', 'Precio/u', 'Costo', ''].map((h, i) => (
                <div key={i} style={{ fontSize: '11px', color: 'var(--text-tertiary)', letterSpacing: '0.04em', textAlign: i >= 1 && i <= 4 ? 'right' : 'left' }}>{h}</div>
              ))}
            </div>
            {bom.map(r => <Row key={r.id} row={r} onDel={() => setBom(b => b.filter(x => x.id !== r.id))} />)}
            <div style={{ display: 'flex', justifyContent: 'flex-end', padding: '10px 48px 0 0' }}>
              <span style={{ fontSize: '11px', color: 'var(--text-tertiary)', marginRight: '12px', textTransform: 'uppercase', letterSpacing: '0.06em', fontWeight: 600 }}>Total MPD</span>
              <span style={{ fontFamily: 'IBM Plex Mono, monospace', fontSize: '13px', color: accentColor, fontWeight: 500 }}>Bs {totalMPD.toFixed(2)}</span>
            </div>
          </div>

          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
              <span style={{ fontSize: '11px', fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase', color: accentColor }}>Etapas de producción</span>
              <Btn variant="ghost" size="sm" icon="plus" accentColor={accentColor}>Agregar etapa</Btn>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '20px 20px 1fr 60px 80px 80px 40px', gap: '6px', padding: '6px 0', borderBottom: '1px solid var(--border-mid)', marginBottom: '2px' }}>
              {['', '#', 'Etapa', 'Tiempo', 'Costo/h', 'Costo/u', ''].map((h, i) => (
                <div key={i} style={{ fontSize: '11px', color: 'var(--text-tertiary)', letterSpacing: '0.04em', textAlign: i >= 3 && i <= 5 ? 'right' : 'left' }}>{h}</div>
              ))}
            </div>
            {etapas.map((et, idx) => <EtapaRow key={et.id} et={et} idx={idx} onDel={() => setEtapas(e => e.filter(x => x.id !== et.id))} />)}
            <div style={{ display: 'flex', justifyContent: 'flex-end', padding: '10px 40px 0 0' }}>
              <span style={{ fontSize: '11px', color: 'var(--text-tertiary)', marginRight: '12px', textTransform: 'uppercase', letterSpacing: '0.06em', fontWeight: 600 }}>Total MOD</span>
              <span style={{ fontFamily: 'IBM Plex Mono, monospace', fontSize: '13px', color: accentColor, fontWeight: 500 }}>Bs {totalMOD.toFixed(2)}</span>
            </div>
          </div>
        </div>
        <div style={{ padding: '16px 24px', borderTop: '1px solid var(--border-subtle)', display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
          <Btn variant="secondary" onClick={onClose}>Cerrar</Btn>
          <Btn accentColor={accentColor} icon="calculator">Calcular costo con esta receta</Btn>
        </div>
      </div>
    </div>
  );
};

const Productos = ({ negocioId, onNavigate }) => {
  const negocio = { id: negocioId, nombre: 'Mi negocio', rubro: 'industrial' };
  const isAgro = negocio.rubro === 'agro_ganadero';
  const accentColor = isAgro ? 'var(--accent-agro)' : 'var(--accent-industrial)';
  const [productos, setProductos] = useState(() => MOCK_BY_NEGOCIO[negocioId]?.productos || []);
  const [mostrarArchivados, setMostrarArchivados] = useState(false);
  const [drawer, setDrawer] = useState(null);
  const [receta, setReceta] = useState(null);

  useEffect(() => {
    setProductos(MOCK_BY_NEGOCIO[negocioId]?.productos || []);
    setMostrarArchivados(false);
  }, [negocioId]);

  const handleSave = form => {
    if (form.id) setProductos(p => p.map(x => x.id === form.id ? { ...x, ...form } : x));
    else setProductos(p => [...p, { ...form, id: `p${Date.now()}`, costoUnit: 0, pvp: 0, margen: 0, fichaReciente: false, activo: true }]);
    setDrawer(null);
  };

  const activos    = productos.filter(p => p.activo !== false);
  const archivados = productos.filter(p => p.activo === false);
  const visibles   = mostrarArchivados ? productos : activos;

  if (isAgro) return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      <h1 style={{ fontSize: '22px', fontWeight: 400, color: 'var(--text-primary)', letterSpacing: '-0.02em' }}>Productos</h1>
      <div style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border-subtle)', borderRadius: '8px', padding: '40px', textAlign: 'center', color: 'var(--text-tertiary)', fontSize: '14px', lineHeight: 1.8 }}>
        <Icon name="cow" size={32} style={{ color: 'var(--accent-agro)', opacity: 0.5, marginBottom: '12px' }} />
        <div>Este negocio usa <strong style={{ color: 'var(--text-secondary)' }}>Lotes</strong> en lugar de Productos.</div>
        <div>Ve a la sección <button onClick={() => onNavigate('lotes')} style={{ background: 'none', border: 'none', color: 'var(--accent-agro)', cursor: 'pointer', fontSize: '14px', padding: 0, fontFamily: 'inherit' }}>Lotes activos →</button></div>
      </div>
    </div>
  );

  const ProductCard = ({ p }) => {
    const [hov, setHov] = useState(false);
    const isArchived = p.activo === false;
    return (
      <div onMouseEnter={() => setHov(true)} onMouseLeave={() => setHov(false)}
        style={{ background: 'var(--bg-secondary)', border: `1px solid ${hov ? 'var(--border-mid)' : 'var(--border-subtle)'}`, borderRadius: '8px', padding: '18px', display: 'flex', flexDirection: 'column', gap: '14px', transition: 'border-color 0.15s', opacity: isArchived ? 0.5 : 1 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <div>
            <div style={{ fontSize: '14px', fontWeight: 500, color: 'var(--text-primary)', marginBottom: '3px' }}>{p.nombre}</div>
            <div style={{ fontSize: '11px', color: 'var(--text-tertiary)', fontFamily: 'IBM Plex Mono, monospace' }}>{p.sku || 'Sin SKU'}</div>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '4px' }}>
            <StatusBadge label={isArchived ? 'Archivado' : 'Activo'} color={isArchived ? 'var(--text-tertiary)' : 'var(--accent-success)'} />
            {!isArchived && <StatusBadge label={p.fichaReciente ? 'Ficha reciente' : 'Sin ficha'} color={p.fichaReciente ? 'var(--accent-success)' : 'var(--text-tertiary)'} />}
          </div>
        </div>

        <div style={{ height: '1px', background: 'var(--border-subtle)' }} />

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
          <div>
            <div style={{ fontSize: '10px', color: 'var(--text-tertiary)', letterSpacing: '0.06em', textTransform: 'uppercase', marginBottom: '3px' }}>Margen</div>
            <div style={{ fontFamily: 'IBM Plex Mono, monospace', fontSize: '12px', color: 'var(--accent-success)' }}>{p.costoUnit > 0 ? `${p.margen}%` : '—'}</div>
          </div>
          <div></div>
          <div>
            <div style={{ fontSize: '10px', color: 'var(--text-tertiary)', letterSpacing: '0.06em', textTransform: 'uppercase', marginBottom: '3px' }}>Costo unit.</div>
            <MoneyDisplay value={p.costoUnit || 0} size="sm" />
          </div>
          <div>
            <div style={{ fontSize: '10px', color: 'var(--text-tertiary)', letterSpacing: '0.06em', textTransform: 'uppercase', marginBottom: '3px' }}>Precio suger.</div>
            <MoneyDisplay value={p.pvp || 0} size="sm" color="green" />
          </div>
        </div>

        <div style={{ height: '1px', background: 'var(--border-subtle)' }} />

        {isArchived ? (
          <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
            <span style={{ fontSize: '12px', color: 'var(--text-tertiary)', flex: 1 }}>Producto archivado</span>
            <Btn variant="secondary" size="sm" icon="refresh" accentColor="var(--accent-success)"
              onClick={() => setProductos(prev => prev.map(x => x.id === p.id ? { ...x, activo: true } : x))}>
              Restaurar producto
            </Btn>
          </div>
        ) : (
          <div style={{ display: 'flex', gap: '8px' }}>
            <Btn variant="secondary" size="sm" icon="fileText" onClick={() => setReceta(p)}>Ver receta</Btn>
            <Btn size="sm" icon="calculator" accentColor={accentColor} onClick={() => onNavigate('fichas')}>Calcular costo</Btn>
            <button onClick={() => setDrawer(p)} style={{ marginLeft: 'auto', background: 'transparent', border: 'none', color: 'var(--text-tertiary)', cursor: 'pointer', padding: '4px', borderRadius: '4px' }}
              onMouseEnter={e => e.currentTarget.style.color = 'var(--text-primary)'}
              onMouseLeave={e => e.currentTarget.style.color = 'var(--text-tertiary)'}
            ><Icon name="edit" size={14} /></button>
          </div>
        )}
      </div>
    );
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '4px' }}>
            <h1 style={{ fontSize: '22px', fontWeight: 400, color: 'var(--text-primary)', letterSpacing: '-0.02em' }}>Productos</h1>
            <span style={{ background: accentColor + '1A', color: accentColor, border: `1px solid ${accentColor}33`, borderRadius: '5px', padding: '2px 10px', fontSize: '12px', fontFamily: 'IBM Plex Mono, monospace', fontWeight: 500 }}>{activos.length}</span>
          </div>
          <div style={{ fontSize: '13px', color: 'var(--text-tertiary)' }}>{activos.length} productos · {negocio.nombre}</div>
        </div>
        <Btn icon="plus" accentColor={accentColor} onClick={() => setDrawer('new')}>Nuevo producto</Btn>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '14px' }}>
        {visibles.map(p => <ProductCard key={p.id} p={p} />)}
      </div>

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

      {drawer && <ProductoDrawer producto={drawer === 'new' ? null : drawer} onClose={() => setDrawer(null)} onSave={handleSave} accentColor={accentColor} onNavigate={onNavigate} />}
      {receta && <RecetaDrawer producto={receta} onClose={() => setReceta(null)} accentColor={accentColor} />}
    </div>
  );
};

export default Productos;
