import React, { useState, useEffect, useCallback } from 'react';
import { apiFetch } from '../../config/api.js';
import { Btn } from '../../components/ui.jsx';

const AC = 'var(--accent-agro)';

const Label = ({ children }) => (
  <div style={{ fontSize: '10px', color: 'var(--text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 4 }}>
    {children}
  </div>
);

const inputStyle = {
  width: '100%', background: 'var(--bg-tertiary)', border: '1px solid var(--border-subtle)',
  borderRadius: 8, color: 'var(--text-primary)', padding: '10px 12px', fontSize: 13,
  outline: 'none', boxSizing: 'border-box',
};

// ==========================================
// PESTAÑA: TAREAS PUNTUALES
// ==========================================
const TareasPuntuales = ({ negocioId, lotes, operarios }) => {
  const [tareas, setTareas] = useState([]);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState('');
  const [form, setForm] = useState({ titulo: '', descripcion: '', lote_id: '', asignado_a: '', fecha_objetivo: '' });

  const fetchTareas = useCallback(async () => {
    if (!negocioId) return;
    setLoading(true);
    try {
      const data = await apiFetch(`/api/negocios/${negocioId}/tareas`);
      setTareas(data || []);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, [negocioId]);

  useEffect(() => { fetchTareas(); }, [fetchTareas]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErr('');
    if (!form.titulo || !form.asignado_a) return setErr('Título y Operario son obligatorios');
    try {
      await apiFetch(`/api/negocios/${negocioId}/tareas`, {
        method: 'POST',
        body: JSON.stringify(form)
      });
      setForm({ titulo: '', descripcion: '', lote_id: '', asignado_a: '', fecha_objetivo: '' });
      fetchTareas();
    } catch (error) {
      setErr(error.error || 'Error al crear tarea');
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      {/* Formulario Crear */}
      <div style={{ background: 'var(--bg-secondary)', padding: 20, borderRadius: 12, border: '1px solid var(--border-subtle)' }}>
        <h3 style={{ marginTop: 0, fontSize: 14, marginBottom: 16 }}>Nueva Tarea Puntual</h3>
        <form onSubmit={handleSubmit} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          <div style={{ gridColumn: '1 / -1' }}>
            <Label>Título</Label>
            <input type="text" value={form.titulo} onChange={e => setForm({...form, titulo: e.target.value})} style={inputStyle} placeholder="Ej: Mover corral, limpiar bebederos..." />
          </div>
          <div>
            <Label>Lote (opcional)</Label>
            <select value={form.lote_id} onChange={e => setForm({...form, lote_id: e.target.value})} style={inputStyle}>
              <option value="">— General —</option>
              {lotes.map(l => <option key={l.id} value={l.id}>{l.identificador}</option>)}
            </select>
          </div>
          <div>
            <Label>Operario asignado</Label>
            <select value={form.asignado_a} onChange={e => setForm({...form, asignado_a: e.target.value})} style={inputStyle}>
              <option value="">— Seleccionar —</option>
              {operarios.map(o => <option key={o.user_id} value={o.user_id}>{o.nombre}</option>)}
            </select>
          </div>
          <div>
            <Label>Fecha límite (opcional)</Label>
            <input type="date" value={form.fecha_objetivo} onChange={e => setForm({...form, fecha_objetivo: e.target.value})} style={inputStyle} />
          </div>
          <div style={{ gridColumn: '1 / -1', display: 'flex', justifyContent: 'flex-end', marginTop: 8 }}>
            {err && <div style={{ color: 'var(--accent-error)', fontSize: 12, marginRight: 16, alignSelf: 'center' }}>{err}</div>}
            <Btn accentColor={AC} type="submit">Asignar Tarea</Btn>
          </div>
        </form>
      </div>

      {/* Lista */}
      <div style={{ background: 'var(--bg-secondary)', borderRadius: 12, border: '1px solid var(--border-subtle)', overflow: 'hidden' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ background: 'var(--bg-tertiary)' }}>
              {['Fecha', 'Título', 'Lote', 'Operario', 'Estado'].map(h => (
                <th key={h} style={{ padding: '10px 14px', textAlign: 'left', fontSize: 10, color: 'var(--text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {loading ? <tr><td colSpan={5} style={{ padding: 20, textAlign: 'center' }}>Cargando...</td></tr> : null}
            {!loading && tareas.length === 0 ? <tr><td colSpan={5} style={{ padding: 20, textAlign: 'center' }}>No hay tareas creadas.</td></tr> : null}
            {tareas.map(t => (
              <tr key={t.id} style={{ borderTop: '1px solid var(--border-subtle)' }}>
                <td style={{ padding: '10px 14px', fontSize: 13 }}>{new Date(t.created_at).toLocaleDateString()}</td>
                <td style={{ padding: '10px 14px', fontSize: 13, fontWeight: 500 }}>{t.titulo}</td>
                <td style={{ padding: '10px 14px', fontSize: 13 }}>{t.lote_identificador || 'General'}</td>
                <td style={{ padding: '10px 14px', fontSize: 13 }}>{t.operario_nombre || '—'}</td>
                <td style={{ padding: '10px 14px', fontSize: 12 }}>
                  <span style={{ padding: '2px 8px', borderRadius: 12, background: t.estado === 'completada' ? '#4caf5022' : '#ff980022', color: t.estado === 'completada' ? '#4caf50' : '#ff9800' }}>
                    {t.estado}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

// ==========================================
// PESTAÑA: RUTINAS (Plantillas)
// ==========================================
const RutinasPlantillas = ({ negocioId, lotes, operarios }) => {
  const [plantillas, setPlantillas] = useState([]);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState('');

  // Form
  const [nombre, setNombre] = useState('');
  const [items, setItems] = useState(['']);
  const [asignaciones, setAsignaciones] = useState([{ lote_id: '', operario_user_id: '' }]);

  const fetchPlantillas = useCallback(async () => {
    if (!negocioId) return;
    setLoading(true);
    try {
      const data = await apiFetch(`/api/negocios/${negocioId}/plantillas`);
      setPlantillas(data || []);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, [negocioId]);

  useEffect(() => { fetchPlantillas(); }, [fetchPlantillas]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErr('');
    const validItems = items.filter(i => i.trim() !== '');
    const validAsig = asignaciones.filter(a => a.lote_id && a.operario_user_id);
    
    if (!nombre) return setErr('El nombre es obligatorio');
    if (!validItems.length) return setErr('Agrega al menos un ítem al checklist');
    if (!validAsig.length) return setErr('Agrega al menos una asignación de lote/operario');

    try {
      await apiFetch(`/api/negocios/${negocioId}/plantillas`, {
        method: 'POST',
        body: JSON.stringify({ nombre, items: validItems, asignaciones: validAsig })
      });
      setNombre('');
      setItems(['']);
      setAsignaciones([{ lote_id: '', operario_user_id: '' }]);
      fetchPlantillas();
    } catch (error) {
      setErr(error.error || 'Error al crear rutina');
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      {/* Formulario Crear */}
      <div style={{ background: 'var(--bg-secondary)', padding: 20, borderRadius: 12, border: '1px solid var(--border-subtle)' }}>
        <h3 style={{ marginTop: 0, fontSize: 14, marginBottom: 16 }}>Nueva Rutina (Checklist Diario)</h3>
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div>
            <Label>Nombre de la Rutina</Label>
            <input type="text" value={nombre} onChange={e => setNombre(e.target.value)} style={inputStyle} placeholder="Ej: Rutina de Alimentación Mañana" />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24 }}>
            {/* Items */}
            <div>
              <Label>Ítems del Checklist</Label>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {items.map((it, idx) => (
                  <div key={idx} style={{ display: 'flex', gap: 8 }}>
                    <input type="text" value={it} onChange={e => {
                      const nu = [...items]; nu[idx] = e.target.value; setItems(nu);
                    }} style={inputStyle} placeholder={`Ítem ${idx + 1}`} />
                    {items.length > 1 && (
                      <button type="button" onClick={() => setItems(items.filter((_, i) => i !== idx))} style={{ background: 'none', border: 'none', color: 'var(--accent-error)', cursor: 'pointer' }}>×</button>
                    )}
                  </div>
                ))}
                <button type="button" onClick={() => setItems([...items, ''])} style={{ alignSelf: 'flex-start', background: 'none', border: 'none', color: AC, cursor: 'pointer', fontSize: 12, padding: 0 }}>+ Agregar ítem</button>
              </div>
            </div>

            {/* Asignaciones */}
            <div>
              <Label>Asignar a (Lote - Operario)</Label>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {asignaciones.map((asig, idx) => (
                  <div key={idx} style={{ display: 'flex', gap: 8 }}>
                    <select value={asig.lote_id} onChange={e => {
                      const nu = [...asignaciones]; nu[idx].lote_id = e.target.value; setAsignaciones(nu);
                    }} style={{...inputStyle, flex: 1}}>
                      <option value="">— Lote —</option>
                      {lotes.map(l => <option key={l.id} value={l.id}>{l.identificador}</option>)}
                    </select>
                    <select value={asig.operario_user_id} onChange={e => {
                      const nu = [...asignaciones]; nu[idx].operario_user_id = e.target.value; setAsignaciones(nu);
                    }} style={{...inputStyle, flex: 1}}>
                      <option value="">— Operario —</option>
                      {operarios.map(o => <option key={o.user_id} value={o.user_id}>{o.nombre}</option>)}
                    </select>
                    {asignaciones.length > 1 && (
                      <button type="button" onClick={() => setAsignaciones(asignaciones.filter((_, i) => i !== idx))} style={{ background: 'none', border: 'none', color: 'var(--accent-error)', cursor: 'pointer' }}>×</button>
                    )}
                  </div>
                ))}
                <button type="button" onClick={() => setAsignaciones([...asignaciones, {lote_id: '', operario_user_id: ''}])} style={{ alignSelf: 'flex-start', background: 'none', border: 'none', color: AC, cursor: 'pointer', fontSize: 12, padding: 0 }}>+ Agregar asignación</button>
              </div>
            </div>
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 8 }}>
            {err && <div style={{ color: 'var(--accent-error)', fontSize: 12, marginRight: 16, alignSelf: 'center' }}>{err}</div>}
            <Btn accentColor={AC} type="submit">Guardar Rutina</Btn>
          </div>
        </form>
      </div>

      {/* Lista */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 16 }}>
        {plantillas.map(p => (
          <div key={p.id} style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border-subtle)', borderRadius: 12, padding: 16, opacity: p.activo ? 1 : 0.6 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <div style={{ fontWeight: 600, fontSize: 15 }}>{p.nombre}</div>
              <button onClick={async () => {
                await apiFetch(`/api/negocios/${negocioId}/plantillas/${p.id}`, { method: 'PATCH' });
                fetchPlantillas();
              }} style={{ background: 'none', border: 'none', color: p.activo ? 'var(--text-tertiary)' : 'var(--accent-error)', cursor: 'pointer', fontSize: 12 }}>
                {p.activo ? 'Desactivar' : 'Activar'}
              </button>
            </div>
            <div style={{ marginTop: 12 }}>
              <Label>Checklist ({p.items?.length || 0})</Label>
              <ul style={{ margin: 0, paddingLeft: 16, fontSize: 13, color: 'var(--text-secondary)' }}>
                {(p.items || []).map((it, i) => <li key={i}>{it}</li>)}
              </ul>
            </div>
            <div style={{ marginTop: 12 }}>
              <Label>Asignado en ({p.asignaciones?.length || 0}) lotes</Label>
              <div style={{ fontSize: 12, color: 'var(--text-tertiary)', display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                {(p.asignaciones || []).map((a, i) => {
                  const lote = lotes.find(l => l.id === a.lote_id)?.identificador || a.lote_id;
                  const op = operarios.find(o => o.user_id === a.operario_user_id)?.nombre || a.operario_user_id;
                  return <span key={i} style={{ background: 'var(--bg-tertiary)', padding: '2px 6px', borderRadius: 4 }}>{lote} ({op})</span>;
                })}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

// ==========================================
// COMPONENTE PRINCIPAL
// ==========================================
export default function Rutinas({ negocioId }) {
  const [view, setView] = useState('tareas'); // 'tareas' | 'rutinas'
  const [lotes, setLotes] = useState([]);
  const [operarios, setOperarios] = useState([]);

  useEffect(() => {
    if (!negocioId) return;
    apiFetch(`/api/negocios/${negocioId}/lotes`).then(data => setLotes(data.filter(l => l.activo))).catch(console.error);
    apiFetch(`/api/negocios/${negocioId}/operarios`).then(data => setOperarios(data)).catch(console.error);
  }, [negocioId]);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      {/* ── Header ── */}
      <div>
        <h1 style={{ fontSize: 20, fontWeight: 600, color: 'var(--text-primary)', marginBottom: 2 }}>
          Rutinas y Tareas
        </h1>
        <p style={{ fontSize: 12, color: 'var(--text-tertiary)' }}>
          Asignación de tareas puntuales y rutinas diarias a operarios
        </p>
      </div>

      {/* ── Tabs ── */}
      <div style={{ display: 'flex', gap: 4, borderBottom: '1px solid var(--border-subtle)', paddingBottom: 0 }}>
        {[{ id: 'tareas', label: 'Tareas Puntuales' }, { id: 'rutinas', label: 'Rutinas (Checklists)' }].map(t => (
          <button
            key={t.id}
            onClick={() => setView(t.id)}
            style={{
              padding: '8px 16px', border: 'none', background: 'none', cursor: 'pointer',
              fontSize: 13, fontWeight: view === t.id ? 600 : 400,
              color: view === t.id ? AC : 'var(--text-secondary)',
              borderBottom: `2px solid ${view === t.id ? AC : 'transparent'}`,
              transition: 'all 0.15s', display: 'flex', alignItems: 'center', gap: '6px'
            }}
          >
            {t.label}
          </button>
        ))}
      </div>

      {view === 'tareas' ? (
        <TareasPuntuales negocioId={negocioId} lotes={lotes} operarios={operarios} />
      ) : (
        <RutinasPlantillas negocioId={negocioId} lotes={lotes} operarios={operarios} />
      )}
    </div>
  );
}
