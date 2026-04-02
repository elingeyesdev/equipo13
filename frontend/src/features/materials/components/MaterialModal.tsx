import React, { useEffect, useState } from 'react';
import { Material, CreateMaterialPayload } from '../types';
import { Unit } from '../../units/types';
import { X, Factory, Leaf } from 'lucide-react';

interface MaterialModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (payload: CreateMaterialPayload) => Promise<void>;
  editingMaterial: Material | null;
  units: Unit[];
}

const emptyForm = (): CreateMaterialPayload => ({
  id: '',
  name: '',
  type: 'Industrial',
  primary_unit_id: '',
  sku: '',
  description: '',
  category: '',
  cost_standard: null,
  stage: '',
});

export const MaterialModal: React.FC<MaterialModalProps> = ({
  isOpen,
  onClose,
  onSave,
  editingMaterial,
  units,
}) => {
  const [formData, setFormData] = useState<CreateMaterialPayload>(emptyForm);
  const [costInput, setCostInput] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (editingMaterial) {
      const cs = editingMaterial.cost_standard;
      setCostInput(
        cs === null || cs === undefined || cs === ''
          ? ''
          : String(typeof cs === 'number' ? cs : parseFloat(String(cs)))
      );
      setFormData({
        id: editingMaterial.id,
        name: editingMaterial.name,
        type: editingMaterial.type,
        primary_unit_id: editingMaterial.primary_unit_id,
        sku: editingMaterial.sku ?? '',
        description: editingMaterial.description ?? '',
        category: editingMaterial.category ?? '',
        cost_standard:
          cs === null || cs === undefined || cs === ''
            ? null
            : typeof cs === 'number'
              ? cs
              : parseFloat(String(cs)),
        stage: editingMaterial.stage ?? '',
      });
    } else {
      setCostInput('');
      setFormData(emptyForm());
    }
    setError(null);
  }, [editingMaterial, isOpen]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsSubmitting(true);

    const costNum =
      costInput.trim() === '' ? null : Number.parseFloat(costInput.replace(',', '.'));
    if (costInput.trim() !== '' && Number.isNaN(costNum)) {
      setError('El costo estándar debe ser un número válido');
      setIsSubmitting(false);
      return;
    }

    try {
      const payload: CreateMaterialPayload = {
        ...formData,
        sku: formData.sku === '' ? null : formData.sku,
        description: formData.description === '' ? null : formData.description,
        category: formData.category === '' ? null : formData.category,
        stage: formData.stage === '' ? null : formData.stage,
        cost_standard: costNum,
      };
      await onSave(payload);
      onClose();
    } catch (err: unknown) {
      const ax = err as { response?: { data?: { error?: string } } };
      setError(ax.response?.data?.error || 'Error al guardar el insumo');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] flex flex-col overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-100 flex justify-between items-center shrink-0">
          <h3 className="text-lg font-bold text-charcoal">
            {editingMaterial ? 'Editar insumo / materia prima' : 'Agregar nuevo insumo / materia prima'}
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
            {units.length === 0 && (
              <div className="p-3 bg-amber-50 text-amber-900 rounded-lg text-sm border border-amber-200">
                No hay unidades de medida cargadas. Crea al menos una en{' '}
                <span className="font-semibold">Unidades de Medida</span> antes de registrar un insumo.
              </div>
            )}
            {error && (
              <div className="p-3 bg-red-50 text-red-600 rounded-lg text-sm border border-red-200">{error}</div>
            )}

            <div>
              <p className="block text-sm font-medium text-gray-700 mb-2">Tipo de insumo</p>
              <div className="flex gap-3">
                <label className="flex-1 relative cursor-pointer">
                  <input
                    type="radio"
                    name="material-type"
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
                    name="material-type"
                    checked={formData.type === 'Biológico'}
                    onChange={() => setFormData({ ...formData, type: 'Biológico' })}
                    className="peer sr-only"
                  />
                  <div className="flex items-center justify-center gap-2 px-4 py-3 rounded-xl border-2 border-gray-200 peer-checked:border-agroGreen peer-checked:bg-green-50/60 transition-all">
                    <Leaf className="w-4 h-4 text-agroGreen" />
                    <span className="text-sm font-semibold text-gray-700">Biológico / Nutrición</span>
                  </div>
                </label>
              </div>
            </div>

            {!editingMaterial && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">ID del insumo</label>
                <input
                  type="text"
                  required
                  value={formData.id}
                  onChange={(e) => setFormData({ ...formData, id: e.target.value })}
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-professionalBlue/40 focus:border-professionalBlue text-sm bg-gray-50 hover:bg-white transition-colors"
                  placeholder="ej: RM-015, BIO-008"
                />
              </div>
            )}

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Nombre del material / insumo</label>
              <input
                type="text"
                required
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-professionalBlue/40 focus:border-professionalBlue text-sm bg-gray-50 hover:bg-white transition-colors"
                placeholder="Ej: Lámina de acero, alimento iniciador…"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Categoría (opcional)</label>
                <input
                  type="text"
                  value={formData.category ?? ''}
                  onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-professionalBlue/40 focus:border-professionalBlue text-sm bg-gray-50 hover:bg-white transition-colors"
                  placeholder="Sanidad, Nutrición…"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Unidad primaria</label>
                <select
                  required
                  value={formData.primary_unit_id}
                  onChange={(e) => setFormData({ ...formData, primary_unit_id: e.target.value })}
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-professionalBlue/40 focus:border-professionalBlue text-sm bg-gray-50 hover:bg-white cursor-pointer"
                >
                  <option value="">Seleccionar…</option>
                  {units.map((u) => (
                    <option key={u.id} value={u.id}>
                      {u.name} ({u.abbreviation})
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Costo estándar (Bs.)</label>
                <input
                  type="text"
                  inputMode="decimal"
                  value={costInput}
                  onChange={(e) => setCostInput(e.target.value)}
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-professionalBlue/40 focus:border-professionalBlue text-sm bg-gray-50 hover:bg-white transition-colors"
                  placeholder="0.00"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">SKU (opcional)</label>
                <input
                  type="text"
                  value={formData.sku ?? ''}
                  onChange={(e) => setFormData({ ...formData, sku: e.target.value })}
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-professionalBlue/40 focus:border-professionalBlue text-sm bg-gray-50 hover:bg-white transition-colors"
                  placeholder="Código interno"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Etapa productiva (opcional)</label>
              <input
                type="text"
                value={formData.stage ?? ''}
                onChange={(e) => setFormData({ ...formData, stage: e.target.value })}
                className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-professionalBlue/40 focus:border-professionalBlue text-sm bg-gray-50 hover:bg-white transition-colors"
                placeholder="Cría, Engorde…"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Descripción breve (opcional)</label>
              <textarea
                rows={2}
                value={formData.description ?? ''}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-professionalBlue/40 focus:border-professionalBlue text-sm bg-gray-50 hover:bg-white resize-none"
                placeholder="Características o notas…"
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
              {isSubmitting ? 'Guardando…' : editingMaterial ? 'Guardar cambios' : 'Guardar insumo'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
