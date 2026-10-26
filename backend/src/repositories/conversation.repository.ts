import { query } from '../config/database.js';
import { Conversation, MessageRecord } from '../types/index.js';
import { v4 as uuidv4 } from 'uuid';

export class ConversationRepository {
  /**
   * Finds or creates a one-to-one conversation between two users
   */
  static async findOrCreateConversation(userA: string, userB: string): Promise<Conversation> {
    const [p1, p2] = [userA, userB].sort();

    const existing = await query<Conversation[]>(
      'SELECT * FROM conversations WHERE participant1_id = ? AND participant2_id = ? LIMIT 1',
      [p1, p2]
    );

    if (existing.length > 0) {
      return existing[0];
    }

    const id = uuidv4();
    await query(
      'INSERT INTO conversations (id, participant1_id, participant2_id) VALUES (?, ?, ?)',
      [id, p1, p2]
    );

    const rows = await query<Conversation[]>('SELECT * FROM conversations WHERE id = ?', [id]);
    return rows[0];
  }

  static async findUserConversations(userId: string): Promise<any[]> {
    const rows = await query<any[]>(
      `SELECT c.id, c.created_at, c.updated_at,
              u.id as peer_id, u.username as peer_username, u.display_name as peer_display_name, u.avatar_url as peer_avatar_url,
              (SELECT m.encrypted_payload FROM messages m WHERE m.conversation_id = c.id ORDER BY m.created_at DESC LIMIT 1) as last_encrypted_payload,
              (SELECT m.created_at FROM messages m WHERE m.conversation_id = c.id ORDER BY m.created_at DESC LIMIT 1) as last_message_at
       FROM conversations c
       JOIN users u ON (u.id = CASE WHEN c.participant1_id = ? THEN c.participant2_id ELSE c.participant1_id END)
       WHERE c.participant1_id = ? OR c.participant2_id = ?
       ORDER BY c.updated_at DESC`,
      [userId, userId, userId]
    );
    return rows;
  }

  static async isParticipant(conversationId: string, userId: string): Promise<boolean> {
    const rows = await query<Conversation[]>(
      'SELECT id FROM conversations WHERE id = ? AND (participant1_id = ? OR participant2_id = ?)',
      [conversationId, userId, userId]
    );
    return rows.length > 0;
  }

  static async saveEncryptedMessage(data: {
    conversationId: string;
    senderId: string;
    encryptedPayload: string;
    iv: string;
    macTag: string;
    ephemeralPublicKey?: string;
    deliveryStatus?: 'sent' | 'delivered' | 'read';
  }): Promise<MessageRecord> {
    const id = uuidv4();
    const status = data.deliveryStatus || 'sent';
    await query(
      `INSERT INTO messages (id, conversation_id, sender_id, encrypted_payload, initialization_vector, mac_tag, ephemeral_public_key, delivery_status)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [id, data.conversationId, data.senderId, data.encryptedPayload, data.iv, data.macTag, data.ephemeralPublicKey || null, status]
    );

    // Update conversation timestamp
    await query('UPDATE conversations SET updated_at = CURRENT_TIMESTAMP WHERE id = ?', [data.conversationId]);

    const rows = await query<MessageRecord[]>('SELECT * FROM messages WHERE id = ?', [id]);
    return rows[0];
  }

  static async getMessagesByConversation(conversationId: string, limit = 100): Promise<MessageRecord[]> {
    const rows = await query<MessageRecord[]>(
      `SELECT id, conversation_id, sender_id, encrypted_payload, initialization_vector, mac_tag, ephemeral_public_key, delivery_status, is_edited, created_at
       FROM messages
       WHERE conversation_id = ?
       ORDER BY created_at ASC
       LIMIT ?`,
      [conversationId, limit]
    );
    return rows;
  }

  static async updateMessageStatus(messageId: string, status: 'sent' | 'delivered' | 'read'): Promise<void> {
    await query('UPDATE messages SET delivery_status = ? WHERE id = ?', [status, messageId]);
  }

  static async markConversationAsRead(conversationId: string, readerId: string): Promise<void> {
    await query(
      'UPDATE messages SET delivery_status = "read" WHERE conversation_id = ? AND sender_id != ?',
      [conversationId, readerId]
    );
  }

  static async markConversationAsDelivered(conversationId: string, recipientId: string): Promise<void> {
    await query(
      'UPDATE messages SET delivery_status = "delivered" WHERE conversation_id = ? AND sender_id != ? AND delivery_status = "sent"',
      [conversationId, recipientId]
    );
  }

  static async markMessagesAsReadBetween(readerId: string, senderId: string): Promise<string | null> {
    const conv = await this.findOrCreateConversation(readerId, senderId);
    if (conv) {
      await this.markConversationAsRead(conv.id, readerId);
      return conv.id;
    }
    return null;
  }

  static async markMessagesAsDeliveredBetween(recipientId: string, senderId: string): Promise<string | null> {
    const conv = await this.findOrCreateConversation(recipientId, senderId);
    if (conv) {
      await this.markConversationAsDelivered(conv.id, recipientId);
      return conv.id;
    }
    return null;
  }

  static async editMessage(
    messageId: string,
    senderId: string,
    encryptedPayload: string,
    iv: string,
    macTag: string
  ): Promise<MessageRecord | null> {
    await query(
      `UPDATE messages 
       SET encrypted_payload = ?, initialization_vector = ?, mac_tag = ?, is_edited = TRUE 
       WHERE id = ? AND sender_id = ?`,
      [encryptedPayload, iv, macTag, messageId, senderId]
    );
    const rows = await query<MessageRecord[]>('SELECT * FROM messages WHERE id = ?', [messageId]);
    return rows[0] || null;
  }

  static async deleteMessage(
    messageId: string,
    userId: string
  ): Promise<{ conversationId: string; senderId: string; deleted: boolean } | null> {
    const rows = await query<any[]>('SELECT id, conversation_id, sender_id FROM messages WHERE id = ?', [messageId]);
    if (!rows || rows.length === 0) return null;
    const msg = rows[0];
    if (msg.sender_id !== userId) return null;

    await query('DELETE FROM messages WHERE id = ?', [messageId]);
    return { conversationId: msg.conversation_id, senderId: msg.sender_id, deleted: true };
  }

  static async clearConversationMessages(conversationId: string, userId: string): Promise<boolean> {
    const isMember = await this.isParticipant(conversationId, userId);
    if (!isMember) return false;
    await query('DELETE FROM messages WHERE conversation_id = ?', [conversationId]);
    return true;
  }

  static async deleteConversation(conversationId: string, userId: string): Promise<boolean> {
    const isMember = await this.isParticipant(conversationId, userId);
    if (!isMember) return false;
    await query('DELETE FROM conversations WHERE id = ?', [conversationId]);
    return true;
  }

  static async getConversationById(conversationId: string): Promise<Conversation | null> {
    const rows = await query<Conversation[]>('SELECT * FROM conversations WHERE id = ?', [conversationId]);
    return rows[0] || null;
  }
}
