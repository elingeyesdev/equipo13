import React from 'react';
import { AlertTriangle, Trash2, X } from 'lucide-react';

interface Props {
  isOpen: boolean;
  templateName: string;
  onConfirm: () => void;
  onCancel: () => void;
}

export const DeleteConfirmModal: React.FC<Props> = ({
  isOpen,
  templateName,
  onConfirm,
  onCancel,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Overlay */}
      <div
        className="absolute inset-0 bg-black/40 backdrop-blur-sm"
        onClick={onCancel}
      />

      {/* Modal card */}
      <div className="relative bg-white rounded-2xl shadow-2xl border border-gray-200 w-full max-w-sm animate-in zoom-in-95 duration-200">
        {/* Close button */}
        <button
          onClick={onCancel}
          className="absolute top-4 right-4 p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
        >
          <X className="w-4 h-4" />
        </button>

        <div className="p-6 flex flex-col items-center text-center">
          {/* Icon */}
          <div className="w-14 h-14 rounded-full bg-red-50 flex items-center justify-center mb-4">
            <AlertTriangle className="w-7 h-7 text-red-500" />
          </div>

          {/* Text */}
          <h3 className="text-base font-bold text-gray-900 mb-1">
            Eliminar plantilla
          </h3>
          <p className="text-sm text-gray-500 leading-relaxed">
            ¿Estás seguro de que deseas eliminar{' '}
            <span className="font-semibold text-gray-800">"{templateName}"</span>?
            Esta acción no se puede deshacer.
          </p>
        </div>

        {/* Actions */}
        <div className="flex gap-3 px-6 pb-6">
          <button
            onClick={onCancel}
            className="flex-1 py-2.5 rounded-lg border border-gray-200 text-sm font-semibold text-gray-600 hover:bg-gray-50 transition-colors"
          >
            Cancelar
          </button>
          <button
            onClick={onConfirm}
            className="flex-1 py-2.5 rounded-lg bg-red-600 hover:bg-red-700 text-white text-sm font-semibold shadow-sm transition-all active:scale-[0.98] flex items-center justify-center gap-2"
          >
            <Trash2 className="w-4 h-4" />
            Sí, eliminar
          </button>
        </div>
      </div>
    </div>
  );
};
