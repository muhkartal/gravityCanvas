import { Router } from 'express';
import { register, login, refreshToken, logout, getProfile, validateToken } from '../controllers/authController';
import { authenticateToken } from '../middleware/auth';
import { authRateLimitMiddleware } from '../middleware/security';
import { validateRegistration, validateLogin } from '../middleware/validation';

const router = Router();

router.post('/register', authRateLimitMiddleware, validateRegistration, register);
router.post('/login', authRateLimitMiddleware, validateLogin, login);
router.post('/refresh', refreshToken);
router.post('/logout', authenticateToken, logout);
router.get('/profile', authenticateToken, getProfile);
router.get('/validate', authenticateToken, validateToken);

export default router;
