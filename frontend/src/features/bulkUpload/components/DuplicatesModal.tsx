import React from 'react';
import { AlertTriangle, X, Upload, SkipForward, CheckCircle2 } from 'lucide-react';
import { UploadTab } from '../types';

interface DuplicatesModalProps {
  skipped: string[];
  insertedCount: number;
  tab: UploadTab;
  onConfirm: () => void;   // continuar → mostrar éxito
  onClose: () => void;     // cerrar modal sin acción extra
}

export const DuplicatesModal: React.FC<DuplicatesModalProps> = ({
  skipped,
  insertedCount,
  tab,
  onConfirm,
  onClose,
}) => {
  const isIndustrial = tab === 'industrial';
  const accentCls = isIndustrial ? 'text-professionalBlue' : 'text-agroGreen';
  const btnCls = isIndustrial
    ? 'bg-professionalBlue hover:bg-blue-800'
    : 'bg-agroGreen hover:bg-green-800';

  return (
    /* Backdrop */
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ backgroundColor: 'rgba(15,23,42,0.55)', backdropFilter: 'blur(4px)' }}
      onClick={onClose}
    >
      {/* Panel */}
      <div
        className="relative bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden animate-[fadeInScale_0.2s_ease-out]"
        onClick={(e) => e.stopPropagation()}
        style={{
          animation: 'fadeInScale 0.2s ease-out',
        }}
      >
        {/* Top color bar */}
        <div className="h-1.5 w-full bg-gradient-to-r from-amber-400 via-orange-400 to-amber-500" />

        {/* Header */}
        <div className="px-6 pt-6 pb-4 flex items-start gap-4">
          <div className="w-12 h-12 rounded-xl bg-amber-50 flex items-center justify-center shrink-0">
            <AlertTriangle size={24} className="text-amber-500" />
          </div>
          <div className="flex-1">
            <h2 className="text-base font-bold text-gray-900 leading-snug">
              Se detectaron registros duplicados
            </h2>
            <p className="text-sm text-gray-500 mt-1">
              El sistema omitirá los lotes que ya existen en la base de datos y solo insertará los nuevos.
            </p>
          </div>
          <button
            id="duplicates-modal-close"
            onClick={onClose}
            className="p-1.5 rounded-lg text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition-colors shrink-0 mt-0.5"
          >
            <X size={16} />
          </button>
        </div>

        {/* Summary pills */}
        <div className="px-6 pb-4 flex items-center gap-3">
          <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200">
            <CheckCircle2 size={13} />
            {insertedCount} {insertedCount === 1 ? 'registro nuevo' : 'registros nuevos'}
          </span>
          <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold bg-amber-50 text-amber-700 ring-1 ring-amber-200">
            <SkipForward size={13} />
            {skipped.length} {skipped.length === 1 ? 'duplicado omitido' : 'duplicados omitidos'}
          </span>
        </div>

        {/* Skipped list */}
        <div className="mx-6 mb-4 rounded-xl border border-amber-200 bg-amber-50/50 overflow-hidden">
          <div className="px-4 py-2 border-b border-amber-200 bg-amber-50">
            <p className="text-xs font-semibold text-amber-800 uppercase tracking-wider">
              Lotes ya existentes (omitidos)
            </p>
          </div>
          <ul className="divide-y divide-amber-100 max-h-48 overflow-y-auto">
            {skipped.map((bn, idx) => (
              <li
                key={idx}
                className="flex items-center gap-3 px-4 py-2.5"
              >
                <span className="w-5 h-5 rounded-full bg-amber-100 flex items-center justify-center shrink-0">
                  <SkipForward size={11} className="text-amber-600" />
                </span>
                <span className="text-sm font-mono text-gray-700">{bn}</span>
              </li>
            ))}
          </ul>
        </div>

        {/* Info note */}
        <div className="mx-6 mb-5 flex items-start gap-2 text-xs text-gray-500 bg-gray-50 rounded-lg px-4 py-3 border border-gray-100">
          <AlertTriangle size={13} className="text-gray-400 mt-0.5 shrink-0" />
          <span>
            Los registros omitidos <strong>no serán modificados</strong>. Si deseas actualizarlos, hazlo manualmente desde el módulo de inventario.
          </span>
        </div>

        {/* Footer buttons */}
        <div className="px-6 pb-6 flex items-center justify-end gap-3">
          <button
            id="duplicates-modal-cancel"
            onClick={onClose}
            className="px-5 py-2.5 rounded-lg text-sm font-semibold text-gray-600 bg-gray-100 hover:bg-gray-200 transition-colors"
          >
            Cancelar
          </button>
          <button
            id="duplicates-modal-confirm"
            onClick={onConfirm}
            className={`flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-bold text-white shadow-sm transition-all active:scale-95 ${btnCls}`}
          >
            <Upload size={15} />
            Entendido, continuar
          </button>
        </div>
      </div>

      {/* CSS for entry animation */}
      <style>{`
        @keyframes fadeInScale {
          from { opacity: 0; transform: scale(0.94) translateY(8px); }
          to   { opacity: 1; transform: scale(1)    translateY(0); }
        }
      `}</style>
    </div>
  );
};
