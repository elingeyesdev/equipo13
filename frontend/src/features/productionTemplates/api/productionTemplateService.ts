import { apiClient } from '../../../api/axiosConfig';
import { ProductionTemplate, CreateTemplatePayload, UpdateTemplatePayload } from '../types';

export const productionTemplateService = {
  getAll: async (type?: string) => {
    const params = type ? { type } : {};
    return apiClient.get<ProductionTemplate[]>('/templates', { params });
  },

  getById: async (id: number) => {
    return apiClient.get<ProductionTemplate>(`/templates/${id}`);
  },

  create: async (data: CreateTemplatePayload) => {
    return apiClient.post<ProductionTemplate>('/templates', data);
  },

  update: async (id: number, data: UpdateTemplatePayload) => {
    return apiClient.put<ProductionTemplate>(`/templates/${id}`, data);
  },

  delete: async (id: number) => {
    return apiClient.delete(`/templates/${id}`);
  },
};
