import fs from 'node:fs';
import fsPromises from 'node:fs/promises';
import path from 'node:path';
import readline from 'node:readline';
import crypto from 'node:crypto';
import XLSX from 'xlsx';
import { createHttpError } from '../../../utils/http-error.js';
import { logInfo, logWarn } from '../../../utils/structured-logger.js';

const normalizeHeaderValue = (value) =>
  String(value ?? '')
    .replace(/^\uFEFF/, '')
    .replace(/\s+/g, ' ')
    .trim();

const validateHeaders = (headers) => {
  if (!headers.length) {
    throw createHttpError(400, 'El archivo no contiene encabezados validos');
  }

  const normalizedLower = headers.map((header) => header.toLowerCase());
  const duplicates = normalizedLower.filter(
    (header, index) => normalizedLower.indexOf(header) !== index
  );

  if (duplicates.length) {
    const unique = [...new Set(duplicates)];
    throw createHttpError(400, `Encabezados duplicados: ${unique.join(', ')}`);
  }
};

const detectSeparator = (line) => {
  const candidates = [',', ';', '\t', '|'];
  const counts = candidates.map((separator) => ({
    separator,
    count: (line.match(new RegExp(`\\${separator}`, 'g')) || []).length
  }));

  counts.sort((a, b) => b.count - a.count);
  const top = counts[0];
  return top && top.count > 0 ? top.separator : ',';
};

const parseCsvRow = (line, separator) => {
  const values = [];
  let current = '';
  let inQuotes = false;

  for (let i = 0; i < line.length; i += 1) {
    const char = line[i];
    const next = line[i + 1];

    if (char === '"') {
      if (inQuotes && next === '"') {
        current += '"';
        i += 1;
      } else {
        inQuotes = !inQuotes;
      }
      continue;
    }

    if (char === separator && !inQuotes) {
      values.push(current);
      current = '';
      continue;
    }

    current += char;
  }

  values.push(current);
  return values;
};

const detectEncoding = async (filePath) => {
  const file = await fsPromises.open(filePath, 'r');
  try {
    const buffer = Buffer.alloc(4);
    const { bytesRead } = await file.read(buffer, 0, 4, 0);
    if (bytesRead >= 3 && buffer[0] === 0xef && buffer[1] === 0xbb && buffer[2] === 0xbf) {
      return 'utf8';
    }
    if (bytesRead >= 2 && buffer[0] === 0xff && buffer[1] === 0xfe) {
      return 'utf16le';
    }
    if (bytesRead >= 2 && buffer[0] === 0xfe && buffer[1] === 0xff) {
      logWarn('file_parser.encoding_unsupported', { encoding: 'utf16be', filePath });
      return 'utf8';
    }
  } catch (err) {
    logWarn('file_parser.encoding_detection_failed', { filePath, error: err?.message });
  } finally {
    await file.close();
  }
  return 'utf8';
};

export const computeFileHash = (filePath) =>
  new Promise((resolve, reject) => {
    const hash = crypto.createHash('sha256');
    const stream = fs.createReadStream(filePath);
    stream.on('data', (chunk) => hash.update(chunk));
    stream.on('end', () => resolve(hash.digest('hex')));
    stream.on('error', (err) => reject(err));
  });

export const detectFileType = ({ filePath, originalName, mimeType }) => {
  const name = originalName || filePath || '';
  const ext = path.extname(name).toLowerCase();
  const mime = (mimeType || '').toLowerCase();

  if (ext === '.xlsx' || mime.includes('spreadsheetml')) {
    return { type: 'xlsx', extension: '.xlsx' };
  }

  if (ext === '.csv' || ext === '.txt' || mime.includes('csv') || mime.startsWith('text/')) {
    return { type: 'csv', extension: ext || '.csv' };
  }

  throw createHttpError(400, 'Formato de archivo no soportado');
};

export const parseHeaders = async ({ filePath, fileType }) => {
  if (fileType === 'xlsx') {
    const workbook = XLSX.readFile(filePath, {
      cellDates: false,
      sheetRows: 1
    });

    const sheetName = workbook.SheetNames[0];
    if (!sheetName) {
      throw createHttpError(400, 'El archivo XLSX no contiene hojas');
    }

    const sheet = workbook.Sheets[sheetName];
    const rows = XLSX.utils.sheet_to_json(sheet, {
      header: 1,
      raw: false,
      blankrows: false
    });

    const headers = (rows[0] || []).map(normalizeHeaderValue).filter(Boolean);
    validateHeaders(headers);

    return { headers, separator: null, encoding: 'binary' };
  }

  const encoding = await detectEncoding(filePath);
  const stream = fs.createReadStream(filePath, { encoding });
  const rl = readline.createInterface({ input: stream, crlfDelay: Infinity });
  let headerLine = null;

  for await (const line of rl) {
    if (line && line.trim().length > 0) {
      headerLine = line;
      break;
    }
  }

  if (!headerLine) {
    throw createHttpError(400, 'El archivo CSV esta vacio');
  }

  const separator = detectSeparator(headerLine);
  const rawHeaders = parseCsvRow(headerLine, separator);
  const headers = rawHeaders.map(normalizeHeaderValue).filter(Boolean);
  validateHeaders(headers);

  return { headers, separator, encoding };
};

export const getSampleRows = async ({ filePath, fileType, limit = 50, separator }) => {
  if (fileType === 'xlsx') {
    const workbook = XLSX.readFile(filePath, { cellDates: false });
    const sheetName = workbook.SheetNames[0];
    if (!sheetName) {
      throw createHttpError(400, 'El archivo XLSX no contiene hojas');
    }
    const sheet = workbook.Sheets[sheetName];
    const rows = XLSX.utils.sheet_to_json(sheet, {
      header: 1,
      raw: false,
      blankrows: false
    });

    const headers = (rows[0] || []).map(normalizeHeaderValue).filter(Boolean);
    validateHeaders(headers);

    const dataRows = rows
      .slice(1)
      .filter((row) => row.some((value) => String(value ?? '').trim() !== ''))
      .slice(0, limit);

    return {
      headers,
      rows: dataRows,
      separator: null,
      encoding: 'binary'
    };
  }

  const resolvedLimit = Math.max(1, limit);
  const encoding = await detectEncoding(filePath);
  const stream = fs.createReadStream(filePath, { encoding });
  const rl = readline.createInterface({ input: stream, crlfDelay: Infinity });

  let headerInfo = null;
  const rows = [];
  let lineNumber = 0;

  for await (const line of rl) {
    lineNumber += 1;
    if (lineNumber === 1) {
      const separatorUsed = separator || detectSeparator(line);
      const headers = parseCsvRow(line, separatorUsed).map(normalizeHeaderValue).filter(Boolean);
      validateHeaders(headers);
      headerInfo = { headers, separator: separatorUsed };
      continue;
    }

    if (!line.trim()) {
      continue;
    }

    const parsed = parseCsvRow(line, headerInfo.separator || ',');
    rows.push(parsed);
    if (rows.length >= resolvedLimit) {
      break;
    }
  }

  return {
    headers: headerInfo?.headers || [],
    rows,
    separator: headerInfo?.separator || ',',
    encoding
  };
};

export async function* streamRows({ filePath, fileType, separator }) {
  if (fileType === 'xlsx') {
    const workbook = XLSX.readFile(filePath, { cellDates: false });
    const sheetName = workbook.SheetNames[0];
    if (!sheetName) {
      throw createHttpError(400, 'El archivo XLSX no contiene hojas');
    }

    const sheet = workbook.Sheets[sheetName];
    const range = XLSX.utils.decode_range(sheet['!ref'] || 'A1:A1');
    const headerRow = range.s.r;
    const firstDataRow = headerRow + 1;

    for (let row = firstDataRow, rowNumber = 2; row <= range.e.r; row += 1, rowNumber += 1) {
      const values = [];
      let hasValue = false;
      for (let col = range.s.c; col <= range.e.c; col += 1) {
        const cellAddress = XLSX.utils.encode_cell({ r: row, c: col });
        const cell = sheet[cellAddress];
        const formatted = cell ? XLSX.utils.format_cell(cell) : '';
        const normalized = typeof formatted === 'string' ? formatted.trim() : formatted;
        values.push(normalized);
        if (normalized !== '' && normalized !== null && normalized !== undefined) {
          hasValue = true;
        }
      }
      if (!hasValue) {
        continue;
      }
      yield { rowNumber, values };
    }
    return;
  }

  const headerInfo = await parseHeaders({ filePath, fileType: 'csv' });
  const encoding = await detectEncoding(filePath);
  const stream = fs.createReadStream(filePath, { encoding });
  const rl = readline.createInterface({ input: stream, crlfDelay: Infinity });
  let lineNumber = 0;

  for await (const line of rl) {
    lineNumber += 1;
    if (lineNumber === 1) {
      continue;
    }

    if (!line.trim()) {
      continue;
    }

    const parsed = parseCsvRow(line, separator || headerInfo.separator || ',');
    yield { rowNumber: lineNumber, values: parsed };
  }
}

export const countRows = async ({ filePath, fileType }) => {
  let count = 0;
  for await (const _row of streamRows({ filePath, fileType })) {
    count += 1;
  }
  return count;
};

export const ensureHeadersParsed = async ({ filePath, fileType }) => {
  const { headers } = await parseHeaders({ filePath, fileType });
  logInfo('file_parser.headers_detected', { filePath, headersCount: headers.length });
  return headers;
};
