import env from '../config/env.js';

export default function errorHandler(err, req, res, next) {
  let status = err.statusCode || 500;
  let message = err.message || 'Internal Server Error';

  if (err?.name === 'MulterError') {
    status = 400;
    message =
      err.code === 'LIMIT_FILE_SIZE'
        ? 'Archivo excede el tamano maximo permitido'
        : err.message;
  }

  const payload = { error: message };

  if (env.nodeEnv !== 'production' && err.stack) {
    payload.stack = err.stack;
  }

  // Log detallado para depurar errores en tiempo de ejecución.
  const safeBody = (() => {
    try {
      if (!req?.body) return undefined;
      const clone = typeof req.body === 'string' ? req.body : { ...req.body };
      if (clone.password) clone.password = '[redacted]';
      if (clone.new_password) clone.new_password = '[redacted]';
      if (clone.current_password) clone.current_password = '[redacted]';
      return clone;
    } catch {
      return '[unavailable]';
    }
  })();

  console.error('API error', {
    status,
    message,
    method: req?.method,
    path: req?.originalUrl || req?.url,
    user: req?.user?.id || null,
    headers: req?.headers,
    body: safeBody,
    stack: err?.stack
  });

  res.status(status).json(payload);
}
