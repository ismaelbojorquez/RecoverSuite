import pool from '../../config/db.js';

const selectFieldsInternal =
  'c.id, c.cliente_id, c.portafolio_id, c.numero_credito, c.numero_credito_externo, c.producto, c.estado, c.created_at, c.updated_at, cl.public_id AS cliente_public_id';

export const listCredits = async ({ limit, offset }) => {
  const result = await pool.query(
    `SELECT ${selectFieldsInternal}
     FROM credits c
     JOIN clients cl ON cl.id = c.cliente_id
     ORDER BY c.id
     LIMIT $1 OFFSET $2`,
    [limit, offset]
  );

  return result.rows;
};

export const getCreditById = async (id) => {
  const result = await pool.query(
    `SELECT ${selectFieldsInternal}
     FROM credits c
     JOIN clients cl ON cl.id = c.cliente_id
     WHERE c.id = $1`,
    [id]
  );

  return result.rows[0] || null;
};

export const createCredit = async ({
  clienteId,
  portafolioId,
  numeroCredito,
  producto,
  estado
}) => {
  const result = await pool.query(
    `WITH inserted AS (
       INSERT INTO credits (cliente_id, portafolio_id, numero_credito, producto, estado)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING *
     )
     SELECT ${selectFieldsInternal}
     FROM inserted c
     JOIN clients cl ON cl.id = c.cliente_id`,
    [clienteId, portafolioId, numeroCredito, producto, estado]
  );

  return result.rows[0];
};

export const updateCredit = async (id, updates) => {
  const fields = [];
  const values = [];
  let index = 1;

  const setField = (column, value) => {
    fields.push(`${column} = $${index}`);
    values.push(value);
    index += 1;
  };

  if (updates.clienteId !== undefined) {
    setField('cliente_id', updates.clienteId);
  }

  if (updates.portafolioId !== undefined) {
    setField('portafolio_id', updates.portafolioId);
  }

  if (updates.numeroCredito !== undefined) {
    setField('numero_credito', updates.numeroCredito);
  }

  if (updates.producto !== undefined) {
    setField('producto', updates.producto);
  }

  if (updates.estado !== undefined) {
    setField('estado', updates.estado);
  }

  if (fields.length === 0) {
    return null;
  }

  setField('updated_at', new Date());
  values.push(id);

  const result = await pool.query(
    `UPDATE credits
     SET ${fields.join(', ')}
     WHERE id = $${index}
     RETURNING *`,
    values
  );

  if (!result.rows[0]) {
    return null;
  }

  const joined = await pool.query(
    `SELECT ${selectFieldsInternal}
     FROM credits c
     JOIN clients cl ON cl.id = c.cliente_id
     WHERE c.id = $1`,
    [result.rows[0].id]
  );

  return joined.rows[0] || null;
};

export const deleteCredit = async (id) => {
  const result = await pool.query('DELETE FROM credits WHERE id = $1', [id]);
  return result.rowCount > 0;
};

export const getCreditByNumberAndPortfolio = async ({ portafolioId, numeroCredito }) => {
  const result = await pool.query(
    `SELECT ${selectFieldsInternal}
     FROM credits c
     JOIN clients cl ON cl.id = c.cliente_id
     WHERE c.portafolio_id = $1 AND lower(c.numero_credito) = lower($2)
     LIMIT 1`,
    [portafolioId, numeroCredito]
  );

  return result.rows[0] || null;
};

export const findCreditsByNumbers = async ({ portafolioId, numbers }) => {
  if (!Array.isArray(numbers) || numbers.length === 0) {
    return [];
  }

  const values = [portafolioId];
  const placeholders = numbers.map((numero, index) => {
    values.push(numero);
    return `$${index + 2}`;
  });

  const result = await pool.query(
    `SELECT lower(numero_credito) AS numero_credito
     FROM credits
     WHERE portafolio_id = $1
       AND lower(numero_credito) IN (${placeholders.join(', ')})`,
    values
  );

  return result.rows.map((row) => row.numero_credito);
};

export const listCreditsWithBalancesByClient = async ({ clienteId, portafolioId }) => {
  const result = await pool.query(
    `SELECT
       c.id AS credit_id,
       c.cliente_id,
       c.numero_credito_externo,
       cl.public_id AS cliente_public_id,
       c.portafolio_id,
       c.numero_credito,
       c.producto,
       c.estado,
       c.created_at,
       c.updated_at,
       s.id AS saldo_id,
       s.campo_saldo_id,
       s.valor,
       s.fecha_actualizacion,
       cs.nombre_campo,
       cs.etiqueta_visual,
       cs.tipo_dato,
       cs.orden,
       cs.es_principal,
       cs.activo
     FROM credits c
     JOIN clients cl ON cl.id = c.cliente_id
     LEFT JOIN saldos s ON s.credito_id = c.id
     LEFT JOIN campos_saldo cs ON cs.id = s.campo_saldo_id
     WHERE c.cliente_id = $1 AND c.portafolio_id = $2
     ORDER BY c.id, cs.orden NULLS LAST, s.id`,
    [clienteId, portafolioId]
  );

  return result.rows;
};

export const listCreditSaldosWithFieldsByClient = async ({ clienteId, portafolioId }) => {
  const availability = await pool.query(
    `SELECT
       to_regclass('credit_saldos') IS NOT NULL AS has_credit_saldos,
       to_regclass('saldo_fields') IS NOT NULL AS has_saldo_fields`
  );

  if (
    !availability.rows[0]?.has_credit_saldos ||
    !availability.rows[0]?.has_saldo_fields
  ) {
    return [];
  }

  const result = await pool.query(
    `SELECT
       c.id AS credit_id,
       c.cliente_id,
       c.numero_credito_externo,
       cl.public_id AS cliente_public_id,
       c.portafolio_id,
       c.numero_credito,
       c.producto,
       c.estado,
       c.created_at,
       c.updated_at,
       csv.id AS saldo_id,
       csv.saldo_field_id AS campo_saldo_id,
       COALESCE(
         CASE WHEN csv.value_number IS NOT NULL THEN csv.value_number::text END,
         csv.value_text,
         CASE WHEN csv.value_date IS NOT NULL THEN csv.value_date::text END,
         CASE WHEN csv.value_time IS NOT NULL THEN csv.value_time::text END,
         CASE WHEN csv.value_datetime IS NOT NULL THEN csv.value_datetime::text END
       ) AS valor,
       csv.updated_at AS fecha_actualizacion,
       sf.key AS nombre_campo,
       sf.label AS etiqueta_visual,
       sf.field_type AS tipo_dato,
       sf.order_index AS orden,
       sf.is_primary AS es_principal,
       sf.visible AS activo
     FROM credits c
     JOIN clients cl ON cl.id = c.cliente_id
     LEFT JOIN credit_saldos csv ON csv.credit_id = c.id
     LEFT JOIN saldo_fields sf ON sf.id = csv.saldo_field_id
     WHERE c.cliente_id = $1 AND c.portafolio_id = $2
     ORDER BY c.id, sf.order_index NULLS LAST, csv.id`,
    [clienteId, portafolioId]
  );

  return result.rows;
};

export const getCreditWithBalances = async (id) => {
  const result = await pool.query(
    `SELECT
       c.id AS credit_id,
       c.cliente_id,
       c.numero_credito_externo,
       cl.public_id AS cliente_public_id,
       c.portafolio_id,
       c.numero_credito,
       c.producto,
       c.estado,
       c.created_at,
       c.updated_at,
       s.id AS saldo_id,
       s.campo_saldo_id,
       s.valor,
       s.fecha_actualizacion,
       cs.nombre_campo,
       cs.etiqueta_visual,
       cs.tipo_dato,
       cs.orden,
       cs.es_principal,
       cs.activo
     FROM credits c
     JOIN clients cl ON cl.id = c.cliente_id
     LEFT JOIN saldos s ON s.credito_id = c.id
     LEFT JOIN campos_saldo cs ON cs.id = s.campo_saldo_id
     WHERE c.id = $1
     ORDER BY cs.orden NULLS LAST, s.id`,
    [id]
  );

  return result.rows;
};
