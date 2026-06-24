import React from 'react';
import { Icon } from '../../icons.jsx';
import { MetricCard, InfoTip } from '../../components/ui.jsx';
import { colorIca } from './colors.js';

const fmtBs = (n) => `Bs ${Number(n).toLocaleString('es-BO', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
const fmtBsCompacto = (n) => Math.abs(n) >= 10000 ? `Bs ${(n / 1000).toFixed(1)}k` : fmtBs(n);

const KpiRow = ({ kpis, loading }) => {
  const accent = 'var(--accent-agro)';
  const icaStatus = kpis?.ica_promedio == null
    ? 'sin_dato'
    : kpis.ica_promedio <= 3.0 ? 'bueno'
    : kpis.ica_promedio <= 3.5 ? 'aceptable'
    : 'malo';
  const icaColor = colorIca(icaStatus);

  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '12px' }}>
      <MetricCard
        label="Lotes activos"
        labelExtra={<InfoTip text="Lotes con animales en curso. Se cierra al liquidar desde la sección Liquidación." />}
        value={loading ? '...' : kpis.lotes_activos}
        sub="en engorde"
        icon={<Icon name="cow" size={16} />}
        accentColor={accent}
        mono={false}
      />
      <MetricCard
        label="Animales en engorde"
        labelExtra={<InfoTip text="Suma de cabezas activas. La mortandad se calcula sobre cabezas_inicio." />}
        value={loading ? '...' : kpis.cabezas_activas}
        sub={loading ? '' : `mortandad ${kpis.mortandad_pct.toFixed(1)}%`}
        icon={<Icon name="layers" size={16} />}
        mono={false}
      />
      <MetricCard
        label="Costo total acumulado"
        value={loading ? '...' : fmtBsCompacto(kpis.costo_total)}
        sub={loading ? '' : `${fmtBs(kpis.costo_por_cabeza)}/cabeza`}
        icon={<Icon name="dollarSign" size={16} />}
        mono={false}
      />
      <MetricCard
        label="ICA promedio"
        labelExtra={<InfoTip text="Conversión alimenticia ponderada por kg de ganancia. Verde ≤ 3.0, ámbar ≤ 3.5, rojo > 3.5. Benchmark ideal: 2.5." />}
        value={loading ? '...' : (kpis.ica_promedio != null ? kpis.ica_promedio.toFixed(2) : '—')}
        sub="benchmark 2.5"
        icon={<Icon name="trendingUp" size={16} style={{ color: icaColor }} />}
        accentColor={icaColor}
        mono={false}
      />
    </div>
  );
};

export default KpiRow;
