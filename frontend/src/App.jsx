import React, { useState, useEffect } from 'react';
import { Icon } from './icons.jsx';
import { AppLayout } from './layouts/AppLayout.jsx';
import { Btn } from './components/ui.jsx';
import { apiFetch } from './config/api.js';
import Login from './pages/Login.jsx';
import Onboarding from './pages/Onboarding.jsx';
import Dashboard from './pages/Dashboard.jsx';
import FichaCosto from './pages/FichaCosto.jsx';
import Productos from './pages/Productos.jsx';
import Insumos from './pages/Insumos.jsx';
import Proveedores from './pages/Proveedores.jsx';
import Historial from './pages/Historial.jsx';
import Unidades from './pages/Unidades.jsx';
import Categorias from './pages/Categorias.jsx';
import Configuracion from './pages/Configuracion.jsx';
import Lotes from './pages/agro/Lotes.jsx';
import Bitacora from './pages/agro/Bitacora.jsx';
import Liquidacion from './pages/agro/Liquidacion.jsx';
import Despiece from './pages/agro/Despiece.jsx';

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
        <div style={{ fontSize: '16px', fontWeight: 500, color: 'var(--text-primary)' }}>Esta sección estará disponible en el próximo sprint</div>
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
  const [user, setUser] = useState(null);
  const [negocios, setNegocios] = useState([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState('dashboard');
  const [negocioId, setNegocioId] = useState(null);
  const [activeLote, setActiveLote] = useState(null);
  const [activeProductoId, setActiveProductoId] = useState(null);

  const loadNegocios = async () => {
    try {
      const data = await apiFetch('/api/negocios');
      setNegocios(data);
      setNegocioId(prev => {
        if (data.find(n => n.id === prev)) return prev;
        return data[0]?.id ?? null;
      });
    } catch (e) {}
  };

  useEffect(() => {
    const init = async () => {
      const token = localStorage.getItem('cu_token');
      if (token) {
        try {
          const userData = await apiFetch('/api/auth/me');
          setUser(userData);
          if (userData.onboarding_completado) await loadNegocios();
        } catch (e) {
          localStorage.removeItem('cu_token');
        }
      }
      setLoading(false);
    };
    init();
  }, []);

  const login = async (email, password) => {
    const data = await apiFetch('/api/auth/login', {
      method: 'POST', body: JSON.stringify({ email, password }),
    });
    localStorage.setItem('cu_token', data.token);
    setUser(data.user);
    if (data.user.onboarding_completado) await loadNegocios();
  };

  const register = async (email, password, nombre) => {
    const data = await apiFetch('/api/auth/register', {
      method: 'POST', body: JSON.stringify({ email, password, nombre }),
    });
    localStorage.setItem('cu_token', data.token);
    setUser(data.user);
  };

  const logout = () => {
    localStorage.removeItem('cu_token');
    localStorage.removeItem('cu_state_v2');
    setUser(null);
    setNegocios([]);
    setNegocioId(null);
    setActiveLote(null);
    setActiveProductoId(null);
    setPage('dashboard');
  };

  const handleNegocioChange = (id) => {
    setNegocioId(id);
    setActiveLote(null);
    setActiveProductoId(null);
    setPage('dashboard');
  };

  const handleOnboardingComplete = async (newNegocioId) => {
    setUser(u => ({ ...u, onboarding_completado: true }));
    setNegocioId(newNegocioId);
    await loadNegocios();
  };

  const navigate = (p, opts) => {
    if (opts?.productoId) setActiveProductoId(opts.productoId);
    setPage(p);
  };

  const renderPage = () => {
    const negocio = negocios.find(n => n.id === negocioId);
    switch (page) {
      case 'dashboard':   return <Dashboard negocio={negocio} onNavigate={navigate} />;
      case 'fichas':      return <FichaCosto negocio={negocio} productoId={activeProductoId} onNavigate={navigate} />;
      case 'productos':   return <Productos negocio={negocio} onNavigate={navigate} />;
      case 'insumos':     return <Insumos negocioId={negocioId} />;
      case 'proveedores': return <Proveedores negocioId={negocioId} />;
      case 'historial':   return <Historial negocio={negocio} onNavigate={navigate} />;
      case 'gastos':      return <GastosCIFPlaceholder rubro={negocio?.rubro || 'industrial'} />;
      case 'unidades':    return <Unidades negocioId={negocioId} />;
      case 'categorias':  return <Categorias negocioId={negocioId} />;
      case 'config':      return <Configuracion negocioId={negocioId} onNavigate={navigate} user={user} negocios={negocios} loadNegocios={loadNegocios} />;
      case 'lotes':       return <Lotes negocioId={negocioId} onNavigate={navigate} setActiveLote={setActiveLote} />;
      case 'bitacora':    return <Bitacora negocioId={negocioId} activeLote={activeLote} />;
      case 'liquidacion': return <Liquidacion negocioId={negocioId} activeLote={activeLote} onNavigate={navigate} setActiveLote={setActiveLote} />;
      case 'despiece':    return <Despiece negocioId={negocioId} onNavigate={navigate} />;
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

  if (loading) return (
    <div style={{ display: 'flex', height: '100vh', alignItems: 'center', justifyContent: 'center', background: 'var(--bg-primary)' }}>
      <div style={{ fontSize: '13px', color: 'var(--text-tertiary)' }}>Cargando…</div>
    </div>
  );

  if (!user) return <Login onLogin={login} onRegister={register} />;

  if (!user.onboarding_completado) return <Onboarding onComplete={handleOnboardingComplete} />;

  return (
    <AppLayout
      page={page}
      onNavigate={navigate}
      negocioId={negocioId}
      onNegocioChange={handleNegocioChange}
      negocios={negocios}
      user={user}
      onLogout={logout}
    >
      {renderPage()}
    </AppLayout>
  );
};


export default App;
