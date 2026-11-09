import axios, { type AxiosRequestConfig } from 'axios';
import { getStudentId } from './studentStore';

declare global {
  interface Window {
    __APP_CONFIG__?: { apiUrl?: string };
  }
}

declare module 'axios' {
  interface AxiosRequestConfig {
    /** Attach the stored student id as the X-Student-Id header. */
    withStudent?: boolean;
  }
}

/** Runtime config (Docker) > build-time env > local default. Never hard-coded in components. */
export function getApiUrl(): string {
  const runtime = typeof window !== 'undefined' ? window.__APP_CONFIG__?.apiUrl : undefined;
  const url = runtime || import.meta.env.VITE_API_URL || 'http://localhost:8080';
  return String(url).replace(/\/+$/, '');
}

export class AppError extends Error {
  constructor(
    message: string,
    public readonly kind: 'network' | 'http' | 'client' | 'canceled',
    public readonly status?: number,
    public readonly code?: string,
  ) {
    super(message);
    this.name = 'AppError';
  }
}

// ---- server clock -----------------------------------------------------------------------
// Countdowns use the server's clock, not the device's, so a wrong laptop clock cannot make a
// hold look longer or shorter than it really is.
let serverOffsetMs = 0;
export const getServerNow = () => Date.now() + serverOffsetMs;
export function setServerOffsetFromHeader(value: unknown) {
  if (typeof value !== 'string') return;
  const server = Date.parse(value);
  if (!Number.isNaN(server)) serverOffsetMs = server - Date.now();
}

export const api = axios.create({ baseURL: getApiUrl(), timeout: 15_000 });

api.interceptors.request.use((config) => {
  if (config.withStudent) {
    const id = getStudentId();
    if (!id) throw new AppError('Enter your 17-digit student ID first.', 'client', undefined, 'student_id_missing');
    config.headers.set('X-Student-Id', id);
  }
  return config;
});

api.interceptors.response.use(
  (res) => {
    setServerOffsetFromHeader(res.headers?.['x-server-time']);
    return res;
  },
  (err) => {
    setServerOffsetFromHeader(err?.response?.headers?.['x-server-time']);
    return Promise.reject(err);
  },
);

const FALLBACK_BY_STATUS: Record<number, string> = {
  400: 'Please check the information you entered and try again.',
  403: 'This application belongs to a different student.',
  404: 'We could not find what you were looking for.',
  409: 'That action is not possible right now. The page has been refreshed with the latest information.',
};

export function toAppError(err: unknown): AppError {
  if (err instanceof AppError) return err;

  if (axios.isAxiosError(err)) {
    if (err.code === 'ERR_CANCELED') return new AppError('Request cancelled.', 'canceled');

    if (!err.response) {
      return new AppError(
        'We cannot reach the admission server right now. Please check your connection and try again.',
        'network',
      );
    }

    const status = err.response.status;
    const body = err.response.data as { error?: { code?: string; message?: string } } | undefined;
    const message =
      body?.error?.message ||
      FALLBACK_BY_STATUS[status] ||
      (status >= 500
        ? 'The server ran into a problem. Please try again in a moment.'
        : 'Something went wrong. Please try again.');
    return new AppError(message, 'http', status, body?.error?.code);
  }

  return new AppError('Something unexpected happened. Please try again.', 'client');
}

/** Runs a request and always rejects with an AppError carrying a readable message. */
export async function request<T>(config: AxiosRequestConfig): Promise<T> {
  try {
    const res = await api.request<T>(config);
    return res.data;
  } catch (e) {
    throw toAppError(e);
  }
}
