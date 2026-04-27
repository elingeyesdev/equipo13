import React, { useState, useRef, useEffect } from 'react';
import { Icon } from '../icons.jsx';
import { MOCK_BY_NEGOCIO, Btn, MoneyDisplay } from '../components/ui.jsx';

const FichaReadonlyDrawer = ({ ficha, onClose, accentColor }) => {
  const ref = useRef(null);
  useEffect(() => {
    const h = e => { if (ref.current && !ref.current.contains(e.target)) onClose(); };
    setTimeout(() => document.addEventListener('mousedown', h), 0);
    return () => document.removeEventListener('mousedown', h);
  }, []);

  const Section = ({ label, value, sub, big }) => (
    <div style={{ background: 'var(--bg-tertiary)', borderRadius: '6px', padding: '12px 14px' }}>
      <div style={{ fontSize: '10px', color: 'var(--text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: '6px' }}>{label}</div>
      <MoneyDisplay value={value} size={big ? 'xl' : 'md'} color={big ? 'green' : 'default'} />
      {sub && <div style={{ fontSize: '11px', color: 'var(--text-tertiary)', marginTop: '4px' }}>{sub}</div>}
    </div>
  );

  const WipRow = ({ label, val, pct, color }) => (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', marginBottom: '4px' }}>
        <span style={{ color: 'var(--text-secondary)' }}>{label}</span>
        <MoneyDisplay value={val} size="xs" />
      </div>
      <div style={{ height: '4px', background: 'var(--border-subtle)', borderRadius: '2px', overflow: 'hidden' }}>
        <div style={{ width: `${pct}%`, height: '100%', background: color, borderRadius: '2px' }} />
      </div>
    </div>
  );

  const totalCosto = ficha.costoUnit * ficha.lote;
  const mpd_pct = (ficha.mpd / totalCosto) * 100;
  const mod_pct = (ficha.mod / totalCosto) * 100;
  const cif_pct = (ficha.cif / totalCosto) * 100;

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', zIndex: 300, display: 'flex', justifyContent: 'flex-end' }}>
      <div ref={ref} style={{ width: '480px', background: 'var(--bg-secondary)', borderLeft: '1px solid var(--border-mid)', height: '100%', display: 'flex', flexDirection: 'column', animation: 'slideIn 0.2s ease' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '20px 24px', borderBottom: '1px solid var(--border-subtle)' }}>
          <div>
            <div style={{ fontSize: '15px', fontWeight: 500, color: 'var(--text-primary)', marginBottom: '3px' }}>{ficha.producto}</div>
            <div style={{ fontSize: '12px', color: 'var(--text-tertiary)' }}>{ficha.fecha} · Lote de {ficha.lote} unidades</div>
          </div>
          <button onClick={onClose} style={{ background: 'transparent', border: 'none', color: 'var(--text-tertiary)', cursor: 'pointer' }}><Icon name="x" size={16} /></button>
        </div>
        <div style={{ flex: 1, overflowY: 'auto', padding: '24px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
            <Section label="Costo unitario" value={ficha.costoUnit} sub="MPD + MOD + CIF" />
            <Section label="Precio sugerido" value={ficha.pvp} sub={`con ${ficha.margen}% de margen`} big />
            <Section label="Utilidad / unidad" value={ficha.pvp - ficha.costoUnit} sub="utilidad bruta" />
            <Section label="Utilidad del lote" value={(ficha.pvp - ficha.costoUnit) * ficha.lote} sub={`${ficha.lote} unidades`} />
          </div>
          <div style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border-subtle)', borderRadius: '8px', padding: '16px' }}>
            <div style={{ fontSize: '11px', fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase', color: accentColor, marginBottom: '14px' }}>Distribución del costo</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <WipRow label="Materia Prima Directa (MPD)" val={ficha.mpd} pct={mpd_pct} color={accentColor} />
              <WipRow label="Mano de Obra Directa (MOD)"  val={ficha.mod} pct={mod_pct} color="var(--accent-warning)" />
              <WipRow label="Costos Indirectos (CIF)"     val={ficha.cif} pct={cif_pct} color="var(--text-tertiary)" />
            </div>
          </div>
          <div style={{ background: 'var(--bg-tertiary)', borderRadius: '8px', padding: '14px 16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>Costo total del lote ({ficha.lote} u)</span>
            <MoneyDisplay value={totalCosto} size="lg" />
          </div>
          <div style={{ padding: '12px', background: 'var(--bg-tertiary)', borderRadius: '6px', borderLeft: `2px solid ${accentColor}`, fontSize: '12px', color: 'var(--text-secondary)', lineHeight: 1.6 }}>
            Esta ficha es de solo lectura. Para recalcular, abrí la pantalla de Fichas de costo y creá una nueva versión.
          </div>
        </div>
        <div style={{ padding: '16px 24px', borderTop: '1px solid var(--border-subtle)', display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
          <Btn variant="secondary" onClick={onClose}>Cerrar</Btn>
          <Btn accentColor={accentColor} icon="copy">Recalcular desde esta ficha</Btn>
        </div>
      </div>
      <style>{`@keyframes slideIn { from { transform: translateX(100%); } to { transform: translateX(0); } }`}</style>
    </div>
  );
};

const Historial = ({ negocioId }) => {
  const negocio = { id: negocioId, nombre: 'Mi negocio', rubro: 'industrial' };
  const isAgro = negocio.rubro === 'agro_ganadero';
  const accentColor = isAgro ? 'var(--accent-agro)' : 'var(--accent-industrial)';
  const fichas = MOCK_BY_NEGOCIO[negocioId]?.fichas || [];
  const PRODUCTOS_OPTS = ['Todos', ...new Set(fichas.map(f => f.producto))];
  const [filtroProducto, setFiltroProducto] = useState('Todos');
  const [filtroLote, setFiltroLote] = useState('');
  const [selected, setSelected] = useState(null);

  const filtered = fichas.filter(f => {
    const matchProd = filtroProducto === 'Todos' || f.producto === filtroProducto;
    const matchLote = !filtroLote || f.lote.toString().includes(filtroLote);
    return matchProd && matchLote;
  });

  if (isAgro) return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      <h1 style={{ fontSize: '22px', fontWeight: 400, color: 'var(--text-primary)', letterSpacing: '-0.02em' }}>Historial fichas</h1>
      <div style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border-subtle)', borderRadius: '8px', padding: '40px', textAlign: 'center', color: 'var(--text-tertiary)', fontSize: '14px', lineHeight: 1.8 }}>
        <Icon name="scale" size={32} style={{ color: 'var(--accent-agro)', opacity: 0.5, marginBottom: '12px' }} />
        <div>El historial de liquidaciones se gestiona desde la sección <strong style={{ color: 'var(--text-secondary)' }}>Liquidación</strong>.</div>
      </div>
    </div>
  );

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '4px' }}>
          <h1 style={{ fontSize: '22px', fontWeight: 400, color: 'var(--text-primary)', letterSpacing: '-0.02em' }}>Historial de fichas</h1>
          <span style={{ background: accentColor + '1A', color: accentColor, border: `1px solid ${accentColor}33`, borderRadius: '5px', padding: '2px 10px', fontSize: '12px', fontFamily: 'var(--font-mono)' }}>{fichas.length} fichas</span>
        </div>
      </div>

      <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
          <label style={{ fontSize: '10px', color: 'var(--text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Producto</label>
          <select value={filtroProducto} onChange={e => setFiltroProducto(e.target.value)} style={{ minWidth: '200px' }}>
            {PRODUCTOS_OPTS.map(p => <option key={p}>{p}</option>)}
          </select>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
          <label style={{ fontSize: '10px', color: 'var(--text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Tamaño de lote</label>
          <input value={filtroLote} onChange={e => setFiltroLote(e.target.value)} placeholder="Ej. 100"
            style={{ width: '120px', background: 'var(--bg-secondary)', border: '1px solid var(--border-subtle)', borderRadius: '6px', color: 'var(--text-primary)', padding: '7px 11px', fontSize: '13px', outline: 'none', fontFamily: 'var(--font-mono)' }}
            onFocus={e => e.target.style.borderColor = accentColor} onBlur={e => e.target.style.borderColor = 'var(--border-subtle)'}
          />
        </div>
      </div>

      <div style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border-subtle)', borderRadius: '8px', overflow: 'hidden' }}>
        <div style={{ display: 'grid', gridTemplateColumns: '160px 1fr 70px 120px 120px 80px 80px', padding: '8px 20px', borderBottom: '1px solid var(--border-subtle)', gap: '8px' }}>
          {['Fecha', 'Producto', 'Lote', 'Costo unit.', 'PVP', 'Margen', ''].map((h, i) => (
            <div key={i} style={{ fontSize: '11px', color: 'var(--text-tertiary)', fontWeight: 500, letterSpacing: '0.05em', textAlign: i >= 2 && i <= 5 ? 'right' : 'left' }}>{h}</div>
          ))}
        </div>
        {filtered.map((f, i) => (
          <div key={f.id}
            style={{ display: 'grid', gridTemplateColumns: '160px 1fr 70px 120px 120px 80px 80px', padding: '12px 20px', borderBottom: i < filtered.length - 1 ? '1px solid var(--border-subtle)' : 'none', gap: '8px', alignItems: 'center', cursor: 'pointer', transition: 'background 0.1s' }}
            onMouseEnter={e => e.currentTarget.style.background = 'var(--bg-tertiary)'}
            onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
            onClick={() => setSelected(f)}
          >
            <div style={{ fontSize: '12px', color: 'var(--text-tertiary)', lineHeight: 1.4 }}>{f.fecha}</div>
            <div style={{ fontSize: '13px', color: 'var(--text-primary)', fontWeight: 500 }}>{f.producto}</div>
            <div style={{ textAlign: 'right', fontFamily: 'var(--font-mono)', fontSize: '12px', color: 'var(--text-secondary)' }}>{f.lote} u</div>
            <div style={{ textAlign: 'right' }}><MoneyDisplay value={f.costoUnit} size="sm" /></div>
            <div style={{ textAlign: 'right' }}><MoneyDisplay value={f.pvp} size="sm" color="green" /></div>
            <div style={{ textAlign: 'right', fontFamily: 'var(--font-mono)', fontSize: '12px', color: 'var(--accent-success)' }}>{f.margen}%</div>
            <div style={{ textAlign: 'right' }}><Btn variant="ghost" size="sm" accentColor={accentColor} onClick={e => { e.stopPropagation(); setSelected(f); }}>Ver →</Btn></div>
          </div>
        ))}
        {filtered.length === 0 && (
          <div style={{ padding: '40px', textAlign: 'center', color: 'var(--text-tertiary)', fontSize: '14px' }}>Sin fichas para los filtros seleccionados.</div>
        )}
      </div>

      {selected && <FichaReadonlyDrawer ficha={selected} onClose={() => setSelected(null)} accentColor={accentColor} />}
    </div>
  );
};

export default Historial;
