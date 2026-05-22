import React, { useState, useEffect } from 'react';
import { Icon } from '../../icons.jsx';
import { apiFetch } from '../../config/api.js';
import { MoneyDisplay, Btn, StatusBadge, RubroBadge, InfoBanner, InfoTip, FormulaHint } from '../../components/ui.jsx';

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
    apiFetch(`/api/negocios/${negocioId}/lotes/${selectedLoteUuid}/diario`)
      .then(data => setBitacora(data || []))
      .catch(() => setBitacora([]));
  }, [negocioId, selectedLoteUuid]);

  useEffect(() => {
    if (!negocioId) return;
    apiFetch(`/api/negocios/${negocioId}/categorias`)
      .then(data => setCategorias(data || []))
      .catch(() => setCategorias([]));
  }, [negocioId]);

  useEffect(() => {
    if (!negocioId || !selectedLoteUuid) return;
    setCortesDespiece([]);
    setPreciosCortes({});
    setEscenariosResult(null);
    apiFetch(`/api/negocios/${negocioId}/lotes/${selectedLoteUuid}/despiece`)
      .then(data => {
        const cortes = data.cortes || [];
        setCortesDespiece(cortes);
        const prices = {};
        cortes.forEach(c => { prices[c.id] = ''; });
        setPreciosCortes(prices);
      })
      .catch(() => {});
  }, [negocioId, selectedLoteUuid]);

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

  // Escenario 3 — Despiece
  const [cortesDespiece, setCortesDespiece] = useState([]);
  const [preciosCortes, setPreciosCortes] = useState({});
  const [escenariosResult, setEscenariosResult] = useState(null);
  const [calculandoEscenarios, setCalculandoEscenarios] = useState(false);

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

  const ingresoCortes = cortesDespiece.reduce((sum, c) => {
    const pvp = parseFloat(preciosCortes[c.id]) || 0;
    return sum + pvp * parseFloat(c.peso_kg || 0);
  }, 0);
  const utilCortes = ingresoCortes - costoTotalLote - gastosGanchoTotal;
  const tieneAlgunPrecioCorte = cortesDespiece.some(c => parseFloat(preciosCortes[c.id]) > 0);
  const cortesEsMejor = tieneAlgunPrecioCorte && utilCortes > Math.max(utilPie, utilGancho);

  const handleCalcularEscenarios = async () => {
    if (!negocioId || !selectedLoteUuid) return;
    setCalculandoEscenarios(true);
    setEscenariosResult(null);
    try {
      const body = {
        pvp_vivo: pvpPie,
        pvp_gancho: pvpGancho,
        gastos_faena: gastosGanchoTotal,
        rendimiento_canal: rendimientoCanal,
      };
      if (tieneAlgunPrecioCorte) {
        body.precios_cortes = cortesDespiece
          .filter(c => parseFloat(preciosCortes[c.id]) > 0)
          .map(c => ({ corte_id: c.id, pvp: parseFloat(preciosCortes[c.id]) }));
      }
      const result = await apiFetch(`/api/negocios/${negocioId}/lotes/${selectedLoteUuid}/escenarios`, {
        method: 'POST',
        body: JSON.stringify(body),
      });
      setEscenariosResult(result);
    } catch (e) {
      // silently fail — user can retry
    } finally {
      setCalculandoEscenarios(false);
    }
  };

  const iNum = (label, rawValue, onRawChange, prefix = 'Bs', hint = '', tip = null) => (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
        <label style={{ fontSize: '10px', color: 'var(--text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>{label}</label>
        {tip && <InfoTip text={tip} />}
      </div>
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
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', fontSize: '11px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.07em', color: 'var(--text-tertiary)' }}>
              Utilidad neta
              <InfoTip text="Ingreso bruto − costo total del lote − gastos de venta. No incluye CIF (costos indirectos fijos)." />
            </span>
            {utilidad == null
              ? <span style={{ fontFamily: 'IBM Plex Mono, monospace', fontSize: '18px', color: 'var(--text-tertiary)' }}>—</span>
              : <MoneyDisplay value={utilidad} size="xl" color="green" />}
          </div>
          {utilidad != null && (
            <FormulaHint
              formula="Utilidad = Ingreso bruto − Costo total del lote − Gastos de venta"
              ejemplo={`Bs ${ingreso.toLocaleString('es-BO', { maximumFractionDigits: 0 })} − Bs ${costoTotalLote.toLocaleString('es-BO', { maximumFractionDigits: 0 })} − Bs ${gastosVenta.toLocaleString('es-BO', { maximumFractionDigits: 0 })} = Bs ${utilidad.toLocaleString('es-BO', { maximumFractionDigits: 0 })}`}
            />
          )}
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
      <InfoBanner
        storageKey="banner_liquidacion_v1"
        title="Comparador de escenarios de venta"
        text="Completá los campos para ver cuánto ganarías vendiendo el lote en pie, en gancho o por cortes. Ningún dato se graba hasta que hagas clic en 'Registrar liquidación y cerrar lote'."
        accentColor="var(--accent-agro)"
      />
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

      <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
        
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '16px', alignItems: 'stretch' }}>
          <div style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border-subtle)', borderRadius: '8px', overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
            <div style={{ padding: '12px 16px', borderBottom: '1px solid var(--border-subtle)' }}>
              <span style={{ fontSize: '11px', fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase', color: accentColor }}>1. Datos finales del lote</span>
            </div>
            <div style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: '12px', flex: 1 }}>
              {iNum('Animales vivos para venta', cabezasVentaRaw, setCabezasVentaRaw, '', 'cabezas')}
              {iNum('Peso promedio final (kg/cab)', pesoPromFinalRaw, setPesoPromFinalRaw, '', '')}
              <div style={{ marginTop: 'auto', background: 'var(--bg-tertiary)', borderRadius: '6px', padding: '10px 12px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>Peso total en pie</span>
                <span style={{ fontFamily: 'IBM Plex Mono, monospace', fontSize: '14px', color: 'var(--text-primary)', fontWeight: 500 }}>
                  {pesoTotalPie.toLocaleString('es-BO')} kg
                </span>
              </div>
            </div>
          </div>

          <div style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border-subtle)', borderRadius: '8px', overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
            <div style={{ padding: '12px 16px', borderBottom: '1px solid var(--border-subtle)' }}>
              <span style={{ fontSize: '11px', fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase', color: accentColor }}>2. Rendimiento y precios</span>
            </div>
            <div style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: '12px', flex: 1 }}>
              {iNum('Rendimiento canal (%)', rendimientoCanalRaw, setRendimientoCanalRaw, '', 'Estándar cerdo: 72–78%', 'Porcentaje del peso vivo que se convierte en canal faenado. El resto corresponde a vísceras, sangre y cuero.')}
              <div style={{ background: 'var(--bg-tertiary)', borderRadius: '6px', padding: '10px 12px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>Peso gancho estimado</span>
                <span style={{ fontFamily: 'IBM Plex Mono, monospace', fontSize: '14px', color: accentColor, fontWeight: 500 }}>
                  {pesoGancho.toFixed(0)} kg
                </span>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginTop: 'auto' }}>
                {iNum('PVP $/kg pie', pvpPieRaw, setPvpPieRaw, 'Bs', 'En vivo', 'Precio al que vendés el animal vivo, por kg de peso en pie. El ingreso = peso total en pie × este precio.')}
                {iNum('PVP $/kg gancho', pvpGanchoRaw, setPvpGanchoRaw, 'Bs', 'En canal', 'Precio al que vendés el canal colgado, por kg de peso canal. Siempre mayor al precio en pie porque incluye el trabajo de faena.')}
              </div>
            </div>
          </div>

          <div style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border-subtle)', borderRadius: '8px', overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
            <div style={{ padding: '12px 16px', borderBottom: '1px solid var(--border-subtle)' }}>
              <span style={{ fontSize: '11px', fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase', color: accentColor }}>3. Gastos de venta</span>
            </div>
            <div style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: '12px', flex: 1 }}>
              {iNum('Transporte al matadero', transporteRaw, setTransporteRaw)}
              {iNum('Comisión intermediario', comisionRaw, setComisionRaw)}
              {iNum('Gastos de faena (gancho)', faenaRaw, setFaenaRaw, 'Bs', 'Solo si vende en gancho', 'Costo del servicio de faena en el matadero. Solo se descuenta en los escenarios gancho y por cortes, no en venta en pie.')}
              {iNum('Otros', otrosGastosRaw, setOtrosGastosRaw)}
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', minWidth: 0 }}>
          {sinDatosVenta && (
            <div style={{ background: 'var(--bg-tertiary)', border: '1px solid var(--border-subtle)', borderRadius: '8px', padding: '14px 20px', textAlign: 'center', color: 'var(--text-tertiary)', fontSize: '13px' }}>
              <Icon name="alertTriangle" size={14} style={{ marginRight: '6px', verticalAlign: 'middle' }} />
              Ingresá cantidades para ver el escenario
            </div>
          )}

          {!sinDatosVenta && (
            <>
              <div style={{ fontSize: '14px', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '-4px' }}>Resultados proyectados</div>
              <div className="liquidacion-cards" style={{ display: 'flex', gap: '16px' }}>
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
            </>
          )}

          {cortesDespiece.length > 0 && !sinDatosVenta && (
          <div style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border-subtle)', borderRadius: '8px', overflow: 'hidden' }}>
            <div style={{ padding: '12px 16px', borderBottom: '1px solid var(--border-subtle)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', fontSize: '11px', fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase', color: accentColor }}>
                Escenario: Venta por cortes
                <InfoTip text={'Ingresá el precio de mercado por kg de cada corte. El ingreso se calcula como precio × peso de cada corte.\nEste escenario suele ser el más rentable porque capturás el valor diferencial de cada pieza.'} />
              </span>
              <span style={{ fontSize: '12px', color: 'var(--text-tertiary)' }}>{cortesDespiece.length} cortes</span>
            </div>
            <div style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr auto 90px auto', gap: '8px 12px', alignItems: 'center' }}>
                {['Corte', 'Peso kg', 'PVP Bs/kg', 'Ingreso'].map(h => (
                  <span key={h} style={{ fontSize: '10px', fontWeight: 600, color: 'var(--text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.06em', textAlign: h !== 'Corte' ? 'right' : 'left' }}>{h}</span>
                ))}
                {cortesDespiece.map(c => {
                  const pvp = parseFloat(preciosCortes[c.id]) || 0;
                  const ingreso = pvp * parseFloat(c.peso_kg || 0);
                  return (
                    <React.Fragment key={c.id}>
                      <span style={{ fontSize: '13px', color: 'var(--text-primary)' }}>{c.nombre}</span>
                      <span style={{ fontFamily: 'IBM Plex Mono, monospace', fontSize: '12px', color: 'var(--text-secondary)', textAlign: 'right' }}>{parseFloat(c.peso_kg).toFixed(1)}</span>
                      <input
                        value={preciosCortes[c.id] ?? ''}
                        onChange={e => setPreciosCortes(p => ({ ...p, [c.id]: e.target.value }))}
                        type="number" step="any" placeholder="—"
                        style={{ width: '100%', background: 'var(--bg-tertiary)', border: '1px solid var(--border-subtle)', borderRadius: '4px', color: 'var(--text-primary)', padding: '4px 8px', fontSize: '12px', outline: 'none', fontFamily: 'IBM Plex Mono, monospace', textAlign: 'right' }}
                        onFocus={e => e.target.style.borderColor = accentColor}
                        onBlur={e => e.target.style.borderColor = 'var(--border-subtle)'}
                      />
                      <span style={{ fontFamily: 'IBM Plex Mono, monospace', fontSize: '12px', color: ingreso > 0 ? 'var(--text-primary)' : 'var(--text-tertiary)', textAlign: 'right' }}>
                        {ingreso > 0 ? `Bs ${ingreso.toFixed(0)}` : '—'}
                      </span>
                    </React.Fragment>
                  );
                })}
              </div>

              {tieneAlgunPrecioCorte && (
                <div style={{ borderTop: '1px solid var(--border-subtle)', paddingTop: '12px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '8px' }}>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                    <span style={{ fontSize: '10px', color: 'var(--text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Ingreso estimado</span>
                    <span style={{ fontFamily: 'IBM Plex Mono, monospace', fontSize: '15px', color: 'var(--text-primary)', fontWeight: 500 }}>Bs {ingresoCortes.toLocaleString('es-BO', { minimumFractionDigits: 0 })}</span>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '2px', textAlign: 'right' }}>
                    <span style={{ fontSize: '10px', color: 'var(--text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Utilidad neta estimada</span>
                    <span style={{ fontFamily: 'IBM Plex Mono, monospace', fontSize: '15px', fontWeight: 500, color: utilCortes >= 0 ? 'var(--accent-success)' : 'var(--accent-danger)' }}>
                      {utilCortes >= 0 ? '+' : ''}Bs {utilCortes.toLocaleString('es-BO', { minimumFractionDigits: 0 })}
                    </span>
                  </div>
                </div>
              )}

              <div style={{ alignSelf: 'flex-start' }}>
                <Btn
                  accentColor={accentColor}
                  icon="barChart"
                  onClick={handleCalcularEscenarios}
                  disabled={calculandoEscenarios || !tieneAlgunPrecioCorte}
                >
                  {calculandoEscenarios ? 'Calculando...' : 'Comparar 3 escenarios'}
                </Btn>
              </div>
            </div>
          </div>
          )}

          {escenariosResult && (
          <div style={{ background: 'var(--bg-secondary)', border: `1px solid ${accentColor}44`, borderRadius: '8px', overflow: 'hidden' }}>
            <div style={{ padding: '12px 16px', borderBottom: `1px solid ${accentColor}33`, background: accentColor + '08', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '8px' }}>
              <span style={{ fontSize: '11px', fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase', color: accentColor }}>Comparador de escenarios</span>
              <span style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
                Recomendado: <strong style={{ color: accentColor }}>{escenariosResult.recomendacion === 'vivo' ? 'Venta en pie' : escenariosResult.recomendacion === 'gancho' ? 'Venta gancho' : 'Venta por cortes'}</strong>
              </span>
            </div>
            <div style={{ padding: '14px', display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '10px' }}>
              {[
                { key: 'vivo',   label: 'En pie (vivo)',   data: escenariosResult.vivo },
                { key: 'gancho', label: 'Gancho (canal)',  data: escenariosResult.gancho },
                { key: 'cortes', label: 'Por cortes',      data: escenariosResult.cortes },
              ].map(({ key, label, data }) => {
                const esRec = escenariosResult.recomendacion === key;
                return (
                  <div key={key} style={{ background: esRec ? accentColor + '12' : 'var(--bg-tertiary)', border: `1px solid ${esRec ? accentColor + '55' : 'var(--border-subtle)'}`, borderRadius: '8px', padding: '12px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '4px' }}>
                      <span style={{ fontSize: '12px', fontWeight: 600, color: esRec ? accentColor : 'var(--text-primary)' }}>{label}</span>
                      {esRec && (
                        <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', padding: '1px 6px', borderRadius: '4px', fontSize: '10px', fontWeight: 700, color: accentColor, background: accentColor + '22', border: `1px solid ${accentColor}44` }}>
                          ★ Mejor
                          <InfoTip text="El escenario con mayor utilidad neta según los precios que ingresaste." position="left" />
                        </span>
                      )}
                    </div>
                    {data == null ? (
                      <span style={{ fontSize: '12px', color: 'var(--text-tertiary)' }}>Sin datos</span>
                    ) : (
                      [
                        { l: 'Ingreso',  v: `Bs ${parseFloat(data.ingreso  || 0).toLocaleString('es-BO', { minimumFractionDigits: 0 })}`, bold: false },
                        { l: 'Costo total', v: `Bs ${parseFloat(data.costo || 0).toLocaleString('es-BO', { minimumFractionDigits: 0 })}`, bold: false },
                        { l: 'Utilidad', v: `Bs ${parseFloat(data.utilidad || 0).toLocaleString('es-BO', { minimumFractionDigits: 0 })}`, bold: true, isUtil: true },
                        { l: 'Margen',   v: data.margen != null ? `${parseFloat(data.margen).toFixed(0)}%` : '—', bold: false },
                      ].map((r, i) => (
                        <div key={i} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px' }}>
                          <span style={{ color: 'var(--text-secondary)' }}>{r.l}</span>
                          <span style={{ fontFamily: 'IBM Plex Mono, monospace', fontWeight: r.bold ? 600 : 400, color: r.isUtil ? (parseFloat(data.utilidad) >= 0 ? 'var(--accent-success)' : 'var(--accent-danger)') : 'var(--text-primary)' }}>{r.v}</span>
                        </div>
                      ))
                    )}
                  </div>
                );
              })}
            </div>
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
            <span style={{ fontSize: '13px', color: 'var(--text-tertiary)', lineHeight: 1.5 }}>Sin datos de alimentación en el diario de producción — el ICA se calculará cuando registres alimentos.</span>
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
