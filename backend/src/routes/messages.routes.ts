import { Router, Response } from 'express';
import { authenticate, AuthenticatedRequest } from '../middleware/auth.middleware.js';
import { ConversationRepository } from '../repositories/conversation.repository.js';

const router = Router();

router.use(authenticate);

// Get encrypted message history
router.get('/:conversationId', async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { conversationId } = req.params;
    const isMember = await ConversationRepository.isParticipant(conversationId, req.user!.userId);

    if (!isMember) {
      res.status(403).json({ error: 'Access denied: You are not a participant in this conversation' });
      return;
    }

    const messages = await ConversationRepository.getMessagesByConversation(conversationId);
    res.json({ messages });
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to retrieve messages' });
  }
});

export default router;
