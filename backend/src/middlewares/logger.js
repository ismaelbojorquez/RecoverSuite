export default function requestLogger(req, res, next) {
  const start = process.hrtime.bigint();

  res.on('finish', () => {
    const durationMs = Number(process.hrtime.bigint() - start) / 1e6;
    const { method, originalUrl } = req;
    const { statusCode } = res;

    console.log(`${method} ${originalUrl} ${statusCode} ${durationMs.toFixed(2)}ms`);
  });

  next();
}
