import React from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { SectionCard } from '../../components/ui.jsx';

// Transforma el array por-lote del backend al shape que entiende Recharts:
// [{ fecha: '2026-05-25', 'LOTE-CERD-001': 8.5, 'LOTE-CERD-002': 9.0 }, ...]
function pivotPesos(pesosPorLote) {
  const map = new Map();
  for (const lote of pesosPorLote) {
    for (const p of lote.puntos) {
      if (!map.has(p.fecha)) map.set(p.fecha, { fecha: p.fecha });
      map.get(p.fecha)[lote.identificador] = p.peso;
    }
  }
  return Array.from(map.values()).sort((a, b) => a.fecha.localeCompare(b.fecha));
}

const formatFecha = (iso) => {
  const d = new Date(iso);
  return d.toLocaleDateString('es-BO', { day: '2-digit', month: 'short' });
};

const WeightEvolutionChart = ({ pesosPorLote, onLoteClick }) => {
  const data = pivotPesos(pesosPorLote || []);
  const hayDatos = data.length > 0 && pesosPorLote?.some(l => l.puntos.length > 0);

  return (
    <SectionCard title="Evolución de peso por lote">
      {!hayDatos ? (
        <div style={{ height: 260, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-tertiary)', fontSize: '13px' }}>
          Sin pesajes registrados en este período.
        </div>
      ) : (
        <ResponsiveContainer width="100%" height={260}>
          <LineChart data={data} margin={{ top: 10, right: 20, left: 0, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--border-subtle)" vertical={false} />
            <XAxis
              dataKey="fecha"
              tickFormatter={formatFecha}
              tick={{ fontSize: 11, fill: 'var(--text-tertiary)' }}
              stroke="var(--border-subtle)"
            />
            <YAxis
              tick={{ fontSize: 11, fill: 'var(--text-tertiary)' }}
              stroke="var(--border-subtle)"
              label={{ value: 'kg', angle: -90, position: 'insideLeft', style: { fontSize: 11, fill: 'var(--text-tertiary)' } }}
            />
            <Tooltip
              contentStyle={{ background: 'var(--bg-secondary)', border: '1px solid var(--border-subtle)', borderRadius: '6px', fontSize: '12px' }}
              labelFormatter={formatFecha}
              formatter={(value) => [`${value} kg`, '']}
            />
            <Legend wrapperStyle={{ fontSize: '12px', paddingTop: '8px' }} />
            {pesosPorLote.map(lote => (
              <Line
                key={lote.lote_id}
                type="monotone"
                dataKey={lote.identificador}
                stroke={lote.color}
                strokeWidth={2}
                dot={{ r: 3, fill: lote.color, style: { cursor: 'pointer' } }}
                activeDot={{ r: 5, onClick: () => onLoteClick && onLoteClick(lote) }}
                connectNulls
              />
            ))}
          </LineChart>
        </ResponsiveContainer>
      )}
    </SectionCard>
  );
};

export default WeightEvolutionChart;
