import { Router } from 'express';
import { authMiddleware } from '../middleware/auth.js';
import { getAll, create, getOne, update } from '../controllers/negocioController.js';

const router = Router();

router.get('/', authMiddleware, getAll);
router.post('/', authMiddleware, create);
router.get('/:id', authMiddleware, getOne);
router.put('/:id', authMiddleware, update);

export default router;
