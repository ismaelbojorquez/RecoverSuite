import { apiFetch } from '../utils/api.js';

export const listClients = async ({
  portafolioId,
  limit,
  offset,
  query,
  signal
}) => {
  const params = new URLSearchParams({
    portafolio_id: String(portafolioId),
    limit: String(limit),
    offset: String(offset)
  });

  if (query) {
    params.set('q', query);
  }

  const payload = await apiFetch(`/api/clients?${params.toString()}`, {
    method: 'GET',
    signal
  });
  return Array.isArray(payload?.data) ? payload.data : [];
};

export const getClientById = async ({ id, portafolioId, signal }) => {
  const safeId = encodeURIComponent(String(id));
  const params = new URLSearchParams();
  if (portafolioId) {
    params.set('portafolio_id', String(portafolioId));
  }

  const suffix = params.toString();
  const payload = await apiFetch(`/api/clients/${safeId}${suffix ? `?${suffix}` : ''}`, {
    method: 'GET',
    signal
  });
  return payload?.data || null;
};

export const createClient = async ({
  portafolioId,
  numero_cliente,
  nombre,
  nombre_completo,
  apellido_paterno,
  apellido_materno,
  rfc,
  curp
}) => {
  const payload = await apiFetch('/api/clients', {
    method: 'POST',
    body: {
      portafolio_id: portafolioId,
      numero_cliente,
      nombre,
      nombre_completo,
      apellido_paterno,
      apellido_materno,
      rfc,
      curp
    }
  });
  return payload?.data || null;
};

export const updateClient = async ({
  id,
  portafolioId,
  numero_cliente,
  nombre,
  nombre_completo,
  apellido_paterno,
  apellido_materno,
  rfc,
  curp
}) => {
  const safeId = encodeURIComponent(String(id));
  const payload = await apiFetch(`/api/clients/${safeId}`, {
    method: 'PUT',
    body: {
      portafolio_id: portafolioId,
      numero_cliente,
      nombre,
      nombre_completo,
      apellido_paterno,
      apellido_materno,
      rfc,
      curp
    }
  });
  return payload?.data || null;
};

export const getClientDetail = async ({ id, signal }) => {
  const safeId = encodeURIComponent(String(id));
  const payload = await apiFetch(`/api/clients/${safeId}/detail`, {
    method: 'GET',
    signal
  });
  return payload?.data || null;
};
