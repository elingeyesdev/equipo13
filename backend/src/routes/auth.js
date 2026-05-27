import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import { register, login, me } from '../controllers/authController.js';
import { authMiddleware } from '../middleware/auth.js';

const router = Router();

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutos
  max: 50, // límite de 50 peticiones por IP cada 15 minutos para evitar fuerza bruta
  message: { error: 'Demasiadas peticiones desde esta IP. Intente de nuevo en 15 minutos.' },
  standardHeaders: true,
  legacyHeaders: false,
});

router.post('/register', authLimiter, register);
router.post('/login', authLimiter, login);
router.get('/me', authMiddleware, me);

export default router;
