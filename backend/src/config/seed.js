import pool from './db.js';

const basePermissions = [
  { key: 'admin.full_access', label: 'Administrador - Acceso total' },
  { key: 'admin_full_access', label: 'Administrador - Acceso total (legacy)' },
  { key: 'admin_full_acess', label: 'Administrador - Acceso total (compatibilidad)' },

  { key: 'users.read', label: 'Usuarios - Ver' },
  { key: 'users.write', label: 'Usuarios - Gestionar' },
  { key: 'users.create', label: 'Usuarios - Crear' },
  { key: 'users.update', label: 'Usuarios - Editar' },
  { key: 'users.delete', label: 'Usuarios - Eliminar' },
  { key: 'users.deactivate', label: 'Usuarios - Desactivar' },
  { key: 'users.activate', label: 'Usuarios - Activar' },
  { key: 'users.reset_password', label: 'Usuarios - Reset password' },

  { key: 'groups.read', label: 'Grupos - Ver' },
  { key: 'groups.create', label: 'Grupos - Crear' },
  { key: 'groups.update', label: 'Grupos - Editar' },
  { key: 'groups.delete', label: 'Grupos - Eliminar' },

  { key: 'permissions.read', label: 'Permisos - Ver' },
  { key: 'permissions.write', label: 'Permisos - Gestionar' },
  { key: 'permissions.assign', label: 'Permisos - Asignar' },

  { key: 'portfolios.read', label: 'Portafolios - Ver' },
  { key: 'portfolios.write', label: 'Portafolios - Gestionar' },

  { key: 'clients.read', label: 'Clientes - Ver' },
  { key: 'clients.write', label: 'Clientes - Gestionar' },
  { key: 'clients.contacts.read', label: 'Clientes contactos - Ver' },
  { key: 'clients.contacts.write', label: 'Clientes contactos - Gestionar' },

  { key: 'credits.read', label: 'Creditos - Ver' },
  { key: 'credits.write', label: 'Creditos - Gestionar' },

  { key: 'search.read', label: 'Busqueda global - Ver' },

  { key: 'imports.read', label: 'Importaciones - Ver' },
  { key: 'imports.write', label: 'Importaciones - Gestionar' },
  { key: 'BULK_IMPORT_CREATE', label: 'Importaciones masivas - Crear' },
  { key: 'BULK_IMPORT_VIEW', label: 'Importaciones masivas - Ver' },
  { key: 'BULK_IMPORT_RUN', label: 'Importaciones masivas - Ejecutar' },

  { key: 'gestiones.read', label: 'Gestiones resultados - Ver' },
  { key: 'gestiones.write', label: 'Gestiones resultados - Gestionar' },
  { key: 'gestiones.create', label: 'Gestiones - Registrar' },
  { key: 'gestiones.view_all', label: 'Gestiones - Ver todo' },
  { key: 'gestiones.view_portfolio', label: 'Gestiones - Ver por portafolio' },
  { key: 'gestiones.view_own', label: 'Gestiones - Ver propias' },
  { key: 'dictamenes.read', label: 'Dictamenes - Ver catalogo' },
  { key: 'dictamenes.write', label: 'Dictamenes - Gestionar catalogo' },

  { key: 'promesas.read', label: 'Promesas - Ver' },
  { key: 'promesas.write', label: 'Promesas - Gestionar' },

  { key: 'negotiations.read', label: 'Negociaciones - Ver' },
  { key: 'negotiations.write', label: 'Negociaciones - Gestionar' },
  { key: 'negotiations.config.read', label: 'Negociaciones - Configuracion ver' },
  { key: 'negotiations.config.write', label: 'Negociaciones - Configuracion gestionar' },

  { key: 'balance_fields.read', label: 'Campos de saldo - Ver' },
  { key: 'balance_fields.write', label: 'Campos de saldo - Gestionar' },
  { key: 'balance_values.read', label: 'Valores de saldo - Ver' },
  { key: 'balance_values.write', label: 'Valores de saldo - Gestionar' }
];

export const runBaseSeeds = async () => {
  // 1) Permisos base del sistema
  for (const perm of basePermissions) {
    await pool.query(
      `INSERT INTO permissions (key, label, description)
       VALUES ($1, $2, $3)
       ON CONFLICT (key)
       DO UPDATE SET label = EXCLUDED.label,
                     description = COALESCE(EXCLUDED.description, permissions.description),
                     updated_at = NOW()
       RETURNING id`,
      [perm.key, perm.label, perm.description || null]
    );
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

  // 3) Asociar TODOS los permisos existentes al grupo admin
  await pool.query(
    `INSERT INTO group_permissions (group_id, permission_id)
     SELECT $1, p.id
     FROM permissions p
     ON CONFLICT DO NOTHING`,
    [adminGroupId]
  );

  // 4) Asignar un usuario existente (opcional, sin fallar si no hay)
  const userResult = await pool.query(`SELECT id FROM users ORDER BY id ASC LIMIT 1`);
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
