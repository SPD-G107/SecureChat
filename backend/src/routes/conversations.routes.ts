import { Router, Response } from 'express';
import { authenticate, AuthenticatedRequest } from '../middleware/auth.middleware.js';
import { ConversationRepository } from '../repositories/conversation.repository.js';

const router = Router();

router.use(authenticate);

// List active conversations
router.get('/', async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const list = await ConversationRepository.findUserConversations(req.user!.userId);
    res.json({ conversations: list });
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to retrieve conversations' });
  }
});

// Start or get one-to-one conversation
router.post('/', async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { contactId } = req.body;
    if (!contactId) {
      res.status(400).json({ error: 'Contact identifier is required' });
      return;
    }

    if (contactId === req.user!.userId) {
      res.status(400).json({ error: 'Cannot start conversation with yourself' });
      return;
    }

    const conversation = await ConversationRepository.findOrCreateConversation(
      req.user!.userId,
      contactId
    );
    res.status(201).json({ conversation });
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to initiate conversation' });
  }
});

export default router;
