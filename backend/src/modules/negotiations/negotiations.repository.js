import pool from '../../config/db.js';

const discountLevelFields = `
  dl.id,
  dl.nombre,
  dl.descripcion,
  dl.porcentaje_descuento,
  dl.activo,
  dl.created_at,
  dl.updated_at
`;

const negotiationSelect = `
  n.id,
  n.client_id,
  n.portfolio_id,
  n.discount_level_id,
  n.usuario_id,
  n.estado,
  n.referencia,
  n.observaciones,
  n.fecha_inicio,
  n.fecha_cierre,
  n.porcentaje_descuento,
  n.monto_base_total,
  n.monto_negociado_total,
  n.monto_descuento_total,
  n.created_at,
  n.updated_at,
  cl.public_id AS client_public_id,
  dl.nombre AS nivel_nombre,
  dl.porcentaje_descuento AS nivel_porcentaje_descuento,
  u.username AS usuario_username,
  u.nombre AS usuario_nombre,
  COALESCE(
    jsonb_agg(
      DISTINCT jsonb_build_object(
        'credito_id', c.id,
        'numero_credito', c.numero_credito,
        'numero_credito_externo', c.numero_credito_externo,
        'producto', c.producto,
        'monto_base', nc.monto_base,
        'monto_negociado', nc.monto_negociado
      )
    ) FILTER (WHERE c.id IS NOT NULL),
    '[]'::jsonb
  ) AS creditos
`;

const normalizeGroupRows = (row) => ({
  ...row,
  grupos: Array.isArray(row.grupos) ? row.grupos : []
});

export const listDiscountLevels = async ({ includeInactive = false } = {}, db = pool) => {
  const result = await db.query(
    `SELECT
       ${discountLevelFields},
       COALESCE(
         jsonb_agg(
           DISTINCT jsonb_build_object('id', g.id, 'name', g.name)
         ) FILTER (WHERE g.id IS NOT NULL),
         '[]'::jsonb
       ) AS grupos
     FROM discount_levels dl
     LEFT JOIN discount_level_groups dlg ON dlg.discount_level_id = dl.id
     LEFT JOIN user_groups g ON g.id = dlg.group_id
     WHERE ($1::BOOLEAN = TRUE OR dl.activo = TRUE)
     GROUP BY dl.id
     ORDER BY dl.porcentaje_descuento ASC, dl.id ASC`,
    [Boolean(includeInactive)]
  );

  return result.rows.map(normalizeGroupRows);
};

export const getDiscountLevelById = async (id, db = pool) => {
  const result = await db.query(
    `SELECT ${discountLevelFields}
     FROM discount_levels dl
     WHERE dl.id = $1`,
    [id]
  );

  return result.rows[0] || null;
};

export const getDiscountLevelByIdForUser = async ({ discountLevelId, userId, isAdmin = false }, db = pool) => {
  if (isAdmin) {
    const result = await db.query(
      `SELECT ${discountLevelFields}
       FROM discount_levels dl
       WHERE dl.id = $1
         AND dl.activo = TRUE`,
      [discountLevelId]
    );
    return result.rows[0] || null;
  }

  const result = await db.query(
    `WITH user_groups_resolved AS (
       SELECT DISTINCT ugm.group_id
       FROM user_group_members ugm
       WHERE ugm.user_id = $1
       UNION
       SELECT DISTINCT u.group_id
       FROM users u
       WHERE u.id = $1
         AND u.group_id IS NOT NULL
     )
     SELECT DISTINCT ${discountLevelFields}
     FROM discount_levels dl
     JOIN discount_level_groups dlg ON dlg.discount_level_id = dl.id
     JOIN user_groups_resolved ugr ON ugr.group_id = dlg.group_id
     WHERE dl.id = $2
       AND dl.activo = TRUE`,
    [userId, discountLevelId]
  );

  return result.rows[0] || null;
};

export const listAvailableDiscountLevelsForUser = async ({ userId, isAdmin = false }, db = pool) => {
  if (isAdmin) {
    const result = await db.query(
      `SELECT ${discountLevelFields}
       FROM discount_levels dl
       WHERE dl.activo = TRUE
       ORDER BY dl.porcentaje_descuento ASC, dl.id ASC`,
      []
    );
    return result.rows;
  }

  const result = await db.query(
    `WITH user_groups_resolved AS (
       SELECT DISTINCT ugm.group_id
       FROM user_group_members ugm
       WHERE ugm.user_id = $1
       UNION
       SELECT DISTINCT u.group_id
       FROM users u
       WHERE u.id = $1
         AND u.group_id IS NOT NULL
     )
     SELECT DISTINCT ${discountLevelFields}
     FROM discount_levels dl
     JOIN discount_level_groups dlg ON dlg.discount_level_id = dl.id
     JOIN user_groups_resolved ugr ON ugr.group_id = dlg.group_id
     WHERE dl.activo = TRUE
     ORDER BY dl.porcentaje_descuento ASC, dl.id ASC`,
    [userId]
  );

  return result.rows;
};

export const createDiscountLevel = async (
  { nombre, descripcion, porcentajeDescuento, activo = true },
  db = pool
) => {
  const result = await db.query(
    `INSERT INTO discount_levels (nombre, descripcion, porcentaje_descuento, activo)
     VALUES ($1, $2, $3, $4)
     RETURNING ${discountLevelFields}`,
    [nombre, descripcion, porcentajeDescuento, Boolean(activo)]
  );

  return result.rows[0];
};

export const updateDiscountLevel = async (id, updates = {}, db = pool) => {
  const fields = [];
  const values = [];
  let index = 1;

  const setField = (column, value) => {
    fields.push(`${column} = $${index}`);
    values.push(value);
    index += 1;
  };

  if (updates.nombre !== undefined) {
    setField('nombre', updates.nombre);
  }

  if (updates.descripcion !== undefined) {
    setField('descripcion', updates.descripcion);
  }

  if (updates.porcentajeDescuento !== undefined) {
    setField('porcentaje_descuento', updates.porcentajeDescuento);
  }

  if (updates.activo !== undefined) {
    setField('activo', Boolean(updates.activo));
  }

  if (fields.length === 0) {
    return null;
  }

  setField('updated_at', new Date());
  values.push(id);

  const result = await db.query(
    `UPDATE discount_levels
     SET ${fields.join(', ')}
     WHERE id = $${index}
     RETURNING ${discountLevelFields}`,
    values
  );

  return result.rows[0] || null;
};

export const setDiscountLevelGroups = async ({ discountLevelId, groupIds = [] }, db = pool) => {
  await db.query(
    `DELETE FROM discount_level_groups
     WHERE discount_level_id = $1`,
    [discountLevelId]
  );

  if (!Array.isArray(groupIds) || groupIds.length === 0) {
    return;
  }

  const uniqueIds = Array.from(new Set(groupIds));
  const values = [];
  const placeholders = [];
  let index = 1;

  uniqueIds.forEach((groupId) => {
    values.push(discountLevelId, groupId);
    placeholders.push(`($${index}, $${index + 1})`);
    index += 2;
  });

  await db.query(
    `INSERT INTO discount_level_groups (discount_level_id, group_id)
     VALUES ${placeholders.join(', ')}
     ON CONFLICT DO NOTHING`,
    values
  );
};

export const listClientCreditsForNegotiation = async (
  { clientId, portfolioId, creditIds = null },
  db = pool
) => {
  const result = await db.query(
    `SELECT
       c.id AS credito_id,
       c.numero_credito,
       c.numero_credito_externo,
       c.producto,
       COALESCE((
         SELECT s.valor
         FROM saldos s
         JOIN campos_saldo cs ON cs.id = s.campo_saldo_id
         WHERE s.credito_id = c.id
           AND cs.es_principal = TRUE
         ORDER BY cs.orden ASC, s.id ASC
         LIMIT 1
       ), 0)::NUMERIC(18,2) AS monto_base
     FROM credits c
     WHERE c.cliente_id = $1
       AND c.portafolio_id = $2
       AND ($3::BIGINT[] IS NULL OR c.id = ANY($3::BIGINT[]))
     ORDER BY c.id`,
    [clientId, portfolioId, Array.isArray(creditIds) && creditIds.length > 0 ? creditIds : null]
  );

  return result.rows;
};

export const findActiveNegotiationByClient = async ({ clientId, forUpdate = false }, db = pool) => {
  const result = await db.query(
    `SELECT id
     FROM negotiations
     WHERE client_id = $1
       AND estado = 'activa'
     LIMIT 1
     ${forUpdate ? 'FOR UPDATE' : ''}`,
    [clientId]
  );

  return result.rows[0] || null;
};

export const createNegotiation = async (
  {
    clientId,
    portfolioId,
    discountLevelId,
    usuarioId,
    referencia,
    observaciones,
    porcentajeDescuento,
    montoBaseTotal,
    montoNegociadoTotal,
    montoDescuentoTotal
  },
  db = pool
) => {
  const result = await db.query(
    `INSERT INTO negotiations (
       client_id,
       portfolio_id,
       discount_level_id,
       usuario_id,
       referencia,
       observaciones,
       porcentaje_descuento,
       monto_base_total,
       monto_negociado_total,
       monto_descuento_total
     )
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
     RETURNING id`,
    [
      clientId,
      portfolioId,
      discountLevelId,
      usuarioId,
      referencia || null,
      observaciones || null,
      porcentajeDescuento,
      montoBaseTotal,
      montoNegociadoTotal,
      montoDescuentoTotal
    ]
  );

  return result.rows[0] || null;
};

export const insertNegotiationCredits = async ({ negotiationId, credits = [] }, db = pool) => {
  if (!Array.isArray(credits) || credits.length === 0) {
    return;
  }

  const values = [];
  const placeholders = [];
  let index = 1;

  credits.forEach((credit) => {
    values.push(
      negotiationId,
      credit.credito_id,
      credit.monto_base ?? null,
      credit.monto_negociado ?? null
    );
    placeholders.push(`($${index}, $${index + 1}, $${index + 2}, $${index + 3})`);
    index += 4;
  });

  await db.query(
    `INSERT INTO negotiation_credits (
       negotiation_id,
       credit_id,
       monto_base,
       monto_negociado
     )
     VALUES ${placeholders.join(', ')}`,
    values
  );
};

export const createNegotiationEvent = async (
  { negotiationId, tipo, detalle = null, payload = {}, usuarioId = null },
  db = pool
) => {
  await db.query(
    `INSERT INTO negotiation_events (negotiation_id, tipo, detalle, payload, usuario_id)
     VALUES ($1, $2, $3, $4, $5)`,
    [negotiationId, tipo, detalle, payload, usuarioId]
  );
};

export const updateNegotiationStatus = async (
  {
    negotiationId,
    estado,
    observaciones,
    montoNegociadoTotal,
    montoDescuentoTotal
  },
  db = pool
) => {
  const result = await db.query(
    `UPDATE negotiations
     SET estado = $1,
         observaciones = COALESCE($2, observaciones),
         fecha_cierre = NOW(),
         monto_negociado_total = COALESCE($3, monto_negociado_total),
         monto_descuento_total = COALESCE($4, monto_descuento_total),
         updated_at = NOW()
     WHERE id = $5
       AND estado = 'activa'
     RETURNING id`,
    [estado, observaciones || null, montoNegociadoTotal ?? null, montoDescuentoTotal ?? null, negotiationId]
  );

  return result.rows[0] || null;
};

export const getNegotiationById = async (negotiationId, db = pool) => {
  const result = await db.query(
    `SELECT ${negotiationSelect}
     FROM negotiations n
     JOIN clients cl ON cl.id = n.client_id
     JOIN discount_levels dl ON dl.id = n.discount_level_id
     JOIN users u ON u.id = n.usuario_id
     LEFT JOIN negotiation_credits nc ON nc.negotiation_id = n.id
     LEFT JOIN credits c ON c.id = nc.credit_id
     WHERE n.id = $1
     GROUP BY n.id, cl.public_id, dl.id, u.id
     LIMIT 1`,
    [negotiationId]
  );

  return result.rows[0] || null;
};

export const listNegotiationsByClient = async ({ clientId, limit = 20, offset = 0 }, db = pool) => {
  const result = await db.query(
    `SELECT ${negotiationSelect}
     FROM negotiations n
     JOIN clients cl ON cl.id = n.client_id
     JOIN discount_levels dl ON dl.id = n.discount_level_id
     JOIN users u ON u.id = n.usuario_id
     LEFT JOIN negotiation_credits nc ON nc.negotiation_id = n.id
     LEFT JOIN credits c ON c.id = nc.credit_id
     WHERE n.client_id = $1
     GROUP BY n.id, cl.public_id, dl.id, u.id
     ORDER BY
       CASE WHEN n.estado = 'activa' THEN 0 ELSE 1 END,
       n.fecha_inicio DESC,
       n.id DESC
     LIMIT $2 OFFSET $3`,
    [clientId, limit, offset]
  );

  return result.rows;
};

