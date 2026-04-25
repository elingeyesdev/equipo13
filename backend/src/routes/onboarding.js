import { Router } from 'express';
import { authMiddleware } from '../middleware/auth.js';
import { status, completar } from '../controllers/onboardingController.js';

const router = Router();

router.get('/status', authMiddleware, status);
router.post('/completar', authMiddleware, completar);

export default router;
