import React, { useState, useEffect } from 'react';
import { Icon } from '../../icons.jsx';
import { StatusBadge, RubroBadge, MoneyDisplay, Btn } from '../../components/ui.jsx';
import { apiFetch } from '../../config/api.js';

const TIPOS_GASTO = ['Alimentación', 'Sanidad / Medicamento', 'Mano de obra', 'Baja (muerte/pérdida)', 'Otro gasto'];
const ALIMENTOS = ['Balanceado iniciador (40kg)', 'Balanceado crecimiento (40kg)', 'Suplemento mineral (25kg)'];
const PRECIOS_ALIMENTO = {
  'Balanceado iniciador (40kg)': 85,
  'Balanceado crecimiento (40kg)': 78,
  'Suplemento mineral (25kg)': 145,
};

const TIPO_ICON = {
  'Alimentación': { icon: 'layers',        color: 'var(--accent-agro)' },
  'Sanidad':      { icon: 'alertTriangle',  color: 'var(--accent-industrial)' },
  'Baja':         { icon: 'alertTriangle',  color: 'var(--accent-warning)' },
  'Mano de obra': { icon: 'user',           color: 'var(--text-tertiary)' },
  'ENTRADA':      { icon: 'checkCircle',    color: 'var(--accent-agro)' },
  'Otro gasto':   { icon: 'dollarSign',     color: 'var(--text-tertiary)' },
};

const Bitacora = ({ negocioId, activeLote }) => {
  const accentColor = 'var(--accent-agro)';

  // El lote activo puede venir con _id (UUID real) o id (identificador visible)
  const loteRealId = activeLote?._id || activeLote?.id;

  const [registros, setRegistros] = useState([]);
  const [loadingRegistros, setLoadingRegistros] = useState(false);
  const [errorRegistros, setErrorRegistros] = useState(null);
  const [loteData, setLoteData] = useState(activeLote || null);

  const [tipo, setTipo] = useState('Alimentación');
  const [alimento, setAlimento] = useState(ALIMENTOS[0]);
  const [sacos, setSacos] = useState(10);
  const [costoSaco, setCostoSaco] = useState(85);
  const [bajas, setBajas] = useState(1);
  const [pesoBaja, setPesoBaja] = useState(9.2);
  const [causaBaja, setCausaBaja] = useState('');
  const [monto, setMonto] = useState('');
  const [notas, setNotas] = useState('');
  const [saving, setSaving] = useState(false);

  const totalAlim = sacos * costoSaco;

  // Cargar registros de la bitácora desde el API
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

  // Cargar detalle actualizado del lote (para cabezas_activas post-baja)
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

  const handleAlimentoChange = al => {
    setAlimento(al);
    setCostoSaco(PRECIOS_ALIMENTO[al] || 85);
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

      if (tipo === 'Alimentación') {
        detalle = `${sacos} sacos ${alimento}`;
        montoFinal = totalAlim;
      } else if (tipo === 'Baja (muerte/pérdida)') {
        detalle = `${bajas} cabeza${bajas > 1 ? 's' : ''} · ${causaBaja || 'Sin causa'}`;
        esBaja = true;
        cabezasBaja = bajas;
        pesoBajaVal = pesoBaja;
        causaVal = causaBaja;
        tipoApi = 'Baja';
        montoFinal = null;
      } else {
        detalle = notas || tipo;
        montoFinal = parseFloat(monto) || null;
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
        }),
      });

      setRegistros(prev => [nuevo, ...prev]);
      // Refrescar lote para actualizar cabezas_activas si hubo baja
      if (esBaja) await fetchLote();

      // Limpiar form
      setMonto(''); setNotas(''); setSacos(10); setCausaBaja(''); setBajas(1);
    } catch (e) {
      alert(e?.error || 'Error al registrar');
    } finally {
      setSaving(false);
    }
  };

  const iNum = (label, value, onChange, placeholder = '') => (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
      <label style={{ fontSize: '10px', color: 'var(--text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>{label}</label>
      <input value={value} onChange={e => onChange(parseFloat(e.target.value) || 0)} type="number" placeholder={placeholder}
        style={{ background: 'var(--bg-primary)', border: '1px solid var(--border-subtle)', borderRadius: '6px', color: 'var(--text-primary)', padding: '7px 10px', fontSize: '13px', outline: 'none', fontFamily: 'IBM Plex Mono, monospace' }}
        onFocus={e => e.target.style.borderColor = accentColor} onBlur={e => e.target.style.borderColor = 'var(--border-subtle)'}
      />
    </div>
  );

  // Calcular costo acumulado desde registros reales
  const costoAcumulado = (parseFloat(loteData?.costo_adquisicion) || 0) +
    registros.filter(r => !r.es_baja && r.monto != null).reduce((s, r) => s + parseFloat(r.monto), 0);

  const cabezasActivas = loteData?.cabezas_activas ?? activeLote?.cabezasActivas ?? '—';
  const tipoAnimal     = loteData?.tipo_animal     ?? activeLote?.tipo           ?? '—';
  const identificador  = loteData?.identificador   ?? activeLote?.id             ?? '—';

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      <div style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border-subtle)', borderRadius: '8px', padding: '14px 20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '3px' }}>
            <span style={{ fontSize: '15px', fontWeight: 500, color: 'var(--text-primary)' }}>
              Lote #{identificador} · {tipoAnimal}
            </span>
            <StatusBadge label={`${cabezasActivas} animales activos`} color={accentColor} />
          </div>
          <div style={{ fontSize: '13px', color: 'var(--text-tertiary)' }}>
            Costo acumulado:{' '}
            <span style={{ fontFamily: 'IBM Plex Mono, monospace', color: 'var(--text-primary)' }}>
              Bs {costoAcumulado.toLocaleString('es-BO')}
            </span>
          </div>
        </div>
        <RubroBadge rubro="agro_ganadero" />
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '340px 1fr', gap: '16px', alignItems: 'flex-start' }}>
        {/* Panel de registro */}
        <div style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border-subtle)', borderRadius: '8px', overflow: 'hidden' }}>
          <div style={{ padding: '14px 16px', borderBottom: '1px solid var(--border-subtle)' }}>
            <span style={{ fontSize: '11px', fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase', color: accentColor }}>Registrar gasto / evento</span>
          </div>
          <div style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
              <label style={{ fontSize: '10px', color: 'var(--text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Tipo</label>
              <select value={tipo} onChange={e => setTipo(e.target.value)} style={{ width: '100%' }}>
                {TIPOS_GASTO.map(t => <option key={t}>{t}</option>)}
              </select>
            </div>

            {tipo === 'Alimentación' && (
              <>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                  <label style={{ fontSize: '10px', color: 'var(--text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Alimento</label>
                  <select value={alimento} onChange={e => handleAlimentoChange(e.target.value)} style={{ width: '100%' }}>
                    {ALIMENTOS.map(a => <option key={a}>{a}</option>)}
                  </select>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                  {iNum('Sacos', sacos, setSacos)}
                  {iNum('Costo / saco (Bs)', costoSaco, setCostoSaco)}
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
                  {iNum('Cantidad de bajas', bajas, setBajas)}
                  {iNum('Peso estimado (kg)', pesoBaja, setPesoBaja)}
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                  <label style={{ fontSize: '10px', color: 'var(--text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Causa (opcional)</label>
                  <input value={causaBaja} onChange={e => setCausaBaja(e.target.value)} placeholder="Enfermedad respiratoria…"
                    style={{ background: 'var(--bg-primary)', border: '1px solid var(--border-subtle)', borderRadius: '6px', color: 'var(--text-primary)', padding: '7px 10px', fontSize: '13px', outline: 'none', fontFamily: 'IBM Plex Sans, sans-serif' }}
                    onFocus={e => e.target.style.borderColor = 'var(--accent-warning)'} onBlur={e => e.target.style.borderColor = 'var(--border-subtle)'}
                  />
                </div>
                <div style={{ background: 'var(--accent-warning)18', border: '1px solid var(--accent-warning)33', borderRadius: '6px', padding: '10px 12px', fontSize: '12px', color: 'var(--accent-warning)', lineHeight: 1.5 }}>
                  <Icon name="alertTriangle" size={13} style={{ marginRight: '6px' }} />
                  El costo de esta baja se redistribuirá entre los animales sobrevivientes del lote.
                </div>
              </>
            )}

            {(tipo === 'Sanidad / Medicamento' || tipo === 'Mano de obra' || tipo === 'Otro gasto') && (
              <>
                {iNum('Monto (Bs)', monto, v => setMonto(v))}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                  <label style={{ fontSize: '10px', color: 'var(--text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Descripción</label>
                  <input value={notas} onChange={e => setNotas(e.target.value)} placeholder="Detalle del gasto…"
                    style={{ background: 'var(--bg-primary)', border: '1px solid var(--border-subtle)', borderRadius: '6px', color: 'var(--text-primary)', padding: '7px 10px', fontSize: '13px', outline: 'none', fontFamily: 'IBM Plex Sans, sans-serif' }}
                    onFocus={e => e.target.style.borderColor = accentColor} onBlur={e => e.target.style.borderColor = 'var(--border-subtle)'}
                  />
                </div>
              </>
            )}

            <button onClick={handleRegistrar} disabled={saving}
              style={{ marginTop: '4px', padding: '10px', borderRadius: '6px', border: 'none', background: accentColor, color: '#fff', cursor: saving ? 'not-allowed' : 'pointer', opacity: saving ? 0.7 : 1, fontSize: '13px', fontWeight: 500, fontFamily: 'IBM Plex Sans, sans-serif', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}>
              <Icon name="plus" size={14} /> {saving ? 'Registrando…' : 'Registrar →'}
            </button>
          </div>
        </div>

        {/* Panel de bitácora */}
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
              <div style={{ display: 'grid', gridTemplateColumns: '90px 110px 1fr 100px', padding: '8px 16px', borderBottom: '1px solid var(--border-subtle)', gap: '8px' }}>
                {['Fecha', 'Tipo', 'Detalle', 'Monto'].map((h, i) => (
                  <div key={i} style={{ fontSize: '11px', color: 'var(--text-tertiary)', fontWeight: 500, textAlign: i === 3 ? 'right' : 'left' }}>{h}</div>
                ))}
              </div>
              {registros.map((r, i) => {
                const cfg = TIPO_ICON[r.tipo] || { icon: 'dollarSign', color: 'var(--text-tertiary)' };
                const fechaStr = r.fecha
                  ? new Date(r.fecha).toLocaleDateString('es-BO', { day: '2-digit', month: 'short', year: 'numeric' })
                  : '—';
                return (
                  <div key={r.id} style={{ display: 'grid', gridTemplateColumns: '90px 110px 1fr 100px', padding: '11px 16px', borderBottom: i < registros.length - 1 ? '1px solid var(--border-subtle)' : 'none', gap: '8px', alignItems: 'center', background: r.tipo === 'ENTRADA' ? accentColor + '08' : 'transparent' }}>
                    <span style={{ fontSize: '12px', color: 'var(--text-tertiary)' }}>{fechaStr}</span>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                      <Icon name={cfg.icon} size={12} style={{ color: cfg.color, flexShrink: 0 }} />
                      <span style={{ fontSize: '12px', color: cfg.color, fontWeight: r.tipo === 'ENTRADA' ? 600 : 400 }}>{r.tipo}</span>
                    </div>
                    <div>
                      <span style={{ fontSize: '13px', color: 'var(--text-primary)' }}>{r.detalle}</span>
                      {r.es_baja && <span style={{ marginLeft: '8px', fontSize: '11px', color: 'var(--accent-warning)', fontStyle: 'italic' }}>[costo redistribuido]</span>}
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
