import pool from '../../config/db.js';

const selectFields = `
  g.id,
  g.portafolio_id,
  g.cliente_id,
  g.credito_id,
  g.usuario_id,
  g.dictamen_id,
  g.medio_contacto,
  g.comentario,
  g.fecha_gestion,
  g.created_at,
  cl.public_id AS cliente_public_id,
  d.nombre AS dictamen_nombre,
  d.tipo_contacto AS dictamen_tipo_contacto,
  d.nivel_riesgo AS dictamen_nivel_riesgo,
  d.score_global AS dictamen_score_global,
  d.score_llamada AS dictamen_score_llamada,
  d.score_whatsapp AS dictamen_score_whatsapp,
  d.score_sms AS dictamen_score_sms,
  d.score_email AS dictamen_score_email,
  d.score_visita AS dictamen_score_visita,
  d.permitir_contacto AS dictamen_permitir_contacto,
  d.bloquear_cliente AS dictamen_bloquear_cliente,
  d.recomendar_reintento AS dictamen_recomendar_reintento
`;

export const createGestion = async ({
  portafolioId,
  clienteId,
  creditoId,
  usuarioId,
  dictamenId,
  medioContacto,
  comentario,
  fechaGestion
}, db = pool) => {
  const result = await db.query(
    `WITH inserted AS (
       INSERT INTO gestiones
         (portafolio_id, cliente_id, credito_id, usuario_id, dictamen_id, medio_contacto, comentario, fecha_gestion)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
       RETURNING *
     )
     SELECT ${selectFields}
     FROM inserted g
     JOIN clients cl ON cl.id = g.cliente_id
     LEFT JOIN dictamenes d ON d.id = g.dictamen_id`,
    [
      portafolioId,
      clienteId,
      creditoId ?? null,
      usuarioId,
      dictamenId,
      medioContacto,
      comentario || null,
      fechaGestion
    ]
  );

  return result.rows[0];
};

export const listGestiones = async ({
  portafolioId,
  clienteId,
  creditoId,
  usuarioId,
  fechaDesde,
  fechaHasta,
  limit = 20,
  offset = 0
}) => {
  const where = [];
  const values = [];

  const addFilter = (condition, value) => {
    if (value === undefined || value === null) return;
    values.push(value);
    where.push(condition.replace('$', `$${values.length}`));
  };

  addFilter('portafolio_id = $', portafolioId);
  addFilter('cliente_id = $', clienteId);
  addFilter('credito_id = $', creditoId);
  addFilter('usuario_id = $', usuarioId);

  if (fechaDesde) {
    addFilter('fecha_gestion >= $', fechaDesde);
  }

  if (fechaHasta) {
    addFilter('fecha_gestion <= $', fechaHasta);
  }

  values.push(limit);
  values.push(offset);

  const whereClause = where.length > 0 ? `WHERE ${where.join(' AND ')}` : '';

  const result = await pool.query(
    `SELECT ${selectFields}
     FROM gestiones g
     JOIN clients cl ON cl.id = g.cliente_id
     LEFT JOIN dictamenes d ON d.id = g.dictamen_id
     ${whereClause}
     ORDER BY g.fecha_gestion DESC, g.id DESC
     LIMIT $${values.length - 1} OFFSET $${values.length}`,
    values
  );

  return result.rows;
};

export const listGestionesByCliente = async ({
  portafolioId,
  clienteId,
  usuarioId,
  limit = 20,
  offset = 0
}) => {
  const values = [portafolioId, clienteId];
  if (usuarioId) values.push(usuarioId);
  values.push(limit, offset);

  const result = await pool.query(
    `SELECT
        g.id,
        g.portafolio_id,
        g.cliente_id,
        g.credito_id,
        g.usuario_id,
        g.dictamen_id,
        g.medio_contacto,
        g.comentario,
        g.fecha_gestion,
        g.created_at,
        cl.public_id AS cliente_public_id,
        u.username AS agente_email,
        u.nombre AS agente_nombre,
        d.nombre AS dictamen_nombre,
        d.tipo_contacto AS dictamen_tipo_contacto,
        d.nivel_riesgo AS dictamen_nivel_riesgo,
        d.score_global AS dictamen_score_global,
        d.score_llamada AS dictamen_score_llamada,
        d.score_whatsapp AS dictamen_score_whatsapp,
        d.score_sms AS dictamen_score_sms,
        d.score_email AS dictamen_score_email,
        d.score_visita AS dictamen_score_visita,
        d.permitir_contacto AS dictamen_permitir_contacto,
        d.bloquear_cliente AS dictamen_bloquear_cliente,
        d.recomendar_reintento AS dictamen_recomendar_reintento
     FROM gestiones g
     JOIN clients cl ON cl.id = g.cliente_id
     JOIN users u ON u.id = g.usuario_id
     LEFT JOIN dictamenes d ON d.id = g.dictamen_id
     WHERE g.portafolio_id = $1 AND g.cliente_id = $2
     ${usuarioId ? `AND g.usuario_id = $3` : ''}
     ORDER BY g.fecha_gestion DESC, g.id DESC
     LIMIT $${usuarioId ? 4 : 3} OFFSET $${usuarioId ? 5 : 4}`,
    values
  );

  return result.rows;
};
