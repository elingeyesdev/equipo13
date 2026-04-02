import { apiClient } from '../../../api/axiosConfig';
import { Unit, CreateUnitPayload, UpdateUnitPayload } from '../types';

export const unitService = {
  // Fetch all units, optionally filtered
  getAll: async (category?: string): Promise<{ data: Unit[], count: number, success: boolean }> => {
    const response = await apiClient.get('/units', {
      params: { category }
    });
    return response.data;
  },

  // Create a new unit
  create: async (payload: CreateUnitPayload): Promise<{ data: Unit, success: boolean }> => {
    const response = await apiClient.post('/units', payload);
    return response.data;
  },

  // Update an existing unit
  update: async (id: string, payload: UpdateUnitPayload): Promise<{ data: Unit, success: boolean }> => {
    const response = await apiClient.put(`/units/${id}`, payload);
    return response.data;
  },

  // Delete a unit
  delete: async (id: string): Promise<{ success: boolean, message?: string }> => {
    const response = await apiClient.delete(`/units/${id}`);
    return response.data;
  }
};
