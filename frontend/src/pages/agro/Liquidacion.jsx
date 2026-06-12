import React, { useState, useEffect, useRef } from 'react';
import { Icon } from '../../icons.jsx';
import { apiFetch } from '../../config/api.js';
import { Btn, StatusBadge, RubroBadge, InfoBanner, InfoTip } from '../../components/ui.jsx';
import { GuidedTour } from '../../components/GuidedTour.jsx';

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

// Distribución estándar de despiece sobre PCF (cerdo). Cada empresa puede
// editar los porcentajes, renombrarlos, recolorearlos y agregar o quitar cortes;
// se persiste por negocio en localStorage.
const CORTES_DEFAULT = [
  { id: 'pernil',       label: 'Pernil',       color: CUT_COLORS.pernil,       pct: 20    },
  { id: 'chuleta',      label: 'Chuleta',      color: CUT_COLORS.chuleta,      pct: 26    },
  { id: 'paleta',       label: 'Paleta',       color: CUT_COLORS.paleta,       pct: 18    },
  { id: 'panceta',      label: 'Panceta',      color: CUT_COLORS.panceta,      pct: 10    },
  { id: 'subproductos', label: 'Subproductos', color: CUT_COLORS.subproductos, pct: 22.75 },
  { id: 'descarte',     label: 'Descarte',     color: CUT_COLORS.descarte,     pct: 3.25  },
];

// Paleta sugerida para cortes nuevos creados por el usuario.
const CORTES_EXTRA_COLORS = ['#16a085', '#27ae60', '#d35400', '#c0392b', '#8e44ad', '#2980b9', '#f39c12', '#7f8c8d'];

// ── Productos del simulador industrial ───────────────────────
// Cada producto se elabora a partir de un corte primario y opcionalmente
// puede aceptar otro corte como "alternativa". El motor de routing asigna
// cada corte al producto con MAYOR margen entre los candidatos. Esto
// generaliza el viejo caso chuleta → chorizo a cualquier ruta definida.
const PRODUCTOS_DEFAULT = [
  { id: 'jamon',     nombre: 'Jamón',          corteId: 'pernil',       mermaTermicaPct: '20', pvp: '18', hintMerma: '15–25%', tip: 'Merma del proceso de cocción/curado del jamón crudo a jamón curado.' },
  { id: 'chorizo',   nombre: 'Chorizo',        corteId: 'paleta',       mermaTermicaPct: '10', pvp: '22', hintMerma: '8–12%',  tip: 'Merma por deshidratación y cocción en la elaboración de chorizo.', alternativaCorteId: 'chuleta' },
  { id: 'chuleta_f', nombre: 'Chuleta Fresca', corteId: 'chuleta',      mermaTermicaPct: '0',  pvp: '28', hintMerma: 'Sin merma', tip: 'Chuleta vendida como corte fresco sin procesamiento.' },
  { id: 'tocino',    nombre: 'Tocino',         corteId: 'panceta',      mermaTermicaPct: '12', pvp: '16', hintMerma: '10–15%', tip: 'Merma por curado en seco y ahumado del tocino.' },
  { id: 'subprod',   nombre: 'Subproductos',   corteId: 'subproductos', mermaTermicaPct: '0',  pvp: '8',  hintMerma: 'Sin merma', tip: 'Vísceras, recortes, patas y otros subproductos con valor de mercado.' },
];

// ── Persistencia de defaults de liquidación por negocio ─────
// Guarda PVPs y mermas en localStorage para que el usuario no tenga que
// reingresarlos cada vez que abre el módulo.
const liquidacionDefaultsKey = (negId) => `liquidacion_defaults_${negId}`;

const loadLiquidacionDefaults = (negId) => {
  if (typeof window === 'undefined' || !negId) return {};
  try {
    return JSON.parse(localStorage.getItem(liquidacionDefaultsKey(negId)) || '{}');
  } catch { return {}; }
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


// ── Barra de kg (kilos iniciales / perdidos / útiles) ─────────
const KgBreakdown = ({ label, kgInicio, kgMerma, kgUtil, mermaNombre, accentColor }) => {
  if (!kgInicio) return null;
  const tieneMerma = kgMerma > 0;
  const pctMerma = tieneMerma ? (kgMerma / kgInicio) * 100 : 0;
  const filas = [
    { l: 'Kilos iniciales',         v: kgInicio, c: 'var(--text-primary)' },
    ...(tieneMerma ? [{ l: `Merma ${mermaNombre}`, v: -kgMerma, c: 'var(--accent-danger)', icon: '▼' }] : []),
    { l: 'Kilos útiles para venta', v: kgUtil,   c: 'var(--accent-success)', bold: true },
  ];
  return (
    <div style={{ background: 'var(--bg-tertiary)', borderRadius: '6px', padding: '10px 12px', display: 'flex', flexDirection: 'column', gap: '6px', marginBottom: '2px' }}>
      <div style={{ fontSize: '10px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.07em', color: 'var(--text-tertiary)', marginBottom: '2px' }}>
        Desglose de kilos — {label}
      </div>
      {filas.map((r, i) => (
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
const SimBarraDespiece = ({ pcf, cortes }) => {
  if (!cortes.length) {
    return (
      <div style={{ padding: '14px', textAlign: 'center', fontSize: '12px', color: 'var(--text-tertiary)', background: 'var(--bg-tertiary)', borderRadius: '6px' }}>
        No hay cortes definidos — agregá al menos uno desde el editor.
      </div>
    );
  }
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
      <div style={{ height: '40px', display: 'flex', borderRadius: '6px', overflow: 'hidden', border: '1px solid var(--border-subtle)' }}>
        {cortes.map(c => (
          <div
            key={c.id}
            style={{ flex: c.pct, background: c.color, display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden', minWidth: 0 }}
            title={`${c.label}: ${c.pct.toFixed(2)}%${pcf > 0 ? ` = ${(pcf * c.pct / 100).toFixed(1)} kg` : ''}`}
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
          <div key={c.id} style={{ display: 'flex', alignItems: 'center', gap: '5px', fontSize: '11px' }}>
            <div style={{ width: '10px', height: '10px', borderRadius: '2px', background: c.color, flexShrink: 0 }} />
            <span style={{ color: 'var(--text-secondary)' }}>{c.label}</span>
            <span style={{ fontFamily: 'IBM Plex Mono, monospace', color: 'var(--text-tertiary)', fontSize: '10px' }}>
              {c.pct.toFixed(2).replace(/\.?0+$/, '')}%{pcf > 0 ? ` · ${(pcf * c.pct / 100).toFixed(1)} kg` : ''}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
};

// ── Comparador unificado de escenarios (tabla 3 columnas) ─────
const ComparadorEscenarios = ({
  escenariosMeta, mejorEscenario,
  costoTotalLote, cabezasVenta,
  kgAyuno, kgFrio, pvGranja, pcc,
  accentColor, goldColor,
}) => {
  // Filas con los datos por escenario. Cada fila define cómo extraer
  // el valor de cada escenario y cómo formatearlo.
  const fmtKg  = (v) => v == null ? '—' : `${v.toFixed(1)} kg`;
  const fmtBs  = (v) => v == null ? '—' : `Bs ${Math.round(v).toLocaleString('es-BO')}`;
  const fmtBs2 = (v) => v == null ? '—' : `Bs ${v.toFixed(2)}`;
  const fmtPct = (v) => v == null ? '—' : `${v.toFixed(0)}%`;

  const colorUtil = (v) => v == null ? 'var(--text-tertiary)' : (v >= 0 ? 'var(--accent-success)' : 'var(--accent-danger)');

  const filas = [
    {
      label: 'Kilos útiles',
      tip: 'Peso neto que efectivamente se vende en cada escenario, tras descontar mermas.',
      vals: escenariosMeta.map(e => ({ txt: fmtKg(e.kgUtil) })),
    },
    {
      label: 'Costo / kg',
      tip: 'Costo total del lote ÷ kilos útiles. En despiece se calcula sobre PCF.',
      vals: escenariosMeta.map(e => ({ txt: fmtBs2(e.costoKg) })),
    },
    {
      label: 'Ingreso bruto',
      tip: 'Total facturado antes de descontar costos.',
      vals: escenariosMeta.map(e => ({ txt: fmtBs(e.ingreso) })),
    },
    {
      label: 'Costo del lote',
      tip: 'Costo acumulado: insumos, alimento, sanidad, mano de obra y CIF.',
      vals: escenariosMeta.map(() => ({ txt: fmtBs(costoTotalLote) })),
    },
    {
      label: 'Gastos de venta',
      tip: 'Transporte, comisión, faena (gancho/despiece) y otros.',
      vals: escenariosMeta.map(e => ({ txt: fmtBs(e.gastos) })),
    },
    {
      label: 'Utilidad neta',
      tip: 'Ingreso bruto − costo del lote − gastos de venta.',
      big: true,
      vals: escenariosMeta.map(e => ({ txt: fmtBs(e.utilidad), color: colorUtil(e.utilidad) })),
    },
    {
      label: 'Utilidad / cabeza',
      tip: 'Utilidad neta dividida por cabezas vendidas. Permite comparar lotes de distinto tamaño.',
      vals: escenariosMeta.map(e => ({ txt: fmtBs(e.utilCabeza), color: colorUtil(e.utilCabeza) })),
    },
    {
      label: 'Utilidad / kg',
      tip: 'Utilidad neta por kg útil vendido. Indicador de eficiencia comercial por unidad.',
      vals: escenariosMeta.map(e => ({ txt: fmtBs2(e.utilKg), color: colorUtil(e.utilKg) })),
    },
    {
      label: 'Margen s/ costo',
      tip: '(utilidad neta ÷ costo total) × 100. > 0% indica ganancia.',
      vals: escenariosMeta.map(e => ({ txt: fmtPct(e.margen), color: colorUtil(e.margen) })),
    },
  ];

  // Subheader con kg iniciales + merma (solo para pie/gancho; despiece comparte PCF con gancho)
  const subheader = [
    pvGranja > 0 ? `${pvGranja.toFixed(0)} kg vivos${kgAyuno > 0 ? ` − ${kgAyuno.toFixed(1)} kg ayuno` : ''}` : null,
    pcc > 0     ? `${pcc.toFixed(0)} kg canal${kgFrio > 0 ? ` − ${kgFrio.toFixed(1)} kg frío` : ''}` : null,
    pcc > 0     ? 'Mismo PCF que Gancho' : null,
  ];

  return (
    <div style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border-subtle)', borderRadius: '8px', overflow: 'hidden' }}>
      <div style={{ overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontFamily: 'IBM Plex Sans, sans-serif', minWidth: '560px' }}>
          <thead>
            <tr>
              <th style={{ textAlign: 'left', padding: '12px 16px', fontSize: '10px', fontWeight: 600, color: 'var(--text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.08em', background: 'var(--bg-tertiary)', borderBottom: '1px solid var(--border-subtle)' }}>
                Métrica
              </th>
              {escenariosMeta.map(e => {
                const isRec = e.id === mejorEscenario && e.utilidad != null && e.utilidad >= 0;
                const hlColor = e.id === 'despiece' ? goldColor : accentColor;
                return (
                  <th key={e.id} style={{
                    textAlign: 'right',
                    padding: '12px 16px',
                    fontSize: '11px',
                    fontWeight: 700,
                    color: isRec ? hlColor : 'var(--text-secondary)',
                    background: isRec ? `color-mix(in srgb, ${e.id === 'despiece' ? goldColor : '#16a34a'} 10%, var(--bg-tertiary))` : 'var(--bg-tertiary)',
                    borderBottom: `2px solid ${isRec ? hlColor : 'var(--border-subtle)'}`,
                    whiteSpace: 'nowrap',
                  }}>
                    <div>{e.label}</div>
                    {isRec && (
                      <div style={{ fontSize: '9px', fontWeight: 700, marginTop: '2px', letterSpacing: '0.06em' }}>
                        ★ MAYOR UTILIDAD
                      </div>
                    )}
                  </th>
                );
              })}
            </tr>
            {subheader.some(Boolean) && (
              <tr>
                <td style={{ padding: '6px 16px', fontSize: '10px', color: 'var(--text-tertiary)', background: 'var(--bg-tertiary)', borderBottom: '1px solid var(--border-subtle)' }}>
                  Cascada
                </td>
                {subheader.map((s, i) => (
                  <td key={i} style={{ padding: '6px 16px', fontSize: '10px', color: 'var(--text-tertiary)', textAlign: 'right', background: 'var(--bg-tertiary)', borderBottom: '1px solid var(--border-subtle)', fontFamily: 'IBM Plex Mono, monospace', whiteSpace: 'nowrap' }}>
                    {s || '—'}
                  </td>
                ))}
              </tr>
            )}
          </thead>
          <tbody>
            {filas.map((f, ri) => (
              <tr key={ri}>
                <td style={{ padding: f.big ? '14px 16px' : '8px 16px', fontSize: '12px', borderBottom: '1px solid var(--border-subtle)' }}>
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: '5px', color: f.big ? 'var(--text-primary)' : 'var(--text-secondary)', fontWeight: f.big ? 600 : 400 }}>
                    {f.label}
                    {f.tip && <InfoTip text={f.tip} />}
                  </span>
                </td>
                {f.vals.map((v, ci) => {
                  const isRecCol = escenariosMeta[ci].id === mejorEscenario && escenariosMeta[ci].utilidad != null && escenariosMeta[ci].utilidad >= 0;
                  const hlColor = escenariosMeta[ci].id === 'despiece' ? goldColor : accentColor;
                  return (
                    <td key={ci} style={{
                      padding: f.big ? '14px 16px' : '8px 16px',
                      textAlign: 'right',
                      borderBottom: '1px solid var(--border-subtle)',
                      background: isRecCol ? `color-mix(in srgb, ${escenariosMeta[ci].id === 'despiece' ? goldColor : '#16a34a'} 4%, transparent)` : 'transparent',
                      borderLeft: isRecCol ? `2px solid color-mix(in srgb, ${escenariosMeta[ci].id === 'despiece' ? goldColor : '#16a34a'} 30%, transparent)` : 'none',
                      borderRight: isRecCol ? `2px solid color-mix(in srgb, ${escenariosMeta[ci].id === 'despiece' ? goldColor : '#16a34a'} 30%, transparent)` : 'none',
                    }}>
                      <span style={{
                        fontFamily: 'IBM Plex Mono, monospace',
                        fontSize: f.big ? '14px' : '12px',
                        fontWeight: f.big ? 700 : 500,
                        color: v.color || (isRecCol ? hlColor : 'var(--text-primary)'),
                        whiteSpace: 'nowrap',
                      }}>
                        {v.txt}
                      </span>
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

// ═════════════════════════════════════════════════════════════
// PÁGINA PRINCIPAL
// ═════════════════════════════════════════════════════════════
const Liquidacion = ({ negocioId, activeLote, onNavigate, setActiveLote }) => {
  const accentColor = 'var(--accent-agro)';

  // ── Lotes ──
  const [lotes, setLotes] = useState([]);
  const [selectedLoteUuid, setSelectedLoteUuid] = useState(activeLote?._id || null);
  const [refetchLotes, setRefetchLotes] = useState(0); // bump para forzar refetch

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
  }, [negocioId, refetchLotes]);

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

  // ── Defaults persistidos por negocio (PVPs, mermas, gastos) ─
  // Se leen una sola vez en el primer render; los useState los toman como
  // valor inicial. Cuando el usuario los modifica, un useEffect más abajo
  // los reescribe a localStorage.
  const defaultsRef = useRef(null);
  if (defaultsRef.current === null) {
    defaultsRef.current = loadLiquidacionDefaults(negocioId);
  }
  const d = defaultsRef.current;

  // ── Inputs principales ──
  const [cabezasVentaRaw, setCabezasVentaRaw]         = useState('0');
  const [pesoPromFinalRaw, setPesoPromFinalRaw]       = useState(d.pesoPromFinal       ?? '95');
  const [rendimientoCanalRaw, setRendimientoCanalRaw] = useState(d.rendimientoCanal    ?? '75');
  const [transporteRaw, setTransporteRaw]             = useState(d.transporte          ?? '350');
  const [comisionRaw, setComisionRaw]                 = useState(d.comision            ?? '0');
  const [faenaRaw, setFaenaRaw]                       = useState(d.faena               ?? '480');
  const [otrosGastosRaw, setOtrosGastosRaw]           = useState(d.otrosGastos         ?? '0');
  const [pvpPieRaw, setPvpPieRaw]                     = useState(d.pvpPie              ?? '22');
  const [pvpGanchoRaw, setPvpGanchoRaw]               = useState(d.pvpGancho           ?? '32');

  // ── Mermas de la cascada (ayuno/transporte + frío) ──
  const [mermaAyunoRaw, setMermaAyunoRaw] = useState(d.mermaAyuno ?? '0');
  const [mermaFrioRaw, setMermaFrioRaw]   = useState(d.mermaFrio  ?? '0');

  // ── Simulador Industrial (Escenario 3) ──
  const [simOpen, setSimOpen] = useState(true);

  // Productos del simulador: lista dinámica con persistencia por negocio.
  const productosStorageKey = negocioId ? `liquidacion_productos_${negocioId}` : null;
  const [productosList, setProductosList] = useState(() => {
    const fallback = PRODUCTOS_DEFAULT.map(p => ({ ...p }));
    if (typeof window === 'undefined' || !productosStorageKey) return fallback;
    try {
      const saved = JSON.parse(localStorage.getItem(productosStorageKey) || 'null');
      if (Array.isArray(saved) && saved.every(p => p && p.id)) {
        return saved.map(p => ({
          id:                String(p.id),
          nombre:            String(p.nombre || 'Sin nombre'),
          corteId:           String(p.corteId || ''),
          alternativaCorteId: p.alternativaCorteId ? String(p.alternativaCorteId) : undefined,
          mermaTermicaPct:   String(p.mermaTermicaPct ?? 0),
          pvp:               String(p.pvp ?? 0),
          hintMerma:         p.hintMerma || '',
          tip:               p.tip || '',
        }));
      }
    } catch { /* ignore */ }
    return fallback;
  });
  const [editProductos, setEditProductos] = useState(false);
  // Set de IDs de productos colapsados (vista compacta de una sola línea)
  const [productosColapsados, setProductosColapsados] = useState(() => new Set());
  const toggleColapsarProducto = (id) => {
    setProductosColapsados(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };
  const colapsarTodos  = () => setProductosColapsados(new Set(productosList.map(p => p.id)));
  const expandirTodos  = () => setProductosColapsados(new Set());
  const todosColapsados = productosList.length > 0 && productosList.every(p => productosColapsados.has(p.id));

  useEffect(() => {
    if (!productosStorageKey) return;
    try { localStorage.setItem(productosStorageKey, JSON.stringify(productosList)); } catch { /* ignore */ }
  }, [productosList, productosStorageKey]);

  const updateProducto = (id, patch) => {
    setProductosList(prev => prev.map(p => p.id === id ? { ...p, ...patch } : p));
  };
  const removeProducto = (id) => {
    setProductosList(prev => prev.filter(p => p.id !== id));
  };
  const addProducto = () => {
    const id = `prod_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
    const primerCorte = (cortesList || []).find(c => c.id !== 'descarte')?.id || '';
    setProductosList(prev => [...prev, {
      id, nombre: 'Nuevo producto', corteId: primerCorte,
      mermaTermicaPct: '0', pvp: '0',
    }]);
  };
  const resetProductos = () => {
    setProductosList(PRODUCTOS_DEFAULT.map(p => ({ ...p })));
  };

  // ── Escritura de defaults principales (inputs no-simulador) ──
  // Los productos del simulador tienen su propia clave (productosStorageKey).
  useEffect(() => {
    if (!negocioId) return;
    try {
      localStorage.setItem(liquidacionDefaultsKey(negocioId), JSON.stringify({
        pesoPromFinal:    pesoPromFinalRaw,
        rendimientoCanal: rendimientoCanalRaw,
        transporte:       transporteRaw,
        comision:         comisionRaw,
        faena:            faenaRaw,
        otrosGastos:      otrosGastosRaw,
        pvpPie:           pvpPieRaw,
        pvpGancho:        pvpGanchoRaw,
        mermaAyuno:       mermaAyunoRaw,
        mermaFrio:        mermaFrioRaw,
      }));
    } catch { /* localStorage lleno o bloqueado: ignorar */ }
  }, [
    negocioId, pesoPromFinalRaw, rendimientoCanalRaw,
    transporteRaw, comisionRaw, faenaRaw, otrosGastosRaw,
    pvpPieRaw, pvpGanchoRaw, mermaAyunoRaw, mermaFrioRaw,
  ]);

  // Distribución de cortes configurable por empresa (persistida por negocio).
  // Estructura: array de { id, label, color, pct (string en estado raw) }.
  const cortesStorageKey = negocioId ? `cortes_pcf_${negocioId}` : null;
  const [cortesList, setCortesList] = useState(() => {
    const fallback = CORTES_DEFAULT.map(c => ({ ...c, pct: String(c.pct) }));
    if (typeof window === 'undefined' || !cortesStorageKey) return fallback;
    try {
      const saved = JSON.parse(localStorage.getItem(cortesStorageKey) || 'null');
      // Formato nuevo: array
      if (Array.isArray(saved) && saved.every(c => c && c.id)) {
        return saved.map(c => ({
          id:    String(c.id),
          label: String(c.label || c.id),
          color: c.color || '#78909c',
          pct:   String(c.pct ?? 0),
        }));
      }
      // Migración del formato viejo: objeto { pernil: 20, chuleta: 26, ... }
      if (saved && typeof saved === 'object') {
        return CORTES_DEFAULT.map(c => ({ ...c, pct: String(saved[c.id] ?? c.pct) }));
      }
    } catch { /* ignore */ }
    return fallback;
  });
  const [editCortes, setEditCortes] = useState(false);

  useEffect(() => {
    if (!cortesStorageKey) return;
    try { localStorage.setItem(cortesStorageKey, JSON.stringify(cortesList)); } catch { /* ignore */ }
  }, [cortesList, cortesStorageKey]);

  // Vista derivada con pct numérico saneado para los cálculos
  const cortesNum = cortesList.map(c => ({ ...c, pct: Math.max(0, parseFloat(c.pct) || 0) }));
  const cortesById = Object.fromEntries(cortesNum.map(c => [c.id, c]));
  const getCortePct = (id) => cortesById[id]?.pct ?? 0;
  const getCorteKg = (id) => pcf * (getCortePct(id) / 100);
  const cortesSum = cortesNum.reduce((a, c) => a + c.pct, 0);
  const cortesValid = Math.abs(cortesSum - 100) < 0.05;

  const resetCortes = () => {
    setCortesList(CORTES_DEFAULT.map(c => ({ ...c, pct: String(c.pct) })));
  };

  const addCorte = () => {
    const usedColors = new Set(cortesList.map(c => c.color));
    const color = CORTES_EXTRA_COLORS.find(c => !usedColors.has(c)) || CORTES_EXTRA_COLORS[cortesList.length % CORTES_EXTRA_COLORS.length];
    const id = `corte_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
    setCortesList(prev => [...prev, { id, label: 'Nuevo corte', color, pct: '0' }]);
  };

  const updateCorte = (id, patch) => {
    setCortesList(prev => prev.map(c => c.id === id ? { ...c, ...patch } : c));
  };

  const removeCorte = (id) => {
    setCortesList(prev => prev.filter(c => c.id !== id));
  };

  // ── Confirm / liquidar ──
  const [showConfirm, setShowConfirm] = useState(false);
  const [liquidando, setLiquidando] = useState(false);
  const [confirmError, setConfirmError] = useState(null);

  // ── Escenario elegido para la liquidación final ──
  // Se inicializa siguiendo la recomendación automática. Cuando el usuario
  // hace clic en una opción distinta, queda fijado a su elección hasta que
  // recargue la página o presione "Volver a recomendación".
  const [escenarioElegido, setEscenarioElegido] = useState('pie');
  const [escenarioTocado, setEscenarioTocado]   = useState(false);

  // ── Liquidación parcial ──
  // Cuando el usuario vende menos cabezas de las activas, puede elegir si
  // el lote se cierra completo (cabezas restantes se pierden de tracking)
  // o si se mantiene activo con las cabezas remanentes.
  const [mantenerActivo, setMantenerActivo] = useState(false);

  // ── Tour guiado ──
  const [tourActivo, setTourActivo] = useState(false);
  // Auto-trigger la primera vez que se entra al módulo en este negocio.
  useEffect(() => {
    if (!negocioId) return;
    const key = `liquidacion_tour_visto_${negocioId}`;
    try {
      if (!localStorage.getItem(key)) {
        setTourActivo(true);
        localStorage.setItem(key, '1');
      }
    } catch { /* ignore */ }
  }, [negocioId]);

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
  const mermaAyuno      = Math.max(0, Math.min(15, parseFloat(mermaAyunoRaw) || 0));
  const mermaFrio       = Math.max(0, Math.min(10, parseFloat(mermaFrioRaw)  || 0));

  // ── Cascada de pesos ──────────────────────────────────────
  // PV granja → (- merma ayuno/transporte) → PV ayunado
  //           → (× rend. canal) → PCC (canal caliente)
  //           → (- merma frío)  → PCF (canal fría = peso útil para venta)
  const pvGranja  = cabezasVenta * pesoPromFinal;
  const kgAyuno   = pvGranja * (mermaAyuno / 100);
  const pvAyunado = pvGranja - kgAyuno;
  const pcc       = pvAyunado * (rendimientoCanal / 100);
  const kgFrio    = pcc * (mermaFrio / 100);
  const pcf       = pcc - kgFrio;
  const pesoUtil  = pcf;
  const kgDesposte = 0;

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

  // ── Simulador Industrial: motor de cálculo con productos dinámicos ──
  const costoKgCrudo = pcf > 0 ? costoTotalLote / pcf : 0;
  const simKgDescarte = getCorteKg('descarte');

  // Vista derivada saneada de los productos
  const productosNum = productosList.map(p => ({
    ...p,
    pvpNum:   parseFloat(p.pvp) || 0,
    mermaNum: Math.max(0, Math.min(100, parseFloat(p.mermaTermicaPct) || 0)),
  }));

  // Routing: para cada corte, asignarlo al producto con MAYOR margen entre
  // los que lo declaran como corte primario o como alternativa.
  // Margen por kg = pvp × (1 − merma_térmica) − costo_kg_crudo
  const margenKgProducto = (p) => p.pvpNum * (1 - p.mermaNum / 100) - costoKgCrudo;

  const corteAsignaciones = {}; // corteId → productoId
  for (const corte of cortesNum) {
    if (corte.id === 'descarte') continue; // descarte no se vende
    const candidatos = productosNum.filter(p =>
      p.corteId === corte.id || p.alternativaCorteId === corte.id
    );
    if (candidatos.length === 0) continue;
    candidatos.sort((a, b) => margenKgProducto(b) - margenKgProducto(a));
    corteAsignaciones[corte.id] = candidatos[0].id;
  }

  // Cálculos por producto: kg base = suma de los cortes asignados.
  const productosConCalculos = productosNum.map(p => {
    const cortesAsignados = Object.entries(corteAsignaciones)
      .filter(([, pid]) => pid === p.id)
      .map(([cid]) => cid);
    const cortesActivos = cortesAsignados.map(cid => cortesById[cid]).filter(Boolean);
    const kgBase  = cortesActivos.reduce((s, c) => s + (pcf * c.pct / 100), 0);
    const kgFinal = kgBase * (1 - p.mermaNum / 100);
    const ingreso = kgFinal * p.pvpNum;
    const corteDeclarado = cortesById[p.corteId];
    const disponible = cortesAsignados.length > 0;
    return {
      ...p,
      cortesAsignados,
      cortesActivos,
      kgBase, kgFinal, ingreso,
      // Sensibilidad: cuánto cambia la utilidad si subo 1 Bs/kg el PVP
      deltaUtilPor1BsPvp: kgFinal,
      corteLabel: cortesActivos.length
        ? cortesActivos.map(c => c.label).join(' + ')
        : (corteDeclarado?.label || '—'),
      corteColor: cortesActivos[0]?.color || corteDeclarado?.color || '#888',
      disponible,
      // Para mostrar rerouting: el corte primario perdió frente a otro producto
      perdioCortePrimario: !!cortesById[p.corteId] && !cortesAsignados.includes(p.corteId),
    };
  });

  const simTotalIngreso = productosConCalculos.reduce((s, p) => s + p.ingreso, 0);
  const simUtilidad     = simTotalIngreso - costoTotalLote - gastosGanchoTotal;

  // Detectar reroutings activos (corte X asignado a un producto distinto del primario)
  const reroutings = [];
  for (const corte of cortesNum) {
    const asignadoA = corteAsignaciones[corte.id];
    if (!asignadoA) continue;
    const productoAsignado = productosNum.find(p => p.id === asignadoA);
    const productoPrimario = productosNum.find(p => p.corteId === corte.id);
    if (productoPrimario && productoPrimario.id !== asignadoA) {
      reroutings.push({
        corte,
        productoPrimario,
        productoAsignado,
        margenPrimario: margenKgProducto(productoPrimario),
        margenAsignado: margenKgProducto(productoAsignado),
      });
    }
  }

  // Cortes que no tienen ningún producto que los reciba (informativos)
  const cortesSinProducto = cortesNum.filter(c => c.id !== 'descarte' && !corteAsignaciones[c.id]);

  // Snapshot para guardar en liquidación
  const cortesSnapshot = Object.fromEntries(cortesNum.map(c => [c.id, c.pct]));

  const simMixProduccion = {
    distribucion_cortes_pct: cortesSnapshot,
    distribucion_cortes_full: cortesNum.map(c => ({ id: c.id, label: c.label, pct: c.pct })),
    productos: productosConCalculos
      .filter(p => p.disponible)
      .map(p => ({
        id: p.id,
        nombre: p.nombre,
        corte: p.corteLabel,
        cortes_asignados: p.cortesAsignados,
        yield_pcf_pct: p.cortesActivos.reduce((s, c) => s + c.pct, 0),
        merma_termica_pct: p.mermaNum,
        kg_base: p.kgBase,
        kg_final: p.kgFinal,
        pvp: p.pvpNum,
        ingreso: p.ingreso,
      })),
    reroutings: reroutings.map(r => ({
      corte_id: r.corte.id,
      corte_label: r.corte.label,
      producto_primario_id: r.productoPrimario.id,
      producto_asignado_id: r.productoAsignado.id,
      margen_primario: r.margenPrimario,
      margen_asignado: r.margenAsignado,
    })),
    total_ingreso: simTotalIngreso,
    utilidad_neta: simUtilidad,
  };

  // Cortes "extra" sin producto asociado (informativos para la UI)
  const cortesExtra = cortesSinProducto;

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

  // ── Sincronización del escenario elegido con la recomendación ──
  // Si el usuario no eligió manualmente, seguimos al cálculo automático.
  useEffect(() => {
    if (!escenarioTocado) setEscenarioElegido(mejorEscenario);
  }, [mejorEscenario, escenarioTocado]);

  // ── Punto de equilibrio: PVP mínimo para cubrir costos ──
  // Pie:    (costo + gastos venta)             / pv ayunado
  // Gancho: (costo + gastos venta + faena)     / pcf
  // Para despiece no existe un único PVP — depende del mix de productos.
  const pvpMinPie    = pvAyunado > 0 ? (costoTotalLote + gastosVenta)       / pvAyunado : null;
  const pvpMinGancho = pcf > 0       ? (costoTotalLote + gastosGanchoTotal) / pcf       : null;

  // Helper: métricas completas por escenario (usado en tabla unificada y modal)
  const escenariosMeta = [
    {
      id: 'pie', label: 'Venta en Pie',
      kgUtil: pvAyunado, costoKg: costoKgVivo,
      ingreso: pvGranja > 0 ? ingresoPie : null,
      gastos: gastosVenta,
      utilidad: pvGranja === 0 ? null : utilPie,
      utilCabeza: safeDivide(utilPie, cabezasVenta),
      utilKg:     safeDivide(utilPie, pvAyunado),
      margen:     safeDivide(utilPie * 100, costoTotalLote),
      pvpMin: pvpMinPie, pvpActual: pvpPie,
      disponible: pvGranja > 0,
    },
    {
      id: 'gancho', label: 'Venta Gancho',
      kgUtil: pcf, costoKg: costoKgGancho,
      ingreso: pcc > 0 ? ingresoGancho : null,
      gastos: gastosGanchoTotal,
      utilidad: pcc === 0 ? null : utilGancho,
      utilCabeza: safeDivide(utilGancho, cabezasVenta),
      utilKg:     safeDivide(utilGancho, pcf),
      margen:     safeDivide(utilGancho * 100, costoTotalLote),
      pvpMin: pvpMinGancho, pvpActual: pvpGancho,
      disponible: pcc > 0,
    },
    {
      id: 'despiece', label: 'Despiece Industrial',
      kgUtil: pcf, costoKg: costoKgGancho,
      ingreso: pcf > 0 && simTotalIngreso > 0 ? simTotalIngreso : null,
      gastos: gastosGanchoTotal,
      utilidad: pcf > 0 && simTotalIngreso > 0 ? simUtilidad : null,
      utilCabeza: pcf > 0 && simTotalIngreso > 0 ? safeDivide(simUtilidad, cabezasVenta) : null,
      utilKg:     pcf > 0 && simTotalIngreso > 0 ? safeDivide(simUtilidad, pcf) : null,
      margen:     pcf > 0 && simTotalIngreso > 0 ? safeDivide(simUtilidad * 100, costoTotalLote) : null,
      pvpMin: null, pvpActual: null, // depende del mix
      disponible: pcf > 0 && simTotalIngreso > 0,
    },
  ];
  const escenarioElegidoMeta = escenariosMeta.find(e => e.id === escenarioElegido);
  const recomendadoMeta      = escenariosMeta.find(e => e.id === mejorEscenario);
  const seleccionarEscenario = (e) => { setEscenarioTocado(true); setEscenarioElegido(e); };
  const volverARecomendacion  = () => { setEscenarioTocado(false); setEscenarioElegido(mejorEscenario); };

  // ── Validación de datos mínimos para liquidar ──
  // motivosBloqueo: impiden abrir el modal (botón disabled).
  // advertencias: aparecen dentro del modal — el usuario las ve antes de
  // confirmar, pero puede aceptar aún así si conoce el riesgo.
  const motivosBloqueo = [];
  const advertencias   = [];

  if (!loteData) motivosBloqueo.push('No hay lote seleccionado.');
  if (cabezasVenta <= 0) motivosBloqueo.push('Indicá la cantidad de animales para venta.');
  if (pesoPromFinal <= 0) motivosBloqueo.push('Indicá el peso promedio final.');
  if (loteData && cabezasVenta > (loteData.cabezasActivas ?? 0)) {
    motivosBloqueo.push(`No podés vender más de ${loteData.cabezasActivas} cabezas activas.`);
  }
  if (escenarioElegido === 'pie' && pvpPie <= 0) {
    motivosBloqueo.push('Ingresá el PVP $/kg para Venta en Pie.');
  }
  if (escenarioElegido === 'gancho' && pvpGancho <= 0) {
    motivosBloqueo.push('Ingresá el PVP $/kg para Venta Gancho.');
  }
  if (escenarioElegido === 'despiece' && simTotalIngreso === 0) {
    motivosBloqueo.push('Ingresá los precios de venta de los productos en el simulador industrial.');
  }

  if (escenarioElegido === 'despiece' && !cortesValid) {
    advertencias.push(`La distribución de cortes suma ${cortesSum.toFixed(2)}% en lugar de 100%. La utilidad proyectada puede subestimar o sobreestimar el resultado real.`);
  }
  const utilidadProyectada = escenarioElegidoMeta?.utilidad;
  if (utilidadProyectada != null && utilidadProyectada < 0) {
    advertencias.push(`Este escenario proyecta una pérdida neta de Bs ${Math.abs(utilidadProyectada).toLocaleString('es-BO', { maximumFractionDigits: 0 })}. Revisá costos y precios antes de confirmar.`);
  }

  const puedeLiquidar = motivosBloqueo.length === 0;

  // ── Confirmar liquidación ──
  const handleConfirmLiquidar = async () => {
    const loteUuid = loteData?._id;
    if (!negocioId || !loteUuid) return;
    setLiquidando(true);
    setConfirmError(null);
    const escenario  = escenarioElegido;
    const pvpFinal   = escenario === 'pie' ? pvpPie : pvpGancho;
    const gastosFin  = escenario === 'pie' ? gastosVenta : gastosGanchoTotal;
    const pvpEfectivo = escenario === 'despiece' && pesoUtil > 0
      ? simTotalIngreso / pesoUtil
      : pvpFinal;
    // Solo tiene sentido marcar como parcial si quedan cabezas remanentes
    const esParcial = mantenerActivo && cabezasVenta < (loteData?.cabezasActivas ?? 0);
    try {
      await apiFetch(`/api/negocios/${negocioId}/lotes/${loteUuid}/liquidar`, {
        method: 'POST',
        body: JSON.stringify({
          cabezas_venta:      cabezasVenta,
          peso_prom_final:    pesoPromFinal,
          rendimiento_canal:  rendimientoCanal,
          merma_ayuno:        mermaAyuno,
          merma_frio:         mermaFrio,
          escenario,
          pvp_kg:             pvpEfectivo,
          gastos_finales:     gastosFin,
          mix_produccion:     escenario === 'despiece' ? simMixProduccion : null,
          mantener_activo:    esParcial,
        }),
      });
      setShowConfirm(false);
      if (esParcial) {
        // Lote sigue activo — reseteamos el formulario y forzamos refetch
        // para que se vea el nuevo cabezas_activas y el costo neto.
        setMantenerActivo(false);
        setCabezasVentaRaw('0');
        setRefetchLotes(n => n + 1);
      } else {
        setActiveLote?.(null);
        onNavigate?.('lotes');
      }
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
  // TOUR GUIADO — pasos definidos como datos (declarativo)
  // ══════════════════════════════════════════════════════════════
  const tourSteps = [
    {
      id: 'welcome',
      target: null,
      title: '👋 Bienvenido al módulo de Liquidación',
      text: (
        <>
          <p style={{ margin: '0 0 8px 0' }}>
            La liquidación cierra el ciclo productivo de un lote: tomamos el costo acumulado
            (cría, alimento, sanidad, mano de obra) y lo comparamos contra tres formas de vender:
          </p>
          <ul style={{ margin: '0 0 8px 0', paddingLeft: '20px', lineHeight: 1.7 }}>
            <li><strong>Pie</strong> — vender el animal vivo</li>
            <li><strong>Gancho</strong> — vender la canal entera</li>
            <li><strong>Despiece industrial</strong> — procesar y vender cortes</li>
          </ul>
          <p style={{ margin: 0 }}>
            El sistema te muestra cuál te deja más utilidad. Vamos a recorrer el módulo en {17} pasos.
          </p>
        </>
      ),
    },
    {
      id: 'lote-selector',
      target: '[data-tour="selector-lote"]',
      position: 'bottom',
      title: '1. Elegí el lote a liquidar',
      text: (
        <>
          Cada lote es un grupo de animales con su costo acumulado. Acá ves cuántas cabezas tiene activas,
          cuántos días lleva y el <strong>costo total</strong> sobre el que se calculará la utilidad.
          {' '}Si no tenés lotes todavía, creá uno desde la sección Lotes.
        </>
      ),
    },
    {
      id: 'datos-lote',
      target: '[data-tour="datos-lote"]',
      position: 'bottom',
      title: '2. Datos finales del lote',
      text: (
        <>
          Ingresá cuántas cabezas vas a vender y el peso promedio final. El sistema calcula
          automáticamente el <strong>peso vivo total (PV granja)</strong>. Si vendés solo una parte
          del lote, después podés activar la liquidación parcial.
        </>
      ),
      action: {
        label: 'Probar con 50 cabezas × 95 kg',
        onClick: () => { setCabezasVentaRaw('50'); setPesoPromFinalRaw('95'); },
      },
    },
    {
      id: 'mermas',
      target: '[data-tour="mermas-cascada"]',
      position: 'bottom',
      title: '3. Mermas de cascada',
      text: (
        <>
          Entre la granja y la canal fría, el animal pierde peso:
          <ul style={{ margin: '6px 0', paddingLeft: '20px' }}>
            <li><strong>Ayuno/transporte</strong> — 2-4% en cerdos</li>
            <li><strong>Deshidratación frío</strong> — 1-2% en cámara</li>
          </ul>
          Estas mermas afectan los kg vendibles y por lo tanto la utilidad. Si no las cargás, el sistema
          sobreestima tu ganancia.
        </>
      ),
      action: {
        label: 'Cargar valores típicos cerdo',
        onClick: () => { setMermaAyunoRaw('3'); setMermaFrioRaw('1.5'); },
      },
    },
    {
      id: 'rendimiento',
      target: '[data-tour="rendimiento-precios"]',
      position: 'bottom',
      title: '4. Rendimiento canal y precios',
      text: (
        <>
          El <strong>rendimiento canal</strong> es el % del peso vivo que queda como canal faenada
          (cerdo: 72-78%). Abajo cargás los precios de venta para pie y gancho.
          {' '}Junto a cada PVP ves el <strong>punto de equilibrio</strong> — el precio mínimo para no perder plata.
        </>
      ),
    },
    {
      id: 'gastos',
      target: '[data-tour="gastos-venta"]',
      position: 'bottom',
      title: '5. Gastos de venta',
      text: (
        <>
          Transporte, comisión, faena y otros gastos directamente atribuibles a la operación de venta.
          La <strong>faena</strong> solo se suma en los escenarios Gancho y Despiece — en Venta en Pie no aplica.
        </>
      ),
    },
    {
      id: 'comparador',
      target: '[data-tour="comparador"]',
      position: 'top',
      title: '6. Comparador de escenarios',
      text: (
        <>
          Acá ves los 3 escenarios lado a lado con todas las métricas alineadas:
          {' '}<strong>Kilos útiles, Ingreso bruto, Utilidad neta, Margen</strong>. La columna con borde
          coloreado y el badge "★ MAYOR UTILIDAD" es la que más te conviene según los datos cargados.
        </>
      ),
    },
    {
      id: 'simulador',
      target: '[data-tour="simulador"]',
      position: 'top',
      title: '7. Simulador de despiece industrial',
      text: (
        <>
          El simulador estima cuánto ganarías si en vez de vender la canal entera la procesaras en
          productos terminados (jamón, chorizo, tocino, etc.). El acordeón se puede colapsar si no
          te interesa este escenario.
        </>
      ),
    },
    {
      id: 'cortes',
      target: '[data-tour="cortes"]',
      position: 'top',
      title: '8. Distribución de cortes',
      text: (
        <>
          Cada corte primario (pernil, paleta, chuleta, panceta, subproductos, descarte) aporta un %
          del peso de canal fría (PCF). El estándar es para cerdo, pero podés personalizarlo con
          el botón <strong>"Editar despiece"</strong>: renombrar cortes, cambiar colores, ajustar %,
          y agregar o quitar cortes propios de tu empresa.
        </>
      ),
    },
    {
      id: 'productos',
      target: '[data-tour="productos"]',
      position: 'top',
      title: '9. Solo tenés que llenar 2 campos por producto',
      text: (
        <>
          <div style={{ background: 'color-mix(in srgb, #16a34a 10%, transparent)', border: '1px solid color-mix(in srgb, #16a34a 30%, transparent)', borderRadius: '6px', padding: '10px 12px', marginBottom: '10px' }}>
            <div style={{ fontWeight: 700, color: '#16a34a', fontSize: '13px', marginBottom: '4px' }}>
              ✎ Merma %
            </div>
            <div style={{ fontSize: '12px', lineHeight: 1.5 }}>
              Cuánto peso pierde el corte al procesarlo (cocción, curado, secado).
              <br />
              <em>Ej: el jamón pierde 20% al curarse → de 100 kg de pernil quedan 80 kg de jamón.</em>
            </div>
          </div>
          <div style={{ background: 'color-mix(in srgb, #16a34a 10%, transparent)', border: '1px solid color-mix(in srgb, #16a34a 30%, transparent)', borderRadius: '6px', padding: '10px 12px', marginBottom: '10px' }}>
            <div style={{ fontWeight: 700, color: '#16a34a', fontSize: '13px', marginBottom: '4px' }}>
              ✎ PVP (Precio de Venta al Público)
            </div>
            <div style={{ fontSize: '12px', lineHeight: 1.5 }}>
              Precio por kg al que vendés el producto terminado a tu cliente final.
              <br />
              <em>Ej: vendés el jamón a Bs 18 por kg.</em>
            </div>
          </div>
          <div style={{ fontSize: '12px', color: 'var(--text-tertiary)' }}>
            El kg final, el ingreso y la utilidad se calculan solos.
            Con <strong>"Agregar / Quitar"</strong> podés crear, renombrar o eliminar productos.
          </div>
        </>
      ),
    },
    {
      id: 'sensibilidad',
      target: '[data-tour="productos"]',
      position: 'top',
      title: '10. Análisis "qué pasa si"',
      text: (
        <>
          Debajo de cada PVP ves <strong>"+1Bs → +Bs X"</strong>: cuánto subiría tu utilidad si
          aumentaras ese precio en 1 Bs/kg. Sirve para priorizar qué productos negociar primero o
          dónde tenés más margen de mejora.
        </>
      ),
    },
    {
      id: 'reroutings',
      target: reroutings.length > 0 ? '[data-tour="reroutings"]' : null,
      position: 'top',
      title: '11. Routing automático',
      text: (
        <>
          Algunos productos compiten por el mismo corte. Por ejemplo, la <strong>chuleta</strong> puede
          venderse como corte fresco o ir a chorizo (porque chorizo la lista como "alternativa"). El
          sistema le asigna el corte al producto con <strong>mayor margen por kg</strong>.
          {reroutings.length > 0
            ? ' Mirá el banner resaltado: muestra qué corte se reasignó y los márgenes comparados.'
            : ' Cuando hay routing activo aparece un banner explicando la decisión.'}
        </>
      ),
    },
    {
      id: 'selector-escenario',
      target: '[data-tour="selector-escenario"]',
      position: 'top',
      title: '12. Elegí el escenario final',
      text: (
        <>
          El sistema recomienda automáticamente el de mayor utilidad (badge ★ RECOMENDADO), pero
          podés forzar otro. Útil cuando no tenés planta de despiece, tu comprador prefiere gancho
          entero, o querés liquidar conservadoramente. Si te alejás del recomendado, te aviso cuánta
          utilidad estás resignando.
        </>
      ),
    },
    {
      id: 'parcial',
      target: '[data-tour="parcial"]',
      position: 'top',
      title: '13. Liquidación parcial',
      text: (
        <>
          Cuando vendés <strong>menos cabezas que las activas del lote</strong>, aparece este toggle.
          Activado: el lote queda activo con las cabezas restantes; el costo se prorratea y se descuenta
          la parte vendida. Sin activar: el lote se cierra completo (las cabezas no vendidas desaparecen
          del tracking).
        </>
      ),
    },
    {
      id: 'boton',
      target: '[data-tour="boton-liquidar"]',
      position: 'top',
      title: '14. Registrar la liquidación',
      text: (
        <>
          Cuando todos los datos están bien, este botón se activa. Si falta algo (cabezas en 0, sin PVP,
          etc.), te lo dice en un ⓘ al lado. Ningún dato se guarda hasta que confirmes en el modal.
        </>
      ),
    },
    {
      id: 'modal',
      target: null,
      title: '15. Modal de confirmación',
      text: (
        <>
          Al hacer clic, se abre un modal con la <strong>tabla resumen completa</strong>: lote, escenario,
          cabezas, peso, ingreso bruto, costos, utilidad neta. Si hay alertas (utilidad negativa,
          cortes mal sumados, etc.), aparecen ahí antes de confirmar. Es irreversible una vez confirmada.
        </>
      ),
    },
    {
      id: 'persistencia',
      target: null,
      title: '16. Tus configuraciones se recuerdan',
      text: (
        <>
          Todos los precios, mermas, distribución de cortes y productos que configures se guardan
          automáticamente por <strong>negocio</strong>. La próxima vez que liquides un lote, vas a
          encontrar tus valores. Si tenés varias empresas, cada una mantiene su configuración propia.
        </>
      ),
    },
    {
      id: 'fin',
      target: null,
      title: '✅ ¡Listo!',
      text: (
        <>
          Ya conocés el módulo de Liquidación. Recordá:
          <ul style={{ margin: '8px 0', paddingLeft: '20px', lineHeight: 1.7 }}>
            <li>Cargá <strong>cabezas, peso y mermas</strong> primero</li>
            <li>Mirá el comparador para ver qué escenario conviene</li>
            <li>Solo necesitás llenar <strong>Merma % y PVP</strong> en el simulador</li>
            <li>Podés volver a este tutorial cuando quieras con el botón <strong>"Ver tutorial"</strong></li>
          </ul>
          Cualquier ícono ⓘ que veas tiene una explicación detallada.
        </>
      ),
    },
  ];

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

      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px', flexWrap: 'wrap' }}>
        <h1 style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '20px', fontWeight: 400, color: 'var(--text-primary)', letterSpacing: '-0.02em', margin: 0 }}>
          Liquidación de lote
          <InfoTip
            width={300}
            text="La liquidación cierra el ciclo productivo del lote: tomamos el costo acumulado y lo comparamos contra tres escenarios de venta (Pie, Gancho, Despiece Industrial) para mostrarte cuál da mayor utilidad. Al confirmar, el lote se mueve al historial con el escenario elegido y deja de aparecer como activo."
          />
        </h1>
        <button
          onClick={() => setTourActivo(true)}
          style={{ background: 'transparent', border: `1px solid ${accentColor}`, color: accentColor, borderRadius: '6px', padding: '6px 14px', fontSize: '12px', fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px' }}
        >
          <Icon name="info" size={13} /> Ver tutorial
        </button>
      </div>

      {/* Selector de lote */}
      <div data-tour="selector-lote" style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border-subtle)', borderRadius: '8px', padding: '14px 20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
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
            </span>{' '}
            <InfoTip text="Costo total acumulado del lote: animales en pie, alimento, sanidad, mano de obra y CIF distribuidos. Es la base sobre la que se calcula la utilidad de cualquier escenario." />
          </div>
        </div>
        <RubroBadge rubro="agro_ganadero" />
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>

        {/* ── Sección 1: Datos del lote ── */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '16px', alignItems: 'stretch' }}>
          <div data-tour="datos-lote" style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border-subtle)', borderRadius: '8px', overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
            <div style={{ padding: '12px 16px', borderBottom: '1px solid var(--border-subtle)', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <span style={{ fontSize: '11px', fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase', color: accentColor }}>1. Datos finales del lote</span>
              <InfoTip text="Información que define el peso total del lote al momento de la venta. Es la base sobre la que se calculan ingresos y costos por kg." />
            </div>
            <div style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: '12px', flex: 1 }}>
              <INum label="Animales vivos para venta" raw={cabezasVentaRaw} setRaw={setCabezasVentaRaw} prefix="" hint="cabezas" accentColor={accentColor} tip="Cantidad de cabezas que efectivamente saldrán a venta. Por defecto se toma el número de animales activos del lote. Editalo si vas a vender solo una parte del lote." />
              <INum label="Peso promedio final (kg/cab)" raw={pesoPromFinalRaw} setRaw={setPesoPromFinalRaw} prefix="" accentColor={accentColor} tip="Peso vivo promedio por cabeza al momento de la venta, medido en granja antes de cualquier ayuno o transporte." />
              <div style={{ marginTop: 'auto', background: 'var(--bg-tertiary)', borderRadius: '6px', padding: '10px 12px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: '5px', fontSize: '12px', color: 'var(--text-secondary)' }}>
                  Peso vivo total (PV granja)
                  <InfoTip text="Peso vivo total del lote en la granja, antes de cualquier merma. Fórmula: cabezas × peso promedio final." />
                </span>
                {mono(pvGranja.toLocaleString('es-BO'), ' kg')}
              </div>
            </div>
          </div>

          <div data-tour="rendimiento-precios" style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border-subtle)', borderRadius: '8px', overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
            <div style={{ padding: '12px 16px', borderBottom: '1px solid var(--border-subtle)', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <span style={{ fontSize: '11px', fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase', color: accentColor }}>2. Rendimiento y precios</span>
              <InfoTip text="Configurá el rendimiento del faenado (canal) y los precios de venta para cada escenario (Pie y Gancho). El simulador industrial usa otros precios por producto procesado." />
            </div>
            <div style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: '12px', flex: 1 }}>
              <div data-tour="mermas-cascada" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                <INum label="Merma ayuno/transporte (%)" raw={mermaAyunoRaw} setRaw={setMermaAyunoRaw} prefix="" hint="Cerdo: 2–4% · Bovino: 3–5%" accentColor={accentColor} tip="Pérdida de peso vivo entre la granja y la balanza del matadero, por ayuno previo a la faena, deshidratación durante el transporte y estrés. Se descuenta del peso de granja antes de aplicar el rendimiento canal." />
                <INum label="Merma deshidratación frío (%)" raw={mermaFrioRaw} setRaw={setMermaFrioRaw} prefix="" hint="Cerdo: 1–2% · Bovino: 2–3%" accentColor={accentColor} tip="Pérdida de peso en la cámara fría por evaporación de humedad de la canal (oreo). Se descuenta del peso de canal caliente para obtener la canal fría (PCF), que es el peso real vendido en gancho." />
              </div>
              <INum label="Rendimiento canal (%)" raw={rendimientoCanalRaw} setRaw={setRendimientoCanalRaw} prefix="" hint="Estándar cerdo: 72–78%" accentColor={accentColor} tip="Porcentaje del peso vivo ayunado que se convierte en canal faenado (RCC). El resto corresponde a vísceras, sangre y cuero." />
              <div style={{ background: 'var(--bg-tertiary)', borderRadius: '6px', padding: '10px 12px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: '5px', fontSize: '12px', color: 'var(--text-secondary)' }}>
                  PCC (canal caliente estimado)
                  <InfoTip text="Peso de Canal Caliente: peso del animal recién faenado, sin vísceras y sin sangre, antes de pasar por cámara fría. Fórmula: PV ayunado × rendimiento canal." />
                </span>
                {mono(pcc.toFixed(0), ' kg')}
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginTop: 'auto' }}>
                <INum
                  label="PVP $/kg pie" raw={pvpPieRaw} setRaw={setPvpPieRaw} prefix="Bs"
                  hint={pvpMinPie != null ? `Equilibrio: Bs ${pvpMinPie.toFixed(2)}/kg` : 'En vivo'}
                  accentColor={accentColor}
                  tip={`Precio al que vendés el animal vivo por kg de peso ayunado.\n\nPVP de equilibrio (punto sin pérdida ni ganancia): Bs ${pvpMinPie != null ? pvpMinPie.toFixed(2) : '—'}/kg. A ese precio cubrís el costo del lote más los gastos de venta exactamente.`}
                />
                <INum
                  label="PVP $/kg gancho" raw={pvpGanchoRaw} setRaw={setPvpGanchoRaw} prefix="Bs"
                  hint={pvpMinGancho != null ? `Equilibrio: Bs ${pvpMinGancho.toFixed(2)}/kg` : 'En canal'}
                  accentColor={accentColor}
                  tip={`Precio por kg de canal fría (PCF), ya descontada la merma de frío.\n\nPVP de equilibrio (punto sin pérdida ni ganancia): Bs ${pvpMinGancho != null ? pvpMinGancho.toFixed(2) : '—'}/kg. Incluye costo del lote + transporte + comisión + faena.`}
                />
              </div>
            </div>
          </div>

          <div data-tour="gastos-venta" style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border-subtle)', borderRadius: '8px', overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
            <div style={{ padding: '12px 16px', borderBottom: '1px solid var(--border-subtle)', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <span style={{ fontSize: '11px', fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase', color: accentColor }}>3. Gastos de venta</span>
              <InfoTip text="Gastos directos asociados a la operación de venta. Se restan del ingreso bruto para calcular la utilidad neta. La faena solo aplica si vendés en gancho o despiezado." />
            </div>
            <div style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: '12px', flex: 1 }}>
              <INum label="Transporte al matadero" raw={transporteRaw} setRaw={setTransporteRaw} accentColor={accentColor} tip="Costo de mover el lote desde la granja hasta el matadero o punto de venta. Aplica a todos los escenarios." />
              <INum label="Comisión intermediario" raw={comisionRaw} setRaw={setComisionRaw} accentColor={accentColor} tip="Comisión pagada al intermediario o corredor que cierra la venta. Si vendés directo al cliente final, dejalo en 0." />
              <INum label="Gastos de faena (gancho)" raw={faenaRaw} setRaw={setFaenaRaw} prefix="Bs" hint="Solo si vende en gancho" accentColor={accentColor} tip="Costo del servicio de faena en el matadero. Solo se suma en los escenarios Gancho y Despiece Industrial; en Venta en Pie no aplica." />
              <INum label="Otros" raw={otrosGastosRaw} setRaw={setOtrosGastosRaw} accentColor={accentColor} tip="Gastos adicionales no contemplados: empaque, etiquetado, peajes, refrigeración temporal, etc." />
            </div>
          </div>
        </div>


        {/* ── Resultados proyectados E1 / E2 ── */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', minWidth: 0 }}>
          {sinDatosVenta && (
            <div style={{ background: 'var(--bg-tertiary)', border: '1px solid var(--border-subtle)', borderRadius: '8px', padding: '14px 20px', textAlign: 'center', color: 'var(--text-tertiary)', fontSize: '13px' }}>
              <Icon name="alertTriangle" size={14} style={{ marginRight: '6px', verticalAlign: 'middle' }} />
              Ingresá cantidades para ver el escenario
            </div>
          )}

          {!sinDatosVenta && (
            <div data-tour="comparador" style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <span style={{ fontSize: '14px', fontWeight: 600, color: 'var(--text-primary)' }}>Comparador de escenarios</span>
                <InfoTip text="Tabla comparativa de los 3 escenarios de venta. La columna con borde dorado es la de mayor utilidad (recomendada). Para el escenario de despiece, configurá los precios y mermas térmicas en el simulador industrial de abajo." />
              </div>
              <ComparadorEscenarios
                escenariosMeta={escenariosMeta}
                mejorEscenario={mejorEscenario}
                costoTotalLote={costoTotalLote}
                cabezasVenta={cabezasVenta}
                kgAyuno={kgAyuno}
                kgFrio={kgFrio}
                pvGranja={pvGranja}
                pcc={pcc}
                accentColor={accentColor}
                goldColor={goldColor}
              />
            </div>
          )}

          {/* ── Escenario 3: Simulador de Rentabilidad Industrial ── */}
          {pcf > 0 && !sinDatosVenta && (
            <div data-tour="simulador" style={{ background: 'var(--bg-secondary)', border: `1px solid ${industrialEsMejor ? goldColor + '55' : 'var(--border-subtle)'}`, borderRadius: '8px', overflow: 'hidden' }}>

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
                  <div data-tour="cortes">
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px', gap: '8px', flexWrap: 'wrap' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <span style={{ fontSize: '10px', fontWeight: 700, color: 'var(--text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
                          Distribución de cortes sobre PCF ({pcf.toFixed(1)} kg canal fría)
                        </span>
                        <InfoTip text="Porcentaje del peso de canal fría (PCF) que aporta cada corte primario. El estándar mostrado es para cerdo de mercado bajo despiece comercial. Si tu empresa trabaja con un patrón diferente (raza, edad de faena, técnica de despiece), personalizá los valores y se guardarán automáticamente para este negocio." />
                      </div>
                      <button
                        onClick={() => setEditCortes(o => !o)}
                        style={{ background: editCortes ? accentColor + '22' : 'transparent', border: `1px solid ${editCortes ? accentColor : 'var(--border-subtle)'}`, color: editCortes ? accentColor : 'var(--text-secondary)', borderRadius: '4px', padding: '3px 9px', fontSize: '10px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px' }}
                      >
                        <Icon name={editCortes ? 'check' : 'edit'} size={10} />
                        {editCortes ? 'Listo' : 'Editar despiece'}
                      </button>
                    </div>
                    <SimBarraDespiece pcf={pcf} cortes={cortesNum} />

                    {editCortes && (
                      <div style={{ marginTop: '14px', background: 'var(--bg-tertiary)', border: `1px solid ${cortesValid ? 'var(--border-subtle)' : 'color-mix(in srgb, var(--accent-danger) 33%, transparent)'}`, borderRadius: '6px', padding: '12px 14px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                          <span style={{ display: 'inline-flex', alignItems: 'center', gap: '5px', fontSize: '11px', fontWeight: 600, color: 'var(--text-primary)' }}>
                            Editar despiece — nombres, colores y porcentajes
                            <InfoTip text="Podés renombrar cualquier corte, cambiar su color, ajustar su porcentaje sobre PCF y agregar o quitar cortes. Los productos del simulador (jamón, chorizo, tocino) siguen vinculados a los cortes originales (pernil, paleta, panceta, chuleta); si los eliminás, los productos asociados desaparecerán." />
                          </span>
                          <button
                            onClick={resetCortes}
                            style={{ background: 'transparent', border: '1px solid var(--border-subtle)', color: 'var(--text-tertiary)', borderRadius: '4px', padding: '3px 8px', fontSize: '10px', cursor: 'pointer' }}
                          >
                            Restaurar estándar
                          </button>
                        </div>

                        {/* Header */}
                        <div style={{ display: 'grid', gridTemplateColumns: '28px 1fr 90px 90px 24px', gap: '6px 10px', alignItems: 'center', padding: '0 2px', fontSize: '10px', fontWeight: 600, color: 'var(--text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                          <span></span>
                          <span>Nombre</span>
                          <span style={{ textAlign: 'right' }}>% sobre PCF</span>
                          <span style={{ textAlign: 'right' }}>Kg</span>
                          <span></span>
                        </div>

                        {/* Filas */}
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                          {cortesList.map((c) => {
                            const pctNum = Math.max(0, parseFloat(c.pct) || 0);
                            // Productos que dependen de este corte (primario o alternativa)
                            const productosDependientes = productosList.filter(p =>
                              p.corteId === c.id || p.alternativaCorteId === c.id
                            );
                            const esCoreProducto = productosDependientes.length > 0;
                            return (
                              <div key={c.id} style={{ display: 'grid', gridTemplateColumns: '28px 1fr 90px 90px 24px', gap: '6px 10px', alignItems: 'center', padding: '4px 2px', borderTop: '1px dashed var(--border-subtle)' }}>
                                {/* Color */}
                                <input
                                  type="color"
                                  value={c.color}
                                  onChange={e => updateCorte(c.id, { color: e.target.value })}
                                  title="Cambiar color"
                                  style={{ width: '24px', height: '24px', padding: 0, border: '1px solid var(--border-subtle)', borderRadius: '4px', background: 'transparent', cursor: 'pointer' }}
                                />
                                {/* Nombre */}
                                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', minWidth: 0 }}>
                                  <input
                                    type="text"
                                    value={c.label}
                                    onChange={e => updateCorte(c.id, { label: e.target.value })}
                                    style={{ flex: 1, minWidth: 0, background: 'var(--bg-primary)', border: '1px solid var(--border-subtle)', borderRadius: '4px', color: 'var(--text-primary)', padding: '5px 8px', fontSize: '12px', outline: 'none' }}
                                  />
                                  {esCoreProducto && (
                                    <InfoTip text={`Este corte alimenta ${productosDependientes.length === 1 ? 'al producto' : 'a los productos'}: ${productosDependientes.map(p => p.nombre).join(', ')}. Si lo eliminás, esos productos quedan sin corte asignado y dejan de aportar al ingreso del despiece.`} />
                                  )}
                                </div>
                                {/* % */}
                                <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                                  <input
                                    value={c.pct}
                                    onChange={e => updateCorte(c.id, { pct: e.target.value })}
                                    type="number" step="any" min="0" max="100"
                                    style={{ width: '100%', boxSizing: 'border-box', background: 'var(--bg-primary)', border: '1px solid var(--border-subtle)', borderRadius: '4px', color: 'var(--text-primary)', padding: '5px 22px 5px 8px', fontSize: '12px', outline: 'none', fontFamily: 'IBM Plex Mono, monospace', textAlign: 'right' }}
                                  />
                                  <span style={{ position: 'absolute', right: '8px', fontSize: '11px', color: 'var(--text-tertiary)', pointerEvents: 'none' }}>%</span>
                                </div>
                                {/* Kg */}
                                <span style={{ fontSize: '11px', color: 'var(--text-tertiary)', fontFamily: 'IBM Plex Mono, monospace', textAlign: 'right' }}>
                                  {pcf > 0 ? `${(pcf * pctNum / 100).toFixed(1)} kg` : '—'}
                                </span>
                                {/* Borrar */}
                                <button
                                  onClick={() => removeCorte(c.id)}
                                  title={esCoreProducto ? `Quitar ${c.label} (también oculta su producto)` : `Quitar ${c.label}`}
                                  style={{ background: 'transparent', border: 'none', color: 'var(--text-tertiary)', cursor: 'pointer', padding: '2px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                                  onMouseEnter={e => e.currentTarget.style.color = 'var(--accent-danger)'}
                                  onMouseLeave={e => e.currentTarget.style.color = 'var(--text-tertiary)'}
                                >
                                  <Icon name="x" size={14} />
                                </button>
                              </div>
                            );
                          })}
                        </div>

                        {/* Agregar */}
                        <button
                          onClick={addCorte}
                          style={{ alignSelf: 'flex-start', background: 'transparent', border: `1px dashed ${accentColor}88`, color: accentColor, borderRadius: '4px', padding: '5px 12px', fontSize: '11px', fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '5px' }}
                        >
                          <Icon name="plus" size={12} /> Agregar corte
                        </button>

                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '11px', borderTop: '1px dashed var(--border-subtle)', paddingTop: '8px' }}>
                          <span style={{ color: 'var(--text-tertiary)' }}>Suma total ({cortesList.length} corte{cortesList.length === 1 ? '' : 's'})</span>
                          <span style={{ fontFamily: 'IBM Plex Mono, monospace', fontWeight: 600, color: cortesValid ? 'var(--accent-success)' : 'var(--accent-danger)' }}>
                            {cortesSum.toFixed(2)}% {cortesValid ? '✓' : `· debe ser 100% (diferencia ${(cortesSum - 100).toFixed(2)})`}
                          </span>
                        </div>
                        {!cortesValid && (
                          <span style={{ fontSize: '11px', color: 'var(--accent-danger)', lineHeight: 1.4 }}>
                            La suma de los porcentajes debe ser exactamente 100%. Los cálculos siguen usando los valores ingresados, pero la proyección puede subestimar o sobreestimar el rendimiento.
                          </span>
                        )}
                        <span style={{ fontSize: '11px', color: 'var(--text-tertiary)', lineHeight: 1.4 }}>
                          La configuración se guarda automáticamente para este negocio y se reutiliza en próximas liquidaciones.
                        </span>
                      </div>
                    )}
                  </div>

                  {/* 2. Configuración de productos (tarjetas-fórmula) */}
                  <div data-tour="productos">
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '12px', gap: '8px', flexWrap: 'wrap' }}>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '3px', flex: 1, minWidth: '200px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <span style={{ fontSize: '11px', fontWeight: 700, color: 'var(--text-primary)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
                            Configuración de productos
                          </span>
                          <span style={{ fontSize: '10px', color: 'var(--text-tertiary)', background: 'var(--bg-tertiary)', padding: '1px 6px', borderRadius: '4px', border: '1px solid var(--border-subtle)' }}>
                            {productosList.length}
                          </span>
                          <InfoTip
                            width={320}
                            text="Cada producto se elabora a partir de un corte primario y opcionalmente puede aceptar otro corte como alternativa. Si dos productos compiten por el mismo corte, el sistema lo asigna al que genere mayor margen."
                          />
                        </div>
                        <span style={{ fontSize: '11px', color: 'var(--text-tertiary)', lineHeight: 1.4 }}>
                          Solo necesitás llenar{' '}
                          <strong style={{ color: accentColor }}>Merma %</strong>
                          {' '}y{' '}
                          <strong style={{ color: accentColor }}>PVP</strong>
                          {' '}por producto. El kg final, el ingreso y la utilidad se calculan solos.
                        </span>
                      </div>
                      <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                        <button
                          onClick={() => todosColapsados ? expandirTodos() : colapsarTodos()}
                          title={todosColapsados ? 'Expandir todos los productos' : 'Colapsar todos los productos'}
                          style={{ background: 'transparent', border: '1px solid var(--border-subtle)', color: 'var(--text-secondary)', borderRadius: '4px', padding: '4px 10px', fontSize: '11px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px' }}
                        >
                          <Icon name={todosColapsados ? 'chevronDown' : 'chevronUp'} size={11} />
                          {todosColapsados ? 'Expandir todos' : 'Colapsar todos'}
                        </button>
                        {editProductos && (
                          <button
                            onClick={resetProductos}
                            style={{ background: 'transparent', border: '1px solid var(--border-subtle)', color: 'var(--text-tertiary)', borderRadius: '4px', padding: '4px 10px', fontSize: '11px', cursor: 'pointer' }}
                          >
                            Restaurar estándar
                          </button>
                        )}
                        <button
                          onClick={() => setEditProductos(o => !o)}
                          style={{ background: editProductos ? accentColor + '22' : 'transparent', border: `1px solid ${editProductos ? accentColor : 'var(--border-subtle)'}`, color: editProductos ? accentColor : 'var(--text-secondary)', borderRadius: '4px', padding: '4px 10px', fontSize: '11px', fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px' }}
                        >
                          <Icon name={editProductos ? 'check' : 'edit'} size={11} />
                          {editProductos ? 'Listo' : 'Agregar / Quitar'}
                        </button>
                      </div>
                    </div>

                    {/* Tarjetas-fórmula */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                      {productosConCalculos.map((p) => {
                        const ganoAlternativa = !!p.alternativaCorteId && p.cortesAsignados.includes(p.alternativaCorteId);
                        const cortePrimarioObj = cortesById[p.corteId];
                        const corteAltObj = p.alternativaCorteId ? cortesById[p.alternativaCorteId] : null;
                        const sensActiva = pcf > 0 && p.kgFinal > 0;
                        const colapsado = productosColapsados.has(p.id);

                        // Vista compacta (una sola línea) cuando está colapsado
                        if (colapsado) {
                          return (
                            <div
                              key={p.id}
                              onClick={() => toggleColapsarProducto(p.id)}
                              title="Click para expandir"
                              style={{
                                background: 'var(--bg-tertiary)',
                                border: '1px solid var(--border-subtle)',
                                borderLeft: `3px solid ${p.corteColor}`,
                                borderRadius: '8px',
                                padding: '10px 14px',
                                display: 'flex', alignItems: 'center', gap: '10px',
                                cursor: 'pointer',
                                opacity: p.disponible ? 1 : 0.55,
                                flexWrap: 'wrap',
                              }}
                            >
                              <div style={{ width: '10px', height: '10px', borderRadius: '50%', background: p.corteColor, flexShrink: 0 }} />
                              <strong style={{ fontSize: '13px', color: 'var(--text-primary)', whiteSpace: 'nowrap' }}>{p.nombre}</strong>
                              <span style={{ fontSize: '11px', color: 'var(--text-tertiary)', whiteSpace: 'nowrap' }}>
                                {p.corteLabel}
                              </span>
                              {ganoAlternativa && corteAltObj && (
                                <span style={{ fontSize: '9px', fontWeight: 700, color: corteAltObj.color, background: `color-mix(in srgb, ${corteAltObj.color} 18%, transparent)`, padding: '1px 5px', borderRadius: '3px' }}>
                                  + {corteAltObj.label}
                                </span>
                              )}
                              <div style={{ flex: 1 }} />
                              <span style={{ fontFamily: 'IBM Plex Mono, monospace', fontSize: '11px', color: 'var(--text-tertiary)', whiteSpace: 'nowrap' }}>
                                {p.kgFinal.toFixed(1)} kg × Bs {p.pvpNum.toFixed(0)} =
                              </span>
                              <span style={{ fontFamily: 'IBM Plex Mono, monospace', fontSize: '13px', color: p.ingreso > 0 ? 'var(--text-primary)' : 'var(--text-tertiary)', fontWeight: 700, whiteSpace: 'nowrap' }}>
                                {p.ingreso > 0 ? `Bs ${Math.round(p.ingreso).toLocaleString('es-BO')}` : '—'}
                              </span>
                              <Icon name="chevronDown" size={13} style={{ color: 'var(--text-tertiary)', flexShrink: 0 }} />
                            </div>
                          );
                        }

                        return (
                          <div
                            key={p.id}
                            style={{
                              background: 'var(--bg-tertiary)',
                              border: '1px solid var(--border-subtle)',
                              borderLeft: `3px solid ${p.corteColor}`,
                              borderRadius: '8px',
                              padding: '12px 14px',
                              display: 'flex', flexDirection: 'column', gap: '8px',
                              opacity: p.disponible ? 1 : 0.55,
                            }}
                          >
                            {/* Línea 1: nombre editable + badges + colapsar + ✕ */}
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                              <div style={{ width: '10px', height: '10px', borderRadius: '50%', background: p.corteColor, flexShrink: 0 }} />
                              <input
                                type="text"
                                value={p.nombre}
                                onChange={e => updateProducto(p.id, { nombre: e.target.value })}
                                placeholder="Nombre del producto"
                                title="Hacé clic para editar el nombre"
                                style={{
                                  flex: 1, minWidth: '120px',
                                  background: 'transparent',
                                  border: 'none',
                                  borderBottom: '1px dashed var(--border-subtle)',
                                  color: 'var(--text-primary)',
                                  fontSize: '14px',
                                  fontWeight: 600,
                                  padding: '3px 0',
                                  outline: 'none',
                                  fontFamily: 'IBM Plex Sans, sans-serif',
                                }}
                                onFocus={e => e.target.style.borderBottomColor = accentColor}
                                onBlur={e => e.target.style.borderBottomColor = 'var(--border-subtle)'}
                              />
                              {ganoAlternativa && corteAltObj && (
                                <span style={{ fontSize: '10px', fontWeight: 700, color: corteAltObj.color, background: `color-mix(in srgb, ${corteAltObj.color} 18%, transparent)`, padding: '2px 6px', borderRadius: '3px', border: `1px solid color-mix(in srgb, ${corteAltObj.color} 40%, transparent)` }}>
                                  + {corteAltObj.label}
                                </span>
                              )}
                              {p.tip && <InfoTip text={p.tip} />}
                              <button
                                onClick={() => toggleColapsarProducto(p.id)}
                                title="Colapsar producto"
                                style={{ background: 'transparent', border: 'none', color: 'var(--text-tertiary)', cursor: 'pointer', padding: '4px', display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: '4px' }}
                                onMouseEnter={e => { e.currentTarget.style.color = 'var(--text-secondary)'; e.currentTarget.style.background = 'var(--bg-secondary)'; }}
                                onMouseLeave={e => { e.currentTarget.style.color = 'var(--text-tertiary)'; e.currentTarget.style.background = 'transparent'; }}
                              >
                                <Icon name="chevronUp" size={14} />
                              </button>
                              {editProductos && (
                                <button
                                  onClick={() => removeProducto(p.id)}
                                  title={`Quitar ${p.nombre}`}
                                  style={{ background: 'transparent', border: 'none', color: 'var(--text-tertiary)', cursor: 'pointer', padding: '4px', display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: '4px' }}
                                  onMouseEnter={e => { e.currentTarget.style.color = 'var(--accent-danger)'; e.currentTarget.style.background = 'color-mix(in srgb, var(--accent-danger) 10%, transparent)'; }}
                                  onMouseLeave={e => { e.currentTarget.style.color = 'var(--text-tertiary)'; e.currentTarget.style.background = 'transparent'; }}
                                >
                                  <Icon name="x" size={14} />
                                </button>
                              )}
                            </div>

                            {/* Línea 2: origen del producto (con dropdowns en edit) */}
                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap', fontSize: '11px', color: 'var(--text-tertiary)' }}>
                              <span>Se elabora con:</span>
                              {editProductos ? (
                                <>
                                  <select
                                    value={p.corteId}
                                    onChange={e => updateProducto(p.id, { corteId: e.target.value })}
                                    style={{ background: 'var(--bg-primary)', border: '1px solid var(--border-subtle)', borderRadius: '4px', color: 'var(--text-primary)', padding: '2px 6px', fontSize: '11px', fontWeight: 500, outline: 'none' }}
                                  >
                                    <option value="">— elegir corte —</option>
                                    {cortesList.filter(c => c.id !== 'descarte').map(c => (
                                      <option key={c.id} value={c.id}>{c.label}</option>
                                    ))}
                                  </select>
                                  <span>+ alternativa</span>
                                  <select
                                    value={p.alternativaCorteId || ''}
                                    onChange={e => updateProducto(p.id, { alternativaCorteId: e.target.value || undefined })}
                                    title="Si se setea, el producto compite por ese corte contra su dueño primario. El que tenga mayor margen lo recibe."
                                    style={{ background: 'var(--bg-primary)', border: '1px solid var(--border-subtle)', borderRadius: '4px', color: 'var(--text-secondary)', padding: '2px 6px', fontSize: '11px', outline: 'none' }}
                                  >
                                    <option value="">— ninguna —</option>
                                    {cortesList.filter(c => c.id !== 'descarte' && c.id !== p.corteId).map(c => (
                                      <option key={c.id} value={c.id}>{c.label}</option>
                                    ))}
                                  </select>
                                </>
                              ) : (
                                <strong style={{ color: 'var(--text-secondary)', fontWeight: 600 }}>
                                  {p.corteLabel}
                                </strong>
                              )}
                              {!p.disponible && cortePrimarioObj == null && (
                                <span style={{ color: 'var(--accent-danger)', fontWeight: 600 }}>· sin corte asignado</span>
                              )}
                              {p.perdioCortePrimario && cortePrimarioObj && (
                                <span>· {cortePrimarioObj.label} cedida a otro producto</span>
                              )}
                            </div>

                            {/* Línea 3: fórmula visual Kg crudo − Merma = Kg final × PVP = Ingreso */}
                            <div style={{
                              display: 'flex', alignItems: 'flex-end', gap: '8px',
                              flexWrap: 'wrap',
                              padding: '8px 10px',
                              background: 'var(--bg-secondary)',
                              borderRadius: '6px',
                              marginTop: '2px',
                            }}>
                              {/* Kg crudo */}
                              <div style={{ display: 'flex', flexDirection: 'column', gap: '2px', minWidth: '70px' }}>
                                <span style={{ fontSize: '9px', color: 'var(--text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Kg crudo</span>
                                <span style={{ fontFamily: 'IBM Plex Mono, monospace', fontSize: '13px', color: 'var(--text-secondary)', fontWeight: 500 }}>{p.kgBase.toFixed(1)}</span>
                              </div>

                              <span style={{ fontSize: '16px', color: 'var(--text-tertiary)', fontWeight: 300, paddingBottom: '2px' }}>−</span>

                              {/* Merma % (INPUT destacado) */}
                              <div style={{ display: 'flex', flexDirection: 'column', gap: '2px', minWidth: '80px' }}>
                                <span style={{ fontSize: '9px', color: accentColor, textTransform: 'uppercase', letterSpacing: '0.06em', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '3px' }}>
                                  <Icon name="edit" size={9} /> Merma
                                </span>
                                <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                                  <input
                                    value={p.mermaTermicaPct}
                                    onChange={e => updateProducto(p.id, { mermaTermicaPct: e.target.value })}
                                    type="number" step="any" min="0" max="100"
                                    placeholder="0"
                                    style={{
                                      width: '100%', boxSizing: 'border-box',
                                      background: 'var(--bg-primary)',
                                      border: `2px solid color-mix(in srgb, ${accentColor.startsWith('var') ? '#16a34a' : accentColor} 35%, transparent)`,
                                      borderRadius: '4px',
                                      color: 'var(--text-primary)',
                                      padding: '5px 22px 5px 8px',
                                      fontSize: '13px', outline: 'none',
                                      fontFamily: 'IBM Plex Mono, monospace',
                                      textAlign: 'right',
                                      fontWeight: 600,
                                    }}
                                    onFocus={e => e.target.style.borderColor = accentColor}
                                    onBlur={e => e.target.style.borderColor = `color-mix(in srgb, ${accentColor.startsWith('var') ? '#16a34a' : accentColor} 35%, transparent)`}
                                  />
                                  <span style={{ position: 'absolute', right: '7px', fontSize: '11px', color: 'var(--text-tertiary)', pointerEvents: 'none' }}>%</span>
                                </div>
                                {p.hintMerma && (
                                  <span style={{ fontSize: '9px', color: 'var(--text-tertiary)', textAlign: 'right' }}>{p.hintMerma}</span>
                                )}
                              </div>

                              <span style={{ fontSize: '16px', color: 'var(--text-tertiary)', fontWeight: 300, paddingBottom: '2px' }}>=</span>

                              {/* Kg final */}
                              <div style={{ display: 'flex', flexDirection: 'column', gap: '2px', minWidth: '70px' }}>
                                <span style={{ fontSize: '9px', color: 'var(--text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Kg final</span>
                                <span style={{ fontFamily: 'IBM Plex Mono, monospace', fontSize: '13px', color: 'var(--accent-success)', fontWeight: 700 }}>{p.kgFinal.toFixed(1)}</span>
                              </div>

                              <span style={{ fontSize: '16px', color: 'var(--text-tertiary)', fontWeight: 300, paddingBottom: '2px' }}>×</span>

                              {/* PVP (INPUT destacado) */}
                              <div style={{ display: 'flex', flexDirection: 'column', gap: '2px', minWidth: '110px' }}>
                                <span style={{ fontSize: '9px', color: accentColor, textTransform: 'uppercase', letterSpacing: '0.06em', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '3px' }}>
                                  <Icon name="edit" size={9} /> PVP
                                </span>
                                <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                                  <span style={{ position: 'absolute', left: '7px', fontSize: '11px', color: 'var(--text-tertiary)', pointerEvents: 'none', fontFamily: 'IBM Plex Mono, monospace' }}>Bs</span>
                                  <input
                                    value={p.pvp}
                                    onChange={e => updateProducto(p.id, { pvp: e.target.value })}
                                    type="number" step="any" min="0"
                                    placeholder="0"
                                    style={{
                                      width: '100%', boxSizing: 'border-box',
                                      background: 'var(--bg-primary)',
                                      border: `2px solid color-mix(in srgb, ${accentColor.startsWith('var') ? '#16a34a' : accentColor} 35%, transparent)`,
                                      borderRadius: '4px',
                                      color: 'var(--text-primary)',
                                      padding: '5px 36px 5px 26px',
                                      fontSize: '13px', outline: 'none',
                                      fontFamily: 'IBM Plex Mono, monospace',
                                      textAlign: 'right',
                                      fontWeight: 600,
                                    }}
                                    onFocus={e => e.target.style.borderColor = accentColor}
                                    onBlur={e => e.target.style.borderColor = `color-mix(in srgb, ${accentColor.startsWith('var') ? '#16a34a' : accentColor} 35%, transparent)`}
                                  />
                                  <span style={{ position: 'absolute', right: '7px', fontSize: '10px', color: 'var(--text-tertiary)', pointerEvents: 'none' }}>/kg</span>
                                </div>
                                {sensActiva && (
                                  <span style={{ fontSize: '9px', color: 'var(--text-tertiary)', textAlign: 'right', fontStyle: 'italic' }} title="Sensibilidad: cuánto cambia la utilidad al subir el PVP 1 Bs/kg">
                                    +1Bs → +Bs {p.deltaUtilPor1BsPvp.toFixed(0)}
                                  </span>
                                )}
                              </div>

                              <span style={{ fontSize: '16px', color: 'var(--text-tertiary)', fontWeight: 300, paddingBottom: '2px' }}>=</span>

                              {/* Ingreso (resultado destacado) */}
                              <div style={{ display: 'flex', flexDirection: 'column', gap: '2px', flex: 1, minWidth: '90px', alignItems: 'flex-end' }}>
                                <span style={{ fontSize: '9px', color: 'var(--text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.06em', fontWeight: 700 }}>Ingreso</span>
                                <span style={{ fontFamily: 'IBM Plex Mono, monospace', fontSize: '15px', color: p.ingreso > 0 ? 'var(--text-primary)' : 'var(--text-tertiary)', fontWeight: 700 }}>
                                  {p.ingreso > 0 ? `Bs ${Math.round(p.ingreso).toLocaleString('es-BO')}` : '—'}
                                </span>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>

                    {/* Agregar producto */}
                    {editProductos && (
                      <button
                        onClick={addProducto}
                        style={{ marginTop: '10px', alignSelf: 'flex-start', background: 'transparent', border: `1px dashed color-mix(in srgb, ${accentColor.startsWith('var') ? '#16a34a' : accentColor} 53%, transparent)`, color: accentColor, borderRadius: '6px', padding: '8px 14px', fontSize: '12px', fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px' }}
                      >
                        <Icon name="plus" size={13} /> Agregar producto
                      </button>
                    )}

                    {/* Cortes sin producto asignado — informativos */}
                    {cortesExtra.map(c => (
                      <div key={c.id} style={{ marginTop: '8px', display: 'flex', alignItems: 'center', gap: '8px', padding: '8px 12px', background: 'var(--bg-tertiary)', borderRadius: '6px', border: '1px dashed var(--border-subtle)' }}>
                        <div style={{ width: '8px', height: '8px', borderRadius: '2px', background: c.color, flexShrink: 0 }} />
                        <span style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>
                          <strong style={{ color: 'var(--text-primary)' }}>{c.label}</strong> ({(pcf * c.pct / 100).toFixed(1)} kg, {c.pct.toFixed(2).replace(/\.?0+$/, '')}%) — sin producto asignado
                        </span>
                        <InfoTip text="Este corte está en la distribución de PCF pero ningún producto del simulador lo recibe (ni como primario ni como alternativa). Su rendimiento no entra en la utilidad. Agregá un producto que lo use o asignalo como alternativa de uno existente." />
                      </div>
                    ))}

                    {/* Descarte (sin ingreso) — solo si existe */}
                    {cortesById.descarte && (
                      <div style={{ marginTop: '8px', display: 'flex', alignItems: 'center', gap: '8px', padding: '8px 12px', opacity: 0.6 }}>
                        <div style={{ width: '8px', height: '8px', borderRadius: '2px', background: cortesById.descarte.color, flexShrink: 0 }} />
                        <span style={{ fontSize: '11px', color: 'var(--text-tertiary)' }}>{cortesById.descarte.label} ({simKgDescarte.toFixed(1)} kg, {getCortePct('descarte').toFixed(2).replace(/\.?0+$/, '')}%) — sin valor comercial</span>
                      </div>
                    )}
                  </div>

                  {/* 3. Reroutings activos (alternativa ganó al primario) */}
                  {reroutings.length > 0 && (
                    <div data-tour="reroutings" style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                      {reroutings.map((r, i) => (
                        <div
                          key={i}
                          style={{
                            display: 'flex', alignItems: 'flex-start', gap: '8px',
                            background: `color-mix(in srgb, ${r.corte.color} 10%, transparent)`,
                            borderRadius: '6px', padding: '10px 12px',
                            border: `1px solid color-mix(in srgb, ${r.corte.color} 33%, transparent)`,
                          }}
                        >
                          <Icon name="info" size={13} style={{ color: r.corte.color, flexShrink: 0, marginTop: '1px' }} />
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '3px' }}>
                            <span style={{ fontSize: '12px', fontWeight: 600, color: r.corte.color }}>
                              {r.corte.label} ({(pcf * r.corte.pct / 100).toFixed(1)} kg) → {r.productoAsignado.nombre} (mayor margen)
                            </span>
                            <span style={{ fontSize: '11px', color: 'var(--text-tertiary)' }}>
                              Margen {r.productoAsignado.nombre}: Bs {r.margenAsignado.toFixed(2)}/kg · Margen {r.productoPrimario.nombre}: Bs {r.margenPrimario.toFixed(2)}/kg
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* 4. Resumen del mix del despiece (las utilidades viven en la tabla comparativa) */}
                  <div style={{ background: 'var(--bg-tertiary)', borderRadius: '8px', padding: '12px 14px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '10px', flexWrap: 'wrap' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <Icon name="info" size={14} style={{ color: industrialEsMejor ? goldColor : 'var(--text-tertiary)', flexShrink: 0 }} />
                      <span style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
                        <strong style={{ color: 'var(--text-primary)' }}>Mix configurado:</strong> {simMixProduccion.productos.map(p => p.nombre).join(' · ') || 'Sin productos — agregá cortes en el editor'}
                      </span>
                    </div>
                    {simTotalIngreso === 0 && (
                      <span style={{ fontSize: '11px', color: 'var(--text-tertiary)', fontStyle: 'italic' }}>
                        Ingresá los PVPs para que el escenario despiece aparezca en el comparador.
                      </span>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ICA */}
          {hayDatosAlimento ? (
            <div style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border-subtle)', borderRadius: '8px', padding: '16px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '12px' }}>
                <span style={{ fontSize: '11px', fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase', color: accentColor }}>Conversión alimenticia del lote</span>
                <InfoTip text="El ICA (Índice de Conversión Alimenticia) mide cuántos kg de alimento se necesitaron para producir 1 kg de ganancia de peso vivo. Cuanto más bajo, más eficiente el lote. Si está por encima del rango de referencia, indica desperdicio de alimento, problemas sanitarios o genética poco eficiente." />
              </div>
              <div className="liquidacion-ica-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '12px', marginBottom: '12px' }}>
                {[
                  { label: 'Alimento consumido (Bs)',  val: `Bs ${alimentoConsumido.toFixed(0)}`, tip: 'Suma del gasto en alimento balanceado y forraje registrado en el diario de producción del lote.' },
                  { label: 'Ganancia de peso total',   val: `${gananciaTotal.toFixed(0)} kg`, tip: 'Kilos ganados por el lote desde el ingreso: (peso final − peso inicial) × cabezas vendidas.' },
                  { label: 'Índice conversión (ICA)',  val: `${ica} kg/kg`, highlight: true, tip: 'Kg de alimento por cada kg ganado. Fórmula: alimento consumido (kg) ÷ ganancia de peso total (kg). Comparalo con el rango de referencia para tu especie.' },
                ].map((s, i) => (
                  <div key={i} style={{ background: 'var(--bg-tertiary)', borderRadius: '6px', padding: '10px 12px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '5px', fontSize: '10px', color: 'var(--text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '4px' }}>
                      <span>{s.label}</span>
                      {s.tip && <InfoTip text={s.tip} />}
                    </div>
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

          {/* ── Selector de escenario a liquidar ── */}
          {!sinDatosVenta && (
            <div data-tour="selector-escenario" style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border-subtle)', borderRadius: '8px', padding: '16px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px', flexWrap: 'wrap', gap: '8px' }}>
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', fontSize: '11px', fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase', color: accentColor }}>
                  Escenario a liquidar
                  <InfoTip text="Elegí cómo querés cerrar este lote. El sistema sugiere el escenario de mayor utilidad, pero podés forzar otro (p. ej. si no tenés planta de despiece o si tu cliente prefiere comprar en pie). La elección manual se mantiene mientras edites otros valores; si querés volver a la sugerencia, presioná 'Volver a recomendación'." />
                </span>
                {escenarioTocado && (
                  <button
                    onClick={volverARecomendacion}
                    style={{ background: 'transparent', border: '1px solid var(--border-subtle)', color: 'var(--text-tertiary)', borderRadius: '4px', padding: '3px 9px', fontSize: '10px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px' }}
                  >
                    <Icon name="check" size={10} /> Volver a recomendación
                  </button>
                )}
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '10px' }}>
                {escenariosMeta.map(e => {
                  const sel  = e.id === escenarioElegido;
                  const rec  = e.id === mejorEscenario;
                  const dis  = !e.disponible;
                  const colorUtil = e.utilidad == null ? 'var(--text-tertiary)' : (e.utilidad >= 0 ? 'var(--accent-success)' : 'var(--accent-danger)');
                  return (
                    <button
                      key={e.id}
                      onClick={() => !dis && seleccionarEscenario(e.id)}
                      disabled={dis}
                      style={{
                        textAlign: 'left',
                        cursor: dis ? 'not-allowed' : 'pointer',
                        padding: '12px 14px',
                        borderRadius: '8px',
                        border: `2px solid ${sel ? accentColor : 'var(--border-subtle)'}`,
                        background: sel ? `color-mix(in srgb, ${accentColor.startsWith('var') ? '#16a34a' : accentColor} 8%, transparent)` : 'var(--bg-tertiary)',
                        opacity: dis ? 0.45 : 1,
                        display: 'flex', flexDirection: 'column', gap: '6px',
                        transition: 'all 0.15s', fontFamily: 'IBM Plex Sans, sans-serif',
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <div style={{
                          width: '14px', height: '14px', borderRadius: '50%',
                          border: `2px solid ${sel ? accentColor : 'var(--border-mid)'}`,
                          background: sel ? accentColor : 'transparent',
                          display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                        }}>
                          {sel && <div style={{ width: '4px', height: '4px', borderRadius: '50%', background: '#fff' }} />}
                        </div>
                        <span style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-primary)' }}>{e.label}</span>
                        {rec && (
                          <span style={{ fontSize: '9px', fontWeight: 700, color: accentColor, background: 'color-mix(in srgb, ' + (accentColor.startsWith('var') ? '#16a34a' : accentColor) + ' 18%, transparent)', padding: '1px 6px', borderRadius: '3px' }}>
                            ★ RECOMENDADO
                          </span>
                        )}
                      </div>
                      <div style={{ fontFamily: 'IBM Plex Mono, monospace', fontSize: '15px', fontWeight: 600, color: colorUtil }}>
                        {e.utilidad == null ? '—' : `Bs ${e.utilidad.toLocaleString('es-BO', { maximumFractionDigits: 0 })}`}
                      </div>
                      {dis && (
                        <span style={{ fontSize: '10px', color: 'var(--text-tertiary)', fontStyle: 'italic' }}>
                          {e.id === 'despiece' ? 'Configurá precios en el simulador' : 'Sin datos suficientes'}
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>

              {escenarioTocado && escenarioElegidoMeta && recomendadoMeta && escenarioElegidoMeta.id !== recomendadoMeta.id && escenarioElegidoMeta.utilidad != null && recomendadoMeta.utilidad != null && (
                <div style={{ marginTop: '12px', padding: '8px 12px', borderRadius: '6px', background: 'color-mix(in srgb, var(--accent-warn, #f59e0b) 8%, transparent)', border: '1px solid color-mix(in srgb, var(--accent-warn, #f59e0b) 28%, transparent)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <Icon name="alertTriangle" size={13} style={{ color: '#f59e0b', flexShrink: 0 }} />
                  <span style={{ fontSize: '12px', color: 'var(--text-secondary)', lineHeight: 1.4 }}>
                    Elegiste un escenario con{' '}
                    <strong style={{ fontFamily: 'IBM Plex Mono, monospace', color: 'var(--accent-danger)' }}>
                      Bs {Math.abs(escenarioElegidoMeta.utilidad - recomendadoMeta.utilidad).toLocaleString('es-BO', { maximumFractionDigits: 0 })}
                    </strong>{' '}
                    menos de utilidad que el recomendado ({recomendadoMeta.label}).
                  </span>
                </div>
              )}
            </div>
          )}

          {/* Toggle: liquidación parcial */}
          {loteData && cabezasVenta > 0 && cabezasVenta < (loteData.cabezasActivas ?? 0) && (
            <div data-tour="parcial" style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border-subtle)', borderRadius: '8px', padding: '14px 16px', display: 'flex', alignItems: 'flex-start', gap: '12px' }}>
              <input
                id="mantener-activo"
                type="checkbox"
                checked={mantenerActivo}
                onChange={e => setMantenerActivo(e.target.checked)}
                style={{ marginTop: '3px', cursor: 'pointer', accentColor: accentColor, width: '16px', height: '16px', flexShrink: 0 }}
              />
              <label htmlFor="mantener-activo" style={{ cursor: 'pointer', flex: 1 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '4px' }}>
                  <span style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-primary)' }}>
                    Liquidación parcial — mantener lote activo con las {(loteData.cabezasActivas ?? 0) - cabezasVenta} cabezas restantes
                  </span>
                  <InfoTip
                    width={300}
                    text={`Sin marcar: el lote se cierra completo y las ${(loteData.cabezasActivas ?? 0) - cabezasVenta} cabezas restantes desaparecen del tracking.\n\nMarcado: solo se venden ${cabezasVenta} cabezas. El lote sigue activo con ${(loteData.cabezasActivas ?? 0) - cabezasVenta} cabezas. Se registra una entrada en bitácora con el costo proporcional imputado a esta venta (${(cabezasVenta * 100 / loteData.cabezasActivas).toFixed(1)}% del costo total), de modo que el costo del lote remanente queda ajustado automáticamente.`}
                  />
                </div>
                <div style={{ fontSize: '12px', color: 'var(--text-tertiary)', lineHeight: 1.4 }}>
                  Costo imputado a esta venta: <span style={{ fontFamily: 'IBM Plex Mono, monospace', color: 'var(--text-secondary)' }}>
                    Bs {Math.round(costoTotalLote * cabezasVenta / (loteData.cabezasActivas || 1)).toLocaleString('es-BO')}
                  </span>
                  {' '}({(cabezasVenta * 100 / (loteData.cabezasActivas || 1)).toFixed(1)}% del costo total)
                </div>
              </label>
            </div>
          )}

          <div data-tour="boton-liquidar" style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <button
              onClick={() => { setConfirmError(null); setShowConfirm(true); }}
              disabled={!puedeLiquidar}
              title={puedeLiquidar ? '' : motivosBloqueo.join(' ')}
              style={{
                flex: 1,
                padding: '14px',
                borderRadius: '8px',
                border: `2px solid ${puedeLiquidar ? accentColor : 'var(--border-subtle)'}`,
                background: puedeLiquidar ? accentColor : 'var(--bg-tertiary)',
                color: puedeLiquidar ? '#fff' : 'var(--text-tertiary)',
                cursor: puedeLiquidar ? 'pointer' : 'not-allowed',
                opacity: puedeLiquidar ? 1 : 0.6,
                fontSize: '14px',
                fontWeight: 500,
                fontFamily: 'IBM Plex Sans, sans-serif',
                transition: 'all 0.15s',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px',
              }}
            >
              <Icon name="checkSquare" size={16} /> Registrar liquidación y cerrar lote
            </button>
            {!puedeLiquidar && (
              <InfoTip
                width={280}
                text={`Faltan datos para liquidar:\n\n• ${motivosBloqueo.join('\n• ')}`}
              />
            )}
          </div>
        </div>
      </div>

      {/* Modal de confirmación */}
      {showConfirm && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', zIndex: 300, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border-mid)', borderRadius: '10px', padding: '28px 32px', width: '440px', maxWidth: 'calc(100vw - 32px)', display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {confirmError && (
              <div style={{ background: 'color-mix(in srgb, var(--accent-danger) 8%, transparent)', border: '1px solid color-mix(in srgb, var(--accent-danger) 28%, transparent)', borderRadius: '6px', padding: '10px 12px', fontSize: '13px', color: 'var(--accent-danger)', lineHeight: 1.5 }}>
                {confirmError}
              </div>
            )}
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <Icon name="scale" size={20} style={{ color: accentColor }} />
              <span style={{ fontSize: '16px', fontWeight: 500, color: 'var(--text-primary)' }}>
                {mantenerActivo && cabezasVenta < (loteData?.cabezasActivas ?? 0)
                  ? `¿Vender ${cabezasVenta} cabezas (parcial)?`
                  : '¿Cerrar este lote?'}
              </span>
            </div>

            {/* Tabla resumen del escenario elegido */}
            {escenarioElegidoMeta && (() => {
              const m = escenarioElegidoMeta;
              const utilColor = m.utilidad == null ? 'var(--text-tertiary)' : (m.utilidad >= 0 ? 'var(--accent-success)' : 'var(--accent-danger)');
              const fmtBs  = (v) => v == null ? '—' : `Bs ${Math.round(v).toLocaleString('es-BO')}`;
              const fmtKg  = (v) => v == null ? '—' : `${v.toFixed(1)} kg`;
              const fmtPct = (v) => v == null ? '—' : `${v.toFixed(0)}%`;
              const filas = [
                { label: 'Lote',              val: `#${loteData?.id}`,                 mono: true },
                { label: 'Escenario',         val: m.label,                            highlight: true },
                { label: 'Cabezas vendidas',  val: cabezasVenta.toLocaleString('es-BO'), mono: true },
                { label: 'Peso liquidado',    val: fmtKg(m.kgUtil),                   mono: true, sep: true },
                { label: 'Ingreso bruto',     val: fmtBs(m.ingreso),                  mono: true },
                { label: 'Costo del lote',    val: fmtBs(costoTotalLote),             mono: true },
                { label: 'Gastos de venta',   val: fmtBs(m.gastos),                   mono: true, sep: true },
                { label: 'Utilidad neta',     val: fmtBs(m.utilidad),                 mono: true, big: true, color: utilColor },
                { label: 'Utilidad / cabeza', val: fmtBs(m.utilCabeza),               mono: true, color: utilColor },
                { label: 'Margen s/ costo',   val: fmtPct(m.margen),                  mono: true, color: utilColor },
              ];
              return (
                <div style={{ background: 'var(--bg-tertiary)', borderRadius: '8px', padding: '14px 16px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  {filas.map((f, i) => (
                    <React.Fragment key={i}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', fontSize: f.big ? '14px' : '12px' }}>
                        <span style={{ color: f.big ? 'var(--text-primary)' : 'var(--text-secondary)', fontWeight: f.big ? 600 : 400 }}>{f.label}</span>
                        <span style={{
                          fontFamily: f.mono ? 'IBM Plex Mono, monospace' : 'inherit',
                          color: f.color || (f.highlight ? accentColor : 'var(--text-primary)'),
                          fontWeight: f.big ? 700 : (f.highlight ? 600 : 500),
                          fontSize: f.big ? '15px' : (f.mono ? '12px' : '13px'),
                        }}>{f.val}</span>
                      </div>
                      {f.sep && <div style={{ height: '1px', background: 'var(--border-subtle)', margin: '2px 0' }} />}
                    </React.Fragment>
                  ))}
                </div>
              );
            })()}

            <p style={{ fontSize: '12px', color: 'var(--text-tertiary)', lineHeight: 1.5, margin: 0 }}>
              {mantenerActivo && cabezasVenta < (loteData?.cabezasActivas ?? 0)
                ? `Al confirmar, se registra la venta de ${cabezasVenta} cabezas y el lote queda activo con ${(loteData?.cabezasActivas ?? 0) - cabezasVenta} cabezas restantes. El costo proporcional se descontará del lote remanente.`
                : 'Al confirmar, el lote se mueve al historial y deja de aparecer como activo. Esta acción no se puede deshacer.'}
            </p>

            {advertencias.length > 0 && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {advertencias.map((adv, i) => (
                  <div key={i} style={{
                    display: 'flex', alignItems: 'flex-start', gap: '8px',
                    padding: '10px 12px', borderRadius: '6px',
                    background: 'color-mix(in srgb, #f59e0b 10%, transparent)',
                    border: '1px solid color-mix(in srgb, #f59e0b 33%, transparent)',
                  }}>
                    <Icon name="alertTriangle" size={14} style={{ color: '#f59e0b', flexShrink: 0, marginTop: '1px' }} />
                    <span style={{ fontSize: '12px', color: 'var(--text-secondary)', lineHeight: 1.5 }}>{adv}</span>
                  </div>
                ))}
              </div>
            )}

            <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
              <Btn variant="secondary" onClick={() => setShowConfirm(false)} disabled={liquidando}>Cancelar</Btn>
              <Btn accentColor={accentColor} icon="checkSquare" onClick={handleConfirmLiquidar} disabled={liquidando}>
                {liquidando ? 'Registrando...' : (advertencias.length > 0 ? 'Confirmar de todas formas' : 'Confirmar y cerrar')}
              </Btn>
            </div>
          </div>
        </div>
      )}

      {/* Tour guiado */}
      <GuidedTour
        steps={tourSteps}
        active={tourActivo}
        onClose={() => setTourActivo(false)}
        accentColor="#16a34a"
      />
    </div>
  );
};

export default Liquidacion;
