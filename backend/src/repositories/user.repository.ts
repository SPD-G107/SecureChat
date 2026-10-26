import { query } from '../config/database.js';
import { User, PublicKeyRecord } from '../types/index.js';
import { v4 as uuidv4 } from 'uuid';

export class UserRepository {
  static async findByUsername(username: string): Promise<User | null> {
    const rows = await query<User[]>(
      'SELECT id, username, password_hash, display_name, avatar_url, role, status, created_at, updated_at FROM users WHERE username = ? LIMIT 1',
      [username]
    );
    return rows[0] || null;
  }

  static async findById(id: string): Promise<User | null> {
    const rows = await query<User[]>(
      'SELECT id, username, password_hash, display_name, avatar_url, role, status, created_at, updated_at FROM users WHERE id = ? LIMIT 1',
      [id]
    );
    return rows[0] || null;
  }

  static async updateAvatar(userId: string, avatarUrl: string | null): Promise<void> {
    await query('UPDATE users SET avatar_url = ? WHERE id = ?', [avatarUrl, userId]);
  }

  static async updateDisplayName(userId: string, displayName?: string | null): Promise<void> {
    await query('UPDATE users SET display_name = ? WHERE id = ?', [displayName?.trim() || null, userId]);
  }

  static async createUser(data: {
    username: string;
    passwordHash: string;
    displayName?: string;
    role?: 'user' | 'admin';
  }): Promise<User> {
    const id = uuidv4();
    await query(
      'INSERT INTO users (id, username, password_hash, display_name, role) VALUES (?, ?, ?, ?, ?)',
      [id, data.username, data.passwordHash, data.displayName || null, data.role || 'user']
    );
    const user = await this.findById(id);
    return user!;
  }

  static async savePublicKey(userId: string, publicKey: string, fingerprint: string): Promise<PublicKeyRecord> {
    const id = uuidv4();
    // Check highest current version
    const existing = await query<PublicKeyRecord[]>(
      'SELECT version FROM public_keys WHERE user_id = ? ORDER BY version DESC LIMIT 1',
      [userId]
    );
    const version = existing.length > 0 ? existing[0].version + 1 : 1;

    await query(
      'INSERT INTO public_keys (id, user_id, public_key, version, fingerprint) VALUES (?, ?, ?, ?, ?)',
      [id, userId, publicKey, version, fingerprint]
    );

    const rows = await query<PublicKeyRecord[]>('SELECT * FROM public_keys WHERE id = ?', [id]);
    return rows[0];
  }

  static async getPublicKeyByUserId(userId: string): Promise<PublicKeyRecord | null> {
    const rows = await query<PublicKeyRecord[]>(
      'SELECT * FROM public_keys WHERE user_id = ? ORDER BY version DESC LIMIT 1',
      [userId]
    );
    return rows[0] || null;
  }

  static async searchUsers(searchQuery: string, excludeUserId: string): Promise<Array<Omit<User, 'password_hash'>>> {
    const rows = await query<Array<Omit<User, 'password_hash'>>>(
      'SELECT id, username, display_name, avatar_url, role, status, created_at FROM users WHERE id != ? AND (username LIKE ? OR display_name LIKE ?) AND status = "active" LIMIT 20',
      [excludeUserId, `%${searchQuery}%`, `%${searchQuery}%`]
    );
    return rows;
  }
}
