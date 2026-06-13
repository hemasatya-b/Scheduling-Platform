import axios, { type AxiosRequestConfig, type AxiosResponse } from 'axios';
import type { ApiResponse } from '@/types';

export const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

api.interceptors.response.use(
  (response) => {
    const body = response.data as ApiResponse<unknown>;
    if (body && body.success === false) {
      return Promise.reject(new Error(body.error ?? 'Request failed'));
    }
    return body?.data as unknown as AxiosResponse;
  },
  (error) => {
    const body = error.response?.data as ApiResponse<unknown> | undefined;
    const message = body?.error ?? error.message ?? 'Request failed';
    const wrapped = new Error(message);
    (wrapped as Error & { status?: number }).status = error.response?.status;
    return Promise.reject(wrapped);
  },
);

// The response interceptor above unwraps ApiResponse<T> to T, so the
// resolved value of each axios call is already T, not AxiosResponse<T>.
export function apiGet<T>(url: string, config?: AxiosRequestConfig): Promise<T> {
  return api.get(url, config) as unknown as Promise<T>;
}

export function apiPost<T>(url: string, data?: unknown, config?: AxiosRequestConfig): Promise<T> {
  return api.post(url, data, config) as unknown as Promise<T>;
}

export function apiPut<T>(url: string, data?: unknown, config?: AxiosRequestConfig): Promise<T> {
  return api.put(url, data, config) as unknown as Promise<T>;
}

export function apiPatch<T>(url: string, data?: unknown, config?: AxiosRequestConfig): Promise<T> {
  return api.patch(url, data, config) as unknown as Promise<T>;
}

export function apiDelete<T>(url: string, config?: AxiosRequestConfig): Promise<T> {
  return api.delete(url, config) as unknown as Promise<T>;
}
