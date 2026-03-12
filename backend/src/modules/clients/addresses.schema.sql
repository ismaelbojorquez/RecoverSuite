-- Client addresses. Each address belongs to a client.
CREATE TABLE IF NOT EXISTS client_addresses (
  id BIGSERIAL PRIMARY KEY,
  client_id BIGINT NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  linea1 TEXT NOT NULL,
  linea2 TEXT NOT NULL DEFAULT '',
  ciudad TEXT NOT NULL,
  estado TEXT NOT NULL,
  codigo_postal TEXT NOT NULL,
  pais TEXT NOT NULL DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (client_id, linea1, linea2, ciudad, estado, codigo_postal, pais)
);

CREATE INDEX IF NOT EXISTS idx_client_addresses_client_id ON client_addresses (client_id);
