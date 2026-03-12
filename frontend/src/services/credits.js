import { apiFetch } from '../utils/api.js';

export const listCredits = async ({ portafolioId, limit = 10, offset = 0, query, signal }) => {
  const params = new URLSearchParams({
    limit: String(limit),
    offset: String(offset)
  });

  if (portafolioId) {
    params.set('portafolio_id', String(portafolioId));
  }
  if (query) {
    params.set('q', query);
  }

  const payload = await apiFetch(`/api/credits?${params.toString()}`, {
    method: 'GET',
    signal
  });
  return Array.isArray(payload?.data) ? payload.data : [];
};

export const createCredit = async ({
  cliente_id,
  portafolio_id,
  numero_credito,
  producto
}) => {
  const payload = await apiFetch('/api/credits', {
    method: 'POST',
    body: {
      cliente_id,
      portafolio_id,
      numero_credito,
      producto
    }
  });

  return payload?.data || null;
};
