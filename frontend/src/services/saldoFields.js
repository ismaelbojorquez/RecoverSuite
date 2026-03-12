import { apiFetch } from '../utils/api.js';

const normalizeResponse = (payload) => (payload?.data ? payload.data : payload || []);

export const listSaldoFields = async ({ portfolioId, signal }) => {
  const payload = await apiFetch(`/api/portfolios/${portfolioId}/saldo-fields`, {
    method: 'GET',
    signal
  });
  return normalizeResponse(payload);
};

export const createSaldoField = async ({ portfolioId, data }) => {
  const payload = await apiFetch(`/api/portfolios/${portfolioId}/saldo-fields`, {
    method: 'POST',
    body: JSON.stringify(data)
  });
  return payload?.data || payload;
};

export const updateSaldoField = async ({ fieldId, data }) => {
  const payload = await apiFetch(`/api/saldo-fields/${fieldId}`, {
    method: 'PUT',
    body: JSON.stringify(data)
  });
  return payload?.data || payload;
};

export const deleteSaldoField = async ({ fieldId }) =>
  apiFetch(`/api/saldo-fields/${fieldId}`, { method: 'DELETE' });
