import { apiFetch } from '../utils/api.js';

export const listPortfolios = async ({ limit, offset, signal }) => {
  const params = new URLSearchParams({
    limit: String(limit),
    offset: String(offset)
  });

  const payload = await apiFetch(`/api/portfolios?${params.toString()}`, {
    method: 'GET',
    signal
  });
  return Array.isArray(payload?.data) ? payload.data : [];
};

export const createPortfolio = async (payload) => {
  const result = await apiFetch('/api/portfolios', {
    method: 'POST',
    body: payload
  });
  return result?.data || null;
};

export const updatePortfolio = async (id, payload) => {
  const result = await apiFetch(`/api/portfolios/${id}`, {
    method: 'PUT',
    body: payload
  });
  return result?.data || null;
};

export const getPortfolioById = async ({ id, signal }) => {
  const result = await apiFetch(`/api/portfolios/${id}`, {
    method: 'GET',
    signal
  });
  return result?.data || null;
};

export const deletePortfolio = async (id) => {
  await apiFetch(`/api/portfolios/${id}`, {
    method: 'DELETE'
  });
  return true;
};
