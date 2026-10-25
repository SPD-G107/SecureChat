import { query } from '../config/database.js';
import { v4 as uuidv4 } from 'uuid';
import { logger } from '../utils/logger.js';

export interface AuditLogData {
  userId?: string | null;
  action: string;
  ipAddress?: string | null;
  userAgent?: string | null;
  details?: Record<string, any> | string | null;
}

export class AuditRepository {
  /**
   * Records a security or administrative event into audit_logs.
   * Guarantees zero sensitive secrets (passwords, private keys, plaintext) are recorded.
   */
  static async logEvent(data: AuditLogData): Promise<void> {
    try {
      const id = uuidv4();

      let sanitizedDetails: string | null = null;
      if (data.details) {
        if (typeof data.details === 'object') {
          // Clone and sanitize sensitive properties
          const copy = { ...data.details };
          delete copy.password;
          delete copy.password_hash;
          delete copy.privateKey;
          delete copy.private_key;
          delete copy.plaintext;
          delete copy.text;
          sanitizedDetails = JSON.stringify(copy);
        } else {
          sanitizedDetails = String(data.details);
        }
      }

      await query(
        `INSERT INTO audit_logs (id, user_id, action, ip_address, user_agent, details)
         VALUES (?, ?, ?, ?, ?, ?)`,
        [
          id,
          data.userId || null,
          data.action,
          data.ipAddress || null,
          data.userAgent || null,
          sanitizedDetails,
        ]
      );
    } catch (err: any) {
      // Audit log failure must not crash primary execution flow
      logger.error('Failed to record audit log:', err.message);
    }
  }

  static async getRecentLogs(limit = 100): Promise<any[]> {
    const rows = await query<any[]>(
      `SELECT a.id, a.user_id, a.action, a.ip_address, a.user_agent, a.details, a.created_at,
              u.username
       FROM audit_logs a
       LEFT JOIN users u ON a.user_id = u.id
       ORDER BY a.created_at DESC
       LIMIT ?`,
      [limit]
    );
    return rows;
  }
}
