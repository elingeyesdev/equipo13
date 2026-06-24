import React, { useState } from 'react';
import { Icon } from '../icons.jsx';
import { RubroBadge, Btn, MetricCard, MoneyDisplay, StatusBadge, SectionCard, InfoTip } from '../components/ui.jsx';
import { apiFetch } from '../config/api.js';
import DashboardAgro from './dashboard/DashboardAgro.jsx';

/* ── INDUSTRIAL dashboard ─────────────────────────────────── */
const DashboardIndustrial = ({ negocio, onNavigate }) => {
  const negocioId = negocio.id;
  const accentColor = 'var(--accent-industrial)';

  const [ultimasFichas, setUltimasFichas] = useState([]);
  const [metricas, setMetricas] = useState({
    productos: 0,
    insumos: 0,
    ultimaFicha: 'Ninguna',
    ultimaFichaProd: '—',
    productosSinFicha: '—',
    fichasEsteMes: '—',
    actividad: []
  });

  const currentMonthText = React.useMemo(() => new Date().toLocaleDateString('es-BO', { month: 'long', year: 'numeric' }), []);

  React.useEffect(() => {
    Promise.all([
      apiFetch(`/api/negocios/${negocioId}/productos`),
      apiFetch(`/api/negocios/${negocioId}/insumos?activo=all`),
      apiFetch(`/api/negocios/${negocioId}/fichas`)
    ]).then(([prod, ins, fichas]) => {
      const timeAgo = (dateStr) => {
        if (!dateStr) return '—';
        const diff = Date.now() - new Date(dateStr).getTime();
        const m = Math.floor(diff / 60000);
        if (m < 60) return `hace ${m || 1}m`;
        const h = Math.floor(m / 60);
        if (h < 24) return `hace ${h}h`;
        return `hace ${Math.floor(h/24)}d`;
      };

      const sortedFichas = (fichas || []).sort((a,b) => new Date(b.calculado_en) - new Date(a.calculado_en));
      const uFicha = sortedFichas[0];

      let allActivities = [];
      (fichas || []).forEach(f => {
        allActivities.push({
          icon: 'calculator',
          text: `Ficha calculada: ${f.producto_nombre}`,
          date: new Date(f.calculado_en),
          time: timeAgo(f.calculado_en),
          color: 'var(--accent-industrial)'
        });
      });
      (prod || []).forEach(p => {
        if (p.created_at) {
          allActivities.push({
            icon: 'package',
            text: `Producto registrado: ${p.nombre}`,
            date: new Date(p.created_at),
            time: timeAgo(p.created_at),
            color: 'var(--accent-success)'
          });
        }
      });
      (ins || []).forEach(i => {
        if (i.created_at) {
          allActivities.push({
            icon: 'plus',
            text: `Insumo agregado: ${i.nombre}`,
            date: new Date(i.created_at),
            time: timeAgo(i.created_at),
            color: 'var(--text-secondary)'
          });
        }
      });

      allActivities.sort((a, b) => b.date - a.date);
      const topActivities = allActivities.slice(0, 4);

      const prodActivos = (prod || []).filter(p => p.activo !== false);
      const productosConFicha = new Set((fichas || []).map(f => f.producto_id));
      const sinFicha = prodActivos.filter(p => !productosConFicha.has(p.id)).length;

      const now = new Date();
      const fichasMes = (fichas || []).filter(f => {
        const d = new Date(f.calculado_en);
        return d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth();
      }).length;

      setMetricas({
        productos: prod.length,
        insumos: ins.length,
        ultimaFicha: uFicha ? timeAgo(uFicha.calculado_en) : 'Ninguna',
        ultimaFichaProd: uFicha ? uFicha.producto_nombre : '—',
        productosSinFicha: sinFicha,
        fichasEsteMes: fichasMes,
        actividad: topActivities.length > 0 ? topActivities : [{ icon: 'info', text: 'No hay actividad reciente', time: '', color: 'var(--text-tertiary)' }]
      });

      const fichasMapeadas = sortedFichas.slice(0, 4).map(f => {
        const p = prod.find(pr => pr.id === f.producto_id);
        const costoUnit = parseFloat(f.costo_unitario_total || 0);
        return {
          id: f.id,
          producto_id: f.producto_id,
          nombre: f.producto_nombre || (p ? p.nombre : 'Desconocido'),
          sku: (p && p.codigo_sku) ? p.codigo_sku : 'Sin SKU',
          costoUnit,
          fichaReciente: true
        };
      });
      setUltimasFichas(fichasMapeadas);

    }).catch(e => console.error(e));
  }, [negocioId]);


  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <div style={{ fontSize: '22px', fontWeight: 400, color: 'var(--text-primary)', letterSpacing: '-0.02em', marginBottom: '4px' }}>{negocio.nombre}</div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <RubroBadge rubro={negocio.rubro} />
            <span style={{ fontSize: '13px', color: 'var(--text-tertiary)' }}>Temporada 2026</span>
          </div>
        </div>
        <Btn onClick={() => onNavigate('fichas')} accentColor={accentColor} icon="plus">Nueva ficha de costo</Btn>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '12px' }}>
        <MetricCard label="Productos" value={metricas.productos} sub="con receta activa" icon={<Icon name="package" size={16} />} accentColor={accentColor} mono={false} />
        <MetricCard label="Insumos registrados" value={metricas.insumos} sub="en el catálogo" icon={<Icon name="layers" size={16} />} mono={false} />
        <MetricCard label="Última ficha calculada" value={metricas.ultimaFicha} sub={metricas.ultimaFichaProd} icon={<Icon name="history" size={16} />} mono={false} />
        <MetricCard label="Productos sin ficha" value={metricas.productosSinFicha} sub="sin costo calculado" icon={<Icon name="trendingUp" size={16} />} accentColor={accentColor} mono={false} />
      </div>

      <div style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border-subtle)', borderRadius: '8px', overflow: 'hidden' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '14px 20px', borderBottom: '1px solid var(--border-subtle)' }}>
          <span style={{ fontSize: '13px', fontWeight: 500, color: 'var(--text-primary)' }}>Productos — últimas fichas</span>
          <Btn variant="ghost" size="sm" icon="arrowRight" onClick={() => onNavigate('productos')}>Ver todos</Btn>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 120px 100px 120px', padding: '8px 20px', borderBottom: '1px solid var(--border-subtle)', gap: '8px' }}>
          {['Producto', 'Costo unitario', 'Estado ficha', ''].map((h, i) => (
            <div key={i} style={{ fontSize: '11px', color: 'var(--text-tertiary)', letterSpacing: '0.05em', fontWeight: 500, textAlign: i === 1 ? 'right' : 'left' }}>{h}</div>
          ))}
        </div>
        {ultimasFichas.length === 0 ? (
          <div style={{ padding: '24px', textAlign: 'center', color: 'var(--text-tertiary)', fontSize: '13px' }}>No hay fichas de costo calculadas.</div>
        ) : ultimasFichas.map((p, i) => (
          <div key={p.id} style={{ display: 'grid', gridTemplateColumns: '1fr 120px 100px 120px', padding: '12px 20px', borderBottom: i < ultimasFichas.length - 1 ? '1px solid var(--border-subtle)' : 'none', gap: '8px', alignItems: 'center', cursor: 'pointer', transition: 'background 0.1s' }}
            onMouseEnter={e => e.currentTarget.style.background = 'var(--bg-tertiary)'}
            onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
            onClick={() => onNavigate('historial', { fichaId: p.id })}
          >
            <div>
              <div style={{ fontSize: '13px', color: 'var(--text-primary)', fontWeight: 500, marginBottom: '2px' }}>{p.nombre}</div>
              <div style={{ fontSize: '11px', color: 'var(--text-tertiary)', fontFamily: 'IBM Plex Mono, monospace' }}>{p.sku}</div>
            </div>
            <div style={{ textAlign: 'right' }}><MoneyDisplay value={p.costoUnit} size="sm" /></div>
            <div style={{ textAlign: 'right' }}>
              <StatusBadge label={p.fichaReciente ? 'Reciente' : 'Sin ficha'} color={p.fichaReciente ? 'var(--accent-success)' : 'var(--text-tertiary)'} />
            </div>
            <div><Btn variant="ghost" size="sm" accentColor={accentColor} onClick={e => { e.stopPropagation(); onNavigate('historial', { fichaId: p.id }); }}>Ver ficha →</Btn></div>
          </div>
        ))}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
        <SectionCard title="Actividad reciente">
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {metricas.actividad.map((item, i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <div style={{ width: 28, height: 28, borderRadius: '6px', background: item.color + '1A', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <Icon name={item.icon} size={13} style={{ color: item.color }} />
                </div>
                <div style={{ flex: 1, fontSize: '13px', color: 'var(--text-secondary)' }}>{item.text}</div>
                <div style={{ fontSize: '11px', color: 'var(--text-tertiary)', whiteSpace: 'nowrap' }}>{item.time}</div>
              </div>
            ))}
          </div>
        </SectionCard>
        <MetricCard
          label="Fichas calculadas este mes"
          value={metricas.fichasEsteMes}
          sub={currentMonthText}
          icon={<Icon name="calculator" size={16} />}
          accentColor={accentColor}
          mono={false}
        />
      </div>
    </div>
  );
};

const Dashboard = ({ negocio, onNavigate }) => {
  if (!negocio) {
    return (
      <div style={{ display: 'flex', height: '60vh', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ fontSize: '13px', color: 'var(--text-tertiary)' }}>Cargando información del negocio...</div>
      </div>
    );
  }

  const rubro = negocio.rubro || 'industrial';

  return rubro === 'agro_ganadero'
    ? <DashboardAgro negocio={negocio} onNavigate={onNavigate} />
    : <DashboardIndustrial negocio={negocio} onNavigate={onNavigate} />;
};

export default Dashboard;
