import React, { useState, useEffect } from 'react';
import { Icon } from '../../icons.jsx';
import { MoneyDisplay, StatusBadge, Btn } from '../../components/ui.jsx';
import { apiFetch } from '../../config/api.js';

export const LOTES_DATA = [];
const TIPOS_ANIMAL = ['Cerdo', 'Bovino', 'Ovino', 'Caprino', 'Otro'];

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
  const [form, setForm] = useState({
    tipo: 'Cerdo',
    identificador: '',
    fecha_entrada: '',
    cabezas_inicio: 50,
    peso_inicial_prom: 8.5,
    costo_unitario: '',
  });
  const [saving, setSaving] = useState(false);
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));
  
  const cabezas = parseFloat(form.cabezas_inicio) || 0;
  const pesoUnit = parseFloat(form.peso_inicial_prom) || 0;
  const costoUnit = parseFloat(form.costo_unitario) || 0;
  
  const totalPeso = cabezas * pesoUnit;
  const costoTotal = cabezas * costoUnit;

  const iField = (label, key, type = 'text', placeholder = '') => (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
      <label style={{ fontSize: '10px', color: 'var(--text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>{label}</label>
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
              <select value={form.tipo} onChange={e => set('tipo', e.target.value)} style={{ height: '38px' }}>
                {TIPOS_ANIMAL.map(t => <option key={t}>{t}</option>)}
              </select>
            </div>
            {iField('Identificador', 'identificador', 'text', 'L-2025-XXX')}
          </div>
          {iField('Fecha de entrada', 'fecha_entrada', 'date')}

          <div style={{ borderTop: '1px solid var(--border-subtle)', paddingTop: '16px' }}>
            <div style={{ fontSize: '11px', fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase', color: accentColor, marginBottom: '12px' }}>Animales de entrada</div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
              {iField('Cantidad (cabezas)', 'cabezas_inicio', 'number')}
              {iField('Peso promedio (kg/cab)', 'peso_inicial_prom', 'number')}
              {iField('Costo unitario (Bs/cab)', 'costo_unitario', 'number')}
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
const mapLoteFromApi = (l) => ({
  ...l,
  // compatibilidad con campos esperados por la card
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
    adquisicion: parseFloat(l.costo_adquisicion) || 0,
    alimento:    parseFloat(l.costo_total || 0) - parseFloat(l.costo_adquisicion || 0),
    sanidad: 0,
    moObra: 0,
  },
  convAliment: 0,
});

const LoteCard = ({ lote, onBitacora, onLiquidar, accentColor }) => {
  const totalCosto = Object.values(lote.costos).reduce((s, v) => s + v, 0);
  const costoCabeza = lote.cabezasActivas > 0 ? totalCosto / lote.cabezasActivas : 0;
  const pesoGanado = lote.pesoActualProm - lote.pesoInicialProm;
  const refConv = lote.tipo === 'Cerdo' ? '2.5–3.0' : '6.0–8.0';
  const convColor = lote.tipo === 'Cerdo'
    ? (lote.convAliment <= 3.0 ? 'var(--accent-success)' : 'var(--accent-warning)')
    : (lote.convAliment <= 8.0 ? 'var(--accent-success)' : 'var(--accent-warning)');

  const CostBar = ({ key_, label, val }) => {
    const pct = totalCosto > 0 ? (val / totalCosto) * 100 : 0;
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
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '4px' }}>
            <span style={{ fontSize: '15px', fontWeight: 500, color: 'var(--text-primary)' }}>Lote #{lote.id}</span>
            <StatusBadge label={lote.tipo} color={accentColor} />
          </div>
          <div style={{ fontSize: '13px', color: 'var(--text-tertiary)' }}>{lote.dias} días en engorde · Entrada: {lote.entrada}</div>
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
          { label: 'Activos',           val: `${lote.cabezasActivas} cabezas` },
          { label: 'Bajas',             val: lote.bajas === 0 ? '— sin bajas' : `${lote.bajas} baja${lote.bajas > 1 ? 's' : ''}`, warn: lote.bajas > 0 },
          { label: 'Peso inicial prom.', val: `${lote.pesoInicialProm} kg/cab` },
          { label: 'Peso actual est.',   val: `${lote.pesoActualProm} kg/cab` },
        ].map((s, i) => (
          <div key={i} style={{ background: 'var(--bg-tertiary)', borderRadius: '6px', padding: '10px 12px' }}>
            <div style={{ fontSize: '10px', color: 'var(--text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '4px' }}>{s.label}</div>
            <div style={{ fontSize: '13px', fontFamily: 'IBM Plex Mono, monospace', color: s.warn ? 'var(--accent-warning)' : 'var(--text-primary)', fontWeight: 500 }}>{s.val}</div>
          </div>
        ))}
      </div>

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

      <div style={{ display: 'flex', gap: '8px', paddingTop: '4px', borderTop: '1px solid var(--border-subtle)' }}>
        <Btn variant="secondary" size="sm" icon="clipboardList" onClick={() => onBitacora(lote)}>Ver bitácora</Btn>
        <Btn variant="secondary" size="sm" icon="plus" onClick={() => onBitacora(lote)}>Registrar gasto</Btn>
        <Btn size="sm" icon="scale" accentColor={accentColor} onClick={() => onLiquidar(lote)}>Liquidar lote</Btn>
      </div>
    </div>
  );
};

const Lotes = ({ negocioId, onNavigate, setActiveLote }) => {
  const accentColor = 'var(--accent-agro)';
  const [lotes, setLotes] = useState([]);
  const [modal, setModal] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchLotes = async () => {
    if (!negocioId) return;
    setLoading(true);
    setError(null);
    try {
      const data = await apiFetch(`/api/negocios/${negocioId}/lotes`);
      setLotes(data.map(mapLoteFromApi));
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
        identificador:    form.identificador,
        tipo_animal:      form.tipo,
        fecha_entrada:    form.fecha_entrada || null,
        cabezas_inicio:   form.cabezas_inicio,
        peso_inicial_prom: form.peso_inicial_prom,
        costo_adquisicion: form.costo_adquisicion,
      }),
    });
    setLotes(prev => [mapLoteFromApi(nuevo), ...prev]);
  };

  const totalAnimales = lotes.reduce((s, l) => s + l.cabezasActivas, 0);

  const handleBitacora = lote => {
    // Pasamos el lote con su _id real de la DB para que Bitácora pueda hacer fetch
    setActiveLote(lote);
    onNavigate('bitacora');
  };
  const handleLiquidar = lote => { setActiveLote(lote); onNavigate('liquidacion'); };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '4px' }}>
            <h1 style={{ fontSize: '22px', fontWeight: 400, color: 'var(--text-primary)', letterSpacing: '-0.02em' }}>Lotes de engorde</h1>
            <span style={{ background: 'var(--accent-agro)1A', color: 'var(--accent-agro)', border: '1px solid var(--accent-agro)33', borderRadius: '5px', padding: '2px 10px', fontSize: '12px', fontFamily: 'IBM Plex Mono, monospace' }}>{lotes.length} activos</span>
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
      {!loading && !error && lotes.length === 0 && (
        <div style={{ textAlign: 'center', padding: '48px', color: 'var(--text-tertiary)', fontSize: '14px', background: 'var(--bg-secondary)', borderRadius: '10px', border: '1px solid var(--border-subtle)' }}>
          No hay lotes registrados. ¡Registrá el primero!
        </div>
      )}

      <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
        {lotes.map(l => (
          <LoteCard key={l._id} lote={l} onBitacora={handleBitacora} onLiquidar={handleLiquidar} accentColor={accentColor} />
        ))}
      </div>

      {modal && <NuevoLoteModal onClose={() => setModal(false)} onSave={handleSaveLote} accentColor={accentColor} />}
    </div>
  );
};

export default Lotes;
