import { useState, useEffect } from 'react';
import { apiFetch } from '../../config/api';
import { Icon } from '../../icons.jsx';
import { Btn, StatusBadge, MetricCard } from '../../components/ui.jsx';

const ACCENT = 'var(--accent-agro)';

const fmt = (n, d = 2) => Number(n || 0).toLocaleString('es-BO', { minimumFractionDigits: d, maximumFractionDigits: d });

export default function RecomendacionesVenta({ negocioId }) {
  const [items, setItems] = useState([]);
  const [resumen, setResumen] = useState(null);
  const [modo, setModo] = useState('heuristico');
  const [cargando, setCargando] = useState(false);

  async function cargar() {
    setCargando(true);
    try {
      const data = await apiFetch(`/api/negocios/${negocioId}/recomendaciones`);
      setItems(data.items || []); setResumen(data.resumen || null); setModo(data.modo || 'heuristico');
    } catch (e) { console.error(e); }
    setCargando(false);
  }
  useEffect(() => { if (negocioId) cargar(); }, [negocioId]);

  function exportarCSV() {
    const cols = ['corte_canonico', 'canal_sugerido', 'precio_referencia', 'costo_kg', 'margen_kg',
                  'kg_disponibles', 'ingreso_estimado', 'tendencia', 'precio_pronosticado', 'confianza', 'accion'];
    const head = cols.join(',');
    const rows = items.map(i => cols.map(c => i[c] ?? '').join(','));
    const blob = new Blob([[head, ...rows].join('\n')], { type: 'text/csv' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob); a.download = 'recomendaciones_venta.csv'; a.click();
  }

  const COLS = [
    { key: 'corte_canonico', label: 'Corte', align: 'left' },
    { key: 'canal_sugerido', label: 'Canal sugerido', align: 'left' },
    { key: 'precio_referencia', label: 'Precio/kg', align: 'right', mono: true },
    { key: 'costo_kg', label: 'Costo/kg', align: 'right', mono: true },
    { key: 'margen_kg', label: 'Margen/kg', align: 'right', mono: true },
    { key: 'kg_disponibles', label: 'Kg disp.', align: 'right', mono: true },
    { key: 'ingreso_estimado', label: 'Ingreso est.', align: 'right', mono: true },
    { key: 'tendencia', label: 'Tendencia', align: 'center' },
    { key: 'precio_pronosticado', label: 'Pronóstico', align: 'right', mono: true },
    { key: 'confianza', label: 'Confianza', align: 'center' },
    { key: 'accion', label: 'Acción', align: 'left' },
  ];
  const GRID = 'minmax(110px,1.3fr) minmax(95px,1fr) 82px 82px 90px 72px 100px 80px 82px 80px 100px';

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      <style>{`@media print { button { display: none } }`}</style>

      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '12px' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <h1 style={{ fontSize: '22px', fontWeight: 400, color: 'var(--text-primary)', letterSpacing: '-0.02em' }}>Recomendaciones de venta</h1>
            <StatusBadge
              label={modo === 'forecast' ? 'Pronóstico ML' : 'Heurístico'}
              color={modo === 'forecast' ? 'var(--accent-industrial)' : 'var(--text-tertiary)'} />
          </div>
          <p style={{ fontSize: '13px', color: 'var(--text-tertiary)', marginTop: '4px' }}>Qué corte vender, en qué canal y a qué precio según el mercado y tu stock.</p>
        </div>
        <div style={{ display: 'flex', gap: '8px' }}>
          <Btn variant="secondary" icon="refresh" onClick={cargar}>Re-calcular</Btn>
          <Btn variant="secondary" icon="download" onClick={exportarCSV}>CSV</Btn>
          <Btn variant="secondary" icon="fileText" onClick={() => window.print()}>PDF</Btn>
        </div>
      </div>

      {/* Resumen */}
      {resumen && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '12px' }}>
          <MetricCard label="Ingreso estimado total" value={`Bs ${fmt(resumen.ingreso_total)}`} icon={<Icon name="wallet" size={16} />} accentColor={ACCENT} />
          <MetricCard label="Margen total" value={`Bs ${fmt(resumen.margen_total)}`} icon={<Icon name="trendingUp" size={16} />} accentColor="var(--accent-success)" />
          <MetricCard label="Cortes analizados" value={items.length} mono icon={<Icon name="layers" size={16} />} />
        </div>
      )}

      {/* Tabla de recomendaciones */}
      <div style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border-subtle)', borderRadius: '8px', overflow: 'hidden' }}>
        <div style={{ display: 'grid', gridTemplateColumns: GRID, gap: '10px', padding: '10px 16px', borderBottom: '1px solid var(--border-subtle)' }}>
          {COLS.map(c => (
            <div key={c.key} style={{ fontSize: '11px', color: 'var(--text-tertiary)', letterSpacing: '0.05em', fontWeight: 500, textAlign: c.align }}>{c.label}</div>
          ))}
        </div>

        {cargando ? (
          <div style={{ padding: '40px', textAlign: 'center', color: 'var(--text-tertiary)', fontSize: '14px' }}>Calculando recomendaciones…</div>
        ) : items.length === 0 ? (
          <div style={{ padding: '40px', textAlign: 'center', color: 'var(--text-tertiary)', fontSize: '14px', lineHeight: 1.6 }}>
            <Icon name="trendingUp" size={28} style={{ color: 'var(--text-tertiary)', opacity: 0.5 }} />
            <div style={{ marginTop: '10px' }}>No hay datos suficientes todavía.</div>
            <div style={{ fontSize: '12px' }}>Configurá fuentes de datos y ejecutá el scraping primero.</div>
          </div>
        ) : items.map((it, idx) => {
          const accion = it.accion === 'vender_ahora'
            ? { label: 'Vender', color: 'var(--accent-success)', icon: 'checkCircle' }
            : it.accion === 'esperar'
              ? { label: 'Esperar', color: 'var(--accent-warning)', icon: 'history' }
              : null;
          const tend = ['subiendo', 'sube', 'up'].includes(it.tendencia)
            ? { icon: 'arrowUp', color: 'var(--accent-success)' }
            : ['bajando', 'baja', 'down'].includes(it.tendencia)
              ? { icon: 'arrowDown', color: 'var(--accent-danger)' }
              : null;
          return (
            <div key={idx}
              style={{ display: 'grid', gridTemplateColumns: GRID, gap: '10px', padding: '11px 16px', borderBottom: idx < items.length - 1 ? '1px solid var(--border-subtle)' : 'none', alignItems: 'center', transition: 'background 0.1s' }}
              onMouseEnter={e => e.currentTarget.style.background = 'var(--bg-tertiary)'}
              onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
            >
              <span style={{ fontSize: '13px', color: 'var(--text-primary)', fontWeight: 500 }}>{it.corte_canonico}</span>
              <span style={{ fontSize: '13px', color: 'var(--text-secondary)', textTransform: 'capitalize' }}>{it.canal_sugerido}</span>
              <span style={{ fontSize: '13px', fontFamily: 'var(--font-mono)', color: 'var(--text-secondary)', textAlign: 'right' }}>{fmt(it.precio_referencia)}</span>
              <span style={{ fontSize: '13px', fontFamily: 'var(--font-mono)', color: 'var(--text-tertiary)', textAlign: 'right' }}>{fmt(it.costo_kg)}</span>
              <span style={{ fontSize: '13px', fontFamily: 'var(--font-mono)', color: it.margen_kg >= 0 ? 'var(--accent-success)' : 'var(--accent-danger)', textAlign: 'right', fontWeight: 500 }}>{fmt(it.margen_kg)}</span>
              <span style={{ fontSize: '13px', fontFamily: 'var(--font-mono)', color: 'var(--text-secondary)', textAlign: 'right' }}>{fmt(it.kg_disponibles, 1)}</span>
              <span style={{ fontSize: '13px', fontFamily: 'var(--font-mono)', color: 'var(--text-primary)', textAlign: 'right' }}>{fmt(it.ingreso_estimado)}</span>
              <span style={{ textAlign: 'center' }}>
                {tend ? <Icon name={tend.icon} size={15} style={{ color: tend.color }} /> : <span style={{ color: 'var(--text-tertiary)' }}>—</span>}
              </span>
              <span style={{ fontSize: '13px', fontFamily: 'var(--font-mono)', color: 'var(--text-secondary)', textAlign: 'right', fontStyle: 'italic' }}>
                {it.precio_pronosticado ? fmt(it.precio_pronosticado) : '—'}
              </span>
              <span style={{ textAlign: 'center' }}>
                {it.confianza != null ? (
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', fontSize: '11px', fontFamily: 'var(--font-mono)' }}>
                    <span style={{ width: '28px', height: '4px', borderRadius: '2px', background: 'var(--border-subtle)', overflow: 'hidden', display: 'inline-block' }}>
                      <span style={{ display: 'block', height: '100%', width: `${Math.round(it.confianza * 100)}%`, borderRadius: '2px', background: it.confianza >= 0.7 ? 'var(--accent-success)' : it.confianza >= 0.4 ? 'var(--accent-warning)' : 'var(--text-tertiary)' }} />
                    </span>
                    <span style={{ color: it.confianza >= 0.7 ? 'var(--accent-success)' : 'var(--text-tertiary)' }}>{Math.round(it.confianza * 100)}%</span>
                  </span>
                ) : <span style={{ color: 'var(--text-tertiary)' }}>—</span>}
              </span>
              <span>
                {accion ? (
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: '5px', color: accion.color, fontSize: '12px', fontWeight: 500 }}>
                    <Icon name={accion.icon} size={13} />{accion.label}
                  </span>
                ) : <span style={{ color: 'var(--text-tertiary)' }}>—</span>}
              </span>
            </div>
          );
        })}
      </div>

      {negocioId && <AlertasPrecio negocioId={negocioId} />}
    </div>
  );
}

function AlertasPrecio({ negocioId }) {
  const [alertas, setAlertas] = useState([]);
  const [expandido, setExpandido] = useState(true);
  const [recalculando, setRecalculando] = useState(false);

  async function cargarAlertas() {
    try {
      const d = await apiFetch(`/api/negocios/${negocioId}/alertas-precio`);
      setAlertas(d.alertas || []);
    } catch { /* ignore */ }
  }

  useEffect(() => { cargarAlertas(); }, [negocioId]);

  async function recalcular() {
    setRecalculando(true);
    try {
      await apiFetch(`/api/negocios/${negocioId}/alertas-precio/recalcular`, { method: 'POST' });
      await cargarAlertas();
    } catch (e) { console.error('recalcular alertas:', e); }
    setRecalculando(false);
  }

  const WARN = 'var(--accent-warning)';
  const GRID = 'minmax(120px,1.4fr) minmax(90px,1fr) 110px 110px 100px 130px';

  if (alertas.length === 0) return (
    <div style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border-subtle)', borderRadius: '8px', padding: '16px', display: 'flex', alignItems: 'center', gap: '10px' }}>
      <Icon name="alertTriangle" size={16} style={{ color: 'var(--text-tertiary)' }} />
      <span style={{ fontSize: '13px', color: 'var(--text-tertiary)', flex: 1 }}>No hay alertas de cambio de precio.</span>
      <button
        onClick={recalcular} disabled={recalculando}
        style={{ background: 'transparent', border: `1px solid ${WARN}44`, borderRadius: '5px', padding: '4px 12px', fontSize: '12px', color: WARN, cursor: 'pointer', fontWeight: 500, opacity: recalculando ? 0.5 : 1 }}
      >{recalculando ? 'Recalculando…' : 'Recalcular alertas'}</button>
    </div>
  );

  return (
    <div style={{ background: 'var(--bg-secondary)', border: `1px solid ${WARN}33`, borderLeft: `3px solid ${WARN}`, borderRadius: '8px', overflow: 'hidden' }}>
      <div
        style={{ display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer', padding: '12px 16px' }}
        onClick={() => setExpandido(e => !e)}
        id="alertas-precio-toggle"
      >
        <Icon name="alertTriangle" size={16} style={{ color: WARN }} />
        <span style={{ fontSize: '13px', fontWeight: 500, color: 'var(--text-primary)' }}>Alertas de cambio de precio</span>
        <span style={{ background: 'var(--accent-danger)', color: '#fff', borderRadius: '999px', padding: '1px 8px', fontSize: '11px', fontWeight: 600, fontFamily: 'var(--font-mono)' }}>{alertas.length}</span>
        <button
          onClick={e => { e.stopPropagation(); recalcular(); }}
          disabled={recalculando}
          style={{ marginLeft: '8px', background: 'transparent', border: `1px solid ${WARN}44`, borderRadius: '5px', padding: '3px 10px', fontSize: '11px', color: WARN, cursor: 'pointer', fontWeight: 500, opacity: recalculando ? 0.5 : 1, transition: 'opacity 0.15s' }}
        >{recalculando ? 'Recalculando…' : 'Recalcular'}</button>
        <Icon name={expandido ? 'chevronUp' : 'chevronDown'} size={15} style={{ color: 'var(--text-tertiary)', marginLeft: 'auto' }} />
      </div>
      {expandido && (
        <div style={{ padding: '0 16px 12px' }}>
          <div style={{ display: 'grid', gridTemplateColumns: GRID, gap: '10px', padding: '8px 0', borderBottom: '1px solid var(--border-subtle)' }}>
            {[['Corte', 'left'], ['Canal', 'left'], ['Precio nuevo', 'right'], ['Promedio ant.', 'right'], ['Variación', 'right'], ['Fecha', 'left']].map(([h, a]) => (
              <div key={h} style={{ fontSize: '11px', color: 'var(--text-tertiary)', letterSpacing: '0.05em', fontWeight: 500, textAlign: a }}>{h}</div>
            ))}
          </div>
          {alertas.map((a, i) => {
            const up = a.variacion_pct > 0;
            return (
              <div key={i} style={{ display: 'grid', gridTemplateColumns: GRID, gap: '10px', padding: '9px 0', borderBottom: i < alertas.length - 1 ? '1px solid var(--border-subtle)' : 'none', alignItems: 'center' }}>
                <span style={{ fontSize: '13px', color: 'var(--text-primary)' }}>{a.corte_canonico}</span>
                <span style={{ fontSize: '13px', color: 'var(--text-secondary)', textTransform: 'capitalize' }}>{a.canal}</span>
                <span style={{ fontSize: '13px', fontFamily: 'var(--font-mono)', color: 'var(--text-secondary)', textAlign: 'right' }}>{Number(a.precio_nuevo).toFixed(2)}</span>
                <span style={{ fontSize: '13px', fontFamily: 'var(--font-mono)', color: 'var(--text-tertiary)', textAlign: 'right' }}>{Number(a.precio_promedio).toFixed(2)}</span>
                <span style={{ fontSize: '13px', fontFamily: 'var(--font-mono)', fontWeight: 600, color: up ? 'var(--accent-success)' : 'var(--accent-danger)', textAlign: 'right' }}>{up ? '+' : ''}{Number(a.variacion_pct).toFixed(2)}%</span>
                <span style={{ fontSize: '12px', fontFamily: 'var(--font-mono)', color: 'var(--text-tertiary)' }}>{a.created_at?.slice(0, 16) || '—'}</span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
