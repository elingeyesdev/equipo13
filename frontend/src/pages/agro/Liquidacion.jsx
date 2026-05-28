import React, { useState, useEffect } from 'react';
import { Icon } from '../../icons.jsx';
import { apiFetch } from '../../config/api.js';
import { MoneyDisplay, Btn, StatusBadge, RubroBadge, InfoBanner, InfoTip, FormulaHint } from '../../components/ui.jsx';

const safeDivide = (num, den) => (den === 0 || !den ? null : num / den);

const mono = (v, suffix = '') => (
  <span style={{ fontFamily: 'IBM Plex Mono, monospace', fontSize: '13px', color: 'var(--text-primary)' }}>
    {v}{suffix}
  </span>
);

const CUT_COLORS = {
  pernil:       '#e67e22',
  chuleta:      '#3498db',
  paleta:       '#9b59b6',
  panceta:      '#e91e63',
  subproductos: '#78909c',
  descarte:     '#546e7a',
};

// ── Input numérico compacto ───────────────────────────────────
const INum = ({ label, raw, setRaw, prefix = 'Bs', hint = '', tip = null, accentColor }) => (
  <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
    <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
      <label style={{ fontSize: '10px', color: 'var(--text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>{label}</label>
      {tip && <InfoTip text={tip} />}
    </div>
    <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
      {prefix && (
        <span style={{ position: 'absolute', left: '8px', fontSize: '12px', color: 'var(--text-tertiary)', fontFamily: 'IBM Plex Mono, monospace', pointerEvents: 'none' }}>
          {prefix}
        </span>
      )}
      <input
        value={raw}
        onChange={e => setRaw(e.target.value)}
        type="number" step="any"
        style={{ width: '100%', boxSizing: 'border-box', background: 'var(--bg-tertiary)', border: '1px solid var(--border-subtle)', borderRadius: '6px', color: 'var(--text-primary)', padding: `7px 8px 7px ${prefix ? '28px' : '10px'}`, fontSize: '13px', outline: 'none', fontFamily: 'IBM Plex Mono, monospace' }}
        onFocus={e => e.target.style.borderColor = accentColor}
        onBlur={e => e.target.style.borderColor = 'var(--border-subtle)'}
      />
    </div>
    {hint && <span style={{ fontSize: '11px', color: 'var(--text-tertiary)', lineHeight: 1.4 }}>{hint}</span>}
  </div>
);

// ── Input numérico mini (para tabla del simulador) ────────────
const IMini = ({ raw, setRaw, accentColor, placeholder = '' }) => (
  <input
    value={raw}
    onChange={e => setRaw(e.target.value)}
    type="number" step="any"
    placeholder={placeholder}
    style={{ width: '100%', boxSizing: 'border-box', background: 'var(--bg-primary)', border: '1px solid var(--border-subtle)', borderRadius: '4px', color: 'var(--text-primary)', padding: '5px 7px', fontSize: '12px', outline: 'none', fontFamily: 'IBM Plex Mono, monospace', textAlign: 'right' }}
    onFocus={e => e.target.style.borderColor = accentColor}
    onBlur={e => e.target.style.borderColor = 'var(--border-subtle)'}
  />
);

// ── Panel de mermas (acordeón) ────────────────────────────────
const MermaPanel = ({
  open, onToggle,
  ayunoRaw, setAyunoRaw,
  frioRaw, setFrioRaw,
  desposteRaw, setDesposteRaw,
  pvGranja, pvAyunado, kgAyuno,
  pcc, pcf, kgFrio,
  pesoUtil, kgDesposte,
  accentColor,
}) => {
  const rowStyle = { display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '12px' };

  return (
    <div style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border-mid)', borderRadius: '8px', overflow: 'hidden' }}>
      <button
        onClick={onToggle}
        style={{ width: '100%', display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 16px', background: 'none', border: 'none', cursor: 'pointer', borderBottom: open ? '1px solid var(--border-subtle)' : 'none' }}
      >
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', fontSize: '11px', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: accentColor }}>
          <Icon name="scale" size={14} />
          Ajuste de Mermas
          <InfoTip text="Porcentajes estándar para la cadena de valor porcina. Modificalos para proyectar escenarios con mermas reales de tu operación." />
        </span>
        <Icon name={open ? 'chevronUp' : 'chevronDown'} size={14} style={{ color: 'var(--text-tertiary)' }} />
      </button>

      {open && (
        <div style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '12px' }}>
            <INum
              label="Ayuno / Transporte (%)"
              raw={ayunoRaw} setRaw={setAyunoRaw} prefix=""
              hint="Estándar: 5–7%" accentColor={accentColor}
              tip="Pérdida de peso por ayuno previo al sacrificio y estrés de transporte al matadero."
            />
            <INum
              label="Deshidratación en Frío (%)"
              raw={frioRaw} setRaw={setFrioRaw} prefix=""
              hint="Estándar: 1.5–2%" accentColor={accentColor}
              tip="Merma por evaporación de humedad durante las 48h de maduración en cámara frigorífica."
            />
            <INum
              label="Desposte Industrial (%)"
              raw={desposteRaw} setRaw={setDesposteRaw} prefix=""
              hint="Estándar: 4–6%" accentColor={accentColor}
              tip="Pérdida ósea/aserrín (~0.75%), descarte de grasa dura (~1–2%) y molienda (~1%). Total típico 4–6%."
            />
          </div>

          {pvGranja > 0 && (
            <div style={{ background: 'var(--bg-tertiary)', borderRadius: '8px', padding: '14px 16px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <div style={{ fontSize: '10px', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--text-tertiary)', marginBottom: '4px' }}>
                Cascada de pesos proyectados
              </div>
              {[
                { label: 'PV Granja (peso vivo inicial)',    kg: pvGranja,    color: 'var(--text-primary)' },
                { label: 'Merma ayuno/transporte',           kg: -kgAyuno,    color: 'var(--accent-danger)', small: true },
                { label: 'PV Ayunado → Venta en Pie',       kg: pvAyunado,   color: 'var(--accent-agro)', bold: true },
                { label: '× RCC → PCC (Canal Caliente)',    kg: pcc,         color: 'var(--text-secondary)' },
                { label: 'Merma deshidratación frío',       kg: -kgFrio,     color: 'var(--accent-danger)', small: true },
                { label: 'PCF → Venta en Gancho',           kg: pcf,         color: 'var(--accent-agro)', bold: true },
                { label: 'Merma desposte industrial',       kg: -kgDesposte, color: 'var(--accent-danger)', small: true },
                { label: 'Peso Útil Industrial → Despiece', kg: pesoUtil,    color: 'var(--accent-agro)', bold: true },
              ].map((r, i) => (
                <div key={i} style={{ ...rowStyle, paddingLeft: r.small ? '12px' : '0', opacity: r.small ? 0.85 : 1 }}>
                  <span style={{ color: r.color || 'var(--text-secondary)', fontSize: r.small ? '11px' : '12px', fontStyle: r.small ? 'italic' : 'normal' }}>
                    {r.label}
                  </span>
                  <span style={{ fontFamily: 'IBM Plex Mono, monospace', fontSize: r.small ? '11px' : '13px', fontWeight: r.bold ? 600 : 400, color: r.color || 'var(--text-primary)' }}>
                    {r.kg < 0 ? `−${Math.abs(r.kg).toFixed(1)}` : r.kg.toFixed(1)} kg
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

// ── Barra de kg (kilos iniciales / perdidos / útiles) ─────────
const KgBreakdown = ({ label, kgInicio, kgMerma, kgUtil, mermaNombre, accentColor }) => {
  if (!kgInicio) return null;
  const pctMerma = (kgMerma / kgInicio) * 100;
  return (
    <div style={{ background: 'var(--bg-tertiary)', borderRadius: '6px', padding: '10px 12px', display: 'flex', flexDirection: 'column', gap: '6px', marginBottom: '2px' }}>
      <div style={{ fontSize: '10px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.07em', color: 'var(--text-tertiary)', marginBottom: '2px' }}>
        Desglose de kilos — {label}
      </div>
      {[
        { l: 'Kilos iniciales',         v: kgInicio, c: 'var(--text-primary)' },
        { l: `Merma ${mermaNombre}`,    v: -kgMerma, c: 'var(--accent-danger)', icon: '▼' },
        { l: 'Kilos útiles para venta', v: kgUtil,   c: 'var(--accent-success)', bold: true },
      ].map((r, i) => (
        <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '12px' }}>
          <span style={{ color: r.c }}>{r.icon ? `${r.icon} ` : ''}{r.l}</span>
          <span style={{ fontFamily: 'IBM Plex Mono, monospace', fontWeight: r.bold ? 600 : 400, color: r.c }}>
            {r.v < 0 ? `−${Math.abs(r.v).toFixed(1)} kg (${pctMerma.toFixed(1)}%)` : `${r.v.toFixed(1)} kg`}
          </span>
        </div>
      ))}
      <div style={{ height: '6px', borderRadius: '3px', background: 'var(--border-subtle)', overflow: 'hidden', marginTop: '2px' }}>
        <div style={{ height: '100%', width: `${100 - pctMerma}%`, background: accentColor, borderRadius: '3px', transition: 'width 0.3s ease' }} />
      </div>
    </div>
  );
};

// ── Barra visual de despiece de canal fría ─────────────────────
const SimBarraDespiece = ({ pcf }) => {
  const cortes = [
    { key: 'pernil',       label: 'Pernil',   pct: 20,    color: CUT_COLORS.pernil },
    { key: 'chuleta',      label: 'Chuleta',  pct: 26,    color: CUT_COLORS.chuleta },
    { key: 'paleta',       label: 'Paleta',   pct: 18,    color: CUT_COLORS.paleta },
    { key: 'panceta',      label: 'Panceta',  pct: 10,    color: CUT_COLORS.panceta },
    { key: 'subproductos', label: 'Subprod.', pct: 22.75, color: CUT_COLORS.subproductos },
    { key: 'descarte',     label: 'Descarte', pct: 3.25,  color: CUT_COLORS.descarte },
  ];
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
      <div style={{ height: '40px', display: 'flex', borderRadius: '6px', overflow: 'hidden', border: '1px solid var(--border-subtle)' }}>
        {cortes.map(c => (
          <div
            key={c.key}
            style={{ flex: c.pct, background: c.color, display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden', minWidth: 0 }}
            title={`${c.label}: ${c.pct}%${pcf > 0 ? ` = ${(pcf * c.pct / 100).toFixed(1)} kg` : ''}`}
          >
            {c.pct >= 8 && (
              <span style={{ fontSize: '10px', fontWeight: 700, color: '#fff', textShadow: '0 1px 3px rgba(0,0,0,0.5)', whiteSpace: 'nowrap', padding: '0 3px' }}>
                {c.label}
              </span>
            )}
          </div>
        ))}
      </div>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px 16px' }}>
        {cortes.map(c => (
          <div key={c.key} style={{ display: 'flex', alignItems: 'center', gap: '5px', fontSize: '11px' }}>
            <div style={{ width: '10px', height: '10px', borderRadius: '2px', background: c.color, flexShrink: 0 }} />
            <span style={{ color: 'var(--text-secondary)' }}>{c.label}</span>
            <span style={{ fontFamily: 'IBM Plex Mono, monospace', color: 'var(--text-tertiary)', fontSize: '10px' }}>
              {c.pct}%{pcf > 0 ? ` · ${(pcf * c.pct / 100).toFixed(1)} kg` : ''}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
};

// ── Tarjeta de escenario ───────────────────────────────────────
const ResultCol = ({
  titulo, recomendado,
  kgInicio, kgMerma, kgUtil, mermaNombre,
  costoKg, ingreso, gastosVenta, utilidad, utilCabeza, utilKg, margen,
  costoTotalLote, accentColor,
}) => (
  <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '0', background: recomendado ? accentColor + '08' : 'transparent', borderRadius: '8px', border: `1px solid ${recomendado ? accentColor + '44' : 'var(--border-subtle)'}`, overflow: 'hidden', minWidth: 0 }}>
    <div style={{ padding: '14px 16px', background: recomendado ? accentColor + '18' : 'var(--bg-tertiary)', borderBottom: '1px solid var(--border-subtle)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '8px' }}>
      <span style={{ fontSize: '13px', fontWeight: 600, color: recomendado ? accentColor : 'var(--text-primary)' }}>{titulo}</span>
      {recomendado && (
        <span style={{ padding: '2px 8px', borderRadius: '4px', fontSize: '11px', fontWeight: 600, color: accentColor, background: accentColor + '22', border: `1px solid ${accentColor}44` }}>
          Recomendado
        </span>
      )}
    </div>

    <div style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
      <KgBreakdown
        label={titulo}
        kgInicio={kgInicio} kgMerma={kgMerma} kgUtil={kgUtil}
        mermaNombre={mermaNombre} accentColor={accentColor}
      />

      {[
        { label: 'Costo / kg',       isSafe: true, safeVal: costoKg },
        { label: 'Ingreso bruto',    value: ingreso },
        { label: 'Costo total lote', value: costoTotalLote },
        { label: 'Gastos de venta',  value: gastosVenta },
      ].map((row, i) => (
        <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingBottom: i === 3 ? '12px' : '0', borderBottom: i === 3 ? `1px solid ${recomendado ? accentColor + '33' : 'var(--border-subtle)'}` : 'none' }}>
          <span style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>{row.label}</span>
          {row.isSafe
            ? <span style={{ fontFamily: 'IBM Plex Mono, monospace', fontSize: '13px', color: 'var(--text-primary)' }}>{row.safeVal == null ? '—' : `Bs ${row.safeVal.toFixed(2)}`}</span>
            : <MoneyDisplay value={row.value} size="sm" />}
        </div>
      ))}

      <div style={{ background: recomendado ? accentColor + '18' : 'var(--bg-tertiary)', borderRadius: '6px', padding: '12px 14px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', fontSize: '11px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.07em', color: 'var(--text-tertiary)' }}>
            Utilidad neta
            <InfoTip text="Ingreso bruto − costo total del lote − gastos de venta." />
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

// ═════════════════════════════════════════════════════════════
// PÁGINA PRINCIPAL
// ═════════════════════════════════════════════════════════════
const Liquidacion = ({ negocioId, activeLote, onNavigate, setActiveLote }) => {
  const accentColor = 'var(--accent-agro)';

  // ── Lotes ──
  const [lotes, setLotes] = useState([]);
  const [selectedLoteUuid, setSelectedLoteUuid] = useState(activeLote?._id || null);

  useEffect(() => {
    if (!negocioId) return;
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
        pesoInicialProm: parseFloat(l.peso_inicial_prom) || 0,
      }));
      setLotes(mapped);
      if (!selectedLoteUuid && mapped.length > 0) setSelectedLoteUuid(mapped[0]._id);
    }).catch(console.error);
  }, [negocioId]);

  useEffect(() => {
    if (activeLote?._id) setSelectedLoteUuid(activeLote._id);
  }, [activeLote]);

  const loteData = lotes.find(l => l._id === selectedLoteUuid) || (activeLote?._id === selectedLoteUuid ? activeLote : null);
  const costoTotalLote = loteData?.costo_total || (loteData?.costos ? Object.values(loteData.costos).reduce((s, v) => s + v, 0) : 0);

  // ── Bitácora + categorías ──
  const [bitacora, setBitacora] = useState([]);
  const [categorias, setCategorias] = useState([]);

  useEffect(() => {
    if (!negocioId || !selectedLoteUuid) return;
    apiFetch(`/api/negocios/${negocioId}/lotes/${selectedLoteUuid}/diario`)
      .then(data => setBitacora(data || [])).catch(() => setBitacora([]));
  }, [negocioId, selectedLoteUuid]);

  useEffect(() => {
    if (!negocioId) return;
    apiFetch(`/api/negocios/${negocioId}/categorias`)
      .then(data => setCategorias(data || [])).catch(() => setCategorias([]));
  }, [negocioId]);

  // ── Inputs principales ──
  const [cabezasVentaRaw, setCabezasVentaRaw] = useState('0');
  const [pesoPromFinalRaw, setPesoPromFinalRaw] = useState('95');
  const [rendimientoCanalRaw, setRendimientoCanalRaw] = useState('75');
  const [transporteRaw, setTransporteRaw] = useState('350');
  const [comisionRaw, setComisionRaw] = useState('0');
  const [faenaRaw, setFaenaRaw] = useState('480');
  const [otrosGastosRaw, setOtrosGastosRaw] = useState('0');
  const [pvpPieRaw, setPvpPieRaw] = useState('22');
  const [pvpGanchoRaw, setPvpGanchoRaw] = useState('32');

  // ── Inputs de merma ──
  const [mermaAyunoRaw, setMermaAyunoRaw] = useState('5');
  const [mermaFrioRaw, setMermaFrioRaw] = useState('1.5');
  const [mermaDesposteRaw, setMermaDesposteRaw] = useState('4');
  const [mermaOpen, setMermaOpen] = useState(true);

  // ── Simulador Industrial (Escenario 3) ──
  const [simPvpJamonRaw, setSimPvpJamonRaw] = useState('18');
  const [simPvpChorizoRaw, setSimPvpChorizoRaw] = useState('22');
  const [simPvpTocinoRaw, setSimPvpTocinoRaw] = useState('16');
  const [simPvpChuletaRaw, setSimPvpChuletaRaw] = useState('28');
  const [simPvpSubprodRaw, setSimPvpSubprodRaw] = useState('8');
  const [simMJamonRaw, setSimMJamonRaw] = useState('20');
  const [simMChorizoRaw, setSimMChorizoRaw] = useState('10');
  const [simMTocinoRaw, setSimMTocinoRaw] = useState('12');
  const [simOpen, setSimOpen] = useState(true);

  // ── Confirm / liquidar ──
  const [showConfirm, setShowConfirm] = useState(false);
  const [liquidando, setLiquidando] = useState(false);
  const [confirmError, setConfirmError] = useState(null);

  useEffect(() => {
    if (loteData) setCabezasVentaRaw(String(loteData.cabezasActivas || 0));
  }, [loteData]);

  // ── Valores numéricos ──
  const cabezasVenta    = parseFloat(cabezasVentaRaw) || 0;
  const pesoPromFinal   = parseFloat(pesoPromFinalRaw) || 0;
  const rendimientoCanal = parseFloat(rendimientoCanalRaw) || 75;
  const transporte      = parseFloat(transporteRaw) || 0;
  const comision        = parseFloat(comisionRaw) || 0;
  const faena           = parseFloat(faenaRaw) || 0;
  const otrosGastos     = parseFloat(otrosGastosRaw) || 0;
  const pvpPie          = parseFloat(pvpPieRaw) || 0;
  const pvpGancho       = parseFloat(pvpGanchoRaw) || 0;

  const mermaAyuno    = Math.max(0, Math.min(100, parseFloat(mermaAyunoRaw) || 5));
  const mermaFrio     = Math.max(0, Math.min(100, parseFloat(mermaFrioRaw) || 1.5));
  const mermaDesposte = Math.max(0, Math.min(100, parseFloat(mermaDesposteRaw) || 4));

  // ── Cascada secuencial de mermas ──────────────────────────
  const pvGranja   = cabezasVenta * pesoPromFinal;
  const pvAyunado  = pvGranja * (1 - mermaAyuno / 100);
  const kgAyuno    = pvGranja - pvAyunado;
  const pcc        = pvAyunado * (rendimientoCanal / 100);
  const pcf        = pcc * (1 - mermaFrio / 100);
  const kgFrio     = pcc - pcf;
  const pesoUtil   = pcf * (1 - mermaDesposte / 100);
  const kgDesposte = pcf - pesoUtil;

  // ── Costos de venta ──
  const gastosVenta       = transporte + comision;
  const gastosGanchoTotal = transporte + comision + faena + otrosGastos;

  // ── Escenarios E1/E2 ──
  const ingresoPie    = pvAyunado * pvpPie;
  const ingresoGancho = pcf * pvpGancho;
  const utilPie       = ingresoPie - costoTotalLote - gastosVenta;
  const utilGancho    = ingresoGancho - costoTotalLote - gastosGanchoTotal;
  const costoKgVivo   = safeDivide(costoTotalLote, pvAyunado);
  const costoKgGancho = safeDivide(costoTotalLote, pcf);
  const ganchoEsMejor = utilGancho > utilPie;

  // ── Simulador Industrial ──
  const simPvpJamon   = parseFloat(simPvpJamonRaw) || 0;
  const simPvpChorizo = parseFloat(simPvpChorizoRaw) || 0;
  const simPvpTocino  = parseFloat(simPvpTocinoRaw) || 0;
  const simPvpChuleta = parseFloat(simPvpChuletaRaw) || 0;
  const simPvpSubprod = parseFloat(simPvpSubprodRaw) || 0;
  const simMJamon     = Math.max(0, Math.min(100, parseFloat(simMJamonRaw) || 20));
  const simMChorizo   = Math.max(0, Math.min(100, parseFloat(simMChorizoRaw) || 10));
  const simMTocino    = Math.max(0, Math.min(100, parseFloat(simMTocinoRaw) || 12));

  const costoKgCrudo = pcf > 0 ? costoTotalLote / pcf : 0;

  // Yields estándar sobre PCF
  const simKgPernil   = pcf * 0.20;
  const simKgChuleta0 = pcf * 0.26;
  const simKgPaleta   = pcf * 0.18;
  const simKgPanceta  = pcf * 0.10;
  const simKgSubprod  = pcf * 0.2275;
  const simKgDescarte = pcf * 0.0325;

  // Routing Chuleta: comparar márgenes
  const simMargenChorizoChuleta = simPvpChorizo * (1 - simMChorizo / 100) - costoKgCrudo;
  const simMargenChuletaFresca  = simPvpChuleta - costoKgCrudo;
  const simChuletaAChorizo = simPvpChorizo > 0 && simMargenChorizoChuleta > simMargenChuletaFresca;

  // Producción final
  const simKgJamon        = simKgPernil * (1 - simMJamon / 100);
  const simKgChorizoBase  = simChuletaAChorizo ? simKgPaleta + simKgChuleta0 : simKgPaleta;
  const simKgChorizo      = simKgChorizoBase * (1 - simMChorizo / 100);
  const simKgTocino       = simKgPanceta * (1 - simMTocino / 100);
  const simKgChuletaFin   = simChuletaAChorizo ? 0 : simKgChuleta0;

  // Ingresos por producto
  const simIngresoJamon   = simKgJamon * simPvpJamon;
  const simIngresoChorizo = simKgChorizo * simPvpChorizo;
  const simIngresoTocino  = simKgTocino * simPvpTocino;
  const simIngresoChuleta = simKgChuletaFin * simPvpChuleta;
  const simIngresoSubprod = simKgSubprod * simPvpSubprod;

  const simTotalIngreso = simIngresoJamon + simIngresoChorizo + simIngresoTocino + simIngresoChuleta + simIngresoSubprod;
  const simUtilidad     = simTotalIngreso - costoTotalLote - gastosGanchoTotal;

  // Mix de producción para guardar en liquidación
  const simMixProduccion = {
    chuleta_va_a_chorizo: simChuletaAChorizo,
    mermas_termicas: { jamon: simMJamon, chorizo: simMChorizo, tocino: simMTocino },
    productos: [
      { nombre: 'Jamón',          corte: 'Pernil',                                     yield_pcf_pct: 20,                         merma_termica_pct: simMJamon,   kg_base: simKgPernil,       kg_final: simKgJamon,      pvp: simPvpJamon,   ingreso: simIngresoJamon },
      { nombre: 'Chorizo',        corte: simChuletaAChorizo ? 'Paleta + Chuleta' : 'Paleta', yield_pcf_pct: simChuletaAChorizo ? 44 : 18, merma_termica_pct: simMChorizo, kg_base: simKgChorizoBase,  kg_final: simKgChorizo,    pvp: simPvpChorizo, ingreso: simIngresoChorizo },
      ...(!simChuletaAChorizo ? [{ nombre: 'Chuleta Fresca', corte: 'Chuleta', yield_pcf_pct: 26, merma_termica_pct: 0, kg_base: simKgChuleta0, kg_final: simKgChuletaFin, pvp: simPvpChuleta, ingreso: simIngresoChuleta }] : []),
      { nombre: 'Tocino',         corte: 'Panceta',                                    yield_pcf_pct: 10,                         merma_termica_pct: simMTocino,  kg_base: simKgPanceta,      kg_final: simKgTocino,     pvp: simPvpTocino,  ingreso: simIngresoTocino },
      { nombre: 'Subproductos',   corte: 'Subprod.',                                   yield_pcf_pct: 22.75,                      merma_termica_pct: 0,           kg_base: simKgSubprod,      kg_final: simKgSubprod,    pvp: simPvpSubprod, ingreso: simIngresoSubprod },
    ],
    total_ingreso: simTotalIngreso,
    utilidad_neta: simUtilidad,
  };

  // ── Mejor escenario overall ──
  const industrialEsMejor = pcf > 0 && simTotalIngreso > 0 && simUtilidad > utilGancho && simUtilidad > utilPie;
  const mejorEscenario    = industrialEsMejor ? 'despiece' : ganchoEsMejor ? 'gancho' : 'pie';

  // ── ICA desde bitácora ──
  const alimentoCatNames = categorias.filter(c => /aliment|forraje/i.test(c.nombre)).map(c => c.nombre);
  const entradasAlimento = bitacora.filter(r => !r.es_baja && r.monto != null && alimentoCatNames.includes(r.tipo));
  const alimentoConsumido = entradasAlimento.reduce((s, r) => s + parseFloat(r.monto), 0);
  const hayDatosAlimento  = entradasAlimento.length > 0;
  const gananciaTotal     = (pesoPromFinal - (loteData?.pesoInicialProm || 8.5)) * cabezasVenta;
  const ica               = hayDatosAlimento && gananciaTotal > 0 ? (alimentoConsumido / gananciaTotal).toFixed(2) : '—';
  const refICA            = loteData?.tipo === 'Cerdo' ? '2.5–3.0' : '6.0–8.0';

  const sinDatosVenta = cabezasVenta === 0;

  // ── Confirmar liquidación ──
  const handleConfirmLiquidar = async () => {
    const loteUuid = loteData?._id;
    if (!negocioId || !loteUuid) return;
    setLiquidando(true);
    setConfirmError(null);
    const escenario  = mejorEscenario;
    const pvpFinal   = escenario === 'pie' ? pvpPie : pvpGancho;
    const gastosFin  = escenario === 'pie' ? gastosVenta : gastosGanchoTotal;
    const pvpEfectivo = escenario === 'despiece' && pesoUtil > 0
      ? simTotalIngreso / pesoUtil
      : pvpFinal;
    try {
      await apiFetch(`/api/negocios/${negocioId}/lotes/${loteUuid}/liquidar`, {
        method: 'POST',
        body: JSON.stringify({
          cabezas_venta:      cabezasVenta,
          peso_prom_final:    pesoPromFinal,
          rendimiento_canal:  rendimientoCanal,
          escenario,
          pvp_kg:             pvpEfectivo,
          gastos_finales:     gastosFin,
          merma_ayuno:        mermaAyuno,
          merma_frio:         mermaFrio,
          merma_desposte:     mermaDesposte,
          mix_produccion:     escenario === 'despiece' ? simMixProduccion : null,
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

  const cabezasInicio = loteData?.cabezas_inicio ?? '—';
  const diasActivo    = loteData?.dias ?? '—';

  // Colores para la recomendación industrial
  const goldColor = '#f59e0b';

  // ══════════════════════════════════════════════════════════════
  // RENDER
  // ══════════════════════════════════════════════════════════════
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      <InfoBanner
        storageKey="banner_liquidacion_v2"
        title="Comparador de escenarios de venta con mermas"
        text="Ajustá los porcentajes de merma para proyectar cuánto ganarías en cada escenario. Los cálculos se actualizan en tiempo real. Ningún dato se graba hasta que confirmes la liquidación."
        accentColor="var(--accent-agro)"
      />

      <style>{`
        @media (max-width: 640px) {
          .liquidacion-grid { grid-template-columns: 1fr !important; }
          .liquidacion-cards { flex-direction: column !important; }
          .liquidacion-ica-grid { grid-template-columns: 1fr !important; }
          .sim-config-grid { grid-template-columns: 1fr !important; }
        }
      `}</style>

      <button
        onClick={() => onNavigate?.('lotes')}
        style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: 'var(--text-tertiary)', display: 'flex', alignItems: 'center', gap: '4px', fontSize: '13px', padding: '4px 0', fontFamily: 'var(--font-sans)', alignSelf: 'flex-start' }}
        onMouseEnter={e => e.currentTarget.style.color = 'var(--text-secondary)'}
        onMouseLeave={e => e.currentTarget.style.color = 'var(--text-tertiary)'}
      >
        <Icon name="chevronLeft" size={14} /> Lotes
      </button>

      <h1 style={{ fontSize: '20px', fontWeight: 400, color: 'var(--text-primary)', letterSpacing: '-0.02em', margin: 0 }}>
        Liquidación de lote
      </h1>

      {/* Selector de lote */}
      <div style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border-subtle)', borderRadius: '8px', padding: '14px 20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '3px', flexWrap: 'wrap' }}>
            <span style={{ fontSize: '15px', fontWeight: 500, color: 'var(--text-primary)' }}>Lote</span>
            <select
              value={selectedLoteUuid || ''}
              onChange={e => setSelectedLoteUuid(e.target.value)}
              style={{ background: 'var(--bg-primary)', border: '1px solid var(--border-subtle)', borderRadius: '6px', color: 'var(--text-primary)', padding: '4px 8px', fontSize: '14px', outline: 'none', fontFamily: 'IBM Plex Mono, monospace' }}
            >
              {lotes.map(l => <option key={l._id} value={l._id}>#{l.id} · {l.tipo}</option>)}
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

        {/* ── Sección 1: Datos del lote ── */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '16px', alignItems: 'stretch' }}>
          <div style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border-subtle)', borderRadius: '8px', overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
            <div style={{ padding: '12px 16px', borderBottom: '1px solid var(--border-subtle)' }}>
              <span style={{ fontSize: '11px', fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase', color: accentColor }}>1. Datos finales del lote</span>
            </div>
            <div style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: '12px', flex: 1 }}>
              <INum label="Animales vivos para venta" raw={cabezasVentaRaw} setRaw={setCabezasVentaRaw} prefix="" hint="cabezas" accentColor={accentColor} />
              <INum label="Peso promedio final (kg/cab)" raw={pesoPromFinalRaw} setRaw={setPesoPromFinalRaw} prefix="" accentColor={accentColor} />
              <div style={{ marginTop: 'auto', background: 'var(--bg-tertiary)', borderRadius: '6px', padding: '10px 12px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>Peso vivo total (PV granja)</span>
                {mono(pvGranja.toLocaleString('es-BO'), ' kg')}
              </div>
            </div>
          </div>

          <div style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border-subtle)', borderRadius: '8px', overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
            <div style={{ padding: '12px 16px', borderBottom: '1px solid var(--border-subtle)' }}>
              <span style={{ fontSize: '11px', fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase', color: accentColor }}>2. Rendimiento y precios</span>
            </div>
            <div style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: '12px', flex: 1 }}>
              <INum label="Rendimiento canal (%)" raw={rendimientoCanalRaw} setRaw={setRendimientoCanalRaw} prefix="" hint="Estándar cerdo: 72–78%" accentColor={accentColor} tip="Porcentaje del peso vivo que se convierte en canal faenado (RCC). El resto corresponde a vísceras, sangre y cuero." />
              <div style={{ background: 'var(--bg-tertiary)', borderRadius: '6px', padding: '10px 12px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>PCC (canal caliente estimado)</span>
                {mono(pcc.toFixed(0), ' kg')}
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginTop: 'auto' }}>
                <INum label="PVP $/kg pie" raw={pvpPieRaw} setRaw={setPvpPieRaw} prefix="Bs" hint="En vivo" accentColor={accentColor} tip="Precio al que vendés el animal vivo por kg de peso ayunado." />
                <INum label="PVP $/kg gancho" raw={pvpGanchoRaw} setRaw={setPvpGanchoRaw} prefix="Bs" hint="En canal" accentColor={accentColor} tip="Precio por kg de canal fría (PCF), ya descontada la merma de frío." />
              </div>
            </div>
          </div>

          <div style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border-subtle)', borderRadius: '8px', overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
            <div style={{ padding: '12px 16px', borderBottom: '1px solid var(--border-subtle)' }}>
              <span style={{ fontSize: '11px', fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase', color: accentColor }}>3. Gastos de venta</span>
            </div>
            <div style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: '12px', flex: 1 }}>
              <INum label="Transporte al matadero" raw={transporteRaw} setRaw={setTransporteRaw} accentColor={accentColor} />
              <INum label="Comisión intermediario" raw={comisionRaw} setRaw={setComisionRaw} accentColor={accentColor} />
              <INum label="Gastos de faena (gancho)" raw={faenaRaw} setRaw={setFaenaRaw} prefix="Bs" hint="Solo si vende en gancho" accentColor={accentColor} tip="Costo del servicio de faena en el matadero." />
              <INum label="Otros" raw={otrosGastosRaw} setRaw={setOtrosGastosRaw} accentColor={accentColor} />
            </div>
          </div>
        </div>

        {/* ── Submódulo de Mermas ── */}
        <MermaPanel
          open={mermaOpen} onToggle={() => setMermaOpen(o => !o)}
          ayunoRaw={mermaAyunoRaw}   setAyunoRaw={setMermaAyunoRaw}
          frioRaw={mermaFrioRaw}     setFrioRaw={setMermaFrioRaw}
          desposteRaw={mermaDesposteRaw} setDesposteRaw={setMermaDesposteRaw}
          pvGranja={pvGranja} pvAyunado={pvAyunado} kgAyuno={kgAyuno}
          pcc={pcc} pcf={pcf} kgFrio={kgFrio}
          pesoUtil={pesoUtil} kgDesposte={kgDesposte}
          accentColor={accentColor}
        />

        {/* ── Resultados proyectados E1 / E2 ── */}
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
                  titulo="Venta en Pie (vivo)"
                  recomendado={mejorEscenario === 'pie' && utilPie >= 0}
                  kgInicio={pvGranja}  kgMerma={kgAyuno}  kgUtil={pvAyunado}
                  mermaNombre="ayuno/transporte"
                  costoKg={costoKgVivo}
                  ingreso={ingresoPie}
                  gastosVenta={gastosVenta}
                  costoTotalLote={costoTotalLote}
                  utilidad={pvGranja === 0 ? null : utilPie}
                  utilCabeza={safeDivide(utilPie, cabezasVenta)}
                  utilKg={safeDivide(utilPie, pvAyunado)}
                  margen={safeDivide(utilPie * 100, costoTotalLote)}
                  accentColor={accentColor}
                />
                <ResultCol
                  titulo="Venta Gancho (faenado)"
                  recomendado={mejorEscenario === 'gancho' && utilGancho >= 0}
                  kgInicio={pcc}       kgMerma={kgFrio}   kgUtil={pcf}
                  mermaNombre="deshidratación frío"
                  costoKg={costoKgGancho}
                  ingreso={ingresoGancho}
                  gastosVenta={gastosGanchoTotal}
                  costoTotalLote={costoTotalLote}
                  utilidad={pcc === 0 ? null : utilGancho}
                  utilCabeza={safeDivide(utilGancho, cabezasVenta)}
                  utilKg={safeDivide(utilGancho, pcf)}
                  margen={safeDivide(utilGancho * 100, costoTotalLote)}
                  accentColor={accentColor}
                />
              </div>
            </>
          )}

          {/* ── Escenario 3: Simulador de Rentabilidad Industrial ── */}
          {pcf > 0 && !sinDatosVenta && (
            <div style={{ background: 'var(--bg-secondary)', border: `1px solid ${industrialEsMejor ? goldColor + '55' : 'var(--border-subtle)'}`, borderRadius: '8px', overflow: 'hidden' }}>

              {/* Acordeón header */}
              <button
                onClick={() => setSimOpen(o => !o)}
                style={{ width: '100%', display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '14px 16px', background: industrialEsMejor ? goldColor + '10' : 'var(--bg-tertiary)', border: 'none', borderBottom: simOpen ? `1px solid ${industrialEsMejor ? goldColor + '33' : 'var(--border-subtle)'}` : 'none', cursor: 'pointer' }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
                  <span style={{ fontSize: '11px', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: industrialEsMejor ? goldColor : accentColor }}>
                    Simulador de Rentabilidad Industrial
                  </span>
                  <span style={{ fontSize: '10px', color: 'var(--text-tertiary)', background: 'var(--bg-primary)', padding: '1px 6px', borderRadius: '4px', border: '1px solid var(--border-subtle)' }}>
                    Escenario 3 — Despiece
                  </span>
                  {industrialEsMejor && (
                    <span style={{ fontSize: '10px', fontWeight: 700, color: goldColor, background: goldColor + '20', padding: '1px 8px', borderRadius: '4px', border: `1px solid ${goldColor}44` }}>
                      ★ Mayor rentabilidad
                    </span>
                  )}
                </div>
                <Icon name={simOpen ? 'chevronUp' : 'chevronDown'} size={14} style={{ color: 'var(--text-tertiary)', flexShrink: 0 }} />
              </button>

              {simOpen && (
                <div style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '20px' }}>

                  {/* 1. Barra visual de despiece */}
                  <div>
                    <div style={{ fontSize: '10px', fontWeight: 700, color: 'var(--text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '10px' }}>
                      Distribución de cortes sobre PCF ({pcf.toFixed(1)} kg canal fría)
                    </div>
                    <SimBarraDespiece pcf={pcf} />
                  </div>

                  {/* 2. Tabla de configuración */}
                  <div>
                    <div style={{ fontSize: '10px', fontWeight: 700, color: 'var(--text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '10px' }}>
                      Configuración de productos — ingresá precios y mermas térmicas
                    </div>

                    {/* Header */}
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 62px 72px 80px 62px 72px', gap: '4px 10px', marginBottom: '4px', padding: '0 2px' }}>
                      {['Producto', 'Kg base', 'Merma tér.', 'PVP Bs/kg', 'Kg final', 'Ingreso'].map(h => (
                        <span key={h} style={{ fontSize: '10px', fontWeight: 600, color: 'var(--text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>{h}</span>
                      ))}
                    </div>

                    {/* Filas de productos */}
                    {[
                      {
                        nombre: 'Jamón', corte: 'Pernil', color: CUT_COLORS.pernil,
                        kgBase: simKgPernil, hint: '15–25%',
                        mermaRaw: simMJamonRaw, setMerma: setSimMJamonRaw,
                        pvpRaw: simPvpJamonRaw, setPvp: setSimPvpJamonRaw,
                        kgFinal: simKgJamon, ingreso: simIngresoJamon,
                        tip: 'Merma del proceso de cocción/curado del jamón crudo a jamón curado.',
                      },
                      {
                        nombre: 'Chorizo', corte: simChuletaAChorizo ? 'Paleta + Chuleta' : 'Paleta', color: CUT_COLORS.paleta,
                        kgBase: simKgChorizoBase, hint: '8–12%',
                        mermaRaw: simMChorizoRaw, setMerma: setSimMChorizoRaw,
                        pvpRaw: simPvpChorizoRaw, setPvp: setSimPvpChorizoRaw,
                        kgFinal: simKgChorizo, ingreso: simIngresoChorizo,
                        tip: 'Merma por deshidratación y cocción en la elaboración de chorizo.',
                        routingBadge: simChuletaAChorizo ? { label: '+ Chuleta', color: CUT_COLORS.chuleta } : null,
                      },
                      ...(!simChuletaAChorizo ? [{
                        nombre: 'Chuleta Fresca', corte: 'Chuleta', color: CUT_COLORS.chuleta,
                        kgBase: simKgChuleta0, hint: 'Sin merma',
                        mermaRaw: null, setMerma: null,
                        pvpRaw: simPvpChuletaRaw, setPvp: setSimPvpChuletaRaw,
                        kgFinal: simKgChuletaFin, ingreso: simIngresoChuleta,
                        tip: 'Chuleta vendida como corte fresco sin procesamiento.',
                      }] : []),
                      {
                        nombre: 'Tocino', corte: 'Panceta', color: CUT_COLORS.panceta,
                        kgBase: simKgPanceta, hint: '10–15%',
                        mermaRaw: simMTocinoRaw, setMerma: setSimMTocinoRaw,
                        pvpRaw: simPvpTocinoRaw, setPvp: setSimPvpTocinoRaw,
                        kgFinal: simKgTocino, ingreso: simIngresoTocino,
                        tip: 'Merma por curado en seco y ahumado del tocino.',
                      },
                      {
                        nombre: 'Subproductos', corte: 'Subprod.', color: CUT_COLORS.subproductos,
                        kgBase: simKgSubprod, hint: 'Sin merma',
                        mermaRaw: null, setMerma: null,
                        pvpRaw: simPvpSubprodRaw, setPvp: setSimPvpSubprodRaw,
                        kgFinal: simKgSubprod, ingreso: simIngresoSubprod,
                        tip: 'Vísceras, recortes, patas y otros subproductos con valor de mercado.',
                      },
                    ].map((row, i, arr) => (
                      <div
                        key={row.nombre}
                        style={{ display: 'grid', gridTemplateColumns: '1fr 62px 72px 80px 62px 72px', gap: '4px 10px', alignItems: 'center', padding: '10px 2px', borderTop: i === 0 ? '1px solid var(--border-subtle)' : '1px solid var(--border-subtle)', borderBottom: i === arr.length - 1 ? 'none' : 'none' }}
                      >
                        {/* Producto */}
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '2px', minWidth: 0 }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                            <div style={{ width: '8px', height: '8px', borderRadius: '2px', background: row.color, flexShrink: 0 }} />
                            <span style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-primary)', whiteSpace: 'nowrap' }}>{row.nombre}</span>
                            {row.routingBadge && (
                              <span style={{ fontSize: '9px', fontWeight: 700, color: row.routingBadge.color, background: row.routingBadge.color + '22', padding: '1px 4px', borderRadius: '3px', border: `1px solid ${row.routingBadge.color}44` }}>
                                {row.routingBadge.label}
                              </span>
                            )}
                            {row.tip && <InfoTip text={row.tip} />}
                          </div>
                          <span style={{ fontSize: '10px', color: 'var(--text-tertiary)', paddingLeft: '14px' }}>{row.corte}</span>
                        </div>

                        {/* Kg base */}
                        <span style={{ fontFamily: 'IBM Plex Mono, monospace', fontSize: '11px', color: 'var(--text-secondary)' }}>
                          {row.kgBase.toFixed(1)}
                        </span>

                        {/* Merma térmica */}
                        {row.mermaRaw != null ? (
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '1px' }}>
                            <IMini raw={row.mermaRaw} setRaw={row.setMerma} accentColor={accentColor} placeholder="%" />
                            <span style={{ fontSize: '9px', color: 'var(--text-tertiary)', textAlign: 'right' }}>{row.hint}</span>
                          </div>
                        ) : (
                          <span style={{ fontFamily: 'IBM Plex Mono, monospace', fontSize: '11px', color: 'var(--text-tertiary)', textAlign: 'right' }}>—</span>
                        )}

                        {/* PVP */}
                        <IMini raw={row.pvpRaw} setRaw={row.setPvp} accentColor={accentColor} placeholder="Bs/kg" />

                        {/* Kg final */}
                        <span style={{ fontFamily: 'IBM Plex Mono, monospace', fontSize: '11px', color: 'var(--accent-success)', fontWeight: 600 }}>
                          {row.kgFinal.toFixed(1)}
                        </span>

                        {/* Ingreso */}
                        <span style={{ fontFamily: 'IBM Plex Mono, monospace', fontSize: '11px', color: row.ingreso > 0 ? 'var(--text-primary)' : 'var(--text-tertiary)', textAlign: 'right' }}>
                          {row.ingreso > 0 ? `Bs ${row.ingreso.toFixed(0)}` : '—'}
                        </span>
                      </div>
                    ))}

                    {/* Descarte (sin ingreso) */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '8px 2px', borderTop: '1px solid var(--border-subtle)', opacity: 0.6 }}>
                      <div style={{ width: '8px', height: '8px', borderRadius: '2px', background: CUT_COLORS.descarte, flexShrink: 0 }} />
                      <span style={{ fontSize: '11px', color: 'var(--text-tertiary)' }}>Descarte ({simKgDescarte.toFixed(1)} kg, 3.25%) — sin valor comercial</span>
                    </div>
                  </div>

                  {/* 3. Routing Chuleta */}
                  <div style={{ display: 'flex', alignItems: 'flex-start', gap: '8px', background: simChuletaAChorizo ? CUT_COLORS.chuleta + '12' : CUT_COLORS.chuleta + '08', borderRadius: '6px', padding: '10px 12px', border: `1px solid ${CUT_COLORS.chuleta}33` }}>
                    <Icon name="info" size={13} style={{ color: CUT_COLORS.chuleta, flexShrink: 0, marginTop: '1px' }} />
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '3px' }}>
                      <span style={{ fontSize: '12px', fontWeight: 600, color: CUT_COLORS.chuleta }}>
                        Chuleta ({simKgChuleta0.toFixed(1)} kg, 26% PCF) →{' '}
                        {simChuletaAChorizo ? 'Chorizo (mejor margen)' : 'Corte fresco (mejor margen)'}
                      </span>
                      <span style={{ fontSize: '11px', color: 'var(--text-tertiary)' }}>
                        Margen chorizo: Bs {simMargenChorizoChuleta.toFixed(2)}/kg · Margen corte fresco: Bs {simMargenChuletaFresca.toFixed(2)}/kg
                        {simPvpChorizo === 0 && ' · Ingresá el PVP del chorizo para comparar'}
                      </span>
                    </div>
                  </div>

                  {/* 4. Recomendación Inteligente */}
                  <div style={{
                    background: industrialEsMejor ? `linear-gradient(135deg, ${goldColor}12 0%, var(--accent-agro)08 100%)` : 'var(--bg-tertiary)',
                    border: `2px solid ${industrialEsMejor ? goldColor : 'var(--border-subtle)'}`,
                    borderRadius: '10px',
                    padding: '20px',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '16px',
                  }}>
                    {/* Encabezado */}
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <span style={{ fontSize: '22px', lineHeight: 1 }}>{industrialEsMejor ? '★' : '◇'}</span>
                        <div>
                          <div style={{ fontSize: '14px', fontWeight: 700, color: industrialEsMejor ? goldColor : 'var(--text-primary)' }}>
                            {industrialEsMejor ? 'Recomendación: Despiece Industrial' : 'Escenario: Despiece Industrial'}
                          </div>
                          <div style={{ fontSize: '11px', color: 'var(--text-tertiary)', marginTop: '2px' }}>
                            Mix: Jamón · Chorizo {simChuletaAChorizo ? '(+Chuleta)' : ''} · Tocino · {simChuletaAChorizo ? 'Subproductos' : 'Chuleta Fresca · Subproductos'}
                          </div>
                        </div>
                      </div>
                      {industrialEsMejor && (
                        <span style={{ padding: '4px 12px', borderRadius: '6px', fontSize: '12px', fontWeight: 700, color: goldColor, background: goldColor + '20', border: `1px solid ${goldColor}55` }}>
                          ★ Mayor rentabilidad
                        </span>
                      )}
                    </div>

                    {/* Métricas principales */}
                    <div className="sim-config-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '10px' }}>
                      {[
                        { label: 'Ingreso total',    value: simTotalIngreso,                        isUtil: false },
                        { label: 'Costo + gastos',   value: costoTotalLote + gastosGanchoTotal,     isUtil: false },
                        { label: 'Utilidad neta',    value: simUtilidad,                            isUtil: true  },
                      ].map((s, i) => (
                        <div key={i} style={{ background: 'var(--bg-secondary)', borderRadius: '6px', padding: '12px 14px' }}>
                          <div style={{ fontSize: '10px', color: 'var(--text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '5px' }}>{s.label}</div>
                          <div style={{ fontFamily: 'IBM Plex Mono, monospace', fontSize: '14px', fontWeight: 600, color: s.isUtil ? (simUtilidad >= 0 ? 'var(--accent-success)' : 'var(--accent-danger)') : 'var(--text-primary)' }}>
                            {simTotalIngreso > 0 ? `Bs ${s.value.toLocaleString('es-BO', { minimumFractionDigits: 0 })}` : '—'}
                          </div>
                        </div>
                      ))}
                    </div>

                    {/* Comparación vs E1 y E2 */}
                    {simTotalIngreso > 0 && (
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px 20px', borderTop: `1px solid ${industrialEsMejor ? goldColor + '30' : 'var(--border-subtle)'}`, paddingTop: '14px' }}>
                        {[
                          { label: 'vs. Venta en Pie',    diff: simUtilidad - utilPie },
                          { label: 'vs. Venta en Gancho', diff: simUtilidad - utilGancho },
                          { label: 'Utilidad/cabeza',     diff: null, val: cabezasVenta > 0 ? simUtilidad / cabezasVenta : null, isCabeza: true },
                        ].map(({ label, diff, val, isCabeza }, i) => (
                          <div key={i} style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                            <span style={{ fontSize: '10px', color: 'var(--text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>{label}</span>
                            {isCabeza ? (
                              <span style={{ fontFamily: 'IBM Plex Mono, monospace', fontSize: '13px', fontWeight: 600, color: val != null && val >= 0 ? 'var(--accent-success)' : 'var(--accent-danger)' }}>
                                {val != null ? `Bs ${val.toFixed(0)}` : '—'}
                              </span>
                            ) : (
                              <span style={{ fontFamily: 'IBM Plex Mono, monospace', fontSize: '13px', fontWeight: 600, color: diff >= 0 ? 'var(--accent-success)' : 'var(--accent-danger)' }}>
                                {diff >= 0 ? '+' : ''}Bs {diff.toLocaleString('es-BO', { minimumFractionDigits: 0 })}
                              </span>
                            )}
                          </div>
                        ))}
                      </div>
                    )}

                    {simTotalIngreso === 0 && (
                      <div style={{ fontSize: '12px', color: 'var(--text-tertiary)', fontStyle: 'italic' }}>
                        Ingresá los precios de venta de los productos para ver la comparación.
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ICA */}
          {hayDatosAlimento ? (
            <div style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border-subtle)', borderRadius: '8px', padding: '16px' }}>
              <div style={{ fontSize: '11px', fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase', color: accentColor, marginBottom: '12px' }}>Conversión alimenticia del lote</div>
              <div className="liquidacion-ica-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '12px', marginBottom: '12px' }}>
                {[
                  { label: 'Alimento consumido (Bs)',  val: `Bs ${alimentoConsumido.toFixed(0)}` },
                  { label: 'Ganancia de peso total',   val: `${gananciaTotal.toFixed(0)} kg` },
                  { label: 'Índice conversión (ICA)',  val: `${ica} kg/kg`, highlight: true },
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

          <button
            onClick={() => { setConfirmError(null); setShowConfirm(true); }}
            style={{ padding: '14px', borderRadius: '8px', border: `2px solid ${accentColor}`, background: accentColor, color: '#fff', cursor: 'pointer', fontSize: '14px', fontWeight: 500, fontFamily: 'IBM Plex Sans, sans-serif', transition: 'all 0.15s', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}
          >
            <Icon name="checkSquare" size={16} /> Registrar liquidación y cerrar lote
          </button>
        </div>
      </div>

      {/* Modal de confirmación */}
      {showConfirm && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', zIndex: 300, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border-mid)', borderRadius: '10px', padding: '28px 32px', width: '440px', maxWidth: 'calc(100vw - 32px)', display: 'flex', flexDirection: 'column', gap: '16px' }}>
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
              El lote <strong style={{ color: 'var(--text-primary)' }}>#{loteData?.id}</strong> se moverá al historial con escenario{' '}
              <strong style={{ color: accentColor }}>
                {mejorEscenario === 'despiece' ? 'Despiece Industrial' : mejorEscenario === 'gancho' ? 'Venta Gancho' : 'Venta en Pie'}
              </strong>
              {mejorEscenario === 'despiece' && simTotalIngreso > 0 && (
                <span> · Mix: Jamón/Chorizo/Tocino{simChuletaAChorizo ? '' : '/Chuleta Fresca'}</span>
              )}
              . Mermas: Ayuno {mermaAyuno}%, Frío {mermaFrio}%, Desposte {mermaDesposte}%. Esta acción no se puede deshacer.
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
