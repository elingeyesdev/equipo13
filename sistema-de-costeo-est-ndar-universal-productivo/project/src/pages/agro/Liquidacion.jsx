// CosteoUniversal — Liquidación de lote (Agro-ganadero)
const { useState } = React;

const Liquidacion = ({ negocioId, activeLote }) => {
  const accentColor = 'var(--accent-agro)';
  const lote = activeLote || LOTES_DATA?.[0];
  const costoTotalLote = lote ? Object.values(lote.costos).reduce((s, v) => s + v, 0) : 11460;

  const [cabezasVenta, setCabezasVenta] = useState(lote?.cabezasActivas || 48);
  const [pesoPromFinal, setPesoPromFinal] = useState(95);
  const [rendimientoCanal, setRendimientoCanal] = useState(75);
  const [transporte, setTransporte] = useState(350);
  const [comision, setComision] = useState(0);
  const [faena, setFaena] = useState(480);
  const [otrosGastos, setOtrosGastos] = useState(0);
  const [pvpPie, setPvpPie] = useState(22.00);
  const [pvpGancho, setPvpGancho] = useState(32.00);
  const [showConfirm, setShowConfirm] = useState(false);

  const pesoTotalPie = cabezasVenta * pesoPromFinal;
  const pesoGancho = pesoTotalPie * (rendimientoCanal / 100);
  const gastosVenta = transporte + comision;
  const gastosGanchoTotal = transporte + comision + faena + otrosGastos;

  const ingresoPie = pesoTotalPie * pvpPie;
  const ingresoGancho = pesoGancho * pvpGancho;

  const utilPie = ingresoPie - costoTotalLote - gastosVenta;
  const utilGancho = ingresoGancho - costoTotalLote - gastosGanchoTotal;

  const ganchoEsMejor = utilGancho > utilPie;

  const costoKgVivo = costoTotalLote / pesoTotalPie;
  const costoKgGancho = costoTotalLote / pesoGancho;

  // Conversión alimenticia (estimada con datos mock)
  const alimentoConsumido = lote?.costos?.alimento ? lote.costos.alimento / 80 * 40 : 2970; // kg aprox
  const gananciaTotal = (pesoPromFinal - (lote?.pesoInicialProm || 8.5)) * cabezasVenta;
  const ica = gananciaTotal > 0 ? (alimentoConsumido / gananciaTotal).toFixed(2) : '—';
  const refICA = lote?.tipo === 'Cerdo' ? '2.5–3.0' : '6.0–8.0';

  const iNum = (label, value, onChange, prefix = 'Bs', hint = '') => (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
      <label style={{ fontSize: '10px', color: 'var(--text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>{label}</label>
      <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
        {prefix && <span style={{ position: 'absolute', left: '8px', fontSize: '12px', color: 'var(--text-tertiary)', fontFamily: 'IBM Plex Mono, monospace', pointerEvents: 'none' }}>{prefix}</span>}
        <input value={value} onChange={e => onChange(parseFloat(e.target.value) || 0)} type="number"
          style={{ width: '100%', background: 'var(--bg-tertiary)', border: '1px solid var(--border-subtle)', borderRadius: '6px', color: 'var(--text-primary)', padding: `7px 8px 7px ${prefix ? '28px' : '10px'}`, fontSize: '13px', outline: 'none', fontFamily: 'IBM Plex Mono, monospace' }}
          onFocus={e => e.target.style.borderColor = accentColor} onBlur={e => e.target.style.borderColor = 'var(--border-subtle)'}
        />
      </div>
      {hint && <span style={{ fontSize: '11px', color: 'var(--text-tertiary)', lineHeight: 1.4 }}>{hint}</span>}
    </div>
  );

  const ResultCol = ({ titulo, recomendado, ingreso, gastosVenta, utilidad, utilCabeza, utilKg, margen, pvpLabel, pvp, setPvp }) => (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '0', background: recomendado ? accentColor + '08' : 'transparent', borderRadius: '8px', border: `1px solid ${recomendado ? accentColor + '44' : 'var(--border-subtle)'}`, overflow: 'hidden' }}>
      <div style={{ padding: '14px 16px', background: recomendado ? accentColor + '18' : 'var(--bg-tertiary)', borderBottom: '1px solid var(--border-subtle)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <span style={{ fontSize: '13px', fontWeight: 600, color: recomendado ? accentColor : 'var(--text-primary)' }}>{titulo}</span>
        {recomendado && <span style={{ padding: '2px 8px', borderRadius: '4px', fontSize: '11px', fontWeight: 600, color: accentColor, background: accentColor + '22', border: `1px solid ${accentColor}44` }}>Recomendado ✓✓</span>}
      </div>
      <div style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', flex: 1 }}>
            <label style={{ fontSize: '10px', color: 'var(--text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
              {pvpLabel}
              <span style={{ marginLeft: '6px', cursor: 'help', color: 'var(--text-tertiary)' }} title="Precio de referencia del mercado local. Actualizalo antes de calcular.">
                ⓘ
              </span>
            </label>
            <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
              <span style={{ position: 'absolute', left: '8px', fontSize: '12px', color: 'var(--text-tertiary)', fontFamily: 'IBM Plex Mono, monospace', pointerEvents: 'none' }}>Bs</span>
              <input value={pvp} onChange={e => setPvp(parseFloat(e.target.value) || 0)} type="number" step="0.5"
                style={{ width: '100%', background: 'var(--bg-tertiary)', border: '1px solid var(--border-subtle)', borderRadius: '6px', color: 'var(--text-primary)', padding: '8px 8px 8px 28px', fontSize: '14px', outline: 'none', fontFamily: 'IBM Plex Mono, monospace' }}
                onFocus={e => e.target.style.borderColor = accentColor} onBlur={e => e.target.style.borderColor = 'var(--border-subtle)'}
              />
              <span style={{ marginLeft: '6px', fontSize: '12px', color: 'var(--text-tertiary)', whiteSpace: 'nowrap' }}>/kg</span>
            </div>
          </div>
        </div>

        {[
          { label: 'Ingreso bruto',   value: ingreso,        color: 'default' },
          { label: 'Costo total lote',value: costoTotalLote, color: 'default' },
          { label: 'Gastos de venta', value: gastosVenta,    color: 'default' },
        ].map((row, i) => (
          <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingBottom: i === 2 ? '12px' : '0', borderBottom: i === 2 ? `1px solid ${recomendado ? accentColor + '33' : 'var(--border-subtle)'}` : 'none' }}>
            <span style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>{row.label}</span>
            <MoneyDisplay value={row.value} size="sm" color={row.color} />
          </div>
        ))}

        <div style={{ background: recomendado ? accentColor + '18' : 'var(--bg-tertiary)', borderRadius: '6px', padding: '12px 14px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
            <span style={{ fontSize: '11px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.07em', color: 'var(--text-tertiary)' }}>Utilidad neta</span>
            <MoneyDisplay value={utilidad} size="xl" color="green" />
          </div>
          <div style={{ height: '1px', background: 'var(--border-subtle)' }} />
          {[
            { label: 'Utilidad / cabeza', val: utilCabeza },
            { label: 'Utilidad / kg',     val: utilKg },
            { label: 'Margen s/ costo',   val: null, pct: margen },
          ].map((r, i) => (
            <div key={i} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px' }}>
              <span style={{ color: 'var(--text-secondary)' }}>{r.label}</span>
              {r.pct !== null && r.pct !== undefined
                ? <span style={{ fontFamily: 'IBM Plex Mono, monospace', color: 'var(--accent-success)', fontWeight: 500 }}>{r.pct.toFixed(0)}%</span>
                : <MoneyDisplay value={r.val} size="xs" color="green" />
              }
            </div>
          ))}
        </div>
      </div>
    </div>
  );

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      {/* Header */}
      <div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '4px' }}>
          <h1 style={{ fontSize: '20px', fontWeight: 400, color: 'var(--text-primary)', letterSpacing: '-0.02em' }}>
            Calculadora de liquidación — Lote #{lote?.id || 'L-2025-003'}
          </h1>
        </div>
        <div style={{ fontSize: '13px', color: 'var(--text-tertiary)' }}>
          {lote?.tipo || 'Cerdo'} · {lote?.cabezasActivas || 48} animales · {lote?.dias || 45} días de engorde
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '320px 1fr', gap: '16px', alignItems: 'flex-start' }}>
        {/* Left — inputs */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border-subtle)', borderRadius: '8px', overflow: 'hidden' }}>
            <div style={{ padding: '12px 16px', borderBottom: '1px solid var(--border-subtle)' }}>
              <span style={{ fontSize: '11px', fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase', color: accentColor }}>Datos finales del lote</span>
            </div>
            <div style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {iNum('Animales vivos para venta', cabezasVenta, setCabezasVenta, '', 'cabezas')}
              {iNum('Peso promedio final (kg/cab)', pesoPromFinal, setPesoPromFinal, '', '')}
              <div style={{ background: 'var(--bg-tertiary)', borderRadius: '6px', padding: '10px 12px', display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>Peso total en pie</span>
                <span style={{ fontFamily: 'IBM Plex Mono, monospace', fontSize: '13px', color: 'var(--text-primary)', fontWeight: 500 }}>
                  {pesoTotalPie.toLocaleString('es-BO')} kg
                </span>
              </div>
            </div>
          </div>

          <div style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border-subtle)', borderRadius: '8px', overflow: 'hidden' }}>
            <div style={{ padding: '12px 16px', borderBottom: '1px solid var(--border-subtle)' }}>
              <span style={{ fontSize: '11px', fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase', color: accentColor }}>Gastos de venta</span>
            </div>
            <div style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {iNum('Transporte al matadero', transporte, setTransporte)}
              {iNum('Comisión intermediario', comision, setComision)}
              {iNum('Gastos de faena (gancho)', faena, setFaena, 'Bs', 'Solo si vende en gancho')}
              {iNum('Otros', otrosGastos, setOtrosGastos)}
            </div>
          </div>

          <div style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border-subtle)', borderRadius: '8px', overflow: 'hidden' }}>
            <div style={{ padding: '12px 16px', borderBottom: '1px solid var(--border-subtle)' }}>
              <span style={{ fontSize: '11px', fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase', color: accentColor }}>Rendimiento canal</span>
            </div>
            <div style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {iNum('Rendimiento canal (%)', rendimientoCanal, setRendimientoCanal, '', 'Estándar cerdo: 72–78%')}
              <div style={{ background: 'var(--bg-tertiary)', borderRadius: '6px', padding: '10px 12px', display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>Peso gancho estimado</span>
                <span style={{ fontFamily: 'IBM Plex Mono, monospace', fontSize: '13px', color: accentColor, fontWeight: 500 }}>
                  {pesoGancho.toFixed(0)} kg
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Right — results */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          <div style={{ display: 'flex', gap: '14px' }}>
            <ResultCol
              titulo="Venta en pie (vivo)"
              recomendado={!ganchoEsMejor}
              pvpLabel="Precio mercado (Bs/kg)"
              pvp={pvpPie} setPvp={setPvpPie}
              ingreso={ingresoPie}
              gastosVenta={gastosVenta}
              utilidad={utilPie}
              utilCabeza={utilPie / cabezasVenta}
              utilKg={utilPie / pesoTotalPie}
              margen={(utilPie / costoTotalLote) * 100}
            />
            <ResultCol
              titulo="Venta gancho (faenado)"
              recomendado={ganchoEsMejor}
              pvpLabel="Precio mercado (Bs/kg)"
              pvp={pvpGancho} setPvp={setPvpGancho}
              ingreso={ingresoGancho}
              gastosVenta={gastosGanchoTotal}
              utilidad={utilGancho}
              utilCabeza={utilGancho / cabezasVenta}
              utilKg={utilGancho / pesoGancho}
              margen={(utilGancho / costoTotalLote) * 100}
            />
          </div>

          {/* Costos por kg */}
          <div style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border-subtle)', borderRadius: '8px', padding: '14px 16px', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
            {[
              { label: 'Costo total / kg vivo',   val: costoKgVivo },
              { label: 'Costo total / kg gancho',  val: costoKgGancho },
            ].map((c, i) => (
              <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>{c.label}</span>
                <MoneyDisplay value={c.val} size="md" />
              </div>
            ))}
          </div>

          {/* ICA */}
          <div style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border-subtle)', borderRadius: '8px', padding: '16px' }}>
            <div style={{ fontSize: '11px', fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase', color: accentColor, marginBottom: '12px' }}>Conversión alimenticia del lote</div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '12px', marginBottom: '12px' }}>
              {[
                { label: 'Alimento consumido', val: `${alimentoConsumido.toFixed(0)} kg` },
                { label: 'Ganancia de peso total', val: `${gananciaTotal.toFixed(0)} kg` },
                { label: 'Índice conversión (ICA)', val: `${ica} kg/kg`, highlight: true },
              ].map((s, i) => (
                <div key={i} style={{ background: 'var(--bg-tertiary)', borderRadius: '6px', padding: '10px 12px' }}>
                  <div style={{ fontSize: '10px', color: 'var(--text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '4px' }}>{s.label}</div>
                  <div style={{ fontFamily: 'IBM Plex Mono, monospace', fontSize: '15px', fontWeight: 500, color: s.highlight ? accentColor : 'var(--text-primary)' }}>{s.val}</div>
                </div>
              ))}
            </div>
            <div style={{ fontSize: '12px', color: 'var(--text-tertiary)' }}>
              Referencia ({lote?.tipo || 'Cerdo'} eficiente): <span style={{ fontFamily: 'IBM Plex Mono, monospace', color: 'var(--text-secondary)' }}>{refICA} kg alimento / 1 kg ganado</span>
            </div>
          </div>

          {/* CTA */}
          <button onClick={() => setShowConfirm(true)} style={{ padding: '14px', borderRadius: '8px', border: `2px solid ${accentColor}`, background: accentColor, color: '#fff', cursor: 'pointer', fontSize: '14px', fontWeight: 500, fontFamily: 'IBM Plex Sans, sans-serif', transition: 'all 0.15s', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
            <Icon name="checkSquare" size={16} /> Registrar liquidación y cerrar lote
          </button>
        </div>
      </div>

      {/* Confirm modal */}
      {showConfirm && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', zIndex: 300, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border-mid)', borderRadius: '10px', padding: '28px 32px', width: '380px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <Icon name="scale" size={20} style={{ color: accentColor }} />
              <span style={{ fontSize: '16px', fontWeight: 500, color: 'var(--text-primary)' }}>¿Cerrar este lote?</span>
            </div>
            <p style={{ fontSize: '13px', color: 'var(--text-secondary)', lineHeight: 1.6 }}>
              El lote <strong style={{ color: 'var(--text-primary)' }}>#{lote?.id}</strong> se moverá al historial de liquidaciones. Esta acción no se puede deshacer.
            </p>
            <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
              <Btn variant="secondary" onClick={() => setShowConfirm(false)}>Cancelar</Btn>
              <Btn accentColor={accentColor} icon="checkSquare" onClick={() => setShowConfirm(false)}>Confirmar y cerrar</Btn>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

Object.assign(window, { Liquidacion });
