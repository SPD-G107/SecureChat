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

    // Blind message delivery: Routes ciphertext without server-side decryption
    socket.on('message:send', async (data: {
      conversationId: string;
      recipientId: string;
      encryptedPayload: string;
      iv: string;
      macTag: string;
      ephemeralPublicKey?: string;
    }) => {
      try {
        const { conversationId, recipientId, encryptedPayload, iv, macTag, ephemeralPublicKey } = data;

        // Verify conversation membership
        const isParticipant = await ConversationRepository.isParticipant(conversationId, userId);
        if (!isParticipant) {
          socket.emit('message:error', { error: 'Unauthorized: Not a participant in conversation' });
          return;
        }

        // Store encrypted message in MySQL
        const saved = await ConversationRepository.saveEncryptedMessage({
          conversationId,
          senderId: userId,
          encryptedPayload,
          iv,
          macTag,
          ephemeralPublicKey,
        });

        // Relay ciphertext to recipient's room
        io.to(`user:${recipientId}`).emit('message:received', saved);

        // Acknowledge delivery to sender
        socket.emit('message:sent', { messageId: saved.id, conversationId });
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
