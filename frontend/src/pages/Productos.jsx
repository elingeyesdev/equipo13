import React, { useState, useRef, useEffect } from 'react';
import { Icon } from '../icons.jsx';
import { StatusBadge, MoneyDisplay, Btn } from '../components/ui.jsx';
import { apiFetch } from '../config/api.js';



const ProductoDrawer = ({ producto, onClose, onSave, accentColor, onNavigate, unidades }) => {
  const [form, setForm] = useState(producto ? { nombre: producto.nombre, codigo_sku: producto.codigo_sku || '', descripcion: producto.descripcion || '', unidad_id: producto.unidad_id || '' } : { nombre: '', codigo_sku: '', descripcion: '', unidad_id: '' });
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
            {iField('Código SKU (opcional)', 'codigo_sku', { placeholder: 'QF-001' })}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <label style={{ fontSize: '11px', color: 'var(--text-tertiary)', fontWeight: 500, letterSpacing: '0.07em', textTransform: 'uppercase' }}>Unidad de medida</label>
              <select value={form.unidad_id || ''} onChange={e => set('unidad_id', e.target.value)} style={{ height: '37px' }}>
                <option value=''>— Seleccionar —</option>
                {(unidades||[]).map(u => <option key={u.id} value={u.id}>{u.nombre} ({u.simbolo})</option>)}
              </select>
            </div>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            <label style={{ fontSize: '11px', color: 'var(--text-tertiary)', fontWeight: 500, letterSpacing: '0.07em', textTransform: 'uppercase' }}>Descripción</label>
            <textarea value={form.descripcion} onChange={e => set('descripcion', e.target.value)} rows={3} placeholder="Descripción breve del producto terminado…" />
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

const RecetaDrawer = ({ producto, onClose, accentColor, negocioId, onNavigate }) => {
  const ref = useRef(null);
  const [bom, setBom] = useState([]);
  const [etapas, setEtapas] = useState([]);
  const [insumos, setInsumos] = useState([]);
  const [unidades, setUnidades] = useState([]);
  const [loading, setLoading] = useState(true);
  const [addingBom, setAddingBom] = useState(false);
  const [addingEtapa, setAddingEtapa] = useState(false);
  const [bomForm, setBomForm] = useState({ insumo_id: '', cantidad: '', unidad_id: '' });
  const [etapaForm, setEtapaForm] = useState({ nombre: '', tiempo_minutos: '', costo_hora: '' });
  const [editingEtapa, setEditingEtapa] = useState(null);

  useEffect(() => {
    if (!negocioId || !producto) return;
    const load = async () => {
      try {
        const [b, e, ins, u] = await Promise.all([
          apiFetch(`/api/negocios/${negocioId}/productos/${producto.id}/bom`),
          apiFetch(`/api/negocios/${negocioId}/productos/${producto.id}/etapas`),
          apiFetch(`/api/negocios/${negocioId}/insumos`),
          apiFetch(`/api/negocios/${negocioId}/unidades`),
        ]);
        setBom(b); setEtapas(e); setInsumos(ins); setUnidades(u);
      } catch(err) { console.error(err); }
      setLoading(false);
    };
    load();
  }, [negocioId, producto]);

  useEffect(() => {
    const h = e => { if (ref.current && !ref.current.contains(e.target)) onClose(); };
    setTimeout(() => document.addEventListener('mousedown', h), 0);
    return () => document.removeEventListener('mousedown', h);
  }, []);

  const totalMPD = bom.reduce((s, r) => s + parseFloat(r.costo_parcial || 0), 0);
  const totalMOD = etapas.reduce((s, e) => s + parseFloat(e.costo_etapa || 0), 0);

  const handleAddBom = async () => {
    if (!bomForm.insumo_id || !bomForm.cantidad) return;
    try {
      const created = await apiFetch(`/api/negocios/${negocioId}/productos/${producto.id}/bom`, {
        method: 'POST', body: JSON.stringify({ insumo_id: bomForm.insumo_id, cantidad: parseFloat(bomForm.cantidad), unidad_id: bomForm.unidad_id || null }),
      });
      setBom(b => [...b, created]);
      setBomForm({ insumo_id: '', cantidad: '', unidad_id: '' });
      setAddingBom(false);
    } catch(e) { console.error(e); }
  };
  const handleDeleteBom = async (bomId) => {
    try {
      await apiFetch(`/api/negocios/${negocioId}/productos/${producto.id}/bom/${bomId}`, { method: 'DELETE' });
      setBom(b => b.filter(x => x.id !== bomId));
    } catch(e) { console.error(e); }
  };
  const handleAddEtapa = async () => {
    if (!etapaForm.nombre || !etapaForm.tiempo_minutos || !etapaForm.costo_hora) return;
    try {
      const created = await apiFetch(`/api/negocios/${negocioId}/productos/${producto.id}/etapas`, {
        method: 'POST', body: JSON.stringify({ nombre: etapaForm.nombre, tiempo_minutos: parseFloat(etapaForm.tiempo_minutos), costo_hora: parseFloat(etapaForm.costo_hora) }),
      });
      setEtapas(e => [...e, created]);
      setEtapaForm({ nombre: '', tiempo_minutos: '', costo_hora: '' });
      setAddingEtapa(false);
    } catch(e) { console.error(e); }
  };
  const handleDeleteEtapa = async (etapaId) => {
    try {
      await apiFetch(`/api/negocios/${negocioId}/productos/${producto.id}/etapas/${etapaId}`, { method: 'DELETE' });
      setEtapas(e => e.filter(x => x.id !== etapaId));
    } catch(e) { console.error(e); }
  };

  const handleReorder = async (fromIdx, toIdx) => {
    if (fromIdx === toIdx) return;
    const newEtapas = [...etapas];
    const [moved] = newEtapas.splice(fromIdx, 1);
    newEtapas.splice(toIdx, 0, moved);
    setEtapas(newEtapas);
    try {
      const items = newEtapas.map((e, i) => ({ id: e.id, orden: i + 1 }));
      await apiFetch(`/api/negocios/${negocioId}/productos/${producto.id}/etapas/reorder`, {
        method: 'POST', body: JSON.stringify({ items })
      });
    } catch(err) {
      console.error(err);
    }
  };

  const iStyle = { background: 'var(--bg-tertiary)', border: '1px solid var(--border-subtle)', borderRadius: '5px', color: 'var(--text-primary)', padding: '6px 8px', fontSize: '12px', outline: 'none', fontFamily: 'var(--font-sans)', width: '100%' };

  const Row = ({ row, onDel }) => {
    const [editing, setEditing] = useState(false);
    const [form, setForm] = useState({ cantidad: parseFloat(row.cantidad) });
    
    useEffect(() => { setForm({ cantidad: parseFloat(row.cantidad) }); }, [row]);

    const handleSave = async () => {
      if (!form.cantidad) return;
      try {
        const updated = await apiFetch(`/api/negocios/${negocioId}/productos/${producto.id}/bom/${row.id}`, {
          method: 'PUT', body: JSON.stringify({ cantidad: parseFloat(form.cantidad) })
        });
        setBom(b => b.map(x => x.id === row.id ? updated : x));
        setEditing(false);
      } catch(e) { console.error(e); }
    };

    if (editing) {
      return (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 70px 50px 90px 80px 50px', gap: '6px', padding: '8px 0', borderBottom: '1px solid var(--border-subtle)', alignItems: 'center' }}>
          <span style={{ fontSize: '13px', color: 'var(--text-primary)' }}>{row.insumo_nombre}</span>
          <input type="number" step="0.001" value={form.cantidad} onChange={e=>setForm({...form, cantidad:e.target.value})} style={{...iStyle, fontFamily: 'var(--font-mono)', padding: '4px 6px'}} />
          <span style={{ fontSize: '12px', color: 'var(--text-tertiary)', textAlign: 'center' }}>{row.unidad_simbolo || ''}</span>
          <span style={{ fontFamily: 'IBM Plex Mono, monospace', fontSize: '12px', color: 'var(--text-secondary)', textAlign: 'right' }}>Bs {parseFloat(row.precio_unitario).toFixed(2)}</span>
          <span style={{ fontFamily: 'IBM Plex Mono, monospace', fontSize: '12px', color: accentColor, textAlign: 'right' }}>Bs {parseFloat(row.costo_parcial).toFixed(2)}</span>
          <div style={{ display: 'flex', gap: '4px', justifyContent: 'flex-end' }}>
            <button onClick={handleSave} style={{ background: 'transparent', border: 'none', color: 'var(--accent-success)', cursor: 'pointer', padding: '2px' }}><Icon name="check" size={14} /></button>
            <button onClick={()=>setEditing(false)} style={{ background: 'transparent', border: 'none', color: 'var(--text-tertiary)', cursor: 'pointer', padding: '2px' }}><Icon name="x" size={14} /></button>
          </div>
        </div>
      );
    }

    return (
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 70px 50px 90px 80px 50px', gap: '6px', padding: '8px 0', borderBottom: '1px solid var(--border-subtle)', alignItems: 'center' }}>
        <span style={{ fontSize: '13px', color: 'var(--text-primary)' }}>{row.insumo_nombre}</span>
        <span style={{ fontFamily: 'IBM Plex Mono, monospace', fontSize: '12px', color: 'var(--text-secondary)', textAlign: 'right' }}>{parseFloat(row.cantidad).toFixed(3)}</span>
        <span style={{ fontSize: '12px', color: 'var(--text-tertiary)', textAlign: 'center' }}>{row.unidad_simbolo || ''}</span>
        <span style={{ fontFamily: 'IBM Plex Mono, monospace', fontSize: '12px', color: 'var(--text-secondary)', textAlign: 'right' }}>Bs {parseFloat(row.precio_unitario).toFixed(2)}</span>
        <span style={{ fontFamily: 'IBM Plex Mono, monospace', fontSize: '12px', color: accentColor, textAlign: 'right' }}>Bs {parseFloat(row.costo_parcial).toFixed(2)}</span>
        <div style={{ display: 'flex', gap: '4px', justifyContent: 'flex-end' }}>
          <button onClick={()=>setEditing(true)} style={{ background: 'transparent', border: 'none', color: 'var(--text-tertiary)', cursor: 'pointer', padding: '2px' }}><Icon name="edit" size={13} /></button>
          <button onClick={onDel} style={{ background: 'transparent', border: 'none', color: 'var(--text-tertiary)', cursor: 'pointer', padding: '2px' }}><Icon name="trash" size={13} /></button>
        </div>
      </div>
    );
  };
  const EtapaRow = ({ et, idx, onDel, onReorder }) => {
    const [editing, setEditing] = useState(false);
    const [form, setForm] = useState({ 
      nombre: et.nombre, 
      tiempo_minutos: Math.round(Number(et.tiempo_minutos) * 100) / 100, 
      costo_hora: Math.round(Number(et.costo_hora) * 100) / 100 
    });
    
    useEffect(() => {
      setForm({
        nombre: et.nombre, 
        tiempo_minutos: Math.round(Number(et.tiempo_minutos) * 100) / 100, 
        costo_hora: Math.round(Number(et.costo_hora) * 100) / 100 
      });
    }, [et]);

    const costoU = parseFloat(et.costo_etapa || 0);

    const handleSave = async () => {
      if (!form.nombre || !form.tiempo_minutos || !form.costo_hora) return;
      try {
        const updated = await apiFetch(`/api/negocios/${negocioId}/productos/${producto.id}/etapas/${et.id}`, {
          method: 'PUT', body: JSON.stringify({ nombre: form.nombre, tiempo_minutos: parseFloat(form.tiempo_minutos), costo_hora: parseFloat(form.costo_hora) })
        });
        setEtapas(es => es.map(x => x.id === et.id ? updated : x));
        setEditing(false);
      } catch(e) { console.error(e); }
    };

    if (editing) {
      return (
        <div style={{ display: 'grid', gridTemplateColumns: '30px 20px 1fr 60px 80px 80px 50px', gap: '6px', padding: '8px 0', borderBottom: '1px solid var(--border-subtle)', alignItems: 'center' }}>
          <div />
          <span style={{ fontFamily: 'IBM Plex Mono, monospace', fontSize: '11px', color: 'var(--text-tertiary)', textAlign: 'center' }}>{idx + 1}</span>
          <input value={form.nombre} onChange={e=>setForm({...form, nombre:e.target.value})} style={iStyle} />
          <input type="number" step="0.001" value={form.tiempo_minutos} onChange={e=>setForm({...form, tiempo_minutos:e.target.value})} style={{...iStyle, fontFamily: 'var(--font-mono)'}} />
          <input type="number" step="0.001" value={form.costo_hora} onChange={e=>setForm({...form, costo_hora:e.target.value})} style={{...iStyle, fontFamily: 'var(--font-mono)'}} />
          <span style={{ fontFamily: 'IBM Plex Mono, monospace', fontSize: '12px', color: accentColor, textAlign: 'right' }}>Bs {costoU.toFixed(2)}</span>
          <div style={{ display: 'flex', gap: '4px', justifyContent: 'flex-end' }}>
            <button onClick={handleSave} style={{ background: 'transparent', border: 'none', color: 'var(--accent-success)', cursor: 'pointer', padding: '2px' }}><Icon name="check" size={14} /></button>
            <button onClick={()=>setEditing(false)} style={{ background: 'transparent', border: 'none', color: 'var(--text-tertiary)', cursor: 'pointer', padding: '2px' }}><Icon name="x" size={14} /></button>
          </div>
        </div>
      );
    }

    const handleDragStart = (e) => {
      e.dataTransfer.setData('text/plain', idx);
      e.dataTransfer.effectAllowed = 'move';
    };
    const handleDragOver = (e) => {
      e.preventDefault();
      e.dataTransfer.dropEffect = 'move';
    };
    const handleDrop = (e) => {
      e.preventDefault();
      const fromIdx = Number(e.dataTransfer.getData('text/plain'));
      onReorder(fromIdx, idx);
    };

    return (
      <div 
        draggable
        onDragStart={handleDragStart}
        onDragOver={handleDragOver}
        onDrop={handleDrop}
        style={{ display: 'grid', gridTemplateColumns: '30px 20px 1fr 60px 80px 80px 50px', gap: '6px', padding: '8px 0', borderBottom: '1px solid var(--border-subtle)', alignItems: 'center', cursor: 'grab' }}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-tertiary)' }}>
          <Icon name="grip" size={14} />
        </div>
        <span style={{ fontFamily: 'IBM Plex Mono, monospace', fontSize: '11px', color: 'var(--text-tertiary)' }}>{idx + 1}</span>
        <span style={{ fontSize: '13px', color: 'var(--text-primary)' }}>{et.nombre}</span>
        <span style={{ fontFamily: 'IBM Plex Mono, monospace', fontSize: '12px', color: 'var(--text-secondary)', textAlign: 'right' }}>{parseFloat(et.tiempo_minutos)} min</span>
        <span style={{ fontFamily: 'IBM Plex Mono, monospace', fontSize: '12px', color: 'var(--text-secondary)', textAlign: 'right' }}>Bs {parseFloat(et.costo_hora).toFixed(2)}</span>
        <span style={{ fontFamily: 'IBM Plex Mono, monospace', fontSize: '12px', color: accentColor, textAlign: 'right' }}>Bs {costoU.toFixed(2)}</span>
        <div style={{ display: 'flex', gap: '4px', justifyContent: 'flex-end' }}>
          <button onClick={()=>setEditing(true)} style={{ background: 'transparent', border: 'none', color: 'var(--text-tertiary)', cursor: 'pointer', padding: '2px' }}><Icon name="edit" size={13} /></button>
          <button onClick={onDel} style={{ background: 'transparent', border: 'none', color: 'var(--text-tertiary)', cursor: 'pointer', padding: '2px' }}><Icon name="trash" size={13} /></button>
        </div>
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
          {loading ? <div style={{ textAlign: 'center', color: 'var(--text-tertiary)', padding: '40px' }}>Cargando receta...</div> : <>
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
              <span style={{ fontSize: '11px', fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase', color: accentColor }}>Materias primas (BOM)</span>
              <Btn variant="ghost" size="sm" icon="plus" accentColor={accentColor} onClick={() => setAddingBom(!addingBom)}>Agregar insumo</Btn>
            </div>
            {addingBom && (
              <div style={{ display: 'flex', gap: '6px', marginBottom: '8px', alignItems: 'flex-end' }}>
                <select value={bomForm.insumo_id} onChange={e => setBomForm(f=>({...f, insumo_id: e.target.value}))} style={{...iStyle, flex:2}}><option value="">Seleccionar insumo</option>{insumos.map(i=><option key={i.id} value={i.id}>{i.nombre}</option>)}</select>
                <input type="number" step="0.001" placeholder="Cant." value={bomForm.cantidad} onChange={e => setBomForm(f=>({...f, cantidad: e.target.value}))} style={{...iStyle, flex:1, fontFamily:'var(--font-mono)'}} />
                <select value={bomForm.unidad_id} onChange={e => setBomForm(f=>({...f, unidad_id: e.target.value}))} style={{...iStyle, flex:1}}><option value="">Unidad</option>{unidades.map(u=><option key={u.id} value={u.id}>{u.simbolo}</option>)}</select>
                <Btn size="sm" accentColor={accentColor} onClick={handleAddBom}>+</Btn>
              </div>
            )}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 70px 50px 90px 80px 50px', gap: '6px', padding: '6px 0', borderBottom: '1px solid var(--border-mid)', marginBottom: '2px' }}>
              {['Insumo', 'Cantidad', 'Unidad', 'Precio/u', 'Costo', ''].map((h, i) => (
                <div key={i} style={{ fontSize: '11px', color: 'var(--text-tertiary)', letterSpacing: '0.04em', textAlign: i === 2 ? 'center' : (i >= 1 && i <= 4 ? 'right' : 'left') }}>{h}</div>
              ))}
            </div>
            {bom.map(r => <Row key={r.id} row={r} onDel={() => handleDeleteBom(r.id)} />)}
            <div style={{ display: 'flex', justifyContent: 'flex-end', padding: '10px 48px 0 0' }}>
              <span style={{ fontSize: '11px', color: 'var(--text-tertiary)', marginRight: '12px', textTransform: 'uppercase', letterSpacing: '0.06em', fontWeight: 600 }}>Total MPD</span>
              <span style={{ fontFamily: 'IBM Plex Mono, monospace', fontSize: '13px', color: accentColor, fontWeight: 500 }}>Bs {totalMPD.toFixed(2)}</span>
            </div>
          </div>
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
              <span style={{ fontSize: '11px', fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase', color: accentColor }}>Etapas de producción</span>
              <Btn variant="ghost" size="sm" icon="plus" accentColor={accentColor} onClick={() => setAddingEtapa(!addingEtapa)}>Agregar etapa</Btn>
            </div>
            {addingEtapa && (
              <div style={{ display: 'flex', gap: '6px', marginBottom: '8px', alignItems: 'flex-end' }}>
                <input placeholder="Nombre etapa" value={etapaForm.nombre} onChange={e => setEtapaForm(f=>({...f, nombre: e.target.value}))} style={{...iStyle, flex:2}} />
                <input type="number" step="0.001" placeholder="Min." value={etapaForm.tiempo_minutos} onChange={e => setEtapaForm(f=>({...f, tiempo_minutos: e.target.value}))} style={{...iStyle, flex:1, fontFamily:'var(--font-mono)'}} />
                <input type="number" step="0.001" placeholder="Bs/h" value={etapaForm.costo_hora} onChange={e => setEtapaForm(f=>({...f, costo_hora: e.target.value}))} style={{...iStyle, flex:1, fontFamily:'var(--font-mono)'}} />
                <Btn size="sm" accentColor={accentColor} onClick={handleAddEtapa}>+</Btn>
              </div>
            )}
            <div style={{ display: 'grid', gridTemplateColumns: '30px 20px 1fr 60px 80px 80px 50px', gap: '6px', padding: '6px 0', borderBottom: '1px solid var(--border-mid)', marginBottom: '2px' }}>
              {['', '#', 'Etapa', 'Tiempo', 'Costo/h', 'Costo/u', ''].map((h, i) => (
                <div key={i} style={{ fontSize: '11px', color: 'var(--text-tertiary)', letterSpacing: '0.04em', textAlign: i >= 3 && i <= 5 ? 'right' : 'left' }}>{h}</div>
              ))}
            </div>
            {etapas.map((et, idx) => (
              <EtapaRow 
                key={et.id} et={et} idx={idx} 
                onDel={() => handleDeleteEtapa(et.id)} 
                onReorder={handleReorder}
              />
            ))}
            <div style={{ display: 'flex', justifyContent: 'flex-end', padding: '10px 40px 0 0' }}>
              <span style={{ fontSize: '11px', color: 'var(--text-tertiary)', marginRight: '12px', textTransform: 'uppercase', letterSpacing: '0.06em', fontWeight: 600 }}>Total MOD</span>
              <span style={{ fontFamily: 'IBM Plex Mono, monospace', fontSize: '13px', color: accentColor, fontWeight: 500 }}>Bs {totalMOD.toFixed(2)}</span>
            </div>
          </div>
          </>}
        </div>
        <div style={{ padding: '16px 24px', borderTop: '1px solid var(--border-subtle)', display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
          <Btn variant="secondary" onClick={onClose}>Cerrar</Btn>
          <Btn accentColor={accentColor} icon="calculator" onClick={() => { onClose(); if(onNavigate) onNavigate('fichas', { productoId: producto.id }); }}>Calcular costo con esta receta</Btn>
        </div>
      </div>
    </div>
  );
};


const Productos = ({ negocio, onNavigate }) => {
  const negocioId = negocio?.id;
  const isAgro = negocio?.rubro === 'agro_ganadero';
  const accentColor = isAgro ? 'var(--accent-agro)' : 'var(--accent-industrial)';
  const [productos, setProductos] = useState([]);
  const [unidades, setUnidades] = useState([]);
  const [mostrarArchivados, setMostrarArchivados] = useState(false);
  const [drawer, setDrawer] = useState(null);
  const [receta, setReceta] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const cargarProductos = async () => {
    try {
      const data = await apiFetch(`/api/negocios/${negocioId}/productos?activo=all`);
      setProductos(data);
    } catch(e) { setError(e?.error || 'Error cargando productos'); }
  };

  useEffect(() => {
    if (!negocioId) return;
    setLoading(true);
    Promise.all([
      apiFetch(`/api/negocios/${negocioId}/productos?activo=all`),
      apiFetch(`/api/negocios/${negocioId}/unidades`),
    ]).then(([p, u]) => { setProductos(p); setUnidades(u); }).catch(e => setError(e?.error || 'Error')).finally(() => setLoading(false));
    setMostrarArchivados(false);
  }, [negocioId]);

  const handleSave = async form => {
    try {
      const payload = { nombre: form.nombre, codigo_sku: form.codigo_sku || null, descripcion: form.descripcion || null, unidad_id: form.unidad_id || null };
      if (form.id) {
        await apiFetch(`/api/negocios/${negocioId}/productos/${form.id}`, { method: 'PUT', body: JSON.stringify(payload) });
      } else {
        await apiFetch(`/api/negocios/${negocioId}/productos`, { method: 'POST', body: JSON.stringify(payload) });
      }
      await cargarProductos();
      setDrawer(null);
    } catch(e) { setError(e?.error || 'Error guardando producto'); }
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
            <div style={{ fontSize: '11px', color: 'var(--text-tertiary)', fontFamily: 'IBM Plex Mono, monospace' }}>{p.codigo_sku || 'Sin SKU'}</div>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '4px' }}>
            <StatusBadge label={isArchived ? 'Archivado' : 'Activo'} color={isArchived ? 'var(--text-tertiary)' : 'var(--accent-success)'} />
            <StatusBadge label={`${p.bom_count || 0} items BOM`} color={p.bom_count > 0 ? accentColor : 'var(--text-tertiary)'} />
          </div>
        </div>

        <div style={{ height: '1px', background: 'var(--border-subtle)' }} />

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
          <div>
            <div style={{ fontSize: '10px', color: 'var(--text-tertiary)', letterSpacing: '0.06em', textTransform: 'uppercase', marginBottom: '3px' }}>BOM Items</div>
            <div style={{ fontFamily: 'IBM Plex Mono, monospace', fontSize: '12px', color: 'var(--text-secondary)' }}>{p.bom_count || 0}</div>
          </div>
          <div>
            <div style={{ fontSize: '10px', color: 'var(--text-tertiary)', letterSpacing: '0.06em', textTransform: 'uppercase', marginBottom: '3px' }}>Etapas</div>
            <div style={{ fontFamily: 'IBM Plex Mono, monospace', fontSize: '12px', color: 'var(--text-secondary)' }}>{p.tiene_etapas ? 'Sí' : 'No'}</div>
          </div>
          <div>
            <div style={{ fontSize: '10px', color: 'var(--text-tertiary)', letterSpacing: '0.06em', textTransform: 'uppercase', marginBottom: '3px' }}>Unidad</div>
            <div style={{ fontFamily: 'IBM Plex Mono, monospace', fontSize: '12px', color: 'var(--text-secondary)' }}>{p.unidad_simbolo || '—'}</div>
          </div>
          <div></div>
        </div>

        <div style={{ height: '1px', background: 'var(--border-subtle)' }} />

        {isArchived ? (
          <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
            <span style={{ fontSize: '12px', color: 'var(--text-tertiary)', flex: 1 }}>Producto archivado</span>
            <Btn variant="secondary" size="sm" icon="refresh" accentColor="var(--accent-success)"
              onClick={async () => { await apiFetch(`/api/negocios/${negocioId}/productos/${p.id}/archivar`, {method:'PATCH'}); await cargarProductos(); }}>
              Restaurar producto
            </Btn>
          </div>
        ) : (
          <div style={{ display: 'flex', gap: '8px' }}>
            <Btn variant="secondary" size="sm" icon="fileText" onClick={() => setReceta(p)}>Ver receta</Btn>
            <Btn size="sm" icon="calculator" accentColor={accentColor} onClick={() => onNavigate('fichas', { productoId: p.id })}>Calcular costo</Btn>
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
          <div style={{ fontSize: '13px', color: 'var(--text-tertiary)' }}>{activos.length} productos activos</div>
        </div>
        <Btn icon="plus" accentColor={accentColor} onClick={() => setDrawer('new')}>Nuevo producto</Btn>
      </div>

      {error && <div style={{ color: 'var(--accent-danger)', fontSize: '13px' }}>{error}</div>}
      {loading ? <div style={{ textAlign: 'center', color: 'var(--text-tertiary)', padding: '40px' }}>Cargando productos...</div> : (
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '14px' }}>
        {visibles.map(p => <ProductCard key={p.id} p={p} />)}
      </div>)}

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

      {drawer && <ProductoDrawer producto={drawer === 'new' ? null : drawer} onClose={() => setDrawer(null)} onSave={handleSave} accentColor={accentColor} onNavigate={onNavigate} unidades={unidades} />}
      {receta && <RecetaDrawer producto={receta} onClose={() => { setReceta(null); cargarProductos(); }} accentColor={accentColor} negocioId={negocioId} onNavigate={onNavigate} />}
    </div>
  );
};

export default Productos;
