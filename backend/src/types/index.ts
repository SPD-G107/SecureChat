export type UserRole = 'user' | 'admin';
export type UserStatus = 'active' | 'suspended';

export interface User {
  id: string;
  username: string;
  password_hash: string;
  display_name?: string | null;
  avatar_url?: string | null;
  role: UserRole;
  status: UserStatus;
  created_at: Date;
  updated_at: Date;
}

export interface PublicKeyRecord {
  id: string;
  user_id: string;
  public_key: string;
  version: number;
  fingerprint: string;
  created_at: Date;
  updated_at: Date;
}

export interface AuthTokenPayload {
  userId: string;
  username: string;
  role: UserRole;
}

export interface Conversation {
  id: string;
  participant1_id: string;
  participant2_id: string;
  created_at: Date;
  updated_at: Date;
}

export interface MessageRecord {
  id: string;
  conversation_id: string;
  sender_id: string;
  encrypted_payload: string;
  initialization_vector: string;
  mac_tag: string;
  ephemeral_public_key?: string | null;
  delivery_status: 'sent' | 'delivered' | 'read';
  is_edited?: boolean;
  created_at: Date;
}
