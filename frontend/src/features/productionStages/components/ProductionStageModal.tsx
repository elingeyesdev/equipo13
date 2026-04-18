import React, { useEffect, useState } from 'react';
import { ProductionStage, CreateProductionStagePayload } from '../types';
import { X, Factory, Leaf } from 'lucide-react';

interface ProductionStageModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (payload: CreateProductionStagePayload, id?: number) => Promise<void>;
  editingStage: ProductionStage | null;
  defaultType: 'Industrial' | 'Biológico';
}

const emptyForm = (type: 'Industrial' | 'Biológico'): CreateProductionStagePayload => ({
  name: '',
  description: '',
  type: type,
});

export const ProductionStageModal: React.FC<ProductionStageModalProps> = ({
  isOpen,
  onClose,
  onSave,
  editingStage,
  defaultType,
}) => {
  const [formData, setFormData] = useState<CreateProductionStagePayload>(() => emptyForm(defaultType));
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (editingStage) {
      setFormData({
        name: editingStage.name,
        description: editingStage.description || '',
        type: editingStage.type,
      });
    } else {
      setFormData(emptyForm(defaultType));
    }
    setError(null);
  }, [editingStage, isOpen, defaultType]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsSubmitting(true);

    try {
      const payload: CreateProductionStagePayload = {
        name: formData.name.trim(),
        description: formData.description?.trim() || null,
        type: formData.type,
      };
      
      if (!payload.name) {
        throw new Error('El nombre de la etapa es obligatorio');
      }

      await onSave(payload, editingStage?.id);
      onClose();
    } catch (err: unknown) {
      const ax = err as { response?: { data?: { error?: string } }; message?: string };
      setError(ax.response?.data?.error || ax.message || 'Error al guardar la etapa');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        <div className="px-6 py-4 border-b border-gray-100 flex justify-between items-center shrink-0">
          <h3 className="text-lg font-bold text-charcoal">
            {editingStage ? 'Editar Etapa' : 'Nueva Etapa de Producción'}
          </h3>
          <button
            type="button"
            onClick={onClose}
            className="text-gray-400 hover:text-gray-700 hover:bg-gray-100 p-1.5 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col flex-1 min-h-0">
          <div className="p-6 space-y-5 overflow-y-auto">
            {error && (
              <div className="p-3 bg-red-50 text-red-600 rounded-lg text-sm border border-red-200">
                {error}
              </div>
            )}

            {!editingStage && (
              <div>
                <p className="block text-sm font-medium text-gray-700 mb-2">Clasificación de la etapa</p>
                <div className="flex gap-3">
                  <label className="flex-1 relative cursor-pointer">
                    <input
                      type="radio"
                      name="stage-type"
                      checked={formData.type === 'Industrial'}
                      onChange={() => setFormData({ ...formData, type: 'Industrial' })}
                      className="peer sr-only"
                    />
                    <div className="flex items-center justify-center gap-2 px-4 py-3 rounded-xl border-2 border-gray-200 peer-checked:border-professionalBlue peer-checked:bg-blue-50/60 transition-all">
                      <Factory className="w-4 h-4 text-professionalBlue" />
                      <span className="text-sm font-semibold text-gray-700">Industrial</span>
                    </div>
                  </label>
                  <label className="flex-1 relative cursor-pointer">
                    <input
                      type="radio"
                      name="stage-type"
                      checked={formData.type === 'Biológico'}
                      onChange={() => setFormData({ ...formData, type: 'Biológico' })}
                      className="peer sr-only"
                    />
                    <div className="flex items-center justify-center gap-2 px-4 py-3 rounded-xl border-2 border-gray-200 peer-checked:border-agroGreen peer-checked:bg-green-50/60 transition-all">
                      <Leaf className="w-4 h-4 text-agroGreen" />
                      <span className="text-sm font-semibold text-gray-700">Biológico</span>
                    </div>
                  </label>
                </div>
              </div>
            )}

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Nombre de la Etapa</label>
              <input
                type="text"
                required
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-professionalBlue/40 focus:border-professionalBlue text-sm bg-gray-50 hover:bg-white transition-colors"
                placeholder="Ej: Mezclado, Empaque, Crianza..."
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Descripción (Opcional)</label>
              <textarea
                rows={3}
                value={formData.description || ''}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-professionalBlue/40 focus:border-professionalBlue text-sm bg-gray-50 hover:bg-white transition-colors resize-none"
                placeholder="Actividades realizadas en esta etapa..."
              />
            </div>
          </div>

          <div className="px-6 py-4 bg-gray-50 border-t border-gray-100 flex justify-end gap-3 shrink-0 rounded-b-2xl">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-200 rounded-lg transition-colors"
              disabled={isSubmitting}
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="bg-professionalBlue hover:bg-blue-800 text-white px-6 py-2.5 rounded-lg text-sm font-medium shadow-sm transition-all active:scale-[0.98] disabled:opacity-60"
            >
              {isSubmitting ? 'Guardando...' : 'Guardar Etapa'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
