import pool from '../../config/db.js';

const selectFields =
  'id, client_id, name, description, is_active, created_at, updated_at';

export const listPortfolios = async ({ limit, offset }) => {
  const result = await pool.query(
    `SELECT ${selectFields}
     FROM portfolios
     ORDER BY id
     LIMIT $1 OFFSET $2`,
    [limit, offset]
  );

  return result.rows;
};

export const getPortfolioById = async (id) => {
  const result = await pool.query(
    `SELECT ${selectFields}
     FROM portfolios
     WHERE id = $1`,
    [id]
  );

  return result.rows[0] || null;
};

export const createPortfolio = async ({ clientId, name, description, isActive }) => {
  const result = await pool.query(
    `INSERT INTO portfolios (client_id, name, description, is_active)
     VALUES ($1, $2, $3, $4)
     RETURNING ${selectFields}`,
    [clientId, name, description, isActive]
  );

  return result.rows[0];
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

  if (fields.length === 0) {
    return null;
  }

  setField('updated_at', new Date());
  values.push(id);

  const result = await pool.query(
    `UPDATE portfolios
     SET ${fields.join(', ')}
     WHERE id = $${index}
     RETURNING ${selectFields}`,
    values
  );

  return result.rows[0] || null;
};

export const deletePortfolio = async (id) => {
  const result = await pool.query('DELETE FROM portfolios WHERE id = $1', [id]);
  return result.rowCount > 0;
};
