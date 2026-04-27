import React, { useState } from 'react';
import { Icon } from '../../icons.jsx';
import { LOTES_DATA } from './Lotes.jsx';
import { StatusBadge, RubroBadge, MoneyDisplay, Btn } from '../../components/ui.jsx';

const TIPOS_GASTO = ['Alimentación', 'Sanidad / Medicamento', 'Mano de obra', 'Baja (muerte/pérdida)', 'Otro gasto'];
const ALIMENTOS = ['Balanceado iniciador (40kg)', 'Balanceado crecimiento (40kg)', 'Suplemento mineral (25kg)'];
const PRECIOS_ALIMENTO = { 'Balanceado iniciador (40kg)': 85, 'Balanceado crecimiento (40kg)': 78, 'Suplemento mineral (25kg)': 145 };

const BITACORA_INIT = [
  { id: 'b1', fecha: '28 Abr 2025', tipo: 'Alimentación', detalle: '10 sacos Balanceado crecimiento', monto: 780, baja: false },
  { id: 'b2', fecha: '25 Abr 2025', tipo: 'Sanidad',      detalle: 'Vacuna Newcastle ×50 cabezas',    monto: 240, baja: false },
  { id: 'b3', fecha: '22 Abr 2025', tipo: 'Baja',         detalle: '1 cabeza · Enfermedad respiratoria', monto: null, baja: true },
  { id: 'b4', fecha: '20 Abr 2025', tipo: 'Alimentación', detalle: '12 sacos Balanceado crecimiento', monto: 936, baja: false },
  { id: 'b5', fecha: '15 Abr 2025', tipo: 'Alimentación', detalle: '8 sacos Balanceado iniciador',    monto: 680, baja: false },
  { id: 'b6', fecha: '12 Abr 2025', tipo: 'Baja',         detalle: '1 cabeza · Aplastamiento',        monto: null, baja: true },
  { id: 'b7', fecha: '15 Mar 2025', tipo: 'ENTRADA',      detalle: '50 cabezas · 8.5 kg/cab',         monto: 4800, baja: false },
];

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
  const lote = activeLote || LOTES_DATA?.[0];
  const [registros, setRegistros] = useState(BITACORA_INIT);
  const [tipo, setTipo] = useState('Alimentación');
  const [alimento, setAlimento] = useState(ALIMENTOS[0]);
  const [sacos, setSacos] = useState(10);
  const [costoSaco, setCostoSaco] = useState(85);
  const [bajas, setBajas] = useState(1);
  const [pesoBaja, setPesoBaja] = useState(9.2);
  const [causaBaja, setCausaBaja] = useState('');
  const [monto, setMonto] = useState('');
  const [notas, setNotas] = useState('');
  const [fecha, setFecha] = useState('hoy');

  const totalAlim = sacos * costoSaco;

  const handleAlimentoChange = al => {
    setAlimento(al);
    setCostoSaco(PRECIOS_ALIMENTO[al] || 85);
  };

  const handleRegistrar = () => {
    let detalle = '', montoFinal = null;
    if (tipo === 'Alimentación') { detalle = `${sacos} sacos ${alimento}`; montoFinal = totalAlim; }
    else if (tipo === 'Baja (muerte/pérdida)') { detalle = `${bajas} cabeza${bajas > 1 ? 's' : ''} · ${causaBaja || 'Sin causa'}`; montoFinal = null; }
    else { detalle = notas || tipo; montoFinal = parseFloat(monto) || null; }
    setRegistros(r => [{ id: `b${Date.now()}`, fecha: 'Hoy', tipo: tipo === 'Baja (muerte/pérdida)' ? 'Baja' : tipo, detalle, monto: montoFinal, baja: tipo === 'Baja (muerte/pérdida)' }, ...r]);
    setMonto(''); setNotas(''); setSacos(10); setCausaBaja('');
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

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      <div style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border-subtle)', borderRadius: '8px', padding: '14px 20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '3px' }}>
            <span style={{ fontSize: '15px', fontWeight: 500, color: 'var(--text-primary)' }}>
              Lote #{lote?.id || 'L-2025-003'} · {lote?.tipo || 'Cerdo'}
            </span>
            <StatusBadge label={`${lote?.cabezasActivas || 48} animales activos`} color={accentColor} />
          </div>
          <div style={{ fontSize: '13px', color: 'var(--text-tertiary)' }}>
            {lote?.dias || 45} días en engorde · Costo acumulado: <span style={{ fontFamily: 'IBM Plex Mono, monospace', color: 'var(--text-primary)' }}>
              Bs {Object.values(lote?.costos || { adquisicion: 4800, alimento: 5940, sanidad: 480, moObra: 240 }).reduce((s, v) => s + v, 0).toLocaleString('es-BO')}
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

            <button onClick={handleRegistrar} style={{ marginTop: '4px', padding: '10px', borderRadius: '6px', border: 'none', background: accentColor, color: '#fff', cursor: 'pointer', fontSize: '13px', fontWeight: 500, fontFamily: 'IBM Plex Sans, sans-serif', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}>
              <Icon name="plus" size={14} /> Registrar →
            </button>
          </div>
        </div>

        <div style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border-subtle)', borderRadius: '8px', overflow: 'hidden' }}>
          <div style={{ padding: '14px 16px', borderBottom: '1px solid var(--border-subtle)' }}>
            <span style={{ fontSize: '11px', fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase', color: accentColor }}>Bitácora del lote</span>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '90px 90px 1fr 100px', padding: '8px 16px', borderBottom: '1px solid var(--border-subtle)', gap: '8px' }}>
            {['Fecha', 'Tipo', 'Detalle', 'Monto'].map((h, i) => (
              <div key={i} style={{ fontSize: '11px', color: 'var(--text-tertiary)', fontWeight: 500, textAlign: i === 3 ? 'right' : 'left' }}>{h}</div>
            ))}
          </div>
          {registros.map((r, i) => {
            const cfg = TIPO_ICON[r.tipo] || { icon: 'dollarSign', color: 'var(--text-tertiary)' };
            return (
              <div key={r.id} style={{ display: 'grid', gridTemplateColumns: '90px 90px 1fr 100px', padding: '11px 16px', borderBottom: i < registros.length - 1 ? '1px solid var(--border-subtle)' : 'none', gap: '8px', alignItems: 'center', background: r.tipo === 'ENTRADA' ? accentColor + '08' : 'transparent' }}>
                <span style={{ fontSize: '12px', color: 'var(--text-tertiary)' }}>{r.fecha}</span>
                <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                  <Icon name={cfg.icon} size={12} style={{ color: cfg.color, flexShrink: 0 }} />
                  <span style={{ fontSize: '12px', color: cfg.color, fontWeight: r.tipo === 'ENTRADA' ? 600 : 400 }}>{r.tipo}</span>
                </div>
                <div>
                  <span style={{ fontSize: '13px', color: 'var(--text-primary)' }}>{r.detalle}</span>
                  {r.baja && <span style={{ marginLeft: '8px', fontSize: '11px', color: 'var(--accent-warning)', fontStyle: 'italic' }}>[costo redistribuido]</span>}
                </div>
                <div style={{ textAlign: 'right' }}>
                  {r.monto !== null ? <MoneyDisplay value={r.monto} size="sm" /> : <span style={{ fontSize: '12px', color: 'var(--text-tertiary)' }}>—</span>}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default Bitacora;
