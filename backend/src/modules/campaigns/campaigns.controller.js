import {
  createCampaignExportRequest,
  getCampaignExportById,
  getCampaignFileDescriptor,
  listCampaignExports
} from './campaigns.service.js';

const parseInteger = (value) => {
  const parsed = Number.parseInt(value, 10);
  return Number.isInteger(parsed) ? parsed : null;
};

const serializeCampaignExport = (record, req) => {
  if (!record) {
    return null;
  }

  const exportId = record.id || record._id?.toString();

  return {
    ...record,
    id: exportId,
    files: Array.isArray(record.files)
      ? record.files.map((file) => ({
          ...file,
          download_url: `/api/campaigns/exports/${exportId}/files/${file.channel}`
        }))
      : []
  };
};

export const createCampaignExportHandler = async (req, res, next) => {
  try {
    const userId = parseInteger(req.user?.id || req.user?.user_id || req.user?.sub);
    const portafolioId = parseInteger(req.body?.portafolio_id);

    const { exportRecord, jobRecord } = await createCampaignExportRequest({
      portafolioId,
      userId,
      filters: {
        channels: req.body?.channels,
        limit: req.body?.limit,
        debtThreshold: req.body?.debt_threshold,
        historyWindowDays: req.body?.history_window_days
      }
    });

    res.status(202).json({
      data: {
        exportacion: serializeCampaignExport(exportRecord, req),
        job: jobRecord
      }
    });
  } catch (err) {
    next(err);
  }
};

export const listCampaignExportsHandler = async (req, res, next) => {
  try {
    const records = await listCampaignExports({
      portafolioId: req.query?.portafolio_id,
      status: req.query?.status,
      limit: req.query?.limit,
      offset: req.query?.offset
    });

    res.status(200).json({
      data: records.map((record) => serializeCampaignExport(record, req))
    });
  } catch (err) {
    next(err);
  }
};

export const getCampaignExportHandler = async (req, res, next) => {
  try {
    const record = await getCampaignExportById(req.params.exportId);
    res.status(200).json({ data: serializeCampaignExport(record, req) });
  } catch (err) {
    next(err);
  }
};

export const downloadCampaignFileHandler = async (req, res, next) => {
  try {
    const { fileRecord, absolutePath } = await getCampaignFileDescriptor(
      req.params.exportId,
      req.params.channel
    );

    res.download(absolutePath, fileRecord.fileName);
  } catch (err) {
    next(err);
  }
};

export default {
  createCampaignExportHandler,
  listCampaignExportsHandler,
  getCampaignExportHandler,
  downloadCampaignFileHandler
};
