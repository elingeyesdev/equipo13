import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { materialService } from '../api/materialService';
import { unitService } from '../../units/api/unitService';
import { Material, CreateMaterialPayload, UpdateMaterialPayload } from '../types';
import { Unit } from '../../units/types';
import { MaterialModal } from '../components/MaterialModal';
import {
  Plus,
  Pencil,
  Trash2,
  Search,
  Filter,
  Factory,
  Leaf,
  ChevronLeft,
  ChevronRight,
  Beaker,
  Wheat,
  Syringe,
  Bug,
  Package,
} from 'lucide-react';

const PAGE_SIZE = 12;

type TabKey = 'all' | 'Industrial' | 'Biológico';

function getCategoryIcon(category: string | null) {
  if (!category) return null;
  const c = category.toLowerCase();
  if (c.includes('nutric')) return <Wheat className="w-3.5 h-3.5 shrink-0" />;
  if (c.includes('sanidad')) return <Syringe className="w-3.5 h-3.5 shrink-0" />;
  if (c.includes('biológ') || c.includes('activo')) return <Bug className="w-3.5 h-3.5 shrink-0" />;
  return null;
}

export const MaterialManagementPage = () => {
  const [materials, setMaterials] = useState<Material[]>([]);
  const [units, setUnits] = useState<Unit[]>([]);
  const [categoryOptions, setCategoryOptions] = useState<string[]>([]);
  const [globalStats, setGlobalStats] = useState({ total: 0, industrial: 0, biologico: 0 });
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [activeTab, setActiveTab] = useState<TabKey>('all');
  const [filterCategory, setFilterCategory] = useState<string | null>(null);
  const [showFilters, setShowFilters] = useState(false);
  const [page, setPage] = useState(1);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingMaterial, setEditingMaterial] = useState<Material | null>(null);

  const filterType = activeTab === 'all' ? null : activeTab;

  const mergeCategoriesFrom = useCallback((items: Material[]) => {
    setCategoryOptions((prev) => {
      const next = new Set(prev);
      items.forEach((m) => {
        if (m.category) next.add(m.category);
      });
      return Array.from(next).sort((a, b) => a.localeCompare(b, 'es'));
    });
  }, []);

  const refreshGlobalStats = useCallback(async () => {
    try {
      const res = await materialService.getAll();
      const data = res.data;
      setGlobalStats({
        total: data.length,
        industrial: data.filter((m) => m.type === 'Industrial').length,
        biologico: data.filter((m) => m.type === 'Biológico').length,
      });
    } catch {
      /* ignore */
    }
  }, []);

  const loadMaterials = useCallback(async () => {
    setIsLoading(true);
    try {
      const params: { type?: string; category?: string } = {};
      if (filterType) params.type = filterType;
      if (filterCategory) params.category = filterCategory;
      const matRes = await materialService.getAll(params);
      setMaterials(matRes.data);
      mergeCategoriesFrom(matRes.data);
    } catch (error) {
      console.error('Error loading materials', error);
    } finally {
      setIsLoading(false);
    }
  }, [filterType, filterCategory, mergeCategoriesFrom]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const unitRes = await unitService.getAll();
        if (!cancelled) setUnits(unitRes.data);
      } catch (error) {
        console.error('Error loading units', error);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    loadMaterials();
  }, [loadMaterials]);

  useEffect(() => {
    refreshGlobalStats();
  }, [refreshGlobalStats]);

  const filtered = useMemo(() => {
    if (!searchTerm.trim()) return materials;
    const lower = searchTerm.toLowerCase();
    return materials.filter(
      (m) =>
        m.id.toLowerCase().includes(lower) ||
        m.name.toLowerCase().includes(lower) ||
        (m.sku && m.sku.toLowerCase().includes(lower)) ||
        (m.category && m.category.toLowerCase().includes(lower)) ||
        (m.description && m.description.toLowerCase().includes(lower))
    );
  }, [materials, searchTerm]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));

  useEffect(() => {
    setPage(1);
  }, [searchTerm, filterType, filterCategory]);

  useEffect(() => {
    if (page > totalPages) setPage(totalPages);
  }, [page, totalPages]);

  const paginated = useMemo(() => {
    const start = (page - 1) * PAGE_SIZE;
    return filtered.slice(start, start + PAGE_SIZE);
  }, [filtered, page]);

  const rangeLabel = useMemo(() => {
    if (filtered.length === 0) return '0 resultados';
    const from = (page - 1) * PAGE_SIZE + 1;
    const to = Math.min(page * PAGE_SIZE, filtered.length);
    return `${from}–${to} de ${filtered.length}`;
  }, [filtered.length, page]);

  const handleDelete = async (id: string, name: string) => {
    if (!window.confirm(`¿Eliminar el insumo "${name}" (${id})?`)) return;
    try {
      await materialService.delete(id);
      setMaterials((prev) => prev.filter((m) => m.id !== id));
      await refreshGlobalStats();
    } catch (error: unknown) {
      const ax = error as { response?: { data?: { error?: string } } };
      alert(ax.response?.data?.error || 'Error al eliminar');
    }
  };

  const handleSaveMaterial = async (payload: CreateMaterialPayload) => {
    if (editingMaterial) {
      const body: UpdateMaterialPayload = {
        name: payload.name,
        type: payload.type,
        primary_unit_id: payload.primary_unit_id,
        sku: payload.sku,
        description: payload.description,
        category: payload.category,
        cost_standard: payload.cost_standard,
        stage: payload.stage,
      };
      await materialService.update(editingMaterial.id, body);
    } else {
      await materialService.create(payload);
    }
    await loadMaterials();
    await refreshGlobalStats();
  };

  const formatCost = (v: Material['cost_standard']) => {
    if (v === null || v === undefined || v === '') return '—';
    const n = typeof v === 'number' ? v : parseFloat(String(v));
    if (Number.isNaN(n)) return '—';
    return `Bs. ${n.toLocaleString('es-BO', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  const unitLabel = (m: Material) =>
    m.primary_unit_abbreviation || m.primary_unit_name || m.primary_unit_id;

  const tabs: { key: TabKey; label: string; count: number; icon?: React.ReactNode }[] = [
    { key: 'all', label: 'Todos', count: globalStats.total },
    {
      key: 'Industrial',
      label: 'Industriales',
      count: globalStats.industrial,
      icon: <Factory className="w-3.5 h-3.5" />,
    },
    {
      key: 'Biológico',
      label: 'Biológicos / Nutricionales',
      count: globalStats.biologico,
      icon: <Leaf className="w-3.5 h-3.5" />,
    },
  ];

  return (
    <div className="p-8 max-w-7xl mx-auto pb-12 space-y-6">
      {/* Barra superior (estilo Figma) */}
      <div className="flex flex-col xl:flex-row xl:items-center xl:justify-between gap-4 bg-white p-6 rounded-xl shadow-sm border border-gray-100">
        <div>
          <h1 className="text-2xl font-bold text-charcoal">Insumos y Materia Prima</h1>
          <p className="text-sm text-gray-500 mt-1">
            Seguimiento de insumos activos, precios y categorías para costeo.
          </p>
        </div>
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-[18px] h-[18px]" />
            <input
              type="text"
              placeholder="Buscar insumos…"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 pr-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-professionalBlue/30 focus:border-professionalBlue text-sm w-full sm:w-64 transition-all bg-gray-50 hover:bg-white text-charcoal"
            />
          </div>
          <button
            type="button"
            onClick={() => setShowFilters((v) => !v)}
            className={`flex items-center justify-center p-2.5 border rounded-lg transition-colors ${
              showFilters || filterCategory
                ? 'border-professionalBlue bg-blue-50 text-professionalBlue'
                : 'border-gray-300 text-gray-600 hover:bg-gray-50 hover:text-charcoal'
            }`}
            title="Filtros por categoría"
          >
            <Filter className="w-[18px] h-[18px]" />
          </button>
          <button
            type="button"
            onClick={() => {
              setEditingMaterial(null);
              setIsModalOpen(true);
            }}
            className="bg-professionalBlue hover:bg-blue-800 text-white px-4 py-2.5 rounded-lg font-medium flex items-center justify-center gap-2 shadow-sm transition-all active:scale-[0.98] whitespace-nowrap"
          >
            <Plus className="w-[18px] h-[18px]" />
            Agregar Insumo
          </button>
        </div>
      </div>

      {showFilters && (
        <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm flex flex-col sm:flex-row sm:items-center gap-3">
          <label htmlFor="cat-filter" className="text-sm font-medium text-gray-700 shrink-0">
            Categoría (servidor)
          </label>
          <select
            id="cat-filter"
            value={filterCategory ?? ''}
            onChange={(e) => setFilterCategory(e.target.value === '' ? null : e.target.value)}
            className="flex-1 max-w-md px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white focus:ring-2 focus:ring-professionalBlue/30 focus:border-professionalBlue outline-none"
          >
            <option value="">Todas las categorías</option>
            {categoryOptions.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
          <p className="text-xs text-gray-500 sm:ml-auto">
            Combinado con la pestaña de tipo (Industrial / Biológico).
          </p>
        </div>
      )}

      {/* Pestañas con contadores */}
      <div className="flex flex-wrap items-center gap-1 bg-white p-1.5 rounded-xl border border-gray-200 shadow-sm w-fit max-w-full">
        {tabs.map((tab) => {
          const active = activeTab === tab.key;
          return (
            <button
              key={tab.key}
              type="button"
              onClick={() => setActiveTab(tab.key)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-all flex items-center gap-2 ${
                active
                  ? tab.key === 'Biológico'
                    ? 'bg-agroGreen text-white shadow-sm'
                    : 'bg-charcoal text-white shadow-sm'
                  : 'text-gray-500 hover:text-charcoal hover:bg-gray-50'
              }`}
            >
              {tab.icon}
              {tab.label}
              <span
                className={`text-xs px-1.5 py-0.5 rounded-full ${
                  active ? 'bg-white/20' : 'bg-gray-100'
                }`}
              >
                {tab.count}
              </span>
            </button>
          );
        })}
      </div>

      {/* Grid de tarjetas */}
      {isLoading ? (
        <div className="flex justify-center py-20">
          <div className="animate-spin w-10 h-10 border-2 border-professionalBlue border-t-transparent rounded-full" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-16 bg-white rounded-xl border border-gray-200">
          <Beaker className="mx-auto text-gray-300 mb-4 w-12 h-12" />
          <p className="text-gray-600 font-medium">No se encontraron insumos</p>
          <p className="text-sm text-gray-400 mt-1">Probá cambiar filtros o el término de búsqueda.</p>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {paginated.map((m) => {
              const catIcon = getCategoryIcon(m.category);
              const isBio = m.type === 'Biológico';
              return (
                <div
                  key={m.id}
                  className={`bg-white rounded-xl shadow-sm hover:shadow-md transition-all duration-200 border border-gray-200 p-5 group flex flex-col h-full relative overflow-hidden ${
                    isBio ? 'border-l-[3px] border-l-agroGreen' : ''
                  }`}
                >
                  <div className="flex justify-between items-start gap-2 mb-3">
                    <span
                      className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold max-w-[70%] ${
                        isBio ? 'bg-green-50 text-agroGreen' : 'bg-blue-50 text-professionalBlue'
                      }`}
                    >
                      {catIcon}
                      <span className="truncate">{m.category || 'Sin categoría'}</span>
                    </span>
                    <div className="flex items-center gap-1 shrink-0">
                      <span className="text-xs text-gray-400 font-mono hidden sm:inline max-w-[4.5rem] truncate">
                        {m.id}
                      </span>
                      <div className="flex items-center gap-0.5 opacity-100 lg:opacity-0 lg:group-hover:opacity-100 transition-opacity">
                        <button
                          type="button"
                          onClick={() => {
                            setEditingMaterial(m);
                            setIsModalOpen(true);
                          }}
                          className="p-1 text-gray-400 hover:text-professionalBlue hover:bg-blue-50 rounded transition-colors"
                          title="Editar"
                        >
                          <Pencil className="w-[15px] h-[15px]" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDelete(m.id, m.name)}
                          className="p-1 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded transition-colors"
                          title="Eliminar"
                        >
                          <Trash2 className="w-[15px] h-[15px]" />
                        </button>
                      </div>
                    </div>
                  </div>

                  <h3 className="text-base font-bold text-charcoal mb-1 leading-tight group-hover:text-professionalBlue transition-colors line-clamp-2">
                    {m.name}
                  </h3>
                  {m.description && (
                    <p className="text-xs text-gray-400 mb-2 line-clamp-2">{m.description}</p>
                  )}

                  {m.stage && (
                    <div className="mb-3">
                      <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-semibold bg-green-100/70 text-agroGreen ring-1 ring-green-200/50">
                        Etapa: {m.stage}
                      </span>
                    </div>
                  )}

                  <div className="mt-auto pt-4 flex items-end justify-between border-t border-gray-100 gap-2">
                    <div className="min-w-0">
                      <p className="text-xs text-gray-500 mb-0.5 font-medium">Costo estándar</p>
                      <p className="text-xl font-bold text-charcoal tabular-nums truncate">
                        {formatCost(m.cost_standard)}
                      </p>
                    </div>
                    <div className="text-right shrink-0">
                      <p className="text-xs text-gray-500 mb-0.5 font-medium">Unidad</p>
                      <span className="inline-flex items-center gap-1 bg-gray-100 text-gray-700 px-3 py-1 rounded-md text-sm font-mono font-semibold">
                        <Package className="w-3 h-3 text-gray-400" />
                        {unitLabel(m)}
                      </span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {totalPages > 1 && (
            <div className="flex flex-col sm:flex-row items-center justify-between gap-3 px-2 py-2 text-sm text-gray-600">
              <span className="tabular-nums">{rangeLabel}</span>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  disabled={page <= 1}
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg border border-gray-200 bg-white hover:bg-gray-50 disabled:opacity-40 disabled:pointer-events-none text-charcoal"
                >
                  <ChevronLeft className="w-4 h-4" /> Anterior
                </button>
                <span className="px-2 tabular-nums text-gray-700">
                  Página {page} / {totalPages}
                </span>
                <button
                  type="button"
                  disabled={page >= totalPages}
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg border border-gray-200 bg-white hover:bg-gray-50 disabled:opacity-40 disabled:pointer-events-none text-charcoal"
                >
                  Siguiente <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}
        </>
      )}

      <MaterialModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSave={handleSaveMaterial}
        editingMaterial={editingMaterial}
        units={units}
      />
    </div>
  );
};
