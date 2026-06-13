-- Migración 017 — Tareas puntuales y rutinas recurrentes (checklists)

-- Tareas puntuales asignadas por el admin
CREATE TABLE IF NOT EXISTS tareas (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  negocio_id    UUID NOT NULL REFERENCES negocios(id) ON DELETE CASCADE,
  lote_id       UUID REFERENCES lotes(id) ON DELETE CASCADE,
  titulo        VARCHAR(255) NOT NULL,
  descripcion   TEXT,
  fecha_objetivo DATE,
  asignado_a    UUID REFERENCES users(id) ON DELETE SET NULL,
  estado        VARCHAR(20) NOT NULL DEFAULT 'pendiente'
                CHECK (estado IN ('pendiente','completada','cancelada')),
  completada_en TIMESTAMP,
  created_by    UUID REFERENCES users(id),
  created_at    TIMESTAMP DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_tareas_asignado ON tareas(asignado_a, estado);

-- Plantillas de rutina recurrente
CREATE TABLE IF NOT EXISTS tarea_plantilla (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  negocio_id  UUID NOT NULL REFERENCES negocios(id) ON DELETE CASCADE,
  nombre      VARCHAR(255) NOT NULL,
  activo      BOOLEAN NOT NULL DEFAULT TRUE,
  created_at  TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS tarea_plantilla_item (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  plantilla_id UUID NOT NULL REFERENCES tarea_plantilla(id) ON DELETE CASCADE,
  titulo       VARCHAR(255) NOT NULL,
  orden        INT NOT NULL DEFAULT 0
);

-- A qué lote/operario aplica una plantilla
CREATE TABLE IF NOT EXISTS tarea_plantilla_asignacion (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  plantilla_id     UUID NOT NULL REFERENCES tarea_plantilla(id) ON DELETE CASCADE,
  lote_id          UUID NOT NULL REFERENCES lotes(id) ON DELETE CASCADE,
  operario_user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  CONSTRAINT uq_plantilla_asig UNIQUE (plantilla_id, lote_id, operario_user_id)
);

-- Materialización del checklist por día (se crea on-demand al consultar el día)
CREATE TABLE IF NOT EXISTS checklist_dia (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  plantilla_item_id UUID NOT NULL REFERENCES tarea_plantilla_item(id) ON DELETE CASCADE,
  lote_id           UUID NOT NULL REFERENCES lotes(id) ON DELETE CASCADE,
  operario_user_id  UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  fecha             DATE NOT NULL,
  completado        BOOLEAN NOT NULL DEFAULT FALSE,
  completado_en     TIMESTAMP,
  CONSTRAINT uq_checklist_dia UNIQUE (plantilla_item_id, lote_id, fecha)
);
CREATE INDEX IF NOT EXISTS idx_checklist_dia ON checklist_dia(operario_user_id, fecha);
