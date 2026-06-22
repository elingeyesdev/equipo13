import React, { useState, useEffect } from 'react';
import { Icon } from '../../icons.jsx';
import { apiFetch } from '../../config/api.js';
import { Btn, StatusBadge, InfoBanner, InfoTip, RubroBadge } from '../../components/ui.jsx';

const accentColor = 'var(--accent-agro)';

const fmt = (n, dec = 2) =>
  (parseFloat(n) || 0).toLocaleString('es-BO', {
    minimumFractionDigits: dec,
    maximumFractionDigits: dec,
  });

export default function CatalogoCortes({ negocioId, onNavigate }) {
  const [cortes, setCortes] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState(null);
  
  // Form estado
  const [formNombre, setFormNombre] = useState('');
  const [formRendimiento, setFormRendimiento] = useState('');
  const [formTipo, setFormTipo] = useState('primario');
  const [formProductoSugerido, setFormProductoSugerido] = useState('');
  const [formAliases, setFormAliases] = useState('');
  const [saving, setSaving] = useState(false);
  const [editingId, setEditingId] = useState(null);

  useEffect(() => {
    if (!negocioId) return;
    cargarCortes();
  }, [negocioId]);

  async function cargarCortes() {
    setCargando(true);
    try {
      const data = await apiFetch(`/api/negocios/${negocioId}/catalogo-cortes`);
      setCortes(data);
    } catch (e) {
      setError('Error al cargar el catálogo de cortes.');
    } finally {
      setCargando(false);
    }
  }

  const sumaRendimiento = cortes.reduce((sum, c) => sum + (parseFloat(c.rendimiento_pct) || 0), 0);
  const errorSuma = sumaRendimiento !== 100 && cortes.length > 0;

  const resetForm = () => {
    setFormNombre('');
    setFormRendimiento('');
    setFormTipo('primario');
    setFormProductoSugerido('');
    setFormAliases('');
    setEditingId(null);
  };

  const handleEdit = (c) => {
    setEditingId(c.id);
    setFormNombre(c.nombre);
    setFormRendimiento(c.rendimiento_pct);
    setFormTipo(c.tipo);
    setFormProductoSugerido(c.producto_sugerido || '');
    setFormAliases((c.aliases || []).join(', '));
  };

  const handleSave = async () => {
    const nombre = formNombre.trim();
    const rendimiento_pct = parseFloat(formRendimiento);
    const tipo = formTipo;
    const producto_sugerido = formProductoSugerido.trim() || null;
    const aliasesArray = formAliases.split(',').map(s => s.trim()).filter(Boolean);

    if (!nombre || isNaN(rendimiento_pct) || !tipo) return;

    setSaving(true);
    setError(null);

    const payload = {
      nombre, rendimiento_pct, tipo, producto_sugerido, aliases: aliasesArray,
    };

    try {
      if (editingId) {
        await apiFetch(`/api/negocios/${negocioId}/catalogo-cortes/${editingId}`, {
          method: 'PUT',
          body: JSON.stringify(payload),
        });
      } else {
        await apiFetch(`/api/negocios/${negocioId}/catalogo-cortes`, {
          method: 'POST',
          body: JSON.stringify(payload),
        });
      }
      await cargarCortes();
      resetForm();
    } catch (e) {
      setError(e.error || 'Error al guardar el corte');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('¿Seguro que deseas eliminar este corte? Esto no borrará el histórico pero lo ocultará del catálogo.')) return;
    try {
      await apiFetch(`/api/negocios/${negocioId}/catalogo-cortes/${id}`, { method: 'DELETE' });
      await cargarCortes();
    } catch (e) {
      setError('Error al eliminar el corte');
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      <InfoBanner
        storageKey="banner_catalogo_cortes_v1"
        title="Catálogo de Cortes"
        text="Define la plantilla estándar de despiece para tu negocio. Esta lista alimenta al módulo de Despiece, y los nombres (aliases) son usados por la IA para recolectar precios del mercado y dar recomendaciones de venta."
        accentColor={accentColor}
      />

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '12px' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
          <h1 style={{ fontSize: '20px', fontWeight: 400, color: 'var(--text-primary)', letterSpacing: '-0.02em', margin: 0 }}>
            Catálogo de cortes
          </h1>
        </div>
        <RubroBadge rubro="agro_ganadero" />
      </div>

      {error && (
        <div style={{ background: 'var(--accent-danger)12', border: '1px solid var(--accent-danger)44', borderRadius: '6px', padding: '10px 14px', fontSize: '13px', color: 'var(--accent-danger)', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Icon name="alertTriangle" size={14} />
          {error}
        </div>
      )}

      {errorSuma && (
        <div style={{ background: 'var(--accent-warning)12', border: '1px solid var(--accent-warning)44', borderRadius: '6px', padding: '10px 14px', fontSize: '13px', color: 'var(--accent-warning)', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Icon name="alertCircle" size={14} />
          <span>La suma de rendimientos actuales es <strong>{fmt(sumaRendimiento, 2)}%</strong>. Debería sumar exactamente 100% del peso en canal.</span>
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 300px', gap: '20px', alignItems: 'flex-start' }}>
        
        {/* Tabla izquierda */}
        <div style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border-subtle)', borderRadius: '8px', overflow: 'hidden' }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'minmax(120px, 1.5fr) 90px 100px 1fr 1.5fr 80px', padding: '8px 16px', borderBottom: '1px solid var(--border-subtle)', gap: '8px' }}>
            {[
              { h: 'Nombre' },
              { h: 'Rendim. %', align: 'right' },
              { h: 'Tipo' },
              { h: 'Producto sugerido' },
              { h: 'Aliases (Web Scraping)', tip: 'Términos de búsqueda que usa la IA para encontrar precios de este corte en el mercado.' },
              { h: 'Acciones', align: 'right' }
            ].map((col, i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '4px', justifyContent: col.align === 'right' ? 'flex-end' : 'flex-start', fontSize: '10px', color: 'var(--text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.06em', fontWeight: 500 }}>
                {col.h}
                {col.tip && <InfoTip text={col.tip} position="top" />}
              </div>
            ))}
          </div>

          {cargando ? (
            <div style={{ padding: '32px 20px', textAlign: 'center', color: 'var(--text-tertiary)', fontSize: '13px' }}>Cargando catálogo...</div>
          ) : cortes.length === 0 ? (
            <div style={{ padding: '32px 20px', textAlign: 'center', color: 'var(--text-tertiary)', fontSize: '13px' }}>
              <Icon name="scissors" size={24} style={{ display: 'block', margin: '0 auto 10px', opacity: 0.4 }} />
              El catálogo está vacío.
            </div>
          ) : (
            cortes.map((c) => (
              <div
                key={c.id}
                style={{ display: 'grid', gridTemplateColumns: 'minmax(120px, 1.5fr) 90px 100px 1fr 1.5fr 80px', padding: '9px 16px', borderBottom: '1px solid var(--border-subtle)', gap: '8px', alignItems: 'center', transition: 'background 0.1s', background: editingId === c.id ? 'var(--bg-tertiary)' : 'transparent' }}
                onMouseEnter={e => { if (editingId !== c.id) e.currentTarget.style.background = 'var(--bg-tertiary)'; }}
                onMouseLeave={e => { if (editingId !== c.id) e.currentTarget.style.background = 'transparent'; }}
              >
                <div style={{ fontSize: '13px', color: 'var(--text-primary)', fontWeight: 500 }}>{c.nombre}</div>
                <div style={{ fontFamily: 'IBM Plex Mono, monospace', fontSize: '13px', color: 'var(--text-primary)', textAlign: 'right' }}>{fmt(c.rendimiento_pct, 1)}%</div>
                <div><StatusBadge label={c.tipo} color={c.tipo === 'primario' ? 'var(--accent-agro)' : 'var(--text-tertiary)'} /></div>
                <div style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>{c.producto_sugerido || '—'}</div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
                  {(c.aliases || []).map(a => (
                    <span key={a} style={{ fontSize: '11px', background: 'var(--bg-primary)', border: '1px solid var(--border-subtle)', borderRadius: '4px', padding: '1px 5px', color: 'var(--text-secondary)' }}>{a}</span>
                  ))}
                  {(!c.aliases || c.aliases.length === 0) && <span style={{ color: 'var(--text-tertiary)', fontSize: '12px' }}>—</span>}
                </div>
                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
                  <button
                    onClick={() => handleEdit(c)}
                    title="Editar corte"
                    style={{ background: 'transparent', border: 'none', color: 'var(--text-tertiary)', cursor: 'pointer', padding: '4px', borderRadius: '4px', transition: 'color 0.15s' }}
                    onMouseEnter={e => (e.currentTarget.style.color = 'var(--text-primary)')}
                    onMouseLeave={e => (e.currentTarget.style.color = 'var(--text-tertiary)')}
                  >
                    <Icon name="edit2" size={14} />
                  </button>
                  <button
                    onClick={() => handleDelete(c.id)}
                    title="Eliminar corte"
                    style={{ background: 'transparent', border: 'none', color: 'var(--text-tertiary)', cursor: 'pointer', padding: '4px', borderRadius: '4px', transition: 'color 0.15s' }}
                    onMouseEnter={e => (e.currentTarget.style.color = 'var(--accent-danger)')}
                    onMouseLeave={e => (e.currentTarget.style.color = 'var(--text-tertiary)')}
                  >
                    <Icon name="trash2" size={14} />
                  </button>
                </div>
              </div>
            ))
          )}

          {/* Fila totales */}
          {cortes.length > 0 && (
            <div style={{ display: 'grid', gridTemplateColumns: 'minmax(120px, 1.5fr) 90px 100px 1fr 1.5fr 80px', padding: '10px 16px', gap: '8px', background: 'var(--bg-tertiary)', borderTop: `1px solid ${accentColor}33` }}>
              <div style={{ fontSize: '11px', color: 'var(--text-tertiary)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em' }}>Total %</div>
              <div style={{ fontFamily: 'IBM Plex Mono, monospace', fontSize: '13px', color: errorSuma ? 'var(--accent-warning)' : accentColor, textAlign: 'right', fontWeight: 500 }}>{fmt(sumaRendimiento, 1)}%</div>
              <div />
              <div />
              <div />
              <div />
            </div>
          )}
        </div>

        {/* Panel Formulario */}
        <div style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border-subtle)', borderRadius: '8px', overflow: 'hidden' }}>
          <div style={{ padding: '12px 16px', borderBottom: '1px solid var(--border-subtle)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '11px', fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase', color: accentColor }}>
              {editingId ? 'Editar corte' : 'Agregar corte'}
            </span>
            {editingId && (
              <button onClick={resetForm} style={{ background: 'none', border: 'none', color: 'var(--text-tertiary)', fontSize: '11px', cursor: 'pointer', textDecoration: 'underline' }}>Cancelar edición</button>
            )}
          </div>
          <div style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
              <label style={{ fontSize: '10px', color: 'var(--text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Nombre canónico</label>
              <input
                value={formNombre}
                onChange={e => setFormNombre(e.target.value)}
                placeholder="Ej. Pierna"
                style={{ width: '100%', boxSizing: 'border-box', background: 'var(--bg-tertiary)', border: '1px solid var(--border-subtle)', borderRadius: '6px', color: 'var(--text-primary)', padding: '7px 10px', fontSize: '13px', outline: 'none', fontFamily: 'var(--font-sans)' }}
              />
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
              <label style={{ fontSize: '10px', color: 'var(--text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Rendimiento esperado (%)</label>
              <input
                value={formRendimiento}
                onChange={e => setFormRendimiento(e.target.value)}
                type="number" step="0.1" min="0" max="100"
                placeholder="0.0"
                style={{ width: '100%', boxSizing: 'border-box', background: 'var(--bg-tertiary)', border: '1px solid var(--border-subtle)', borderRadius: '6px', color: 'var(--text-primary)', padding: '7px 10px', fontSize: '13px', outline: 'none', fontFamily: 'IBM Plex Mono, monospace' }}
              />
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
              <label style={{ fontSize: '10px', color: 'var(--text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Tipo de corte</label>
              <select
                value={formTipo}
                onChange={e => setFormTipo(e.target.value)}
                style={{ width: '100%', boxSizing: 'border-box', background: 'var(--bg-tertiary)', border: '1px solid var(--border-subtle)', borderRadius: '6px', color: 'var(--text-primary)', padding: '7px 10px', fontSize: '13px', outline: 'none' }}
              >
                <option value="primario">Primario</option>
                <option value="subproducto">Subproducto</option>
                <option value="recorte">Recorte</option>
                <option value="descarte">Descarte</option>
              </select>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
              <label style={{ fontSize: '10px', color: 'var(--text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Prod. Sugerido (Insumo)</label>
              <input
                value={formProductoSugerido}
                onChange={e => setFormProductoSugerido(e.target.value)}
                placeholder="Ej. Jamón"
                style={{ width: '100%', boxSizing: 'border-box', background: 'var(--bg-tertiary)', border: '1px solid var(--border-subtle)', borderRadius: '6px', color: 'var(--text-primary)', padding: '7px 10px', fontSize: '13px', outline: 'none', fontFamily: 'var(--font-sans)' }}
              />
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
              <div style={{ display: 'flex', gap: '4px', alignItems: 'center' }}>
                <label style={{ fontSize: '10px', color: 'var(--text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Aliases ML (separados por coma)</label>
                <InfoTip text="Estos nombres son buscados por la IA al scrapear precios. Ej: pernil, pierna de cerdo" />
              </div>
              <input
                value={formAliases}
                onChange={e => setFormAliases(e.target.value)}
                placeholder="pierna, pernil"
                style={{ width: '100%', boxSizing: 'border-box', background: 'var(--bg-tertiary)', border: '1px solid var(--border-subtle)', borderRadius: '6px', color: 'var(--text-primary)', padding: '7px 10px', fontSize: '13px', outline: 'none', fontFamily: 'var(--font-sans)' }}
              />
            </div>

            <div style={{ marginTop: '4px' }}>
              <Btn
                onClick={handleSave}
                icon="save"
                accentColor={accentColor}
                disabled={!formNombre.trim() || isNaN(parseFloat(formRendimiento)) || saving}
              >
                {saving ? 'Guardando...' : (editingId ? 'Guardar cambios' : 'Agregar corte')}
              </Btn>
            </div>

          </div>
        </div>

      </div>
    </div>
  );
}
