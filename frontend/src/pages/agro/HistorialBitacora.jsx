import React, { useState, useEffect } from 'react';
import { Icon } from '../../icons.jsx';
import { Btn } from '../../components/ui.jsx';
import { apiFetch } from '../../config/api.js';

const HistorialBitacora = ({ negocioId, loteId, onClose }) => {
  const accentColor = 'var(--accent-agro)';
  const [historial, setHistorial] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!negocioId || !loteId) return;
    setLoading(true);
    apiFetch(`/api/negocios/${negocioId}/lotes/${loteId}/bitacora/historial`)
      .then(data => { setHistorial(data); })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [negocioId, loteId]);

  const formatFecha = (iso) => {
    if (!iso) return '—';
    const d = new Date(iso);
    return d.toLocaleDateString('es-BO', { day: '2-digit', month: 'short', year: 'numeric' })
      + ' ' + d.toLocaleTimeString('es-BO', { hour: '2-digit', minute: '2-digit' });
  };

  const labelStyle = { fontSize: '10px', color: 'var(--text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.06em', fontWeight: 600 };
  const valueStyle = { fontSize: '12px', color: 'var(--text-primary)', fontFamily: 'IBM Plex Mono, monospace' };

  const renderDatos = (datos) => {
    if (!datos) return <span style={{ fontSize: '12px', color: 'var(--text-tertiary)' }}>—</span>;
    const obj = typeof datos === 'string' ? JSON.parse(datos) : datos;
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
        {obj.tipo && <span style={valueStyle}>Tipo: {obj.tipo}</span>}
        {obj.detalle && <span style={valueStyle}>Detalle: {obj.detalle}</span>}
        {obj.monto != null && <span style={valueStyle}>Monto: Bs {parseFloat(obj.monto).toLocaleString('es-BO')}</span>}
        {obj.fecha && <span style={valueStyle}>Fecha: {obj.fecha}</span>}
        {obj.causa && <span style={valueStyle}>Causa: {obj.causa}</span>}
      </div>
    );
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Icon name="history" size={16} style={{ color: accentColor }} />
          <span style={{ fontSize: '15px', fontWeight: 600, color: 'var(--text-primary)' }}>Historial de cambios</span>
        </div>
        <Btn label="← Volver a Bitácora" onClick={onClose} variant="ghost" size="sm" />
      </div>

      <div style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border-subtle)', borderRadius: '8px', overflow: 'hidden' }}>
        {loading && (
          <div style={{ padding: '32px', textAlign: 'center', color: 'var(--text-tertiary)', fontSize: '13px' }}>Cargando historial…</div>
        )}
        {!loading && historial.length === 0 && (
          <div style={{ padding: '32px', textAlign: 'center', color: 'var(--text-tertiary)', fontSize: '13px' }}>No hay cambios registrados aún.</div>
        )}
        {!loading && historial.length > 0 && historial.map((h, i) => {
          const isEdit = h.accion === 'EDICION';
          return (
            <div key={h.id} style={{
              padding: '14px 16px', borderBottom: i < historial.length - 1 ? '1px solid var(--border-subtle)' : 'none',
              background: isEdit ? 'transparent' : 'var(--accent-warning)08',
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <Icon name={isEdit ? 'edit' : 'trash2'} size={13} style={{ color: isEdit ? accentColor : 'var(--accent-warning)' }} />
                  <span style={{ fontSize: '12px', fontWeight: 600, color: isEdit ? accentColor : 'var(--accent-warning)' }}>
                    {isEdit ? 'Edición' : 'Eliminación'}
                  </span>
                  <span style={{ fontSize: '11px', color: 'var(--text-tertiary)' }}>
                    — Registro #{h.bitacora_id}
                  </span>
                </div>
                <span style={{ fontSize: '11px', color: 'var(--text-tertiary)', fontFamily: 'IBM Plex Mono, monospace' }}>
                  {formatFecha(h.created_at)}
                </span>
              </div>

              {h.usuario_nombre && (
                <div style={{ fontSize: '11px', color: 'var(--text-tertiary)', marginBottom: '6px' }}>
                  Por: {h.usuario_nombre} ({h.usuario_email})
                </div>
              )}

              <div style={{ display: 'grid', gridTemplateColumns: isEdit ? '1fr 1fr' : '1fr', gap: '12px' }}>
                <div>
                  <div style={labelStyle}>Datos anteriores</div>
                  {renderDatos(h.datos_anteriores)}
                </div>
                {isEdit && (
                  <div>
                    <div style={labelStyle}>Datos nuevos</div>
                    {renderDatos(h.datos_nuevos)}
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default HistorialBitacora;
