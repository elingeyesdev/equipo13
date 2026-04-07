import React, { useState, useEffect } from 'react';
import { UnitConversion, CreateConversionDTO, UpdateConversionDTO } from '../types';
import { Unit } from '../../units/types';
import { X, ArrowRight } from 'lucide-react';

interface ConversionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (payload: CreateConversionDTO | UpdateConversionDTO) => Promise<void>;
  editingConversion: UnitConversion | null;
  units: Unit[];
}

export const ConversionModal: React.FC<ConversionModalProps> = ({ isOpen, onClose, onSave, editingConversion, units }) => {
  const [formData, setFormData] = useState({
    source_unit_id: '',
    target_unit_id: '',
    factor: 1,
    type: 'Industrial' as 'Industrial' | 'Biológico' | null,
    note: ''
  });
  
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (editingConversion) {
      setFormData({
        source_unit_id: editingConversion.source_unit_id,
        target_unit_id: editingConversion.target_unit_id,
        factor: Number(editingConversion.factor),
        type: editingConversion.type || 'Industrial',
        note: editingConversion.note || ''
      });
    } else {
      setFormData({
        source_unit_id: '',
        target_unit_id: '',
        factor: 1,
        type: 'Industrial',
        note: ''
      });
    }
    setError(null);
  }, [editingConversion, isOpen]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError(null);

    try {
      if (formData.source_unit_id === formData.target_unit_id) {
        throw new Error('La unidad de origen y destino no pueden ser la misma.');
      }
      if (formData.factor <= 0) {
        throw new Error('El factor de conversión debe ser mayor a 0.');
      }

      await onSave({
        ...formData,
        type: formData.type === null ? undefined : formData.type
      });
      onClose();
    } catch (err: any) {
      setError(err.response?.data?.error || err.message || 'Error al guardar la conversión');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Group units by category for a cleaner dropdown
  const industrialUnits = units.filter(u => u.category === 'Industrial');
  const biologicalUnits = units.filter(u => u.category === 'Biológico');

  const renderUnitOptions = () => (
    <>
      <option value="" disabled>-- Selecciona --</option>
      {industrialUnits.length > 0 && (
        <optgroup label="Industrial">
          {industrialUnits.map(u => <option key={u.id} value={u.id}>{u.name} ({u.abbreviation})</option>)}
        </optgroup>
      )}
      {biologicalUnits.length > 0 && (
        <optgroup label="Biológica">
          {biologicalUnits.map(u => <option key={u.id} value={u.id}>{u.name} ({u.abbreviation})</option>)}
        </optgroup>
      )}
    </>
  );

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-lg overflow-hidden border border-gray-100 flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 bg-gray-50/50">
          <h2 className="text-xl font-bold text-charcoal tracking-tight">
            {editingConversion ? 'Editar Equivalencia' : 'Nueva Equivalencia'}
          </h2>
          <button 
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 hover:bg-white p-1 rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-professionalBlue"
          >
            <X size={20} />
          </button>
        </div>

        {/* Content */}
        <form onSubmit={handleSubmit} className="p-6 flex-1 flex flex-col gap-5 overflow-y-auto">
          {error && (
            <div className="bg-red-50 text-red-700 p-3 rounded-lg text-sm border border-red-200 font-medium">
              Ocurrió un error: {error}
            </div>
          )}

          {/* Unit selection side by side */}
          <div className="flex flex-col gap-4">
            <div className="grid grid-cols-[1fr_auto_1fr] items-end gap-3">
              <div className="flex flex-col gap-1.5">
                <label className="text-sm font-semibold text-charcoal">De (Origen)</label>
                <select
                  required
                  value={formData.source_unit_id}
                  onChange={e => setFormData({...formData, source_unit_id: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-professionalBlue focus:border-professionalBlue outline-none text-sm transition-shadow appearance-none bg-white"
                >
                  {renderUnitOptions()}
                </select>
              </div>

              <div className="pb-3 text-gray-400 flex justify-center">
                <ArrowRight size={20} />
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-sm font-semibold text-charcoal">A (Destino)</label>
                <select
                  required
                  value={formData.target_unit_id}
                  onChange={e => setFormData({...formData, target_unit_id: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-professionalBlue focus:border-professionalBlue outline-none text-sm transition-shadow appearance-none bg-white"
                >
                  {renderUnitOptions()}
                </select>
              </div>
            </div>
            {formData.source_unit_id && formData.target_unit_id && formData.source_unit_id === formData.target_unit_id && (
              <p className="text-xs text-red-500 font-medium text-center">No puedes usar la misma unidad.</p>
            )}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-semibold text-charcoal">Factor de Multiplicación</label>
              <input
                type="number"
                step="0.000001"
                min="0.000001"
                required
                value={formData.factor}
                onChange={e => setFormData({...formData, factor: parseFloat(e.target.value) || 0})}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-professionalBlue focus:border-professionalBlue outline-none font-mono text-sm"
                placeholder="Ej. 1000"
              />
              <p className="text-[11px] text-gray-500">1 Origen = {formData.factor} Destino</p>
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-semibold text-charcoal">Categoría</label>
              <select
                required
                value={formData.type || ''}
                onChange={e => setFormData({...formData, type: (e.target.value as 'Industrial' | 'Biológico') || null})}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-professionalBlue focus:border-professionalBlue outline-none text-sm bg-white"
              >
                <option value="Industrial">Industrial</option>
                <option value="Biológico">Biológico</option>
              </select>
            </div>
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-semibold text-charcoal">Nota (Opcional)</label>
            <textarea
              value={formData.note}
              onChange={e => setFormData({...formData, note: e.target.value})}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-professionalBlue focus:border-professionalBlue outline-none text-sm resize-none"
              placeholder="Ej. Equivalencia oficial estándar"
              rows={2}
            />
          </div>

          {/* Footer actions */}
          <div className="flex justify-end gap-3 mt-4 pt-4 border-t border-gray-100">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="px-5 py-2.5 rounded-lg font-medium text-gray-600 hover:text-charcoal hover:bg-gray-100 transition-colors"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="bg-professionalBlue hover:bg-blue-800 text-white px-5 py-2.5 rounded-lg font-medium shadow-sm transition-colors flex items-center gap-2 disabled:opacity-70"
            >
              {isSubmitting && <div className="w-4 h-4 border-2 border-white rounded-full border-t-transparent animate-spin" />}
              {editingConversion ? 'Guardar Cambios' : 'Crear Factor'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
