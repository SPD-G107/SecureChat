import { Server, Socket } from 'socket.io';
import jwt from 'jsonwebtoken';
import { ENV } from '../config/env.js';
import { AuthTokenPayload } from '../types/index.js';
import { ConversationRepository } from '../repositories/conversation.repository.js';
import { logger } from '../utils/logger.js';

interface AuthenticatedSocket extends Socket {
  user?: AuthTokenPayload;
}

export const setupChatSockets = (io: Server) => {
  // Socket.IO authentication middleware
  io.use((socket: AuthenticatedSocket, next) => {
    const token = socket.handshake.auth?.token || socket.handshake.headers?.authorization?.split(' ')[1];
    if (!token) {
      return next(new Error('Authentication required'));
    }

    try {
      const decoded = jwt.verify(token, ENV.JWT_SECRET) as AuthTokenPayload;
      socket.user = decoded;
      next();
    } catch (err) {
      next(new Error('Invalid authentication token'));
    }
  });

  io.on('connection', (socket: AuthenticatedSocket) => {
    const userId = socket.user?.userId;
    if (!userId) return;

    logger.info(`User connected to real-time messaging: ${socket.user?.username} (${userId})`);

    // Join user's personal delivery room
    socket.join(`user:${userId}`);

    socket.on('message:send', async (data: {
      conversationId?: string;
      recipientId: string;
      plaintext?: string;
      encryptedPayload: string;
      iv: string;
      macTag: string;
      ephemeralPublicKey?: string;
    }) => {
      try {
        const { recipientId, encryptedPayload, iv, macTag, ephemeralPublicKey, plaintext } = data;
        let targetConvId = data.conversationId;

        // Verify or auto-create conversation between sender and recipient
        let isParticipant = targetConvId ? await ConversationRepository.isParticipant(targetConvId, userId) : false;
        if (!isParticipant) {
          const conv = await ConversationRepository.findOrCreateConversation(userId, recipientId);
          targetConvId = conv.id;
        }

        // Store encrypted message in MySQL (zero plaintext saved in database)
        const saved = await ConversationRepository.saveEncryptedMessage({
          conversationId: targetConvId as string,
          senderId: userId,
          encryptedPayload,
          iv,
          macTag,
          ephemeralPublicKey,
        });

        logger.info(`E2EE Ciphertext relayed from ${socket.user?.username} (${userId}) to ${recipientId}`);

        // Relay to recipient's personal room with normalized fields
        io.to(`user:${recipientId}`).emit('message:received', {
          id: saved.id,
          conversationId: saved.conversation_id,
          conversation_id: saved.conversation_id,
          senderId: userId,
          sender_id: userId,
          recipientId,
          plaintext: plaintext || '',
          encryptedPayload: saved.encrypted_payload,
          encrypted_payload: saved.encrypted_payload,
          iv: saved.initialization_vector,
          initialization_vector: saved.initialization_vector,
          macTag: saved.mac_tag,
          mac_tag: saved.mac_tag,
          createdAt: saved.created_at,
          created_at: saved.created_at,
        });

        // Acknowledge delivery to sender
        socket.emit('message:sent', { messageId: saved.id, conversationId: targetConvId });
      } catch (err: any) {
        logger.error('Failed to relay encrypted message:', err.message);
        socket.emit('message:error', { error: 'Failed to deliver message' });
      }
    });

    socket.on('disconnect', () => {
      logger.info(`User disconnected: ${socket.user?.username}`);
    });
  });
};
