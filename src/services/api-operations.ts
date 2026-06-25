import { apiClient } from '@/services/api';
import { API_ROUTES } from '@/config/api';
import type { AuthResponse, LoginRequest, Item } from '@/types/api';

/**
 * Auth API service
 * Example of organized API calls for a feature
 */
export const authApi = {
  login: async (payload: LoginRequest): Promise<AuthResponse> => {
    const response = await apiClient.post<AuthResponse>(
      API_ROUTES.auth.login,
      payload
    );
    return response.data;
  },

  register: async (payload: any): Promise<AuthResponse> => {
    const response = await apiClient.post<AuthResponse>(
      API_ROUTES.auth.register,
      payload
    );
    return response.data;
  },

  getProfile: async (): Promise<any> => {
    const response = await apiClient.get(API_ROUTES.auth.profile);
    return response.data;
  },
};

/**
 * Home API service
 * Example of organized API calls for another feature
 */
export const homeApi = {
  getItems: async (): Promise<Item[]> => {
    const response = await apiClient.get<Item[]>(API_ROUTES.home.list);
    return response.data;
  },

  getItem: async (id: string): Promise<Item> => {
    const response = await apiClient.get<Item>(API_ROUTES.home.detail(id));
    return response.data;
  },
};
