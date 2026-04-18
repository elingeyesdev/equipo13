import React, { useEffect, useMemo, useState } from 'react';
import { X } from 'lucide-react';
import type { ProductionStage } from '../../productionStages/types';
import type { Material } from '../../materials/types';
import type { Unit } from '../../units/types';
import type { BomItemRow } from '../types';

interface BomItemModalProps {
  isOpen: boolean;
  onClose: () => void;
  productId: string;
  productType: 'Industrial' | 'Biológico';
  stages: ProductionStage[];
  materials: Material[];
  units: Unit[];
  editingItem: BomItemRow | null;
  defaultStageId?: number | null;
  onSave: (payload: {
    stage_id: number;
    material_id: string;
    quantity: number;
    unit_id: string;
    note: string | null;
  }) => Promise<void>;
}

export const BomItemModal: React.FC<BomItemModalProps> = ({
  isOpen,
  onClose,
  productId,
  productType,
  stages,
  materials,
  units,
  editingItem,
  defaultStageId,
  onSave,
}) => {
  const [stageId, setStageId] = useState<number | ''>('');
  const [materialId, setMaterialId] = useState('');
  const [quantity, setQuantity] = useState('1');
  const [unitId, setUnitId] = useState('');
  const [note, setNote] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const stageList = useMemo(
    () =>
      stages.filter((s) => s.type === productType).sort((a, b) => a.sequence_order - b.sequence_order),
    [stages, productType]
  );
  const materialOptions = materials.filter((m) => m.type === productType && m.id !== productId);
  const unitOptions = units.filter((u) => u.type === productType);

  useEffect(() => {
    if (!isOpen) return;
    setError(null);
    if (editingItem) {
      setStageId(editingItem.stage_id);
      setMaterialId(editingItem.material_id);
      setQuantity(String(editingItem.quantity));
      setUnitId(editingItem.unit_id);
      setNote(editingItem.note || '');
    } else {
      setStageId(defaultStageId ?? (stageList[0]?.id ?? ''));
      setMaterialId('');
      setQuantity('1');
      setUnitId('');
      setNote('');
    }
  }, [isOpen, editingItem, defaultStageId, stageList]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (stageId === '') {
      setError('Selecciona una etapa.');
      return;
    }
    if (!materialId) {
      setError('Selecciona un insumo.');
      return;
    }
    if (!unitId) {
      setError('Selecciona una unidad.');
      return;
    }
    const q = parseFloat(quantity.replace(',', '.'));
    if (Number.isNaN(q) || q <= 0) {
      setError('La cantidad debe ser mayor que 0.');
      return;
    }
    setSubmitting(true);
    try {
      await onSave({
        stage_id: Number(stageId),
        material_id: materialId,
        quantity: q,
        unit_id: unitId,
        note: note.trim() || null,
      });
      onClose();
    } catch (err: unknown) {
      const ax = err as { response?: { data?: { error?: string } } };
      setError(ax.response?.data?.error || 'No se pudo guardar la línea.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-lg border border-gray-100 overflow-hidden max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 sticky top-0 bg-white">
          <h3 className="text-lg font-semibold text-gray-900">
            {editingItem ? 'Editar insumo en BOM' : 'Agregar insumo a la receta'}
          </h3>
          <button type="button" onClick={onClose} className="p-1 rounded-lg text-gray-400 hover:bg-gray-100">
            <X className="w-5 h-5" />
          </button>
        </div>
        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Etapa de producción</label>
            <select
              value={stageId === '' ? '' : String(stageId)}
              onChange={(e) => setStageId(e.target.value ? Number(e.target.value) : '')}
              className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:ring-2 focus:ring-professionalBlue/30 outline-none"
            >
              <option value="">— Seleccionar —</option>
              {stageList.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.sequence_order}. {s.name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Insumo</label>
            <select
              value={materialId}
              onChange={(e) => {
                const v = e.target.value;
                setMaterialId(v);
                const mat = materials.find((m) => m.id === v);
                if (mat?.primary_unit_id) setUnitId(mat.primary_unit_id);
              }}
              className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:ring-2 focus:ring-professionalBlue/30 outline-none"
            >
              <option value="">— Seleccionar —</option>
              {materialOptions.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.name} ({m.id})
                </option>
              ))}
            </select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Cantidad</label>
              <input
                type="text"
                inputMode="decimal"
                value={quantity}
                onChange={(e) => setQuantity(e.target.value)}
                className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:ring-2 focus:ring-professionalBlue/30 outline-none"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Unidad</label>
              <select
                value={unitId}
                onChange={(e) => setUnitId(e.target.value)}
                className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:ring-2 focus:ring-professionalBlue/30 outline-none"
              >
                <option value="">— Seleccionar —</option>
                {unitOptions.map((u) => (
                  <option key={u.id} value={u.id}>
                    {u.name} ({u.abbreviation})
                  </option>
                ))}
              </select>
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Nota (opcional)</label>
            <input
              type="text"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="Ej. Merma 2%"
              className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:ring-2 focus:ring-professionalBlue/30 outline-none"
            />
          </div>
          {error && <p className="text-sm text-red-600">{error}</p>}
          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-gray-600 hover:bg-gray-100 rounded-lg"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="px-4 py-2 text-sm font-medium text-white bg-professionalBlue hover:bg-blue-700 rounded-lg disabled:opacity-50"
            >
              {submitting ? 'Guardando…' : editingItem ? 'Guardar cambios' : 'Agregar'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
