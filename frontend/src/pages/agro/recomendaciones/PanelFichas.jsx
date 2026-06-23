import React, { useState, useEffect } from 'react';
import { apiFetch } from '../../../config/api.js';
import { Icon } from '../../../icons.jsx';

const fmt = (n, d = 2) => Number(n || 0).toLocaleString('es-BO', { minimumFractionDigits: d, maximumFractionDigits: d });

export default function PanelFichas({ negocioId, onSelectFicha }) {
  const [fichas, setFichas] = useState([]);
  const [expandido, setExpandido] = useState(false);

  useEffect(() => {
    if (expandido && negocioId) {
      cargarFichas();
    }
  }, [expandido, negocioId]);

  async function cargarFichas() {
    try {
      const data = await apiFetch(`/api/negocios/${negocioId}/recomendaciones/fichas`);
      setFichas(data || []);
    } catch (e) {
      console.error('Error cargando fichas:', e);
    }
  }

  const ACCENT = 'var(--accent-info)';

  return (
    <div style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border-subtle)', borderRadius: '8px', overflow: 'hidden' }}>
      <div
        style={{ display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer', padding: '12px 16px', background: expandido ? 'var(--bg-tertiary)' : 'transparent' }}
        onClick={() => setExpandido(e => !e)}
      >
        <Icon name="save" size={16} style={{ color: ACCENT }} />
        <span style={{ fontSize: '13px', fontWeight: 500, color: 'var(--text-primary)' }}>Fichas guardadas (Historial)</span>
        <span style={{ background: 'var(--bg-primary)', color: 'var(--text-secondary)', border: '1px solid var(--border-subtle)', borderRadius: '999px', padding: '1px 8px', fontSize: '11px', fontWeight: 600, fontFamily: 'var(--font-mono)' }}>{fichas.length || 0}</span>
        <Icon name={expandido ? 'chevronUp' : 'chevronDown'} size={15} style={{ color: 'var(--text-tertiary)', marginLeft: 'auto' }} />
      </div>

      {expandido && (
        <div style={{ padding: '0' }}>
          {fichas.length === 0 ? (
            <div style={{ padding: '20px', textAlign: 'center', color: 'var(--text-tertiary)', fontSize: '13px' }}>
              No hay fichas guardadas. Guardá la recomendación de hoy usando el botón "Guardar ficha".
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column' }}>
              {fichas.map((f, i) => {
                const res = f.resumen || {};
                return (
                  <div key={f.id}
                    onClick={() => onSelectFicha(f.id)}
                    style={{
                      display: 'grid', gridTemplateColumns: '1fr 120px 100px', gap: '10px',
                      padding: '12px 16px', borderTop: '1px solid var(--border-subtle)',
                      cursor: 'pointer', alignItems: 'center', transition: 'background 0.15s'
                    }}
                    onMouseEnter={e => e.currentTarget.style.background = 'var(--bg-tertiary)'}
                    onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                  >
                    <div>
                      <div style={{ fontSize: '13px', fontWeight: 500, color: 'var(--text-primary)' }}>{f.nombre}</div>
                      <div style={{ fontSize: '11px', color: 'var(--text-tertiary)', marginTop: '2px' }}>{new Date(f.generada_en).toLocaleString('es-BO')}</div>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <div style={{ fontSize: '11px', color: 'var(--text-tertiary)', textTransform: 'uppercase' }}>Ingreso Est.</div>
                      <div style={{ fontSize: '13px', fontFamily: 'var(--font-mono)', color: 'var(--text-primary)', fontWeight: 500 }}>Bs {fmt(res.ingreso_total, 0)}</div>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <div style={{ fontSize: '11px', color: 'var(--text-tertiary)', textTransform: 'uppercase' }}>Margen</div>
                      <div style={{ fontSize: '13px', fontFamily: 'var(--font-mono)', color: 'var(--accent-success)', fontWeight: 500 }}>Bs {fmt(res.margen_total, 0)}</div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
