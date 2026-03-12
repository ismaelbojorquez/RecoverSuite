-- Users table con estado, username/email únicos y control de cambio de password.
CREATE TABLE IF NOT EXISTS users (
  id BIGSERIAL PRIMARY KEY,
  username TEXT NOT NULL UNIQUE,
  email TEXT NOT NULL UNIQUE,
  nombre TEXT,
  password_hash TEXT NOT NULL,
  estado TEXT NOT NULL CHECK (estado IN ('activo', 'inactivo')) DEFAULT 'activo',
  requiere_cambio_password BOOLEAN NOT NULL DEFAULT FALSE,
  group_id BIGINT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Asegurar columnas si la tabla existe de versiones anteriores
ALTER TABLE users ADD COLUMN IF NOT EXISTS estado TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS requiere_cambio_password BOOLEAN;
ALTER TABLE users ADD COLUMN IF NOT EXISTS group_id BIGINT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ;
ALTER TABLE users ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ;

-- Defaults y restricciones básicas (idempotentes)
ALTER TABLE users ALTER COLUMN estado SET DEFAULT 'activo';
UPDATE users SET estado = 'activo' WHERE estado IS NULL;
ALTER TABLE users ALTER COLUMN estado SET NOT NULL;
ALTER TABLE users ALTER COLUMN requiere_cambio_password SET DEFAULT FALSE;
UPDATE users SET requiere_cambio_password = FALSE WHERE requiere_cambio_password IS NULL;
ALTER TABLE users ALTER COLUMN requiere_cambio_password SET NOT NULL;
ALTER TABLE users ALTER COLUMN created_at SET DEFAULT NOW();
ALTER TABLE users ALTER COLUMN updated_at SET DEFAULT NOW();
ALTER TABLE users DROP CONSTRAINT IF EXISTS chk_users_estado;
ALTER TABLE users ADD CONSTRAINT chk_users_estado CHECK (estado IN ('activo', 'inactivo'));

-- Índices
CREATE INDEX IF NOT EXISTS idx_users_estado ON users (estado);
CREATE INDEX IF NOT EXISTS idx_users_group_id ON users (group_id);
