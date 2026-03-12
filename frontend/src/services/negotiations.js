import { apiFetch } from '../utils/api.js';

const normalizeData = (payload) => payload?.data || payload || null;

export const listAvailableDiscountLevels = async () => {
  const payload = await apiFetch('/api/negotiations/discount-levels/available', {
    method: 'GET'
  });

  return Array.isArray(payload?.data) ? payload.data : [];
};

export const listDiscountLevels = async ({ includeInactive = false, signal } = {}) => {
  const params = new URLSearchParams();
  if (includeInactive) {
    params.set('include_inactive', 'true');
  }

  const payload = await apiFetch(
    `/api/negotiations/discount-levels${params.toString() ? `?${params.toString()}` : ''}`,
    {
      method: 'GET',
      signal
    }
  );

  return Array.isArray(payload?.data) ? payload.data : [];
};

export const createDiscountLevel = async ({
  nombre,
  descripcion,
  porcentaje_descuento,
  activo = true
}) => {
  const payload = await apiFetch('/api/negotiations/discount-levels', {
    method: 'POST',
    body: {
      nombre,
      descripcion,
      porcentaje_descuento,
      activo
    }
  });

  return normalizeData(payload);
};

export const updateDiscountLevel = async (
  id,
  { nombre, descripcion, porcentaje_descuento, activo }
) => {
  const payload = await apiFetch(`/api/negotiations/discount-levels/${id}`, {
    method: 'PUT',
    body: {
      nombre,
      descripcion,
      porcentaje_descuento,
      activo
    }
  });

  return normalizeData(payload);
};

export const setDiscountLevelGroups = async ({ discountLevelId, groupIds }) => {
  const payload = await apiFetch(`/api/negotiations/discount-levels/${discountLevelId}/groups`, {
    method: 'PUT',
    body: {
      group_ids: groupIds
    }
  });

  return normalizeData(payload);
};

export const listClientNegotiations = async ({
  clienteId,
  portafolioId,
  limit = 20,
  offset = 0
}) => {
  const params = new URLSearchParams({
    portafolio_id: String(portafolioId),
    limit: String(limit),
    offset: String(offset)
  });

  const payload = await apiFetch(
    `/api/negotiations/clientes/${encodeURIComponent(String(clienteId))}?${params.toString()}`,
    {
      method: 'GET'
    }
  );

  return {
    active: payload?.active || null,
    history: Array.isArray(payload?.history) ? payload.history : [],
    data: Array.isArray(payload?.data) ? payload.data : [],
    meta: payload?.meta || {}
  };
};

export const createNegotiation = async (body) => {
  const payload = await apiFetch('/api/negotiations', {
    method: 'POST',
    body
  });

  return normalizeData(payload);
};

export const updateNegotiationStatus = async ({
  negotiationId,
  estado,
  observaciones,
  monto_negociado_total
}) => {
  const payload = await apiFetch(`/api/negotiations/${negotiationId}/status`, {
    method: 'PUT',
    body: {
      estado,
      observaciones,
      monto_negociado_total
    }
  });

  return normalizeData(payload);
};

