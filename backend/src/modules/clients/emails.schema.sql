-- Client emails. Each email belongs to a client.
CREATE TABLE IF NOT EXISTS client_emails (
  id BIGSERIAL PRIMARY KEY,
  client_id BIGINT NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (client_id, email)
);

CREATE INDEX IF NOT EXISTS idx_client_emails_client_id ON client_emails (client_id);
CREATE INDEX IF NOT EXISTS idx_client_emails_email_search
  ON client_emails (lower(email) text_pattern_ops);
