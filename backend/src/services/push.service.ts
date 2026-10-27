import webpush from 'web-push';
import { v4 as uuidv4 } from 'uuid';
import { query } from '../config/database.js';
import { ENV } from '../config/env.js';
import { logger } from '../utils/logger.js';

// Initialize Web Push with VAPID credentials
try {
  webpush.setVapidDetails(
    ENV.VAPID_SUBJECT,
    ENV.VAPID_PUBLIC_KEY,
    ENV.VAPID_PRIVATE_KEY
  );
  logger.info('W3C Web Push VAPID service initialized successfully');
} catch (err: any) {
  logger.error('Failed to initialize Web Push VAPID:', err.message);
}

export interface PushSubscriptionKeys {
  p256dh: string;
  auth: string;
}

export interface ClientPushSubscription {
  endpoint: string;
  keys: PushSubscriptionKeys;
}

export class PushService {
  /**
   * Save or update a client's Web Push subscription
   */
  static async saveSubscription(
    userId: string,
    subscription: ClientPushSubscription,
    userAgent?: string
  ): Promise<void> {
    const { endpoint, keys } = subscription;
    if (!endpoint || !keys?.p256dh || !keys?.auth) {
      throw new Error('Invalid push subscription payload');
    }

    // Auto-create push_subscriptions table if not exists
    await query(`
      CREATE TABLE IF NOT EXISTS push_subscriptions (
        id VARCHAR(36) PRIMARY KEY,
        user_id VARCHAR(36) NOT NULL,
        endpoint TEXT NOT NULL,
        p256dh VARCHAR(255) NOT NULL,
        auth VARCHAR(255) NOT NULL,
        user_agent TEXT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        INDEX idx_push_user_id (user_id)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `);

    // Check if subscription already exists for this endpoint
    const existing: any = await query(
      'SELECT id FROM push_subscriptions WHERE endpoint = ? AND user_id = ? LIMIT 1',
      [endpoint, userId]
    );

    if (existing && existing.length > 0) {
      await query(
        'UPDATE push_subscriptions SET p256dh = ?, auth = ?, user_agent = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
        [keys.p256dh, keys.auth, userAgent || null, existing[0].id]
      );
    } else {
      const id = uuidv4();
      await query(
        'INSERT INTO push_subscriptions (id, user_id, endpoint, p256dh, auth, user_agent) VALUES (?, ?, ?, ?, ?, ?)',
        [id, userId, endpoint, keys.p256dh, keys.auth, userAgent || null]
      );
    }

    logger.info(`Web Push subscription stored for user ${userId}`);
  }

  /**
   * Remove a dead or revoked push subscription
   */
  static async removeSubscription(endpoint: string): Promise<void> {
    await query('DELETE FROM push_subscriptions WHERE endpoint = ?', [endpoint]);
    logger.info('Dead push subscription removed');
  }

  /**
   * Send background incoming call wake-up notification to recipient device
   */
  static async sendCallNotification(
    recipientId: string,
    caller: { id: string; username: string; displayName?: string },
    isVideo: boolean
  ): Promise<void> {
    try {
      const subscriptions: any = await query(
        'SELECT endpoint, p256dh, auth FROM push_subscriptions WHERE user_id = ?',
        [recipientId]
      );

      if (!subscriptions || subscriptions.length === 0) {
        return;
      }

      const payload = JSON.stringify({
        type: 'incoming_call',
        callerId: caller.id,
        callerUsername: caller.displayName || caller.username,
        isVideo,
        title: isVideo ? '📹 Incoming Video Call' : '📞 Incoming Voice Call',
        body: `@${caller.displayName || caller.username} is calling you on SecureChat...`,
        url: `/chat?callWith=${caller.id}&isVideo=${isVideo ? '1' : '0'}&action=accept`,
        timestamp: Date.now(),
      });

      for (const sub of subscriptions) {
        const pushSubscription = {
          endpoint: sub.endpoint,
          keys: {
            p256dh: sub.p256dh,
            auth: sub.auth,
          },
        };

        webpush
          .sendNotification(pushSubscription, payload, {
            urgency: 'high',
            TTL: 60, // 60 seconds validity for calls
          })
          .catch(async (err) => {
            if (err.statusCode === 404 || err.statusCode === 410) {
              await this.removeSubscription(sub.endpoint);
            } else {
              logger.warn(`Push delivery error to ${sub.endpoint.slice(0, 30)}...: ${err.message}`);
            }
          });
      }
    } catch (err: any) {
      logger.error('Failed to dispatch call push notifications:', err.message);
    }
  }

  /**
   * Send background message notification when user is offline
   */
  static async sendMessageNotification(
    recipientId: string,
    sender: { id: string; username: string; displayName?: string }
  ): Promise<void> {
    try {
      const subscriptions: any = await query(
        'SELECT endpoint, p256dh, auth FROM push_subscriptions WHERE user_id = ?',
        [recipientId]
      );

      if (!subscriptions || subscriptions.length === 0) {
        return;
      }

      const payload = JSON.stringify({
        type: 'new_message',
        senderId: sender.id,
        title: '🔒 New Encrypted Message',
        body: `@${sender.displayName || sender.username} sent you a message`,
        url: `/chat?peerId=${sender.id}`,
        timestamp: Date.now(),
      });

      for (const sub of subscriptions) {
        const pushSubscription = {
          endpoint: sub.endpoint,
          keys: {
            p256dh: sub.p256dh,
            auth: sub.auth,
          },
        };

        webpush
          .sendNotification(pushSubscription, payload, {
            urgency: 'normal',
            TTL: 86400, // 24 hours
          })
          .catch(async (err) => {
            if (err.statusCode === 404 || err.statusCode === 410) {
              await this.removeSubscription(sub.endpoint);
            }
          });
      }
    } catch (err: any) {
      logger.error('Failed to dispatch message push notifications:', err.message);
    }
  }
}
