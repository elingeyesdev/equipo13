import React, { useMemo, useRef, useState } from 'react';

/**
 * Gráfico interactivo para el tab Evolución de Precios Mercado.
 * series: [{ label, color, puntos: [{ fecha, valor }] }]
 *
 * Features:
 *  - Grid horizontal con 5 ticks en Bs/kg
 *  - 5 etiquetas de fecha en el eje X
 *  - Tooltip al pasar el mouse: línea vertical + valores de todas las series en esa fecha
 *  - Cada serie con último punto destacado + etiqueta con valor
 *  - Leyenda con último precio + promedio + min/max por serie
 *  - Hover sobre leyenda → destaca esa serie (las otras se atenúan)
 */
const VBOX_W = 760;
const VBOX_H = 260;
const PAD = { top: 16, right: 60, bottom: 28, left: 50 };
const W = VBOX_W - PAD.left - PAD.right;
const H = VBOX_H - PAD.top - PAD.bottom;

const fmtBs = (v) =>
  v.toLocaleString('es-BO', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const fmtDateShort = (t) => {
  const d = new Date(t);
  return `${d.getDate()}/${d.getMonth() + 1}`;
};
const fmtDateLong = (t) =>
  new Date(t).toLocaleDateString('es-BO', { day: '2-digit', month: 'short', year: 'numeric' });

function niceTicks(min, max, count = 5) {
  const range = max - min;
  if (range === 0) return [min];
  const raw = range / (count - 1);
  const mag = Math.pow(10, Math.floor(Math.log10(raw)));
  const norm = raw / mag;
  const step = (norm >= 7.5 ? 10 : norm >= 3 ? 5 : norm >= 1.5 ? 2 : 1) * mag;
  const tickMin = Math.floor(min / step) * step;
  const tickMax = Math.ceil(max / step) * step;
  const ticks = [];
  for (let v = tickMin; v <= tickMax + 1e-9; v += step) ticks.push(v);
  return ticks;
}

export default function EvolucionPreciosChart({ series }) {
  const [hoverX, setHoverX] = useState(null);
  const [highlight, setHighlight] = useState(null);
  const svgRef = useRef(null);

  // Normalizar datos
  const seriesData = useMemo(() => {
    return (series || [])
      .map((s) => {
        const puntos = (s.puntos || [])
          .filter((p) => p && p.valor != null && !isNaN(p.valor))
          .map((p) => ({ t: new Date(p.fecha).getTime(), v: parseFloat(p.valor) }))
          .sort((a, b) => a.t - b.t);
        return { ...s, puntos };
      })
      .filter((s) => s.puntos.length > 0);
  }, [series]);

  const stats = useMemo(() => {
    if (!seriesData.length) return null;
    const allValues = seriesData.flatMap((s) => s.puntos.map((p) => p.v));
    const allDates = seriesData.flatMap((s) => s.puntos.map((p) => p.t));
    const tMin = Math.min(...allDates);
    const tMax = Math.max(...allDates);
    const vMin = Math.min(...allValues);
    const vMax = Math.max(...allValues);
    const pad = (vMax - vMin) * 0.08 || vMax * 0.05 || 1;
    const yMin = Math.max(0, vMin - pad);
    const yMax = vMax + pad;
    const ticks = niceTicks(yMin, yMax, 5);
    const realYMin = Math.min(yMin, ticks[0]);
    const realYMax = Math.max(yMax, ticks[ticks.length - 1]);
    return { tMin, tMax, yMin: realYMin, yMax: realYMax, ticks };
  }, [seriesData]);

  if (!seriesData.length || !stats) {
    return (
      <div style={{
        background: 'var(--bg-secondary)', borderRadius: 8, padding: 40,
        textAlign: 'center', color: 'var(--text-tertiary)', fontSize: 13,
      }}>
        No hay datos para graficar
      </div>
    );
  }

  const { tMin, tMax, yMin, yMax, ticks } = stats;
  const mapX = (t) => PAD.left + ((t - tMin) / (tMax - tMin || 1)) * W;
  const mapY = (v) => PAD.top + H - ((v - yMin) / (yMax - yMin || 1)) * H;

  // Resumen por serie
  const resumen = seriesData.map((s) => {
    const vals = s.puntos.map((p) => p.v);
    return {
      label: s.label,
      color: s.color,
      ultimo: vals[vals.length - 1],
      promedio: vals.reduce((a, b) => a + b, 0) / vals.length,
      min: Math.min(...vals),
      max: Math.max(...vals),
      n: vals.length,
    };
  });

  // Ticks del eje X (5 fechas espaciadas)
  const xTicks = [0, 0.25, 0.5, 0.75, 1].map((p) => tMin + p * (tMax - tMin));

  // Datos del tooltip: para cada serie, el punto cuya fecha está más cerca de hoverX
  const tooltipData = hoverX != null ? seriesData.map((s) => {
    const closest = s.puntos.reduce((best, p) => {
      const dist = Math.abs(mapX(p.t) - hoverX);
      return !best || dist < best.dist ? { ...p, dist } : best;
    }, null);
    return { label: s.label, color: s.color, ...closest };
  }) : null;

  const tooltipT = tooltipData?.[0]?.t;
  const tooltipScreenX = tooltipT != null ? mapX(tooltipT) : null;

  const handleMouseMove = (e) => {
    const svg = svgRef.current;
    if (!svg) return;
    const rect = svg.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * VBOX_W;
    if (x >= PAD.left && x <= PAD.left + W) {
      setHoverX(x);
    } else {
      setHoverX(null);
    }
  };

  return (
    <div style={{
      background: 'var(--bg-secondary)', border: '1px solid var(--border-subtle)',
      borderRadius: 8, padding: 18,
    }}>
      {/* Tarjetas resumen por serie */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))',
        gap: 10, marginBottom: 14,
      }}>
        {resumen.map((r) => {
          const activa = highlight === null || highlight === r.label;
          return (
            <div key={r.label}
              onMouseEnter={() => setHighlight(r.label)}
              onMouseLeave={() => setHighlight(null)}
              style={{
                padding: '10px 12px', borderRadius: 6,
                background: 'var(--bg-tertiary)',
                border: `1px solid ${activa ? r.color + '55' : 'transparent'}`,
                opacity: activa ? 1 : 0.5, transition: 'all 0.15s',
                cursor: 'default',
              }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
                <span style={{ width: 8, height: 8, borderRadius: '50%', background: r.color }} />
                <span style={{
                  fontSize: 11, fontWeight: 600, color: 'var(--text-primary)',
                  textTransform: 'uppercase', letterSpacing: 0.4,
                }}>
                  {r.label}
                </span>
              </div>
              <div style={{
                fontSize: 18, fontWeight: 700, color: 'var(--text-primary)',
                fontFamily: 'var(--font-mono)', fontVariantNumeric: 'tabular-nums',
                lineHeight: 1.1,
              }}>
                {fmtBs(r.ultimo)}{' '}
                <span style={{ fontSize: 10, color: 'var(--text-tertiary)', fontWeight: 400 }}>Bs/kg</span>
              </div>
              <div style={{
                fontSize: 10, color: 'var(--text-tertiary)', marginTop: 4,
                fontVariantNumeric: 'tabular-nums',
                display: 'flex', gap: 8, flexWrap: 'wrap',
              }}>
                <span>prom <strong>{fmtBs(r.promedio)}</strong></span>
                <span>·</span>
                <span>min <strong>{fmtBs(r.min)}</strong></span>
                <span>·</span>
                <span>max <strong>{fmtBs(r.max)}</strong></span>
                <span>·</span>
                <span>{r.n} pts</span>
              </div>
            </div>
          );
        })}
      </div>

      {/* SVG */}
      <div style={{ position: 'relative', width: '100%' }}>
        <svg
          ref={svgRef}
          viewBox={`0 0 ${VBOX_W} ${VBOX_H}`}
          preserveAspectRatio="none"
          style={{ width: '100%', height: 280, display: 'block' }}
          onMouseMove={handleMouseMove}
          onMouseLeave={() => setHoverX(null)}
        >
          {/* Grid horizontal */}
          {ticks.map((t, i) => (
            <g key={i}>
              <line
                x1={PAD.left} x2={PAD.left + W}
                y1={mapY(t)}   y2={mapY(t)}
                stroke="var(--border-subtle)" strokeWidth="0.5"
                strokeDasharray={i === 0 ? '' : '3 3'}
              />
              <text x={PAD.left - 8} y={mapY(t) + 3}
                fill="var(--text-tertiary)" fontSize="10"
                fontFamily="var(--font-mono)" textAnchor="end">
                {fmtBs(t)}
              </text>
            </g>
          ))}

          {/* Líneas verticales eje X */}
          {xTicks.map((t, i) => (
            <text key={i} x={mapX(t)} y={VBOX_H - 8}
              fill="var(--text-tertiary)" fontSize="10"
              fontFamily="var(--font-mono)" textAnchor="middle">
              {fmtDateShort(t)}
            </text>
          ))}

          {/* Series */}
          {seriesData.map((s) => {
            const atenuada = highlight !== null && highlight !== s.label;
            const opacity = atenuada ? 0.2 : 1;
            const pointsStr = s.puntos.map((p) => `${mapX(p.t)},${mapY(p.v)}`).join(' ');
            const last = s.puntos[s.puntos.length - 1];
            return (
              <g key={s.label} opacity={opacity} style={{ transition: 'opacity 0.15s' }}>
                <polyline
                  points={pointsStr} fill="none"
                  stroke={s.color} strokeWidth="2"
                  strokeLinecap="round" strokeLinejoin="round"
                />
                {/* Último punto */}
                <circle cx={mapX(last.t)} cy={mapY(last.v)} r="3.5"
                        fill="var(--bg-secondary)" stroke={s.color} strokeWidth="2" />
                {/* Etiqueta valor */}
                <text x={mapX(last.t) + 6} y={mapY(last.v) + 3}
                  fill={s.color} fontSize="10" fontWeight="700"
                  fontFamily="var(--font-mono)">
                  {fmtBs(last.v)}
                </text>
              </g>
            );
          })}

          {/* Tooltip: línea vertical + puntos */}
          {hoverX != null && tooltipScreenX != null && (
            <g pointerEvents="none">
              <line
                x1={tooltipScreenX} x2={tooltipScreenX}
                y1={PAD.top}        y2={PAD.top + H}
                stroke="var(--text-tertiary)" strokeWidth="1" strokeDasharray="3 3"
                opacity="0.6"
              />
              {tooltipData?.map((d, i) => d.t != null && (
                <circle key={i} cx={mapX(d.t)} cy={mapY(d.v)} r="4"
                  fill={d.color} stroke="var(--bg-secondary)" strokeWidth="2" />
              ))}
            </g>
          )}
        </svg>

        {/* Tooltip flotante con valores */}
        {hoverX != null && tooltipData && tooltipScreenX != null && (
          <div style={{
            position: 'absolute',
            left: `${(tooltipScreenX / VBOX_W) * 100}%`,
            top: 8, transform: 'translateX(-50%)',
            background: 'var(--bg-primary)',
            border: '1px solid var(--border-mid)',
            borderRadius: 6, padding: '8px 10px',
            boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
            fontSize: 11, color: 'var(--text-primary)',
            pointerEvents: 'none', whiteSpace: 'nowrap', zIndex: 10,
          }}>
            <div style={{ fontSize: 10, color: 'var(--text-tertiary)', marginBottom: 4 }}>
              {fmtDateLong(tooltipT)}
            </div>
            {tooltipData.map((d, i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 2 }}>
                <span style={{ width: 8, height: 8, borderRadius: '50%', background: d.color }} />
                <span style={{ fontSize: 11 }}>{d.label}</span>
                <span style={{
                  marginLeft: 'auto',
                  fontFamily: 'var(--font-mono)', fontWeight: 600,
                  fontVariantNumeric: 'tabular-nums',
                  color: d.color,
                }}>
                  {fmtBs(d.v)}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
