import {
  clearStoredTokens,
  getStoredAccessToken,
  setStoredAccessToken
} from './jwt.js';
import { buildRoutePath } from '../routes/paths.js';

const API_ERROR_EVENT = 'crm-api-error';
const LAST_API_ERROR_KEY = '__crm_last_api_error';

export const onApiError = (handler) => {
  if (typeof window === 'undefined') {
    return () => {};
  }

  const listener = (event) => handler(event.detail);
  window.addEventListener(API_ERROR_EVENT, listener);

  return () => window.removeEventListener(API_ERROR_EVENT, listener);
};

const notifyApiError = (payload) => {
  if (typeof window === 'undefined') {
    return;
  }

  window[LAST_API_ERROR_KEY] = {
    message: payload?.message || '',
    status: payload?.status || null,
    at: Date.now()
  };

  window.dispatchEvent(new CustomEvent(API_ERROR_EVENT, { detail: payload }));
};

export const getRecentApiError = (maxAgeMs = 1500) => {
  if (typeof window === 'undefined') {
    return null;
  }

  const meta = window[LAST_API_ERROR_KEY];
  if (!meta || typeof meta !== 'object') {
    return null;
  }

  if (Date.now() - Number(meta.at || 0) > maxAgeMs) {
    return null;
  }

  return meta;
};

const parseJsonSafely = async (response) => {
  try {
    return await response.json();
  } catch (err) {
    return null;
  }
};

const resolveMessage = (status, message) => {
  if (status === 401) {
    return 'Tu sesion expiro. Inicia sesion nuevamente.';
  }

  if (status === 403) {
    return 'No tienes permisos para realizar esta accion.';
  }

  if (status >= 500) {
    return 'Ocurrio un error en el servidor. Intenta mas tarde.';
  }

  return message || `Error (${status})`;
};

const handleApiError = (status, message, { silent } = {}) => {
  const resolvedMessage = resolveMessage(status, message);

  if (status === 401) {
    clearStoredTokens();

    if (!silent) {
      notifyApiError({
        status,
        title: 'Sesion expirada',
        message: resolvedMessage,
        severity: 'warning',
        mode: 'snackbar'
      });
    }

    if (typeof window !== 'undefined') {
      window.history.replaceState({}, '', buildRoutePath('login'));
      window.dispatchEvent(new Event('popstate'));
    }

    return;
  }

  if (silent) {
    return;
  }

  if (status === 403) {
    notifyApiError({
      status,
      title: 'Acceso denegado',
      message: resolvedMessage,
      severity: 'warning',
      mode: 'snackbar'
    });
    if (typeof window !== 'undefined') {
      window.history.replaceState({}, '', buildRoutePath('forbidden'));
      window.dispatchEvent(new Event('popstate'));
    }
    return;
  }

  if (status >= 500) {
    notifyApiError({
      status,
      title: 'Error del servidor',
      message: resolvedMessage,
      severity: 'error',
      mode: 'dialog'
    });
    return;
  }

  notifyApiError({
    status,
    title: 'Error',
    message: resolvedMessage,
    severity: 'error',
    mode: 'snackbar'
  });
};

const buildHeaders = (initHeaders = {}) => {
  const headers = new Headers(initHeaders);
  if (!headers.has('Accept')) {
    headers.set('Accept', 'application/json');
  }

  const token = getStoredAccessToken();
  if (token && !headers.has('Authorization')) {
    headers.set('Authorization', `Bearer ${token}`);
  }

  return headers;
};

const serializeBody = (body, headers) => {
  if (
    body === undefined ||
    body === null ||
    typeof body === 'string' ||
    body instanceof FormData ||
    body instanceof Blob ||
    body instanceof URLSearchParams
  ) {
    return body;
  }

  if (!headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json');
  }

  return JSON.stringify(body);
};

export const apiFetch = async (input, init = {}, options = {}) => {
  const headers = buildHeaders(init.headers || {});
  const body = serializeBody(init.body, headers);

  const response = await fetch(input, { ...init, headers, body });

  if (!response.ok) {
    const payload = await parseJsonSafely(response);
    const message = payload?.message || payload?.error;
    handleApiError(response.status, message, options);

    const error = new Error(resolveMessage(response.status, message));
    error.status = response.status;
    error.payload = payload;
    throw error;
  }

  if (response.status === 204) {
    return null;
  }

  return parseJsonSafely(response);
};
