export async function seedEngordeBovino(negocioId, db) {
  const unidades = {};
  const categorias = {};
  const proveedores = {};
  const insumos = {};

  const unidadesData = [
    { nombre: 'Kilogramo', simbolo: 'kg', tipo: 'Peso' },
    { nombre: 'Cabeza', simbolo: 'cab', tipo: 'Cantidad' },
    { nombre: 'Unidad', simbolo: 'u', tipo: 'Cantidad' },
    { nombre: 'Litro', simbolo: 'L', tipo: 'Volumen' },
    { nombre: 'Hora', simbolo: 'h', tipo: 'Tiempo' },
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

  const categoriasData = [
    { key: 'alimentacion', nombre: 'Alimentación y forrajes', color: '#22C55E' },
    { key: 'veterinaria', nombre: 'Veterinaria y sanidad', color: '#EF4444' },
    { key: 'suplementos', nombre: 'Suplementos minerales', color: '#F59E0B' },
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
      key: 'agroverde',
      nombre: 'Agroverde Bolivia S.R.L.',
      contacto: 'Pedro Salinas',
      telefono: '73456789',
      email: 'ventas@agroverde.bo',
    },
    {
      key: 'vetcentral',
      nombre: 'Veterinaria Central Santa Cruz',
      contacto: 'Dra. Carmen López',
      telefono: '72198765',
      email: null,
    },
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

  // 6 insumos representativos de engorde bovino
  const insumosData = [
    { key: 'racion_engorde',   nombre: 'Ración balanceada engorde',   precio: 2.80,  unidad: 'kg',  categoria: 'alimentacion', proveedor: 'agroverde'  },
    { key: 'maiz_forrajero',   nombre: 'Maíz grano forrajero',        precio: 1.90,  unidad: 'kg',  categoria: 'alimentacion', proveedor: 'agroverde'  },
    { key: 'sal_mineral',      nombre: 'Sal mineral bloque',          precio: 12.50, unidad: 'kg',  categoria: 'suplementos',  proveedor: 'agroverde'  },
    { key: 'vitamina_ad3e',    nombre: 'Vitamina AD3E inyectable',    precio: 85.00, unidad: 'L',   categoria: 'veterinaria',  proveedor: 'vetcentral' },
    { key: 'vacuna_triple',    nombre: 'Vacuna triple (HS+ME+CA)',    precio: 18.50, unidad: 'u',   categoria: 'veterinaria',  proveedor: 'vetcentral' },
    { key: 'ivermectina',      nombre: 'Ivermectina 1%',              precio: 95.00, unidad: 'L',   categoria: 'veterinaria',  proveedor: 'vetcentral' },
  ];

  for (const insumo of insumosData) {
    const { rows } = await db.query(
      `INSERT INTO insumos (negocio_id, nombre, categoria_id, unidad_id, precio_unitario, proveedor_id)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING id`,
      [
        negocioId,
        insumo.nombre,
        categorias[insumo.categoria],
        unidades[insumo.unidad],
        insumo.precio,
        proveedores[insumo.proveedor],
      ]
    );
    insumos[insumo.key] = rows[0].id;
  }

  // Producto: lote de 50 novillos (60 días de engorde)
  const { rows: prodRows } = await db.query(
    `INSERT INTO productos (negocio_id, nombre, codigo_sku, unidad_id)
     VALUES ($1, $2, $3, $4)
     RETURNING id`,
    [negocioId, 'Novillo engordado', 'NB-001', unidades.cab]
  );
  const productoId = prodRows[0].id;

  // BOM: consumo por lote de 50 cabezas durante 60 días de engorde
  await db.query(
    `INSERT INTO bom_items (producto_id, insumo_id, cantidad, unidad_id, orden)
     VALUES
       ($1, $2,  3000,  $3,  1),
       ($1, $4,  9000,  $5,  2),
       ($1, $6,    90,  $7,  3),
       ($1, $8,     5,  $9,  4),
       ($1, $10,  100,  $11, 5),
       ($1, $12,  2.5,  $13, 6)`,
    [
      productoId,
      insumos.racion_engorde,  unidades.kg,
      insumos.maiz_forrajero,  unidades.kg,
      insumos.sal_mineral,     unidades.kg,
      insumos.vitamina_ad3e,   unidades.L,
      insumos.vacuna_triple,   unidades.u,
      insumos.ivermectina,     unidades.L,
    ]
  );

  await db.query(
    `INSERT INTO etapas_produccion (producto_id, nombre, tiempo_minutos, costo_hora, orden)
     VALUES
       ($1, 'Recepción e inspección sanitaria', 120, 22.00, 1),
       ($1, 'Fase de adaptación (2 semanas)',   180, 18.50, 2),
       ($1, 'Engorde activo (2 meses)',         240, 18.50, 3),
       ($1, 'Acabado y comercialización',        90, 22.00, 4)`,
    [productoId]
  );

  // Lote demo para mostrar el módulo de lotes
  await db.query(
    `INSERT INTO lotes
       (negocio_id, identificador, tipo_animal, fecha_entrada,
        cabezas_inicio, cabezas_activas,
        peso_inicial_prom, peso_actual_prom,
        costo_adquisicion, activo)
     VALUES ($1, $2, $3, NOW() - INTERVAL '30 days', 50, 48, 200, 258, 150000, true)`,
    [negocioId, 'LOTE-BOV-001', 'Novillos Nelore']
  );
}
