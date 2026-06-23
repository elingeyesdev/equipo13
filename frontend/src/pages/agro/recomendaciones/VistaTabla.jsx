import React from 'react';
import { Icon } from '../../../icons.jsx';
import Sparkline from './Sparkline.jsx';
import { accionVisual, nivelConfianza } from './derive.js';

const fmt = (n, d = 2) => Number(n || 0).toLocaleString('es-BO', { minimumFractionDigits: d, maximumFractionDigits: d });

export default function VistaTabla({ items, metaModelos, historico }) {
  if (!items || items.length === 0) return null;

  // Grid layout (13 columns):
  // Accion, Corte, [Actual: Precio, Margen, Kg, Ingreso], Sparkline, Tendencia, [Pronostico: Precio, Margen, Ingreso, Confianza], Canal
  const GRID = '110px 1.2fr 80px 80px 80px 90px 100px 70px 80px 80px 90px 100px 100px';
  const MIN_WIDTH = '1150px';

  return (
    <div style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border-subtle)', borderRadius: '8px', overflowX: 'auto' }}>
      <div style={{ minWidth: MIN_WIDTH }}>
        
        {/* Header Agrupado */}
        <div style={{ position: 'sticky', top: 0, background: 'var(--bg-secondary)', zIndex: 10, borderBottom: '1px solid var(--border-subtle)' }}>
          {/* Fila 1: Grupos */}
          <div style={{ display: 'grid', gridTemplateColumns: GRID, gap: '10px', padding: '6px 16px', borderBottom: '1px solid var(--border-subtle)', background: 'var(--bg-tertiary)' }}>
            <div style={{ gridColumn: '1 / span 2' }} /> {/* Accion, Corte */}
            <div style={{ gridColumn: '3 / span 4', textAlign: 'center', fontSize: '11px', fontWeight: 600, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Actual</div>
            <div style={{ gridColumn: '7 / span 2' }} /> {/* Sparkline, Tendencia */}
            <div style={{ gridColumn: '9 / span 4', textAlign: 'center', fontSize: '11px', fontWeight: 600, color: 'var(--accent-industrial)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Pronóstico</div>
            <div style={{ gridColumn: '13 / span 1' }} /> {/* Canal */}
          </div>

          {/* Fila 2: Columnas */}
          <div style={{ display: 'grid', gridTemplateColumns: GRID, gap: '10px', padding: '10px 16px' }}>
            <div style={{ fontSize: '11px', color: 'var(--text-tertiary)', fontWeight: 500, letterSpacing: '0.05em' }}>ACCIÓN</div>
            <div style={{ fontSize: '11px', color: 'var(--text-tertiary)', fontWeight: 500, letterSpacing: '0.05em' }}>CORTE</div>
            
            <div style={{ fontSize: '11px', color: 'var(--text-tertiary)', fontWeight: 500, textAlign: 'right' }}>PRECIO</div>
            <div style={{ fontSize: '11px', color: 'var(--text-tertiary)', fontWeight: 500, textAlign: 'right' }}>MARGEN/KG</div>
            <div style={{ fontSize: '11px', color: 'var(--text-tertiary)', fontWeight: 500, textAlign: 'right' }}>KG DISP.</div>
            <div style={{ fontSize: '11px', color: 'var(--text-tertiary)', fontWeight: 500, textAlign: 'right' }}>INGRESO</div>
            
            <div style={{ fontSize: '11px', color: 'var(--text-tertiary)', fontWeight: 500, textAlign: 'center' }}>GRÁFICO 30D</div>
            <div style={{ fontSize: '11px', color: 'var(--text-tertiary)', fontWeight: 500, textAlign: 'center' }}>TENDENCIA</div>
            
            <div style={{ fontSize: '11px', color: 'var(--text-tertiary)', fontWeight: 500, textAlign: 'right' }}>PRECIO PRON.</div>
            <div style={{ fontSize: '11px', color: 'var(--text-tertiary)', fontWeight: 500, textAlign: 'right' }}>MARGEN PRON.</div>
            <div style={{ fontSize: '11px', color: 'var(--text-tertiary)', fontWeight: 500, textAlign: 'right' }}>INGRESO PRON.</div>
            <div style={{ fontSize: '11px', color: 'var(--text-tertiary)', fontWeight: 500, textAlign: 'left' }}>CONFIANZA</div>
            
            <div style={{ fontSize: '11px', color: 'var(--text-tertiary)', fontWeight: 500, textAlign: 'left' }}>CANAL</div>
          </div>
        </div>

        {/* Filas */}
        {items.map((it, idx) => {
          const visual = accionVisual(it.accion);
          const conf = nivelConfianza(it, metaModelos);
          const tend = ['subiendo', 'sube', 'up'].includes(it.tendencia) ? { icon: 'arrowUp', color: 'var(--accent-success)' }
                     : ['bajando', 'baja', 'down'].includes(it.tendencia) ? { icon: 'arrowDown', color: 'var(--accent-danger)' }
                     : null;

          const histPuntos = historico?.filter(h => h.corte_canonico === it.corte_canonico && h.canal === it.canal_sugerido)
                                       .map(h => ({ fecha: h.fecha, valor: h.precio_kg })) || [];

          return (
            <div key={idx}
              style={{ display: 'grid', gridTemplateColumns: GRID, gap: '10px', padding: '11px 16px', borderBottom: idx < items.length - 1 ? '1px solid var(--border-subtle)' : 'none', alignItems: 'center', transition: 'background 0.1s' }}
              onMouseEnter={e => e.currentTarget.style.background = 'var(--bg-tertiary)'}
              onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
            >
              {/* Acción */}
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: '5px', color: visual.color, fontSize: '12px', fontWeight: 600, background: `${visual.color}1A`, padding: '4px 8px', borderRadius: '4px' }}>
                <Icon name={visual.icon} size={13} /> {visual.label}
              </span>

              {/* Corte */}
              <span style={{ fontSize: '13px', color: 'var(--text-primary)', fontWeight: 500, display: 'flex', alignItems: 'center', gap: '6px' }}>
                <span style={{ color: 'var(--text-tertiary)', fontSize: '11px' }}>#{it.rank}</span>
                {it.corte_canonico}
              </span>

              {/* Actual */}
              <span style={{ fontSize: '13px', fontFamily: 'var(--font-mono)', color: 'var(--text-primary)', textAlign: 'right' }}>{fmt(it.precio_referencia)}</span>
              <span style={{ fontSize: '13px', fontFamily: 'var(--font-mono)', color: it.margen_kg >= 0 ? 'var(--accent-success)' : 'var(--accent-danger)', textAlign: 'right', fontWeight: 500 }}>{fmt(it.margen_kg)}</span>
              <span style={{ fontSize: '13px', fontFamily: 'var(--font-mono)', color: 'var(--text-secondary)', textAlign: 'right' }}>{fmt(it.kg_disponibles, 1)}</span>
              <span style={{ fontSize: '13px', fontFamily: 'var(--font-mono)', color: 'var(--text-primary)', textAlign: 'right' }}>{fmt(it.ingreso_estimado)}</span>

              {/* Sparkline & Tendencia */}
              <span style={{ display: 'flex', justifyContent: 'center' }}>
                <Sparkline puntos={histPuntos} width={70} height={20} color="var(--accent-industrial)" />
              </span>
              <span style={{ textAlign: 'center' }}>
                {tend ? <Icon name={tend.icon} size={15} style={{ color: tend.color }} /> : <span style={{ color: 'var(--text-tertiary)' }}>—</span>}
              </span>

              {/* Pronóstico */}
              <span style={{ fontSize: '13px', fontFamily: 'var(--font-mono)', color: 'var(--text-secondary)', textAlign: 'right', fontStyle: 'italic' }}>
                {it.precio_pronosticado ? fmt(it.precio_pronosticado) : '—'}
              </span>
              <span style={{ fontSize: '13px', fontFamily: 'var(--font-mono)', color: it.margen_pronosticado >= 0 ? 'var(--accent-success)' : 'var(--accent-danger)', textAlign: 'right', fontStyle: 'italic' }}>
                {it.margen_pronosticado != null ? fmt(it.margen_pronosticado) : '—'}
              </span>
              <span style={{ fontSize: '13px', fontFamily: 'var(--font-mono)', color: 'var(--text-secondary)', textAlign: 'right', fontStyle: 'italic' }}>
                {it.ingreso_pronosticado != null ? fmt(it.ingreso_pronosticado) : '—'}
              </span>
              <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                {conf.nivel !== 'media' || it.precio_pronosticado ? (
                  <>
                    <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: conf.color }} title={`Confianza ${conf.nivel}`} />
                    <span style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>{conf.nivel}</span>
                  </>
                ) : <span style={{ color: 'var(--text-tertiary)' }}>—</span>}
              </span>

              {/* Canal Sugerido */}
              <span style={{ fontSize: '12px', color: 'var(--text-tertiary)', textTransform: 'capitalize' }}>{it.canal_sugerido}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
