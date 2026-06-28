import React, { useState, useRef, useEffect, useMemo } from 'react';
import { Icon } from '../icons.jsx';
import { Btn, SectionCard, MetricCard } from '../components/ui.jsx';
import EvolucionPreciosChart from '../components/EvolucionPreciosChart.jsx';
import { apiFetch } from '../config/api.js';

const ACCENT = 'var(--accent-info)';

const PALETA_SERIES = [
  '#3b82f6', '#f59e0b', '#10b981', '#ef4444', '#8b5cf6',
  '#06b6d4', '#ec4899', '#f97316', '#84cc16', '#a855f7', '#14b8a6',
];

const RANGOS = [
  { id: '30d',  label: '30d',  dias: 30  },
  { id: '90d',  label: '90d',  dias: 90  },
  { id: '6m',   label: '6m',   dias: 180 },
  { id: '1a',   label: '1a',   dias: 365 },
  { id: 'todo', label: 'Todo', dias: Infinity },
];

const fmtRelativo = (date) => {
  if (!date) return '—';
  const d = new Date(date);
  const diff = Date.now() - d.getTime();
  const dias = Math.floor(diff / 86400000);
  if (dias < 0) return d.toLocaleDateString('es-BO');
  if (dias === 0) {
    const horas = Math.floor(diff / 3600000);
    if (horas === 0) return 'hace minutos';
    return `hace ${horas} h`;
  }
  if (dias === 1) return 'ayer';
  if (dias < 30)  return `hace ${dias} días`;
  if (dias < 365) return `hace ${Math.floor(dias / 30)} meses`;
  return `hace ${Math.floor(dias / 365)} años`;
};

/* ── SearchInput (reutilizable) ───────────────────────────── */
const SearchInput = ({ value, onChange, placeholder, accent = ACCENT }) => {
  const [focus, setFocus] = useState(false);
  return (
    <div style={{
      position: 'relative', display: 'flex', alignItems: 'center',
      width: '260px', maxWidth: '100%',
    }}>
      <Icon name="search" size={13} style={{
        position: 'absolute', left: 10, color: 'var(--text-tertiary)',
        pointerEvents: 'none',
      }} />
      <input
        value={value}
        onChange={e => onChange(e.target.value)}
        onFocus={() => setFocus(true)}
        onBlur={() => setFocus(false)}
        placeholder={placeholder}
        style={{
          width: '100%', padding: '7px 28px 7px 30px',
          background: 'var(--bg-tertiary)',
          border: `1px solid ${focus ? accent : 'var(--border-subtle)'}`,
          borderRadius: '6px', color: 'var(--text-primary)',
          fontSize: '13px', outline: 'none',
          fontFamily: 'var(--font-sans)', transition: 'border-color 0.15s',
        }}
      />
      {value && (
        <button onClick={() => onChange('')} title="Limpiar"
          style={{
            position: 'absolute', right: 6, background: 'transparent', border: 'none',
            color: 'var(--text-tertiary)', cursor: 'pointer', padding: 4,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}><Icon name="x" size={12} /></button>
      )}
    </div>
  );
};

/* ── Drawer (precio manual) ───────────────────────────────── */
const PrecioMercadoDrawer = ({ precio, onClose, onSave, accentColor }) => {
  const [form, setForm] = useState(
    precio || { corte_nombre: '', precio_unitario: '', fecha_vigencia: new Date().toISOString().split('T')[0] }
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

          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            <label style={{ fontSize: '11px', color: 'var(--text-tertiary)', fontWeight: 500, letterSpacing: '0.07em', textTransform: 'uppercase' }}>Precio / Kg (Bs)</label>
            <input type="number" min="0.0001" step="0.01" value={form.precio_unitario || ''} onChange={e => set('precio_unitario', e.target.value)}
              placeholder="Ej. 55.00"
              style={{ background: 'var(--bg-tertiary)', border: '1px solid var(--border-subtle)', borderRadius: '6px', color: 'var(--text-primary)', padding: '8px 12px', fontSize: '13px', outline: 'none', fontFamily: 'var(--font-mono)' }}
              onFocus={e => e.target.style.borderColor = accentColor}
              onBlur={e => e.target.style.borderColor = 'var(--border-subtle)'}
            />
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
  const accentColor = ACCENT;
  const [precios, setPrecios] = useState([]);
  const [preciosScrapeados, setPreciosScrapeados] = useState([]);
  const [drawer, setDrawer] = useState(null);
  const [loading, setLoading] = useState(true);
  const [loadingScrapeados, setLoadingScrapeados] = useState(true);
  const [error, setError] = useState('');
  const [errorScrapeados, setErrorScrapeados] = useState('');
  const [tab, setTab] = useState('manual');

  // Filtros / búsqueda
  const [searchManual,  setSearchManual]  = useState('');
  const [searchScrape,  setSearchScrape]  = useState('');
  const [fuenteScrape,  setFuenteScrape]  = useState('todas');

  // Evolución
  const [catalogoCortes, setCatalogoCortes] = useState([]);
  const [cortesSeleccionados, setCortesSeleccionados] = useState(new Set());
  const [seriesPorCorte, setSeriesPorCorte] = useState({});
  const [loadingSerie, setLoadingSerie] = useState(false);
  const [errorSerie,   setErrorSerie]   = useState('');
  const [rango,        setRango]        = useState('todo');

  const cargar = async () => {
    if (!negocioId) return;
    setLoading(true); setError('');
    try {
      const data = await apiFetch(`/api/negocios/${negocioId}/precios-mercado`);
      setPrecios(data);
    } catch (e) {
      setError(e?.error || 'No se pudo cargar los precios de mercado');
    } finally { setLoading(false); }
  };

  const cargarScrapeados = async () => {
    if (!negocioId) return;
    setLoadingScrapeados(true); setErrorScrapeados('');
    try {
      const data = await apiFetch(`/api/negocios/${negocioId}/precios-scrapeados`);
      setPreciosScrapeados(data);
    } catch (e) {
      setErrorScrapeados(e?.error || 'No se pudo cargar los precios scrapeados');
    } finally { setLoadingScrapeados(false); }
  };

  useEffect(() => { cargar(); cargarScrapeados(); }, [negocioId]);

  useEffect(() => {
    if (negocioId) {
      apiFetch(`/api/negocios/${negocioId}/catalogo-cortes`)
        .then(data => setCatalogoCortes(data))
        .catch(console.error);
    }
  }, [negocioId]);

  useEffect(() => {
    if (tab === 'evolucion') {
      if (!negocioId || cortesSeleccionados.size === 0) {
        setSeriesPorCorte({});
        return;
      }
      setLoadingSerie(true); setErrorSerie('');
      const promesas = [...cortesSeleccionados].map((corte) =>
        apiFetch(`/api/negocios/${negocioId}/precios-serie?corte=${encodeURIComponent(corte)}`)
          .then((rows) => [corte, rows])
          .catch(() => [corte, []])
      );
      Promise.all(promesas)
        .then((pares) => setSeriesPorCorte(Object.fromEntries(pares)))
        .catch((e) => setErrorSerie(e?.error || String(e)))
        .finally(() => setLoadingSerie(false));
    }
  }, [tab, negocioId, [...cortesSeleccionados].sort().join(',')]);

  const handleSave = async form => {
    try {
      setError('');
      const payload = {
        corte_nombre:    form.corte_nombre,
        precio_unitario: parseFloat(form.precio_unitario),
        canal:           'minorista',
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
    } catch (e) { setError(e?.error || 'Error al eliminar'); }
  };

  /* ── Derivados ──────────────────────────────────────────── */
  const preciosFiltrados = useMemo(() => {
    const q = searchManual.trim().toLowerCase();
    return precios.filter(p => {
      if (q && !(p.corte_nombre || '').toLowerCase().includes(q)) return false;
      return true;
    });
  }, [precios, searchManual]);

  const fuentesUnicas = useMemo(() => {
    const set = new Set(preciosScrapeados.map(p => p.fuente_nombre).filter(Boolean));
    return [...set].sort();
  }, [preciosScrapeados]);

  const scrapeFiltrados = useMemo(() => {
    const q = searchScrape.trim().toLowerCase();
    return preciosScrapeados.filter(p => {
      if (fuenteScrape !== 'todas' && p.fuente_nombre !== fuenteScrape) return false;
      if (q) {
        const hay = (p.corte_canonico || '').toLowerCase().includes(q) ||
                    (p.raw?.title || '').toLowerCase().includes(q);
        if (!hay) return false;
      }
      return true;
    });
  }, [preciosScrapeados, fuenteScrape, searchScrape]);

  const metrics = useMemo(() => {
    const cortesM = new Set(precios.map(p => p.corte_nombre).filter(Boolean));
    const cortesS = new Set(preciosScrapeados.map(p => p.corte_canonico).filter(Boolean));
    const cortesUnion = new Set([...cortesM, ...cortesS]);
    const ultimaScrape = preciosScrapeados.reduce((max, p) => {
      const t = new Date(p.fecha).getTime();
      return t > max ? t : max;
    }, 0);
    const ultimaManual = precios.reduce((max, p) => {
      const t = new Date(p.fecha_vigencia).getTime();
      return t > max ? t : max;
    }, 0);
    return {
      manuales:   precios.length,
      scrapeados: preciosScrapeados.length,
      cortes:     cortesUnion.size,
      fuentes:    fuentesUnicas.length,
      ultimaScrape: ultimaScrape ? new Date(ultimaScrape) : null,
      ultimaManual: ultimaManual ? new Date(ultimaManual) : null,
    };
  }, [precios, preciosScrapeados, fuentesUnicas]);

  // Series filtradas para Evolución (rango + canal)
  const seriesEvolucion = useMemo(() => {
    const ahora = Date.now();
    const dias = (RANGOS.find(r => r.id === rango) || RANGOS[RANGOS.length - 1]).dias;
    const desde = dias === Infinity ? -Infinity : ahora - dias * 86400000;
    return [...cortesSeleccionados].map((corte, i) => ({
      label: corte,
      color: PALETA_SERIES[i % PALETA_SERIES.length],
      puntos: (seriesPorCorte[corte] || [])
        .filter(d => new Date(d.fecha).getTime() >= desde)
        .map(d => ({ fecha: d.fecha, valor: parseFloat(d.precio_kg) })),
    }));
  }, [cortesSeleccionados, seriesPorCorte, rango]);

  const tabBtn = (id, label, count) => {
    const activo = tab === id;
    return (
      <button onClick={() => setTab(id)} style={{
        padding: '9px 4px', border: 'none', background: 'transparent',
        color: activo ? accentColor : 'var(--text-secondary)',
        borderBottom: activo ? `2px solid ${accentColor}` : '2px solid transparent',
        fontSize: '14px', fontWeight: activo ? 600 : 400, cursor: 'pointer',
        display: 'inline-flex', alignItems: 'center', gap: '8px',
        marginRight: '20px', transition: 'color 0.15s',
      }}>
        {label}
        {count != null && (
          <span style={{
            fontSize: '11px', padding: '1px 7px', borderRadius: '999px',
            background: activo ? accentColor + '1A' : 'var(--bg-tertiary)',
            color: activo ? accentColor : 'var(--text-tertiary)',
            fontFamily: 'var(--font-mono)', fontWeight: 600,
          }}>{count}</span>
        )}
      </button>
    );
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '12px' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <h1 style={{ fontSize: '22px', fontWeight: 400, color: 'var(--text-primary)', letterSpacing: '-0.02em', margin: 0 }}>Precios de Mercado</h1>
            <span style={{
              background: accentColor + '1A', color: accentColor,
              border: `1px solid ${accentColor}33`, borderRadius: '5px',
              padding: '2px 10px', fontSize: '12px',
              fontFamily: 'var(--font-mono)', fontWeight: 500,
            }}>{metrics.cortes} cortes</span>
          </div>
          <p style={{ fontSize: '13px', color: 'var(--text-tertiary)', marginTop: '4px', margin: '4px 0 0' }}>
            Precios usados para prorratear costos conjuntos y monitorear el mercado.
          </p>
        </div>
      </div>

      {/* KPIs */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '12px' }}>
        <MetricCard
          label="Precios manuales"
          value={metrics.manuales}
          sub={metrics.ultimaManual ? `última vigencia ${fmtRelativo(metrics.ultimaManual)}` : 'sin registros'}
          icon={<Icon name="edit" size={16} />}
          accentColor={accentColor}
        />
        <MetricCard
          label="Precios scrapeados"
          value={metrics.scrapeados.toLocaleString('es-BO')}
          sub={metrics.ultimaScrape ? `último scraping ${fmtRelativo(metrics.ultimaScrape)}` : 'sin corridas'}
          icon={<Icon name="download" size={16} />}
          accentColor="var(--accent-success)"
        />
        <MetricCard
          label="Cortes con datos"
          value={metrics.cortes}
          sub={`${catalogoCortes.length} cortes en el catálogo`}
          icon={<Icon name="layers" size={16} />}
          accentColor="var(--accent-warning)"
        />
        <MetricCard
          label="Fuentes activas"
          value={metrics.fuentes}
          sub="origen de los precios fácticos"
          icon={<Icon name="link" size={16} />}
          accentColor="var(--accent-agro)"
        />
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', borderBottom: '1px solid var(--border-subtle)', flexWrap: 'wrap' }}>
        {tabBtn('manual',    'Manuales',                metrics.manuales)}
        {tabBtn('scrapeado', 'Scrapeados del Mercado',  metrics.scrapeados)}
        {tabBtn('evolucion', 'Evolución')}
      </div>

      {/* ── Tab Manual ─────────────────────────────────────── */}
      {tab === 'manual' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', animation: 'slideIn 0.2s ease' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
            <SearchInput value={searchManual} onChange={setSearchManual} placeholder="Buscar corte…" accent={accentColor} />
            <Btn icon="plus" accentColor={accentColor} onClick={() => setDrawer('new')}>Nuevo precio</Btn>
          </div>

          {error && (
            <div style={{ color: 'var(--accent-danger)', fontSize: '13px', background: 'var(--accent-danger)0D', border: '1px solid var(--accent-danger)33', borderLeft: '3px solid var(--accent-danger)', borderRadius: '6px', padding: '10px 14px' }}>{error}</div>
          )}

          <div style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border-subtle)', borderRadius: '8px', overflow: 'hidden' }}>
            <div style={{ display: 'grid', gridTemplateColumns: '2fr 160px 160px 80px', padding: '10px 20px', borderBottom: '1px solid var(--border-subtle)', gap: '12px', background: 'var(--bg-tertiary)' }}>
              {['Corte', 'Precio (Bs/Kg)', 'Vigencia', ''].map((h, i) => (
                <div key={i} style={{ fontSize: '11px', color: 'var(--text-tertiary)', fontWeight: 600, letterSpacing: '0.05em', textTransform: 'uppercase', textAlign: i === 1 ? 'right' : 'left' }}>{h}</div>
              ))}
            </div>

            {loading && (
              <div style={{ padding: '28px 20px', color: 'var(--text-tertiary)', fontSize: '13px', textAlign: 'center' }}>Cargando precios manuales…</div>
            )}

            {!loading && preciosFiltrados.length === 0 && (
              <div style={{ padding: '56px 20px', textAlign: 'center', color: 'var(--text-tertiary)', fontSize: '13px' }}>
                <Icon name="tag" size={32} style={{ display: 'block', margin: '0 auto 10px', opacity: 0.5 }} />
                {precios.length === 0
                  ? <>No hay precios manuales registrados. <br/><span style={{ fontSize: '12px' }}>Agregá el primero con el botón "Nuevo precio".</span></>
                  : <>Ningún precio coincide con los filtros.</>
                }
              </div>
            )}

            {!loading && preciosFiltrados.map((p, i) => (
              <div key={p.id}
                style={{ display: 'grid', gridTemplateColumns: '2fr 160px 160px 80px', padding: '12px 20px', borderBottom: i < preciosFiltrados.length - 1 ? '1px solid var(--border-subtle)' : 'none', gap: '12px', alignItems: 'center', transition: 'background 0.1s' }}
                onMouseEnter={e => e.currentTarget.style.background = 'var(--bg-tertiary)'}
                onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
              >
                <div style={{ fontSize: '13px', color: 'var(--text-primary)', fontWeight: 500 }}>{p.corte_nombre}</div>
                <div style={{ fontSize: '13px', color: 'var(--text-primary)', fontFamily: 'var(--font-mono)', textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}>
                  {parseFloat(p.precio_unitario).toLocaleString('es-BO', { minimumFractionDigits: 2 })}
                </div>
                <div style={{ fontSize: '12px', color: 'var(--text-secondary)', display: 'flex', flexDirection: 'column', lineHeight: 1.3 }}>
                  <span>{new Date(p.fecha_vigencia).toLocaleDateString('es-BO')}</span>
                  <span style={{ fontSize: '11px', color: 'var(--text-tertiary)' }}>{fmtRelativo(p.fecha_vigencia)}</span>
                </div>
                <div style={{ display: 'flex', gap: '4px', alignItems: 'center', justifyContent: 'flex-end' }}>
                  <button onClick={() => setDrawer({ ...p, fecha_vigencia: p.fecha_vigencia.split('T')[0] })} title="Editar"
                    style={{ background: 'transparent', border: 'none', color: 'var(--text-tertiary)', cursor: 'pointer', padding: '5px', borderRadius: '4px', display: 'flex' }}
                    onMouseEnter={e => { e.currentTarget.style.color = accentColor; e.currentTarget.style.background = accentColor + '15'; }}
                    onMouseLeave={e => { e.currentTarget.style.color = 'var(--text-tertiary)'; e.currentTarget.style.background = 'transparent'; }}
                  ><Icon name="edit" size={14} /></button>
                  <button onClick={() => handleDelete(p.id)} title="Eliminar"
                    style={{ background: 'transparent', border: 'none', color: 'var(--text-tertiary)', cursor: 'pointer', padding: '5px', borderRadius: '4px', display: 'flex' }}
                    onMouseEnter={e => { e.currentTarget.style.color = 'var(--accent-danger)'; e.currentTarget.style.background = 'var(--accent-danger)15'; }}
                    onMouseLeave={e => { e.currentTarget.style.color = 'var(--text-tertiary)'; e.currentTarget.style.background = 'transparent'; }}
                  ><Icon name="trash" size={14} /></button>
                </div>
              </div>
            ))}

            {!loading && preciosFiltrados.length > 0 && (
              <div style={{ padding: '10px 20px', background: 'var(--bg-tertiary)', borderTop: '1px solid var(--border-subtle)', fontSize: '11px', color: 'var(--text-tertiary)', display: 'flex', justifyContent: 'space-between' }}>
                <span>Mostrando <strong style={{ color: 'var(--text-secondary)' }}>{preciosFiltrados.length}</strong> de {precios.length}</span>
                {searchManual && (
                  <button onClick={() => setSearchManual('')}
                    style={{ background: 'none', border: 'none', color: accentColor, fontSize: '11px', cursor: 'pointer', fontFamily: 'var(--font-sans)' }}>
                    Limpiar búsqueda
                  </button>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── Tab Scrapeado ──────────────────────────────────── */}
      {tab === 'scrapeado' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', animation: 'slideIn 0.2s ease' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
              <SearchInput value={searchScrape} onChange={setSearchScrape} placeholder="Buscar corte o producto…" accent={accentColor} />
              {fuentesUnicas.length > 1 && (
                <select value={fuenteScrape} onChange={e => setFuenteScrape(e.target.value)}
                  style={{ padding: '6px 10px', background: 'var(--bg-tertiary)', border: '1px solid var(--border-subtle)', borderRadius: '6px', color: 'var(--text-secondary)', fontSize: '12px', cursor: 'pointer', outline: 'none' }}>
                  <option value="todas">Todas las fuentes ({fuentesUnicas.length})</option>
                  {fuentesUnicas.map(f => <option key={f} value={f}>{f}</option>)}
                </select>
              )}
            </div>
            <Btn icon="refresh" variant="secondary" onClick={cargarScrapeados}>Actualizar</Btn>
          </div>

          {errorScrapeados && (
            <div style={{ color: 'var(--accent-danger)', fontSize: '13px', background: 'var(--accent-danger)0D', border: '1px solid var(--accent-danger)33', borderLeft: '3px solid var(--accent-danger)', borderRadius: '6px', padding: '10px 14px' }}>{errorScrapeados}</div>
          )}

          <div style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border-subtle)', borderRadius: '8px', overflow: 'hidden' }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1.6fr 1.2fr 140px 90px 130px', padding: '10px 20px', borderBottom: '1px solid var(--border-subtle)', gap: '12px', background: 'var(--bg-tertiary)' }}>
              {['Corte / Producto', 'Fuente', 'Precio (Bs/Kg)', 'Gramos', 'Fecha'].map((h, i) => (
                <div key={i} style={{ fontSize: '11px', color: 'var(--text-tertiary)', fontWeight: 600, letterSpacing: '0.05em', textTransform: 'uppercase', textAlign: i === 2 || i === 3 ? 'right' : 'left' }}>{h}</div>
              ))}
            </div>

            {loadingScrapeados && (
              <div style={{ padding: '28px 20px', color: 'var(--text-tertiary)', fontSize: '13px', textAlign: 'center' }}>Cargando precios scrapeados…</div>
            )}

            {!loadingScrapeados && scrapeFiltrados.length === 0 && (
              <div style={{ padding: '56px 20px', textAlign: 'center', color: 'var(--text-tertiary)', fontSize: '13px' }}>
                <Icon name="download" size={32} style={{ display: 'block', margin: '0 auto 10px', opacity: 0.5 }} />
                {preciosScrapeados.length === 0
                  ? <>Aún no hay precios scrapeados.<br/><span style={{ fontSize: '12px' }}>Ejecutá el scraping desde Fuentes de datos.</span></>
                  : <>Ningún precio coincide con los filtros.</>
                }
              </div>
            )}

            {!loadingScrapeados && scrapeFiltrados.map((p, i) => {
              const rawData = p.raw || {};
              return (
                <div key={i}
                  style={{ display: 'grid', gridTemplateColumns: '1.6fr 1.2fr 140px 90px 130px', padding: '12px 20px', borderBottom: i < scrapeFiltrados.length - 1 ? '1px solid var(--border-subtle)' : 'none', gap: '12px', alignItems: 'center', transition: 'background 0.1s' }}
                  onMouseEnter={e => e.currentTarget.style.background = 'var(--bg-tertiary)'}
                  onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                >
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '2px', minWidth: 0 }}>
                    <div style={{ fontSize: '13px', color: 'var(--text-primary)', fontWeight: 600 }}>{p.corte_canonico}</div>
                    {rawData.title && (
                      <div style={{ fontSize: '11px', color: 'var(--text-tertiary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }} title={rawData.title}>
                        {rawData.title}
                      </div>
                    )}
                  </div>
                  <a href={p.fuente_url} target="_blank" rel="noreferrer"
                    style={{ fontSize: '12px', color: 'var(--text-secondary)', textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: '6px', minWidth: 0 }}
                    onMouseEnter={e => e.currentTarget.style.color = accentColor}
                    onMouseLeave={e => e.currentTarget.style.color = 'var(--text-secondary)'}>
                    <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{p.fuente_nombre}</span>
                    <Icon name="externalLink" size={11} style={{ flexShrink: 0, opacity: 0.6 }} />
                  </a>
                  <div style={{ fontSize: '13px', color: 'var(--text-primary)', fontFamily: 'var(--font-mono)', textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}>
                    {parseFloat(p.precio_kg).toLocaleString('es-BO', { minimumFractionDigits: 2 })}
                  </div>
                  <div style={{ fontSize: '12px', color: 'var(--text-tertiary)', fontFamily: 'var(--font-mono)', textAlign: 'right' }}>
                    {rawData.grams ? `${rawData.grams} g` : '—'}
                  </div>
                  <div style={{ fontSize: '12px', color: 'var(--text-secondary)', display: 'flex', flexDirection: 'column', lineHeight: 1.3 }}>
                    <span>{new Date(p.fecha).toLocaleDateString('es-BO')}</span>
                    <span style={{ fontSize: '11px', color: 'var(--text-tertiary)' }}>{fmtRelativo(p.fecha)}</span>
                  </div>
                </div>
              );
            })}

            {!loadingScrapeados && scrapeFiltrados.length > 0 && (
              <div style={{ padding: '10px 20px', background: 'var(--bg-tertiary)', borderTop: '1px solid var(--border-subtle)', fontSize: '11px', color: 'var(--text-tertiary)', display: 'flex', justifyContent: 'space-between' }}>
                <span>Mostrando <strong style={{ color: 'var(--text-secondary)' }}>{scrapeFiltrados.length}</strong> de {preciosScrapeados.length}</span>
                {(searchScrape || fuenteScrape !== 'todas') && (
                  <button onClick={() => { setSearchScrape(''); setFuenteScrape('todas'); }}
                    style={{ background: 'none', border: 'none', color: accentColor, fontSize: '11px', cursor: 'pointer', fontFamily: 'var(--font-sans)' }}>
                    Limpiar filtros
                  </button>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── Tab Evolución ──────────────────────────────────── */}
      {tab === 'evolucion' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', animation: 'slideIn 0.2s ease' }}>
          {/* Card de controles */}
          <SectionCard title="Filtros del gráfico" action={
            cortesSeleccionados.size > 0 && (
              <button onClick={() => setCortesSeleccionados(new Set())}
                style={{ background: 'none', border: 'none', color: accentColor, fontSize: '12px', cursor: 'pointer', fontFamily: 'var(--font-sans)' }}>
                Limpiar selección
              </button>
            )
          }>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              {/* Rango */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <span style={{ fontSize: '11px', color: 'var(--text-tertiary)', fontWeight: 600, letterSpacing: '0.07em', textTransform: 'uppercase' }}>Rango</span>
                <div style={{ display: 'inline-flex', background: 'var(--bg-tertiary)', borderRadius: '6px', padding: '2px', border: '1px solid var(--border-subtle)' }}>
                  {RANGOS.map(r => {
                    const activo = rango === r.id;
                    return (
                      <button key={r.id} onClick={() => setRango(r.id)} style={{
                        padding: '4px 12px', border: 'none',
                        background: activo ? 'var(--bg-secondary)' : 'transparent',
                        color: activo ? accentColor : 'var(--text-secondary)',
                        fontSize: '12px', fontWeight: activo ? 600 : 500, cursor: 'pointer',
                        borderRadius: '4px', boxShadow: activo ? '0 1px 2px rgba(0,0,0,0.15)' : 'none',
                        fontFamily: 'var(--font-sans)', transition: 'all 0.12s',
                      }}>{r.label}</button>
                    );
                  })}
                </div>
              </div>

              {/* Cortes */}
              <div>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
                  <span style={{ fontSize: '11px', color: 'var(--text-tertiary)', fontWeight: 600, letterSpacing: '0.07em', textTransform: 'uppercase' }}>
                    Cortes a comparar
                    <span style={{ marginLeft: '8px', color: cortesSeleccionados.size > 0 ? accentColor : 'var(--text-tertiary)', fontFamily: 'var(--font-mono)' }}>
                      {cortesSeleccionados.size} / {catalogoCortes.length}
                    </span>
                  </span>
                  {catalogoCortes.length > 0 && cortesSeleccionados.size === 0 && (
                    <button onClick={() => setCortesSeleccionados(new Set(catalogoCortes.slice(0, 3).map(c => c.nombre)))}
                      style={{ background: 'none', border: 'none', color: accentColor, fontSize: '11px', cursor: 'pointer', fontFamily: 'var(--font-sans)' }}>
                      Seleccionar primeros 3
                    </button>
                  )}
                </div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                  {catalogoCortes.length === 0 && (
                    <span style={{ fontSize: '12px', color: 'var(--text-tertiary)' }}>No hay cortes en el catálogo.</span>
                  )}
                  {catalogoCortes.map((c, i) => {
                    const activo = cortesSeleccionados.has(c.nombre);
                    const idx = [...cortesSeleccionados].indexOf(c.nombre);
                    const color = activo && idx >= 0 ? PALETA_SERIES[idx % PALETA_SERIES.length] : null;
                    return (
                      <button key={c.id} type="button"
                        onClick={() => {
                          const next = new Set(cortesSeleccionados);
                          if (next.has(c.nombre)) next.delete(c.nombre);
                          else next.add(c.nombre);
                          setCortesSeleccionados(next);
                        }}
                        style={{
                          padding: '5px 12px', borderRadius: '999px',
                          border: `1px solid ${activo ? color : 'var(--border-subtle)'}`,
                          background: activo ? color + '1A' : 'var(--bg-tertiary)',
                          color: activo ? color : 'var(--text-secondary)',
                          fontSize: '12px', fontWeight: activo ? 600 : 500, cursor: 'pointer',
                          display: 'inline-flex', alignItems: 'center', gap: '6px',
                          transition: 'all 0.12s',
                        }}>
                        {activo && <span style={{ width: 7, height: 7, borderRadius: '50%', background: color }} />}
                        {c.nombre}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          </SectionCard>

          {errorSerie && (
            <div style={{ color: 'var(--accent-danger)', fontSize: '13px', background: 'var(--accent-danger)0D', border: '1px solid var(--accent-danger)33', borderLeft: '3px solid var(--accent-danger)', borderRadius: '6px', padding: '10px 14px' }}>{errorSerie}</div>
          )}

          {/* Card del gráfico */}
          <SectionCard
            title="Evolución histórica · Bs/kg"
            action={
              <span style={{ fontSize: '11px', color: 'var(--text-tertiary)', fontFamily: 'var(--font-mono)' }}>
                {RANGOS.find(r => r.id === rango)?.label || ''}
              </span>
            }
          >
            {loadingSerie ? (
              <div style={{ padding: '40px 20px', textAlign: 'center', color: 'var(--text-tertiary)', fontSize: '13px' }}>
                Cargando serie histórica…
              </div>
            ) : cortesSeleccionados.size === 0 ? (
              <div style={{ padding: '60px 20px', textAlign: 'center', color: 'var(--text-tertiary)', fontSize: '13px' }}>
                <Icon name="barChart" size={32} style={{ display: 'block', margin: '0 auto 10px', opacity: 0.5 }} />
                Seleccioná uno o más cortes arriba para ver su evolución.
              </div>
            ) : seriesEvolucion.every(s => s.puntos.length === 0) ? (
              <div style={{ padding: '40px 20px', textAlign: 'center', color: 'var(--text-tertiary)', fontSize: '13px' }}>
                <Icon name="alertCircle" size={28} style={{ display: 'block', margin: '0 auto 10px', opacity: 0.6 }} />
                No hay datos para los cortes y rango seleccionados.
              </div>
            ) : (
              <EvolucionPreciosChart series={seriesEvolucion} />
            )}
          </SectionCard>
        </div>
      )}

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
