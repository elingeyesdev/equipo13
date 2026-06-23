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

// Estilo del día según estado de registro (sin teñir todo de verde).
const getDiaColors = (dia, accentColor) => {
  if (dia?.confirmado)     return { bg: 'var(--bg-tertiary)', border: accentColor,             num: 'var(--text-primary)' };
  if (dia?.tiene_registro) return { bg: 'var(--bg-tertiary)', border: 'var(--accent-warning)', num: 'var(--text-primary)' };
  return                          { bg: 'var(--bg-secondary)', border: 'var(--border-subtle)',  num: 'var(--text-secondary)' };
};

// Colores de actividad (deben coincidir con la leyenda).
const ACTIVIDAD = [
  { key: 'tiene_alimento', color: '#22C55E', label: 'Alimento' },
  { key: 'tiene_sanidad',  color: '#EF4444', label: 'Sanidad'  },
  { key: 'tiene_servicio', color: '#3B82F6', label: 'Servicio' },
  { key: 'tiene_pesaje',   color: '#A855F7', label: 'Pesaje'   },
];

// ── Vista Calendario ─────────────────────────────────────────────────────────
const CalendarioMes = ({ dias, hoy, anio, mes, onAbrirDia, accentColor }) => {
  const diasMap = {};
  dias.forEach(d => { diasMap[d.dia_del_mes] = d; });

  const daysInMonth = new Date(anio, mes, 0).getDate();
  const firstDayJS  = new Date(anio, mes - 1, 1).getDay();
  const startOffset = firstDayJS === 0 ? 6 : firstDayJS - 1;

  const cells = [];
  for (let i = 0; i < startOffset; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(d);
  while (cells.length % 7 !== 0) cells.push(null);

  return (
    <div style={{ maxWidth: '560px', margin: '0 auto' }}>
      {/* Encabezado días */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '4px', marginBottom: '6px' }}>
        {['Lu','Ma','Mi','Ju','Vi','Sá','Do'].map(d => (
          <div key={d} style={{ textAlign: 'center', fontSize: '11px', fontWeight: 600, color: 'var(--text-tertiary)', padding: '4px 0', letterSpacing: '0.07em' }}>{d}</div>
        ))}
      </div>

      {/* Grilla de días */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '4px' }}>
        {cells.map((dayNum, i) => {
          if (!dayNum) return <div key={`e-${i}`} style={{ aspectRatio: '1' }} />;

          const dia       = diasMap[dayNum];
          const esHoy     = dia?.fecha === hoy;
          const hayFuturo = dia?.fecha > hoy;
          const colors    = getDiaColors(dia, accentColor);
          const actividades = ACTIVIDAD.filter(a => dia?.[a.key]).map(a => a.label);
          const tooltip = dia
            ? `${dia.fecha} · día ${dia.dias_en_lote} en lote · ${dia.confirmado ? 'Confirmado' : dia.tiene_registro ? 'Borrador' : 'Sin registro'}${actividades.length ? ` · ${actividades.join(', ')}` : ''}`
            : '';

          return (
            <button
              key={dayNum}
              onClick={() => dia && onAbrirDia(dia.fecha)}
              title={tooltip}
              disabled={!dia}
              style={{
                aspectRatio: '1',
                borderRadius: '8px',
                border: `1.5px solid ${colors.border}`,
                background: colors.bg,
                cursor: dia ? 'pointer' : 'default',
                opacity: hayFuturo ? 0.35 : 1,
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '2px',
                padding: '4px',
                position: 'relative',
                transition: 'filter 0.1s, transform 0.1s, box-shadow 0.1s',
                boxShadow: esHoy ? `0 0 0 2px var(--accent-industrial)` : 'none',
              }}
              onMouseEnter={e => { if (dia && !hayFuturo) { e.currentTarget.style.filter = 'brightness(1.1)'; e.currentTarget.style.transform = 'scale(1.06)'; } }}
              onMouseLeave={e => { e.currentTarget.style.filter = 'none'; e.currentTarget.style.transform = 'scale(1)'; }}
            >
              <span style={{ fontSize: '15px', fontWeight: 700, color: colors.num, fontFamily: 'IBM Plex Mono, monospace', lineHeight: 1 }}>
                {dayNum}
              </span>
              {dia && dia.dias_en_lote >= 0 && !hayFuturo && (
                <span style={{ fontSize: '8px', lineHeight: 1, color: dia.confirmado || dia.tiene_registro ? 'rgba(255,255,255,0.85)' : 'var(--text-tertiary)', fontFamily: 'IBM Plex Mono, monospace' }}>
                  d{dia.dias_en_lote}
                </span>
              )}
              {dia?.fase && !hayFuturo && (
                <span style={{ fontSize: '8px', lineHeight: 1, color: dia.confirmado || dia.tiene_registro ? 'rgba(255,255,255,0.75)' : 'var(--text-tertiary)', maxWidth: '95%', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {dia.fase.length > 7 ? dia.fase.substring(0, 6) + '…' : dia.fase}
                </span>
              )}
              {!hayFuturo && (
                <span style={{ position: 'absolute', bottom: '3px', left: 0, right: 0, display: 'flex', gap: '3px', justifyContent: 'center' }}>
                  {ACTIVIDAD.filter(a => dia?.[a.key]).map(a => (
                    <span key={a.key} title={a.label}
                      style={{ width: 6, height: 6, borderRadius: '50%', background: a.color, display: 'inline-block' }} />
                  ))}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Leyenda */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '14px', marginTop: '16px', paddingTop: '14px', borderTop: '1px solid var(--border-subtle)', flexWrap: 'wrap' }}>
        {/* Estados (borde) */}
        {[
          { border: accentColor,             label: 'Confirmado' },
          { border: 'var(--accent-warning)', label: 'Borrador' },
          { border: 'var(--border-subtle)',  label: 'Sin registro' },
        ].map(({ border, label }) => (
          <div key={label} style={{ display: 'flex', alignItems: 'center', gap: '5px', fontSize: '11px', color: 'var(--text-tertiary)' }}>
            <span style={{ width: 12, height: 12, borderRadius: '3px', background: 'var(--bg-tertiary)', border: `1.5px solid ${border}`, display: 'inline-block', flexShrink: 0 }} />
            {label}
          </div>
        ))}
        {/* Actividades (puntos) */}
        {ACTIVIDAD.map(a => (
          <div key={a.key} style={{ display: 'flex', alignItems: 'center', gap: '5px', fontSize: '11px', color: 'var(--text-tertiary)' }}>
            <span style={{ width: 8, height: 8, borderRadius: '50%', background: a.color, display: 'inline-block', flexShrink: 0 }} />
            {a.label}
          </div>
        ))}
        <div style={{ display: 'flex', alignItems: 'center', gap: '5px', fontSize: '11px', color: 'var(--text-tertiary)' }}>
          <span style={{ width: 12, height: 12, borderRadius: '3px', background: 'var(--bg-secondary)', border: '1px solid var(--border-subtle)', boxShadow: '0 0 0 2px var(--accent-industrial)', display: 'inline-block', flexShrink: 0 }} />
          Hoy
        </div>
      </div>
    </div>
  );
};

// ── Vista Lista ──────────────────────────────────────────────────────────────
const ListaMes = ({ dias, hoy, onAbrirDia, accentColor }) => {
  const borderColor = (dia, esHoy) => {
    if (esHoy)              return 'var(--accent-industrial)';
    if (dia.confirmado)     return accentColor;
    if (dia.tiene_registro) return 'var(--accent-warning)';
    return 'var(--border-subtle)';
  };

  const statusInfo = (dia) => {
    if (dia.confirmado)      return { label: 'Confirmado', color: accentColor };
    if (dia.tiene_registro)  return { label: 'Borrador',   color: 'var(--accent-warning)' };
    return                          { label: 'Sin registro', color: 'var(--text-tertiary)' };
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
      {dias.map(dia => {
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
            <div style={{ minWidth: '72px' }}>
              <div style={{ fontSize: '13px', fontWeight: esHoy ? 600 : 400, color: esHoy ? 'var(--accent-industrial)' : 'var(--text-primary)', display: 'flex', alignItems: 'baseline', gap: '5px' }}>
                {diaSem} {dia.dia_del_mes}
                {esHoy && <span style={{ fontSize: '10px', color: 'var(--accent-industrial)', fontWeight: 400 }}>hoy</span>}
              </div>
              <div style={{ fontSize: '11px', color: 'var(--text-tertiary)', fontFamily: 'IBM Plex Mono, monospace' }}>día {dia.dias_en_lote}</div>
            </div>

            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                {dia.fase && <span style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>{dia.fase}</span>}
                {ACTIVIDAD.filter(a => dia[a.key]).map(a => (
                  <span key={a.key} title={a.label} style={{ display: 'inline-flex', alignItems: 'center', gap: '3px', fontSize: '11px', color: 'var(--text-secondary)' }}>
                    <span style={{ width: 6, height: 6, borderRadius: '50%', background: a.color, display: 'inline-block' }} />
                    {a.label}
                  </span>
                ))}
              </div>
              {alim && (
                <div style={{ fontSize: '11px', color: 'var(--text-tertiary)', marginTop: '2px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  {alim.descripcion}
                  <span style={{ fontFamily: 'IBM Plex Mono, monospace', marginLeft: '4px' }}>· {alim.cantidad_por_cabeza_kg} kg/cab</span>
                </div>
              )}
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '5px', minWidth: '110px', justifyContent: 'flex-end' }}>
              <span style={{ width: 7, height: 7, borderRadius: '50%', background: status.color, display: 'inline-block', flexShrink: 0 }} />
              <span style={{ fontSize: '12px', color: status.color, whiteSpace: 'nowrap' }}>{status.label}</span>
            </div>

            <button
              onClick={() => onAbrirDia(dia.fecha)}
              style={{ background: 'transparent', border: '1px solid var(--border-subtle)', borderRadius: '6px', padding: '5px 10px', cursor: 'pointer', fontSize: '12px', color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: '4px', whiteSpace: 'nowrap', flexShrink: 0, fontFamily: 'var(--font-sans)' }}
              onMouseEnter={e => { e.currentTarget.style.background = 'var(--bg-tertiary)'; e.currentTarget.style.color = 'var(--text-primary)'; e.currentTarget.style.borderColor = 'var(--border-mid)'; }}
              onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = 'var(--text-secondary)'; e.currentTarget.style.borderColor = 'var(--border-subtle)'; }}
            >
              Abrir día <Icon name="chevronRight" size={12} />
            </button>
          </div>
        );
      })}
    </div>
  );
};

// ── Componente principal ─────────────────────────────────────────────────────
const HojaVida = ({ negocioId, activeLote, onNavigate, setActiveFecha }) => {
  const accentColor = 'var(--accent-agro)';
  const hoy = new Date().toISOString().split('T')[0];
  const now = new Date();

  const [anio, setAnio] = useState(now.getFullYear());
  const [mes, setMes]   = useState(now.getMonth() + 1);
  const [data, setData] = useState(null);
  const loteId = activeLote?._id;

  const [loading, setLoading] = useState(!!(negocioId && loteId));
  const [error, setError]     = useState(null);
  const [vista, setVista]     = useState('calendario'); // 'calendario' | 'lista'

  useEffect(() => {
    if (!negocioId || !loteId) return;
    setLoading(true);
    setError(null);
    apiFetch(`/api/negocios/${negocioId}/lotes/${loteId}/hoja-de-vida?anio=${anio}&mes=${mes}`)
      .then(res => { setData(res); setLoading(false); })
      .catch(e  => { setError(e?.error || 'Error al cargar la hoja de vida'); setLoading(false); });
  }, [negocioId, loteId, anio, mes]);

  const prevMes = () => { if (mes === 1) { setAnio(a => a - 1); setMes(12); } else setMes(m => m - 1); };
  const nextMes = () => { if (mes === 12) { setAnio(a => a + 1); setMes(1); } else setMes(m => m + 1); };

  const handleAbrirDia = (fecha) => {
    if (setActiveFecha) setActiveFecha(fecha);
    if (onNavigate) onNavigate('registrodia');
  };

  // ── Sin lote ──────────────────────────────────────────────────────────────
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

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
        <button
          onClick={() => onNavigate?.('diario')}
          style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: 'var(--text-tertiary)', display: 'flex', alignItems: 'center', gap: '4px', fontSize: '13px', padding: '4px 0', fontFamily: 'var(--font-sans)' }}
          onMouseEnter={e => e.currentTarget.style.color = 'var(--text-secondary)'}
          onMouseLeave={e => e.currentTarget.style.color = 'var(--text-tertiary)'}
        >
          <Icon name="chevronLeft" size={14} /> Diario de producción
        </button>
        <span style={{ color: 'var(--border-mid)' }}>·</span>
        <div>
          <div style={{ fontSize: '17px', fontWeight: 500, color: 'var(--text-primary)', letterSpacing: '-0.01em' }}>
            Hoja de Vida — Lote #{activeLote.id}
            <span style={{ fontSize: '13px', fontWeight: 400, color: 'var(--text-tertiary)', marginLeft: '8px' }}>· {activeLote.tipo}</span>
          </div>
          {data?.fase_predominante && (
            <div style={{ fontSize: '12px', color: 'var(--text-tertiary)', marginTop: '2px' }}>
              Fase del mes: <span style={{ color: accentColor }}>{data.fase_predominante}</span>
            </div>
          )}
        </div>
      </div>

      {/* Barra de navegación + toggle */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '12px 16px', background: 'var(--bg-secondary)', borderRadius: '8px', border: '1px solid var(--border-subtle)', flexWrap: 'wrap' }}>
        <NavBtn onClick={prevMes}><Icon name="chevronLeft" size={14} /> Mes anterior</NavBtn>
        <div style={{ flex: 1, textAlign: 'center', fontSize: '15px', fontWeight: 500, color: 'var(--text-primary)', minWidth: '160px' }}>
          {MESES[mes - 1]} {anio}
        </div>
        <NavBtn onClick={nextMes}>Mes siguiente <Icon name="chevronRight" size={14} /></NavBtn>

        {/* Toggle vista */}
        <div style={{ display: 'flex', border: '1px solid var(--border-subtle)', borderRadius: '7px', overflow: 'hidden', marginLeft: '8px' }}>
          {[
            { key: 'calendario', icon: 'grid', label: 'Calendario' },
            { key: 'lista',      icon: 'list', label: 'Lista'      },
          ].map(({ key, icon, label }) => (
            <button
              key={key}
              onClick={() => setVista(key)}
              title={label}
              style={{
                background: vista === key ? accentColor : 'transparent',
                border: 'none',
                cursor: 'pointer',
                padding: '6px 12px',
                display: 'flex',
                alignItems: 'center',
                gap: '5px',
                fontSize: '12px',
                color: vista === key ? '#fff' : 'var(--text-secondary)',
                fontFamily: 'var(--font-sans)',
                transition: 'background 0.15s, color 0.15s',
              }}
              onMouseEnter={e => { if (vista !== key) e.currentTarget.style.background = 'var(--bg-tertiary)'; }}
              onMouseLeave={e => { if (vista !== key) e.currentTarget.style.background = 'transparent'; }}
            >
              <Icon name={icon} size={13} /> {label}
            </button>
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

      {/* Contenido */}
      {!loading && !error && data && (
        <div style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border-subtle)', borderRadius: '10px', padding: '20px' }}>
          {vista === 'calendario' ? (
            <CalendarioMes
              dias={data.dias}
              hoy={hoy}
              anio={anio}
              mes={mes}
              onAbrirDia={handleAbrirDia}
              accentColor={accentColor}
            />
          ) : (
            <ListaMes
              dias={data.dias}
              hoy={hoy}
              onAbrirDia={handleAbrirDia}
              accentColor={accentColor}
            />
          )}
        </div>
      )}
    </div>
  );
};

export default HojaVida;
