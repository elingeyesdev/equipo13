import React, { useState, useRef, useEffect } from 'react';
import { Icon } from '../icons.jsx';
import { StatusBadge, Btn } from '../components/ui.jsx';

const PROVEEDORES_DATA = [
  { id: 'pv1', nombre: 'Coboce Lácteos S.R.L.',      contacto: 'Juan Pérez',      tel: '71234567', email: 'ventas@coboce.bo',        notas: 'Proveedor principal de leche. Entrega lunes y jueves.', insumos: ['Leche entera'], activo: true },
  { id: 'pv2', nombre: 'TecnoLácteos Bolivia',        contacto: 'María Flores',    tel: '76543210', email: 'info@tecnolacteos.bo',     notas: 'Insumos de laboratorio. Pedido mínimo Bs 500.', insumos: ['Cuajo enzimático', 'Cloruro de calcio', 'Fermento láctico'], activo: true },
  { id: 'pv3', nombre: 'Salinas de Uyuni Ltda.',      contacto: 'Carlos Mamani',   tel: '67891234', email: 'comercial@salinas.bo',     notas: '', insumos: ['Sal refinada'], activo: true },
  { id: 'pv4', nombre: 'Plastibol Envases',           contacto: 'Ana Quispe',      tel: '72345678', email: 'ana@plastibol.com.bo',     notas: 'Pedidos con 3 días de anticipación.', insumos: ['Empaque film', 'Caja cartón 500g'], activo: true },
  { id: 'pv5', nombre: 'Grafimundo Impresiones',      contacto: 'Luis Torrez',     tel: '71987654', email: 'cotizaciones@grafimundo.bo',notas: '', insumos: ['Etiquetas adhesivas'], activo: true },
  { id: 'pv6', nombre: 'Química Beni S.A.',           contacto: 'Roberto Vargas',  tel: '69123456', email: 'rvargas@quimicabeni.bo',   notas: 'Proveedor de químicos de limpieza y ácidos.', insumos: ['Detergente industrial', 'Ácido láctico'], activo: true },
  { id: 'pv7', nombre: 'YPFB Gas Domiciliario',       contacto: null,              tel: '800100200', email: null,                      notas: '', insumos: ['Gas GLP'], activo: true },
  { id: 'pv8', nombre: 'Distribuidora Castrol Bol.',  contacto: 'Pedro Gutiérrez', tel: '70456789', email: null,                      notas: 'Archivado — ya no usamos este proveedor.', insumos: ['Aceite lubricante'], activo: false },
];

const ProveedorDrawer = ({ proveedor, onClose, onSave, accentColor }) => {
  const [form, setForm] = useState(proveedor || { nombre: '', contacto: '', tel: '', email: '', notas: '', activo: true });
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));
  const ref = useRef(null);
  useEffect(() => {
    const h = e => { if (ref.current && !ref.current.contains(e.target)) onClose(); };
    setTimeout(() => document.addEventListener('mousedown', h), 0);
    return () => document.removeEventListener('mousedown', h);
  }, []);

  const iField = (label, key, placeholder = '') => (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
      <label style={{ fontSize: '11px', color: 'var(--text-tertiary)', fontWeight: 500, letterSpacing: '0.07em', textTransform: 'uppercase' }}>{label}</label>
      <input value={form[key] || ''} onChange={e => set(key, e.target.value)} placeholder={placeholder}
        style={{ background: 'var(--bg-tertiary)', border: '1px solid var(--border-subtle)', borderRadius: '6px', color: 'var(--text-primary)', padding: '8px 12px', fontSize: '13px', outline: 'none', fontFamily: 'var(--font-sans)' }}
        onFocus={e => e.target.style.borderColor = accentColor}
        onBlur={e => e.target.style.borderColor = 'var(--border-subtle)'}
      />
    </div>
  );

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', zIndex: 300, display: 'flex', justifyContent: 'flex-end' }}>
      <div ref={ref} style={{ width: '420px', background: 'var(--bg-secondary)', borderLeft: '1px solid var(--border-mid)', height: '100%', display: 'flex', flexDirection: 'column', animation: 'slideIn 0.2s ease' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '20px 24px', borderBottom: '1px solid var(--border-subtle)' }}>
          <span style={{ fontSize: '15px', fontWeight: 500, color: 'var(--text-primary)' }}>{proveedor ? 'Editar proveedor' : 'Nuevo proveedor'}</span>
          <button onClick={onClose} style={{ background: 'transparent', border: 'none', color: 'var(--text-tertiary)', cursor: 'pointer' }}><Icon name="x" size={16} /></button>
        </div>
        <div style={{ flex: 1, overflowY: 'auto', padding: '24px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {iField('Nombre de la empresa', 'nombre', 'Ej. Distribuidora Química S.R.L.')}
          {iField('Persona de contacto', 'contacto', 'Nombre del encargado de ventas')}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
            {iField('Teléfono', 'tel', '7XXXXXXX')}
            {iField('Email', 'email', 'ventas@empresa.bo')}
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            <label style={{ fontSize: '11px', color: 'var(--text-tertiary)', fontWeight: 500, letterSpacing: '0.07em', textTransform: 'uppercase' }}>Notas</label>
            <textarea value={form.notas || ''} onChange={e => set('notas', e.target.value)} rows={3} placeholder="Condiciones de pago, tiempos de entrega, etc." />
          </div>
          {proveedor && proveedor.insumos?.length > 0 && (
            <div>
              <div style={{ fontSize: '11px', color: 'var(--text-tertiary)', fontWeight: 500, letterSpacing: '0.07em', textTransform: 'uppercase', marginBottom: '10px' }}>Insumos asociados</div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                {proveedor.insumos.map((ins, i) => (
                  <span key={i} style={{ padding: '3px 10px', background: 'var(--bg-tertiary)', border: '1px solid var(--border-subtle)', borderRadius: '4px', fontSize: '12px', color: 'var(--text-secondary)' }}>{ins}</span>
                ))}
              </div>
            </div>
          )}
        </div>
        <div style={{ padding: '16px 24px', borderTop: '1px solid var(--border-subtle)', display: 'flex', gap: '8px' }}>
          <Btn variant="secondary" onClick={onClose}>Cancelar</Btn>
          <Btn accentColor={accentColor} icon="save" onClick={() => { onSave(form); onClose(); }}>Guardar proveedor</Btn>
        </div>
      </div>
      <style>{`@keyframes slideIn { from { transform: translateX(100%); } to { transform: translateX(0); } }`}</style>
    </div>
  );
};

const Proveedores = ({ negocioId }) => {
  const negocio = { id: negocioId, nombre: 'Mi negocio', rubro: 'industrial' };
  const accentColor = negocio.rubro === 'agro_ganadero' ? 'var(--accent-agro)' : 'var(--accent-industrial)';
  const [proveedores, setProveedores] = useState(PROVEEDORES_DATA);
  const [mostrarArchivados, setMostrarArchivados] = useState(false);
  const [drawer, setDrawer] = useState(null);

  const handleSave = form => {
    if (form.id) setProveedores(p => p.map(x => x.id === form.id ? { ...x, ...form } : x));
    else setProveedores(p => [...p, { ...form, id: `pv${Date.now()}`, insumos: [] }]);
  };

  const activos    = proveedores.filter(p => p.activo);
  const archivados = proveedores.filter(p => !p.activo);
  const visibles   = mostrarArchivados ? proveedores : activos;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '4px' }}>
          <h1 style={{ fontSize: '22px', fontWeight: 400, color: 'var(--text-primary)', letterSpacing: '-0.02em' }}>Proveedores</h1>
          <span style={{ background: accentColor + '1A', color: accentColor, border: `1px solid ${accentColor}33`, borderRadius: '5px', padding: '2px 10px', fontSize: '12px', fontFamily: 'var(--font-mono)' }}>{activos.length} activos</span>
        </div>
        <Btn icon="plus" accentColor={accentColor} onClick={() => setDrawer('new')}>Nuevo proveedor</Btn>
      </div>

      <div style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border-subtle)', borderRadius: '8px', overflow: 'hidden' }}>
        <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 100px 80px 80px', padding: '8px 20px', borderBottom: '1px solid var(--border-subtle)', gap: '12px' }}>
          {['Proveedor', 'Contacto', 'Insumos', 'Estado', ''].map((h, i) => (
            <div key={i} style={{ fontSize: '11px', color: 'var(--text-tertiary)', fontWeight: 500, letterSpacing: '0.05em' }}>{h}</div>
          ))}
        </div>
        {visibles.map((pv, i) => (
          <div key={pv.id}
            style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 100px 80px 80px', padding: '13px 20px', borderBottom: i < visibles.length - 1 ? '1px solid var(--border-subtle)' : 'none', gap: '12px', alignItems: 'center', transition: 'background 0.1s', opacity: pv.activo ? 1 : 0.5 }}
            onMouseEnter={e => e.currentTarget.style.background = 'var(--bg-tertiary)'}
            onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
          >
            <div>
              <div style={{ fontSize: '13px', color: 'var(--text-primary)', fontWeight: 500, marginBottom: '2px' }}>{pv.nombre}</div>
              {pv.email && <div style={{ fontSize: '11px', color: 'var(--text-tertiary)' }}>{pv.email}</div>}
            </div>
            <div>
              {pv.contacto && <div style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>{pv.contacto}</div>}
              {pv.tel && <div style={{ fontSize: '11px', color: 'var(--text-tertiary)', display: 'flex', alignItems: 'center', gap: '4px', marginTop: '2px' }}>
                <Icon name="phone" size={11} /> {pv.tel}
              </div>}
            </div>
            <div>
              <span style={{ fontFamily: 'var(--font-mono)', fontSize: '13px', color: pv.insumos.length > 0 ? accentColor : 'var(--text-tertiary)' }} title={pv.insumos.join(', ')}>
                {pv.insumos.length} insumo{pv.insumos.length !== 1 ? 's' : ''}
              </span>
            </div>
            <div><StatusBadge label={pv.activo ? 'Activo' : 'Archivado'} color={pv.activo ? 'var(--accent-success)' : 'var(--text-tertiary)'} /></div>
            <div style={{ display: 'flex', gap: '6px' }}>
              <button onClick={() => setDrawer(pv)} style={{ background: 'transparent', border: 'none', color: 'var(--text-tertiary)', cursor: 'pointer', padding: '4px' }}
                onMouseEnter={e => e.currentTarget.style.color = 'var(--text-primary)'}
                onMouseLeave={e => e.currentTarget.style.color = 'var(--text-tertiary)'}
              ><Icon name="edit" size={14} /></button>
              {pv.activo ? (
                <button onClick={() => setProveedores(p => p.map(x => x.id === pv.id ? { ...x, activo: false } : x))}
                  style={{ background: 'transparent', border: 'none', color: 'var(--text-tertiary)', cursor: 'pointer', padding: '4px' }}
                  onMouseEnter={e => e.currentTarget.style.color = 'var(--accent-warning)'}
                  onMouseLeave={e => e.currentTarget.style.color = 'var(--text-tertiary)'}
                ><Icon name="archive" size={14} /></button>
              ) : (
                <button onClick={() => setProveedores(p => p.map(x => x.id === pv.id ? { ...x, activo: true } : x))}
                  style={{ background: 'transparent', border: 'none', color: 'var(--accent-success)', cursor: 'pointer', padding: '4px' }}
                ><Icon name="refresh" size={14} /></button>
              )}
            </div>
          </div>
        ))}

        {archivados.length > 0 && (
          <button onClick={() => setMostrarArchivados(v => !v)}
            style={{ width: '100%', padding: '10px 20px', background: 'transparent', border: 'none', borderTop: '1px solid var(--border-subtle)', color: 'var(--text-tertiary)', cursor: 'pointer', fontSize: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}
            onMouseEnter={e => e.currentTarget.style.color = 'var(--text-secondary)'}
            onMouseLeave={e => e.currentTarget.style.color = 'var(--text-tertiary)'}
          >
            <Icon name={mostrarArchivados ? 'chevronUp' : 'chevronDown'} size={13} />
            {mostrarArchivados ? `Ocultar ${archivados.length} archivado${archivados.length > 1 ? 's' : ''}` : `Mostrar ${archivados.length} archivado${archivados.length > 1 ? 's' : ''}`}
          </button>
        )}
      </div>
      {drawer && <ProveedorDrawer proveedor={drawer === 'new' ? null : drawer} onClose={() => setDrawer(null)} onSave={handleSave} accentColor={accentColor} />}
    </div>
  );
};

export default Proveedores;
