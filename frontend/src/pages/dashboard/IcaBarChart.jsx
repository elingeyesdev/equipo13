import React from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ReferenceLine, Cell, ResponsiveContainer } from 'recharts';
import { SectionCard } from '../../components/ui.jsx';
import { colorIca } from './colors.js';

const IcaBarChart = ({ icaPorLote, onLoteClick }) => {
  // Filtrar lotes sin dato de ICA: no aportan a la visualización.
  const data = (icaPorLote || []).filter(r => r.ica != null);
  const hayDatos = data.length > 0;

  return (
    <SectionCard title="ICA real por lote">
      {!hayDatos ? (
        <div style={{ height: 260, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-tertiary)', fontSize: '13px' }}>
          Aún no hay datos suficientes para calcular el ICA. Necesita pesaje inicial y actual del lote.
        </div>
      ) : (
        <ResponsiveContainer width="100%" height={260}>
          <BarChart data={data} layout="vertical" margin={{ top: 10, right: 30, left: 30, bottom: 10 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--border-subtle)" horizontal={false} />
            <XAxis
              type="number"
              tick={{ fontSize: 11, fill: 'var(--text-tertiary)' }}
              stroke="var(--border-subtle)"
              domain={[0, dataMax => Math.max(4, dataMax + 0.5)]}
            />
            <YAxis
              type="category"
              dataKey="identificador"
              tick={{ fontSize: 11, fill: 'var(--text-secondary)', fontFamily: 'IBM Plex Mono, monospace' }}
              stroke="var(--border-subtle)"
              width={120}
            />
            <Tooltip
              contentStyle={{ background: 'var(--bg-secondary)', border: '1px solid var(--border-subtle)', borderRadius: '6px', fontSize: '12px' }}
              formatter={(value, name, props) => [
                `${value} (${props.payload.kg_alimento.toFixed(0)} kg alim / ${props.payload.kg_ganancia.toFixed(0)} kg gan)`,
                'ICA',
              ]}
            />
            <ReferenceLine x={2.5} stroke="#666" strokeDasharray="3 3"
              label={{ value: 'Ideal 2.5', position: 'top', fill: '#666', fontSize: 10 }} />
            <Bar dataKey="ica" radius={[0, 4, 4, 0]} onClick={(d) => onLoteClick && onLoteClick(d)} style={{ cursor: 'pointer' }}>
              {data.map((entry, i) => (
                <Cell key={i} fill={colorIca(entry.status)} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      )}
    </SectionCard>
  );
};

export default IcaBarChart;
