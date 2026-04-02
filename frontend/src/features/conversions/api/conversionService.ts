import { apiClient } from '../../../api/axiosConfig';
import { UnitConversion, CreateConversionDTO, UpdateConversionDTO } from '../types';

interface ApiResponse<T> {
  success: boolean;
  data: T;
  count?: number;
  message?: string;
  error?: string;
}

export const conversionService = {
  getAll: async () => {
    const response = await apiClient.get<ApiResponse<UnitConversion[]>>('/conversions');
    return response.data;
  },

  getById: async (id: string) => {
    const response = await apiClient.get<ApiResponse<UnitConversion>>(`/conversions/${id}`);
    return response.data;
  },

  create: async (data: CreateConversionDTO) => {
    const response = await apiClient.post<ApiResponse<UnitConversion>>('/conversions', data);
    return response.data;
  },

  update: async (id: string, data: UpdateConversionDTO) => {
    const response = await apiClient.put<ApiResponse<UnitConversion>>(`/conversions/${id}`, data);
    return response.data;
  },

  delete: async (id: string) => {
    const response = await apiClient.delete<ApiResponse<null>>(`/conversions/${id}`);
    return response.data;
  }
};
