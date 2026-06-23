import React, { useState } from 'react';
import { Icon } from '../../../icons.jsx';
import { apiFetch } from '../../../config/api.js';

export default function BandaAlertas({ negocioId, alertas, recargar }) {
  const [expandido, setExpandido] = useState(true);
  const [recalculando, setRecalculando] = useState(false);

  async function recalcular() {
    setRecalculando(true);
    try {
      await apiFetch(`/api/negocios/${negocioId}/alertas-precio/recalcular`, { method: 'POST' });
      await recargar();
    } catch (e) { console.error('recalcular alertas:', e); }
    setRecalculando(false);
  }

  const WARN = 'var(--accent-warning)';
  const GRID = 'minmax(120px,1.4fr) minmax(90px,1fr) 110px 110px 100px 130px';

  if (!alertas || alertas.length === 0) return (
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
