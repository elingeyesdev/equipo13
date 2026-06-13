import { useState, useEffect } from 'react';
import { apiFetch, API_BASE } from '../../config/api.js';

export default function Pendientes({ negocioId }) {
  const [registros, setRegistros] = useState([]);
  const [bajas, setBajas] = useState([]);
  const [incidentes, setIncidentes] = useState([]);
  const [stockBajo, setStockBajo] = useState([]);
  const [msg, setMsg] = useState(null);

  async function cargar() {
    try {
      const [rData, bData, iData, sData] = await Promise.all([
        apiFetch(`/api/negocios/${negocioId}/pendientes/registros`),
        apiFetch(`/api/negocios/${negocioId}/eventos?estado=pendiente&tipo=baja`),
        apiFetch(`/api/negocios/${negocioId}/eventos?tipo=incidente`),
        apiFetch(`/api/negocios/${negocioId}/eventos?tipo=stock_bajo`),
      ]);
      setRegistros(Array.isArray(rData) ? rData : []);
      setBajas(Array.isArray(bData) ? bData : []);
      setIncidentes(Array.isArray(iData) ? iData : []);
      setStockBajo(Array.isArray(sData) ? sData : []);
    } catch (e) {
      setMsg({ tipo: 'error', texto: e.error || 'Error al cargar pendientes' });
    }
  }
  useEffect(() => { if (negocioId) cargar(); }, [negocioId]);

  async function confirmar(loteId, fecha) {
    setMsg(null);
    try {
      await apiFetch(`/api/negocios/${negocioId}/lotes/${loteId}/hoja-de-vida/${fecha}/confirmar`, { method: 'POST' });
      setMsg({ tipo: 'ok', texto: 'Día confirmado y costos aplicados (FIFO).' });
      cargar();
    } catch (e) {
      setMsg({ tipo: 'error', texto: e.error || 'No se pudo confirmar el registro' });
    }
  }

  async function gestionarBaja(eventoId, accion) {
    setMsg(null);
    try {
      await apiFetch(`/api/negocios/${negocioId}/pendientes/bajas/${eventoId}/${accion}`, { method: 'POST' });
      setMsg({ tipo: 'ok', texto: `Baja ${accion === 'aprobar' ? 'aprobada' : 'rechazada'} exitosamente.` });
      cargar();
    } catch (e) {
      setMsg({ tipo: 'error', texto: e.error || 'Error al gestionar baja' });
    }
  }

  const renderFotos = (fotos) => {
    if (!fotos || !fotos.length) return 'Sin fotos';
    return fotos.map((f, i) => (
      <img key={i} src={API_BASE + f} alt="evidencia" style={{ height: 40, marginRight: 5, borderRadius: 4, objectFit: 'cover' }} />
    ));
  };

  return (
    <div style={{ padding: 24, display: 'flex', flexDirection: 'column', gap: '2rem' }}>
      {msg && <p style={{ color: msg.tipo === 'error' ? 'crimson' : 'green' }}>{msg.texto}</p>}

      <section>
        <h2>Hojas de Vida (Borradores diarios)</h2>
        {registros.length === 0 ? <p>No hay hojas de vida pendientes. 🎉</p> : (
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead><tr style={{textAlign:'left'}}><th>Lote</th><th>Fecha</th><th>Ítems</th><th>Notas</th><th>Acción</th></tr></thead>
            <tbody>
              {registros.map(r => (
                <tr key={r.id} style={{ borderTop: '1px solid #ddd' }}>
                  <td style={{padding:'8px 0'}}>{r.lote_identificador}</td>
                  <td>{String(r.fecha).split('T')[0]}</td>
                  <td>{r.items_count}</td>
                  <td>{r.notas_del_dia || '—'}</td>
                  <td><button onClick={() => confirmar(r.lote_id, String(r.fecha).split('T')[0])}>Confirmar</button></td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>

      <section>
        <h2>Bajas Reportadas (Pendientes)</h2>
        {bajas.length === 0 ? <p>No hay bajas pendientes de aprobación.</p> : (
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead><tr style={{textAlign:'left'}}><th>Fecha</th><th>Lote</th><th>Operario</th><th>Cabezas</th><th>Causa</th><th>Fotos</th><th>Acciones</th></tr></thead>
            <tbody>
              {bajas.map(b => (
                <tr key={b.id} style={{ borderTop: '1px solid #ddd' }}>
                  <td style={{padding:'8px 0'}}>{new Date(b.created_at).toLocaleString()}</td>
                  <td>{b.lote_identificador}</td>
                  <td>{b.operario_nombre}</td>
                  <td>{b.payload?.cabezas}</td>
                  <td>{b.payload?.causa}</td>
                  <td>{renderFotos(b.fotos)}</td>
                  <td>
                    <button onClick={() => gestionarBaja(b.id, 'aprobar')} style={{ marginRight: 8, background: '#4caf50', color: 'white', border: 'none', padding: '4px 8px', borderRadius: 4, cursor: 'pointer' }}>Aprobar</button>
                    <button onClick={() => gestionarBaja(b.id, 'rechazar')} style={{ background: '#f44336', color: 'white', border: 'none', padding: '4px 8px', borderRadius: 4, cursor: 'pointer' }}>Rechazar</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>

      <section>
        <h2>Incidentes y Stock Bajo</h2>
        {incidentes.length === 0 && stockBajo.length === 0 ? <p>No hay reportes de incidentes ni stock bajo.</p> : (
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead><tr style={{textAlign:'left'}}><th>Fecha</th><th>Lote</th><th>Operario</th><th>Tipo</th><th>Detalle</th><th>Fotos</th></tr></thead>
            <tbody>
              {[...incidentes, ...stockBajo].sort((a,b) => new Date(b.created_at) - new Date(a.created_at)).map(e => (
                <tr key={e.id} style={{ borderTop: '1px solid #ddd' }}>
                  <td style={{padding:'8px 0'}}>{new Date(e.created_at).toLocaleString()}</td>
                  <td>{e.lote_identificador}</td>
                  <td>{e.operario_nombre}</td>
                  <td><span style={{ padding: '2px 8px', borderRadius: 12, fontSize: 12, background: e.tipo === 'incidente' ? '#fff3cd' : '#f8d7da' }}>{e.tipo}</span></td>
                  <td>
                    {e.tipo === 'incidente' 
                      ? `${e.payload?.categoria || ''}: ${e.payload?.descripcion || ''}`
                      : `${e.payload?.nombre || 'Insumo'} a nivel ${e.payload?.nivel || ''}`
                    }
                  </td>
                  <td>{renderFotos(e.fotos)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>
    </div>
  );
}
