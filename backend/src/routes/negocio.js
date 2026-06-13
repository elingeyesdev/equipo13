import { Router } from 'express';
import { authMiddleware } from '../middleware/auth.js';
import { negocioOwner } from '../middleware/negocioOwner.js';
import { requireMembership } from '../middleware/membership.js';
import { listarRegistrosPendientes } from '../controllers/aprobacionController.js';
import {
  listarOperarios, crearOperario, resetPin,
  setActivoOperario, asignarLote, desasignarLote,
} from '../controllers/operarioAdminController.js';
import { listarEventos, aprobarBaja, rechazarBaja } from '../controllers/eventoController.js';
import {
  crearTarea,
  listarTareas,
  crearPlantilla,
  listarPlantillas,
  togglePlantillaActiva,
} from '../controllers/tareaController.js';
import {
  getUnidades,
  createUnidad,
  updateUnidad,
  deleteUnidad,
} from '../controllers/unidadController.js';
import {
  getCategorias,
  createCategoria,
  updateCategoria,
  deleteCategoria,
} from '../controllers/categoriaController.js';
import {
  getProveedores,
  createProveedor,
  updateProveedor,
  archivarProveedor,
  deleteProveedor,
  getComprasByProveedor,
} from '../controllers/proveedorController.js';
import {
  getServicios,
  createServicio,
  updateServicio,
  archivarServicio,
  seedServiciosCerdos,
} from '../controllers/servicioController.js';
import {
  getInsumos,
  getInsumoById,
  createInsumo,
  updateInsumo,
  archivarInsumo,
  deleteInsumo,
} from '../controllers/insumoController.js';
import {
  getProductos,
  getProductoById,
  createProducto,
  updateProducto,
  archivarProducto,
} from '../controllers/productoController.js';
import {
  getBomItems,
  createBomItem,
  updateBomItem,
  deleteBomItem,
  reorderBom,
} from '../controllers/bomController.js';
import {
  getEtapas,
  createEtapa,
  updateEtapa,
  deleteEtapa,
  reorderEtapas,
} from '../controllers/etapaController.js';
import {
  calcularFicha,
  getFichas,
  getFichaById,
} from '../controllers/fichaController.js';
import {
  getLotes,
  getLoteById,
  createLote,
  updateLote,
  cerrarLote,
  liquidarLote,
} from '../controllers/loteController.js';
import {
  getDiario,
  createDiarioEntry,
  updateDiarioEntry,
  deleteDiarioEntry,
  consumirInsumo,
  listarConsumos,
} from '../controllers/diarioController.js';
import {
  getCostosDetalle,
  getEscenarios,
  getIca,
  getPuntoEquilibrio,
} from '../controllers/analisisController.js';
import {
  getDespiece,
  createDespiece,
  generarInsumos,
  deleteCorte,
  asignarCostosConjuntosValorVentas,
} from '../controllers/despieceController.js';
import {
  getPreciosMercado,
  createPrecioMercado,
  updatePrecioMercado,
  deletePrecioMercado,
} from '../controllers/precioMercadoController.js';
import {
  listarCompras,
  stockPorInsumo,
  crearCompra,
  eliminarCompra,
  reporteConsumo,
} from '../controllers/compraController.js';
import {
  getEstandarDelDia,
  getVistaMensual,
  getDetalleDia,
  guardarRegistroDia,
  confirmarDia,
} from '../controllers/hojaVidaController.js';
import {
  getGastosCIF,
  createGastoCIF,
  updateGastoCIF,
  archivarGastoCIF,
  deleteGastoCIF,
  getProrrateoCIF,
} from '../controllers/cifController.js';
import {
  getMermas,
  getMermaById,
  registrarPesaje,
  updateMerma,
  deleteMerma,
  getResumenMermas,
} from '../controllers/mermaController.js';

const router = Router();

// Unidades — S-3
router.get('/:negocioId/unidades', authMiddleware, negocioOwner, getUnidades);
router.post('/:negocioId/unidades', authMiddleware, negocioOwner, createUnidad);
router.put('/:negocioId/unidades/:id', authMiddleware, negocioOwner, updateUnidad);
router.delete('/:negocioId/unidades/:id', authMiddleware, negocioOwner, deleteUnidad);

// Categorías — S-3
router.get('/:negocioId/categorias', authMiddleware, negocioOwner, getCategorias);
router.post('/:negocioId/categorias', authMiddleware, negocioOwner, createCategoria);
router.put('/:negocioId/categorias/:id', authMiddleware, negocioOwner, updateCategoria);
router.delete('/:negocioId/categorias/:id', authMiddleware, negocioOwner, deleteCategoria);

// Proveedores — S-3
router.get('/:negocioId/proveedores', authMiddleware, negocioOwner, getProveedores);
router.post('/:negocioId/proveedores', authMiddleware, negocioOwner, createProveedor);
router.put('/:negocioId/proveedores/:id', authMiddleware, negocioOwner, updateProveedor);
router.patch('/:negocioId/proveedores/:id/archivar', authMiddleware, negocioOwner, archivarProveedor);
router.delete('/:negocioId/proveedores/:id', authMiddleware, negocioOwner, deleteProveedor);
router.get('/:negocioId/proveedores/:id/compras', authMiddleware, negocioOwner, getComprasByProveedor);

// Catálogo de servicios
router.get('/:negocioId/servicios', authMiddleware, negocioOwner, getServicios);
router.post('/:negocioId/servicios', authMiddleware, negocioOwner, createServicio);
router.post('/:negocioId/servicios/seed-cerdos', authMiddleware, negocioOwner, seedServiciosCerdos);
router.put('/:negocioId/servicios/:id', authMiddleware, negocioOwner, updateServicio);
router.patch('/:negocioId/servicios/:id/archivar', authMiddleware, negocioOwner, archivarServicio);

// Compras de insumos (inventario FIFO)
router.get('/:negocioId/compras', authMiddleware, negocioOwner, listarCompras);
router.get('/:negocioId/compras/:insumoId/stock', authMiddleware, negocioOwner, stockPorInsumo);
router.post('/:negocioId/compras', authMiddleware, negocioOwner, crearCompra);
router.delete('/:negocioId/compras/:id', authMiddleware, negocioOwner, eliminarCompra);

// Reporte de consumo por insumo — T6
router.get('/:negocioId/catalogo/:insumoId/consumos', authMiddleware, negocioOwner, reporteConsumo);

// Insumos — S-4
router.get('/:negocioId/insumos', authMiddleware, negocioOwner, getInsumos);
router.get('/:negocioId/insumos/:id', authMiddleware, negocioOwner, getInsumoById);
router.post('/:negocioId/insumos', authMiddleware, negocioOwner, createInsumo);
router.put('/:negocioId/insumos/:id', authMiddleware, negocioOwner, updateInsumo);
router.patch('/:negocioId/insumos/:id/archivar', authMiddleware, negocioOwner, archivarInsumo);
router.delete('/:negocioId/insumos/:id', authMiddleware, negocioOwner, deleteInsumo);

// Productos — D-1
router.get('/:negocioId/productos', authMiddleware, negocioOwner, getProductos);
router.get('/:negocioId/productos/:id', authMiddleware, negocioOwner, getProductoById);
router.post('/:negocioId/productos', authMiddleware, negocioOwner, createProducto);
router.put('/:negocioId/productos/:id', authMiddleware, negocioOwner, updateProducto);
router.patch('/:negocioId/productos/:id/archivar', authMiddleware, negocioOwner, archivarProducto);

// BOM — D-1
router.get('/:negocioId/productos/:productoId/bom', authMiddleware, negocioOwner, getBomItems);
router.post('/:negocioId/productos/:productoId/bom', authMiddleware, negocioOwner, createBomItem);
router.post('/:negocioId/productos/:productoId/bom/reorder', authMiddleware, negocioOwner, reorderBom);
router.put('/:negocioId/productos/:productoId/bom/:bomId', authMiddleware, negocioOwner, updateBomItem);
router.delete('/:negocioId/productos/:productoId/bom/:bomId', authMiddleware, negocioOwner, deleteBomItem);

// Etapas — D-1
router.get('/:negocioId/productos/:productoId/etapas', authMiddleware, negocioOwner, getEtapas);
router.post('/:negocioId/productos/:productoId/etapas', authMiddleware, negocioOwner, createEtapa);
router.post('/:negocioId/productos/:productoId/etapas/reorder', authMiddleware, negocioOwner, reorderEtapas);
router.put('/:negocioId/productos/:productoId/etapas/:etapaId', authMiddleware, negocioOwner, updateEtapa);
router.delete('/:negocioId/productos/:productoId/etapas/:etapaId', authMiddleware, negocioOwner, deleteEtapa);

// Fichas — D-2
router.post('/:negocioId/fichas/calcular', authMiddleware, negocioOwner, calcularFicha);
router.get('/:negocioId/fichas', authMiddleware, negocioOwner, getFichas);
router.get('/:negocioId/fichas/:id', authMiddleware, negocioOwner, getFichaById);

// Lotes — L-3
router.get('/:negocioId/lotes', authMiddleware, negocioOwner, getLotes);
router.get('/:negocioId/lotes/:id', authMiddleware, negocioOwner, getLoteById);
router.post('/:negocioId/lotes', authMiddleware, negocioOwner, createLote);
router.put('/:negocioId/lotes/:id', authMiddleware, negocioOwner, updateLote);
router.patch('/:negocioId/lotes/:id/cerrar', authMiddleware, negocioOwner, cerrarLote);
router.post('/:negocioId/lotes/:id/liquidar', authMiddleware, negocioOwner, liquidarLote);
router.get('/:negocioId/lotes/:id/costos-detalle', authMiddleware, negocioOwner, getCostosDetalle);
router.post('/:negocioId/lotes/:id/escenarios', authMiddleware, negocioOwner, getEscenarios);
router.get('/:negocioId/lotes/:id/ica', authMiddleware, negocioOwner, getIca);

// Despiece — J2 + J3
router.get('/:negocioId/lotes/:id/despiece', authMiddleware, negocioOwner, getDespiece);
router.post('/:negocioId/lotes/:id/despiece', authMiddleware, negocioOwner, createDespiece);
router.post('/:negocioId/lotes/:id/despiece/generar-insumos', authMiddleware, negocioOwner, generarInsumos);
router.post('/:negocioId/lotes/:id/despiece/asignar-costos-conjuntos', authMiddleware, negocioOwner, asignarCostosConjuntosValorVentas);
router.delete('/:negocioId/lotes/:id/despiece/:corteId', authMiddleware, negocioOwner, deleteCorte);

// Precios de Mercado
router.get('/:negocioId/precios-mercado', authMiddleware, negocioOwner, getPreciosMercado);
router.post('/:negocioId/precios-mercado', authMiddleware, negocioOwner, createPrecioMercado);
router.put('/:negocioId/precios-mercado/:id', authMiddleware, negocioOwner, updatePrecioMercado);
router.delete('/:negocioId/precios-mercado/:id', authMiddleware, negocioOwner, deletePrecioMercado);

// Diario de producción — L-3
router.get('/:negocioId/lotes/:loteId/diario', authMiddleware, negocioOwner, getDiario);
router.post('/:negocioId/lotes/:loteId/diario', authMiddleware, negocioOwner, createDiarioEntry);
router.put('/:negocioId/lotes/:loteId/diario/:id', authMiddleware, negocioOwner, updateDiarioEntry);
router.delete('/:negocioId/lotes/:loteId/diario/:id', authMiddleware, negocioOwner, deleteDiarioEntry);

// Consumo de insumos FIFO — T5
router.post('/:negocioId/lotes/:loteId/consumir', authMiddleware, negocioOwner, consumirInsumo);
router.get('/:negocioId/lotes/:loteId/consumos', authMiddleware, negocioOwner, listarConsumos);

// Punto de Equilibrio — Motor dinámico
router.get('/:negocioId/lotes/:loteId/punto-equilibrio', authMiddleware, negocioOwner, getPuntoEquilibrio);

// Hoja de Vida del Lote
router.get('/:negocioId/lotes/:loteId/estandar', authMiddleware, negocioOwner, getEstandarDelDia);
router.get('/:negocioId/lotes/:loteId/hoja-de-vida', authMiddleware, negocioOwner, getVistaMensual);
router.get('/:negocioId/lotes/:loteId/hoja-de-vida/:fecha', authMiddleware, negocioOwner, getDetalleDia);
router.post('/:negocioId/lotes/:loteId/hoja-de-vida/:fecha/confirmar', authMiddleware, negocioOwner, confirmarDia);
router.post('/:negocioId/lotes/:loteId/hoja-de-vida/:fecha', authMiddleware, negocioOwner, guardarRegistroDia);

// CIF — Sprint 2 Entregable 1
// La ruta de prorrateo va antes que /cif/:id para que Express no la trate como un id.
router.get   ('/:negocioId/cif',                   authMiddleware, negocioOwner, getGastosCIF);
router.post  ('/:negocioId/cif',                   authMiddleware, negocioOwner, createGastoCIF);
router.get   ('/:negocioId/cif/prorrateo/:loteId', authMiddleware, negocioOwner, getProrrateoCIF);
router.put   ('/:negocioId/cif/:id',               authMiddleware, negocioOwner, updateGastoCIF);
router.patch ('/:negocioId/cif/:id/archivar',      authMiddleware, negocioOwner, archivarGastoCIF);
router.delete('/:negocioId/cif/:id',               authMiddleware, negocioOwner, deleteGastoCIF);

// Mermas — 4 Nodos (AYUNO, FRIO, DESPOSTE, HORNO)
// Rutas de lista/detalle general
router.get   ('/:negocioId/mermas',                           authMiddleware, negocioOwner, getMermas);
router.get   ('/:negocioId/mermas/:id',                       authMiddleware, negocioOwner, getMermaById);
router.put   ('/:negocioId/mermas/:id',                       authMiddleware, negocioOwner, updateMerma);
router.delete('/:negocioId/mermas/:id',                       authMiddleware, negocioOwner, deleteMerma);

// Rutas anidadas en lote (registro de pesaje + resumen)
router.post  ('/:negocioId/lotes/:loteId/mermas',             authMiddleware, negocioOwner, registrarPesaje);
router.get   ('/:negocioId/lotes/:loteId/mermas/resumen',     authMiddleware, negocioOwner, getResumenMermas);
router.get   ('/:negocioId/lotes/:loteId/mermas',             authMiddleware, negocioOwner, getMermas);

// Bandeja de pendientes para el admin
router.get('/:negocioId/pendientes/registros', authMiddleware, requireMembership('admin'), listarRegistrosPendientes);

// Gestión de operarios (todas exigen rol admin)
router.get   ('/:negocioId/operarios',                            authMiddleware, requireMembership('admin'), listarOperarios);
router.post  ('/:negocioId/operarios',                            authMiddleware, requireMembership('admin'), crearOperario);
router.post  ('/:negocioId/operarios/:operarioId/reset-pin',      authMiddleware, requireMembership('admin'), resetPin);
router.patch ('/:negocioId/operarios/:operarioId',               authMiddleware, requireMembership('admin'), setActivoOperario);
router.post  ('/:negocioId/operarios/:operarioId/lotes',          authMiddleware, requireMembership('admin'), asignarLote);
router.delete('/:negocioId/operarios/:operarioId/lotes/:loteId', authMiddleware, requireMembership('admin'), desasignarLote);

// Eventos (bajas, incidentes, etc)
router.get('/:negocioId/eventos', authMiddleware, requireMembership('admin'), listarEventos);
router.post('/:negocioId/pendientes/bajas/:eventoId/aprobar',  authMiddleware, requireMembership('admin'), aprobarBaja);
router.post('/:negocioId/pendientes/bajas/:eventoId/rechazar', authMiddleware, requireMembership('admin'), rechazarBaja);

// Tareas y rutinas
router.post('/:negocioId/tareas', authMiddleware, requireMembership('admin'), crearTarea);
router.get('/:negocioId/tareas', authMiddleware, requireMembership('admin'), listarTareas);
router.post('/:negocioId/plantillas', authMiddleware, requireMembership('admin'), crearPlantilla);
router.get('/:negocioId/plantillas', authMiddleware, requireMembership('admin'), listarPlantillas);
router.patch('/:negocioId/plantillas/:id', authMiddleware, requireMembership('admin'), togglePlantillaActiva);

export default router;
