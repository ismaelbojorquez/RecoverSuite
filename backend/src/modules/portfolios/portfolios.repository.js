import pool from '../../config/db.js';

const selectFields = `
  p.id,
  p.client_id,
  p.name,
  p.description,
  p.is_active,
  p.debt_total_saldo_field_id,
  sf.key AS debt_total_saldo_field_key,
  sf.label AS debt_total_saldo_field_label,
  p.created_at,
  p.updated_at
`;

export const listPortfolios = async ({ limit, offset }) => {
  const result = await pool.query(
    `SELECT ${selectFields}
     FROM portfolios p
     LEFT JOIN saldo_fields sf ON sf.id = p.debt_total_saldo_field_id
     ORDER BY p.id
     LIMIT $1 OFFSET $2`,
    [limit, offset]
  );

  return result.rows;
};

export const getPortfolioById = async (id) => {
  const result = await pool.query(
    `SELECT ${selectFields}
     FROM portfolios p
     LEFT JOIN saldo_fields sf ON sf.id = p.debt_total_saldo_field_id
     WHERE p.id = $1`,
    [id]
  );

  return result.rows[0] || null;
};

export const createPortfolio = async ({
  clientId,
  name,
  description,
  isActive,
  debtTotalSaldoFieldId
}) => {
  const result = await pool.query(
    `INSERT INTO portfolios (client_id, name, description, is_active, debt_total_saldo_field_id)
     VALUES ($1, $2, $3, $4, $5)
     RETURNING id`,
    [clientId, name, description, isActive, debtTotalSaldoFieldId ?? null]
  );

  return getPortfolioById(result.rows[0]?.id);
};

export const updatePortfolio = async (id, updates) => {
  const fields = [];
  const values = [];
  let index = 1;

  const setField = (column, value) => {
    fields.push(`${column} = $${index}`);
    values.push(value);
    index += 1;
  };

  if (updates.clientId !== undefined) {
    setField('client_id', updates.clientId);
  }

  if (updates.name !== undefined) {
    setField('name', updates.name);
  }

  if (updates.description !== undefined) {
    setField('description', updates.description);
  }

  if (updates.isActive !== undefined) {
    setField('is_active', updates.isActive);
  }

  if (updates.debtTotalSaldoFieldId !== undefined) {
    setField('debt_total_saldo_field_id', updates.debtTotalSaldoFieldId);
  }

  if (fields.length === 0) {
    return null;
  }

  setField('updated_at', new Date());
  values.push(id);

  const result = await pool.query(
    `UPDATE portfolios
     SET ${fields.join(', ')}
     WHERE id = $${index}
     RETURNING id`,
    values
  );

  if (!result.rows[0]?.id) {
    return null;
  }

  return getPortfolioById(result.rows[0].id);
};

export const deletePortfolio = async (id) => {
  const result = await pool.query('DELETE FROM portfolios WHERE id = $1', [id]);
  return result.rowCount > 0;
};
