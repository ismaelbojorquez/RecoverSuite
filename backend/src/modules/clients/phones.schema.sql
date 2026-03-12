-- Client phones. Each phone belongs to a client.
CREATE TABLE IF NOT EXISTS client_phones (
  id BIGSERIAL PRIMARY KEY,
  client_id BIGINT NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  telefono TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (client_id, telefono)
);

CREATE INDEX IF NOT EXISTS idx_client_phones_client_id ON client_phones (client_id);
CREATE INDEX IF NOT EXISTS idx_client_phones_telefono
  ON client_phones (telefono text_pattern_ops);
