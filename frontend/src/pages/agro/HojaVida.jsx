import React, { useState, useEffect } from 'react';
import { Icon } from '../../icons.jsx';
import { Btn } from '../../components/ui.jsx';
import { apiFetch } from '../../config/api.js';

const MESES = ['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'];
const DIAS_SEMANA = ['Dom','Lun','Mar','Mié','Jue','Vie','Sáb'];

const NavBtn = ({ onClick, children }) => (
  <button
    onClick={onClick}
    style={{ background: 'transparent', border: '1px solid var(--border-subtle)', borderRadius: '6px', padding: '5px 10px', cursor: 'pointer', color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: '4px', fontSize: '13px', fontFamily: 'var(--font-sans)' }}
    onMouseEnter={e => e.currentTarget.style.background = 'var(--bg-tertiary)'}
    onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
  >
    {children}
  </button>
);

const HojaVida = ({ negocioId, activeLote, onNavigate, setActiveFecha }) => {
  const accentColor = 'var(--accent-agro)';
  const hoy = new Date().toISOString().split('T')[0];
  const now = new Date();

  const [anio, setAnio] = useState(now.getFullYear());
  const [mes, setMes]   = useState(now.getMonth() + 1); // 1-indexed
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState(null);

  const loteId = activeLote?._id;

  useEffect(() => {
    if (!negocioId || !loteId) { setLoading(false); return; }
    setLoading(true);
    setError(null);
    apiFetch(`/api/negocios/${negocioId}/lotes/${loteId}/hoja-de-vida?anio=${anio}&mes=${mes}`)
      .then(res => { setData(res); setLoading(false); })
      .catch(e  => { setError(e?.error || 'Error al cargar la hoja de vida'); setLoading(false); });
  }, [negocioId, loteId, anio, mes]);

  const prevMes = () => {
    if (mes === 1) { setAnio(a => a - 1); setMes(12); }
    else setMes(m => m - 1);
  };
  const nextMes = () => {
    if (mes === 12) { setAnio(a => a + 1); setMes(1); }
    else setMes(m => m + 1);
  };

  const handleAbrirDia = (fecha) => {
    if (setActiveFecha) setActiveFecha(fecha);
    if (onNavigate) onNavigate('registrodia');
  };

  // ── Sin lote seleccionado ────────────────────────────────────────────────
  if (!activeLote || !loteId) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '60vh', gap: '16px', textAlign: 'center' }}>
        <Icon name="clipboardList" size={36} style={{ color: 'var(--text-tertiary)' }} />
        <div style={{ fontSize: '15px', fontWeight: 500, color: 'var(--text-primary)' }}>Seleccioná un lote</div>
        <div style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>
          Ingresá a <strong>Lotes activos</strong>, abrí un lote desde el diario de producción y luego volvé aquí.
        </div>
        <Btn variant="secondary" icon="chevronLeft" onClick={() => onNavigate?.('lotes')}>Ir a Lotes</Btn>
      </div>
    );
  }

  // ── Helpers de estado del día ────────────────────────────────────────────
  const borderColor = (dia, esHoy) => {
    if (esHoy)           return 'var(--accent-industrial)';
    if (dia.confirmado)  return accentColor;
    if (dia.tiene_registro) return 'var(--accent-warning)';
    return 'var(--border-subtle)';
  };

  const statusInfo = (dia) => {
    if (dia.confirmado)      return { label: 'Confirmado', color: accentColor };
    if (dia.tiene_registro)  return { label: 'Borrador', color: 'var(--accent-warning)' };
    return { label: 'Sin registro', color: 'var(--text-tertiary)' };
  };

  // ── Render ───────────────────────────────────────────────────────────────
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
        <button
          onClick={() => onNavigate?.('lotes')}
          style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: 'var(--text-tertiary)', display: 'flex', alignItems: 'center', gap: '4px', fontSize: '13px', padding: '4px 0', fontFamily: 'var(--font-sans)' }}
          onMouseEnter={e => e.currentTarget.style.color = 'var(--text-secondary)'}
          onMouseLeave={e => e.currentTarget.style.color = 'var(--text-tertiary)'}
        >
          <Icon name="chevronLeft" size={14} /> Lotes
        </button>
        <span style={{ color: 'var(--border-mid)' }}>·</span>
        <div>
          <div style={{ fontSize: '17px', fontWeight: 500, color: 'var(--text-primary)', letterSpacing: '-0.01em' }}>
            Hoja de Vida — Lote #{activeLote.id}
            <span style={{ fontSize: '13px', fontWeight: 400, color: 'var(--text-tertiary)', marginLeft: '8px' }}>
              · {activeLote.tipo}
            </span>
          </div>
          {data?.fase_predominante && (
            <div style={{ fontSize: '12px', color: 'var(--text-tertiary)', marginTop: '2px' }}>
              Fase del mes: <span style={{ color: accentColor }}>{data.fase_predominante}</span>
            </div>
          )}
        </div>
      </div>

      {/* Navegación de meses */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '12px 16px', background: 'var(--bg-secondary)', borderRadius: '8px', border: '1px solid var(--border-subtle)', flexWrap: 'wrap' }}>
        <NavBtn onClick={prevMes}><Icon name="chevronLeft" size={14} /> Mes anterior</NavBtn>
        <div style={{ flex: 1, textAlign: 'center', fontSize: '15px', fontWeight: 500, color: 'var(--text-primary)', minWidth: '160px' }}>
          {MESES[mes - 1]} {anio}
        </div>
        <NavBtn onClick={nextMes}>Mes siguiente <Icon name="chevronRight" size={14} /></NavBtn>

        {/* Leyenda */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '14px', paddingLeft: '16px', borderLeft: '1px solid var(--border-subtle)' }}>
          {[
            { color: accentColor,                label: 'Confirmado' },
            { color: 'var(--accent-warning)',     label: 'Borrador' },
            { color: 'var(--text-tertiary)',      label: 'Sin registro' },
            { color: 'var(--accent-industrial)',  label: 'Hoy' },
          ].map(({ color, label }) => (
            <div key={label} style={{ display: 'flex', alignItems: 'center', gap: '5px', fontSize: '11px', color: 'var(--text-tertiary)' }}>
              <span style={{ width: 8, height: 8, borderRadius: '50%', background: color, display: 'inline-block', flexShrink: 0 }} />
              {label}
            </div>
          ))}
        </div>
      </div>

      {/* Estados */}
      {loading && (
        <div style={{ textAlign: 'center', padding: '48px', color: 'var(--text-tertiary)', fontSize: '14px' }}>
          Cargando {MESES[mes - 1]} {anio}…
        </div>
      )}
      {error && (
        <div style={{ padding: '14px 18px', background: 'var(--accent-warning)18', border: '1px solid var(--accent-warning)44', borderRadius: '8px', color: 'var(--accent-warning)', fontSize: '13px' }}>
          {error}
        </div>
      )}

      {/* Lista de días */}
      {!loading && !error && data && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
          {data.dias.map(dia => {
            const esHoy    = dia.fecha === hoy;
            const bColor   = borderColor(dia, esHoy);
            const status   = statusInfo(dia);
            const diaSem   = DIAS_SEMANA[new Date(dia.fecha + 'T12:00:00').getDay()];
            const alim     = dia.estandar_resumido?.alimentacion?.[0];
            const sanidad  = dia.estandar_resumido?.sanitario_hoy ?? [];
            const hayFuturo = dia.fecha > hoy;

            return (
              <div
                key={dia.fecha}
                style={{
                  display: 'flex', alignItems: 'center', gap: '16px',
                  padding: '11px 14px',
                  background: esHoy
                    ? 'var(--accent-industrial)0D'
                    : dia.confirmado
                      ? 'var(--accent-agro)08'
                      : dia.tiene_registro
                        ? 'var(--accent-warning)08'
                        : 'var(--bg-secondary)',
                  border: `1px solid ${esHoy ? 'var(--accent-industrial)33' : dia.confirmado ? accentColor + '33' : dia.tiene_registro ? 'var(--accent-warning)33' : 'var(--border-subtle)'}`,
                  borderLeft: `3px solid ${bColor}`,
                  borderRadius: '8px',
                  opacity: hayFuturo ? 0.65 : 1,
                }}
              >
                {/* Fecha */}
                <div style={{ minWidth: '72px' }}>
                  <div style={{ fontSize: '13px', fontWeight: esHoy ? 600 : 400, color: esHoy ? 'var(--accent-industrial)' : 'var(--text-primary)', display: 'flex', alignItems: 'baseline', gap: '5px' }}>
                    {diaSem} {dia.dia_del_mes}
                    {esHoy && <span style={{ fontSize: '10px', color: 'var(--accent-industrial)', fontWeight: 400 }}>hoy</span>}
                  </div>
                  <div style={{ fontSize: '11px', color: 'var(--text-tertiary)', fontFamily: 'IBM Plex Mono, monospace' }}>
                    día {dia.dias_en_lote}
                  </div>
                </div>

                {/* Fase + nutrición + sanidad */}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                    {dia.fase && (
                      <span style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>{dia.fase}</span>
                    )}
                    {sanidad.length > 0 && (
                      <span
                        title={sanidad.map(s => s.descripcion).join(' · ')}
                        style={{ display: 'inline-flex', alignItems: 'center', gap: '3px', fontSize: '11px', color: 'var(--accent-warning)', fontWeight: 500, cursor: 'help' }}
                      >
                        <Icon name="alertCircle" size={11} /> Sanidad ({sanidad.length})
                      </span>
                    )}
                  </div>
                  {alim && (
                    <div style={{ fontSize: '11px', color: 'var(--text-tertiary)', marginTop: '2px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {alim.descripcion}
                      <span style={{ fontFamily: 'IBM Plex Mono, monospace', marginLeft: '4px' }}>· {alim.cantidad_por_cabeza_kg} kg/cab</span>
                    </div>
                  )}
                </div>

                {/* Status badge */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '5px', minWidth: '110px', justifyContent: 'flex-end' }}>
                  <span style={{ width: 7, height: 7, borderRadius: '50%', background: status.color, display: 'inline-block', flexShrink: 0 }} />
                  <span style={{ fontSize: '12px', color: status.color, whiteSpace: 'nowrap' }}>{status.label}</span>
                </div>

                {/* Abrir día */}
                <button
                  onClick={() => handleAbrirDia(dia.fecha)}
                  style={{
                    background: 'transparent', border: '1px solid var(--border-subtle)', borderRadius: '6px',
                    padding: '5px 10px', cursor: 'pointer', fontSize: '12px', color: 'var(--text-secondary)',
                    display: 'flex', alignItems: 'center', gap: '4px', whiteSpace: 'nowrap', flexShrink: 0,
                    fontFamily: 'var(--font-sans)',
                  }}
                  onMouseEnter={e => { e.currentTarget.style.background = 'var(--bg-tertiary)'; e.currentTarget.style.color = 'var(--text-primary)'; e.currentTarget.style.borderColor = 'var(--border-mid)'; }}
                  onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = 'var(--text-secondary)'; e.currentTarget.style.borderColor = 'var(--border-subtle)'; }}
                >
                  Abrir día <Icon name="chevronRight" size={12} />
                </button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default HojaVida;
