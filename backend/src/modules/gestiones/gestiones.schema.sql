-- Gestiones de cobranza (inmutables).
CREATE TABLE IF NOT EXISTS gestiones (
  id BIGSERIAL PRIMARY KEY,
  portafolio_id BIGINT NOT NULL REFERENCES portfolios(id),
  cliente_id BIGINT NOT NULL REFERENCES clients(id),
  credito_id BIGINT REFERENCES credits(id),
  usuario_id BIGINT NOT NULL REFERENCES users(id),
  resultado_id BIGINT,
  comentario TEXT,
  promesa_monto NUMERIC(18,2),
  promesa_fecha TIMESTAMPTZ,
  fecha_gestion TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_gestiones_portafolio_id ON gestiones (portafolio_id);
CREATE INDEX IF NOT EXISTS idx_gestiones_cliente_id ON gestiones (cliente_id);
CREATE INDEX IF NOT EXISTS idx_gestiones_credito_id ON gestiones (credito_id);
CREATE INDEX IF NOT EXISTS idx_gestiones_usuario_id ON gestiones (usuario_id);
CREATE INDEX IF NOT EXISTS idx_gestiones_fecha_gestion ON gestiones (fecha_gestion);
