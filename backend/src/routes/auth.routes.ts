import { Router, Request, Response, NextFunction } from 'express';
import { AuthController } from '../controllers/auth.controller.js';
import { authenticate } from '../middleware/auth.middleware.js';

const router = Router();

// Sliding-window rate limiter for authentication endpoints (prevents Brute-Force & Argon2id memory exhaustion DoS)
const authAttempts = new Map<string, { count: number; resetAt: number }>();
const AUTH_WINDOW_MS = 15 * 60 * 1000; // 15 minutes
const MAX_AUTH_ATTEMPTS = 20;

const authRateLimiter = (req: Request, res: Response, next: NextFunction): void => {
  const clientIp = (req.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim() || req.ip || 'unknown';
  const now = Date.now();
  const record = authAttempts.get(clientIp);

  if (!record || now > record.resetAt) {
    authAttempts.set(clientIp, { count: 1, resetAt: now + AUTH_WINDOW_MS });
    next();
    return;
  }

  record.count += 1;
  if (record.count > MAX_AUTH_ATTEMPTS) {
    const retryAfterSec = Math.ceil((record.resetAt - now) / 1000);
    res.setHeader('Retry-After', String(retryAfterSec));
    res.status(429).json({
      error: `Too many authentication attempts. Please wait ${Math.ceil(retryAfterSec / 60)} minute(s) before trying again.`,
    });
    return;
  }

  next();
};

router.post('/register', authRateLimiter, AuthController.register);
router.post('/login', authRateLimiter, AuthController.login);
router.post('/logout', AuthController.logout);
router.get('/me', authenticate, AuthController.me);

export default router;
