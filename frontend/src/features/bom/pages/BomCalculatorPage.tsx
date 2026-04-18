import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Calculator,
  Factory,
  Leaf,
  Pencil,
  Plus,
  Trash2,
  Package,
  Save,
} from 'lucide-react';
import { bomService } from '../api/bomService';
import { materialService } from '../../materials/api/materialService';
import { unitService } from '../../units/api/unitService';
import { productionStageService } from '../../productionStages/api/productionStageService';
import type { BomDetail, BomItemRow, BomListRow } from '../types';
import type { Material } from '../../materials/types';
import type { Unit } from '../../units/types';
import type { ProductionStage } from '../../productionStages/types';
import { BomCreateModal } from '../components/BomCreateModal';
import { BomItemModal } from '../components/BomItemModal';

type TabKey = 'Industrial' | 'Biológico';

export const BomCalculatorPage: React.FC = () => {
  const [tab, setTab] = useState<TabKey>('Industrial');
  const [boms, setBoms] = useState<BomListRow[]>([]);
  const [detail, setDetail] = useState<BomDetail | null>(null);
  const [materials, setMaterials] = useState<Material[]>([]);
  const [units, setUnits] = useState<Unit[]>([]);
  const [stages, setStages] = useState<ProductionStage[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingDetail, setLoadingDetail] = useState(false);

  const [createOpen, setCreateOpen] = useState(false);
  const [itemModalOpen, setItemModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<BomItemRow | null>(null);
  const [defaultStageId, setDefaultStageId] = useState<number | null>(null);

  const [headerName, setHeaderName] = useState('');
  const [headerBaseQty, setHeaderBaseQty] = useState('');
  const [savingHeader, setSavingHeader] = useState(false);

  const [notification, setNotification] = useState<{ type: 'success' | 'error'; msg: string } | null>(null);

  const showNotification = useCallback((type: 'success' | 'error', msg: string) => {
    setNotification({ type, msg });
    setTimeout(() => setNotification(null), 4000);
  }, []);

  const loadCatalogs = useCallback(async () => {
    const [matRes, unitsRes, stagesRes] = await Promise.all([
      materialService.getAll(),
      unitService.getAll(),
      productionStageService.getAll(),
    ]);
    setMaterials(matRes.data);
    setUnits(unitsRes.data);
    setStages(stagesRes.data);
  }, []);

  const loadBoms = useCallback(async () => {
    const res = await bomService.getAll();
    setBoms(res.data);
  }, []);

  const bootstrap = useCallback(async () => {
    setLoading(true);
    try {
      await Promise.all([loadCatalogs(), loadBoms()]);
    } catch {
      showNotification('error', 'No se pudo cargar el catálogo o las listas BOM.');
    } finally {
      setLoading(false);
    }
  }, [loadBoms, loadCatalogs, showNotification]);

  useEffect(() => {
    bootstrap();
  }, [bootstrap]);

  const filteredBoms = useMemo(() => boms.filter((b) => b.product_type === tab), [boms, tab]);

  const refreshDetail = async (id: number) => {
    setLoadingDetail(true);
    try {
      const res = await bomService.getById(id);
      setDetail(res.data);
      setHeaderName(res.data.name || '');
      setHeaderBaseQty(String(res.data.base_quantity));
    } catch {
      showNotification('error', 'No se pudo cargar el detalle del BOM.');
    } finally {
      setLoadingDetail(false);
    }
  };

  const selectBom = async (row: BomListRow) => {
    await refreshDetail(row.id);
  };

  const handleCreateBom = async (payload: { product_id: string; name?: string | null; base_quantity: number }) => {
    const res = await bomService.create(payload);
    await loadBoms();
    setDetail(res.data);
    setHeaderName(res.data.name || '');
    setHeaderBaseQty(String(res.data.base_quantity));
    showNotification('success', 'Lista BOM creada. Agrega insumos por etapa.');
  };

  const handleSaveHeader = async () => {
    if (!detail) return;
    const q = parseFloat(headerBaseQty.replace(',', '.'));
    if (Number.isNaN(q) || q <= 0) {
      showNotification('error', 'La cantidad base debe ser mayor que 0.');
      return;
    }
    setSavingHeader(true);
    try {
      const res = await bomService.update(detail.id, {
        name: headerName.trim() || null,
        base_quantity: q,
        template_id: detail.template_id,
      });
      setDetail(res.data);
      await loadBoms();
      showNotification('success', 'Datos de la receta actualizados.');
    } catch (err: unknown) {
      const ax = err as { response?: { data?: { error?: string } } };
      showNotification('error', ax.response?.data?.error || 'Error al guardar.');
    } finally {
      setSavingHeader(false);
    }
  };

  const handleDeleteBom = async () => {
    if (!detail) return;
    if (!window.confirm(`¿Eliminar la lista BOM de "${detail.product_name}"? Esta acción no se puede deshacer.`)) {
      return;
    }
    try {
      await bomService.delete(detail.id);
      setDetail(null);
      await loadBoms();
      showNotification('success', 'Lista BOM eliminada.');
    } catch (err: unknown) {
      const ax = err as { response?: { data?: { error?: string } } };
      showNotification('error', ax.response?.data?.error || 'No se pudo eliminar.');
    }
  };

  const openNewItem = (stageId?: number) => {
    setEditingItem(null);
    setDefaultStageId(stageId ?? null);
    setItemModalOpen(true);
  };

  const openEditItem = (item: BomItemRow) => {
    setEditingItem(item);
    setDefaultStageId(null);
    setItemModalOpen(true);
  };

  const saveItem = async (payload: {
    stage_id: number;
    material_id: string;
    quantity: number;
    unit_id: string;
    note: string | null;
  }) => {
    if (!detail) return;
    if (editingItem) {
      const res = await bomService.updateItem(detail.id, editingItem.id, payload);
      setDetail(res.bom);
    } else {
      const res = await bomService.addItem(detail.id, payload);
      setDetail(res.bom);
    }
    await loadBoms();
    showNotification('success', editingItem ? 'Línea actualizada.' : 'Insumo agregado.');
  };

  const deleteItem = async (item: BomItemRow) => {
    if (!detail) return;
    if (!window.confirm(`¿Quitar "${item.material_name}" de esta etapa?`)) return;
    try {
      const res = await bomService.deleteItem(detail.id, item.id);
      setDetail(res.bom);
      await loadBoms();
      showNotification('success', 'Línea eliminada.');
    } catch (err: unknown) {
      const ax = err as { response?: { data?: { error?: string } } };
      showNotification('error', ax.response?.data?.error || 'Error al eliminar.');
    }
  };

  const itemsByStage = useMemo(() => {
    if (!detail) return new Map<number, BomItemRow[]>();
    const map = new Map<number, BomItemRow[]>();
    for (const it of detail.items) {
      const list = map.get(it.stage_id) || [];
      list.push(it);
      map.set(it.stage_id, list);
    }
    return map;
  }, [detail]);

  const orderedStages = useMemo(() => {
    return stages
      .filter((s) => s.type === tab)
      .sort((a, b) => a.sequence_order - b.sequence_order);
  }, [stages, tab]);

  const isIndustrial = tab === 'Industrial';

  return (
    <div className="flex flex-col h-full bg-gray-50/50">
      <div
        className={`p-8 border-b transition-colors duration-300 ${
          isIndustrial ? 'bg-professionalBlue/5 border-professionalBlue/10' : 'bg-agroGreen/5 border-agroGreen/10'
        }`}
      >
        <div className="max-w-7xl mx-auto flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="flex items-start gap-3">
            <div
              className={`w-11 h-11 rounded-xl flex items-center justify-center shrink-0 ${
                isIndustrial ? 'bg-professionalBlue text-white' : 'bg-agroGreen text-white'
              }`}
            >
              <Calculator className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-charcoal">Calculadora BOM</h1>
              <p className="text-gray-500 mt-1 max-w-2xl">
                Define insumos y cantidades por etapa para cada producto terminado. Una receta por producto.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setCreateOpen(true)}
            className={`flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg font-medium text-white shadow-sm transition-all hover:-translate-y-0.5 ${
              isIndustrial
                ? 'bg-professionalBlue shadow-professionalBlue/30 hover:bg-blue-700'
                : 'bg-agroGreen shadow-agroGreen/30 hover:bg-green-700'
            }`}
          >
            <Plus className="w-5 h-5" />
            Nueva lista BOM
          </button>
        </div>
      </div>

      <div className="flex-1 flex flex-col lg:flex-row min-h-0 max-w-7xl mx-auto w-full">
        <aside className="w-full lg:w-80 shrink-0 border-b lg:border-b-0 lg:border-r border-gray-200 bg-white p-4 overflow-y-auto max-h-[40vh] lg:max-h-none">
          <div className="flex bg-gray-100/80 p-1 rounded-lg mb-4">
            <button
              type="button"
              className={`flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-md text-sm font-medium transition-all ${
                tab === 'Industrial' ? 'bg-white text-charcoal shadow-sm' : 'text-gray-500'
              }`}
              onClick={() => {
                setTab('Industrial');
                setDetail(null);
              }}
            >
              <Factory className="w-4 h-4" />
              Industrial
            </button>
            <button
              type="button"
              className={`flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-md text-sm font-medium transition-all ${
                tab === 'Biológico' ? 'bg-white text-charcoal shadow-sm' : 'text-gray-500'
              }`}
              onClick={() => {
                setTab('Biológico');
                setDetail(null);
              }}
            >
              <Leaf className="w-4 h-4" />
              Biológico
            </button>
          </div>
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Productos con receta</p>
          {loading ? (
            <p className="text-sm text-gray-500">Cargando…</p>
          ) : filteredBoms.length === 0 ? (
            <p className="text-sm text-gray-500">No hay BOM en este rubro. Crea una nueva lista.</p>
          ) : (
            <ul className="space-y-1">
              {filteredBoms.map((b) => (
                <li key={b.id}>
                  <button
                    type="button"
                    onClick={() => selectBom(b)}
                    className={`w-full text-left px-3 py-2.5 rounded-lg text-sm transition-colors ${
                      detail?.id === b.id
                        ? isIndustrial
                          ? 'bg-professionalBlue/10 text-professionalBlue font-medium'
                          : 'bg-agroGreen/10 text-agroGreen font-medium'
                        : 'hover:bg-gray-50 text-gray-700'
                    }`}
                  >
                    <span className="flex items-center gap-2">
                      <Package className="w-4 h-4 shrink-0 opacity-60" />
                      <span className="truncate">{b.product_name}</span>
                    </span>
                    {b.name && <span className="block text-xs text-gray-500 truncate mt-0.5 pl-6">{b.name}</span>}
                  </button>
                </li>
              ))}
            </ul>
          )}
        </aside>

        <section className="flex-1 min-w-0 overflow-y-auto p-6">
          {notification && (
            <div
              className={`mb-4 px-4 py-3 rounded-lg text-sm ${
                notification.type === 'success' ? 'bg-green-50 text-green-800 border border-green-100' : 'bg-red-50 text-red-800 border border-red-100'
              }`}
            >
              {notification.msg}
            </div>
          )}

          {!detail && (
            <div className="h-full flex flex-col items-center justify-center text-center py-20 px-4 text-gray-500">
              <Calculator className="w-14 h-14 mb-4 opacity-20" />
              <p className="text-lg font-medium text-gray-700">Selecciona una receta o crea una nueva</p>
              <p className="text-sm mt-2 max-w-md">
                Las cantidades se interpretan respecto a la cantidad base de salida del producto terminado.
              </p>
            </div>
          )}

          {detail && (
            <div className="space-y-6">
              <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
                <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
                  <div>
                    <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
                      {detail.product_name}
                      <span
                        className={`text-xs font-normal px-2 py-0.5 rounded-full ${
                          detail.product_type === 'Industrial' ? 'bg-professionalBlue/10 text-professionalBlue' : 'bg-agroGreen/10 text-agroGreen'
                        }`}
                      >
                        {detail.product_type}
                      </span>
                    </h2>
                    <p className="text-sm text-gray-500 mt-1">
                      Unidad de producto: {detail.product_unit_name} ({detail.product_unit_abbreviation})
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={handleDeleteBom}
                      className="inline-flex items-center gap-1.5 px-3 py-2 text-sm text-red-600 hover:bg-red-50 rounded-lg border border-red-100"
                    >
                      <Trash2 className="w-4 h-4" />
                      Eliminar receta
                    </button>
                  </div>
                </div>

                <div className="mt-4 grid sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-medium text-gray-500 mb-1">Nombre de la receta</label>
                    <input
                      type="text"
                      value={headerName}
                      onChange={(e) => setHeaderName(e.target.value)}
                      className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm"
                      placeholder="Opcional"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-500 mb-1">Cantidad base de salida</label>
                    <input
                      type="text"
                      inputMode="decimal"
                      value={headerBaseQty}
                      onChange={(e) => setHeaderBaseQty(e.target.value)}
                      className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm"
                    />
                  </div>
                </div>
                <div className="mt-3">
                  <button
                    type="button"
                    onClick={handleSaveHeader}
                    disabled={savingHeader}
                    className={`inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium text-white ${
                      isIndustrial ? 'bg-professionalBlue hover:bg-blue-700' : 'bg-agroGreen hover:bg-green-700'
                    } disabled:opacity-50`}
                  >
                    <Save className="w-4 h-4" />
                    {savingHeader ? 'Guardando…' : 'Guardar cabecera'}
                  </button>
                </div>
              </div>

              {loadingDetail ? (
                <p className="text-sm text-gray-500">Actualizando líneas…</p>
              ) : (
                <div className="space-y-4">
                  {orderedStages.map((stage) => {
                    const rows = itemsByStage.get(stage.id) || [];
                    return (
                      <div key={stage.id} className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
                        <div className="px-4 py-3 border-b border-gray-100 flex items-center justify-between bg-gray-50/80">
                          <div>
                            <h3 className="font-semibold text-gray-900">
                              {stage.sequence_order}. {stage.name}
                            </h3>
                            {stage.description && (
                              <p className="text-xs text-gray-500 mt-0.5 line-clamp-2">{stage.description}</p>
                            )}
                          </div>
                          <button
                            type="button"
                            onClick={() => openNewItem(stage.id)}
                            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium text-white ${
                              isIndustrial ? 'bg-professionalBlue hover:bg-blue-700' : 'bg-agroGreen hover:bg-green-700'
                            }`}
                          >
                            <Plus className="w-4 h-4" />
                            Insumo
                          </button>
                        </div>
                        {rows.length === 0 ? (
                          <div className="px-4 py-8 text-center text-sm text-gray-500">Sin insumos en esta etapa.</div>
                        ) : (
                          <div className="overflow-x-auto">
                            <table className="w-full text-sm">
                              <thead>
                                <tr className="text-left text-gray-500 border-b border-gray-100">
                                  <th className="px-4 py-2 font-medium">Insumo</th>
                                  <th className="px-4 py-2 font-medium">Cantidad</th>
                                  <th className="px-4 py-2 font-medium">Unidad</th>
                                  <th className="px-4 py-2 font-medium">Nota</th>
                                  <th className="px-4 py-2 w-24" />
                                </tr>
                              </thead>
                              <tbody>
                                {rows.map((row) => (
                                  <tr key={row.id} className="border-b border-gray-50 hover:bg-gray-50/50">
                                    <td className="px-4 py-2.5">
                                      <span className="font-medium text-gray-900">{row.material_name}</span>
                                      <span className="block text-xs text-gray-400">{row.material_id}</span>
                                    </td>
                                    <td className="px-4 py-2.5 tabular-nums">{row.quantity}</td>
                                    <td className="px-4 py-2.5">
                                      {row.unit_abbreviation || row.unit_name}
                                    </td>
                                    <td className="px-4 py-2.5 text-gray-600">{row.note || '—'}</td>
                                    <td className="px-4 py-2.5">
                                      <div className="flex gap-1">
                                        <button
                                          type="button"
                                          onClick={() => openEditItem(row)}
                                          className="p-1.5 rounded-lg text-gray-500 hover:bg-gray-100"
                                          title="Editar"
                                        >
                                          <Pencil className="w-4 h-4" />
                                        </button>
                                        <button
                                          type="button"
                                          onClick={() => deleteItem(row)}
                                          className="p-1.5 rounded-lg text-red-500 hover:bg-red-50"
                                          title="Quitar"
                                        >
                                          <Trash2 className="w-4 h-4" />
                                        </button>
                                      </div>
                                    </td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}

              <div className="flex justify-end">
                <button
                  type="button"
                  onClick={() => openNewItem()}
                  className={`inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium border ${
                    isIndustrial
                      ? 'border-professionalBlue text-professionalBlue hover:bg-professionalBlue/5'
                      : 'border-agroGreen text-agroGreen hover:bg-agroGreen/5'
                  }`}
                >
                  <Plus className="w-4 h-4" />
                  Agregar insumo (cualquier etapa)
                </button>
              </div>
            </div>
          )}
        </section>
      </div>

      <BomCreateModal
        isOpen={createOpen}
        onClose={() => setCreateOpen(false)}
        productType={tab}
        materials={materials}
        onCreate={handleCreateBom}
      />

      {detail && (
        <BomItemModal
          isOpen={itemModalOpen}
          onClose={() => setItemModalOpen(false)}
          productId={detail.product_id}
          productType={detail.product_type}
          stages={stages}
          materials={materials}
          units={units}
          editingItem={editingItem}
          defaultStageId={defaultStageId}
          onSave={saveItem}
        />
      )}
    </div>
  );
};

export default BomCalculatorPage;
