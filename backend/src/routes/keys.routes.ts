import { Router, Response } from 'express';
import { authenticate, AuthenticatedRequest } from '../middleware/auth.middleware.js';
import { UserRepository } from '../repositories/user.repository.js';
import { AuditRepository } from '../repositories/audit.repository.js';
import { query } from '../config/database.js';
import { PublicKeyRecord } from '../types/index.js';

const router = Router();

// Retrieve public key for contact verification (Publicly accessible to authenticated users)
router.get('/:userId', authenticate, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { userId } = req.params;
    const keyRecord = await UserRepository.getPublicKeyByUserId(userId);

    if (!keyRecord) {
      res.status(404).json({ error: 'Public key not found for specified user' });
      return;
    }

    res.status(200).json({
      userId: keyRecord.user_id,
      publicKey: keyRecord.public_key,
      version: keyRecord.version,
      fingerprint: keyRecord.fingerprint,
      createdAt: keyRecord.created_at,
    });
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to retrieve public key record' });
  }
});

// View public-key rotation history for a contact
router.get('/:userId/history', authenticate, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { userId } = req.params;
    const rows = await query<PublicKeyRecord[]>(
      'SELECT id, user_id, version, fingerprint, created_at FROM public_keys WHERE user_id = ? ORDER BY version DESC',
      [userId]
    );

    res.status(200).json({
      userId,
      history: rows,
    });
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to retrieve public key history' });
  }
});

// Publish or rotate client public key
router.post('/publish', authenticate, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { publicKey, fingerprint } = req.body;

    if (!publicKey || typeof publicKey !== 'string' || publicKey.length < 20) {
      res.status(400).json({ error: 'Invalid or missing ECDH P-256 public key' });
      return;
    }

    if (!fingerprint || typeof fingerprint !== 'string' || fingerprint.length < 16) {
      res.status(400).json({ error: 'Invalid or missing SHA-256 fingerprint' });
      return;
    }

    const savedKey = await UserRepository.savePublicKey(
      req.user!.userId,
      publicKey,
      fingerprint
    );

    // Audit logging
    const action = savedKey.version > 1 ? 'PUBLIC_KEY_ROTATED' : 'PUBLIC_KEY_PUBLISHED';
    await AuditRepository.logEvent({
      userId: req.user!.userId,
      action,
      ipAddress: req.ip,
      userAgent: req.headers['user-agent'],
      details: {
        version: savedKey.version,
        fingerprint: savedKey.fingerprint,
      },
    });

    res.status(201).json({
      message: savedKey.version > 1 ? 'Key rotated successfully' : 'Public key published successfully',
      key: {
        userId: savedKey.user_id,
        version: savedKey.version,
        fingerprint: savedKey.fingerprint,
      },
    });
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to publish public key' });
  }
});

export default router;
