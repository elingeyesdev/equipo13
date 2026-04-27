import React, { useState, useEffect, useRef } from 'react';
import { RubroBadge, MoneyDisplay, Btn, CostTable, PuntoEquilibrioCard, WIPBars } from '../components/ui.jsx';

const MPD_ROWS = [
  { nombre: 'Leche entera',       cantidad: '5.000',  unidad: 'L',   precio_unit: 4.80,   costo_unit: 24.00,  total_lote: 2400.00 },
  { nombre: 'Cuajo enzimático',   cantidad: '0.003',  unidad: 'kg',  precio_unit: 420.00, costo_unit: 1.26,   total_lote: 126.00  },
  { nombre: 'Sal refinada',       cantidad: '0.015',  unidad: 'kg',  precio_unit: 8.50,   costo_unit: 0.13,   total_lote: 12.75   },
  { nombre: 'Cloruro de calcio',  cantidad: '0.002',  unidad: 'kg',  precio_unit: 95.00,  costo_unit: 0.19,   total_lote: 19.00   },
  { nombre: 'Empaque film',       cantidad: '1.000',  unidad: 'u',   precio_unit: 0.80,   costo_unit: 0.80,   total_lote: 80.00   },
];

const MOD_ROWS = [
  { nombre: 'Pasteurización',    cantidad: '4 min',  unidad: null,  precio_unit: 18.50, costo_unit: 1.23,   total_lote: 123.33  },
  { nombre: 'Coagulación',       cantidad: '12 min', unidad: null,  precio_unit: 18.50, costo_unit: 3.70,   total_lote: 370.00  },
  { nombre: 'Desuerado y molde', cantidad: '20 min', unidad: null,  precio_unit: 18.50, costo_unit: 6.17,   total_lote: 616.67  },
  { nombre: 'Salazón',           cantidad: '8 min',  unidad: null,  precio_unit: 18.50, costo_unit: 2.47,   total_lote: 246.67  },
  { nombre: 'Empaque',           cantidad: '6 min',  unidad: null,  precio_unit: 18.50, costo_unit: 1.85,   total_lote: 185.00  },
];

const CIF_GASTOS = [
  { nombre: 'Alquiler planta',        monto: 3500, prorrateado: 4.67 },
  { nombre: 'Energía eléctrica',       monto: 1200, prorrateado: 1.60 },
  { nombre: 'Agua y vapor',            monto: 800,  prorrateado: 1.07 },
  { nombre: 'Mantenimiento equipos',   monto: 600,  prorrateado: 0.80 },
  { nombre: 'Seguros',                 monto: 400,  prorrateado: 0.53 },
  { nombre: 'Depreciación maquinaria', monto: 700,  prorrateado: 0.93 },
];

const WIP_STAGES = [
  { nombre: 'Inicio (materiales)',  costo_acumulado: 2638 },
  { nombre: 'Pasteurización',       costo_acumulado: 2761 },
  { nombre: 'Coagulación',          costo_acumulado: 3131 },
  { nombre: 'Desuerado y molde',    costo_acumulado: 3748 },
  { nombre: 'Salazón',              costo_acumulado: 3995 },
  { nombre: 'Empaque',              costo_acumulado: 4180 },
  { nombre: '+ CIF prorrateado',    costo_acumulado: 4760 },
];

const MPD_COLS = [
  { key: 'nombre',     label: 'Insumo',    mono: false },
  { key: 'cantidad',   label: 'Cant.',     mono: true,  decimals: 3 },
  { key: 'unidad',     label: 'Unidad',    mono: false },
  { key: 'precio_unit',label: 'Precio/u',  mono: true,  prefix: 'Bs ', sumable: false },
  { key: 'costo_unit', label: '/unidad',   mono: true,  prefix: 'Bs ', sumable: true  },
  { key: 'total_lote', label: '/lote',     mono: true,  prefix: 'Bs ', sumable: true  },
];
const MOD_COLS = [
  { key: 'nombre',     label: 'Etapa',     mono: false },
  { key: 'cantidad',   label: 'Tiempo',    mono: false },
  { key: 'precio_unit',label: 'Costo/h',   mono: true,  prefix: 'Bs ', sumable: false },
  { key: 'costo_unit', label: '/unidad',   mono: true,  prefix: 'Bs ', sumable: true  },
  { key: 'total_lote', label: '/lote',     mono: true,  prefix: 'Bs ', sumable: true  },
];

function recalc(mpdRows, modRows, cifMode, cifPct, lote, margen, costosFijos) {
  const scale = lote / 100;
  const mpd = mpdRows.map(r => ({ ...r, total_lote: r.total_lote * scale / 1, costo_unit: r.costo_unit }));
  const mod = modRows.map(r => ({ ...r, total_lote: r.total_lote * scale, costo_unit: r.costo_unit }));
  const totalMPD = mpd.reduce((s, r) => s + r.costo_unit, 0);
  const totalMOD = mod.reduce((s, r) => s + r.costo_unit, 0);
  const base = totalMPD + totalMOD;
  const cifUnit = cifMode === 'simple' ? base * (cifPct / 100) : CIF_GASTOS.reduce((s, g) => s + g.prorrateado, 0);
  const costoUnit = base + cifUnit;
  const precioSug = costoUnit * (1 + margen / 100);
  const utilUnit = precioSug - costoUnit;
  return { mpd, mod, totalMPD, totalMOD, cifUnit, costoUnit, precioSug, utilUnit, utilLote: utilUnit * lote };
}

const FichaCosto = ({ negocioId }) => {
  const negocio = { id: negocioId, nombre: 'Mi negocio', rubro: 'industrial' };
  const isAgro = negocio.rubro === 'agro_ganadero';
  const accentColor = isAgro ? 'var(--accent-agro)' : 'var(--accent-industrial)';

  const [lote, setLote] = useState(100);
  const [margen, setMargen] = useState(30);
  const [costosFijos, setCostosFijos] = useState(3000);
  const [cifMode, setCifMode] = useState('simple');
  const [cifPct, setCifPct] = useState(15);

  const debounceRef = useRef(null);
  const [calc, setCalc] = useState(() => recalc(MPD_ROWS, MOD_ROWS, 'simple', 15, 100, 30, 3000));

  const update = (l, m, cf, cm, cp) => {
    clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => setCalc(recalc(MPD_ROWS, MOD_ROWS, cm, cp, l, m, cf)), 200);
  };

  const NumControl = ({ label, value, onChange, min = 0, max = 10000, step = 1, prefix, suffix, showSlider = true }) => {
    const [local, setLocal] = useState(value);
    useEffect(() => setLocal(value), [value]);
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', flex: 1, minWidth: 0 }}>
        <label style={{ fontSize: '11px', color: 'var(--text-tertiary)', fontWeight: 500, letterSpacing: '0.07em', textTransform: 'uppercase' }}>{label}</label>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
            {prefix && <span style={{ position: 'absolute', left: '8px', fontSize: '12px', color: 'var(--text-tertiary)', fontFamily: 'var(--font-mono)', pointerEvents: 'none' }}>{prefix}</span>}
            <input
              type="number" value={local} min={min} max={max} step={step}
              onChange={e => { const v = parseFloat(e.target.value) || 0; setLocal(v); onChange(v); }}
              style={{
                width: prefix ? '90px' : '80px', background: 'var(--bg-tertiary)',
                border: '1px solid var(--border-subtle)', borderRadius: '6px',
                color: 'var(--text-primary)', padding: prefix ? '6px 8px 6px 28px' : `6px ${suffix ? '28px' : '8px'} 6px 8px`,
                fontSize: '13px', fontFamily: 'var(--font-mono)', outline: 'none',
              }}
              onFocus={e => e.target.style.borderColor = accentColor}
              onBlur={e => e.target.style.borderColor = 'var(--border-subtle)'}
            />
            {suffix && <span style={{ position: 'absolute', right: '8px', fontSize: '12px', color: 'var(--text-tertiary)', fontFamily: 'var(--font-mono)', pointerEvents: 'none' }}>{suffix}</span>}
          </div>
          {showSlider && (
            <input type="range" min={min} max={max} step={step} value={local}
              onChange={e => { const v = parseFloat(e.target.value); setLocal(v); onChange(v); }}
              style={{ flex: 1, accentColor }}
            />
          )}
        </div>
      </div>
    );
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <h1 style={{ fontSize: '22px', fontWeight: 400, color: 'var(--text-primary)', letterSpacing: '-0.02em', marginBottom: '5px' }}>Queso fresco 500g</h1>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '13px', color: 'var(--text-tertiary)' }}>
            <RubroBadge rubro={negocio.rubro} />
            <span>Industria láctea</span>
            <span>·</span>
            <span>Lote de {lote} unidades</span>
          </div>
        </div>
        <div style={{ display: 'flex', gap: '8px' }}>
          <Btn variant="secondary" icon="copy" size="sm">Duplicar ficha</Btn>
          <Btn icon="save" accentColor={accentColor}>Guardar ficha</Btn>
        </div>
      </div>

      <div style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border-subtle)', borderRadius: '8px', padding: '16px 20px', display: 'flex', gap: '24px', alignItems: 'flex-end' }}>
        <NumControl label="Tamaño del lote" value={lote} min={1} max={10000}
          onChange={v => { setLote(v); update(v, margen, costosFijos, cifMode, cifPct); }} suffix="uds" />
        <NumControl label="Margen de utilidad" value={margen} min={0} max={200}
          onChange={v => { setMargen(v); update(lote, v, costosFijos, cifMode, cifPct); }} suffix="%" />
        <NumControl label="Costos fijos mensuales" value={costosFijos} min={0} max={50000} step={100}
          onChange={v => { setCostosFijos(v); update(lote, margen, v, cifMode, cifPct); }} prefix="Bs" showSlider={false} />
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '12px' }}>
        {[
          { label: 'Costo unitario',    value: calc.costoUnit, sub: 'MPD + MOD + CIF',          color: 'default' },
          { label: 'Precio sugerido',   value: calc.precioSug, sub: `con ${margen}% de margen`,  color: 'green'   },
          { label: 'Utilidad / unidad', value: calc.utilUnit,  sub: `▲ ${margen}% del costo`,    color: 'green'   },
          { label: 'Utilidad del lote', value: calc.utilLote,  sub: `${lote} unidades`,           color: 'green'   },
        ].map((c, i) => (
          <div key={i} style={{ background: 'var(--bg-secondary)', border: `1px solid ${i > 0 ? 'var(--accent-success)22' : 'var(--border-subtle)'}`, borderRadius: '8px', padding: '18px 20px' }}>
            <div style={{ fontSize: '11px', color: 'var(--text-tertiary)', letterSpacing: '0.07em', textTransform: 'uppercase', fontWeight: 500, marginBottom: '10px' }}>{c.label}</div>
            <MoneyDisplay value={c.value} size="xl" color={c.color} />
            <div style={{ fontSize: '12px', color: 'var(--text-tertiary)', marginTop: '8px' }}>{c.sub}</div>
          </div>
        ))}
      </div>

      <CostTable
        title="MPD — Materia Prima Directa"
        rows={calc.mpd}
        columns={MPD_COLS}
        accentColor={accentColor}
        type="variable"
        loteSize={lote}
      />

      <CostTable
        title="MOD — Mano de Obra Directa"
        rows={calc.mod}
        columns={MOD_COLS}
        accentColor={accentColor}
        type="variable"
        loteSize={lote}
      />

      <div style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border-subtle)', borderRadius: '8px', overflow: 'hidden' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 16px', borderBottom: '1px solid var(--border-subtle)' }}>
          <span style={{ fontSize: '11px', fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase', color: accentColor }}>CIF — Costos Indirectos de Fabricación</span>
          <div style={{ display: 'flex', gap: '4px' }}>
            {['simple', 'avanzado'].map(m => (
              <button key={m} onClick={() => { setCifMode(m); update(lote, margen, costosFijos, m, cifPct); }} style={{
                padding: '4px 12px', borderRadius: '5px', border: 'none', cursor: 'pointer',
                background: cifMode === m ? accentColor + '22' : 'transparent',
                color: cifMode === m ? accentColor : 'var(--text-tertiary)',
                fontSize: '12px', fontFamily: 'var(--font-sans)', fontWeight: cifMode === m ? 500 : 400,
                transition: 'all 0.15s',
              }}>{m === 'simple' ? '% sobre MPD+MOD' : 'Prorrateo de gastos'}</button>
            ))}
          </div>
        </div>
        <div style={{ padding: '20px' }}>
          {cifMode === 'simple' ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
              <div style={{ display: 'flex', flex: 1, alignItems: 'center', gap: '16px' }}>
                <input type="range" min={0} max={100} value={cifPct}
                  onChange={e => { const v = parseInt(e.target.value); setCifPct(v); update(lote, margen, costosFijos, cifMode, v); }}
                  style={{ flex: 1, accentColor }}
                />
                <div style={{ position: 'relative' }}>
                  <input type="number" value={cifPct} min={0} max={100}
                    onChange={e => { const v = parseInt(e.target.value) || 0; setCifPct(v); update(lote, margen, costosFijos, cifMode, v); }}
                    style={{ width: '64px', background: 'var(--bg-tertiary)', border: '1px solid var(--border-subtle)', borderRadius: '6px', color: 'var(--text-primary)', padding: '6px 24px 6px 8px', fontSize: '14px', fontFamily: 'var(--font-mono)', outline: 'none' }}
                  />
                  <span style={{ position: 'absolute', right: '8px', top: '50%', transform: 'translateY(-50%)', fontSize: '13px', color: 'var(--text-tertiary)', pointerEvents: 'none' }}>%</span>
                </div>
              </div>
              <div style={{ background: 'var(--bg-tertiary)', borderRadius: '6px', padding: '10px 16px', textAlign: 'right', flexShrink: 0 }}>
                <div style={{ fontSize: '11px', color: 'var(--text-tertiary)', marginBottom: '4px' }}>CIF por unidad</div>
                <MoneyDisplay value={calc.cifUnit} size="md" />
              </div>
            </div>
          ) : (
            <div>
              {CIF_GASTOS.map((g, i) => (
                <div key={i} style={{ display: 'grid', gridTemplateColumns: '1fr 120px 120px', padding: '8px 0', borderBottom: i < CIF_GASTOS.length - 1 ? '1px solid var(--border-subtle)' : 'none', alignItems: 'center' }}>
                  <span style={{ fontSize: '13px', color: 'var(--text-primary)' }}>{g.nombre}</span>
                  <span style={{ textAlign: 'right', fontFamily: 'var(--font-mono)', fontSize: '13px', color: 'var(--text-secondary)' }}>Bs {g.monto.toLocaleString()}</span>
                  <span style={{ textAlign: 'right', fontFamily: 'var(--font-mono)', fontSize: '13px', color: accentColor }}>Bs {g.prorrateado.toFixed(2)}</span>
                </div>
              ))}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 120px 120px', padding: '10px 0 0', borderTop: `1px solid ${accentColor}33`, marginTop: '4px' }}>
                <span style={{ fontSize: '11px', color: 'var(--text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.06em', fontWeight: 600 }}>Total CIF</span>
                <span style={{ textAlign: 'right', fontFamily: 'var(--font-mono)', fontSize: '13px', color: 'var(--text-primary)', fontWeight: 500 }}>Bs {CIF_GASTOS.reduce((s, g) => s + g.monto, 0).toLocaleString()}</span>
                <span style={{ textAlign: 'right', fontFamily: 'var(--font-mono)', fontSize: '13px', color: accentColor, fontWeight: 500 }}>Bs {CIF_GASTOS.reduce((s, g) => s + g.prorrateado, 0).toFixed(2)}</span>
              </div>
            </div>
          )}
        </div>
      </div>

      <PuntoEquilibrioCard costosFijos={costosFijos} pvp={calc.precioSug} cvUnitario={calc.costoUnit} />

      <div style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border-subtle)', borderRadius: '8px', padding: '16px 20px' }}>
        <div style={{ fontSize: '11px', fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--text-tertiary)', marginBottom: '16px' }}>
          Costo acumulado por etapa (WIP)
        </div>
        <WIPBars stages={WIP_STAGES} accentColor={accentColor} />
      </div>
    </div>
  );
};

export default FichaCosto;
