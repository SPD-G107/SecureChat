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
    const conv = await ConversationRepository.getConversationById(id);
    const deleted = await ConversationRepository.deleteConversation(id, req.user!.userId);

    if (!deleted) {
      res.status(403).json({ error: 'Access denied: You are not a participant in this conversation' });
      return;
    }

    const io = req.app.get('io');
    if (io) {
      const delPayload = {
        conversationId: id,
        deletedBy: req.user!.userId,
      };
      if (conv) {
        const p1 = conv.participant1_id || (conv as any).user1_id;
        const p2 = conv.participant2_id || (conv as any).user2_id;
        io.to(`user:${p1}`).to(`user:${p2}`).emit('conversation:deleted', delPayload);
      } else {
        io.to(`user:${req.user!.userId}`).emit('conversation:deleted', delPayload);
      }
    }

    res.json({ message: 'Conversation deleted successfully', conversationId: id });
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to delete conversation' });
  }
});

export default router;
