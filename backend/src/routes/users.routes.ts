import { Router, Response } from 'express';
import { authenticate, AuthenticatedRequest } from '../middleware/auth.middleware.js';
import { UserRepository } from '../repositories/user.repository.js';

const router = Router();

router.use(authenticate);

// Search contacts
router.get('/search', async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const q = (req.query.q as string) || '';
    const users = await UserRepository.searchUsers(q, req.user!.userId);
    res.json({ users });
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to search contacts' });
  }
});

// Retrieve public key for contact verification & E2EE handshake
router.get('/:id/public-key', async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const keyRecord = await UserRepository.getPublicKeyByUserId(id);
    if (!keyRecord) {
      res.status(404).json({ error: 'Public key not found for contact' });
      return;
    }

    res.json({
      userId: keyRecord.user_id,
      publicKey: keyRecord.public_key,
      version: keyRecord.version,
      fingerprint: keyRecord.fingerprint,
    });
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to retrieve public key' });
  }
});

export default router;
