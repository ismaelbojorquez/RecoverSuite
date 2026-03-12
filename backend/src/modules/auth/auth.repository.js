import bcrypt from 'bcryptjs';
import env from '../../config/env.js';
import pool from '../../config/db.js';
import { getUserPermissions } from '../permissions/permissions.repository.js';

const resolvedAdminPasswordHash =
  env.auth.adminPassword && env.security.passwordSaltRounds
    ? bcrypt.hashSync(env.auth.adminPassword, env.security.passwordSaltRounds)
    : '';

const adminUser = {
  id: env.auth.adminId,
  username: env.auth.adminEmail?.toLowerCase(),
  passwordHash: resolvedAdminPasswordHash,
  roles: ['admin']
};

const adminOverridePermissions = [
  'admin.full_access',
  'admin_full_access',
  'admin_full_acess'
];

const isAuthConfigured = () => Boolean(env.jwt.secret && env.jwt.refreshSecret);

export const ensureDefaultAdminUser = async () => {
  if (!env.auth.adminEmail || !env.auth.adminPassword) return;

  const normalized = env.auth.adminEmail.toLowerCase();
  // Asegurar permisos de override admin (incluye alias legacy)
  for (const permissionKey of adminOverridePermissions) {
    await pool.query(
      `INSERT INTO permissions (key, label, description)
       VALUES ($1, 'Administrador - Acceso total', 'Acceso completo de administrador')
       ON CONFLICT (key) DO UPDATE SET
         label = EXCLUDED.label,
         description = COALESCE(EXCLUDED.description, permissions.description),
         updated_at = NOW()`,
      [permissionKey]
    );
  }

  const groupResult = await pool.query(
    `INSERT INTO user_groups (name, description, is_admin_group)
     VALUES ('Administradores', 'Grupo administrador del sistema', TRUE)
     ON CONFLICT (name) DO UPDATE SET
       description = EXCLUDED.description,
       is_admin_group = TRUE,
       updated_at = NOW()
     RETURNING id`
  );
  const groupId = groupResult.rows[0].id;

  await pool.query(
    `INSERT INTO group_permissions (group_id, permission_id)
     SELECT $1, id
     FROM permissions
     WHERE key = ANY($2::text[])
     ON CONFLICT DO NOTHING`,
    [groupId, adminOverridePermissions]
  );

  const existing = await pool.query(
    `SELECT id FROM users WHERE lower(username) = lower($1) OR lower(email) = lower($1) LIMIT 1`,
    [normalized]
  );

  let userId = existing.rows[0]?.id;

  if (!userId) {
    const passwordHash = await bcrypt.hash(
      env.auth.adminPassword,
      env.security.passwordSaltRounds || 10
    );

    const inserted = await pool.query(
      `INSERT INTO users (username, email, nombre, password_hash, estado, requiere_cambio_password, group_id)
       VALUES ($1, $1, $2, $3, 'activo', FALSE, $4)
       RETURNING id`,
      [normalized, 'Administrador', passwordHash, groupId]
    );
    userId = inserted.rows[0]?.id;
  } else {
    await pool.query(`UPDATE users SET group_id = $2 WHERE id = $1`, [userId, groupId]);
  }

  if (userId) {
    await pool.query(
      `INSERT INTO user_group_members (user_id, group_id)
       VALUES ($1, $2)
       ON CONFLICT DO NOTHING`,
      [userId, groupId]
    );
  }
};

const mapDbUser = async (row) => {
  if (!row) return null;
  const permissions = await getUserPermissions(row.id);
  const isAdminUser = row.username?.toLowerCase() === adminUser.username;
  const roles =
    isAdminUser || permissions.some((p) => p.startsWith('admin')) ? ['admin'] : [];
  return {
    id: row.id,
    username: row.username || row.email,
    passwordHash: row.password_hash,
    roles
  };
};

export const authConfig = {
  isConfigured: isAuthConfigured
};

export async function findUserByUsername(username) {
  const normalized = username ? String(username).toLowerCase() : '';
  if (!normalized) return null;

  // Buscar primero en tabla users (esquema actual)
  const result = await pool.query(
    `SELECT id, username, email, password_hash, estado
     FROM users
     WHERE lower(username) = lower($1) OR lower(email) = lower($1)
     LIMIT 1`,
    [normalized]
  );
  const row = result.rows[0];
  if (row && row.estado === 'activo') {
    return await mapDbUser(row);
  }

  // Admin embebido por env (solo si no existe en BD)
  if (isAuthConfigured() && normalized === adminUser.username) {
    return adminUser;
  }

  return null;
}

export async function findUserById(id) {
  if (!id) return null;

  const result = await pool.query(
    `SELECT id, username, email, password_hash, estado
     FROM users
     WHERE id = $1
     LIMIT 1`,
    [id]
  );
  const row = result.rows[0];
  if (row && row.estado === 'activo') {
    return await mapDbUser(row);
  }

  if (isAuthConfigured() && String(id) === String(adminUser.id)) {
    return adminUser;
  }

  return null;
}
