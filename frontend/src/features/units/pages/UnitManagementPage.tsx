import React, { useEffect, useState } from 'react';
import { unitService } from '../api/unitService';
import { Unit } from '../types';
import { UnitModal } from '../components/UnitModal';
import { Plus, Pencil, Trash2, Search, FilterX, ShieldCheck, Sprout, Star, StarOff } from 'lucide-react';
import { loadFavoriteUnitIds, saveFavoriteUnitIds } from '../../../utils/favorites';

export const UnitManagementPage = () => {
  const [units, setUnits] = useState<Unit[]>([]);
  const [filteredUnits, setFilteredUnits] = useState<Unit[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterCategory, setFilterCategory] = useState<string | null>(null);
  const [favoriteUnitIds, setFavoriteUnitIds] = useState<Set<string>>(() => loadFavoriteUnitIds());

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingUnit, setEditingUnit] = useState<Unit | null>(null);

  const loadUnits = async () => {
    setIsLoading(true);
    try {
      const response = await unitService.getAll();
      setUnits(response.data);
      setFilteredUnits(response.data);
    } catch (error) {
      console.error("Error loading units", error);
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
      result = result.filter(u => u.category === filterCategory);
    }
    if (searchTerm) {
      const lower = searchTerm.toLowerCase();
      result = result.filter(u => 
        u.name.toLowerCase().includes(lower) || 
        u.abbreviation.toLowerCase().includes(lower) ||
        u.id.toLowerCase().includes(lower)
      );
    }
    const sorted = [...result].sort((a, b) => {
      const af = favoriteUnitIds.has(a.id);
      const bf = favoriteUnitIds.has(b.id);
      if (af !== bf) return bf ? 1 : -1; // favoritos primero
      return a.name.localeCompare(b.name, 'es');
    });
    setFilteredUnits(sorted);
  }, [searchTerm, filterCategory, units, favoriteUnitIds]);

  const toggleUnitFavorite = (unitId: string) => {
    setFavoriteUnitIds((prev) => {
      const next = new Set(prev);
      if (next.has(unitId)) next.delete(unitId);
      else next.add(unitId);
      saveFavoriteUnitIds(next);
      return next;
    });
  };

  const handleDelete = async (id: string, name: string) => {
    if (window.confirm(`¿Estás seguro de que deseas eliminar la unidad "${name}"?`)) {
      try {
        await unitService.delete(id);
        setUnits(prev => prev.filter(u => u.id !== id));
      } catch (error: any) {
        alert(error.response?.data?.error || "Error al eliminar la unidad");
      }
    }
  };

  const handleSaveUnit = async (payload: any) => {
    if (editingUnit) {
      const updated = await unitService.update(editingUnit.id, payload);
      setUnits(prev => prev.map(u => u.id === editingUnit.id ? updated.data : u));
    } else {
      const created = await unitService.create(payload);
      setUnits(prev => [...prev, created.data]);
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
    <div className="p-8 max-w-7xl mx-auto space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-stretch sm:items-center gap-4 bg-white p-6 rounded-xl shadow-sm border border-gray-100">
        <p className="text-sm text-gray-600 sm:flex-1">
          Alta y edición de unidades; los cambios se reflejan en insumos y conversiones.
        </p>
        <button
          onClick={openNewModal}
          className="bg-professionalBlue hover:bg-blue-800 text-white px-5 py-2.5 rounded-lg font-semibold flex items-center justify-center gap-2 transition-colors shadow-sm shrink-0"
        >
          <Plus className="w-5 h-5" /> Nueva Unidad
        </button>
      </div>

      {/* Filters & Search */}
      <div className="bg-white p-4 rounded-xl shadow-sm border border-borderGray mb-6 flex flex-col sm:flex-row gap-4 justify-between items-center">
        <div className="relative w-full sm:max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
          <input 
            type="text" 
            placeholder="Buscar por ID, nombre o abreviación..." 
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-professionalBlue focus:border-professionalBlue outline-none"
          />
        </div>

        <div className="flex bg-gray-100 p-1 rounded-lg w-full sm:w-auto">
          <button 
            onClick={() => setFilterCategory(null)}
            className={`flex-1 sm:flex-none px-4 py-1.5 rounded-md text-sm font-medium transition-colors ${!filterCategory ? 'bg-white shadow-sm text-charcoal' : 'text-gray-500 hover:text-charcoal'}`}
          >
            Todas
          </button>
          <button 
            onClick={() => setFilterCategory('Industrial')}
            className={`flex-1 sm:flex-none px-4 py-1.5 rounded-md text-sm font-medium transition-colors flex items-center gap-1 ${filterCategory === 'Industrial' ? 'bg-white shadow-sm text-professionalBlue' : 'text-gray-500 hover:text-charcoal'}`}
          >
            <ShieldCheck className="w-4 h-4" /> Industrial
          </button>
          <button 
            onClick={() => setFilterCategory('Biológico')}
            className={`flex-1 sm:flex-none px-4 py-1.5 rounded-md text-sm font-medium transition-colors flex items-center gap-1 ${filterCategory === 'Biológico' ? 'bg-white shadow-sm text-agroGreen' : 'text-gray-500 hover:text-charcoal'}`}
          >
            <Sprout className="w-4 h-4" /> Biológico
          </button>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl shadow-sm border border-borderGray overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-charcoal whitespace-nowrap">
            <thead className="bg-gray-50 text-gray-600 font-semibold border-b border-borderGray">
              <tr>
                <th className="px-6 py-4">ID</th>
                <th className="px-6 py-4">Nombre de Unidad</th>
                <th className="px-6 py-4">Símbolo</th>
                <th className="px-6 py-4">Categoría</th>
                <th className="px-6 py-4">Unidad Base</th>
                <th className="px-6 py-4 text-right">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-borderGray">
              {isLoading ? (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center text-gray-500">
                    <div className="animate-spin w-6 h-6 border-2 border-professionalBlue border-t-transparent rounded-full mx-auto mb-2"></div>
                    Cargando unidades...
                  </td>
                </tr>
              ) : filteredUnits.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center text-gray-500 flex flex-col items-center justify-center">
                    <FilterX className="w-8 h-8 text-gray-400 mb-2" />
                    No se encontraron unidades con esos filtros
                  </td>
                </tr>
              ) : (
                filteredUnits.map((unit) => (
                  <tr key={unit.id} className="hover:bg-gray-50/50 transition-colors">
                    <td className="px-6 py-4 font-medium text-gray-900">{unit.id}</td>
                    <td className="px-6 py-4">{unit.name}</td>
                    <td className="px-6 py-4">
                      <span className="bg-gray-100 text-gray-700 px-2 py-1 rounded font-mono text-xs font-semibold">
                        {unit.abbreviation}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium ${
                        unit.category === 'Biológico' 
                          ? 'bg-green-50 text-agroGreen border border-green-200' 
                          : 'bg-blue-50 text-professionalBlue border border-blue-200'
                      }`}>
                        {unit.category === 'Biológico' ? <Sprout className="w-3 h-3" /> : <ShieldCheck className="w-3 h-3" />}
                        {unit.category}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-gray-500">
                      {unit.base_unit_id ? (
                        <div className="flex flex-col">
                          <span>{unit.base_unit_name}</span>
                          <span className="text-xs text-gray-400">ID: {unit.base_unit_id}</span>
                        </div>
                      ) : (
                        <span className="text-xs italic bg-gray-100 px-2 py-0.5 rounded-full text-gray-500">- Unidad Base -</span>
                      )}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button
                          type="button"
                          id={`btn-fav-${unit.id}`}
                          onClick={() => toggleUnitFavorite(unit.id)}
                          className={`p-1.5 rounded-md transition-colors ${
                            favoriteUnitIds.has(unit.id)
                              ? 'text-yellow-500 hover:text-yellow-600 bg-yellow-50'
                              : 'text-gray-400 hover:text-professionalBlue hover:bg-blue-50'
                          }`}
                          title={favoriteUnitIds.has(unit.id) ? 'Quitar de favoritos' : 'Marcar como favorito'}
                        >
                          {favoriteUnitIds.has(unit.id) ? (
                            <Star className="w-4 h-4" fill="currentColor" />
                          ) : (
                            <StarOff className="w-4 h-4" />
                          )}
                        </button>
                        <button
                          id={`btn-edit-${unit.id}`}
                          onClick={() => openEditModal(unit)}
                          className="p-1.5 text-gray-400 hover:text-professionalBlue hover:bg-blue-50 rounded-md transition-colors"
                          title="Editar Unidad"
                        >
                          <Pencil className="w-4 h-4" />
                        </button>
                        <button
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
