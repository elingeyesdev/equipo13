import { useState, useEffect } from 'react';
import { apiFetch } from '../../config/api';
import { Icon } from '../../icons.jsx';
import { Btn, StatusBadge, SectionCard, InfoTip } from '../../components/ui.jsx';

const ACCENT = 'var(--accent-agro)';

const TIPO_META = {
  static:   { label: 'HTML estático', color: 'var(--accent-industrial)' },
  json_api: { label: 'JSON API',      color: 'var(--accent-success)' },
  js:       { label: 'JS dinámico',   color: 'var(--accent-warning)' },
  pdf:      { label: 'PDF',           color: 'var(--accent-danger)' },
};
const ESTADO_META = {
  ok:        { label: 'OK',         color: 'var(--accent-success)' },
  error:     { label: 'Error',      color: 'var(--accent-danger)' },
  running:   { label: 'En curso',   color: 'var(--accent-warning)' },
  pendiente: { label: 'Pendiente',  color: 'var(--text-tertiary)' },
};

const fieldStyle = {
  background: 'var(--bg-tertiary)', border: '1px solid var(--border-subtle)',
  borderRadius: '6px', color: 'var(--text-primary)', padding: '8px 12px',
  fontSize: '13px', outline: 'none', fontFamily: 'var(--font-sans)',
};

function Label({ children, extra }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '5px', marginBottom: '6px' }}>
      <label style={{ fontSize: '11px', color: 'var(--text-tertiary)', fontWeight: 500, letterSpacing: '0.07em', textTransform: 'uppercase' }}>{children}</label>
      {extra}
    </div>
  );
}

export default function FuentesDatos({ negocioId }) {
  const [fuentes, setFuentes] = useState([]);
  const [alias, setAlias] = useState([]);
  const [runs, setRuns] = useState([]);
  const [form, setForm] = useState({ nombre: '', url: '', tipo: 'json_api', canal: 'minorista', config: '{}' });
  const [aliasForm, setAliasForm] = useState({ alias_texto: '', corte_canonico: '' });
  const [msg, setMsg] = useState(null);
  const [ejecutando, setEjecutando] = useState(false);

  async function cargar() {
    try {
      const [f, a, r] = await Promise.all([
        apiFetch(`/api/negocios/${negocioId}/fuentes-scraping`),
        apiFetch(`/api/negocios/${negocioId}/corte-alias`),
        apiFetch(`/api/negocios/${negocioId}/scrape-runs`),
      ]);
      setFuentes(f); setAlias(a); setRuns(r);
    } catch (e) {
      console.error(e);
    }
  }
  useEffect(() => { if (negocioId) cargar(); }, [negocioId]);

  async function crearFuente() {
    let config; try { config = JSON.parse(form.config); } catch { setMsg({ tipo: 'error', texto: 'La config no es un JSON válido.' }); return; }
    try {
      const payload = { ...form, config };
      const data = await apiFetch(`/api/negocios/${negocioId}/fuentes-scraping`, {
        method: 'POST', body: JSON.stringify(payload)
      });
      setFuentes([...fuentes, data]);
      setForm({ nombre: '', url: '', tipo: 'json_api', canal: 'minorista', config: '{}' });
      setMsg({ tipo: 'ok', texto: 'Fuente agregada.' });
    } catch (e) { setMsg({ tipo: 'error', texto: e.error || 'No se pudo crear la fuente.' }); }
  }

  async function eliminarFuente(id, nombre) {
    if (!window.confirm(`¿Eliminar la fuente "${nombre}"? Esta acción no se puede deshacer.`)) return;
    try {
      await apiFetch(`/api/negocios/${negocioId}/fuentes-scraping/${id}`, { method: 'DELETE' });
      setFuentes(fuentes.filter(f => f.id !== id));
      setMsg({ tipo: 'ok', texto: 'Fuente eliminada.' });
    } catch (e) { setMsg({ tipo: 'error', texto: e.error || 'No se pudo eliminar la fuente.' }); }
  }

  async function crearAlias() {
    if (!aliasForm.alias_texto.trim() || !aliasForm.corte_canonico.trim()) return;
    try {
      const data = await apiFetch(`/api/negocios/${negocioId}/corte-alias`, {
        method: 'POST', body: JSON.stringify(aliasForm)
      });
      setAlias([...alias, data]);
      setAliasForm({ alias_texto: '', corte_canonico: '' });
    } catch (e) { setMsg({ tipo: 'error', texto: e.error || 'No se pudo crear el alias.' }); }
  }

  async function ejecutar() {
    setEjecutando(true);
    setMsg({ tipo: 'info', texto: 'Ejecutando scraping…' });
    try {
      const data = await apiFetch(`/api/negocios/${negocioId}/scraping/run`, { method: 'POST' });
      const lecturas = data?.filas_insertadas || 0;
      let unicos = null;
      try {
        const scrapeados = await apiFetch(`/api/negocios/${negocioId}/precios-scrapeados`);
        unicos = Array.isArray(scrapeados) ? scrapeados.length : null;
      } catch {/* si falla, mostramos solo lecturas */}
      const texto = unicos != null
        ? `Listo: ${lecturas} lecturas guardadas (${unicos} cortes/fuentes únicos en la vista).`
        : `Listo: ${lecturas} lecturas guardadas.`;
      setMsg({ tipo: 'ok', texto });
      cargar();
    } catch (e) {
      setMsg({ tipo: 'error', texto: `Error: ${e.error || e.message}` });
    } finally {
      setEjecutando(false);
    }
  }

  const msgColor = msg?.tipo === 'error' ? 'var(--accent-danger)'
    : msg?.tipo === 'ok' ? 'var(--accent-success)' : 'var(--accent-warning)';

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <h1 style={{ fontSize: '22px', fontWeight: 400, color: 'var(--text-primary)', letterSpacing: '-0.02em' }}>Fuentes de datos de mercado</h1>
            <span style={{ background: ACCENT + '1A', color: ACCENT, border: `1px solid ${ACCENT}33`, borderRadius: '5px', padding: '2px 10px', fontSize: '12px', fontFamily: 'var(--font-mono)', fontWeight: 500 }}>{fuentes.length}</span>
          </div>
          <p style={{ fontSize: '13px', color: 'var(--text-tertiary)', marginTop: '4px' }}>Configurá de dónde se obtienen los precios de mercado y ejecutá el scraping.</p>
        </div>
        <Btn icon="refresh" accentColor={ACCENT} onClick={ejecutar} disabled={ejecutando}>
          {ejecutando ? 'Ejecutando…' : 'Ejecutar scraping ahora'}
        </Btn>
      </div>

      {msg && (
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', color: msgColor, background: 'var(--bg-secondary)', border: `1px solid ${msgColor}33`, borderLeft: `3px solid ${msgColor}`, borderRadius: '6px', padding: '10px 14px' }}>
          <Icon name={msg.tipo === 'error' ? 'alertTriangle' : msg.tipo === 'ok' ? 'checkCircle' : 'info'} size={14} />
          {msg.texto}
        </div>
      )}

      {/* Fuentes de scraping */}
      <SectionCard title="Fuentes de scraping">
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'minmax(140px,1fr) minmax(200px,2fr) 140px auto', gap: '10px', alignItems: 'end' }}>
            <div>
              <Label>Nombre</Label>
              <input style={{ ...fieldStyle, width: '100%' }} placeholder="Ej. Boletín SEDEM" value={form.nombre} onChange={e => setForm({ ...form, nombre: e.target.value })} />
            </div>
            <div>
              <Label>URL</Label>
              <input style={{ ...fieldStyle, width: '100%', fontFamily: 'var(--font-mono)', fontSize: '12px' }} placeholder="https://…" value={form.url} onChange={e => setForm({ ...form, url: e.target.value })} />
            </div>
            <div>
              <Label>Tipo</Label>
              <select style={{ ...fieldStyle, width: '100%' }} value={form.tipo} onChange={e => setForm({ ...form, tipo: e.target.value })}>
                <option value="json_api">JSON API</option>
              </select>
            </div>
            <Btn icon="plus" accentColor={ACCENT} onClick={crearFuente}>Agregar</Btn>
          </div>


          {/* Lista de fuentes */}
          {fuentes.length === 0 ? (
            <div style={{ padding: '24px', textAlign: 'center', color: 'var(--text-tertiary)', fontSize: '13px', background: 'var(--bg-tertiary)', borderRadius: '6px' }}>
              Aún no hay fuentes configuradas.
            </div>
          ) : (
            <div style={{ border: '1px solid var(--border-subtle)', borderRadius: '6px', overflow: 'hidden' }}>
              {fuentes.map((f, i) => {
                const tm = TIPO_META[f.tipo] || { label: f.tipo, color: 'var(--text-tertiary)' };
                return (
                  <div key={f.id} style={{ display: 'grid', gridTemplateColumns: 'minmax(140px,1fr) minmax(160px,2fr) 120px 64px 32px', gap: '10px', alignItems: 'center', padding: '10px 14px', borderBottom: i < fuentes.length - 1 ? '1px solid var(--border-subtle)' : 'none', opacity: f.activo ? 1 : 0.5 }}>
                    <span style={{ fontSize: '13px', color: 'var(--text-primary)', fontWeight: 500 }}>{f.nombre}</span>
                    <a href={f.url} target="_blank" rel="noreferrer" style={{ fontSize: '12px', fontFamily: 'var(--font-mono)', color: 'var(--text-secondary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', textDecoration: 'none' }} title={f.url}>{f.url}</a>
                    <div><StatusBadge label={tm.label} color={tm.color} /></div>
                    <span style={{ fontSize: '11px', color: f.activo ? 'var(--accent-success)' : 'var(--text-tertiary)', textAlign: 'right' }}>{f.activo ? 'Activa' : 'Inactiva'}</span>
                    <button onClick={() => eliminarFuente(f.id, f.nombre)} title="Eliminar fuente"
                      style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: 'var(--text-tertiary)', padding: '4px', borderRadius: '4px', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'color 0.15s, background 0.15s' }}
                      onMouseEnter={e => { e.currentTarget.style.color = 'var(--accent-danger)'; e.currentTarget.style.background = 'var(--accent-danger)1A'; }}
                      onMouseLeave={e => { e.currentTarget.style.color = 'var(--text-tertiary)'; e.currentTarget.style.background = 'transparent'; }}
                    ><Icon name="trash" size={14} /></button>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </SectionCard>

      {/* Alias de cortes */}
      <SectionCard title="Alias de cortes">
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <p style={{ fontSize: '12px', color: 'var(--text-tertiary)', lineHeight: 1.5, margin: 0 }}>
            Mapeá los nombres que aparecen en las fuentes hacia tus cortes canónicos para unificar precios.
          </p>
          <div style={{ display: 'grid', gridTemplateColumns: 'minmax(200px,2fr) minmax(160px,1fr) auto', gap: '10px', alignItems: 'end' }}>
            <div>
              <Label>Texto scrapeado</Label>
              <input style={{ ...fieldStyle, width: '100%' }} placeholder="Ej. pierna de cerdo frigor" value={aliasForm.alias_texto}
                onChange={e => setAliasForm({ ...aliasForm, alias_texto: e.target.value })} />
            </div>
            <div>
              <Label>Corte canónico</Label>
              <input style={{ ...fieldStyle, width: '100%' }} placeholder="Ej. Pierna" value={aliasForm.corte_canonico}
                onChange={e => setAliasForm({ ...aliasForm, corte_canonico: e.target.value })} />
            </div>
            <Btn icon="plus" accentColor={ACCENT} onClick={crearAlias}>Agregar</Btn>
          </div>
          {alias.length === 0 ? (
            <div style={{ padding: '20px', textAlign: 'center', color: 'var(--text-tertiary)', fontSize: '13px', background: 'var(--bg-tertiary)', borderRadius: '6px' }}>
              Sin alias definidos.
            </div>
          ) : (
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
              {alias.map(a => (
                <div key={a.id} style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', background: 'var(--bg-tertiary)', border: '1px solid var(--border-subtle)', borderRadius: '6px', padding: '6px 12px', fontSize: '12px' }}>
                  <span style={{ color: 'var(--text-secondary)' }}>{a.alias_texto}</span>
                  <Icon name="arrowRight" size={12} style={{ color: 'var(--text-tertiary)' }} />
                  <strong style={{ color: ACCENT }}>{a.corte_canonico}</strong>
                </div>
              ))}
            </div>
          )}
        </div>
      </SectionCard>

      {/* Historial de corridas */}
      <SectionCard title="Historial de corridas">
        {runs.length === 0 ? (
          <div style={{ padding: '20px', textAlign: 'center', color: 'var(--text-tertiary)', fontSize: '13px' }}>
            Todavía no se ejecutó ninguna corrida.
          </div>
        ) : (
          <div>
            <div style={{ display: 'grid', gridTemplateColumns: 'minmax(140px,1.5fr) 110px 70px minmax(160px,2fr) 130px', gap: '12px', padding: '0 0 8px', borderBottom: '1px solid var(--border-subtle)' }}>
              {['Fuente', 'Estado', 'Filas', 'Mensaje', 'Fecha'].map((h, i) => (
                <div key={h} style={{ fontSize: '11px', color: 'var(--text-tertiary)', letterSpacing: '0.05em', fontWeight: 500, textAlign: i === 2 ? 'right' : 'left' }}>{h}</div>
              ))}
            </div>
            {runs.map((r, i) => {
              const em = ESTADO_META[r.estado] || { label: r.estado, color: 'var(--text-tertiary)' };
              return (
                <div key={r.id} style={{ display: 'grid', gridTemplateColumns: 'minmax(140px,1.5fr) 110px 70px minmax(160px,2fr) 130px', gap: '12px', alignItems: 'center', padding: '10px 0', borderBottom: i < runs.length - 1 ? '1px solid var(--border-subtle)' : 'none' }}>
                  <span style={{ fontSize: '13px', color: 'var(--text-primary)' }}>{r.fuente_nombre || '—'}</span>
                  <div><StatusBadge label={em.label} color={em.color} /></div>
                  <span style={{ fontSize: '13px', fontFamily: 'var(--font-mono)', color: 'var(--text-secondary)', textAlign: 'right' }}>{r.filas_insertadas}</span>
                  <span style={{ fontSize: '12px', color: 'var(--text-tertiary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={r.mensaje || ''}>{r.mensaje || '—'}</span>
                  <span style={{ fontSize: '12px', fontFamily: 'var(--font-mono)', color: 'var(--text-tertiary)' }}>{String(r.started_at).replace('T', ' ').slice(0, 16)}</span>
                </div>
              );
            })}
          </div>
        )}
      </SectionCard>
    </div>
  );
}
