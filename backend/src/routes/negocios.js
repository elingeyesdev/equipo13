import { Router } from 'express';
import { authMiddleware } from '../middleware/auth.js';
import { getAll, create, getOne, update, desactivar, remove } from '../controllers/negocioController.js';

const router = Router();

router.get('/',                   authMiddleware, getAll);
router.post('/',                  authMiddleware, create);
router.get('/:id',                authMiddleware, getOne);
router.put('/:id',                authMiddleware, update);
router.patch('/:id/desactivar',   authMiddleware, desactivar);
router.delete('/:id',             authMiddleware, remove);

export default router;
