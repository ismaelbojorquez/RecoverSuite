import pool from '../../config/db.js';

const selectFields = 'id, key, label, description, created_at, updated_at';

export const listPermissions = async ({ limit, offset, orderByKey = false }) => {
  const result = await pool.query(
    `SELECT ${selectFields}
     FROM permissions
     ORDER BY ${orderByKey ? 'key ASC' : 'id'}
     LIMIT $1 OFFSET $2`,
    [limit, offset]
  );

  return result.rows;
};

export const getPermissionById = async (id) => {
  const result = await pool.query(
    `SELECT ${selectFields}
     FROM permissions
     WHERE id = $1`,
    [id]
  );

  return result.rows[0] || null;
};

export const createPermission = async ({ key, label, description }) => {
  const result = await pool.query(
    `INSERT INTO permissions (key, label, description)
     VALUES ($1, $2, $3)
     RETURNING ${selectFields}`,
    [key, label, description]
  );

  return result.rows[0];
};

export const updatePermission = async (id, updates) => {
  const fields = [];
  const values = [];
  let index = 1;

  const setField = (column, value) => {
    fields.push(`${column} = $${index}`);
    values.push(value);
    index += 1;
  };

  if (updates.key !== undefined) {
    setField('key', updates.key);
  }

  if (updates.label !== undefined) {
    setField('label', updates.label);
  }

  if (updates.description !== undefined) {
    setField('description', updates.description);
  }

  if (fields.length === 0) {
    return null;
  }

  setField('updated_at', new Date());
  values.push(id);

  const result = await pool.query(
    `UPDATE permissions
     SET ${fields.join(', ')}
     WHERE id = $${index}
     RETURNING ${selectFields}`,
    values
  );

  return result.rows[0] || null;
};

export const deletePermission = async (id) => {
  const result = await pool.query('DELETE FROM permissions WHERE id = $1', [id]);
  return result.rowCount > 0;
};

// Permisos efectivos de un usuario (miembros + grupo directo).
export const getUserPermissions = async (userId) => {
  const result = await pool.query(
    `SELECT DISTINCT p.key
     FROM permissions p
     JOIN group_permissions gp ON gp.permission_id = p.id
     JOIN user_groups g ON g.id = gp.group_id
     LEFT JOIN user_group_members ugm ON ugm.group_id = g.id
     LEFT JOIN users u ON u.group_id = g.id
     WHERE (ugm.user_id = $1 OR u.id = $1)
       AND p.key IS NOT NULL`,
    [userId]
  );

  return result.rows.map((row) => row.key);
};

export const getUserGroups = async (userId) => {
  const result = await pool.query(
    `SELECT DISTINCT g.name
     FROM user_groups g
     LEFT JOIN user_group_members ugm ON ugm.group_id = g.id
     LEFT JOIN users u ON u.group_id = g.id
     WHERE ugm.user_id = $1
        OR u.id = $1`,
    [userId]
  );

  return result.rows.map((row) => row.name);
};
