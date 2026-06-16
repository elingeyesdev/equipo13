import { useState, useEffect } from 'react';
import { apiFetch } from '../config/api.js';
import { Icon } from '../icons.jsx';
import { Btn, StatusBadge, SectionCard } from '../components/ui.jsx';

const ACCENT = 'var(--accent-agro)';

export default function Operarios({ negocioId }) {
  const [operarios, setOperarios] = useState([]);
  const [lotes, setLotes] = useState([]);
  const [codigoNegocio, setCodigoNegocio] = useState(null);
  const [nuevoNombre, setNuevoNombre] = useState('');
  const [credenciales, setCredenciales] = useState(null);
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState(null);
  const [copiado, setCopiado] = useState(false);

  async function cargar() {
    setCargando(true);
    setError(null);
    try {
      const [ops, lts, neg] = await Promise.all([
        apiFetch(`/api/negocios/${negocioId}/operarios`),
        apiFetch(`/api/negocios/${negocioId}/lotes`),
        apiFetch(`/api/negocios/${negocioId}`),
      ]);
      setOperarios(Array.isArray(ops) ? ops : []);
      setLotes(Array.isArray(lts) ? lts : []);
      setCodigoNegocio(neg?.codigo || null);
    } catch (e) {
      setError(e.error || 'No se pudieron cargar los operarios');
    } finally {
      setCargando(false);
    }
  }
  useEffect(() => { if (negocioId) cargar(); }, [negocioId]);

  async function crear() {
    if (!nuevoNombre.trim()) return;
    setError(null);
    try {
      const data = await apiFetch(`/api/negocios/${negocioId}/operarios`, {
        method: 'POST', body: JSON.stringify({ nombre: nuevoNombre }),
      });
      setCredenciales(data);
      setNuevoNombre('');
      cargar();
    } catch (e) {
      setError(e.error || 'No se pudo crear el operario');
    }
  }

  async function resetPin(operarioId) {
    setError(null);
    try {
      const data = await apiFetch(`/api/negocios/${negocioId}/operarios/${operarioId}/reset-pin`, { method: 'POST' });
      setCredenciales({ username: '(sin cambio)', pin_temporal: data.pin_temporal });
    } catch (e) {
      setError(e.error || 'No se pudo resetear el PIN');
    }
  }

  async function toggleActivo(operarioId, activoActual) {
    setError(null);
    try {
      await apiFetch(`/api/negocios/${negocioId}/operarios/${operarioId}`, {
        method: 'PATCH', body: JSON.stringify({ activo: !activoActual }),
      });
      cargar();
    } catch (e) {
      setError(e.error || 'No se pudo cambiar el estado');
    }
  }

  async function toggleAsignacion(operarioId, loteId, asignado) {
    setError(null);
    try {
      if (asignado) {
        await apiFetch(`/api/negocios/${negocioId}/operarios/${operarioId}/lotes/${loteId}`, { method: 'DELETE' });
      } else {
        await apiFetch(`/api/negocios/${negocioId}/operarios/${operarioId}/lotes`, {
          method: 'POST', body: JSON.stringify({ lote_id: loteId }),
        });
      }
      cargar();
    } catch (e) {
      setError(e.error || 'No se pudo actualizar la asignación');
    }
  }

  function copiarCodigo() {
    if (!codigoNegocio) return;
    navigator.clipboard?.writeText(codigoNegocio).then(() => {
      setCopiado(true);
      setTimeout(() => setCopiado(false), 1500);
    }).catch(() => {});
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <h1 style={{ fontSize: '22px', fontWeight: 400, color: 'var(--text-primary)', letterSpacing: '-0.02em' }}>Operarios</h1>
            <span style={{ background: ACCENT + '1A', color: ACCENT, border: `1px solid ${ACCENT}33`, borderRadius: '5px', padding: '2px 10px', fontSize: '12px', fontFamily: 'var(--font-mono)', fontWeight: 500 }}>{operarios.length}</span>
          </div>
          <p style={{ fontSize: '13px', color: 'var(--text-tertiary)', marginTop: '4px' }}>Creá cuentas para tu equipo y asigná los lotes que cada uno gestiona desde la app móvil.</p>
        </div>
      </div>

      {/* Código del negocio */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '14px', background: ACCENT + '0D', border: `1px solid ${ACCENT}33`, borderLeft: `3px solid ${ACCENT}`, borderRadius: '8px', padding: '14px 18px' }}>
        <Icon name="phone" size={18} style={{ color: ACCENT, flexShrink: 0 }} />
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: '13px', color: 'var(--text-primary)', fontWeight: 500 }}>Código de este negocio</div>
          <div style={{ fontSize: '12px', color: 'var(--text-tertiary)' }}>Los operarios lo necesitan para ingresar en la app móvil.</div>
        </div>
        <code style={{ fontFamily: 'var(--font-mono)', fontSize: '20px', fontWeight: 600, color: ACCENT, letterSpacing: '0.05em' }}>{codigoNegocio || '—'}</code>
        <Btn variant="secondary" size="sm" icon={copiado ? 'check' : 'copy'} onClick={copiarCodigo}>{copiado ? 'Copiado' : 'Copiar'}</Btn>
      </div>

      {error && (
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', color: 'var(--accent-danger)', background: 'var(--bg-secondary)', border: '1px solid var(--accent-danger)33', borderLeft: '3px solid var(--accent-danger)', borderRadius: '6px', padding: '10px 14px' }}>
          <Icon name="alertTriangle" size={14} />{error}
        </div>
      )}

      {/* Crear operario */}
      <SectionCard title="Nuevo operario">
        <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
          <input placeholder="Nombre del operario" value={nuevoNombre}
            onChange={e => setNuevoNombre(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && crear()}
            style={{ flex: 1, background: 'var(--bg-tertiary)', border: '1px solid var(--border-subtle)', borderRadius: '6px', color: 'var(--text-primary)', padding: '9px 12px', fontSize: '14px', outline: 'none' }}
            onFocus={e => e.target.style.borderColor = ACCENT}
            onBlur={e => e.target.style.borderColor = 'var(--border-subtle)'}
          />
          <Btn icon="plus" accentColor={ACCENT} onClick={crear}>Crear operario</Btn>
        </div>
      </SectionCard>

      {/* Credenciales temporales */}
      {credenciales && (
        <div style={{ background: 'var(--accent-success)0D', border: '1px solid var(--accent-success)33', borderLeft: '3px solid var(--accent-success)', borderRadius: '8px', padding: '16px 18px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
            <Icon name="lock" size={15} style={{ color: 'var(--accent-success)' }} />
            <strong style={{ fontSize: '13px', color: 'var(--text-primary)' }}>Credenciales temporales</strong>
            <span style={{ fontSize: '12px', color: 'var(--text-tertiary)' }}>— anotalas, no se vuelven a mostrar.</span>
            <button onClick={() => setCredenciales(null)} style={{ marginLeft: 'auto', background: 'transparent', border: 'none', color: 'var(--text-tertiary)', cursor: 'pointer', padding: '2px' }}><Icon name="x" size={15} /></button>
          </div>
          <div style={{ display: 'flex', gap: '24px' }}>
            <div>
              <div style={{ fontSize: '11px', color: 'var(--text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '3px' }}>Usuario</div>
              <code style={{ fontFamily: 'var(--font-mono)', fontSize: '16px', color: 'var(--text-primary)' }}>{credenciales.username}</code>
            </div>
            <div>
              <div style={{ fontSize: '11px', color: 'var(--text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '3px' }}>PIN</div>
              <code style={{ fontFamily: 'var(--font-mono)', fontSize: '16px', color: 'var(--accent-success)', fontWeight: 600, letterSpacing: '0.1em' }}>{credenciales.pin_temporal}</code>
            </div>
          </div>
        </div>
      )}

      {/* Tabla de operarios */}
      <div style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border-subtle)', borderRadius: '8px', overflow: 'hidden' }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'minmax(150px,1.4fr) 130px 110px minmax(180px,2fr) 160px', gap: '12px', padding: '10px 16px', borderBottom: '1px solid var(--border-subtle)' }}>
          {['Nombre', 'Usuario', 'Estado', 'Lotes asignados', ''].map((h, i) => (
            <div key={i} style={{ fontSize: '11px', color: 'var(--text-tertiary)', letterSpacing: '0.05em', fontWeight: 500 }}>{h}</div>
          ))}
        </div>

        {cargando ? (
          <div style={{ padding: '40px', textAlign: 'center', color: 'var(--text-tertiary)', fontSize: '14px' }}>Cargando operarios…</div>
        ) : operarios.length === 0 ? (
          <div style={{ padding: '40px', textAlign: 'center', color: 'var(--text-tertiary)', fontSize: '14px' }}>
            <Icon name="user" size={28} style={{ color: 'var(--text-tertiary)', opacity: 0.5 }} />
            <div style={{ marginTop: '10px' }}>No hay operarios todavía.</div>
          </div>
        ) : operarios.map((op, idx) => {
          const estado = !op.activo
            ? { label: 'Inactivo', color: 'var(--text-tertiary)' }
            : op.bloqueado
              ? { label: 'Bloqueado', color: 'var(--accent-danger)' }
              : { label: 'Activo', color: 'var(--accent-success)' };
          return (
            <div key={op.id} style={{ display: 'grid', gridTemplateColumns: 'minmax(150px,1.4fr) 130px 110px minmax(180px,2fr) 160px', gap: '12px', padding: '12px 16px', borderBottom: idx < operarios.length - 1 ? '1px solid var(--border-subtle)' : 'none', alignItems: 'center', opacity: op.activo ? 1 : 0.55 }}>
              <span style={{ fontSize: '13px', color: 'var(--text-primary)', fontWeight: 500 }}>{op.nombre}</span>
              <code style={{ fontSize: '12px', fontFamily: 'var(--font-mono)', color: 'var(--text-secondary)' }}>{op.username}</code>
              <div><StatusBadge label={estado.label} color={estado.color} /></div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                {lotes.length === 0 ? (
                  <span style={{ fontSize: '12px', color: 'var(--text-tertiary)' }}>Sin lotes</span>
                ) : lotes.map(l => {
                  const asignado = (op.lotes || []).some(x => x.lote_id === l.id);
                  return (
                    <button key={l.id} onClick={() => toggleAsignacion(op.id, l.id, asignado)} style={{
                      display: 'inline-flex', alignItems: 'center', gap: '5px',
                      padding: '3px 9px', borderRadius: '5px', cursor: 'pointer', fontSize: '12px',
                      border: `1px solid ${asignado ? ACCENT : 'var(--border-subtle)'}`,
                      background: asignado ? ACCENT + '1A' : 'var(--bg-tertiary)',
                      color: asignado ? ACCENT : 'var(--text-secondary)',
                      fontWeight: asignado ? 500 : 400, transition: 'all 0.15s',
                    }}>
                      {asignado && <Icon name="check" size={11} />}
                      {l.identificador}
                    </button>
                  );
                })}
              </div>
              <div style={{ display: 'flex', gap: '6px', justifyContent: 'flex-end' }}>
                <Btn variant="ghost" size="sm" icon="refresh" onClick={() => resetPin(op.id)}>Reset PIN</Btn>
                <Btn variant={op.activo ? 'danger' : 'secondary'} size="sm" onClick={() => toggleActivo(op.id, op.activo)}>
                  {op.activo ? 'Desactivar' : 'Activar'}
                </Btn>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
