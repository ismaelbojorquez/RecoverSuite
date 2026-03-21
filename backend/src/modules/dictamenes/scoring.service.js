import pool from '../../config/db.js';
import { invalidateClientDetailCache } from '../../utils/cache.js';
import { updateClientDecisionSnapshot } from '../clients/clients.repository.js';
import { listAffectedClientsByDictamenId } from './dictamenes.repository.js';
import { calculateClientScoringSnapshot } from './scoring.engine.js';
import { calculateClientStrategySnapshot } from './strategy.engine.js';

const scoringSelectFields = `
  g.id AS gestion_id,
  g.fecha_gestion,
  g.medio_contacto,
  d.id AS dictamen_id,
  d.tipo_contacto,
  d.score_global,
  d.score_llamada,
  d.score_whatsapp,
  d.score_sms,
  d.score_email,
  d.score_visita,
  d.nivel_riesgo,
  d.permitir_contacto,
  d.bloquear_cliente,
  d.recomendar_reintento
`;

export const listScoringRowsByClient = async (
  { clientInternalId, portafolioId, limit },
  db = pool
) => {
  const values = [clientInternalId, portafolioId];
  let limitClause = '';

  if (Number.isInteger(limit) && limit > 0) {
    values.push(limit);
    limitClause = `LIMIT $${values.length}`;
  }

  const result = await db.query(
    `SELECT ${scoringSelectFields}
     FROM gestiones g
     JOIN dictamenes d ON d.id = g.dictamen_id
     WHERE g.cliente_id = $1
       AND g.portafolio_id = $2
     ORDER BY g.fecha_gestion DESC, g.id DESC
     ${limitClause}`,
    values
  );

  return result.rows;
};

export const getClientChannelAvailability = async ({ clientInternalId }, db = pool) => {
  const result = await db.query(
    `SELECT
        EXISTS(SELECT 1 FROM client_phones WHERE client_id = $1) AS has_phone,
        EXISTS(SELECT 1 FROM client_emails WHERE client_id = $1) AS has_email,
        EXISTS(SELECT 1 FROM client_addresses WHERE client_id = $1) AS has_address`,
    [clientInternalId]
  );

  const row = result.rows[0] || {};

  return {
    hasPhone: Boolean(row.has_phone),
    hasEmail: Boolean(row.has_email),
    hasAddress: Boolean(row.has_address)
  };
};

export const rebuildClientScoringSnapshot = async (
  { clientInternalId, portafolioId },
  db = pool
) => {
  const [rows, availabilityContext] = await Promise.all([
    listScoringRowsByClient({ clientInternalId, portafolioId }, db),
    getClientChannelAvailability({ clientInternalId }, db)
  ]);

  const snapshot = calculateClientScoringSnapshot(rows);
  const strategySnapshot = calculateClientStrategySnapshot({
    rows,
    availabilityContext,
    scoringSnapshot: snapshot
  });
  const decisionSnapshot = { ...snapshot, ...strategySnapshot };

  await updateClientDecisionSnapshot(clientInternalId, decisionSnapshot, db);
  return decisionSnapshot;
};

export const refreshAffectedClientsForDictamen = async ({ dictamenId }) => {
  const affectedClients = await listAffectedClientsByDictamenId(dictamenId);

  for (const client of affectedClients) {
    await rebuildClientScoringSnapshot({
      clientInternalId: client.cliente_id,
      portafolioId: client.portafolio_id
    });

    await invalidateClientDetailCache({
      portafolioId: client.portafolio_id,
      clientId: client.cliente_public_id
    });
  }
};
