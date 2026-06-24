import React, { useState, useEffect, useCallback } from 'react';
import { RubroBadge, Btn, SectionCard, StatusBadge, InfoTip } from '../../components/ui.jsx';
import { Icon } from '../../icons.jsx';
import { apiFetch } from '../../config/api.js';
import RangoSelector from './RangoSelector.jsx';
import KpiRow from './KpiRow.jsx';
import WeightEvolutionChart from './WeightEvolutionChart.jsx';
import CostBreakdownDonut from './CostBreakdownDonut.jsx';
import IcaBarChart from './IcaBarChart.jsx';
import MortalitySeriesChart from './MortalitySeriesChart.jsx';
import LotesActivosTable from './LotesActivosTable.jsx';

const timeAgo = (dateStr) => {
  if (!dateStr) return '—';
  const diff = Date.now() - new Date(dateStr).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 60) return `hace ${m || 1}m`;
  const h = Math.floor(m / 60);
  if (h < 24) return `hace ${h}h`;
  return `hace ${Math.floor(h / 24)}d`;
};

const DashboardAgro = ({ negocio, onNavigate }) => {
  const accentColor = 'var(--accent-agro)';
  const [rango, setRango] = useState('30d');
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    apiFetch(`/api/negocios/${negocio.id}/dashboard?rango=${rango}`)
      .then(setData)
      .catch(e => console.error('dashboard fetch error:', e))
      .finally(() => setLoading(false));
  }, [negocio.id, rango]);

  // Click en lote (chart o tabla) -> navega a su hoja de vida.
  // `activeLote` en App.jsx espera { _id, id, tipo, ... }, donde _id es el UUID
  // y `id` es el identificador human-readable.
  const handleLoteClick = useCallback((lote) => {
    const id = lote.lote_id || lote.id;
    const identificador = lote.identificador || lote.id;
    onNavigate('hojavida', { lote: { _id: id, id: identificador, tipo: lote.tipo_animal || 'Cerdo' } });
  }, [onNavigate]);

  const kpis = data?.kpis;
  const ultimo = data?.ultimo_liquidado;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '12px' }}>
        <div>
          <div style={{ fontSize: '22px', fontWeight: 400, color: 'var(--text-primary)', letterSpacing: '-0.02em', marginBottom: '4px' }}>{negocio.nombre}</div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <RubroBadge rubro={negocio.rubro} />
            <span style={{ fontSize: '13px', color: 'var(--text-tertiary)' }}>Temporada 2026</span>
          </div>
        </div>
        <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
          <RangoSelector value={rango} onChange={setRango} />
          <Btn onClick={() => onNavigate('lotes')} accentColor={accentColor} icon="plus">Registrar lote</Btn>
        </div>
      </div>

      {/* KPI row */}
      <KpiRow kpis={kpis || { lotes_activos: 0, cabezas_activas: 0, mortandad_pct: 0, costo_total: 0, costo_por_cabeza: 0, ica_promedio: null }} loading={loading} />

      {/* Charts grid 2x2 */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '16px' }}>
        <WeightEvolutionChart pesosPorLote={data?.pesos_por_lote || []} onLoteClick={handleLoteClick} />
        <CostBreakdownDonut costosCategoria={data?.costos_categoria || []} />
        <IcaBarChart icaPorLote={data?.ica_por_lote || []} onLoteClick={handleLoteClick} />
        <MortalitySeriesChart mortandadSerie={data?.mortandad_serie || []} />
      </div>

      {/* Tabla de lotes activos */}
      <LotesActivosTable lotes={data?.lotes_resumen || []} onLoteClick={handleLoteClick} />

      {/* Último lote cerrado (condicional) */}
      {ultimo && ultimo.liquidacion_jsonb && (() => {
        const liq = ultimo.liquidacion_jsonb;
        const utilidad = parseFloat(liq.utilidad);
        const margen = liq.margen != null ? parseFloat(liq.margen) : null;
        const escenario_label = liq.escenario === 'pie' ? 'Venta en pie' : 'Venta gancho';
        const fechaCierre = new Date(liq.liquidado_en).toLocaleDateString('es-BO', { day: '2-digit', month: 'short', year: 'numeric' });
        return (
          <div style={{ background: 'var(--bg-secondary)', border: `1px solid ${accentColor}33`, borderRadius: '8px', overflow: 'hidden' }}>
            <div style={{ padding: '12px 20px', borderBottom: `1px solid ${accentColor}22`, background: accentColor + '08', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <span style={{ fontSize: '13px', fontWeight: 500, color: 'var(--text-primary)' }}>Último lote cerrado</span>
                <InfoTip text="Resultado del último lote liquidado." />
              </div>
              <Btn variant="ghost" size="sm" icon="arrowRight" onClick={() => onNavigate('lotes')}>Ver lotes</Btn>
            </div>
            <div style={{ padding: '16px 20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '20px', flexWrap: 'wrap' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                  <span style={{ fontSize: '14px', fontWeight: 600, color: 'var(--text-primary)', fontFamily: 'IBM Plex Mono, monospace' }}>#{ultimo.identificador}</span>
                  <StatusBadge label={ultimo.tipo_animal} color={accentColor} />
                  <span style={{ padding: '2px 8px', borderRadius: '4px', fontSize: '11px', fontWeight: 600, color: accentColor, background: accentColor + '18', border: `1px solid ${accentColor}33` }}>{escenario_label}</span>
                </div>
                <span style={{ fontSize: '12px', color: 'var(--text-tertiary)' }}>Cerrado el {fechaCierre} · {liq.cabezas_venta} cab. · {liq.peso_prom_final} kg/cab promedio</span>
              </div>
              <div style={{ display: 'flex', gap: '28px', flexWrap: 'wrap' }}>
                {[
                  { label: 'Ingreso total', val: `Bs ${parseFloat(liq.ingreso).toLocaleString('es-BO', { minimumFractionDigits: 0 })}`, color: 'var(--text-primary)' },
                  { label: 'Utilidad neta', val: `${utilidad >= 0 ? '+' : ''}Bs ${utilidad.toLocaleString('es-BO', { minimumFractionDigits: 0 })}`, color: utilidad >= 0 ? 'var(--accent-success)' : 'var(--accent-danger)' },
                  { label: 'Margen s/ ingreso', val: margen != null ? `${margen.toFixed(1)}%` : '—', color: margen != null && margen >= 0 ? 'var(--accent-success)' : 'var(--accent-danger)' },
                ].map((m, i) => (
                  <div key={i} style={{ display: 'flex', flexDirection: 'column', gap: '2px', textAlign: 'right' }}>
                    <span style={{ fontSize: '10px', color: 'var(--text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>{m.label}</span>
                    <span style={{ fontFamily: 'IBM Plex Mono, monospace', fontSize: '16px', fontWeight: 600, color: m.color }}>{m.val}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        );
      })()}

      {/* Actividad reciente */}
      <SectionCard title="Actividad reciente">
        {loading ? (
          <div style={{ fontSize: '13px', color: 'var(--text-tertiary)' }}>Cargando...</div>
        ) : (data?.actividad_reciente?.length || 0) === 0 ? (
          <div style={{ fontSize: '13px', color: 'var(--text-tertiary)' }}>Sin actividad reciente.</div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {data.actividad_reciente.map((item, i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <div style={{ width: 28, height: 28, borderRadius: '6px', background: 'var(--accent-success)1A', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <Icon name="plus" size={13} style={{ color: 'var(--accent-success)' }} />
                </div>
                <div style={{ flex: 1, fontSize: '13px', color: 'var(--text-secondary)' }}>{item.texto}</div>
                <div style={{ fontSize: '11px', color: 'var(--text-tertiary)', whiteSpace: 'nowrap' }}>{timeAgo(item.fecha)}</div>
              </div>
            ))}
          </div>
        )}
      </SectionCard>
    </div>
  );
};

export default DashboardAgro;
