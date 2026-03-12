-- Catálogo de permisos para RBAC.
CREATE TABLE IF NOT EXISTS permissions (
  id BIGSERIAL PRIMARY KEY,
  key VARCHAR(255) NOT NULL UNIQUE,
  label VARCHAR(255) NOT NULL,
  description TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Ajustes idempotentes para versiones previas
ALTER TABLE permissions ADD COLUMN IF NOT EXISTS label VARCHAR(255);
UPDATE permissions SET label = COALESCE(label, key) WHERE label IS NULL;
ALTER TABLE permissions ALTER COLUMN label SET NOT NULL;
ALTER TABLE permissions ALTER COLUMN key TYPE VARCHAR(255);

-- Índices recomendados
CREATE INDEX IF NOT EXISTS idx_permissions_key ON permissions (key);
