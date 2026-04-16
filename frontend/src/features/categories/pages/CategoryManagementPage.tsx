import React, { useState, useEffect } from 'react';
import { categoryService } from '../api/categoryService';
import { Category, CategoryFormData } from '../types';
import CategoryModal from '../components/CategoryModal';

const CategoryManagementPage: React.FC = () => {
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Tabs state
  const [activeModule, setActiveModule] = useState<'Materials' | 'Units'>('Materials');
  const [activeType, setActiveType] = useState<'Industrial' | 'Biológico'>('Industrial');

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);

  useEffect(() => {
    fetchCategories();
  }, [activeModule, activeType]);

  const fetchCategories = async () => {
    try {
      setLoading(true);
      const data = await categoryService.getAll(activeModule, activeType);
      setCategories(data);
      setError(null);
    } catch (err: any) {
      setError(err.message || 'Error al obtener categorías');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async (data: CategoryFormData) => {
    if (editingCategory) {
      await categoryService.update(editingCategory.id, data);
    } else {
      await categoryService.create(data);
    }
    fetchCategories();
  };

  const handleDelete = async (id: number) => {
    if (window.confirm('¿Está seguro de eliminar esta categoría? Solo se podrá eliminar si no tiene registros asociados.')) {
      try {
        await categoryService.delete(id);
        fetchCategories();
      } catch (err: any) {
        alert(err.response?.data?.message || 'Error al eliminar');
      }
    }
  };

  const openNewModal = () => {
    setEditingCategory(null);
    setIsModalOpen(true);
  };

  const openEditModal = (cat: Category) => {
    setEditingCategory(cat);
    setIsModalOpen(true);
  };

  const isIndustrial = activeType === 'Industrial';

  return (
    <div className="flex flex-col h-full bg-gray-50/50">
      {/* Header with Background Accent */}
      <div className={`p-8 border-b transition-colors duration-300 ${isIndustrial ? 'bg-professionalBlue/5 border-professionalBlue/10' : 'bg-agroGreen/5 border-agroGreen/10'}`}>
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-charcoal">Gestión de Categorías</h1>
            <p className="text-gray-500 mt-1">Configura las agrupaciones para insumos y unidades de medida.</p>
          </div>
          <button 
            onClick={openNewModal}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-lg font-medium text-white shadow-sm transition-all hover:-translate-y-0.5
              ${isIndustrial ? 'bg-professionalBlue shadow-professionalBlue/30 hover:bg-blue-700' : 'bg-agroGreen shadow-agroGreen/30 hover:bg-green-700'}`}
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4"></path></svg>
            Nueva Categoría
          </button>
        </div>
      </div>

      <div className="p-8 max-w-7xl mx-auto w-full flex-1 flex flex-col">
        {/* Toggle Controls */}
        <div className="mb-6 flex flex-col sm:flex-row gap-4 items-center justify-between bg-white p-2 rounded-xl shadow-sm border border-gray-100">
          
          <div className="flex bg-gray-100/80 p-1 rounded-lg w-full sm:w-auto">
            <button
              className={`flex-1 sm:flex-none px-6 py-2 rounded-md font-medium text-sm transition-all ${activeModule === 'Materials' ? 'bg-white text-charcoal shadow-sm' : 'text-gray-500 hover:text-charcoal'}`}
              onClick={() => setActiveModule('Materials')}
            >
              Para Insumos
            </button>
            <button
              className={`flex-1 sm:flex-none px-6 py-2 rounded-md font-medium text-sm transition-all ${activeModule === 'Units' ? 'bg-white text-charcoal shadow-sm' : 'text-gray-500 hover:text-charcoal'}`}
              onClick={() => setActiveModule('Units')}
            >
              Para Unidades
            </button>
          </div>

          <div className="flex gap-2">
            <button
               className={`px-4 py-1.5 rounded-full font-medium text-sm transition-all ${isIndustrial ? 'bg-professionalBlue text-white shadow-md' : 'bg-white text-gray-500 border border-gray-200 hover:bg-gray-50'}`}
               onClick={() => setActiveType('Industrial')}
            >
              Industrial
            </button>
            <button
               className={`px-4 py-1.5 rounded-full font-medium text-sm transition-all ${!isIndustrial ? 'bg-agroGreen text-white shadow-md' : 'bg-white text-gray-500 border border-gray-200 hover:bg-gray-50'}`}
               onClick={() => setActiveType('Biológico')}
            >
              Biológico
            </button>
          </div>

        </div>

        {/* Categories Grid */}
        {loading ? (
           <div className="flex-1 flex justify-center items-center">
             <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-charcoal"></div>
           </div>
        ) : error ? (
           <div className="p-4 bg-red-50 text-red-600 rounded-xl border border-red-100">{error}</div>
        ) : categories.length === 0 ? (
           <div className="flex-1 flex flex-col items-center justify-center text-gray-400 bg-white rounded-2xl border border-dashed border-gray-200 p-12">
             <svg className="w-16 h-16 mb-4 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"></path></svg>
             <p className="text-lg">No hay categorías configuradas para esta sección.</p>
             <button onClick={openNewModal} className="mt-4 text-professionalBlue hover:underline font-medium">Añadir una ahora</button>
           </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {categories.map(cat => (
              <div key={cat.id} className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm hover:border-gray-300 transition-all group flex flex-col">
                <div className="flex justify-between items-start mb-2">
                  <h3 className="font-bold text-charcoal text-lg">{cat.name}</h3>
                  <div className="flex space-x-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button onClick={() => openEditModal(cat)} className="p-1.5 text-gray-400 hover:text-professionalBlue hover:bg-blue-50 rounded-lg">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z"></path></svg>
                    </button>
                    <button onClick={() => handleDelete(cat.id)} className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path></svg>
                    </button>
                  </div>
                </div>
                <p className="text-gray-500 text-sm flex-1">{cat.description || <span className="italic text-gray-400">Sin descripción</span>}</p>
                <div className="mt-4 flex gap-2">
                  <span className="text-[10px] uppercase font-bold tracking-wider text-gray-400 bg-gray-100 px-2 py-0.5 rounded-full">{cat.target_module === 'Units' ? 'UNIDADES' : 'INSUMOS'}</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <CategoryModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSave={handleSave}
        editingCategory={editingCategory}
        defaultModule={activeModule}
        defaultType={activeType}
      />
    </div>
  );
};

export default CategoryManagementPage;
