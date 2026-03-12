import app from './app.js';
import env from './config/env.js';
import redisClient from './config/redis.js';
import { ensureDatabaseSchema } from './config/schema.js';
import { setupJobsWebSocket } from './modules/jobs/jobs.ws.js';
import { ensureDefaultAdminUser } from './modules/auth/auth.repository.js';
import { runBaseSeeds } from './config/seed.js';
import { closeMongoConnection } from './config/mongo.js';

let server;
let jobsWs;

const start = async () => {
  try {
    await redisClient.connect();
  } catch (err) {
    console.error('Redis connection failed', err);
  }

  try {
    await ensureDatabaseSchema();
  } catch (err) {
    console.error('Failed to ensure database schema', err);
  }

  try {
    await ensureDefaultAdminUser();
  } catch (err) {
    console.error('Failed to ensure default admin user', err);
  }

  try {
    await runBaseSeeds();
  } catch (err) {
    console.error('Failed to run base seeds', err);
  }

  server = app.listen(env.port, () => {
    console.log(`API running on port ${env.port}`);
  });

  jobsWs = setupJobsWebSocket(server);
};

const shutdown = async () => {
  if (server) {
    await new Promise((resolve) => server.close(resolve));
  }

   if (jobsWs?.close) {
     jobsWs.close();
   }

  if (redisClient.isOpen) {
    await redisClient.quit();
  }

  try {
    await closeMongoConnection();
  } catch (err) {
    console.error('Failed to close MongoDB connection', err);
  }

  process.exit(0);
};

process.on('SIGTERM', shutdown);
process.on('SIGINT', shutdown);

start();
