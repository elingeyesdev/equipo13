import { useState, useEffect } from 'react';
import { apiFetch } from '../config/api.js';

export default function Operarios({ negocioId }) {
  const [operarios, setOperarios] = useState([]);
  const [lotes, setLotes] = useState([]);
  const [codigoNegocio, setCodigoNegocio] = useState(null);
  const [nuevoNombre, setNuevoNombre] = useState('');
  const [credenciales, setCredenciales] = useState(null); // {username, pin_temporal} recién creados
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState(null);

  async function cargar() {
    setCargando(true);
    setError(null);
    try {
      const [ops, lts, neg] = await Promise.all([
        apiFetch(`/api/negocios/${negocioId}/operarios`),
        apiFetch(`/api/negocios/${negocioId}/lotes`),
        apiFetch(`/api/negocios/${negocioId}`),
      ]);
      setOperarios(Array.isArray(ops) ? ops : []);
      setLotes(Array.isArray(lts) ? lts : []);
      setCodigoNegocio(neg?.codigo || null);
    } catch (e) {
      setError(e.error || 'No se pudieron cargar los operarios');
    } finally {
      setCargando(false);
    }
  }
  useEffect(() => { if (negocioId) cargar(); }, [negocioId]);

  async function crear() {
    if (!nuevoNombre.trim()) return;
    setError(null);
    try {
      const data = await apiFetch(`/api/negocios/${negocioId}/operarios`, {
        method: 'POST', body: JSON.stringify({ nombre: nuevoNombre }),
      });
      setCredenciales(data); // mostrar usuario + PIN temporal UNA vez
      setNuevoNombre('');
      cargar();
    } catch (e) {
      setError(e.error || 'No se pudo crear el operario');
    }
  }

  async function resetPin(operarioId) {
    setError(null);
    try {
      const data = await apiFetch(`/api/negocios/${negocioId}/operarios/${operarioId}/reset-pin`, {
        method: 'POST',
      });
      setCredenciales({ username: '(sin cambio)', pin_temporal: data.pin_temporal });
    } catch (e) {
      setError(e.error || 'No se pudo resetear el PIN');
    }
  }

  async function toggleActivo(operarioId, activoActual) {
    setError(null);
    try {
      await apiFetch(`/api/negocios/${negocioId}/operarios/${operarioId}`, {
        method: 'PATCH', body: JSON.stringify({ activo: !activoActual }),
      });
      cargar();
    } catch (e) {
      setError(e.error || 'No se pudo cambiar el estado');
    }
  }

  async function toggleAsignacion(operarioId, loteId, asignado) {
    setError(null);
    try {
      if (asignado) {
        await apiFetch(`/api/negocios/${negocioId}/operarios/${operarioId}/lotes/${loteId}`, { method: 'DELETE' });
      } else {
        await apiFetch(`/api/negocios/${negocioId}/operarios/${operarioId}/lotes`, {
          method: 'POST', body: JSON.stringify({ lote_id: loteId }),
        });
      }
      cargar();
    } catch (e) {
      setError(e.error || 'No se pudo actualizar la asignación');
    }
  }

  return (
    <div style={{ padding: 24 }}>
      <h2>Operarios</h2>

      <div style={{ background: '#e3f2fd', border: '1px solid #90caf9', padding: 12, marginBottom: 16, borderRadius: 6, color: '#0d47a1' }}>
        Código de este negocio (los operarios lo necesitan para ingresar en la app):{' '}
        <code style={{ fontSize: 18, fontWeight: 700 }}>{codigoNegocio || '—'}</code>
      </div>

      {error && <p style={{ color: 'crimson' }}>{error}</p>}

      <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
        <input placeholder="Nombre del operario" value={nuevoNombre}
               onChange={e => setNuevoNombre(e.target.value)}
               style={{ padding: 8, flex: 1 }} />
        <button onClick={crear} style={{ padding: '8px 16px' }}>Crear operario</button>
      </div>

      {credenciales && (
        <div style={{ background: '#e8f5e9', border: '1px solid #66bb6a', padding: 12, marginBottom: 16, borderRadius: 6, color: '#1b5e20' }}>
          <strong>Credenciales temporales (anótalas, no se vuelven a mostrar):</strong>
          <div>Usuario: <code>{credenciales.username}</code></div>
          <div>PIN: <code>{credenciales.pin_temporal}</code></div>
          <button onClick={() => setCredenciales(null)} style={{ marginTop: 8 }}>Cerrar</button>
        </div>
      )}

      {cargando ? <p>Cargando…</p> : (
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead><tr><th>Nombre</th><th>Usuario</th><th>Estado</th><th>Lotes asignados</th><th>Acciones</th></tr></thead>
          <tbody>
            {operarios.length === 0 ? (
              <tr><td colSpan={5} style={{ padding: 12, color: '#888' }}>No hay operarios todavía.</td></tr>
            ) : operarios.map(op => (
              <tr key={op.id} style={{ borderTop: '1px solid #ddd' }}>
                <td>{op.nombre}</td>
                <td><code>{op.username}</code></td>
                <td>{op.activo ? (op.bloqueado ? '🔒 Bloqueado' : '✅ Activo') : '⛔ Inactivo'}</td>
                <td>
                  {lotes.map(l => {
                    const asignado = (op.lotes || []).some(x => x.lote_id === l.id);
                    return (
                      <label key={l.id} style={{ marginRight: 8 }}>
                        <input type="checkbox" checked={asignado}
                               onChange={() => toggleAsignacion(op.id, l.id, asignado)} />
                        {l.identificador}
                      </label>
                    );
                  })}
                </td>
                <td style={{ whiteSpace: 'nowrap' }}>
                  <button onClick={() => resetPin(op.id)}>Reset PIN</button>{' '}
                  <button onClick={() => toggleActivo(op.id, op.activo)}>
                    {op.activo ? 'Desactivar' : 'Activar'}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
