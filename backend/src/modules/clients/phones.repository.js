import pool from '../../config/db.js';

const selectFields = 'id, client_id, telefono, created_at, updated_at';

export const listPhonesByClient = async ({ clientId, limit, offset }) => {
  if (limit !== undefined) {
    const result = await pool.query(
      `SELECT ${selectFields}
       FROM client_phones
       WHERE client_id = $1
       ORDER BY id
       LIMIT $2 OFFSET $3`,
      [clientId, limit, offset]
    );

    return result.rows;
  }

  const result = await pool.query(
    `SELECT ${selectFields}
     FROM client_phones
     WHERE client_id = $1
     ORDER BY id`,
    [clientId]
  );

  return result.rows;
};

export const getPhoneById = async ({ clientId, phoneId }) => {
  const result = await pool.query(
    `SELECT ${selectFields}
     FROM client_phones
     WHERE id = $1 AND client_id = $2`,
    [phoneId, clientId]
  );

  return result.rows[0] || null;
};

export const createPhone = async ({ clientId, telefono }) => {
  const result = await pool.query(
    `INSERT INTO client_phones (client_id, telefono)
     VALUES ($1, $2)
     RETURNING ${selectFields}`,
    [clientId, telefono]
  );

  return result.rows[0];
};

export const updatePhone = async ({ clientId, phoneId, telefono }) => {
  const result = await pool.query(
    `UPDATE client_phones
     SET telefono = $1, updated_at = $2
     WHERE id = $3 AND client_id = $4
     RETURNING ${selectFields}`,
    [telefono, new Date(), phoneId, clientId]
  );

  return result.rows[0] || null;
};

export const deletePhone = async ({ clientId, phoneId }) => {
  const result = await pool.query(
    `DELETE FROM client_phones
     WHERE id = $1 AND client_id = $2`,
    [phoneId, clientId]
  );

  return result.rowCount > 0;
};
