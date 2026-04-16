import { apiClient } from '../../../api/axiosConfig';
import { Category, CategoryFormData } from '../types';

export const categoryService = {
  getAll: async (target_module?: string, type?: string): Promise<Category[]> => {
    const params = new URLSearchParams();
    if (target_module) params.append('target_module', target_module);
    if (type) params.append('type', type);
    
    const response = await apiClient.get(`/categories?${params.toString()}`);
    return response.data;
  },

  getById: async (id: number): Promise<Category> => {
    const response = await apiClient.get(`/categories/${id}`);
    return response.data;
  },

  create: async (data: CategoryFormData): Promise<Category> => {
    const response = await apiClient.post('/categories', data);
    return response.data;
  },

  update: async (id: number, data: CategoryFormData): Promise<Category> => {
    const response = await apiClient.put(`/categories/${id}`, data);
    return response.data;
  },

  delete: async (id: number): Promise<void> => {
    await apiClient.delete(`/categories/${id}`);
  }
};
