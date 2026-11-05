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

// Mark messages in a conversation as read
router.patch('/:conversationId/read', async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { conversationId } = req.params;
    await ConversationRepository.markConversationAsRead(conversationId, req.user!.userId);
    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to mark messages as read' });
  }
});

// Edit sent message
router.patch('/:messageId', async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { messageId } = req.params;
    const { encryptedPayload, iv, macTag } = req.body;

    if (!encryptedPayload || !iv || !macTag) {
      res.status(400).json({ error: 'Encrypted payload, IV, and macTag are required' });
      return;
    }

    const updated = await ConversationRepository.editMessage(
      messageId,
      req.user!.userId,
      encryptedPayload,
      iv,
      macTag
    );

    if (!updated) {
      res.status(404).json({ error: 'Message not found or you are not authorized to edit it' });
      return;
    }

    const io = req.app.get('io');
    if (io) {
      const editPayload = {
        messageId: updated.id,
        conversationId: updated.conversation_id,
        senderId: updated.sender_id,
        encryptedPayload: updated.encrypted_payload,
        iv: updated.initialization_vector,
        macTag: updated.mac_tag,
        isEdited: true,
      };
      const conv = await ConversationRepository.getConversationById(updated.conversation_id);
      if (conv) {
        const p1 = conv.participant1_id || (conv as any).user1_id;
        const p2 = conv.participant2_id || (conv as any).user2_id;
        io.to(`user:${p1}`).to(`user:${p2}`).emit('message:edited', editPayload);
      } else {
        io.to(`user:${req.user!.userId}`).emit('message:edited', editPayload);
      }
    }

    res.json({ message: 'Message updated successfully', updatedMessage: updated });
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to update message' });
  }
});

// Delete individual message (Delete for everyone)
router.delete('/:messageId', async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { messageId } = req.params;
    const result = await ConversationRepository.deleteMessage(messageId, req.user!.userId);

    if (!result) {
      res.status(404).json({ error: 'Message not found or you are not authorized to delete it' });
      return;
    }

    const io = req.app.get('io');
    if (io) {
      const deletePayload = {
        messageId,
        conversationId: result.conversationId,
        deletedBy: req.user!.userId,
      };
      const conv = result.conversationId
        ? await ConversationRepository.getConversationById(result.conversationId)
        : null;
      if (conv) {
        const p1 = conv.participant1_id || (conv as any).user1_id;
        const p2 = conv.participant2_id || (conv as any).user2_id;
        io.to(`user:${p1}`).to(`user:${p2}`).emit('message:deleted', deletePayload);
      } else {
        io.to(`user:${req.user!.userId}`).emit('message:deleted', deletePayload);
      }
    }

    res.json({ message: 'Message deleted successfully', messageId });
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to delete message' });
  }
});

// Clear all messages in a conversation
router.delete('/conversation/:conversationId', async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { conversationId } = req.params;
    const conv = await ConversationRepository.getConversationById(conversationId);
    const cleared = await ConversationRepository.clearConversationMessages(conversationId, req.user!.userId);

    if (!cleared) {
      res.status(403).json({ error: 'Access denied: You are not a participant in this conversation' });
      return;
    }

    const io = req.app.get('io');
    if (io) {
      const clearPayload = {
        conversationId,
        clearedBy: req.user!.userId,
      };
      if (conv) {
        const p1 = conv.participant1_id || (conv as any).user1_id;
        const p2 = conv.participant2_id || (conv as any).user2_id;
        io.to(`user:${p1}`).to(`user:${p2}`).emit('conversation:cleared', clearPayload);
      } else {
        io.to(`user:${req.user!.userId}`).emit('conversation:cleared', clearPayload);
      }
    }

    res.json({ message: 'Conversation cleared successfully', conversationId });
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to clear conversation' });
  }
});

// Toggle message reaction (❤️, 😂, 😮, 😢, 😡, 👍)
router.post('/:messageId/react', async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { messageId } = req.params;
    const { emoji, action } = req.body;
    const userId = req.user!.userId;

    if (!emoji || typeof emoji !== 'string') {
      res.status(400).json({ error: 'Emoji is required' });
      return;
    }

    const result = await ConversationRepository.toggleReaction(messageId, userId, emoji, action);

    if (result.action === 'none' && !result.conversationId) {
      res.status(404).json({ error: 'Message not found' });
      return;
    }

    const io = req.app.get('io');
    if (io) {
      const payload = {
        messageId,
        userId,
        emoji,
        action: result.action,
        conversationId: result.conversationId,
        reactions: result.reactions,
      };

      if (result.conversationId && !result.conversationId.startsWith('conv-')) {
        const conv = await ConversationRepository.getConversationById(result.conversationId);
        if (conv) {
          io.to(`user:${conv.participant1_id || (conv as any).user1_id}`).to(`user:${conv.participant2_id || (conv as any).user2_id}`).emit('message:reacted', payload);
        } else {
          io.emit('message:reacted', payload);
        }
      } else {
        io.emit('message:reacted', payload);
      }
    }

    res.json({ success: true, ...result });
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to react to message' });
  }
});

export default router;
