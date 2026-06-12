import { useState, useEffect } from 'react';
import { API_URL } from '../../config/api';

export default function Pendientes({ negocioId }) {
  const [registros, setRegistros] = useState([]);
  const [msg, setMsg] = useState(null);
  const token = localStorage.getItem('cu_token');
  const headers = { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` };

  async function cargar() {
    const res = await fetch(`${API_URL}/api/negocios/${negocioId}/pendientes/registros`, { headers });
    setRegistros(await res.json());
  }
  useEffect(() => { if (negocioId) cargar(); }, [negocioId]);

  async function confirmar(loteId, fecha) {
    setMsg(null);
    const res = await fetch(`${API_URL}/api/negocios/${negocioId}/lotes/${loteId}/hoja-de-vida/${fecha}/confirmar`, {
      method: 'POST', headers,
    });
    const data = await res.json();
    if (!res.ok) { setMsg({ tipo: 'error', texto: data.error }); return; }
    setMsg({ tipo: 'ok', texto: 'Día confirmado y costos aplicados (FIFO).' });
    cargar();
  }

  return (
    <div style={{ padding: 24 }}>
      <h2>Pendientes de confirmar</h2>
      {msg && <p style={{ color: msg.tipo === 'error' ? 'crimson' : 'green' }}>{msg.texto}</p>}
      {registros.length === 0 ? <p>No hay registros pendientes. 🎉</p> : (
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead><tr><th>Lote</th><th>Fecha</th><th>Ítems</th><th>Notas</th><th></th></tr></thead>
          <tbody>
            {registros.map(r => (
              <tr key={r.id} style={{ borderTop: '1px solid #ddd' }}>
                <td>{r.lote_identificador}</td>
                <td>{String(r.fecha).split('T')[0]}</td>
                <td>{r.items_count}</td>
                <td>{r.notas_del_dia || '—'}</td>
                <td><button onClick={() => confirmar(r.lote_id, String(r.fecha).split('T')[0])}>Confirmar</button></td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
