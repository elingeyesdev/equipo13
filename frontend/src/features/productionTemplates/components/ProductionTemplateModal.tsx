import React, { useEffect, useState } from 'react';
import { X, Factory, Leaf, AlertCircle, Loader2 } from 'lucide-react';
import { ProductionTemplate, CreateTemplatePayload, TemplateType } from '../types';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onSave: (payload: CreateTemplatePayload, id?: number) => Promise<void>;
  editingTemplate: ProductionTemplate | null;
  defaultType: TemplateType;
}

export const ProductionTemplateModal: React.FC<Props> = ({
  isOpen,
  onClose,
  onSave,
  editingTemplate,
  defaultType,
}) => {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [type, setType] = useState<TemplateType>(defaultType);
  const [error, setError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  // Sync form with editing target
  useEffect(() => {
    if (isOpen) {
      setName(editingTemplate?.name ?? '');
      setDescription(editingTemplate?.description ?? '');
      setType(editingTemplate?.type ?? defaultType);
      setError(null);
    }
  }, [isOpen, editingTemplate, defaultType]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setError('El nombre de la plantilla es obligatorio.');
      return;
    }

    setIsSaving(true);
    setError(null);

    try {
      await onSave(
        { name: name.trim(), description: description.trim() || null, type },
        editingTemplate?.id
      );
      onClose();
    } catch (err: any) {
      setError(err?.response?.data?.error ?? 'Ocurrió un error al guardar la plantilla.');
    } finally {
      setIsSaving(false);
    }
  };

  if (!isOpen) return null;

  const isIndustrial = type === 'Industrial';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Overlay */}
      <div
        className="absolute inset-0 bg-black/40 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal card */}
      <div className="relative bg-white rounded-2xl shadow-2xl border border-gray-200 w-full max-w-md animate-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <div className="flex items-center gap-3">
            <div className={`w-9 h-9 rounded-lg flex items-center justify-center ${isIndustrial ? 'bg-blue-50 text-professionalBlue' : 'bg-green-50 text-agroGreen'}`}>
              {isIndustrial ? <Factory className="w-5 h-5" /> : <Leaf className="w-5 h-5" />}
            </div>
            <h2 className="text-base font-bold text-gray-900">
              {editingTemplate ? 'Editar Plantilla' : 'Nueva Plantilla de Rubro'}
            </h2>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          {/* Type Switch */}
          <div>
            <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">
              Tipo de Línea
            </label>
            <div className="flex bg-gray-100 p-1 rounded-xl">
              {(['Industrial', 'Biológico'] as TemplateType[]).map((t) => (
                <button
                  key={t}
                  type="button"
                  onClick={() => setType(t)}
                  className={`flex-1 flex items-center justify-center gap-2 py-2 px-3 rounded-lg text-sm font-semibold transition-all ${
                    type === t
                      ? t === 'Industrial'
                        ? 'bg-white shadow-sm text-professionalBlue'
                        : 'bg-white shadow-sm text-agroGreen'
                      : 'text-gray-500 hover:text-charcoal'
                  }`}
                >
                  {t === 'Industrial' ? <Factory className="w-4 h-4" /> : <Leaf className="w-4 h-4" />}
                  {t === 'Industrial' ? 'Industrial' : 'Biológico'}
                </button>
              ))}
            </div>
          </div>

          {/* Name */}
          <div>
            <label htmlFor="tpl-name" className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">
              Nombre <span className="text-red-400">*</span>
            </label>
            <input
              id="tpl-name"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Ej: Talleres Metalmecánica, Agro Ganadero, Industria Textil..."
              className="w-full px-4 py-2.5 text-sm border border-gray-200 rounded-lg focus:ring-2 focus:ring-professionalBlue focus:border-professionalBlue outline-none transition-shadow"
              autoFocus
            />
          </div>

          {/* Description */}
          <div>
            <label htmlFor="tpl-desc" className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">
              Descripción <span className="text-gray-400 font-normal">(opcional)</span>
            </label>
            <textarea
              id="tpl-desc"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Describe brevemente para qué tipo de empresa o proceso aplica esta plantilla..."
              rows={3}
              className="w-full px-4 py-2.5 text-sm border border-gray-200 rounded-lg focus:ring-2 focus:ring-professionalBlue focus:border-professionalBlue outline-none transition-shadow resize-none"
            />
          </div>

          {/* Error */}
          {error && (
            <div className="flex items-start gap-2 bg-red-50 border border-red-200 text-red-700 text-sm px-4 py-3 rounded-lg">
              <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Actions */}
          <div className="flex gap-3 pt-1">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-2.5 rounded-lg border border-gray-200 text-sm font-semibold text-gray-600 hover:bg-gray-50 transition-colors"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={isSaving}
              className={`flex-1 py-2.5 rounded-lg text-sm font-semibold text-white shadow-sm transition-all active:scale-[0.98] disabled:opacity-60 flex items-center justify-center gap-2 ${
                isIndustrial
                  ? 'bg-professionalBlue hover:bg-blue-800'
                  : 'bg-agroGreen hover:bg-green-800'
              }`}
            >
              {isSaving && <Loader2 className="w-4 h-4 animate-spin" />}
              {editingTemplate ? 'Guardar Cambios' : 'Crear Plantilla'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
