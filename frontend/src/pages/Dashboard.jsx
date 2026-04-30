import React, { useState } from 'react';
import { Icon } from '../icons.jsx';
import { MOCK_BY_NEGOCIO, RubroBadge, Btn, MetricCard, MoneyDisplay, StatusBadge, SectionCard } from '../components/ui.jsx';
import { apiFetch } from '../config/api.js';
import { LOTES_DATA } from './agro/Lotes.jsx';

/* ── INDUSTRIAL dashboard ─────────────────────────────────── */
const DashboardIndustrial = ({ negocio, onNavigate }) => {
  const negocioId = negocio.id;
  const accentColor = 'var(--accent-industrial)';
  const mock = MOCK_BY_NEGOCIO[negocioId] || MOCK_BY_NEGOCIO['n1'];
  
  const [metricas, setMetricas] = useState({
    productos: 0,
    insumos: 0,
    ultimaFicha: 'Ninguna',
    ultimaFichaProd: '—',
    actividad: []
  });

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

      setMetricas({
        productos: prod.length,
        insumos: ins.length,
        ultimaFicha: uFicha ? timeAgo(uFicha.calculado_en) : 'Ninguna',
        ultimaFichaProd: uFicha ? uFicha.producto_nombre : '—',
        actividad: topActivities.length > 0 ? topActivities : [{ icon: 'info', text: 'No hay actividad reciente', time: '', color: 'var(--text-tertiary)' }]
      });
    }).catch(e => console.error(e));
  }, [negocioId]);

  const productos = (mock.productos || []).filter(p => p.activo !== false);

  const MargenBar = ({ value }) => (
    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
      <div style={{ width: 64, height: 4, background: 'var(--bg-tertiary)', borderRadius: '2px', overflow: 'hidden' }}>
        <div style={{ width: `${Math.min(value, 100)}%`, height: '100%', background: value > 40 ? 'var(--accent-success)' : value > 20 ? 'var(--accent-warning)' : 'var(--accent-danger)', borderRadius: '2px' }} />
      </div>
      <span style={{ fontSize: '12px', fontFamily: 'IBM Plex Mono, monospace', color: value > 40 ? 'var(--accent-success)' : 'var(--text-secondary)' }}>{value.toFixed(1)}%</span>
    </div>
  );

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
        <MetricCard label="Punto de equilibrio" value="Próximamente" sub="Disponible en Sprint 2" icon={<Icon name="trendingUp" size={16} />} accentColor="var(--accent-warning)" mono={false} />
      </div>

      <div style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border-subtle)', borderRadius: '8px', overflow: 'hidden' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '14px 20px', borderBottom: '1px solid var(--border-subtle)' }}>
          <span style={{ fontSize: '13px', fontWeight: 500, color: 'var(--text-primary)' }}>Productos — últimas fichas</span>
          <Btn variant="ghost" size="sm" icon="arrowRight" onClick={() => onNavigate('productos')}>Ver todos</Btn>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 120px 120px 140px 100px 120px', padding: '8px 20px', borderBottom: '1px solid var(--border-subtle)', gap: '8px' }}>
          {['Producto', 'Costo unitario', 'Precio sugerido', 'Margen', 'Estado ficha', ''].map((h, i) => (
            <div key={i} style={{ fontSize: '11px', color: 'var(--text-tertiary)', letterSpacing: '0.05em', fontWeight: 500, textAlign: i >= 1 && i <= 4 ? 'right' : 'left' }}>{h}</div>
          ))}
        </div>
        {productos.map((p, i) => (
          <div key={p.id} style={{ display: 'grid', gridTemplateColumns: '1fr 120px 120px 140px 100px 120px', padding: '12px 20px', borderBottom: i < productos.length - 1 ? '1px solid var(--border-subtle)' : 'none', gap: '8px', alignItems: 'center', cursor: 'pointer', transition: 'background 0.1s' }}
            onMouseEnter={e => e.currentTarget.style.background = 'var(--bg-tertiary)'}
            onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
            onClick={() => onNavigate('historial')}
          >
            <div>
              <div style={{ fontSize: '13px', color: 'var(--text-primary)', fontWeight: 500, marginBottom: '2px' }}>{p.nombre}</div>
              <div style={{ fontSize: '11px', color: 'var(--text-tertiary)', fontFamily: 'IBM Plex Mono, monospace' }}>{p.sku}</div>
            </div>
            <div style={{ textAlign: 'right' }}><MoneyDisplay value={p.costoUnit} size="sm" /></div>
            <div style={{ textAlign: 'right' }}><MoneyDisplay value={p.pvp} size="sm" color="green" /></div>
            <div style={{ textAlign: 'right' }}><MargenBar value={p.margen} /></div>
            <div style={{ textAlign: 'right' }}>
              <StatusBadge label={p.fichaReciente ? 'Reciente' : 'Sin ficha'} color={p.fichaReciente ? 'var(--accent-success)' : 'var(--text-tertiary)'} />
            </div>
            <div><Btn variant="ghost" size="sm" accentColor={accentColor} onClick={e => { e.stopPropagation(); onNavigate('historial'); }}>Ver ficha →</Btn></div>
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
        <SectionCard title="Distribución de costos">
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '20px 0', gap: '8px' }}>
            <div style={{ fontSize: '15px', fontWeight: 500, color: 'var(--accent-warning)' }}>Próximamente</div>
            <div style={{ fontSize: '13px', color: 'var(--text-tertiary)' }}>Disponible en Sprint 2</div>
          </div>
        </SectionCard>
      </div>
    </div>
  );
};

/* ── AGRO dashboard ───────────────────────────────────────── */
const DashboardAgro = ({ negocio, onNavigate }) => {
  const negocioId = negocio.id;
  const accentColor = 'var(--accent-agro)';
  const lotes = LOTES_DATA;
  const dm = (MOCK_BY_NEGOCIO[negocioId] || {}).dashMetrics || {};

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
        <Btn onClick={() => onNavigate('lotes')} accentColor={accentColor} icon="plus">Registrar lote</Btn>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '12px' }}>
        <MetricCard label="Lotes activos"         value={dm.lotes ?? lotes.length}      sub="en engorde"               icon={<Icon name="cow" size={16} />} accentColor={accentColor} mono={false} />
        <MetricCard label="Animales en engorde"    value={dm.animales ?? lotes.reduce((s,l)=>s+l.cabezasActivas,0)} sub="cabezas totales" icon={<Icon name="layers" size={16} />} mono={false} />
        <MetricCard label="Costo total acumulado"  value={`Bs ${((dm.costoTotal ?? lotes.reduce((s,l)=>s+Object.values(l.costos).reduce((a,v)=>a+v,0),0))/1000).toFixed(1)}k`} sub="todos los lotes" icon={<Icon name="dollarSign" size={16} />} mono={false} />
        <MetricCard label="Mejor ICA del período"  value={`${dm.mejorIca ?? Math.min(...lotes.map(l=>l.convAliment))} kg/kg`} sub="conversión alimenticia" icon={<Icon name="trendingUp" size={16} />} accentColor={accentColor} mono={false} />
      </div>

      <div style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border-subtle)', borderRadius: '8px', overflow: 'hidden' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '14px 20px', borderBottom: '1px solid var(--border-subtle)' }}>
          <span style={{ fontSize: '13px', fontWeight: 500, color: 'var(--text-primary)' }}>Lotes activos</span>
          <Btn variant="ghost" size="sm" icon="arrowRight" onClick={() => onNavigate('lotes')}>Ver todos</Btn>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 80px 80px 100px 100px 80px 100px', padding: '8px 20px', borderBottom: '1px solid var(--border-subtle)', gap: '8px' }}>
          {['Lote', 'Tipo', 'Días', 'Animales', 'Costo total', 'ICA', ''].map((h, i) => (
            <div key={i} style={{ fontSize: '11px', color: 'var(--text-tertiary)', fontWeight: 500, textAlign: i >= 3 && i <= 5 ? 'right' : 'left' }}>{h}</div>
          ))}
        </div>
        {lotes.map((l, i) => {
          const totalCosto = Object.values(l.costos).reduce((s, v) => s + v, 0);
          const icaColor = l.tipo === 'Cerdo' ? (l.convAliment <= 3.0 ? 'var(--accent-success)' : 'var(--accent-warning)') : (l.convAliment <= 8.0 ? 'var(--accent-success)' : 'var(--accent-warning)');
          return (
            <div key={l.id} style={{ display: 'grid', gridTemplateColumns: '1fr 80px 80px 100px 100px 80px 100px', padding: '12px 20px', borderBottom: i < lotes.length - 1 ? '1px solid var(--border-subtle)' : 'none', gap: '8px', alignItems: 'center', transition: 'background 0.1s', cursor: 'pointer' }}
              onMouseEnter={e => e.currentTarget.style.background = 'var(--bg-tertiary)'}
              onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
              onClick={() => onNavigate('lotes')}
            >
              <span style={{ fontSize: '13px', fontWeight: 500, color: 'var(--text-primary)', fontFamily: 'IBM Plex Mono, monospace' }}>{l.id}</span>
              <span style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>{l.tipo}</span>
              <span style={{ textAlign: 'right', fontFamily: 'IBM Plex Mono, monospace', fontSize: '13px', color: 'var(--text-secondary)' }}>{l.dias}d</span>
              <span style={{ textAlign: 'right', fontFamily: 'IBM Plex Mono, monospace', fontSize: '13px', color: 'var(--text-primary)' }}>{l.cabezasActivas} cab.</span>
              <div style={{ textAlign: 'right' }}><MoneyDisplay value={totalCosto} size="sm" /></div>
              <span style={{ textAlign: 'right', fontFamily: 'IBM Plex Mono, monospace', fontSize: '13px', color: icaColor, fontWeight: 500 }}>{l.convAliment}</span>
              <div><Btn variant="ghost" size="sm" accentColor={accentColor} onClick={e => { e.stopPropagation(); onNavigate('lotes'); }}>Ver →</Btn></div>
            </div>
          );
        })}
      </div>

      <SectionCard title="Actividad reciente">
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {[
            { icon: 'layers',        text: 'Alimentación registrada: 10 sacos bal. crecimiento — Lote L-2025-003', time: 'hace 2h',  color: accentColor },
            { icon: 'alertTriangle', text: 'Baja registrada: 1 cabeza Lote L-2025-003 (enf. respiratoria)',        time: 'hace 3d',  color: 'var(--accent-warning)' },
            { icon: 'plus',          text: 'Nuevo lote registrado: L-2025-005 · 30 cerdos',                        time: 'hace 2sem',color: 'var(--accent-success)' },
          ].map((item, i) => (
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
