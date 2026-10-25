export interface MockUser {
  id: string;
  username: string;
  displayName: string;
  role: 'user' | 'admin';
  status: 'active' | 'suspended';
  avatarInitials: string;
  isOnline: boolean;
  publicKeyVersion: number;
  fingerprint: string;
}

export interface MockMessage {
  id: string;
  conversationId: string;
  senderId: string;
  text: string;
  encryptedPreview: string;
  iv?: string;
  macTag?: string;
  timestamp: string;
  status: 'sent' | 'delivered' | 'read';
}

export const CURRENT_USER: MockUser = {
  id: 'u-alice',
  username: 'alice',
  displayName: 'Alice (Project Lead)',
  role: 'user',
  status: 'active',
  avatarInitials: 'AL',
  isOnline: true,
  publicKeyVersion: 1,
  fingerprint: '3910 4991 0244 9102 0941 8491 0294 0192 8410 2941 9920 1482 0110 9249 9201',
};

export const MOCK_CONTACTS: MockUser[] = [
  {
    id: 'u-bob',
    username: 'bob',
    displayName: 'Bob Jones',
    role: 'user',
    status: 'active',
    avatarInitials: 'BJ',
    isOnline: true,
    publicKeyVersion: 2, // Demonstrates key-change warning!
    fingerprint: '5420 1893 1200 1924 8192 1092 4819 2048 1920 1924 8192 0192 8410 2948 1924',
  },
  {
    id: 'u-charlie',
    username: 'charlie',
    displayName: 'Charlie Davis',
    role: 'user',
    status: 'active',
    avatarInitials: 'CD',
    isOnline: false,
    publicKeyVersion: 1,
    fingerprint: '8812 0041 9924 1192 8820 4410 9921 4402 1190 2481 9920 4410 2910 4491 0294',
  },
  {
    id: 'u-admin',
    username: 'admin',
    displayName: 'University Admin',
    role: 'admin',
    status: 'active',
    avatarInitials: 'AD',
    isOnline: true,
    publicKeyVersion: 1,
    fingerprint: '9920 1482 0110 9249 9201 3910 4991 0244 9102 0941 8491 0294 0192 8410 2941',
  },
];

export const INITIAL_MESSAGES: Record<string, MockMessage[]> = {
  'u-bob': [
    {
      id: 'm1',
      conversationId: 'conv-bob',
      senderId: 'u-bob',
      text: 'Hi Alice! Did you verify our E2EE safety number?',
      encryptedPreview: 'aGVsbG8gd29ybGQgZTJlZQ==',
      timestamp: '10:14 AM',
      status: 'read',
    },
    {
      id: 'm2',
      conversationId: 'conv-bob',
      senderId: 'u-alice',
      text: 'Yes Bob! ECDH P-256 session established with AES-256-GCM.',
      encryptedPreview: 'YXV0aGVudGljYXRlZCBlbmNyeXB0aW9u',
      timestamp: '10:15 AM',
      status: 'read',
    },
    {
      id: 'm3',
      conversationId: 'conv-bob',
      senderId: 'u-bob',
      text: 'Great, the blind server cannot read our plaintext messages.',
      encryptedPreview: 'emVyby1rbm93bGVkZ2UgcmVsYXk=',
      timestamp: '10:16 AM',
      status: 'delivered',
    },
  ],
  'u-charlie': [
    {
      id: 'm4',
      conversationId: 'conv-charlie',
      senderId: 'u-charlie',
      text: 'Hey Alice, are you ready for the security review meeting?',
      encryptedPreview: 'bWVldGluZyByZXZpZXcgc2VjdXJpdHk=',
      timestamp: 'Yesterday',
      status: 'read',
    },
  ],
  'u-admin': [
    {
      id: 'm5',
      conversationId: 'conv-admin',
      senderId: 'u-admin',
      text: 'System notice: All audit logs are clean and no secrets are leaking.',
      encryptedPreview: 'YXVkaXQgbG9ncyB2ZXJpZmllZA==',
      timestamp: 'Oct 24',
      status: 'read',
    },
  ],
};
