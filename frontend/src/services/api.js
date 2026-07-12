import axios from 'axios';
import toast from 'react-hot-toast';
import { getIdToken } from './auth.service.js';

/**
 * Centralized Axios instance.
 *
 * - Base URL from VITE_API_BASE_URL.
 * - Request interceptor attaches Firebase ID token.
 * - Response interceptor normalizes errors and surfaces server faults.
 *
 * All service modules import `api` from here rather than importing axios.
 */
const BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000';

export const api = axios.create({
  baseURL: BASE_URL,
  // Reduced from 20s → 8s so loading states don't freeze the UI waiting for a
  // dead backend. withFallback() will return mock data after the timeout.
  timeout: 8000,
  headers: { 'Content-Type': 'application/json' },
});

/* ─── Request interceptor: attach auth token + diagnostic log ────── */
api.interceptors.request.use(
  async (config) => {
    try {
      const token = await getIdToken();
      if (token) config.headers.Authorization = `Bearer ${token}`;
    } catch {
      /* ignore — request proceeds unauthenticated */
    }
    if (import.meta.env.DEV) {
      console.debug(`[API] ➜ ${config.method?.toUpperCase()} ${config.baseURL}${config.url}`, config.params || '');
    }
    return config;
  },
  (error) => Promise.reject(error)
);

/* ─── Response interceptor: normalize errors + diagnostic log ────── */
let unauthorizedToastShown = false;

api.interceptors.response.use(
  (response) => {
    if (import.meta.env.DEV) {
      console.debug(
        `[API] ✓ ${response.status} ${response.config.url}`,
        response.data
      );
    }
    return response;
  },
  (error) => {
    const status = error.response?.status;
    let message =
      error.response?.data?.message ||
      error.response?.data?.detail ||
      error.message ||
      'Something went wrong.';

    if (Array.isArray(message)) {
      message = message.map(m => m.msg || JSON.stringify(m)).join(', ');
    }

    if (import.meta.env.DEV) {
      console.warn(
        `[API] ✗ ${status ?? 'NETWORK'} ${error.config?.url ?? ''}`,
        message,
        error.code ?? ''
      );
    }

    if (status === 401) {
      if (!unauthorizedToastShown) {
        unauthorizedToastShown = true;
        toast.error('Your session expired. Please sign in again.');
        setTimeout(() => { unauthorizedToastShown = false; }, 5000);
      }
    } else if (status === 403) {
      toast.error('You do not have permission to perform this action.');
    } else if (status >= 500) {
      toast.error('Server error. Please try again.');
    }
    // Network failures (no response) are caught silently and handled by withFallback.

    return Promise.reject({ status, message, code: error.code, raw: error });
  }
);

export const unwrap = (res) => res?.data;

/**
 * Helper used by service modules.
 *
 * Attempts the real API call. If the backend is unreachable / errors,
 * returns the provided fallback data. This makes every page demoable
 * during integration without throwing.
 *
 * To disable fallback (strict mode), set VITE_API_STRICT=true in your env.
 */
const STRICT = import.meta.env.VITE_API_STRICT === 'true';

export async function withFallback(promise, fallback, options = {}) {
  const { enabled = true } = options;
  try {
    const result = await promise;
    return result;
  } catch (err) {
    if (STRICT || !enabled) throw err;
    console.warn('[API] withFallback: using mock data due to error', err?.message ?? err);
    return typeof fallback === 'function' ? fallback() : fallback;
  }
}

export default api;
