import React, { useState } from 'react';
import { Icon } from '../icons.jsx';
import { Input, Btn } from '../components/ui.jsx';

const Login = ({ onLogin, onRegister }) => {
  const [tab, setTab] = useState('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [nombre, setNombre] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const handleSubmit = async () => {
    if (!email || !password) return;
    setLoading(true);
    setError(null);
    try {
      if (tab === 'login') {
        await onLogin(email, password);
      } else {
        await onRegister(email, password, nombre);
      }
    } catch (err) {
      setError(err?.error || 'Error al conectar con el servidor');
    } finally {
      setLoading(false);
    }
  };

  const switchTab = t => { setTab(t); setError(null); };

  return (
    <div style={{ display: 'flex', height: '100vh', overflow: 'hidden' }}>
      {/* Panel izquierdo */}
      <div style={{
        width: '40%', flexShrink: 0,
        background: '#1e3a5f',
        display: 'flex', flexDirection: 'column',
        justifyContent: 'flex-end',
        padding: '48px 40px',
        position: 'relative',
        overflow: 'hidden',
      }}>
        <div style={{
          position: 'absolute', inset: 0, opacity: 0.05,
          backgroundImage: 'linear-gradient(var(--border-mid) 1px, transparent 1px), linear-gradient(90deg, var(--border-mid) 1px, transparent 1px)',
          backgroundSize: '32px 32px',
        }} />
        <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -60%)', opacity: 0.08 }}>
          <Icon name="building" size={240} style={{ color: '#fff' }} />
        </div>
        <div style={{ position: 'relative', zIndex: 1 }}>
          <div style={{
            width: 36, height: 36, background: 'var(--accent-industrial)', borderRadius: '8px',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            marginBottom: '20px', fontSize: '15px', fontWeight: 700, color: '#fff', fontFamily: 'var(--font-mono)',
          }}>CU</div>
          <div style={{ fontSize: '28px', color: '#fff', fontWeight: 400, lineHeight: 1.2, marginBottom: '12px', letterSpacing: '-0.02em' }}>
            Costeo estándar<br />para tu producción
          </div>
          <div style={{ fontSize: '14px', color: '#ffffff88', lineHeight: 1.6 }}>
            Calculá el costo real de cada producto. Tomá decisiones con números, no con intuición.
          </div>
        </div>
      </div>

      {/* Panel derecho */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', background: 'var(--bg-primary)' }}>
        <div style={{ flex: 1, overflowY: 'auto', padding: '48px', display: 'flex', flexDirection: 'column', maxWidth: '440px' }}>
          {/* Tabs */}
          <div style={{ display: 'flex', marginBottom: '36px', borderBottom: '1px solid var(--border-subtle)' }}>
            {[
              { key: 'login', label: 'Iniciar sesión' },
              { key: 'register', label: 'Crear cuenta' },
            ].map(({ key, label }) => (
              <button
                key={key}
                onClick={() => switchTab(key)}
                style={{
                  padding: '10px 20px', border: 'none', cursor: 'pointer',
                  fontFamily: 'var(--font-sans)', background: 'transparent', fontSize: '14px',
                  color: tab === key ? 'var(--text-primary)' : 'var(--text-tertiary)',
                  fontWeight: tab === key ? 500 : 400,
                  borderBottom: tab === key ? '2px solid var(--accent-industrial)' : '2px solid transparent',
                  marginBottom: '-1px', transition: 'color 0.15s',
                }}
              >
                {label}
              </button>
            ))}
          </div>

          {/* Formulario */}
          <form
            onSubmit={e => { e.preventDefault(); handleSubmit(); }}
            style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}
          >
            {tab === 'register' && (
              <Input
                label="Nombre"
                value={nombre}
                onChange={setNombre}
                placeholder="Tu nombre"
                onFocusColor="var(--accent-industrial)"
              />
            )}
            <Input
              label="Email"
              type="email"
              value={email}
              onChange={setEmail}
              placeholder="tu@email.com"
              onFocusColor="var(--accent-industrial)"
            />
            <Input
              label="Contraseña"
              type="password"
              value={password}
              onChange={setPassword}
              placeholder="••••••••"
              onFocusColor="var(--accent-industrial)"
            />

            <div style={{ marginTop: '8px' }}>
              <Btn
                onClick={handleSubmit}
                disabled={loading || !email || !password}
                size="lg"
                accentColor="var(--accent-industrial)"
              >
                {loading
                  ? (tab === 'login' ? 'Iniciando sesión…' : 'Creando cuenta…')
                  : (tab === 'login' ? 'Iniciar sesión' : 'Crear cuenta')}
              </Btn>
            </div>

            {error && (
              <div style={{
                padding: '10px 14px', borderRadius: '6px',
                background: 'var(--accent-danger)15',
                border: '1px solid var(--accent-danger)33',
                fontSize: '13px', color: 'var(--accent-danger)',
              }}>
                {error}
              </div>
            )}
          </form>
        </div>
      </div>
    </div>
  );
};

export default Login;
