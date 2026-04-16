import React, { useState, useEffect } from 'react';
import { Unit, CreateUnitPayload } from '../types';
import { X } from 'lucide-react';
import { categoryService } from '../../categories/api/categoryService';
import { Category } from '../../categories/types';

interface UnitModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (payload: CreateUnitPayload) => Promise<void>;
  editingUnit: Unit | null;
  units: Unit[];
}

export const UnitModal: React.FC<UnitModalProps> = ({ isOpen, onClose, onSave, editingUnit, units }) => {
  const [formData, setFormData] = useState<CreateUnitPayload>({
    id: '',
    name: '',
    abbreviation: '',
    base_unit_id: '',
    type: 'Industrial',
    category_id: null,
  });
  
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [categories, setCategories] = useState<Category[]>([]);

  useEffect(() => {
    if (isOpen) {
      categoryService.getAll('Units', formData.type).then(setCategories).catch(console.error);
    }
  }, [isOpen, formData.type]);

  useEffect(() => {
    if (editingUnit) {
      setFormData({
        id: editingUnit.id,
        name: editingUnit.name,
        abbreviation: editingUnit.abbreviation,
        base_unit_id: editingUnit.base_unit_id || '',
        type: editingUnit.type,
        category_id: editingUnit.category_id || null,
      });
    } else {
      setFormData({
        id: '',
        name: '',
        abbreviation: '',
        base_unit_id: '',
        type: 'Industrial',
        category_id: null,
      });
    }
    setError(null);
  }, [editingUnit, isOpen]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsSubmitting(true);

    try {
      const payload: CreateUnitPayload = {
        ...formData,
        base_unit_id: formData.base_unit_id === '' ? null : formData.base_unit_id
      };
      
      await onSave(payload);
      onClose();
    } catch (err: any) {
      setError(err.response?.data?.error || 'Error al guardar la unidad');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-lg overflow-hidden relative">
        <div className="flex justify-between items-center p-6 border-b border-borderGray">
          <h2 className="text-xl font-bold text-charcoal">
            {editingUnit ? 'Editar Unidad de Medida' : 'Agregar Nueva Unidad'}
          </h2>
          <button onClick={onClose} className="text-gray-400 hover:text-charcoal transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6">
          {error && (
            <div className="mb-4 p-3 bg-red-50 text-red-600 rounded-md text-sm border border-red-200">
              {error}
            </div>
          )}

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Identificador Único (ID) {editingUnit && <span className="text-xs text-gray-400 font-normal ml-2">(No se puede cambiar)</span>}
              </label>
              <input
                type="text"
                disabled={!!editingUnit}
                required
                value={formData.id}
                onChange={(e) => setFormData({ ...formData, id: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-professionalBlue focus:border-professionalBlue outline-none disabled:bg-gray-100 disabled:text-gray-500"
                placeholder="ej: kg, L, cbz"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Nombre</label>
                <input
                  type="text"
                  required
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-professionalBlue focus:border-professionalBlue outline-none"
                  placeholder="ej: Kilogramo"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Abreviación</label>
                <input
                  type="text"
                  required
                  value={formData.abbreviation}
                  onChange={(e) => setFormData({ ...formData, abbreviation: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-professionalBlue focus:border-professionalBlue outline-none"
                  placeholder="ej: kg"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                 <label className="block text-sm font-medium text-gray-700 mb-1">Tipo de Unidad</label>
                 <select
                   required
                   value={formData.type}
                   onChange={(e) => setFormData({ ...formData, type: e.target.value as 'Industrial' | 'Biológico' })}
                   className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-professionalBlue focus:border-professionalBlue bg-white outline-none"
                 >
                   <option value="Industrial">Industrial</option>
                   <option value="Biológico">Biológico</option>
                 </select>
              </div>
              <div>
                 <label className="block text-sm font-medium text-gray-700 mb-1">Categoría General (Opcional)</label>
                 <select
                   value={formData.category_id || ''}
                   onChange={(e) => setFormData({ ...formData, category_id: e.target.value ? Number(e.target.value) : null })}
                   className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-professionalBlue focus:border-professionalBlue bg-white text-sm outline-none cursor-pointer"
                 >
                   <option value="">Ninguna / Sin agrupar</option>
                   {categories.map(c => (
                     <option key={c.id} value={c.id}>{c.name}</option>
                   ))}
                 </select>
              </div>
              <div>
                 <label className="block text-sm font-medium text-gray-700 mb-1">Unidad Base (Opcional)</label>
                 <select
                   value={formData.base_unit_id || ''}
                   onChange={(e) => setFormData({ ...formData, base_unit_id: e.target.value })}
                   className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-professionalBlue focus:border-professionalBlue bg-white text-sm outline-none"
                 >
                   <option value="">Ninguna</option>
                   {units
                     .filter(u => u.id !== editingUnit?.id) 
                     .map(u => (
                     <option key={u.id} value={u.id}>{u.name} ({u.id})</option>
                   ))}
                 </select>
              </div>
            </div>
          </div>

          <div className="mt-8 flex justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm font-semibold text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-md transition-colors"
              disabled={isSubmitting}
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-4 py-2 text-sm font-semibold text-white bg-professionalBlue hover:bg-blue-700 rounded-md transition-colors flex items-center gap-2"
            >
              {isSubmitting ? 'Guardando...' : (editingUnit ? 'Guardar Cambios' : 'Crear Unidad')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
