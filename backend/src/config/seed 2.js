import pool from './db.js';

const basePermissions = [
  { key: 'users.read', label: 'Usuarios - Ver' },
  { key: 'users.create', label: 'Usuarios - Crear' },
  { key: 'users.update', label: 'Usuarios - Editar' },
  { key: 'users.deactivate', label: 'Usuarios - Desactivar' },
  { key: 'users.activate', label: 'Usuarios - Activar' },
  { key: 'users.reset_password', label: 'Usuarios - Reset password' },
  { key: 'groups.read', label: 'Grupos - Ver' },
  { key: 'groups.create', label: 'Grupos - Crear' },
  { key: 'groups.update', label: 'Grupos - Editar' },
  { key: 'groups.delete', label: 'Grupos - Eliminar' },
  { key: 'permissions.read', label: 'Permisos - Ver' },
  { key: 'permissions.assign', label: 'Permisos - Asignar' }
];

export const runBaseSeeds = async () => {
  // 1) Permisos base
  const permissionIds = [];
  for (const perm of basePermissions) {
    const result = await pool.query(
      `INSERT INTO permissions (key, label, description)
       VALUES ($1, $2, $3)
       ON CONFLICT (key)
       DO UPDATE SET label = EXCLUDED.label,
                     description = COALESCE(EXCLUDED.description, permissions.description),
                     updated_at = NOW()
       RETURNING id`,
      [perm.key, perm.label, perm.description || null]
    );
    permissionIds.push(result.rows[0].id);
  }

  // 2) Grupo Administradores
  const adminGroupResult = await pool.query(
    `INSERT INTO user_groups (name, description, is_admin_group)
     VALUES ('Administradores', 'Grupo administrador del sistema', TRUE)
     ON CONFLICT (name)
     DO UPDATE SET is_admin_group = TRUE,
                   description = EXCLUDED.description,
                   updated_at = NOW()
     RETURNING id`,
    []
  );
  const adminGroupId = adminGroupResult.rows[0].id;

  // 3) Asociar todos los permisos al grupo admin
  for (const permId of permissionIds) {
    await pool.query(
      `INSERT INTO group_permissions (group_id, permission_id)
       VALUES ($1, $2)
       ON CONFLICT DO NOTHING`,
      [adminGroupId, permId]
    );
  }

  // 4) Asignar un usuario existente (opcional, sin fallar si no hay)
  const userResult = await pool.query(
    `SELECT id FROM users ORDER BY id ASC LIMIT 1`
  );
  const userId = userResult.rows[0]?.id;
  if (userId) {
    await pool.query(
      `INSERT INTO user_group_members (user_id, group_id)
       VALUES ($1, $2)
       ON CONFLICT DO NOTHING`,
      [userId, adminGroupId]
    );
  }
};
