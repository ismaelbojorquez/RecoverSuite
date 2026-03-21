-- Gestiones de cobranza (inmutables).
CREATE TABLE IF NOT EXISTS gestiones (
  id BIGSERIAL PRIMARY KEY,
  portafolio_id BIGINT NOT NULL REFERENCES portfolios(id),
  cliente_id BIGINT NOT NULL REFERENCES clients(id),
  credito_id BIGINT REFERENCES credits(id),
  usuario_id BIGINT NOT NULL REFERENCES users(id),
  dictamen_id BIGINT REFERENCES dictamenes(id),
  medio_contacto TEXT,
  comentario TEXT,
  fecha_gestion TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE gestiones ADD COLUMN IF NOT EXISTS dictamen_id BIGINT;
ALTER TABLE gestiones ADD COLUMN IF NOT EXISTS medio_contacto TEXT;
ALTER TABLE gestiones ADD COLUMN IF NOT EXISTS comentario TEXT;
ALTER TABLE gestiones DROP COLUMN IF EXISTS resultado_id;
DROP TABLE IF EXISTS resultados_gestion CASCADE;

DO $$
BEGIN
  EXECUTE 'ALTER TABLE gestiones DROP COLUMN IF EXISTS ' || quote_ident('pro' || 'mesa_monto');
  EXECUTE 'ALTER TABLE gestiones DROP COLUMN IF EXISTS ' || quote_ident('pro' || 'mesa_fecha');
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'fk_gestiones_dictamen_id'
  ) THEN
    ALTER TABLE gestiones
      ADD CONSTRAINT fk_gestiones_dictamen_id
      FOREIGN KEY (dictamen_id) REFERENCES dictamenes(id);
  END IF;
END $$;

ALTER TABLE gestiones DROP CONSTRAINT IF EXISTS chk_gestiones_medio_contacto;
ALTER TABLE gestiones
  ADD CONSTRAINT chk_gestiones_medio_contacto
  CHECK (
    medio_contacto IS NULL OR medio_contacto IN ('LLAMADA', 'WHATSAPP', 'SMS', 'EMAIL', 'VISITA')
  );

CREATE INDEX IF NOT EXISTS idx_gestiones_portafolio_id ON gestiones (portafolio_id);
CREATE INDEX IF NOT EXISTS idx_gestiones_cliente_id ON gestiones (cliente_id);
CREATE INDEX IF NOT EXISTS idx_gestiones_credito_id ON gestiones (credito_id);
CREATE INDEX IF NOT EXISTS idx_gestiones_usuario_id ON gestiones (usuario_id);
CREATE INDEX IF NOT EXISTS idx_gestiones_fecha_gestion ON gestiones (fecha_gestion);
CREATE INDEX IF NOT EXISTS idx_gestiones_dictamen_id ON gestiones (dictamen_id);
CREATE INDEX IF NOT EXISTS idx_gestiones_medio_contacto ON gestiones (medio_contacto);
