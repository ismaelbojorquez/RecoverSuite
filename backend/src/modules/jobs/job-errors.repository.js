import pool from '../../config/db.js';

const selectFields = 'job_id, fila, campo, mensaje';

export const createJobErrors = async (errors) => {
  if (!Array.isArray(errors) || errors.length === 0) {
    return;
  }

  const values = [];
  const placeholders = errors.map((error, index) => {
    const base = index * 4;
    values.push(error.jobId, error.fila, error.campo, error.mensaje);
    return `($${base + 1}, $${base + 2}, $${base + 3}, $${base + 4})`;
  });

  await pool.query(
    `INSERT INTO job_errors (job_id, fila, campo, mensaje)
     VALUES ${placeholders.join(', ')}`,
    values
  );
};

export const listJobErrorsByJob = async ({ jobId, limit, offset }) => {
  const result = await pool.query(
    `SELECT ${selectFields}
     FROM job_errors
     WHERE job_id = $1
     ORDER BY fila, id
     LIMIT $2 OFFSET $3`,
    [jobId, limit, offset]
  );

  return result.rows;
};
