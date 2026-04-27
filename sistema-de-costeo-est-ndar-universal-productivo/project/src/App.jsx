// CosteoUniversal — Root App v2
const { useState, useEffect } = React;

const STORAGE_KEY = 'cu_state_v2';

const loadState = () => {
  try { const raw = localStorage.getItem(STORAGE_KEY); if (raw) return JSON.parse(raw); } catch (e) {}
  return null;
};

// Apply saved theme immediately before render
const savedTheme = localStorage.getItem('cu_theme') || 'dark';
document.documentElement.setAttribute('data-theme', savedTheme);

const GastosCIFPlaceholder = ({ rubro }) => {
  const isAgro = rubro === 'agro_ganadero';
  const accentColor = isAgro ? 'var(--accent-agro)' : 'var(--accent-industrial)';
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      <h1 style={{ fontSize: '22px', fontWeight: 400, color: 'var(--text-primary)', letterSpacing: '-0.02em' }}>
        {isAgro ? 'Gastos adicionales del lote' : 'Gastos CIF'}
      </h1>
      <div style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border-subtle)', borderRadius: '10px', padding: '48px 40px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '16px', textAlign: 'center', maxWidth: '540px', margin: '0 auto' }}>
        <div style={{ color: 'var(--text-tertiary)' }}><Icon name="construction" size={40} strokeWidth={1} /></div>
        <div style={{ fontSize: '16px', fontWeight: 500, color: 'var(--text-primary)' }}>Esta sección estará disponible en el Sprint 3</div>
        <div style={{ fontSize: '14px', color: 'var(--text-secondary)', lineHeight: 1.7, maxWidth: '380px' }}>
          {isAgro
            ? 'Aquí podrás registrar gastos fijos del campo (alquiler de pasturas, agua, amortización de instalaciones) que se prorratearán entre los lotes activos.'
            : 'Aquí podrás registrar tus costos indirectos mensuales (electricidad, alquiler, mantenimiento) para que el sistema los prorratee automáticamente en cada ficha.'}
        </div>
        <div style={{ padding: '10px 16px', background: accentColor + '10', border: `1px solid ${accentColor}22`, borderRadius: '6px', fontSize: '13px', color: 'var(--text-secondary)', lineHeight: 1.6 }}>
          {isAgro
            ? 'Por ahora podés registrar estos gastos manualmente en la bitácora de cada lote usando "Otro gasto".'
            : 'Por ahora, en la ficha de costo podés usar el método simplificado de % sobre MPD+MOD.'}
        </div>
      </div>
    </div>
  );
};

const App = () => {
  const saved = loadState();
  const [onboarded, setOnboarded] = useState(saved?.onboarded ?? false);
  const [page, setPage] = useState(saved?.page ?? 'dashboard');
  const [negocioId, setNegocioId] = useState(saved?.negocioId ?? 'n1');
  const [activeLote, setActiveLote] = useState(null);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ onboarded, page, negocioId }));
  }, [onboarded, page, negocioId]);

  const negocio = NEGOCIOS.find(n => n.id === negocioId) || NEGOCIOS[0];
  const isAgro = negocio.rubro === 'agro_ganadero';

  const navigate = p => setPage(p);

  const renderPage = () => {
    switch (page) {
      case 'dashboard':   return <Dashboard negocioId={negocioId} onNavigate={navigate} />;
      case 'fichas':      return <FichaCosto negocioId={negocioId} />;
      case 'productos':   return <Productos negocioId={negocioId} onNavigate={navigate} />;
      case 'insumos':     return <Insumos negocioId={negocioId} />;
      case 'proveedores': return <Proveedores negocioId={negocioId} />;
      case 'historial':   return <Historial negocioId={negocioId} />;
      case 'gastos':      return <GastosCIFPlaceholder rubro={negocio.rubro} />;
      case 'unidades':    return <Unidades negocioId={negocioId} />;
      case 'categorias':  return <Categorias negocioId={negocioId} />;
      case 'config':      return <Configuracion negocioId={negocioId} onNavigate={navigate} />;
      // Agro pages
      case 'lotes':       return <Lotes negocioId={negocioId} onNavigate={navigate} setActiveLote={setActiveLote} />;
      case 'bitacora':    return <Bitacora negocioId={negocioId} activeLote={activeLote} />;
      case 'liquidacion': return <Liquidacion negocioId={negocioId} activeLote={activeLote} />;
      default:
        return (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '60vh', gap: '16px' }}>
            <Icon name="info" size={32} style={{ color: 'var(--text-tertiary)' }} />
            <div style={{ fontSize: '14px', color: 'var(--text-tertiary)' }}>Pantalla <strong style={{ color: 'var(--text-secondary)' }}>{page}</strong> — en construcción</div>
            <Btn variant="secondary" onClick={() => navigate('dashboard')} icon="chevronLeft">Volver al dashboard</Btn>
          </div>
        );
    }
  };

  if (!onboarded) return <Onboarding onComplete={() => setOnboarded(true)} />;

  return (
    <AppLayout page={page} onNavigate={navigate} negocioId={negocioId} onNegocioChange={id => { setNegocioId(id); navigate('dashboard'); }}>
      {renderPage()}
    </AppLayout>
  );
};

// Dev shortcut: Shift+O = restart onboarding
window.addEventListener('keydown', e => {
  if (e.shiftKey && e.key === 'O') { localStorage.removeItem(STORAGE_KEY); location.reload(); }
});

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(<App />);
