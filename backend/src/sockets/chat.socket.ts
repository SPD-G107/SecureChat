import { Server, Socket } from 'socket.io';
import jwt from 'jsonwebtoken';
import { ENV } from '../config/env.js';
import { AuthTokenPayload } from '../types/index.js';
import { ConversationRepository } from '../repositories/conversation.repository.js';
import { logger } from '../utils/logger.js';

interface AuthenticatedSocket extends Socket {
  user?: AuthTokenPayload;
}

// Global active presence tracker: userId -> active connection count
const onlineUsers = new Map<string, number>();

export const getOnlineUserIds = (): string[] => {
  return Array.from(onlineUsers.keys());
};

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

    // Track real online presence
    const currentCount = onlineUsers.get(userId) || 0;
    onlineUsers.set(userId, currentCount + 1);

    logger.info(`User connected to real-time messaging: ${socket.user?.username} (${userId}) [Active: ${currentCount + 1}]`);

    // Join user's personal delivery room
    socket.join(`user:${userId}`);

    // Broadcast user presence to all connected clients if this is their first connection
    if (currentCount === 0) {
      io.emit('user:presence', { userId, username: socket.user?.username, status: 'online' });
    }

    // Send the full list of currently online user IDs to the newly connected socket
    socket.emit('users:online_list', Array.from(onlineUsers.keys()));

    socket.on('message:send', async (data: {
      clientTempId?: string;
      conversationId?: string;
      recipientId: string;
      plaintext?: string;
      encryptedPayload: string;
      iv: string;
      macTag: string;
      ephemeralPublicKey?: string;
    }) => {
      try {
        const { recipientId, encryptedPayload, iv, macTag, ephemeralPublicKey, plaintext, clientTempId } = data;
        let targetConvId = data.conversationId;

        // Verify or auto-create conversation between sender and recipient
        let isParticipant = targetConvId ? await ConversationRepository.isParticipant(targetConvId, userId) : false;
        if (!isParticipant) {
          const conv = await ConversationRepository.findOrCreateConversation(userId, recipientId);
          targetConvId = conv.id;
        }

        // Check if recipient is currently online in real-time
        const recipientRoom = io.sockets.adapter.rooms.get(`user:${recipientId}`);
        const isRecipientConnected = (recipientRoom?.size ?? 0) > 0;
        const initialStatus: 'sent' | 'delivered' = isRecipientConnected ? 'delivered' : 'sent';

        // Store encrypted message in MySQL (zero plaintext saved in database)
        const saved = await ConversationRepository.saveEncryptedMessage({
          conversationId: targetConvId as string,
          senderId: userId,
          encryptedPayload,
          iv,
          macTag,
          ephemeralPublicKey,
          deliveryStatus: initialStatus,
        });

        logger.info(`E2EE Ciphertext relayed from ${socket.user?.username} (${userId}) to ${recipientId} [Status: ${initialStatus}]`);

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
          status: initialStatus,
        });

        // Acknowledge delivery to sender with accurate status and correlation ID
        socket.emit('message:sent', {
          clientTempId,
          messageId: saved.id,
          conversationId: targetConvId,
          status: initialStatus,
        });
      } catch (err: any) {
        logger.error('Failed to relay encrypted message:', err.message);
        socket.emit('message:error', { error: 'Failed to deliver message' });
      }
    });

    // Handle delivery acknowledgment from recipient device
    socket.on('message:delivered', async (data: { messageId?: string; senderId: string; conversationId?: string }) => {
      let resolvedConvId = data.conversationId;
      try {
        if (data.messageId) {
          await ConversationRepository.updateMessageStatus(data.messageId, 'delivered');
        }
        if (data.senderId) {
          const cid = await ConversationRepository.markMessagesAsDeliveredBetween(userId, data.senderId);
          if (cid) resolvedConvId = cid;
        } else if (data.conversationId) {
          await ConversationRepository.markConversationAsDelivered(data.conversationId, userId);
        }
      } catch (err: any) {
        logger.error('Failed to persist delivered status in MySQL:', err.message);
      }

      io.to(`user:${data.senderId}`).emit('message:status_updated', {
        messageId: data.messageId,
        conversationId: resolvedConvId,
        peerId: userId,
        status: 'delivered',
      });
    });

    // Handle read receipt when recipient views/opens the message
    socket.on('message:read', async (data: { messageId?: string; senderId: string; conversationId?: string }) => {
      let resolvedConvId = data.conversationId;
      try {
        if (data.messageId) {
          await ConversationRepository.updateMessageStatus(data.messageId, 'read');
        }
        if (data.senderId) {
          const cid = await ConversationRepository.markMessagesAsReadBetween(userId, data.senderId);
          if (cid) resolvedConvId = cid;
        } else if (data.conversationId) {
          await ConversationRepository.markConversationAsRead(data.conversationId, userId);
        }
      } catch (err: any) {
        logger.error('Failed to persist read status in MySQL:', err.message);
      }

      io.to(`user:${data.senderId}`).emit('message:status_updated', {
        messageId: data.messageId,
        conversationId: resolvedConvId,
        peerId: userId,
        status: 'read',
      });
    });

    socket.on('disconnect', () => {
      const remaining = (onlineUsers.get(userId) || 1) - 1;
      if (remaining <= 0) {
        onlineUsers.delete(userId);
        io.emit('user:presence', { userId, username: socket.user?.username, status: 'offline' });
        logger.info(`User fully offline: ${socket.user?.username} (${userId})`);
      } else {
        onlineUsers.set(userId, remaining);
      }
    });
  });
};
