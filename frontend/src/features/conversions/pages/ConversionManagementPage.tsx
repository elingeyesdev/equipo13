import React, { useEffect, useState } from 'react';
import { conversionService } from '../api/conversionService';
import { unitService } from '../../units/api/unitService';
import { UnitConversion } from '../types';
import { Unit } from '../../units/types';
import { ConversionModal } from '../components/ConversionModal';
import {
  Plus,
  Pencil,
  Trash2,
  Search,
  FilterX,
  ShieldCheck,
  Sprout,
  ArrowRightLeft,
  ArrowRight
} from 'lucide-react';

export const ConversionManagementPage = () => {
  const [conversions, setConversions] = useState<UnitConversion[]>([]);
  const [filteredConversions, setFilteredConversions] = useState<UnitConversion[]>([]);
  const [units, setUnits] = useState<Unit[]>([]);
  
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState<string | null>(null);

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingConversion, setEditingConversion] = useState<UnitConversion | null>(null);

  // Notification state
  const [notification, setNotification] = useState<{ type: 'success' | 'error'; msg: string } | null>(null);

  const showNotification = (type: 'success' | 'error', msg: string) => {
    setNotification({ type, msg });
    setTimeout(() => setNotification(null), 3500);
  };

  const loadData = async () => {
    setIsLoading(true);
    try {
      const [conversionsRes, unitsRes] = await Promise.all([
        conversionService.getAll(),
        unitService.getAll()
      ]);
      setConversions(conversionsRes.data);
      setFilteredConversions(conversionsRes.data);
      setUnits(unitsRes.data);
    } catch (error) {
      console.error('Error loading data', error);
      showNotification('error', 'No se pudo cargar la información del servidor.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    let result = conversions;
    if (filterType) {
      result = result.filter((c) => c.type === filterType);
    }
    if (searchTerm) {
      const lower = searchTerm.toLowerCase();
      result = result.filter(
        (c) =>
          c.source_unit_name?.toLowerCase().includes(lower) ||
          c.target_unit_name?.toLowerCase().includes(lower) ||
          c.source_unit_abbrev?.toLowerCase().includes(lower) ||
          c.target_unit_abbrev?.toLowerCase().includes(lower) ||
          c.id.toLowerCase().includes(lower)
      );
    }
    setFilteredConversions(result);
  }, [searchTerm, filterType, conversions]);

  const handleDelete = async (id: string, sourceName: string, targetName: string) => {
    if (window.confirm(`¿Estás seguro de que deseas eliminar la equivalencia de "${sourceName}" a "${targetName}"?`)) {
      try {
        await conversionService.delete(id);
        setConversions((prev) => prev.filter((c) => c.id !== id));
        showNotification('success', `Equivalencia eliminada correctamente.`);
      } catch (error: any) {
        showNotification('error', error.response?.data?.error || 'Error al eliminar la conversión.');
      }
    }
  };

  const handleSaveConversion = async (payload: any) => {
    try {
      if (editingConversion) {
        const updated = await conversionService.update(editingConversion.id, payload);
        
        // El backend nos devuelve el objeto actualizado, pero podríamos necesitar volver a cruzar datos si los nombres no vienen completos
        // Lo más seguro y limpio es recargar la data o actualizar los nombres manualmente.
        await loadData(); // Reloading ensures joins are populated properly from backend
        // showNotification('success', `Equivalencia actualizada correctamente.`); 
        // Note: loadData will re-fetch, we can just show success:
        showNotification('success', `Equivalencia actualizada correctamente.`);
      } else {
        await conversionService.create(payload);
        await loadData();
        showNotification('success', `Equivalencia creada correctamente.`);
      }
    } catch (error: any) {
      // Re-throw to the modal to handle validation errors and keep modal open
      throw error; 
    }
  };

  const openNewModal = () => {
    setEditingConversion(null);
    setIsModalOpen(true);
  };

  const openEditModal = (conversion: UnitConversion) => {
    setEditingConversion(conversion);
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
            label: 'Total Factores',
            value: conversions.length,
            icon: <ArrowRightLeft size={20} className="text-professionalBlue" />,
            bg: 'bg-blue-50',
          },
          {
            label: 'Industriales',
            value: conversions.filter((c) => c.type === 'Industrial').length,
            icon: <ShieldCheck size={20} className="text-professionalBlue" />,
            bg: 'bg-blue-50',
          },
          {
            label: 'Biológicos',
            value: conversions.filter((c) => c.type === 'Biológico').length,
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
        <div className="relative w-full sm:max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
          <input
            type="text"
            placeholder="Buscar por unidad, abrev o ID..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-4 py-2 text-sm border border-gray-200 rounded-lg focus:ring-2 focus:ring-professionalBlue focus:border-professionalBlue outline-none transition-shadow"
          />
        </div>

        <div className="flex items-center gap-3 w-full sm:w-auto">
          <div className="flex bg-gray-100 p-1 rounded-lg">
            {[
              { label: 'Todos', value: null },
              { label: 'Industrial', value: 'Industrial', icon: <ShieldCheck size={13} /> },
              { label: 'Biológico', value: 'Biológico', icon: <Sprout size={13} /> },
            ].map((f) => (
              <button
                key={String(f.value)}
                onClick={() => setFilterType(f.value)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold transition-colors ${
                  filterType === f.value
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

          <button
            onClick={openNewModal}
            className="bg-professionalBlue hover:bg-blue-800 text-white px-4 py-2 rounded-lg text-sm font-semibold flex items-center gap-2 transition-colors shadow-sm shrink-0"
          >
            <Plus className="w-4 h-4" /> Nuevo Factor
          </button>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-charcoal whitespace-nowrap">
            <thead className="bg-gray-50 text-gray-500 text-xs font-semibold uppercase tracking-wider border-b border-gray-200">
              <tr>
                <th className="px-6 py-4 w-1 flex-shrink-0">Categoría</th>
                <th className="px-6 py-4">Equivalencia</th>
                <th className="px-6 py-4">Nota</th>
                <th className="px-6 py-4 text-right">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {isLoading ? (
                <tr>
                  <td colSpan={4} className="px-6 py-16 text-center text-gray-400">
                    <div className="flex flex-col items-center gap-3">
                      <div className="animate-spin w-7 h-7 border-2 border-professionalBlue border-t-transparent rounded-full" />
                      <span className="text-sm">Cargando equivalencias...</span>
                    </div>
                  </td>
                </tr>
              ) : filteredConversions.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-6 py-16 text-center">
                    <div className="flex flex-col items-center gap-3 text-gray-400">
                      <FilterX className="w-9 h-9" />
                      <p className="text-sm font-medium">No se encontraron factores de conversión</p>
                      <p className="text-xs">Crea tu primera equivalencia para empezar</p>
                    </div>
                  </td>
                </tr>
              ) : (
                filteredConversions.map((conv) => (
                  <tr key={conv.id} className="hover:bg-gray-50/70 transition-colors group">
                    <td className="px-6 py-4">
                      <span
                        className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold border ${
                          conv.type === 'Biológico'
                            ? 'bg-green-50 text-agroGreen border-green-200'
                            : 'bg-blue-50 text-professionalBlue border-blue-200'
                        }`}
                      >
                        {conv.type === 'Biológico' ? <Sprout className="w-3 h-3" /> : <ShieldCheck className="w-3 h-3" />}
                        {conv.type}
                      </span>
                    </td>
                    
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-4 bg-gray-50 px-3 py-2 rounded-lg border border-gray-100 w-max shadow-sm">
                        {/* Source */}
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-professionalBlue">1</span>
                          <span className="font-semibold text-charcoal">{conv.source_unit_name}</span>
                          <span className="text-xs text-gray-500 font-mono bg-white px-1.5 py-0.5 rounded border border-gray-200">
                            {conv.source_unit_abbrev}
                          </span>
                        </div>

                        <ArrowRight size={14} className="text-gray-400" />

                        {/* Target */}
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-agroGreen">{conv.factor}</span>
                          <span className="font-semibold text-charcoal">{conv.target_unit_name}</span>
                          <span className="text-xs text-gray-500 font-mono bg-white px-1.5 py-0.5 rounded border border-gray-200">
                            {conv.target_unit_abbrev}
                          </span>
                        </div>
                      </div>
                    </td>

                    <td className="px-6 py-4 text-gray-500 max-w-xs truncate">
                      {conv.note ? (
                        <span className="text-sm" title={conv.note}>{conv.note}</span>
                      ) : (
                        <span className="text-xs italic bg-gray-100 px-2 py-0.5 rounded-full text-gray-400">
                          Sin nota
                        </span>
                      )}
                    </td>

                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button
                          onClick={() => openEditModal(conv)}
                          className="p-1.5 text-gray-400 hover:text-professionalBlue hover:bg-blue-50 rounded-md transition-colors"
                          title="Editar Equivalencia"
                        >
                          <Pencil className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDelete(conv.id, conv.source_unit_name || '', conv.target_unit_name || '')}
                          className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-md transition-colors"
                          title="Eliminar Equivalencia"
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

        {!isLoading && filteredConversions.length > 0 && (
          <div className="px-6 py-3 border-t border-gray-100 bg-gray-50/50 flex items-center justify-between">
            <p className="text-xs text-gray-400">
              Mostrando <span className="font-semibold text-charcoal">{filteredConversions.length}</span>{' '}
              de <span className="font-semibold text-charcoal">{conversions.length}</span> equivalencias
            </p>
            {filterType && (
              <button
                onClick={() => setFilterType(null)}
                className="text-xs text-professionalBlue hover:underline flex items-center gap-1"
              >
                <FilterX size={12} /> Limpiar filtro
              </button>
            )}
          </div>
        )}
      </div>

      <ConversionModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSave={handleSaveConversion}
        editingConversion={editingConversion}
        units={units}
      />
    </div>
  );
};
