import pool from '../../config/db.js';

const selectColumns =
  'id, credit_id, saldo_field_id, value_text, value_number, value_date, value_time, value_datetime, updated_at';

export const listCreditSaldos = async ({ creditId }) => {
  const result = await pool.query(
    `SELECT ${selectColumns}
     FROM credit_saldos
     WHERE credit_id = $1`,
    [creditId]
  );

  return result.rows;
};

export const upsertCreditSaldo = async ({
  creditId,
  saldoFieldId,
  valueText,
  valueNumber,
  valueDate,
  valueTime,
  valueDatetime
}) => {
  const result = await pool.query(
    `INSERT INTO credit_saldos (
        credit_id,
        saldo_field_id,
        value_text,
        value_number,
        value_date,
        value_time,
        value_datetime
      )
     VALUES ($1, $2, $3, $4, $5, $6, $7)
     ON CONFLICT (credit_id, saldo_field_id)
     DO UPDATE
       SET value_text = EXCLUDED.value_text,
           value_number = EXCLUDED.value_number,
           value_date = EXCLUDED.value_date,
           value_time = EXCLUDED.value_time,
           value_datetime = EXCLUDED.value_datetime,
           updated_at = NOW()
     RETURNING ${selectColumns}`,
    [creditId, saldoFieldId, valueText, valueNumber, valueDate, valueTime, valueDatetime]
  );

  return result.rows[0];
};
