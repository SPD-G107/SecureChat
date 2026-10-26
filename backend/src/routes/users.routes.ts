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

// Update display name / profile
router.patch('/profile', async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { displayName } = req.body;
    await UserRepository.updateDisplayName(req.user!.userId, displayName);
    const updated = await UserRepository.findById(req.user!.userId);
    res.json({
      message: 'Profile updated successfully',
      user: {
        id: updated!.id,
        username: updated!.username,
        displayName: updated!.display_name,
        avatarUrl: updated!.avatar_url,
        role: updated!.role,
        status: updated!.status,
      },
    });
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to update profile' });
  }
});

// Update user avatar
router.post('/avatar', async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { avatarUrl } = req.body;
    if (avatarUrl !== null && (!avatarUrl || typeof avatarUrl !== 'string')) {
      res.status(400).json({ error: 'Valid avatar image string is required' });
      return;
    }
    // Limit to 5MB base64 payload
    if (avatarUrl && avatarUrl.length > 5 * 1024 * 1024) {
      res.status(400).json({ error: 'Avatar image too large (max 3MB)' });
      return;
    }
    await UserRepository.updateAvatar(req.user!.userId, avatarUrl);
    const updated = await UserRepository.findById(req.user!.userId);
    res.json({
      message: 'Avatar updated successfully',
      user: {
        id: updated!.id,
        username: updated!.username,
        displayName: updated!.display_name,
        avatarUrl: updated!.avatar_url,
        role: updated!.role,
        status: updated!.status,
      },
    });
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to update avatar' });
  }
});

// Remove user avatar
router.delete('/avatar', async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    await UserRepository.updateAvatar(req.user!.userId, null);
    const updated = await UserRepository.findById(req.user!.userId);
    res.json({
      message: 'Avatar removed successfully',
      user: {
        id: updated!.id,
        username: updated!.username,
        displayName: updated!.display_name,
        avatarUrl: null,
        role: updated!.role,
        status: updated!.status,
      },
    });
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to remove avatar' });
  }
});

export default router;
