import React from 'react';

const MiniLineChart = ({ series, width = '100%', height = 220 }) => {
  // series: [ { label: 'Minorista', color: 'var(--accent-info)', puntos: [{ fecha, valor }] } ]
  
  if (!series || series.length === 0) {
    return (
      <div style={{ width, height, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--bg-tertiary)', borderRadius: '8px', color: 'var(--text-tertiary)', fontSize: '12px' }}>
        Sin datos
      </div>
    );
  }

  // Agrupar todos los puntos válidos
  const allPoints = series.flatMap(s => s.puntos).filter(p => p && p.valor !== undefined && p.valor !== null);
  
  if (allPoints.length === 0) {
    return (
      <div style={{ width, height, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--bg-tertiary)', borderRadius: '8px', color: 'var(--text-tertiary)', fontSize: '12px' }}>
        No hay datos para graficar
      </div>
    );
  }

  const minVal = Math.min(...allPoints.map(p => p.valor));
  const maxVal = Math.max(...allPoints.map(p => p.valor));
  
  // Agregar margen 5%
  const padding = (maxVal - minVal) * 0.05 || maxVal * 0.05 || 1;
  const chartMin = Math.max(0, minVal - padding);
  const chartMax = maxVal + padding;
  const rangeY = chartMax - chartMin;

  const vWidth = 700;
  const vHeight = 180;
  
  const mapY = val => vHeight - ((val - chartMin) / rangeY) * vHeight;

  // Encontrar rango de fechas
  const allDates = allPoints.map(p => new Date(p.fecha).getTime()).sort();
  const minDate = allDates[0];
  const maxDate = allDates[allDates.length - 1];
  const rangeX = maxDate - minDate || 1;

  const mapX = fechaStr => {
    const t = new Date(fechaStr).getTime();
    return ((t - minDate) / rangeX) * vWidth;
  };

  const formatPrice = v => v.toLocaleString('es-BO', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  const formatDate = t => new Date(t).toLocaleDateString('es-BO');

  return (
    <div style={{ width, height: 'auto', background: 'var(--bg-secondary)', borderRadius: '8px', padding: '20px 20px 10px 20px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
      <div style={{ position: 'relative', width: '100%', paddingTop: `${(vHeight / vWidth) * 100}%` }}>
        <svg viewBox={`0 0 ${vWidth} ${vHeight}`} style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', overflow: 'visible' }}>
          {/* Baseline min */}
          <line x1="0" y1={mapY(chartMin)} x2={vWidth} y2={mapY(chartMin)} stroke="var(--border-subtle)" strokeWidth="1" strokeDasharray="4 4" />
          <text x="0" y={mapY(chartMin) - 4} fill="var(--text-tertiary)" fontSize="10" fontFamily="var(--font-mono)">{formatPrice(chartMin)}</text>
          
          {/* Baseline max */}
          <line x1="0" y1={mapY(chartMax)} x2={vWidth} y2={mapY(chartMax)} stroke="var(--border-subtle)" strokeWidth="1" strokeDasharray="4 4" />
          <text x="0" y={mapY(chartMax) + 12} fill="var(--text-tertiary)" fontSize="10" fontFamily="var(--font-mono)">{formatPrice(chartMax)}</text>

          {/* Series */}
          {series.map((s, idx) => {
            if (!s.puntos || s.puntos.length === 0) return null;
            const pointsStr = s.puntos.map(p => `${mapX(p.fecha)},${mapY(p.valor)}`).join(' ');
            const lastPoint = s.puntos[s.puntos.length - 1];
            const lx = mapX(lastPoint.fecha);
            const ly = mapY(lastPoint.valor);
            
            return (
              <g key={idx}>
                <polyline 
                  points={pointsStr} 
                  fill="none" 
                  stroke={s.color} 
                  strokeWidth="2" 
                  strokeLinecap="round" 
                  strokeLinejoin="round" 
                />
                <circle cx={lx} cy={ly} r="3" fill={s.color} />
                {/* Last point value tag */}
                <text x={lx - 5} y={ly - 8} fill={s.color} fontSize="10" fontWeight="bold" fontFamily="var(--font-mono)" textAnchor="end">
                  {formatPrice(lastPoint.valor)}
                </text>
              </g>
            );
          })}
        </svg>
      </div>
      
      {/* X Axis Labels */}
      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '10px', color: 'var(--text-tertiary)' }}>
        <span>{formatDate(minDate)}</span>
        <span>{formatDate(maxDate)}</span>
      </div>

      {/* Legend */}
      <div style={{ display: 'flex', justifyContent: 'center', gap: '16px', marginTop: '4px' }}>
        {series.map((s, idx) => (
          <div key={idx} style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '11px', color: 'var(--text-secondary)' }}>
            <div style={{ width: '10px', height: '10px', borderRadius: '50%', background: s.color }}></div>
            {s.label}
          </div>
        ))}
      </div>
    </div>
  );
};

export default MiniLineChart;
