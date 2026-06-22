import React, { useState, useRef, useEffect } from 'react';
import { Icon } from '../icons.jsx';
import { StatusBadge, Btn } from '../components/ui.jsx';
import MiniLineChart from '../components/MiniLineChart.jsx';
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
  const [preciosScrapeados, setPreciosScrapeados] = useState([]);
  const [filtroCanal, setFiltroCanal] = useState('');
  const [drawer, setDrawer] = useState(null);
  const [loading, setLoading] = useState(true);
  const [loadingScrapeados, setLoadingScrapeados] = useState(true);
  const [error, setError] = useState('');
  const [errorScrapeados, setErrorScrapeados] = useState('');
  const [tab, setTab] = useState('manual');
  
  const [catalogoCortes, setCatalogoCortes] = useState([]);
  const [corteEvolucion, setCorteEvolucion] = useState('');
  const [serieData, setSerieData] = useState([]);
  const [loadingSerie, setLoadingSerie] = useState(false);
  const [errorSerie, setErrorSerie] = useState('');

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

  const cargarScrapeados = async () => {
    if (!negocioId) return;
    setLoadingScrapeados(true);
    setErrorScrapeados('');
    try {
      const url = filtroCanal ? `/api/negocios/${negocioId}/precios-scrapeados?canal=${filtroCanal}` : `/api/negocios/${negocioId}/precios-scrapeados`;
      const data = await apiFetch(url);
      setPreciosScrapeados(data);
    } catch (e) {
      setErrorScrapeados(e?.error || 'No se pudo cargar los precios scrapeados');
    } finally {
      setLoadingScrapeados(false);
    }
  };

  useEffect(() => { 
    cargar(); 
    cargarScrapeados();
  }, [negocioId, filtroCanal]);

  useEffect(() => {
    if (negocioId) {
      apiFetch(`/api/negocios/${negocioId}/catalogo-cortes`)
        .then(data => setCatalogoCortes(data))
        .catch(console.error);
    }
  }, [negocioId]);

  useEffect(() => {
    if (tab === 'evolucion' && corteEvolucion && negocioId) {
      setLoadingSerie(true);
      setErrorSerie('');
      apiFetch(`/api/negocios/${negocioId}/precios-serie?corte=${encodeURIComponent(corteEvolucion)}`)
        .then(data => {
          setSerieData(data);
        })
        .catch(e => setErrorSerie(e?.error || 'Error al cargar serie'))
        .finally(() => setLoadingSerie(false));
    }
  }, [tab, corteEvolucion, negocioId]);

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
        </div>
        <div style={{ display: 'flex', gap: '8px' }}>
          <select value={filtroCanal} onChange={e => setFiltroCanal(e.target.value)} style={{ background: 'var(--bg-tertiary)', border: '1px solid var(--border-subtle)', borderRadius: '6px', color: 'var(--text-primary)', padding: '6px 12px', fontSize: '13px', outline: 'none' }}>
            <option value="">Todos los canales</option>
            <option value="minorista">Minorista</option>
            <option value="mayorista">Mayorista</option>
          </select>
        </div>
      </div>

      <div style={{ display: 'flex', gap: '10px', borderBottom: '1px solid var(--border-subtle)', paddingBottom: '0' }}>
        <button onClick={() => setTab('manual')} style={{ padding: '8px 16px', border: 'none', background: 'transparent', color: tab === 'manual' ? accentColor : 'var(--text-secondary)', borderBottom: tab === 'manual' ? `2px solid ${accentColor}` : '2px solid transparent', fontSize: '14px', fontWeight: tab === 'manual' ? 600 : 400, cursor: 'pointer' }}>
          Manuales
        </button>
        <button onClick={() => setTab('scrapeado')} style={{ padding: '8px 16px', border: 'none', background: 'transparent', color: tab === 'scrapeado' ? accentColor : 'var(--text-secondary)', borderBottom: tab === 'scrapeado' ? `2px solid ${accentColor}` : '2px solid transparent', fontSize: '14px', fontWeight: tab === 'scrapeado' ? 600 : 400, cursor: 'pointer' }}>
          Scrapeados del Mercado
        </button>
        <button onClick={() => setTab('evolucion')} style={{ padding: '8px 16px', border: 'none', background: 'transparent', color: tab === 'evolucion' ? accentColor : 'var(--text-secondary)', borderBottom: tab === 'evolucion' ? `2px solid ${accentColor}` : '2px solid transparent', fontSize: '14px', fontWeight: tab === 'evolucion' ? 600 : 400, cursor: 'pointer' }}>
          Evolución
        </button>
      </div>

      {tab === 'manual' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', animation: 'slideIn 0.2s ease' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>Precios ingresados manualmente.</span>
            <Btn icon="plus" accentColor={accentColor} onClick={() => setDrawer('new')}>Nuevo precio</Btn>
          </div>
          
          {error && <div style={{ color: 'var(--accent-danger)', fontSize: '13px' }}>{error}</div>}

          <div style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border-subtle)', borderRadius: '8px', overflow: 'hidden' }}>
            <div style={{ display: 'grid', gridTemplateColumns: '2fr 100px 100px 120px 80px', padding: '8px 20px', borderBottom: '1px solid var(--border-subtle)', gap: '12px' }}>
              {['Corte', 'Canal', 'Precio (Bs/Kg)', 'Vigencia', ''].map((h, i) => (
                <div key={i} style={{ fontSize: '11px', color: 'var(--text-tertiary)', fontWeight: 500, letterSpacing: '0.05em' }}>{h}</div>
              ))}
            </div>

            {loading && (
              <div style={{ padding: '28px 20px', color: 'var(--text-tertiary)', fontSize: '13px' }}>Cargando precios manuales…</div>
            )}

            {!loading && precios.length === 0 && (
              <div style={{ padding: '48px 20px', textAlign: 'center', color: 'var(--text-tertiary)', fontSize: '13px' }}>
                <Icon name="tag" size={28} style={{ display: 'block', margin: '0 auto 10px' }} />
                No hay precios de mercado manuales registrados.
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
        </div>
      )}

      {tab === 'scrapeado' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', animation: 'slideIn 0.2s ease' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>Precios fácticos obtenidos desde web scraping. Son de solo lectura.</span>
            <Btn icon="refresh-cw" variant="secondary" onClick={cargarScrapeados}>Actualizar</Btn>
          </div>
          
          {errorScrapeados && <div style={{ color: 'var(--accent-danger)', fontSize: '13px' }}>{errorScrapeados}</div>}

          <div style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border-subtle)', borderRadius: '8px', overflow: 'hidden' }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1.5fr 1fr 100px 100px 100px 100px', padding: '8px 20px', borderBottom: '1px solid var(--border-subtle)', gap: '12px' }}>
              {['Corte / Producto', 'Fuente', 'Canal', 'Precio (Bs/Kg)', 'Gramos', 'Fecha'].map((h, i) => (
                <div key={i} style={{ fontSize: '11px', color: 'var(--text-tertiary)', fontWeight: 500, letterSpacing: '0.05em' }}>{h}</div>
              ))}
            </div>

            {loadingScrapeados && (
              <div style={{ padding: '28px 20px', color: 'var(--text-tertiary)', fontSize: '13px' }}>Cargando precios scrapeados…</div>
            )}

            {!loadingScrapeados && preciosScrapeados.length === 0 && (
              <div style={{ padding: '48px 20px', textAlign: 'center', color: 'var(--text-tertiary)', fontSize: '13px' }}>
                <Icon name="tag" size={28} style={{ display: 'block', margin: '0 auto 10px' }} />
                Aún no hay precios scrapeados — ejecutá el scraping desde Fuentes de Datos o el botón Actualizar mercado en Liquidación.
              </div>
            )}

            {!loadingScrapeados && preciosScrapeados.map((p, i) => {
              const rawData = p.raw || {};
              return (
                <div key={i}
                  style={{ display: 'grid', gridTemplateColumns: '1.5fr 1fr 100px 100px 100px 100px', padding: '13px 20px', borderBottom: i < preciosScrapeados.length - 1 ? '1px solid var(--border-subtle)' : 'none', gap: '12px', alignItems: 'center', transition: 'background 0.1s' }}
                  onMouseEnter={e => e.currentTarget.style.background = 'var(--bg-tertiary)'}
                  onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                >
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                    <div style={{ fontSize: '13px', color: 'var(--text-primary)', fontWeight: 600 }}>{p.corte_canonico}</div>
                    {rawData.title && (
                      <div style={{ fontSize: '11px', color: 'var(--text-tertiary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }} title={rawData.title}>
                        {rawData.title}
                      </div>
                    )}
                  </div>
                  <div style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>
                    <a href={p.fuente_url} target="_blank" rel="noreferrer" style={{ color: 'inherit', textDecoration: 'none' }} onMouseEnter={e=>e.currentTarget.style.textDecoration='underline'} onMouseLeave={e=>e.currentTarget.style.textDecoration='none'}>
                      {p.fuente_nombre}
                    </a>
                  </div>
                  <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
                    <StatusBadge label={p.canal} color={p.canal === 'mayorista' ? 'var(--accent-warning)' : 'var(--accent-info)'} />
                  </div>
                  <div style={{ fontSize: '12px', color: 'var(--text-primary)', fontFamily: 'var(--font-mono)' }}>
                    {parseFloat(p.precio_kg).toLocaleString('es-BO', { minimumFractionDigits: 2 })}
                  </div>
                  <div style={{ fontSize: '12px', color: 'var(--text-tertiary)', fontFamily: 'var(--font-mono)' }}>
                    {rawData.grams ? `${rawData.grams}g` : '-'}
                  </div>
                  <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
                    {new Date(p.fecha).toLocaleDateString('es-BO')}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {tab === 'evolucion' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', animation: 'slideIn 0.2s ease' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>Evolución histórica de los precios del mercado.</span>
            
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ fontSize: '12px', color: 'var(--text-tertiary)' }}>Seleccione corte:</span>
              <select value={corteEvolucion} onChange={e => setCorteEvolucion(e.target.value)} style={{ background: 'var(--bg-tertiary)', border: '1px solid var(--border-subtle)', borderRadius: '6px', color: 'var(--text-primary)', padding: '6px 12px', fontSize: '13px', outline: 'none' }}>
                <option value="">-- Seleccionar --</option>
                {catalogoCortes.map(c => (
                  <option key={c.id} value={c.nombre}>{c.nombre}</option>
                ))}
              </select>
            </div>
          </div>
          
          {errorSerie && <div style={{ color: 'var(--accent-danger)', fontSize: '13px' }}>{errorSerie}</div>}

          {loadingSerie ? (
            <div style={{ padding: '48px 20px', textAlign: 'center', color: 'var(--text-tertiary)', fontSize: '13px', background: 'var(--bg-secondary)', borderRadius: '8px' }}>
              Cargando serie histórica...
            </div>
          ) : !corteEvolucion ? (
            <div style={{ padding: '48px 20px', textAlign: 'center', color: 'var(--text-tertiary)', fontSize: '13px', background: 'var(--bg-secondary)', borderRadius: '8px' }}>
              <Icon name="bar-chart-2" size={28} style={{ display: 'block', margin: '0 auto 10px' }} />
              Seleccione un corte para ver su evolución
            </div>
          ) : serieData.length === 0 ? (
            <div style={{ padding: '48px 20px', textAlign: 'center', color: 'var(--text-tertiary)', fontSize: '13px', background: 'var(--bg-secondary)', borderRadius: '8px' }}>
              <Icon name="activity" size={28} style={{ display: 'block', margin: '0 auto 10px' }} />
              Sin datos de precio para este corte todavía.
            </div>
          ) : (
            <MiniLineChart 
              series={[
                {
                  label: 'Minorista',
                  color: 'var(--accent-info)',
                  puntos: serieData.filter(d => d.canal === 'minorista').map(d => ({ fecha: d.fecha, valor: parseFloat(d.precio_kg) }))
                },
                {
                  label: 'Mayorista',
                  color: 'var(--accent-warning)',
                  puntos: serieData.filter(d => d.canal === 'mayorista').map(d => ({ fecha: d.fecha, valor: parseFloat(d.precio_kg) }))
                }
              ]}
            />
          )}
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
