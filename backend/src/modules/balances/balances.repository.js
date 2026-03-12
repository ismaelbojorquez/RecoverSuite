import pool from '../../config/db.js';

const selectFields =
  'id, credito_id, campo_saldo_id, valor, fecha_actualizacion';

export const listBalancesByCredit = async ({ creditoId, limit, offset }) => {
  if (limit !== undefined) {
    const result = await pool.query(
      `SELECT ${selectFields}
       FROM saldos
       WHERE credito_id = $1
       ORDER BY id
       LIMIT $2 OFFSET $3`,
      [creditoId, limit, offset]
    );

    return result.rows;
  }

  const result = await pool.query(
    `SELECT ${selectFields}
     FROM saldos
     WHERE credito_id = $1
     ORDER BY id`,
    [creditoId]
  );

  return result.rows;
};

export const getBalanceById = async ({ creditoId, saldoId }) => {
  const result = await pool.query(
    `SELECT ${selectFields}
     FROM saldos
     WHERE id = $1 AND credito_id = $2`,
    [saldoId, creditoId]
  );

  return result.rows[0] || null;
};

export const createBalance = async ({ creditoId, campoSaldoId, valor }) => {
  const result = await pool.query(
    `INSERT INTO saldos (credito_id, campo_saldo_id, valor)
     VALUES ($1, $2, $3)
     RETURNING ${selectFields}`,
    [creditoId, campoSaldoId, valor]
  );

  return result.rows[0];
};

export const updateBalance = async ({
  creditoId,
  saldoId,
  campoSaldoId,
  valor
}) => {
  const fields = [];
  const values = [];
  let index = 1;

  const setField = (column, value) => {
    fields.push(`${column} = $${index}`);
    values.push(value);
    index += 1;
  };

  if (campoSaldoId !== undefined) {
    setField('campo_saldo_id', campoSaldoId);
  }

  if (valor !== undefined) {
    setField('valor', valor);
  }

  if (fields.length === 0) {
    return null;
  }

  setField('fecha_actualizacion', new Date());
  values.push(saldoId, creditoId);

  const result = await pool.query(
    `UPDATE saldos
     SET ${fields.join(', ')}
     WHERE id = $${index} AND credito_id = $${index + 1}
     RETURNING ${selectFields}`,
    values
  );

  return result.rows[0] || null;
};

export const deleteBalance = async ({ creditoId, saldoId }) => {
  const result = await pool.query(
    `DELETE FROM saldos
     WHERE id = $1 AND credito_id = $2`,
    [saldoId, creditoId]
  );

  return result.rowCount > 0;
};
