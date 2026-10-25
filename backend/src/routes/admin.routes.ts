import { Router, Response } from 'express';
import { authenticate, requireAdmin, AuthenticatedRequest } from '../middleware/auth.middleware.js';
import { query } from '../config/database.js';

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
    res.json({ message: 'User status updated successfully' });
  } catch (err) {
    res.status(500).json({ error: 'Failed to update user status' });
  }
});

// View security audit logs
router.get('/audit-logs', async (_req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const logs = await query<any[]>('SELECT * FROM audit_logs ORDER BY created_at DESC LIMIT 100');
    res.json({ logs });
  } catch (err) {
    res.status(500).json({ error: 'Failed to retrieve audit logs' });
  }
});

export default router;
