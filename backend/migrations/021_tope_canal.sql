CREATE TABLE IF NOT EXISTS tope_canal (
    negocio_id UUID NOT NULL REFERENCES negocios(id) ON DELETE CASCADE,
    canal VARCHAR(100) NOT NULL,
    kg_max_semana NUMERIC(10,2) NOT NULL DEFAULT 0,
    PRIMARY KEY (negocio_id, canal)
);
