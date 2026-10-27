import { Server, Socket } from 'socket.io';
import jwt from 'jsonwebtoken';
import { ENV } from '../config/env.js';
import { AuthTokenPayload } from '../types/index.js';
import { ConversationRepository } from '../repositories/conversation.repository.js';
import { PushService } from '../services/push.service.js';
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

    // Auto-deliver all pending messages to this connected user and notify senders
    ConversationRepository.markAllPendingMessagesAsDeliveredTo(userId)
      .then((affected) => {
        for (const item of affected) {
          io.to(`user:${item.senderId}`).emit('message:status_updated', {
            peerId: userId,
            conversationId: item.conversationId,
            status: 'delivered',
          });
        }
      })
      .catch((err) => {
        logger.error('Failed to auto-deliver pending messages on connect:', err.message);
      });

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

        // Dispatch background push notification if recipient is not actively connected
        if (!isRecipientConnected) {
          PushService.sendMessageNotification(recipientId, {
            id: userId,
            username: socket.user?.username || 'User',
          }).catch(() => {});
        }
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

    // Handle message reaction (like ❤️, 😂, 😮, 😢, 😡, 👍)
    socket.on('message:react', async (data: {
      messageId: string;
      emoji: string;
      action?: 'add' | 'remove' | 'toggle';
      recipientId?: string;
      conversationId?: string;
    }) => {
      try {
        const { messageId, emoji, action, recipientId, conversationId } = data;
        const result = await ConversationRepository.toggleReaction(messageId, userId, emoji, action);

        if (result.action === 'none' && !result.conversationId) {
          return;
        }

        const payload = {
          messageId,
          userId,
          emoji,
          action: result.action,
          conversationId: result.conversationId || conversationId,
          reactions: result.reactions,
        };

        // Broadcast to both conversation participants (all connected sockets for both users)
        const targetConvId = result.conversationId || conversationId;
        if (targetConvId && !targetConvId.startsWith('conv-')) {
          const conv = await ConversationRepository.getConversationById(targetConvId);
          if (conv) {
            io.to(`user:${conv.participant1_id || (conv as any).user1_id}`).to(`user:${conv.participant2_id || (conv as any).user2_id}`).emit('message:reacted', payload);
            return;
          }
        }

        // Fallback: emit to recipient room and current user room
        if (recipientId) {
          io.to(`user:${recipientId}`).emit('message:reacted', payload);
        }
        io.to(`user:${userId}`).emit('message:reacted', payload);
      } catch (err: any) {
        logger.error('Failed to handle reaction via socket:', err.message);
      }
    });

    // ==========================================
    // WebRTC E2EE Audio & Video Call Signaling
    // ==========================================

    // 1. Caller initiates an outgoing audio or video call
    socket.on('call:initiate', (data: { recipientId: string; isVideo?: boolean }) => {
      const { recipientId, isVideo } = data;
      const recipientRoom = io.sockets.adapter.rooms.get(`user:${recipientId}`);
      const isOnline = (recipientRoom?.size ?? 0) > 0;

      logger.info(`WebRTC Call initiated from ${socket.user?.username} (${userId}) to ${recipientId} [Video: ${Boolean(isVideo)}]`);

      // Dispatch Web Push notification to wake up recipient's phone/background service worker
      PushService.sendCallNotification(
        recipientId,
        { id: userId, username: socket.user?.username || 'User' },
        Boolean(isVideo)
      ).catch(() => {});

      if (isOnline) {
        io.to(`user:${recipientId}`).emit('call:incoming', {
          callerId: userId,
          callerUsername: socket.user?.username,
          isVideo: Boolean(isVideo),
        });
      }
    });

    // 2. Recipient accepts incoming call
    socket.on('call:accept', (data: { callerId: string }) => {
      logger.info(`WebRTC Call accepted by ${socket.user?.username} (${userId}) from caller ${data.callerId}`);
      io.to(`user:${data.callerId}`).emit('call:accepted', {
        recipientId: userId,
        recipientUsername: socket.user?.username,
      });
    });

    // 3. Recipient or caller rejects/declines call
    socket.on('call:reject', (data: { callerId: string; reason?: string }) => {
      logger.info(`WebRTC Call rejected by ${socket.user?.username} (${userId}) for ${data.callerId} [Reason: ${data.reason || 'declined'}]`);
      io.to(`user:${data.callerId}`).emit('call:rejected', {
        recipientId: userId,
        reason: data.reason || 'declined',
      });
    });

    // 4. Relay WebRTC SDP offer, answer, and ICE candidates between peers
    socket.on('call:signal', (data: { targetUserId: string; signalData: any; type: 'offer' | 'answer' | 'candidate' }) => {
      io.to(`user:${data.targetUserId}`).emit('call:signal', {
        senderId: userId,
        signalData: data.signalData,
        type: data.type,
      });
    });

    // 5. Either peer hangs up or ends the call
    socket.on('call:end', (data: { targetUserId: string }) => {
      logger.info(`WebRTC Call ended by ${socket.user?.username} (${userId}) with ${data.targetUserId}`);
      io.to(`user:${data.targetUserId}`).emit('call:ended', {
        endedBy: userId,
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
