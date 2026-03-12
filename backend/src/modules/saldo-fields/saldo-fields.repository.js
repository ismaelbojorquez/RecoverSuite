import pool from '../../config/db.js';

const selectColumns = `
  id,
  portfolio_id,
  key,
  label,
  field_type,
  value_type,
  required,
  visible,
  order_index,
  calc_expression,
  created_at,
  updated_at
`;

export const listSaldoFieldsByPortfolio = async ({ portfolioId }) => {
  const result = await pool.query(
    `SELECT ${selectColumns}
     FROM saldo_fields
     WHERE portfolio_id = $1
     ORDER BY order_index, id`,
    [portfolioId]
  );

  return result.rows;
};

export const getSaldoFieldById = async ({ fieldId }) => {
  const result = await pool.query(
    `SELECT ${selectColumns}
     FROM saldo_fields
     WHERE id = $1`,
    [fieldId]
  );

  return result.rows[0] || null;
};

export const getSaldoFieldByKey = async ({ portfolioId, key }) => {
  const result = await pool.query(
    `SELECT ${selectColumns}
     FROM saldo_fields
     WHERE portfolio_id = $1 AND key = $2`,
    [portfolioId, key]
  );

  return result.rows[0] || null;
};

export const createSaldoField = async ({
  portfolioId,
  key,
  label,
  fieldType,
  valueType,
  required,
  visible,
  orderIndex,
  calcExpression
}) => {
  const result = await pool.query(
    `INSERT INTO saldo_fields (
        portfolio_id,
        key,
        label,
        field_type,
        value_type,
        required,
        visible,
        order_index,
        calc_expression
      )
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
     RETURNING ${selectColumns}`,
    [
      portfolioId,
      key,
      label,
      fieldType,
      valueType,
      required,
      visible,
      orderIndex,
      calcExpression
    ]
  );

  return result.rows[0];
};

export const updateSaldoField = async ({
  fieldId,
  key,
  label,
  fieldType,
  valueType,
  required,
  visible,
  orderIndex,
  calcExpression
}) => {
  const fields = [];
  const values = [];
  let index = 1;

  const setField = (column, value) => {
    fields.push(`${column} = $${index}`);
    values.push(value);
    index += 1;
  };

  if (key !== undefined) setField('key', key);
  if (label !== undefined) setField('label', label);
  if (fieldType !== undefined) setField('field_type', fieldType);
  if (valueType !== undefined) setField('value_type', valueType);
  if (required !== undefined) setField('required', required);
  if (visible !== undefined) setField('visible', visible);
  if (orderIndex !== undefined) setField('order_index', orderIndex);
  if (calcExpression !== undefined) setField('calc_expression', calcExpression);

  if (fields.length === 0) {
    return null;
  }

  setField('updated_at', new Date());
  values.push(fieldId);

  const result = await pool.query(
    `UPDATE saldo_fields
     SET ${fields.join(', ')}
     WHERE id = $${index}
     RETURNING ${selectColumns}`,
    values
  );

  return result.rows[0] || null;
};

export const deleteSaldoField = async ({ fieldId }) => {
  const result = await pool.query(
    `DELETE FROM saldo_fields
     WHERE id = $1`,
    [fieldId]
  );

  return result.rowCount > 0;
};

export const isSaldoFieldInUse = async ({ fieldId }) => {
  const result = await pool.query(
    `SELECT
       CASE
         WHEN to_regclass('credit_saldos') IS NOT NULL THEN
           EXISTS (SELECT 1 FROM credit_saldos WHERE saldo_field_id = $1)
         ELSE FALSE
       END AS in_new_table,
       CASE
         WHEN to_regclass('saldos') IS NOT NULL
              AND EXISTS (
                SELECT 1 FROM information_schema.columns
                WHERE table_name = 'saldos' AND column_name = 'campo_saldo_id'
              )
           THEN EXISTS (SELECT 1 FROM saldos WHERE campo_saldo_id = $1)
         ELSE FALSE
       END AS in_legacy_table`,
    [fieldId]
  );

  const row = result.rows[0];
  return Boolean(row?.in_new_table || row?.in_legacy_table);
};
