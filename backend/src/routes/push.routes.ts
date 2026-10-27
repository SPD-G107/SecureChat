import { Router } from 'express';
import { PushController } from '../controllers/push.controller.js';
import { authenticate } from '../middleware/auth.middleware.js';

const router = Router();

// Public: get VAPID public key
router.get('/vapid-public-key', PushController.getVapidPublicKey);

// Authenticated: subscribe and unsubscribe
router.post('/subscribe', authenticate, PushController.subscribe);
router.post('/unsubscribe', authenticate, PushController.unsubscribe);

export default router;
