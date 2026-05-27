import React, { useState, useEffect } from 'react';
import { Icon } from '../../icons.jsx';
import { StatusBadge, RubroBadge, InfoBanner, Btn } from '../../components/ui.jsx';
import { apiFetch } from '../../config/api.js';

const MESES_ES = ['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'];

const DiarioProduccion = ({ negocioId, activeLote, onNavigate, setActiveLote }) => {
  const accentColor = 'var(--accent-agro)';

  const [lotes, setLotes] = useState([]);
  const [selectedLoteId, setSelectedLoteId] = useState(activeLote?._id || activeLote?.id || null);

  const [registros, setRegistros] = useState([]);
  const [consumos, setConsumos] = useState([]);
  const [loadingRegistros, setLoadingRegistros] = useState(false);
  const [errorRegistros, setErrorRegistros] = useState(null);
  const [loteData, setLoteData] = useState(null);

  const loteRealId = selectedLoteId;

  useEffect(() => {
    if (negocioId) {
      apiFetch(`/api/negocios/${negocioId}/lotes`).then(data => {
        setLotes(data);
        if (!selectedLoteId && data.length > 0) {
          setSelectedLoteId(data[0].id);
        }
      }).catch(console.error);
    }
  }, [negocioId]);

  useEffect(() => {
    if (activeLote) {
      setSelectedLoteId(activeLote._id || activeLote.id);
    }
  }, [activeLote]);

  const fetchDiario = React.useCallback(async () => {
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
  }, [negocioId, loteRealId]);

  const fetchConsumos = React.useCallback(async () => {
    if (!negocioId || !loteRealId) return;
    try {
      const data = await apiFetch(`/api/negocios/${negocioId}/lotes/${loteRealId}/consumos`);
      setConsumos(data);
    } catch (e) {
      setErrorRegistros(e?.error || 'Error al cargar los consumos del lote');
    }
  }, [negocioId, loteRealId]);

  const fetchLote = React.useCallback(async () => {
    if (!negocioId || !loteRealId) return;
    try {
      const data = await apiFetch(`/api/negocios/${negocioId}/lotes/${loteRealId}`);
      setLoteData(data);
    } catch (e) {
      setErrorRegistros(e?.error || 'Error al cargar los datos del lote');
    }
  }, [negocioId, loteRealId]);

  useEffect(() => {
    fetchDiario();
    fetchConsumos();
    if (loteRealId) fetchLote();
  }, [negocioId, loteRealId, fetchDiario, fetchConsumos, fetchLote]);

  const costoAcumulado = (parseFloat(loteData?.costo_adquisicion) || 0)
    + registros.filter(r => !r.es_baja && r.monto != null).reduce((s, r) => s + parseFloat(r.monto), 0)
    + consumos.reduce((s, c) => s + parseFloat(c.costo_total || 0), 0);

  const cabezasActivas = loteData?.cabezas_activas ?? '—';

  const historial = [
    ...registros.map(r => ({ ...r, _kind: 'diario', _sortDate: r.fecha || r.created_at })),
    ...consumos.map(c => ({ ...c, _kind: 'consumo', _sortDate: c.fecha_consumo || c.created_at })),
  ].sort((a, b) => {
    const da = new Date(b._sortDate || 0) - new Date(a._sortDate || 0);
    if (da !== 0) return da;
    return new Date(b.created_at || 0) - new Date(a.created_at || 0);
  });

  // Group by "YYYY-MM"
  const porMes = {};
  historial.forEach(item => {
    const key = (item._sortDate || '').substring(0, 7);
    if (!key || key.length < 7) return;
    if (!porMes[key]) porMes[key] = [];
    porMes[key].push(item);
  });
  const mesesOrdenados = Object.keys(porMes).sort((a, b) => b.localeCompare(a));

  const [expandedMeses, setExpandedMeses] = useState(new Set());

  const toggleMes = (key) => {
    setExpandedMeses(prev => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key); else next.add(key);
      return next;
    });
  };

  const handleVerDetalle = () => {
    const loteApi = lotes.find(l => String(l.id) === String(selectedLoteId));
    if (!loteApi || !onNavigate || !setActiveLote) return;
    setActiveLote({
      ...loteApi,
      _id: loteApi.id,
      id: loteApi.identificador || loteApi.id,
      tipo: loteApi.tipo_animal,
    });
    onNavigate('hojavida');
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      <button
        onClick={() => onNavigate?.('lotes')}
        style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: 'var(--text-tertiary)', display: 'flex', alignItems: 'center', gap: '4px', fontSize: '13px', padding: '4px 0', fontFamily: 'var(--font-sans)', alignSelf: 'flex-start' }}
        onMouseEnter={e => e.currentTarget.style.color = 'var(--text-secondary)'}
        onMouseLeave={e => e.currentTarget.style.color = 'var(--text-tertiary)'}
      >
        <Icon name="chevronLeft" size={14} /> Lotes
      </button>

      <InfoBanner
        storageKey="banner_diario_v2"
        title="Diario de producción"
        text="Resumen mensual de todos los gastos y eventos del lote. Hacé clic en 'Ver día a día' para acceder al registro detallado en la Hoja de Vida."
        accentColor="var(--accent-agro)"
      />

      {/* Lote selector + costo acumulado */}
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

      {/* Acción rápida: Nueva Producción */}
      <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
        <Btn
          accentColor="var(--accent-agro)"
          icon="plus"
          onClick={handleVerDetalle}
        >
          Nueva producción
        </Btn>
      </div>

      {/* Historial por mes */}
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
          <div style={{ padding: '32px', textAlign: 'center', color: 'var(--text-tertiary)', fontSize: '13px' }}>Sin registros aún.</div>
        )}

        {mesesOrdenados.map((mesKey, idx) => {
          const items = porMes[mesKey];
          const [anio, mesNum] = mesKey.split('-');
          const mesNombre = MESES_ES[parseInt(mesNum) - 1];
          const expanded = expandedMeses.has(mesKey);

          const totalMes = items.reduce((s, item) => {
            if (item._kind === 'diario') return s + (item.monto != null && !item.es_baja ? parseFloat(item.monto) : 0);
            if (item._kind === 'consumo') return s + parseFloat(item.costo_total || 0);
            return s;
          }, 0);

          // Desglose por categoría: count + total Bs + cantidad
          const desglose = {};
          items.forEach(item => {
            const t = item._kind === 'consumo' ? 'Consumo de insumo' : (item.tipo || 'Otro');
            if (!desglose[t]) desglose[t] = { count: 0, total: 0 };
            desglose[t].count += 1;
            if (item._kind === 'diario') {
              desglose[t].total += (item.monto != null && !item.es_baja ? parseFloat(item.monto) : 0);
            } else {
              desglose[t].total += parseFloat(item.costo_total || 0);
            }
          });

          return (
            <div
              key={mesKey}
              style={{ borderBottom: idx < mesesOrdenados.length - 1 ? '1px solid var(--border-subtle)' : 'none' }}
            >
              {/* Fila principal */}
              <div style={{ padding: '16px 20px', display: 'flex', alignItems: 'center', gap: '16px', flexWrap: 'wrap' }}>

                {/* Toggle chevron */}
                <button
                  onClick={() => toggleMes(mesKey)}
                  style={{ background: 'transparent', border: 'none', cursor: 'pointer', padding: '2px', color: 'var(--text-tertiary)', display: 'flex', alignItems: 'center', flexShrink: 0 }}
                  onMouseEnter={e => e.currentTarget.style.color = accentColor}
                  onMouseLeave={e => e.currentTarget.style.color = 'var(--text-tertiary)'}
                  title={expanded ? 'Ocultar desglose' : 'Ver desglose'}
                >
                  <Icon name={expanded ? 'chevronDown' : 'chevronRight'} size={15} />
                </button>

                {/* Mes + año */}
                <div style={{ minWidth: '100px', cursor: 'pointer' }} onClick={() => toggleMes(mesKey)}>
                  <div style={{ fontSize: '15px', fontWeight: 500, color: 'var(--text-primary)' }}>{mesNombre}</div>
                  <div style={{ fontSize: '12px', color: 'var(--text-tertiary)', fontFamily: 'IBM Plex Mono, monospace' }}>{anio}</div>
                </div>

                {/* Chips de categorías */}
                <div style={{ flex: 1, display: 'flex', gap: '10px', flexWrap: 'wrap', alignItems: 'center' }}>
                  {Object.entries(desglose).map(([tipo, d]) => (
                    <div key={tipo} style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                      <span style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>{tipo}</span>
                      <span style={{ fontSize: '11px', fontFamily: 'IBM Plex Mono, monospace', background: 'var(--bg-tertiary)', border: '1px solid var(--border-subtle)', borderRadius: '4px', padding: '1px 6px', color: 'var(--text-tertiary)' }}>{d.count}</span>
                    </div>
                  ))}
                </div>

                {/* Total del mes */}
                <div style={{ textAlign: 'right', minWidth: '130px' }}>
                  <div style={{ fontSize: '11px', color: 'var(--text-tertiary)', marginBottom: '2px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Total del mes</div>
                  <div style={{ fontFamily: 'IBM Plex Mono, monospace', fontSize: '15px', fontWeight: 500, color: 'var(--text-primary)' }}>
                    Bs {totalMes.toLocaleString('es-BO', { minimumFractionDigits: 2 })}
                  </div>
                </div>

                {/* Ver día a día */}
                <button
                  onClick={handleVerDetalle}
                  style={{ background: 'transparent', border: '1px solid var(--border-subtle)', borderRadius: '6px', padding: '7px 14px', cursor: 'pointer', fontSize: '13px', color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: '5px', whiteSpace: 'nowrap', fontFamily: 'var(--font-sans)', flexShrink: 0 }}
                  onMouseEnter={e => { e.currentTarget.style.background = 'var(--bg-tertiary)'; e.currentTarget.style.borderColor = accentColor; e.currentTarget.style.color = accentColor; }}
                  onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.borderColor = 'var(--border-subtle)'; e.currentTarget.style.color = 'var(--text-secondary)'; }}
                >
                  Ver día a día <Icon name="chevronRight" size={13} />
                </button>
              </div>

              {/* Desglose expandible */}
              {expanded && (
                <div style={{ margin: '0 20px 16px 20px', border: '1px solid var(--border-subtle)', borderRadius: '7px', overflow: 'hidden' }}>
                  {/* Encabezado */}
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 80px 130px', padding: '7px 14px', background: 'var(--bg-tertiary)', borderBottom: '1px solid var(--border-subtle)', gap: '8px' }}>
                    {['Categoría', 'Registros', 'Total Bs'].map((h, i) => (
                      <div key={h} style={{ fontSize: '10px', fontWeight: 600, color: 'var(--text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.07em', textAlign: i > 0 ? 'right' : 'left' }}>{h}</div>
                    ))}
                  </div>
                  {/* Filas */}
                  {Object.entries(desglose).map(([tipo, d], i, arr) => (
                    <div key={tipo} style={{ display: 'grid', gridTemplateColumns: '1fr 80px 130px', padding: '9px 14px', borderBottom: i < arr.length - 1 ? '1px solid var(--border-subtle)' : 'none', gap: '8px', alignItems: 'center' }}>
                      <span style={{ fontSize: '13px', color: 'var(--text-primary)' }}>{tipo}</span>
                      <span style={{ fontSize: '12px', color: 'var(--text-tertiary)', textAlign: 'right', fontFamily: 'IBM Plex Mono, monospace' }}>{d.count}</span>
                      <span style={{ fontSize: '13px', fontFamily: 'IBM Plex Mono, monospace', color: d.total > 0 ? 'var(--text-primary)' : 'var(--text-tertiary)', textAlign: 'right' }}>
                        {d.total > 0 ? `Bs ${d.total.toLocaleString('es-BO', { minimumFractionDigits: 2 })}` : '—'}
                      </span>
                    </div>
                  ))}
                  {/* Total */}
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 80px 130px', padding: '9px 14px', background: 'var(--bg-tertiary)', borderTop: '1px solid var(--border-subtle)', gap: '8px', alignItems: 'center' }}>
                    <span style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-secondary)' }}>Total</span>
                    <span style={{ fontSize: '12px', color: 'var(--text-tertiary)', textAlign: 'right', fontFamily: 'IBM Plex Mono, monospace' }}>{items.length}</span>
                    <span style={{ fontSize: '13px', fontFamily: 'IBM Plex Mono, monospace', fontWeight: 600, color: accentColor, textAlign: 'right' }}>
                      Bs {totalMes.toLocaleString('es-BO', { minimumFractionDigits: 2 })}
                    </span>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default DiarioProduccion;
