import pool from '../../config/db.js';

const selectFields = 'id, client_id, email, created_at, updated_at';

export const listEmailsByClient = async ({ clientId, limit, offset }) => {
  if (limit !== undefined) {
    const result = await pool.query(
      `SELECT ${selectFields}
       FROM client_emails
       WHERE client_id = $1
       ORDER BY id
       LIMIT $2 OFFSET $3`,
      [clientId, limit, offset]
    );

    return result.rows;
  }

  const result = await pool.query(
    `SELECT ${selectFields}
     FROM client_emails
     WHERE client_id = $1
     ORDER BY id`,
    [clientId]
  );

  return result.rows;
};

export const getEmailById = async ({ clientId, emailId }) => {
  const result = await pool.query(
    `SELECT ${selectFields}
     FROM client_emails
     WHERE id = $1 AND client_id = $2`,
    [emailId, clientId]
  );

  return result.rows[0] || null;
};

export const createEmail = async ({ clientId, email }) => {
  const result = await pool.query(
    `INSERT INTO client_emails (client_id, email)
     VALUES ($1, $2)
     RETURNING ${selectFields}`,
    [clientId, email]
  );

  return result.rows[0];
};

export const updateEmail = async ({ clientId, emailId, email }) => {
  const result = await pool.query(
    `UPDATE client_emails
     SET email = $1, updated_at = $2
     WHERE id = $3 AND client_id = $4
     RETURNING ${selectFields}`,
    [email, new Date(), emailId, clientId]
  );

  return result.rows[0] || null;
};

export const deleteEmail = async ({ clientId, emailId }) => {
  const result = await pool.query(
    `DELETE FROM client_emails
     WHERE id = $1 AND client_id = $2`,
    [emailId, clientId]
  );

  return result.rowCount > 0;
};
