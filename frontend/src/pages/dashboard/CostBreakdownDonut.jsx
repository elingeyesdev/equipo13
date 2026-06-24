import React from 'react';
import { PieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { SectionCard } from '../../components/ui.jsx';

const fmtBs = (n) => `Bs ${Number(n).toLocaleString('es-BO', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
const fmtBsCompacto = (n) => Math.abs(n) >= 10000 ? `Bs ${(n / 1000).toFixed(1)}k` : fmtBs(n);

const CostBreakdownDonut = ({ costosCategoria }) => {
  const total = (costosCategoria || []).reduce((s, c) => s + c.monto, 0);
  const hayDatos = total > 0;

  // Etiqueta personalizada que muestra % en cada slice
  const renderLabel = ({ cx, cy, midAngle, innerRadius, outerRadius, percent }) => {
    if (percent < 0.06) return null; // no spammear slices chicos
    const RADIAN = Math.PI / 180;
    const r = innerRadius + (outerRadius - innerRadius) * 0.55;
    const x = cx + r * Math.cos(-midAngle * RADIAN);
    const y = cy + r * Math.sin(-midAngle * RADIAN);
    return (
      <text x={x} y={y} fill="#fff" fontSize="12" fontWeight="600" textAnchor={x > cx ? 'start' : 'end'} dominantBaseline="central">
        {`${(percent * 100).toFixed(0)}%`}
      </text>
    );
  };

  return (
    <SectionCard title="Composición de costos">
      {!hayDatos ? (
        <div style={{ height: 260, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-tertiary)', fontSize: '13px' }}>
          Sin costos registrados en este período.
        </div>
      ) : (
        <div style={{ position: 'relative' }}>
          <ResponsiveContainer width="100%" height={260}>
            <PieChart>
              <Pie
                data={costosCategoria}
                dataKey="monto"
                nameKey="categoria"
                cx="50%"
                cy="50%"
                innerRadius={60}
                outerRadius={95}
                paddingAngle={2}
                label={renderLabel}
                labelLine={false}
              >
                {costosCategoria.map((c, i) => <Cell key={i} fill={c.color} />)}
              </Pie>
              <Tooltip
                contentStyle={{ background: 'var(--bg-secondary)', border: '1px solid var(--border-subtle)', borderRadius: '6px', fontSize: '12px' }}
                formatter={(value, name) => [fmtBs(value), name]}
              />
              <Legend
                verticalAlign="bottom"
                wrapperStyle={{ fontSize: '12px', paddingTop: '8px' }}
                formatter={(value) => {
                  const slice = costosCategoria.find(c => c.categoria === value);
                  return `${value} — ${fmtBs(slice.monto)}`;
                }}
              />
            </PieChart>
          </ResponsiveContainer>
          {/* Total absoluto en el centro del donut */}
          <div style={{
            position: 'absolute',
            top: '50%', left: '50%',
            transform: 'translate(-50%, calc(-50% - 28px))',
            textAlign: 'center',
            pointerEvents: 'none',
          }}>
            <div style={{ fontSize: '11px', color: 'var(--text-tertiary)', letterSpacing: '0.05em' }}>TOTAL</div>
            <div style={{ fontSize: '18px', fontWeight: 600, color: 'var(--text-primary)', fontFamily: 'IBM Plex Mono, monospace' }}>{fmtBsCompacto(total)}</div>
          </div>
        </div>
      )}
    </SectionCard>
  );
};

export default CostBreakdownDonut;
