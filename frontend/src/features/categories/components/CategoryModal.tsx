import React, { useState, useEffect } from 'react';
import { Category, CategoryFormData } from '../types';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onSave: (data: CategoryFormData) => Promise<void>;
  editingCategory?: Category | null;
  defaultModule: 'Units' | 'Materials';
  defaultType: 'Industrial' | 'Biológico';
}

const CategoryModal: React.FC<Props> = ({ isOpen, onClose, onSave, editingCategory, defaultModule, defaultType }) => {
  const [formData, setFormData] = useState<CategoryFormData>({
    name: '',
    description: '',
    target_module: defaultModule,
    type: defaultType
  });
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (editingCategory) {
      setFormData({
        name: editingCategory.name,
        description: editingCategory.description || '',
        target_module: editingCategory.target_module,
        type: editingCategory.type
      });
    } else {
      setFormData({
        name: '',
        description: '',
        target_module: defaultModule,
        type: defaultType
      });
    }
  }, [editingCategory, defaultModule, defaultType, isOpen]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    try {
      await onSave(formData);
      onClose();
    } catch (err: any) {
      setError(err.response?.data?.message || err.message || 'Error al guardar la categoría');
    }
  };

  const isIndustrial = formData.type === 'Industrial';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-charcoal/40 backdrop-blur-sm">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-lg overflow-hidden flex flex-col">
        {/* Header */}
        <div className={`px-6 py-4 border-b border-gray-100 flex justify-between items-center ${isIndustrial ? 'bg-professionalBlue/5' : 'bg-agroGreen/5'}`}>
          <h2 className="text-xl font-bold text-charcoal flex items-center gap-2">
            {editingCategory ? 'Editar Categoría' : 'Nueva Categoría'}
            <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${isIndustrial ? 'bg-professionalBlue/10 text-professionalBlue' : 'bg-agroGreen/10 text-agroGreen'}`}>
              {formData.type}
            </span>
          </h2>
          <button onClick={onClose} className="p-1 hover:bg-gray-100 rounded-lg text-gray-500 hover:text-charcoal transition-colors">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path></svg>
          </button>
        </div>

        {/* Content */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 flex flex-col gap-5">
          {error && (
            <div className="p-3 rounded-lg bg-red-50 border border-red-200 text-sm text-red-600 flex items-start gap-2">
              <svg className="w-5 h-5 shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
              {error}
            </div>
          )}

          <div className="grid grid-cols-2 gap-4">
            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-semibold text-charcoal">Módulo de Destino</label>
              <select
                required
                value={formData.target_module}
                onChange={e => setFormData({...formData, target_module: e.target.value as 'Units' | 'Materials'})}
                className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-professionalBlue focus:border-professionalBlue outline-none text-sm"
              >
                <option value="Units">Unidades de Medida</option>
                <option value="Materials">Insumos y Materias Primas</option>
              </select>
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-semibold text-charcoal">Tipo de Entidad</label>
              <select
                required
                value={formData.type}
                onChange={e => setFormData({...formData, type: e.target.value as 'Industrial' | 'Biológico'})}
                className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-professionalBlue focus:border-professionalBlue outline-none text-sm"
              >
                <option value="Industrial">Industrial</option>
                <option value="Biológico">Biológico</option>
              </select>
            </div>
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-semibold text-charcoal">Nombre de Categoría *</label>
            <input
              type="text"
              required
              value={formData.name}
              onChange={e => setFormData({...formData, name: e.target.value})}
              className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-professionalBlue focus:border-professionalBlue outline-none text-sm"
              placeholder="Ej. Metales, Vacunas, Volumen..."
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-sm border-gray-300 font-semibold text-charcoal">Descripción (Opcional)</label>
            <textarea
              rows={3}
              value={formData.description}
              onChange={e => setFormData({...formData, description: e.target.value})}
              className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-professionalBlue focus:border-professionalBlue outline-none text-sm resize-none"
              placeholder="Pequeña descripción sobre qué elementos agrupa esta categoría."
            />
          </div>

          {/* Footer Actions */}
          <div className="pt-4 border-t border-gray-100 flex justify-end gap-3 mt-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-lg font-medium text-gray-600 hover:bg-gray-100 transition-colors"
            >
              Cancelar
            </button>
            <button
              type="submit"
              className={`px-4 py-2 rounded-lg font-medium text-white transition-colors shadow-sm
                ${isIndustrial ? 'bg-professionalBlue hover:bg-blue-700 focus:ring-professionalBlue' : 'bg-agroGreen hover:bg-green-700 focus:ring-agroGreen'}
                focus:outline-none focus:ring-2 focus:ring-offset-2`}
            >
              Guardar Categoría
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default CategoryModal;
