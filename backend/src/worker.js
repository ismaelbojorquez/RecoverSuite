import pkg from 'bullmq';
import { createQueueConnection, queueConfig } from './config/queue.js';
import { getProcessor } from './queues/processors.js';
import { logError, logInfo } from './utils/structured-logger.js';
import { ensureDatabaseSchema } from './config/schema.js';

const { QueueScheduler, Worker } = pkg;

const connection = createQueueConnection();
const scheduler =
  typeof QueueScheduler === 'function'
    ? new QueueScheduler(queueConfig.name, {
        connection: createQueueConnection()
      })
    : null;

const effectiveConcurrency = queueConfig.maxActive
  ? Math.min(queueConfig.concurrency, queueConfig.maxActive)
  : queueConfig.concurrency;

const worker = new Worker(
  queueConfig.name,
  async (job) => {
    const processor = getProcessor(job.name);
    if (!processor) {
      throw new Error(`No processor for job "${job.name}"`);
    }

    return processor(job);
  },
  {
    connection,
    concurrency: effectiveConcurrency,
    limiter: queueConfig.limiter,
    settings: {
      lockDuration: queueConfig.lockDurationMs,
      maxStalledCount: queueConfig.maxStalledCount
    }
  }
);

worker.on('completed', (job) => {
  logInfo('queue.job.completed', {
    queue: queueConfig.name,
    jobId: job.id,
    name: job.name,
    attemptsMade: job.attemptsMade
  });
});

worker.on('failed', (job, err) => {
  logError('queue.job.failed', err, {
    queue: queueConfig.name,
    jobId: job?.id,
    name: job?.name,
    attemptsMade: job?.attemptsMade
  });
});

worker.on('error', (err) => {
  logError('queue.worker.error', err, { queue: queueConfig.name });
});

if (scheduler) {
  scheduler.on('error', (err) => {
    logError('queue.scheduler.error', err, { queue: queueConfig.name });
  });
}

const shutdown = async () => {
  logInfo('queue.worker.shutdown', { queue: queueConfig.name });

  try {
    await worker.close();
    if (scheduler) {
      await scheduler.close();
    }
    await connection.quit();
  } catch (err) {
    logError('queue.worker.shutdown_error', err);
  } finally {
    process.exit(0);
  }
};

process.on('SIGTERM', shutdown);
process.on('SIGINT', shutdown);

ensureDatabaseSchema()
  .then(() => {
    logInfo('queue.worker.started', {
      queue: queueConfig.name,
      concurrency: queueConfig.concurrency
    });
  })
  .catch((err) => {
    logError('queue.worker.schema_error', err);
    process.exit(1);
  });
