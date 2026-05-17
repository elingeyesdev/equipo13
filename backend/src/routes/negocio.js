import { Router } from 'express';
import { authMiddleware } from '../middleware/auth.js';
import { negocioOwner } from '../middleware/negocioOwner.js';
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
} from '../controllers/proveedorController.js';
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
  getBitacora,
  createBitacoraEntry,
} from '../controllers/loteController.js';

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

// Bitácora — L-3
router.get('/:negocioId/lotes/:loteId/bitacora', authMiddleware, negocioOwner, getBitacora);
router.post('/:negocioId/lotes/:loteId/bitacora', authMiddleware, negocioOwner, createBitacoraEntry);

export default router;
