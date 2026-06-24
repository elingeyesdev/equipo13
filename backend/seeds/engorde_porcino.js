import { seedCatalogoCortesPorcino } from './catalogoCortesPorcino.js';

// Seed: Engorde porcino bajo confinamiento
//
// Crea un negocio agro con:
//   - Catalogos base (unidades, categorias, proveedores, insumos, servicios)
//   - Compras historicas que pueblan el inventario FIFO
//   - DOS lotes demo:
//       LOTE-CERD-001 → 50 cerdos (lote principal)
//       LOTE-CERD-002 → 10 cerdos (lote chico)
//   - 30 dias de registros diarios confirmados en cada lote
//   - bitacora_lote en paralelo (modulo viejo) para que la tarjeta del lote,
//     el ICA y la pagina "Diario de produccion" muestren datos consistentes
//     con la Hoja de Vida.

export async function seedEngordePorcino(negocioId, db) {
  const unidades = {};
  const categorias = {};
  const proveedores = {};
  const insumos = {};

  // ───────── 1. Unidades de medida ─────────
  const unidadesData = [
    { nombre: 'Kilogramo', simbolo: 'kg',     tipo: 'Peso' },
    { nombre: 'Gramo',     simbolo: 'g',      tipo: 'Peso' },
    { nombre: 'Cabeza',    simbolo: 'cab',    tipo: 'Cantidad' },
    { nombre: 'Litro',     simbolo: 'L',      tipo: 'Volumen' },
    { nombre: 'Mililitro', simbolo: 'mL',     tipo: 'Volumen' },
    { nombre: 'Dosis',     simbolo: 'dosis',  tipo: 'Cantidad' },
    { nombre: 'Hora',      simbolo: 'h',      tipo: 'Tiempo' },
    { nombre: 'Visita',    simbolo: 'visita', tipo: 'Cantidad' },
  ];
  for (const u of unidadesData) {
    const { rows } = await db.query(
      `INSERT INTO unidades_medida (negocio_id, nombre, simbolo, tipo) VALUES ($1, $2, $3, $4) RETURNING id`,
      [negocioId, u.nombre, u.simbolo, u.tipo],
    );
    unidades[u.simbolo] = rows[0].id;
  }

  await db.query(
    `INSERT INTO equivalencias_unidades (negocio_id, unidad_origen_id, unidad_destino_id, factor)
     VALUES ($1, $2, $3, $4), ($1, $5, $6, $7)`,
    [negocioId, unidades.kg, unidades.g, 1000, unidades.L, unidades.mL, 1000],
  );

  // ───────── 2. Categorias ─────────
  // Nombres elegidos para que las queries de bitacora_lote (que filtran por
  // 'Sanidad / Medicamento' y 'Mano de obra') tambien funcionen.
  const categoriasData = [
    { key: 'balanceado', nombre: 'Balanceado',            color: '#22C55E', tipo: 'alimento'  },
    { key: 'sanidad',    nombre: 'Sanidad / Medicamento', color: '#EF4444', tipo: 'sanidad'   },
    { key: 'mano_obra',  nombre: 'Mano de obra',          color: '#3B82F6', tipo: 'mano_obra' },
    { key: 'otros',      nombre: 'Otros gastos',          color: '#9CA3AF', tipo: 'otros'     },
  ];
  for (const c of categoriasData) {
    const { rows } = await db.query(
      `INSERT INTO categorias_insumos (negocio_id, nombre, color, tipo) VALUES ($1, $2, $3, $4) RETURNING id`,
      [negocioId, c.nombre, c.color, c.tipo],
    );
    categorias[c.key] = rows[0].id;
  }

  // ───────── 3. Proveedores ─────────
  const proveedoresData = [
    { key: 'nutricion',   nombre: 'Granja Nutrición S.R.L.', contacto: 'Andrea Rocha',  telefono: '70112233', email: 'ventas@nutricion.bo' },
    { key: 'veterinaria', nombre: 'Veterinaria Pulmar',      contacto: 'Dr. Iván Soto', telefono: '70445566', email: 'pedidos@vetpulmar.bo' },
    { key: 'agroquim',    nombre: 'Agroquímicos del Sur',    contacto: 'Lucía Vargas',  telefono: '70778899', email: null },
  ];
  for (const p of proveedoresData) {
    const { rows } = await db.query(
      `INSERT INTO proveedores (negocio_id, nombre, contacto, telefono, email) VALUES ($1, $2, $3, $4, $5) RETURNING id`,
      [negocioId, p.nombre, p.contacto, p.telefono, p.email],
    );
    proveedores[p.key] = rows[0].id;
  }

  // ───────── 4. Insumos del engorde porcino ─────────
  const insumosData = [
    { key: 'bal_inicio',   nombre: 'Balanceado iniciador porcino',         precio:  4.50, unidad: 'kg',    categoria: 'balanceado', proveedor: 'nutricion'   },
    { key: 'bal_crecim',   nombre: 'Balanceado crecimiento porcino',       precio:  4.20, unidad: 'kg',    categoria: 'balanceado', proveedor: 'nutricion'   },
    { key: 'bal_desarr',   nombre: 'Balanceado desarrollo porcino',        precio:  4.00, unidad: 'kg',    categoria: 'balanceado', proveedor: 'nutricion'   },
    { key: 'bal_engorde',  nombre: 'Balanceado engorde porcino',           precio:  3.80, unidad: 'kg',    categoria: 'balanceado', proveedor: 'nutricion'   },
    { key: 'vac_myco',     nombre: 'Vacuna Mycoplasma hyopneumoniae',      precio:  9.00, unidad: 'dosis', categoria: 'sanidad',    proveedor: 'veterinaria' },
    { key: 'vac_peste',    nombre: 'Vacuna Peste Porcina Clásica',         precio:  8.00, unidad: 'dosis', categoria: 'sanidad',    proveedor: 'veterinaria' },
    { key: 'ivermectina',  nombre: 'Ivermectina 1% inyectable',            precio:  0.80, unidad: 'mL',    categoria: 'sanidad',    proveedor: 'veterinaria' },
    { key: 'vit_ade',      nombre: 'Vitaminas A+D+E inyectable',           precio:  1.20, unidad: 'mL',    categoria: 'sanidad',    proveedor: 'agroquim'    },
    { key: 'electrolitos', nombre: 'Electrolitos en polvo (oral)',         precio: 28.00, unidad: 'kg',    categoria: 'sanidad',    proveedor: 'agroquim'    },
    { key: 'desp_ext',     nombre: 'Desparasitante externo (piretroides)', precio:  2.50, unidad: 'mL',    categoria: 'sanidad',    proveedor: 'agroquim'    },
  ];
  for (const ins of insumosData) {
    const { rows } = await db.query(
      `INSERT INTO insumos (negocio_id, nombre, categoria_id, unidad_id, precio_unitario, proveedor_id)
       VALUES ($1, $2, $3, $4, $5, $6) RETURNING id`,
      [negocioId, ins.nombre, categorias[ins.categoria], unidades[ins.unidad], ins.precio, proveedores[ins.proveedor]],
    );
    insumos[ins.key] = rows[0].id;
  }
  const insumoMeta = (key) => insumosData.find(i => i.key === key);

  // ───────── 5. Helper de fechas relativas ─────────
  const dateOffset = (days) => {
    const d = new Date();
    d.setDate(d.getDate() + days);
    return d.toISOString().slice(0, 10);
  };

  // ───────── 6. Compras historicas (poblan inventario FIFO) ─────────
  // Cantidades dimensionadas para 60 cerdos × 30 dias de iniciacion + colchon.
  // Consumo proyectado de balanceado iniciador en 30 dias:
  //   dia  1-10: 0.5 kg × 60 cab × 10 dias = 300 kg
  //   dia 11-20: 0.9 kg × 60 cab × 10 dias = 540 kg
  //   dia 21-30: 1.3 kg × 60 cab × 10 dias = 780 kg
  //   Total: 1620 kg → se compran 1750 kg (margen ~8%).
  const comprasData = [
    { insumo: 'bal_inicio',   cantidad: 1000, precio: 4.50, dias_antes: 35, proveedor: 'nutricion',   factura: 'GN-001' },
    { insumo: 'bal_inicio',   cantidad:  750, precio: 4.70, dias_antes: 15, proveedor: 'nutricion',   factura: 'GN-014' },
    { insumo: 'bal_inicio',   cantidad:  150, precio: 4.60, dias_antes: 10, proveedor: 'nutricion',   factura: 'GN-015' },
    { insumo: 'bal_crecim',   cantidad:  600, precio: 4.20, dias_antes:  5, proveedor: 'nutricion',   factura: 'GN-019' },
    { insumo: 'vac_myco',     cantidad:  150, precio: 9.00, dias_antes: 40, proveedor: 'veterinaria', factura: 'VP-008' },
    { insumo: 'vac_peste',    cantidad:   60, precio: 8.00, dias_antes: 40, proveedor: 'veterinaria', factura: 'VP-008' },
    { insumo: 'ivermectina',  cantidad:  250, precio: 0.80, dias_antes: 45, proveedor: 'veterinaria', factura: 'VP-005' },
    { insumo: 'vit_ade',      cantidad:  200, precio: 1.20, dias_antes: 40, proveedor: 'agroquim',    factura: 'AS-022' },
    { insumo: 'electrolitos', cantidad:   10, precio:28.00, dias_antes: 40, proveedor: 'agroquim',    factura: 'AS-022' },
    { insumo: 'desp_ext',     cantidad:  500, precio: 2.50, dias_antes: 45, proveedor: 'agroquim',    factura: 'AS-018' },
  ];
  const comprasIds = {};
  for (const c of comprasData) {
    const { rows } = await db.query(
      `INSERT INTO compras_insumo (
         negocio_id, insumo_id, proveedor_id, fecha_compra,
         cantidad_comprada, cantidad_disponible, precio_unitario,
         unidad_id, numero_factura
       ) VALUES ($1, $2, $3, $4, $5, $5, $6, $7, $8) RETURNING id`,
      [
        negocioId, insumos[c.insumo], proveedores[c.proveedor],
        dateOffset(-c.dias_antes), c.cantidad, c.precio,
        unidades[insumoMeta(c.insumo).unidad], c.factura,
      ],
    );
    if (!comprasIds[c.insumo]) comprasIds[c.insumo] = [];
    comprasIds[c.insumo].push({ id: rows[0].id, precio: c.precio, restante: c.cantidad });
  }

  // ───────── 7. Catalogo de servicios veterinarios y operativos ─────────
  // bitacoraTipo decide a que tipo de bitacora_lote mapea cuando se registra
  // el servicio: 'sanidad' → 'Sanidad / Medicamento', 'operativo' → 'Mano de obra'.
  const serviciosData = [
    { nombre: 'Visita veterinaria',           unidad: 'visita', costo: 250, bitacoraTipo: 'sanidad',   descripcion: 'Visita de rutina del médico veterinario' },
    { nombre: 'Consulta de emergencia',       unidad: 'visita', costo: 450, bitacoraTipo: 'sanidad',   descripcion: 'Atención veterinaria de urgencia' },
    { nombre: 'Análisis de laboratorio',      unidad: 'muestra',costo: 180, bitacoraTipo: 'sanidad',   descripcion: 'Análisis de sangre, heces o agua' },
    { nombre: 'Castración',                   unidad: 'cabeza', costo:  15, bitacoraTipo: 'sanidad',   descripcion: 'Castración de lechones machos' },
    { nombre: 'Corte de colmillos',           unidad: 'cabeza', costo:   5, bitacoraTipo: 'sanidad',   descripcion: 'Clipeo de colmillos en lechones' },
    { nombre: 'Corte de cola',                unidad: 'cabeza', costo:   5, bitacoraTipo: 'sanidad',   descripcion: 'Descole preventivo de lechones' },
    { nombre: 'Areteo / Identificación',      unidad: 'cabeza', costo:   8, bitacoraTipo: 'operativo', descripcion: 'Colocación de aretes o tatuaje' },
    { nombre: 'Muestreo de pesos',            unidad: 'visita', costo: 120, bitacoraTipo: 'operativo', descripcion: 'Pesaje y muestreo del lote' },
    { nombre: 'Desinfección de instalaciones',unidad: 'visita', costo: 350, bitacoraTipo: 'operativo', descripcion: 'Desinfección de galpones' },
    { nombre: 'Control de roedores',          unidad: 'visita', costo: 200, bitacoraTipo: 'operativo', descripcion: 'Servicio de desratización' },
    { nombre: 'Control de moscas/vectores',   unidad: 'visita', costo: 180, bitacoraTipo: 'operativo', descripcion: 'Aplicación de insecticidas' },
    { nombre: 'Retiro de cadáveres',          unidad: 'visita', costo: 150, bitacoraTipo: 'operativo', descripcion: 'Recolección de animales muertos' },
    { nombre: 'Retiro de estiércol/purín',    unidad: 'viaje',  costo: 220, bitacoraTipo: 'operativo', descripcion: 'Extracción de purín del galpón' },
    { nombre: 'Transporte a matadero',        unidad: 'viaje',  costo: 800, bitacoraTipo: 'operativo', descripcion: 'Flete de animales para faena' },
    { nombre: 'Visita técnica nutricional',   unidad: 'visita', costo: 300, bitacoraTipo: 'sanidad',   descripcion: 'Consultoría de nutricionista' },
    { nombre: 'Auditoría de bioseguridad',    unidad: 'visita', costo: 400, bitacoraTipo: 'sanidad',   descripcion: 'Evaluación de protocolos sanitarios' },
  ];
  const serviciosIds = {};
  for (const s of serviciosData) {
    const { rows } = await db.query(
      `INSERT INTO catalogo_servicios (negocio_id, nombre, descripcion, costo_base, unidad)
       VALUES ($1, $2, $3, $4, $5) RETURNING id`,
      [negocioId, s.nombre, s.descripcion, s.costo, s.unidad],
    );
    serviciosIds[s.nombre] = rows[0].id;
  }

  // ───────── 8. FIFO helper (compartido entre lotes) ─────────
  const consumirFIFO = (insumoKey, cantidad) => {
    const capas = comprasIds[insumoKey] || [];
    let restante = cantidad;
    const detalle = [];
    let costoTotal = 0;
    for (const capa of capas) {
      if (restante <= 0) break;
      if (capa.restante <= 0) continue;
      const usar = Math.min(restante, capa.restante);
      capa.restante -= usar;
      restante -= usar;
      costoTotal += usar * capa.precio;
      detalle.push({ compra_id: capa.id, cantidad: usar, precio_unitario: capa.precio, subtotal: +(usar * capa.precio).toFixed(4) });
    }
    return { detalle, costoTotal: +costoTotal.toFixed(4) };
  };

  // ───────── 9. Factory de lote con 30 dias de registros ─────────
  // Curva de consumo de balanceado iniciador realista para cerdos en
  // confinamiento (edad de ingreso ~30 dias, peso ~8.5 kg → fin de mes ~25 kg):
  //   dia  1-10 → 0.5 kg/cab/dia
  //   dia 11-20 → 0.9 kg/cab/dia
  //   dia 21-30 → 1.3 kg/cab/dia
  //   Promedio: 0.9 kg/cab/dia · ICa esperado ~1.6 (eficiente)
  async function createLoteConRegistros(config) {
    const {
      identificador, cabezas, pesoInicial, costoAdq,
      pesajeIntervalo = null,  // override del lote; null = hereda el del negocio
      pesajeActivo = true,
      pesajes,                 // [{ offset, peso }] — el último define peso_actual y la base del recordatorio
      diasDeRegistros = 30,    // override de los días de registro, por defecto 30
    } = config;
    const FECHA_ENTRADA_OFFSET = diasDeRegistros;
    const pesoActual = pesajes[pesajes.length - 1].peso;

    const { rows: [lote] } = await db.query(
      `INSERT INTO lotes (
         negocio_id, identificador, tipo_animal, fecha_entrada,
         cabezas_inicio, cabezas_activas, peso_inicial_prom, peso_actual_prom,
         costo_adquisicion, edad_promedio_dias, pesaje_intervalo_dias, pesaje_activo
       ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12) RETURNING id`,
      [
        negocioId, identificador, 'Cerdo',
        dateOffset(-FECHA_ENTRADA_OFFSET),
        cabezas, cabezas, pesoInicial, pesoActual,
        costoAdq, diasDeRegistros, // edad biologica al ingreso: diasDeRegistros (si asumimos 1 a 1)

        pesajeIntervalo, pesajeActivo,
      ],
    );
    const loteId = lote.id;

    // Pesajes historicos (curva realista). El ultimo pesaje define peso_actual_prom
    // y la fecha base desde la que se cuenta el proximo pesaje del recordatorio.
    for (const p of pesajes) {
      await db.query(
        `INSERT INTO pesajes_lote (lote_id, fecha, peso_prom_kg, n_cabezas_muestra, notas, origen)
         VALUES ($1, $2, $3, $4, $5, $6)`,
        [loteId, dateOffset(p.offset), p.peso, p.muestras || null, p.notas || null, p.origen || 'dueno'],
      );
    }

    // Helpers internos que mantienen las dos tablas sincronizadas
    async function registrarInsumo(registroId, fecha, insumoKey, cantidad) {
      const ins = insumoMeta(insumoKey);
      const cat = categoriasData.find(c => c.key === ins.categoria);
      const fifo = consumirFIFO(insumoKey, cantidad);
      await db.query(
        `INSERT INTO registro_diario_item (
           registro_diario_id, tipo, insumo_id, cantidad, unidad_id, costo_real, detalle_fifo
         ) VALUES ($1, 'insumo', $2, $3, $4, $5, $6::jsonb)`,
        [registroId, insumos[insumoKey], cantidad, unidades[ins.unidad], fifo.costoTotal, JSON.stringify(fifo.detalle)],
      );
      const precioU = cantidad > 0 ? +(fifo.costoTotal / cantidad).toFixed(4) : 0;
      await db.query(
        `INSERT INTO bitacora_lote (
           lote_id, fecha, tipo, detalle, monto, cantidad_kg, cantidad, precio_unitario
         ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
        [
          loteId, fecha, cat.nombre, ins.nombre, fifo.costoTotal,
          (cat.tipo === 'alimento' && ins.unidad === 'kg') ? cantidad : null,
          cantidad, precioU,
        ],
      );
    }

    async function registrarServicio(registroId, fecha, servicioNombre, realizadoPor, costoOverride) {
      const s = serviciosData.find(x => x.nombre === servicioNombre);
      const costo = costoOverride ?? s.costo;
      await db.query(
        `INSERT INTO registro_diario_item (
           registro_diario_id, tipo, servicio_id, servicio_nombre, costo_servicio, realizado_por
         ) VALUES ($1, 'servicio', $2, $3, $4, $5)`,
        [registroId, serviciosIds[servicioNombre], servicioNombre, costo, realizadoPor],
      );
      const tipoBitacora = s.bitacoraTipo === 'sanidad' ? 'Sanidad / Medicamento' : 'Mano de obra';
      await db.query(
        `INSERT INTO bitacora_lote (lote_id, fecha, tipo, detalle, monto)
         VALUES ($1, $2, $3, $4, $5)`,
        [loteId, fecha, tipoBitacora, `${servicioNombre} (${realizadoPor})`, costo],
      );
    }

    // Curva de balanceado por dia
    const kgPorCabDia = (dia) => {
      if (dia <= 10) return 0.5;
      if (dia <= 20) return 0.9;
      return 1.3;
    };

    // Loop dia 1..diasDeRegistros (dia 1 = hace (diasDeRegistros-1) dias, ultimo = hoy)
    for (let dia = 1; dia <= diasDeRegistros; dia++) {
      const fecha = dateOffset(-(diasDeRegistros - dia));

      const { rows: [registro] } = await db.query(
        `INSERT INTO registro_diario_lote (negocio_id, lote_id, fecha, confirmado, confirmado_en, notas_del_dia)
         VALUES ($1, $2, $3, TRUE, NOW(), $4) RETURNING id`,
        [negocioId, loteId, fecha, notasParaDia(dia)],
      );
      const registroId = registro.id;

      // Consumo diario de balanceado iniciador (curva por fase)
      const cantBalanceado = +(kgPorCabDia(dia) * cabezas).toFixed(4);
      await registrarInsumo(registroId, fecha, 'bal_inicio', cantBalanceado);

      // Eventos sanitarios realistas (calendario tipico de engorde porcino confinamiento)
      if (dia === 1) {
        // Llegada: anti-estres + chequeo
        await registrarInsumo(registroId, fecha, 'vit_ade',      2 * cabezas);
        await registrarInsumo(registroId, fecha, 'electrolitos', 0.001 * cabezas);
        await registrarServicio(registroId, fecha, 'Visita veterinaria', 'Dr. Iván Soto');
      }
      if (dia === 3) {
        // Vacuna Mycoplasma dosis 1 + identificacion
        await registrarInsumo(registroId, fecha, 'vac_myco', cabezas);
        await registrarServicio(registroId, fecha, 'Areteo / Identificación', 'Equipo de granja', 8 * cabezas);
      }
      if (dia === 7) {
        // Desparasitacion interna
        await registrarInsumo(registroId, fecha, 'ivermectina', 0.3 * cabezas);
      }
      if (dia === 10) {
        await registrarServicio(registroId, fecha, 'Retiro de estiércol/purín', 'Equipo de granja');
      }
      if (dia === 14) {
        await registrarServicio(registroId, fecha, 'Muestreo de pesos', 'Equipo de granja');
      }
      if (dia === 17) {
        // Vacuna Mycoplasma dosis 2 (refuerzo)
        await registrarInsumo(registroId, fecha, 'vac_myco', cabezas);
        await registrarServicio(registroId, fecha, 'Visita veterinaria', 'Dr. Iván Soto');
      }
      if (dia === 20) {
        await registrarServicio(registroId, fecha, 'Retiro de estiércol/purín', 'Equipo de granja');
      }
      if (dia === 25) {
        // Desparasitacion externa
        await registrarInsumo(registroId, fecha, 'desp_ext', 0.5 * cabezas);
      }
      if (dia === 30) {
        // Cierre del mes: muestreo final + limpieza
        await registrarServicio(registroId, fecha, 'Muestreo de pesos', 'Equipo de granja');
        await registrarServicio(registroId, fecha, 'Retiro de estiércol/purín', 'Equipo de granja');
      }
    }
  }

  // ───────── 10. Crear los dos lotes ─────────
  // Pensados para la demo del recordatorio de pesaje:
  //
  //   LOTE-CERD-001 → PESAJE VENCIDO. Cadencia propia de 10 días y último
  //     pesaje hace 14 días → en la lista de Lotes aparece "⚠ Vencido" y, al
  //     abrir el día de hoy en la Hoja de Vida, sale el banner para registrar
  //     el peso. Es el lote ideal para mostrar el flujo de "Registrar peso".
  //
  //   LOTE-CERD-002 → AL DÍA. Hereda la cadencia del negocio (15 días) y su
  //     último pesaje fue hace 3 días → en la lista aparece "Próximo: <fecha>".
  await createLoteConRegistros({
    identificador: 'LOTE-CERD-001',
    cabezas: 50,
    pesoInicial: 8.5,
    costoAdq:    9000, // 50 × 180 Bs/cabeza
    pesajeIntervalo: 10, // override propio del lote
    pesajeActivo: true,
    pesajes: [
      { offset: -24, peso: 12.0, muestras: 10, notas: 'Llegaron bien', origen: 'dueno' },
      { offset: -14, peso: 20.0, muestras: null, notas: 'Pesaje del encargado', origen: 'operario' }, // último: hace 14 días → vencido (cadencia 10)
    ],
  });

  await createLoteConRegistros({
    identificador: 'LOTE-CERD-002',
    cabezas: 10,
    pesoInicial: 8.5,
    costoAdq:    1800,  // 10 × 180 Bs/cabeza
    pesajeIntervalo: null, // hereda la cadencia del negocio (15 días)
    pesajeActivo: true,
    pesajes: [
      { offset: -25, peso: 12.0, muestras: 5, notas: '', origen: 'operario' },
      { offset: -15, peso: 16.5, muestras: 5, notas: 'Comen bien', origen: 'operario' },
      { offset:  -3, peso: 24.0, muestras: null, notas: 'Se pesan los más gordos', origen: 'dueno' }, // último: hace 3 días → al día (cadencia 15)
    ],
  });

  await createLoteConRegistros({
    identificador: 'LOTE-CERD-003',
    cabezas: 5,
    pesoInicial: 8.0,
    costoAdq: 900, // 5 * 180 Bs/cabeza
    pesajeIntervalo: 7, // override propio del lote
    pesajeActivo: true,
    diasDeRegistros: 20,
    pesajes: [
      { offset: -19, peso: 10.0, muestras: 2, notas: 'Entrada adaptada', origen: 'dueno' },
      { offset: -12, peso: 14.0, muestras: 2, notas: 'Pesaje semana 1', origen: 'operario' },
      { offset: -5, peso: 18.0, muestras: 2, notas: 'Crecen bien', origen: 'operario' }, // último: hace 5 días → próximo en 2 días (cadencia 7)
    ],
  });

  // ───────── 11. Sincronizar cantidad_disponible final del FIFO ─────────
  for (const [, capas] of Object.entries(comprasIds)) {
    for (const capa of capas) {
      await db.query(
        `UPDATE compras_insumo SET cantidad_disponible = $1 WHERE id = $2`,
        [Math.max(0, +capa.restante.toFixed(4)), capa.id],
      );
    }
  }

  // ───────── 12. Catálogo de cortes porcino ─────────
  await seedCatalogoCortesPorcino(negocioId, db);
}

function notasParaDia(dia) {
  if (dia === 1)  return 'Llegada del lote. Aplicación de vitaminas A+D+E inyectables y electrolitos en el agua para reducir el estrés del transporte.';
  if (dia === 3)  return 'Primera dosis de vacuna Mycoplasma hyopneumoniae aplicada por el veterinario. Areteo del lote.';
  if (dia === 7)  return 'Desparasitación interna con ivermectina subcutánea. Lote estable, sin bajas.';
  if (dia === 10) return 'Limpieza del galpón y retiro de estiércol.';
  if (dia === 14) return 'Muestreo de pesos a mitad de mes. Promedio: 16 kg/cab.';
  if (dia === 17) return 'Refuerzo de vacuna Mycoplasma (dosis 2). Animales activos y consumiendo bien.';
  if (dia === 20) return 'Limpieza del galpón y retiro de estiércol.';
  if (dia === 25) return 'Desparasitación externa con piretroides en spray.';
  if (dia === 30) return 'Cierre del mes. Muestreo final de pesos y limpieza general del galpón.';
  return null;
}
