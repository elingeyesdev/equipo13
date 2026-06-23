import React from 'react';

// Mini-gráfico de evolución de precio: línea + área tenue.
// Ordena por fecha ascendente y toma los últimos `maxPoints` puntos.
export default function Sparkline({ puntos, color = 'var(--accent-industrial)', width = 120, height = 36, maxPoints = 30 }) {
  const data = (puntos || [])
    .map(p => ({ t: new Date(p.fecha).getTime(), v: Number(p.valor) }))
    .filter(d => Number.isFinite(d.t) && Number.isFinite(d.v))
    .sort((a, b) => a.t - b.t)
    .slice(-maxPoints);

  // Sin suficientes datos: placeholder discreto.
  if (data.length < 2) {
    return (
      <div style={{
        width, height, background: 'var(--bg-tertiary)', borderRadius: '4px',
        opacity: 0.4, display: 'inline-block'
      }} />
    );
  }

  const pad = 2; // margen interno para que la línea no se corte en los bordes
  const vals = data.map(d => d.v);
  const minV = Math.min(...vals);
  const maxV = Math.max(...vals);
  const rangeV = (maxV - minV) || 1;
  const t0 = data[0].t;
  const t1 = data[data.length - 1].t;
  const rangeT = (t1 - t0) || 1;

  const x = t => pad + ((t - t0) / rangeT) * (width - 2 * pad);
  const y = v => pad + (1 - (v - minV) / rangeV) * (height - 2 * pad);

  const pts = data.map(d => `${x(d.t).toFixed(1)},${y(d.v).toFixed(1)}`);
  const linePath = 'M ' + pts.join(' L ');
  const baseY = (height - pad).toFixed(1);
  const areaPath = `${linePath} L ${x(t1).toFixed(1)},${baseY} L ${x(t0).toFixed(1)},${baseY} Z`;

  return (
    <svg
      width={width} height={height}
      viewBox={`0 0 ${width} ${height}`}
      preserveAspectRatio="none"
      style={{ display: 'block', overflow: 'visible' }}
    >
      <path d={areaPath} fill={color} fillOpacity={0.12} stroke="none" />
      <path
        d={linePath}
        fill="none"
        stroke={color}
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
