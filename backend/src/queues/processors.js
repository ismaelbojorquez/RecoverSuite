import { logInfo } from '../utils/structured-logger.js';
import { processBulkImportJob } from '../modules/bulk-imports/bulk-imports.worker.js';
import { processImportSessionJob } from '../modules/bulk-imports/import-sessions.worker.js';
import { processCampaignExportJob } from '../modules/campaigns/campaigns.worker.js';

export const processors = {
  noop: async (job) => {
    logInfo('job.noop', { jobId: job.id, name: job.name });
    return { ok: true };
  },
  bulk_import: async (job) => processBulkImportJob(job),
  import_session: async (job) => processImportSessionJob(job),
  campaign_export: async (job) => processCampaignExportJob(job)
};

export const getProcessor = (name) => processors[name];
