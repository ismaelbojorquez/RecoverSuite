import { apiFetch } from '../utils/api.js';

export const listPermissions = async ({ limit = 500, offset = 0, signal } = {}) => {
  const params = new URLSearchParams({
    limit: String(limit),
    offset: String(offset)
  });

  const payload = await apiFetch(`/api/permissions?${params.toString()}`, {
    method: 'GET',
    signal
  });

  if (payload?.data) {
    return payload.data;
  }
  return Array.isArray(payload) ? payload : [];
};
