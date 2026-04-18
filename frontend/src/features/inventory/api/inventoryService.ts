import { apiClient } from '../../../api/axiosConfig';
import { InventoryBatch } from '../types';

export const inventoryService = {
  getAll: async (): Promise<InventoryBatch[]> => {
    const response = await apiClient.get('/inventory');
    return response.data.data;
  },

  delete: async (id: number): Promise<void> => {
    await apiClient.delete(`/inventory/${id}`);
  }
};
