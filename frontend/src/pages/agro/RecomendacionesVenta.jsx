import { useState, useEffect } from 'react';
import { apiFetch } from '../../config/api';

export default function RecomendacionesVenta({ negocioId }) {
  const [items, setItems] = useState([]);
  const [resumen, setResumen] = useState(null);
  const [modo, setModo] = useState('heuristico');
  const [cargando, setCargando] = useState(false);

  async function cargar() {
    setCargando(true);
    try {
      const data = await apiFetch(`/api/negocios/${negocioId}/recomendaciones`);
      setItems(data.items || []); setResumen(data.resumen || null); setModo(data.modo || 'heuristico');
    } catch (e) { console.error(e); }
    setCargando(false);
  }
  useEffect(() => { if (negocioId) cargar(); }, [negocioId]);

  function exportarCSV() {
    const cols = ['corte_canonico', 'canal_sugerido', 'precio_referencia', 'costo_kg', 'margen_kg',
                  'kg_disponibles', 'ingreso_estimado', 'tendencia', 'accion'];
    const head = cols.join(',');
    const rows = items.map(i => cols.map(c => i[c] ?? '').join(','));
    const blob = new Blob([[head, ...rows].join('\n')], { type: 'text/csv' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob); a.download = 'recomendaciones_venta.csv'; a.click();
  }

  return (
    <div style={{ padding: 24 }}>
      <style>{`@media print { button { display: none } }`}</style>
      <h2>Recomendaciones de venta {modo === 'forecast' ? '🔮' : ''}</h2>
      <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
        <button onClick={cargar}>Actualizar / re-calcular</button>
        <button onClick={exportarCSV}>Exportar CSV</button>
        <button onClick={() => window.print()}>Exportar PDF (imprimir)</button>
      </div>
      {resumen && <p><strong>Ingreso estimado total:</strong> {Number(resumen.ingreso_total).toFixed(2)} ·
        <strong> Margen total:</strong> {Number(resumen.margen_total).toFixed(2)}</p>}
      {cargando ? <p>Calculando…</p> : items.length === 0 ? <p>No hay datos suficientes. Configurá fuentes y ejecutá scraping primero.</p> : (
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead><tr>
            <th>Corte</th><th>Canal sugerido</th><th>Precio/kg</th><th>Costo/kg</th>
            <th>Margen/kg</th><th>Kg disp.</th><th>Ingreso est.</th><th>Tendencia</th><th>Acción</th>
          </tr></thead>
          <tbody>{items.map((i, idx) => (
            <tr key={idx} style={{ borderTop: '1px solid #ddd' }}>
              <td>{i.corte_canonico}</td><td>{i.canal_sugerido}</td>
              <td>{Number(i.precio_referencia).toFixed(2)}</td><td>{Number(i.costo_kg).toFixed(2)}</td>
              <td style={{ color: i.margen_kg >= 0 ? 'green' : 'crimson' }}>{Number(i.margen_kg).toFixed(2)}</td>
              <td>{Number(i.kg_disponibles).toFixed(1)}</td><td>{Number(i.ingreso_estimado).toFixed(2)}</td>
              <td>{i.tendencia || '—'}</td>
              <td>{i.accion === 'vender_ahora' ? '✅ Vender' : i.accion === 'esperar' ? '⏳ Esperar' : '—'}</td>
            </tr>))}</tbody>
        </table>
      )}
    </div>
  );
}
