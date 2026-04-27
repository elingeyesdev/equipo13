// CosteoUniversal — Configuración
const { useState } = React;

const MONEDAS = ['BOB (Bs)', 'USD ($)', 'ARS ($)', 'PEN (S/)'];

const Configuracion = ({ negocioId, onNavigate }) => {
  const negocio = NEGOCIOS.find(n => n.id === negocioId) || NEGOCIOS[0];
  const isAgro = negocio.rubro === 'agro_ganadero';
  const accentColor = isAgro ? 'var(--accent-agro)' : 'var(--accent-industrial)';
  const [subPage, setSubPage] = useState('datos');
  const [theme, toggleTheme] = useTheme();
  const [nombre, setNombre] = useState(negocio.nombre);
  const [moneda, setMoneda] = useState('BOB (Bs)');

  const SUB_MENU = [
    { id: 'datos',     label: 'Datos del negocio', icon: 'building'    },
    { id: 'unidades',  label: 'Unidades de medida', icon: 'ruler'       },
    { id: 'categorias',label: 'Categorías',          icon: 'tag'         },
    { id: 'apariencia',label: 'Apariencia',          icon: 'eye'         },
    { id: 'cuenta',    label: 'Mi cuenta',           icon: 'user'        },
  ];

  const SubMenuItem = ({ item }) => {
    const active = subPage === item.id;
    return (
      <button onClick={() => setSubPage(item.id)} style={{
        display: 'flex', alignItems: 'center', gap: '10px',
        padding: '9px 12px', borderRadius: '6px', width: '100%',
        border: 'none', cursor: 'pointer', fontSize: '13px',
        background: active ? accentColor + '18' : 'transparent',
        color: active ? accentColor : 'var(--text-secondary)',
        fontFamily: 'IBM Plex Sans, sans-serif', fontWeight: active ? 500 : 400,
        transition: 'all 0.15s', textAlign: 'left',
      }}
        onMouseEnter={e => { if (!active) e.currentTarget.style.background = 'var(--bg-tertiary)'; }}
        onMouseLeave={e => { if (!active) e.currentTarget.style.background = 'transparent'; }}
      >
        <Icon name={item.icon} size={14} style={{ flexShrink: 0 }} />
        {item.label}
      </button>
    );
  };

  const FieldRow = ({ label, children, hint }) => (
    <div style={{ display: 'grid', gridTemplateColumns: '180px 1fr', gap: '20px', alignItems: 'flex-start', padding: '16px 0', borderBottom: '1px solid var(--border-subtle)' }}>
      <div>
        <div style={{ fontSize: '13px', color: 'var(--text-primary)', fontWeight: 500, marginBottom: '3px' }}>{label}</div>
        {hint && <div style={{ fontSize: '12px', color: 'var(--text-tertiary)', lineHeight: 1.4 }}>{hint}</div>}
      </div>
      {children}
    </div>
  );

  const renderContent = () => {
    if (subPage === 'datos') return (
      <div>
        <div style={{ marginBottom: '24px' }}>
          <div style={{ fontSize: '17px', fontWeight: 500, color: 'var(--text-primary)', marginBottom: '4px' }}>Datos del negocio</div>
          <div style={{ fontSize: '13px', color: 'var(--text-tertiary)' }}>Información general de tu empresa o emprendimiento.</div>
        </div>
        <FieldRow label="Nombre del negocio" hint="Aparece en todos los reportes y documentos.">
          <input value={nombre} onChange={e => setNombre(e.target.value)}
            style={{ background: 'var(--bg-tertiary)', border: '1px solid var(--border-subtle)', borderRadius: '6px', color: 'var(--text-primary)', padding: '8px 12px', fontSize: '14px', outline: 'none', fontFamily: 'IBM Plex Sans, sans-serif', width: '100%' }}
            onFocus={e => e.target.style.borderColor = accentColor} onBlur={e => e.target.style.borderColor = 'var(--border-subtle)'}
          />
        </FieldRow>
        <FieldRow label="Rubro" hint="Para cambiar el rubro, creá un nuevo negocio.">
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <RubroBadge rubro={negocio.rubro} />
            <div style={{ display: 'flex', alignItems: 'center', gap: '5px', color: 'var(--text-tertiary)', fontSize: '12px' }}>
              <Icon name="lock" size={13} />
              No modificable
            </div>
          </div>
        </FieldRow>
        <FieldRow label="Moneda" hint="Símbolo que aparece en todos los valores.">
          <select value={moneda} onChange={e => setMoneda(e.target.value)} style={{ width: '180px' }}>
            {MONEDAS.map(m => <option key={m}>{m}</option>)}
          </select>
        </FieldRow>
        <div style={{ marginTop: '24px', display: 'flex', justifyContent: 'flex-end' }}>
          <Btn accentColor={accentColor} icon="save">Guardar cambios</Btn>
        </div>
      </div>
    );

    if (subPage === 'unidades') return (
      <div>
        <div style={{ marginBottom: '20px' }}>
          <div style={{ fontSize: '17px', fontWeight: 500, color: 'var(--text-primary)', marginBottom: '4px' }}>Unidades de medida</div>
          <div style={{ fontSize: '13px', color: 'var(--text-tertiary)' }}>Gestioná las unidades usadas en insumos y productos.</div>
        </div>
        <Btn accentColor={accentColor} icon="arrowRight" onClick={() => onNavigate('unidades')}>Ir a Unidades de medida</Btn>
      </div>
    );

    if (subPage === 'categorias') return (
      <div>
        <div style={{ marginBottom: '20px' }}>
          <div style={{ fontSize: '17px', fontWeight: 500, color: 'var(--text-primary)', marginBottom: '4px' }}>Categorías de insumos</div>
          <div style={{ fontSize: '13px', color: 'var(--text-tertiary)' }}>Organizá tus insumos en categorías con colores.</div>
        </div>
        <Btn accentColor={accentColor} icon="arrowRight" onClick={() => onNavigate('categorias')}>Ir a Categorías</Btn>
      </div>
    );

    if (subPage === 'apariencia') return (
      <div>
        <div style={{ marginBottom: '24px' }}>
          <div style={{ fontSize: '17px', fontWeight: 500, color: 'var(--text-primary)', marginBottom: '4px' }}>Apariencia</div>
          <div style={{ fontSize: '13px', color: 'var(--text-tertiary)' }}>Ajustá el aspecto visual del sistema.</div>
        </div>
        <FieldRow label="Tema de color" hint="El tema oscuro es más cómodo para sesiones largas de trabajo.">
          <div style={{ display: 'flex', gap: '10px' }}>
            {['dark', 'light'].map(t => (
              <button key={t} onClick={() => { if (theme !== t) toggleTheme(); }} style={{
                padding: '12px 20px', borderRadius: '8px', cursor: 'pointer', border: `2px solid ${theme === t ? accentColor : 'var(--border-subtle)'}`,
                background: theme === t ? accentColor + '12' : 'var(--bg-tertiary)',
                display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px',
                fontFamily: 'IBM Plex Sans, sans-serif', transition: 'all 0.15s',
              }}>
                <Icon name={t === 'dark' ? 'moon' : 'sun'} size={20} style={{ color: theme === t ? accentColor : 'var(--text-tertiary)' }} />
                <span style={{ fontSize: '12px', color: theme === t ? accentColor : 'var(--text-secondary)', fontWeight: theme === t ? 500 : 400 }}>
                  {t === 'dark' ? 'Oscuro' : 'Claro'}
                </span>
                {theme === t && <span style={{ fontSize: '10px', color: accentColor }}>● Activo</span>}
              </button>
            ))}
          </div>
        </FieldRow>
      </div>
    );

    if (subPage === 'cuenta') return (
      <div>
        <div style={{ marginBottom: '24px' }}>
          <div style={{ fontSize: '17px', fontWeight: 500, color: 'var(--text-primary)', marginBottom: '4px' }}>Mi cuenta</div>
          <div style={{ fontSize: '13px', color: 'var(--text-tertiary)' }}>Información personal y seguridad.</div>
        </div>
        <FieldRow label="Nombre completo">
          <input defaultValue="Admin" style={{ background: 'var(--bg-tertiary)', border: '1px solid var(--border-subtle)', borderRadius: '6px', color: 'var(--text-primary)', padding: '8px 12px', fontSize: '14px', outline: 'none', fontFamily: 'IBM Plex Sans, sans-serif', width: '100%' }}
            onFocus={e => e.target.style.borderColor = accentColor} onBlur={e => e.target.style.borderColor = 'var(--border-subtle)'}
          />
        </FieldRow>
        <FieldRow label="Email">
          <input defaultValue="admin@costseo.bo" style={{ background: 'var(--bg-tertiary)', border: '1px solid var(--border-subtle)', borderRadius: '6px', color: 'var(--text-primary)', padding: '8px 12px', fontSize: '14px', outline: 'none', fontFamily: 'IBM Plex Sans, sans-serif', width: '100%' }}
            onFocus={e => e.target.style.borderColor = accentColor} onBlur={e => e.target.style.borderColor = 'var(--border-subtle)'}
          />
        </FieldRow>

        {/* Roles — EN DESARROLLO */}
        <div style={{ marginTop: '28px', background: 'var(--bg-secondary)', border: '1px solid var(--border-subtle)', borderRadius: '8px', padding: '20px 24px', display: 'flex', alignItems: 'flex-start', gap: '16px' }}>
          <div style={{ color: 'var(--text-tertiary)', flexShrink: 0 }}><Icon name="lock" size={20} /></div>
          <div style={{ flex: 1 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '8px' }}>
              <span style={{ fontSize: '14px', fontWeight: 500, color: 'var(--text-primary)' }}>Roles y permisos</span>
              <span style={{ padding: '2px 8px', borderRadius: '4px', fontSize: '11px', fontWeight: 600, color: 'var(--accent-warning)', background: 'var(--accent-warning)18', border: '1px solid var(--accent-warning)33', letterSpacing: '0.05em' }}>EN DESARROLLO</span>
            </div>
            <p style={{ fontSize: '13px', color: 'var(--text-secondary)', lineHeight: 1.6 }}>
              Próximamente podrás invitar operarios y asignarles acceso solo a registro de gastos y bitácora de alimentación.
            </p>
          </div>
        </div>
      </div>
    );

    return null;
  };

  return (
    <div style={{ display: 'flex', gap: '28px' }}>
      {/* Sub-sidebar */}
      <div style={{ width: '200px', flexShrink: 0 }}>
        <div style={{ fontSize: '11px', color: 'var(--text-tertiary)', letterSpacing: '0.07em', textTransform: 'uppercase', marginBottom: '10px', paddingLeft: '12px' }}>Configuración</div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
          {SUB_MENU.map(item => <SubMenuItem key={item.id} item={item} />)}
        </div>
      </div>

      {/* Content */}
      <div style={{ flex: 1, background: 'var(--bg-secondary)', border: '1px solid var(--border-subtle)', borderRadius: '8px', padding: '24px 28px' }}>
        {renderContent()}
      </div>
    </div>
  );
};

Object.assign(window, { Configuracion });
