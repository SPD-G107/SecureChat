export interface User {
  id: string;
  username: string;
  displayName?: string | null;
  role: 'user' | 'admin';
  status: 'active' | 'suspended';
}

export interface Conversation {
  id: string;
  peer_id: string;
  peer_username: string;
  peer_display_name?: string | null;
  updated_at: string;
  isVerified?: boolean;
}

export interface EncryptedMessageEnvelope {
  id: string;
  conversation_id: string;
  sender_id: string;
  encrypted_payload: string;
  initialization_vector: string;
  mac_tag: string;
  ephemeral_public_key?: string | null;
  delivery_status: 'sent' | 'delivered' | 'read';
  created_at: string;
  decryptedContent?: string;
}

export interface PublicKeyInfo {
  userId: string;
  publicKey: string;
  version: number;
  fingerprint: string;
}
