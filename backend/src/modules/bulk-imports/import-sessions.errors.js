import fs from 'node:fs';
import fsPromises from 'node:fs/promises';
import readline from 'node:readline';
import path from 'node:path';
import { createHttpError } from '../../utils/http-error.js';
import { getImportSessionById } from './import-sessions.repository.js';
import { detectFileType, streamRows } from './utils/file-parser.js';
import { logInfo } from '../../utils/structured-logger.js';

const parseNdjsonErrors = async (filePath) => {
  const stream = fs.createReadStream(filePath, { encoding: 'utf8' });
  const rl = readline.createInterface({ input: stream, crlfDelay: Infinity });
  const errors = [];
  for await (const line of rl) {
    if (!line.trim()) continue;
    try {
      errors.push(JSON.parse(line));
    } catch {
      // ignore malformed
    }
  }
  return errors;
};

export const downloadSessionErrorsService = async ({ sessionId, format, res }) => {
  const session = await getImportSessionById(sessionId);
  if (!session) throw createHttpError(404, 'Sesion no encontrada');
  if (!session.error_report_path) {
    throw createHttpError(404, 'No hay reporte de errores');
  }

  const resolvedFormat = ['csv', 'json', 'ndjson'].includes(format) ? format : 'csv';
  const filename = `session-${sessionId}-errors.${resolvedFormat === 'csv' ? 'csv' : 'ndjson'}`;

  res.setHeader(
    'Content-Disposition',
    `attachment; filename="${filename}"`
  );

  if (resolvedFormat === 'ndjson') {
    res.setHeader('Content-Type', 'application/x-ndjson');
    const stream = fs.createReadStream(session.error_report_path);
    stream.pipe(res);
    return;
  }

  const errors = await parseNdjsonErrors(session.error_report_path);

  res.setHeader('Content-Type', 'text/csv; charset=utf-8');
  res.write('rowNumber,field,message,severity\n');
  errors.forEach((err) => {
    const safeField = (err.field || '').replace(/"/g, '""');
    const safeMsg = (err.message || '').replace(/"/g, '""');
    res.write(`${err.rowNumber || ''},"${safeField}","${safeMsg}",${err.severity || 'ERROR'}\n`);
  });
  res.end();
  logInfo('import_session.errors_downloaded', {
    sessionId,
    format: resolvedFormat
  });
};

export const downloadRejectedRowsService = async ({ sessionId, res }) => {
  const session = await getImportSessionById(sessionId);
  if (!session) throw createHttpError(404, 'Sesion no encontrada');
  if (!session.error_report_path) {
    throw createHttpError(404, 'No hay filas rechazadas');
  }

  const errors = await parseNdjsonErrors(session.error_report_path);
  if (!errors.length) {
    throw createHttpError(404, 'No hay filas con errores');
  }

  const errorMap = new Map();
  errors.forEach((err) => {
    const rn = Number(err.rowNumber);
    if (!Number.isInteger(rn)) return;
    if (!errorMap.has(rn)) errorMap.set(rn, []);
    errorMap.get(rn).push(err.message || 'Error');
  });

  const { type: fileType } = detectFileType({
    filePath: session.file_path,
    originalName: session.filename,
    mimeType: session.file_meta?.mimeType
  });

  res.setHeader(
    'Content-Disposition',
    `attachment; filename="session-${sessionId}-rejected.csv"`
  );
  res.setHeader('Content-Type', 'text/csv; charset=utf-8');

  // Write headers
  const headers = session.detected_headers || [];
  res.write(`${headers.join(',')},errorMessage\n`);

  for await (const row of streamRows({
    filePath: session.file_path,
    fileType,
    separator: session.file_meta?.separator
  })) {
    if (!errorMap.has(row.rowNumber)) {
      continue;
    }
    const values = headers.map((_, idx) => {
      const val = row.values[idx];
      const safe = String(val ?? '').replace(/"/g, '""');
      return `"${safe}"`;
    });
    const msg = errorMap.get(row.rowNumber).join(' | ').replace(/"/g, '""');
    values.push(`"${msg}"`);
    res.write(`${values.join(',')}\n`);
  }
  res.end();
  logInfo('import_session.rejected_downloaded', {
    sessionId
  });
};
