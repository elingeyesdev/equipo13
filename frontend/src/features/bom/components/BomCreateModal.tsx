import React, { useEffect, useState } from 'react';
import { X } from 'lucide-react';
import type { Material, MaterialType } from '../../materials/types';

interface BomCreateModalProps {
  isOpen: boolean;
  onClose: () => void;
  productType: MaterialType;
  materials: Material[];
  onCreate: (payload: { product_id: string; name?: string | null; base_quantity: number }) => Promise<void>;
}

export const BomCreateModal: React.FC<BomCreateModalProps> = ({
  isOpen,
  onClose,
  productType,
  materials,
  onCreate,
}) => {
  const [productId, setProductId] = useState('');
  const [name, setName] = useState('');
  const [baseQty, setBaseQty] = useState('1');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const options = materials.filter((m) => m.type === productType);

  useEffect(() => {
    if (isOpen) {
      setProductId('');
      setName('');
      setBaseQty('1');
      setError(null);
    }
  }, [isOpen, productType]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    const q = parseFloat(baseQty.replace(',', '.'));
    if (!productId) {
      setError('Selecciona un producto.');
      return;
    }
    if (Number.isNaN(q) || q <= 0) {
      setError('La cantidad base debe ser mayor que 0.');
      return;
    }
    setSubmitting(true);
    try {
      await onCreate({
        product_id: productId,
        name: name.trim() || null,
        base_quantity: q,
      });
      onClose();
    } catch (err: unknown) {
      const ax = err as { response?: { data?: { error?: string } } };
      setError(ax.response?.data?.error || 'No se pudo crear la lista BOM.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-md border border-gray-100 overflow-hidden">
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
          <h3 className="text-lg font-semibold text-gray-900">Nueva lista BOM</h3>
          <button type="button" onClick={onClose} className="p-1 rounded-lg text-gray-400 hover:bg-gray-100">
            <X className="w-5 h-5" />
          </button>
        </div>
        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Producto terminado</label>
            <select
              value={productId}
              onChange={(e) => setProductId(e.target.value)}
              className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:ring-2 focus:ring-professionalBlue/30 focus:border-professionalBlue outline-none"
            >
              <option value="">— Seleccionar —</option>
              {options.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.name} ({m.id})
                </option>
              ))}
            </select>
            <p className="text-xs text-gray-500 mt-1">
              El producto debe existir como insumo en el catálogo (mismo rubro: {productType}).
            </p>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Nombre de la receta (opcional)</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Ej. Fórmula estándar 2026"
              className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:ring-2 focus:ring-professionalBlue/30 outline-none"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Cantidad base de salida</label>
            <input
              type="text"
              inputMode="decimal"
              value={baseQty}
              onChange={(e) => setBaseQty(e.target.value)}
              className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:ring-2 focus:ring-professionalBlue/30 outline-none"
            />
            <p className="text-xs text-gray-500 mt-1">Unidades del producto para las que aplican las cantidades de insumos.</p>
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
              {submitting ? 'Creando…' : 'Crear BOM'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
