# PROMPT CLAUDE DESIGN — Correcciones quirúrgicas CosteoUniversal

Tenés el proyecto CosteoUniversal con los archivos que ya conocés. Hay 5 correcciones específicas. Cada una indica exactamente qué archivo modificar y qué hacer. No tocar nada que no se mencione.

---

## CORRECCIÓN 1 — Menú desplegable "Admin" funcional
**Archivo: `src/layouts/AppLayout.jsx`**

Reemplazá el bloque del avatar/Admin (el `<div>` que tiene el avatar circular + "Admin" + chevronDown) por este componente con estado. Envolvé todo en un `<div ref={adminRef} style={{ position: 'relative' }}>`.

Agregar al tope del componente `AppLayout`:
```js
const [adminOpen, setAdminOpen] = useState(false);
const adminRef = React.useRef(null);
React.useEffect(() => {
  const h = e => { if (adminRef.current && !adminRef.current.contains(e.target)) setAdminOpen(false); };
  document.addEventListener('mousedown', h);
  return () => document.removeEventListener('mousedown', h);
}, []);
```

El botón trigger queda igual visualmente pero con `onClick={() => setAdminOpen(o => !o)}`.

El dropdown: `position: absolute`, `top: 44px`, `right: 0`, `width: 220px`, `background: var(--bg-secondary)`, `border: 1px solid var(--border-mid)`, `borderRadius: 8px`, `boxShadow: var(--shadow-md)`, `zIndex: 200`, `overflow: hidden`. Solo renderiza si `adminOpen`.

**Contenido del dropdown de arriba hacia abajo:**

**A) Header no clickeable** (padding 12px 16px, borderBottom 1px solid var(--border-subtle)):
- Avatar circular 36px con letra "A" centrada, background `rubroColor + '33'`
- Nombre "Admin" en 13px fontWeight 500
- Email "admin@costeo.bo" en 11px color text-tertiary

**B) Ítem "Mi cuenta"** — icon `user`, label "Mi cuenta" — onClick: `onNavigate('config'); setAdminOpen(false)`

**C) Ítem "Apariencia / Tema"** — icon dinámico `sun` si tema dark, `moon` si tema light — label "Modo oscuro" o "Modo claro" según el estado actual — onClick: `toggleTheme()` sin cerrar (para ver el cambio en vivo). Subtexto 11px: "Cambiar apariencia".

**D) Separador** — div 1px height, background `var(--border-subtle)`, margin 4px 0.

**E) Label de sección** — "MIS NEGOCIOS" en 10px uppercase, color text-tertiary, padding 6px 16px 4px.

**F) Lista de negocios** — mapear `NEGOCIOS`. Cada ítem: padding 8px 16px, display flex, alignItems center, gap 10px. Un dot 8px circular del color del rubro (azul si industrial, verde si agro). Nombre del negocio en 13px. Si es el negocio activo (`n.id === negocioId`): fontWeight 500, color text-primary, y checkmark icon `check` size 12 al final. Si no es activo: color text-secondary. onClick: `onNegocioChange(n.id); setAdminOpen(false)`.

**G) Ítem "+ Nuevo negocio"** — icon `plus`, color `accentColor`, label "+ Nuevo negocio" en 13px color `accentColor` — onClick: `onNavigate('config'); setAdminOpen(false)`. Subtexto 11px color text-tertiary: "Crear negocio adicional".

**H) Separador.**

**I) Ítem "Cerrar sesión"** — icon `logOut`, label "Cerrar sesión", color `var(--accent-danger)` — onClick: `alert('Sesión cerrada (mockup)')`.

Todos los ítems clickeables tienen hover: `background: var(--bg-tertiary)`.

---

## CORRECCIÓN 2 — "Fichas de costo" → "Historial fichas" en sidebar
**Archivo: `src/layouts/AppLayout.jsx`**

En el array `NAV_INDUSTRIAL`, cambiar exactamente este ítem:
```js
{ id: 'fichas', label: 'Fichas de costo', icon: 'calculator' }
```
por:
```js
{ id: 'historial', label: 'Historial fichas', icon: 'history' }
```

Solo eso. Nada más cambia en el sidebar ni en App.jsx.

---

## CORRECCIÓN 3 — Datos distintos por negocio
**Archivos: `ui.jsx` (o al tope de `App.jsx`) + `Dashboard.jsx` + `Productos.jsx` + `Insumos.jsx` + `Historial.jsx`**

### Paso A: Agregar datos globales

En `ui.jsx`, al final del archivo antes del `Object.assign`, agregar:

```js
const MOCK_BY_NEGOCIO = {
  n1: {
    productos: [
      { id:'p1', nombre:'Queso fresco 500g',   sku:'QF-001', costoUnit:38.70, pvp:50.31, margen:30, fichaReciente:true,  activo:true  },
      { id:'p2', nombre:'Yogur natural 250ml',  sku:'YN-002', costoUnit:12.40, pvp:16.12, margen:30, fichaReciente:true,  activo:true  },
      { id:'p3', nombre:'Mantequilla 200g',     sku:'MT-003', costoUnit:18.90, pvp:24.57, margen:30, fichaReciente:false, activo:true  },
      { id:'p4', nombre:'Requesón 300g',        sku:'RQ-004', costoUnit:14.20, pvp:18.46, margen:30, fichaReciente:false, activo:true  },
      { id:'p5', nombre:'Queso maduro 1kg',     sku:'QM-005', costoUnit:92.30, pvp:120.0, margen:30, fichaReciente:false, activo:false },
    ],
    insumos: [
      { id:'i1', nombre:'Leche entera fresca',     sku:'INS-001', categoria:'Materia prima',    catColor:'#3B82F6', unidad:'L',  precio:4.80,  proveedor:'Coboce Lácteos',   variable:true,  activo:true  },
      { id:'i2', nombre:'Cuajo enzimático',         sku:'INS-002', categoria:'Insumos químicos', catColor:'#F59E0B', unidad:'kg', precio:420,   proveedor:'TecnoLácteos',     variable:true,  activo:true  },
      { id:'i3', nombre:'Sal refinada',             sku:'INS-003', categoria:'Materia prima',    catColor:'#3B82F6', unidad:'kg', precio:8.50,  proveedor:'Salinas de Uyuni', variable:true,  activo:true  },
      { id:'i4', nombre:'Cloruro de calcio',        sku:'INS-004', categoria:'Insumos químicos', catColor:'#F59E0B', unidad:'kg', precio:95,    proveedor:'TecnoLácteos',     variable:true,  activo:true  },
      { id:'i5', nombre:'Fermento láctico',         sku:'INS-005', categoria:'Insumos químicos', catColor:'#F59E0B', unidad:'kg', precio:650,   proveedor:'TecnoLácteos',     variable:true,  activo:true  },
      { id:'i6', nombre:'Envase plástico 500g',     sku:'INS-006', categoria:'Empaque',          catColor:'#22C55E', unidad:'u',  precio:1.20,  proveedor:'Plastibol Envases', variable:true, activo:true  },
      { id:'i7', nombre:'Etiqueta autoadhesiva',    sku:'INS-007', categoria:'Empaque',          catColor:'#22C55E', unidad:'u',  precio:0.35,  proveedor:'Grafimundo',        variable:true, activo:true  },
      { id:'i8', nombre:'Detergente industrial',    sku:'INS-008', categoria:'Limpieza',         catColor:'#8B5CF6', unidad:'kg', precio:28,    proveedor:'Química Beni',      variable:false,activo:false },
    ],
    proveedores: ['Coboce Lácteos S.R.L.','TecnoLácteos Bolivia','Salinas de Uyuni Ltda.','Plastibol Envases','Grafimundo Impresiones','Química Beni S.A.','YPFB Gas Domiciliario'],
    fichas: [
      { id:'f1', fecha:'28 Abr 2025, 10:32', producto:'Queso fresco 500g',   lote:100, costoUnit:38.70, pvp:50.31, margen:30, mpd:2734, mod:875, cif:851 },
      { id:'f2', fecha:'27 Abr 2025, 15:18', producto:'Yogur natural 250ml',  lote:200, costoUnit:12.40, pvp:16.12, margen:30, mpd:1680, mod:480, cif:320 },
      { id:'f3', fecha:'25 Abr 2025, 09:44', producto:'Mantequilla 200g',     lote:150, costoUnit:18.90, pvp:24.57, margen:30, mpd:2100, mod:540, cif:195 },
      { id:'f4', fecha:'22 Abr 2025, 14:05', producto:'Queso fresco 500g',    lote:80,  costoUnit:39.10, pvp:50.83, margen:30, mpd:2210, mod:700, cif:218 },
    ],
    dashMetrics: { productos:4, insumos:7, ultimaFicha:'hace 2h', pe:197 },
  },

  n3: {
    productos: [
      { id:'p1', nombre:'Chompa de alpaca M',    sku:'CH-001', costoUnit:142.0, pvp:210.0, margen:48, fichaReciente:true,  activo:true  },
      { id:'p2', nombre:'Chalina tejida 180cm',  sku:'CL-002', costoUnit:58.50, pvp:85.0,  margen:45, fichaReciente:true,  activo:true  },
      { id:'p3', nombre:'Guantes lana fina',     sku:'GV-003', costoUnit:22.30, pvp:35.0,  margen:57, fichaReciente:false, activo:true  },
      { id:'p4', nombre:'Poncho ceremonial',     sku:'PC-004', costoUnit:380.0, pvp:580.0, margen:53, fichaReciente:false, activo:false },
    ],
    insumos: [
      { id:'i1', nombre:'Fibra de alpaca cruda',    sku:'TX-001', categoria:'Materia prima',    catColor:'#3B82F6', unidad:'kg', precio:95.0,  proveedor:'Alpacas del Sur',    variable:true,  activo:true  },
      { id:'i2', nombre:'Hilo de lana merino',      sku:'TX-002', categoria:'Materia prima',    catColor:'#3B82F6', unidad:'kg', precio:68.0,  proveedor:'Hilados Oruro',      variable:true,  activo:true  },
      { id:'i3', nombre:'Tinte natural cochinilla', sku:'TX-003', categoria:'Insumos químicos', catColor:'#F59E0B', unidad:'kg', precio:220.0, proveedor:'Colorantes Bolivia', variable:true,  activo:true  },
      { id:'i4', nombre:'Tinte sintético azul',     sku:'TX-004', categoria:'Insumos químicos', catColor:'#F59E0B', unidad:'kg', precio:85.0,  proveedor:'Colorantes Bolivia', variable:true,  activo:true  },
      { id:'i5', nombre:'Etiqueta tejida marca',    sku:'TX-005', categoria:'Empaque',          catColor:'#22C55E', unidad:'u',  precio:1.80,  proveedor:'Grafimundo',         variable:true,  activo:true  },
      { id:'i6', nombre:'Bolsa kraft con logo',     sku:'TX-006', categoria:'Empaque',          catColor:'#22C55E', unidad:'u',  precio:3.50,  proveedor:'Grafimundo',         variable:true,  activo:true  },
      { id:'i7', nombre:'Aceite de cardado',        sku:'TX-007', categoria:'Mantenimiento',    catColor:'#EC4899', unidad:'L',  precio:45.0,  proveedor:'Lubricantes Beni',   variable:false, activo:false },
    ],
    proveedores: ['Alpacas del Sur S.R.L.','Hilados Oruro Ltda.','Colorantes Bolivia S.A.','Grafimundo Impresiones','Lubricantes Beni'],
    fichas: [
      { id:'f1', fecha:'26 Abr 2025, 09:15', producto:'Chompa de alpaca M',   lote:20, costoUnit:142.0, pvp:210.0, margen:48, mpd:1840, mod:960, cif:540 },
      { id:'f2', fecha:'24 Abr 2025, 14:30', producto:'Chalina tejida 180cm', lote:50, costoUnit:58.50, pvp:85.0,  margen:45, mpd:1950, mod:720, cif:255 },
    ],
    dashMetrics: { productos:3, insumos:6, ultimaFicha:'hace 1 día', pe:84 },
  },

  n2: {
    productos: [],
    insumos: [],
    proveedores: [],
    fichas: [],
    dashMetrics: { lotes:3, animales:89, costoTotal:24460, mejorIca:2.8 },
  },
};
window.MOCK_BY_NEGOCIO = MOCK_BY_NEGOCIO;
```

Agregar también `MOCK_BY_NEGOCIO` al `Object.assign(window, { ..., MOCK_BY_NEGOCIO })`.

### Paso B: Consumir en cada componente

**`Dashboard.jsx`**: Reemplazar los valores hardcodeados de métricas y lista de últimas fichas por `MOCK_BY_NEGOCIO[negocioId]`. Para n2 (agro), las 4 cards muestran: Lotes activos, Animales en engorde, Costo total acumulado (en Bs mono), Mejor ICa. Para n1 y n3 (industrial), las cards muestran: Productos, Insumos, Última ficha calculada, Punto de equilibrio.

**`Productos.jsx`**: Cambiar el `useState` inicial:
```js
const [productos, setProductos] = useState(() => MOCK_BY_NEGOCIO[negocioId]?.productos || []);
```
Si `negocioId` es `n2` (agro), mostrar el estado vacío con mensaje "Este negocio usa Lotes en lugar de Productos. Ve a la sección Lotes activos."

**`Insumos.jsx`**: Igual con insumos:
```js
const [insumos, setInsumos] = useState(() => MOCK_BY_NEGOCIO[negocioId]?.insumos || []);
```

**`Historial.jsx`**: Cambiar la constante `FICHAS_DATA`:
```js
const fichas = MOCK_BY_NEGOCIO[negocioId]?.fichas || [];
```
Usar `fichas` en lugar de `FICHAS_DATA` en todo el componente. Si el negocio es agro (n2), mostrar estado vacío: "El historial de liquidaciones se gestiona desde la sección Liquidación."

---

## CORRECCIÓN 4 — Dropdowns de proveedor y unidad en formulario de insumos
**Archivo: `src/pages/Insumos.jsx`**

En el drawer de nuevo/editar insumo, localizar los campos de **Proveedor** y **Unidad** (actualmente son `<input>` de texto o selects genéricos) y reemplazarlos por selects dinámicos:

**Proveedor:**
```jsx
<div style={{ display:'flex', flexDirection:'column', gap:'6px' }}>
  <label style={{ fontSize:'11px', color:'var(--text-tertiary)', fontWeight:500, letterSpacing:'0.07em', textTransform:'uppercase' }}>Proveedor</label>
  <select
    value={form.proveedor || ''}
    onChange={e => set('proveedor', e.target.value)}
    style={{ width:'100%', background:'var(--bg-tertiary)', border:'1px solid var(--border-subtle)', color: form.proveedor ? 'var(--text-primary)' : 'var(--text-tertiary)', borderRadius:'6px', padding:'8px 12px', fontSize:'13px', outline:'none' }}
    onFocus={e => e.target.style.borderColor = accentColor}
    onBlur={e => e.target.style.borderColor = 'var(--border-subtle)'}
  >
    <option value="">— Seleccionar proveedor —</option>
    {(MOCK_BY_NEGOCIO[negocioId]?.proveedores || []).map(p => (
      <option key={p} value={p}>{p}</option>
    ))}
  </select>
</div>
```

**Unidad de medida:**
```jsx
<select value={form.unidad || ''} onChange={e => set('unidad', e.target.value)} ...mismo estilo...>
  <option value="">— Seleccionar unidad —</option>
  {['kg','g','L','ml','u','doc','caja','m','cab','jornal'].map(u => (
    <option key={u} value={u}>{u}</option>
  ))}
</select>
```

Verificar también que el dropdown de **Categoría** use `CATS_INIT` del `Categorias.jsx` (ya definido globalmente). Si aún es input de texto, reemplazarlo igualmente por select.

---

## CORRECCIÓN 5 — Mostrar archivados en Insumos, Productos y Proveedores
**Archivos: `Insumos.jsx`, `Productos.jsx`, `Proveedores.jsx`**

El mismo patrón en los tres. En `Proveedores.jsx` ya existe algo similar — verificar y unificar.

**Agregar estado:**
```js
const [mostrarArchivados, setMostrarArchivados] = useState(false);
```

**Filtrar la lista visible:**
```js
const activos = items.filter(x => x.activo !== false);
const archivados = items.filter(x => x.activo === false);
const visibles = mostrarArchivados ? items : activos;
```

**Al final de la tabla/lista, antes del cierre del contenedor, agregar el botón toggle** (solo si `archivados.length > 0`):
```jsx
{archivados.length > 0 && (
  <button
    onClick={() => setMostrarArchivados(v => !v)}
    style={{
      width:'100%', padding:'10px 20px',
      background:'transparent', border:'none',
      borderTop:'1px solid var(--border-subtle)',
      color:'var(--text-tertiary)', cursor:'pointer',
      fontSize:'12px', display:'flex', alignItems:'center',
      justifyContent:'center', gap:'6px',
    }}
    onMouseEnter={e => e.currentTarget.style.color = 'var(--text-secondary)'}
    onMouseLeave={e => e.currentTarget.style.color = 'var(--text-tertiary)'}
  >
    <Icon name={mostrarArchivados ? 'chevronUp' : 'chevronDown'} size={13} />
    {mostrarArchivados
      ? `Ocultar ${archivados.length} archivado${archivados.length > 1 ? 's' : ''}`
      : `Mostrar ${archivados.length} archivado${archivados.length > 1 ? 's' : ''}`}
  </button>
)}
```

Los ítems archivados se muestran con `opacity: 0.5` y sus acciones cambian: el botón de archivar se convierte en "Restaurar" (icon `refresh`, color `var(--accent-success)`).

En **`Productos.jsx`** específicamente: la card archivada además de `opacity: 0.5` muestra un banner "Archivado" en lugar de los botones normales, con solo el botón "Restaurar producto".

---

## TABLA RESUMEN

| Archivo | Qué cambia |
|---|---|
| `ui.jsx` | Agregar `MOCK_BY_NEGOCIO` global al final |
| `AppLayout.jsx` | Dropdown Admin funcional + nav item fichas→historial |
| `Dashboard.jsx` | Métricas y datos desde `MOCK_BY_NEGOCIO[negocioId]` |
| `Productos.jsx` | Estado inicial desde mock + mostrar archivados |
| `Insumos.jsx` | Estado inicial desde mock + dropdowns select + archivados |
| `Proveedores.jsx` | Verificar/unificar patrón archivados |
| `Historial.jsx` | Fichas desde mock + estado vacío para agro |

**No modificar:** `Categorias.jsx`, `Unidades.jsx`, `Configuracion.jsx`, `Bitacora.jsx`, `Lotes.jsx`, `Liquidacion.jsx`, `FichaCosto.jsx`, `Onboarding.jsx`, `icons.jsx`, `CosteoUniversal.html`.
