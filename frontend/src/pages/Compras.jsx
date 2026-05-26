import React, { useState, useRef, useEffect } from 'react';
import { Icon } from '../icons.jsx';
import { Btn } from '../components/ui.jsx';
import { apiFetch } from '../config/api.js';

const ACCENT = 'var(--accent-agro)';

const Field = ({ label, children }) => (
  <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
    <label style={{ fontSize: '11px', color: 'var(--text-tertiary)', fontWeight: 500, letterSpacing: '0.07em', textTransform: 'uppercase' }}>{label}</label>
    {children}
  </div>
);

const TInput = ({ value, onChange, type = 'text', placeholder = '', mono = false, readOnly = false }) => (
  <input
    value={value} onChange={e => onChange && onChange(e.target.value)}
    type={type} placeholder={placeholder} readOnly={readOnly}
    style={{
      background: readOnly ? 'var(--bg-primary)' : 'var(--bg-tertiary)',
      border: '1px solid var(--border-subtle)', borderRadius: '6px',
      color: readOnly ? 'var(--text-secondary)' : 'var(--text-primary)',
      padding: '8px 12px', fontSize: '13px',
      fontFamily: mono ? 'var(--font-mono)' : 'var(--font-sans)',
      outline: 'none', width: '100%', cursor: readOnly ? 'default' : 'text',
    }}
    onFocus={e => { if (!readOnly) e.target.style.borderColor = ACCENT; }}
    onBlur={e => e.target.style.borderColor = 'var(--border-subtle)'}
  />
);

const selStyle = hasVal => ({
  width: '100%', background: 'var(--bg-tertiary)', border: '1px solid var(--border-subtle)',
  color: hasVal ? 'var(--text-primary)' : 'var(--text-tertiary)',
  borderRadius: '6px', padding: '8px 12px', fontSize: '13px', outline: 'none', cursor: 'pointer',
});

const hoy = () => new Date().toISOString().split('T')[0];

const CompraDrawer = ({ onClose, onSaved, negocioId, insumos, proveedores }) => {
  const ref = useRef(null);
  const [form, setForm] = useState({
    insumo_id: '', proveedor_id: '', fecha_compra: hoy(),
    cantidad_comprada: '', precio_unitario: '', numero_factura: '', notas: '',
  });
  const [stockInfo, setStockInfo] = useState(null);
  const [loadingStock, setLoadingStock] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    const h = e => { if (ref.current && !ref.current.contains(e.target)) onClose(); };
    setTimeout(() => document.addEventListener('mousedown', h), 0);
    return () => document.removeEventListener('mousedown', h);
  }, []);

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const handleInsumoChange = async (insumoId) => {
    set('insumo_id', insumoId);
    setStockInfo(null);
    if (!insumoId) return;
    setLoadingStock(true);
    try {
      const data = await apiFetch(`/api/negocios/${negocioId}/compras/${insumoId}/stock`);
      setStockInfo(data);
    } catch {
      setStockInfo(null);
    } finally {
      setLoadingStock(false);
    }
  };

  const insumoSeleccionado = insumos.find(i => i.id === form.insumo_id);
  const total = form.cantidad_comprada && form.precio_unitario
    ? (parseFloat(form.cantidad_comprada) * parseFloat(form.precio_unitario)).toFixed(4)
    : '';

  const handleSave = async () => {
    setError('');
    setSaving(true);
    try {
      await apiFetch(`/api/negocios/${negocioId}/compras`, {
        method: 'POST',
        body: JSON.stringify({
          insumo_id: form.insumo_id,
          proveedor_id: form.proveedor_id || null,
          fecha_compra: form.fecha_compra,
          cantidad_comprada: form.cantidad_comprada,
          precio_unitario: form.precio_unitario,
          unidad_id: insumoSeleccionado?.unidad_id || null,
          numero_factura: form.numero_factura || null,
          notas: form.notas || null,
        }),
      });
      onSaved();
      onClose();
    } catch (e) {
      setError(e?.error || 'No se pudo registrar la compra');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', zIndex: 300, display: 'flex', justifyContent: 'flex-end' }}>
      <div ref={ref} style={{ width: '440px', background: 'var(--bg-secondary)', borderLeft: '1px solid var(--border-mid)', height: '100%', display: 'flex', flexDirection: 'column', animation: 'slideIn 0.2s ease' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '20px 24px', borderBottom: '1px solid var(--border-subtle)' }}>
          <span style={{ fontSize: '15px', fontWeight: 500, color: 'var(--text-primary)' }}>Registrar compra</span>
          <button onClick={onClose} style={{ background: 'transparent', border: 'none', color: 'var(--text-tertiary)', cursor: 'pointer' }}><Icon name="x" size={16} /></button>
        </div>

        <div style={{ flex: 1, overflowY: 'auto', padding: '24px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {error && <div style={{ color: 'var(--accent-danger)', fontSize: '13px', padding: '8px 12px', background: 'var(--accent-danger)10', borderRadius: '6px', border: '1px solid var(--accent-danger)33' }}>{error}</div>}

          <Field label="Insumo *">
            <select value={form.insumo_id} onChange={e => handleInsumoChange(e.target.value)} style={selStyle(!!form.insumo_id)}
              onFocus={e => e.target.style.borderColor = ACCENT} onBlur={e => e.target.style.borderColor = 'var(--border-subtle)'}>
              <option value="">— Seleccionar insumo —</option>
              {insumos.map(i => <option key={i.id} value={i.id}>{i.nombre}</option>)}
            </select>
            {loadingStock && <div style={{ fontSize: '11px', color: 'var(--text-tertiary)' }}>Cargando stock…</div>}
            {stockInfo && !loadingStock && (
              <div style={{ fontSize: '12px', color: 'var(--text-secondary)', fontFamily: 'var(--font-mono)' }}>
                Stock actual: <strong>{parseFloat(stockInfo.stock_total).toFixed(2)} {stockInfo.insumo?.unidad_simbolo || ''}</strong>
              </div>
            )}
          </Field>

          <Field label="Proveedor">
            <select value={form.proveedor_id} onChange={e => set('proveedor_id', e.target.value)} style={selStyle(!!form.proveedor_id)}
              onFocus={e => e.target.style.borderColor = ACCENT} onBlur={e => e.target.style.borderColor = 'var(--border-subtle)'}>
              <option value="">— Opcional —</option>
              {proveedores.map(p => <option key={p.id} value={p.id}>{p.nombre}</option>)}
            </select>
          </Field>

          <Field label="Fecha de compra *">
            <TInput value={form.fecha_compra} onChange={v => set('fecha_compra', v)} type="date" />
          </Field>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
            <Field label="Cantidad *">
              <TInput value={form.cantidad_comprada} onChange={v => set('cantidad_comprada', v)} type="number" placeholder="0" mono />
            </Field>
            <Field label="Unidad">
              <TInput value={insumoSeleccionado?.unidad_simbolo || '—'} readOnly mono />
            </Field>
          </div>

          <Field label="Precio unitario (Bs) *">
            <TInput value={form.precio_unitario} onChange={v => set('precio_unitario', v)} type="number" placeholder="0.00" mono />
          </Field>

          <Field label="Total (calculado)">
            <TInput value={total ? `Bs ${parseFloat(total).toLocaleString('es-BO', { minimumFractionDigits: 2 })}` : ''} readOnly mono placeholder="Bs 0.00" />
          </Field>

          <Field label="N° de factura">
            <TInput value={form.numero_factura} onChange={v => set('numero_factura', v)} placeholder="Opcional" mono />
          </Field>

          <Field label="Notas">
            <textarea value={form.notas} onChange={e => set('notas', e.target.value)} rows={3} placeholder="Observaciones opcionales…"
              style={{ background: 'var(--bg-tertiary)', border: '1px solid var(--border-subtle)', borderRadius: '6px', color: 'var(--text-primary)', padding: '8px 12px', fontSize: '13px', fontFamily: 'var(--font-sans)', outline: 'none', resize: 'vertical' }}
              onFocus={e => e.target.style.borderColor = ACCENT} onBlur={e => e.target.style.borderColor = 'var(--border-subtle)'}
            />
          </Field>
        </div>

        <div style={{ padding: '16px 24px', borderTop: '1px solid var(--border-subtle)', display: 'flex', gap: '8px' }}>
          <Btn variant="secondary" onClick={onClose}>Cancelar</Btn>
          <Btn accentColor={ACCENT} icon="save" onClick={handleSave} disabled={saving}>
            {saving ? 'Guardando…' : 'Registrar compra'}
          </Btn>
        </div>
      </div>
      <style>{`@keyframes slideIn { from { transform: translateX(100%); } to { transform: translateX(0); } }`}</style>
    </div>
  );
};

const ReporteFilaConsumo = ({ c, expanded, onToggle }) => {
  const fechaStr = c.fecha_consumo
    ? new Date(c.fecha_consumo + 'T12:00:00').toLocaleDateString('es-BO', { day: '2-digit', month: '2-digit', year: 'numeric' })
    : '—';
  const detalle = c.detalle_fifo
    ? (typeof c.detalle_fifo === 'string' ? JSON.parse(c.detalle_fifo) : c.detalle_fifo)
    : [];

  const rCols = '100px minmax(100px,1fr) 90px 130px 100px 36px';

  return (
    <>
      <div style={{ display: 'grid', gridTemplateColumns: rCols, padding: '11px 16px', borderBottom: '1px solid var(--border-subtle)', gap: '10px', alignItems: 'center', transition: 'background 0.1s' }}
        onMouseEnter={e => e.currentTarget.style.background = 'var(--bg-tertiary)'}
        onMouseLeave={e => e.currentTarget.style.background = expanded ? 'var(--bg-tertiary)' : 'transparent'}
      >
        <div style={{ fontSize: '12px', color: 'var(--text-secondary)', fontFamily: 'var(--font-mono)' }}>{fechaStr}</div>
        <div style={{ fontSize: '13px', color: 'var(--text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {c.lote_identificador || '—'}
        </div>
        <div style={{ fontFamily: 'var(--font-mono)', fontSize: '13px', color: 'var(--text-primary)' }}>
          {parseFloat(c.cantidad_total).toFixed(2)}
        </div>
        <div style={{ fontFamily: 'var(--font-mono)', fontSize: '12px', color: 'var(--text-secondary)' }}>
          Bs {parseFloat(c.precio_promedio).toFixed(4)}/{c.unidad_simbolo || 'u'}
        </div>
        <div style={{ fontFamily: 'var(--font-mono)', fontSize: '13px', color: 'var(--text-primary)' }}>
          Bs {parseFloat(c.costo_total).toLocaleString('es-BO', { minimumFractionDigits: 2 })}
        </div>
        <div style={{ display: 'flex', justifyContent: 'center' }}>
          <button onClick={onToggle}
            style={{ background: 'transparent', border: '1px solid var(--border-subtle)', borderRadius: '4px', color: 'var(--text-tertiary)', cursor: 'pointer', padding: '2px 6px', display: 'flex', alignItems: 'center', transition: 'all 0.15s' }}
            onMouseEnter={e => { e.currentTarget.style.background = 'var(--bg-primary)'; e.currentTarget.style.color = ACCENT; }}
            onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = 'var(--text-tertiary)'; }}
          >
            <Icon name={expanded ? 'chevronUp' : 'chevronDown'} size={12} />
          </button>
        </div>
      </div>

      {expanded && detalle.length > 0 && (
        <div style={{ padding: '10px 16px 14px', borderBottom: '1px solid var(--border-subtle)', background: 'var(--bg-primary)' }}>
          <div style={{ border: '1px solid var(--border-subtle)', borderRadius: '6px', overflow: 'hidden', fontSize: '12px', fontFamily: 'var(--font-mono)' }}>
            {detalle.map((l, i) => (
              <div key={i} style={{ display: 'flex', justifyContent: 'space-between', padding: '7px 12px', borderBottom: i < detalle.length - 1 ? '1px solid var(--border-subtle)' : 'none', color: 'var(--text-secondary)' }}>
                <span>Compra del {new Date(l.fecha_compra + 'T12:00:00').toLocaleDateString('es-BO', { day: '2-digit', month: '2-digit', year: 'numeric' })}</span>
                <span>{parseFloat(l.cantidad).toFixed(2)} × Bs {parseFloat(l.precio_unitario).toFixed(2)}</span>
                <span style={{ color: 'var(--text-primary)' }}>= Bs {parseFloat(l.subtotal).toFixed(2)}</span>
              </div>
            ))}
            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 12px', background: 'var(--bg-secondary)', borderTop: '1px solid var(--border-subtle)', color: 'var(--text-secondary)' }}>
              <span>Precio promedio: <strong style={{ color: 'var(--text-primary)' }}>Bs {parseFloat(c.precio_promedio).toFixed(4)}/{c.unidad_simbolo || 'u'}</strong></span>
              <span>Total: <strong style={{ color: 'var(--text-primary)' }}>Bs {parseFloat(c.costo_total).toLocaleString('es-BO', { minimumFractionDigits: 2 })}</strong></span>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

const DisponibleCell = ({ comprada, disponible }) => {
  const c = parseFloat(comprada);
  const d = parseFloat(disponible);
  if (d === 0) {
    return <span style={{ color: 'var(--text-tertiary)', textDecoration: 'line-through', fontFamily: 'var(--font-mono)', fontSize: '13px' }}>{d.toFixed(2)}</span>;
  }
  if (d < c) {
    return <span style={{ color: 'var(--accent-warning)', fontFamily: 'var(--font-mono)', fontSize: '13px' }}>{d.toFixed(2)}</span>;
  }
  return <span style={{ color: 'var(--accent-success)', fontFamily: 'var(--font-mono)', fontSize: '13px' }}>{d.toFixed(2)}</span>;
};

const Compras = ({ negocioId }) => {
  const [compras, setCompras] = useState([]);
  const [insumos, setInsumos] = useState([]);
  const [proveedores, setProveedores] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [drawer, setDrawer] = useState(false);

  const [filtroInsumo, setFiltroInsumo] = useState('');
  const [filtroDesde, setFiltroDesde] = useState('');
  const [filtroHasta, setFiltroHasta] = useState('');

  const [reporteInsumoId, setReporteInsumoId] = useState('');
  const [reporteDesde, setReporteDesde] = useState('');
  const [reporteHasta, setReporteHasta] = useState('');
  const [reporte, setReporte] = useState(null);
  const [loadingReporte, setLoadingReporte] = useState(false);
  const [errorReporte, setErrorReporte] = useState('');
  const [expandedReporteIds, setExpandedReporteIds] = useState(new Set());

  const cargarBase = async () => {
    try {
      const [ins, provs] = await Promise.all([
        apiFetch(`/api/negocios/${negocioId}/insumos`),
        apiFetch(`/api/negocios/${negocioId}/proveedores`),
      ]);
      setInsumos(ins);
      setProveedores(provs.filter(p => p.activo));
    } catch {}
  };

  const cargarCompras = async () => {
    setLoading(true);
    setError('');
    try {
      const params = new URLSearchParams();
      if (filtroInsumo) params.set('insumo_id', filtroInsumo);
      if (filtroDesde) params.set('fecha_desde', filtroDesde);
      if (filtroHasta) params.set('fecha_hasta', filtroHasta);
      const data = await apiFetch(`/api/negocios/${negocioId}/compras?${params}`);
      setCompras(data);
    } catch (e) {
      setError(e?.error || 'No se pudieron cargar las compras');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!negocioId) return;
    cargarBase();
    cargarCompras();
  }, [negocioId]);

  const handleEliminar = async (compra) => {
    if (!confirm(`¿Eliminar la compra de ${compra.insumo_nombre}?`)) return;
    setError('');
    try {
      await apiFetch(`/api/negocios/${negocioId}/compras/${compra.id}`, { method: 'DELETE' });
      await cargarCompras();
    } catch (e) {
      if (e?.error) {
        setError(e.error);
      } else {
        setError('No se pudo eliminar la compra');
      }
    }
  };

  const cargarReporte = async () => {
    if (!reporteInsumoId) { setErrorReporte('Seleccioná un insumo para ver el reporte.'); return; }
    setLoadingReporte(true);
    setErrorReporte('');
    setReporte(null);
    setExpandedReporteIds(new Set());
    try {
      const params = new URLSearchParams();
      if (reporteDesde) params.set('fecha_desde', reporteDesde);
      if (reporteHasta) params.set('fecha_hasta', reporteHasta);
      const data = await apiFetch(`/api/negocios/${negocioId}/catalogo/${reporteInsumoId}/consumos?${params}`);
      setReporte(data);
    } catch (e) {
      setErrorReporte(e?.error || 'No se pudo cargar el reporte');
    } finally {
      setLoadingReporte(false);
    }
  };

  const toggleReporteExpand = (id) => {
    setExpandedReporteIds(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const cols = 'minmax(80px,1fr) minmax(130px,2fr) 110px 110px 110px 100px 130px 100px 60px';

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <h1 style={{ fontSize: '22px', fontWeight: 400, color: 'var(--text-primary)', letterSpacing: '-0.02em' }}>Inventario</h1>
          <span style={{ background: ACCENT + '1A', color: ACCENT, border: `1px solid ${ACCENT}33`, borderRadius: '5px', padding: '2px 10px', fontSize: '12px', fontFamily: 'var(--font-mono)', fontWeight: 500 }}>{compras.length}</span>
        </div>
        <Btn icon="plus" accentColor={ACCENT} onClick={() => setDrawer(true)}>Registrar compra</Btn>
      </div>

      {/* Filtros */}
      <div style={{ display: 'flex', gap: '10px', alignItems: 'flex-end', flexWrap: 'wrap' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', minWidth: '180px' }}>
          <label style={{ fontSize: '11px', color: 'var(--text-tertiary)', fontWeight: 500, letterSpacing: '0.07em', textTransform: 'uppercase' }}>Insumo</label>
          <select value={filtroInsumo} onChange={e => setFiltroInsumo(e.target.value)} style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border-subtle)', borderRadius: '6px', color: filtroInsumo ? 'var(--text-primary)' : 'var(--text-tertiary)', padding: '7px 10px', fontSize: '13px', outline: 'none', cursor: 'pointer' }}>
            <option value="">Todos</option>
            {insumos.map(i => <option key={i.id} value={i.id}>{i.nombre}</option>)}
          </select>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
          <label style={{ fontSize: '11px', color: 'var(--text-tertiary)', fontWeight: 500, letterSpacing: '0.07em', textTransform: 'uppercase' }}>Fecha desde</label>
          <input type="date" value={filtroDesde} onChange={e => setFiltroDesde(e.target.value)}
            style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border-subtle)', borderRadius: '6px', color: 'var(--text-primary)', padding: '7px 10px', fontSize: '13px', outline: 'none' }} />
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
          <label style={{ fontSize: '11px', color: 'var(--text-tertiary)', fontWeight: 500, letterSpacing: '0.07em', textTransform: 'uppercase' }}>Fecha hasta</label>
          <input type="date" value={filtroHasta} onChange={e => setFiltroHasta(e.target.value)}
            style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border-subtle)', borderRadius: '6px', color: 'var(--text-primary)', padding: '7px 10px', fontSize: '13px', outline: 'none' }} />
        </div>
        <Btn accentColor={ACCENT} icon="filter" onClick={cargarCompras}>Filtrar</Btn>
      </div>

      {error && <div style={{ color: 'var(--accent-danger)', fontSize: '13px' }}>{error}</div>}

      {/* Tabla */}
      <div style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border-subtle)', borderRadius: '8px', overflow: 'hidden' }}>
        <div style={{ display: 'grid', gridTemplateColumns: cols, padding: '8px 16px', borderBottom: '1px solid var(--border-subtle)', gap: '10px' }}>
          {['Fecha', 'Insumo', 'Cant. comprada', 'Precio/unid.', 'Total', 'Disponible', 'Proveedor', 'Factura', ''].map((h, i) => (
            <div key={i} style={{ fontSize: '11px', color: 'var(--text-tertiary)', fontWeight: 500, letterSpacing: '0.05em' }}>{h}</div>
          ))}
        </div>

        {loading && (
          <div style={{ padding: '32px', textAlign: 'center', color: 'var(--text-tertiary)', fontSize: '13px' }}>Cargando compras…</div>
        )}

        {!loading && compras.length === 0 && (
          <div style={{ padding: '32px', textAlign: 'center', color: 'var(--text-tertiary)', fontSize: '13px' }}>No se encontraron compras con esos filtros.</div>
        )}

        {!loading && compras.map((c, i) => {
          const total = (parseFloat(c.cantidad_comprada) * parseFloat(c.precio_unitario)).toFixed(2);
          const intacta = parseFloat(c.cantidad_disponible) === parseFloat(c.cantidad_comprada);
          return (
            <div key={c.id}
              style={{ display: 'grid', gridTemplateColumns: cols, padding: '11px 16px', borderBottom: i < compras.length - 1 ? '1px solid var(--border-subtle)' : 'none', gap: '10px', alignItems: 'center', transition: 'background 0.1s' }}
              onMouseEnter={e => e.currentTarget.style.background = 'var(--bg-tertiary)'}
              onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
            >
              <div style={{ fontSize: '12px', color: 'var(--text-secondary)', fontFamily: 'var(--font-mono)' }}>
                {c.fecha_compra ? new Date(c.fecha_compra + 'T12:00:00').toLocaleDateString('es-BO', { day: '2-digit', month: '2-digit', year: 'numeric' }) : '—'}
              </div>
              <div>
                <div style={{ fontSize: '13px', fontWeight: 500, color: 'var(--text-primary)' }}>{c.insumo_nombre}</div>
                {c.unidad_simbolo && <div style={{ fontSize: '11px', color: 'var(--text-tertiary)', fontFamily: 'var(--font-mono)' }}>{c.unidad_simbolo}</div>}
              </div>
              <div style={{ fontFamily: 'var(--font-mono)', fontSize: '13px', color: 'var(--text-primary)' }}>{parseFloat(c.cantidad_comprada).toFixed(2)}</div>
              <div style={{ fontFamily: 'var(--font-mono)', fontSize: '13px', color: 'var(--text-primary)' }}>Bs {parseFloat(c.precio_unitario).toFixed(2)}</div>
              <div style={{ fontFamily: 'var(--font-mono)', fontSize: '13px', color: 'var(--text-primary)' }}>Bs {parseFloat(total).toLocaleString('es-BO', { minimumFractionDigits: 2 })}</div>
              <DisponibleCell comprada={c.cantidad_comprada} disponible={c.cantidad_disponible} />
              <div style={{ fontSize: '12px', color: 'var(--text-secondary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{c.proveedor_nombre || '—'}</div>
              <div style={{ fontSize: '12px', color: 'var(--text-secondary)', fontFamily: 'var(--font-mono)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{c.numero_factura || '—'}</div>
              <div>
                {intacta && (
                  <button onClick={() => handleEliminar(c)} title="Eliminar"
                    style={{ background: 'transparent', border: 'none', color: 'var(--text-tertiary)', cursor: 'pointer', padding: '4px', borderRadius: '4px', transition: 'color 0.15s' }}
                    onMouseEnter={e => e.currentTarget.style.color = 'var(--accent-danger)'}
                    onMouseLeave={e => e.currentTarget.style.color = 'var(--text-tertiary)'}
                  ><Icon name="trash" size={14} /></button>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Divider */}
      <div style={{ borderTop: '1px solid var(--border-subtle)', marginTop: '8px' }} />

      {/* Reporte de consumo */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
        <h2 style={{ fontSize: '16px', fontWeight: 400, color: 'var(--text-primary)', letterSpacing: '-0.01em' }}>Reporte de consumo por insumo</h2>

        {/* Controles de reporte */}
        <div style={{ display: 'flex', gap: '10px', alignItems: 'flex-end', flexWrap: 'wrap' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', minWidth: '200px' }}>
            <label style={{ fontSize: '11px', color: 'var(--text-tertiary)', fontWeight: 500, letterSpacing: '0.07em', textTransform: 'uppercase' }}>Insumo *</label>
            <select value={reporteInsumoId} onChange={e => { setReporteInsumoId(e.target.value); setReporte(null); setErrorReporte(''); }}
              style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border-subtle)', borderRadius: '6px', color: reporteInsumoId ? 'var(--text-primary)' : 'var(--text-tertiary)', padding: '7px 10px', fontSize: '13px', outline: 'none', cursor: 'pointer' }}>
              <option value="">— Seleccionar insumo —</option>
              {insumos.map(i => <option key={i.id} value={i.id}>{i.nombre}</option>)}
            </select>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
            <label style={{ fontSize: '11px', color: 'var(--text-tertiary)', fontWeight: 500, letterSpacing: '0.07em', textTransform: 'uppercase' }}>Desde</label>
            <input type="date" value={reporteDesde} onChange={e => setReporteDesde(e.target.value)}
              style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border-subtle)', borderRadius: '6px', color: 'var(--text-primary)', padding: '7px 10px', fontSize: '13px', outline: 'none' }} />
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
            <label style={{ fontSize: '11px', color: 'var(--text-tertiary)', fontWeight: 500, letterSpacing: '0.07em', textTransform: 'uppercase' }}>Hasta</label>
            <input type="date" value={reporteHasta} onChange={e => setReporteHasta(e.target.value)}
              style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border-subtle)', borderRadius: '6px', color: 'var(--text-primary)', padding: '7px 10px', fontSize: '13px', outline: 'none' }} />
          </div>
          <Btn accentColor={ACCENT} icon="barChart" onClick={cargarReporte} disabled={loadingReporte}>
            {loadingReporte ? 'Cargando…' : 'Ver reporte'}
          </Btn>
        </div>

        {errorReporte && <div style={{ color: 'var(--accent-danger)', fontSize: '13px' }}>{errorReporte}</div>}

        {reporte && (
          <>
            {/* Cards de resumen */}
            <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
              {[
                { label: 'Stock actual', value: `${parseFloat(reporte.stock_actual || 0).toFixed(2)} ${reporte.insumo?.unidad_simbolo || ''}` },
                { label: 'Total consumido', value: `${parseFloat(reporte.resumen_periodo?.total_cantidad || 0).toFixed(2)} ${reporte.insumo?.unidad_simbolo || ''}` },
                { label: 'Total gastado', value: `Bs ${parseFloat(reporte.resumen_periodo?.total_costo || 0).toLocaleString('es-BO', { minimumFractionDigits: 2 })}` },
              ].map(card => (
                <div key={card.label} style={{ flex: '1 1 160px', background: 'var(--bg-secondary)', border: '1px solid var(--border-subtle)', borderRadius: '8px', padding: '16px 20px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  <div style={{ fontSize: '11px', color: 'var(--text-tertiary)', fontWeight: 500, letterSpacing: '0.07em', textTransform: 'uppercase' }}>{card.label}</div>
                  <div style={{ fontSize: '18px', fontFamily: 'var(--font-mono)', color: 'var(--text-primary)', fontWeight: 500 }}>{card.value}</div>
                </div>
              ))}
            </div>

            {/* Tabla de consumos */}
            <div style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border-subtle)', borderRadius: '8px', overflow: 'hidden' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '100px minmax(100px,1fr) 90px 130px 100px 36px', padding: '8px 16px', borderBottom: '1px solid var(--border-subtle)', gap: '10px' }}>
                {['Fecha', 'Lote', 'Cantidad', 'Precio prom.', 'Total', ''].map((h, i) => (
                  <div key={i} style={{ fontSize: '11px', color: 'var(--text-tertiary)', fontWeight: 500, letterSpacing: '0.05em' }}>{h}</div>
                ))}
              </div>

              {reporte.consumos_por_lote.length === 0 ? (
                <div style={{ padding: '32px', textAlign: 'center', color: 'var(--text-tertiary)', fontSize: '13px' }}>
                  No se registraron consumos de <strong style={{ color: 'var(--text-secondary)' }}>{reporte.insumo?.nombre}</strong> en el período seleccionado.
                </div>
              ) : (
                reporte.consumos_por_lote.map(c => (
                  <ReporteFilaConsumo
                    key={c.id}
                    c={c}
                    expanded={expandedReporteIds.has(c.id)}
                    onToggle={() => toggleReporteExpand(c.id)}
                  />
                ))
              )}
            </div>
          </>
        )}
      </div>

      {drawer && (
        <CompraDrawer
          negocioId={negocioId}
          insumos={insumos}
          proveedores={proveedores}
          onClose={() => setDrawer(false)}
          onSaved={cargarCompras}
        />
      )}
    </div>
  );
};

export default Compras;
