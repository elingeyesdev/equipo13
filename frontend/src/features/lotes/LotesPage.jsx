import { useState, useEffect } from 'react';
import { apiFetch } from '../../api/api.js';

/* ─────────────────────────────────────────────────────────────────────────────
   LotesPage — módulo agro-ganadero
   Requiere: props.negocioId  (vendrá del contexto global cuando se implemente)
───────────────────────────────────────────────────────────────────────────── */

const EMPTY_FORM = {
  identificador: '',
  tipo_animal: '',
  fecha_entrada: '',
  cabezas_inicio: '',
  peso_inicial_prom: '',
  costo_adquisicion: '',
};

export default function LotesPage({ negocioId }) {
  const [lotes, setLotes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);
  const [submitting, setSubmitting] = useState(false);
  const [selectedLote, setSelectedLote] = useState(null); // para ver bitácora

  // ── Cargar lotes ────────────────────────────────────────────────────────────
  const fetchLotes = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await apiFetch(`/api/negocios/${negocioId}/lotes`);
      setLotes(data);
    } catch (err) {
      setError(err?.error || 'Error al cargar lotes');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (negocioId) fetchLotes();
  }, [negocioId]);

  // ── Crear lote ──────────────────────────────────────────────────────────────
  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const payload = {
        ...form,
        cabezas_inicio: form.cabezas_inicio ? Number(form.cabezas_inicio) : undefined,
        peso_inicial_prom: form.peso_inicial_prom ? Number(form.peso_inicial_prom) : undefined,
        costo_adquisicion: form.costo_adquisicion ? Number(form.costo_adquisicion) : undefined,
      };
      const nuevo = await apiFetch(`/api/negocios/${negocioId}/lotes`, {
        method: 'POST',
        body: JSON.stringify(payload),
      });
      setLotes((prev) => [nuevo, ...prev]);
      setShowModal(false);
      setForm(EMPTY_FORM);
    } catch (err) {
      alert(err?.error || 'Error al crear lote');
    } finally {
      setSubmitting(false);
    }
  };

  // ── Cerrar lote ─────────────────────────────────────────────────────────────
  const handleCerrar = async (loteId) => {
    if (!confirm('¿Cerrar este lote? Esta acción marca el lote como inactivo.')) return;
    try {
      const updated = await apiFetch(`/api/negocios/${negocioId}/lotes/${loteId}/cerrar`, {
        method: 'PATCH',
      });
      setLotes((prev) => prev.map((l) => (l.id === loteId ? updated : l)));
    } catch (err) {
      alert(err?.error || 'Error al cerrar lote');
    }
  };

  // ── Render ──────────────────────────────────────────────────────────────────
  if (selectedLote) {
    return (
      <BitacoraPage
        negocioId={negocioId}
        lote={selectedLote}
        onBack={() => setSelectedLote(null)}
      />
    );
  }

  return (
    <div style={styles.container}>
      {/* Header */}
      <div style={styles.header}>
        <div>
          <h1 style={styles.title}>🐄 Lotes Ganaderos</h1>
          <p style={styles.subtitle}>Gestión de lotes y seguimiento de costos</p>
        </div>
        <button style={styles.btnPrimary} onClick={() => setShowModal(true)}>
          + Nuevo Lote
        </button>
      </div>

      {/* Estado */}
      {loading && <div style={styles.skeleton}>Cargando lotes...</div>}
      {error && <div style={styles.errorBox}>{error}</div>}

      {/* Tabla de lotes */}
      {!loading && !error && (
        <div style={styles.tableWrapper}>
          {lotes.length === 0 ? (
            <div style={styles.empty}>
              <p>No hay lotes registrados. ¡Crea tu primer lote!</p>
            </div>
          ) : (
            <table style={styles.table}>
              <thead>
                <tr>
                  {['Identificador', 'Animal', 'Cabezas activas', 'Peso prom (kg)', 'Costo total (Bs)', 'Estado', 'Acciones'].map((h) => (
                    <th key={h} style={styles.th}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {lotes.map((lote) => (
                  <tr key={lote.id} style={styles.tr}>
                    <td style={styles.td}>
                      <strong>{lote.identificador}</strong>
                    </td>
                    <td style={styles.td}>{lote.tipo_animal}</td>
                    <td style={styles.td}>{lote.cabezas_activas ?? '—'}</td>
                    <td style={styles.td}>
                      {lote.peso_actual_prom != null
                        ? Number(lote.peso_actual_prom).toFixed(2)
                        : '—'}
                    </td>
                    <td style={styles.td}>
                      <strong>
                        {lote.costo_total != null
                          ? `Bs ${Number(lote.costo_total).toFixed(2)}`
                          : '—'}
                      </strong>
                    </td>
                    <td style={styles.td}>
                      <span style={lote.activo ? styles.badgeActive : styles.badgeClosed}>
                        {lote.activo ? 'Activo' : 'Cerrado'}
                      </span>
                    </td>
                    <td style={styles.td}>
                      <button
                        style={styles.btnSm}
                        onClick={() => setSelectedLote(lote)}
                      >
                        Bitácora
                      </button>
                      {lote.activo && (
                        <button
                          style={{ ...styles.btnSm, ...styles.btnDanger }}
                          onClick={() => handleCerrar(lote.id)}
                        >
                          Cerrar
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}

      {/* Modal nuevo lote */}
      {showModal && (
        <div style={styles.overlay}>
          <div style={styles.modal}>
            <h2 style={styles.modalTitle}>Nuevo Lote</h2>
            <form onSubmit={handleSubmit}>
              <Field label="Identificador *" required>
                <input
                  style={styles.input}
                  value={form.identificador}
                  onChange={(e) => setForm({ ...form, identificador: e.target.value })}
                  placeholder="Ej: L-2025-001"
                  required
                />
              </Field>
              <Field label="Tipo de animal *" required>
                <input
                  style={styles.input}
                  value={form.tipo_animal}
                  onChange={(e) => setForm({ ...form, tipo_animal: e.target.value })}
                  placeholder="Ej: Bovino, Ovino..."
                  required
                />
              </Field>
              <Field label="Fecha de entrada">
                <input
                  type="date"
                  style={styles.input}
                  value={form.fecha_entrada}
                  onChange={(e) => setForm({ ...form, fecha_entrada: e.target.value })}
                />
              </Field>
              <Field label="Cabezas de inicio">
                <input
                  type="number"
                  min="0"
                  style={styles.input}
                  value={form.cabezas_inicio}
                  onChange={(e) => setForm({ ...form, cabezas_inicio: e.target.value })}
                />
              </Field>
              <Field label="Peso promedio inicial (kg)">
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  style={styles.input}
                  value={form.peso_inicial_prom}
                  onChange={(e) => setForm({ ...form, peso_inicial_prom: e.target.value })}
                />
              </Field>
              <Field label="Costo de adquisición (Bs)">
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  style={styles.input}
                  value={form.costo_adquisicion}
                  onChange={(e) => setForm({ ...form, costo_adquisicion: e.target.value })}
                />
              </Field>
              <div style={styles.modalActions}>
                <button
                  type="button"
                  style={styles.btnSecondary}
                  onClick={() => { setShowModal(false); setForm(EMPTY_FORM); }}
                >
                  Cancelar
                </button>
                <button type="submit" style={styles.btnPrimary} disabled={submitting}>
                  {submitting ? 'Guardando...' : 'Crear Lote'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// BitacoraPage — sub-página de bitácora por lote
// ─────────────────────────────────────────────────────────────────────────────

const EMPTY_BITACORA = {
  fecha: '',
  tipo: '',
  detalle: '',
  monto: '',
  es_baja: false,
  cabezas_baja: '',
  peso_baja: '',
  causa: '',
};

function BitacoraPage({ negocioId, lote, onBack }) {
  const [registros, setRegistros] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState(EMPTY_BITACORA);
  const [submitting, setSubmitting] = useState(false);

  const fetchBitacora = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await apiFetch(
        `/api/negocios/${negocioId}/lotes/${lote.id}/bitacora`
      );
      setRegistros(data);
    } catch (err) {
      setError(err?.error || 'Error al cargar bitácora');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchBitacora(); }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const payload = {
        ...form,
        monto: form.monto !== '' ? Number(form.monto) : undefined,
        cabezas_baja: form.cabezas_baja !== '' ? Number(form.cabezas_baja) : undefined,
        peso_baja: form.peso_baja !== '' ? Number(form.peso_baja) : undefined,
      };
      const nuevo = await apiFetch(
        `/api/negocios/${negocioId}/lotes/${lote.id}/bitacora`,
        { method: 'POST', body: JSON.stringify(payload) }
      );
      setRegistros((prev) => [nuevo, ...prev]);
      setShowModal(false);
      setForm(EMPTY_BITACORA);
    } catch (err) {
      alert(err?.error || 'Error al registrar entrada');
    } finally {
      setSubmitting(false);
    }
  };

  const TIPOS = [
    'Alimentación', 'Sanidad / Veterinario', 'Transporte', 'Pastura / Forraje',
    'Suplemento', 'Baja / Muerte', 'Venta', 'Otro',
  ];

  return (
    <div style={styles.container}>
      {/* Header */}
      <div style={styles.header}>
        <div>
          <button style={styles.backBtn} onClick={onBack}>← Volver a Lotes</button>
          <h1 style={styles.title}>📋 Bitácora — {lote.identificador}</h1>
          <p style={styles.subtitle}>
            {lote.tipo_animal} · {lote.cabezas_activas ?? '?'} cabezas activas
          </p>
        </div>
        <button style={styles.btnPrimary} onClick={() => setShowModal(true)}>
          + Registrar entrada
        </button>
      </div>

      {loading && <div style={styles.skeleton}>Cargando bitácora...</div>}
      {error && <div style={styles.errorBox}>{error}</div>}

      {!loading && !error && (
        <div style={styles.tableWrapper}>
          {registros.length === 0 ? (
            <div style={styles.empty}>
              <p>Sin registros aún. Agrega la primera entrada a la bitácora.</p>
            </div>
          ) : (
            <table style={styles.table}>
              <thead>
                <tr>
                  {['Fecha', 'Tipo', 'Detalle', 'Monto (Bs)', 'Baja', 'Cabezas baja'].map((h) => (
                    <th key={h} style={styles.th}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {registros.map((r) => (
                  <tr key={r.id} style={{ ...styles.tr, ...(r.es_baja ? { background: '#fff1f2' } : {}) }}>
                    <td style={styles.td}>{r.fecha || '—'}</td>
                    <td style={styles.td}>{r.tipo}</td>
                    <td style={styles.td}>{r.detalle || '—'}</td>
                    <td style={styles.td}>
                      {r.monto != null ? `Bs ${Number(r.monto).toFixed(2)}` : '—'}
                    </td>
                    <td style={styles.td}>
                      {r.es_baja ? <span style={styles.badgeClosed}>Sí</span> : '—'}
                    </td>
                    <td style={styles.td}>{r.cabezas_baja ?? '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}

      {/* Modal nueva entrada */}
      {showModal && (
        <div style={styles.overlay}>
          <div style={styles.modal}>
            <h2 style={styles.modalTitle}>Nueva entrada de bitácora</h2>
            <form onSubmit={handleSubmit}>
              <Field label="Fecha">
                <input type="date" style={styles.input} value={form.fecha}
                  onChange={(e) => setForm({ ...form, fecha: e.target.value })} />
              </Field>
              <Field label="Tipo *" required>
                <select style={styles.input} value={form.tipo} required
                  onChange={(e) => setForm({ ...form, tipo: e.target.value })}>
                  <option value="">Seleccionar tipo...</option>
                  {TIPOS.map((t) => <option key={t} value={t}>{t}</option>)}
                </select>
              </Field>
              <Field label="Detalle">
                <textarea style={{ ...styles.input, height: 64 }} value={form.detalle}
                  onChange={(e) => setForm({ ...form, detalle: e.target.value })}
                  placeholder="Descripción de la actividad..." />
              </Field>
              <Field label="Monto (Bs)">
                <input type="number" step="0.01" min="0" style={styles.input}
                  value={form.monto}
                  onChange={(e) => setForm({ ...form, monto: e.target.value })} />
              </Field>
              <Field label="">
                <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' }}>
                  <input type="checkbox" checked={form.es_baja}
                    onChange={(e) => setForm({ ...form, es_baja: e.target.checked })} />
                  <span>Es una baja (muerte / venta)</span>
                </label>
              </Field>
              {form.es_baja && (
                <>
                  <Field label="Cabezas de baja">
                    <input type="number" min="0" style={styles.input}
                      value={form.cabezas_baja}
                      onChange={(e) => setForm({ ...form, cabezas_baja: e.target.value })} />
                  </Field>
                  <Field label="Peso de baja (kg)">
                    <input type="number" step="0.01" min="0" style={styles.input}
                      value={form.peso_baja}
                      onChange={(e) => setForm({ ...form, peso_baja: e.target.value })} />
                  </Field>
                  <Field label="Causa">
                    <input style={styles.input} value={form.causa}
                      onChange={(e) => setForm({ ...form, causa: e.target.value })}
                      placeholder="Causa de la baja..." />
                  </Field>
                </>
              )}
              <div style={styles.modalActions}>
                <button type="button" style={styles.btnSecondary}
                  onClick={() => { setShowModal(false); setForm(EMPTY_BITACORA); }}>
                  Cancelar
                </button>
                <button type="submit" style={styles.btnPrimary} disabled={submitting}>
                  {submitting ? 'Guardando...' : 'Registrar'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────
function Field({ label, children }) {
  return (
    <div style={{ marginBottom: 14 }}>
      {label && <label style={styles.label}>{label}</label>}
      {children}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Estilos inline (sin depender de Tailwind ni CSS externo)
// ─────────────────────────────────────────────────────────────────────────────
const styles = {
  container: {
    fontFamily: "'Inter', 'Segoe UI', sans-serif",
    padding: '24px 32px',
    maxWidth: 1100,
    margin: '0 auto',
    color: '#1e293b',
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 28,
  },
  title: { fontSize: 26, fontWeight: 700, margin: 0, color: '#0f172a' },
  subtitle: { color: '#64748b', fontSize: 14, marginTop: 4 },
  backBtn: {
    background: 'none',
    border: 'none',
    color: '#6366f1',
    cursor: 'pointer',
    fontSize: 14,
    padding: 0,
    marginBottom: 6,
    fontWeight: 500,
  },
  skeleton: {
    background: '#f1f5f9',
    borderRadius: 8,
    padding: '18px 24px',
    color: '#94a3b8',
    fontSize: 14,
  },
  errorBox: {
    background: '#fef2f2',
    border: '1px solid #fecaca',
    borderRadius: 8,
    padding: '14px 20px',
    color: '#dc2626',
    fontSize: 14,
  },
  tableWrapper: {
    background: '#fff',
    borderRadius: 12,
    boxShadow: '0 1px 6px rgba(0,0,0,0.08)',
    overflow: 'hidden',
  },
  table: { width: '100%', borderCollapse: 'collapse' },
  th: {
    textAlign: 'left',
    padding: '12px 16px',
    background: '#f8fafc',
    fontWeight: 600,
    fontSize: 12,
    color: '#64748b',
    textTransform: 'uppercase',
    letterSpacing: '0.05em',
    borderBottom: '1px solid #e2e8f0',
  },
  tr: { borderBottom: '1px solid #f1f5f9', transition: 'background 0.15s' },
  td: { padding: '12px 16px', fontSize: 14, verticalAlign: 'middle' },
  empty: { padding: '48px 24px', textAlign: 'center', color: '#94a3b8', fontSize: 15 },
  badgeActive: {
    background: '#dcfce7', color: '#16a34a',
    borderRadius: 99, padding: '3px 10px', fontSize: 12, fontWeight: 600,
  },
  badgeClosed: {
    background: '#fee2e2', color: '#dc2626',
    borderRadius: 99, padding: '3px 10px', fontSize: 12, fontWeight: 600,
  },
  btnPrimary: {
    background: 'linear-gradient(135deg, #6366f1, #4f46e5)',
    color: '#fff',
    border: 'none',
    borderRadius: 8,
    padding: '10px 22px',
    fontSize: 14,
    fontWeight: 600,
    cursor: 'pointer',
    transition: 'opacity 0.2s',
  },
  btnSecondary: {
    background: '#f1f5f9',
    color: '#475569',
    border: 'none',
    borderRadius: 8,
    padding: '10px 22px',
    fontSize: 14,
    fontWeight: 600,
    cursor: 'pointer',
  },
  btnSm: {
    background: '#f1f5f9',
    color: '#475569',
    border: 'none',
    borderRadius: 6,
    padding: '5px 12px',
    fontSize: 12,
    fontWeight: 600,
    cursor: 'pointer',
    marginRight: 6,
  },
  btnDanger: { background: '#fee2e2', color: '#dc2626' },
  overlay: {
    position: 'fixed', inset: 0,
    background: 'rgba(15,23,42,0.45)',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    zIndex: 1000,
  },
  modal: {
    background: '#fff',
    borderRadius: 16,
    padding: '32px 36px',
    width: '100%',
    maxWidth: 480,
    boxShadow: '0 20px 60px rgba(0,0,0,0.18)',
    maxHeight: '90vh',
    overflowY: 'auto',
  },
  modalTitle: { fontSize: 20, fontWeight: 700, margin: '0 0 22px', color: '#0f172a' },
  modalActions: { display: 'flex', gap: 12, justifyContent: 'flex-end', marginTop: 24 },
  label: { display: 'block', fontSize: 13, fontWeight: 600, color: '#374151', marginBottom: 6 },
  input: {
    width: '100%',
    border: '1.5px solid #e2e8f0',
    borderRadius: 8,
    padding: '9px 13px',
    fontSize: 14,
    outline: 'none',
    boxSizing: 'border-box',
    background: '#f8fafc',
    transition: 'border-color 0.2s',
  },
};
