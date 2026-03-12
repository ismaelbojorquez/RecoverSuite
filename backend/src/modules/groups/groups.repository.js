import pool from '../../config/db.js';

const selectFields = 'id, name, description, is_admin_group, created_at, updated_at';

export const listGroups = async ({ limit, offset }) => {
  const result = await pool.query(
    `SELECT ${selectFields}
     FROM user_groups
     ORDER BY id
     LIMIT $1 OFFSET $2`,
    [limit, offset]
  );

  return result.rows;
};

export const getGroupById = async (id) => {
  const result = await pool.query(
    `SELECT ${selectFields}
     FROM user_groups
     WHERE id = $1`,
    [id]
  );

  return result.rows[0] || null;
};

export const createGroup = async ({ name, description, isAdminGroup }) => {
  const result = await pool.query(
    `INSERT INTO user_groups (name, description, is_admin_group)
     VALUES ($1, $2, $3)
     RETURNING ${selectFields}`,
    [name, description, isAdminGroup]
  );

  return result.rows[0];
};

export const updateGroup = async (id, updates) => {
  const fields = [];
  const values = [];
  let index = 1;

  const setField = (column, value) => {
    fields.push(`${column} = $${index}`);
    values.push(value);
    index += 1;
  };

  if (updates.name !== undefined) {
    setField('name', updates.name);
  }

  if (updates.description !== undefined) {
    setField('description', updates.description);
  }

  if (updates.isAdminGroup !== undefined) {
    setField('is_admin_group', updates.isAdminGroup);
  }

  if (fields.length === 0) {
    return null;
  }

  setField('updated_at', new Date());
  values.push(id);

  const result = await pool.query(
    `UPDATE user_groups
     SET ${fields.join(', ')}
     WHERE id = $${index}
     RETURNING ${selectFields}`,
    values
  );

  return result.rows[0] || null;
};

export const deleteGroup = async (id) => {
  const result = await pool.query('DELETE FROM user_groups WHERE id = $1', [id]);
  return result.rowCount > 0;
};

export const listGroupPermissions = async (groupId) => {
  const result = await pool.query(
    `SELECT p.id, p.key, p.label, p.description
     FROM permissions p
     JOIN group_permissions gp ON gp.permission_id = p.id
     WHERE gp.group_id = $1
     ORDER BY p.id`,
    [groupId]
  );

  return result.rows;
};

export const addPermissionToGroup = async (groupId, permissionId) => {
  const result = await pool.query(
    `INSERT INTO group_permissions (group_id, permission_id)
     VALUES ($1, $2)
     ON CONFLICT DO NOTHING`,
    [groupId, permissionId]
  );

  return result.rowCount > 0;
};

export const removePermissionFromGroup = async (groupId, permissionId) => {
  const result = await pool.query(
    `DELETE FROM group_permissions
     WHERE group_id = $1 AND permission_id = $2`,
    [groupId, permissionId]
  );

  return result.rowCount > 0;
};

export const replaceGroupPermissions = async ({ groupId, permissionIds }, db = pool) => {
  await db.query('BEGIN');
  try {
    await db.query('DELETE FROM group_permissions WHERE group_id = $1', [groupId]);
    if (permissionIds.length > 0) {
      const values = [];
      const placeholders = [];
      let idx = 1;
      for (const permId of permissionIds) {
        values.push(groupId, permId);
        placeholders.push(`($${idx}, $${idx + 1})`);
        idx += 2;
      }
      await db.query(
        `INSERT INTO group_permissions (group_id, permission_id)
         VALUES ${placeholders.join(', ')}
         ON CONFLICT DO NOTHING`,
        values
      );
    }
    await db.query('COMMIT');
    return true;
  } catch (err) {
    await db.query('ROLLBACK');
    throw err;
  }
};

export const permissionsExist = async (ids, db = pool) => {
  if (!ids?.length) return true;
  const result = await db.query(
    `SELECT COUNT(*) AS count FROM permissions WHERE id = ANY($1::BIGINT[])`,
    [ids]
  );
  return Number(result.rows[0]?.count || 0) === ids.length;
};

export const listGroupUsers = async (groupId) => {
  const result = await pool.query(
    `SELECT u.id,
            u.email,
            u.nombre AS name,
            (u.estado = 'activo') AS is_active,
            u.group_id,
            u.created_at,
            u.updated_at
     FROM users u
     JOIN user_group_members ugm ON ugm.user_id = u.id
     WHERE ugm.group_id = $1
     ORDER BY u.id`,
    [groupId]
  );

  return result.rows;
};

export const addUserToGroup = async (groupId, userId) => {
  const result = await pool.query(
    `INSERT INTO user_group_members (user_id, group_id)
     VALUES ($1, $2)
     ON CONFLICT DO NOTHING`,
    [userId, groupId]
  );

  return result.rowCount > 0;
};

export const removeUserFromGroup = async (groupId, userId) => {
  const result = await pool.query(
    `DELETE FROM user_group_members
     WHERE group_id = $1 AND user_id = $2`,
    [groupId, userId]
  );

  return result.rowCount > 0;
};

export const countAdminGroups = async (db = pool) => {
  const result = await db.query(
    `SELECT COUNT(*) AS count FROM user_groups WHERE is_admin_group = TRUE`
  );
  return Number(result.rows[0]?.count || 0);
};

export const userHasAdminGroup = async (userId, db = pool, { excludeGroupId } = {}) => {
  const result = await db.query(
    `SELECT EXISTS (
        SELECT 1
        FROM user_group_members ugm
        JOIN user_groups g ON g.id = ugm.group_id
        WHERE ugm.user_id = $1
          AND g.is_admin_group = TRUE
          AND ($2 IS NULL OR g.id <> $2)
        UNION
        SELECT 1
        FROM users u
        JOIN user_groups g ON g.id = u.group_id
        WHERE u.id = $1
          AND g.is_admin_group = TRUE
          AND ($2 IS NULL OR g.id <> $2)
      ) AS has_admin`,
    [userId, excludeGroupId ?? null]
  );
  return Boolean(result.rows[0]?.has_admin);
};

export const isAdminGroup = async (groupId, db = pool) => {
  const result = await db.query(
    `SELECT is_admin_group FROM user_groups WHERE id = $1`,
    [groupId]
  );
  return Boolean(result.rows[0]?.is_admin_group);
};

export const countActiveAdminUsers = async (db = pool, { excludeGroupId } = {}) => {
  const result = await db.query(
    `SELECT COUNT(DISTINCT u.id) AS count
     FROM users u
     LEFT JOIN user_group_members ugm ON ugm.user_id = u.id
     LEFT JOIN user_groups g1 ON g1.id = ugm.group_id
     LEFT JOIN user_groups g2 ON g2.id = u.group_id
     WHERE u.estado = 'activo'
       AND (
         (g1.is_admin_group = TRUE AND ($1 IS NULL OR g1.id <> $1)) OR
         (g2.is_admin_group = TRUE AND ($1 IS NULL OR g2.id <> $1))
       )`,
    [excludeGroupId ?? null]
  );
  return Number(result.rows[0]?.count || 0);
};

export const getUserGroupsMeta = async (userId, db = pool) => {
  const result = await db.query(
    `SELECT DISTINCT g.id, g.name, g.is_admin_group
     FROM user_groups g
     LEFT JOIN user_group_members ugm ON ugm.group_id = g.id
     LEFT JOIN users u ON u.group_id = g.id
     WHERE ugm.user_id = $1
        OR u.id = $1
     ORDER BY g.name`,
    [userId]
  );

  return result.rows;
};
