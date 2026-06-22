import React, { useState, useEffect } from 'react';
import { Icon } from '../icons.jsx';
import { NegocioSelector } from '../components/ui.jsx';

const NAV_INDUSTRIAL = [
  { id: 'dashboard',  label: 'Dashboard',        icon: 'dashboard' },
  { id: 'fichas',     label: 'Fichas de costo',  icon: 'calculator' },
  { id: 'productos',  label: 'Productos',         icon: 'package' },
  { id: 'insumos',    label: 'Insumos',           icon: 'layers' },
  { id: 'compras',    label: 'Inventario',        icon: 'archive' },
  { id: 'proveedores',label: 'Proveedores',       icon: 'truck' },
  { id: 'gastos',     label: 'Gastos CIF',        icon: 'dollarSign' },
  { id: 'historial',  label: 'Historial fichas',  icon: 'history' },
];
const NAV_AGRO = [
  { id: 'dashboard',  label: 'Dashboard',         icon: 'dashboard' },
  { 
    id: 'lotes_group',  
    label: 'Lotes activos',     
    icon: 'cow',
    subItems: [
      { id: 'lotes',      label: 'Ver lotes',         icon: 'menu' },
      { id: 'diario',     label: 'Diario de producción', icon: 'clipboardList' },
      { id: 'pendientes', label: 'Pendientes',        icon: 'bell' },
      { id: 'liquidacion',label: 'Liquidación',       icon: 'scale' },
      { id: 'catalogocortes', label: 'Catálogo de Cortes', icon: 'scissors' },
    ]
  },
  { 
    id: 'operarios_group',  
    label: 'Operarios',     
    icon: 'user',
    subItems: [
      { id: 'operarios', label: 'Gestión', icon: 'user' },
      { id: 'reportesoperarios', label: 'Productividad', icon: 'barChart' },
    ]
  },
  { id: 'rutinas',    label: 'Rutinas y Tareas',  icon: 'calendar' },
  { id: 'insumos',    label: 'Insumos',           icon: 'layers' },
  { id: 'compras',    label: 'Inventario',        icon: 'archive' },
  { id: 'proveedores',label: 'Proveedores',       icon: 'truck' },
  { id: 'servicios',  label: 'Servicios',         icon: 'wrench' },
  { id: 'precios',    label: 'Precios Mercado',   icon: 'tag' },
  { id: 'fuentesdatos', label: 'Fuentes de Datos', icon: 'database' },
  { id: 'recomendaciones', label: 'Recomendaciones de Venta', icon: 'trendingUp' },
];
const NAV_BOTTOM = [
  { id: 'config',     label: 'Configuración',     icon: 'settings' },
  { id: 'unidades',   label: 'Unidades',          icon: 'ruler' },
  { id: 'categorias', label: 'Categorías',        icon: 'tag' },
];

/* ── Theme hook ───────────────────────────────────────────── */
const useTheme = () => {
  const [theme, setTheme] = useState(() => localStorage.getItem('cu_theme') || 'dark');
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('cu_theme', theme);
  }, [theme]);
  const toggle = () => setTheme(t => t === 'dark' ? 'light' : 'dark');
  return [theme, toggle];
};

const AppLayout = ({ page, onNavigate, negocioId, onNegocioChange, negocios = [], user, onLogout, children }) => {
  const [collapsed, setCollapsed] = useState(false);
  const [theme, toggleTheme] = useTheme();
  const [adminOpen, setAdminOpen] = useState(false);
  const adminRef = React.useRef(null);
  React.useEffect(() => {
    const h = e => { if (adminRef.current && !adminRef.current.contains(e.target)) setAdminOpen(false); };
    document.addEventListener('mousedown', h);
    return () => document.removeEventListener('mousedown', h);
  }, []);
  const negocio = negocios.find(n => n.id === negocioId) || negocios[0] || { rubro: 'industrial' };
  const isAgro = negocio.rubro === 'agro_ganadero';
  const rubroColor = isAgro ? 'var(--accent-agro)' : 'var(--accent-industrial)';
  const NAV_ITEMS = isAgro ? NAV_AGRO : NAV_INDUSTRIAL;
  const sw = collapsed ? 60 : 240;

  const userNombre = user?.nombre || 'Usuario';
  const userInicial = userNombre.charAt(0).toUpperCase();
  const userEmail = user?.email || '';

  const NavItem = ({ item }) => {
    const isChildActive = item.subItems && item.subItems.some(sub => sub.id === page);
    const active = page === item.id || isChildActive;
    const [hov, setHov] = useState(false);
    const hasSubItems = !!item.subItems;
    const [expanded, setExpanded] = useState(isChildActive);

    useEffect(() => {
      if (isChildActive) setExpanded(true);
    }, [page, isChildActive]);

    const handleClick = () => {
      if (hasSubItems) {
        setExpanded(!expanded);
      } else {
        onNavigate(item.id);
      }
    };

    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: '2px', width: '100%' }}>
        <button
          onClick={handleClick}
          onMouseEnter={() => setHov(true)} onMouseLeave={() => setHov(false)}
          title={collapsed ? item.label : ''}
          style={{
            display: 'flex', alignItems: 'center', gap: '10px',
            padding: collapsed ? '10px 0' : '8px 12px',
            justifyContent: collapsed ? 'center' : 'flex-start',
            width: '100%', border: 'none',
            background: (page === item.id || (hasSubItems && isChildActive && collapsed)) ? rubroColor + '18' : hov ? 'var(--bg-tertiary)' : 'transparent',
            color: (page === item.id || (hasSubItems && isChildActive)) ? rubroColor : hov ? 'var(--text-primary)' : 'var(--text-secondary)',
            borderRadius: '6px', cursor: 'pointer',
            fontSize: '13px', fontFamily: 'var(--font-sans)',
            transition: 'background 0.15s, color 0.15s',
            position: 'relative',
          }}
        >
          {(page === item.id || (hasSubItems && isChildActive && collapsed)) && <span style={{ position: 'absolute', left: collapsed ? 0 : -12, top: '50%', transform: 'translateY(-50%)', width: 2, height: '60%', background: rubroColor, borderRadius: '0 2px 2px 0' }} />}
          <Icon name={item.icon} size={16} style={{ flexShrink: 0 }} />
          {!collapsed && <span style={{ fontWeight: (page === item.id || (hasSubItems && isChildActive)) ? 500 : 400, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', flex: 1, textAlign: 'left' }}>{item.label}</span>}
          {!collapsed && hasSubItems && (
            <Icon name={expanded ? 'chevronDown' : 'chevronRight'} size={14} style={{ opacity: 0.6 }} />
          )}
        </button>
        {!collapsed && hasSubItems && expanded && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '2px', paddingLeft: '26px', marginTop: '2px' }}>
            {item.subItems.map(sub => {
              const subActive = page === sub.id;
              return (
                <button
                  key={sub.id}
                  onClick={() => onNavigate(sub.id)}
                  style={{
                    display: 'flex', alignItems: 'center', gap: '8px',
                    padding: '6px 10px', width: '100%', border: 'none',
                    background: subActive ? rubroColor + '18' : 'transparent',
                    color: subActive ? rubroColor : 'var(--text-secondary)',
                    borderRadius: '6px', cursor: 'pointer',
                    fontSize: '12.5px', fontFamily: 'var(--font-sans)',
                    textAlign: 'left',
                    transition: 'background 0.15s, color 0.15s',
                  }}
                  onMouseEnter={e => { if (!subActive) { e.currentTarget.style.background = 'var(--bg-tertiary)'; e.currentTarget.style.color = 'var(--text-primary)'; } }}
                  onMouseLeave={e => { if (!subActive) { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = 'var(--text-secondary)'; } }}
                >
                  <Icon name={sub.icon} size={14} style={{ opacity: subActive ? 1 : 0.7 }} />
                  <span style={{ fontWeight: subActive ? 500 : 400 }}>{sub.label}</span>
                </button>
              );
            })}
          </div>
        )}
      </div>
    );
  };

  return (
    <div style={{ display: 'flex', height: '100vh', overflow: 'hidden' }}>
      {/* Sidebar */}
      <aside style={{
        width: sw, flexShrink: 0,
        background: 'var(--bg-secondary)',
        borderRight: '1px solid var(--border-subtle)',
        display: 'flex', flexDirection: 'column',
        transition: 'width 0.2s ease',
        overflow: 'hidden', position: 'relative',
      }}>
        <div style={{ position: 'absolute', top: 0, left: 0, bottom: 0, width: '2px', background: rubroColor, opacity: 0.7 }} />

        {/* Logo */}
        <div style={{ padding: collapsed ? '16px 0' : '16px', display: 'flex', alignItems: 'center', gap: '10px', justifyContent: collapsed ? 'center' : 'flex-start', borderBottom: '1px solid var(--border-subtle)', minHeight: 56 }}>
          <div style={{ width: 28, height: 28, background: rubroColor, borderRadius: '6px', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, fontSize: '13px', fontWeight: 700, color: '#fff', fontFamily: 'IBM Plex Mono, monospace' }}>CU</div>
          {!collapsed && <span style={{ fontSize: '14px', fontWeight: 500, color: 'var(--text-primary)', whiteSpace: 'nowrap' }}>CosteoUniversal</span>}
        </div>

        {/* Negocio selector */}
        {!collapsed && (
          <div style={{ padding: '10px 14px', borderBottom: '1px solid var(--border-subtle)' }}>
            <div style={{ fontSize: '10px', color: 'var(--text-tertiary)', letterSpacing: '0.07em', textTransform: 'uppercase', marginBottom: '8px' }}>Negocio activo</div>
            <NegocioSelector negocios={negocios} selected={negocioId} onSelect={id => { onNegocioChange(id); onNavigate('dashboard'); }} />
          </div>
        )}

        {/* Main nav */}
        <nav style={{ flex: 1, padding: collapsed ? '10px 8px' : '10px 12px', display: 'flex', flexDirection: 'column', gap: '2px', overflowY: 'auto' }}>
          {NAV_ITEMS.map(item => <NavItem key={item.id} item={item} />)}
        </nav>

        {/* Bottom nav */}
        <div style={{ padding: collapsed ? '10px 8px' : '10px 12px', borderTop: '1px solid var(--border-subtle)', display: 'flex', flexDirection: 'column', gap: '2px' }}>
          {NAV_BOTTOM.map(item => <NavItem key={item.id} item={item} />)}
          <button
            onClick={() => setCollapsed(!collapsed)}
            style={{ display: 'flex', alignItems: 'center', justifyContent: collapsed ? 'center' : 'flex-end', padding: '8px', border: 'none', background: 'transparent', color: 'var(--text-tertiary)', cursor: 'pointer', borderRadius: '6px', marginTop: '4px' }}
            onMouseEnter={e => e.currentTarget.style.color = 'var(--text-secondary)'}
            onMouseLeave={e => e.currentTarget.style.color = 'var(--text-tertiary)'}
          >
            <Icon name={collapsed ? 'chevronRight' : 'chevronLeft'} size={14} />
          </button>
        </div>
      </aside>

      {/* Main */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        {/* Topbar */}
        <header style={{ height: 56, flexShrink: 0, background: 'var(--bg-secondary)', borderBottom: '1px solid var(--border-subtle)', display: 'flex', alignItems: 'center', padding: '0 24px', gap: '16px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flex: 1, fontSize: '13px', color: 'var(--text-tertiary)' }}>
            <span>CosteoUniversal</span>
            <Icon name="chevronRight" size={12} />
            <span style={{ color: 'var(--text-primary)', fontWeight: 500 }}>
              {(() => {
                const allNavItems = [...NAV_INDUSTRIAL, ...NAV_AGRO, ...NAV_BOTTOM].flatMap(n => n.subItems ? [n, ...n.subItems] : [n]);
                return allNavItems.find(n => n.id === page)?.label || 'Dashboard';
              })()}
            </span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <button onClick={toggleTheme} title={theme === 'dark' ? 'Cambiar a modo claro' : 'Cambiar a modo oscuro'}
              style={{ background: 'transparent', border: '1px solid var(--border-subtle)', borderRadius: '6px', color: 'var(--text-secondary)', cursor: 'pointer', padding: '5px 7px', display: 'flex', alignItems: 'center', transition: 'all 0.15s' }}
              onMouseEnter={e => { e.currentTarget.style.background = 'var(--bg-tertiary)'; e.currentTarget.style.color = 'var(--text-primary)'; }}
              onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = 'var(--text-secondary)'; }}
            >
              <Icon name={theme === 'dark' ? 'sun' : 'moon'} size={15} />
            </button>
            <div style={{ width: '1px', height: '20px', background: 'var(--border-subtle)' }} />
            {/* Admin dropdown */}
            <div ref={adminRef} style={{ position: 'relative' }}>
              <div onClick={() => setAdminOpen(o => !o)} style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
                <div style={{ width: 28, height: 28, borderRadius: '50%', background: rubroColor + '33', border: `1px solid ${rubroColor}55`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '12px', fontWeight: 600, color: rubroColor }}>{userInicial}</div>
                <span style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>{userNombre}</span>
                <Icon name="chevronDown" size={13} style={{ color: 'var(--text-tertiary)' }} />
              </div>
              {adminOpen && (
                <div style={{ position: 'absolute', top: '44px', right: 0, width: '220px', background: 'var(--bg-secondary)', border: '1px solid var(--border-mid)', borderRadius: '8px', boxShadow: 'var(--shadow-md)', zIndex: 200, overflow: 'hidden' }}>
                  <div style={{ padding: '12px 16px', borderBottom: '1px solid var(--border-subtle)', display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <div style={{ width: 36, height: 36, borderRadius: '50%', background: rubroColor + '33', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '15px', fontWeight: 600, color: rubroColor, flexShrink: 0 }}>{userInicial}</div>
                    <div>
                      <div style={{ fontSize: '13px', fontWeight: 500, color: 'var(--text-primary)' }}>{userNombre}</div>
                      <div style={{ fontSize: '11px', color: 'var(--text-tertiary)' }}>{userEmail}</div>
                    </div>
                  </div>
                  <button onClick={() => { onNavigate('config'); setAdminOpen(false); }}
                    style={{ display: 'flex', alignItems: 'center', gap: '10px', width: '100%', padding: '9px 16px', background: 'transparent', border: 'none', color: 'var(--text-secondary)', fontSize: '13px', cursor: 'pointer', fontFamily: 'var(--font-sans)' }}
                    onMouseEnter={e => e.currentTarget.style.background = 'var(--bg-tertiary)'}
                    onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                  ><Icon name="user" size={14} /><span>Mi cuenta</span></button>
                  <button onClick={toggleTheme}
                    style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', width: '100%', padding: '8px 16px', background: 'transparent', border: 'none', cursor: 'pointer', fontFamily: 'var(--font-sans)' }}
                    onMouseEnter={e => e.currentTarget.style.background = 'var(--bg-tertiary)'}
                    onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', color: 'var(--text-secondary)', fontSize: '13px' }}>
                      <Icon name={theme === 'dark' ? 'sun' : 'moon'} size={14} />
                      <span>{theme === 'dark' ? 'Modo claro' : 'Modo oscuro'}</span>
                    </div>
                    <span style={{ fontSize: '11px', color: 'var(--text-tertiary)', paddingLeft: '24px' }}>Cambiar apariencia</span>
                  </button>
                  <div style={{ height: '1px', background: 'var(--border-subtle)', margin: '4px 0' }} />
                  <div style={{ fontSize: '10px', textTransform: 'uppercase', color: 'var(--text-tertiary)', padding: '6px 16px 4px', letterSpacing: '0.07em' }}>Mis negocios</div>
                  {negocios.map(n => {
                    const isActive = n.id === negocioId;
                    const dotC = n.rubro === 'agro_ganadero' ? 'var(--accent-agro)' : 'var(--accent-industrial)';
                    return (
                      <button key={n.id} onClick={() => { onNegocioChange(n.id); setAdminOpen(false); }}
                        style={{ display: 'flex', alignItems: 'center', gap: '10px', width: '100%', padding: '8px 16px', background: 'transparent', border: 'none', color: isActive ? 'var(--text-primary)' : 'var(--text-secondary)', fontSize: '13px', fontWeight: isActive ? 500 : 400, cursor: 'pointer', fontFamily: 'var(--font-sans)' }}
                        onMouseEnter={e => e.currentTarget.style.background = 'var(--bg-tertiary)'}
                        onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                      >
                        <span style={{ width: 8, height: 8, borderRadius: '50%', background: dotC, display: 'inline-block', flexShrink: 0 }} />
                        <span style={{ flex: 1 }}>{n.nombre}</span>
                        {isActive && <Icon name="check" size={12} style={{ color: 'var(--text-tertiary)' }} />}
                      </button>
                    );
                  })}
                  <button onClick={() => { onNavigate('config'); setAdminOpen(false); }}
                    style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', width: '100%', padding: '8px 16px', background: 'transparent', border: 'none', cursor: 'pointer', fontFamily: 'var(--font-sans)' }}
                    onMouseEnter={e => e.currentTarget.style.background = 'var(--bg-tertiary)'}
                    onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', color: rubroColor, fontSize: '13px' }}>
                      <Icon name="plus" size={14} /><span>+ Nuevo negocio</span>
                    </div>
                    <span style={{ fontSize: '11px', color: 'var(--text-tertiary)', paddingLeft: '24px' }}>Crear negocio adicional</span>
                  </button>
                  <div style={{ height: '1px', background: 'var(--border-subtle)', margin: '4px 0' }} />
                  <button onClick={() => { onLogout(); setAdminOpen(false); }}
                    style={{ display: 'flex', alignItems: 'center', gap: '10px', width: '100%', padding: '9px 16px', background: 'transparent', border: 'none', color: 'var(--accent-danger)', fontSize: '13px', cursor: 'pointer', fontFamily: 'var(--font-sans)' }}
                    onMouseEnter={e => e.currentTarget.style.background = 'var(--bg-tertiary)'}
                    onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                  ><Icon name="logOut" size={14} /><span>Cerrar sesión</span></button>
                </div>
              )}
            </div>
          </div>
        </header>

        {/* Content */}
        <main style={{ flex: 1, overflowY: 'auto', padding: '24px', background: 'var(--bg-primary)' }}>
          <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
            {children}
          </div>
        </main>
      </div>
    </div>
  );
};

export { AppLayout, useTheme };
