import React, { useState, useEffect } from 'react';
import { Icon } from '../../icons.jsx';
import { StatusBadge, RubroBadge, MoneyDisplay, Btn, InfoBanner, InfoTip } from '../../components/ui.jsx';
import { apiFetch } from '../../config/api.js';

const TIPOS_FIJOS = ['Mano de obra', 'Baja (muerte/pérdida)', 'Otras pérdidas'];

const TIPO_ICON = {
  'Mano de obra': { icon: 'user',           color: 'var(--text-tertiary)' },
  'Baja':         { icon: 'alertTriangle',  color: 'var(--accent-warning)' },
  'ENTRADA':      { icon: 'checkCircle',    color: 'var(--accent-agro)' },
  'Otro gasto':   { icon: 'dollarSign',     color: 'var(--text-tertiary)' },
  'Otras pérdidas': { icon: 'dollarSign',   color: 'var(--text-tertiary)' },
};

const Bitacora = ({ negocioId, activeLote }) => {
  const accentColor = 'var(--accent-agro)';

  const [lotes, setLotes] = useState([]);
  const [selectedLoteId, setSelectedLoteId] = useState(activeLote?._id || activeLote?.id || null);

  const [registros, setRegistros] = useState([]);
  const [loadingRegistros, setLoadingRegistros] = useState(false);
  const [errorRegistros, setErrorRegistros] = useState(null);
  const [loteData, setLoteData] = useState(null);

  const [categorias, setCategorias] = useState([]);
  const [insumos, setInsumos] = useState([]);
  const [tipo, setTipo] = useState(null);
  const [selectedInsumoId, setSelectedInsumoId] = useState(null);
  const [sacos, setSacos] = useState('10');
  const [costoSaco, setCostoSaco] = useState('0');
  const [userEditedCantidad, setUserEditedCantidad] = useState(false);
  const [userEditedPrecio, setUserEditedPrecio] = useState(false);
  const [bajas, setBajas] = useState('1');
  const [pesoBaja, setPesoBaja] = useState('9.2');
  const [causaBaja, setCausaBaja] = useState('');
  const [monto, setMonto] = useState('');
  const [notas, setNotas] = useState('');
  const [saving, setSaving] = useState(false);

  const totalAlim = (parseFloat(sacos) || 0) * (parseFloat(costoSaco) || 0);
  const loteRealId = selectedLoteId;

  useEffect(() => {
    if (negocioId) {
      apiFetch(`/api/negocios/${negocioId}/lotes`).then(data => {
        setLotes(data);
        if (!selectedLoteId && data.length > 0) {
          setSelectedLoteId(data[0].id);
        }
      }).catch(console.error);

      apiFetch(`/api/negocios/${negocioId}/insumos`).then(data => {
        setInsumos(data);
      }).catch(console.error);

      apiFetch(`/api/negocios/${negocioId}/categorias`).then(data => {
        setCategorias(data);
      }).catch(console.error);
    }
  }, [negocioId]);

  useEffect(() => {
    if (tipo === null) {
      setTipo(categorias.length > 0 ? categorias[0].nombre : 'Mano de obra');
    }
  }, [categorias]);

  useEffect(() => {
    const cat = categorias.find(c => c.nombre === tipo);
    if (!cat) return;
    const filtrados = insumos.filter(i => i.categoria_id === cat.id);
    if (filtrados.length > 0) {
      setSelectedInsumoId(filtrados[0].id);
      if (!userEditedPrecio) {
        setCostoSaco(String(parseFloat(filtrados[0].precio_unitario) || 0));
      }
    } else {
      setSelectedInsumoId(null);
      if (!userEditedPrecio) setCostoSaco('0');
    }
  }, [tipo, insumos]);

  useEffect(() => {
    if (activeLote) {
      setSelectedLoteId(activeLote._id || activeLote.id);
    }
  }, [activeLote]);

  const fetchBitacora = async () => {
    if (!negocioId || !loteRealId) return;
    setLoadingRegistros(true);
    setErrorRegistros(null);
    try {
      const data = await apiFetch(`/api/negocios/${negocioId}/lotes/${loteRealId}/bitacora`);
      setRegistros(data);
    } catch (e) {
      setErrorRegistros(e?.error || 'Error al cargar la bitácora');
    } finally {
      setLoadingRegistros(false);
    }
  };

  const fetchLote = async () => {
    if (!negocioId || !loteRealId) return;
    try {
      const data = await apiFetch(`/api/negocios/${negocioId}/lotes/${loteRealId}`);
      setLoteData(data);
    } catch {}
  };

  useEffect(() => {
    fetchBitacora();
    if (loteRealId) fetchLote();
  }, [negocioId, loteRealId]);

  const handleInsumoChange = insumoId => {
    const id = parseInt(insumoId);
    setSelectedInsumoId(id);
    // User deliberately picked a different insumo → reset flags & autocomplete
    setUserEditedCantidad(false);
    setUserEditedPrecio(false);
    const ins = insumos.find(i => String(i.id) === String(id));
    setCostoSaco(ins ? String(parseFloat(ins.precio_unitario) || 0) : '0');
    setSacos('10');
  };

  const handleRegistrar = async () => {
    if (!negocioId || !loteRealId) return;
    setSaving(true);
    try {
      let detalle = '';
      let montoFinal = null;
      let esBaja = false;
      let cabezasBaja = null;
      let pesoBajaVal = null;
      let causaVal = null;
      let tipoApi = tipo;

      let cantidadApi = null;
      let precioApi = null;

      const esCategoriaInsumo = !!categorias.find(c => c.nombre === tipo);
      if (esCategoriaInsumo) {
        const ins = insumos.find(i => String(i.id) === String(selectedInsumoId));
        const insumoNombre = ins ? ins.nombre : 'Insumo';
        const unidad = ins?.unidad_simbolo || 'u';
        detalle = `${insumoNombre}`;
        montoFinal = totalAlim;
        cantidadApi = parseFloat(sacos) || null;
        precioApi = parseFloat(costoSaco) || null;
      } else if (tipo === 'Baja (muerte/pérdida)') {
        const bajasNum = parseFloat(bajas) || 0;
        detalle = `${bajas} cabeza${bajasNum > 1 ? 's' : ''} · ${causaBaja || 'Sin causa'}`;
        esBaja = true;
        cabezasBaja = bajasNum;
        pesoBajaVal = parseFloat(pesoBaja) || 0;
        causaVal = causaBaja;
        tipoApi = 'Baja';
        montoFinal = null;
      } else {
        detalle = notas || tipo;
        montoFinal = parseFloat(monto) || null;
        tipoApi = tipo === 'Otras pérdidas' ? 'Otro gasto' : tipo;
      }

      const nuevo = await apiFetch(`/api/negocios/${negocioId}/lotes/${loteRealId}/bitacora`, {
        method: 'POST',
        body: JSON.stringify({
          fecha:        new Date().toISOString().split('T')[0],
          tipo:         tipoApi,
          detalle,
          monto:        montoFinal,
          es_baja:      esBaja,
          cabezas_baja: cabezasBaja,
          peso_baja:    pesoBajaVal,
          causa:        causaVal,
          cantidad_kg:  tipoApi === 'Alimento / Balanceado' ? cantidadApi : null,
          cantidad:     cantidadApi,
          precio_unitario: precioApi,
        }),
      });

      setRegistros(prev => [nuevo, ...prev]);
      if (esBaja) await fetchLote();

      setMonto(''); setNotas(''); setSacos('10'); setCausaBaja(''); setBajas('1');
      setUserEditedCantidad(false);
      setUserEditedPrecio(false);
      const ins = insumos.find(i => String(i.id) === String(selectedInsumoId));
      setCostoSaco(ins ? String(parseFloat(ins.precio_unitario) || 0) : '0');
    } catch (e) {
      alert(e?.error || 'Error al registrar');
    } finally {
      setSaving(false);
    }
  };

  const iNum = (label, value, onChange, placeholder = '', tip = null) => (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
        <label style={{ fontSize: '10px', color: 'var(--text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>{label}</label>
        {tip && <InfoTip text={tip} />}
      </div>
      <input value={value} onChange={e => onChange(e.target.value)} type="number" step="any" placeholder={placeholder}
        style={{ width: '100%', boxSizing: 'border-box', background: 'var(--bg-primary)', border: '1px solid var(--border-subtle)', borderRadius: '6px', color: 'var(--text-primary)', padding: '7px 10px', fontSize: '13px', outline: 'none', fontFamily: 'IBM Plex Mono, monospace' }}
        onFocus={e => e.target.style.borderColor = accentColor} onBlur={e => e.target.style.borderColor = 'var(--border-subtle)'}
      />
    </div>
  );

  const costoAcumulado = (parseFloat(loteData?.costo_adquisicion) || 0) +
    registros.filter(r => !r.es_baja && r.monto != null).reduce((s, r) => s + parseFloat(r.monto), 0);

  const cabezasActivas = loteData?.cabezas_activas ?? '—';

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      <InfoBanner
        storageKey="banner_bitacora_v1"
        title="Bitácora del lote"
        text="La bitácora es el diario del lote. Cada gasto que registrés acá aumenta el costo total y se refleja en el despiece y la liquidación. Los registros de 'Alimento / Balanceado' son especiales: el campo Cantidad en kg se usa para calcular el ICa."
        accentColor="var(--accent-agro)"
      />
      <div style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border-subtle)', borderRadius: '8px', padding: '14px 20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '3px' }}>
            <span style={{ fontSize: '15px', fontWeight: 500, color: 'var(--text-primary)' }}>
              Lote 
            </span>
            <select 
              value={selectedLoteId || ''} 
              onChange={e => setSelectedLoteId(e.target.value)}
              style={{ background: 'var(--bg-primary)', border: '1px solid var(--border-subtle)', borderRadius: '6px', color: 'var(--text-primary)', padding: '4px 8px', fontSize: '14px', outline: 'none', fontFamily: 'IBM Plex Mono, monospace' }}
            >
              {lotes.map(l => (
                <option key={l.id} value={l.id}>#{l.identificador} · {l.tipo_animal}</option>
              ))}
            </select>
            <StatusBadge label={`${cabezasActivas} animales activos`} color={accentColor} />
          </div>
          <div style={{ fontSize: '13px', color: 'var(--text-tertiary)', marginTop: '6px' }}>
            Costo acumulado:{' '}
            <span style={{ fontFamily: 'IBM Plex Mono, monospace', color: 'var(--text-primary)' }}>
              Bs {costoAcumulado.toLocaleString('es-BO')}
            </span>
          </div>
        </div>
        <RubroBadge rubro="agro_ganadero" />
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '340px 1fr', gap: '16px', alignItems: 'flex-start' }}>
        <div style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border-subtle)', borderRadius: '8px', overflow: 'hidden' }}>
          <div style={{ padding: '14px 16px', borderBottom: '1px solid var(--border-subtle)' }}>
            <span style={{ fontSize: '11px', fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase', color: accentColor }}>Registrar gasto / evento</span>
          </div>
          <div style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
            {(() => {
              const categoriaActiva = categorias.find(c => c.nombre === tipo);
              const insumosFiltrados = categoriaActiva
                ? insumos.filter(i => i.categoria_id === categoriaActiva.id)
                : insumos;
              return (
            <>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                <label style={{ fontSize: '10px', color: 'var(--text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Tipo</label>
                <InfoTip text={"'Alimento / Balanceado' es especial: el sistema usa el campo Cantidad (kg) para calcular el ICa del lote.\nLos demás tipos solo suman el monto en Bs al costo total."} />
              </div>
              <select value={tipo || ''} onChange={e => setTipo(e.target.value)} style={{ width: '100%', boxSizing: 'border-box' }}>
                {categorias.length > 0 && (
                  <optgroup label="Categorías de insumos">
                    {categorias.map(c => <option key={c.id} value={c.nombre}>{c.nombre}</option>)}
                  </optgroup>
                )}
                <optgroup label="Otros">
                  {TIPOS_FIJOS.map(t => <option key={t}>{t}</option>)}
                </optgroup>
              </select>
            </div>

            {categoriaActiva && (
              <>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                  <label style={{ fontSize: '10px', color: 'var(--text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Insumo</label>
                  {insumosFiltrados.length === 0 ? (
                    <div style={{ fontSize: '12px', color: 'var(--text-tertiary)', padding: '7px 10px', border: '1px solid var(--border-subtle)', borderRadius: '6px' }}>
                      Sin insumos en esta categoría — agregá uno en la sección Insumos
                    </div>
                  ) : (
                    <select value={selectedInsumoId || ''} onChange={e => handleInsumoChange(e.target.value)} style={{ width: '100%', boxSizing: 'border-box' }}>
                      {insumosFiltrados.map(ins => (
                        <option key={ins.id} value={ins.id}>
                          {ins.nombre}{ins.unidad_simbolo ? ` (${ins.unidad_simbolo})` : ''}
                        </option>
                      ))}
                    </select>
                  )}
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                  {(() => {
                    const ins = insumos.find(i => String(i.id) === String(selectedInsumoId));
                    const unidadLabel = ins?.unidad_simbolo ? `Cantidad (${ins.unidad_simbolo})` : 'Cantidad';
                    const tipCantidad = tipo === 'Alimento / Balanceado'
                      ? 'Kg físicos de balanceado entregados. El sistema usa este número para calcular el ICa — no el monto en Bs.'
                      : 'Cantidad del insumo utilizado en esta entrega.';
                    return <>{iNum(unidadLabel, sacos, v => { setUserEditedCantidad(true); setSacos(v); }, '', tipCantidad)}</>;
                  })()}
                  {iNum('Precio unitario (Bs)', costoSaco, v => { setUserEditedPrecio(true); setCostoSaco(v); }, '', 'Precio por unidad del insumo. Se autocompleta desde el catálogo — ajustalo si el precio cambió.')}
                </div>
                <div style={{ background: 'var(--bg-tertiary)', borderRadius: '6px', padding: '10px 12px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>Total</span>
                  <MoneyDisplay value={totalAlim} size="md" color="green" />
                </div>
              </>
            )}

            {tipo === 'Baja (muerte/pérdida)' && (
              <>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                  {iNum('Cantidad de bajas', bajas, setBajas, '', 'Número de animales muertos o perdidos en este evento.')}
                  {iNum('Peso estimado (kg)', pesoBaja, setPesoBaja, '', 'Peso promedio estimado de los animales perdidos. Se usa para ajustar el peso total del lote.')}
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                  <label style={{ fontSize: '10px', color: 'var(--text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Causa (opcional)</label>
                  <input value={causaBaja} onChange={e => setCausaBaja(e.target.value)} placeholder="Enfermedad respiratoria…"
                    style={{ width: '100%', boxSizing: 'border-box', background: 'var(--bg-primary)', border: '1px solid var(--border-subtle)', borderRadius: '6px', color: 'var(--text-primary)', padding: '7px 10px', fontSize: '13px', outline: 'none', fontFamily: 'IBM Plex Sans, sans-serif' }}
                    onFocus={e => e.target.style.borderColor = 'var(--accent-warning)'} onBlur={e => e.target.style.borderColor = 'var(--border-subtle)'}
                  />
                </div>
                <div style={{ background: 'var(--accent-warning)18', border: '1px solid var(--accent-warning)33', borderRadius: '6px', padding: '10px 12px', fontSize: '12px', color: 'var(--accent-warning)', lineHeight: 1.5 }}>
                  <Icon name="alertTriangle" size={13} style={{ marginRight: '6px' }} />
                  El costo de esta baja se redistribuirá entre los animales sobrevivientes del lote.
                </div>
              </>
            )}

            {!categoriaActiva && tipo !== 'Baja (muerte/pérdida)' && (
              <>
                {iNum('Monto (Bs)', monto, v => setMonto(v), '', 'Costo total de este gasto en bolivianos. Se suma directamente al costo acumulado del lote.')}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                  <label style={{ fontSize: '10px', color: 'var(--text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Descripción</label>
                  <input value={notas} onChange={e => setNotas(e.target.value)} placeholder="Detalle del gasto…"
                    style={{ width: '100%', boxSizing: 'border-box', background: 'var(--bg-primary)', border: '1px solid var(--border-subtle)', borderRadius: '6px', color: 'var(--text-primary)', padding: '7px 10px', fontSize: '13px', outline: 'none', fontFamily: 'IBM Plex Sans, sans-serif' }}
                    onFocus={e => e.target.style.borderColor = accentColor} onBlur={e => e.target.style.borderColor = 'var(--border-subtle)'}
                  />
                </div>
              </>
            )}

            <button onClick={handleRegistrar} disabled={saving}
              style={{ marginTop: '4px', padding: '10px', borderRadius: '6px', border: 'none', background: accentColor, color: '#fff', cursor: saving ? 'not-allowed' : 'pointer', opacity: saving ? 0.7 : 1, fontSize: '13px', fontWeight: 500, fontFamily: 'IBM Plex Sans, sans-serif', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}>
              <Icon name="plus" size={14} /> {saving ? 'Registrando…' : 'Registrar →'}
            </button>
            </>
              );
            })()}
          </div>
        </div>

        <div style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border-subtle)', borderRadius: '8px', overflow: 'hidden' }}>
          <div style={{ padding: '14px 16px', borderBottom: '1px solid var(--border-subtle)' }}>
            <span style={{ fontSize: '11px', fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase', color: accentColor }}>Bitácora del lote</span>
          </div>

          {loadingRegistros && (
            <div style={{ padding: '32px', textAlign: 'center', color: 'var(--text-tertiary)', fontSize: '13px' }}>Cargando registros…</div>
          )}
          {errorRegistros && (
            <div style={{ padding: '16px', color: 'var(--accent-warning)', fontSize: '13px' }}>{errorRegistros}</div>
          )}
          {!loadingRegistros && !errorRegistros && registros.length === 0 && (
            <div style={{ padding: '32px', textAlign: 'center', color: 'var(--text-tertiary)', fontSize: '13px' }}>Sin registros aún. Agregá el primero desde el panel de la izquierda.</div>
          )}

          {registros.length > 0 && (
            <>
              <div style={{ display: 'grid', gridTemplateColumns: '85px 110px 1fr 60px 80px 85px', padding: '8px 16px', borderBottom: '1px solid var(--border-subtle)', gap: '8px' }}>
                {['Fecha', 'Tipo', 'Detalle', 'Cant.', 'Precio U.', 'Total'].map((h, i) => (
                  <div key={i} style={{ fontSize: '11px', color: 'var(--text-tertiary)', fontWeight: 500, textAlign: (i >= 3) ? 'right' : 'left' }}>{h}</div>
                ))}
              </div>
              {registros.map((r, i) => {
                const cfg = TIPO_ICON[r.tipo] || { icon: 'dollarSign', color: 'var(--text-tertiary)' };
                const fechaStr = r.fecha
                  ? new Date(r.fecha).toLocaleDateString('es-BO', { day: '2-digit', month: 'short', year: 'numeric' })
                  : '—';
                return (
                  <div key={r.id} style={{ display: 'grid', gridTemplateColumns: '85px 110px 1fr 60px 80px 85px', padding: '11px 16px', borderBottom: i < registros.length - 1 ? '1px solid var(--border-subtle)' : 'none', gap: '8px', alignItems: 'center', background: r.tipo === 'ENTRADA' ? accentColor + '08' : 'transparent' }}>
                    <span style={{ fontSize: '12px', color: 'var(--text-tertiary)' }}>{fechaStr}</span>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                      <Icon name={cfg.icon} size={12} style={{ color: cfg.color, flexShrink: 0 }} />
                      <span style={{ fontSize: '12px', color: cfg.color, fontWeight: r.tipo === 'ENTRADA' ? 600 : 400 }}>{r.tipo}</span>
                    </div>
                    <div style={{ minWidth: 0, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      <span style={{ fontSize: '13px', color: 'var(--text-primary)' }} title={r.detalle}>{r.detalle}</span>
                      {r.es_baja && <span style={{ marginLeft: '8px', fontSize: '11px', color: 'var(--accent-warning)', fontStyle: 'italic' }}>[redistribuido]</span>}
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <span style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>{r.cantidad != null ? parseFloat(r.cantidad).toLocaleString('es-BO') : '—'}</span>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      {r.precio_unitario != null ? <MoneyDisplay value={parseFloat(r.precio_unitario)} size="sm" /> : <span style={{ fontSize: '12px', color: 'var(--text-tertiary)' }}>—</span>}
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      {r.monto != null ? <MoneyDisplay value={parseFloat(r.monto)} size="sm" /> : <span style={{ fontSize: '12px', color: 'var(--text-tertiary)' }}>—</span>}
                    </div>
                  </div>
                );
              })}
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default Bitacora;
