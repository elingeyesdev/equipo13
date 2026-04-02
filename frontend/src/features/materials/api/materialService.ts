import { apiClient } from '../../../api/axiosConfig';
import { CreateMaterialPayload, Material, UpdateMaterialPayload } from '../types';

type ListResponse = { success: boolean; data: Material[]; count: number };
type ItemResponse = { success: boolean; data: Material };

export const materialService = {
  getAll: async (params?: { type?: string; category?: string }): Promise<ListResponse> => {
    const response = await apiClient.get<ListResponse>('/materials', { params });
    return response.data;
  },

  getById: async (id: string): Promise<ItemResponse> => {
    const response = await apiClient.get<ItemResponse>(`/materials/${encodeURIComponent(id)}`);
    return response.data;
  },

  create: async (payload: CreateMaterialPayload): Promise<ItemResponse> => {
    const response = await apiClient.post<ItemResponse>('/materials', payload);
    return response.data;
  },

  update: async (id: string, payload: UpdateMaterialPayload): Promise<ItemResponse> => {
    const response = await apiClient.put<ItemResponse>(
      `/materials/${encodeURIComponent(id)}`,
      payload
    );
    return response.data;
  },

  delete: async (id: string): Promise<{ success: boolean; message?: string }> => {
    const response = await apiClient.delete(`/materials/${encodeURIComponent(id)}`);
    return response.data;
  },
};
