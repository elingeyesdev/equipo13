import React, { useState, useEffect } from 'react';
import { Icon } from '../icons.jsx';
import { Btn, Input, RubroBadge, InfoTip } from '../components/ui.jsx';
import { apiFetch } from '../config/api.js';


const TEMPLATES = [
  {
    id: 't4', rubro: 'agro_ganadero',
    nombre: 'Engorde porcino bajo confinamiento',
    desc: 'Cerdos en sistema intensivo, 4 fases',
    bullets: [
      '10 insumos (balanceados + sanidad)',
      '16 servicios veterinarios y operativos',
      '2 lotes con 30 días de registros',
    ],
    tip: 'Incluye dos lotes demo (50 + 10 cerdos) con 30 días de registros confirmados, inventario FIFO precargado y catálogo de 16 servicios veterinarios.',
  },
  {
    id: 't5', rubro: 'industrial',
    nombre: 'Industria cárnica',
    desc: 'Despiece, chorizo, morcilla',
    bullets: [
      '16 insumos de ejemplo',
      '2 productos con receta',
      '5 etapas de producción',
    ],
    tip: 'Procesamiento industrial de cortes en productos cárnicos (chorizo, morcilla). Pareja del rubro agro de engorde porcino.',
  },
];

const LOADING_STEPS = [
  'Creando estructura del negocio…',
  'Cargando plantilla seleccionada…',
  'Importando insumos de ejemplo…',
  'Configurando etapas de producción…',
  'Preparando fichas de costo…',
  'Todo listo.',
];

const TEMPLATE_PLANTILLA = {
  t4: 'engorde_porcino',
  t5: 'industria_carnica',
  blank: null,
};

const LeftPanel = ({ rubro }) => {
  const isAgro = rubro === 'agro_ganadero';
  const isAmbos = rubro === 'ambos';
  // Para "ambos" usamos un degradado de los dos colores de marca.
  const color = isAmbos ? 'linear-gradient(135deg, #1e3a5f 0%, #166534 100%)' : (isAgro ? '#166534' : '#1e3a5f');
  const accent = isAgro ? 'var(--accent-agro)' : 'var(--accent-industrial)';
  return (
    <div style={{
      width: '40%', flexShrink: 0,
      background: color,
      display: 'flex', flexDirection: 'column',
      justifyContent: 'flex-end',
      padding: '48px 40px',
      position: 'relative',
      overflow: 'hidden',
      transition: 'background 0.5s ease',
    }}>
      <div style={{ position: 'absolute', inset: 0, opacity: 0.05, backgroundImage: 'linear-gradient(var(--border-mid) 1px, transparent 1px), linear-gradient(90deg, var(--border-mid) 1px, transparent 1px)', backgroundSize: '32px 32px' }} />
      <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -60%)', opacity: 0.08, display: 'flex', gap: '12px' }}>
        {isAmbos ? (
          <>
            <Icon name="building" size={170} style={{ color: '#fff' }} />
            <Icon name="cow"      size={170} style={{ color: '#fff' }} />
          </>
        ) : (
          <Icon name={isAgro ? 'cow' : 'building'} size={240} style={{ color: '#fff' }} />
        )}
      </div>
      <div style={{ position: 'relative', zIndex: 1 }}>
        <div style={{ width: 36, height: 36, background: accent, borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '20px', fontSize: '15px', fontWeight: 700, color: '#fff', fontFamily: 'var(--font-mono)' }}>CU</div>
        <div style={{ fontSize: '28px', color: '#fff', fontWeight: 400, lineHeight: 1.2, marginBottom: '12px', letterSpacing: '-0.02em' }}>
          Costeo estándar<br />para tu producción
        </div>
        <div style={{ fontSize: '14px', color: '#ffffff88', lineHeight: 1.6 }}>
          Calculá el costo real de cada producto. Tomá decisiones con números, no con intuición.
        </div>
      </div>
    </div>
  );
};

const StepDots = ({ step, total, accentColor }) => (
  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '32px' }}>
    {Array.from({ length: total }).map((_, i) => (
      <React.Fragment key={i}>
        <div style={{
          width: i === step ? 24 : 8, height: 8, borderRadius: '4px',
          background: i < step ? accentColor : i === step ? accentColor : 'var(--border-mid)',
          transition: 'all 0.3s ease',
          opacity: i < step ? 0.4 : 1,
        }} />
        {i < total - 1 && <div style={{ flex: 1, maxWidth: 20, height: 1, background: i < step ? accentColor + '44' : 'var(--border-subtle)' }} />}
      </React.Fragment>
    ))}
    <span style={{ marginLeft: '8px', fontSize: '12px', color: 'var(--text-tertiary)' }}>{step + 1} / {total}</span>
  </div>
);

const RUBRO_META = {
  industrial:    { label: 'Industrial',    icon: 'building', accent: 'var(--accent-industrial)' },
  agro_ganadero: { label: 'Agro-ganadero', icon: 'cow',      accent: 'var(--accent-agro)' },
};

const Onboarding = ({ onComplete }) => {
  const [step, setStep] = useState(0);
  const [rubro, setRubro] = useState(null); // 'industrial' | 'agro_ganadero' | 'ambos'
  const [datos, setDatos] = useState({
    industrial:    { nombre: '', template: null },
    agro_ganadero: { nombre: '', template: null },
  });
  const [loadingStep, setLoadingStep] = useState(-1);
  const [done, setDone] = useState(false);

  const [createdNegocioIds, setCreatedNegocioIds] = useState([]);
  const [apiError, setApiError] = useState(null);

  // Rubros que el wizard va a crear (1 si single, 2 si "ambos")
  const rubrosActivos = rubro === 'ambos'
    ? ['agro_ganadero', 'industrial']
    : (rubro ? [rubro] : []);

  const accentColor = rubro === 'agro_ganadero'
    ? 'var(--accent-agro)'
    : 'var(--accent-industrial)';

  const setDato = (r, patch) => setDatos(prev => ({ ...prev, [r]: { ...prev[r], ...patch } }));

  const todosLosNombresOk = rubrosActivos.every(r => datos[r].nombre.trim().length > 0);
  const todasLasPlantillasOk = rubrosActivos.every(r => datos[r].template != null);

  useEffect(() => {
    if (step !== 3) return;

    setApiError(null);
    setDone(false);
    setCreatedNegocioIds([]);

    let i = 0;
    let animDone = false;
    let apiDone = false;
    let resolvedIds = [];

    const tryComplete = () => {
      if (animDone && apiDone) {
        setCreatedNegocioIds(resolvedIds);
        setDone(true);
      }
    };

    setLoadingStep(0);
    const iv = setInterval(() => {
      i++;
      if (i >= LOADING_STEPS.length) {
        clearInterval(iv);
        animDone = true;
        tryComplete();
      } else {
        setLoadingStep(i);
      }
    }, 600);

    const payload = {
      negocios: rubrosActivos.map(r => ({
        nombre:    datos[r].nombre,
        rubro:     r,
        sub_rubro: null,
        plantilla: TEMPLATE_PLANTILLA[datos[r].template] || null,
      })),
    };

    apiFetch('/api/onboarding/completar', { method: 'POST', body: JSON.stringify(payload) })
      .then(data => {
        apiDone = true;
        resolvedIds = data.negocios || [];
        tryComplete();
      })
      .catch(err => {
        clearInterval(iv);
        setApiError(err?.error || 'Error al crear el negocio. Intentá de nuevo.');
      });

    return () => clearInterval(iv);
  }, [step]);

  const RubroCard = ({ id, icon, title, desc }) => {
    const sel = rubro === id;
    const col = id === 'agro_ganadero' ? 'var(--accent-agro)' : 'var(--accent-industrial)';
    const [hov, setHov] = useState(false);
    return (
      <button
        onClick={() => setRubro(id)}
        onMouseEnter={() => setHov(true)} onMouseLeave={() => setHov(false)}
        style={{
          flex: 1, padding: '24px 20px', borderRadius: '10px', cursor: 'pointer',
          border: `2px solid ${sel ? col : hov ? 'var(--border-mid)' : 'var(--border-subtle)'}`,
          background: sel ? col + '10' : hov ? 'var(--bg-tertiary)' : 'var(--bg-secondary)',
          display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: '12px',
          transition: 'all 0.2s', textAlign: 'left', fontFamily: 'var(--font-sans)',
        }}
      >
        <div style={{ color: sel ? col : 'var(--text-tertiary)', transition: 'color 0.2s' }}>
          <Icon name={icon} size={28} strokeWidth={1.2} />
        </div>
        <div>
          <div style={{ fontSize: '15px', fontWeight: 500, color: sel ? col : 'var(--text-primary)', marginBottom: '4px' }}>{title}</div>
          <div style={{ fontSize: '13px', color: 'var(--text-tertiary)', lineHeight: 1.5 }}>{desc}</div>
        </div>
        {sel && <div style={{ marginTop: 'auto', color: col, display: 'flex', alignItems: 'center', gap: '4px', fontSize: '12px', fontWeight: 500 }}>
          <Icon name="check" size={13} /> Seleccionado
        </div>}
      </button>
    );
  };

  const TemplateCard = ({ tmpl, targetRubro }) => {
    const sel = datos[targetRubro]?.template === tmpl.id;
    const col = tmpl.rubro === 'agro_ganadero' ? 'var(--accent-agro)' : 'var(--accent-industrial)';
    const [hov, setHov] = useState(false);
    return (
      <button
        onClick={() => setDato(targetRubro, { template: tmpl.id })}
        onMouseEnter={() => setHov(true)} onMouseLeave={() => setHov(false)}
        style={{
          padding: '18px', borderRadius: '8px', cursor: 'pointer',
          border: `2px solid ${sel ? col : hov ? 'var(--border-mid)' : 'var(--border-subtle)'}`,
          background: sel ? col + '0D' : 'var(--bg-secondary)',
          display: 'flex', flexDirection: 'column', gap: '10px',
          textAlign: 'left', fontFamily: 'var(--font-sans)', transition: 'all 0.15s',
          position: 'relative',
        }}
      >
        {sel && <div style={{ position: 'absolute', top: 12, right: 12, color: col }}><Icon name="checkCircle" size={16} /></div>}
        <RubroBadge rubro={tmpl.rubro} />
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '5px', marginBottom: '3px' }}>
            <div style={{ fontSize: '14px', fontWeight: 500, color: 'var(--text-primary)' }}>{tmpl.nombre}</div>
            {tmpl.tip && <InfoTip text={tmpl.tip} />}
          </div>
          <div style={{ fontSize: '12px', color: 'var(--text-tertiary)' }}>{tmpl.desc}</div>
        </div>
        <div style={{ borderTop: '1px solid var(--border-subtle)', paddingTop: '10px', display: 'flex', flexDirection: 'column', gap: '4px' }}>
          {tmpl.bullets.map((item, i) => (
            <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', color: 'var(--text-secondary)' }}>
              <Icon name="check" size={11} style={{ color: col, flexShrink: 0 }} /> {item}
            </div>
          ))}
        </div>
      </button>
    );
  };

  return (
    <div style={{ display: 'flex', height: '100vh', overflow: 'hidden' }}>
      <LeftPanel rubro={rubro} />
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', background: 'var(--bg-primary)' }}>
        <div style={{ flex: 1, overflowY: 'auto', padding: '48px', display: 'flex', flexDirection: 'column', maxWidth: '560px' }}>
          <StepDots step={step} total={4} accentColor={accentColor} />

          {step === 0 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '24px', animation: 'fadeIn 0.3s ease' }}>
              <div>
                <div style={{ fontSize: '24px', fontWeight: 400, color: 'var(--text-primary)', marginBottom: '8px', letterSpacing: '-0.02em' }}>¿En qué rubro producís?</div>
                <div style={{ fontSize: '14px', color: 'var(--text-secondary)' }}>El sistema se adapta a tu tipo de producción.</div>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                <div style={{ display: 'flex', gap: '12px' }}>
                  <RubroCard id="industrial"    icon="building" title="Industrial"    desc="Fábricas, talleres, manufactura" />
                  <RubroCard id="agro_ganadero" icon="cow"      title="Agro-ganadero" desc="Fincas, ganadería, producción animal" />
                </div>
                <div style={{ display: 'flex' }}>
                  <RubroCard id="ambos" icon="layers" title="Ambos rubros" desc="Creá dos negocios — uno industrial y uno agro-ganadero — en un solo paso" />
                </div>
              </div>
              <Btn disabled={!rubro} onClick={() => setStep(1)} accentColor={accentColor} size="lg">
                Continuar <Icon name="arrowRight" size={15} />
              </Btn>
            </div>
          )}

          {step === 1 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '24px', animation: 'fadeIn 0.3s ease' }}>
              <div>
                <div style={{ fontSize: '24px', fontWeight: 400, color: 'var(--text-primary)', marginBottom: '8px', letterSpacing: '-0.02em' }}>
                  {rubro === 'ambos' ? 'Datos de tus negocios' : 'Datos del negocio'}
                </div>
                <div style={{ fontSize: '14px', color: 'var(--text-secondary)' }}>
                  {rubro === 'ambos'
                    ? 'Cada rubro será un negocio independiente con sus propios catálogos, lotes y reportes.'
                    : '¿Cómo se llama tu empresa o emprendimiento?'}
                </div>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                {rubrosActivos.map(r => {
                  const meta = RUBRO_META[r];
                  return (
                    <div key={r} style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                      {rubro === 'ambos' && (
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '12px', color: meta.accent, textTransform: 'uppercase', letterSpacing: '0.06em', fontWeight: 600 }}>
                          <Icon name={meta.icon} size={14} /> Negocio {meta.label.toLowerCase()}
                        </div>
                      )}
                      <Input
                        label="Nombre del negocio"
                        labelExtra={<InfoTip text="Este nombre aparece en el selector de negocio y en los reportes. Podés cambiarlo después en Configuración." />}
                        value={datos[r].nombre}
                        onChange={v => setDato(r, { nombre: v })}
                        placeholder={r === 'agro_ganadero' ? 'Ej. Granja Don Pedro' : 'Ej. Lácteos del Valle'}
                        onFocusColor={meta.accent}
                      />
                    </div>
                  );
                })}
              </div>
              <div style={{ display: 'flex', gap: '10px' }}>
                <Btn variant="secondary" onClick={() => setStep(0)}>← Atrás</Btn>
                <Btn disabled={!todosLosNombresOk} onClick={() => setStep(2)} accentColor={accentColor} size="lg">
                  Continuar <Icon name="arrowRight" size={15} />
                </Btn>
              </div>
            </div>
          )}

          {step === 2 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '24px', animation: 'fadeIn 0.3s ease' }}>
              <div>
                <div style={{ fontSize: '24px', fontWeight: 400, color: 'var(--text-primary)', marginBottom: '8px', letterSpacing: '-0.02em' }}>
                  {rubro === 'ambos' ? 'Elegí una plantilla para cada negocio' : 'Elegí una plantilla'}
                </div>
                <div style={{ fontSize: '14px', color: 'var(--text-secondary)' }}>Empezá con datos de ejemplo de tu industria. Podés modificarlos después.</div>
              </div>

              {rubrosActivos.map(r => {
                const meta = RUBRO_META[r];
                const templatesDelRubro = TEMPLATES.filter(t => t.rubro === r);
                const sel = datos[r].template;
                return (
                  <div key={r} style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                    {rubro === 'ambos' && (
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '12px', color: meta.accent, textTransform: 'uppercase', letterSpacing: '0.06em', fontWeight: 600 }}>
                        <Icon name={meta.icon} size={14} /> {datos[r].nombre || meta.label}
                      </div>
                    )}
                    <div style={{ display: 'grid', gridTemplateColumns: rubro === 'ambos' ? '1fr' : '1fr 1fr', gap: '10px' }}>
                      {templatesDelRubro.map(t => <TemplateCard key={t.id} tmpl={t} targetRubro={r} />)}
                      <button
                        onClick={() => setDato(r, { template: 'blank' })}
                        style={{
                          padding: '14px', borderRadius: '8px', cursor: 'pointer',
                          border: `2px solid ${sel === 'blank' ? meta.accent : 'var(--border-subtle)'}`,
                          background: sel === 'blank' ? meta.accent + '08' : 'transparent',
                          color: sel === 'blank' ? meta.accent : 'var(--text-tertiary)',
                          fontSize: '13px', fontFamily: 'var(--font-sans)',
                          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
                          gridColumn: rubro === 'ambos' ? 'auto' : '1 / -1', minHeight: '56px', transition: 'all 0.15s',
                        }}
                      >
                        <Icon name="plus" size={14} />
                        Empezar desde cero
                      </button>
                    </div>
                  </div>
                );
              })}

              <div style={{ display: 'flex', gap: '10px' }}>
                <Btn variant="secondary" onClick={() => setStep(1)}>← Atrás</Btn>
                <Btn disabled={!todasLasPlantillasOk} onClick={() => setStep(3)} accentColor={accentColor} size="lg">
                  {rubrosActivos.length > 1 ? 'Crear mis negocios' : 'Crear mi negocio'} <Icon name="arrowRight" size={15} />
                </Btn>
              </div>
            </div>
          )}

          {step === 3 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '32px', animation: 'fadeIn 0.3s ease' }}>
              <div>
                <div style={{ fontSize: '24px', fontWeight: 400, color: 'var(--text-primary)', marginBottom: '8px', letterSpacing: '-0.02em' }}>
                  {done ? '¡Todo listo!' : 'Preparando tu cuenta…'}
                </div>
                <div style={{ fontSize: '14px', color: 'var(--text-secondary)' }}>
                  {done
                    ? (rubrosActivos.length > 1
                        ? `${rubrosActivos.map(r => datos[r].nombre).join(' y ')} están listos para calcular costos.`
                        : `${datos[rubrosActivos[0]].nombre} está listo para calcular costos.`)
                    : 'Esto toma solo unos segundos.'}
                </div>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {LOADING_STEPS.map((label, i) => {
                  const state = i < loadingStep ? 'done' : i === loadingStep ? 'active' : 'pending';
                  return (
                    <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '12px', opacity: state === 'pending' ? 0.3 : 1, transition: 'opacity 0.3s' }}>
                      <div style={{
                        width: 20, height: 20, borderRadius: '50%', flexShrink: 0,
                        background: state === 'done' ? 'var(--accent-success)' : state === 'active' ? accentColor : 'var(--bg-tertiary)',
                        border: state === 'active' ? `2px solid ${accentColor}` : '2px solid transparent',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        transition: 'all 0.3s',
                      }}>
                        {state === 'done' && <Icon name="check" size={11} style={{ color: '#fff' }} />}
                        {state === 'active' && <div style={{ width: 6, height: 6, borderRadius: '50%', background: accentColor }} />}
                      </div>
                      <span style={{ fontSize: '14px', color: state === 'done' ? 'var(--text-secondary)' : 'var(--text-primary)' }}>{label}</span>
                    </div>
                  );
                })}
              </div>
              {apiError && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  <div style={{
                    padding: '10px 14px', borderRadius: '6px',
                    background: 'var(--accent-danger)15',
                    border: '1px solid var(--accent-danger)33',
                    fontSize: '13px', color: 'var(--accent-danger)',
                  }}>
                    {apiError}
                  </div>
                  <Btn variant="secondary" onClick={() => setStep(2)}>← Volver a elegir plantilla</Btn>
                </div>
              )}
              {done && !apiError && (
                <Btn onClick={() => onComplete(createdNegocioIds[0])} accentColor={accentColor} size="lg">
                  Entrar al dashboard <Icon name="arrowRight" size={15} />
                </Btn>
              )}
            </div>
          )}
        </div>
      </div>
      <style>{`
        @keyframes fadeIn { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: translateY(0); } }
      `}</style>
    </div>
  );
};

export default Onboarding;
