import React, { useState } from 'react';
import { Icon } from '../icons.jsx';
import { RubroBadge, Btn, MetricCard, MoneyDisplay, StatusBadge, SectionCard, InfoTip } from '../components/ui.jsx';
import { apiFetch } from '../config/api.js';

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

const DashboardAgro = ({ negocio, onNavigate }) => {
  const negocioId = negocio.id;
  const accentColor = 'var(--accent-agro)';
  const [lotes, setLotes] = useState([]);
  const [ultimoLiquidado, setUltimoLiquidado] = useState(null);
  const [loading, setLoading] = useState(true);

  const timeAgo = (dateStr) => {
    if (!dateStr) return '—';
    const diff = Date.now() - new Date(dateStr).getTime();
    const m = Math.floor(diff / 60000);
    if (m < 60) return `hace ${m || 1}m`;
    const h = Math.floor(m / 60);
    if (h < 24) return `hace ${h}h`;
    return `hace ${Math.floor(h/24)}d`;
  };

  React.useEffect(() => {
    apiFetch(`/api/negocios/${negocioId}/lotes`)
      .then(data => {
        const mapped = data.map(l => ({
          ...l,
          id: l.identificador || l.id,
          tipo: l.tipo_animal,
          entrada: l.fecha_entrada ? new Date(l.fecha_entrada).toLocaleDateString('es-BO', { day: '2-digit', month: 'short', year: 'numeric' }) : '—',
          dias: l.fecha_entrada ? Math.floor((Date.now() - new Date(l.fecha_entrada)) / 86400000) : 0,
          cabezasActivas: l.cabezas_activas || 0,
          cabezas_inicio: l.cabezas_inicio || 0,
          costo_total: parseFloat(l.costo_total) || 0,
          created_at: l.created_at
        }));
        const activos = mapped.filter(l => l.activo !== false);
        const liquidados = mapped
          .filter(l => l.activo === false && l.liquidacion_jsonb)
          .sort((a, b) => new Date(b.liquidacion_jsonb.liquidado_en) - new Date(a.liquidacion_jsonb.liquidado_en));
        setLotes(activos);
        setUltimoLiquidado(liquidados[0] || null);
      })
      .catch(e => console.error(e))
      .finally(() => setLoading(false));
  }, [negocioId]);

  const totalAnimales = lotes.reduce((s, l) => s + l.cabezasActivas, 0);
  const costoTotalAcc = lotes.reduce((s, l) => s + l.costo_total, 0);
  const costoPorCabeza = totalAnimales > 0 ? costoTotalAcc / totalAnimales : null;
  const costoPorCabezaDisplay = loading
    ? '...'
    : costoPorCabeza == null
      ? '—'
      : `Bs ${costoPorCabeza.toLocaleString('es-BO', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

  const actividades = React.useMemo(() => {
    const list = lotes.map(l => ({
      icon: 'plus',
      text: `Nuevo lote registrado: ${l.id} · ${l.cabezas_inicio} ${l.tipo === 'Cerdo' ? 'cerdos' : l.tipo === 'Bovino' ? 'bovinos' : 'animales'}`,
      time: timeAgo(l.created_at),
      date: new Date(l.created_at),
      color: 'var(--accent-success)'
    })).sort((a, b) => b.date - a.date).slice(0, 4);

    if (list.length === 0) {
      return [{ icon: 'info', text: 'No hay actividad reciente', time: '', color: 'var(--text-tertiary)' }];
    }
    return list;
  }, [lotes]);

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
        <MetricCard label="Lotes activos" labelExtra={<InfoTip text="Lotes con animales en curso. Un lote se cierra cuando lo liquidás desde la sección Liquidación." />} value={loading ? '...' : lotes.length} sub="en engorde" icon={<Icon name="cow" size={16} />} accentColor={accentColor} mono={false} />
        <MetricCard label="Animales en engorde" labelExtra={<InfoTip text="Total de animales en todos los lotes activos, descontando bajas registradas en el diario de producción." />} value={loading ? '...' : totalAnimales} sub="cabezas totales" icon={<Icon name="layers" size={16} />} mono={false} />
        <MetricCard label="Costo total acumulado"  value={loading ? '...' : `Bs ${(costoTotalAcc/1000).toFixed(1)}k`} sub="todos los lotes" icon={<Icon name="dollarSign" size={16} />} mono={false} />
        <MetricCard label="Costo / cabeza promedio" value={costoPorCabezaDisplay} sub="todos los lotes activos" icon={<Icon name="trendingUp" size={16} />} accentColor={accentColor} mono={false} />
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
        {loading ? (
          <div style={{ padding: '24px', textAlign: 'center', color: 'var(--text-tertiary)', fontSize: '13px' }}>Cargando lotes...</div>
        ) : lotes.length === 0 ? (
          <div style={{ padding: '24px', textAlign: 'center', color: 'var(--text-tertiary)', fontSize: '13px' }}>No hay lotes activos.</div>
        ) : (
          lotes.map((l, i) => {
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
                <div style={{ textAlign: 'right' }}><MoneyDisplay value={l.costo_total} size="sm" /></div>
                <span style={{ textAlign: 'right', fontFamily: 'IBM Plex Mono, monospace', fontSize: '13px', color: 'var(--text-tertiary)' }}>—</span>
                <div><Btn variant="ghost" size="sm" accentColor={accentColor} onClick={e => { e.stopPropagation(); onNavigate('lotes'); }}>Ver →</Btn></div>
              </div>
            );
          })
        )}
      </div>

      {ultimoLiquidado && (() => {
        const liq = ultimoLiquidado.liquidacion_jsonb;
        const utilidad = parseFloat(liq.utilidad);
        const margen = liq.margen != null ? parseFloat(liq.margen) : null;
        const escanario_label = liq.escenario === 'pie' ? 'Venta en pie' : 'Venta gancho';
        const fechaCierre = new Date(liq.liquidado_en).toLocaleDateString('es-BO', { day: '2-digit', month: 'short', year: 'numeric' });
        return (
          <div style={{ background: 'var(--bg-secondary)', border: `1px solid ${accentColor}33`, borderRadius: '8px', overflow: 'hidden' }}>
            <div style={{ padding: '12px 20px', borderBottom: `1px solid ${accentColor}22`, background: accentColor + '08', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <span style={{ fontSize: '13px', fontWeight: 500, color: 'var(--text-primary)' }}>Último lote cerrado</span>
                <InfoTip text="Muestra el resultado del último lote que fue liquidado. Los datos vienen del escenario que elegiste al momento de liquidar." />
              </div>
              <Btn variant="ghost" size="sm" icon="arrowRight" onClick={() => onNavigate('lotes')}>Ver lotes</Btn>
            </div>
            <div style={{ padding: '16px 20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '20px', flexWrap: 'wrap' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                  <span style={{ fontSize: '14px', fontWeight: 600, color: 'var(--text-primary)', fontFamily: 'IBM Plex Mono, monospace' }}>
                    #{ultimoLiquidado.id}
                  </span>
                  <StatusBadge label={ultimoLiquidado.tipo} color={accentColor} />
                  <span style={{ padding: '2px 8px', borderRadius: '4px', fontSize: '11px', fontWeight: 600, color: accentColor, background: accentColor + '18', border: `1px solid ${accentColor}33` }}>
                    {escanario_label}
                  </span>
                </div>
                <span style={{ fontSize: '12px', color: 'var(--text-tertiary)' }}>
                  Cerrado el {fechaCierre} · {liq.cabezas_venta} cab. · {liq.peso_prom_final} kg/cab promedio
                </span>
              </div>
              <div style={{ display: 'flex', gap: '28px', flexWrap: 'wrap' }}>
                {[
                  { label: 'Ingreso total', val: `Bs ${parseFloat(liq.ingreso).toLocaleString('es-BO', { minimumFractionDigits: 0 })}`, color: 'var(--text-primary)' },
                  { label: 'Utilidad neta', val: `${utilidad >= 0 ? '+' : ''}Bs ${utilidad.toLocaleString('es-BO', { minimumFractionDigits: 0 })}`, color: utilidad >= 0 ? 'var(--accent-success)' : 'var(--accent-danger)' },
                  { label: 'Margen s/ ingreso', val: margen != null ? `${margen.toFixed(1)}%` : '—', color: margen != null && margen >= 0 ? 'var(--accent-success)' : 'var(--accent-danger)' },
                ].map((m, i) => (
                  <div key={i} style={{ display: 'flex', flexDirection: 'column', gap: '2px', textAlign: 'right' }}>
                    <span style={{ fontSize: '10px', color: 'var(--text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>{m.label}</span>
                    <span style={{ fontFamily: 'IBM Plex Mono, monospace', fontSize: '16px', fontWeight: 600, color: m.color }}>{m.val}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        );
      })()}

      <SectionCard title="Actividad reciente">
        {loading ? (
           <div style={{ fontSize: '13px', color: 'var(--text-tertiary)' }}>Cargando actividad...</div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {actividades.map((item, i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <div style={{ width: 28, height: 28, borderRadius: '6px', background: item.color + '1A', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <Icon name={item.icon} size={13} style={{ color: item.color }} />
                </div>
                <div style={{ flex: 1, fontSize: '13px', color: 'var(--text-secondary)' }}>{item.text}</div>
                <div style={{ fontSize: '11px', color: 'var(--text-tertiary)', whiteSpace: 'nowrap' }}>{item.time}</div>
              </div>
            ))}
          </div>
        )}
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

