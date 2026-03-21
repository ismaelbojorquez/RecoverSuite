import pool from '../../config/db.js';

const scoringSelectFields = `
  scoring_global,
  scoring_llamada,
  scoring_whatsapp,
  scoring_sms,
  scoring_email,
  scoring_visita,
  scoring_riesgo_nivel,
  scoring_permitir_contacto,
  scoring_bloquear_cliente,
  scoring_recomendar_reintento,
  scoring_actualizado_at,
  strategy_next_best_action,
  strategy_recommended_channel,
  strategy_should_stop_contact,
  strategy_should_escalate_visit,
  strategy_visit_eligible,
  strategy_sequence_step,
  strategy_reason_codes,
  strategy_contact_plan,
  strategy_actualizado_at
`;

const selectFieldsPublic = `
  public_id AS id,
  portafolio_id,
  nombre,
  apellido_paterno,
  apellido_materno,
  numero_cliente,
  rfc,
  curp,
  ${scoringSelectFields},
  created_at
`;

const selectFieldsInternal = `
  id AS internal_id,
  public_id AS id,
  portafolio_id,
  nombre,
  apellido_paterno,
  apellido_materno,
  numero_cliente,
  rfc,
  curp,
  ${scoringSelectFields},
  created_at
`;

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

export const updateClientDecisionSnapshot = async (clientInternalId, snapshot, db = pool) => {
  const result = await db.query(
    `UPDATE clients
     SET
       scoring_global = $2,
       scoring_llamada = $3,
       scoring_whatsapp = $4,
       scoring_sms = $5,
       scoring_email = $6,
       scoring_visita = $7,
       scoring_riesgo_nivel = $8,
       scoring_permitir_contacto = $9,
       scoring_bloquear_cliente = $10,
       scoring_recomendar_reintento = $11,
       scoring_actualizado_at = $12,
       strategy_next_best_action = $13,
       strategy_recommended_channel = $14,
       strategy_should_stop_contact = $15,
       strategy_should_escalate_visit = $16,
       strategy_visit_eligible = $17,
       strategy_sequence_step = $18,
       strategy_reason_codes = $19,
       strategy_contact_plan = $20,
       strategy_actualizado_at = $21
     WHERE id = $1
     RETURNING ${selectFieldsInternal}`,
    [
      clientInternalId,
      snapshot?.score_global ?? null,
      snapshot?.score_llamada ?? null,
      snapshot?.score_whatsapp ?? null,
      snapshot?.score_sms ?? null,
      snapshot?.score_email ?? null,
      snapshot?.score_visita ?? null,
      snapshot?.scoring_riesgo_nivel ?? null,
      snapshot?.scoring_permitir_contacto ?? null,
      snapshot?.scoring_bloquear_cliente ?? null,
      snapshot?.scoring_recomendar_reintento ?? null,
      snapshot?.scoring_actualizado_at ?? new Date(),
      snapshot?.strategy_next_best_action ?? null,
      snapshot?.strategy_recommended_channel ?? null,
      snapshot?.strategy_should_stop_contact ?? false,
      snapshot?.strategy_should_escalate_visit ?? false,
      snapshot?.strategy_visit_eligible ?? false,
      snapshot?.strategy_sequence_step ?? 1,
      snapshot?.strategy_reason_codes ?? [],
      snapshot?.strategy_contact_plan ?? null,
      snapshot?.strategy_actualizado_at ?? new Date()
    ]
  );

  return result.rows[0] || null;
};

export const updateClientScoringSnapshot = updateClientDecisionSnapshot;
