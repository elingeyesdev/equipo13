import React, { useState, useEffect } from 'react';
import { Icon } from '../../icons.jsx';
import { apiFetch } from '../../config/api.js';
import { MoneyDisplay, Btn, StatusBadge, RubroBadge } from '../../components/ui.jsx';

const Liquidacion = ({ negocioId, activeLote }) => {
  const accentColor = 'var(--accent-agro)';

  const [lotes, setLotes] = useState([]);
  const [selectedLoteId, setSelectedLoteId] = useState(activeLote?._id || activeLote?.id || null);

  useEffect(() => {
    if (negocioId) {
      apiFetch(`/api/negocios/${negocioId}/lotes`).then(data => {
        const mapped = data.map(l => ({
          ...l,
          id: l.identificador || l.id,
          tipo: l.tipo_animal,
          dias: l.fecha_entrada ? Math.floor((Date.now() - new Date(l.fecha_entrada)) / 86400000) : 0,
          cabezasActivas: l.cabezas_activas || 0,
          cabezas_inicio: l.cabezas_inicio || 0,
          costo_total: parseFloat(l.costo_total) || 0,
          pesoInicialProm: parseFloat(l.peso_inicial_prom) || 0
        }));
        setLotes(mapped);
        if (!selectedLoteId && mapped.length > 0) {
          setSelectedLoteId(mapped[0].id);
        }
      }).catch(console.error);
    }
  }, [negocioId]);

  useEffect(() => {
    if (activeLote) {
      setSelectedLoteId(activeLote._id || activeLote.id);
    }
  }, [activeLote]);

  const loteData = lotes.find(l => l.id === selectedLoteId) || activeLote || null;
  const costoTotalLote = loteData?.costo_total || (loteData?.costos ? Object.values(loteData.costos).reduce((s, v) => s + v, 0) : 0);

  const [cabezasVentaRaw, setCabezasVentaRaw] = useState('0');
  const [pesoPromFinalRaw, setPesoPromFinalRaw] = useState('95');
  const [rendimientoCanalRaw, setRendimientoCanalRaw] = useState('75');
  const [transporteRaw, setTransporteRaw] = useState('350');
  const [comisionRaw, setComisionRaw] = useState('0');
  const [faenaRaw, setFaenaRaw] = useState('480');
  const [otrosGastosRaw, setOtrosGastosRaw] = useState('0');
  const [pvpPieRaw, setPvpPieRaw] = useState('22');
  const [pvpGanchoRaw, setPvpGanchoRaw] = useState('32');
  const [showConfirm, setShowConfirm] = useState(false);

  const cabezasVenta = parseFloat(cabezasVentaRaw) || 0;
  const pesoPromFinal = parseFloat(pesoPromFinalRaw) || 0;
  const rendimientoCanal = parseFloat(rendimientoCanalRaw) || 0;
  const transporte = parseFloat(transporteRaw) || 0;
  const comision = parseFloat(comisionRaw) || 0;
  const faena = parseFloat(faenaRaw) || 0;
  const otrosGastos = parseFloat(otrosGastosRaw) || 0;
  const pvpPie = parseFloat(pvpPieRaw) || 0;
  const pvpGancho = parseFloat(pvpGanchoRaw) || 0;

  useEffect(() => {
    if (loteData) {
      setCabezasVentaRaw(String(loteData.cabezasActivas || 0));
    }
  }, [loteData]);

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

  const alimentoConsumido = 2970; // Placeholder until feed is computed from bitacora
  const gananciaTotal = (pesoPromFinal - (loteData?.pesoInicialProm || 8.5)) * cabezasVenta;
  const ica = gananciaTotal > 0 ? (alimentoConsumido / gananciaTotal).toFixed(2) : '—';
  const refICA = loteData?.tipo === 'Cerdo' ? '2.5–3.0' : '6.0–8.0';

  const iNum = (label, rawValue, onRawChange, prefix = 'Bs', hint = '') => (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
      <label style={{ fontSize: '10px', color: 'var(--text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>{label}</label>
      <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
        {prefix && <span style={{ position: 'absolute', left: '8px', fontSize: '12px', color: 'var(--text-tertiary)', fontFamily: 'IBM Plex Mono, monospace', pointerEvents: 'none' }}>{prefix}</span>}
        <input value={rawValue} onChange={e => onRawChange(e.target.value)} type="number" step="any"
          style={{ width: '100%', boxSizing: 'border-box', background: 'var(--bg-tertiary)', border: '1px solid var(--border-subtle)', borderRadius: '6px', color: 'var(--text-primary)', padding: `7px 8px 7px ${prefix ? '28px' : '10px'}`, fontSize: '13px', outline: 'none', fontFamily: 'IBM Plex Mono, monospace' }}
          onFocus={e => e.target.style.borderColor = accentColor} onBlur={e => e.target.style.borderColor = 'var(--border-subtle)'}
        />
      </div>
      {hint && <span style={{ fontSize: '11px', color: 'var(--text-tertiary)', lineHeight: 1.4 }}>{hint}</span>}
    </div>
  );

  const ResultCol = ({ titulo, recomendado, pesoTotal, pesoLabel, costoKg, ingreso, gastosVenta, utilidad, utilCabeza, utilKg, margen, accentColor }) => (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '0', background: recomendado ? accentColor + '08' : 'transparent', borderRadius: '8px', border: `1px solid ${recomendado ? accentColor + '44' : 'var(--border-subtle)'}`, overflow: 'hidden', minWidth: 0 }}>
      <div style={{ padding: '14px 16px', background: recomendado ? accentColor + '18' : 'var(--bg-tertiary)', borderBottom: '1px solid var(--border-subtle)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '8px' }}>
        <span style={{ fontSize: '13px', fontWeight: 600, color: recomendado ? accentColor : 'var(--text-primary)' }}>{titulo}</span>
        {recomendado && <span style={{ padding: '2px 8px', borderRadius: '4px', fontSize: '11px', fontWeight: 600, color: accentColor, background: accentColor + '22', border: `1px solid ${accentColor}44` }}>Recomendado</span>}
      </div>
      <div style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
        {[
          { label: pesoLabel, mono: `${pesoTotal.toLocaleString('es-BO')} kg` },
          { label: 'Costo / kg', value: costoKg },
          { label: 'Ingreso bruto', value: ingreso },
          { label: 'Costo total lote', value: costoTotalLote },
          { label: 'Gastos de venta', value: gastosVenta },
        ].map((row, i) => (
          <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingBottom: i === 4 ? '12px' : '0', borderBottom: i === 4 ? `1px solid ${recomendado ? accentColor + '33' : 'var(--border-subtle)'}` : 'none' }}>
            <span style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>{row.label}</span>
            {row.mono
              ? <span style={{ fontFamily: 'IBM Plex Mono, monospace', fontSize: '13px', color: 'var(--text-primary)' }}>{row.mono}</span>
              : <MoneyDisplay value={row.value} size="sm" />}
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

  const cabezasInicio = loteData?.cabezas_inicio ?? '—';
  const diasActivo = loteData?.dias ?? '—';

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      <style>{`
        @media (max-width: 640px) {
          .liquidacion-grid { grid-template-columns: 1fr !important; }
          .liquidacion-cards { flex-direction: column !important; }
          .liquidacion-ica-grid { grid-template-columns: 1fr !important; }
        }
      `}</style>

      <h1 style={{ fontSize: '20px', fontWeight: 400, color: 'var(--text-primary)', letterSpacing: '-0.02em', margin: 0 }}>
        Liquidación de lote
      </h1>

      <div style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border-subtle)', borderRadius: '8px', padding: '14px 20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '3px', flexWrap: 'wrap' }}>
            <span style={{ fontSize: '15px', fontWeight: 500, color: 'var(--text-primary)' }}>Lote</span>
            <select
              value={selectedLoteId || ''}
              onChange={e => setSelectedLoteId(parseInt(e.target.value) || e.target.value)}
              style={{ background: 'var(--bg-primary)', border: '1px solid var(--border-subtle)', borderRadius: '6px', color: 'var(--text-primary)', padding: '4px 8px', fontSize: '14px', outline: 'none', fontFamily: 'IBM Plex Mono, monospace' }}
            >
              {lotes.map(l => (
                <option key={l.id} value={l.id}>#{l.identificador || l.id} · {l.tipo}</option>
              ))}
            </select>
            <StatusBadge label={`${loteData?.cabezasActivas ?? 0} animales activos`} color={accentColor} />
          </div>
          <div style={{ fontSize: '13px', color: 'var(--text-tertiary)', marginTop: '6px' }}>
            {cabezasInicio} cabezas iniciales · {diasActivo} días activo · Costo acumulado:{' '}
            <span style={{ fontFamily: 'IBM Plex Mono, monospace', color: 'var(--text-primary)' }}>
              Bs {costoTotalLote.toLocaleString('es-BO')}
            </span>
          </div>
        </div>
        <RubroBadge rubro="agro_ganadero" />
      </div>

      <div className="liquidacion-grid" style={{ display: 'grid', gridTemplateColumns: '320px 1fr', gap: '16px', alignItems: 'flex-start' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border-subtle)', borderRadius: '8px', overflow: 'hidden' }}>
            <div style={{ padding: '12px 16px', borderBottom: '1px solid var(--border-subtle)' }}>
              <span style={{ fontSize: '11px', fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase', color: accentColor }}>Datos finales del lote</span>
            </div>
            <div style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {iNum('Animales vivos para venta', cabezasVentaRaw, setCabezasVentaRaw, '', 'cabezas')}
              {iNum('Peso promedio final (kg/cab)', pesoPromFinalRaw, setPesoPromFinalRaw, '', '')}
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
              {iNum('Transporte al matadero', transporteRaw, setTransporteRaw)}
              {iNum('Comisión intermediario', comisionRaw, setComisionRaw)}
              {iNum('Gastos de faena (gancho)', faenaRaw, setFaenaRaw, 'Bs', 'Solo si vende en gancho')}
              {iNum('Otros', otrosGastosRaw, setOtrosGastosRaw)}
            </div>
          </div>

          <div style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border-subtle)', borderRadius: '8px', overflow: 'hidden' }}>
            <div style={{ padding: '12px 16px', borderBottom: '1px solid var(--border-subtle)' }}>
              <span style={{ fontSize: '11px', fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase', color: accentColor }}>Rendimiento canal</span>
            </div>
            <div style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {iNum('Rendimiento canal (%)', rendimientoCanalRaw, setRendimientoCanalRaw, '', 'Estándar cerdo: 72–78%')}
              <div style={{ background: 'var(--bg-tertiary)', borderRadius: '6px', padding: '10px 12px', display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>Peso gancho estimado</span>
                <span style={{ fontFamily: 'IBM Plex Mono, monospace', fontSize: '13px', color: accentColor, fontWeight: 500 }}>
                  {pesoGancho.toFixed(0)} kg
                </span>
              </div>
              {iNum('PVP $/kg pie', pvpPieRaw, setPvpPieRaw, 'Bs', 'Precio mercado vivo')}
              {iNum('PVP $/kg gancho', pvpGanchoRaw, setPvpGanchoRaw, 'Bs', 'Precio mercado canal')}
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', minWidth: 0 }}>
          <div className="liquidacion-cards" style={{ display: 'flex', gap: '14px' }}>
            <ResultCol
              titulo="Venta en pie (vivo)"
              recomendado={!ganchoEsMejor && utilPie >= 0}
              pesoTotal={pesoTotalPie}
              pesoLabel="Peso total en pie"
              costoKg={costoKgVivo}
              ingreso={ingresoPie}
              gastosVenta={gastosVenta}
              utilidad={utilPie}
              utilCabeza={utilPie / (cabezasVenta || 1)}
              utilKg={utilPie / (pesoTotalPie || 1)}
              margen={(utilPie / (costoTotalLote || 1)) * 100}
              accentColor={accentColor}
            />
            <ResultCol
              titulo="Venta gancho (faenado)"
              recomendado={ganchoEsMejor && utilGancho >= 0}
              pesoTotal={pesoGancho}
              pesoLabel="Peso gancho"
              costoKg={costoKgGancho}
              ingreso={ingresoGancho}
              gastosVenta={gastosGanchoTotal}
              utilidad={utilGancho}
              utilCabeza={utilGancho / (cabezasVenta || 1)}
              utilKg={utilGancho / (pesoGancho || 1)}
              margen={(utilGancho / (costoTotalLote || 1)) * 100}
              accentColor={accentColor}
            />
          </div>

          <div style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border-subtle)', borderRadius: '8px', padding: '16px' }}>
            <div style={{ fontSize: '11px', fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase', color: accentColor, marginBottom: '12px' }}>Conversión alimenticia del lote</div>
            <div className="liquidacion-ica-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '12px', marginBottom: '12px' }}>
              {[
                { label: 'Alimento consumido',    val: `${alimentoConsumido.toFixed(0)} kg` },
                { label: 'Ganancia de peso total', val: `${gananciaTotal.toFixed(0)} kg` },
                { label: 'Índice conversión (ICA)',val: `${ica} kg/kg`, highlight: true },
              ].map((s, i) => (
                <div key={i} style={{ background: 'var(--bg-tertiary)', borderRadius: '6px', padding: '10px 12px' }}>
                  <div style={{ fontSize: '10px', color: 'var(--text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '4px' }}>{s.label}</div>
                  <div style={{ fontFamily: 'IBM Plex Mono, monospace', fontSize: '15px', fontWeight: 500, color: s.highlight ? accentColor : 'var(--text-primary)' }}>{s.val}</div>
                </div>
              ))}
            </div>
            <div style={{ fontSize: '12px', color: 'var(--text-tertiary)' }}>
              Referencia ({loteData?.tipo || 'Cerdo'} eficiente): <span style={{ fontFamily: 'IBM Plex Mono, monospace', color: 'var(--text-secondary)' }}>{refICA} kg alimento / 1 kg ganado</span>
            </div>
          </div>

          <button onClick={() => setShowConfirm(true)} style={{ padding: '14px', borderRadius: '8px', border: `2px solid ${accentColor}`, background: accentColor, color: '#fff', cursor: 'pointer', fontSize: '14px', fontWeight: 500, fontFamily: 'IBM Plex Sans, sans-serif', transition: 'all 0.15s', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
            <Icon name="checkSquare" size={16} /> Registrar liquidación y cerrar lote
          </button>
        </div>
      </div>

      {showConfirm && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', zIndex: 300, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border-mid)', borderRadius: '10px', padding: '28px 32px', width: '380px', maxWidth: 'calc(100vw - 32px)', display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <Icon name="scale" size={20} style={{ color: accentColor }} />
              <span style={{ fontSize: '16px', fontWeight: 500, color: 'var(--text-primary)' }}>¿Cerrar este lote?</span>
            </div>
            <p style={{ fontSize: '13px', color: 'var(--text-secondary)', lineHeight: 1.6 }}>
              El lote <strong style={{ color: 'var(--text-primary)' }}>#{loteData?.id}</strong> se moverá al historial de liquidaciones. Esta acción no se puede deshacer.
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

export default Liquidacion;
