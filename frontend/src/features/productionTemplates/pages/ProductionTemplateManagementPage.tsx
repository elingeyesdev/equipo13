import React, { useCallback, useEffect, useState } from 'react';
import {
  Plus,
  Pencil,
  Trash2,
  Factory,
  Leaf,
  LayoutTemplate,
  Search,
} from 'lucide-react';
import { ProductionTemplate, CreateTemplatePayload, TemplateType } from '../types';
import { productionTemplateService } from '../api/productionTemplateService';
import { ProductionTemplateModal } from '../components/ProductionTemplateModal';
import { DeleteConfirmModal } from '../components/DeleteConfirmModal';

// ── Predefined model cards shown at the top ─────────────────────────────────
const PREDEFINED_MODELS: { name: string; type: TemplateType; description: string }[] = [
  {
    name: 'Agro Ganadero',
    type: 'Biológico',
    description: 'Para empresas de crianza de animales, engorde y producción pecuaria.',
  },
  {
    name: 'Agro Agrícola',
    type: 'Biológico',
    description: 'Para cultivos, cosecha y procesamiento primario de productos agropecuarios.',
  },
  {
    name: 'Talleres Metalmecánica',
    type: 'Industrial',
    description: 'Para fabricación de piezas, soldadura y transformación de metales.',
  },
  {
    name: 'Industria Textil',
    type: 'Industrial',
    description: 'Para confección, corte y manufactura de productos textiles.',
  },
  {
    name: 'Industria Alimentos',
    type: 'Industrial',
    description: 'Para producción de alimentos procesados y balanceados.',
  },
  {
    name: 'Industria Plásticos',
    type: 'Industrial',
    description: 'Para inyección, extrusión y moldeado de piezas plásticas.',
  },
];

type TabKey = 'Industrial' | 'Biológico';

// ── Helpers ──────────────────────────────────────────────────────────────────

const TypeBadge = ({ type }: { type: TemplateType }) =>
  type === 'Industrial' ? (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-blue-50 text-professionalBlue text-[10px] font-bold uppercase tracking-wider">
      <Factory className="w-3 h-3" /> Industrial
    </span>
  ) : (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-green-50 text-agroGreen text-[10px] font-bold uppercase tracking-wider">
      <Leaf className="w-3 h-3" /> Biológico
    </span>
  );

// ─────────────────────────────────────────────────────────────────────────────

export default function ProductionTemplateManagementPage() {
  const [activeTab, setActiveTab] = useState<TabKey>('Industrial');
  const [templates, setTemplates] = useState<ProductionTemplate[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  // Modal state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<ProductionTemplate | null>(null);

  // Delete confirm modal state
  const [deleteTarget, setDeleteTarget] = useState<{ id: number; name: string } | null>(null);

  // Toast
  const [notification, setNotification] = useState<{ type: 'success' | 'error'; msg: string } | null>(null);
  const showNotification = useCallback((type: 'success' | 'error', msg: string) => {
    setNotification({ type, msg });
    setTimeout(() => setNotification(null), 3500);
  }, []);

  const loadTemplates = useCallback(async () => {
    setIsLoading(true);
    try {
      const { data } = await productionTemplateService.getAll(activeTab);
      setTemplates(data);
    } catch {
      showNotification('error', 'Error al cargar las plantillas.');
    } finally {
      setIsLoading(false);
    }
  }, [activeTab, showNotification]);

  useEffect(() => {
    loadTemplates();
  }, [loadTemplates]);

  // ── CRUD handlers ──────────────────────────────────────────────────────────

  const handleSave = async (payload: CreateTemplatePayload, id?: number) => {
    if (id) {
      await productionTemplateService.update(id, payload);
      showNotification('success', 'Plantilla actualizada correctamente.');
    } else {
      await productionTemplateService.create(payload);
      showNotification('success', 'Plantilla creada correctamente.');
    }
    loadTemplates();
  };

  const handleDeleteRequest = (id: number, name: string) => {
    setDeleteTarget({ id, name });
  };

  const handleDeleteConfirm = async () => {
    if (!deleteTarget) return;
    const { id, name } = deleteTarget;
    setDeleteTarget(null);
    try {
      await productionTemplateService.delete(id);
      showNotification('success', `Plantilla "${name}" eliminada.`);
      loadTemplates();
    } catch (err: any) {
      showNotification('error', err?.response?.data?.error ?? 'Error al eliminar la plantilla.');
    }
  };

  // ── Quick-add predefined model ─────────────────────────────────────────────
  const handleAddPredefined = async (model: typeof PREDEFINED_MODELS[0]) => {
    try {
      await productionTemplateService.create({
        name: model.name,
        description: model.description,
        type: model.type,
      });
      showNotification('success', `Plantilla "${model.name}" añadida.`);
      if (activeTab !== model.type) setActiveTab(model.type as TabKey);
      else loadTemplates();
    } catch (err: any) {
      showNotification('error', err?.response?.data?.error ?? 'No se pudo añadir la plantilla.');
    }
  };

  // ── Derived data ───────────────────────────────────────────────────────────
  const filtered = templates.filter((t) =>
    t.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (t.description ?? '').toLowerCase().includes(searchTerm.toLowerCase())
  );

  const predefinedForTab = PREDEFINED_MODELS.filter((m) => m.type === activeTab);

  return (
    <div className="space-y-6 max-w-6xl mx-auto p-4 sm:p-8 pb-12">
      {/* Toast */}
      {notification && (
        <div
          className={`fixed top-5 right-5 z-50 flex items-center gap-3 px-5 py-3.5 rounded-xl shadow-lg border text-sm font-medium animate-in slide-in-from-right-4 duration-300 ${
            notification.type === 'success'
              ? 'bg-green-50 border-green-200 text-green-800'
              : 'bg-red-50 border-red-200 text-red-800'
          }`}
        >
          {notification.msg}
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 rounded-xl shadow-sm border border-gray-100">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-professionalBlue to-agroGreen flex items-center justify-center shadow">
            <LayoutTemplate className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-charcoal">Plantillas de Rubro</h1>
            <p className="text-sm text-gray-500 mt-0.5">
              Modelos predefinidos de costeo por línea de producción.
            </p>
          </div>
        </div>
        <button
          onClick={() => { setEditingTemplate(null); setIsModalOpen(true); }}
          className="bg-professionalBlue hover:bg-blue-800 text-white px-5 py-2.5 rounded-lg font-medium flex items-center justify-center gap-2 shadow-sm transition-all active:scale-[0.98]"
        >
          <Plus className="w-[18px] h-[18px]" />
          Nueva Plantilla
        </button>
      </div>

      {/* Predefined Model Suggestions ──────────────────────────────────────── */}
      <div className="bg-gradient-to-r from-slate-50 to-gray-50 border border-gray-200 rounded-xl p-5">
        <p className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-4">
          Modelos predefinidos — Selección rápida
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {PREDEFINED_MODELS.map((model) => (
            <button
              key={model.name}
              onClick={() => handleAddPredefined(model)}
              className="group text-left bg-white border border-gray-200 hover:border-professionalBlue hover:shadow-md rounded-xl p-4 transition-all duration-200"
            >
              <div className="flex items-start justify-between gap-2 mb-2">
                <TypeBadge type={model.type} />
                <Plus className="w-4 h-4 text-gray-300 group-hover:text-professionalBlue transition-colors shrink-0 mt-0.5" />
              </div>
              <p className="text-sm font-bold text-gray-900 group-hover:text-professionalBlue transition-colors">
                {model.name}
              </p>
              <p className="text-xs text-gray-500 mt-1 leading-relaxed">{model.description}</p>
            </button>
          ))}
        </div>
      </div>

      {/* Tabs + Search ─────────────────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center gap-3 justify-between">
        <div className="flex bg-gray-100 p-1.5 rounded-xl w-fit">
          <button
            className={`flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-semibold transition-all ${
              activeTab === 'Industrial'
                ? 'bg-white text-professionalBlue shadow-sm border border-gray-200/60'
                : 'text-gray-500 hover:text-charcoal'
            }`}
            onClick={() => setActiveTab('Industrial')}
          >
            <Factory className="w-4 h-4" /> Línea Industrial
          </button>
          <button
            className={`flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-semibold transition-all ${
              activeTab === 'Biológico'
                ? 'bg-white text-agroGreen shadow-sm border border-gray-200/60'
                : 'text-gray-500 hover:text-charcoal'
            }`}
            onClick={() => setActiveTab('Biológico')}
          >
            <Leaf className="w-4 h-4" /> Línea Biológica
          </button>
        </div>

        {/* Search */}
        <div className="relative w-full sm:max-w-xs">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
          <input
            type="text"
            placeholder="Buscar plantilla..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-4 py-2 text-sm border border-gray-200 rounded-lg focus:ring-2 focus:ring-professionalBlue focus:border-professionalBlue outline-none transition-shadow"
          />
        </div>
      </div>

      {/* Template List ─────────────────────────────────────────────────────── */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        <div className="bg-gray-50 border-b border-gray-200 px-6 py-3 flex items-center justify-between">
          <p className="text-sm font-semibold text-gray-700">
            Plantillas registradas — {activeTab}
          </p>
          <span className="text-xs text-gray-400 bg-gray-100 px-2.5 py-1 rounded-full font-semibold">
            {filtered.length} {filtered.length === 1 ? 'plantilla' : 'plantillas'}
          </span>
        </div>

        {isLoading ? (
          <div className="flex justify-center items-center py-16">
            <div className="animate-spin w-8 h-8 border-2 border-professionalBlue border-t-transparent rounded-full" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-gray-400">
            <LayoutTemplate className="w-12 h-12 mb-3 opacity-20" />
            <p className="font-medium">
              {searchTerm ? 'No hay coincidencias' : 'No hay plantillas registradas'}
            </p>
            <p className="text-sm mt-1 mb-4">
              {searchTerm
                ? 'Intenta con otro término de búsqueda.'
                : 'Selecciona un modelo predefinido arriba o crea uno personalizado.'}
            </p>
            {!searchTerm && (
              <button
                onClick={() => { setEditingTemplate(null); setIsModalOpen(true); }}
                className="text-sm text-professionalBlue font-medium underline"
              >
                Crear plantilla personalizada
              </button>
            )}
          </div>
        ) : (
          <div className="divide-y divide-gray-100">
            {filtered.map((tpl) => (
              <div
                key={tpl.id}
                className="flex items-center gap-4 px-6 py-4 hover:bg-gray-50/80 group transition-colors"
              >
                <div
                  className={`w-10 h-10 rounded-lg flex items-center justify-center shrink-0 ${
                    tpl.type === 'Industrial' ? 'bg-blue-50' : 'bg-green-50'
                  }`}
                >
                  {tpl.type === 'Industrial' ? (
                    <Factory className="w-5 h-5 text-professionalBlue" />
                  ) : (
                    <Leaf className="w-5 h-5 text-agroGreen" />
                  )}
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h3 className="text-sm font-bold text-gray-900">{tpl.name}</h3>
                    <TypeBadge type={tpl.type} />
                  </div>
                  {tpl.description && (
                    <p className="text-xs text-gray-500 mt-0.5 truncate">{tpl.description}</p>
                  )}
                </div>

                <div className="flex items-center gap-1 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button
                    onClick={() => { setEditingTemplate(tpl); setIsModalOpen(true); }}
                    className="p-2 text-gray-400 hover:text-professionalBlue hover:bg-blue-50 rounded-lg transition-colors"
                    title="Editar"
                  >
                    <Pencil className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => handleDeleteRequest(tpl.id, tpl.name)}
                    className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                    title="Eliminar"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Modal */}
      <ProductionTemplateModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSave={handleSave}
        editingTemplate={editingTemplate}
        defaultType={activeTab}
      />

      <DeleteConfirmModal
        isOpen={!!deleteTarget}
        templateName={deleteTarget?.name ?? ''}
        onConfirm={handleDeleteConfirm}
        onCancel={() => setDeleteTarget(null)}
      />
    </div>
  );
}
