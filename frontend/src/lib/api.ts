import axios, { AxiosError, InternalAxiosRequestConfig } from 'axios';
import { useAuthStore } from '@/store/auth';

export const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL ?? '/api',
  withCredentials: true, // send httpOnly refresh cookie
  timeout: 15_000,
});

// Attach in-memory bearer token — FIX S-2: read from getToken(), not from persisted store
api.interceptors.request.use((config: InternalAxiosRequestConfig) => {
  const token = useAuthStore.getState().getToken();
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// Auto-refresh on 401 using httpOnly refresh cookie
let refreshing: Promise<string | null> | null = null;

api.interceptors.response.use(
  (r) => r,
  async (error: AxiosError) => {
    const original = error.config as InternalAxiosRequestConfig & { _retry?: boolean };
    if (error.response?.status === 401 && !original._retry && !original.url?.includes('/auth/')) {
      original._retry = true;
      if (!refreshing) {
        refreshing = api.post<{ data: { token: string } }>('/auth/refresh')
          .then((r) => {
            useAuthStore.getState().setToken(r.data.data.token);
            return r.data.data.token;
          })
          .catch(() => {
            useAuthStore.getState().logout();
            return null;
          })
          .finally(() => { refreshing = null; });
      }
      const newToken = await refreshing;
      if (newToken) {
        original.headers.Authorization = `Bearer ${newToken}`;
        return api(original);
      }
    }
    return Promise.reject(error);
  }
);
