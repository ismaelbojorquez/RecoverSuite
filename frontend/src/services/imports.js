import { apiFetch } from '../utils/api.js';

export const createImportSession = async ({ portfolioId }) => {
  const result = await apiFetch('/api/imports/sessions', {
    method: 'POST',
    body: { portfolioId }
  });
  return result;
};

export const uploadImportFile = async ({ sessionId, file }) => {
  if (!sessionId || !file) {
    throw new Error('Sesion y archivo requeridos');
  }
  const formData = new FormData();
  formData.append('file', file);

  const result = await apiFetch(`/api/imports/sessions/${sessionId}/upload`, {
    method: 'POST',
    body: formData
  });
  return result;
};

export const getImportPreview = async ({ sessionId, limit = 50 }) => {
  const params = new URLSearchParams({ limit: String(limit) });
  const result = await apiFetch(`/api/imports/sessions/${sessionId}/preview?${params.toString()}`, {
    method: 'GET'
  });
  return result;
};

export const getImportTargets = async ({ portfolioId }) => {
  const params = new URLSearchParams({ portfolioId });
  const result = await apiFetch(`/api/imports/targets?${params.toString()}`, {
    method: 'GET'
  });
  return result;
};

export const saveImportMapping = async ({ sessionId, mapping, strategy, importConfig }) => {
  const result = await apiFetch(`/api/imports/sessions/${sessionId}/mapping`, {
    method: 'PUT',
    body: { mapping, strategy, importConfig }
  });
  return result;
};

export const validateImportSession = async ({ sessionId }) => {
  const result = await apiFetch(`/api/imports/sessions/${sessionId}/validate`, {
    method: 'POST'
  });
  return result;
};

export const runImportSession = async ({ sessionId }) => {
  const result = await apiFetch(`/api/imports/sessions/${sessionId}/run`, {
    method: 'POST'
  });
  return result;
};

export const getImportSession = async ({ sessionId, signal }) => {
  const result = await apiFetch(`/api/imports/sessions/${sessionId}`, {
    method: 'GET',
    signal
  });
  return result;
};

export const downloadImportErrors = async ({ sessionId, mode = 'errors' }) => {
  const token = window?.localStorage?.getItem('access_token');
  const url = new URL(`/api/imports/sessions/${sessionId}/errors`, window.location.origin);
  if (mode === 'rejected') {
    url.searchParams.set('mode', 'rejected');
  }
  const response = await fetch(url.toString(), {
    method: 'GET',
    headers: {
      ...(token ? { Authorization: `Bearer ${token}` } : {})
    }
  });
  if (!response.ok) {
    const text = await response.text();
    const err = new Error(text || 'No se pudo descargar');
    err.status = response.status;
    throw err;
  }
  const blob = await response.blob();
  return blob;
};
