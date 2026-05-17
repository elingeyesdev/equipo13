import React, { useState, useEffect } from 'react';
import { Icon } from '../../icons.jsx';
import { apiFetch } from '../../config/api.js';
import { MoneyDisplay, Btn, StatusBadge, RubroBadge } from '../../components/ui.jsx';

const safeDivide = (num, den) => (den === 0 ? null : num / den);

const Liquidacion = ({ negocioId, activeLote, onNavigate, setActiveLote }) => {
  const accentColor = 'var(--accent-agro)';

  const [lotes, setLotes] = useState([]);
  const [selectedLoteUuid, setSelectedLoteUuid] = useState(activeLote?._id || null);

  useEffect(() => {
    if (negocioId) {
      apiFetch(`/api/negocios/${negocioId}/lotes`).then(data => {
        const mapped = data.map(l => ({
          ...l,
          _id: l.id,
          id: l.identificador || l.id,
          tipo: l.tipo_animal,
          dias: l.fecha_entrada ? Math.floor((Date.now() - new Date(l.fecha_entrada)) / 86400000) : 0,
          cabezasActivas: l.cabezas_activas || 0,
          cabezas_inicio: l.cabezas_inicio || 0,
          costo_total: parseFloat(l.costo_total) || 0,
          pesoInicialProm: parseFloat(l.peso_inicial_prom) || 0
        }));
        setLotes(mapped);
        if (!selectedLoteUuid && mapped.length > 0) {
          setSelectedLoteUuid(mapped[0]._id);
        }
      }).catch(console.error);
    }
  }, [negocioId]);

  useEffect(() => {
    if (activeLote?._id) {
      setSelectedLoteUuid(activeLote._id);
    }
  }, [activeLote]);

  const loteData = lotes.find(l => l._id === selectedLoteUuid) || (activeLote?._id === selectedLoteUuid ? activeLote : null);
  const costoTotalLote = loteData?.costo_total || (loteData?.costos ? Object.values(loteData.costos).reduce((s, v) => s + v, 0) : 0);

  // Fetch bitácora to compute real alimento consumed
  const [bitacora, setBitacora] = useState([]);
  const [categorias, setCategorias] = useState([]);

  useEffect(() => {
    if (!negocioId || !selectedLoteUuid) return;
    apiFetch(`/api/negocios/${negocioId}/lotes/${selectedLoteUuid}/bitacora`)
      .then(data => setBitacora(data || []))
      .catch(() => setBitacora([]));
  }, [negocioId, selectedLoteUuid]);

  useEffect(() => {
    if (!negocioId) return;
    apiFetch(`/api/negocios/${negocioId}/categorias`)
      .then(data => setCategorias(data || []))
      .catch(() => setCategorias([]));
  }, [negocioId]);

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
  const [liquidando, setLiquidando] = useState(false);
  const [confirmError, setConfirmError] = useState(null);

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

  const sinDatosVenta = cabezasVenta === 0;

  const pesoTotalPie = cabezasVenta * pesoPromFinal;
  const pesoGancho = pesoTotalPie * (rendimientoCanal / 100);
  const gastosVenta = transporte + comision;
  const gastosGanchoTotal = transporte + comision + faena + otrosGastos;

  const ingresoPie = pesoTotalPie * pvpPie;
  const ingresoGancho = pesoGancho * pvpGancho;

  const utilPie = ingresoPie - costoTotalLote - gastosVenta;
  const utilGancho = ingresoGancho - costoTotalLote - gastosGanchoTotal;

  const ganchoEsMejor = utilGancho > utilPie;

  const costoKgVivo = safeDivide(costoTotalLote, pesoTotalPie);
  const costoKgGancho = safeDivide(costoTotalLote, pesoGancho);

  // ICA real from bitácora — find alimento categories
  const alimentoCatNames = categorias
    .filter(c => /aliment|forraje/i.test(c.nombre))
    .map(c => c.nombre);
  const entradasAlimento = bitacora.filter(
    r => !r.es_baja && r.monto != null && alimentoCatNames.includes(r.tipo)
  );
  const alimentoConsumido = entradasAlimento.reduce((s, r) => s + parseFloat(r.monto), 0);
  const hayDatosAlimento = entradasAlimento.length > 0;

  const gananciaTotal = (pesoPromFinal - (loteData?.pesoInicialProm || 8.5)) * cabezasVenta;
  const ica = hayDatosAlimento && gananciaTotal > 0 ? (alimentoConsumido / gananciaTotal).toFixed(2) : '—';
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

  const fmtSafe = (val) => val == null ? '—' : val;

  const ResultCol = ({ titulo, recomendado, pesoTotal, pesoLabel, costoKg, ingreso, gastosVenta, utilidad, utilCabeza, utilKg, margen, accentColor }) => (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '0', background: recomendado ? accentColor + '08' : 'transparent', borderRadius: '8px', border: `1px solid ${recomendado ? accentColor + '44' : 'var(--border-subtle)'}`, overflow: 'hidden', minWidth: 0 }}>
      <div style={{ padding: '14px 16px', background: recomendado ? accentColor + '18' : 'var(--bg-tertiary)', borderBottom: '1px solid var(--border-subtle)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '8px' }}>
        <span style={{ fontSize: '13px', fontWeight: 600, color: recomendado ? accentColor : 'var(--text-primary)' }}>{titulo}</span>
        {recomendado && <span style={{ padding: '2px 8px', borderRadius: '4px', fontSize: '11px', fontWeight: 600, color: accentColor, background: accentColor + '22', border: `1px solid ${accentColor}44` }}>Recomendado</span>}
      </div>
      <div style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
        {[
          { label: pesoLabel, mono: `${pesoTotal.toLocaleString('es-BO')} kg` },
          { label: 'Costo / kg', isSafe: true, safeVal: costoKg },
          { label: 'Ingreso bruto', value: ingreso },
          { label: 'Costo total lote', value: costoTotalLote },
          { label: 'Gastos de venta', value: gastosVenta },
        ].map((row, i) => (
          <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingBottom: i === 4 ? '12px' : '0', borderBottom: i === 4 ? `1px solid ${recomendado ? accentColor + '33' : 'var(--border-subtle)'}` : 'none' }}>
            <span style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>{row.label}</span>
            {row.mono
              ? <span style={{ fontFamily: 'IBM Plex Mono, monospace', fontSize: '13px', color: 'var(--text-primary)' }}>{row.mono}</span>
              : row.isSafe
                ? <span style={{ fontFamily: 'IBM Plex Mono, monospace', fontSize: '13px', color: 'var(--text-primary)' }}>{row.safeVal == null ? '—' : `Bs ${row.safeVal.toFixed(2)}`}</span>
                : <MoneyDisplay value={row.value} size="sm" />}
          </div>
        ))}

        <div style={{ background: recomendado ? accentColor + '18' : 'var(--bg-tertiary)', borderRadius: '6px', padding: '12px 14px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
            <span style={{ fontSize: '11px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.07em', color: 'var(--text-tertiary)' }}>Utilidad neta</span>
            {utilidad == null
              ? <span style={{ fontFamily: 'IBM Plex Mono, monospace', fontSize: '18px', color: 'var(--text-tertiary)' }}>—</span>
              : <MoneyDisplay value={utilidad} size="xl" color="green" />}
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
                ? <span style={{ fontFamily: 'IBM Plex Mono, monospace', color: r.pct == null ? 'var(--text-tertiary)' : 'var(--accent-success)', fontWeight: 500 }}>{r.pct == null ? '—' : `${r.pct.toFixed(0)}%`}</span>
                : r.val == null
                  ? <span style={{ fontFamily: 'IBM Plex Mono, monospace', fontSize: '12px', color: 'var(--text-tertiary)' }}>—</span>
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

  const handleConfirmLiquidar = async () => {
    const loteUuid = loteData?._id;
    if (!negocioId || !loteUuid) return;
    setLiquidando(true);
    setConfirmError(null);
    const escenario = ganchoEsMejor ? 'gancho' : 'pie';
    try {
      await apiFetch(`/api/negocios/${negocioId}/lotes/${loteUuid}/liquidar`, {
        method: 'POST',
        body: JSON.stringify({
          cabezas_venta: cabezasVenta,
          peso_prom_final: pesoPromFinal,
          rendimiento_canal: rendimientoCanal,
          escenario,
          pvp_kg: escenario === 'gancho' ? pvpGancho : pvpPie,
          gastos_finales: escenario === 'gancho' ? gastosGanchoTotal : gastosVenta,
        }),
      });
      setShowConfirm(false);
      setActiveLote?.(null);
      onNavigate?.('lotes');
    } catch (e) {
      setConfirmError(e?.error || e?.message || 'Error al registrar la liquidación');
    } finally {
      setLiquidando(false);
    }
  };

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
              value={selectedLoteUuid || ''}
              onChange={e => setSelectedLoteUuid(e.target.value)}
              style={{ background: 'var(--bg-primary)', border: '1px solid var(--border-subtle)', borderRadius: '6px', color: 'var(--text-primary)', padding: '4px 8px', fontSize: '14px', outline: 'none', fontFamily: 'IBM Plex Mono, monospace' }}
            >
              {lotes.map(l => (
                <option key={l._id} value={l._id}>#{l.id} · {l.tipo}</option>
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
          {sinDatosVenta && (
            <div style={{ background: 'var(--bg-tertiary)', border: '1px solid var(--border-subtle)', borderRadius: '8px', padding: '14px 20px', textAlign: 'center', color: 'var(--text-tertiary)', fontSize: '13px' }}>
              <Icon name="alertTriangle" size={14} style={{ marginRight: '6px', verticalAlign: 'middle' }} />
              Ingresá cantidades para ver el escenario
            </div>
          )}

          {!sinDatosVenta && (
          <div className="liquidacion-cards" style={{ display: 'flex', gap: '14px' }}>
            <ResultCol
              titulo="Venta en pie (vivo)"
              recomendado={!ganchoEsMejor && utilPie >= 0}
              pesoTotal={pesoTotalPie}
              pesoLabel="Peso total en pie"
              costoKg={costoKgVivo}
              ingreso={ingresoPie}
              gastosVenta={gastosVenta}
              utilidad={pesoTotalPie === 0 ? null : utilPie}
              utilCabeza={safeDivide(utilPie, cabezasVenta)}
              utilKg={safeDivide(utilPie, pesoTotalPie)}
              margen={safeDivide(utilPie * 100, costoTotalLote)}
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
              utilidad={pesoGancho === 0 ? null : utilGancho}
              utilCabeza={safeDivide(utilGancho, cabezasVenta)}
              utilKg={safeDivide(utilGancho, pesoGancho)}
              margen={safeDivide(utilGancho * 100, costoTotalLote)}
              accentColor={accentColor}
            />
          </div>
          )}

          {hayDatosAlimento ? (
          <div style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border-subtle)', borderRadius: '8px', padding: '16px' }}>
            <div style={{ fontSize: '11px', fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase', color: accentColor, marginBottom: '12px' }}>Conversión alimenticia del lote</div>
            <div className="liquidacion-ica-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '12px', marginBottom: '12px' }}>
              {[
                { label: 'Alimento consumido (Bs)',    val: `Bs ${alimentoConsumido.toFixed(0)}` },
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
          ) : (
          <div style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border-subtle)', borderRadius: '8px', padding: '20px', display: 'flex', alignItems: 'center', gap: '12px' }}>
            <Icon name="alertTriangle" size={16} style={{ color: 'var(--text-tertiary)', flexShrink: 0 }} />
            <span style={{ fontSize: '13px', color: 'var(--text-tertiary)', lineHeight: 1.5 }}>Sin datos de alimentación en bitácora — el ICA se calculará cuando registres alimentos.</span>
          </div>
          )}

          <button onClick={() => { setConfirmError(null); setShowConfirm(true); }} style={{ padding: '14px', borderRadius: '8px', border: `2px solid ${accentColor}`, background: accentColor, color: '#fff', cursor: 'pointer', fontSize: '14px', fontWeight: 500, fontFamily: 'IBM Plex Sans, sans-serif', transition: 'all 0.15s', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
            <Icon name="checkSquare" size={16} /> Registrar liquidación y cerrar lote
          </button>
        </div>
      </div>

      {showConfirm && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', zIndex: 300, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border-mid)', borderRadius: '10px', padding: '28px 32px', width: '380px', maxWidth: 'calc(100vw - 32px)', display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {confirmError && (
              <div style={{ background: 'var(--accent-danger)12', border: '1px solid var(--accent-danger)44', borderRadius: '6px', padding: '10px 12px', fontSize: '13px', color: 'var(--accent-danger)', lineHeight: 1.5 }}>
                {confirmError}
              </div>
            )}
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <Icon name="scale" size={20} style={{ color: accentColor }} />
              <span style={{ fontSize: '16px', fontWeight: 500, color: 'var(--text-primary)' }}>¿Cerrar este lote?</span>
            </div>
            <p style={{ fontSize: '13px', color: 'var(--text-secondary)', lineHeight: 1.6 }}>
              El lote <strong style={{ color: 'var(--text-primary)' }}>#{loteData?.id}</strong> se moverá al historial de liquidaciones. Esta acción no se puede deshacer.
            </p>
            <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
              <Btn variant="secondary" onClick={() => setShowConfirm(false)} disabled={liquidando}>Cancelar</Btn>
              <Btn accentColor={accentColor} icon="checkSquare" onClick={handleConfirmLiquidar} disabled={liquidando}>
                {liquidando ? 'Registrando...' : 'Confirmar y cerrar'}
              </Btn>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Liquidacion;
