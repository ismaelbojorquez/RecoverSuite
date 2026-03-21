import { apiFetch } from '../utils/api.js';
import { getStoredAccessToken } from '../utils/jwt.js';

const CHANNEL_OPTIONS = Object.freeze(['LLAMADA', 'WHATSAPP', 'SMS', 'EMAIL', 'VISITA']);

const CHANNEL_KEY_BY_VALUE = Object.freeze({
  LLAMADA: 'llamada',
  WHATSAPP: 'whatsapp',
  SMS: 'sms',
  EMAIL: 'email',
  VISITA: 'visita'
});

const normalizeNumber = (value) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
};

const normalizeFilters = (filters) => {
  const safeFilters = filters && typeof filters === 'object' ? filters : {};

  return {
    riesgo: safeFilters.riesgo || null,
    scoreMin: normalizeNumber(safeFilters.scoreMin ?? safeFilters.score_min),
    scoreMax: normalizeNumber(safeFilters.scoreMax ?? safeFilters.score_max),
    portafolioId: safeFilters.portafolioId ?? safeFilters.portafolio_id ?? null
  };
};

const normalizeDownloads = (downloads, id, archivos = {}) => {
  const safeDownloads = downloads && typeof downloads === 'object' ? downloads : {};

  return {
    llamada:
      safeDownloads.llamada ||
      (archivos.llamada ? `/api/campaigns/${id}/download/LLAMADA` : null),
    whatsapp:
      safeDownloads.whatsapp ||
      (archivos.whatsapp ? `/api/campaigns/${id}/download/WHATSAPP` : null),
    sms: safeDownloads.sms || (archivos.sms ? `/api/campaigns/${id}/download/SMS` : null),
    email:
      safeDownloads.email || (archivos.email ? `/api/campaigns/${id}/download/EMAIL` : null),
    visita:
      safeDownloads.visita || (archivos.visita ? `/api/campaigns/${id}/download/VISITA` : null)
  };
};

const normalizeCampaign = (campaign) => {
  if (!campaign || typeof campaign !== 'object') {
    return null;
  }

  const id = campaign.id ?? campaign._id ?? null;
  const archivos =
    campaign.archivos && typeof campaign.archivos === 'object' ? campaign.archivos : {};
  const canales = Array.isArray(campaign.canales)
    ? campaign.canales.map((value) => String(value || '').trim().toUpperCase()).filter(Boolean)
    : [];

  return {
    ...campaign,
    id,
    fechaCreacion:
      campaign.fechaCreacion ?? campaign.fecha_creacion ?? campaign.createdAt ?? null,
    creadoPor: campaign.creadoPor ?? campaign.creado_por ?? null,
    filtros: normalizeFilters(campaign.filtros),
    canales,
    totalClientes:
      normalizeNumber(campaign.totalClientes ?? campaign.total_clientes ?? campaign.total) ?? 0,
    archivos,
    downloads: normalizeDownloads(campaign.downloads, id, archivos)
  };
};

const normalizeGroupedPayload = (grouped) => {
  const safeGrouped = grouped && typeof grouped === 'object' ? grouped : {};

  return {
    llamada: Array.isArray(safeGrouped.llamada) ? safeGrouped.llamada : [],
    whatsapp: Array.isArray(safeGrouped.whatsapp) ? safeGrouped.whatsapp : [],
    sms: Array.isArray(safeGrouped.sms) ? safeGrouped.sms : [],
    email: Array.isArray(safeGrouped.email) ? safeGrouped.email : [],
    visita: Array.isArray(safeGrouped.visita) ? safeGrouped.visita : []
  };
};

const buildGenerateBody = ({ nombre, filtros = {}, canales = [] } = {}) => ({
  nombre: String(nombre || '').trim() || undefined,
  filtros: {
    riesgo: filtros.riesgo || undefined,
    scoreMin:
      filtros.scoreMin === '' || filtros.scoreMin === undefined || filtros.scoreMin === null
        ? undefined
        : Number(filtros.scoreMin),
    scoreMax:
      filtros.scoreMax === '' || filtros.scoreMax === undefined || filtros.scoreMax === null
        ? undefined
        : Number(filtros.scoreMax)
  },
  canales: Array.isArray(canales)
    ? canales
        .map((value) => String(value || '').trim().toUpperCase())
        .filter((value) => CHANNEL_OPTIONS.includes(value))
    : []
});

const resolveDownloadFileName = (response, fallbackName) => {
  const disposition = response.headers.get('content-disposition') || '';
  const utf8Match = disposition.match(/filename\*=UTF-8''([^;]+)/i);
  if (utf8Match?.[1]) {
    return decodeURIComponent(utf8Match[1]);
  }

  const asciiMatch = disposition.match(/filename="?([^"]+)"?/i);
  if (asciiMatch?.[1]) {
    return asciiMatch[1];
  }

  return fallbackName;
};

export const listCampaigns = async ({ limit = 50, offset = 0, signal } = {}) => {
  const params = new URLSearchParams();
  params.set('limit', String(limit));
  params.set('offset', String(offset));

  const payload = await apiFetch(`/api/campaigns?${params.toString()}`, {
    method: 'GET',
    signal
  });

  return Array.isArray(payload?.data) ? payload.data.map(normalizeCampaign).filter(Boolean) : [];
};

export const getCampaignById = async ({ id, signal }) => {
  const payload = await apiFetch(`/api/campaigns/${encodeURIComponent(String(id))}`, {
    method: 'GET',
    signal
  });

  return normalizeCampaign(payload?.data);
};

export const generateCampaign = async ({ nombre, filtros = {}, canales = [] } = {}) => {
  const payload = await apiFetch('/api/campaigns/generar', {
    method: 'POST',
    body: buildGenerateBody({ nombre, filtros, canales })
  });

  return {
    campaign: normalizeCampaign(payload?.data?.campaign),
    grouped: normalizeGroupedPayload(payload?.data?.agrupados)
  };
};

export const downloadCampaignFile = async ({ id, canal }) => {
  const normalizedChannel = String(canal || '').trim().toUpperCase();
  const channelKey = CHANNEL_KEY_BY_VALUE[normalizedChannel];

  if (!channelKey) {
    throw new Error('Canal invalido.');
  }

  const token = getStoredAccessToken();
  const response = await fetch(`/api/campaigns/${encodeURIComponent(String(id))}/download/${normalizedChannel}`, {
    method: 'GET',
    headers: token ? { Authorization: `Bearer ${token}` } : {}
  });

  if (!response.ok) {
    let message = 'No fue posible descargar el archivo.';
    const rawBody = await response.text();

    if (rawBody) {
      try {
        const payload = JSON.parse(rawBody);
        message = payload?.message || payload?.error || message;
      } catch {
        message = rawBody;
      }
    }

    const error = new Error(message);
    error.status = response.status;
    throw error;
  }

  return {
    blob: await response.blob(),
    fileName: resolveDownloadFileName(response, `campaign_${channelKey}.xlsx`)
  };
};

export { CHANNEL_OPTIONS, CHANNEL_KEY_BY_VALUE, normalizeCampaign };
