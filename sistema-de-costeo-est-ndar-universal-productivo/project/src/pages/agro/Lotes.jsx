// CosteoUniversal — Lotes activos (Agro-ganadero)
const { useState } = React;

const TIPOS_ANIMAL = ['Cerdo', 'Bovino', 'Ovino', 'Caprino', 'Otro'];

const LOTES_DATA = [
  {
    id: 'L-2025-003', tipo: 'Cerdo', entrada: '15 Mar 2025', dias: 45,
    cabezasInicio: 50, bajas: 2, cabezasActivas: 48,
    pesoInicialProm: 8.5, pesoActualProm: 75,
    costos: { adquisicion: 4800, alimento: 5940, sanidad: 480, moObra: 240 },
    convAliment: 2.8,
  },
  {
    id: 'L-2025-004', tipo: 'Bovino', entrada: '01 Abr 2025', dias: 27,
    cabezasInicio: 12, bajas: 0, cabezasActivas: 12,
    pesoInicialProm: 180, pesoActualProm: 230,
    costos: { adquisicion: 14400, alimento: 8640, sanidad: 960, moObra: 480 },
    convAliment: 6.4,
  },
  {
    id: 'L-2025-005', tipo: 'Cerdo', entrada: '10 Abr 2025', dias: 18,
    cabezasInicio: 30, bajas: 1, cabezasActivas: 29,
    pesoInicialProm: 7.2, pesoActualProm: 28,
    costos: { adquisicion: 2880, alimento: 1620, sanidad: 180, moObra: 120 },
    convAliment: 3.1,
  },
];

const CAT_COLORS_AGRO = {
  adquisicion: 'var(--accent-agro)',
  alimento:    'var(--accent-industrial)',
  sanidad:     'var(--accent-warning)',
  moObra:      'var(--text-tertiary)',
};
const CAT_LABELS = {
  adquisicion: 'Adquisición',
  alimento:    'Alimento',
  sanidad:     'Sanidad',
  moObra:      'Mano de obra',
};

const NuevoLoteModal = ({ onClose, onSave, accentColor }) => {
  const [form, setForm] = useState({ tipo: 'Cerdo', id: `L-2025-00${Date.now() % 10}`, fecha: '', cabezas: 50, pesoPromedio: 8.5, costoCabeza: 96 });
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));
  const totalPeso = form.cabezas * form.pesoPromedio;
  const totalCosto = form.cabezas * form.costoCabeza;

  const iField = (label, key, type = 'text', placeholder = '') => (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
      <label style={{ fontSize: '10px', color: 'var(--text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>{label}</label>
      <input value={form[key]} onChange={e => set(key, type === 'number' ? parseFloat(e.target.value) || 0 : e.target.value)}
        type={type} placeholder={placeholder}
        style={{ background: 'var(--bg-tertiary)', border: '1px solid var(--border-subtle)', borderRadius: '6px', color: 'var(--text-primary)', padding: '8px 11px', fontSize: '14px', outline: 'none', fontFamily: type === 'number' ? 'IBM Plex Mono, monospace' : 'IBM Plex Sans, sans-serif' }}
        onFocus={e => e.target.style.borderColor = accentColor} onBlur={e => e.target.style.borderColor = 'var(--border-subtle)'}
      />
    </div>
  );

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
              <select value={form.tipo} onChange={e => set('tipo', e.target.value)} style={{ height: '38px' }}>
                {TIPOS_ANIMAL.map(t => <option key={t}>{t}</option>)}
              </select>
            </div>
            {iField('Identificador', 'id', 'text', 'L-2025-XXX')}
          </div>
          {iField('Fecha de entrada', 'fecha', 'date')}

          <div style={{ borderTop: '1px solid var(--border-subtle)', paddingTop: '16px' }}>
            <div style={{ fontSize: '11px', fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase', color: accentColor, marginBottom: '12px' }}>Animales de entrada</div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
              {iField('Cantidad (cabezas)', 'cabezas', 'number')}
              {iField('Peso promedio (kg/cab)', 'pesoPromedio', 'number')}
              {iField('Costo adquisición (Bs/cab)', 'costoCabeza', 'number')}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '5px', justifyContent: 'flex-end' }}>
                <div style={{ background: 'var(--bg-tertiary)', borderRadius: '6px', padding: '8px 11px' }}>
                  <div style={{ fontSize: '10px', color: 'var(--text-tertiary)', marginBottom: '3px' }}>Total adquisición</div>
                  <div style={{ fontFamily: 'IBM Plex Mono, monospace', fontSize: '14px', color: accentColor }}>Bs {totalCosto.toLocaleString('es-BO')}</div>
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
          <Btn accentColor={accentColor} icon="plus" onClick={() => { onSave(form); onClose(); }}>Registrar lote →</Btn>
        </div>
      </div>
      <style>{`@keyframes fadeIn { from { opacity:0; transform:translateY(8px); } to { opacity:1; transform:translateY(0); } }`}</style>
    </div>
  );
};

const LoteCard = ({ lote, onBitacora, onLiquidar, accentColor }) => {
  const totalCosto = Object.values(lote.costos).reduce((s, v) => s + v, 0);
  const costoCabeza = totalCosto / lote.cabezasActivas;
  const pesoGanado = lote.pesoActualProm - lote.pesoInicialProm;
  const refConv = lote.tipo === 'Cerdo' ? '2.5–3.0' : '6.0–8.0';
  const convColor = lote.tipo === 'Cerdo'
    ? (lote.convAliment <= 3.0 ? 'var(--accent-success)' : 'var(--accent-warning)')
    : (lote.convAliment <= 8.0 ? 'var(--accent-success)' : 'var(--accent-warning)');

  const CostBar = ({ key_, label, val }) => {
    const pct = (val / totalCosto) * 100;
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px' }}>
          <span style={{ color: 'var(--text-secondary)' }}>{label}</span>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <MoneyDisplay value={val} size="xs" />
            <span style={{ fontFamily: 'IBM Plex Mono, monospace', fontSize: '11px', color: 'var(--text-tertiary)', width: '32px', textAlign: 'right' }}>{pct.toFixed(0)}%</span>
          </div>
        </div>
        <div style={{ height: '4px', background: 'var(--bg-tertiary)', borderRadius: '2px', overflow: 'hidden' }}>
          <div style={{ width: `${pct}%`, height: '100%', background: CAT_COLORS_AGRO[key_], borderRadius: '2px' }} />
        </div>
      </div>
    );
  };

  return (
    <div style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border-subtle)', borderRadius: '10px', padding: '20px', display: 'flex', flexDirection: 'column', gap: '18px' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '4px' }}>
            <span style={{ fontSize: '15px', fontWeight: 500, color: 'var(--text-primary)' }}>Lote #{lote.id}</span>
            <StatusBadge label={lote.tipo} color={accentColor} />
          </div>
          <div style={{ fontSize: '13px', color: 'var(--text-tertiary)' }}>{lote.dias} días en engorde · Entrada: {lote.entrada}</div>
        </div>
        <div style={{ textAlign: 'right' }}>
          <div style={{ fontFamily: 'IBM Plex Mono, monospace', fontSize: '11px', color: 'var(--text-tertiary)', marginBottom: '2px' }}>Conversión alimenticia</div>
          <div style={{ fontFamily: 'IBM Plex Mono, monospace', fontSize: '20px', color: convColor, fontWeight: 500 }}>
            {lote.convAliment} <span style={{ fontSize: '12px', fontWeight: 400 }}>kg/kg</span>
          </div>
          <div style={{ fontSize: '11px', color: 'var(--text-tertiary)' }}>ref. {lote.tipo}: {refConv}</div>
        </div>
      </div>

      {/* Stats row */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '10px' }}>
        {[
          { label: 'Activos',         val: `${lote.cabezasActivas} cabezas` },
          { label: 'Bajas',           val: lote.bajas === 0 ? '— sin bajas' : `${lote.bajas} baja${lote.bajas > 1 ? 's' : ''}`, warn: lote.bajas > 0 },
          { label: 'Peso inicial prom.',val: `${lote.pesoInicialProm} kg/cab` },
          { label: 'Peso actual est.',  val: `${lote.pesoActualProm} kg/cab` },
        ].map((s, i) => (
          <div key={i} style={{ background: 'var(--bg-tertiary)', borderRadius: '6px', padding: '10px 12px' }}>
            <div style={{ fontSize: '10px', color: 'var(--text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '4px' }}>{s.label}</div>
            <div style={{ fontSize: '13px', fontFamily: 'IBM Plex Mono, monospace', color: s.warn ? 'var(--accent-warning)' : 'var(--text-primary)', fontWeight: 500 }}>{s.val}</div>
          </div>
        ))}
      </div>

      {/* Costs */}
      <div>
        <div style={{ fontSize: '11px', fontWeight: 600, letterSpacing: '0.07em', textTransform: 'uppercase', color: 'var(--text-tertiary)', marginBottom: '12px' }}>Costo acumulado al día</div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          {Object.entries(lote.costos).map(([key_, val]) => (
            <CostBar key={key_} key_={key_} label={CAT_LABELS[key_]} val={val} />
          ))}
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '12px', paddingTop: '12px', borderTop: '1px solid var(--border-subtle)' }}>
          <div>
            <div style={{ fontSize: '11px', color: 'var(--text-tertiary)', marginBottom: '2px' }}>Total lote</div>
            <MoneyDisplay value={totalCosto} size="lg" />
          </div>
          <div style={{ textAlign: 'right' }}>
            <div style={{ fontSize: '11px', color: 'var(--text-tertiary)', marginBottom: '2px' }}>Costo / cabeza</div>
            <MoneyDisplay value={costoCabeza} size="md" />
          </div>
        </div>
      </div>

      {/* Actions */}
      <div style={{ display: 'flex', gap: '8px', paddingTop: '4px', borderTop: '1px solid var(--border-subtle)' }}>
        <Btn variant="secondary" size="sm" icon="clipboardList" onClick={() => onBitacora(lote)}>Ver bitácora</Btn>
        <Btn variant="secondary" size="sm" icon="plus" onClick={() => onBitacora(lote)}>Registrar gasto</Btn>
        <Btn size="sm" icon="scale" accentColor={accentColor} onClick={() => onLiquidar(lote)}>Liquidar lote</Btn>
      </div>
    </div>
  );
};

const Lotes = ({ negocioId, onNavigate, setActiveLote }) => {
  const negocio = NEGOCIOS.find(n => n.id === negocioId) || NEGOCIOS[0];
  const accentColor = 'var(--accent-agro)';
  const [lotes, setLotes] = useState(LOTES_DATA);
  const [modal, setModal] = useState(false);

  const totalAnimales = lotes.reduce((s, l) => s + l.cabezasActivas, 0);

  const handleBitacora = lote => { setActiveLote(lote); onNavigate('bitacora'); };
  const handleLiquidar = lote => { setActiveLote(lote); onNavigate('liquidacion'); };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '4px' }}>
            <h1 style={{ fontSize: '22px', fontWeight: 400, color: 'var(--text-primary)', letterSpacing: '-0.02em' }}>Lotes de engorde</h1>
            <span style={{ background: 'var(--accent-agro)1A', color: 'var(--accent-agro)', border: '1px solid var(--accent-agro)33', borderRadius: '5px', padding: '2px 10px', fontSize: '12px', fontFamily: 'IBM Plex Mono, monospace' }}>{lotes.length} activos</span>
          </div>
          <div style={{ fontSize: '13px', color: 'var(--text-tertiary)' }}>{totalAnimales} animales en total · {negocio.nombre}</div>
        </div>
        <Btn icon="plus" accentColor={accentColor} onClick={() => setModal(true)}>Registrar lote</Btn>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
        {lotes.map(l => (
          <LoteCard key={l.id} lote={l} onBitacora={handleBitacora} onLiquidar={handleLiquidar} accentColor={accentColor} />
        ))}
      </div>

      {modal && <NuevoLoteModal onClose={() => setModal(false)} onSave={form => setLotes(p => [...p, { ...form, dias: 0, bajas: 0, cabezasActivas: form.cabezas, pesoInicialProm: form.pesoPromedio, pesoActualProm: form.pesoPromedio, costos: { adquisicion: form.cabezas * form.costoCabeza, alimento: 0, sanidad: 0, moObra: 0 }, convAliment: 0 }])} accentColor={accentColor} />}
    </div>
  );
};

Object.assign(window, { Lotes, LOTES_DATA });
