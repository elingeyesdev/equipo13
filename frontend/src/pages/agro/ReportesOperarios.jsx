import { useState, useEffect } from 'react';
import { apiFetch } from '../../config/api.js';
import { Icon } from '../../icons.jsx';
import { MetricCard } from '../../components/ui.jsx';

const ACCENT = 'var(--accent-agro)';

function ProgressBar({ value, total, color }) {
  const pct = total > 0 ? Math.round((value / total) * 100) : 0;
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
      <div style={{ flex: 1, minWidth: '60px', maxWidth: '120px', height: '6px', background: 'var(--bg-tertiary)', borderRadius: '3px', overflow: 'hidden' }}>
        <div style={{ height: '100%', width: `${pct}%`, background: color, borderRadius: '3px', transition: 'width 0.5s cubic-bezier(0.4,0,0.2,1)' }} />
      </div>
      <span style={{ fontSize: '13px', fontFamily: 'var(--font-mono)', color: 'var(--text-secondary)', whiteSpace: 'nowrap' }}>
        {value}<span style={{ color: 'var(--text-tertiary)' }}>/{total}</span>
        {total > 0 && <span style={{ color, marginLeft: '6px', fontSize: '11px' }}>{pct}%</span>}
      </span>
    </div>
  );
}

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

  const totales = reportes.reduce((acc, r) => ({
    tareas: acc.tareas + (r.tareas_completadas || 0),
    eventos: acc.eventos + (r.total_eventos || 0),
    bajas: acc.bajas + (r.eventos_baja || 0),
    incidentes: acc.incidentes + (r.eventos_incidente || 0),
  }), { tareas: 0, eventos: 0, bajas: 0, incidentes: 0 });

  const GRID = 'minmax(140px,1.4fr) minmax(160px,1.6fr) minmax(160px,1.6fr) 90px 90px 90px';
  const HEADERS = [
    ['Operario', 'left'], ['Tareas completadas', 'left'], ['Rutinas (checklist)', 'left'],
    ['Eventos', 'right'], ['Bajas', 'right'], ['Incidentes', 'right'],
  ];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      {/* Header */}
      <div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <h1 style={{ fontSize: '22px', fontWeight: 400, color: 'var(--text-primary)', letterSpacing: '-0.02em' }}>Productividad de operarios</h1>
          <span style={{ background: ACCENT + '1A', color: ACCENT, border: `1px solid ${ACCENT}33`, borderRadius: '5px', padding: '2px 10px', fontSize: '12px', fontFamily: 'var(--font-mono)', fontWeight: 500 }}>{reportes.length}</span>
        </div>
        <p style={{ fontSize: '13px', color: 'var(--text-tertiary)', marginTop: '4px' }}>Desempeño del equipo: tareas, rutinas y eventos reportados por cada operario.</p>
      </div>

      {error && (
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', color: 'var(--accent-danger)', background: 'var(--bg-secondary)', border: '1px solid var(--accent-danger)33', borderLeft: '3px solid var(--accent-danger)', borderRadius: '6px', padding: '10px 14px' }}>
          <Icon name="alertTriangle" size={14} />{error}
        </div>
      )}

      {/* Resumen */}
      {!cargando && reportes.length > 0 && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '12px' }}>
          <MetricCard label="Tareas completadas" value={totales.tareas} mono icon={<Icon name="checkCircle" size={16} />} accentColor={ACCENT} />
          <MetricCard label="Eventos totales" value={totales.eventos} mono icon={<Icon name="bell" size={16} />} />
          <MetricCard label="Bajas reportadas" value={totales.bajas} mono icon={<Icon name="alertCircle" size={16} />} accentColor={totales.bajas > 0 ? 'var(--accent-danger)' : undefined} />
          <MetricCard label="Incidentes" value={totales.incidentes} mono icon={<Icon name="alertTriangle" size={16} />} accentColor={totales.incidentes > 0 ? 'var(--accent-warning)' : undefined} />
        </div>
      )}

      {/* Tabla */}
      <div style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border-subtle)', borderRadius: '8px', overflow: 'hidden' }}>
        <div style={{ display: 'grid', gridTemplateColumns: GRID, gap: '12px', padding: '10px 16px', borderBottom: '1px solid var(--border-subtle)' }}>
          {HEADERS.map(([h, a]) => (
            <div key={h} style={{ fontSize: '11px', color: 'var(--text-tertiary)', letterSpacing: '0.05em', fontWeight: 500, textAlign: a }}>{h}</div>
          ))}
        </div>

        {cargando ? (
          <div style={{ padding: '40px', textAlign: 'center', color: 'var(--text-tertiary)', fontSize: '14px' }}>Cargando reporte…</div>
        ) : reportes.length === 0 ? (
          <div style={{ padding: '40px', textAlign: 'center', color: 'var(--text-tertiary)', fontSize: '14px' }}>
            <Icon name="barChart" size={28} style={{ color: 'var(--text-tertiary)', opacity: 0.5 }} />
            <div style={{ marginTop: '10px' }}>No hay datos de productividad disponibles.</div>
          </div>
        ) : reportes.map((r, idx) => (
          <div key={r.id} style={{ display: 'grid', gridTemplateColumns: GRID, gap: '12px', padding: '12px 16px', borderBottom: idx < reportes.length - 1 ? '1px solid var(--border-subtle)' : 'none', alignItems: 'center', transition: 'background 0.1s' }}
            onMouseEnter={e => e.currentTarget.style.background = 'var(--bg-tertiary)'}
            onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '9px' }}>
              <span style={{ width: 28, height: 28, borderRadius: '50%', background: ACCENT + '1A', color: ACCENT, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontSize: '12px', fontWeight: 600, flexShrink: 0 }}>
                {(r.nombre || '?').charAt(0).toUpperCase()}
              </span>
              <span style={{ fontSize: '13px', color: 'var(--text-primary)', fontWeight: 500 }}>{r.nombre}</span>
            </div>
            <ProgressBar value={r.tareas_completadas} total={r.total_tareas} color={ACCENT} />
            <ProgressBar value={r.checklist_completados} total={r.total_checklist} color="var(--accent-industrial)" />
            <span style={{ fontSize: '13px', fontFamily: 'var(--font-mono)', color: 'var(--text-secondary)', textAlign: 'right' }}>{r.total_eventos}</span>
            <span style={{ fontSize: '13px', fontFamily: 'var(--font-mono)', textAlign: 'right', color: r.eventos_baja > 0 ? 'var(--accent-danger)' : 'var(--text-tertiary)', fontWeight: r.eventos_baja > 0 ? 600 : 400 }}>{r.eventos_baja}</span>
            <span style={{ fontSize: '13px', fontFamily: 'var(--font-mono)', textAlign: 'right', color: r.eventos_incidente > 0 ? 'var(--accent-warning)' : 'var(--text-tertiary)', fontWeight: r.eventos_incidente > 0 ? 600 : 400 }}>{r.eventos_incidente}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
