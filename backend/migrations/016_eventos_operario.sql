-- Migración 016 — Eventos reportados por operarios desde el móvil
CREATE TABLE IF NOT EXISTS eventos_operario (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  negocio_id        UUID NOT NULL REFERENCES negocios(id) ON DELETE CASCADE,
  lote_id           UUID NOT NULL REFERENCES lotes(id) ON DELETE CASCADE,
  operario_user_id  UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  tipo              VARCHAR(20) NOT NULL CHECK (tipo IN ('baja','pesaje','incidente','stock_bajo')),
  payload           JSONB NOT NULL DEFAULT '{}'::jsonb,
  fotos             JSONB NOT NULL DEFAULT '[]'::jsonb,
  estado            VARCHAR(20) NOT NULL DEFAULT 'aplicado'
                    CHECK (estado IN ('pendiente','aprobado','rechazado','aplicado','archivado')),
  notas_admin       TEXT,
  revisado_por      UUID REFERENCES users(id),
  revisado_en       TIMESTAMP,
  created_at        TIMESTAMP DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_eventos_negocio ON eventos_operario(negocio_id, estado, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_eventos_lote    ON eventos_operario(lote_id, tipo);
