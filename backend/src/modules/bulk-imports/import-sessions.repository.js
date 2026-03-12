import pool from '../../config/db.js';

const selectFields = `
  id,
  portfolio_id,
  created_by,
  filename,
  file_hash,
  file_path,
  file_meta,
  detected_headers,
  mapping,
  strategy,
  status,
  total_rows,
  valid_rows,
  invalid_rows,
  inserted,
  updated,
  skipped,
  error_report_path,
  error_report,
  saldo_fields_snapshot,
  job_id,
  created_at,
  updated_at
`;

export const createImportSession = async ({ portfolioId, createdBy }) => {
  const result = await pool.query(
    `INSERT INTO import_sessions (portfolio_id, created_by, status)
     VALUES ($1, $2, 'PENDING')
     RETURNING ${selectFields}`,
    [portfolioId, createdBy ?? null]
  );

  return result.rows[0];
};

export const getImportSessionById = async (id) => {
  const result = await pool.query(
    `SELECT ${selectFields}
     FROM import_sessions
     WHERE id = $1`,
    [id]
  );

  return result.rows[0] || null;
};

export const findImportSessionByHash = async ({ portfolioId, fileHash }) => {
  const result = await pool.query(
    `SELECT ${selectFields}
     FROM import_sessions
     WHERE portfolio_id = $1
       AND file_hash = $2
       AND status <> 'CANCELED'
     ORDER BY id DESC
     LIMIT 1`,
    [portfolioId, fileHash]
  );

  return result.rows[0] || null;
};

export const updateImportSession = async (id, updates) => {
  const fields = [];
  const values = [];
  let index = 1;

  const setField = (column, value) => {
    fields.push(`${column} = $${index}`);
    values.push(value);
    index += 1;
  };

  const setJsonField = (column, value) => {
    fields.push(`${column} = $${index}::jsonb`);
    if (value === null) {
      values.push(null);
    } else if (typeof value === 'string') {
      values.push(value);
    } else {
      values.push(JSON.stringify(value));
    }
    index += 1;
  };

  if (updates.portfolioId !== undefined) setField('portfolio_id', updates.portfolioId);
  if (updates.filename !== undefined) setField('filename', updates.filename);
  if (updates.fileHash !== undefined) setField('file_hash', updates.fileHash);
  if (updates.filePath !== undefined) setField('file_path', updates.filePath);
  if (updates.fileMeta !== undefined) setJsonField('file_meta', updates.fileMeta);
  if (updates.detectedHeaders !== undefined) setField('detected_headers', updates.detectedHeaders);
  if (updates.mapping !== undefined) setJsonField('mapping', updates.mapping);
  if (updates.strategy !== undefined) setField('strategy', updates.strategy);
  if (updates.status !== undefined) setField('status', updates.status);
  if (updates.totalRows !== undefined) setField('total_rows', updates.totalRows);
  if (updates.validRows !== undefined) setField('valid_rows', updates.validRows);
  if (updates.invalidRows !== undefined) setField('invalid_rows', updates.invalidRows);
  if (updates.inserted !== undefined) setField('inserted', updates.inserted);
  if (updates.updated !== undefined) setField('updated', updates.updated);
  if (updates.skipped !== undefined) setField('skipped', updates.skipped);
  if (updates.errorReportPath !== undefined) setField('error_report_path', updates.errorReportPath);
  if (updates.errorReport !== undefined) setJsonField('error_report', updates.errorReport);
  if (updates.saldoFieldsSnapshot !== undefined) {
    setJsonField('saldo_fields_snapshot', updates.saldoFieldsSnapshot);
  }
  if (updates.jobId !== undefined) setField('job_id', updates.jobId);

  if (fields.length === 0) {
    return null;
  }

  setField('updated_at', new Date());
  values.push(id);

  const result = await pool.query(
    `UPDATE import_sessions
     SET ${fields.join(', ')}
     WHERE id = $${index}
     RETURNING ${selectFields}`,
    values
  );

  return result.rows[0] || null;
};
