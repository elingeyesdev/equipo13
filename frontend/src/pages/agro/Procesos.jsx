import React, { useState, useEffect, useCallback } from 'react';
import { Icon } from '../../icons.jsx';
import { Btn, StatusBadge, MoneyDisplay } from '../../components/ui.jsx';
import { apiFetch } from '../../config/api.js';

const AC = 'var(--accent-agro)';

const TIPOS = ['Alimentacion','Sanidad','Crecimiento','Produccion','Otro'];
const ESTADOS = ['Pendiente','En curso','Finalizado','Cancelado'];

const ESTADO_COLOR = {
  Pendiente:  'var(--accent-warning)',
  'En curso': AC,
  Finalizado: 'var(--accent-success)',
  Cancelado:  'var(--text-tertiary)',
};

// ── helpers ──────────────────────────────────────────────────
const fmtDate = d => d ? new Date(d).toLocaleDateString('es-BO',{day:'2-digit',month:'short'}) : '—';
const Label = ({children}) => (
  <div style={{fontSize:'10px',color:'var(--text-tertiary)',textTransform:'uppercase',letterSpacing:'0.06em',marginBottom:4}}>
    {children}
  </div>
);
const Field = ({label,value,onChange,type='text',options}) => (
  <div style={{display:'flex',flexDirection:'column',gap:4}}>
    <Label>{label}</Label>
    {options
      ? <select value={value} onChange={e=>onChange(e.target.value)} style={{height:36}}>
          {options.map(o=><option key={o}>{o}</option>)}
        </select>
      : <input type={type} step={type==='number'?'any':undefined} value={value}
          onChange={e=>onChange(e.target.value)}
          style={{background:'var(--bg-tertiary)',border:'1px solid var(--border-subtle)',borderRadius:6,
                  color:'var(--text-primary)',padding:'7px 10px',fontSize:14,outline:'none'}}/>}
  </div>
);

// ── Modal: crear/editar proceso del catálogo ──────────────────
const ProcesoModal = ({negocioId,inicial,onClose,onSaved}) => {
  const [form,setForm] = useState({
    nombre:'',tipo:'Alimentacion',descripcion:'',
    categoria_origen:'',categoria_destino:'',
    dias_duracion:'',peso_umbral:'',
    produce_insumo_id:'',produce_cantidad:'',
    ...inicial
  });
  const [insumos,setInsumos] = useState([]);
  const [saving,setSaving] = useState(false);
  const set=(k,v)=>setForm(f=>({...f,[k]:v}));

  useEffect(()=>{
    apiFetch(`/api/negocios/${negocioId}/insumos`).then(setInsumos).catch(()=>{});
  },[negocioId]);

  const save = async()=>{
    if(!form.nombre) return;
    setSaving(true);
    try{
      const url = inicial?.id
        ? `/api/negocios/${negocioId}/procesos/${inicial.id}`
        : `/api/negocios/${negocioId}/procesos`;
      const method = inicial?.id ? 'PUT':'POST';
      const data = await apiFetch(url,{method,body:JSON.stringify({
        ...form,
        dias_duracion: form.dias_duracion||null,
        peso_umbral: form.peso_umbral||null,
        produce_insumo_id: form.produce_insumo_id||null,
        produce_cantidad: form.produce_cantidad||null,
      })});
      onSaved(data,!!inicial?.id);
      onClose();
    } catch(e){alert(e?.error||'Error al guardar');}
    finally{setSaving(false);}
  };

  const overlay={position:'fixed',inset:0,background:'rgba(0,0,0,0.6)',zIndex:300,display:'flex',alignItems:'center',justifyContent:'center'};
  const box={width:520,background:'var(--bg-secondary)',border:'1px solid var(--border-mid)',borderRadius:12,overflow:'hidden'};

  return(
    <div style={overlay} onClick={e=>{if(e.target===e.currentTarget)onClose();}}>
      <div style={box}>
        <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',padding:'18px 24px',borderBottom:'1px solid var(--border-subtle)'}}>
          <span style={{fontSize:15,fontWeight:500,color:'var(--text-primary)'}}>
            {inicial?.id?'Editar proceso':'Nuevo proceso'}
          </span>
          <button onClick={onClose} style={{background:'none',border:'none',color:'var(--text-tertiary)',cursor:'pointer'}}><Icon name="x" size={16}/></button>
        </div>
        <div style={{padding:'20px 24px',display:'flex',flexDirection:'column',gap:14,maxHeight:'72vh',overflowY:'auto'}}>
          <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:12}}>
            <Field label="Nombre" value={form.nombre} onChange={v=>set('nombre',v)}/>
            <Field label="Tipo" value={form.tipo} onChange={v=>set('tipo',v)} options={TIPOS}/>
          </div>
          <Field label="Descripción" value={form.descripcion} onChange={v=>set('descripcion',v)}/>
          <div style={{borderTop:'1px solid var(--border-subtle)',paddingTop:12}}>
            <div style={{fontSize:11,fontWeight:600,letterSpacing:'0.07em',textTransform:'uppercase',color:AC,marginBottom:10}}>
              Cambio de categoría del lote
            </div>
            <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:12}}>
              <Field label="Categoría origen" value={form.categoria_origen} onChange={v=>set('categoria_origen',v)}/>
              <Field label="Categoría destino" value={form.categoria_destino} onChange={v=>set('categoria_destino',v)}/>
              <Field label="Duración (días)" type="number" value={form.dias_duracion} onChange={v=>set('dias_duracion',v)}/>
              <Field label="Peso umbral (kg/cab)" type="number" value={form.peso_umbral} onChange={v=>set('peso_umbral',v)}/>
            </div>
          </div>
          <div style={{borderTop:'1px solid var(--border-subtle)',paddingTop:12}}>
            <div style={{fontSize:11,fontWeight:600,letterSpacing:'0.07em',textTransform:'uppercase',color:AC,marginBottom:10}}>
              Producción circular (opcional)
            </div>
            <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:12}}>
              <div style={{display:'flex',flexDirection:'column',gap:4}}>
                <Label>Insumo producido</Label>
                <select value={form.produce_insumo_id} onChange={e=>set('produce_insumo_id',e.target.value)} style={{height:36}}>
                  <option value="">— Ninguno —</option>
                  {insumos.map(i=><option key={i.id} value={i.id}>{i.nombre}</option>)}
                </select>
              </div>
              <Field label="Cantidad producida/cab" type="number" value={form.produce_cantidad} onChange={v=>set('produce_cantidad',v)}/>
            </div>
          </div>
        </div>
        <div style={{padding:'14px 24px',borderTop:'1px solid var(--border-subtle)',display:'flex',gap:8,justifyContent:'flex-end'}}>
          <Btn variant="secondary" onClick={onClose}>Cancelar</Btn>
          <Btn accentColor={AC} onClick={save} disabled={saving}>{saving?'Guardando…':'Guardar proceso'}</Btn>
        </div>
      </div>
    </div>
  );
};

// ── Modal: asignar proceso a lote ────────────────────────────
const AsignarModal = ({negocioId,loteId,procesos,onClose,onSaved}) => {
  const [form,setForm] = useState({proceso_id:'',fecha_inicio:'',fecha_fin:'',notas:''});
  const [saving,setSaving] = useState(false);
  const set=(k,v)=>setForm(f=>({...f,[k]:v}));

  const save = async()=>{
    if(!form.proceso_id) return;
    setSaving(true);
    try{
      const data = await apiFetch(`/api/negocios/${negocioId}/lotes/${loteId}/procesos`,{
        method:'POST',body:JSON.stringify(form)
      });
      onSaved(data); onClose();
    } catch(e){alert(e?.error||'Error al asignar');}
    finally{setSaving(false);}
  };

  const overlay={position:'fixed',inset:0,background:'rgba(0,0,0,0.6)',zIndex:300,display:'flex',alignItems:'center',justifyContent:'center'};
  const box={width:440,background:'var(--bg-secondary)',border:'1px solid var(--border-mid)',borderRadius:12,overflow:'hidden'};

  return(
    <div style={overlay} onClick={e=>{if(e.target===e.currentTarget)onClose();}}>
      <div style={box}>
        <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',padding:'18px 24px',borderBottom:'1px solid var(--border-subtle)'}}>
          <span style={{fontSize:15,fontWeight:500,color:'var(--text-primary)'}}>Asignar proceso al lote</span>
          <button onClick={onClose} style={{background:'none',border:'none',color:'var(--text-tertiary)',cursor:'pointer'}}><Icon name="x" size={16}/></button>
        </div>
        <div style={{padding:'20px 24px',display:'flex',flexDirection:'column',gap:14}}>
          <div style={{display:'flex',flexDirection:'column',gap:4}}>
            <Label>Proceso</Label>
            <select value={form.proceso_id} onChange={e=>set('proceso_id',e.target.value)} style={{height:36}}>
              <option value="">— Seleccionar —</option>
              {procesos.map(p=><option key={p.id} value={p.id}>[{p.tipo}] {p.nombre}</option>)}
            </select>
          </div>
          <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:12}}>
            <Field label="Fecha inicio" type="date" value={form.fecha_inicio} onChange={v=>set('fecha_inicio',v)}/>
            <Field label="Fecha fin programada" type="date" value={form.fecha_fin} onChange={v=>set('fecha_fin',v)}/>
          </div>
          <Field label="Notas" value={form.notas} onChange={v=>set('notas',v)}/>
        </div>
        <div style={{padding:'14px 24px',borderTop:'1px solid var(--border-subtle)',display:'flex',gap:8,justifyContent:'flex-end'}}>
          <Btn variant="secondary" onClick={onClose}>Cancelar</Btn>
          <Btn accentColor={AC} onClick={save} disabled={saving}>{saving?'Asignando…':'Asignar →'}</Btn>
        </div>
      </div>
    </div>
  );
};

// ── Card: un LoteProceso ─────────────────────────────────────
const LoteProcesoCard = ({lp,negocioId,onEstadoChange}) => {
  const [changing,setChanging] = useState(false);
  const venc = lp.fecha_fin ? new Date(lp.fecha_fin) : null;
  const diasR = lp.dias_restantes != null ? parseInt(lp.dias_restantes) : null;
  const vencido = venc && diasR !== null && diasR < 0;

  const cambiar = async(estado)=>{
    setChanging(true);
    try{
      const data = await apiFetch(
        `/api/negocios/${negocioId}/lotes/${lp.lote_id}/procesos/${lp.id}/estado`,
        {method:'PATCH',body:JSON.stringify({estado})}
      );
      onEstadoChange(data);
    } catch(e){alert(e?.error||'Error');}
    finally{setChanging(false);}
  };

  return(
    <div style={{background:'var(--bg-secondary)',border:`1px solid ${vencido?'var(--accent-warning)44':'var(--border-subtle)'}`,borderRadius:10,padding:'16px 20px',display:'flex',flexDirection:'column',gap:12}}>
      <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start'}}>
        <div>
          <div style={{fontSize:14,fontWeight:500,color:'var(--text-primary)',marginBottom:2}}>{lp.proceso_nombre}</div>
          <div style={{fontSize:12,color:'var(--text-tertiary)'}}>{lp.proceso_tipo} · Lote: {lp.lote_identificador||lp.lote_id}</div>
        </div>
        <span style={{padding:'3px 10px',borderRadius:5,fontSize:12,background:ESTADO_COLOR[lp.estado]+'22',color:ESTADO_COLOR[lp.estado],border:`1px solid ${ESTADO_COLOR[lp.estado]}44`}}>
          {lp.estado}
        </span>
      </div>
      <div style={{display:'grid',gridTemplateColumns:'repeat(3,1fr)',gap:8}}>
        {[
          {l:'Inicio',v:fmtDate(lp.fecha_inicio)},
          {l:'Fin prog.',v:fmtDate(lp.fecha_fin),warn:vencido},
          {l:'Costo proy.',v:lp.costo_proyectado?`Bs ${parseFloat(lp.costo_proyectado).toLocaleString('es-BO',{minimumFractionDigits:2})}`:  '—'},
        ].map(({l,v,warn})=>(
          <div key={l} style={{background:'var(--bg-tertiary)',borderRadius:6,padding:'8px 10px'}}>
            <div style={{fontSize:10,color:'var(--text-tertiary)',textTransform:'uppercase',letterSpacing:'0.06em',marginBottom:2}}>{l}</div>
            <div style={{fontSize:13,fontFamily:'IBM Plex Mono,monospace',color:warn?'var(--accent-warning)':'var(--text-primary)'}}>{v}</div>
          </div>
        ))}
      </div>
      {lp.estado !== 'Finalizado' && lp.estado !== 'Cancelado' && (
        <div style={{display:'flex',gap:8,paddingTop:4,borderTop:'1px solid var(--border-subtle)'}}>
          {lp.estado === 'Pendiente' && (
            <Btn size="sm" variant="secondary" onClick={()=>cambiar('En curso')} disabled={changing}>▶ Iniciar</Btn>
          )}
          <Btn size="sm" accentColor={AC} onClick={()=>cambiar('Finalizado')} disabled={changing}>
            ✓ Finalizar {changing?'…':''}
          </Btn>
          <Btn size="sm" variant="secondary" onClick={()=>cambiar('Cancelado')} disabled={changing}>Cancelar</Btn>
        </div>
      )}
      {lp.costo_ejecutado && (
        <div style={{fontSize:12,color:'var(--text-secondary)'}}>
          Costo real: <span style={{fontFamily:'IBM Plex Mono,monospace',color:AC}}>Bs {parseFloat(lp.costo_ejecutado).toLocaleString('es-BO',{minimumFractionDigits:2})}</span>
        </div>
      )}
    </div>
  );
};

// ── Panel de Alertas ─────────────────────────────────────────
const AlertasPanel = ({alertas}) => {
  if(!alertas.length) return(
    <div style={{background:'var(--bg-secondary)',border:'1px solid var(--border-subtle)',borderRadius:10,padding:'24px',textAlign:'center',color:'var(--text-tertiary)',fontSize:13}}>
      <Icon name="checkCircle" size={24} style={{marginBottom:8,color:'var(--accent-success)'}}/><br/>Sin alertas pendientes
    </div>
  );
  return(
    <div style={{display:'flex',flexDirection:'column',gap:8}}>
      {alertas.map(a=>{
        const d=parseInt(a.dias_restantes);
        const color=d<0?'var(--accent-error)':d<=1?'var(--accent-warning)':AC;
        return(
          <div key={a.id} style={{display:'flex',alignItems:'center',gap:14,background:'var(--bg-secondary)',border:`1px solid ${color}33`,borderRadius:8,padding:'12px 16px'}}>
            <div style={{width:4,height:36,background:color,borderRadius:2,flexShrink:0}}/>
            <div style={{flex:1}}>
              <div style={{fontSize:13,fontWeight:500,color:'var(--text-primary)'}}>{a.proceso_nombre}</div>
              <div style={{fontSize:12,color:'var(--text-tertiary)'}}>Lote: {a.lote_identificador} · {a.cabezas_activas} cab.</div>
            </div>
            <div style={{textAlign:'right'}}>
              <div style={{fontSize:12,fontFamily:'IBM Plex Mono,monospace',color}}>{d<0?`${Math.abs(d)}d vencido`:d===0?'Hoy':`${d}d restantes`}</div>
              <div style={{fontSize:11,color:'var(--text-tertiary)'}}>{a.estado}</div>
            </div>
          </div>
        );
      })}
    </div>
  );
};

// ── Vista principal ──────────────────────────────────────────
const Procesos = ({negocioId,activeLote}) => {
  const [tab,setTab]         = useState('asignados');
  const [procesos,setProcesos]   = useState([]);
  const [loteProcesos,setLoteProcesos] = useState([]);
  const [alertas,setAlertas]   = useState([]);
  const [loading,setLoading]   = useState(true);
  const [modal,setModal]       = useState(null); // null | 'nuevo' | 'editar' | 'asignar'
  const [editTarget,setEditTarget] = useState(null);

  const fetchAll = useCallback(async()=>{
    if(!negocioId) return;
    setLoading(true);
    try{
      const [procs,alts] = await Promise.all([
        apiFetch(`/api/negocios/${negocioId}/procesos`),
        apiFetch(`/api/negocios/${negocioId}/procesos/alertas`),
      ]);
      setProcesos(procs);
      setAlertas(alts);
      if(activeLote?._id){
        const lp = await apiFetch(`/api/negocios/${negocioId}/lotes/${activeLote._id}/procesos`);
        setLoteProcesos(lp);
      }
    } catch(e){}
    finally{setLoading(false);}
  },[negocioId,activeLote]);

  useEffect(()=>{fetchAll();},[fetchAll]);

  const onProcesoSaved=(data,isEdit)=>{
    if(isEdit) setProcesos(ps=>ps.map(p=>p.id===data.id?data:p));
    else setProcesos(ps=>[data,...ps]);
  };
  const onLpSaved=(data)=>setLoteProcesos(ps=>[data,...ps]);
  const onEstadoChange=(data)=>setLoteProcesos(ps=>ps.map(p=>p.id===data.id?data:p));

  const Tab=({id,label,badge})=>(
    <button onClick={()=>setTab(id)} style={{padding:'8px 16px',borderRadius:6,border:'none',cursor:'pointer',fontSize:13,fontWeight:500,
      background:tab===id?AC+'22':'transparent',color:tab===id?AC:'var(--text-secondary)',transition:'all 0.15s'}}>
      {label}{badge>0&&<span style={{marginLeft:6,background:AC,color:'#fff',borderRadius:10,padding:'1px 7px',fontSize:11}}>{badge}</span>}
    </button>
  );

  return(
    <div style={{display:'flex',flexDirection:'column',gap:20}}>
      {/* Header */}
      <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start'}}>
        <div>
          <div style={{display:'flex',alignItems:'center',gap:12,marginBottom:4}}>
            <h1 style={{fontSize:22,fontWeight:400,color:'var(--text-primary)',letterSpacing:'-0.02em'}}>Procesos AGRO</h1>
            {alertas.length>0&&(
              <span style={{background:'var(--accent-warning)22',color:'var(--accent-warning)',border:'1px solid var(--accent-warning)44',borderRadius:5,padding:'2px 10px',fontSize:12}}>
                {alertas.length} alerta{alertas.length>1?'s':''}
              </span>
            )}
          </div>
          <div style={{fontSize:13,color:'var(--text-tertiary)'}}>
            {activeLote?`Lote activo: ${activeLote.id||activeLote.identificador}`:'Gestión de procesos y automatización'}
          </div>
        </div>
        <div style={{display:'flex',gap:8}}>
          {activeLote?._id&&(
            <Btn variant="secondary" icon="plus" onClick={()=>setModal('asignar')}>Asignar proceso</Btn>
          )}
          <Btn accentColor={AC} icon="plus" onClick={()=>{setEditTarget(null);setModal('nuevo');}}>Nuevo proceso</Btn>
        </div>
      </div>

      {/* Tabs */}
      <div style={{display:'flex',gap:4,padding:'4px',background:'var(--bg-secondary)',borderRadius:8,border:'1px solid var(--border-subtle)',width:'fit-content'}}>
        <Tab id="asignados" label="Asignados al lote" badge={loteProcesos.filter(p=>p.estado==='Pendiente'||p.estado==='En curso').length}/>
        <Tab id="catalogo"  label="Catálogo"/>
        <Tab id="alertas"   label="Alertas" badge={alertas.length}/>
      </div>

      {loading&&<div style={{textAlign:'center',padding:48,color:'var(--text-tertiary)',fontSize:14}}>Cargando…</div>}

      {!loading&&tab==='asignados'&&(
        <div style={{display:'flex',flexDirection:'column',gap:12}}>
          {!activeLote?._id&&(
            <div style={{background:'var(--bg-secondary)',border:'1px solid var(--border-subtle)',borderRadius:10,padding:'32px',textAlign:'center',color:'var(--text-tertiary)',fontSize:13}}>
              Selecciona un lote desde la sección <strong>Lotes</strong> para ver sus procesos asignados.
            </div>
          )}
          {activeLote?._id&&loteProcesos.length===0&&(
            <div style={{background:'var(--bg-secondary)',border:'1px solid var(--border-subtle)',borderRadius:10,padding:'32px',textAlign:'center',color:'var(--text-tertiary)',fontSize:13}}>
              Este lote no tiene procesos asignados. Usa "Asignar proceso" para comenzar.
            </div>
          )}
          {loteProcesos.map(lp=>(
            <LoteProcesoCard key={lp.id} lp={{...lp,lote_identificador:activeLote?.id}} negocioId={negocioId} onEstadoChange={onEstadoChange}/>
          ))}
        </div>
      )}

      {!loading&&tab==='catalogo'&&(
        <div style={{display:'flex',flexDirection:'column',gap:8}}>
          {procesos.length===0&&(
            <div style={{background:'var(--bg-secondary)',border:'1px solid var(--border-subtle)',borderRadius:10,padding:'32px',textAlign:'center',color:'var(--text-tertiary)',fontSize:13}}>
              No hay procesos en el catálogo. Crea el primero con "+ Nuevo proceso".
            </div>
          )}
          {procesos.map(p=>(
            <div key={p.id} style={{display:'flex',alignItems:'center',gap:16,background:'var(--bg-secondary)',border:'1px solid var(--border-subtle)',borderRadius:10,padding:'14px 20px'}}>
              <div style={{width:8,height:8,borderRadius:'50%',background:AC,flexShrink:0}}/>
              <div style={{flex:1}}>
                <div style={{fontSize:14,fontWeight:500,color:'var(--text-primary)'}}>{p.nombre}</div>
                <div style={{fontSize:12,color:'var(--text-tertiary)'}}>
                  {p.tipo}
                  {p.categoria_origen&&` · ${p.categoria_origen} → ${p.categoria_destino}`}
                  {p.dias_duracion&&` · ${p.dias_duracion} días`}
                  {p.insumos_requeridos?.length>0&&` · ${p.insumos_requeridos.length} insumo(s)`}
                </div>
              </div>
              {p.produce_insumo_id&&(
                <span style={{fontSize:11,padding:'2px 8px',borderRadius:4,background:'var(--accent-success)18',color:'var(--accent-success)',border:'1px solid var(--accent-success)33'}}>
                  ↺ Circular
                </span>
              )}
              <button onClick={()=>{setEditTarget(p);setModal('editar');}}
                style={{background:'none',border:'none',color:'var(--text-tertiary)',cursor:'pointer',padding:6}}>
                <Icon name="edit" size={14}/>
              </button>
            </div>
          ))}
        </div>
      )}

      {!loading&&tab==='alertas'&&<AlertasPanel alertas={alertas}/>}

      {/* Modals */}
      {(modal==='nuevo'||modal==='editar')&&(
        <ProcesoModal negocioId={negocioId} inicial={modal==='editar'?editTarget:null}
          onClose={()=>setModal(null)} onSaved={onProcesoSaved}/>
      )}
      {modal==='asignar'&&activeLote?._id&&(
        <AsignarModal negocioId={negocioId} loteId={activeLote._id} procesos={procesos}
          onClose={()=>setModal(null)} onSaved={onLpSaved}/>
      )}
    </div>
  );
};

export default Procesos;
