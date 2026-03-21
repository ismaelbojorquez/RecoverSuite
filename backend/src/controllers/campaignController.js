import {
  generarCampañaDetallada,
  listarCampañas,
  obtenerArchivoCampaña,
  obtenerCampañaPorId
} from '../services/campaignService.js';

const serializeCampaign = (campaign) => {
  const rawCampaign =
    campaign && typeof campaign.toObject === 'function' ? campaign.toObject() : campaign;

  if (!rawCampaign) {
    return null;
  }

  const id = rawCampaign.id || rawCampaign._id?.toString() || null;
  const archivos = rawCampaign.archivos || {};

  return {
    ...rawCampaign,
    id,
    archivos,
    downloads: {
      llamada: archivos.llamada ? `/api/campaigns/${id}/download/LLAMADA` : null,
      whatsapp: archivos.whatsapp ? `/api/campaigns/${id}/download/WHATSAPP` : null,
      sms: archivos.sms ? `/api/campaigns/${id}/download/SMS` : null,
      email: archivos.email ? `/api/campaigns/${id}/download/EMAIL` : null,
      visita: archivos.visita ? `/api/campaigns/${id}/download/VISITA` : null
    }
  };
};

export const generarCampaignHandler = async (req, res, next) => {
  try {
    const rawFilters = {
      ...(req.body?.filtros && typeof req.body.filtros === 'object' ? req.body.filtros : {})
    };

    for (const key of [
      'nombre',
      'name',
      'riesgo',
      'scoreMin',
      'scoreMax',
      'score_min',
      'score_max',
      'portafolioId',
      'portafolio_id',
      'debtThreshold',
      'debt_threshold',
      'historyWindowDays',
      'history_window_days',
      'limit',
      'offset'
    ]) {
      if (req.body?.[key] !== undefined && rawFilters[key] === undefined) {
        rawFilters[key] = req.body[key];
      }
    }

    const { grouped, campaign } = await generarCampañaDetallada(rawFilters, req.body?.canales, {
      createdBy: req.user?.id || req.user?.user_id || req.user?.sub,
      collectGroupedRecords: false
    });

    res.status(201).json({
      data: {
        campaign: serializeCampaign(campaign),
        agrupados: grouped
      }
    });
  } catch (err) {
    next(err);
  }
};

export const listCampaignsHandler = async (req, res, next) => {
  try {
    const campaigns = await listarCampañas({
      limit: req.query?.limit,
      offset: req.query?.offset
    });

    res.status(200).json({
      data: campaigns.map(serializeCampaign)
    });
  } catch (err) {
    next(err);
  }
};

export const getCampaignHandler = async (req, res, next) => {
  try {
    const campaign = await obtenerCampañaPorId(req.params.id);
    res.status(200).json({ data: serializeCampaign(campaign) });
  } catch (err) {
    next(err);
  }
};

export const downloadCampaignFileHandler = async (req, res, next) => {
  try {
    const descriptor = await obtenerArchivoCampaña(req.params.id, req.params.canal);
    res.download(descriptor.absolutePath, descriptor.fileName);
  } catch (err) {
    next(err);
  }
};

export default {
  generarCampaignHandler,
  listCampaignsHandler,
  getCampaignHandler,
  downloadCampaignFileHandler
};
