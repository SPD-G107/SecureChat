import { Request, Response } from 'express';
import { PushService } from '../services/push.service.js';
import { ENV } from '../config/env.js';

export class PushController {
  /**
   * Return server VAPID public key so client can subscribe
   */
  static getVapidPublicKey(_req: Request, res: Response) {
    res.status(200).json({
      publicKey: ENV.VAPID_PUBLIC_KEY,
    });
  }

  /**
   * Save Web Push subscription for authenticated user
   */
  static async subscribe(req: Request, res: Response) {
    try {
      const userId = (req as any).user?.userId;
      if (!userId) {
        return res.status(401).json({ error: 'Authentication required' });
      }

      const { endpoint, keys } = req.body;
      if (!endpoint || !keys?.p256dh || !keys?.auth) {
        return res.status(400).json({ error: 'Invalid subscription object' });
      }

      const userAgent = req.headers['user-agent'] as string | undefined;
      await PushService.saveSubscription(userId, { endpoint, keys }, userAgent);

      res.status(200).json({ success: true, message: 'Push subscription registered' });
    } catch (err: any) {
      res.status(500).json({ error: err.message || 'Failed to save subscription' });
    }
  }

  /**
   * Unsubscribe from Web Push notifications
   */
  static async unsubscribe(req: Request, res: Response) {
    try {
      const { endpoint } = req.body;
      if (!endpoint) {
        return res.status(400).json({ error: 'Endpoint is required' });
      }

      await PushService.removeSubscription(endpoint);
      res.status(200).json({ success: true, message: 'Push subscription removed' });
    } catch (err: any) {
      res.status(500).json({ error: err.message || 'Failed to remove subscription' });
    }
  }
}
