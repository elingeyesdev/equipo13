import React, { useState, useEffect, useRef } from 'react';
import { RubroBadge, MoneyDisplay, Btn, CostTable, InfoTip, InfoBanner } from '../components/ui.jsx';
import { Icon } from '../icons.jsx';
import { apiFetch } from '../config/api.js';

const MPD_COLS = [
  { key: 'nombre',     label: 'Insumo',    mono: false },
  { key: 'cantidad',   label: 'Cant.',     mono: true,  decimals: 3 },
  { key: 'unidad',     label: 'Unidad',    mono: false },
  { key: 'precio_unit',label: 'Precio/u',  mono: true,  prefix: 'Bs ', sumable: false },
  { key: 'costo_unit', label: '/unidad',   mono: true,  prefix: 'Bs ', sumable: true  },
  { key: 'total_lote', label: '/lote',     mono: true,  prefix: 'Bs ', sumable: true  },
];
const MOD_COLS = [
  { key: 'nombre',     label: 'Etapa',     mono: false },
  { key: 'cantidad',   label: 'Tiempo',    mono: false },
  { key: 'precio_unit',label: 'Costo/h',   mono: true,  prefix: 'Bs ', sumable: false },
  { key: 'costo_unit', label: '/unidad',   mono: true,  prefix: 'Bs ', sumable: true  },
  { key: 'total_lote', label: '/lote',     mono: true,  prefix: 'Bs ', sumable: true  },
];

const NumControl = ({ label, labelExtra, rawValue, onRawChange, min = 0, max = 10000, step = 1, prefix, suffix, showSlider = true, accentColor }) => {
  const num = parseFloat(rawValue) || 0;
  const sliderVal = Math.min(max, Math.max(min, num));
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', flex: 1, minWidth: 0 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
        <label style={{ fontSize: '11px', color: 'var(--text-tertiary)', fontWeight: 500, letterSpacing: '0.07em', textTransform: 'uppercase' }}>{label}</label>
        {labelExtra}
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
        <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
          {prefix && <span style={{ position: 'absolute', left: '8px', fontSize: '12px', color: 'var(--text-tertiary)', fontFamily: 'var(--font-mono)', pointerEvents: 'none' }}>{prefix}</span>}
          <input
            type="number" value={rawValue} min={min} max={max} step={step}
            onChange={e => onRawChange(e.target.value)}
            style={{
              width: prefix ? '90px' : '80px', background: 'var(--bg-tertiary)',
              border: '1px solid var(--border-subtle)', borderRadius: '6px',
              color: 'var(--text-primary)', padding: prefix ? '6px 8px 6px 28px' : `6px ${suffix ? '28px' : '8px'} 6px 8px`,
              fontSize: '13px', fontFamily: 'var(--font-mono)', outline: 'none',
            }}
            onFocus={e => e.target.style.borderColor = accentColor}
            onBlur={e => e.target.style.borderColor = 'var(--border-subtle)'}
          />
          {suffix && <span style={{ position: 'absolute', right: '8px', fontSize: '12px', color: 'var(--text-tertiary)', fontFamily: 'var(--font-mono)', pointerEvents: 'none' }}>{suffix}</span>}
        </div>
        {showSlider && (
          <input type="range" min={min} max={max} step={step} value={sliderVal}
            onChange={e => onRawChange(e.target.value)}
            style={{ flex: 1, accentColor }}
          />
        )}
      </div>
    </div>
  );
};

const FichaCosto = ({ negocio, productoId, onNavigate }) => {
  const negocioId = negocio?.id;
  const isAgro = negocio?.rubro === 'agro_ganadero';
  const accentColor = isAgro ? 'var(--accent-agro)' : 'var(--accent-industrial)';

  const [productos, setProductos] = useState([]);
  const [selectedProductoId, setSelectedProductoId] = useState(productoId || '');
  const [loteRaw, setLoteRaw] = useState('100');
  const lote = parseFloat(loteRaw) || 0;
  const [loading, setLoading] = useState(false);
  const [calculating, setCalculating] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState('');
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (!negocioId) return;
    apiFetch(`/api/negocios/${negocioId}/productos`).then(setProductos).catch(() => {});
  }, [negocioId]);

  useEffect(() => {
    if (productoId) setSelectedProductoId(productoId);
  }, [productoId]);

  const handleCalc = async () => {
    if (!selectedProductoId) { setError('Selecciona un producto'); return; }
    setCalculating(true); setError(''); setResult(null); setSaved(false);
    try {
      const data = await apiFetch(`/api/negocios/${negocioId}/fichas/calcular`, {
        method: 'POST',
        body: JSON.stringify({ producto_id: selectedProductoId, lote_cantidad: lote }),
      });
      setResult(data);
      setSaved(true);
    } catch (e) {
      setError(e?.error || 'Error al calcular');
    } finally { setCalculating(false); }
  };

  const producto = productos.find(p => p.id === selectedProductoId);

  const mpdRows = result ? result.mpd.detalle.map(d => ({
    nombre: d.insumo, cantidad: d.cantidad, unidad: d.unidad || '',
    precio_unit: d.precio, costo_unit: d.subtotal, total_lote: d.subtotal * result.lote_cantidad,
  })) : [];

  const modRows = result ? result.mod.detalle.map(d => ({
    nombre: d.etapa, cantidad: `${d.minutos} min`, precio_unit: d.costo_hora,
    costo_unit: d.subtotal, total_lote: d.subtotal * result.lote_cantidad,
  })) : [];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      <InfoBanner
        storageKey="banner_fichacosto_v1"
        title="Ficha de Costo"
        text="La ficha de costo calcula el costo unitario de producir 1 unidad del producto. Los cortes del lote aparecen con su precio real derivado del costeo del lote."
        accentColor={accentColor}
      />
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <h1 style={{ fontSize: '22px', fontWeight: 400, color: 'var(--text-primary)', letterSpacing: '-0.02em', marginBottom: '5px' }}>
            Ficha de Costo
          </h1>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '13px', color: 'var(--text-tertiary)' }}>
            <RubroBadge rubro={negocio?.rubro || 'industrial'} />
            {producto && <span>{producto.nombre}</span>}
            {result && <><span>·</span><span>Lote de {result.lote_cantidad} unidades</span></>}
          </div>
        </div>
        <div style={{ display: 'flex', gap: '8px' }}>
          {saved && <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: 'var(--accent-success)', fontSize: '12px' }}><Icon name="check" size={14} /> Ficha guardada</div>}
        </div>
      </div>

      {/* Product selector + lot size + calculate button */}
      <div style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border-subtle)', borderRadius: '8px', padding: '16px 20px', display: 'flex', gap: '24px', alignItems: 'flex-end' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', flex: 2, minWidth: 0 }}>
          <label style={{ fontSize: '11px', color: 'var(--text-tertiary)', fontWeight: 500, letterSpacing: '0.07em', textTransform: 'uppercase' }}>Producto</label>
          <select value={selectedProductoId} onChange={e => setSelectedProductoId(e.target.value)}
            style={{ background: 'var(--bg-tertiary)', border: '1px solid var(--border-subtle)', borderRadius: '6px', color: 'var(--text-primary)', padding: '8px 12px', fontSize: '13px', outline: 'none' }}>
            <option value="">— Seleccionar producto —</option>
            {productos.map(p => <option key={p.id} value={p.id}>{p.nombre} {p.codigo_sku ? `(${p.codigo_sku})` : ''}</option>)}
          </select>
        </div>
        <NumControl
          label="Tamaño del lote"
          labelExtra={<InfoTip text="Cantidad de unidades a producir en una corrida. Los costos fijos (MOD) se dividen entre este número para obtener el costo unitario." />}
          rawValue={loteRaw} onRawChange={setLoteRaw} min={1} max={10000} suffix="uds" accentColor={accentColor}
        />
        <Btn icon="calculator" accentColor={accentColor} onClick={handleCalc} disabled={calculating || !selectedProductoId}>
          {calculating ? 'Calculando...' : 'Calcular'}
        </Btn>
      </div>

      {error && <div style={{ color: 'var(--accent-danger)', fontSize: '13px', padding: '8px 12px', background: 'var(--accent-danger)10', borderRadius: '6px', border: '1px solid var(--accent-danger)22' }}>{error}</div>}

      {result && <>
        {/* Summary cards */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '12px' }}>
          {[
            { label: 'MPD unitario',       value: result.mpd.unitario, sub: 'Materia Prima Directa', color: 'default' },
            { label: 'MOD unitario',       value: result.mod.unitario, sub: 'Mano de Obra Directa',  color: 'default' },
            { label: 'Costo unitario total',value: result.costo_unitario_total, sub: 'MPD + MOD',     color: 'default' },
            { label: 'Costo total del lote',value: result.costo_lote_total, sub: `${result.lote_cantidad} unidades`, color: 'green' },
          ].map((c, i) => (
            <div key={i} style={{ background: 'var(--bg-secondary)', border: `1px solid ${i === 3 ? 'var(--accent-success)22' : 'var(--border-subtle)'}`, borderRadius: '8px', padding: '18px 20px' }}>
              <div style={{ fontSize: '11px', color: 'var(--text-tertiary)', letterSpacing: '0.07em', textTransform: 'uppercase', fontWeight: 500, marginBottom: '10px' }}>{c.label}</div>
              <MoneyDisplay value={c.value} size="xl" color={c.color} />
              <div style={{ fontSize: '12px', color: 'var(--text-tertiary)', marginTop: '8px' }}>{c.sub}</div>
            </div>
          ))}
        </div>

        {/* MPD Table */}
        <CostTable
          title="MPD — Materia Prima Directa"
          titleExtra={<InfoTip text="Materiales Primos Directos: todo lo que entra físicamente al producto (carnes, condimentos, empaque)." />}
          rows={mpdRows} columns={MPD_COLS} accentColor={accentColor} type="variable" loteSize={lote}
        />

        {/* MOD Table */}
        <CostTable
          title="MOD — Mano de Obra Directa"
          titleExtra={<InfoTip text="Mano de Obra Directa: tiempo productivo por etapa × costo por hora." />}
          rows={modRows} columns={MOD_COLS} accentColor={accentColor} type="variable" loteSize={lote}
        />

      </>}

      {!result && !calculating && (
        <div style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border-subtle)', borderRadius: '10px', padding: '48px 40px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '16px', textAlign: 'center' }}>
          <div style={{ color: 'var(--text-tertiary)' }}><Icon name="calculator" size={40} strokeWidth={1} /></div>
          <div style={{ fontSize: '16px', fontWeight: 500, color: 'var(--text-primary)' }}>Selecciona un producto y haz clic en Calcular</div>
          <div style={{ fontSize: '14px', color: 'var(--text-secondary)', lineHeight: 1.7, maxWidth: '380px' }}>
            El motor calculará automáticamente el costo MPD (materias primas) y MOD (mano de obra) con base en la receta y etapas definidas.
          </div>
        </div>
      )}

      <p style={{ margin: 0, padding: '12px 0 4px', fontSize: '12px', color: 'var(--text-tertiary)', textAlign: 'center', lineHeight: 1.5 }}>
        CIF, Punto de Equilibrio y WIP llegan en el próximo sprint.
      </p>
    </div>
  );
};

export default FichaCosto;

