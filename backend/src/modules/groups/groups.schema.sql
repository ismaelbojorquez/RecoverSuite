-- Estructura de grupos y membresías (user_groups = tabla de grupos).

-- Tabla de grupos
CREATE TABLE IF NOT EXISTS user_groups (
  id BIGSERIAL PRIMARY KEY,
  name VARCHAR(255) NOT NULL UNIQUE,
  description TEXT,
  is_admin_group BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Ajustes idempotentes por si la tabla proviene de versiones anteriores
ALTER TABLE user_groups ADD COLUMN IF NOT EXISTS is_admin_group BOOLEAN NOT NULL DEFAULT FALSE;
ALTER TABLE user_groups ALTER COLUMN name SET NOT NULL;
ALTER TABLE user_groups ALTER COLUMN name TYPE VARCHAR(255);

-- Tabla de permisos por grupo
CREATE TABLE IF NOT EXISTS group_permissions (
  group_id BIGINT NOT NULL REFERENCES user_groups(id) ON DELETE CASCADE,
  permission_id BIGINT NOT NULL REFERENCES permissions(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (group_id, permission_id)
);

-- Tabla de membresías de usuario ↔ grupo
CREATE TABLE IF NOT EXISTS user_group_members (
  user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  group_id BIGINT NOT NULL REFERENCES user_groups(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (user_id, group_id)
);

-- Índices
CREATE INDEX IF NOT EXISTS idx_user_group_members_user_id ON user_group_members (user_id);
CREATE INDEX IF NOT EXISTS idx_user_group_members_group_id ON user_group_members (group_id);
CREATE INDEX IF NOT EXISTS idx_group_permissions_group_id ON group_permissions (group_id);
CREATE INDEX IF NOT EXISTS idx_group_permissions_permission_id ON group_permissions (permission_id);
