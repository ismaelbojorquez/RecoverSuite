import express from 'express';
import routes from './routes/index.js';
import requestLogger from './middlewares/logger.js';
import errorHandler from './middlewares/error-handler.js';
import { auditMiddleware } from './modules/audit/audit.middleware.js';

const app = express();

app.set('trust proxy', 1);
app.disable('x-powered-by');
app.use(express.json({ type: ['application/json', 'application/*+json', 'text/plain'] }));
app.use(express.urlencoded({ extended: true }));
app.use(requestLogger);
app.use(auditMiddleware);
app.use('/api', routes);

app.use((req, res) => {
  res.status(404).json({ error: 'Not Found' });
});

app.use(errorHandler);

export default app;
