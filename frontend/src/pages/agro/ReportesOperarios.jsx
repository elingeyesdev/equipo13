import { useState, useEffect } from 'react';
import { apiFetch } from '../../config/api.js';

export default function ReportesOperarios({ negocioId }) {
  const [reportes, setReportes] = useState([]);
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    async function cargar() {
      setCargando(true);
      setError(null);
      try {
        const data = await apiFetch(`/api/negocios/${negocioId}/operarios/reportes`);
        setReportes(Array.isArray(data) ? data : []);
      } catch (e) {
        setError(e.error || 'Error al cargar los reportes de productividad');
      } finally {
        setCargando(false);
      }
    }
    if (negocioId) cargar();
  }, [negocioId]);

  return (
    <div style={{ padding: 24, maxWidth: 1000, margin: '0 auto' }}>
      <h2 style={{ fontSize: '1.5rem', fontWeight: 'bold', marginBottom: 24 }}>Reporte de Productividad (Operarios)</h2>

      {error && <p style={{ color: 'var(--accent-danger)', marginBottom: 16 }}>{error}</p>}

      {cargando ? <p style={{ color: 'var(--text-secondary)' }}>Cargando reporte...</p> : (
        <div style={{ background: 'var(--bg-secondary)', borderRadius: 8, border: '1px solid var(--border-subtle)', overflow: 'hidden' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', color: 'var(--text-primary)' }}>
            <thead>
              <tr style={{ background: 'var(--bg-tertiary)', borderBottom: '2px solid var(--border-subtle)' }}>
                <th style={{ padding: 12 }}>Operario</th>
                <th style={{ padding: 12 }}>Tareas Completadas</th>
                <th style={{ padding: 12 }}>Rutinas (Checklist)</th>
                <th style={{ padding: 12 }}>Eventos Totales</th>
                <th style={{ padding: 12 }}>Bajas Reportadas</th>
                <th style={{ padding: 12 }}>Incidentes</th>
              </tr>
            </thead>
            <tbody>
              {reportes.length === 0 ? (
                <tr><td colSpan={6} style={{ padding: 16, textAlign: 'center', color: 'var(--text-tertiary)' }}>No hay datos disponibles.</td></tr>
              ) : reportes.map(r => {
                const pctTareas = r.total_tareas > 0 ? Math.round((r.tareas_completadas / r.total_tareas) * 100) : 0;
                const pctChecklist = r.total_checklist > 0 ? Math.round((r.checklist_completados / r.total_checklist) * 100) : 0;

                return (
                  <tr key={r.id} style={{ borderBottom: '1px solid var(--border-subtle)' }}>
                    <td style={{ padding: 12, fontWeight: '500' }}>{r.nombre}</td>
                    <td style={{ padding: 12 }}>
                      {r.tareas_completadas} / {r.total_tareas}
                      {r.total_tareas > 0 && <span style={{ marginLeft: 8, fontSize: '0.85em', color: 'var(--text-tertiary)' }}>({pctTareas}%)</span>}
                    </td>
                    <td style={{ padding: 12 }}>
                      {r.checklist_completados} / {r.total_checklist}
                      {r.total_checklist > 0 && <span style={{ marginLeft: 8, fontSize: '0.85em', color: 'var(--text-tertiary)' }}>({pctChecklist}%)</span>}
                    </td>
                    <td style={{ padding: 12 }}>{r.total_eventos}</td>
                    <td style={{ padding: 12, color: r.eventos_baja > 0 ? 'var(--accent-danger)' : 'inherit' }}>{r.eventos_baja}</td>
                    <td style={{ padding: 12, color: r.eventos_incidente > 0 ? 'var(--accent-warning)' : 'inherit' }}>{r.eventos_incidente}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
