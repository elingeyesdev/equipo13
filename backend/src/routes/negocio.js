import { Router } from 'express';
import { authMiddleware } from '../middleware/auth.js';
import { negocioOwner } from '../middleware/negocioOwner.js';
import {
  getInsumos,
  getInsumoById,
  createInsumo,
  updateInsumo,
  archivarInsumo
} from '../controllers/insumoController.js';

const router = Router();

// Todas las rutas bajo /api/negocios/:negocioId/...
// Unidades    — S-3
// Categorías  — S-3
// Proveedores — S-3
// Insumos     — S-4
// Productos   — D-1
// BOM         — D-1
// Etapas      — D-1
// Fichas      — D-2
// Lotes       — L-3
// Bitácora    — L-3

router.get('/:negocioId/insumos', authMiddleware, negocioOwner, getInsumos);
router.get('/:negocioId/insumos/:id', authMiddleware, negocioOwner, getInsumoById);
router.post('/:negocioId/insumos', authMiddleware, negocioOwner, createInsumo);
router.put('/:negocioId/insumos/:id', authMiddleware, negocioOwner, updateInsumo);
router.patch('/:negocioId/insumos/:id/archivar', authMiddleware, negocioOwner, archivarInsumo);

export default router;
