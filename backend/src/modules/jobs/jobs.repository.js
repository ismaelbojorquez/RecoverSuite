import pool from '../../config/db.js';

const selectFields =
  'id, tipo, estado, progreso, usuario_id, portafolio_id, payload_resumen, error, created_at, finished_at';

export const listJobs = async ({ limit = 10, offset = 0 }) => {
  const result = await pool.query(
    `SELECT ${selectFields}
     FROM jobs
     ORDER BY created_at DESC
     LIMIT $1 OFFSET $2`,
    [limit, offset]
  );

  return result.rows;
};

export const createJob = async ({ tipo, usuarioId, portafolioId, payloadResumen }) => {
  const result = await pool.query(
    `INSERT INTO jobs (tipo, estado, usuario_id, portafolio_id, payload_resumen)
     VALUES ($1, 'pendiente', $2, $3, $4)
     RETURNING ${selectFields}`,
    [tipo, usuarioId, portafolioId ?? null, payloadResumen]
  );

  return result.rows[0];
};

export const getJobById = async (id) => {
  const result = await pool.query(
    `SELECT ${selectFields}
     FROM jobs
     WHERE id = $1`,
    [id]
  );

  return result.rows[0] || null;
};

export const updateJob = async (id, updates) => {
  const fields = [];
  const values = [];
  let index = 1;

  const setField = (column, value) => {
    fields.push(`${column} = $${index}`);
    values.push(value);
    index += 1;
  };

  if (updates.estado !== undefined) {
    setField('estado', updates.estado);
  }

  if (updates.progreso !== undefined) {
    setField('progreso', updates.progreso);
  }

  if (updates.payloadResumen !== undefined) {
    setField('payload_resumen', updates.payloadResumen);
  }

  if (updates.error !== undefined) {
    setField('error', updates.error);
  }

  if (updates.finishedAt !== undefined) {
    setField('finished_at', updates.finishedAt);
  }

  if (fields.length === 0) {
    return null;
  }

  values.push(id);

  const result = await pool.query(
    `UPDATE jobs
     SET ${fields.join(', ')}
     WHERE id = $${index}
     RETURNING ${selectFields}`,
    values
  );

  return result.rows[0] || null;
};
