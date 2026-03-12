const serializeError = (err) => {
  if (!err) {
    return null;
  }

  return {
    message: err.message,
    name: err.name,
    stack: err.stack,
    code: err.code
  };
};

const writeLog = (level, message, meta = {}) => {
  const entry = {
    level,
    message,
    timestamp: new Date().toISOString(),
    ...meta
  };

  console.log(JSON.stringify(entry));
};

export const logInfo = (message, meta) => writeLog('info', message, meta);

export const logWarn = (message, meta) => writeLog('warn', message, meta);

export const logError = (message, err, meta = {}) => {
  writeLog('error', message, {
    ...meta,
    error: serializeError(err)
  });
};
