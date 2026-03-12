import pool from '../../config/db.js';

const selectFields =
  'id, client_id, linea1, linea2, ciudad, estado, codigo_postal, pais, created_at, updated_at';

export const listAddressesByClient = async ({ clientId, limit, offset }) => {
  if (limit !== undefined) {
    const result = await pool.query(
      `SELECT ${selectFields}
       FROM client_addresses
       WHERE client_id = $1
       ORDER BY id
       LIMIT $2 OFFSET $3`,
      [clientId, limit, offset]
    );

    return result.rows;
  }

  const result = await pool.query(
    `SELECT ${selectFields}
     FROM client_addresses
     WHERE client_id = $1
     ORDER BY id`,
    [clientId]
  );

  return result.rows;
};

export const getAddressById = async ({ clientId, addressId }) => {
  const result = await pool.query(
    `SELECT ${selectFields}
     FROM client_addresses
     WHERE id = $1 AND client_id = $2`,
    [addressId, clientId]
  );

  return result.rows[0] || null;
};

export const createAddress = async ({
  clientId,
  linea1,
  linea2,
  ciudad,
  estado,
  codigoPostal,
  pais
}) => {
  const result = await pool.query(
    `INSERT INTO client_addresses
      (client_id, linea1, linea2, ciudad, estado, codigo_postal, pais)
     VALUES ($1, $2, $3, $4, $5, $6, $7)
     RETURNING ${selectFields}`,
    [clientId, linea1, linea2, ciudad, estado, codigoPostal, pais]
  );

  return result.rows[0];
};

export const updateAddress = async ({
  clientId,
  addressId,
  linea1,
  linea2,
  ciudad,
  estado,
  codigoPostal,
  pais
}) => {
  const fields = [];
  const values = [];
  let index = 1;

  const setField = (column, value) => {
    fields.push(`${column} = $${index}`);
    values.push(value);
    index += 1;
  };

  if (linea1 !== undefined) {
    setField('linea1', linea1);
  }

  if (linea2 !== undefined) {
    setField('linea2', linea2);
  }

  if (ciudad !== undefined) {
    setField('ciudad', ciudad);
  }

  if (estado !== undefined) {
    setField('estado', estado);
  }

  if (codigoPostal !== undefined) {
    setField('codigo_postal', codigoPostal);
  }

  if (pais !== undefined) {
    setField('pais', pais);
  }

  if (fields.length === 0) {
    return null;
  }

  setField('updated_at', new Date());
  values.push(addressId, clientId);

  const result = await pool.query(
    `UPDATE client_addresses
     SET ${fields.join(', ')}
     WHERE id = $${index} AND client_id = $${index + 1}
     RETURNING ${selectFields}`,
    values
  );

  return result.rows[0] || null;
};

export const deleteAddress = async ({ clientId, addressId }) => {
  const result = await pool.query(
    `DELETE FROM client_addresses
     WHERE id = $1 AND client_id = $2`,
    [addressId, clientId]
  );

  return result.rowCount > 0;
};
