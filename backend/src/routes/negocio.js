import { Router } from 'express';
import { authMiddleware } from '../middleware/auth.js';
import { negocioOwner } from '../middleware/negocioOwner.js';

// Lotes + Bitácora (L-3 — Gerardo)
import {
  getLotes,
  getLoteById,
  createLote,
  updateLote,
  cerrarLote,
  getBitacora,
  createBitacora,
} from '../controllers/loteController.js';

const router = Router();

// Todas las rutas bajo /api/negocios/:negocioId/...
// requieren autenticación y verificación de propiedad del negocio.
router.use('/:negocioId', authMiddleware, negocioOwner);

// ── Lotes ─────────────────────────────────────────────────────────────────────
router.get('/:negocioId/lotes',             getLotes);
router.get('/:negocioId/lotes/:id',         getLoteById);
router.post('/:negocioId/lotes',            createLote);
router.put('/:negocioId/lotes/:id',         updateLote);
router.patch('/:negocioId/lotes/:id/cerrar', cerrarLote);

// ── Bitácora ──────────────────────────────────────────────────────────────────
router.get('/:negocioId/lotes/:loteId/bitacora',  getBitacora);
router.post('/:negocioId/lotes/:loteId/bitacora', createBitacora);

// Placeholders para rutas que implementan otros compañeros
// Unidades    — S-3 (Sebastián)
// Categorías  — S-3
// Proveedores — S-3
// Insumos     — S-4
// Productos   — D-1
// BOM         — D-1
// Etapas      — D-1
// Fichas      — D-2

export default router;
