import pool from '../../config/db.js';

const campaignClientSelectFields = `
  c.id AS client_internal_id,
  c.public_id AS client_id,
  c.portafolio_id,
  c.numero_cliente,
  c.nombre,
  c.apellido_paterno,
  c.apellido_materno,
  c.rfc,
  c.curp,
  c.scoring_global,
  c.scoring_llamada,
  c.scoring_whatsapp,
  c.scoring_sms,
  c.scoring_email,
  c.scoring_visita,
  c.scoring_riesgo_nivel,
  c.scoring_permitir_contacto,
  c.scoring_bloquear_cliente,
  c.scoring_recomendar_reintento,
  c.scoring_actualizado_at,
  c.strategy_next_best_action,
  c.strategy_recommended_channel,
  c.strategy_should_stop_contact,
  c.strategy_should_escalate_visit,
  c.strategy_visit_eligible,
  c.strategy_sequence_step,
  c.strategy_reason_codes,
  c.strategy_contact_plan,
  phone.telefonos,
  phone.telefono,
  email.emails,
  email.email,
  address.linea1,
  address.linea2,
  address.ciudad,
  address.estado,
  address.codigo_postal,
  address.pais,
  credits.credit_count,
  credits.credit_numbers
`;

export const listEligibleCampaignClients = async ({
  portafolioId,
  riesgo,
  scoreMin,
  scoreMax,
  afterClientInternalId,
  limit,
  offset = 0
} = {}) => {
  const conditions = [
    'COALESCE(c.scoring_bloquear_cliente, FALSE) = FALSE',
    'COALESCE(c.scoring_permitir_contacto, TRUE) = TRUE',
    'COALESCE(c.strategy_should_stop_contact, FALSE) = FALSE'
  ];
  const values = [];

  if (portafolioId !== undefined && portafolioId !== null) {
    values.push(portafolioId);
    conditions.push(`c.portafolio_id = $${values.length}`);
  }

  if (riesgo) {
    values.push(riesgo);
    conditions.push(`c.scoring_riesgo_nivel = $${values.length}`);
  }

  if (scoreMin !== undefined && scoreMin !== null) {
    values.push(scoreMin);
    conditions.push(`COALESCE(c.scoring_global, 0) >= $${values.length}`);
  }

  if (scoreMax !== undefined && scoreMax !== null) {
    values.push(scoreMax);
    conditions.push(`COALESCE(c.scoring_global, 0) <= $${values.length}`);
  }

  if (Number.isInteger(afterClientInternalId) && afterClientInternalId > 0) {
    values.push(afterClientInternalId);
    conditions.push(`c.id > $${values.length}`);
  }

  let limitClause = '';
  if (Number.isInteger(limit) && limit > 0) {
    values.push(limit);
    limitClause += ` LIMIT $${values.length}`;
  }

  if (
    (!Number.isInteger(afterClientInternalId) || afterClientInternalId <= 0) &&
    Number.isInteger(offset) &&
    offset > 0
  ) {
    values.push(offset);
    limitClause += ` OFFSET $${values.length}`;
  }

  const result = await pool.query(
    `SELECT ${campaignClientSelectFields}
     FROM clients c
     LEFT JOIN LATERAL (
       SELECT
         array_remove(array_agg(telefono ORDER BY id), NULL) AS telefonos,
         (array_remove(array_agg(telefono ORDER BY id), NULL))[1] AS telefono
       FROM client_phones
       WHERE client_id = c.id
     ) phone ON TRUE
     LEFT JOIN LATERAL (
       SELECT
         array_remove(array_agg(email ORDER BY id), NULL) AS emails,
         (array_remove(array_agg(email ORDER BY id), NULL))[1] AS email
       FROM client_emails
       WHERE client_id = c.id
     ) email ON TRUE
     LEFT JOIN LATERAL (
       SELECT linea1, linea2, ciudad, estado, codigo_postal, pais
       FROM client_addresses
       WHERE client_id = c.id
       ORDER BY id
       LIMIT 1
     ) address ON TRUE
     LEFT JOIN LATERAL (
       SELECT
         COUNT(*)::int AS credit_count,
         string_agg(numero_credito, ', ' ORDER BY numero_credito) AS credit_numbers
       FROM credits
       WHERE cliente_id = c.id
     ) credits ON TRUE
     WHERE ${conditions.join('\n       AND ')}
     ORDER BY c.id
     ${limitClause}`,
    values
  );

  return result.rows;
};

export default {
  listEligibleCampaignClients
};
