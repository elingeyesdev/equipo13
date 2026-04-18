import { apiClient } from '../../../api/axiosConfig';
import type {
  BomDetail,
  BomListRow,
  BomItemPayload,
  CreateBomPayload,
  UpdateBomPayload,
} from '../types';

type ListResponse = { success: boolean; data: BomListRow[]; count: number };
type DetailResponse = { success: boolean; data: BomDetail };
type ItemMutationResponse = { success: boolean; data?: unknown; bom: BomDetail; message?: string };

export const bomService = {
  getAll: async (): Promise<ListResponse> => {
    const response = await apiClient.get<ListResponse>('/boms');
    return response.data;
  },

  getById: async (id: number): Promise<DetailResponse> => {
    const response = await apiClient.get<DetailResponse>(`/boms/${id}`);
    return response.data;
  },

  create: async (payload: CreateBomPayload): Promise<DetailResponse> => {
    const response = await apiClient.post<DetailResponse>('/boms', payload);
    return response.data;
  },

  update: async (id: number, payload: UpdateBomPayload): Promise<DetailResponse> => {
    const response = await apiClient.put<DetailResponse>(`/boms/${id}`, payload);
    return response.data;
  },

  delete: async (id: number): Promise<{ success: boolean; message?: string }> => {
    const response = await apiClient.delete(`/boms/${id}`);
    return response.data;
  },

  addItem: async (bomId: number, payload: BomItemPayload): Promise<ItemMutationResponse> => {
    const response = await apiClient.post<ItemMutationResponse>(`/boms/${bomId}/items`, payload);
    return response.data;
  },

  updateItem: async (
    bomId: number,
    itemId: number,
    payload: Partial<BomItemPayload>
  ): Promise<ItemMutationResponse> => {
    const response = await apiClient.put<ItemMutationResponse>(
      `/boms/${bomId}/items/${itemId}`,
      payload
    );
    return response.data;
  },

  deleteItem: async (bomId: number, itemId: number): Promise<ItemMutationResponse> => {
    const response = await apiClient.delete<ItemMutationResponse>(
      `/boms/${bomId}/items/${itemId}`
    );
    return response.data;
  },
};
