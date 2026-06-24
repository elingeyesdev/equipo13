import React from 'react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { SectionCard } from '../../components/ui.jsx';
import { colorParaLote } from './colors.js';

const formatMes = (mes) => {
  // mes viene como 'YYYY-MM'
  const [y, m] = mes.split('-');
  const d = new Date(Number(y), Number(m) - 1, 1);
  return d.toLocaleDateString('es-BO', { month: 'short', year: '2-digit' });
};

const MortalitySeriesChart = ({ mortandadSerie }) => {
  const data = mortandadSerie || [];
  // Identificadores de lote = keys distintas a 'mes'
  const lotes = data.length > 0
    ? Array.from(new Set(data.flatMap(d => Object.keys(d).filter(k => k !== 'mes'))))
    : [];

  if (data.length === 0 || lotes.length === 0) {
    return (
      <SectionCard title="Mortandad acumulada">
        <div style={{ height: 260, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-tertiary)', fontSize: '13px', textAlign: 'center', padding: '0 16px' }}>
          Sin bajas registradas — todos los lotes en buena salud.
        </div>
      </SectionCard>
    );
  }

  return (
    <SectionCard title="Mortandad acumulada">
      <ResponsiveContainer width="100%" height={260}>
        <AreaChart data={data} margin={{ top: 10, right: 20, left: 0, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="var(--border-subtle)" vertical={false} />
          <XAxis
            dataKey="mes"
            tickFormatter={formatMes}
            tick={{ fontSize: 11, fill: 'var(--text-tertiary)' }}
            stroke="var(--border-subtle)"
          />
          <YAxis
            tick={{ fontSize: 11, fill: 'var(--text-tertiary)' }}
            stroke="var(--border-subtle)"
            allowDecimals={false}
            label={{ value: 'bajas acum.', angle: -90, position: 'insideLeft', style: { fontSize: 11, fill: 'var(--text-tertiary)' } }}
          />
          <Tooltip
            contentStyle={{ background: 'var(--bg-secondary)', border: '1px solid var(--border-subtle)', borderRadius: '6px', fontSize: '12px' }}
            labelFormatter={formatMes}
          />
          <Legend wrapperStyle={{ fontSize: '12px', paddingTop: '8px' }} />
          {lotes.map((ident, i) => (
            <Area
              key={ident}
              type="monotone"
              dataKey={ident}
              stackId="1"
              stroke={colorParaLote(i)}
              fill={colorParaLote(i)}
              fillOpacity={0.4}
            />
          ))}
        </AreaChart>
      </ResponsiveContainer>
    </SectionCard>
  );
};

export default MortalitySeriesChart;
