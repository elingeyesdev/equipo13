// CosteoUniversal — Dashboard v2 (industrial + agro variants)
const { useState } = React;

const PRODUCTOS_MOCK = [
  { id: 'p1', nombre: 'Queso fresco 500g',   costo: 38.70, precio: 55.00, margen: 42.1, updated: 'hace 2h',   fichas: 3 },
  { id: 'p2', nombre: 'Yogur natural 1L',    costo: 22.40, precio: 34.00, margen: 51.8, updated: 'hace 1d',   fichas: 2 },
  { id: 'p3', nombre: 'Mantequilla 200g',    costo: 18.90, precio: 28.50, margen: 50.8, updated: 'hace 3d',   fichas: 1 },
  { id: 'p4', nombre: 'Requesón 300g',       costo: 14.20, precio: 22.00, margen: 54.9, updated: 'hace 5d',   fichas: 1 },
  { id: 'p5', nombre: 'Queso maduro 1kg',    costo: 89.50, precio: 130.00,margen: 45.3, updated: 'hace 1sem', fichas: 2 },
];

/* ── INDUSTRIAL dashboard ─────────────────────────────────── */
const DashboardIndustrial = ({ negocioId, onNavigate }) => {
  const negocio = NEGOCIOS.find(n => n.id === negocioId) || NEGOCIOS[0];
  const accentColor = 'var(--accent-industrial)';
  const mock = MOCK_BY_NEGOCIO[negocioId] || MOCK_BY_NEGOCIO['n1'];
  const dm = mock.dashMetrics;
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
        <MetricCard label="Productos" value={dm.productos} sub="con receta activa" icon={<Icon name="package" size={16} />} accentColor={accentColor} mono={false} />
        <MetricCard label="Insumos registrados" value={dm.insumos} sub="en el catálogo" icon={<Icon name="layers" size={16} />} mono={false} />
        <MetricCard label="Última ficha calculada" value={dm.ultimaFicha} sub={(mock.fichas[0] || {}).producto || '—'} icon={<Icon name="history" size={16} />} mono={false} />
        <MetricCard label="Punto de equilibrio" value={`${dm.pe} uds`} sub="unidades / mes mínimo" icon={<Icon name="trendingUp" size={16} />} accentColor="var(--accent-warning)" mono={false} />
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
            {[
              { icon: 'calculator', text: 'Ficha calculada: Queso fresco 500g', time: 'hace 2h',  color: accentColor },
              { icon: 'edit',       text: 'Precio de leche entera actualizado', time: 'hace 6h',  color: 'var(--accent-warning)' },
              { icon: 'plus',       text: 'Insumo agregado: Cuajo enzimático',  time: 'hace 1d',  color: 'var(--accent-success)' },
              { icon: 'calculator', text: 'Ficha calculada: Yogur natural 1L',  time: 'hace 2d',  color: accentColor },
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
        <SectionCard title="Distribución de costos">
          <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            {[
              { label: 'Materia Prima Directa (MPD)', pct: 61, color: accentColor },
              { label: 'Mano de Obra Directa (MOD)',  pct: 20, color: 'var(--accent-warning)' },
              { label: 'Costos Indirectos (CIF)',      pct: 19, color: 'var(--text-tertiary)' },
            ].map((item, i) => (
              <div key={i} style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px' }}>
                  <span style={{ color: 'var(--text-secondary)' }}>{item.label}</span>
                  <span style={{ fontFamily: 'IBM Plex Mono, monospace', color: 'var(--text-primary)' }}>{item.pct}%</span>
                </div>
                <div style={{ height: '5px', background: 'var(--bg-tertiary)', borderRadius: '2px', overflow: 'hidden' }}>
                  <div style={{ width: `${item.pct}%`, height: '100%', background: item.color, borderRadius: '2px' }} />
                </div>
              </div>
            ))}
          </div>
        </SectionCard>
      </div>
    </div>
  );
};

/* ── AGRO dashboard ───────────────────────────────────────── */
const DashboardAgro = ({ negocioId, onNavigate }) => {
  const negocio = NEGOCIOS.find(n => n.id === negocioId) || NEGOCIOS[0];
  const accentColor = 'var(--accent-agro)';
  const lotes = typeof LOTES_DATA !== 'undefined' ? LOTES_DATA : [];
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

      {/* Lotes summary */}
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

/* ── Router ───────────────────────────────────────────────── */
const Dashboard = ({ negocioId, onNavigate }) => {
  const negocio = NEGOCIOS.find(n => n.id === negocioId) || NEGOCIOS[0];
  return negocio.rubro === 'agro_ganadero'
    ? <DashboardAgro negocioId={negocioId} onNavigate={onNavigate} />
    : <DashboardIndustrial negocioId={negocioId} onNavigate={onNavigate} />;
};

Object.assign(window, { Dashboard });
