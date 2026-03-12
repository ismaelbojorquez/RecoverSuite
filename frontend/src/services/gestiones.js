import { apiFetch } from '../utils/api.js';

export const listResultadosGestion = async ({ portafolioId, activo = true }) => {
  const params = new URLSearchParams();
  if (portafolioId) params.set('portafolio_id', String(portafolioId));
  if (activo !== undefined) params.set('activo', activo ? 'true' : 'false');

  const payload = await apiFetch(`/api/gestiones/resultados?${params.toString()}`, {
    method: 'GET'
  });

  return Array.isArray(payload?.data) ? payload.data : [];
};

export const createGestion = async (body) => {
  const payload = await apiFetch('/api/gestiones', {
    method: 'POST',
    body
  });

  return payload?.data;
};

export const listHistorialGestiones = async ({
  clienteId,
  portafolioId,
  limit = 20,
  offset = 0
}) => {
  const safeClientId = encodeURIComponent(String(clienteId));
  const params = new URLSearchParams({
    portafolio_id: String(portafolioId),
    limit: String(limit),
    offset: String(offset)
  });

  const payload = await apiFetch(
    `/api/gestiones/clientes/${safeClientId}/historial?${params.toString()}`,
    { method: 'GET' }
  );

  return {
    data: Array.isArray(payload?.data) ? payload.data : [],
    meta: payload?.meta || {}
  };
};
