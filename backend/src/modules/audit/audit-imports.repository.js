import pool from '../../config/db.js';

const selectFields =
  'id, job_id, usuario_id, tipo_carga, archivo, resultado, volumen_procesado, created_at, finished_at';

export const upsertBulkImportAudit = async ({
  jobId,
  usuarioId,
  tipoCarga,
  archivo,
  resultado,
  volumenProcesado,
  finishedAt
}) => {
  await pool.query(
    `INSERT INTO audit_bulk_imports
       (job_id, usuario_id, tipo_carga, archivo, resultado, volumen_procesado, finished_at)
     VALUES ($1, $2, $3, $4, $5, $6, $7)
     ON CONFLICT (job_id)
     DO UPDATE SET
       usuario_id = EXCLUDED.usuario_id,
       tipo_carga = EXCLUDED.tipo_carga,
       archivo = EXCLUDED.archivo,
       resultado = EXCLUDED.resultado,
       volumen_procesado = EXCLUDED.volumen_procesado,
       finished_at = EXCLUDED.finished_at`,
    [jobId, usuarioId, tipoCarga, archivo, resultado, volumenProcesado, finishedAt]
  );
};

export const listBulkImportAudits = async ({ usuarioId, from, to, limit, offset }) => {
  const conditions = [];
  const values = [];
  let index = 1;

  if (usuarioId) {
    conditions.push(`usuario_id = $${index}`);
    values.push(usuarioId);
    index += 1;
  }

  if (from) {
    conditions.push(`created_at >= $${index}`);
    values.push(from);
    index += 1;
  }

  if (to) {
    conditions.push(`created_at <= $${index}`);
    values.push(to);
    index += 1;
  }

  const whereClause = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';

  values.push(limit, offset);

  const result = await pool.query(
    `SELECT ${selectFields}
     FROM audit_bulk_imports
     ${whereClause}
     ORDER BY created_at DESC
     LIMIT $${index} OFFSET $${index + 1}`,
    values
  );

  return result.rows;
};
