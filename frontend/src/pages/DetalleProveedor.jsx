import React, { useState, useEffect } from 'react';
import { Icon } from '../icons.jsx';
import { MoneyDisplay } from '../components/ui.jsx';
import { apiFetch } from '../config/api.js';

const DetalleProveedor = ({ negocioId, activeProveedor, onNavigate }) => {
  const accentColor = 'var(--accent-agro)';

  const [data, setData]       = useState(null);
  const [loading, setLoading] = useState(!!(negocioId && activeProveedor?.id));
  const [error, setError]     = useState(null);

  useEffect(() => {
    if (!negocioId || !activeProveedor?.id) return;
    setLoading(true);
    setError(null);
    apiFetch(`/api/negocios/${negocioId}/proveedores/${activeProveedor.id}/compras`)
      .then(res => { setData(res); setLoading(false); })
      .catch(e  => { setError(e?.error || 'Error al cargar el detalle'); setLoading(false); });
  }, [negocioId, activeProveedor?.id]);

  const fmt = (n) => (parseFloat(n) || 0).toLocaleString('es-BO', { minimumFractionDigits: 2 });
  const fmtFecha = (f) => {
    if (!f) return '—';
    const isPlainDate = /^\d{4}-\d{2}-\d{2}$/.test(f);
    const dateStr = isPlainDate ? `${f}T12:00:00` : f;
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return 'Fecha inválida';
    return d.toLocaleDateString('es-BO', { timeZone: 'America/La_Paz', day: '2-digit', month: 'short', year: 'numeric' });
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>

      {/* Back */}
      <button
        onClick={() => onNavigate?.('proveedores')}
        style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: 'var(--text-tertiary)', display: 'flex', alignItems: 'center', gap: '4px', fontSize: '13px', padding: '4px 0', fontFamily: 'var(--font-sans)', alignSelf: 'flex-start' }}
        onMouseEnter={e => e.currentTarget.style.color = 'var(--text-secondary)'}
        onMouseLeave={e => e.currentTarget.style.color = 'var(--text-tertiary)'}
      >
        <Icon name="chevronLeft" size={14} /> Proveedores
      </button>

      {/* Header proveedor */}
      <div style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border-subtle)', borderRadius: '10px', padding: '20px 24px', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '16px' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
            <h1 style={{ fontSize: '20px', fontWeight: 500, color: 'var(--text-primary)', margin: 0, letterSpacing: '-0.01em' }}>
              {data?.proveedor?.nombre || activeProveedor?.nombre || '—'}
            </h1>
            {data?.proveedor && (
              <span style={{
                fontSize: '11px', fontWeight: 600, padding: '2px 8px', borderRadius: '4px',
                background: data.proveedor.activo ? accentColor + '18' : 'var(--bg-tertiary)',
                color: data.proveedor.activo ? accentColor : 'var(--text-tertiary)',
                border: `1px solid ${data.proveedor.activo ? accentColor + '44' : 'var(--border-subtle)'}`,
              }}>
                {data.proveedor.activo ? 'Activo' : 'Archivado'}
              </span>
            )}
          </div>

          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '20px', fontSize: '13px', color: 'var(--text-secondary)' }}>
            {data?.proveedor?.contacto && (
              <span style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                <Icon name="user" size={13} style={{ color: 'var(--text-tertiary)', flexShrink: 0 }} />
                {data.proveedor.contacto}
              </span>
            )}
            {data?.proveedor?.telefono && (
              <span style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                <Icon name="phone" size={13} style={{ color: 'var(--text-tertiary)', flexShrink: 0 }} />
                {data.proveedor.telefono}
              </span>
            )}
            {data?.proveedor?.email && (
              <span style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                <Icon name="mail" size={13} style={{ color: 'var(--text-tertiary)', flexShrink: 0 }} />
                {data.proveedor.email}
              </span>
            )}
          </div>

          {data?.proveedor?.notas && (
            <p style={{ fontSize: '12px', color: 'var(--text-tertiary)', margin: 0, fontStyle: 'italic' }}>
              {data.proveedor.notas}
            </p>
          )}
        </div>
      </div>

      {/* Stats */}
      {data?.stats && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(155px, 1fr))', gap: '12px' }}>
          {[
            { label: 'Total gastado',      value: `Bs ${fmt(data.stats.gasto_total)}`, mono: true  },
            { label: 'Compras realizadas', value: String(data.stats.total_compras),    mono: false },
            { label: 'Primera compra',     value: fmtFecha(data.stats.primera_compra), mono: false },
            { label: 'Última compra',      value: fmtFecha(data.stats.ultima_compra),  mono: false },
            { label: 'Insumo principal',   value: data.stats.top_insumo || '—',        mono: false },
          ].map(({ label, value, mono }) => (
            <div key={label} style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border-subtle)', borderRadius: '8px', padding: '14px 16px', display: 'flex', flexDirection: 'column', gap: '5px' }}>
              <span style={{ fontSize: '10px', textTransform: 'uppercase', letterSpacing: '0.07em', color: 'var(--text-tertiary)', fontWeight: 600 }}>{label}</span>
              <span style={{ fontSize: '15px', fontWeight: 500, color: 'var(--text-primary)', fontFamily: mono ? 'IBM Plex Mono, monospace' : 'var(--font-sans)' }}>{value}</span>
            </div>
          ))}
        </div>
      )}

      {/* Estados de carga */}
      {loading && (
        <div style={{ padding: '40px', textAlign: 'center', color: 'var(--text-tertiary)', fontSize: '13px' }}>
          Cargando historial…
        </div>
      )}
      {error && (
        <div style={{ padding: '14px 18px', background: 'var(--accent-warning)18', border: '1px solid var(--accent-warning)44', borderRadius: '8px', color: 'var(--accent-warning)', fontSize: '13px' }}>
          {error}
        </div>
      )}

      {/* Tabla de compras */}
      {!loading && !error && data && (
        <div style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border-subtle)', borderRadius: '10px', overflow: 'hidden' }}>
          <div style={{ padding: '14px 20px', borderBottom: '1px solid var(--border-subtle)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '11px', fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase', color: accentColor }}>
              Historial de compras
            </span>
            {data.compras.length > 0 && (
              <span style={{ fontSize: '12px', color: 'var(--text-tertiary)' }}>
                {data.compras.length} registro{data.compras.length !== 1 ? 's' : ''}
              </span>
            )}
          </div>

          {data.compras.length === 0 ? (
            <div style={{ padding: '48px', textAlign: 'center', color: 'var(--text-tertiary)', fontSize: '13px' }}>
              <Icon name="shoppingCart" size={28} style={{ marginBottom: '10px', display: 'block', margin: '0 auto 10px' }} />
              Sin compras registradas a este proveedor.
            </div>
          ) : (
            <>
              {/* Encabezado tabla */}
              <div style={{ display: 'grid', gridTemplateColumns: '105px 1fr 95px 90px 95px 105px', padding: '8px 20px', gap: '12px', borderBottom: '1px solid var(--border-subtle)', background: 'var(--bg-tertiary)' }}>
                {['Fecha', 'Insumo', 'Cantidad', 'Precio/u', 'Total', 'Factura'].map((h, i) => (
                  <div key={h} style={{ fontSize: '11px', color: 'var(--text-tertiary)', fontWeight: 500, textAlign: i >= 2 ? 'right' : 'left' }}>{h}</div>
                ))}
              </div>

              {/* Filas */}
              {data.compras.map((c, i) => (
                <div
                  key={c.id}
                  style={{ display: 'grid', gridTemplateColumns: '105px 1fr 95px 90px 95px 105px', padding: '11px 20px', gap: '12px', alignItems: 'center', borderBottom: i < data.compras.length - 1 ? '1px solid var(--border-subtle)' : 'none' }}
                >
                  <span style={{ fontSize: '12px', color: 'var(--text-tertiary)' }}>
                    {fmtFecha(c.fecha_compra)}
                  </span>

                  <div style={{ minWidth: 0 }}>
                    <div style={{ fontSize: '13px', color: 'var(--text-primary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {c.insumo_nombre}
                    </div>
                    {c.notas && (
                      <div style={{ fontSize: '11px', color: 'var(--text-tertiary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', fontStyle: 'italic' }}>
                        {c.notas}
                      </div>
                    )}
                  </div>

                  <div style={{ textAlign: 'right', fontFamily: 'IBM Plex Mono, monospace', fontSize: '12px', color: 'var(--text-secondary)' }}>
                    {fmt(c.cantidad_comprada)}
                    {c.unidad_simbolo && <span style={{ color: 'var(--text-tertiary)', marginLeft: '3px' }}>{c.unidad_simbolo}</span>}
                  </div>

                  <div style={{ textAlign: 'right' }}>
                    <MoneyDisplay value={parseFloat(c.precio_unitario)} size="sm" />
                  </div>

                  <div style={{ textAlign: 'right' }}>
                    <MoneyDisplay value={parseFloat(c.total)} size="sm" color="green" />
                  </div>

                  <div style={{ textAlign: 'right', fontSize: '12px', color: 'var(--text-tertiary)', fontFamily: 'IBM Plex Mono, monospace', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {c.numero_factura || '—'}
                  </div>
                </div>
              ))}
            </>
          )}
        </div>
      )}
    </div>
  );
};

export default DetalleProveedor;
