import { apiClient } from '../../../api/axiosConfig';
import { ProductionStage, CreateProductionStagePayload, UpdateProductionStagePayload, ReorderPayload } from '../types';

export const productionStageService = {
  getAll: async (type?: string) => {
    const params = type ? { type } : {};
    return apiClient.get<ProductionStage[]>('/production-stages', { params });
  },

  create: async (data: CreateProductionStagePayload) => {
    return apiClient.post<ProductionStage>('/production-stages', data);
  },

  update: async (id: number, data: UpdateProductionStagePayload) => {
    return apiClient.put<ProductionStage>(`/production-stages/${id}`, data);
  },

  delete: async (id: number) => {
    return apiClient.delete(`/production-stages/${id}`);
  },

  updateOrder: async (updates: ReorderPayload[]) => {
    return apiClient.put('/production-stages/reorder', { updates });
  }
};
