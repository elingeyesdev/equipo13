import { useState, useEffect } from 'react';
import { apiFetch, API_BASE } from '../../config/api.js';
import { Icon } from '../../icons.jsx';
import { Btn, StatusBadge } from '../../components/ui.jsx';

const ACCENT = 'var(--accent-agro)';

function SectionHeader({ icon, title, count, accent = ACCENT }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '12px 16px', borderBottom: '1px solid var(--border-subtle)' }}>
      <Icon name={icon} size={16} style={{ color: accent }} />
      <span style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-primary)' }}>{title}</span>
      {count > 0 && (
        <span style={{ background: accent + '1A', color: accent, border: `1px solid ${accent}33`, borderRadius: '999px', padding: '1px 9px', fontSize: '11px', fontFamily: 'var(--font-mono)', fontWeight: 600 }}>{count}</span>
      )}
    </div>
  );
}

function EmptyRow({ text }) {
  return (
    <div style={{ padding: '28px', textAlign: 'center', color: 'var(--text-tertiary)', fontSize: '13px' }}>{text}</div>
  );
}

function Fotos({ fotos }) {
  if (!fotos || !fotos.length) {
    return <span style={{ fontSize: '12px', color: 'var(--text-tertiary)' }}>Sin fotos</span>;
  }
  return (
    <div style={{ display: 'flex', gap: '5px', flexWrap: 'wrap' }}>
      {fotos.map((f, i) => (
        <a key={i} href={API_BASE + f} target="_blank" rel="noreferrer">
          <img src={API_BASE + f} alt="evidencia"
            style={{ height: 38, width: 38, borderRadius: '6px', objectFit: 'cover', border: '1px solid var(--border-subtle)', cursor: 'pointer', display: 'block' }} />
        </a>
      ))}
    </div>
  );
}

export default function Pendientes({ negocioId }) {
  const [registros, setRegistros] = useState([]);
  const [bajas, setBajas] = useState([]);
  const [incidentes, setIncidentes] = useState([]);
  const [stockBajo, setStockBajo] = useState([]);
  const [msg, setMsg] = useState(null);

  async function cargar() {
    try {
      const [rData, bData, iData, sData] = await Promise.all([
        apiFetch(`/api/negocios/${negocioId}/pendientes/registros`),
        apiFetch(`/api/negocios/${negocioId}/eventos?estado=pendiente&tipo=baja`),
        apiFetch(`/api/negocios/${negocioId}/eventos?tipo=incidente`),
        apiFetch(`/api/negocios/${negocioId}/eventos?tipo=stock_bajo`),
      ]);
      setRegistros(Array.isArray(rData) ? rData : []);
      setBajas(Array.isArray(bData) ? bData : []);
      setIncidentes(Array.isArray(iData) ? iData : []);
      setStockBajo(Array.isArray(sData) ? sData : []);
    } catch (e) {
      setMsg({ tipo: 'error', texto: e.error || 'Error al cargar pendientes' });
    }
  }
  useEffect(() => { if (negocioId) cargar(); }, [negocioId]);

  async function confirmar(loteId, fecha) {
    setMsg(null);
    try {
      await apiFetch(`/api/negocios/${negocioId}/lotes/${loteId}/hoja-de-vida/${fecha}/confirmar`, { method: 'POST' });
      setMsg({ tipo: 'ok', texto: 'Día confirmado y costos aplicados (FIFO).' });
      cargar();
    } catch (e) {
      setMsg({ tipo: 'error', texto: e.error || 'No se pudo confirmar el registro' });
    }
  }

  async function gestionarBaja(eventoId, accion) {
    setMsg(null);
    try {
      await apiFetch(`/api/negocios/${negocioId}/pendientes/bajas/${eventoId}/${accion}`, { method: 'POST' });
      setMsg({ tipo: 'ok', texto: `Baja ${accion === 'aprobar' ? 'aprobada' : 'rechazada'} exitosamente.` });
      cargar();
    } catch (e) {
      setMsg({ tipo: 'error', texto: e.error || 'Error al gestionar baja' });
    }
  }

  async function archivarEvento(eventoId) {
    setMsg(null);
    try {
      await apiFetch(`/api/negocios/${negocioId}/pendientes/eventos/${eventoId}/archivar`, { method: 'POST' });
      setMsg({ tipo: 'ok', texto: 'Evento marcado como resuelto.' });
      cargar();
    } catch (e) {
      setMsg({ tipo: 'error', texto: e.error || 'Error al archivar evento' });
    }
  }

  const incidentesYStock = [...incidentes, ...stockBajo].sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
  const totalPendientes = registros.length + bajas.length;
  const msgColor = msg?.tipo === 'error' ? 'var(--accent-danger)' : 'var(--accent-success)';

  const card = { background: 'var(--bg-secondary)', border: '1px solid var(--border-subtle)', borderRadius: '8px', overflow: 'hidden' };
  const colHead = (label, align = 'left') => (
    <div style={{ fontSize: '11px', color: 'var(--text-tertiary)', letterSpacing: '0.05em', fontWeight: 500, textAlign: align }}>{label}</div>
  );

  const REG_GRID = 'minmax(140px,1.4fr) 130px 70px minmax(120px,1.6fr) 120px';
  const BAJA_GRID = '150px minmax(120px,1.2fr) minmax(100px,1fr) 80px minmax(100px,1.2fr) 140px 170px';
  const INC_GRID = '150px minmax(120px,1.2fr) minmax(100px,1fr) 110px minmax(160px,2fr) 140px';

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <h1 style={{ fontSize: '22px', fontWeight: 400, color: 'var(--text-primary)', letterSpacing: '-0.02em' }}>Pendientes</h1>
            <span style={{ background: ACCENT + '1A', color: ACCENT, border: `1px solid ${ACCENT}33`, borderRadius: '5px', padding: '2px 10px', fontSize: '12px', fontFamily: 'var(--font-mono)', fontWeight: 500 }}>{totalPendientes}</span>
          </div>
          <p style={{ fontSize: '13px', color: 'var(--text-tertiary)', marginTop: '4px' }}>Revisá y aprobá lo que reportan los operarios desde la app móvil.</p>
        </div>
        <Btn variant="secondary" icon="refresh" onClick={cargar}>Actualizar</Btn>
      </div>

      {msg && (
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', color: msgColor, background: 'var(--bg-secondary)', border: `1px solid ${msgColor}33`, borderLeft: `3px solid ${msgColor}`, borderRadius: '6px', padding: '10px 14px' }}>
          <Icon name={msg.tipo === 'error' ? 'alertTriangle' : 'checkCircle'} size={14} />
          {msg.texto}
        </div>
      )}

      {/* Hojas de Vida */}
      <div style={card}>
        <SectionHeader icon="clipboardList" title="Hojas de vida · borradores diarios" count={registros.length} />
        {registros.length === 0 ? (
          <EmptyRow text="No hay hojas de vida pendientes de confirmar. 🎉" />
        ) : (
          <>
            <div style={{ display: 'grid', gridTemplateColumns: REG_GRID, gap: '12px', padding: '8px 16px', borderBottom: '1px solid var(--border-subtle)' }}>
              {colHead('Lote')}{colHead('Fecha')}{colHead('Ítems', 'right')}{colHead('Notas')}{colHead('')}
            </div>
            {registros.map((r, i) => (
              <div key={r.id} style={{ display: 'grid', gridTemplateColumns: REG_GRID, gap: '12px', padding: '11px 16px', borderBottom: i < registros.length - 1 ? '1px solid var(--border-subtle)' : 'none', alignItems: 'center' }}>
                <span style={{ fontSize: '13px', color: 'var(--text-primary)', fontWeight: 500 }}>{r.lote_identificador}</span>
                <span style={{ fontSize: '13px', fontFamily: 'var(--font-mono)', color: 'var(--text-secondary)' }}>{String(r.fecha).split('T')[0]}</span>
                <span style={{ fontSize: '13px', fontFamily: 'var(--font-mono)', color: 'var(--text-secondary)', textAlign: 'right' }}>{r.items_count}</span>
                <div style={{ overflow: 'hidden' }}>
                  <span style={{ fontSize: '13px', color: 'var(--text-tertiary)', textOverflow: 'ellipsis', whiteSpace: 'nowrap', display: 'block' }} title={r.notas_del_dia || ''}>{r.notas_del_dia || '—'}</span>
                  {r.peso_promedio_kg && (
                    <span style={{ display: 'inline-block', marginTop: '4px', background: 'var(--accent-warning)1A', color: 'var(--accent-warning)', border: '1px solid var(--accent-warning)33', borderRadius: '4px', padding: '1px 6px', fontSize: '10px', fontWeight: 600 }}>+ Pesaje: {r.peso_promedio_kg} kg</span>
                  )}
                </div>
                <div style={{ textAlign: 'right' }}>
                  <Btn size="sm" icon="check" accentColor={ACCENT} onClick={() => confirmar(r.lote_id, String(r.fecha).split('T')[0])}>Confirmar</Btn>
                </div>
              </div>
            ))}
          </>
        )}
      </div>

      {/* Bajas Reportadas */}
      <div style={card}>
        <SectionHeader icon="alertCircle" title="Bajas reportadas · pendientes de aprobación" count={bajas.length} accent="var(--accent-danger)" />
        {bajas.length === 0 ? (
          <EmptyRow text="No hay bajas pendientes de aprobación." />
        ) : (
          <>
            <div style={{ display: 'grid', gridTemplateColumns: BAJA_GRID, gap: '12px', padding: '8px 16px', borderBottom: '1px solid var(--border-subtle)' }}>
              {colHead('Fecha')}{colHead('Lote')}{colHead('Operario')}{colHead('Cabezas', 'right')}{colHead('Causa')}{colHead('Fotos')}{colHead('')}
            </div>
            {bajas.map((b, i) => (
              <div key={b.id} style={{ display: 'grid', gridTemplateColumns: BAJA_GRID, gap: '12px', padding: '11px 16px', borderBottom: i < bajas.length - 1 ? '1px solid var(--border-subtle)' : 'none', alignItems: 'center' }}>
                <span style={{ fontSize: '12px', fontFamily: 'var(--font-mono)', color: 'var(--text-tertiary)' }}>{new Date(b.created_at).toLocaleString('es-BO', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })}</span>
                <span style={{ fontSize: '13px', color: 'var(--text-primary)', fontWeight: 500 }}>{b.lote_identificador}</span>
                <span style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>{b.operario_nombre}</span>
                <span style={{ fontSize: '13px', fontFamily: 'var(--font-mono)', color: 'var(--accent-danger)', textAlign: 'right', fontWeight: 600 }}>{b.payload?.cabezas || b.payload?.cantidad || 0}</span>
                <span style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>{b.payload?.causa}</span>
                <Fotos fotos={b.fotos} />
                <div style={{ display: 'flex', gap: '6px', justifyContent: 'flex-end' }}>
                  <Btn size="sm" icon="check" accentColor="var(--accent-success)" onClick={() => gestionarBaja(b.id, 'aprobar')}>Aprobar</Btn>
                  <Btn size="sm" variant="danger" icon="x" onClick={() => gestionarBaja(b.id, 'rechazar')}>Rechazar</Btn>
                </div>
              </div>
            ))}
          </>
        )}
      </div>

      {/* Incidentes y Stock Bajo */}
      <div style={card}>
        <SectionHeader icon="bell" title="Incidentes y stock bajo" count={incidentesYStock.length} accent="var(--accent-warning)" />
        {incidentesYStock.length === 0 ? (
          <EmptyRow text="No hay reportes de incidentes ni stock bajo." />
        ) : (
          <>
            <div style={{ display: 'grid', gridTemplateColumns: INC_GRID, gap: '12px', padding: '8px 16px', borderBottom: '1px solid var(--border-subtle)' }}>
              {colHead('Fecha')}{colHead('Lote')}{colHead('Operario')}{colHead('Tipo')}{colHead('Detalle')}{colHead('Fotos')}
            </div>
            {incidentesYStock.map((e, i) => {
              const esIncidente = e.tipo === 'incidente';
              return (
                <div key={e.id} style={{ display: 'grid', gridTemplateColumns: INC_GRID, gap: '12px', padding: '11px 16px', borderBottom: i < incidentesYStock.length - 1 ? '1px solid var(--border-subtle)' : 'none', alignItems: 'center' }}>
                  <span style={{ fontSize: '12px', fontFamily: 'var(--font-mono)', color: 'var(--text-tertiary)' }}>{new Date(e.created_at).toLocaleString('es-BO', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })}</span>
                  <span style={{ fontSize: '13px', color: 'var(--text-primary)', fontWeight: 500 }}>{e.lote_identificador}</span>
                  <span style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>{e.operario_nombre}</span>
                  <div><StatusBadge label={esIncidente ? 'Incidente' : 'Stock bajo'} color={esIncidente ? 'var(--accent-warning)' : 'var(--accent-danger)'} /></div>
                  <span style={{ fontSize: '13px', color: 'var(--text-secondary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={esIncidente ? `${e.payload?.categoria || ''}: ${e.payload?.descripcion || ''}` : `${e.payload?.nombre || 'Insumo'} a nivel ${e.payload?.nivel || ''}`}>
                    {esIncidente
                      ? `${e.payload?.categoria || ''}: ${e.payload?.descripcion || ''}`
                      : `${e.payload?.nombre || 'Insumo'} a nivel ${e.payload?.nivel || ''}`}
                  </span>
                  <Fotos fotos={e.fotos} />
                  <div style={{ textAlign: 'right' }}>
                    <Btn size="sm" icon="check" variant="secondary" onClick={() => archivarEvento(e.id)}>Resuelto</Btn>
                  </div>
                </div>
              );
            })}
          </>
        )}
      </div>
    </div>
  );
}
