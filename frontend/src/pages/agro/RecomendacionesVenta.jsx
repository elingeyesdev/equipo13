import React, { useState, useEffect } from 'react';
import { Icon } from '../../icons.jsx';
import { Btn, StatusBadge, MetricCard } from '../../components/ui.jsx';

import { useRecomendaciones } from './recomendaciones/useRecomendaciones.js';
import { rankItems } from './recomendaciones/derive.js';

import VistaDecision from './recomendaciones/VistaDecision.jsx';
import VistaTabla from './recomendaciones/VistaTabla.jsx';
import BandaAlertas from './recomendaciones/BandaAlertas.jsx';
import PanelFichas from './recomendaciones/PanelFichas.jsx';
import { apiFetch } from '../../config/api.js';

const ACCENT = 'var(--accent-agro)';
const fmt = (n, d = 2) => Number(n || 0).toLocaleString('es-BO', { minimumFractionDigits: d, maximumFractionDigits: d });

function Chip({ active, onClick, children }) {
  return (
    <div
      onClick={onClick}
      style={{
        padding: '4px 12px', fontSize: '13px', fontWeight: 500, cursor: 'pointer',
        background: active ? 'var(--bg-primary)' : 'transparent',
        color: active ? 'var(--text-primary)' : 'var(--text-tertiary)',
        borderRadius: '16px', transition: 'all 0.15s',
        boxShadow: active ? 'var(--shadow-sm)' : 'none'
      }}
    >
      {children}
    </div>
  );
}

function ChipSelector({ options, value, onChange }) {
  return (
    <div style={{ display: 'flex', background: 'var(--bg-tertiary)', padding: '2px', borderRadius: '18px', gap: '2px' }}>
      {options.map(opt => (
        <Chip key={opt.value} active={value === opt.value} onClick={() => onChange(opt.value)}>
          {opt.label}
        </Chip>
      ))}
    </div>
  );
}

export default function RecomendacionesVenta({ negocioId }) {
  const [lotes, setLotes] = useState([]);
  const [loteId, setLoteId] = useState('');

  useEffect(() => {
    if (negocioId) {
      apiFetch(`/api/negocios/${negocioId}/lotes`)
        .then(data => {
          const activos = data.filter(l => l.activo);
          setLotes(activos);
          // Las recomendaciones se calculan sobre cualquier lote (despiece teórico
          // según catálogo + cabezas + peso), así que abrimos en el primer lote activo.
          if (activos.length > 0 && !loteId) setLoteId(activos[0].id);
        })
        .catch(err => console.error('Error cargando lotes:', err));
    }
  }, [negocioId]);

  const { 
    items: rawItems, resumen, modo, metaModelos, historico, alertas, 
    cargando, error, recId, horizonte, setHorizonte, recargar
  } = useRecomendaciones(negocioId, loteId);

  const [vista, setVista] = useState('decision');
  
  // Para Fichas guardadas (modo readonly)
  const [fichaActiva, setFichaActiva] = useState(null);
  const [guardandoFicha, setGuardandoFicha] = useState(false);

  // Ranking happens here
  const items = rankItems(fichaActiva ? fichaActiva.items : rawItems);
  const currentResumen = fichaActiva ? fichaActiva.resumen : resumen;

  // Lote seleccionado (para mensajes contextuales)
  const loteSel = lotes.find(l => l.id === loteId);

  async function guardarFicha() {
    if (!recId) return alert('No hay recomendación activa para guardar.');
    const nombre = prompt('Ingresá un nombre para esta ficha (ej: "Fin de mes", "Venta mayorista"):');
    if (!nombre) return;
    
    setGuardandoFicha(true);
    try {
      await apiFetch(`/api/negocios/${negocioId}/recomendaciones/${recId}/fijar`, {
        method: 'POST',
        body: JSON.stringify({ nombre })
      });
      alert('Ficha guardada con éxito.');
      // Trick to re-trigger PanelFichas reload could be done, but reopening it works.
    } catch (e) {
      console.error(e);
      alert('Error al guardar la ficha: ' + e.message);
    }
    setGuardandoFicha(false);
  }

  async function cargarFichaGuardada(idFicha) {
    try {
      const f = await apiFetch(`/api/negocios/${negocioId}/recomendaciones/fichas/${idFicha}`);
      setFichaActiva(f);
    } catch (e) {
      console.error(e);
      alert('Error cargando ficha guardada.');
    }
  }

  function exportarCSV() {
    const cols = ['corte_canonico', 'canal_sugerido', 'precio_referencia', 'costo_kg', 'margen_kg',
                  'kg_disponibles', 'ingreso_estimado', 'tendencia', 'precio_pronosticado', 
                  'margen_pronosticado', 'ingreso_pronosticado', 'confianza', 'accion'];
    const head = cols.join(',');
    const rows = items.map(i => cols.map(c => i[c] ?? '').join(','));
    const blob = new Blob([[head, ...rows].join('\n')], { type: 'text/csv' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob); a.download = 'recomendaciones_venta.csv'; a.click();
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      <style>{`
        @media print { 
          button, #no-print { display: none !important; } 
          .grid-decision { grid-template-columns: 1fr !important; }
          body { background: white !important; }
        }
      `}</style>

      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '12px' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <h1 style={{ fontSize: '22px', fontWeight: 400, color: 'var(--text-primary)', letterSpacing: '-0.02em' }}>
              {fichaActiva ? `Ficha: ${fichaActiva.nombre}` : 'Recomendaciones de venta'}
            </h1>
            {!fichaActiva && (
              <StatusBadge
                label={modo === 'forecast' ? 'Pronóstico ML' : 'Heurístico'}
                color={modo === 'forecast' ? 'var(--accent-industrial)' : 'var(--text-tertiary)'} />
            )}
            {fichaActiva && (
              <StatusBadge label="Solo-Lectura" color="var(--text-tertiary)" />
            )}
          </div>
          <p style={{ fontSize: '13px', color: 'var(--text-tertiary)', marginTop: '4px' }}>
            {fichaActiva 
              ? `Generada el ${new Date(fichaActiva.generada_en).toLocaleString('es-BO')}` 
              : 'Qué corte vender, en qué canal y a qué precio según el mercado y tu stock.'}
          </p>
        </div>
        
        <div id="no-print" style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '10px' }}>
          {/* Main actions */}
          <div style={{ display: 'flex', gap: '8px' }}>
            {fichaActiva ? (
              <Btn variant="primary" icon="history" onClick={() => setFichaActiva(null)}>Volver a hoy</Btn>
            ) : (
              <>
                <Btn variant="secondary" icon="refresh" onClick={recargar} disabled={cargando}>Re-calcular</Btn>
                <Btn variant="primary" icon="save" onClick={guardarFicha} disabled={cargando || !recId || guardandoFicha}>
                  {guardandoFicha ? 'Guardando...' : 'Guardar ficha'}
                </Btn>
              </>
            )}
            <Btn variant="secondary" icon="download" onClick={exportarCSV} disabled={items.length===0}>CSV</Btn>
            <Btn variant="secondary" icon="fileText" onClick={() => window.print()} disabled={items.length===0}>PDF</Btn>
          </div>
          
          {/* Selectors */}
          <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '12px', color: 'var(--text-secondary)' }}>
              Lote a analizar:
              <select
                value={loteId}
                onChange={e => setLoteId(e.target.value)}
                disabled={!!fichaActiva}
                style={{ 
                  background: 'var(--bg-tertiary)', border: '1px solid var(--border-subtle)', 
                  borderRadius: '16px', padding: '4px 10px', fontSize: '13px', 
                  color: 'var(--text-primary)', outline: 'none', cursor: 'pointer' 
                }}
              >
                {!loteId && <option value="">-- Seleccionar Lote --</option>}
                {lotes.map(l => (
                  <option key={l.id} value={l.id}>{l.identificador}</option>
                ))}
              </select>
            </div>

            <div style={{ width: '1px', height: '16px', background: 'var(--border-subtle)' }} />

            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '12px', color: 'var(--text-secondary)' }}>
              Horizonte:
              <ChipSelector 
                value={horizonte} onChange={setHorizonte}
                options={[
                  { value: 3, label: '3d' },
                  { value: 7, label: '7d' },
                  { value: 14, label: '14d' },
                  { value: 30, label: '30d' },
                ]} 
              />
            </div>
            
            <div style={{ width: '1px', height: '16px', background: 'var(--border-subtle)' }} />
            
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '12px', color: 'var(--text-secondary)' }}>
              Vista:
              <ChipSelector 
                value={vista} onChange={setVista}
                options={[
                  { value: 'decision', label: 'Decisión' },
                  { value: 'tabla', label: 'Tabla' }
                ]} 
              />
            </div>
          </div>
        </div>
      </div>

      {/* Panel de Fichas Guardadas */}
      {!fichaActiva && negocioId && <div id="no-print"><PanelFichas negocioId={negocioId} onSelectFicha={cargarFichaGuardada} /></div>}

      {/* Alertas */}
      {!fichaActiva && negocioId && <div id="no-print"><BandaAlertas negocioId={negocioId} alertas={alertas} recargar={recargar} /></div>}

      {/* Resumen */}
      {currentResumen && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '12px' }}>
          <MetricCard label="Ingreso estimado total" value={`Bs ${fmt(currentResumen.ingreso_total)}`} icon={<Icon name="wallet" size={16} />} accentColor={ACCENT} />
          <MetricCard label="Margen total" value={`Bs ${fmt(currentResumen.margen_total)}`} icon={<Icon name="trendingUp" size={16} />} accentColor="var(--accent-success)" />
          <MetricCard label="Cortes analizados" value={items.length} mono icon={<Icon name="layers" size={16} />} />
        </div>
      )}

      {/* Contenido Principal */}
      <div style={{ minHeight: '300px' }}>
        {!loteId && !fichaActiva ? (
          <div style={{ padding: '40px', textAlign: 'center', color: 'var(--text-tertiary)', fontSize: '14px', lineHeight: 1.6, background: 'var(--bg-secondary)', borderRadius: '8px', border: '1px solid var(--border-subtle)' }}>
            <Icon name="layers" size={28} style={{ color: 'var(--text-tertiary)', opacity: 0.5 }} />
            <div style={{ marginTop: '10px' }}>Seleccioná un lote para analizar.</div>
            <div style={{ fontSize: '12px' }}>Las recomendaciones se basarán en los kilos disponibles de los cortes del lote seleccionado.</div>
          </div>
        ) : cargando ? (
          <div style={{ padding: '40px', textAlign: 'center', color: 'var(--text-tertiary)', fontSize: '14px' }}>Calculando recomendaciones…</div>
        ) : error ? (
          <div style={{ padding: '40px', textAlign: 'center', color: 'var(--accent-danger)', fontSize: '14px', lineHeight: 1.6, background: 'var(--bg-secondary)', borderRadius: '8px', border: '1px solid var(--border-subtle)' }}>
            <Icon name="alertTriangle" size={28} style={{ opacity: 0.5 }} />
            <div style={{ marginTop: '10px', fontWeight: 500 }}>{error}</div>
            <div style={{ fontSize: '12px', opacity: 0.8 }}>Verificá que el contenedor ml_service esté corriendo.</div>
          </div>
        ) : items.length === 0 ? (
          <div style={{ padding: '40px', textAlign: 'center', color: 'var(--text-tertiary)', fontSize: '14px', lineHeight: 1.6, background: 'var(--bg-secondary)', borderRadius: '8px', border: '1px solid var(--border-subtle)' }}>
            <Icon name="trendingUp" size={28} style={{ color: 'var(--text-tertiary)', opacity: 0.5 }} />
            <div style={{ marginTop: '10px' }}>No hay datos suficientes todavía.</div>
            <div style={{ fontSize: '12px' }}>
              {loteSel && (loteSel.cabezas_activas <= 0 || Number(loteSel.peso_actual_prom) <= 0)
                ? 'El lote no tiene cabezas activas o peso promedio cargado.'
                : 'Los cortes de este lote no tienen precio de mercado. Configurá fuentes de datos y ejecutá el scraping primero.'}
            </div>
          </div>
        ) : vista === 'decision' ? (
          <VistaDecision 
            items={items} 
            metaModelos={metaModelos} 
            historico={historico} 
            alertas={alertas} 
            horizonte={horizonte} 
          />
        ) : (
          <VistaTabla 
            items={items} 
            metaModelos={metaModelos} 
            historico={historico} 
          />
        )}
      </div>

    </div>
  );
}
