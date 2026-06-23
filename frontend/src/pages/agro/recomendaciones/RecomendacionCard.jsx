import React from 'react';
import { Icon } from '../../../icons.jsx';
import { InfoTip } from '../../../components/ui.jsx';
import Sparkline from './Sparkline.jsx';
import { accionVisual, razonRecomendacion, nivelConfianza } from './derive.js';

const fmt = (n, d = 2) => Number(n || 0).toLocaleString('es-BO', { minimumFractionDigits: d, maximumFractionDigits: d });

export default function RecomendacionCard({ item, metaModelos, historico, alertas, horizonte }) {
  const visual = accionVisual(item.accion);
  const razon = razonRecomendacion(item, horizonte);
  const confianza = nivelConfianza(item, metaModelos);
  
  const meta = metaModelos?.find(m => m.corte_canonico === item.corte_canonico && m.canal === item.canal_sugerido);
  const alerta = alertas?.find(a => a.corte_canonico === item.corte_canonico);

  const histPuntos = historico?.filter(h => h.corte_canonico === item.corte_canonico && h.canal === item.canal_sugerido)
                               .map(h => ({ fecha: h.fecha, valor: h.precio_kg })) || [];

  return (
    <div style={{
      background: 'var(--bg-secondary)',
      border: '1px solid var(--border-subtle)',
      borderRadius: '12px',
      padding: '16px',
      display: 'flex',
      flexDirection: 'column',
      gap: '14px',
      position: 'relative'
    }}>
      
      {/* Badge de Alerta (opcional) */}
      {alerta && (
        <div style={{
          position: 'absolute', top: '-10px', right: '16px',
          background: alerta.tipo === 'subida' ? 'var(--accent-success)' : 'var(--accent-danger)',
          color: '#fff', fontSize: '11px', fontWeight: 600, padding: '2px 8px',
          borderRadius: '10px', display: 'flex', alignItems: 'center', gap: '4px',
          boxShadow: 'var(--shadow-sm)'
        }}>
          <Icon name="alertTriangle" size={12} />
          {alerta.variacion_pct > 0 ? '+' : ''}{fmt(alerta.variacion_pct, 1)}%
        </div>
      )}

      {/* Cabecera */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '10px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <div style={{ fontSize: '14px', fontWeight: 600, color: 'var(--text-tertiary)', background: 'var(--bg-tertiary)', padding: '2px 6px', borderRadius: '4px' }}>
            #{item.rank}
          </div>
          <div style={{ fontSize: '18px', fontWeight: 600, color: 'var(--text-primary)', letterSpacing: '-0.02em' }}>
            {item.corte_canonico}
          </div>
        </div>
        <div style={{
          display: 'flex', alignItems: 'center', gap: '6px',
          background: `${visual.color}1A`, color: visual.color,
          padding: '6px 12px', borderRadius: '16px',
          fontSize: '13px', fontWeight: 600
        }}>
          <Icon name={visual.icon} size={14} />
          {visual.label}
        </div>
      </div>

      {/* Razón */}
      <div style={{ fontSize: '13px', color: 'var(--text-secondary)', lineHeight: 1.4 }}>
        {razon}
      </div>

      {/* Métricas Principales */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '12px', background: 'var(--bg-tertiary)', padding: '12px', borderRadius: '8px' }}>
        <div>
          <div style={{ fontSize: '11px', color: 'var(--text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '4px' }}>Precio Sug.</div>
          <div style={{ fontSize: '16px', fontWeight: 600, fontFamily: 'var(--font-mono)', color: 'var(--text-primary)' }}>
            Bs {fmt(item.precio_referencia)}
          </div>
          {item.precio_min != null && item.precio_max != null && (
            <div style={{ fontSize: '11px', color: 'var(--text-secondary)', marginTop: '2px', fontFamily: 'var(--font-mono)' }}>
              ≈{fmt(item.precio_min, 0)}–{fmt(item.precio_max, 0)} Bs
            </div>
          )}
        </div>
        <div>
          <div style={{ fontSize: '11px', color: 'var(--text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '4px' }}>Margen/kg</div>
          <div style={{ fontSize: '16px', fontWeight: 600, fontFamily: 'var(--font-mono)', color: item.margen_kg >= 0 ? 'var(--accent-success)' : 'var(--accent-danger)' }}>
            Bs {fmt(item.margen_kg)}
          </div>
        </div>
        <div>
          <div style={{ fontSize: '11px', color: 'var(--text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '4px' }}>Disp. / Ingreso</div>
          <div style={{ fontSize: '14px', fontWeight: 500, fontFamily: 'var(--font-mono)', color: 'var(--text-primary)' }}>
            {fmt(item.kg_disponibles, 1)} kg
          </div>
          <div style={{ fontSize: '12px', color: 'var(--text-secondary)', marginTop: '2px', fontFamily: 'var(--font-mono)' }}>
            Bs {fmt(item.ingreso_estimado, 0)}
          </div>
        </div>
      </div>

      {/* Pie: Gráfico + Confianza */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginTop: '4px' }}>
        <div>
          <div style={{ fontSize: '11px', color: 'var(--text-tertiary)', marginBottom: '4px' }}>Evolución 30d</div>
          <Sparkline puntos={histPuntos} width={120} height={36} color="var(--accent-industrial)" />
        </div>
        
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: confianza.color }} />
          <span style={{ fontSize: '12px', color: 'var(--text-secondary)', fontWeight: 500 }}>
            Confianza {confianza.nivel}
          </span>
          {meta && (
            <InfoTip text={`Modelo ${meta.modelo} · MAE ${meta.metricas?.mae || '—'} Bs · MAPE ${meta.metricas?.mape || '—'}% · ${meta.n_puntos || '—'} pts`} />
          )}
        </div>
      </div>

    </div>
  );
}
