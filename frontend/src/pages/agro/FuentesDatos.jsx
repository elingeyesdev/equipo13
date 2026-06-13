import { useState, useEffect } from 'react';
import { API_URL } from '../../config/api';

export default function FuentesDatos({ negocioId }) {
  const [fuentes, setFuentes] = useState([]);
  const [alias, setAlias] = useState([]);
  const [runs, setRuns] = useState([]);
  const [form, setForm] = useState({ nombre: '', url: '', tipo: 'static', canal: 'minorista', config: '{}' });
  const [aliasForm, setAliasForm] = useState({ alias_texto: '', corte_canonico: '' });
  const [msg, setMsg] = useState(null);
  const token = localStorage.getItem('token');
  const headers = { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` };

  async function cargar() {
    const [f, a, r] = await Promise.all([
      fetch(`${API_URL}/api/negocios/${negocioId}/fuentes-scraping`, { headers }),
      fetch(`${API_URL}/api/negocios/${negocioId}/corte-alias`, { headers }),
      fetch(`${API_URL}/api/negocios/${negocioId}/scrape-runs`, { headers }),
    ]);
    setFuentes(await f.json()); setAlias(await a.json()); setRuns(await r.json());
  }
  useEffect(() => { if (negocioId) cargar(); }, [negocioId]);

  async function crearFuente() {
    let config; try { config = JSON.parse(form.config); } catch { setMsg('Config no es JSON válido'); return; }
    await fetch(`${API_URL}/api/negocios/${negocioId}/fuentes-scraping`, {
      method: 'POST', headers, body: JSON.stringify({ ...form, config }) });
    setForm({ nombre: '', url: '', tipo: 'static', canal: 'minorista', config: '{}' }); cargar();
  }
  async function crearAlias() {
    await fetch(`${API_URL}/api/negocios/${negocioId}/corte-alias`, {
      method: 'POST', headers, body: JSON.stringify(aliasForm) });
    setAliasForm({ alias_texto: '', corte_canonico: '' }); cargar();
  }
  async function ejecutar() {
    setMsg('Ejecutando scraping…');
    const res = await fetch(`${API_URL}/api/negocios/${negocioId}/scraping/run`, { method: 'POST', headers });
    const data = await res.json();
    setMsg(res.ok ? `Listo: ${data.filas_insertadas} precios guardados.` : `Error: ${data.error}`);
    cargar();
  }

  return (
    <div style={{ padding: 24 }}>
      <h2>Fuentes de datos de mercado</h2>
      {msg && <p>{msg}</p>}
      <button onClick={ejecutar} style={{ padding: '8px 16px', marginBottom: 16 }}>Ejecutar scraping ahora</button>

      <h3>Fuentes</h3>
      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 8 }}>
        <input placeholder="Nombre" value={form.nombre} onChange={e => setForm({ ...form, nombre: e.target.value })} />
        <input placeholder="URL" value={form.url} onChange={e => setForm({ ...form, url: e.target.value })} style={{ flex: 1 }} />
        <select value={form.tipo} onChange={e => setForm({ ...form, tipo: e.target.value })}>
          <option value="static">static</option><option value="json_api">json_api</option>
          <option value="js">js</option><option value="pdf">pdf</option>
        </select>
        <select value={form.canal} onChange={e => setForm({ ...form, canal: e.target.value })}>
          <option value="minorista">minorista</option><option value="mayorista">mayorista</option>
        </select>
        <button onClick={crearFuente}>Agregar</button>
      </div>
      <textarea placeholder='config JSON (selectores/endpoint)' value={form.config}
        onChange={e => setForm({ ...form, config: e.target.value })} style={{ width: '100%', height: 60 }} />
      <ul>{fuentes.map(f => <li key={f.id}>{f.nombre} · {f.tipo} · {f.canal} · <code>{f.url}</code> {f.activo ? '' : '(inactiva)'}</li>)}</ul>

      <h3>Alias de cortes</h3>
      <div style={{ display: 'flex', gap: 6, marginBottom: 8 }}>
        <input placeholder="Texto scrapeado (ej: pierna de cerdo frigor)" value={aliasForm.alias_texto}
          onChange={e => setAliasForm({ ...aliasForm, alias_texto: e.target.value })} style={{ flex: 1 }} />
        <input placeholder="Corte canónico (ej: Pierna)" value={aliasForm.corte_canonico}
          onChange={e => setAliasForm({ ...aliasForm, corte_canonico: e.target.value })} />
        <button onClick={crearAlias}>Agregar</button>
      </div>
      <ul>{alias.map(a => <li key={a.id}>{a.alias_texto} → <strong>{a.corte_canonico}</strong></li>)}</ul>

      <h3>Historial de corridas</h3>
      <table style={{ width: '100%', borderCollapse: 'collapse' }}>
        <thead><tr><th>Fuente</th><th>Estado</th><th>Filas</th><th>Mensaje</th><th>Fecha</th></tr></thead>
        <tbody>{runs.map(r => (
          <tr key={r.id} style={{ borderTop: '1px solid #ddd' }}>
            <td>{r.fuente_nombre || '—'}</td>
            <td style={{ color: r.estado === 'error' ? 'crimson' : r.estado === 'ok' ? 'green' : '#b58900' }}>{r.estado}</td>
            <td>{r.filas_insertadas}</td><td>{r.mensaje || ''}</td>
            <td>{String(r.started_at).replace('T', ' ').slice(0, 16)}</td>
          </tr>))}</tbody>
      </table>
    </div>
  );
}
