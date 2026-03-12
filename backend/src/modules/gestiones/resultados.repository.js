import pool from '../../config/db.js';

const selectFields = `
  id, portafolio_id, nombre, tipo, requiere_promesa, activo, created_at, updated_at
`;

export const createResultado = async ({
  portafolioId,
  nombre,
  tipo,
  requierePromesa = false,
  activo = true
}) => {
  const result = await pool.query(
    `INSERT INTO resultados_gestion
      (portafolio_id, nombre, tipo, requiere_promesa, activo)
     VALUES ($1, $2, $3, $4, $5)
     RETURNING ${selectFields}`,
    [portafolioId, nombre, tipo, requierePromesa, activo]
  );

  return result.rows[0];
};

export const listResultados = async ({ portafolioId, activo, tipo }) => {
  const where = [];
  const values = [];

  const addFilter = (condition, value) => {
    if (value === undefined || value === null) return;
    values.push(value);
    where.push(condition.replace('$', `$${values.length}`));
  };

  addFilter('portafolio_id = $', portafolioId);
  addFilter('activo = $', activo);
  addFilter('tipo = $', tipo);

  const whereClause = where.length ? `WHERE ${where.join(' AND ')}` : '';

  const result = await pool.query(
    `SELECT ${selectFields}
     FROM resultados_gestion
     ${whereClause}
     ORDER BY nombre ASC`,
    values
  );

  return result.rows;
};

export const getResultadoById = async (id) => {
  const result = await pool.query(
    `SELECT ${selectFields}
     FROM resultados_gestion
     WHERE id = $1`,
    [id]
  );

  return result.rows[0] || null;
};

export const updateResultado = async (id, updates) => {
  const fields = [];
  const values = [];
  let index = 1;

  const setField = (column, value) => {
    fields.push(`${column} = $${index}`);
    values.push(value);
    index += 1;
  };

  if (updates.nombre !== undefined) setField('nombre', updates.nombre);
  if (updates.tipo !== undefined) setField('tipo', updates.tipo);
  if (updates.requierePromesa !== undefined)
    setField('requiere_promesa', updates.requierePromesa);
  if (updates.activo !== undefined) setField('activo', updates.activo);

  if (fields.length === 0) {
    return null;
  }

  setField('updated_at', new Date());
  values.push(id);

  const result = await pool.query(
    `UPDATE resultados_gestion
     SET ${fields.join(', ')}
     WHERE id = $${index}
     RETURNING ${selectFields}`,
    values
  );

  return result.rows[0] || null;
};
