-- Schema CosteoUniversal — Sprint 2
-- Ejecutar con: npm run db:migrate
-- Todas las PKs son UUID con DEFAULT gen_random_uuid()
-- Todas las tablas tienen created_at TIMESTAMP DEFAULT NOW()

-- Habilitar extensión para UUID
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- 1. users
CREATE TABLE IF NOT EXISTS users (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email           VARCHAR(255) UNIQUE NOT NULL,
  password_hash   VARCHAR(255) NOT NULL,
  nombre          VARCHAR(255),
  onboarding_completado BOOLEAN DEFAULT FALSE,
  created_at      TIMESTAMP DEFAULT NOW()
);

-- 2. negocios
CREATE TABLE IF NOT EXISTS negocios (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  nombre      VARCHAR(255) NOT NULL,
  rubro       VARCHAR(50) CHECK (rubro IN ('industrial', 'agro_ganadero')),
  sub_rubro   VARCHAR(255),
  plantilla   VARCHAR(255),
  moneda      VARCHAR(10) DEFAULT 'BOB',
  activo      BOOLEAN DEFAULT TRUE,
  created_at  TIMESTAMP DEFAULT NOW()
);

-- 3. unidades_medida
CREATE TABLE IF NOT EXISTS unidades_medida (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  negocio_id  UUID NOT NULL REFERENCES negocios(id) ON DELETE CASCADE,
  nombre      VARCHAR(255) NOT NULL,
  simbolo     VARCHAR(50) NOT NULL,
  tipo        VARCHAR(50),  -- peso/volumen/cantidad/longitud/tiempo
  created_at  TIMESTAMP DEFAULT NOW()
);

-- 4. equivalencias_unidades
CREATE TABLE IF NOT EXISTS equivalencias_unidades (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  negocio_id        UUID NOT NULL REFERENCES negocios(id) ON DELETE CASCADE,
  unidad_origen_id  UUID REFERENCES unidades_medida(id) ON DELETE CASCADE,
  unidad_destino_id UUID REFERENCES unidades_medida(id) ON DELETE CASCADE,
  factor            DECIMAL(18,8) NOT NULL,
  created_at        TIMESTAMP DEFAULT NOW()
);

-- 5. categorias_insumos
CREATE TABLE IF NOT EXISTS categorias_insumos (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  negocio_id  UUID NOT NULL REFERENCES negocios(id) ON DELETE CASCADE,
  nombre      VARCHAR(255) NOT NULL,
  color       VARCHAR(20),
  descripcion TEXT,
  created_at  TIMESTAMP DEFAULT NOW()
);

-- 6. proveedores
CREATE TABLE IF NOT EXISTS proveedores (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  negocio_id  UUID NOT NULL REFERENCES negocios(id) ON DELETE CASCADE,
  nombre      VARCHAR(255) NOT NULL,
  contacto    VARCHAR(255),
  telefono    VARCHAR(50),
  email       VARCHAR(255),
  notas       TEXT,
  activo      BOOLEAN DEFAULT TRUE,
  created_at  TIMESTAMP DEFAULT NOW()
);

-- 7. insumos
CREATE TABLE IF NOT EXISTS insumos (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  negocio_id       UUID NOT NULL REFERENCES negocios(id) ON DELETE CASCADE,
  nombre           VARCHAR(255) NOT NULL,
  codigo_sku       VARCHAR(100),
  categoria_id     UUID REFERENCES categorias_insumos(id) ON DELETE SET NULL,
  unidad_id        UUID REFERENCES unidades_medida(id) ON DELETE SET NULL,
  precio_unitario  DECIMAL(18,4) DEFAULT 0,
  proveedor_id     UUID REFERENCES proveedores(id) ON DELETE SET NULL,
  es_variable      BOOLEAN DEFAULT TRUE,
  activo           BOOLEAN DEFAULT TRUE,
  notas            TEXT,
  created_at       TIMESTAMP DEFAULT NOW()
);

-- 8. productos
CREATE TABLE IF NOT EXISTS productos (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  negocio_id  UUID NOT NULL REFERENCES negocios(id) ON DELETE CASCADE,
  nombre      VARCHAR(255) NOT NULL,
  codigo_sku  VARCHAR(100),
  descripcion TEXT,
  unidad_id   UUID REFERENCES unidades_medida(id) ON DELETE SET NULL,
  activo      BOOLEAN DEFAULT TRUE,
  created_at  TIMESTAMP DEFAULT NOW()
);

-- 9. bom_items
CREATE TABLE IF NOT EXISTS bom_items (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  producto_id UUID NOT NULL REFERENCES productos(id) ON DELETE CASCADE,
  insumo_id   UUID NOT NULL REFERENCES insumos(id) ON DELETE CASCADE,
  cantidad    DECIMAL(18,6) NOT NULL,
  unidad_id   UUID REFERENCES unidades_medida(id) ON DELETE SET NULL,
  orden       INT DEFAULT 0,
  created_at  TIMESTAMP DEFAULT NOW()
);

-- 10. etapas_produccion
CREATE TABLE IF NOT EXISTS etapas_produccion (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  producto_id     UUID NOT NULL REFERENCES productos(id) ON DELETE CASCADE,
  nombre          VARCHAR(255) NOT NULL,
  descripcion     TEXT,
  tiempo_minutos  DECIMAL(10,4) NOT NULL,
  costo_hora      DECIMAL(18,4) NOT NULL,
  orden           INT DEFAULT 0,
  created_at      TIMESTAMP DEFAULT NOW()
);

-- 11. fichas_costo
CREATE TABLE IF NOT EXISTS fichas_costo (
  id                   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  producto_id          UUID REFERENCES productos(id) ON DELETE SET NULL,
  negocio_id           UUID REFERENCES negocios(id) ON DELETE SET NULL,
  lote_cantidad        INT NOT NULL DEFAULT 1,
  mpd_unitario         DECIMAL(18,4),
  mod_unitario         DECIMAL(18,4),
  costo_unitario_total DECIMAL(18,4),
  mpd_lote             DECIMAL(18,4),
  mod_lote             DECIMAL(18,4),
  costo_lote_total     DECIMAL(18,4),
  detalle_mpd          JSONB,
  detalle_mod          JSONB,
  calculado_en         TIMESTAMP DEFAULT NOW(),
  notas                TEXT,
  created_at           TIMESTAMP DEFAULT NOW()
);

-- 12. lotes
CREATE TABLE IF NOT EXISTS lotes (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  negocio_id          UUID NOT NULL REFERENCES negocios(id) ON DELETE CASCADE,
  identificador       VARCHAR(100) NOT NULL,
  tipo_animal         VARCHAR(100) NOT NULL,
  fecha_entrada       DATE,
  cabezas_inicio      INT,
  cabezas_activas     INT,
  peso_inicial_prom   DECIMAL(10,4),
  peso_actual_prom    DECIMAL(10,4),
  costo_adquisicion   DECIMAL(18,4),
  activo              BOOLEAN DEFAULT TRUE,
  created_at          TIMESTAMP DEFAULT NOW()
);

-- 13. bitacora_lote
CREATE TABLE IF NOT EXISTS bitacora_lote (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lote_id      UUID NOT NULL REFERENCES lotes(id) ON DELETE CASCADE,
  fecha        DATE,
  tipo         VARCHAR(100) NOT NULL,
  detalle      TEXT,
  monto        DECIMAL(18,4),
  es_baja      BOOLEAN DEFAULT FALSE,
  cabezas_baja INT,
  peso_baja    DECIMAL(10,4),
  causa        TEXT,
  created_at   TIMESTAMP DEFAULT NOW()
);
