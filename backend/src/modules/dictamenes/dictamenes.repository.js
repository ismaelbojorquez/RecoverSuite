import pool from '../../config/db.js';

const selectFields = `
  id,
  portafolio_id,
  nombre,
  descripcion,
  tipo_contacto,
  score_global,
  score_llamada,
  score_whatsapp,
  score_sms,
  score_email,
  score_visita,
  nivel_riesgo,
  permitir_contacto,
  bloquear_cliente,
  recomendar_reintento,
  activo,
  created_at,
  updated_at
`;

export const listDictamenes = async ({ portafolioId, activo, db = pool }) => {
  const where = [];
  const values = [];

  const addFilter = (condition, value) => {
    if (value === undefined || value === null) {
      return;
    }

    values.push(value);
    where.push(condition.replace('$', `$${values.length}`));
  };

  addFilter('portafolio_id = $', portafolioId);
  addFilter('activo = $', activo);

  const whereClause = where.length > 0 ? `WHERE ${where.join(' AND ')}` : '';

  const result = await db.query(
    `SELECT ${selectFields}
     FROM dictamenes
     ${whereClause}
     ORDER BY activo DESC, nombre ASC`,
    values
  );

  return result.rows;
};

export const getDictamenById = async (id, db = pool) => {
  const result = await db.query(
    `SELECT ${selectFields}
     FROM dictamenes
     WHERE id = $1`,
    [id]
  );

  return result.rows[0] || null;
};

export const createDictamen = async (
  {
    portafolioId,
    nombre,
    descripcion,
    tipoContacto,
    scoreGlobal,
    scoreLlamada,
    scoreWhatsapp,
    scoreSms,
    scoreEmail,
    scoreVisita,
    nivelRiesgo,
    permitirContacto,
    bloquearCliente,
    recomendarReintento,
    activo
  },
  db = pool
) => {
  const result = await db.query(
    `INSERT INTO dictamenes
      (
        portafolio_id,
        nombre,
        descripcion,
        tipo_contacto,
        score_global,
        score_llamada,
        score_whatsapp,
        score_sms,
        score_email,
        score_visita,
        nivel_riesgo,
        permitir_contacto,
        bloquear_cliente,
        recomendar_reintento,
        activo
      )
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)
     RETURNING ${selectFields}`,
    [
      portafolioId,
      nombre,
      descripcion ?? null,
      tipoContacto,
      scoreGlobal,
      scoreLlamada,
      scoreWhatsapp,
      scoreSms,
      scoreEmail,
      scoreVisita,
      nivelRiesgo,
      permitirContacto,
      bloquearCliente,
      recomendarReintento,
      activo
    ]
  );

  return result.rows[0];
};

export const updateDictamen = async (id, updates, db = pool) => {
  const fields = [];
  const values = [];
  let index = 1;

  const setField = (column, value) => {
    fields.push(`${column} = $${index}`);
    values.push(value);
    index += 1;
  };

  if (updates.nombre !== undefined) setField('nombre', updates.nombre);
  if (updates.descripcion !== undefined) setField('descripcion', updates.descripcion);
  if (updates.tipoContacto !== undefined) setField('tipo_contacto', updates.tipoContacto);
  if (updates.scoreGlobal !== undefined) setField('score_global', updates.scoreGlobal);
  if (updates.scoreLlamada !== undefined) setField('score_llamada', updates.scoreLlamada);
  if (updates.scoreWhatsapp !== undefined) setField('score_whatsapp', updates.scoreWhatsapp);
  if (updates.scoreSms !== undefined) setField('score_sms', updates.scoreSms);
  if (updates.scoreEmail !== undefined) setField('score_email', updates.scoreEmail);
  if (updates.scoreVisita !== undefined) setField('score_visita', updates.scoreVisita);
  if (updates.nivelRiesgo !== undefined) setField('nivel_riesgo', updates.nivelRiesgo);
  if (updates.permitirContacto !== undefined)
    setField('permitir_contacto', updates.permitirContacto);
  if (updates.bloquearCliente !== undefined) setField('bloquear_cliente', updates.bloquearCliente);
  if (updates.recomendarReintento !== undefined)
    setField('recomendar_reintento', updates.recomendarReintento);
  if (updates.activo !== undefined) setField('activo', updates.activo);

  if (fields.length === 0) {
    return null;
  }

  setField('updated_at', new Date());
  values.push(id);

  const result = await db.query(
    `UPDATE dictamenes
     SET ${fields.join(', ')}
     WHERE id = $${index}
     RETURNING ${selectFields}`,
    values
  );

  return result.rows[0] || null;
};

export const deleteDictamen = async (id, db = pool) => {
  const result = await db.query(
    `UPDATE dictamenes
     SET activo = FALSE,
         updated_at = NOW()
     WHERE id = $1
     RETURNING ${selectFields}`,
    [id]
  );

  return result.rows[0] || null;
};

export const listAffectedClientsByDictamenId = async (dictamenId, db = pool) => {
  const result = await db.query(
    `SELECT DISTINCT
        g.cliente_id,
        g.portafolio_id,
        cl.public_id AS cliente_public_id
     FROM gestiones g
     JOIN clients cl ON cl.id = g.cliente_id
     WHERE g.dictamen_id = $1`,
    [dictamenId]
  );

  return result.rows;
};
