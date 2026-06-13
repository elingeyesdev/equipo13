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
      {negocioId && <AlertasPrecio negocioId={negocioId} />}
    </div>
  );
}

function AlertasPrecio({ negocioId }) {
  const [alertas, setAlertas] = useState([]);
  const [expandido, setExpandido] = useState(false);

  useEffect(() => {
    apiFetch(`/api/negocios/${negocioId}/alertas-precio`)
      .then(d => setAlertas(d.alertas || []))
      .catch(() => {});
  }, [negocioId]);

  if (alertas.length === 0) return null;

  return (
    <div style={{ marginTop: 24, border: '1px solid #f59e0b', borderRadius: 8, padding: 16, background: '#fffbeb' }}>
      <div
        style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer' }}
        onClick={() => setExpandido(e => !e)}
        id="alertas-precio-toggle"
      >
        <span style={{
          background: '#ef4444', color: '#fff', borderRadius: 999,
          padding: '2px 10px', fontWeight: 700, fontSize: 14,
        }}>{alertas.length}</span>
        <strong>⚠️ Alertas de cambio de precio</strong>
        <span style={{ marginLeft: 'auto', fontSize: 12 }}>{expandido ? '▲ ocultar' : '▼ ver'}</span>
      </div>
      {expandido && (
        <table style={{ width: '100%', borderCollapse: 'collapse', marginTop: 12 }}>
          <thead><tr style={{ background: '#fef3c7' }}>
            <th style={{ textAlign: 'left', padding: '4px 8px' }}>Corte</th>
            <th style={{ textAlign: 'left', padding: '4px 8px' }}>Canal</th>
            <th style={{ textAlign: 'right', padding: '4px 8px' }}>Precio nuevo</th>
            <th style={{ textAlign: 'right', padding: '4px 8px' }}>Promedio ant.</th>
            <th style={{ textAlign: 'right', padding: '4px 8px' }}>Variación %</th>
            <th style={{ textAlign: 'left', padding: '4px 8px' }}>Fecha</th>
          </tr></thead>
          <tbody>{alertas.map((a, i) => (
            <tr key={i} style={{ borderTop: '1px solid #fde68a' }}>
              <td style={{ padding: '4px 8px' }}>{a.corte_canonico}</td>
              <td style={{ padding: '4px 8px' }}>{a.canal}</td>
              <td style={{ textAlign: 'right', padding: '4px 8px' }}>{Number(a.precio_nuevo).toFixed(2)}</td>
              <td style={{ textAlign: 'right', padding: '4px 8px' }}>{Number(a.precio_promedio).toFixed(2)}</td>
              <td style={{
                textAlign: 'right', padding: '4px 8px',
                color: a.variacion_pct > 0 ? '#16a34a' : '#dc2626', fontWeight: 600,
              }}>{a.variacion_pct > 0 ? '+' : ''}{Number(a.variacion_pct).toFixed(2)}%</td>
              <td style={{ padding: '4px 8px', fontSize: 12 }}>{a.created_at?.slice(0, 16) || '—'}</td>
            </tr>
          ))}</tbody>
        </table>
      )}
    </div>
  );
}
