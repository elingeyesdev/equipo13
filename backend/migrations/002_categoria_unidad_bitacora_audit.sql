-- ============================================================
-- Migración 002 — Sprint 3 / Tarea Agro
-- 1) Añadir unidad_medida_id a categorias_insumos
--    → así cada categoría lleva su unidad de medida por defecto
-- 2) Crear tabla bitacora_lote_historial
--    → guarda copia de cada registro editado o eliminado
-- Ejecutar con: npm run db:migrate  (o psql manualmente)
-- ============================================================

-- 1. Campo unidad_medida_id en categorias_insumos
ALTER TABLE categorias_insumos
  ADD COLUMN IF NOT EXISTS unidad_medida_id UUID
    REFERENCES unidades_medida(id) ON DELETE SET NULL;

-- 2. Tabla de auditoría de bitácora
CREATE TABLE IF NOT EXISTS bitacora_lote_historial (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  bitacora_id       UUID NOT NULL,          -- ID original del registro (puede ya no existir)
  lote_id           UUID REFERENCES lotes(id) ON DELETE SET NULL,
  accion            VARCHAR(20) NOT NULL CHECK (accion IN ('EDICION', 'ELIMINACION')),
  datos_anteriores  JSONB NOT NULL,          -- snapshot completo antes del cambio
  datos_nuevos      JSONB,                   -- solo en EDICION, estado posterior
  usuario_id        UUID REFERENCES users(id) ON DELETE SET NULL,
  created_at        TIMESTAMP DEFAULT NOW()
);
