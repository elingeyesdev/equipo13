import React, { useState, useEffect, useLayoutEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { Icon } from '../icons.jsx';

// ── GuidedTour ────────────────────────────────────────────────
// Tour reusable con spotlight (overlay oscuro + hueco recortado sobre un
// elemento del DOM) y tarjeta flotante con texto + navegación.
//
// Props:
//   - steps: array de pasos. Cada paso = {
//       id:      string identificador
//       target:  selector CSS (ej. '[data-tour="lote-selector"]')
//                — si es null, la tarjeta se renderiza centrada (welcome/cierre).
//       title:   título del paso
//       text:    descripción (puede ser string o ReactNode)
//       position: 'top' | 'bottom' | 'left' | 'right' | 'center' (default: 'bottom')
//       action:  opcional { label, onClick } para botón "Probar con estos valores"
//       beforeShow: opcional, función que se llama antes de mostrar el paso
//                   (útil para scrollear, expandir acordeón, etc.)
//     }
//   - active: si está abierto
//   - onClose: callback al cerrar
//   - accentColor: color de marca
//
// El target se resuelve cada vez que cambia el paso. Si no se encuentra,
// la tarjeta se centra en pantalla. Se reposiciona en resize y scroll.

const PADDING_HOLE = 8;

export const GuidedTour = ({ steps, active, onClose, accentColor = '#16a34a' }) => {
  const [stepIdx, setStepIdx] = useState(0);
  const [rect, setRect] = useState(null); // bounding rect del target

  const step = steps[stepIdx];
  const totalSteps = steps.length;
  const targetSelector = step?.target;
  const isCentered = !targetSelector || step?.position === 'center';

  // Resetear al paso 0 al abrir
  useEffect(() => {
    if (active) setStepIdx(0);
  }, [active]);

  // Ejecutar beforeShow al cambiar de paso
  useEffect(() => {
    if (active && step?.beforeShow) {
      step.beforeShow();
    }
  }, [active, stepIdx]);

  // Localizar el target y calcular el rect cuando cambia el paso, en scroll o resize
  useLayoutEffect(() => {
    if (!active || isCentered) {
      setRect(null);
      return;
    }

    // 1. Scroll inicial UNA SOLA VEZ al entrar al paso. Después no se vuelve
    //    a scrollear automáticamente — el usuario puede mover la página libremente.
    const targetEl = document.querySelector(targetSelector);
    if (targetEl) {
      const r0 = targetEl.getBoundingClientRect();
      const viewportH = window.innerHeight;
      // Si el target es más alto que el viewport, alineamos su parte superior.
      // Si cabe entero, lo centramos.
      const block = r0.height > viewportH - 160 ? 'start' : 'center';
      if (r0.top < 80 || r0.bottom > viewportH - 100) {
        targetEl.scrollIntoView({ behavior: 'smooth', block });
      }
    }

    // 2. Reposicionar el rect en scroll/resize, SIN volver a hacer scroll
    //    (sin esto, el listener entra en un loop con scrollIntoView).
    const reposicionar = () => {
      const el = document.querySelector(targetSelector);
      if (!el) {
        setRect(null);
        return;
      }
      const r = el.getBoundingClientRect();
      setRect({
        top: r.top, left: r.left,
        width: r.width, height: r.height,
        bottom: r.bottom, right: r.right,
      });
    };
    reposicionar();
    // Reintenta para casos donde el DOM aún no está pintado o la transición sigue
    const retries = [50, 150, 300, 600];
    const timers = retries.map(d => setTimeout(reposicionar, d));
    window.addEventListener('resize', reposicionar);
    window.addEventListener('scroll', reposicionar, { passive: true, capture: true });
    return () => {
      timers.forEach(t => clearTimeout(t));
      window.removeEventListener('resize', reposicionar);
      window.removeEventListener('scroll', reposicionar, true);
    };
  }, [active, stepIdx, targetSelector, isCentered]);

  if (!active || !step) return null;

  // Calcular posición de la tarjeta
  const cardWidth = 360;
  const cardOffset = 16;
  const viewportH = typeof window !== 'undefined' ? window.innerHeight : 800;
  const viewportW = typeof window !== 'undefined' ? window.innerWidth : 1200;
  let cardStyle = {};

  // Si el target es enorme (más alto que el viewport) o si está fuera de pantalla,
  // anclamos la tarjeta a una esquina fija del viewport para que NUNCA quede fuera.
  const targetMuyAlto = rect && rect.height > viewportH - 160;
  const targetFueraDePantalla = rect && (rect.bottom < 50 || rect.top > viewportH - 50);

  if (isCentered || !rect) {
    cardStyle = {
      position: 'fixed',
      top: '50%', left: '50%',
      transform: 'translate(-50%, -50%)',
      width: `${cardWidth}px`, maxWidth: 'calc(100vw - 32px)',
    };
  } else if (targetMuyAlto || targetFueraDePantalla) {
    // Tarjeta fija arriba-derecha (estilo widget). El usuario puede scrollear
    // el target libremente sin perder de vista la tarjeta del tour.
    cardStyle = {
      position: 'fixed',
      top: '24px',
      right: '24px',
      width: `${cardWidth}px`, maxWidth: 'calc(100vw - 32px)',
    };
  } else {
    const pos = step.position || 'bottom';
    const margin = cardOffset + PADDING_HOLE;
    const clampLeft = (l) => Math.max(16, Math.min(viewportW - cardWidth - 16, l));
    const clampTop = (t) => Math.max(16, Math.min(viewportH - 200, t));
    if (pos === 'bottom') {
      const top = rect.bottom + margin;
      // Si no entra abajo, ponerlo arriba
      if (top + 280 > viewportH - 16) {
        cardStyle = { position: 'fixed', bottom: `${viewportH - rect.top + margin}px`, left: `${clampLeft(rect.left + rect.width / 2 - cardWidth / 2)}px`, width: `${cardWidth}px`, maxWidth: 'calc(100vw - 32px)' };
      } else {
        cardStyle = { position: 'fixed', top: `${top}px`, left: `${clampLeft(rect.left + rect.width / 2 - cardWidth / 2)}px`, width: `${cardWidth}px`, maxWidth: 'calc(100vw - 32px)' };
      }
    } else if (pos === 'top') {
      const bottom = viewportH - rect.top + margin;
      if (rect.top < 300) {
        // No hay espacio arriba, ponerlo abajo
        cardStyle = { position: 'fixed', top: `${rect.bottom + margin}px`, left: `${clampLeft(rect.left + rect.width / 2 - cardWidth / 2)}px`, width: `${cardWidth}px`, maxWidth: 'calc(100vw - 32px)' };
      } else {
        cardStyle = { position: 'fixed', bottom: `${bottom}px`, left: `${clampLeft(rect.left + rect.width / 2 - cardWidth / 2)}px`, width: `${cardWidth}px`, maxWidth: 'calc(100vw - 32px)' };
      }
    } else if (pos === 'right') {
      cardStyle = { position: 'fixed', top: `${clampTop(rect.top + rect.height / 2 - 100)}px`, left: `${rect.right + margin}px`, width: `${cardWidth}px`, maxWidth: 'calc(100vw - 32px)' };
    } else if (pos === 'left') {
      cardStyle = { position: 'fixed', top: `${clampTop(rect.top + rect.height / 2 - 100)}px`, right: `${viewportW - rect.left + margin}px`, width: `${cardWidth}px`, maxWidth: 'calc(100vw - 32px)' };
    }
  }

  const irSiguiente = () => {
    if (stepIdx < totalSteps - 1) setStepIdx(stepIdx + 1);
    else onClose();
  };
  const irAnterior = () => {
    if (stepIdx > 0) setStepIdx(stepIdx - 1);
  };

  // Spotlight: 4 divs alrededor del target formando un "marco" oscuro.
  // pointerEvents: 'none' en todos los divs del marco — el usuario puede
  // hacer scroll y clic-pasar a través de ellos. La tarjeta del tour sí
  // captura eventos para que su interactividad funcione.
  const overlayBg = 'rgba(15, 23, 42, 0.65)';
  const spotlight = (isCentered || !rect)
    ? (
      <div style={{ position: 'fixed', inset: 0, background: overlayBg, zIndex: 9990, pointerEvents: 'none' }} />
    )
    : (
      <>
        {/* Top */}
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, height: `${Math.max(0, rect.top - PADDING_HOLE)}px`, background: overlayBg, zIndex: 9990, pointerEvents: 'none' }} />
        {/* Bottom */}
        <div style={{ position: 'fixed', top: `${rect.bottom + PADDING_HOLE}px`, left: 0, right: 0, bottom: 0, background: overlayBg, zIndex: 9990, pointerEvents: 'none' }} />
        {/* Left */}
        <div style={{ position: 'fixed', top: `${Math.max(0, rect.top - PADDING_HOLE)}px`, left: 0, width: `${Math.max(0, rect.left - PADDING_HOLE)}px`, height: `${rect.height + PADDING_HOLE * 2}px`, background: overlayBg, zIndex: 9990, pointerEvents: 'none' }} />
        {/* Right */}
        <div style={{ position: 'fixed', top: `${Math.max(0, rect.top - PADDING_HOLE)}px`, left: `${rect.right + PADDING_HOLE}px`, right: 0, height: `${rect.height + PADDING_HOLE * 2}px`, background: overlayBg, zIndex: 9990, pointerEvents: 'none' }} />
        {/* Borde brillante alrededor del target */}
        <div style={{
          position: 'fixed',
          top: `${rect.top - PADDING_HOLE}px`,
          left: `${rect.left - PADDING_HOLE}px`,
          width: `${rect.width + PADDING_HOLE * 2}px`,
          height: `${rect.height + PADDING_HOLE * 2}px`,
          border: `2px solid ${accentColor}`,
          borderRadius: '8px',
          boxShadow: `0 0 0 4px color-mix(in srgb, ${accentColor} 30%, transparent), 0 8px 32px rgba(0,0,0,0.4)`,
          pointerEvents: 'none',
          zIndex: 9991,
          animation: 'tourPulse 2s ease-in-out infinite',
        }} />
      </>
    );

  return createPortal(
    <>
      <style>{`
        @keyframes tourPulse {
          0%, 100% { box-shadow: 0 0 0 4px color-mix(in srgb, ${accentColor} 30%, transparent), 0 8px 32px rgba(0,0,0,0.4); }
          50%      { box-shadow: 0 0 0 8px color-mix(in srgb, ${accentColor} 15%, transparent), 0 8px 32px rgba(0,0,0,0.4); }
        }
        @keyframes tourCardIn {
          from { opacity: 0; transform: translateY(8px); }
          to   { opacity: 1; transform: translateY(0); }
        }
      `}</style>

      {spotlight}

      {/* Tarjeta del paso */}
      <div style={{
        ...cardStyle,
        zIndex: 9992,
        background: 'var(--bg-secondary, #ffffff)',
        border: `1px solid var(--border-mid, #d1d5db)`,
        borderRadius: '12px',
        boxShadow: '0 16px 48px rgba(0,0,0,0.4)',
        padding: '20px 22px',
        display: 'flex', flexDirection: 'column', gap: '12px',
        fontFamily: 'IBM Plex Sans, sans-serif',
        animation: 'tourCardIn 0.25s ease-out',
      }}>
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '8px' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '3px', flex: 1, minWidth: 0 }}>
            <span style={{ fontSize: '10px', color: accentColor, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em' }}>
              Paso {stepIdx + 1} de {totalSteps}
            </span>
            <span style={{ fontSize: '16px', fontWeight: 600, color: 'var(--text-primary, #111827)', lineHeight: 1.3 }}>
              {step.title}
            </span>
          </div>
          <button
            onClick={onClose}
            title="Cerrar tutorial"
            style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: 'var(--text-tertiary, #9ca3af)', padding: '2px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
            onMouseEnter={e => e.currentTarget.style.color = 'var(--text-secondary, #4b5563)'}
            onMouseLeave={e => e.currentTarget.style.color = 'var(--text-tertiary, #9ca3af)'}
          >
            <Icon name="x" size={16} />
          </button>
        </div>

        {/* Texto */}
        <div style={{ fontSize: '13px', color: 'var(--text-secondary, #4b5563)', lineHeight: 1.6 }}>
          {step.text}
        </div>

        {/* Acción opcional (botón "Probar con estos valores") */}
        {step.action && (
          <button
            onClick={() => step.action.onClick()}
            style={{
              alignSelf: 'flex-start',
              background: `color-mix(in srgb, ${accentColor} 15%, transparent)`,
              border: `1px solid color-mix(in srgb, ${accentColor} 40%, transparent)`,
              color: accentColor,
              borderRadius: '6px',
              padding: '6px 12px',
              fontSize: '12px',
              fontWeight: 600,
              cursor: 'pointer',
              display: 'flex', alignItems: 'center', gap: '6px',
            }}
          >
            <Icon name="check" size={12} /> {step.action.label}
          </button>
        )}

        {/* Barra de progreso */}
        <div style={{ height: '3px', background: 'var(--border-subtle, #e5e7eb)', borderRadius: '2px', overflow: 'hidden' }}>
          <div style={{
            height: '100%',
            width: `${((stepIdx + 1) / totalSteps) * 100}%`,
            background: accentColor,
            borderRadius: '2px',
            transition: 'width 0.3s ease',
          }} />
        </div>

        {/* Navegación */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '8px', marginTop: '4px' }}>
          <button
            onClick={onClose}
            style={{ background: 'transparent', border: 'none', color: 'var(--text-tertiary, #9ca3af)', fontSize: '12px', cursor: 'pointer', padding: '4px 0' }}
          >
            Saltar tutorial
          </button>
          <div style={{ display: 'flex', gap: '6px' }}>
            <button
              onClick={irAnterior}
              disabled={stepIdx === 0}
              style={{
                background: 'transparent',
                border: '1px solid var(--border-subtle, #e5e7eb)',
                color: stepIdx === 0 ? 'var(--text-tertiary, #9ca3af)' : 'var(--text-secondary, #4b5563)',
                borderRadius: '6px',
                padding: '6px 12px',
                fontSize: '12px',
                fontWeight: 500,
                cursor: stepIdx === 0 ? 'not-allowed' : 'pointer',
                display: 'flex', alignItems: 'center', gap: '4px',
              }}
            >
              <Icon name="chevronLeft" size={12} /> Atrás
            </button>
            <button
              onClick={irSiguiente}
              style={{
                background: accentColor,
                border: `1px solid ${accentColor}`,
                color: '#fff',
                borderRadius: '6px',
                padding: '6px 14px',
                fontSize: '12px',
                fontWeight: 600,
                cursor: 'pointer',
                display: 'flex', alignItems: 'center', gap: '4px',
              }}
            >
              {stepIdx === totalSteps - 1 ? 'Finalizar' : 'Siguiente'}
              {stepIdx < totalSteps - 1 && <Icon name="chevronRight" size={12} />}
            </button>
          </div>
        </div>
      </div>
    </>,
    document.body
  );
};

export default GuidedTour;
