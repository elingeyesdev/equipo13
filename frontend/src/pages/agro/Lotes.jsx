import React, { useState, useEffect } from 'react';
import { Icon } from '../../icons.jsx';
import { MoneyDisplay, StatusBadge, Btn, InfoBanner, InfoTip, FormulaHint } from '../../components/ui.jsx';
import { apiFetch } from '../../config/api.js';
import { PRESETS_PESAJE, intervaloSugeridoPorEspecie } from '../../constants/pesaje.js';

function estadoPesajeLote(lote, intervaloNegocio) {
  if (lote.pesaje_activo === false) return { texto: 'Pesaje apagado', vencido: false };
  const intervalo = lote.pesaje_intervalo_dias ?? intervaloNegocio ?? 14;
  const base = lote.ultimo_pesaje_fecha
    ? new Date(lote.ultimo_pesaje_fecha)
    : (lote.fecha_entrada ? new Date(lote.fecha_entrada) : null);
  if (!base) return { texto: 'Sin fecha', vencido: false };
  const proximo = new Date(base); proximo.setDate(proximo.getDate() + intervalo);
  const hoy = new Date(); hoy.setHours(0,0,0,0);
  const vencido = proximo < hoy;
  const proximoStr = proximo.toISOString().split('T')[0];
  return { texto: vencido ? `Vencido (tocaba ${proximoStr})` : `Próximo: ${proximoStr}`, vencido };
}

export const LOTES_DATA = [];
const TIPOS_ANIMAL = ['Cerdo', 'Bovino', 'Ovino', 'Caprino', 'Otro'];

const CAT_COLORS_AGRO = {
  adquisicion: 'var(--accent-agro)',
  alimento:    'var(--accent-industrial)',
  sanidad:     'var(--accent-warning)',
  moObra:      'var(--text-tertiary)',
  otros:       'var(--text-secondary)',
};
const CAT_LABELS = {
  adquisicion: 'Adquisición',
  alimento:    'Alimento',
  sanidad:     'Sanidad',
  moObra:      'Mano de obra',
  otros:       'Otros',
};
const COSTOS_ORDER = ['adquisicion', 'alimento', 'sanidad', 'moObra', 'otros'];

const fetchCostosDetalle = async (negocioId, loteUuid) => {
  if (!negocioId || !loteUuid) {
    return { alimento: null, sanidad: null, mano_obra: null, otros: null, total: null };
  }
  try {
    const d = await apiFetch(`/api/negocios/${negocioId}/lotes/${loteUuid}/costos-detalle`);
    return {
      adquisicion: Number(d.adquisicion) || 0,
      alimento: Number(d.alimento) || 0,
      sanidad: Number(d.sanidad) || 0,
      mano_obra: Number(d.mano_obra) || 0,
      otros: Number(d.otros) || 0,
      total: Number(d.total) || 0,
    };
  } catch {
    return { alimento: null, sanidad: null, mano_obra: null, otros: null, total: null };
  }
};

const fetchIca = async (negocioId, loteUuid) => {
  if (!negocioId || !loteUuid) return null;
  try {
    return await apiFetch(`/api/negocios/${negocioId}/lotes/${loteUuid}/ica`);
  } catch {
    return null;
  }
};

const fetchPuntoEquilibrio = async (negocioId, loteUuid) => {
  if (!negocioId || !loteUuid) return null;
  try {
    return await apiFetch(`/api/negocios/${negocioId}/lotes/${loteUuid}/punto-equilibrio`);
  } catch {
    return null;
  }
};

const NuevoLoteModal = ({ onClose, onSave, accentColor, intervaloNegocio }) => {
  const [form, setForm] = useState({
    tipo: 'Cerdo',
    identificador: '',
    fecha_entrada: '',
    edad_promedio_dias: '0',
    cabezas_inicio: '50',
    peso_inicial_prom: '8.5',
    costo_unitario: '',
    pesaje_activo: true,
    pesaje_intervalo_dias: intervaloSugeridoPorEspecie('Cerdo'),
  });
  const [saving, setSaving] = useState(false);
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));
  
  const cabezas = parseFloat(form.cabezas_inicio) || 0;
  const pesoUnit = parseFloat(form.peso_inicial_prom) || 0;
  const costoUnit = parseFloat(form.costo_unitario) || 0;
  
  const totalPeso = cabezas * pesoUnit;
  const costoTotal = cabezas * costoUnit;

  const iField = (label, key, type = 'text', placeholder = '', tip = null) => (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
        <label style={{ fontSize: '10px', color: 'var(--text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>{label}</label>
        {tip && <InfoTip text={tip} />}
      </div>
      <input value={form[key]} onChange={e => set(key, e.target.value)}
        type={type} placeholder={placeholder} step={type === 'number' ? 'any' : undefined}
        style={{ background: 'var(--bg-tertiary)', border: '1px solid var(--border-subtle)', borderRadius: '6px', color: 'var(--text-primary)', padding: '8px 11px', fontSize: '14px', outline: 'none', fontFamily: type === 'number' ? 'IBM Plex Mono, monospace' : 'IBM Plex Sans, sans-serif' }}
        onFocus={e => e.target.style.borderColor = accentColor} onBlur={e => e.target.style.borderColor = 'var(--border-subtle)'}
      />
    </div>
  );

  const handleSave = async () => {
    if (!form.identificador) return;
    setSaving(true);
    try {
      await onSave({
        ...form,
        cabezas_inicio: cabezas,
        peso_inicial_prom: pesoUnit,
        costo_adquisicion: costoTotal,
      });
      onClose();
    } finally {
      setSaving(false);
    }
  };

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', zIndex: 300, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ width: '500px', background: 'var(--bg-secondary)', border: '1px solid var(--border-mid)', borderRadius: '12px', overflow: 'hidden', animation: 'fadeIn 0.2s ease' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '20px 24px', borderBottom: '1px solid var(--border-subtle)' }}>
          <span style={{ fontSize: '15px', fontWeight: 500, color: 'var(--text-primary)' }}>Registrar lote de engorde</span>
          <button onClick={onClose} style={{ background: 'transparent', border: 'none', color: 'var(--text-tertiary)', cursor: 'pointer' }}><Icon name="x" size={16} /></button>
        </div>
        <div style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
              <label style={{ fontSize: '10px', color: 'var(--text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Tipo de animal</label>
              <select value={form.tipo} onChange={e => setForm(f => ({ ...f, tipo: e.target.value, pesaje_intervalo_dias: intervaloSugeridoPorEspecie(e.target.value) }))} style={{ height: '38px' }}>
                {TIPOS_ANIMAL.map(t => <option key={t}>{t}</option>)}
              </select>
            </div>
            {iField('Identificador', 'identificador', 'text', 'L-2025-XXX')}
          </div>
          {iField('Fecha de entrada', 'fecha_entrada', 'date')}

          <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
            <label style={{ fontSize: '10px', color: 'var(--text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Edad promedio al ingreso (días)</label>
            <input
              value={form.edad_promedio_dias}
              onChange={e => set('edad_promedio_dias', e.target.value)}
              type="number" min="0" step="1" placeholder="Ej: 28"
              style={{ background: 'var(--bg-tertiary)', border: '1px solid var(--border-subtle)', borderRadius: '6px', color: 'var(--text-primary)', padding: '8px 11px', fontSize: '14px', outline: 'none', fontFamily: 'IBM Plex Mono, monospace' }}
              onFocus={e => e.target.style.borderColor = accentColor}
              onBlur={e => e.target.style.borderColor = 'var(--border-subtle)'}
            />
            <span style={{ fontSize: '11px', color: 'var(--text-tertiary)' }}>Ej: lechones de 28 días → ingresar 28</span>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', borderTop: '1px solid var(--border-subtle)', paddingTop: '16px' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
              <label style={{ fontSize: '10px', color: 'var(--text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Cadencia de pesaje</label>
              <select
                value={form.pesaje_intervalo_dias === null ? '' : form.pesaje_intervalo_dias}
                onChange={e => set('pesaje_intervalo_dias', e.target.value === '' ? null : Number(e.target.value))}
                style={{ height: '38px', background: 'var(--bg-tertiary)', border: '1px solid var(--border-subtle)', borderRadius: '6px', color: 'var(--text-primary)', padding: '0 11px', fontSize: '14px', outline: 'none' }}
              >
                <option value="">Usar default ({intervaloNegocio} días)</option>
                {PRESETS_PESAJE.filter(p => p.dias !== null).map(p => (
                  <option key={p.dias} value={p.dias}>{p.label}</option>
                ))}
              </select>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', paddingTop: '18px' }}>
              <input
                type="checkbox"
                checked={form.pesaje_activo}
                onChange={e => set('pesaje_activo', e.target.checked)}
                id="chk-pesaje"
              />
              <label htmlFor="chk-pesaje" style={{ fontSize: '13px', color: 'var(--text-primary)', cursor: 'pointer' }}>Activar recordatorios</label>
            </div>
          </div>

          <div style={{ borderTop: '1px solid var(--border-subtle)', paddingTop: '16px' }}>
            <div style={{ fontSize: '11px', fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase', color: accentColor, marginBottom: '12px' }}>Animales de entrada</div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
              {iField('Cantidad (cabezas)', 'cabezas_inicio', 'number')}
              {iField('Peso promedio (kg/cab)', 'peso_inicial_prom', 'number')}
              {iField('Costo unitario (Bs/cab)', 'costo_unitario', 'number', '', 'Precio de compra por animal. El sistema multiplica por la cantidad de cabezas para obtener el costo total de adquisición del lote.')}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '5px', justifyContent: 'flex-end' }}>
                <div style={{ background: 'var(--bg-tertiary)', borderRadius: '6px', padding: '8px 11px' }}>
                  <div style={{ fontSize: '10px', color: 'var(--text-tertiary)', marginBottom: '3px' }}>Total adquisición</div>
                  <div style={{ fontFamily: 'IBM Plex Mono, monospace', fontSize: '14px', color: accentColor }}>Bs {costoTotal.toLocaleString('es-BO', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>
                </div>
              </div>
            </div>
            <div style={{ marginTop: '10px', padding: '10px 12px', background: 'var(--bg-tertiary)', borderRadius: '6px', fontSize: '12px', color: 'var(--text-secondary)', lineHeight: 1.6 }}>
              Peso total de entrada: <span style={{ fontFamily: 'IBM Plex Mono, monospace', color: 'var(--text-primary)' }}>{totalPeso.toLocaleString()} kg</span>
              {' · '}El costo de adquisición incluye el animal y el flete de compra.
            </div>
          </div>
        </div>
        <div style={{ padding: '16px 24px', borderTop: '1px solid var(--border-subtle)', display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
          <Btn variant="secondary" onClick={onClose}>Cancelar</Btn>
          <Btn accentColor={accentColor} icon="plus" onClick={handleSave} disabled={saving}>
            {saving ? 'Registrando…' : 'Registrar lote →'}
          </Btn>
        </div>
      </div>
      <style>{`@keyframes fadeIn { from { opacity:0; transform:translateY(8px); } to { opacity:1; transform:translateY(0); } }`}</style>
    </div>
  );
};

// Mapea el lote de la API al formato que usa LoteCard
const mapLoteFromApi = (l, costosDetalle, icaData, peData) => ({
  ...l,
  id: l.identificador || l.id,
  _id: l.id,
  tipo: l.tipo_animal,
  entrada: l.fecha_entrada ? new Date(l.fecha_entrada).toLocaleDateString('es-BO', { day: '2-digit', month: 'short', year: 'numeric' }) : '—',
  dias: l.fecha_entrada ? Math.floor((Date.now() - new Date(l.fecha_entrada)) / 86400000) : 0,
  bajas: (l.cabezas_inicio || 0) - (l.cabezas_activas || 0),
  cabezasActivas: l.cabezas_activas || 0,
  pesoInicialProm: parseFloat(l.peso_inicial_prom) || 0,
  pesoActualProm: parseFloat(l.peso_actual_prom) || 0,
  costos: {
    adquisicion: costosDetalle?.adquisicion ?? parseFloat(l.costo_adquisicion) ?? 0,
    alimento: costosDetalle?.alimento ?? null,
    sanidad: costosDetalle?.sanidad ?? null,
    moObra: costosDetalle?.mano_obra ?? null,
    otros: costosDetalle?.otros ?? null,
  },
  costosTotal: costosDetalle?.total ?? null,
  icaData: icaData ?? null,
  peData: peData ?? null,
});

const ICA_COLOR = { verde: 'var(--accent-success)', ambar: 'var(--accent-warning)', rojo: 'var(--accent-danger)' };
const ICA_LABEL = { verde: 'Eficiente', ambar: 'Aceptable', rojo: 'Revisar' };

const LoteCard = ({ lote, onBitacora, onLiquidar, accentColor, isCerrado, intervaloNegocio }) => {
  const [desgloseOpen, setDesgloseOpen] = useState(false);
  const totalCosto = lote.costosTotal != null
    ? lote.costosTotal
    : (parseFloat(lote.costo_total) || Object.values(lote.costos).reduce((s, v) => s + (v ?? 0), 0));
  const costoCabeza = lote.cabezasActivas > 0 ? totalCosto / lote.cabezasActivas : 0;
  const pesoGanado = lote.pesoActualProm - lote.pesoInicialProm;
  const refConv = lote.tipo === 'Cerdo' ? '2.5–3.0' : '6.0–8.0';
  const icaColor = ICA_COLOR[lote.icaData?.estado] ?? 'var(--text-tertiary)';
  const CostBar = ({ key_, label, val }) => {
    const pct = totalCosto > 0 && val != null ? (val / totalCosto) * 100 : 0;
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px' }}>
          <span style={{ color: 'var(--text-secondary)' }}>{label}</span>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            {val != null
              ? <MoneyDisplay value={val} size="xs" />
              : <span style={{ fontFamily: 'IBM Plex Mono, monospace', fontSize: '12px', color: 'var(--text-tertiary)' }}>—</span>}
            <span style={{ fontFamily: 'IBM Plex Mono, monospace', fontSize: '11px', color: 'var(--text-tertiary)', width: '32px', textAlign: 'right' }}>
              {val != null ? `${pct.toFixed(0)}%` : '—'}
            </span>
          </div>
        </div>
        <div style={{ height: '4px', background: 'var(--bg-tertiary)', borderRadius: '2px', overflow: 'hidden' }}>
          <div style={{ width: `${pct}%`, height: '100%', background: CAT_COLORS_AGRO[key_], borderRadius: '2px' }} />
        </div>
      </div>
    );
  };

  return (
    <div style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border-subtle)', borderRadius: '10px', padding: '20px', display: 'flex', flexDirection: 'column', gap: '18px', opacity: isCerrado ? 0.65 : 1 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '4px' }}>
            <span style={{ fontSize: '15px', fontWeight: 500, color: 'var(--text-primary)' }}>Lote #{lote.id}</span>
            <StatusBadge label={lote.tipo} color={accentColor} />
            {isCerrado && (
              <span style={{ padding: '3px 10px', borderRadius: '4px', fontSize: '11px', fontWeight: 700, background: 'var(--accent-danger)22', color: 'var(--accent-danger)', border: '1px solid var(--accent-danger)55', letterSpacing: '0.06em', textTransform: 'uppercase' }}>
                Faenado
              </span>
            )}
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ fontSize: '13px', color: 'var(--text-tertiary)' }}>{lote.dias} días en engorde · Entrada: {lote.entrada}</span>
            {(() => {
              const est = estadoPesajeLote(lote, intervaloNegocio);
              return (
                <span style={{ fontSize: '12px', color: est.vencido ? 'var(--accent-warning)' : 'var(--text-tertiary)', background: 'var(--bg-tertiary)', padding: '2px 6px', borderRadius: '4px', border: '1px solid var(--border-subtle)' }}>
                  {est.vencido ? '⚠ ' : ''}{est.texto}
                </span>
              );
            })()}
          </div>
        </div>
        <div style={{ textAlign: 'right' }}>
          <div style={{ fontFamily: 'IBM Plex Mono, monospace', fontSize: '11px', color: 'var(--text-tertiary)', marginBottom: '2px' }}>Ganancia de peso</div>
          <div style={{ fontFamily: 'IBM Plex Mono, monospace', fontSize: '20px', color: accentColor, fontWeight: 500 }}>
            +{pesoGanado.toFixed(1)} <span style={{ fontSize: '12px', fontWeight: 400 }}>kg/cab</span>
          </div>
          <div style={{ fontSize: '11px', color: 'var(--text-tertiary)' }}>ref. {lote.tipo}: {refConv}</div>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '10px' }}>
        {[
          { label: 'Activos',            val: `${lote.cabezasActivas} cabezas` },
          { label: 'Bajas',              val: lote.bajas === 0 ? '— sin bajas' : `${lote.bajas} baja${lote.bajas > 1 ? 's' : ''}`, warn: lote.bajas > 0,
            tip: 'Animales muertos o perdidos. El sistema descuenta la cabeza del conteo y redistribuye su costo entre los sobrevivientes.' },
          { label: 'Peso inicial prom.', val: `${lote.pesoInicialProm} kg/cab`,
            tip: 'Peso promedio por cabeza al entrar al lote. Se usa para calcular la ganancia total de peso al cierre del ciclo.' },
          { label: 'Peso actual est.',   val: `${lote.pesoActualProm} kg/cab`,
            tip: 'Peso promedio estimado a hoy. Actualizá con un pesaje real en el diario de producción para mayor precisión.' },
        ].map((s, i) => (
          <div key={i} style={{ background: 'var(--bg-tertiary)', borderRadius: '6px', padding: '10px 12px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '10px', color: 'var(--text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '4px' }}>
              {s.label}
              {s.tip && <InfoTip text={s.tip} />}
            </div>
            <div style={{ fontSize: '13px', fontFamily: 'IBM Plex Mono, monospace', color: s.warn ? 'var(--accent-warning)' : 'var(--text-primary)', fontWeight: 500 }}>{s.val}</div>
          </div>
        ))}
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '8px 12px', background: 'var(--bg-tertiary)', borderRadius: '6px' }}>
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', fontSize: '10px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.07em', color: 'var(--text-tertiary)' }}>
            ICa
            <InfoTip text="Índice de Conversión Alimenticia: cuántos kg de alimento consumió el lote por cada kg de peso ganado. Menor valor = mayor eficiencia." />
          </span>
          {lote.icaData ? (
            <>
              <span style={{ fontFamily: 'IBM Plex Mono, monospace', fontSize: '14px', fontWeight: 600, color: icaColor }}>
                {parseFloat(lote.icaData.ica).toFixed(2)} <span style={{ fontSize: '11px', fontWeight: 400 }}>kg/kg</span>
              </span>
              <span style={{ padding: '1px 7px', borderRadius: '3px', fontSize: '10px', fontWeight: 700, color: icaColor, background: icaColor + '1A', border: `1px solid ${icaColor}33` }}>
                {ICA_LABEL[lote.icaData.estado] ?? lote.icaData.estado}
              </span>
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', fontSize: '11px', color: 'var(--text-tertiary)', marginLeft: 'auto' }}>
                ref. {lote.icaData.referencia} · kg alimento / kg ganado
                <InfoTip
                  text={'Verde ≤ 3.0 · Ámbar 3.0–3.5 · Rojo > 3.5 (cerdos).\nPara bovinos el rango eficiente es 6.0–8.0.'}
                  position="left"
                />
              </span>
            </>
          ) : (
            <span style={{ fontSize: '12px', color: 'var(--text-tertiary)', fontStyle: 'italic' }}>
              Sin datos de alimentación — registrá kg consumidos en el diario de producción
            </span>
          )}
        </div>
        {lote.icaData && (
          <FormulaHint
            formula="ICa = kg de alimento consumidos ÷ (cabezas × kg ganados por cabeza)"
            ejemplo={`${(parseFloat(lote.icaData.ica) * lote.cabezasActivas * pesoGanado).toFixed(0)} kg ÷ (${lote.cabezasActivas} cab × ${pesoGanado.toFixed(1)} kg) = ${parseFloat(lote.icaData.ica).toFixed(2)}`}
          />
        )}
      </div>

      {/* ── Widget Punto de Equilibrio ── */}
      {lote.peData && (
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '8px 12px', background: 'var(--bg-tertiary)', borderRadius: '6px' }}>
          <span style={{ fontSize: '10px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.07em', color: 'var(--text-tertiary)', display: 'flex', alignItems: 'center', gap: '4px' }}>
            PE
            <InfoTip text="Punto de Equilibrio real por kg útil: precio mínimo de venta para cubrir todos los costos (MPD + MOD + CIF prorrateado), descontando mermas registradas." />
          </span>
          {lote.peData.punto_equilibrio_bs_por_kg != null ? (
            <>
              <span style={{ fontFamily: 'IBM Plex Mono, monospace', fontSize: '14px', fontWeight: 600, color: accentColor }}>
                Bs {parseFloat(lote.peData.punto_equilibrio_bs_por_kg).toFixed(4)}
                <span style={{ fontSize: '11px', fontWeight: 400, color: 'var(--text-tertiary)' }}> / kg útil</span>
              </span>
              {lote.peData.pesos?.merma_total_kg > 0 && (
                <span style={{ fontSize: '11px', color: 'var(--accent-warning)', marginLeft: 'auto' }}>
                  ⚠ {parseFloat(lote.peData.pesos.merma_total_kg).toFixed(2)} kg merma
                </span>
              )}
            </>
          ) : (
            <span style={{ fontSize: '12px', color: 'var(--text-tertiary)', fontStyle: 'italic' }}>
              Sin peso neto útil — registrá mermas o ajustá el peso del lote
            </span>
          )}
        </div>
      )}

      <div>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '10px' }}>
          <div>
            <div style={{ fontSize: '11px', color: 'var(--text-tertiary)', marginBottom: '2px' }}>Total lote</div>
            <MoneyDisplay value={totalCosto} size="lg" />
          </div>
          <div style={{ textAlign: 'right' }}>
            <div style={{ fontSize: '11px', color: 'var(--text-tertiary)', marginBottom: '2px' }}>Costo / cabeza</div>
            <MoneyDisplay value={costoCabeza} size="md" />
          </div>
        </div>
        <button
          type="button"
          onClick={() => setDesgloseOpen(o => !o)}
          style={{
            display: 'flex', alignItems: 'center', gap: '8px', width: '100%',
            padding: '8px 0', background: 'transparent', border: 'none', borderTop: '1px solid var(--border-subtle)',
            cursor: 'pointer', fontSize: '13px', color: 'var(--text-secondary)', fontFamily: 'var(--font-sans)',
          }}
        >
          Ver desglose de costos
          <span style={{
            display: 'inline-block',
            fontSize: '10px',
            lineHeight: 1,
            transform: desgloseOpen ? 'rotate(90deg)' : 'rotate(0deg)',
            transition: 'transform 0.2s ease',
          }}>{desgloseOpen ? '▼' : '▶'}</span>
        </button>
        {desgloseOpen && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', paddingTop: '10px' }}>
            {COSTOS_ORDER.map(key_ => (
              <CostBar key={key_} key_={key_} label={CAT_LABELS[key_]} val={lote.costos[key_]} />
            ))}
          </div>
        )}
      </div>

      <div style={{ display: 'flex', gap: '8px', paddingTop: '4px', borderTop: '1px solid var(--border-subtle)' }}>
        <Btn variant="secondary" size="sm" icon="clipboardList" onClick={() => onBitacora(lote)}>Ver diario</Btn>
        {!isCerrado && <Btn variant="secondary" size="sm" icon="plus" onClick={() => onBitacora(lote)}>Registrar gasto</Btn>}
        {!isCerrado && <Btn size="sm" icon="scale" accentColor={accentColor} onClick={() => onLiquidar(lote)}>Liquidar lote</Btn>}
      </div>
    </div>
  );
};

const Lotes = ({ negocioId, negocios = [], onNavigate, setActiveLote }) => {
  const accentColor = 'var(--accent-agro)';
  const negocioActivo = negocios.find(n => n.id === negocioId);
  const intervaloNegocio = negocioActivo?.pesaje_intervalo_dias ?? 14;
  const [lotes, setLotes] = useState([]);
  const [modal, setModal] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showFaenados, setShowFaenados] = useState(false);

  const fetchLotes = async () => {
    if (!negocioId) return;
    setLoading(true);
    setError(null);
    try {
      const data = await apiFetch(`/api/negocios/${negocioId}/lotes`);
      const mapped = await Promise.all(
        data.map(async (l) => {
          const [detalle, ica, pe] = await Promise.all([
            fetchCostosDetalle(negocioId, l.id),
            fetchIca(negocioId, l.id),
            fetchPuntoEquilibrio(negocioId, l.id),
          ]);
          return mapLoteFromApi(l, detalle, ica, pe);
        })
      );
      setLotes(mapped);
    } catch (e) {
      setError(e?.error || 'Error al cargar lotes');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchLotes(); }, [negocioId]);

  const handleSaveLote = async (form) => {
    const nuevo = await apiFetch(`/api/negocios/${negocioId}/lotes`, {
      method: 'POST',
      body: JSON.stringify({
        identificador:     form.identificador,
        tipo_animal:       form.tipo,
        fecha_entrada:     form.fecha_entrada || null,
        cabezas_inicio:    form.cabezas_inicio,
        peso_inicial_prom: form.peso_inicial_prom,
        costo_adquisicion: form.costo_adquisicion,
        edad_promedio_dias: parseInt(form.edad_promedio_dias) || 0,
        pesaje_activo:     form.pesaje_activo,
        pesaje_intervalo_dias: form.pesaje_intervalo_dias,
      }),
    });
    const [detalle, ica, pe] = await Promise.all([
      fetchCostosDetalle(negocioId, nuevo.id),
      fetchIca(negocioId, nuevo.id),
      fetchPuntoEquilibrio(negocioId, nuevo.id),
    ]);
    setLotes(prev => [mapLoteFromApi(nuevo, detalle, ica, pe), ...prev]);
  };

  const lotesActivos = lotes.filter(l => l.activo !== false);
  const lotesFaenados = lotes.filter(l => l.activo === false);
  const totalAnimales = lotesActivos.reduce((s, l) => s + l.cabezasActivas, 0);

  const handleDiario = lote => {
    setActiveLote(lote);
    onNavigate('diario');
  };
  const handleLiquidar = lote => { setActiveLote(lote); onNavigate('liquidacion'); };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      <InfoBanner
        storageKey="banner_lotes_v1"
        title="Lotes de engorde"
        text="Cada lote representa un ciclo de producción animal. Registrá el lote primero y después usá el Diario de producción para ir sumando gastos día a día. Al cerrar el ciclo, la Liquidación te muestra cuánto ganás según el escenario de venta."
        accentColor="var(--accent-agro)"
      />
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '4px' }}>
            <h1 style={{ fontSize: '22px', fontWeight: 400, color: 'var(--text-primary)', letterSpacing: '-0.02em' }}>Lotes de engorde</h1>
            <span style={{ background: 'var(--accent-agro)1A', color: 'var(--accent-agro)', border: '1px solid var(--accent-agro)33', borderRadius: '5px', padding: '2px 10px', fontSize: '12px', fontFamily: 'IBM Plex Mono, monospace' }}>{lotesActivos.length} activos</span>
          </div>
          <div style={{ fontSize: '13px', color: 'var(--text-tertiary)' }}>{totalAnimales} animales en total</div>
        </div>
        <Btn icon="plus" accentColor={accentColor} onClick={() => setModal(true)}>Registrar lote</Btn>
      </div>

      {loading && (
        <div style={{ textAlign: 'center', padding: '48px', color: 'var(--text-tertiary)', fontSize: '14px' }}>Cargando lotes…</div>
      )}
      {error && (
        <div style={{ background: 'var(--accent-warning)18', border: '1px solid var(--accent-warning)44', borderRadius: '8px', padding: '14px 18px', color: 'var(--accent-warning)', fontSize: '13px' }}>
          {error}
        </div>
      )}
      {!loading && !error && lotesActivos.length === 0 && lotesFaenados.length === 0 && (
        <div style={{ textAlign: 'center', padding: '48px', color: 'var(--text-tertiary)', fontSize: '14px', background: 'var(--bg-secondary)', borderRadius: '10px', border: '1px solid var(--border-subtle)' }}>
          No hay lotes registrados. ¡Registrá el primero!
        </div>
      )}

      <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
        {lotesActivos.map(l => (
          <LoteCard key={l._id} lote={l} onBitacora={handleDiario} onLiquidar={handleLiquidar} accentColor={accentColor} intervaloNegocio={intervaloNegocio} />
        ))}
      </div>

      {lotesFaenados.length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <button
            type="button"
            onClick={() => setShowFaenados(o => !o)}
            style={{
              display: 'flex', alignItems: 'center', gap: '8px',
              background: 'transparent', border: 'none', borderTop: '1px solid var(--border-subtle)',
              paddingTop: '16px', cursor: 'pointer', fontSize: '13px', color: 'var(--text-tertiary)',
              fontFamily: 'var(--font-sans)', textAlign: 'left',
            }}
          >
            <span style={{ display: 'inline-block', fontSize: '10px', lineHeight: 1, transform: showFaenados ? 'rotate(90deg)' : 'rotate(0deg)', transition: 'transform 0.2s ease' }}>▶</span>
            {showFaenados ? 'Ocultar' : 'Mostrar'} {lotesFaenados.length} lote{lotesFaenados.length !== 1 ? 's' : ''} faenado{lotesFaenados.length !== 1 ? 's' : ''}
          </button>
          {showFaenados && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              {lotesFaenados.map(l => (
                <LoteCard key={l._id} lote={l} onBitacora={handleDiario} onLiquidar={handleLiquidar} accentColor={accentColor} isCerrado intervaloNegocio={intervaloNegocio} />
              ))}
            </div>
          )}
        </div>
      )}

      {modal && <NuevoLoteModal onClose={() => setModal(false)} onSave={handleSaveLote} accentColor={accentColor} intervaloNegocio={intervaloNegocio} />}
    </div>
  );
};

export default Lotes;

