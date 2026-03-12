import { Queue } from 'bullmq';
import { createQueueConnection, queueConfig } from '../config/queue.js';
import { logInfo, logError } from '../utils/structured-logger.js';

let mainQueue;

export const getMainQueue = () => {
  if (!mainQueue) {
    mainQueue = new Queue(queueConfig.name, {
      connection: createQueueConnection(),
      defaultJobOptions: queueConfig.defaultJobOptions
    });

    mainQueue.on('error', (err) => {
      logError('queue.error', err, { queue: queueConfig.name });
    });
  }

  return mainQueue;
};

export const enqueueJob = async (name, data, options = {}) => {
  const queue = getMainQueue();
  const job = await queue.add(name, data, {
    ...queueConfig.defaultJobOptions,
    ...options
  });

  logInfo('queue.job.enqueued', {
    queue: queueConfig.name,
    jobId: job.id,
    name
  });

  return job;
};

export const closeMainQueue = async () => {
  if (!mainQueue) {
    return;
  }

  await mainQueue.close();
  mainQueue = null;
};
