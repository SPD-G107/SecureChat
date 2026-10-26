import { Router, Response } from 'express';
import { authenticate, requireAdmin, AuthenticatedRequest } from '../middleware/auth.middleware.js';
import { query } from '../config/database.js';
import { AuditRepository } from '../repositories/audit.repository.js';

import { UserRepository } from '../repositories/user.repository.js';

const router = Router();

router.use(authenticate);
router.use(requireAdmin);

// View all registered users
router.get('/users', async (_req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const users = await query<any[]>(
      'SELECT id, username, display_name, role, status, created_at FROM users ORDER BY created_at DESC'
    );
    res.json({ users });
  } catch (err) {
    res.status(500).json({ error: 'Failed to retrieve users' });
  }
});

// Update user status (suspend/activate)
router.patch('/users/:id/status', async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    if (!['active', 'suspended'].includes(status)) {
      res.status(400).json({ error: 'Invalid status value' });
      return;
    }

    await query('UPDATE users SET status = ? WHERE id = ?', [status, id]);

    // Audit log administrative status change
    await AuditRepository.logEvent({
      userId: req.user!.userId,
      action: 'ADMIN_USER_STATUS_CHANGE',
      ipAddress: req.ip,
      userAgent: req.headers['user-agent'],
      details: {
        targetUserId: id,
        newStatus: status,
      },
    });

    res.json({ message: 'User status updated successfully' });
  } catch (err) {
    res.status(500).json({ error: 'Failed to update user status' });
  }
});

// View security audit logs (zero plaintext/secrets)
router.get('/audit-logs', async (_req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const logs = await AuditRepository.getRecentLogs(100);
    res.json({ logs });
  } catch (err) {
    res.status(500).json({ error: 'Failed to retrieve audit logs' });
  }
});

// Permanently delete user account
router.delete('/users/:id', async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    if (id === req.user!.userId) {
      res.status(400).json({ error: 'Cannot delete your own admin account' });
      return;
    }

    const user = await UserRepository.findById(id);
    if (!user) {
      res.status(404).json({ error: 'User not found' });
      return;
    }

    // Cascade delete user and all associated keys, messages, conversations
    await query('DELETE FROM users WHERE id = ?', [id]);

    await AuditRepository.logEvent({
      userId: req.user!.userId,
      action: 'ADMIN_DELETE_USER',
      ipAddress: req.ip,
      userAgent: req.headers['user-agent'],
      details: {
        deletedUserId: id,
        deletedUsername: user.username,
      },
    });

    const io = req.app.get('io');
    if (io) {
      io.emit('user:deleted', { userId: id, username: user.username });
    }

    res.json({ message: `User @${user.username} deleted permanently` });
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to delete user account' });
  }
});

export default router;
