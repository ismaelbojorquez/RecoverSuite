-- Promesas de pago asociadas a gestiones.
CREATE TABLE IF NOT EXISTS promesas_pago (
  id BIGSERIAL PRIMARY KEY,
  gestion_id BIGINT NOT NULL REFERENCES gestiones(id),
  credito_id BIGINT REFERENCES credits(id),
  monto NUMERIC(18,2) NOT NULL CHECK (monto > 0),
  fecha_promesa TIMESTAMPTZ NOT NULL,
  estado TEXT NOT NULL CHECK (estado IN ('pendiente', 'cumplida', 'incumplida')) DEFAULT 'pendiente',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (gestion_id)
);

CREATE INDEX IF NOT EXISTS idx_promesas_estado ON promesas_pago (estado);
CREATE INDEX IF NOT EXISTS idx_promesas_fecha_promesa ON promesas_pago (fecha_promesa);
