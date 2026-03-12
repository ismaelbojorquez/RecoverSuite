-- Trazabilidad específica de acciones sobre usuarios.
CREATE TABLE IF NOT EXISTS user_audit_logs (
  id BIGSERIAL PRIMARY KEY,
  actor_user_id BIGINT REFERENCES users(id) ON DELETE SET NULL,
  target_user_id BIGINT REFERENCES users(id) ON DELETE SET NULL,
  action TEXT NOT NULL CHECK (action IN ('create','update','activate','deactivate','reset_password','delete')),
  ip TEXT,
  metadata JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_user_audit_logs_created_at ON user_audit_logs (created_at);
CREATE INDEX IF NOT EXISTS idx_user_audit_logs_actor ON user_audit_logs (actor_user_id);
CREATE INDEX IF NOT EXISTS idx_user_audit_logs_target ON user_audit_logs (target_user_id);
