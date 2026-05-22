import React, { useState, useEffect } from 'react';
import { Icon } from '../../icons.jsx';
import { StatusBadge, RubroBadge, MoneyDisplay, Btn, InfoBanner, InfoTip } from '../../components/ui.jsx';
import { apiFetch } from '../../config/api.js';

const TIPOS_FIJOS = ['Mano de obra', 'Baja (muerte/pérdida)', 'Otras pérdidas', 'Consumo de insumo'];

const TIPO_ICON = {
  'Mano de obra':      { icon: 'user',           color: 'var(--text-tertiary)' },
  'Baja':              { icon: 'alertTriangle',  color: 'var(--accent-warning)' },
  'ENTRADA':           { icon: 'checkCircle',    color: 'var(--accent-agro)' },
  'Otro gasto':        { icon: 'dollarSign',     color: 'var(--text-tertiary)' },
  'Otras pérdidas':    { icon: 'dollarSign',     color: 'var(--text-tertiary)' },
  'Consumo de insumo': { icon: 'layers',         color: 'var(--accent-agro)' },
};

const r4 = n => Math.round(n * 10000) / 10000;

function estimarFIFO(capas, cantidad) {
  let pendiente = r4(parseFloat(cantidad));
  if (!capas?.length || !pendiente || pendiente <= 0) return null;
  let costo = 0;
  for (const c of capas) {
    if (pendiente <= 0) break;
    const disp  = parseFloat(c.cantidad_disponible);
    const precio = parseFloat(c.precio_unitario);
    const consumido = Math.min(pendiente, disp);
    costo     = r4(costo + r4(consumido * precio));
    pendiente = r4(pendiente - consumido);
  }
  if (pendiente > 0.0001) return null; // stock insuficiente
  const costoTotal = r4(costo);
  const cant = parseFloat(cantidad);
  return {
    costoTotal,
    precioPromedio: cant > 0 ? r4(costoTotal / cant) : 0,
  };
}

const hoy = () => new Date().toISOString().split('T')[0];

const FilaConsumo = ({ c, expanded, onToggle }) => {
  const fechaStr = c.fecha_consumo
    ? new Date(c.fecha_consumo + 'T12:00:00').toLocaleDateString('es-BO', { day: '2-digit', month: 'short', year: 'numeric' })
    : '—';
  const detalle = c.detalle_fifo
    ? (typeof c.detalle_fifo === 'string' ? JSON.parse(c.detalle_fifo) : c.detalle_fifo)
    : [];

  return (
    <>
      <div style={{ display: 'grid', gridTemplateColumns: '85px 110px 1fr 60px 80px 85px 28px', padding: '11px 16px', borderBottom: '1px solid var(--border-subtle)', gap: '8px', alignItems: 'center', background: expanded ? 'var(--bg-tertiary)' : 'transparent', transition: 'background 0.1s' }}>
        <span style={{ fontSize: '12px', color: 'var(--text-tertiary)' }}>{fechaStr}</span>
        <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
          <Icon name="layers" size={12} style={{ color: 'var(--accent-agro)', flexShrink: 0 }} />
          <span style={{ fontSize: '12px', color: 'var(--accent-agro)' }}>Consumo</span>
        </div>
        <div style={{ minWidth: 0 }}>
          <div style={{ fontSize: '13px', color: 'var(--text-primary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
            {parseFloat(c.cantidad_total).toFixed(2)} {c.unidad_simbolo || ''} de {c.insumo_nombre || '—'}
          </div>
          <div style={{ fontSize: '11px', color: 'var(--text-tertiary)', fontFamily: 'IBM Plex Mono, monospace' }}>
            prom. Bs {parseFloat(c.precio_promedio).toFixed(4)}/{c.unidad_simbolo || 'u'}
          </div>
        </div>
        <div style={{ textAlign: 'right' }}>
          <span style={{ fontSize: '12px', color: 'var(--text-secondary)', fontFamily: 'IBM Plex Mono, monospace' }}>
            {parseFloat(c.cantidad_total).toFixed(2)}
          </span>
        </div>
        <div style={{ textAlign: 'right' }}>
          <span style={{ fontSize: '12px', color: 'var(--text-secondary)', fontFamily: 'IBM Plex Mono, monospace' }}>
            Bs {parseFloat(c.precio_promedio).toFixed(4)}
          </span>
        </div>
        <div style={{ textAlign: 'right' }}>
          <span style={{ fontSize: '12px', fontFamily: 'IBM Plex Mono, monospace', color: 'var(--text-primary)' }}>
            Bs {parseFloat(c.costo_total).toLocaleString('es-BO', { minimumFractionDigits: 2 })}
          </span>
        </div>
        <div style={{ display: 'flex', justifyContent: 'center' }}>
          <button onClick={onToggle}
            style={{ background: 'transparent', border: '1px solid var(--border-subtle)', borderRadius: '4px', color: 'var(--text-tertiary)', cursor: 'pointer', padding: '2px 4px', display: 'flex', alignItems: 'center', transition: 'all 0.15s' }}
            onMouseEnter={e => { e.currentTarget.style.background = 'var(--bg-primary)'; e.currentTarget.style.color = 'var(--accent-agro)'; }}
            onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = 'var(--text-tertiary)'; }}
          >
            <Icon name={expanded ? 'chevronUp' : 'chevronDown'} size={12} />
          </button>
        </div>
      </div>

      {expanded && detalle.length > 0 && (
        <div style={{ padding: '12px 16px 14px', borderBottom: '1px solid var(--border-subtle)', background: 'var(--bg-primary)' }}>
          <div style={{ border: '1px solid var(--border-subtle)', borderRadius: '6px', overflow: 'hidden', fontSize: '12px', fontFamily: 'IBM Plex Mono, monospace' }}>
            {detalle.map((l, i) => (
              <div key={i} style={{ display: 'flex', justifyContent: 'space-between', padding: '7px 12px', borderBottom: i < detalle.length - 1 ? '1px solid var(--border-subtle)' : 'none', color: 'var(--text-secondary)' }}>
                <span>Compra del {new Date(l.fecha_compra + 'T12:00:00').toLocaleDateString('es-BO', { day: '2-digit', month: '2-digit', year: 'numeric' })}</span>
                <span>{parseFloat(l.cantidad).toFixed(2)} {c.unidad_simbolo || ''} × Bs {parseFloat(l.precio_unitario).toFixed(2)}</span>
                <span style={{ color: 'var(--text-primary)' }}>= Bs {parseFloat(l.subtotal).toFixed(2)}</span>
              </div>
            ))}
            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 12px', background: 'var(--bg-secondary)', borderTop: '1px solid var(--border-subtle)', color: 'var(--text-secondary)' }}>
              <span>Precio promedio: <strong style={{ color: 'var(--text-primary)' }}>Bs {parseFloat(c.precio_promedio).toFixed(4)}/{c.unidad_simbolo || 'u'}</strong></span>
              <span>Total: <strong style={{ color: 'var(--text-primary)' }}>Bs {parseFloat(c.costo_total).toLocaleString('es-BO', { minimumFractionDigits: 2 })}</strong></span>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

const DiarioProduccion = ({ negocioId, activeLote }) => {
  const accentColor = 'var(--accent-agro)';

  const [lotes, setLotes] = useState([]);
  const [selectedLoteId, setSelectedLoteId] = useState(activeLote?._id || activeLote?.id || null);

  const [registros, setRegistros] = useState([]);
  const [consumos, setConsumos] = useState([]);
  const [expandedConsumoIds, setExpandedConsumoIds] = useState(new Set());

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

  // Estado del formulario de consumo de insumo
  const [consumoInsumoId, setConsumoInsumoId] = useState('');
  const [consumoCantidad, setConsumoCantidad] = useState('');
  const [consumoFecha, setConsumoFecha] = useState(hoy());
  const [consumoNotas, setConsumoNotas] = useState('');
  const [consumoStockInfo, setConsumoStockInfo] = useState(null);
  const [consumoEstimado, setConsumoEstimado] = useState(null);
  const [consumoError, setConsumoError] = useState('');
  const [loadingConsumoStock, setLoadingConsumoStock] = useState(false);

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

  // Recalcular estimado FIFO cuando cambia la cantidad o el stock cargado
  useEffect(() => {
    if (tipo === 'Consumo de insumo' && consumoStockInfo?.capas && consumoCantidad) {
      setConsumoEstimado(estimarFIFO(consumoStockInfo.capas, consumoCantidad));
    } else {
      setConsumoEstimado(null);
    }
  }, [consumoCantidad, consumoStockInfo]);

  const fetchDiario = async () => {
    if (!negocioId || !loteRealId) return;
    setLoadingRegistros(true);
    setErrorRegistros(null);
    try {
      const data = await apiFetch(`/api/negocios/${negocioId}/lotes/${loteRealId}/diario`);
      setRegistros(data);
    } catch (e) {
      setErrorRegistros(e?.error || 'Error al cargar el diario de producción');
    } finally {
      setLoadingRegistros(false);
    }
  };

  const fetchConsumos = async () => {
    if (!negocioId || !loteRealId) return;
    try {
      const data = await apiFetch(`/api/negocios/${negocioId}/lotes/${loteRealId}/consumos`);
      setConsumos(data);
    } catch {}
  };

  const fetchLote = async () => {
    if (!negocioId || !loteRealId) return;
    try {
      const data = await apiFetch(`/api/negocios/${negocioId}/lotes/${loteRealId}`);
      setLoteData(data);
    } catch {}
  };

  useEffect(() => {
    fetchDiario();
    fetchConsumos();
    if (loteRealId) fetchLote();
  }, [negocioId, loteRealId]);

  const handleInsumoChange = insumoId => {
    const id = parseInt(insumoId);
    setSelectedInsumoId(id);
    setUserEditedCantidad(false);
    setUserEditedPrecio(false);
    const ins = insumos.find(i => String(i.id) === String(id));
    setCostoSaco(ins ? String(parseFloat(ins.precio_unitario) || 0) : '0');
    setSacos('10');
  };

  const handleConsumoInsumoChange = async (insumoId) => {
    setConsumoInsumoId(insumoId);
    setConsumoStockInfo(null);
    setConsumoEstimado(null);
    setConsumoError('');
    if (!insumoId) return;
    setLoadingConsumoStock(true);
    try {
      const data = await apiFetch(`/api/negocios/${negocioId}/compras/${insumoId}/stock`);
      setConsumoStockInfo(data);
    } catch {
      setConsumoStockInfo(null);
    } finally {
      setLoadingConsumoStock(false);
    }
  };

  const toggleConsumoExpand = (id) => {
    setExpandedConsumoIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const handleRegistrar = async () => {
    if (!negocioId || !loteRealId) return;
    setSaving(true);

    // ── Caso especial: Consumo de insumo ──
    if (tipo === 'Consumo de insumo') {
      setConsumoError('');
      try {
        const resultado = await apiFetch(`/api/negocios/${negocioId}/lotes/${loteRealId}/consumir`, {
          method: 'POST',
          body: JSON.stringify({
            insumo_id: consumoInsumoId,
            cantidad:  consumoCantidad,
            fecha_consumo: consumoFecha,
            notas: consumoNotas || null,
          }),
        });
        // Usar costo_total y detalle_fifo del response (corrección 4: no el estimado)
        const insumoSel = insumos.find(i => i.id === consumoInsumoId);
        const consumoAugmented = {
          ...resultado.consumo,
          detalle_fifo:  resultado.detalle_fifo,
          insumo_nombre: insumoSel?.nombre || '',
          unidad_simbolo: insumoSel?.unidad_simbolo || '',
        };
        setConsumos(prev => [consumoAugmented, ...prev]);
        setConsumoInsumoId('');
        setConsumoCantidad('');
        setConsumoNotas('');
        setConsumoStockInfo(null);
        setConsumoEstimado(null);
      } catch (e) {
        setConsumoError(e?.error || 'Error al registrar el consumo');
        // No cerrar ni limpiar el formulario en error
      } finally {
        setSaving(false);
      }
      return;
    }

    // ── Caso general: bitácora ──
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
        detalle = ins ? ins.nombre : 'Insumo';
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

      const nuevo = await apiFetch(`/api/negocios/${negocioId}/lotes/${loteRealId}/diario`, {
        method: 'POST',
        body: JSON.stringify({
          fecha:           new Date().toISOString().split('T')[0],
          tipo:            tipoApi,
          detalle,
          monto:           montoFinal,
          es_baja:         esBaja,
          cabezas_baja:    cabezasBaja,
          peso_baja:       pesoBajaVal,
          causa:           causaVal,
          cantidad_kg:     tipoApi === 'Alimento / Balanceado' ? cantidadApi : null,
          cantidad:        cantidadApi,
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

  const costoAcumulado = (parseFloat(loteData?.costo_adquisicion) || 0)
    + registros.filter(r => !r.es_baja && r.monto != null).reduce((s, r) => s + parseFloat(r.monto), 0)
    + consumos.reduce((s, c) => s + parseFloat(c.costo_total || 0), 0);

  const cabezasActivas = loteData?.cabezas_activas ?? '—';

  // Mezclar registros y consumos en un solo historial ordenado por fecha desc
  const historial = [
    ...registros.map(r => ({ ...r, _kind: 'diario', _sortDate: r.fecha || r.created_at })),
    ...consumos.map(c => ({ ...c, _kind: 'consumo',   _sortDate: c.fecha_consumo || c.created_at })),
  ].sort((a, b) => {
    const da = new Date(b._sortDate || 0) - new Date(a._sortDate || 0);
    if (da !== 0) return da;
    return new Date(b.created_at || 0) - new Date(a.created_at || 0);
  });

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      <InfoBanner
        storageKey="banner_diario_v1"
        title="Diario de producción"
        text="El diario de producción es el registro diario del lote. Cada gasto que registrés acá aumenta el costo total y se refleja en el despiece y la liquidación. Los registros de 'Alimento / Balanceado' son especiales: el campo Cantidad en kg se usa para calcular el ICa."
        accentColor="var(--accent-agro)"
      />
      <div style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border-subtle)', borderRadius: '8px', padding: '14px 20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '3px' }}>
            <span style={{ fontSize: '15px', fontWeight: 500, color: 'var(--text-primary)' }}>Lote </span>
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
        {/* ── Panel de registro ── */}
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
                  {/* Selector de tipo */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <label style={{ fontSize: '10px', color: 'var(--text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Tipo</label>
                      <InfoTip text={"'Alimento / Balanceado' es especial: el sistema usa el campo Cantidad (kg) para calcular el ICa del lote.\nLos demás tipos solo suman el monto en Bs al costo total."} />
                    </div>
                    <select value={tipo || ''} onChange={e => { setTipo(e.target.value); setConsumoError(''); }} style={{ width: '100%', boxSizing: 'border-box' }}>
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

                  {/* Formulario: Consumo de insumo */}
                  {tipo === 'Consumo de insumo' && (
                    <>
                      {consumoError && (
                        <div style={{ color: 'var(--accent-danger)', fontSize: '12px', padding: '8px 10px', background: 'var(--accent-danger)10', borderRadius: '6px', border: '1px solid var(--accent-danger)33' }}>
                          <Icon name="alertTriangle" size={12} style={{ marginRight: '5px' }} />
                          {consumoError}
                        </div>
                      )}
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                        <label style={{ fontSize: '10px', color: 'var(--text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Insumo *</label>
                        <select value={consumoInsumoId} onChange={e => handleConsumoInsumoChange(e.target.value)} style={{ width: '100%', boxSizing: 'border-box' }}>
                          <option value="">— Seleccionar —</option>
                          {insumos.map(i => (
                            <option key={i.id} value={i.id}>
                              {i.nombre} — {parseFloat(i.stock_total || 0).toFixed(2)} {i.unidad_simbolo || 'u'} disponibles
                            </option>
                          ))}
                        </select>
                        {loadingConsumoStock && <span style={{ fontSize: '11px', color: 'var(--text-tertiary)' }}>Cargando stock…</span>}
                        {consumoStockInfo && !loadingConsumoStock && (
                          <span style={{ fontSize: '11px', color: 'var(--text-secondary)', fontFamily: 'IBM Plex Mono, monospace' }}>
                            Stock: {parseFloat(consumoStockInfo.stock_total).toFixed(2)} {consumoStockInfo.insumo?.unidad_simbolo || ''}
                          </span>
                        )}
                      </div>

                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                        {iNum(
                          `Cantidad${consumoStockInfo ? ` (${consumoStockInfo.insumo?.unidad_simbolo || 'u'})` : ''} *`,
                          consumoCantidad,
                          v => setConsumoCantidad(v),
                          '0'
                        )}
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                          <label style={{ fontSize: '10px', color: 'var(--text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Unidad</label>
                          <input readOnly value={consumoStockInfo?.insumo?.unidad_simbolo || '—'}
                            style={{ background: 'var(--bg-primary)', border: '1px solid var(--border-subtle)', borderRadius: '6px', color: 'var(--text-secondary)', padding: '7px 10px', fontSize: '13px', outline: 'none', fontFamily: 'IBM Plex Mono, monospace', cursor: 'default' }}
                          />
                        </div>
                      </div>

                      <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                        <label style={{ fontSize: '10px', color: 'var(--text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Fecha *</label>
                        <input type="date" value={consumoFecha} onChange={e => setConsumoFecha(e.target.value)}
                          style={{ width: '100%', boxSizing: 'border-box', background: 'var(--bg-primary)', border: '1px solid var(--border-subtle)', borderRadius: '6px', color: 'var(--text-primary)', padding: '7px 10px', fontSize: '13px', outline: 'none' }}
                          onFocus={e => e.target.style.borderColor = accentColor} onBlur={e => e.target.style.borderColor = 'var(--border-subtle)'}
                        />
                      </div>

                      <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                        <label style={{ fontSize: '10px', color: 'var(--text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Notas</label>
                        <input value={consumoNotas} onChange={e => setConsumoNotas(e.target.value)} placeholder="Opcional…"
                          style={{ width: '100%', boxSizing: 'border-box', background: 'var(--bg-primary)', border: '1px solid var(--border-subtle)', borderRadius: '6px', color: 'var(--text-primary)', padding: '7px 10px', fontSize: '13px', outline: 'none', fontFamily: 'IBM Plex Sans, sans-serif' }}
                          onFocus={e => e.target.style.borderColor = accentColor} onBlur={e => e.target.style.borderColor = 'var(--border-subtle)'}
                        />
                      </div>

                      {/* Preview de costo estimado FIFO */}
                      {consumoEstimado && (
                        <div style={{ background: 'var(--bg-tertiary)', borderRadius: '6px', padding: '10px 12px', display: 'flex', flexDirection: 'column', gap: '3px' }}>
                          <span style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
                            Costo estimado:{' '}
                            <strong style={{ color: 'var(--text-primary)', fontFamily: 'IBM Plex Mono, monospace' }}>
                              Bs {consumoEstimado.costoTotal.toLocaleString('es-BO', { minimumFractionDigits: 2 })}
                            </strong>
                            {' '}(prom. Bs {consumoEstimado.precioPromedio.toFixed(4)}/{consumoStockInfo?.insumo?.unidad_simbolo || 'u'})
                          </span>
                          <span style={{ fontSize: '11px', color: 'var(--text-tertiary)' }}>* El precio final se confirma al registrar</span>
                        </div>
                      )}
                      {consumoCantidad && consumoStockInfo && !consumoEstimado && (
                        <div style={{ fontSize: '12px', color: 'var(--accent-warning)', padding: '8px 10px', background: 'var(--accent-warning)10', borderRadius: '6px' }}>
                          Stock insuficiente para esta cantidad
                        </div>
                      )}
                    </>
                  )}

                  {/* Formulario: categoría de insumo (existente) */}
                  {categoriaActiva && tipo !== 'Consumo de insumo' && (
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
                            ? 'Kg físicos de balanceado entregados. El sistema usa este número para calcular el ICa.'
                            : 'Cantidad del insumo utilizado en esta entrega.';
                          return <>{iNum(unidadLabel, sacos, v => { setUserEditedCantidad(true); setSacos(v); }, '', tipCantidad)}</>;
                        })()}
                        {iNum('Precio unitario (Bs)', costoSaco, v => { setUserEditedPrecio(true); setCostoSaco(v); }, '', 'Precio por unidad del insumo.')}
                      </div>
                      <div style={{ background: 'var(--bg-tertiary)', borderRadius: '6px', padding: '10px 12px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>Total</span>
                        <MoneyDisplay value={totalAlim} size="md" color="green" />
                      </div>
                    </>
                  )}

                  {/* Baja */}
                  {tipo === 'Baja (muerte/pérdida)' && (
                    <>
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                        {iNum('Cantidad de bajas', bajas, setBajas, '', 'Número de animales muertos o perdidos en este evento.')}
                        {iNum('Peso estimado (kg)', pesoBaja, setPesoBaja, '', 'Peso promedio estimado de los animales perdidos.')}
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

                  {/* Monto genérico */}
                  {!categoriaActiva && tipo !== 'Baja (muerte/pérdida)' && tipo !== 'Consumo de insumo' && (
                    <>
                      {iNum('Monto (Bs)', monto, v => setMonto(v), '', 'Costo total de este gasto en bolivianos.')}
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

        {/* ── Panel de historial ── */}
        <div style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border-subtle)', borderRadius: '8px', overflow: 'hidden' }}>
          <div style={{ padding: '14px 16px', borderBottom: '1px solid var(--border-subtle)' }}>
            <span style={{ fontSize: '11px', fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase', color: accentColor }}>Diario de producción</span>
          </div>

          {loadingRegistros && (
            <div style={{ padding: '32px', textAlign: 'center', color: 'var(--text-tertiary)', fontSize: '13px' }}>Cargando registros…</div>
          )}
          {errorRegistros && (
            <div style={{ padding: '16px', color: 'var(--accent-warning)', fontSize: '13px' }}>{errorRegistros}</div>
          )}
          {!loadingRegistros && !errorRegistros && historial.length === 0 && (
            <div style={{ padding: '32px', textAlign: 'center', color: 'var(--text-tertiary)', fontSize: '13px' }}>Sin registros aún. Agregá el primero desde el panel de la izquierda.</div>
          )}

          {historial.length > 0 && (
            <>
              <div style={{ display: 'grid', gridTemplateColumns: '85px 110px 1fr 60px 80px 85px 28px', padding: '8px 16px', borderBottom: '1px solid var(--border-subtle)', gap: '8px' }}>
                {['Fecha', 'Tipo', 'Detalle', 'Cant.', 'Precio U.', 'Total', ''].map((h, i) => (
                  <div key={i} style={{ fontSize: '11px', color: 'var(--text-tertiary)', fontWeight: 500, textAlign: (i >= 3 && i < 6) ? 'right' : 'left' }}>{h}</div>
                ))}
              </div>

              {historial.map((item, i) => {
                const isLast = i === historial.length - 1;

                if (item._kind === 'consumo') {
                  return (
                    <FilaConsumo
                      key={`consumo-${item.id}`}
                      c={item}
                      expanded={expandedConsumoIds.has(item.id)}
                      onToggle={() => toggleConsumoExpand(item.id)}
                    />
                  );
                }

                // Fila de diario normal
                const r = item;
                const cfg = TIPO_ICON[r.tipo] || { icon: 'dollarSign', color: 'var(--text-tertiary)' };
                const fechaStr = r.fecha
                  ? new Date(r.fecha).toLocaleDateString('es-BO', { day: '2-digit', month: 'short', year: 'numeric' })
                  : '—';
                return (
                  <div key={`diario-${r.id}`}
                    style={{ display: 'grid', gridTemplateColumns: '85px 110px 1fr 60px 80px 85px 28px', padding: '11px 16px', borderBottom: !isLast ? '1px solid var(--border-subtle)' : 'none', gap: '8px', alignItems: 'center', background: r.tipo === 'ENTRADA' ? accentColor + '08' : 'transparent' }}>
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
                    <div /> {/* celda vacía para el toggle */}
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

export default DiarioProduccion;
