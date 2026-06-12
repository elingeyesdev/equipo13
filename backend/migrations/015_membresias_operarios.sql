-- Migración 015 — Membresías, roles y cuentas de operario
-- Introduce RBAC multi-tenant sobre el modelo mono-usuario existente.
-- El dueño de cada negocio se convierte en miembro 'admin' (backfill).

-- 1. users: credenciales de operario (username + PIN) junto al email/password admin
ALTER TABLE users
  ADD COLUMN IF NOT EXISTS username              VARCHAR(60) UNIQUE,
  ADD COLUMN IF NOT EXISTS pin_hash              VARCHAR(255),
  ADD COLUMN IF NOT EXISTS tipo                  VARCHAR(10) NOT NULL DEFAULT 'email'
    CHECK (tipo IN ('email','pin')),
  ADD COLUMN IF NOT EXISTS pin_intentos_fallidos INT NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS bloqueado_hasta       TIMESTAMP;

-- email/password pasan a ser opcionales (los operarios no tienen email)
ALTER TABLE users ALTER COLUMN email DROP NOT NULL;
ALTER TABLE users ALTER COLUMN password_hash DROP NOT NULL;

-- 2. negocios: código corto único para el login del operario
ALTER TABLE negocios
  ADD COLUMN IF NOT EXISTS codigo VARCHAR(12) UNIQUE;

-- 3. membresias: relación user ↔ negocio con rol
CREATE TABLE IF NOT EXISTS membresias (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  negocio_id  UUID NOT NULL REFERENCES negocios(id) ON DELETE CASCADE,
  rol         VARCHAR(20) NOT NULL CHECK (rol IN ('admin','operario')),
  activo      BOOLEAN NOT NULL DEFAULT TRUE,
  created_at  TIMESTAMP DEFAULT NOW(),
  CONSTRAINT uq_membresia UNIQUE (user_id, negocio_id)
);
CREATE INDEX IF NOT EXISTS idx_membresias_negocio ON membresias(negocio_id, rol);
CREATE INDEX IF NOT EXISTS idx_membresias_user    ON membresias(user_id, activo);

-- 4. operario_lote: asignación N:N de lotes a operarios
CREATE TABLE IF NOT EXISTS operario_lote (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  operario_user_id  UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  lote_id           UUID NOT NULL REFERENCES lotes(id) ON DELETE CASCADE,
  negocio_id        UUID NOT NULL REFERENCES negocios(id) ON DELETE CASCADE,
  activo            BOOLEAN NOT NULL DEFAULT TRUE,
  created_at        TIMESTAMP DEFAULT NOW(),
  CONSTRAINT uq_operario_lote UNIQUE (operario_user_id, lote_id)
);
CREATE INDEX IF NOT EXISTS idx_operario_lote_op ON operario_lote(operario_user_id, activo);

-- 5. Backfill: cada dueño se vuelve miembro admin; cada negocio recibe código
INSERT INTO membresias (user_id, negocio_id, rol)
SELECT user_id, id, 'admin' FROM negocios
ON CONFLICT (user_id, negocio_id) DO NOTHING;

UPDATE negocios
SET codigo = UPPER(SUBSTRING(REPLACE(id::text, '-', '') FROM 1 FOR 6))
WHERE codigo IS NULL;
