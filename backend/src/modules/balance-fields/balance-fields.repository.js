import pool from '../../config/db.js';

const selectFields =
  'id, portafolio_id, nombre_campo, etiqueta_visual, tipo_dato, orden, es_principal, activo, created_at, updated_at';

export const listBalanceFieldsByPortfolio = async ({ portafolioId, limit, offset }) => {
  if (limit !== undefined) {
    const result = await pool.query(
      `SELECT ${selectFields}
       FROM campos_saldo
       WHERE portafolio_id = $1
       ORDER BY orden, id
       LIMIT $2 OFFSET $3`,
      [portafolioId, limit, offset]
    );

    return result.rows;
  }

  const result = await pool.query(
    `SELECT ${selectFields}
     FROM campos_saldo
     WHERE portafolio_id = $1
     ORDER BY orden, id`,
    [portafolioId]
  );

  return result.rows;
};

export const getBalanceFieldById = async ({ portafolioId, fieldId }) => {
  const result = await pool.query(
    `SELECT ${selectFields}
     FROM campos_saldo
     WHERE id = $1 AND portafolio_id = $2`,
    [fieldId, portafolioId]
  );

  return result.rows[0] || null;
};

export const createBalanceField = async ({
  portafolioId,
  nombreCampo,
  etiquetaVisual,
  tipoDato,
  orden,
  esPrincipal,
  activo
}) => {
  const result = await pool.query(
    `INSERT INTO campos_saldo
      (portafolio_id, nombre_campo, etiqueta_visual, tipo_dato, orden, es_principal, activo)
     VALUES ($1, $2, $3, $4, $5, $6, $7)
     RETURNING ${selectFields}`,
    [portafolioId, nombreCampo, etiquetaVisual, tipoDato, orden, esPrincipal, activo]
  );

  return result.rows[0];
};

export const updateBalanceField = async ({
  portafolioId,
  fieldId,
  nombreCampo,
  etiquetaVisual,
  tipoDato,
  orden,
  esPrincipal,
  activo
}) => {
  const fields = [];
  const values = [];
  let index = 1;

  const setField = (column, value) => {
    fields.push(`${column} = $${index}`);
    values.push(value);
    index += 1;
  };

  if (nombreCampo !== undefined) {
    setField('nombre_campo', nombreCampo);
  }

  if (etiquetaVisual !== undefined) {
    setField('etiqueta_visual', etiquetaVisual);
  }

  if (tipoDato !== undefined) {
    setField('tipo_dato', tipoDato);
  }

  if (orden !== undefined) {
    setField('orden', orden);
  }

  if (esPrincipal !== undefined) {
    setField('es_principal', esPrincipal);
  }

  if (activo !== undefined) {
    setField('activo', activo);
  }

  if (fields.length === 0) {
    return null;
  }

  setField('updated_at', new Date());
  values.push(fieldId, portafolioId);

  const result = await pool.query(
    `UPDATE campos_saldo
     SET ${fields.join(', ')}
     WHERE id = $${index} AND portafolio_id = $${index + 1}
     RETURNING ${selectFields}`,
    values
  );

  return result.rows[0] || null;
};

export const deleteBalanceField = async ({ portafolioId, fieldId }) => {
  const result = await pool.query(
    `DELETE FROM campos_saldo
     WHERE id = $1 AND portafolio_id = $2`,
    [fieldId, portafolioId]
  );

  return result.rowCount > 0;
};
