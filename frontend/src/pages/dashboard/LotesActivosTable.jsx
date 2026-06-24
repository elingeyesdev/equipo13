import React from 'react';
import { LineChart, Line, ResponsiveContainer } from 'recharts';
import { Btn, MoneyDisplay } from '../../components/ui.jsx';
import { colorIca, colorParaLote } from './colors.js';

const Sparkline = ({ values, color }) => {
  if (!values || values.length < 2) {
    return <span style={{ fontSize: '11px', color: 'var(--text-tertiary)' }}>—</span>;
  }
  const data = values.map((v, i) => ({ i, v }));
  return (
    <div style={{ width: 80, height: 26 }}>
      <ResponsiveContainer>
        <LineChart data={data}>
          <Line type="monotone" dataKey="v" stroke={color} strokeWidth={1.5} dot={false} isAnimationActive={false} />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
};

const LotesActivosTable = ({ lotes, onLoteClick }) => {
  const accent = 'var(--accent-agro)';
  return (
    <div style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border-subtle)', borderRadius: '8px', overflow: 'hidden' }}>
      <div style={{ padding: '14px 20px', borderBottom: '1px solid var(--border-subtle)' }}>
        <span style={{ fontSize: '13px', fontWeight: 500, color: 'var(--text-primary)' }}>Lotes activos</span>
      </div>
      <div style={{
        display: 'grid',
        gridTemplateColumns: '1fr 70px 70px 90px 110px 90px 80px 90px',
        padding: '8px 20px',
        borderBottom: '1px solid var(--border-subtle)',
        gap: '8px',
        fontSize: '11px',
        color: 'var(--text-tertiary)',
        fontWeight: 500,
      }}>
        <span>Lote</span>
        <span>Tipo</span>
        <span style={{ textAlign: 'right' }}>Días</span>
        <span style={{ textAlign: 'right' }}>Animales</span>
        <span style={{ textAlign: 'right' }}>Costo total</span>
        <span style={{ textAlign: 'center' }}>Tendencia</span>
        <span style={{ textAlign: 'right' }}>ICA</span>
        <span></span>
      </div>
      {(!lotes || lotes.length === 0) ? (
        <div style={{ padding: '24px', textAlign: 'center', color: 'var(--text-tertiary)', fontSize: '13px' }}>No hay lotes activos.</div>
      ) : (
        lotes.map((l, i) => {
          const sparkColor = colorParaLote(i);
          const icaTxt = l.ica != null ? l.ica.toFixed(2) : '—';
          const icaStatus = l.ica == null ? 'sin_dato' : l.ica <= 3.0 ? 'bueno' : l.ica <= 3.5 ? 'aceptable' : 'malo';
          return (
            <div
              key={l.id}
              style={{
                display: 'grid',
                gridTemplateColumns: '1fr 70px 70px 90px 110px 90px 80px 90px',
                padding: '10px 20px',
                borderBottom: i < lotes.length - 1 ? '1px solid var(--border-subtle)' : 'none',
                gap: '8px',
                alignItems: 'center',
                cursor: 'pointer',
                transition: 'background 0.1s',
              }}
              onMouseEnter={e => e.currentTarget.style.background = 'var(--bg-tertiary)'}
              onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
              onClick={() => onLoteClick && onLoteClick(l)}
            >
              <span style={{ fontSize: '13px', fontWeight: 500, color: 'var(--text-primary)', fontFamily: 'IBM Plex Mono, monospace' }}>{l.identificador}</span>
              <span style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>{l.tipo_animal}</span>
              <span style={{ textAlign: 'right', fontFamily: 'IBM Plex Mono, monospace', fontSize: '13px', color: 'var(--text-secondary)' }}>{l.dias}d</span>
              <span style={{ textAlign: 'right', fontFamily: 'IBM Plex Mono, monospace', fontSize: '13px', color: 'var(--text-primary)' }}>{l.cabezas_activas} cab.</span>
              <div style={{ textAlign: 'right' }}><MoneyDisplay value={l.costo_total} size="sm" /></div>
              <div style={{ display: 'flex', justifyContent: 'center' }}>
                <Sparkline values={l.pesajes_recientes} color={sparkColor} />
              </div>
              <span style={{ textAlign: 'right', fontFamily: 'IBM Plex Mono, monospace', fontSize: '13px', fontWeight: 600, color: colorIca(icaStatus) }}>{icaTxt}</span>
              <div onClick={e => e.stopPropagation()}>
                <Btn variant="ghost" size="sm" accentColor={accent} onClick={() => onLoteClick && onLoteClick(l)}>Ver →</Btn>
              </div>
            </div>
          );
        })
      )}
    </div>
  );
};

export default LotesActivosTable;
