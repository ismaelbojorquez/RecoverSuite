import pool from '../../config/db.js';

const selectFieldsPublic =
  'public_id AS id, portafolio_id, nombre, apellido_paterno, apellido_materno, numero_cliente, rfc, curp, created_at';

const selectFieldsInternal =
  'id AS internal_id, public_id AS id, portafolio_id, nombre, apellido_paterno, apellido_materno, numero_cliente, rfc, curp, created_at';

export const listClients = async ({ portafolioId, nameLike, limit, offset }) => {
  if (nameLike) {
    const result = await pool.query(
      `SELECT ${selectFieldsPublic}
       FROM clients
       WHERE portafolio_id = $1
         AND (
           lower(nombre || ' ' || apellido_paterno || ' ' || apellido_materno) LIKE $2
           OR lower(numero_cliente) LIKE $2
         )
       ORDER BY id
       LIMIT $3 OFFSET $4`,
      [portafolioId, nameLike, limit, offset]
    );

    return result.rows;
  }

  const result = await pool.query(
    `SELECT ${selectFieldsPublic}
     FROM clients
     WHERE portafolio_id = $1
     ORDER BY id
     LIMIT $2 OFFSET $3`,
    [portafolioId, limit, offset]
  );

  return result.rows;
};

export const getClientByPublicId = async (publicId) => {
  const result = await pool.query(
    `SELECT ${selectFieldsInternal}
     FROM clients
     WHERE public_id = $1`,
    [publicId]
  );

  return result.rows[0] || null;
};

export const getClientByPublicIdAndPortfolio = async ({ publicId, portafolioId }) => {
  const result = await pool.query(
    `SELECT ${selectFieldsInternal}
     FROM clients
     WHERE public_id = $1 AND portafolio_id = $2`,
    [publicId, portafolioId]
  );

  return result.rows[0] || null;
};

export const getClientByNumberAndPortfolio = async ({ numeroCliente, portafolioId }) => {
  const result = await pool.query(
    `SELECT ${selectFieldsInternal}
     FROM clients
     WHERE portafolio_id = $1
       AND lower(numero_cliente) = lower($2)
     LIMIT 1`,
    [portafolioId, numeroCliente]
  );

  return result.rows[0] || null;
};

export const findClientNumbersByPortfolio = async ({ portafolioId, numbers }) => {
  if (!Array.isArray(numbers) || numbers.length === 0) {
    return [];
  }

  const values = [portafolioId];
  const placeholders = numbers.map((numero, index) => {
    values.push(numero);
    return `$${index + 2}`;
  });

  const result = await pool.query(
    `SELECT lower(numero_cliente) AS numero_cliente
     FROM clients
     WHERE portafolio_id = $1
       AND lower(numero_cliente) IN (${placeholders.join(', ')})`,
    values
  );

  return result.rows.map((row) => row.numero_cliente);
};

export const createClient = async ({
  portafolioId,
  nombre,
  apellidoPaterno,
  apellidoMaterno,
  numeroCliente,
  rfc,
  curp
}) => {
  const result = await pool.query(
    `INSERT INTO clients
      (portafolio_id, nombre, apellido_paterno, apellido_materno, numero_cliente, rfc, curp)
     VALUES ($1, $2, $3, $4, $5, $6, $7)
     RETURNING ${selectFieldsInternal}`,
    [portafolioId, nombre, apellidoPaterno, apellidoMaterno, numeroCliente, rfc, curp]
  );

  return result.rows[0];
};

export const createClientAutoNumber = async ({
  portafolioId,
  nombre,
  apellidoPaterno,
  apellidoMaterno,
  rfc,
  curp
}) => {
  const result = await pool.query(
    `INSERT INTO clients
       (portafolio_id, nombre, apellido_paterno, apellido_materno, rfc, curp)
     VALUES ($1, $2, $3, $4, $5, $6)
     RETURNING ${selectFieldsInternal}`,
    [portafolioId, nombre, apellidoPaterno, apellidoMaterno, rfc, curp]
  );

  return result.rows[0];
};

export const updateClient = async (publicId, updates) => {
  const fields = [];
  const values = [];
  let index = 1;

  const setField = (column, value) => {
    fields.push(`${column} = $${index}`);
    values.push(value);
    index += 1;
  };

  if (updates.portafolioId !== undefined) {
    setField('portafolio_id', updates.portafolioId);
  }

  if (updates.nombre !== undefined) {
    setField('nombre', updates.nombre);
  }

  if (updates.apellidoPaterno !== undefined) {
    setField('apellido_paterno', updates.apellidoPaterno);
  }

  if (updates.apellidoMaterno !== undefined) {
    setField('apellido_materno', updates.apellidoMaterno);
  }

  if (updates.numeroCliente !== undefined) {
    setField('numero_cliente', updates.numeroCliente);
  }

  if (updates.rfc !== undefined) {
    setField('rfc', updates.rfc);
  }

  if (updates.curp !== undefined) {
    setField('curp', updates.curp);
  }

  if (fields.length === 0) {
    return null;
  }

  values.push(publicId);

  const result = await pool.query(
    `UPDATE clients
     SET ${fields.join(', ')}
     WHERE public_id = $${index}
     RETURNING ${selectFieldsInternal}`,
    values
  );

  return result.rows[0] || null;
};

export const deleteClient = async (publicId) => {
  const result = await pool.query('DELETE FROM clients WHERE public_id = $1', [publicId]);
  return result.rowCount > 0;
};
