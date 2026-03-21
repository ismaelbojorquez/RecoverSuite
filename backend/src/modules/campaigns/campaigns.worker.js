import { processCampaignExport } from './campaigns.service.js';

export const processCampaignExportJob = async (job) =>
  processCampaignExport({
    exportId: job?.data?.exportId,
    jobId: job?.data?.jobId,
    userId: job?.data?.userId,
    portafolioId: job?.data?.portafolioId,
    filters: job?.data?.filters || {},
    now: new Date()
  });

export default {
  processCampaignExportJob
};
