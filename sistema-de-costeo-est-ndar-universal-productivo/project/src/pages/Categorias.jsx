// CosteoUniversal — Categorías de Insumos
const { useState } = React;

const PALETA = ['#3B82F6','#22C55E','#F59E0B','#EF4444','#8B5CF6','#EC4899','#14B8A6','#F97316'];

const CATS_INIT = [
  { id: 'c1', nombre: 'Materia prima principal',      color: '#3B82F6', insumos: 34 },
  { id: 'c2', nombre: 'Insumos químicos y cultivos',   color: '#F59E0B', insumos: 8  },
  { id: 'c3', nombre: 'Empaque y presentación',        color: '#22C55E', insumos: 6  },
  { id: 'c4', nombre: 'Limpieza y saneamiento',        color: '#8B5CF6', insumos: 4  },
  { id: 'c5', nombre: 'Energía y combustibles',        color: '#EC4899', insumos: 2  },
  { id: 'c6', nombre: 'Mantenimiento y lubricantes',   color: '#94A3B8', insumos: 2  },
];

const CatForm = ({ init, onSave, onCancel, accentColor }) => {
  const [form, setForm] = useState(init || { nombre: '', color: PALETA[0] });
  return (
    <div style={{ padding: '14px 20px', background: 'var(--bg-tertiary)', borderTop: '1px solid var(--border-subtle)', display: 'flex', alignItems: 'flex-end', gap: '14px', flexWrap: 'wrap' }}>
      <div style={{ flex: 1, minWidth: '200px', display: 'flex', flexDirection: 'column', gap: '5px' }}>
        <label style={{ fontSize: '10px', color: 'var(--text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Nombre de la categoría</label>
        <input value={form.nombre} onChange={e => setForm(f => ({ ...f, nombre: e.target.value }))} placeholder="Ej. Aditivos y conservantes"
          style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border-subtle)', borderRadius: '5px', color: 'var(--text-primary)', padding: '7px 11px', fontSize: '13px', outline: 'none', fontFamily: 'IBM Plex Sans, sans-serif' }}
          onFocus={e => e.target.style.borderColor = accentColor} onBlur={e => e.target.style.borderColor = 'var(--border-subtle)'}
        />
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
        <label style={{ fontSize: '10px', color: 'var(--text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Color</label>
        <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
          {PALETA.map(c => (
            <button key={c} onClick={() => setForm(f => ({ ...f, color: c }))} style={{
              width: 22, height: 22, borderRadius: '50%', background: c, border: `2px solid ${form.color === c ? 'var(--text-primary)' : 'transparent'}`,
              cursor: 'pointer', outline: 'none', padding: 0, transition: 'border-color 0.15s',
            }} />
          ))}
        </div>
      </div>
      <div style={{ display: 'flex', gap: '6px' }}>
        <Btn variant="secondary" size="sm" onClick={onCancel}>Cancelar</Btn>
        <Btn size="sm" accentColor={accentColor} onClick={() => form.nombre.trim() && onSave(form)}>
          {init?.id ? 'Actualizar' : 'Agregar'}
        </Btn>
      </div>
    </div>
  );
};

const Categorias = ({ negocioId }) => {
  const negocio = NEGOCIOS.find(n => n.id === negocioId) || NEGOCIOS[0];
  const accentColor = negocio.rubro === 'agro_ganadero' ? 'var(--accent-agro)' : 'var(--accent-industrial)';
  const [cats, setCats] = useState(CATS_INIT);
  const [form, setForm] = useState(null); // null | 'new' | cat obj

  const handleSave = data => {
    if (data.id) setCats(p => p.map(x => x.id === data.id ? { ...x, ...data } : x));
    else setCats(p => [...p, { ...data, id: `c${Date.now()}`, insumos: 0 }]);
    setForm(null);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      <h1 style={{ fontSize: '22px', fontWeight: 400, color: 'var(--text-primary)', letterSpacing: '-0.02em' }}>Categorías de Insumos</h1>

      <div style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border-subtle)', borderRadius: '8px', overflow: 'hidden' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '14px 20px', borderBottom: '1px solid var(--border-subtle)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <span style={{ fontSize: '11px', fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase', color: accentColor }}>Categorías de insumos</span>
            <span style={{ fontFamily: 'IBM Plex Mono, monospace', fontSize: '11px', color: 'var(--text-tertiary)' }}>{cats.length}</span>
          </div>
          <Btn variant="ghost" size="sm" icon="plus" accentColor={accentColor} onClick={() => setForm('new')}>Nueva categoría</Btn>
        </div>

        {cats.map((cat, i) => (
          <div key={cat.id} style={{ display: 'grid', gridTemplateColumns: '24px 1fr 100px 80px', padding: '13px 20px', borderBottom: i < cats.length - 1 || form ? '1px solid var(--border-subtle)' : 'none', gap: '12px', alignItems: 'center', transition: 'background 0.1s' }}
            onMouseEnter={e => e.currentTarget.style.background = 'var(--bg-tertiary)'}
            onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
          >
            <div style={{ width: 12, height: 12, borderRadius: '50%', background: cat.color, flexShrink: 0 }} />
            <span style={{ fontSize: '13px', color: 'var(--text-primary)', fontWeight: 500 }}>{cat.nombre}</span>
            <span style={{ fontSize: '12px', color: 'var(--text-tertiary)', fontFamily: 'IBM Plex Mono, monospace' }}>
              {cat.insumos} insumo{cat.insumos !== 1 ? 's' : ''}
            </span>
            <div style={{ display: 'flex', gap: '4px' }}>
              <button onClick={() => setForm(cat)} style={{ background: 'transparent', border: 'none', color: 'var(--text-tertiary)', cursor: 'pointer', padding: '4px' }}
                onMouseEnter={e => e.currentTarget.style.color = 'var(--text-primary)'} onMouseLeave={e => e.currentTarget.style.color = 'var(--text-tertiary)'}
              ><Icon name="edit" size={14} /></button>
              <button onClick={() => setCats(p => p.filter(x => x.id !== cat.id))} style={{ background: 'transparent', border: 'none', color: 'var(--text-tertiary)', cursor: 'pointer', padding: '4px' }}
                onMouseEnter={e => e.currentTarget.style.color = 'var(--accent-danger)'} onMouseLeave={e => e.currentTarget.style.color = 'var(--text-tertiary)'}
              ><Icon name="trash" size={14} /></button>
            </div>
          </div>
        ))}

        {form && (
          <CatForm
            init={form === 'new' ? null : form}
            onSave={handleSave}
            onCancel={() => setForm(null)}
            accentColor={accentColor}
          />
        )}
      </div>

      {/* Preview */}
      <div style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border-subtle)', borderRadius: '8px', padding: '16px 20px' }}>
        <div style={{ fontSize: '11px', color: 'var(--text-tertiary)', fontWeight: 500, letterSpacing: '0.07em', textTransform: 'uppercase', marginBottom: '12px' }}>Vista previa de chips</div>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
          {cats.map(cat => (
            <span key={cat.id} style={{ padding: '4px 12px', borderRadius: '5px', fontSize: '12px', fontWeight: 500, color: cat.color, background: cat.color + '18', border: `1px solid ${cat.color}33` }}>
              {cat.nombre}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
};

Object.assign(window, { Categorias });
