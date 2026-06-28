import React, { useState, useEffect } from 'react';
import { Icon } from '../../icons.jsx';
import { Btn, MoneyDisplay } from '../../components/ui.jsx';
import { apiFetch, fmtQty } from '../../config/api.js';

const MESES = ['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'];
const DIAS  = ['domingo','lunes','martes','miércoles','jueves','viernes','sábado'];

function formatFechaLarga(fechaStr) {
  if (!fechaStr) return '';
  const [y, m, d] = fechaStr.split('-').map(Number);
  return `${DIAS[new Date(y, m-1, d).getDay()]} ${d} de ${MESES[m-1].toLowerCase()} de ${y}`;
}

const Label = ({ children }) => (
  <div style={{ fontSize: '10px', fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--text-tertiary)', marginBottom: '8px' }}>
    {children}
  </div>
);

const ConfirmDialog = ({ fecha, onConfirm, onCancel, loading, error }) => (
  <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
    <div style={{ background: 'var(--bg-primary)', border: '1px solid var(--border-mid)', borderRadius: '12px', padding: '28px 32px', maxWidth: '420px', width: '90%', display: 'flex', flexDirection: 'column', gap: '16px' }}>
      <div style={{ fontSize: '16px', fontWeight: 500, color: 'var(--text-primary)' }}>
        ¿Confirmar el registro?
      </div>
      <div style={{ fontSize: '13px', color: 'var(--text-secondary)', lineHeight: 1.7 }}>
        Vas a confirmar el registro del <strong>{formatFechaLarga(fecha)}</strong>. Esta acción descontará los insumos del inventario (FIFO) y <strong>no puede deshacerse</strong>.
      </div>
      {error && (
        <div style={{ padding: '10px 14px', background: 'var(--accent-warning)18', border: '1px solid var(--accent-warning)44', borderRadius: '6px', fontSize: '12px', color: 'var(--accent-warning)', lineHeight: 1.6 }}>
          ⚠ {error}
        </div>
      )}
      <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
        <Btn variant="ghost" onClick={onCancel} disabled={loading}>Cancelar</Btn>
        <Btn variant="primary" onClick={onConfirm} loading={loading} icon="checkCircle">
          Confirmar día
        </Btn>
      </div>
    </div>
  </div>
);

const RegistroDia = ({ negocioId, activeLote, fecha, onNavigate }) => {
  const accentColor = 'var(--accent-agro)';
  const loteId = activeLote?._id;

  const [data,    setData]    = useState(null);
  const [insumos, setInsumos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState(null);

  const [items,   setItems]   = useState([]);
  const [notas,   setNotas]   = useState('');
  const [saving,  setSaving]  = useState(false);
  const [saveOk,  setSaveOk]  = useState(false);
  const [saveErr, setSaveErr] = useState(null);

  const [peso, setPeso] = useState('');
  const [pesoCabezas, setPesoCabezas] = useState('');
  const [pesoNotas, setPesoNotas] = useState('');
  const [pesoSaving, setPesoSaving] = useState(false);
  const [pesoMsg, setPesoMsg] = useState(null);

  const [reloadKey, setReloadKey] = useState(0);

  const [addMode,      setAddMode]      = useState('none');
  const [newInsumoId,  setNewInsumoId]  = useState('');
  const [newCantidad,  setNewCantidad]  = useState('');
  const [newServId,          setNewServId]          = useState('');
  const [newServNom,         setNewServNom]         = useState('');
  const [newServCosto,       setNewServCosto]       = useState('');
  const [newServRealizadoPor,setNewServRealizadoPor]= useState('');
  const [catalogo,           setCatalogo]           = useState([]);
  const [stockInfo,    setStockInfo]    = useState(null);
  const [loadingStock, setLoadingStock] = useState(false);

  const [showConfirm,  setShowConfirm]  = useState(false);
  const [confirming,   setConfirming]   = useState(false);
  const [confirmError, setConfirmError] = useState(null);

  useEffect(() => {
    if (!negocioId || !loteId || !fecha) { setLoading(false); return; }
    setLoading(true);
    setError(null);
    Promise.all([
      apiFetch(`/api/negocios/${negocioId}/lotes/${loteId}/hoja-de-vida/${fecha}`),
      apiFetch(`/api/negocios/${negocioId}/insumos`),
      apiFetch(`/api/negocios/${negocioId}/servicios`),
    ])
      .then(([detalle, insList, serviciosList]) => {
        setData(detalle);
        setInsumos(insList || []);
        setCatalogo(serviciosList || []);
        if (detalle.registro) {
          setItems((detalle.registro.items || []).map(it => ({
            tipo:            it.tipo,
            insumo_id:       it.insumo_id || null,
            insumo_nombre:   it.insumo_nombre || '',
            cantidad:        it.cantidad != null ? String(it.cantidad) : '',
            unidad_id:       it.unidad_id || null,
            unidad_simbolo:  it.unidad_simbolo || '',
            costo_real:      it.costo_real != null ? parseFloat(it.costo_real) : null,
            servicio_id:     it.servicio_id || null,
            servicio_nombre: it.servicio_nombre || '',
            costo_servicio:  it.costo_servicio != null ? String(it.costo_servicio) : '',
            realizado_por:   it.realizado_por || '',
          })));
          setNotas(detalle.registro.notas_del_dia || '');
        }
        if (detalle.pesaje_del_dia) {
          setPeso(detalle.pesaje_del_dia.peso_prom_kg || '');
          setPesoCabezas(detalle.pesaje_del_dia.n_cabezas_muestra || '');
          setPesoNotas(detalle.pesaje_del_dia.notas || '');
        }
        setLoading(false);
      })
      .catch(e => { setError(e?.error || 'Error al cargar el registro'); setLoading(false); });
  }, [negocioId, loteId, fecha, reloadKey]);

  useEffect(() => {
    if (!newInsumoId || !negocioId) { setStockInfo(null); return; }
    setLoadingStock(true);
    apiFetch(`/api/negocios/${negocioId}/compras/${newInsumoId}/stock`)
      .then(s  => { setStockInfo(s); setLoadingStock(false); })
      .catch(() => { setStockInfo(null); setLoadingStock(false); });
  }, [newInsumoId, negocioId]);

  const isConfirmado = data?.registro?.confirmado;

  const addInsumo = () => {
    if (!newInsumoId || !newCantidad) return;
    const ins = insumos.find(i => i.id === newInsumoId);
    if (!ins) return;
    setItems(prev => [...prev, {
      tipo: 'insumo', insumo_id: ins.id, insumo_nombre: ins.nombre,
      cantidad: newCantidad, unidad_id: ins.unidad_id || null,
      unidad_simbolo: ins.unidad_simbolo || '', costo_real: null,
    }]);
    setNewInsumoId(''); setNewCantidad(''); setStockInfo(null); setAddMode('none');
  };

  const addServicio = () => {
    const servicioCatalogo = catalogo.find(s => s.id === newServId);
    const nombre = newServId && newServId !== '__otro__'
      ? (servicioCatalogo?.nombre || '')
      : newServNom;
    if (!nombre) return;
    setItems(prev => [...prev, {
      tipo: 'servicio',
      servicio_id:     (newServId && newServId !== '__otro__') ? newServId : null,
      servicio_nombre: nombre,
      costo_servicio:  newServCosto,
      realizado_por:   newServRealizadoPor,
    }]);
    setNewServId(''); setNewServNom(''); setNewServCosto(''); setNewServRealizadoPor(''); setAddMode('none');
  };

  const removeItem = idx => setItems(prev => prev.filter((_, i) => i !== idx));

  const handleSave = async () => {
    setSaving(true); setSaveOk(false); setSaveErr(null);
    try {
      const res = await apiFetch(
        `/api/negocios/${negocioId}/lotes/${loteId}/hoja-de-vida/${fecha}`,
        {
          method: 'POST',
          body: JSON.stringify({
            notas_del_dia: notas || null,
            items: items.map(it => ({
              tipo:            it.tipo,
              insumo_id:       it.tipo === 'insumo'   ? it.insumo_id        : undefined,
              cantidad:        it.tipo === 'insumo'   ? parseFloat(it.cantidad) : undefined,
              unidad_id:       it.tipo === 'insumo'   ? it.unidad_id        : undefined,
              servicio_id:     it.tipo === 'servicio' ? (it.servicio_id    || undefined) : undefined,
              servicio_nombre: it.tipo === 'servicio' ? it.servicio_nombre  : undefined,
              costo_servicio:  it.tipo === 'servicio' && it.costo_servicio
                ? parseFloat(it.costo_servicio) : undefined,
              realizado_por:   it.tipo === 'servicio' ? (it.realizado_por  || undefined) : undefined,
            })),
          }),
        }
      );
      setData(prev => ({ ...prev, registro: { ...res } }));
      setSaveOk(true);
      setTimeout(() => setSaveOk(false), 3000);
    } catch (e) {
      setSaveErr(e?.error || 'Error al guardar');
    } finally {
      setSaving(false);
    }
  };

  const handleConfirmar = async () => {
    setConfirming(true); setConfirmError(null);
    try {
      // 1. Guardar primero el borrador con los datos actuales en pantalla
      await apiFetch(
        `/api/negocios/${negocioId}/lotes/${loteId}/hoja-de-vida/${fecha}`,
        {
          method: 'POST',
          body: JSON.stringify({
            notas_del_dia: notas || null,
            items: items.map(it => ({
              tipo:            it.tipo,
              insumo_id:       it.tipo === 'insumo'   ? it.insumo_id        : undefined,
              cantidad:        it.tipo === 'insumo'   ? parseFloat(it.cantidad) : undefined,
              unidad_id:       it.tipo === 'insumo'   ? it.unidad_id        : undefined,
              servicio_id:     it.tipo === 'servicio' ? (it.servicio_id    || undefined) : undefined,
              servicio_nombre: it.tipo === 'servicio' ? it.servicio_nombre  : undefined,
              costo_servicio:  it.tipo === 'servicio' && it.costo_servicio
                ? parseFloat(it.costo_servicio) : undefined,
              realizado_por:   it.tipo === 'servicio' ? (it.realizado_por  || undefined) : undefined,
            })),
          }),
        }
      );

      // 2. Confirmar el día (ejecuta el FIFO de insumos)
      const res = await apiFetch(
        `/api/negocios/${negocioId}/lotes/${loteId}/hoja-de-vida/${fecha}/confirmar`,
        { method: 'POST' }
      );
      setData(prev => ({ ...prev, registro: { ...res } }));
      setItems((res.items || []).map(it => ({
        tipo:            it.tipo,
        insumo_id:       it.insumo_id || null,
        insumo_nombre:   it.insumo_nombre || '',
        cantidad:        it.cantidad != null ? String(it.cantidad) : '',
        unidad_id:       it.unidad_id || null,
        unidad_simbolo:  it.unidad_simbolo || '',
        costo_real:      it.costo_real != null ? parseFloat(it.costo_real) : null,
        servicio_id:     it.servicio_id || null,
        servicio_nombre: it.servicio_nombre || '',
        costo_servicio:  it.costo_servicio != null ? String(it.costo_servicio) : '',
        realizado_por:   it.realizado_por || '',
      })));
      setShowConfirm(false);
    } catch (e) {
      setConfirmError(e?.error || 'Error al confirmar');
    } finally {
      setConfirming(false);
    }
  };

  const guardarPeso = async () => {
    const val = Number(peso);
    if (!Number.isFinite(val) || val <= 0) { setPesoMsg('Ingresa un peso mayor a 0'); return; }
    setPesoSaving(true); setPesoMsg(null);
    try {
      await apiFetch(`/api/negocios/${negocioId}/lotes/${loteId}/pesajes`, {
        method: 'POST',
        body: JSON.stringify({
          fecha,
          peso_prom_kg: val,
          n_cabezas_muestra: pesoCabezas ? Number(pesoCabezas) : null,
          notas: pesoNotas || null,
        }),
      });
      setPeso(''); setPesoCabezas(''); setPesoNotas('');
      setPesoMsg('Peso registrado ✓');
      setReloadKey(k => k + 1);
    } catch (err) {
      setPesoMsg(err?.error || err?.message || 'Error al registrar el peso');
    } finally {
      setPesoSaving(false);
    }
  };

  // ── Guard ────────────────────────────────────────────────────────────────────
  if (!activeLote || !loteId || !fecha) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '60vh', gap: '16px', textAlign: 'center' }}>
        <Icon name="calendar" size={36} style={{ color: 'var(--text-tertiary)' }} />
        <div style={{ fontSize: '15px', fontWeight: 500, color: 'var(--text-primary)' }}>No hay día seleccionado</div>
        <Btn variant="secondary" icon="chevronLeft" onClick={() => onNavigate?.('hojavida')}>Volver a Hoja de Vida</Btn>
      </div>
    );
  }

  if (loading) return (
    <div style={{ textAlign: 'center', padding: '64px', color: 'var(--text-tertiary)', fontSize: '14px' }}>Cargando registro…</div>
  );

  if (error && !data) return (
    <div style={{ padding: '14px 18px', background: 'var(--accent-warning)18', border: '1px solid var(--accent-warning)44', borderRadius: '8px', color: 'var(--accent-warning)', fontSize: '13px' }}>
      {error}
    </div>
  );

  const { estandar, dias_en_lote } = data || {};

  // ── Render ───────────────────────────────────────────────────────────────────
  return (
    <>
      {showConfirm && (
        <ConfirmDialog
          fecha={fecha}
          onConfirm={handleConfirmar}
          onCancel={() => { setShowConfirm(false); setConfirmError(null); }}
          loading={confirming}
          error={confirmError}
        />
      )}

      <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>

        {/* Breadcrumb + título */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
          <button
            onClick={() => onNavigate?.('lotes')}
            style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: 'var(--text-tertiary)', display: 'flex', alignItems: 'center', gap: '4px', fontSize: '13px', padding: '4px 0', fontFamily: 'var(--font-sans)' }}
            onMouseEnter={e => e.currentTarget.style.color = 'var(--text-secondary)'}
            onMouseLeave={e => e.currentTarget.style.color = 'var(--text-tertiary)'}
          >
            <Icon name="chevronLeft" size={14} /> Lotes
          </button>
          <span style={{ color: 'var(--border-mid)' }}>·</span>
          <button
            onClick={() => onNavigate?.('hojavida')}
            style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: 'var(--text-tertiary)', fontSize: '13px', padding: '4px 0', fontFamily: 'var(--font-sans)' }}
            onMouseEnter={e => e.currentTarget.style.color = 'var(--text-secondary)'}
            onMouseLeave={e => e.currentTarget.style.color = 'var(--text-tertiary)'}
          >
            Hoja de Vida
          </button>
          <span style={{ color: 'var(--border-mid)' }}>·</span>
          <div>
            <div style={{ fontSize: '17px', fontWeight: 500, color: 'var(--text-primary)', letterSpacing: '-0.01em', textTransform: 'capitalize' }}>
              {formatFechaLarga(fecha)}
            </div>
            <div style={{ fontSize: '12px', color: 'var(--text-tertiary)', marginTop: '1px' }}>
              Lote #{activeLote.id} · día {dias_en_lote} en lote
              {estandar?.fase && <span style={{ color: accentColor, marginLeft: '6px' }}>· {estandar.fase}</span>}
            </div>
          </div>
          {isConfirmado && (
            <span style={{ marginLeft: 'auto', display: 'inline-flex', alignItems: 'center', gap: '5px', padding: '4px 10px', borderRadius: '6px', fontSize: '12px', fontWeight: 500, color: accentColor, background: accentColor + '18', border: `1px solid ${accentColor}33` }}>
              <Icon name="checkCircle" size={13} /> Confirmado
            </span>
          )}
        </div>

        {/* Banner de vencido */}
        {data?.pesaje?.vencido && (
          <div style={{ padding: '10px 14px', background: 'var(--accent-warning)18', border: '1px solid var(--accent-warning)44', borderRadius: 6, fontSize: 13, color: 'var(--accent-warning)', marginBottom: 8 }}>
            ⚠ Pesaje pendiente: vencido hace {data.pesaje.dias_atraso} día(s). Tocaba el {data.pesaje.proximo_pesaje_fecha}.
          </div>
        )}

        {/* Tarjeta de peso */}
        <div style={{ border: '1px solid var(--border-mid)', borderRadius: 12, padding: 20, marginBottom: 8, background: 'var(--bg-secondary)' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <div style={{ width: 32, height: 32, borderRadius: '6px', background: 'var(--bg-tertiary)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--accent-agro)' }}>
                <Icon name="scale" size={18} />
              </div>
              <div>
                <div style={{ fontSize: '13px', fontWeight: 500, color: 'var(--text-primary)' }}>Peso del lote</div>
                <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
                  {data?.pesaje_del_dia 
                    ? 'Pesaje ya registrado para este día' 
                    : data?.pesaje?.vencido 
                      ? 'Pesaje vencido o esperado para hoy' 
                      : 'Opcional (fuera de cadencia)'}
                </div>
              </div>
            </div>
            {data?.pesaje_del_dia && (
              <div style={{ background: 'var(--accent-agro)18', color: 'var(--accent-agro)', padding: '4px 8px', borderRadius: '4px', fontSize: '12px', fontWeight: 600 }}>
                {data.pesaje_del_dia.peso_prom_kg} kg/cab
              </div>
            )}
          </div>
          <div style={{ fontSize: 13, color: 'var(--text-secondary)', marginBottom: 12 }}>
            Último peso general: {data?.pesaje?.ultimo_pesaje_fecha
              ? `${data.pesaje.ultimo_peso_kg ?? '—'} kg (${data.pesaje.ultimo_pesaje_fecha})`
              : 'sin registros'}
            {data?.pesaje?.proximo_pesaje_fecha && ` · próximo: ${data.pesaje.proximo_pesaje_fecha}`}
          </div>
          <div style={{ display: 'flex', gap: 8, alignItems: 'flex-end', flexWrap: 'wrap' }}>
            <div>
              <Label>Peso promedio (kg)</Label>
              <input type="number" min="0" step="0.01" value={peso} onChange={(e) => setPeso(e.target.value)} style={{ width: 120, padding: '8px 10px', background: 'var(--bg-tertiary)', border: '1px solid var(--border-mid)', borderRadius: '6px', color: 'var(--text-primary)', fontSize: '13px', fontFamily: 'var(--font-sans)', outline: 'none' }} />
            </div>
            <div>
              <Label>Cabezas pesadas (opc.)</Label>
              <input type="number" min="0" value={pesoCabezas} onChange={(e) => setPesoCabezas(e.target.value)} style={{ width: 120, padding: '8px 10px', background: 'var(--bg-tertiary)', border: '1px solid var(--border-mid)', borderRadius: '6px', color: 'var(--text-primary)', fontSize: '13px', fontFamily: 'var(--font-sans)', outline: 'none' }} />
            </div>
            <div style={{ flex: 1, minWidth: 140 }}>
              <Label>Notas (opc.)</Label>
              <input type="text" value={pesoNotas} onChange={(e) => setPesoNotas(e.target.value)} style={{ width: '100%', padding: '8px 10px', background: 'var(--bg-tertiary)', border: '1px solid var(--border-mid)', borderRadius: '6px', color: 'var(--text-primary)', fontSize: '13px', fontFamily: 'var(--font-sans)', outline: 'none' }} />
            </div>
            <Btn variant="primary" loading={pesoSaving} onClick={guardarPeso}>
              {data?.pesaje_del_dia ? 'Actualizar pesaje' : 'Registrar pesaje'}
            </Btn>
          </div>
          {pesoMsg && <div style={{ marginTop: 8, fontSize: 12, color: 'var(--text-secondary)' }}>{pesoMsg}</div>}
        </div>

        {/* Cuerpo en dos columnas */}
        <div style={{ display: 'flex', gap: '16px', alignItems: 'flex-start', flexWrap: 'wrap' }}>

          {/* ── Columna izquierda: Lo esperado ── */}
          <div style={{ width: '340px', flexShrink: 0, display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <div style={{
              background: 'var(--bg-tertiary)',
              border: '1px solid var(--border-subtle)',
              borderLeft: `3px solid ${accentColor}`,
              borderRadius: '8px',
              padding: '16px 18px',
              display: 'flex', flexDirection: 'column', gap: '16px',
            }}>
              <div style={{ fontSize: '12px', fontWeight: 600, color: accentColor, letterSpacing: '0.04em', textTransform: 'uppercase' }}>
                Lo esperado hoy
              </div>

              {!estandar && (
                <div style={{ fontSize: '13px', color: 'var(--text-tertiary)' }}>Sin estándar disponible para esta especie/fase.</div>
              )}

              {estandar && (
                <>
                  {/* Alimentación */}
                  {estandar.alimentacion?.length > 0 && (
                    <div>
                      <Label>Alimentación estimada</Label>
                      {estandar.alimentacion.map((a, i) => (
                        <div key={i} style={{ marginBottom: '6px', fontSize: '13px', color: 'var(--text-secondary)' }}>
                          <div>{a.descripcion}</div>
                          <div style={{ fontSize: '12px', color: 'var(--text-tertiary)', fontFamily: 'IBM Plex Mono, monospace', marginTop: '2px' }}>
                            {a.cantidad_por_cabeza_kg} kg/cab · {a.frecuencia}
                            {activeLote.cabezasActivas > 0 && (
                              <span style={{ marginLeft: '6px', color: accentColor }}>
                                = {(parseFloat(a.cantidad_por_cabeza_kg) * activeLote.cabezasActivas).toFixed(1)} kg total
                              </span>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Agua */}
                  {estandar.agua && (
                    <div>
                      <Label>Agua</Label>
                      <div style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>
                        {estandar.agua.min}–{estandar.agua.max} L/cab/día
                        {activeLote.cabezasActivas > 0 && (
                          <span style={{ fontSize: '12px', color: 'var(--text-tertiary)', marginLeft: '6px', fontFamily: 'IBM Plex Mono, monospace' }}>
                            = {(estandar.agua.min * activeLote.cabezasActivas).toFixed(0)}–{(estandar.agua.max * activeLote.cabezasActivas).toFixed(0)} L total
                          </span>
                        )}
                      </div>
                    </div>
                  )}

                  {/* ICA */}
                  {estandar.ica_referencia && (
                    <div>
                      <Label>Conversión alimenticia ref.</Label>
                      <div style={{ fontSize: '13px', color: 'var(--text-secondary)', fontFamily: 'IBM Plex Mono, monospace' }}>
                        {estandar.ica_referencia.min}–{estandar.ica_referencia.max} kg alim / kg ganado
                      </div>
                    </div>
                  )}

                  {/* Sanidad */}
                  {estandar.sanitario_hoy?.length > 0 && (
                    <div>
                      <Label>Sanidad del día</Label>
                      {estandar.sanitario_hoy.map((s, i) => (
                        <div key={i} style={{ display: 'flex', gap: '8px', alignItems: 'flex-start', marginBottom: '6px' }}>
                          <Icon name="alertCircle" size={13} style={{ color: 'var(--accent-warning)', flexShrink: 0, marginTop: '2px' }} />
                          <div style={{ fontSize: '12px', color: 'var(--text-secondary)', lineHeight: 1.6 }}>{s.descripcion}</div>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Servicios */}
                  {estandar.servicios_hoy?.length > 0 && (
                    <div>
                      <Label>Servicios programados</Label>
                      {estandar.servicios_hoy.map((s, i) => (
                        <div key={i} style={{ display: 'flex', gap: '8px', alignItems: 'flex-start', marginBottom: '4px' }}>
                          <Icon name="tool" size={12} style={{ color: 'var(--text-tertiary)', flexShrink: 0, marginTop: '2px' }} />
                          <div style={{ fontSize: '12px', color: 'var(--text-secondary)', lineHeight: 1.6 }}>{s.descripcion}</div>
                        </div>
                      ))}
                    </div>
                  )}
                </>
              )}
            </div>
          </div>

          {/* ── Columna derecha: Lo registrado ── */}
          <div style={{ flex: 1, minWidth: '300px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <div style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border-subtle)', borderRadius: '8px', padding: '16px 18px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-tertiary)', letterSpacing: '0.04em', textTransform: 'uppercase' }}>
                Lo registrado
              </div>

              {/* Lista de items */}
              {items.length === 0 && !isConfirmado && (
                <div style={{ fontSize: '13px', color: 'var(--text-tertiary)', fontStyle: 'italic' }}>
                  Sin ítems registrados aún.
                </div>
              )}

              {items.length > 0 && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  {items.map((it, idx) => (
                    <div
                      key={idx}
                      style={{
                        display: 'flex', alignItems: 'center', gap: '10px',
                        padding: '9px 12px',
                        background: 'var(--bg-primary)',
                        border: '1px solid var(--border-subtle)',
                        borderRadius: '6px',
                      }}
                    >
                      {/* Ícono tipo */}
                      <div style={{ color: it.tipo === 'insumo' ? accentColor : 'var(--accent-industrial)', flexShrink: 0 }}>
                        <Icon name={it.tipo === 'insumo' ? 'package' : 'tool'} size={14} />
                      </div>

                      {/* Descripción */}
                      <div style={{ flex: 1, minWidth: 0 }}>
                        {it.tipo === 'insumo' ? (
                          <>
                            <div style={{ fontSize: '13px', color: 'var(--text-primary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                              {it.insumo_nombre}
                            </div>
                            <div style={{ fontSize: '11px', color: 'var(--text-tertiary)', fontFamily: 'IBM Plex Mono, monospace' }}>
                              {fmtQty(it.cantidad)} {it.unidad_simbolo}
                            </div>
                          </>
                        ) : (
                          <>
                            <div style={{ fontSize: '13px', color: 'var(--text-primary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                              {it.servicio_nombre}
                            </div>
                            <div style={{ display: 'flex', gap: '10px', marginTop: '1px' }}>
                              {it.costo_servicio && (
                                <div style={{ fontSize: '11px', color: 'var(--text-tertiary)', fontFamily: 'IBM Plex Mono, monospace' }}>
                                  <MoneyDisplay value={parseFloat(it.costo_servicio)} size="xs" />
                                </div>
                              )}
                              {it.realizado_por && (
                                <div style={{ fontSize: '11px', color: 'var(--text-tertiary)', fontStyle: 'italic' }}>
                                  {it.realizado_por}
                                </div>
                              )}
                            </div>
                          </>
                        )}
                      </div>

                      {/* Costo FIFO (si confirmado) */}
                      {isConfirmado && it.tipo === 'insumo' && it.costo_real != null && (
                        <div style={{ flexShrink: 0 }}>
                          <MoneyDisplay value={it.costo_real} size="sm" color="secondary" />
                        </div>
                      )}

                      {/* Botón eliminar (solo en modo edición) */}
                      {!isConfirmado && (
                        <button
                          onClick={() => removeItem(idx)}
                          style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: 'var(--text-tertiary)', display: 'flex', padding: '2px', flexShrink: 0 }}
                          onMouseEnter={e => e.currentTarget.style.color = 'var(--accent-danger)'}
                          onMouseLeave={e => e.currentTarget.style.color = 'var(--text-tertiary)'}
                          title="Quitar"
                        >
                          <Icon name="x" size={14} />
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              )}

              {/* Formularios inline para agregar (solo en edición) */}
              {!isConfirmado && (
                <>
                  {/* Botones para abrir formulario */}
                  {addMode === 'none' && (
                    <div style={{ display: 'flex', gap: '8px' }}>
                      <button
                        onClick={() => setAddMode('insumo')}
                        style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '7px 12px', background: 'transparent', border: '1px dashed var(--border-mid)', borderRadius: '6px', cursor: 'pointer', fontSize: '12px', color: 'var(--text-secondary)', fontFamily: 'var(--font-sans)' }}
                        onMouseEnter={e => { e.currentTarget.style.borderColor = accentColor; e.currentTarget.style.color = accentColor; }}
                        onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--border-mid)'; e.currentTarget.style.color = 'var(--text-secondary)'; }}
                      >
                        <Icon name="plus" size={13} /> Agregar insumo
                      </button>
                      <button
                        onClick={() => setAddMode('servicio')}
                        style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '7px 12px', background: 'transparent', border: '1px dashed var(--border-mid)', borderRadius: '6px', cursor: 'pointer', fontSize: '12px', color: 'var(--text-secondary)', fontFamily: 'var(--font-sans)' }}
                        onMouseEnter={e => { e.currentTarget.style.borderColor = 'var(--accent-industrial)'; e.currentTarget.style.color = 'var(--accent-industrial)'; }}
                        onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--border-mid)'; e.currentTarget.style.color = 'var(--text-secondary)'; }}
                      >
                        <Icon name="plus" size={13} /> Agregar servicio
                      </button>
                    </div>
                  )}

                  {/* Formulario insumo */}
                  {addMode === 'insumo' && (
                    <div style={{ padding: '14px', background: 'var(--bg-primary)', border: `1px solid ${accentColor}44`, borderRadius: '8px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
                      <div style={{ fontSize: '12px', fontWeight: 500, color: accentColor }}>Agregar insumo</div>

                      <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                        <label style={{ fontSize: '11px', color: 'var(--text-tertiary)', fontWeight: 500, letterSpacing: '0.06em', textTransform: 'uppercase' }}>Insumo</label>
                        <select
                          value={newInsumoId}
                          onChange={e => setNewInsumoId(e.target.value)}
                          style={{ padding: '8px 10px', background: 'var(--bg-secondary)', border: '1px solid var(--border-mid)', borderRadius: '6px', color: 'var(--text-primary)', fontSize: '13px', fontFamily: 'var(--font-sans)', outline: 'none', cursor: 'pointer' }}
                        >
                          <option value="">— Seleccioná un insumo —</option>
                          {insumos.map(i => (
                            <option key={i.id} value={i.id}>{i.nombre}{i.unidad_simbolo ? ` (${i.unidad_simbolo})` : ''}</option>
                          ))}
                        </select>
                        {newInsumoId && (
                          <div style={{ fontSize: '11px', color: 'var(--text-tertiary)', fontFamily: 'IBM Plex Mono, monospace' }}>
                            {loadingStock
                              ? 'Cargando stock…'
                              : stockInfo != null
                                ? `Stock disponible: ${fmtQty(stockInfo.stock_total)} ${stockInfo.insumo?.unidad_simbolo || ''}`
                                : ''}
                          </div>
                        )}
                      </div>

                      <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                        <label style={{ fontSize: '11px', color: 'var(--text-tertiary)', fontWeight: 500, letterSpacing: '0.06em', textTransform: 'uppercase' }}>Cantidad</label>
                        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                          <input
                            type="number"
                            min="0"
                            step="0.01"
                            value={newCantidad}
                            onChange={e => setNewCantidad(e.target.value)}
                            placeholder="0.00"
                            style={{ flex: 1, padding: '8px 10px', background: 'var(--bg-secondary)', border: '1px solid var(--border-mid)', borderRadius: '6px', color: 'var(--text-primary)', fontSize: '13px', fontFamily: 'IBM Plex Mono, monospace', outline: 'none' }}
                          />
                          {newInsumoId && (
                            <span style={{ fontSize: '12px', color: 'var(--text-tertiary)', minWidth: '30px' }}>
                              {insumos.find(i => i.id === newInsumoId)?.unidad_simbolo || ''}
                            </span>
                          )}
                        </div>
                      </div>

                      <div style={{ display: 'flex', gap: '8px' }}>
                        <Btn variant="ghost" onClick={() => { setAddMode('none'); setNewInsumoId(''); setNewCantidad(''); setStockInfo(null); }}>Cancelar</Btn>
                        <Btn variant="primary" onClick={addInsumo} disabled={!newInsumoId || !newCantidad} icon="plus">Agregar</Btn>
                      </div>
                    </div>
                  )}

                  {/* Formulario servicio */}
                  {addMode === 'servicio' && (
                    <div style={{ padding: '14px', background: 'var(--bg-primary)', border: '1px solid var(--accent-industrial)44', borderRadius: '8px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
                      <div style={{ fontSize: '12px', fontWeight: 500, color: 'var(--accent-industrial)' }}>Agregar servicio</div>

                      {/* Selector de catálogo */}
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                        <label style={{ fontSize: '11px', color: 'var(--text-tertiary)', fontWeight: 500, letterSpacing: '0.06em', textTransform: 'uppercase' }}>Servicio</label>
                        <select
                          value={newServId}
                          onChange={e => { setNewServId(e.target.value); setNewServNom(''); }}
                          style={{ padding: '8px 10px', background: 'var(--bg-secondary)', border: '1px solid var(--border-mid)', borderRadius: '6px', color: 'var(--text-primary)', fontSize: '13px', fontFamily: 'var(--font-sans)', outline: 'none', cursor: 'pointer' }}
                        >
                          <option value="">— Seleccioná del catálogo —</option>
                          {catalogo.map(s => (
                            <option key={s.id} value={s.id}>{s.nombre} ({s.unidad})</option>
                          ))}
                          <option value="__otro__">Otro / escribir nombre…</option>
                        </select>
                      </div>

                      {/* Nombre libre si eligió "Otro" */}
                      {newServId === '__otro__' && (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                          <label style={{ fontSize: '11px', color: 'var(--text-tertiary)', fontWeight: 500, letterSpacing: '0.06em', textTransform: 'uppercase' }}>Descripción del servicio</label>
                          <input
                            type="text"
                            value={newServNom}
                            onChange={e => setNewServNom(e.target.value)}
                            placeholder="Ej: Limpieza de bebederos…"
                            style={{ padding: '8px 10px', background: 'var(--bg-secondary)', border: '1px solid var(--border-mid)', borderRadius: '6px', color: 'var(--text-primary)', fontSize: '13px', fontFamily: 'var(--font-sans)', outline: 'none' }}
                          />
                        </div>
                      )}

                      {/* Costo */}
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                        <label style={{ fontSize: '11px', color: 'var(--text-tertiary)', fontWeight: 500, letterSpacing: '0.06em', textTransform: 'uppercase' }}>Costo (Bs, opcional)</label>
                        <input
                          type="number" min="0" step="0.01"
                          value={newServCosto}
                          onChange={e => setNewServCosto(e.target.value)}
                          placeholder="0.00"
                          style={{ padding: '8px 10px', background: 'var(--bg-secondary)', border: '1px solid var(--border-mid)', borderRadius: '6px', color: 'var(--text-primary)', fontSize: '13px', fontFamily: 'IBM Plex Mono, monospace', outline: 'none' }}
                        />
                      </div>

                      {/* Realizado por */}
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                        <label style={{ fontSize: '11px', color: 'var(--text-tertiary)', fontWeight: 500, letterSpacing: '0.06em', textTransform: 'uppercase' }}>Realizado por (opcional)</label>
                        <input
                          type="text"
                          value={newServRealizadoPor}
                          onChange={e => setNewServRealizadoPor(e.target.value)}
                          placeholder="Nombre del técnico o empresa…"
                          style={{ padding: '8px 10px', background: 'var(--bg-secondary)', border: '1px solid var(--border-mid)', borderRadius: '6px', color: 'var(--text-primary)', fontSize: '13px', fontFamily: 'var(--font-sans)', outline: 'none' }}
                        />
                      </div>

                      <div style={{ display: 'flex', gap: '8px' }}>
                        <Btn variant="ghost" onClick={() => { setAddMode('none'); setNewServId(''); setNewServNom(''); setNewServCosto(''); setNewServRealizadoPor(''); }}>Cancelar</Btn>
                        <Btn variant="primary" onClick={addServicio}
                          disabled={!newServId || (newServId === '__otro__' && !newServNom)}
                          icon="plus">Agregar</Btn>
                      </div>
                    </div>
                  )}
                </>
              )}

              {/* Notas */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <label style={{ fontSize: '11px', color: 'var(--text-tertiary)', fontWeight: 500, letterSpacing: '0.07em', textTransform: 'uppercase' }}>Notas del día</label>
                {isConfirmado ? (
                  <div style={{ fontSize: '13px', color: notas ? 'var(--text-secondary)' : 'var(--text-tertiary)', lineHeight: 1.7, fontStyle: notas ? 'normal' : 'italic', padding: '4px 0' }}>
                    {notas || 'Sin notas'}
                  </div>
                ) : (
                  <textarea
                    value={notas}
                    onChange={e => setNotas(e.target.value)}
                    placeholder="Observaciones del día, incidentes, novedades…"
                    rows={3}
                    style={{ padding: '9px 11px', background: 'var(--bg-primary)', border: '1px solid var(--border-mid)', borderRadius: '6px', color: 'var(--text-primary)', fontSize: '13px', fontFamily: 'var(--font-sans)', outline: 'none', resize: 'vertical', lineHeight: 1.7 }}
                    onFocus={e => e.currentTarget.style.borderColor = accentColor}
                    onBlur={e => e.currentTarget.style.borderColor = 'var(--border-mid)'}
                  />
                )}
              </div>

              {/* Info confirmación */}
              {isConfirmado && data?.registro?.confirmado_en && (
                <div style={{ fontSize: '12px', color: 'var(--text-tertiary)', display: 'flex', alignItems: 'center', gap: '5px' }}>
                  <Icon name="checkCircle" size={12} style={{ color: accentColor }} />
                  Confirmado el {new Date(data.registro.confirmado_en).toLocaleDateString('es-BO', { day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                </div>
              )}

              {/* Acciones (solo en edición) */}
              {!isConfirmado && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  {saveErr && (
                    <div style={{ padding: '10px 14px', background: 'var(--accent-warning)18', border: '1px solid var(--accent-warning)44', borderRadius: '6px', fontSize: '12px', color: 'var(--accent-warning)', lineHeight: 1.6 }}>
                      ⚠ {saveErr}
                    </div>
                  )}
                  <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                    <Btn
                      variant="secondary"
                      onClick={handleSave}
                      loading={saving}
                      disabled={saving}
                      icon="save"
                    >
                      Guardar borrador
                    </Btn>
                    <Btn
                      variant="primary"
                      onClick={() => { setSaveErr(null); setShowConfirm(true); }}
                      disabled={saving || items.length === 0}
                      icon="checkCircle"
                    >
                      Confirmar día…
                    </Btn>
                    {saveOk && (
                      <span style={{ fontSize: '12px', color: accentColor, display: 'flex', alignItems: 'center', gap: '4px' }}>
                        <Icon name="check" size={13} /> Guardado
                      </span>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default RegistroDia;
