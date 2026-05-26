import React, { useState, useEffect, useCallback } from 'react';
import { Icon } from '../../icons.jsx';
import { Btn, StatusBadge } from '../../components/ui.jsx';
import { apiFetch } from '../../config/api.js';

const AC = 'var(--accent-agro)';

// ─── Colores por nodo ────────────────────────────────────────
const NODO_CONFIG = {
  AYUNO: { label: 'Ayuno', color: '#F59E0B', desc: 'Merma por ayuno previo al sacrificio' },
  FRIO: { label: 'Frío', color: '#60A5FA', desc: 'Merma en cámara frigorífica' },
  DESPOSTE: { label: 'Desposte', color: '#A78BFA', desc: 'Merma durante el desposte de la canal' },
  HORNO: { label: 'Horno', color: '#F97316', desc: 'Merma en proceso de cocción / horno' },
};

const TIPOS = Object.keys(NODO_CONFIG);

const fmtDate = d =>
  d ? new Date(d + 'T00:00:00').toLocaleDateString('es-BO', { day: '2-digit', month: 'short', year: 'numeric' }) : '—';

const fmtNum = (n, dec = 2) =>
  n !== undefined && n !== null ? parseFloat(n).toFixed(dec) : '0.' + '0'.repeat(dec);

const Label = ({ children }) => (
  <div style={{ fontSize: '10px', color: 'var(--text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 4 }}>
    {children}
  </div>
);

// ─────────────────────────────────────────────────────────────
// BADGE NODO
// ─────────────────────────────────────────────────────────────
const NodoBadge = ({ tipo }) => {
  const cfg = NODO_CONFIG[tipo] || {};
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: 4,
      background: cfg.color + '22', border: `1px solid ${cfg.color}55`,
      color: cfg.color, borderRadius: 20, padding: '2px 10px', fontSize: 11, fontWeight: 600,
    }}>
      {cfg.label || tipo}
    </span>
  );
};

// ─────────────────────────────────────────────────────────────
// MODAL: REGISTRAR PESAJE
// Mobile-first: formulario compacto y táctil
// ─────────────────────────────────────────────────────────────
const PesajeModal = ({ negocioId, loteId, onClose, onSaved }) => {
  const [form, setForm] = useState({
    tipo: 'AYUNO',
    peso_inicial: '',
    peso_final: '',
    fecha: new Date().toISOString().split('T')[0],
    operario: '',
    notas: '',
  });
  const [lotes, setLotes] = useState([]);
  const [selectedLoteId, setSelectedLoteId] = useState(loteId || '');
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState('');

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  useEffect(() => {
    if (!loteId) {
      apiFetch(`/api/negocios/${negocioId}/lotes`)
        .then(data => setLotes(data.filter(l => l.activo)))
        .catch(() => { });
    }
  }, [negocioId, loteId]);

  // Cálculo en tiempo real
  const pi = parseFloat(form.peso_inicial) || 0;
  const pf = parseFloat(form.peso_final) || 0;
  const kgMerma = pi > 0 ? Math.max(0, pi - pf) : 0;
  const pctMerma = pi > 0 ? ((kgMerma / pi) * 100) : 0;
  const nodoColor = NODO_CONFIG[form.tipo]?.color || AC;

  const save = async () => {
    setErr('');
    const lId = loteId || selectedLoteId;
    if (!lId) return setErr('Selecciona un lote');
    if (!form.tipo) return setErr('Selecciona el nodo de merma');
    if (!form.peso_inicial || pi <= 0) return setErr('Peso inicial debe ser mayor a 0');
    if (form.peso_final === '' || pf < 0) return setErr('Peso final requerido (puede ser 0)');
    if (pf > pi) return setErr('Peso final no puede ser mayor al peso inicial');

    setSaving(true);
    try {
      const data = await apiFetch(`/api/negocios/${negocioId}/lotes/${lId}/mermas`, {
        method: 'POST',
        body: JSON.stringify({ ...form, peso_inicial: pi, peso_final: pf }),
      });
      onSaved(data);
      onClose();
    } catch (e) {
      setErr(e?.error || 'Error al guardar el registro');
    } finally {
      setSaving(false);
    }
  };

  const overlay = { position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.65)', zIndex: 300, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '12px' };
  const box = { width: '100%', maxWidth: 460, background: 'var(--bg-secondary)', border: '1px solid var(--border-mid)', borderRadius: 14, overflow: 'hidden' };

  const inputStyle = {
    width: '100%', background: 'var(--bg-tertiary)', border: '1px solid var(--border-subtle)',
    borderRadius: 8, color: 'var(--text-primary)', padding: '10px 12px', fontSize: 15,
    outline: 'none', boxSizing: 'border-box',
  };

  return (
    <div style={overlay} onClick={e => { if (e.target === e.currentTarget) onClose(); }}>
      <div style={box}>
        {/* Header con color del nodo */}
        <div style={{ padding: '14px 20px', borderBottom: '1px solid var(--border-subtle)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: nodoColor + '15' }}>
          <div>
            <div style={{ fontSize: 13, fontWeight: 600, color: nodoColor }}>Registrar Pesaje</div>
            <div style={{ fontSize: 11, color: 'var(--text-tertiary)', marginTop: 2 }}>
              {NODO_CONFIG[form.tipo]?.desc || ''}
            </div>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: 'var(--text-tertiary)', cursor: 'pointer', padding: 4 }}>
            <Icon name="x" size={18} />
          </button>
        </div>

        <div style={{ padding: '16px 20px', display: 'flex', flexDirection: 'column', gap: 14 }}>
          {/* Selector de nodo */}
          <div>
            <Label>Nodo de Merma</Label>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 8 }}>
              {TIPOS.map(t => {
                const cfg = NODO_CONFIG[t];
                const active = form.tipo === t;
                return (
                  <button
                    key={t}
                    onClick={() => set('tipo', t)}
                    style={{
                      padding: '10px 8px', borderRadius: 8, border: `1.5px solid ${active ? cfg.color : 'var(--border-subtle)'}`,
                      background: active ? cfg.color + '20' : 'var(--bg-tertiary)',
                      color: active ? cfg.color : 'var(--text-secondary)',
                      cursor: 'pointer', fontWeight: active ? 600 : 400, fontSize: 13,
                      transition: 'all 0.15s', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4,
                    }}
                  >
                    <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 4 }}>
                      {cfg.label}
                    </div>
                  </button>);
              })}
            </div>
          </div>

          {/* Lote (si no viene fijo) */}
          {!loteId && (
            <div>
              <Label>Lote</Label>
              <select
                value={selectedLoteId}
                onChange={e => setSelectedLoteId(e.target.value)}
                style={{ ...inputStyle }}
              >
                <option value="">— Seleccionar Lote —</option>
                {lotes.map(l => (
                  <option key={l.id} value={l.id}>{l.identificador} ({l.tipo_animal})</option>
                ))}
              </select>
            </div>
          )}

          {/* Pesajes — grande y táctil */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div>
              <Label>Peso Inicial (kg)</Label>
              <input
                type="number"
                inputMode="decimal"
                step="0.01"
                value={form.peso_inicial}
                onChange={e => set('peso_inicial', e.target.value)}
                placeholder="0.00"
                style={{ ...inputStyle, fontSize: 18, fontFamily: 'IBM Plex Mono, monospace', fontWeight: 600 }}
              />
            </div>
            <div>
              <Label>Peso Final (kg)</Label>
              <input
                type="number"
                inputMode="decimal"
                step="0.01"
                value={form.peso_final}
                onChange={e => set('peso_final', e.target.value)}
                placeholder="0.00"
                style={{ ...inputStyle, fontSize: 18, fontFamily: 'IBM Plex Mono, monospace', fontWeight: 600 }}
              />
            </div>
          </div>

          {/* Preview automático */}
          {pi > 0 && form.peso_final !== '' && (
            <div style={{ background: nodoColor + '15', border: `1px solid ${nodoColor}44`, borderRadius: 10, padding: '10px 14px', display: 'flex', justifyContent: 'space-between' }}>
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontSize: 10, color: 'var(--text-tertiary)', textTransform: 'uppercase', marginBottom: 2 }}>Merma kg</div>
                <div style={{ fontSize: 20, fontWeight: 700, color: nodoColor, fontFamily: 'IBM Plex Mono, monospace' }}>{fmtNum(kgMerma)}</div>
              </div>
              <div style={{ width: 1, background: 'var(--border-subtle)' }} />
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontSize: 10, color: 'var(--text-tertiary)', textTransform: 'uppercase', marginBottom: 2 }}>% Merma</div>
                <div style={{ fontSize: 20, fontWeight: 700, color: pctMerma > 5 ? 'var(--accent-error)' : nodoColor, fontFamily: 'IBM Plex Mono, monospace' }}>
                  {fmtNum(pctMerma)}%
                </div>
              </div>
            </div>
          )}

          {/* Fecha y operario */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div>
              <Label>Fecha</Label>
              <input type="date" value={form.fecha} onChange={e => set('fecha', e.target.value)} style={{ ...inputStyle }} />
            </div>
            <div>
              <Label>Operario (opcional)</Label>
              <input type="text" value={form.operario} onChange={e => set('operario', e.target.value)} placeholder="Nombre" style={{ ...inputStyle }} />
            </div>
          </div>

          {/* Notas */}
          <div>
            <Label>Notas (opcional)</Label>
            <textarea
              value={form.notas}
              onChange={e => set('notas', e.target.value)}
              rows={2}
              placeholder="Observaciones..."
              style={{ ...inputStyle, resize: 'none' }}
            />
          </div>

          {err && (
            <div style={{ background: 'var(--accent-error)15', border: '1px solid var(--accent-error)44', borderRadius: 8, padding: '8px 12px', fontSize: 12, color: 'var(--accent-error)' }}>
              {err}
            </div>
          )}
        </div>

        <div style={{ padding: '12px 20px', borderTop: '1px solid var(--border-subtle)', display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
          <Btn variant="secondary" onClick={onClose}>Cancelar</Btn>
          <Btn accentColor={nodoColor} onClick={save} disabled={saving}>
            {saving ? 'Registrando…' : 'Registrar Pesaje'}
          </Btn>
        </div>
      </div>
    </div>
  );
};

// ─────────────────────────────────────────────────────────────
// TARJETA DE NODO (resumen por tipo)
// ─────────────────────────────────────────────────────────────
const NodoCard = ({ tipo, data, onClick }) => {
  const cfg = NODO_CONFIG[tipo];
  const pct = parseFloat(data?.promedio_porcentaje_merma || 0);
  const hasData = data && parseInt(data.registros || 0) > 0;

  return (
    <div
      onClick={onClick}
      style={{
        background: 'var(--bg-secondary)', border: `1px solid ${hasData ? cfg.color + '44' : 'var(--border-subtle)'}`,
        borderRadius: 12, padding: '16px 18px', cursor: 'pointer',
        transition: 'transform 0.15s, box-shadow 0.15s',
        position: 'relative', overflow: 'hidden',
      }}
      onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = `0 6px 20px ${cfg.color}22`; }}
      onMouseLeave={e => { e.currentTarget.style.transform = 'none'; e.currentTarget.style.boxShadow = 'none'; }}
    >
      {/* Accent bar */}
      <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 3, background: hasData ? cfg.color : 'var(--border-subtle)', borderRadius: '12px 12px 0 0' }} />

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginTop: 4 }}>
        <div>
          <div style={{ fontSize: 16, fontWeight: 600, color: 'var(--text-primary)' }}>{cfg.label}</div>
          <div style={{ fontSize: 11, color: 'var(--text-tertiary)', marginTop: 2 }}>{cfg.desc}</div>
        </div>

        {hasData && (
          <div style={{ textAlign: 'right' }}>
            <div style={{ fontSize: 24, fontWeight: 700, color: pct > 5 ? 'var(--accent-error)' : cfg.color, fontFamily: 'IBM Plex Mono, monospace' }}>
              {fmtNum(pct)}%
            </div>
            <div style={{ fontSize: 11, color: 'var(--text-tertiary)' }}>prom. merma</div>
          </div>
        )}
      </div>

      {hasData && (
        <div style={{ marginTop: 12, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, borderTop: '1px solid var(--border-subtle)', paddingTop: 10 }}>
          <div>
            <div style={{ fontSize: 10, color: 'var(--text-tertiary)', marginBottom: 2 }}>REGISTROS</div>
            <div style={{ fontSize: 15, fontWeight: 600, color: 'var(--text-primary)', fontFamily: 'IBM Plex Mono, monospace' }}>{data.registros}</div>
          </div>
          <div>
            <div style={{ fontSize: 10, color: 'var(--text-tertiary)', marginBottom: 2 }}>KG MERMA TOTAL</div>
            <div style={{ fontSize: 15, fontWeight: 600, color: cfg.color, fontFamily: 'IBM Plex Mono, monospace' }}>{fmtNum(data.total_kg_merma)}</div>
          </div>
        </div>
      )}

      {!hasData && (
        <div style={{ marginTop: 12, fontSize: 12, color: 'var(--text-tertiary)', fontStyle: 'italic' }}>Sin registros aún</div>
      )}
    </div>
  );
};

// ─────────────────────────────────────────────────────────────
// MAIN PAGE: MERMAS
// ─────────────────────────────────────────────────────────────
const Mermas = ({ negocioId, activeLote }) => {
  const [lotes, setLotes] = useState([]);
  const [selectedLoteId, setSelectedLoteId] = useState(activeLote?.id || '');
  const [resumen, setResumen] = useState(null);
  const [registros, setRegistros] = useState([]);
  const [filtroTipo, setFiltroTipo] = useState('');
  const [loading, setLoading] = useState(false);
  const [modal, setModal] = useState(false);
  const [view, setView] = useState('dashboard'); // 'dashboard' | 'lista'

  // Cargar lotes
  useEffect(() => {
    if (!negocioId) return;
    apiFetch(`/api/negocios/${negocioId}/lotes`)
      .then(data => {
        const activos = data.filter(l => l.activo);
        setLotes(activos);
        if (!selectedLoteId && activos.length > 0) setSelectedLoteId(activos[0].id);
      })
      .catch(() => { });
  }, [negocioId]);

  // Cargar resumen y registros al cambiar lote
  const fetchData = useCallback(async () => {
    if (!negocioId || !selectedLoteId) return;
    setLoading(true);
    try {
      const [res, regs] = await Promise.all([
        apiFetch(`/api/negocios/${negocioId}/lotes/${selectedLoteId}/mermas/resumen`),
        apiFetch(`/api/negocios/${negocioId}/lotes/${selectedLoteId}/mermas`),
      ]);
      setResumen(res);
      setRegistros(regs);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, [negocioId, selectedLoteId]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const onPesajeGuardado = () => fetchData();

  // Filtrar registros por tipo
  const registrosFiltrados = filtroTipo
    ? registros.filter(r => r.tipo === filtroTipo)
    : registros;

  // Map de resumen por tipo para acceso rápido
  const resumenPorTipo = {};
  if (resumen?.por_nodo) {
    resumen.por_nodo.forEach(n => { resumenPorTipo[n.tipo] = n; });
  }

  const loteActual = lotes.find(l => l.id === selectedLoteId);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>

      {/* ── Header ── */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12 }}>
        <div>
          <h1 style={{ fontSize: 20, fontWeight: 600, color: 'var(--text-primary)', marginBottom: 2 }}>
            Control de Mermas
          </h1>
          <p style={{ fontSize: 12, color: 'var(--text-tertiary)' }}>
            Registro y análisis de pérdidas en los 4 nodos productivos
          </p>
        </div>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
          <select
            value={selectedLoteId}
            onChange={e => setSelectedLoteId(e.target.value)}
            style={{ height: 36, background: 'var(--bg-secondary)', border: '1px solid var(--border-subtle)', borderRadius: 8, color: 'var(--text-primary)', padding: '0 10px', fontSize: 13, outline: 'none', cursor: 'pointer' }}
          >
            {lotes.length === 0 && <option value="">— Sin lotes —</option>}
            {lotes.map(l => <option key={l.id} value={l.id}>{l.identificador} ({l.tipo_animal})</option>)}
          </select>
          <Btn accentColor={AC} icon="plus" onClick={() => setModal(true)}>
            Registrar Pesaje
          </Btn>
        </div>
      </div>

      {/* ── Tabs ── */}
      <div style={{ display: 'flex', gap: 4, borderBottom: '1px solid var(--border-subtle)', paddingBottom: 0 }}>
        {[{ id: 'dashboard', label: 'Resumen' }, { id: 'lista', label: 'Registros' }].map(t => (
          <button
            key={t.id}
            onClick={() => setView(t.id)}
            style={{
              padding: '8px 16px', border: 'none', background: 'none', cursor: 'pointer',
              fontSize: 13, fontWeight: view === t.id ? 600 : 400,
              color: view === t.id ? AC : 'var(--text-secondary)',
              borderBottom: `2px solid ${view === t.id ? AC : 'transparent'}`,
              transition: 'all 0.15s', fontFamily: 'var(--font-sans)', display: 'flex', alignItems: 'center', gap: '6px'
            }}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* ── Loading ── */}
      {loading && (
        <div style={{ textAlign: 'center', padding: 48, color: 'var(--text-tertiary)', fontSize: 13 }}>
          Cargando datos de mermas…
        </div>
      )}

      {/* ── Sin lote ── */}
      {!loading && !selectedLoteId && (
        <div style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border-subtle)', borderRadius: 12, padding: 32, textAlign: 'center', color: 'var(--text-tertiary)' }}>
          Selecciona un lote para ver los datos de mermas
        </div>
      )}

      {/* ═══════════════════════════════════════════════════
          VISTA: DASHBOARD (resumen por nodo)
          ═══════════════════════════════════════════════════ */}
      {!loading && selectedLoteId && view === 'dashboard' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>

          {/* Tarjeta global */}
          {resumen && (
            <div style={{
              background: 'linear-gradient(135deg, var(--bg-secondary) 0%, var(--bg-tertiary) 100%)',
              border: '1px solid var(--border-mid)', borderRadius: 14, padding: '20px 24px',
              display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 16,
            }}>
              <div>
                <div style={{ fontSize: 11, color: 'var(--text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 6 }}>
                  Lote · {loteActual?.identificador || ''}
                </div>
                <div style={{ fontSize: 22, fontWeight: 700, color: 'var(--text-primary)' }}>
                  {fmtNum(resumen.totales?.total_kg_merma)} kg totales de merma
                </div>
                <div style={{ fontSize: 12, color: 'var(--text-tertiary)', marginTop: 4 }}>
                  sobre {fmtNum(resumen.totales?.total_peso_inicial)} kg de peso inicial registrado
                </div>
              </div>
              <div style={{
                background: 'var(--bg-primary)', borderRadius: 10, padding: '14px 24px', textAlign: 'center',
                border: `1px solid ${parseFloat(resumen.totales?.porcentaje_merma_global || 0) > 5 ? 'var(--accent-error)44' : 'var(--border-subtle)'}`,
              }}>
                <div style={{ fontSize: 36, fontWeight: 800, color: parseFloat(resumen.totales?.porcentaje_merma_global || 0) > 5 ? 'var(--accent-error)' : AC, fontFamily: 'IBM Plex Mono, monospace', lineHeight: 1 }}>
                  {fmtNum(resumen.totales?.porcentaje_merma_global)}%
                </div>
                <div style={{ fontSize: 11, color: 'var(--text-tertiary)', marginTop: 4 }}>merma global</div>
              </div>
            </div>
          )}

          {/* Grid de nodos */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: 14 }}>
            {TIPOS.map(tipo => (
              <NodoCard
                key={tipo}
                tipo={tipo}
                data={resumenPorTipo[tipo]}
                onClick={() => { setFiltroTipo(tipo); setView('lista'); }}
              />
            ))}
          </div>

          {/* Tabla de desglose */}
          {resumen?.por_nodo?.length > 0 && (
            <div style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border-subtle)', borderRadius: 12, overflow: 'hidden' }}>
              <div style={{ padding: '14px 20px', borderBottom: '1px solid var(--border-subtle)', fontSize: 12, fontWeight: 600, color: 'var(--text-primary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                Desglose por Nodo
              </div>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ background: 'var(--bg-tertiary)' }}>
                    {['Nodo', 'Registros', 'Peso Inicial', 'Peso Final', 'Kg Merma', '% Prom.', '% Máx.'].map(h => (
                      <th key={h} style={{ padding: '9px 14px', textAlign: 'left', fontSize: 10, color: 'var(--text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.06em', fontWeight: 600 }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {resumen.por_nodo.map((n, i) => (
                    <tr key={n.tipo} style={{ borderTop: '1px solid var(--border-subtle)', background: i % 2 === 0 ? 'transparent' : 'var(--bg-tertiary)11' }}>
                      <td style={{ padding: '10px 14px' }}><NodoBadge tipo={n.tipo} /></td>
                      <td style={{ padding: '10px 14px', fontSize: 13, fontFamily: 'IBM Plex Mono, monospace', color: 'var(--text-secondary)' }}>{n.registros}</td>
                      <td style={{ padding: '10px 14px', fontSize: 13, fontFamily: 'IBM Plex Mono, monospace' }}>{fmtNum(n.total_peso_inicial)}</td>
                      <td style={{ padding: '10px 14px', fontSize: 13, fontFamily: 'IBM Plex Mono, monospace' }}>{fmtNum(parseFloat(n.total_peso_inicial || 0) - parseFloat(n.total_kg_merma || 0))}</td>
                      <td style={{ padding: '10px 14px', fontSize: 13, fontFamily: 'IBM Plex Mono, monospace', color: NODO_CONFIG[n.tipo]?.color, fontWeight: 600 }}>{fmtNum(n.total_kg_merma)}</td>
                      <td style={{ padding: '10px 14px', fontSize: 13, fontFamily: 'IBM Plex Mono, monospace', color: parseFloat(n.promedio_porcentaje_merma) > 5 ? 'var(--accent-error)' : NODO_CONFIG[n.tipo]?.color }}>{fmtNum(n.promedio_porcentaje_merma)}%</td>
                      <td style={{ padding: '10px 14px', fontSize: 13, fontFamily: 'IBM Plex Mono, monospace', color: 'var(--text-tertiary)' }}>{fmtNum(n.max_porcentaje_merma)}%</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* ═══════════════════════════════════════════════════
          VISTA: LISTA (registros individuales)
          ═══════════════════════════════════════════════════ */}
      {!loading && selectedLoteId && view === 'lista' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>

          {/* Filtros */}
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            <button
              onClick={() => setFiltroTipo('')}
              style={{ padding: '6px 14px', borderRadius: 20, border: `1px solid ${!filtroTipo ? AC : 'var(--border-subtle)'}`, background: !filtroTipo ? AC + '20' : 'transparent', color: !filtroTipo ? AC : 'var(--text-secondary)', cursor: 'pointer', fontSize: 12, fontWeight: !filtroTipo ? 600 : 400 }}
            >
              Todos
            </button>
            {TIPOS.map(t => {
              const cfg = NODO_CONFIG[t];
              const active = filtroTipo === t;
              return (
                <button
                  key={t}
                  onClick={() => setFiltroTipo(t)}
                  style={{ padding: '6px 14px', borderRadius: 20, border: `1px solid ${active ? cfg.color : 'var(--border-subtle)'}`, background: active ? cfg.color + '20' : 'transparent', color: active ? cfg.color : 'var(--text-secondary)', cursor: 'pointer', fontSize: 12, fontWeight: active ? 600 : 400 }}
                >
                  {cfg.label}
                </button>
              );
            })}
          </div>

          {/* Tabla de registros */}
          {registrosFiltrados.length === 0 ? (
            <div style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border-subtle)', borderRadius: 12, padding: 32, textAlign: 'center', color: 'var(--text-tertiary)', fontSize: 13 }}>
              No hay registros de merma{filtroTipo ? ` para el nodo ${NODO_CONFIG[filtroTipo]?.label}` : ''}.
              <br />
              <span style={{ fontSize: 11 }}>Usa "Registrar Pesaje" para agregar uno.</span>
            </div>
          ) : (
            <div style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border-subtle)', borderRadius: 12, overflow: 'hidden' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ background: 'var(--bg-tertiary)' }}>
                    {['Fecha', 'Nodo', 'Peso Inicial', 'Peso Final', 'Kg Merma', '% Merma', 'Operario', 'Notas'].map(h => (
                      <th key={h} style={{ padding: '9px 14px', textAlign: 'left', fontSize: 10, color: 'var(--text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.06em', fontWeight: 600, whiteSpace: 'nowrap' }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {registrosFiltrados.map((r, i) => {
                    const pct = parseFloat(r.porcentaje_merma || 0);
                    const color = NODO_CONFIG[r.tipo]?.color || AC;
                    return (
                      <tr key={r.id} style={{ borderTop: '1px solid var(--border-subtle)', background: i % 2 === 0 ? 'transparent' : 'var(--bg-tertiary)11' }}>
                        <td style={{ padding: '10px 14px', fontSize: 12, color: 'var(--text-secondary)', whiteSpace: 'nowrap' }}>{fmtDate(r.fecha)}</td>
                        <td style={{ padding: '10px 14px' }}><NodoBadge tipo={r.tipo} /></td>
                        <td style={{ padding: '10px 14px', fontSize: 13, fontFamily: 'IBM Plex Mono, monospace' }}>{fmtNum(r.peso_inicial)}</td>
                        <td style={{ padding: '10px 14px', fontSize: 13, fontFamily: 'IBM Plex Mono, monospace' }}>{fmtNum(r.peso_final)}</td>
                        <td style={{ padding: '10px 14px', fontSize: 13, fontFamily: 'IBM Plex Mono, monospace', color, fontWeight: 600 }}>{fmtNum(r.kg_merma)}</td>
                        <td style={{ padding: '10px 14px', fontSize: 13, fontFamily: 'IBM Plex Mono, monospace', color: pct > 5 ? 'var(--accent-error)' : color, fontWeight: 600 }}>{fmtNum(pct)}%</td>
                        <td style={{ padding: '10px 14px', fontSize: 12, color: 'var(--text-secondary)' }}>{r.operario || '—'}</td>
                        <td style={{ padding: '10px 14px', fontSize: 11, color: 'var(--text-tertiary)', maxWidth: 180, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{r.notas || '—'}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* ── Modal ── */}
      {modal && (
        <PesajeModal
          negocioId={negocioId}
          loteId={activeLote?.id || selectedLoteId || null}
          onClose={() => setModal(false)}
          onSaved={onPesajeGuardado}
        />
      )}
    </div>
  );
};

export default Mermas;
