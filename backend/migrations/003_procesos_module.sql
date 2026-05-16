-- ============================================================
-- Migración 003 — Módulo de Procesos AGRO
-- Sprint 4
-- 1) stock_actual en insumos (para descuento automático)
-- 2) procesos  — catálogo de procesos/actividades (Alimentación, Sanidad, etc.)
-- 3) proceso_insumos — insumos requeridos por proceso (relación N:M con cantidad proyectada)
-- 4) lote_procesos  — asignación de procesos a lotes (tabla intermedia M:M)
-- ============================================================

-- 1. Stock actual en inventario de insumos
ALTER TABLE insumos
  ADD COLUMN IF NOT EXISTS stock_actual DECIMAL(18,4) DEFAULT 0;

-- 2. Catálogo de procesos del negocio
CREATE TABLE IF NOT EXISTS procesos (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  negocio_id      UUID NOT NULL REFERENCES negocios(id) ON DELETE CASCADE,
  nombre          VARCHAR(255) NOT NULL,
  tipo            VARCHAR(50) NOT NULL CHECK (tipo IN ('Alimentacion', 'Sanidad', 'Crecimiento', 'Produccion', 'Otro')),
  descripcion     TEXT,
  -- Cambio de categoría del lote al finalizar (ej. 'Ternero' -> 'Novillo')
  categoria_origen  VARCHAR(100),
  categoria_destino VARCHAR(100),
  -- Parámetros para activación automática de cambio de categoría
  dias_duracion    INT,          -- duración estimada en días
  peso_umbral      DECIMAL(10,4), -- peso promedio que activa el cambio de categoría
  -- Soporte de recursividad: salida del proceso puede ser un insumo
  produce_insumo_id UUID REFERENCES insumos(id) ON DELETE SET NULL,
  produce_cantidad   DECIMAL(18,4),  -- cantidad producida por ejecución
  activo          BOOLEAN DEFAULT TRUE,
  created_at      TIMESTAMP DEFAULT NOW()
);

-- 3. Insumos requeridos por cada proceso (costo proyectado)
CREATE TABLE IF NOT EXISTS proceso_insumos (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  proceso_id      UUID NOT NULL REFERENCES procesos(id) ON DELETE CASCADE,
  insumo_id       UUID NOT NULL REFERENCES insumos(id) ON DELETE CASCADE,
  cantidad_por_cabeza DECIMAL(18,6) NOT NULL DEFAULT 0,  -- cantidad usada por cabeza activa
  unidad_id       UUID REFERENCES unidades_medida(id) ON DELETE SET NULL,
  created_at      TIMESTAMP DEFAULT NOW(),
  UNIQUE (proceso_id, insumo_id)
);

-- 4. Tabla intermedia: asignación de un proceso a un lote específico
CREATE TABLE IF NOT EXISTS lote_procesos (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lote_id         UUID NOT NULL REFERENCES lotes(id) ON DELETE CASCADE,
  proceso_id      UUID NOT NULL REFERENCES procesos(id) ON DELETE CASCADE,
  estado          VARCHAR(20) NOT NULL DEFAULT 'Pendiente'
                  CHECK (estado IN ('Pendiente', 'En curso', 'Finalizado', 'Cancelado')),
  fecha_inicio    DATE,
  fecha_fin       DATE,              -- fecha programada de fin
  fecha_finalizado DATE,             -- fecha real en que se marcó como Finalizado
  costo_proyectado DECIMAL(18,4),   -- calculado al asignar (precio_unit * cantidad_por_cabeza * cabezas)
  costo_ejecutado  DECIMAL(18,4),   -- suma real registrada en bitácora
  notas           TEXT,
  created_at      TIMESTAMP DEFAULT NOW()
);

-- Índices para búsquedas frecuentes
CREATE INDEX IF NOT EXISTS idx_lote_procesos_lote    ON lote_procesos(lote_id);
CREATE INDEX IF NOT EXISTS idx_lote_procesos_estado  ON lote_procesos(estado);
CREATE INDEX IF NOT EXISTS idx_lote_procesos_fecha   ON lote_procesos(fecha_fin);
CREATE INDEX IF NOT EXISTS idx_procesos_negocio      ON procesos(negocio_id);
