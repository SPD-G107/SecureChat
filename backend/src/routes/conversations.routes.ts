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

// Delete conversation (clears conversation and associated messages from sidebar)
router.delete('/:id', async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const deleted = await ConversationRepository.deleteConversation(id, req.user!.userId);

    if (!deleted) {
      res.status(403).json({ error: 'Access denied: You are not a participant in this conversation' });
      return;
    }

    const io = req.app.get('io');
    if (io) {
      io.emit('conversation:deleted', {
        conversationId: id,
        deletedBy: req.user!.userId,
      });
    }

    res.json({ message: 'Conversation deleted successfully', conversationId: id });
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to delete conversation' });
  }
});

export default router;
