import { apiFetch } from '../utils/api.js';

const normalizeDictamen = (dictamen) => {
  if (!dictamen || typeof dictamen !== 'object') {
    return null;
  }

  const canales =
    dictamen.canales && typeof dictamen.canales === 'object' && !Array.isArray(dictamen.canales)
      ? dictamen.canales
      : {};

  return {
    ...dictamen,
    id: dictamen.id ?? dictamen._id ?? null,
    score: dictamen.score ?? dictamen.score_global ?? null,
    riesgo: dictamen.riesgo ?? dictamen.nivel_riesgo ?? null,
    tipoContacto: dictamen.tipoContacto ?? dictamen.tipo_contacto ?? null,
    canales: {
      llamada:
        canales.llamada !== undefined ? canales.llamada : dictamen.score_llamada ?? null,
      whatsapp:
        canales.whatsapp !== undefined ? canales.whatsapp : dictamen.score_whatsapp ?? null,
      sms: canales.sms !== undefined ? canales.sms : dictamen.score_sms ?? null,
      email: canales.email !== undefined ? canales.email : dictamen.score_email ?? null,
      visita: canales.visita !== undefined ? canales.visita : dictamen.score_visita ?? null
    },
    permiteContacto:
      dictamen.permiteContacto !== undefined
        ? dictamen.permiteContacto
        : dictamen.permitir_contacto ?? null,
    recomendarReintento:
      dictamen.recomendarReintento !== undefined
        ? dictamen.recomendarReintento
        : dictamen.recomendar_reintento ?? null,
    bloquearCliente:
      dictamen.bloquearCliente !== undefined
        ? dictamen.bloquearCliente
        : dictamen.bloquear_cliente ?? null
  };
};

const buildDictamenRequestBody = (body = {}) => {
  const safeBody = body && typeof body === 'object' ? body : {};
  const canales =
    safeBody.canales && typeof safeBody.canales === 'object' && !Array.isArray(safeBody.canales)
      ? safeBody.canales
      : {};

  return {
    ...safeBody,
    portafolio_id: safeBody.portafolio_id ?? safeBody.portafolioId,
    tipo_contacto: safeBody.tipo_contacto ?? safeBody.tipoContacto,
    score_global: safeBody.score_global ?? safeBody.score,
    nivel_riesgo: safeBody.nivel_riesgo ?? safeBody.riesgo,
    score_llamada:
      safeBody.score_llamada !== undefined ? safeBody.score_llamada : canales.llamada,
    score_whatsapp:
      safeBody.score_whatsapp !== undefined ? safeBody.score_whatsapp : canales.whatsapp,
    score_sms: safeBody.score_sms !== undefined ? safeBody.score_sms : canales.sms,
    score_email: safeBody.score_email !== undefined ? safeBody.score_email : canales.email,
    score_visita: safeBody.score_visita !== undefined ? safeBody.score_visita : canales.visita,
    permitir_contacto:
      safeBody.permitir_contacto !== undefined
        ? safeBody.permitir_contacto
        : safeBody.permiteContacto,
    recomendar_reintento:
      safeBody.recomendar_reintento !== undefined
        ? safeBody.recomendar_reintento
        : safeBody.recomendarReintento,
    bloquear_cliente:
      safeBody.bloquear_cliente !== undefined
        ? safeBody.bloquear_cliente
        : safeBody.bloquearCliente
  };
};

export const listDictamenes = async ({ portafolioId, activo, signal }) => {
  const params = new URLSearchParams();
  if (portafolioId) {
    params.set('portafolio_id', String(portafolioId));
  }
  if (activo !== undefined) {
    params.set('activo', activo ? 'true' : 'false');
  }

  const query = params.toString();
  const payload = await apiFetch(`/api/dictamenes${query ? `?${query}` : ''}`, {
    method: 'GET',
    signal
  });

  return Array.isArray(payload?.data) ? payload.data.map(normalizeDictamen).filter(Boolean) : [];
};

export const getDictamenById = async ({ id, signal }) => {
  const safeId = encodeURIComponent(String(id));
  const payload = await apiFetch(`/api/dictamenes/${safeId}`, {
    method: 'GET',
    signal
  });

  return normalizeDictamen(payload?.data);
};

export const createDictamen = async (body) => {
  const payload = await apiFetch('/api/dictamenes', {
    method: 'POST',
    body: buildDictamenRequestBody(body)
  });

  return normalizeDictamen(payload?.data);
};

export const updateDictamen = async (id, body) => {
  const safeId = encodeURIComponent(String(id));
  const payload = await apiFetch(`/api/dictamenes/${safeId}`, {
    method: 'PUT',
    body: buildDictamenRequestBody(body)
  });

  return normalizeDictamen(payload?.data);
};

export const deleteDictamen = async (id) => {
  const safeId = encodeURIComponent(String(id));
  await apiFetch(`/api/dictamenes/${safeId}`, {
    method: 'DELETE'
  });

  return true;
};
