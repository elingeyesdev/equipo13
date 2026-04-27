// CosteoUniversal — Reusable UI Components
const { useState, useEffect, useRef } = React;

/* ── MoneyDisplay ─────────────────────────────────────────── */
const MoneyDisplay = ({ value, currency = 'Bs', size = 'md', color = 'default' }) => {
  const num = typeof value === 'number' ? value : parseFloat(value) || 0;
  const formatted = num.toLocaleString('es-BO', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  const sz = { xs: '12px', sm: '13px', md: '14px', lg: '20px', xl: '28px', '2xl': '36px' };
  const cl = { default: 'var(--text-primary)', green: 'var(--accent-success)', red: 'var(--accent-danger)', secondary: 'var(--text-secondary)', warning: 'var(--accent-warning)' };
  return (
    <span style={{ fontFamily: 'var(--font-mono)', fontSize: sz[size] || sz.md, color: cl[color] || cl.default, letterSpacing: '-0.01em', whiteSpace: 'nowrap' }}>
      {currency} {formatted}
    </span>
  );
};

/* ── RubroBadge ───────────────────────────────────────────── */
const RubroBadge = ({ rubro, size = 'sm' }) => {
  const cfg = {
    industrial:   { label: 'Industrial',    color: 'var(--accent-industrial)' },
    agro_ganadero:{ label: 'Agro-ganadero', color: 'var(--accent-agro)' },
    ambos:        { label: 'Ambos rubros',  color: 'var(--accent-warning)' },
  };
  const { label, color } = cfg[rubro] || { label: rubro, color: 'var(--text-tertiary)' };
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: '5px',
      padding: size === 'sm' ? '2px 8px' : '4px 10px',
      borderRadius: '4px',
      fontSize: size === 'sm' ? '11px' : '12px',
      fontWeight: 500, color,
      background: color + '1A',
      border: `1px solid ${color}33`,
      letterSpacing: '0.02em', whiteSpace: 'nowrap',
    }}>
      <span style={{ width: 6, height: 6, borderRadius: '50%', background: color, display: 'inline-block', flexShrink: 0 }} />
      {label}
    </span>
  );
};

/* ── ChipSelector ─────────────────────────────────────────── */
const ChipSelector = ({ options, selected, onSelect, multi = false, accentColor = 'var(--accent-industrial)' }) => {
  const isSelected = v => multi ? (selected || []).includes(v) : selected === v;
  const toggle = v => {
    if (multi) {
      const cur = selected || [];
      onSelect(cur.includes(v) ? cur.filter(x => x !== v) : [...cur, v]);
    } else { onSelect(v); }
  };
  return (
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
      {options.map(opt => {
        const val = opt.value !== undefined ? opt.value : opt;
        const lbl = opt.label !== undefined ? opt.label : opt;
        const sel = isSelected(val);
        return (
          <button key={val} onClick={() => toggle(val)} style={{
            padding: '6px 14px', borderRadius: '6px', cursor: 'pointer',
            border: `1px solid ${sel ? accentColor : 'var(--border-subtle)'}`,
            background: sel ? accentColor + '1A' : 'var(--bg-tertiary)',
            color: sel ? accentColor : 'var(--text-secondary)',
            fontSize: '13px', fontWeight: sel ? 500 : 400,
            transition: 'all 0.15s', fontFamily: 'var(--font-sans)',
          }}>{lbl}</button>
        );
      })}
    </div>
  );
};

/* ── Input ────────────────────────────────────────────────── */
const Input = ({ label, value, onChange, type = 'text', placeholder = '', prefix, suffix, mono = false, style: xStyle = {}, onFocusColor = 'var(--accent-industrial)' }) => {
  const [focused, setFocused] = useState(false);
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
      {label && <label style={{ fontSize: '11px', color: 'var(--text-tertiary)', fontWeight: 500, letterSpacing: '0.07em', textTransform: 'uppercase' }}>{label}</label>}
      <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
        {prefix && <span style={{ position: 'absolute', left: '10px', color: 'var(--text-tertiary)', fontSize: '13px', fontFamily: mono ? 'var(--font-mono)' : 'var(--font-sans)', pointerEvents: 'none' }}>{prefix}</span>}
        <input
          type={type}
          value={value}
          onChange={e => onChange(e.target.value)}
          placeholder={placeholder}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          style={{
            width: '100%', background: 'var(--bg-tertiary)',
            border: `1px solid ${focused ? onFocusColor : 'var(--border-subtle)'}`,
            borderRadius: '6px', color: 'var(--text-primary)',
            padding: `8px ${suffix ? '32px' : '12px'} 8px ${prefix ? '30px' : '12px'}`,
            fontSize: '14px', outline: 'none',
            fontFamily: mono ? 'var(--font-mono)' : 'var(--font-sans)',
            transition: 'border-color 0.15s',
            ...xStyle,
          }}
        />
        {suffix && <span style={{ position: 'absolute', right: '10px', color: 'var(--text-tertiary)', fontSize: '13px', pointerEvents: 'none' }}>{suffix}</span>}
      </div>
    </div>
  );
};

/* ── MetricCard ───────────────────────────────────────────── */
const MetricCard = ({ label, value, sub, icon, accentColor, mono = true }) => (
  <div style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border-subtle)', borderRadius: '8px', padding: '18px 20px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
      <span style={{ fontSize: '11px', color: 'var(--text-tertiary)', letterSpacing: '0.07em', textTransform: 'uppercase', fontWeight: 500 }}>{label}</span>
      {icon && <span style={{ color: accentColor || 'var(--text-tertiary)', opacity: 0.7 }}>{icon}</span>}
    </div>
    <div style={{ fontFamily: mono ? 'var(--font-mono)' : 'var(--font-sans)', fontSize: '22px', color: accentColor || 'var(--text-primary)', fontWeight: 500, lineHeight: 1, letterSpacing: '-0.02em' }}>{value}</div>
    {sub && <div style={{ fontSize: '12px', color: 'var(--text-tertiary)', lineHeight: 1.4 }}>{sub}</div>}
  </div>
);

/* ── WIPBars ──────────────────────────────────────────────── */
const WIPBars = ({ stages, accentColor = 'var(--accent-industrial)' }) => {
  const [visible, setVisible] = useState(false);
  useEffect(() => { const t = setTimeout(() => setVisible(true), 80); return () => clearTimeout(t); }, []);
  const maxCost = Math.max(...stages.map(s => s.costo_acumulado), 1);
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
      {stages.map((stage, i) => {
        const pct = (stage.costo_acumulado / maxCost) * 100;
        return (
          <div key={i} style={{ display: 'grid', gridTemplateColumns: '150px 1fr 96px', alignItems: 'center', gap: '12px' }}>
            <div style={{ fontSize: '12px', color: 'var(--text-secondary)', textAlign: 'right', lineHeight: 1.2 }}>{stage.nombre}</div>
            <div style={{ background: 'var(--bg-tertiary)', borderRadius: '2px', height: '7px', overflow: 'hidden' }}>
              <div style={{
                height: '100%', borderRadius: '2px',
                width: visible ? `${pct}%` : '0%',
                background: accentColor,
                transition: `width ${0.5 + i * 0.08}s cubic-bezier(0.4,0,0.2,1)`,
                opacity: 0.4 + (i / stages.length) * 0.6,
              }} />
            </div>
            <div style={{ fontSize: '12px', fontFamily: 'var(--font-mono)', color: 'var(--text-secondary)', textAlign: 'right' }}>
              Bs {stage.costo_acumulado.toLocaleString('es-BO', { minimumFractionDigits: 0 })}
            </div>
          </div>
        );
      })}
    </div>
  );
};

/* ── PuntoEquilibrioCard ──────────────────────────────────── */
const PuntoEquilibrioCard = ({ costosFijos, pvp, cvUnitario }) => {
  const margenUnit = pvp - cvUnitario;
  const equilibrio = margenUnit > 0 ? Math.ceil(costosFijos / margenUnit) : '∞';
  return (
    <div style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border-mid)', borderRadius: '8px', padding: '20px 24px' }}>
      <div style={{ fontSize: '11px', color: 'var(--text-tertiary)', letterSpacing: '0.07em', textTransform: 'uppercase', fontWeight: 500, marginBottom: '14px' }}>Punto de Equilibrio</div>
      <div style={{ fontFamily: 'var(--font-mono)', fontSize: '12px', color: 'var(--text-tertiary)', marginBottom: '6px' }}>
        Costos fijos ÷ (PVP − CV unitario)
      </div>
      <div style={{ fontFamily: 'var(--font-mono)', fontSize: '15px', color: 'var(--text-secondary)', marginBottom: '14px' }}>
        Bs {costosFijos.toLocaleString('es-BO')} ÷ Bs {margenUnit.toFixed(2)} ={' '}
        <span style={{ color: 'var(--accent-warning)', fontWeight: 500 }}>{equilibrio} uds / mes</span>
      </div>
      <div style={{ fontSize: '13px', color: 'var(--text-secondary)', lineHeight: 1.6, padding: '12px', background: 'var(--bg-tertiary)', borderRadius: '6px', borderLeft: '2px solid var(--accent-warning)' }}>
        Necesitás vender <strong style={{ color: 'var(--text-primary)' }}>{equilibrio} unidades por mes</strong> para cubrir todos tus costos fijos.
      </div>
    </div>
  );
};

/* ── NegocioSelector ──────────────────────────────────────── */
const NegocioSelector = ({ negocios, selected, onSelect }) => {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);
  const sel = negocios.find(n => n.id === selected) || negocios[0];
  const rubroColor = rubro => rubro === 'industrial' ? 'var(--accent-industrial)' : 'var(--accent-agro)';

  useEffect(() => {
    const handler = e => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  return (
    <div ref={ref} style={{ position: 'relative' }}>
      <button onClick={() => setOpen(!open)} style={{
        display: 'flex', alignItems: 'center', gap: '8px',
        background: open ? 'var(--bg-tertiary)' : 'transparent',
        border: '1px solid var(--border-subtle)',
        borderRadius: '6px', padding: '5px 10px', cursor: 'pointer',
        color: 'var(--text-primary)', fontSize: '13px', fontFamily: 'var(--font-sans)',
        transition: 'background 0.15s',
      }}>
        <span style={{ color: rubroColor(sel?.rubro), fontSize: '8px' }}>●</span>
        <span style={{ maxWidth: '140px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{sel?.nombre}</span>
        <Icon name="chevronDown" size={13} style={{ color: 'var(--text-tertiary)' }} />
      </button>
      {open && (
        <div style={{
          position: 'absolute', top: 'calc(100% + 6px)', left: 0, minWidth: '200px',
          background: 'var(--bg-secondary)', border: '1px solid var(--border-mid)',
          borderRadius: '8px', overflow: 'hidden', zIndex: 200,
          boxShadow: '0 12px 32px rgba(0,0,0,0.5)',
        }}>
          {negocios.map(n => (
            <button key={n.id} onClick={() => { onSelect(n.id); setOpen(false); }} style={{
              display: 'flex', alignItems: 'center', gap: '10px', width: '100%',
              padding: '10px 14px', background: n.id === selected ? 'var(--bg-tertiary)' : 'transparent',
              border: 'none', color: 'var(--text-primary)', fontSize: '13px',
              cursor: 'pointer', textAlign: 'left', fontFamily: 'var(--font-sans)',
              transition: 'background 0.1s',
            }}>
              <span style={{ color: rubroColor(n.rubro), fontSize: '8px' }}>●</span>
              <span style={{ flex: 1 }}>{n.nombre}</span>
              <RubroBadge rubro={n.rubro} />
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

/* ── CostTable ────────────────────────────────────────────── */
const CostTable = ({ title, rows, columns, accentColor = 'var(--accent-industrial)', type = 'variable', loteSize = 100 }) => {
  const gridTpl = `1fr ${columns.slice(1).map(() => '88px').join(' ')}`;
  const totalRow = {};
  columns.forEach(col => {
    if (col.sumable) totalRow[col.key] = rows.reduce((s, r) => s + (r[col.key] || 0), 0);
  });

  const fmt = (val, col) => {
    if (!col.mono) return val;
    const n = parseFloat(val);
    if (isNaN(n)) return val;
    return (col.prefix || '') + n.toLocaleString('es-BO', { minimumFractionDigits: col.decimals ?? 2, maximumFractionDigits: col.decimals ?? 2 });
  };

  return (
    <div style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border-subtle)', borderRadius: '8px', overflow: 'hidden' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 16px', borderBottom: '1px solid var(--border-subtle)' }}>
        <span style={{ fontSize: '11px', fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase', color: accentColor }}>{title}</span>
        <span style={{ fontSize: '11px', color: 'var(--text-tertiary)', letterSpacing: '0.04em', textTransform: 'uppercase' }}>{type}</span>
      </div>
      {/* Col headers */}
      <div style={{ display: 'grid', gridTemplateColumns: gridTpl, padding: '7px 16px', borderBottom: '1px solid var(--border-subtle)', gap: '8px' }}>
        {columns.map((col, i) => (
          <div key={col.key} style={{ fontSize: '11px', color: 'var(--text-tertiary)', letterSpacing: '0.04em', textAlign: i === 0 ? 'left' : 'right', fontWeight: 500 }}>{col.label}</div>
        ))}
      </div>
      {/* Data rows */}
      {rows.map((row, ri) => (
        <div key={ri} style={{ display: 'grid', gridTemplateColumns: gridTpl, padding: '9px 16px', borderBottom: '1px solid var(--border-subtle)', gap: '8px', alignItems: 'center', transition: 'background 0.1s' }}
          onMouseEnter={e => e.currentTarget.style.background = 'var(--bg-tertiary)'}
          onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
        >
          {columns.map((col, ci) => (
            <div key={col.key} style={{
              fontSize: '13px',
              color: ci === 0 ? 'var(--text-primary)' : 'var(--text-secondary)',
              fontFamily: col.mono ? 'var(--font-mono)' : 'var(--font-sans)',
              textAlign: ci === 0 ? 'left' : 'right',
              letterSpacing: col.mono ? '-0.01em' : 'normal',
            }}>{fmt(row[col.key], col)}</div>
          ))}
        </div>
      ))}
      {/* Total row */}
      <div style={{ display: 'grid', gridTemplateColumns: gridTpl, padding: '11px 16px', background: 'var(--bg-tertiary)', gap: '8px', alignItems: 'center', borderTop: `1px solid ${accentColor}33` }}>
        {columns.map((col, ci) => {
          if (ci === 0) return <div key={col.key} style={{ fontSize: '11px', color: 'var(--text-tertiary)', letterSpacing: '0.06em', fontWeight: 600, textTransform: 'uppercase' }}>Total {title}</div>;
          if (!col.sumable) return <div key={col.key} />;
          return (
            <div key={col.key} style={{ fontSize: '13px', fontFamily: 'var(--font-mono)', color: accentColor, textAlign: 'right', fontWeight: 500, letterSpacing: '-0.01em' }}>
              {fmt(totalRow[col.key], col)}
            </div>
          );
        })}
      </div>
    </div>
  );
};

/* ── StatusBadge ──────────────────────────────────────────── */
const StatusBadge = ({ label, color }) => (
  <span style={{
    display: 'inline-block', padding: '2px 8px', borderRadius: '4px',
    fontSize: '11px', fontWeight: 500, whiteSpace: 'nowrap',
    color, background: color + '1A', border: `1px solid ${color}33`,
  }}>{label}</span>
);

/* ── Btn ──────────────────────────────────────────────────── */
const Btn = ({ children, onClick, variant = 'primary', size = 'md', icon, accentColor = 'var(--accent-industrial)', disabled = false }) => {
  const [hov, setHov] = useState(false);
  const base = {
    display: 'inline-flex', alignItems: 'center', gap: '6px',
    padding: size === 'sm' ? '5px 10px' : size === 'lg' ? '11px 22px' : '7px 14px',
    borderRadius: '6px', cursor: disabled ? 'not-allowed' : 'pointer',
    fontSize: size === 'sm' ? '12px' : '13px', fontWeight: 500,
    border: 'none', fontFamily: 'var(--font-sans)', transition: 'all 0.15s',
    opacity: disabled ? 0.5 : 1,
  };
  const variants = {
    primary:  { background: hov ? accentColor + 'DD' : accentColor, color: '#fff' },
    secondary:{ background: hov ? 'var(--bg-tertiary)' : 'var(--bg-secondary)', color: 'var(--text-secondary)', border: '1px solid var(--border-subtle)' },
    ghost:    { background: hov ? 'var(--bg-tertiary)' : 'transparent', color: 'var(--text-secondary)', border: '1px solid transparent' },
    danger:   { background: hov ? 'var(--accent-danger)CC' : 'var(--accent-danger)1A', color: 'var(--accent-danger)', border: '1px solid var(--accent-danger)33' },
  };
  return (
    <button
      onClick={disabled ? undefined : onClick}
      onMouseEnter={() => setHov(true)} onMouseLeave={() => setHov(false)}
      style={{ ...base, ...variants[variant] }}
    >
      {icon && <Icon name={icon} size={14} />}
      {children}
    </button>
  );
};

/* ── Divider ──────────────────────────────────────────────── */
const Divider = ({ style: s = {} }) => <div style={{ height: '1px', background: 'var(--border-subtle)', ...s }} />;

/* ── SectionCard ──────────────────────────────────────────── */
const SectionCard = ({ title, children, action }) => (
  <div style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border-subtle)', borderRadius: '8px', overflow: 'hidden' }}>
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '14px 20px', borderBottom: '1px solid var(--border-subtle)' }}>
      <span style={{ fontSize: '13px', fontWeight: 500, color: 'var(--text-primary)' }}>{title}</span>
      {action}
    </div>
    <div style={{ padding: '20px' }}>{children}</div>
  </div>
);

/* ── MOCK_BY_NEGOCIO ──────────────────────────────────────── */
const MOCK_BY_NEGOCIO = {
  n1: {
    productos: [
      { id:'p1', nombre:'Queso fresco 500g',   sku:'QF-001', costoUnit:38.70, pvp:50.31, margen:30, fichaReciente:true,  activo:true  },
      { id:'p2', nombre:'Yogur natural 250ml',  sku:'YN-002', costoUnit:12.40, pvp:16.12, margen:30, fichaReciente:true,  activo:true  },
      { id:'p3', nombre:'Mantequilla 200g',     sku:'MT-003', costoUnit:18.90, pvp:24.57, margen:30, fichaReciente:false, activo:true  },
      { id:'p4', nombre:'Requesón 300g',        sku:'RQ-004', costoUnit:14.20, pvp:18.46, margen:30, fichaReciente:false, activo:true  },
      { id:'p5', nombre:'Queso maduro 1kg',     sku:'QM-005', costoUnit:92.30, pvp:120.0, margen:30, fichaReciente:false, activo:false },
    ],
    insumos: [
      { id:'i1', nombre:'Leche entera fresca',     sku:'INS-001', categoria:'Materia prima',    catColor:'#3B82F6', unidad:'L',  precio:4.80,  proveedor:'Coboce Lácteos',   variable:true,  activo:true  },
      { id:'i2', nombre:'Cuajo enzimático',         sku:'INS-002', categoria:'Insumos químicos', catColor:'#F59E0B', unidad:'kg', precio:420,   proveedor:'TecnoLácteos',     variable:true,  activo:true  },
      { id:'i3', nombre:'Sal refinada',             sku:'INS-003', categoria:'Materia prima',    catColor:'#3B82F6', unidad:'kg', precio:8.50,  proveedor:'Salinas de Uyuni', variable:true,  activo:true  },
      { id:'i4', nombre:'Cloruro de calcio',        sku:'INS-004', categoria:'Insumos químicos', catColor:'#F59E0B', unidad:'kg', precio:95,    proveedor:'TecnoLácteos',     variable:true,  activo:true  },
      { id:'i5', nombre:'Fermento láctico',         sku:'INS-005', categoria:'Insumos químicos', catColor:'#F59E0B', unidad:'kg', precio:650,   proveedor:'TecnoLácteos',     variable:true,  activo:true  },
      { id:'i6', nombre:'Envase plástico 500g',     sku:'INS-006', categoria:'Empaque',          catColor:'#22C55E', unidad:'u',  precio:1.20,  proveedor:'Plastibol Envases', variable:true, activo:true  },
      { id:'i7', nombre:'Etiqueta autoadhesiva',    sku:'INS-007', categoria:'Empaque',          catColor:'#22C55E', unidad:'u',  precio:0.35,  proveedor:'Grafimundo',        variable:true, activo:true  },
      { id:'i8', nombre:'Detergente industrial',    sku:'INS-008', categoria:'Limpieza',         catColor:'#8B5CF6', unidad:'kg', precio:28,    proveedor:'Química Beni',      variable:false, activo:false },
    ],
    proveedores: ['Coboce Lácteos S.R.L.','TecnoLácteos Bolivia','Salinas de Uyuni Ltda.','Plastibol Envases','Grafimundo Impresiones','Química Beni S.A.','YPFB Gas Domiciliario'],
    fichas: [
      { id:'f1', fecha:'28 Abr 2025, 10:32', producto:'Queso fresco 500g',   lote:100, costoUnit:38.70, pvp:50.31, margen:30, mpd:2734, mod:875, cif:851 },
      { id:'f2', fecha:'27 Abr 2025, 15:18', producto:'Yogur natural 250ml',  lote:200, costoUnit:12.40, pvp:16.12, margen:30, mpd:1680, mod:480, cif:320 },
      { id:'f3', fecha:'25 Abr 2025, 09:44', producto:'Mantequilla 200g',     lote:150, costoUnit:18.90, pvp:24.57, margen:30, mpd:2100, mod:540, cif:195 },
      { id:'f4', fecha:'22 Abr 2025, 14:05', producto:'Queso fresco 500g',    lote:80,  costoUnit:39.10, pvp:50.83, margen:30, mpd:2210, mod:700, cif:218 },
    ],
    dashMetrics: { productos:4, insumos:7, ultimaFicha:'hace 2h', pe:197 },
  },
  n3: {
    productos: [
      { id:'p1', nombre:'Chompa de alpaca M',    sku:'CH-001', costoUnit:142.0, pvp:210.0, margen:48, fichaReciente:true,  activo:true  },
      { id:'p2', nombre:'Chalina tejida 180cm',  sku:'CL-002', costoUnit:58.50, pvp:85.0,  margen:45, fichaReciente:true,  activo:true  },
      { id:'p3', nombre:'Guantes lana fina',     sku:'GV-003', costoUnit:22.30, pvp:35.0,  margen:57, fichaReciente:false, activo:true  },
      { id:'p4', nombre:'Poncho ceremonial',     sku:'PC-004', costoUnit:380.0, pvp:580.0, margen:53, fichaReciente:false, activo:false },
    ],
    insumos: [
      { id:'i1', nombre:'Fibra de alpaca cruda',    sku:'TX-001', categoria:'Materia prima',    catColor:'#3B82F6', unidad:'kg', precio:95.0,  proveedor:'Alpacas del Sur',    variable:true,  activo:true  },
      { id:'i2', nombre:'Hilo de lana merino',      sku:'TX-002', categoria:'Materia prima',    catColor:'#3B82F6', unidad:'kg', precio:68.0,  proveedor:'Hilados Oruro',      variable:true,  activo:true  },
      { id:'i3', nombre:'Tinte natural cochinilla', sku:'TX-003', categoria:'Insumos químicos', catColor:'#F59E0B', unidad:'kg', precio:220.0, proveedor:'Colorantes Bolivia', variable:true,  activo:true  },
      { id:'i4', nombre:'Tinte sintético azul',     sku:'TX-004', categoria:'Insumos químicos', catColor:'#F59E0B', unidad:'kg', precio:85.0,  proveedor:'Colorantes Bolivia', variable:true,  activo:true  },
      { id:'i5', nombre:'Etiqueta tejida marca',    sku:'TX-005', categoria:'Empaque',          catColor:'#22C55E', unidad:'u',  precio:1.80,  proveedor:'Grafimundo',         variable:true,  activo:true  },
      { id:'i6', nombre:'Bolsa kraft con logo',     sku:'TX-006', categoria:'Empaque',          catColor:'#22C55E', unidad:'u',  precio:3.50,  proveedor:'Grafimundo',         variable:true,  activo:true  },
      { id:'i7', nombre:'Aceite de cardado',        sku:'TX-007', categoria:'Mantenimiento',    catColor:'#EC4899', unidad:'L',  precio:45.0,  proveedor:'Lubricantes Beni',   variable:false, activo:false },
    ],
    proveedores: ['Alpacas del Sur S.R.L.','Hilados Oruro Ltda.','Colorantes Bolivia S.A.','Grafimundo Impresiones','Lubricantes Beni'],
    fichas: [
      { id:'f1', fecha:'26 Abr 2025, 09:15', producto:'Chompa de alpaca M',   lote:20, costoUnit:142.0, pvp:210.0, margen:48, mpd:1840, mod:960, cif:540 },
      { id:'f2', fecha:'24 Abr 2025, 14:30', producto:'Chalina tejida 180cm', lote:50, costoUnit:58.50, pvp:85.0,  margen:45, mpd:1950, mod:720, cif:255 },
    ],
    dashMetrics: { productos:3, insumos:6, ultimaFicha:'hace 1 día', pe:84 },
  },
  n2: {
    productos: [],
    insumos: [],
    proveedores: [],
    fichas: [],
    dashMetrics: { lotes:3, animales:89, costoTotal:24460, mejorIca:2.8 },
  },
};

Object.assign(window, {
  MoneyDisplay, RubroBadge, ChipSelector, Input, MetricCard,
  WIPBars, PuntoEquilibrioCard, NegocioSelector, CostTable,
  StatusBadge, Btn, Divider, SectionCard, MOCK_BY_NEGOCIO,
});
