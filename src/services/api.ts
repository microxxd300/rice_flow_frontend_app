import AsyncStorage from '@react-native-async-storage/async-storage';
import { API_CONFIG, API_ROUTES } from '@/config';
import { STORAGE_KEYS } from '@/constants/api';

const BASE_URL: string = (API_CONFIG as any).baseURL as string;
const DEFAULT_TIMEOUT: number = (API_CONFIG as any).timeout ?? 30000;

class ApiClient {
  private async getToken(): Promise<string | null> {
    const raw = await AsyncStorage.getItem(STORAGE_KEYS.ACCESS_TOKEN);
    return raw ? (JSON.parse(raw) as string) : null;
  }

  private async doRefresh(): Promise<string | null> {
    const raw = await AsyncStorage.getItem(STORAGE_KEYS.REFRESH_TOKEN);
    const refreshToken = raw ? (JSON.parse(raw) as string) : null;
    if (!refreshToken) return null;
    try {
      const res = await fetch(`${BASE_URL}/${API_ROUTES.token.refresh}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ refresh: refreshToken }),
      });
      if (!res.ok) throw new Error('refresh failed');
      const { access } = await res.json();
      await AsyncStorage.setItem(STORAGE_KEYS.ACCESS_TOKEN, JSON.stringify(access));
      return access as string;
    } catch {
      await AsyncStorage.removeItem(STORAGE_KEYS.ACCESS_TOKEN);
      await AsyncStorage.removeItem(STORAGE_KEYS.REFRESH_TOKEN);
      return null;
    }
  }

  private async request<T>(
    method: string,
    url: string,
    data?: any,
    options?: { timeout?: number }
  ): Promise<{ data: T }> {
    const token = await this.getToken();
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      'ngrok-skip-browser-warning': 'true',
    };
    if (token) headers['Authorization'] = `Bearer ${token}`;

    const timeout = options?.timeout ?? DEFAULT_TIMEOUT;
    const controller = new AbortController();
    const tid = setTimeout(() => controller.abort(), timeout);

    const init: RequestInit = { method, headers, signal: controller.signal };
    if (data !== undefined) init.body = JSON.stringify(data);

    let res = await fetch(`${BASE_URL}/${url}`, init);
    clearTimeout(tid);

    if (res.status === 401) {
      const newToken = await this.doRefresh();
      if (newToken) {
        headers['Authorization'] = `Bearer ${newToken}`;
        const ctrl2 = new AbortController();
        const tid2 = setTimeout(() => ctrl2.abort(), timeout);
        res = await fetch(`${BASE_URL}/${url}`, { ...init, headers, signal: ctrl2.signal });
        clearTimeout(tid2);
      }
    }

    if (!res.ok) {
      const body = await res.json().catch(() => ({ detail: res.statusText }));
      const err: any = new Error(`HTTP ${res.status}`);
      err.response = { status: res.status, data: body };
      throw err;
    }

    if (res.status === 204) return { data: null as any };
    return { data: await res.json() };
  }

  async get<T>(url: string, config?: any) {
    return this.request<T>('GET', url, undefined, config);
  }

  async post<T>(url: string, data?: any, config?: any) {
    return this.request<T>('POST', url, data, config);
  }

  async put<T>(url: string, data?: any, config?: any) {
    return this.request<T>('PUT', url, data, config);
  }

  async patch<T>(url: string, data?: any, config?: any) {
    return this.request<T>('PATCH', url, data, config);
  }

  async delete<T>(url: string, config?: any) {
    return this.request<T>('DELETE', url, undefined, config);
  }
}

export const apiClient = new ApiClient();
