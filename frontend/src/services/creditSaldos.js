import { apiFetch } from '../utils/api.js';

export const getCreditSaldos = async ({ creditId, signal }) => {
  const result = await apiFetch(`/api/credits/${creditId}/saldos`, {
    method: 'GET',
    signal
  });

  return result || { data: [], credit: null };
};
