import React, { useEffect, useState, useCallback } from 'react';
import { DragDropContext, Droppable, Draggable, DropResult } from '@hello-pangea/dnd';
import { Plus, Pencil, Trash2, GripVertical, Factory, Leaf } from 'lucide-react';
import { ProductionStage, CreateProductionStagePayload } from '../types';
import { productionStageService } from '../api/productionStageService';
import { ProductionStageModal } from '../components/ProductionStageModal';

type TabKey = 'Industrial' | 'Biológico';

export default function ProductionStageManagementPage() {
  const [activeTab, setActiveTab] = useState<TabKey>('Industrial');
  const [stages, setStages] = useState<ProductionStage[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingStage, setEditingStage] = useState<ProductionStage | null>(null);

  // Notification state
  const [notification, setNotification] = useState<{ type: 'success' | 'error'; msg: string } | null>(null);

  const showNotification = useCallback((type: 'success' | 'error', msg: string) => {
    setNotification({ type, msg });
    setTimeout(() => setNotification(null), 3500);
  }, []);

  const loadStages = useCallback(async () => {
    setIsLoading(true);
    try {
      const { data } = await productionStageService.getAll(activeTab);
      setStages(data);
    } catch (error) {
      console.error(error);
      showNotification('error', 'Error al cargar las etapas de producción');
    } finally {
      setIsLoading(false);
    }
  }, [activeTab, showNotification]);

  useEffect(() => {
    loadStages();
  }, [loadStages]);

  const onDragEnd = async (result: DropResult) => {
    if (!result.destination) return;

    const sourceIndex = result.source.index;
    const destinationIndex = result.destination.index;

    if (sourceIndex === destinationIndex) return;

    // Optimistic UI update
    const items = Array.from(stages);
    const [reorderedItem] = items.splice(sourceIndex, 1);
    items.splice(destinationIndex, 0, reorderedItem);

    // Update internal sequence orders to reflect new index
    const updatedStages = items.map((item, index) => ({
      ...item,
      sequence_order: index + 1
    }));

    setStages(updatedStages);

    // Persist to API
    try {
      const updates = updatedStages.map(s => ({ id: s.id, sequence_order: s.sequence_order }));
      await productionStageService.updateOrder(updates);
    } catch (error) {
      // Revert on failure
      console.error(error);
      showNotification('error', 'Error al guardar el nuevo orden');
      loadStages();
    }
  };

  const handleSaveStage = async (payload: CreateProductionStagePayload, id?: number) => {
    try {
      if (id) {
        await productionStageService.update(id, payload);
        showNotification('success', 'Etapa actualizada correctamente');
      } else {
        await productionStageService.create(payload);
        showNotification('success', 'Etapa creada correctamente');
      }
      loadStages();
    } catch (error: any) {
      throw error; // Let modal handle error display
    }
  };

  const handleDelete = async (id: number, name: string) => {
    if (!window.confirm(`¿Seguro que deseas eliminar la etapa "${name}"?`)) return;
    
    try {
      await productionStageService.delete(id);
      showNotification('success', 'Etapa eliminada correctamente');
      
      // Auto-refresh to fix sequence gaps
      loadStages();
    } catch (error: any) {
      showNotification('error', error.response?.data?.error || 'Error al eliminar la etapa');
    }
  };

  return (
    <div className="space-y-6 max-w-5xl mx-auto p-4 sm:p-8 pb-12">
      {notification && (
        <div className={`fixed top-5 right-5 z-50 flex items-center gap-3 px-5 py-3.5 rounded-xl shadow-lg border text-sm font-medium animate-in slide-in-from-right-4 duration-300 ${
          notification.type === 'success' ? 'bg-green-50 border-green-200 text-green-800' : 'bg-red-50 border-red-200 text-red-800'
        }`}>
          {notification.msg}
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 rounded-xl shadow-sm border border-gray-100">
        <div>
          <h1 className="text-2xl font-bold text-charcoal">Fases de Transformación</h1>
          <p className="text-sm text-gray-500 mt-1">Configura y ordena las etapas de producción para costeo.</p>
        </div>
        <button
          onClick={() => {
            setEditingStage(null);
            setIsModalOpen(true);
          }}
          className="bg-professionalBlue hover:bg-blue-800 text-white px-5 py-2.5 rounded-lg font-medium flex items-center justify-center gap-2 shadow-sm transition-all active:scale-[0.98]"
        >
          <Plus className="w-[18px] h-[18px]" />
          Añadir Etapa
        </button>
      </div>

      {/* Tabs */}
      <div className="flex bg-gray-100 p-1.5 rounded-xl w-fit mb-6">
        <button
          className={`flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-semibold transition-all ${
            activeTab === 'Industrial' ? 'bg-white text-professionalBlue shadow-sm border border-gray-200/60' : 'text-gray-500 hover:text-charcoal'
          }`}
          onClick={() => setActiveTab('Industrial')}
        >
          <Factory className="w-4 h-4" /> Línea Industrial
        </button>
        <button
          className={`flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-semibold transition-all ${
            activeTab === 'Biológico' ? 'bg-white text-agroGreen shadow-sm border border-gray-200/60' : 'text-gray-500 hover:text-charcoal'
          }`}
          onClick={() => setActiveTab('Biológico')}
        >
          <Leaf className="w-4 h-4" /> Línea Biológica
        </button>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden min-h-[400px] flex flex-col">
        <div className="bg-gray-50 border-b border-gray-200 px-6 py-3 flex items-center justify-between">
          <p className="text-sm font-semibold text-gray-700">Secuencia de Etapas - {activeTab}</p>
          <p className="text-xs text-gray-500">Arrastra (Drag & Drop) para reorganizar</p>
        </div>
        
        {isLoading ? (
           <div className="flex-1 flex justify-center items-center py-20">
             <div className="animate-spin w-8 h-8 border-2 border-professionalBlue border-t-transparent rounded-full" />
           </div>
        ) : stages.length === 0 ? (
           <div className="flex-1 flex flex-col items-center justify-center text-gray-400 py-16">
             {activeTab === 'Industrial' ? <Factory className="w-12 h-12 mb-3 opacity-20" /> : <Leaf className="w-12 h-12 mb-3 opacity-20" />}
             <p className="font-medium">No hay fases registradas</p>
             <p className="text-sm mt-1 mb-4">Comienza añadiendo la primera etapa de tu proceso.</p>
             <button onClick={() => { setEditingStage(null); setIsModalOpen(true); }} className="text-sm text-professionalBlue font-medium underline">
               Añadir primera etapa
             </button>
           </div>
        ) : (
          <div className="flex-1 p-4 bg-gray-50/30">
            <DragDropContext onDragEnd={onDragEnd}>
              <Droppable droppableId={`droppable-${activeTab}`}>
                {(provided) => (
                  <div
                    {...provided.droppableProps}
                    ref={provided.innerRef}
                    className="space-y-3"
                  >
                    {stages.map((stage, index) => (
                      <Draggable key={stage.id} draggableId={stage.id.toString()} index={index}>
                        {(provided, snapshot) => (
                          <div
                            ref={provided.innerRef}
                            {...provided.draggableProps}
                            className={`flex items-center gap-4 bg-white p-4 rounded-xl border transition-all ${
                              snapshot.isDragging 
                                ? 'border-professionalBlue shadow-lg scale-[1.02] z-10' 
                                : 'border-gray-200 shadow-sm hover:border-gray-300'
                            }`}
                          >
                            <div 
                              {...provided.dragHandleProps} 
                              className="p-1.5 text-gray-400 hover:text-gray-600 cursor-grab active:cursor-grabbing rounded"
                              title="Arrastrar para mover"
                            >
                              <GripVertical className="w-5 h-5" />
                            </div>
                            
                            <div className="w-8 h-8 rounded-full bg-gray-100 border border-gray-200 flex items-center justify-center shrink-0">
                               <span className="text-sm font-bold text-gray-600">{index + 1}</span>
                            </div>

                            <div className="flex-1 min-w-0">
                              <h3 className="text-base font-bold text-gray-900 truncate">{stage.name}</h3>
                              {stage.description && (
                                <p className="text-sm text-gray-500 truncate mt-0.5">{stage.description}</p>
                              )}
                            </div>

                            <div className="flex items-center gap-1 shrink-0">
                               <button
                                  type="button"
                                  onClick={() => {
                                    setEditingStage(stage);
                                    setIsModalOpen(true);
                                  }}
                                  className="p-2 text-gray-400 hover:text-professionalBlue hover:bg-blue-50 rounded-lg transition-colors"
                                  title="Editar Etapa"
                                >
                                  <Pencil className="w-4 h-4" />
                               </button>
                               <button
                                  type="button"
                                  onClick={() => handleDelete(stage.id, stage.name)}
                                  className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                                  title="Eliminar Etapa"
                                >
                                  <Trash2 className="w-4 h-4" />
                               </button>
                            </div>
                          </div>
                        )}
                      </Draggable>
                    ))}
                    {provided.placeholder}
                  </div>
                )}
              </Droppable>
            </DragDropContext>
          </div>
        )}
      </div>

      <ProductionStageModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSave={handleSaveStage}
        editingStage={editingStage}
        defaultType={activeTab}
      />
    </div>
  );
}
