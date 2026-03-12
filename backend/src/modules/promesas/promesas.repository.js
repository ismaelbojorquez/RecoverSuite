import pool from '../../config/db.js';

const selectFields = `
  id, gestion_id, credito_id, monto, fecha_promesa, estado, created_at
`;

export const createPromesa = async ({
  gestionId,
  creditoId,
  monto,
  fechaPromesa,
  estado = 'pendiente'
}) => {
  const result = await pool.query(
    `INSERT INTO promesas_pago (gestion_id, credito_id, monto, fecha_promesa, estado)
     VALUES ($1, $2, $3, $4, $5)
     RETURNING ${selectFields}`,
    [gestionId, creditoId ?? null, monto, fechaPromesa, estado]
  );

  return result.rows[0];
};

export const listPromesas = async ({ estado, creditoId, fechaDesde, fechaHasta, limit = 20, offset = 0 }) => {
  const where = [];
  const values = [];

  const addFilter = (condition, value) => {
    if (value === undefined || value === null) return;
    values.push(value);
    where.push(condition.replace('$', `$${values.length}`));
  };

  addFilter('estado = $', estado);
  addFilter('credito_id = $', creditoId);
  if (fechaDesde) addFilter('fecha_promesa >= $', fechaDesde);
  if (fechaHasta) addFilter('fecha_promesa <= $', fechaHasta);

  values.push(limit);
  values.push(offset);

  const whereClause = where.length ? `WHERE ${where.join(' AND ')}` : '';

  const result = await pool.query(
    `SELECT ${selectFields}
     FROM promesas_pago
     ${whereClause}
     ORDER BY fecha_promesa DESC, id DESC
     LIMIT $${values.length - 1} OFFSET $${values.length}`,
    values
  );

  return result.rows;
};

export const getPromesaByGestion = async (gestionId) => {
  const result = await pool.query(
    `SELECT ${selectFields} FROM promesas_pago WHERE gestion_id = $1`,
    [gestionId]
  );
  return result.rows[0] || null;
};

export const updatePromesaEstado = async ({ gestionId, estado }) => {
  const result = await pool.query(
    `UPDATE promesas_pago
     SET estado = $1
     WHERE gestion_id = $2
     RETURNING ${selectFields}`,
    [estado, gestionId]
  );
  return result.rows[0] || null;
};
