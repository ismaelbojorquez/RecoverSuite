import pool from '../../config/db.js';

const selectFields = `
  id,
  username,
  email,
  nombre AS name,
  estado,
  (estado = 'activo') AS is_active,
  requiere_cambio_password,
  group_id,
  created_at,
  updated_at
`;

export const listUsers = async ({ limit, offset }, db = pool) => {
  const result = await db.query(
    `SELECT ${selectFields}
     FROM users
     ORDER BY id
     LIMIT $1 OFFSET $2`,
    [limit, offset]
  );

  return result.rows;
};

export const getUserById = async (id, db = pool) => {
  const result = await db.query(
    `SELECT ${selectFields}
     FROM users
     WHERE id = $1`,
    [id]
  );

  return result.rows[0] || null;
};

export const createUser = async ({
  username,
  email,
  nombre,
  passwordHash,
  isActive,
  requiereCambioPassword = false,
  groupId
}, db = pool) => {
  const result = await db.query(
    `INSERT INTO users (username, email, nombre, password_hash, estado, requiere_cambio_password, group_id)
     VALUES ($1, $2, $3, $4, $5, $6, $7)
     RETURNING ${selectFields}`,
    [
      username,
      email,
      nombre,
      passwordHash,
      isActive ? 'activo' : 'inactivo',
      requiereCambioPassword,
      groupId
    ]
  );

  return result.rows[0];
};

export const updateUser = async (id, updates, db = pool) => {
  const fields = [];
  const values = [];
  let index = 1;

  const setField = (column, value) => {
    fields.push(`${column} = $${index}`);
    values.push(value);
    index += 1;
  };

  if (updates.username !== undefined) setField('username', updates.username);
  if (updates.email !== undefined) setField('email', updates.email);
  if (updates.nombre !== undefined) setField('nombre', updates.nombre);
  if (updates.passwordHash !== undefined) setField('password_hash', updates.passwordHash);
  if (updates.estado !== undefined) setField('estado', updates.estado);
  if (updates.requiereCambioPassword !== undefined)
    setField('requiere_cambio_password', updates.requiereCambioPassword);
  if (updates.groupId !== undefined) setField('group_id', updates.groupId);

  if (fields.length === 0) {
    return null;
  }

  setField('updated_at', new Date());

  values.push(id);

  const result = await db.query(
    `UPDATE users
     SET ${fields.join(', ')}
     WHERE id = $${index}
     RETURNING ${selectFields}`,
    values
  );

  return result.rows[0] || null;
};

export const deleteUser = async (id, db = pool) => {
  const result = await db.query('DELETE FROM users WHERE id = $1', [id]);
  return result.rowCount > 0;
};

export const countActiveAdmins = async (db = pool) => {
  const result = await db.query(
    `SELECT COUNT(DISTINCT id) AS count FROM (
        SELECT u.id
        FROM users u
        JOIN user_groups ug ON ug.user_id = u.id
        JOIN group_permissions gp ON gp.group_id = ug.group_id
        JOIN permissions p ON p.id = gp.permission_id
        WHERE u.estado = 'activo'
          AND p.key LIKE 'admin%'
      UNION
        SELECT u.id
        FROM users u
        JOIN group_permissions gp ON gp.group_id = u.group_id
        JOIN permissions p ON p.id = gp.permission_id
        WHERE u.estado = 'activo'
          AND p.key LIKE 'admin%'
    ) AS admins`
  );
  return Number(result.rows[0]?.count || 0);
};

export const isUserAdmin = async (userId, db = pool) => {
  const result = await db.query(
    `SELECT EXISTS (
        SELECT 1 FROM (
          SELECT 1
          FROM user_groups ug
          JOIN group_permissions gp ON gp.group_id = ug.group_id
          JOIN permissions p ON p.id = gp.permission_id
          WHERE ug.user_id = $1
            AND p.key LIKE 'admin%'
          LIMIT 1
        UNION
          SELECT 1
          FROM users u
          JOIN group_permissions gp ON gp.group_id = u.group_id
          JOIN permissions p ON p.id = gp.permission_id
          WHERE u.id = $1
            AND p.key LIKE 'admin%'
          LIMIT 1
        ) AS admin_check
      ) AS is_admin`,
    [userId, userId]
  );
  return Boolean(result.rows[0]?.is_admin);
};

export const getUserWithPassword = async (id, db = pool) => {
  const result = await db.query(
    `SELECT id, username, email, password_hash, estado, requiere_cambio_password
     FROM users
     WHERE id = $1`,
    [id]
  );
  return result.rows[0] || null;
};
