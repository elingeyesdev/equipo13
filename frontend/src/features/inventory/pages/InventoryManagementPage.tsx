import React, { useEffect, useState, useMemo } from 'react';
import { Search, Package, MapPin, Calendar, DollarSign, FilterX, Trash2 } from 'lucide-react';
import { InventoryBatch } from '../types';
import { inventoryService } from '../api/inventoryService';

export const InventoryManagementPage = () => {
  const [batches, setBatches] = useState<InventoryBatch[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState<string | null>(null);

  // Notification state
  const [notification, setNotification] = useState<{ type: 'success' | 'error'; msg: string } | null>(null);

  const showNotification = (type: 'success' | 'error', msg: string) => {
    setNotification({ type, msg });
    setTimeout(() => setNotification(null), 3500);
  };

  const loadBatches = async () => {
    setIsLoading(true);
    try {
      const data = await inventoryService.getAll();
      setBatches(data);
    } catch (error) {
      console.error('Error loading inventory', error);
      showNotification('error', 'Error al cargar el inventario. Verifica la conexión.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadBatches();
  }, []);

  const filteredBatches = useMemo(() => {
    let result = batches;
    
    // Filtro por tipo de maestro
    if (filterType) {
      result = result.filter(b => b.material_type === filterType);
    }
    
    // Filtro por búsqueda de texto
    if (searchTerm.trim()) {
      const lower = searchTerm.toLowerCase();
      result = result.filter(b => 
        b.batch_number.toLowerCase().includes(lower) ||
        b.material_name.toLowerCase().includes(lower) ||
        b.material_id.toLowerCase().includes(lower) ||
        (b.location && b.location.toLowerCase().includes(lower))
      );
    }
    return result;
  }, [batches, searchTerm, filterType]);

  const handleDelete = async (id: number, batchNumber: string) => {
    if (window.confirm(`¿Estás seguro de que deseas eliminar el lote "${batchNumber}" permanentemente del inventario?`)) {
      try {
        await inventoryService.delete(id);
        setBatches(prev => prev.filter(b => b.id !== id));
        showNotification('success', `Lote "${batchNumber}" eliminado.`);
      } catch (error: any) {
        showNotification('error', error.response?.data?.error || 'Error al eliminar el lote.');
      }
    }
  };

  // UI Helpers
  const formatCurrency = (value: string | number | null) => {
    if (!value) return '—';
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(Number(value));
  };

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return '—';
    return new Date(dateStr).toLocaleDateString('es-ES', { year: 'numeric', month: 'short', day: 'numeric' });
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto p-4 sm:p-8 pb-12">
      {/* Toast */}
      {notification && (
        <div className={`fixed top-5 right-5 z-50 flex items-center gap-3 px-5 py-3.5 rounded-xl shadow-lg border text-sm font-medium animate-in slide-in-from-right-4 duration-300 ${
          notification.type === 'success' ? 'bg-green-50 border-green-200 text-green-800' : 'bg-red-50 border-red-200 text-red-800'
        }`}>
          {notification.msg}
        </div>
      )}

      {/* Header Info */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 rounded-xl shadow-sm border border-gray-100">
        <div>
          <h1 className="text-2xl font-bold text-charcoal">Control de Lotes / Inventario Físico</h1>
          <p className="text-sm text-gray-500 mt-1">Explora las existencias almacenadas ingresadas manualmente o por carga masiva.</p>
        </div>
      </div>

      {/* Tarjetas de Resumen Rápido */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5 flex items-center gap-4">
          <div className="w-10 h-10 rounded-lg bg-blue-50 flex items-center justify-center shrink-0">
            <Package size={20} className="text-professionalBlue" />
          </div>
          <div>
            <p className="text-2xl font-bold text-charcoal">{isLoading ? '—' : batches.length}</p>
            <p className="text-xs text-gray-500 mt-0.5">Lotes Totales</p>
          </div>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5 flex items-center gap-4">
          <div className="w-10 h-10 rounded-lg bg-gray-50 flex items-center justify-center shrink-0 text-gray-500">
            <DollarSign size={20} />
          </div>
          <div>
            <p className="text-2xl font-bold text-charcoal">{isLoading ? '—' : 
              formatCurrency(batches.reduce((sum, b) => sum + (Number(b.acquisition_cost) || 0), 0))
            }</p>
            <p className="text-xs text-gray-500 mt-0.5">Valor Total Adquisición</p>
          </div>
        </div>
      </div>

      {/* Filtros */}
      <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-200 flex flex-col sm:flex-row gap-4 justify-between items-center">
        <div className="relative w-full sm:max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
          <input
            type="text"
            placeholder="Buscar por Lote, Insumo o Ubicación..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-4 py-2 text-sm border border-gray-200 rounded-lg focus:ring-2 focus:ring-professionalBlue focus:border-professionalBlue outline-none transition-shadow"
          />
        </div>

        <div className="flex bg-gray-100 p-1 rounded-lg shrink-0">
            {[
              { label: 'Todos', value: null },
              { label: 'Industrial', value: 'Industrial' },
              { label: 'Biológico', value: 'Biológico' },
            ].map((f) => (
              <button
                key={String(f.value)}
                onClick={() => setFilterType(f.value)}
                className={`px-3 py-1.5 rounded-md text-xs font-semibold transition-colors ${
                  filterType === f.value
                    ? f.value === 'Biológico'
                      ? 'bg-white shadow-sm text-agroGreen'
                      : 'bg-white shadow-sm text-professionalBlue'
                    : 'text-gray-500 hover:text-charcoal'
                }`}
              >
                {f.label}
              </button>
            ))}
        </div>
      </div>

      {/* Grid de Cuadrícula Visual */}
      {isLoading ? (
         <div className="flex justify-center items-center py-20 bg-white rounded-xl border border-gray-200">
           <div className="animate-spin w-8 h-8 border-2 border-professionalBlue border-t-transparent rounded-full" />
         </div>
      ) : filteredBatches.length === 0 ? (
         <div className="flex justify-center items-center py-20 bg-white rounded-xl border border-gray-200 text-center flex-col text-gray-400">
           <FilterX className="w-10 h-10 mb-3 opacity-30" />
           <p className="font-medium">No se encontraron lotes</p>
           <p className="text-sm mt-1">Prueba a usar la Carga Masiva para registrar lotes iniciales.</p>
         </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredBatches.map(batch => (
            <div key={batch.id} className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden hover:shadow-md transition-shadow group">
              <div className="border-b border-gray-100 p-4 bg-gray-50/50 flex justify-between items-start">
                <div>
                  <span className="inline-block px-2 py-1 bg-charcoal text-white text-[10px] font-bold rounded uppercase tracking-wider mb-2">
                    LOTE: {batch.batch_number}
                  </span>
                  <h3 className="font-bold text-gray-900 leading-tight block">{batch.material_name}</h3>
                  <p className="text-xs text-gray-500 font-mono mt-0.5">{batch.material_id}</p>
                </div>
                <button 
                  onClick={() => handleDelete(batch.id, batch.batch_number)}
                  className="p-1.5 text-gray-400 hover:bg-red-50 hover:text-red-600 rounded-md transition-colors opacity-0 group-hover:opacity-100"
                  title="Eliminar lote"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>

              <div className="p-4 space-y-3">
                <div className="flex justify-between items-end">
                  <div>
                    <p className="text-[10px] uppercase font-bold text-gray-400 tracking-wider">Cantidad Existente</p>
                    <p className="text-xl font-bold text-professionalBlue mt-0.5">
                      {Number(batch.quantity).toLocaleString('es-ES')} <span className="text-sm text-gray-500 font-medium">{batch.unit_abbreviation}</span>
                    </p>
                  </div>
                  {batch.initial_weight && (
                    <div className="text-right">
                      <p className="text-[10px] uppercase font-bold text-gray-400 tracking-wider">Peso Inicial</p>
                      <p className="text-sm font-bold text-gray-700">{Number(batch.initial_weight)} kg</p>
                    </div>
                  )}
                </div>

                <div className="space-y-2 pt-2 border-t border-gray-100 text-sm">
                  <div className="flex items-center gap-2 text-gray-600">
                    <MapPin className="w-4 h-4 text-gray-400 shrink-0" />
                    <span className="truncate">{batch.location || 'Sin asignar'}</span>
                  </div>
                  <div className="flex items-center gap-2 text-gray-600">
                     <Calendar className="w-4 h-4 text-gray-400 shrink-0" />
                     <span>Registrado el {formatDate(batch.entry_date)}</span>
                  </div>
                  <div className="flex items-center gap-2 text-gray-600">
                     <DollarSign className="w-4 h-4 text-gray-400 shrink-0" />
                     <span className="font-medium text-gray-800">{formatCurrency(batch.acquisition_cost)} <span className="text-xs text-gray-400 font-normal">Costo total</span></span>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
