export async function seedIndustriaLactea(negocioId, db) {
  const unidades = {};
  const categorias = {};
  const proveedores = {};
  const insumos = {};

  const unidadesData = [
    { nombre: 'Kilogramo', simbolo: 'kg', tipo: 'Peso' },
    { nombre: 'Gramo', simbolo: 'g', tipo: 'Peso' },
    { nombre: 'Litro', simbolo: 'L', tipo: 'Volumen' },
    { nombre: 'Mililitro', simbolo: 'ml', tipo: 'Volumen' },
    { nombre: 'Unidad', simbolo: 'u', tipo: 'Cantidad' },
    { nombre: 'Hora', simbolo: 'h', tipo: 'Tiempo' }
  ];

  for (const unidad of unidadesData) {
    const { rows } = await db.query(
      `INSERT INTO unidades_medida (negocio_id, nombre, simbolo, tipo)
       VALUES ($1, $2, $3, $4)
       RETURNING id`,
      [negocioId, unidad.nombre, unidad.simbolo, unidad.tipo]
    );
    unidades[unidad.simbolo] = rows[0].id;
  }

  await db.query(
    `INSERT INTO equivalencias_unidades (negocio_id, unidad_origen_id, unidad_destino_id, factor)
     VALUES ($1, $2, $3, $4), ($1, $5, $6, $7)`,
    [negocioId, unidades.kg, unidades.g, 1000, unidades.L, unidades.ml, 1000]
  );

  const categoriasData = [
    { key: 'materia_prima', nombre: 'Materia prima principal', color: '#3B82F6' },
    { key: 'quimicos', nombre: 'Insumos químicos y cultivos', color: '#F59E0B' },
    { key: 'empaque', nombre: 'Empaque y presentación', color: '#22C55E' },
    { key: 'limpieza', nombre: 'Limpieza y saneamiento', color: '#8B5CF6' }
  ];

  for (const categoria of categoriasData) {
    const { rows } = await db.query(
      `INSERT INTO categorias_insumos (negocio_id, nombre, color)
       VALUES ($1, $2, $3)
       RETURNING id`,
      [negocioId, categoria.nombre, categoria.color]
    );
    categorias[categoria.key] = rows[0].id;
  }

  const proveedoresData = [
    {
      key: 'coboce',
      nombre: 'Coboce Lácteos S.R.L.',
      contacto: 'Juan Pérez',
      telefono: '71234567',
      email: 'ventas@coboce.bo'
    },
    {
      key: 'tecnolacteos',
      nombre: 'TecnoLácteos Bolivia',
      contacto: 'María Flores',
      telefono: '76543210',
      email: 'info@tecnolacteos.bo'
    },
    {
      key: 'salinas',
      nombre: 'Salinas de Uyuni Ltda.',
      contacto: 'Carlos Mamani',
      telefono: '67891234',
      email: null
    },
    {
      key: 'plastibol',
      nombre: 'Plastibol Envases',
      contacto: 'Ana Quispe',
      telefono: '72345678',
      email: null
    },
    {
      key: 'grafimundo',
      nombre: 'Grafimundo Impresiones',
      contacto: 'Luis Torrez',
      telefono: '71987654',
      email: null
    }
  ];

  for (const proveedor of proveedoresData) {
    const { rows } = await db.query(
      `INSERT INTO proveedores (negocio_id, nombre, contacto, telefono, email)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING id`,
      [negocioId, proveedor.nombre, proveedor.contacto, proveedor.telefono, proveedor.email]
    );
    proveedores[proveedor.key] = rows[0].id;
  }

  const insumosData = [
    {
      key: 'leche_entera_fresca',
      nombre: 'Leche entera fresca',
      precio: 4.8,
      unidad: 'L',
      categoria: 'materia_prima',
      proveedor: 'coboce'
    },
    {
      key: 'cuajo_enzimatico_liquido',
      nombre: 'Cuajo enzimático líquido',
      precio: 420,
      unidad: 'kg',
      categoria: 'quimicos',
      proveedor: 'tecnolacteos'
    },
    {
      key: 'cloruro_calcio',
      nombre: 'Cloruro de calcio',
      precio: 95,
      unidad: 'kg',
      categoria: 'quimicos',
      proveedor: 'tecnolacteos'
    },
    {
      key: 'fermento_lactico_mesofilo',
      nombre: 'Fermento láctico mesófilo',
      precio: 650,
      unidad: 'kg',
      categoria: 'quimicos',
      proveedor: 'tecnolacteos'
    },
    {
      key: 'sal_refinada',
      nombre: 'Sal refinada',
      precio: 8.5,
      unidad: 'kg',
      categoria: 'materia_prima',
      proveedor: 'salinas'
    },
    {
      key: 'envase_plastico_500g',
      nombre: 'Envase plástico 500g',
      precio: 1.2,
      unidad: 'u',
      categoria: 'empaque',
      proveedor: 'plastibol'
    },
    {
      key: 'etiqueta_autoadhesiva',
      nombre: 'Etiqueta autoadhesiva',
      precio: 0.35,
      unidad: 'u',
      categoria: 'empaque',
      proveedor: 'grafimundo'
    },
    {
      key: 'envase_plastico_250ml',
      nombre: 'Envase plástico 250ml',
      precio: 0.9,
      unidad: 'u',
      categoria: 'empaque',
      proveedor: 'plastibol'
    }
  ];

  for (const insumo of insumosData) {
    const { rows } = await db.query(
      `INSERT INTO insumos (
        negocio_id,
        nombre,
        categoria_id,
        unidad_id,
        precio_unitario,
        proveedor_id
      ) VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING id`,
      [
        negocioId,
        insumo.nombre,
        categorias[insumo.categoria],
        unidades[insumo.unidad],
        insumo.precio,
        proveedores[insumo.proveedor]
      ]
    );
    insumos[insumo.key] = rows[0].id;
  }

  const { rows: productoQuesoRows } = await db.query(
    `INSERT INTO productos (negocio_id, nombre, codigo_sku, unidad_id)
     VALUES ($1, $2, $3, $4)
     RETURNING id`,
    [negocioId, 'Queso fresco 500g', 'QF-001', unidades.u]
  );
  const productoQuesoId = productoQuesoRows[0].id;

  await db.query(
    `INSERT INTO bom_items (producto_id, insumo_id, cantidad, unidad_id, orden)
     VALUES
       ($1, $2, $3, $4, 1),
       ($1, $5, $6, $7, 2),
       ($1, $8, $9, $10, 3),
       ($1, $11, $12, $13, 4),
       ($1, $14, $15, $16, 5),
       ($1, $17, $18, $19, 6),
       ($1, $20, $21, $22, 7)`,
    [
      productoQuesoId,
      insumos.leche_entera_fresca,
      5.0,
      unidades.L,
      insumos.cuajo_enzimatico_liquido,
      0.003,
      unidades.kg,
      insumos.cloruro_calcio,
      0.002,
      unidades.kg,
      insumos.fermento_lactico_mesofilo,
      0.001,
      unidades.kg,
      insumos.sal_refinada,
      0.015,
      unidades.kg,
      insumos.envase_plastico_500g,
      1,
      unidades.u,
      insumos.etiqueta_autoadhesiva,
      1,
      unidades.u
    ]
  );

  await db.query(
    `INSERT INTO etapas_produccion (producto_id, nombre, tiempo_minutos, costo_hora, orden)
     VALUES
       ($1, 'Pasteurización', 4, 18.50, 1),
       ($1, 'Adición de cultivos', 3, 18.50, 2),
       ($1, 'Coagulación', 12, 18.50, 3),
       ($1, 'Corte y agitación', 6, 22.00, 4),
       ($1, 'Desuerado y prensado', 8, 22.00, 5),
       ($1, 'Salado y moldeo', 4, 18.50, 6),
       ($1, 'Empaque', 3, 18.50, 7)`,
    [productoQuesoId]
  );

  const { rows: productoYogurRows } = await db.query(
    `INSERT INTO productos (negocio_id, nombre, codigo_sku, unidad_id)
     VALUES ($1, $2, $3, $4)
     RETURNING id`,
    [negocioId, 'Yogur natural 250ml', 'YN-002', unidades.u]
  );
  const productoYogurId = productoYogurRows[0].id;

  await db.query(
    `INSERT INTO bom_items (producto_id, insumo_id, cantidad, unidad_id, orden)
     VALUES
       ($1, $2, $3, $4, 1),
       ($1, $5, $6, $7, 2),
       ($1, $8, $9, $10, 3),
       ($1, $11, $12, $13, 4)`,
    [
      productoYogurId,
      insumos.leche_entera_fresca,
      0.3,
      unidades.L,
      insumos.fermento_lactico_mesofilo,
      0.0005,
      unidades.kg,
      insumos.envase_plastico_250ml,
      1,
      unidades.u,
      insumos.etiqueta_autoadhesiva,
      1,
      unidades.u
    ]
  );

  await db.query(
    `INSERT INTO etapas_produccion (producto_id, nombre, tiempo_minutos, costo_hora, orden)
     VALUES
       ($1, 'Pasteurización', 3, 18.50, 1),
       ($1, 'Inoculación', 5, 18.50, 2),
       ($1, 'Incubación', 2, 18.50, 3),
       ($1, 'Empaque', 3, 18.50, 4)`,
    [productoYogurId]
  );
}
