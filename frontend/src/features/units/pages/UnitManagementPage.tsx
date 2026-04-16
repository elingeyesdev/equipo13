import React, { useEffect, useState } from 'react';
import { unitService } from '../api/unitService';
import { Unit } from '../types';
import { UnitModal } from '../components/UnitModal';
import {
  Plus,
  Pencil,
  Trash2,
  Search,
  FilterX,
  ShieldCheck,
  Sprout,
  Scale,
} from 'lucide-react';

export const UnitManagementPage = () => {
  const [units, setUnits] = useState<Unit[]>([]);
  const [filteredUnits, setFilteredUnits] = useState<Unit[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterCategory, setFilterCategory] = useState<string | null>(null);

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingUnit, setEditingUnit] = useState<Unit | null>(null);

  // Notification state
  const [notification, setNotification] = useState<{ type: 'success' | 'error'; msg: string } | null>(null);

  const showNotification = (type: 'success' | 'error', msg: string) => {
    setNotification({ type, msg });
    setTimeout(() => setNotification(null), 3500);
  };

  const loadUnits = async () => {
    setIsLoading(true);
    try {
      const response = await unitService.getAll();
      setUnits(response.data);
      setFilteredUnits(response.data);
    } catch (error) {
      console.error('Error loading units', error);
      showNotification('error', 'No se pudo conectar con el servidor. Verifica que el backend esté activo.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadUnits();
  }, []);

  useEffect(() => {
    let result = units;
    if (filterCategory) {
      result = result.filter((u) => u.type === filterCategory);
    }
    if (searchTerm) {
      const lower = searchTerm.toLowerCase();
      result = result.filter(
        (u) =>
          u.name.toLowerCase().includes(lower) ||
          u.abbreviation.toLowerCase().includes(lower) ||
          u.id.toLowerCase().includes(lower)
      );
    }
    setFilteredUnits(result);
  }, [searchTerm, filterCategory, units]);

  const handleDelete = async (id: string, name: string) => {
    if (window.confirm(`¿Estás seguro de que deseas eliminar la unidad "${name}"?`)) {
      try {
        await unitService.delete(id);
        setUnits((prev) => prev.filter((u) => u.id !== id));
        showNotification('success', `Unidad "${name}" eliminada correctamente.`);
      } catch (error: any) {
        showNotification(
          'error',
          error.response?.data?.error || 'Error al eliminar la unidad.'
        );
      }
    }
  };

  const handleSaveUnit = async (payload: any) => {
    if (editingUnit) {
      const updated = await unitService.update(editingUnit.id, payload);
      setUnits((prev) => prev.map((u) => (u.id === editingUnit.id ? updated.data : u)));
      showNotification('success', `Unidad "${updated.data.name}" actualizada correctamente.`);
    } else {
      const created = await unitService.create(payload);
      setUnits((prev) => [...prev, created.data]);
      showNotification('success', `Unidad "${created.data.name}" creada correctamente.`);
    }
  };

  const openNewModal = () => {
    setEditingUnit(null);
    setIsModalOpen(true);
  };

  const openEditModal = (unit: Unit) => {
    setEditingUnit(unit);
    setIsModalOpen(true);
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-8">

      {/* Notification toast */}
      {notification && (
        <div
          className={`fixed top-5 right-5 z-50 flex items-center gap-3 px-5 py-3.5 rounded-xl shadow-lg border text-sm font-medium animate-in slide-in-from-right-4 duration-300 ${
            notification.type === 'success'
              ? 'bg-green-50 border-green-200 text-green-800'
              : 'bg-red-50 border-red-200 text-red-800'
          }`}
        >
          <span className={`w-2 h-2 rounded-full shrink-0 ${notification.type === 'success' ? 'bg-agroGreen' : 'bg-red-500'}`} />
          {notification.msg}
        </div>
      )}

      {/* Stats row */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {[
          {
            label: 'Total Unidades',
            value: units.length,
            icon: <Scale size={20} className="text-professionalBlue" />,
            bg: 'bg-blue-50',
          },
          {
            label: 'Industriales',
            value: units.filter((u) => u.type === 'Industrial').length,
            icon: <ShieldCheck size={20} className="text-professionalBlue" />,
            bg: 'bg-blue-50',
          },
          {
            label: 'Biológicos',
            value: units.filter((u) => u.type === 'Biológico').length,
            icon: <Sprout size={20} className="text-agroGreen" />,
            bg: 'bg-green-50',
          },
        ].map((stat) => (
          <div
            key={stat.label}
            className="bg-white rounded-xl border border-gray-200 shadow-sm p-5 flex items-center gap-4"
          >
            <div className={`w-10 h-10 rounded-lg ${stat.bg} flex items-center justify-center shrink-0`}>
              {stat.icon}
            </div>
            <div>
              <p className="text-2xl font-bold text-charcoal">{isLoading ? '—' : stat.value}</p>
              <p className="text-xs text-gray-500 mt-0.5">{stat.label}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Filters & Actions */}
      <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-200 flex flex-col sm:flex-row gap-4 justify-between items-center">
        {/* Search */}
        <div className="relative w-full sm:max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
          <input
            id="unit-search-input"
            type="text"
            placeholder="Buscar por ID, nombre o símbolo..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-4 py-2 text-sm border border-gray-200 rounded-lg focus:ring-2 focus:ring-professionalBlue focus:border-professionalBlue outline-none transition-shadow"
          />
        </div>

        <div className="flex items-center gap-3 w-full sm:w-auto">
          {/* Category filter pills */}
          <div className="flex bg-gray-100 p-1 rounded-lg">
            {[
              { label: 'Todas', value: null },
              { label: 'Industrial', value: 'Industrial', icon: <ShieldCheck size={13} /> },
              { label: 'Biológico', value: 'Biológico', icon: <Sprout size={13} /> },
            ].map((f) => (
              <button
                key={String(f.value)}
                id={`filter-${f.value ?? 'all'}`}
                onClick={() => setFilterCategory(f.value)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold transition-colors ${
                  filterCategory === f.value
                    ? f.value === 'Biológico'
                      ? 'bg-white shadow-sm text-agroGreen'
                      : 'bg-white shadow-sm text-professionalBlue'
                    : 'text-gray-500 hover:text-charcoal'
                }`}
              >
                {f.icon}
                {f.label}
              </button>
            ))}
          </div>

          {/* New unit button */}
          <button
            id="btn-new-unit"
            onClick={openNewModal}
            className="bg-professionalBlue hover:bg-blue-800 text-white px-4 py-2 rounded-lg text-sm font-semibold flex items-center gap-2 transition-colors shadow-sm shrink-0"
          >
            <Plus className="w-4 h-4" /> Nueva Unidad
          </button>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-charcoal whitespace-nowrap">
            <thead className="bg-gray-50 text-gray-500 text-xs font-semibold uppercase tracking-wider border-b border-gray-200">
              <tr>
                <th className="px-6 py-4">ID</th>
                <th className="px-6 py-4">Nombre de Unidad</th>
                <th className="px-6 py-4">Símbolo</th>
                <th className="px-6 py-4">Categoría</th>
                <th className="px-6 py-4">Unidad Base</th>
                <th className="px-6 py-4 text-right">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {isLoading ? (
                <tr>
                  <td colSpan={6} className="px-6 py-16 text-center text-gray-400">
                    <div className="flex flex-col items-center gap-3">
                      <div className="animate-spin w-7 h-7 border-2 border-professionalBlue border-t-transparent rounded-full" />
                      <span className="text-sm">Cargando unidades...</span>
                    </div>
                  </td>
                </tr>
              ) : filteredUnits.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-16 text-center">
                    <div className="flex flex-col items-center gap-3 text-gray-400">
                      <FilterX className="w-9 h-9" />
                      <p className="text-sm font-medium">No se encontraron unidades</p>
                      <p className="text-xs">Intenta con otros filtros o crea una nueva unidad</p>
                    </div>
                  </td>
                </tr>
              ) : (
                filteredUnits.map((unit) => (
                  <tr
                    key={unit.id}
                    className="hover:bg-gray-50/70 transition-colors group"
                  >
                    {/* ID */}
                    <td className="px-6 py-4">
                      <span className="font-mono text-xs font-semibold bg-gray-100 text-gray-700 px-2 py-1 rounded">
                        {unit.id}
                      </span>
                    </td>
                    {/* Name */}
                    <td className="px-6 py-4 font-medium text-charcoal">{unit.name}</td>
                    {/* Abbreviation */}
                    <td className="px-6 py-4">
                      <span className="bg-gray-100 text-gray-600 px-2 py-1 rounded font-mono text-xs font-bold">
                        {unit.abbreviation}
                      </span>
                    </td>
                    {/* Category (Type) */}
                    <td className="px-6 py-4">
                      <span
                        className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold border ${
                          unit.type === 'Biológico'
                            ? 'bg-green-50 text-agroGreen border-green-200'
                            : 'bg-blue-50 text-professionalBlue border-blue-200'
                        }`}
                      >
                        {unit.type === 'Biológico' ? (
                          <Sprout className="w-3 h-3" />
                        ) : (
                          <ShieldCheck className="w-3 h-3" />
                        )}
                        {unit.type}
                      </span>
                      {unit.category_name && (
                         <span className="block mt-1 text-xs text-gray-500 font-medium">Cat: {unit.category_name}</span>
                      )}
                    </td>
                    {/* Base unit */}
                    <td className="px-6 py-4 text-gray-500">
                      {unit.base_unit_id ? (
                        <div className="flex flex-col">
                          <span className="text-sm text-charcoal font-medium">
                            {unit.base_unit_name}
                          </span>
                          <span className="text-xs text-gray-400 font-mono">{unit.base_unit_id}</span>
                        </div>
                      ) : (
                        <span className="text-xs italic bg-gray-100 px-2 py-0.5 rounded-full text-gray-400">
                          — Unidad Base —
                        </span>
                      )}
                    </td>
                    {/* Actions */}
                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button
                          id={`btn-edit-${unit.id}`}
                          onClick={() => openEditModal(unit)}
                          className="p-1.5 text-gray-400 hover:text-professionalBlue hover:bg-blue-50 rounded-md transition-colors"
                          title="Editar Unidad"
                        >
                          <Pencil className="w-4 h-4" />
                        </button>
                        <button
                          id={`btn-delete-${unit.id}`}
                          onClick={() => handleDelete(unit.id, unit.name)}
                          className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-md transition-colors"
                          title="Eliminar Unidad"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Footer */}
        {!isLoading && filteredUnits.length > 0 && (
          <div className="px-6 py-3 border-t border-gray-100 bg-gray-50/50 flex items-center justify-between">
            <p className="text-xs text-gray-400">
              Mostrando <span className="font-semibold text-charcoal">{filteredUnits.length}</span>{' '}
              de <span className="font-semibold text-charcoal">{units.length}</span> unidades
            </p>
            {filterCategory && (
              <button
                onClick={() => setFilterCategory(null)}
                className="text-xs text-professionalBlue hover:underline flex items-center gap-1"
              >
                <FilterX size={12} /> Limpiar filtro
              </button>
            )}
          </div>
        )}
      </div>

      <UnitModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSave={handleSaveUnit}
        editingUnit={editingUnit}
        units={units}
      />
    </div>
  );
};
