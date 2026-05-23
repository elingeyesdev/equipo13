import React, { useState, useEffect } from 'react';
import { Icon } from '../../icons.jsx';
import { apiFetch } from '../../config/api.js';
import { MoneyDisplay, Btn, StatusBadge, RubroBadge, InfoBanner, InfoTip, FormulaHint } from '../../components/ui.jsx';

const accentColor = 'var(--accent-agro)';

const fmt = (n, dec = 2) =>
  (parseFloat(n) || 0).toLocaleString('es-BO', {
    minimumFractionDigits: dec,
    maximumFractionDigits: dec,
  });

const Despiece = ({ negocioId, onNavigate }) => {
  const [lotes, setLotes] = useState([]);
  const [selectedLoteId, setSelectedLoteId] = useState(null);
  const [cortesDB, setCortesDB] = useState([]);
  const [localCortes, setLocalCortes] = useState([]);
  const [formNombre, setFormNombre] = useState('');
  const [formPeso, setFormPeso] = useState('');
  const [saving, setSaving] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState(null);
  const [genResult, setGenResult] = useState(null);
  const [costoTotalLote, setCostoTotalLote] = useState(0);

  // ── Carga lotes al montar ──────────────────────────────────
  useEffect(() => {
    if (!negocioId) return;
    apiFetch(`/api/negocios/${negocioId}/lotes`)
      .then(data => {
        setLotes(data);
        if (data.length > 0) setSelectedLoteId(data[0].id);
      })
      .catch(console.error);
  }, [negocioId]);

  // ── Carga despiece cuando cambia el lote ──────────────────
  useEffect(() => {
    if (!negocioId || !selectedLoteId) return;
    const lote = lotes.find(l => l.id === selectedLoteId);
    setCostoTotalLote(parseFloat(lote?.costo_total) || 0);
    setGenResult(null);
    setError(null);

    apiFetch(`/api/negocios/${negocioId}/lotes/${selectedLoteId}/despiece`)
      .then(data => {
        const db = data.cortes || [];
        setCortesDB(db);
        setLocalCortes(db.map(c => ({ ...c, _new: false })));
      })
      .catch(console.error);
  }, [selectedLoteId, negocioId, lotes]);

  // ── Cálculos derivados ─────────────────────────────────────
  const pesoTotal = localCortes.reduce((s, c) => s + (parseFloat(c.peso_kg) || 0), 0);
  const costoKgDerivado = pesoTotal > 0 ? costoTotalLote / pesoTotal : 0;
  const nuevosLocales = localCortes.filter(c => c._new);
  const dbSinInsumo = cortesDB.filter(c => !c.insumo_generado_id);
  const puedeGuardar = nuevosLocales.length > 0 && localCortes.filter(c => !c.insumo_generado_id).length > 0;
  const puedeGenerarInsumos = dbSinInsumo.length > 0 && nuevosLocales.length === 0;

  // ── Agregar fila local ────────────────────────────────────
  const addCorte = () => {
    const nombre = formNombre.trim();
    const peso = parseFloat(formPeso);
    if (!nombre || !(peso > 0)) return;
    setLocalCortes(prev => [
      ...prev,
      { id: `new-${Date.now()}`, nombre, peso_kg: peso, insumo_generado_id: null, _new: true },
    ]);
    setFormNombre('');
    setFormPeso('');
  };

  const removeLocal = idx => {
    setLocalCortes(prev => prev.filter((_, i) => i !== idx));
  };

  // ── Guardar cortes en DB ──────────────────────────────────
  const handleSave = async () => {
    const toSave = localCortes.filter(c => !c.insumo_generado_id);
    if (!selectedLoteId || toSave.length === 0) return;
    setSaving(true);
    setError(null);
    try {
      const result = await apiFetch(
        `/api/negocios/${negocioId}/lotes/${selectedLoteId}/despiece`,
        {
          method: 'POST',
          body: JSON.stringify({
            cortes: toSave.map(c => ({
              nombre: c.nombre,
              peso_kg: parseFloat(c.peso_kg),
            })),
          }),
        }
      );
      const linked = cortesDB.filter(c => c.insumo_generado_id);
      const newDB = [...linked, ...result.cortes];
      setCortesDB(newDB);
      setLocalCortes(newDB.map(c => ({ ...c, _new: false })));
      setCostoTotalLote(result.costo_total_lote || costoTotalLote);
    } catch (e) {
      setError(e?.error || 'Error al guardar los cortes');
    } finally {
      setSaving(false);
    }
  };

  // ── Convertir cortes en insumos ───────────────────────────
  const handleGenerarInsumos = async () => {
    if (!selectedLoteId) return;
    setGenerating(true);
    setError(null);
    try {
      const result = await apiFetch(
        `/api/negocios/${negocioId}/lotes/${selectedLoteId}/despiece/generar-insumos`,
        { method: 'POST' }
      );
      setGenResult(result);
      const updated = await apiFetch(
        `/api/negocios/${negocioId}/lotes/${selectedLoteId}/despiece`
      );
      const db = updated.cortes || [];
      setCortesDB(db);
      setLocalCortes(db.map(c => ({ ...c, _new: false })));
    } catch (e) {
      setError(e?.error || 'Error al generar insumos');
    } finally {
      setGenerating(false);
    }
  };

  const loteData = lotes.find(l => l.id === selectedLoteId);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      <InfoBanner
        storageKey="banner_despiece_v1"
        title="Despiece de canal"
        text="El despiece distribuye el costo total del lote entre los cortes según su peso. Una vez guardados, 'Convertir en insumos' crea cada corte en el catálogo con su precio real — después podés usarlos en la receta (BOM) de cualquier producto industrial."
        accentColor="var(--accent-agro)"
      />

      {/* Encabezado */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '12px' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
          <button
            onClick={() => onNavigate?.('lotes')}
            style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: 'var(--text-tertiary)', display: 'flex', alignItems: 'center', gap: '4px', fontSize: '13px', padding: '4px 0', fontFamily: 'var(--font-sans)', alignSelf: 'flex-start' }}
            onMouseEnter={e => e.currentTarget.style.color = 'var(--text-secondary)'}
            onMouseLeave={e => e.currentTarget.style.color = 'var(--text-tertiary)'}
          >
            <Icon name="chevronLeft" size={14} /> Lotes
          </button>
          <h1 style={{ fontSize: '20px', fontWeight: 400, color: 'var(--text-primary)', letterSpacing: '-0.02em', margin: 0 }}>
            Despiece de lote
          </h1>
        </div>
        <RubroBadge rubro="agro_ganadero" />
      </div>

      {/* Selector de lote */}
      <div style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border-subtle)', borderRadius: '8px', padding: '14px 20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
          <span style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>Lote</span>
          <select
            value={selectedLoteId || ''}
            onChange={e => setSelectedLoteId(e.target.value)}
            style={{ background: 'var(--bg-primary)', border: '1px solid var(--border-subtle)', borderRadius: '6px', color: 'var(--text-primary)', padding: '5px 10px', fontSize: '14px', outline: 'none', fontFamily: 'IBM Plex Mono, monospace', cursor: 'pointer' }}
          >
            {lotes.map(l => (
              <option key={l.id} value={l.id}>
                #{l.identificador} · {l.tipo_animal}{!l.activo ? ' (cerrado)' : ''}
              </option>
            ))}
          </select>
          {loteData && (
            <StatusBadge
              label={loteData.activo ? 'Activo' : 'Liquidado'}
              color={loteData.activo ? accentColor : 'var(--text-tertiary)'}
            />
          )}
        </div>
        <div style={{ fontSize: '13px', color: 'var(--text-tertiary)' }}>
          Costo acumulado:{' '}
          <span style={{ fontFamily: 'IBM Plex Mono, monospace', color: 'var(--text-primary)' }}>
            Bs {fmt(costoTotalLote)}
          </span>
        </div>
      </div>

      {/* Métricas resumen */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '12px' }}>
        {[
          {
            label: 'Costo total del lote',
            value: `Bs ${fmt(costoTotalLote)}`,
            icon: 'dollarSign',
            sub: 'Adquisición + diario',
          },
          {
            label: 'Peso canal total',
            value: `${fmt(pesoTotal, 1)} kg`,
            icon: 'scale',
            sub: `${localCortes.length} corte${localCortes.length !== 1 ? 's' : ''} registrado${localCortes.length !== 1 ? 's' : ''}`,
            tip: 'Suma del peso de todos los cortes. Representa el canal (sin vísceras ni cuero). Para cerdos el rendimiento canal típico es 75 % del peso en pie.',
          },
          {
            label: 'Costo / kg derivado',
            value: pesoTotal > 0 ? `Bs ${fmt(costoKgDerivado)}` : '—',
            icon: 'calculator',
            sub: 'Costo lote ÷ peso canal',
            highlight: true,
            tip: 'Precio de referencia de cada kg de canal, calculado distribuyendo el costo total del lote entre el peso total del canal.',
            formula: 'Costo/kg = costo total del lote ÷ peso canal total',
            ejemplo: pesoTotal > 0 ? `Bs ${fmt(costoTotalLote)} ÷ ${fmt(pesoTotal, 1)} kg = Bs ${fmt(costoKgDerivado)}` : null,
          },
        ].map((m, i) => (
          <div key={i} style={{ background: 'var(--bg-secondary)', border: `1px solid ${m.highlight ? accentColor + '44' : 'var(--border-subtle)'}`, borderRadius: '8px', padding: '16px 18px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', fontSize: '10px', color: 'var(--text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.07em', fontWeight: 500 }}>
                {m.label}
                {m.tip && <InfoTip text={m.tip} />}
              </span>
              <Icon name={m.icon} size={14} style={{ color: m.highlight ? accentColor : 'var(--text-tertiary)', opacity: 0.7 }} />
            </div>
            <div style={{ fontFamily: 'IBM Plex Mono, monospace', fontSize: '20px', color: m.highlight ? accentColor : 'var(--text-primary)', fontWeight: 500, letterSpacing: '-0.02em' }}>{m.value}</div>
            <div style={{ fontSize: '11px', color: 'var(--text-tertiary)' }}>{m.sub}</div>
            {m.formula && m.ejemplo && <FormulaHint formula={m.formula} ejemplo={m.ejemplo} />}
          </div>
        ))}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '300px 1fr', gap: '16px', alignItems: 'flex-start' }}>

        {/* Panel izquierdo: formulario agregar corte */}
        <div style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border-subtle)', borderRadius: '8px', overflow: 'hidden' }}>
          <div style={{ padding: '12px 16px', borderBottom: '1px solid var(--border-subtle)' }}>
            <span style={{ fontSize: '11px', fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase', color: accentColor }}>Agregar corte</span>
          </div>
          <div style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
              <label style={{ fontSize: '10px', color: 'var(--text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Nombre del corte</label>
              <input
                value={formNombre}
                onChange={e => setFormNombre(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && addCorte()}
                placeholder="Ej. Lomo, Costilla, Paleta…"
                style={{ width: '100%', boxSizing: 'border-box', background: 'var(--bg-tertiary)', border: '1px solid var(--border-subtle)', borderRadius: '6px', color: 'var(--text-primary)', padding: '7px 10px', fontSize: '13px', outline: 'none', fontFamily: 'var(--font-sans)' }}
                onFocus={e => (e.target.style.borderColor = accentColor)}
                onBlur={e => (e.target.style.borderColor = 'var(--border-subtle)')}
              />
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
              <label style={{ fontSize: '10px', color: 'var(--text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Peso (kg)</label>
              <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                <input
                  value={formPeso}
                  onChange={e => setFormPeso(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && addCorte()}
                  type="number"
                  step="0.01"
                  min="0"
                  placeholder="0.00"
                  style={{ width: '100%', boxSizing: 'border-box', background: 'var(--bg-tertiary)', border: '1px solid var(--border-subtle)', borderRadius: '6px', color: 'var(--text-primary)', padding: '7px 36px 7px 10px', fontSize: '13px', outline: 'none', fontFamily: 'IBM Plex Mono, monospace' }}
                  onFocus={e => (e.target.style.borderColor = accentColor)}
                  onBlur={e => (e.target.style.borderColor = 'var(--border-subtle)')}
                />
                <span style={{ position: 'absolute', right: '10px', fontSize: '12px', color: 'var(--text-tertiary)', pointerEvents: 'none' }}>kg</span>
              </div>
            </div>

            <Btn
              onClick={addCorte}
              icon="plus"
              accentColor={accentColor}
              disabled={!formNombre.trim() || !(parseFloat(formPeso) > 0)}
            >
              Agregar corte
            </Btn>

            {/* Info cálculo en vivo */}
            {pesoTotal > 0 && (
              <div style={{ background: accentColor + '0D', border: `1px solid ${accentColor}33`, borderRadius: '6px', padding: '10px 12px', fontSize: '12px', color: 'var(--text-secondary)', lineHeight: 1.6 }}>
                <div style={{ fontFamily: 'IBM Plex Mono, monospace', color: accentColor, fontWeight: 500, marginBottom: '4px' }}>
                  Bs {fmt(costoKgDerivado)} / kg
                </div>
                Cada kg de canal cuesta este precio según el costeo acumulado del lote.
              </div>
            )}
          </div>
        </div>

        {/* Panel derecho: tabla de cortes */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>

          {/* Error */}
          {error && (
            <div style={{ background: 'var(--accent-danger)12', border: '1px solid var(--accent-danger)44', borderRadius: '6px', padding: '10px 14px', fontSize: '13px', color: 'var(--accent-danger)', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Icon name="alertTriangle" size={14} />
              {error}
            </div>
          )}

          {/* Tabla */}
          <div style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border-subtle)', borderRadius: '8px', overflow: 'hidden' }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 90px 80px 110px 90px', padding: '8px 16px', borderBottom: '1px solid var(--border-subtle)', gap: '8px' }}>
              {[
                { h: 'Corte' },
                { h: 'Peso (kg)' },
                { h: '% Canal', tip: 'Porcentaje del peso total del canal que representa este corte. La suma de todos los cortes da 100 %.' },
                { h: 'Costo / kg' },
                { h: '' },
              ].map((col, i) => (
                <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '4px', justifyContent: i > 0 ? 'flex-end' : 'flex-start', fontSize: '10px', color: 'var(--text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.06em', fontWeight: 500 }}>
                  {col.h}
                  {col.tip && <InfoTip text={col.tip} position="top" />}
                </div>
              ))}
            </div>

            {localCortes.length === 0 ? (
              <div style={{ padding: '32px 20px', textAlign: 'center', color: 'var(--text-tertiary)', fontSize: '13px' }}>
                <Icon name="scissors" size={24} style={{ display: 'block', margin: '0 auto 10px', opacity: 0.4 }} />
                Sin cortes aún — usá el formulario para agregar.
              </div>
            ) : (
              localCortes.map((c, i) => {
                const peso = parseFloat(c.peso_kg) || 0;
                const pct = pesoTotal > 0 ? (peso / pesoTotal) * 100 : 0;
                const isLinked = !!c.insumo_generado_id;
                return (
                  <div
                    key={c.id}
                    style={{ display: 'grid', gridTemplateColumns: '1fr 90px 80px 110px 90px', padding: '9px 16px', borderBottom: '1px solid var(--border-subtle)', gap: '8px', alignItems: 'center', background: c._new ? accentColor + '06' : 'transparent', transition: 'background 0.1s' }}
                    onMouseEnter={e => { if (!c._new) e.currentTarget.style.background = 'var(--bg-tertiary)'; }}
                    onMouseLeave={e => { e.currentTarget.style.background = c._new ? accentColor + '06' : 'transparent'; }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', minWidth: 0 }}>
                      <span style={{ fontSize: '13px', color: 'var(--text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{c.nombre}</span>
                      {c._new && <span style={{ fontSize: '10px', padding: '1px 6px', background: accentColor + '22', color: accentColor, borderRadius: '3px', fontWeight: 600, flexShrink: 0 }}>NUEVO</span>}
                      {isLinked && (
                        <span style={{ fontSize: '10px', padding: '1px 6px', background: 'var(--accent-success)1A', color: 'var(--accent-success)', border: '1px solid var(--accent-success)33', borderRadius: '3px', fontWeight: 500, flexShrink: 0, display: 'flex', alignItems: 'center', gap: '3px' }}>
                          <Icon name="check" size={10} /> Insumo
                          <InfoTip text="Este corte ya está registrado en el catálogo de insumos. Podés usarlo en la receta (BOM) de cualquier producto industrial." />
                        </span>
                      )}
                    </div>
                    <div style={{ fontFamily: 'IBM Plex Mono, monospace', fontSize: '13px', color: 'var(--text-primary)', textAlign: 'right' }}>{fmt(peso, 1)}</div>
                    <div style={{ fontFamily: 'IBM Plex Mono, monospace', fontSize: '13px', color: 'var(--text-secondary)', textAlign: 'right' }}>{fmt(pct, 1)}%</div>
                    <div style={{ fontFamily: 'IBM Plex Mono, monospace', fontSize: '13px', color: accentColor, textAlign: 'right' }}>
                      {pesoTotal > 0 ? `Bs ${fmt(costoKgDerivado)}` : '—'}
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                      {!isLinked ? (
                        <button
                          onClick={() => removeLocal(i)}
                          title="Quitar corte"
                          style={{ background: 'transparent', border: 'none', color: 'var(--text-tertiary)', cursor: 'pointer', padding: '4px', borderRadius: '4px', display: 'flex', alignItems: 'center', transition: 'color 0.15s' }}
                          onMouseEnter={e => (e.currentTarget.style.color = 'var(--accent-danger)')}
                          onMouseLeave={e => (e.currentTarget.style.color = 'var(--text-tertiary)')}
                        >
                          <Icon name="trash2" size={14} />
                        </button>
                      ) : (
                        <Icon name="lock" size={13} style={{ color: 'var(--text-tertiary)', opacity: 0.5 }} />
                      )}
                    </div>
                  </div>
                );
              })
            )}

            {/* Fila totales */}
            {localCortes.length > 0 && (
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 90px 80px 110px 90px', padding: '10px 16px', gap: '8px', background: 'var(--bg-tertiary)', borderTop: `1px solid ${accentColor}33` }}>
                <div style={{ fontSize: '11px', color: 'var(--text-tertiary)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em' }}>Total canal</div>
                <div style={{ fontFamily: 'IBM Plex Mono, monospace', fontSize: '13px', color: accentColor, textAlign: 'right', fontWeight: 500 }}>{fmt(pesoTotal, 1)}</div>
                <div style={{ fontFamily: 'IBM Plex Mono, monospace', fontSize: '13px', color: 'var(--text-secondary)', textAlign: 'right' }}>100%</div>
                <div />
                <div />
              </div>
            )}
          </div>

          {/* Acciones */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px' }}>
            <div style={{ fontSize: '12px', color: 'var(--text-tertiary)' }}>
              {nuevosLocales.length > 0 && (
                <span style={{ color: accentColor }}>
                  <Icon name="alertCircle" size={12} style={{ verticalAlign: 'middle', marginRight: '4px' }} />
                  {nuevosLocales.length} corte{nuevosLocales.length > 1 ? 's' : ''} sin guardar
                </span>
              )}
              {nuevosLocales.length === 0 && dbSinInsumo.length > 0 && (
                <span>
                  {dbSinInsumo.length} corte{dbSinInsumo.length > 1 ? 's' : ''} listos para convertir en insumos
                </span>
              )}
              {nuevosLocales.length === 0 && dbSinInsumo.length === 0 && cortesDB.length > 0 && (
                <span style={{ color: 'var(--accent-success)' }}>
                  <Icon name="check" size={12} style={{ verticalAlign: 'middle', marginRight: '4px' }} />
                  Todos los cortes convertidos en insumos
                </span>
              )}
            </div>
            <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', alignItems: 'center' }}>
              <Btn
                onClick={handleSave}
                icon="save"
                accentColor={accentColor}
                disabled={saving || localCortes.filter(c => !c.insumo_generado_id).length === 0}
              >
                {saving ? 'Guardando…' : 'Guardar cortes'}
              </Btn>
              <Btn
                variant={puedeGenerarInsumos ? 'primary' : 'secondary'}
                onClick={handleGenerarInsumos}
                icon="arrowRight"
                accentColor={accentColor}
                disabled={!puedeGenerarInsumos || generating}
              >
                {generating ? 'Generando…' : 'Convertir en insumos'}
              </Btn>
              <InfoTip text={'Crea un insumo en el catálogo por cada corte, con el costo/kg calculado del lote.\nSolo disponible después de guardar los cortes y cuando ninguno está convertido aún.'} />
            </div>
          </div>

          {/* Resultado de conversión */}
          {genResult && (
            <div style={{ background: 'var(--accent-success)0D', border: '1px solid var(--accent-success)44', borderRadius: '8px', padding: '16px 20px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <Icon name="check" size={16} style={{ color: 'var(--accent-success)' }} />
                  <span style={{ fontSize: '14px', fontWeight: 500, color: 'var(--text-primary)' }}>
                    {genResult.generados} insumo{genResult.generados !== 1 ? 's' : ''} creado{genResult.generados !== 1 ? 's' : ''} exitosamente
                  </span>
                </div>
                <Btn variant="secondary" size="sm" icon="layers" onClick={() => onNavigate?.('insumos')}>
                  Ver Insumos
                </Btn>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                {genResult.insumos.map((item, i) => (
                  <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '6px 12px', background: 'var(--bg-secondary)', borderRadius: '6px', fontSize: '13px' }}>
                    <span style={{ color: 'var(--text-primary)' }}>{item.corte_nombre}</span>
                    <span style={{ fontFamily: 'IBM Plex Mono, monospace', color: 'var(--accent-success)' }}>
                      Bs {fmt(item.insumo.precio_unitario)} / kg
                    </span>
                  </div>
                ))}
              </div>
              <div style={{ fontSize: '12px', color: 'var(--text-tertiary)', lineHeight: 1.6 }}>
                Estos cortes ya están disponibles como insumos para agregar al BOM de tus productos industriales.
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Despiece;
