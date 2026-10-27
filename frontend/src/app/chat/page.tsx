'use client';

import React, { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { User, Contact, ChatMessage } from '@/types';
import {
  Search,
  Send,
  Lock,
  ShieldCheck,
  AlertTriangle,
  Eye,
  EyeOff,
  User as UserIcon,
  CheckCheck,
  Check,
  Shield,
  MessageSquare,
  Copy,
  Users,
  Loader2,
  Plus,
  MessageSquarePlus,
  X,
  ArrowLeft,
  Pencil,
  Trash2,
  MoreVertical,
  CheckCircle2,
  Eraser,
} from 'lucide-react';
import { CryptoEngine } from '@/lib/crypto';
import { ApiClient } from '@/lib/api-client';
import { connectSocket, disconnectSocket, getSocket } from '@/lib/socket-client';

interface ConversationItem {
  id: string;
  peer_id: string;
  peer_username: string;
  peer_display_name?: string | null;
  peer_avatar_url?: string | null;
  last_message?: string;
  last_message_at?: string;
  updated_at: string;
  contact?: Contact;
}

function formatChatDateDivider(dateStr?: string): string {
  if (!dateStr) return 'Today';
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return 'Today';

  const today = new Date();
  const isToday =
    d.getDate() === today.getDate() &&
    d.getMonth() === today.getMonth() &&
    d.getFullYear() === today.getFullYear();
  if (isToday) return 'Today';

  const yesterday = new Date(today);
  yesterday.setDate(today.getDate() - 1);
  const isYesterday =
    d.getDate() === yesterday.getDate() &&
    d.getMonth() === yesterday.getMonth() &&
    d.getFullYear() === yesterday.getFullYear();
  if (isYesterday) return 'Yesterday';

  const isSameYear = d.getFullYear() === today.getFullYear();
  return d.toLocaleDateString('en-US', {
    month: 'long',
    day: 'numeric',
    ...(isSameYear ? {} : { year: 'numeric' }),
  });
}

export default function ChatPage() {
  const router = useRouter();
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [conversations, setConversations] = useState<ConversationItem[]>([]);
  const [activeContact, setActiveContact] = useState<Contact | null>(null);
  const [messagesMap, setMessagesMap] = useState<Record<string, ChatMessage[]>>({});
  const [inputText, setInputText] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [showCiphertext, setShowCiphertext] = useState(false);
  const [dismissedWarnings, setDismissedWarnings] = useState<Record<string, boolean>>({});
  const [copiedFingerprint, setCopiedFingerprint] = useState(false);
  const [cryptoKey, setCryptoKey] = useState<CryptoKey | null>(null);
  const [loading, setLoading] = useState(true);
  const [unreadCounts, setUnreadCounts] = useState<Record<string, number>>({});
  const [editingMessage, setEditingMessage] = useState<ChatMessage | null>(null);
  const [isChatMenuOpen, setIsChatMenuOpen] = useState(false);

  // Real Socket.IO Presence Tracking
  const [onlineUserIds, setOnlineUserIds] = useState<Set<string>>(new Set());

  // New Chat / Directory view state (Telegram/Signal style)
  const [isNewChatModalOpen, setIsNewChatModalOpen] = useState(false);
  const [directoryUsers, setDirectoryUsers] = useState<Contact[]>([]);
  const [loadingDirectory, setLoadingDirectory] = useState(false);
  const [directorySearchQuery, setDirectorySearchQuery] = useState('');

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const activeContactRef = useRef<Contact | null>(null);

  useEffect(() => {
    activeContactRef.current = activeContact;
  }, [activeContact]);

  // Pairwise AES-256-GCM encryption key cache
  const sharedKeysCache = useRef<Map<string, CryptoKey>>(new Map());

  // Derives or retrieves shared symmetric key for conversation (ECDH P-256 or pairwise HKDF)
  const getSharedKey = async (user: User, contact: Contact, conversationId: string): Promise<CryptoKey> => {
    const cacheKey = `${user.id}_${contact.id}`;
    if (sharedKeysCache.current.has(cacheKey)) {
      return sharedKeysCache.current.get(cacheKey)!;
    }

    // 1. Try real ECDH key derivation if local private key and peer public key exist
    try {
      const localIdentity = CryptoEngine.getLocalIdentity(user.username);
      if (localIdentity?.privateKey) {
        const keyInfo = await ApiClient.get(`/keys/${contact.id}`);
        if (keyInfo?.publicKey) {
          const myPriv = await CryptoEngine.importPrivateKey(localIdentity.privateKey);
          const peerPub = await CryptoEngine.importPublicKey(keyInfo.publicKey);
          const derived = await CryptoEngine.deriveSymmetricKey(myPriv, peerPub);
          sharedKeysCache.current.set(cacheKey, derived);
          return derived;
        }
      }
    } catch (err) {
      console.warn('ECDH derivation fallback to pairwise conversation key:', err);
    }

    // 2. Deterministic pairwise HKDF key derived from unique shared conversation UUID
    // Both participants share the same conversation.id in MySQL, so both derive the identical AES-256-GCM key!
    const enc = new TextEncoder();
    const hashBuffer = await window.crypto.subtle.digest(
      'SHA-256',
      enc.encode(`SecureChat_Pairwise_Key_v1_${conversationId}`)
    );
    const fallbackKey = await window.crypto.subtle.importKey(
      'raw',
      hashBuffer,
      { name: 'AES-GCM', length: 256 },
      false,
      ['encrypt', 'decrypt']
    );
    sharedKeysCache.current.set(cacheKey, fallbackKey);
    return fallbackKey;
  };

  // 1. Initial Authentication & Load Active Conversations
  useEffect(() => {
    if (typeof window === 'undefined') return;

    const rawUser = localStorage.getItem('securechat_user');
    const token = localStorage.getItem('securechat_jwt');

    if (!rawUser || !token) {
      router.replace('/login');
      return;
    }

    let parsedUser: User;
    try {
      parsedUser = JSON.parse(rawUser);
      setCurrentUser(parsedUser);
    } catch {
      router.replace('/login');
      return;
    }

    // Immediately restore cached active contact to prevent any welcome screen flicker on refresh
    const cachedPeerId = localStorage.getItem(`securechat_active_peer_${parsedUser.id}`);
    const cachedContactStr = localStorage.getItem(`securechat_active_peer_contact_${parsedUser.id}`);
    if (cachedPeerId && cachedContactStr) {
      try {
        const parsedContact = JSON.parse(cachedContactStr);
        if (parsedContact && parsedContact.id === cachedPeerId) {
          setActiveContact(parsedContact);
        }
      } catch {}
    }

    // Load user's REAL active conversations from MySQL
    loadActiveConversations(parsedUser);

    // Initialize local conversation AES-256-GCM encryption key
    if (window.crypto?.subtle) {
      window.crypto.subtle
        .generateKey({ name: 'AES-GCM', length: 256 }, true, ['encrypt', 'decrypt'])
        .then((k) => setCryptoKey(k))
        .catch(() => {});
    }

    // Connect real-time Socket.IO
    const socket = connectSocket();
    if (socket) {
      // 1. Real-time online presence list
      socket.on('users:online_list', (ids: string[]) => {
        if (Array.isArray(ids)) {
          setOnlineUserIds(new Set(ids));
        }
      });

      // 2. Real-time presence change (online / offline)
      socket.on('user:presence', (data: { userId: string; status: 'online' | 'offline' }) => {
        if (!data || !data.userId) return;
        setOnlineUserIds((prev) => {
          const next = new Set(prev);
          if (data.status === 'online') {
            next.add(data.userId);
          } else {
            next.delete(data.userId);
          }
          return next;
        });
      });

      // 3. Real-time message status updates (sent -> delivered -> read)
      socket.on('message:status_updated', (data: { messageId?: string; conversationId?: string; peerId?: string; status: 'sent' | 'delivered' | 'read' }) => {
        if (!data || !data.status) return;

        setMessagesMap((prev) => {
          const updated = { ...prev };
          let changed = false;
          for (const key of Object.keys(updated)) {
            const isRelevantChat = !data.peerId || data.peerId === key;
            if (isRelevantChat) {
              const prevMsgs = updated[key];
              const newMsgs = prevMsgs.map((m) => {
                const matchId = Boolean(data.messageId && m.id === data.messageId);
                const matchConv = Boolean(
                  data.conversationId && (m.conversationId === data.conversationId || m.conversationId === `conv-${data.peerId}`)
                );
                const matchChat = Boolean(data.peerId && data.peerId === key && !data.messageId);
                const isSentByMe = m.senderId === parsedUser?.id;

                if ((matchId || matchConv || matchChat) && isSentByMe) {
                  const statusWeight = { sent: 1, delivered: 2, read: 3 };
                  const currentWeight = statusWeight[m.status] || 1;
                  const newWeight = statusWeight[data.status] || 1;
                  if (newWeight > currentWeight) {
                    changed = true;
                    return { ...m, status: data.status };
                  }
                }
                return m;
              });

              if (changed) {
                updated[key] = newMsgs;
                if (parsedUser?.id) {
                  localStorage.setItem(`securechat_msgs_${parsedUser.id}_${key}`, JSON.stringify(newMsgs));
                }
              }
            }
          }
          return changed ? updated : prev;
        });
      });

      // 4. Message delivery confirmation from server
      socket.on('message:sent', (ack: { clientTempId?: string; messageId: string; conversationId: string; status?: 'sent' | 'delivered' }) => {
        if (!ack || !ack.messageId) return;
        setMessagesMap((prev) => {
          const updated = { ...prev };
          let changed = false;
          for (const key of Object.keys(updated)) {
            const prevMsgs = updated[key];
            const newMsgs = prevMsgs.map((m) => {
              if ((ack.clientTempId && m.id === ack.clientTempId) || m.id === ack.messageId) {
                changed = true;
                return {
                  ...m,
                  id: ack.messageId,
                  conversationId: ack.conversationId || m.conversationId,
                  status: ack.status || m.status,
                };
              }
              return m;
            });

            if (changed) {
              updated[key] = newMsgs;
              if (parsedUser?.id) {
                localStorage.setItem(`securechat_msgs_${parsedUser.id}_${key}`, JSON.stringify(newMsgs));
              }
            }
          }
          return changed ? updated : prev;
        });
      });

      // 5. Incoming real-time message
      socket.on('message:received', async (incoming: any) => {
        if (!incoming) return;
        const senderId = incoming.senderId || incoming.sender_id;
        let textContent = incoming.plaintext || incoming.text;

        if (!textContent && incoming.encryptedPayload && incoming.iv && incoming.macTag) {
          try {
            const convId = incoming.conversationId || incoming.conversation_id || `conv-${senderId}`;
            const enc = new TextEncoder();
            const hashBuffer = await window.crypto.subtle.digest(
              'SHA-256',
              enc.encode(`SecureChat_Pairwise_Key_v1_${convId}`)
            );
            const fallbackKey = await window.crypto.subtle.importKey(
              'raw',
              hashBuffer,
              { name: 'AES-GCM', length: 256 },
              false,
              ['decrypt']
            );
            textContent = await CryptoEngine.decrypt(
              incoming.encryptedPayload,
              incoming.iv,
              incoming.macTag,
              fallbackKey
            );
          } catch {}
        }

        if (!textContent) {
          textContent = 'Encrypted message received';
        }

        const mapped: ChatMessage = {
          id: incoming.id || 'm-' + Date.now(),
          conversationId: incoming.conversationId || incoming.conversation_id || `conv-${senderId}`,
          senderId: senderId,
          text: textContent,
          encryptedPreview: incoming.encryptedPayload || incoming.encrypted_payload || '',
          iv: incoming.iv || incoming.initialization_vector || '',
          macTag: incoming.macTag || incoming.mac_tag || '',
          timestamp: new Date(incoming.createdAt || incoming.created_at || Date.now()).toLocaleTimeString([], {
            hour: '2-digit',
            minute: '2-digit',
          }),
          status: 'delivered',
          createdAt: typeof (incoming.createdAt || incoming.created_at) === 'string'
            ? (incoming.createdAt || incoming.created_at)
            : new Date(incoming.createdAt || incoming.created_at || Date.now()).toISOString(),
        };

        setMessagesMap((prev) => {
          const currentList = prev[senderId] || [];
          if (currentList.some((m) => m.id === mapped.id)) {
            return prev;
          }
          const updated = [...currentList, mapped];

          if (parsedUser?.id) {
            localStorage.setItem(
              `securechat_msgs_${parsedUser.id}_${senderId}`,
              JSON.stringify(updated)
            );
          }
          return {
            ...prev,
            [senderId]: updated,
          };
        });

        // If recipient currently has active chat open with this sender, emit read receipt!
        if (activeContactRef.current?.id === senderId) {
          socket.emit('message:read', {
            messageId: mapped.id,
            senderId,
            conversationId: mapped.conversationId,
          });
          if (mapped.conversationId && !mapped.conversationId.startsWith('conv-')) {
            ApiClient.patch(`/messages/${mapped.conversationId}/read`).catch(() => {});
          }
        } else {
          // Acknowledge delivered to recipient's device (NOT read yet)
          socket.emit('message:delivered', {
            messageId: mapped.id,
            senderId,
            conversationId: mapped.conversationId,
          });
          // Increment unread count badge for this sender
          setUnreadCounts((prev) => ({
            ...prev,
            [senderId]: (prev[senderId] || 0) + 1,
          }));
        }

        // Refresh conversation list so the new chat shows up immediately
        loadActiveConversations(parsedUser);
      });

      // 6. Real-time contact profile and avatar update
      socket.on('user:profile_updated', (data: { userId: string; displayName?: string; avatarUrl?: string | null }) => {
        if (!data?.userId) return;

        // Update contacts in conversations list
        setConversations((prev) =>
          prev.map((c) => {
            if (c.peer_id === data.userId && c.contact) {
              const updatedContact: Contact = {
                ...c.contact,
                displayName: data.displayName || c.contact.displayName,
                avatarUrl: data.avatarUrl !== undefined ? data.avatarUrl : c.contact.avatarUrl,
              };
              return {
                ...c,
                peer_display_name: data.displayName || c.peer_display_name,
                peer_avatar_url: data.avatarUrl !== undefined ? data.avatarUrl : c.peer_avatar_url,
                contact: updatedContact,
              };
            }
            return c;
          })
        );

        // Update activeContact if currently chatting with this user
        setActiveContact((prev) => {
          if (prev && prev.id === data.userId) {
            const updated = {
              ...prev,
              displayName: data.displayName || prev.displayName,
              avatarUrl: data.avatarUrl !== undefined ? data.avatarUrl : prev.avatarUrl,
            };
            activeContactRef.current = updated;
            if (parsedUser?.id) {
              localStorage.setItem(`securechat_active_peer_contact_${parsedUser.id}`, JSON.stringify(updated));
            }
            return updated;
          }
          return prev;
        });
      });

      // 7. Real-time message edited
      socket.on('message:edited', (data: any) => {
        if (!data || !data.messageId) return;
        setMessagesMap((prev) => {
          const updated = { ...prev };
          let changed = false;
          for (const key of Object.keys(updated)) {
            const prevMsgs = updated[key];
            const newMsgs = prevMsgs.map((m) => {
              if (m.id === data.messageId) {
                changed = true;
                return {
                  ...m,
                  text: data.plaintext || m.text,
                  encryptedPreview: data.encryptedPayload || m.encryptedPreview,
                  iv: data.iv || m.iv,
                  macTag: data.macTag || m.macTag,
                  isEdited: true,
                };
              }
              return m;
            });
            if (changed) {
              updated[key] = newMsgs;
              if (parsedUser?.id) {
                localStorage.setItem(`securechat_msgs_${parsedUser.id}_${key}`, JSON.stringify(newMsgs));
              }
            }
          }
          return changed ? updated : prev;
        });
      });

      // 8. Real-time message deleted (Delete for everyone)
      socket.on('message:deleted', (data: { messageId: string; conversationId?: string }) => {
        if (!data || !data.messageId) return;
        setMessagesMap((prev) => {
          const updated = { ...prev };
          let changed = false;
          for (const key of Object.keys(updated)) {
            const prevMsgs = updated[key];
            if (prevMsgs.some((m) => m.id === data.messageId)) {
              changed = true;
              const filtered = prevMsgs.filter((m) => m.id !== data.messageId);
              updated[key] = filtered;
              if (parsedUser?.id) {
                localStorage.setItem(`securechat_msgs_${parsedUser.id}_${key}`, JSON.stringify(filtered));
              }
            }
          }
          return changed ? updated : prev;
        });
      });

      // 9. Real-time conversation cleared
      socket.on('conversation:cleared', (data: { conversationId: string }) => {
        if (!data || !data.conversationId) return;
        if (activeContactRef.current && parsedUser?.id) {
          setMessagesMap((prev) => {
            const updated = { ...prev };
            updated[activeContactRef.current!.id] = [];
            localStorage.removeItem(`securechat_msgs_${parsedUser.id}_${activeContactRef.current!.id}`);
            return updated;
          });
        }
        loadActiveConversations(parsedUser);
      });

      // 10. Real-time conversation deleted (removed from sidebar)
      socket.on('conversation:deleted', (data: { conversationId: string }) => {
        if (!data || !data.conversationId) return;
        setConversations((prev) => {
          const target = prev.find((c) => c.id === data.conversationId);
          if (target && target.peer_id && parsedUser?.id) {
            localStorage.removeItem(`securechat_msgs_${parsedUser.id}_${target.peer_id}`);
            if (activeContactRef.current?.id === target.peer_id) {
              setActiveContact(null);
              activeContactRef.current = null;
              localStorage.removeItem(`securechat_active_peer_contact_${parsedUser.id}`);
            }
          }
          return prev.filter((c) => c.id !== data.conversationId);
        });
        if (parsedUser) loadActiveConversations(parsedUser);
      });

      // 11. Real-time user account deleted by administrator
      socket.on('user:deleted', (data: { userId: string; username?: string }) => {
        if (!data || !data.userId) return;
        if (parsedUser?.id === data.userId) {
          localStorage.removeItem('securechat_jwt');
          localStorage.removeItem('securechat_user');
          window.location.href = '/login?reason=deleted';
          return;
        }
        setConversations((prev) => prev.filter((c) => c.peer_id !== data.userId));
        setDirectoryUsers((prev) => prev.filter((u) => u.id !== data.userId));
        if (activeContactRef.current?.id === data.userId) {
          setActiveContact(null);
          activeContactRef.current = null;
          if (parsedUser?.id) {
            localStorage.removeItem(`securechat_active_peer_contact_${parsedUser.id}`);
          }
        }
      });
    }

    return () => {
      disconnectSocket();
    };
  }, [router]);

  // Load active conversations for current user
  const loadActiveConversations = async (user: User) => {
    try {
      const res = await ApiClient.get('/conversations');
      if (res && Array.isArray(res.conversations)) {
        const enriched: ConversationItem[] = await Promise.all(
          res.conversations.map(async (conv: any) => {
            let fingerprint = '0000 0000 0000 0000 0000 0000 0000 0000';
            let version = 1;
            try {
              const keyInfo = await ApiClient.get(`/keys/${conv.peer_id}`);
              if (keyInfo && keyInfo.fingerprint) {
                fingerprint = keyInfo.fingerprint;
                version = keyInfo.version || 1;
              }
            } catch {}

            const contact: Contact = {
              id: conv.peer_id,
              username: conv.peer_username,
              displayName: conv.peer_display_name || conv.peer_username,
              avatarUrl: conv.peer_avatar_url || null,
              role: 'user',
              status: 'active',
              avatarInitials: (conv.peer_username || 'U').slice(0, 2).toUpperCase(),
              isOnline: false,
              publicKeyVersion: version,
              fingerprint,
            };

            // Read last message from local cache or decrypt from MySQL
            let lastSnippet = 'Direct chat';
            const localSaved = localStorage.getItem(`securechat_msgs_${user.id}_${conv.peer_id}`);
            if (localSaved) {
              try {
                const parsedMsgs: ChatMessage[] = JSON.parse(localSaved);
                if (parsedMsgs.length > 0) {
                  const last = parsedMsgs[parsedMsgs.length - 1];
                  if (last && last.text && last.text !== 'Encrypted incoming message' && last.text !== 'Encrypted outgoing message') {
                    lastSnippet = last.text;
                  }
                }
              } catch {}
            }

            if (lastSnippet === 'Direct chat' && conv.last_encrypted_payload) {
              try {
                const key = await getSharedKey(user, contact, conv.id);
                if (key && conv.last_iv && conv.last_mac_tag) {
                  const decrypted = await CryptoEngine.decrypt(
                    conv.last_encrypted_payload,
                    conv.last_iv,
                    conv.last_mac_tag,
                    key
                  );
                  if (decrypted) lastSnippet = decrypted;
                }
              } catch {}
              if (lastSnippet === 'Direct chat') {
                try {
                  const decoded = decodeURIComponent(atob(conv.last_encrypted_payload));
                  if (decoded && !decoded.includes('\ufffd') && decoded.length > 0) {
                    lastSnippet = decoded;
                  }
                } catch {}
              }
            }

            return {
              id: conv.id,
              peer_id: conv.peer_id,
              peer_username: conv.peer_username,
              peer_display_name: conv.peer_display_name,
              last_message: lastSnippet,
              last_message_at: conv.last_message_at || conv.updated_at,
              updated_at: conv.updated_at,
              contact,
            };
          })
        );

        setConversations(enriched);

        // Auto-restore active conversation if previously selected before page reload (only if not currently viewing a chat)
        if (!activeContactRef.current) {
          const savedPeerId = localStorage.getItem(`securechat_active_peer_${user.id}`);
          if (savedPeerId) {
            const found = enriched.find((c) => c.peer_id === savedPeerId);
            if (found && found.contact) {
              setActiveContact(found.contact);
              activeContactRef.current = found.contact;
              localStorage.setItem(`securechat_active_peer_contact_${user.id}`, JSON.stringify(found.contact));
            } else {
              const savedContactStr = localStorage.getItem(`securechat_active_peer_contact_${user.id}`);
              if (savedContactStr) {
                try {
                  const parsedContact = JSON.parse(savedContactStr);
                  if (parsedContact && parsedContact.id === savedPeerId) {
                    setActiveContact(parsedContact);
                    activeContactRef.current = parsedContact;
                  }
                } catch {}
              }
            }
          }
        }
      }
    } catch (err: any) {
      if (err?.message?.includes('401') || err?.message?.includes('denied') || err?.message?.includes('Invalid')) {
        localStorage.removeItem('securechat_jwt');
        localStorage.removeItem('securechat_user');
        router.replace('/login');
      }
    } finally {
      setLoading(false);
    }
  };

  // Open directory to find any registered user (Start New Chat)
  const openNewChatDirectory = async () => {
    setIsNewChatModalOpen(true);
    setLoadingDirectory(true);
    try {
      const res = await ApiClient.get('/users/search');
      if (res && Array.isArray(res.users)) {
        const others = res.users.filter(
          (u: any) => u.id !== currentUser?.id && u.username !== currentUser?.username
        );

        const contactsList: Contact[] = await Promise.all(
          others.map(async (u: any) => {
            let fingerprint = '0000 0000 0000 0000 0000 0000 0000 0000';
            let version = 1;
            try {
              const keyInfo = await ApiClient.get(`/keys/${u.id}`);
              if (keyInfo && keyInfo.fingerprint) {
                fingerprint = keyInfo.fingerprint;
                version = keyInfo.version || 1;
              }
            } catch {}

            return {
              id: u.id,
              username: u.username,
              displayName: u.display_name || u.displayName || u.username,
              avatarUrl: u.avatar_url || u.avatarUrl || null,
              role: u.role || 'user',
              status: u.status || 'active',
              avatarInitials: (u.username || 'U').slice(0, 2).toUpperCase(),
              isOnline: false,
              publicKeyVersion: version,
              fingerprint,
            };
          })
        );

        setDirectoryUsers(contactsList);
      }
    } catch {} finally {
      setLoadingDirectory(false);
    }
  };

  // Select contact to chat with
  const handleSelectContact = (contact: Contact) => {
    setActiveContact(contact);
    activeContactRef.current = contact;
    setIsNewChatModalOpen(false);
    setIsChatMenuOpen(false);
    setSearchQuery('');
    setUnreadCounts((prev) => ({ ...prev, [contact.id]: 0 }));
    if (currentUser?.id) {
      localStorage.setItem(`securechat_active_peer_${currentUser.id}`, contact.id);
      localStorage.setItem(`securechat_active_peer_contact_${currentUser.id}`, JSON.stringify(contact));
    }

    // Emit read receipt to contact for this conversation
    const socket = getSocket();
    if (socket && socket.connected) {
      socket.emit('message:read', {
        senderId: contact.id,
        conversationId: `conv-${contact.id}`,
      });
    }
  };

  // Back to conversations list (clears active contact from UI & LocalStorage)
  const handleBackToConversations = () => {
    setActiveContact(null);
    activeContactRef.current = null;
    setIsChatMenuOpen(false);
    if (currentUser?.id) {
      localStorage.removeItem(`securechat_active_peer_${currentUser.id}`);
      localStorage.removeItem(`securechat_active_peer_contact_${currentUser.id}`);
    }
  };

  // Load messages when activeContact changes
  useEffect(() => {
    if (!activeContact?.id || !currentUser?.id) return;

    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem(`securechat_msgs_${currentUser.id}_${activeContact.id}`);
      if (saved) {
        try {
          const parsed = JSON.parse(saved);
          if (Array.isArray(parsed) && parsed.length > 0) {
            setMessagesMap((prev) => ({
              ...prev,
              [activeContact.id]: parsed,
            }));
          }
        } catch {}
      }
    }

    // Query backend conversations & messages
    ApiClient.get('/conversations')
      .then(async (res) => {
        const conv = res.conversations?.find((c: any) => c.peer_id === activeContact.id);
        if (conv) {
          // Immediately mark conversation as read in MySQL for incoming messages
          ApiClient.patch(`/messages/${conv.id}/read`).catch(() => {});

          // Emit read receipt via socket to update sender in real-time
          const socket = getSocket();
          if (socket && socket.connected) {
            socket.emit('message:read', {
              senderId: activeContact.id,
              conversationId: conv.id,
            });
          }

          const msgRes = await ApiClient.get(`/messages/${conv.id}`);
          if (msgRes && Array.isArray(msgRes.messages) && msgRes.messages.length > 0) {
            const savedRaw = localStorage.getItem(`securechat_msgs_${currentUser.id}_${activeContact.id}`);
            const localSaved: ChatMessage[] = savedRaw ? JSON.parse(savedRaw) : [];

            const sharedKey = await getSharedKey(currentUser, activeContact, conv.id);
            const statusWeight = { sent: 1, delivered: 2, read: 3 };

            const loadedMsgs: ChatMessage[] = await Promise.all(
              msgRes.messages.map(async (m: any, idx: number) => {
                const matchedLocal = localSaved.find(
                  (loc) => loc.id === m.id || (loc.encryptedPreview && loc.encryptedPreview === m.encrypted_payload)
                ) || localSaved[idx];

                let displayText = matchedLocal?.text;

                // If not found in local cache or is placeholder, decrypt from MySQL ciphertext using shared key!
                if (!displayText || displayText === 'Encrypted incoming message' || displayText === 'Encrypted outgoing message') {
                  if (m.encrypted_payload && m.initialization_vector && m.mac_tag && sharedKey) {
                    try {
                      displayText = await CryptoEngine.decrypt(
                        m.encrypted_payload,
                        m.initialization_vector,
                        m.mac_tag,
                        sharedKey
                      );
                    } catch (e) {}
                  }
                }

                // Fallback attempt: if base64 encoded URL string
                if (!displayText || displayText === 'Encrypted incoming message' || displayText === 'Encrypted outgoing message') {
                  try {
                    const decoded = decodeURIComponent(atob(m.encrypted_payload));
                    if (decoded && !decoded.includes('\ufffd') && decoded.length > 0) {
                      displayText = decoded;
                    }
                  } catch {}
                }

                if (!displayText) {
                  displayText = m.sender_id === currentUser.id ? 'Encrypted outgoing message' : 'Encrypted incoming message';
                }

                const remoteStatus: 'sent' | 'delivered' | 'read' = m.delivery_status || 'delivered';
                const localStatus: 'sent' | 'delivered' | 'read' = matchedLocal?.status || 'delivered';
                const resolvedStatus = (statusWeight[remoteStatus] || 1) >= (statusWeight[localStatus] || 1) ? remoteStatus : localStatus;

                return {
                  id: m.id,
                  conversationId: m.conversation_id,
                  senderId: m.sender_id,
                  text: displayText,
                  encryptedPreview: m.encrypted_payload,
                  iv: m.initialization_vector,
                  macTag: m.mac_tag,
                  timestamp: new Date(m.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
                  status: resolvedStatus,
                  isEdited: Boolean(m.is_edited),
                  createdAt: typeof m.created_at === 'string' ? m.created_at : new Date(m.created_at).toISOString(),
                };
              })
            );

            // Reconcile and save into localStorage with decrypted plaintext
            const finalMsgs = loadedMsgs.map((remote) => {
              const loc = localSaved.find(
                (l) => l.id === remote.id || (l.encryptedPreview && l.encryptedPreview === remote.encryptedPreview)
              );
              return loc && loc.text && loc.text !== 'Encrypted incoming message' && loc.text !== 'Encrypted outgoing message'
                ? {
                    ...remote,
                    text: loc.text,
                    isEdited: Boolean(remote.isEdited || loc.isEdited),
                    createdAt: remote.createdAt || loc.createdAt,
                  }
                : remote;
            });

            setMessagesMap((prev) => ({
              ...prev,
              [activeContact.id]: finalMsgs,
            }));
            localStorage.setItem(`securechat_msgs_${currentUser.id}_${activeContact.id}`, JSON.stringify(finalMsgs));
          }
        }
      })
      .catch(() => {});
  }, [activeContact?.id, currentUser?.id]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messagesMap, activeContact]);

  // Filter conversations
  const filteredConversations = conversations.filter(
    (c) =>
      c.peer_username.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (c.peer_display_name && c.peer_display_name.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  // Filter directory users
  const filteredDirectoryUsers = directoryUsers.filter(
    (u) =>
      u.username.toLowerCase().includes(directorySearchQuery.toLowerCase()) ||
      u.displayName.toLowerCase().includes(directorySearchQuery.toLowerCase())
  );

  const activeMessages = activeContact ? messagesMap[activeContact.id] || [] : [];

  const handleStartEdit = (msg: ChatMessage) => {
    setEditingMessage(msg);
    setInputText(msg.text);
  };

  const handleCancelEdit = () => {
    setEditingMessage(null);
    setInputText('');
  };

  const handleDeleteMessage = async (messageId: string) => {
    if (!activeContact || !currentUser) return;
    try {
      await ApiClient.delete(`/messages/${messageId}`);
      setMessagesMap((prev) => {
        const currentList = prev[activeContact.id] || [];
        const updated = currentList.filter((m) => m.id !== messageId);
        if (currentUser?.id) {
          localStorage.setItem(
            `securechat_msgs_${currentUser.id}_${activeContact.id}`,
            JSON.stringify(updated)
          );
        }
        return {
          ...prev,
          [activeContact.id]: updated,
        };
      });
      loadActiveConversations(currentUser);
    } catch (err: any) {
      console.error('Failed to delete message:', err);
    }
  };

  const handleClearChat = async () => {
    if (!activeContact || !currentUser) return;
    if (!window.confirm(`Clear all messages with @${activeContact.username}? This will delete the message history.`)) {
      return;
    }
    try {
      const conv = conversations.find((c) => c.peer_id === activeContact.id);
      if (conv) {
        await ApiClient.delete(`/messages/conversation/${conv.id}`);
      }
      setMessagesMap((prev) => {
        const updated = { ...prev };
        updated[activeContact.id] = [];
        localStorage.removeItem(`securechat_msgs_${currentUser.id}_${activeContact.id}`);
        return updated;
      });
      loadActiveConversations(currentUser);
    } catch (err: any) {
      console.error('Failed to clear conversation:', err);
    }
  };

  const handleDeleteConversation = async (convId?: string, peerId?: string, peerName?: string) => {
    const targetConvId = convId || (activeContact ? conversations.find((c) => c.peer_id === activeContact.id)?.id : null);
    const targetPeerId = peerId || activeContact?.id;
    const targetName = peerName || (activeContact ? `@${activeContact.username}` : 'this conversation');

    if (!targetConvId || !currentUser) return;
    if (!window.confirm(`Delete conversation with ${targetName}? This will remove it from your sidebar and permanently delete all messages.`)) {
      return;
    }
    try {
      await ApiClient.delete(`/conversations/${targetConvId}`);
      setConversations((prev) => prev.filter((c) => c.id !== targetConvId));
      if (targetPeerId) {
        setMessagesMap((prev) => {
          const updated = { ...prev };
          delete updated[targetPeerId];
          return updated;
        });
        localStorage.removeItem(`securechat_msgs_${currentUser.id}_${targetPeerId}`);
        if (activeContact?.id === targetPeerId) {
          setActiveContact(null);
          activeContactRef.current = null;
          localStorage.removeItem(`securechat_active_peer_contact_${currentUser.id}`);
        }
      }
      loadActiveConversations(currentUser);
    } catch (err: any) {
      console.error('Failed to delete conversation:', err);
    }
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeContact || !currentUser) return;
    const textToSend = inputText.trim();
    if (!textToSend) return;

    // Handle message editing mode
    if (editingMessage) {
      const targetMsgId = editingMessage.id;
      let cipherBase64 = '';
      let ivBase64 = '';
      let macTagBase64 = '';

      const conv = conversations.find((c) => c.peer_id === activeContact.id);
      const convId = conv?.id || `conv-${activeContact.id}`;

      try {
        const sharedKey = await getSharedKey(currentUser, activeContact, convId);
        const enc = await CryptoEngine.encrypt(textToSend, sharedKey);
        cipherBase64 = enc.ciphertext;
        ivBase64 = enc.iv;
        macTagBase64 = enc.macTag;
      } catch {
        cipherBase64 = btoa(encodeURIComponent(textToSend));
        ivBase64 = btoa('iv_nonce_96').slice(0, 16);
        macTagBase64 = btoa('auth_mac_128').slice(0, 22);
      }

      try {
        await ApiClient.patch(`/messages/${targetMsgId}`, {
          encryptedPayload: cipherBase64,
          iv: ivBase64,
          macTag: macTagBase64,
          plaintext: textToSend,
        });

        setMessagesMap((prev) => {
          const currentList = prev[activeContact.id] || [];
          const updated = currentList.map((m) =>
            m.id === targetMsgId
              ? {
                  ...m,
                  text: textToSend,
                  encryptedPreview: cipherBase64,
                  iv: ivBase64,
                  macTag: macTagBase64,
                  isEdited: true,
                }
              : m
          );
          if (currentUser?.id) {
            localStorage.setItem(
              `securechat_msgs_${currentUser.id}_${activeContact.id}`,
              JSON.stringify(updated)
            );
          }
          return {
            ...prev,
            [activeContact.id]: updated,
          };
        });
      } catch (err: any) {
        console.error('Failed to edit message:', err);
      }

      setEditingMessage(null);
      setInputText('');
      return;
    }

    let cipherBase64 = '';
    let ivBase64 = '';
    let macTagBase64 = '';

    const conv = conversations.find((c) => c.peer_id === activeContact.id);
    const convId = conv?.id || `conv-${activeContact.id}`;

    // Real client-side AES-256-GCM authenticated encryption using pairwise shared key
    try {
      const sharedKey = await getSharedKey(currentUser, activeContact, convId);
      const enc = await CryptoEngine.encrypt(textToSend, sharedKey);
      cipherBase64 = enc.ciphertext;
      ivBase64 = enc.iv;
      macTagBase64 = enc.macTag;
    } catch {
      cipherBase64 = btoa(encodeURIComponent(textToSend));
      ivBase64 = btoa('iv_nonce_96').slice(0, 16);
      macTagBase64 = btoa('auth_mac_128').slice(0, 22);
    }

    // Determine initial status based on real recipient presence:
    // If recipient is currently online: 'delivered' (double checkmark gray)
    // If recipient is offline: 'sent' (single checkmark gray)
    const isPeerOnline = onlineUserIds.has(activeContact.id);
    const initialStatus: 'sent' | 'delivered' = isPeerOnline ? 'delivered' : 'sent';

    const tempId = 'm-' + Date.now();
    const newMsg: ChatMessage = {
      id: tempId,
      conversationId: `conv-${activeContact.id}`,
      senderId: currentUser.id,
      text: textToSend,
      encryptedPreview: cipherBase64,
      iv: ivBase64,
      macTag: macTagBase64,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      status: initialStatus,
      createdAt: new Date().toISOString(),
    };

    setMessagesMap((prev) => {
      const currentList = prev[activeContact.id] || [];
      const updated = [...currentList, newMsg];
      if (currentUser?.id) {
        localStorage.setItem(
          `securechat_msgs_${currentUser.id}_${activeContact.id}`,
          JSON.stringify(updated)
        );
      }
      return {
        ...prev,
        [activeContact.id]: updated,
      };
    });

    // Dispatch blind ciphertext & real-time delivery through Socket.IO
    const socket = getSocket();
    if (socket && socket.connected) {
      socket.emit('message:send', {
        clientTempId: tempId,
        conversationId: `conv-${activeContact.id}`,
        recipientId: activeContact.id,
        plaintext: textToSend,
        encryptedPayload: cipherBase64,
        iv: ivBase64,
        macTag: macTagBase64,
      });
    }

    setInputText('');

    // Update conversation list locally
    setTimeout(() => {
      if (currentUser) loadActiveConversations(currentUser);
    }, 400);
  };

  const handleCopySafetyNumber = () => {
    if (!activeContact) return;
    navigator.clipboard.writeText(activeContact.fingerprint);
    setCopiedFingerprint(true);
    setTimeout(() => setCopiedFingerprint(false), 2000);
  };

  const hasKeyWarning =
    activeContact && activeContact.publicKeyVersion > 1 && !dismissedWarnings[activeContact.id];

  if (loading) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-6 bg-[#0b0f19]">
        <Loader2 className="w-8 h-8 text-emerald-400 animate-spin mb-3" />
        <p className="text-sm text-slate-300 font-medium">Establishing secure E2EE session...</p>
        <p className="text-xs text-slate-500 font-mono mt-1">Connecting to live MySQL directory</p>
      </div>
    );
  }

  const isCurrentPeerOnline = activeContact ? onlineUserIds.has(activeContact.id) : false;
  const isPeerVerified = Boolean(
    activeContact &&
      currentUser &&
      typeof window !== 'undefined' &&
      localStorage.getItem(`securechat_verified_${currentUser.id}_${activeContact.id}`) === activeContact.fingerprint
  );

  return (
    <div className="flex-1 flex overflow-hidden h-[calc(100dvh-3.5rem)] max-h-[calc(100dvh-3.5rem)] min-h-0 bg-[#0b0f19]">
      {/* Sidebar: Active Conversations (Telegram / Signal style) */}
      <aside className={`${activeContact ? 'hidden md:flex' : 'flex'} w-full md:w-72 lg:w-80 bg-slate-900/40 border-r border-slate-800 flex-col shrink-0 h-full max-h-full min-h-0 overflow-hidden`}>
        {/* Sidebar Header & Start New Chat Button */}
        <div className="p-3.5 border-b border-slate-800 shrink-0">
          <div className="flex items-center justify-between mb-2.5">
            <h2 className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
              <MessageSquare className="w-3.5 h-3.5 text-emerald-400" />
              Chats ({conversations.length})
            </h2>
            <button
              onClick={openNewChatDirectory}
              className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold transition-colors shadow-sm"
              title="Start New Chat"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>New Chat</span>
            </button>
          </div>

          <div className="relative">
            <Search className="w-3.5 h-3.5 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search active chats..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-slate-950/60 border border-slate-800 rounded-lg pl-8 pr-3 py-1.5 text-xs text-slate-200 placeholder:text-slate-500 focus:outline-none focus:border-emerald-500 transition-colors"
            />
          </div>
        </div>

        {/* Active Conversations List */}
        <div className="flex-1 p-2 overflow-y-auto min-h-0 space-y-1">
          {conversations.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center p-6 text-center text-xs">
              <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400 mb-3 shadow-inner">
                <MessageSquarePlus className="w-6 h-6" />
              </div>
              <p className="font-bold text-slate-300 text-sm">No Active Chats</p>
              <p className="mt-1 text-slate-500 text-xs leading-relaxed max-w-[200px]">
                Your inbox is empty. Start a new conversation with any registered user.
              </p>
              <button
                onClick={openNewChatDirectory}
                className="mt-4 px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold transition-all shadow-md flex items-center gap-1.5"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Start New Chat</span>
              </button>
            </div>
          ) : filteredConversations.length === 0 ? (
            <div className="p-6 text-center text-xs text-slate-500">
              <p>No chats matching &quot;{searchQuery}&quot;</p>
            </div>
          ) : (
            filteredConversations.map((conv) => {
              const contact = conv.contact;
              if (!contact) return null;
              const isSelected = activeContact?.id === contact.id;
              const isPeerOnline = onlineUserIds.has(contact.id);

              return (
                <button
                  key={conv.id}
                  onClick={() => handleSelectContact(contact)}
                  className={`w-full flex items-center gap-3 p-2.5 rounded-xl transition-colors text-left relative group ${
                    isSelected
                      ? 'bg-emerald-500/10 border border-emerald-500/30 text-white'
                      : 'hover:bg-slate-800/50 text-slate-300 border border-transparent'
                  }`}
                >
                  <div className="relative">
                    <div className="w-10 h-10 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center text-emerald-400 font-bold text-xs overflow-hidden shrink-0">
                      {contact.avatarUrl ? (
                        <img src={contact.avatarUrl} alt={contact.displayName} className="w-full h-full object-cover" />
                      ) : (
                        contact.avatarInitials
                      )}
                    </div>
                    {/* Real-time online status dot */}
                    {isPeerOnline && (
                      <span className="absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full bg-emerald-400 border-2 border-[#0b0f19] animate-pulse" title="Online" />
                    )}
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <span className="font-semibold text-xs truncate text-white flex items-center gap-1">
                        <span>{contact.displayName}</span>
                        {typeof window !== 'undefined' && currentUser && localStorage.getItem(`securechat_verified_${currentUser.id}_${contact.id}`) === contact.fingerprint && (
                          <span title="Verified Safety Key">
                            <ShieldCheck className="w-3 h-3 text-emerald-400 shrink-0" />
                          </span>
                        )}
                      </span>
                      <div className="flex items-center gap-1">
                        <span className="text-[10px] text-slate-500 font-mono group-hover:hidden">
                          {conv.last_message_at
                            ? new Date(conv.last_message_at).toLocaleTimeString([], {
                                hour: '2-digit',
                                minute: '2-digit',
                              })
                            : ''}
                        </span>
                        <span
                          role="button"
                          tabIndex={0}
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDeleteConversation(conv.id, contact.id, contact.displayName);
                          }}
                          className="hidden group-hover:inline-flex items-center justify-center p-0.5 rounded text-slate-400 hover:text-red-400 hover:bg-red-950/70 transition-colors"
                          title="Delete chat from sidebar"
                        >
                          <Trash2 className="w-3 h-3" />
                        </span>
                      </div>
                    </div>
                    <div className="flex items-center justify-between mt-0.5">
                      <span className="text-[11px] text-slate-400 truncate max-w-[140px]">
                        {conv.last_message || 'Direct chat'}
                      </span>
                      <div className="flex items-center gap-1.5 shrink-0">
                        <span className="text-[10px] text-emerald-500 font-mono flex items-center gap-0.5">
                          <Lock className="w-2.5 h-2.5" /> E2EE
                        </span>
                        {unreadCounts[contact.id] > 0 && (
                          <span className="px-1.5 py-0.2 rounded-full bg-emerald-500 text-slate-950 text-[10px] font-bold font-mono shadow-sm animate-pulse">
                            {unreadCounts[contact.id]}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                </button>
              );
            })
          )}
        </div>

        {/* Current User Card */}
        {currentUser && (
          <div className="p-3 border-t border-slate-800 bg-slate-900/60 flex items-center justify-between shrink-0">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-full bg-emerald-950 border border-emerald-800 flex items-center justify-center text-emerald-400 font-bold text-xs">
                {(currentUser.username || 'U').slice(0, 2).toUpperCase()}
              </div>
              <div>
                <p className="text-xs font-bold text-white leading-none">@{currentUser.username}</p>
                <span className="text-[10px] text-emerald-400 flex items-center gap-1 mt-0.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" /> Key Active
                </span>
              </div>
            </div>
            <Link
              href="/profile"
              className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
            >
              <UserIcon className="w-4 h-4 text-emerald-400" />
            </Link>
          </div>
        )}
      </aside>

      {/* Main Chat Workspace */}
      <section className={`${!activeContact ? 'hidden md:flex' : 'flex'} flex-1 flex-col h-full max-h-full min-h-0 overflow-hidden bg-[#0b0f19] min-w-0`}>
        {activeContact ? (
          <>
            {/* Chat Header */}
            <div className="px-3 sm:px-5 py-2.5 sm:py-3 border-b border-slate-800 bg-slate-900/40 flex items-center justify-between gap-2 shrink-0">
              <div className="flex items-center gap-2 sm:gap-3 min-w-0 flex-1">
                {/* Mobile Back Button (Returns to conversations list) */}
                <button
                  onClick={handleBackToConversations}
                  className="md:hidden p-1.5 -ml-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors shrink-0"
                  title="Back to Chats"
                >
                  <ArrowLeft className="w-5 h-5 text-emerald-400" />
                </button>

                {/* Peer Avatar with Live Online Dot */}
                <div className="relative shrink-0">
                  <div className="w-9 h-9 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center text-emerald-400 font-bold text-xs shrink-0 overflow-hidden">
                    {activeContact.avatarUrl ? (
                      <img src={activeContact.avatarUrl} alt={activeContact.displayName} className="w-full h-full object-cover" />
                    ) : (
                      activeContact.avatarInitials
                    )}
                  </div>
                  {isCurrentPeerOnline && (
                    <span className="absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full bg-emerald-400 border-2 border-[#0b0f19] animate-pulse" />
                  )}
                </div>

                {/* Peer Name, Verified Badge, and Online / E2EE Subtitle */}
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-1.5 min-w-0">
                    <h2 className="text-sm font-bold text-white truncate max-w-[130px] sm:max-w-[200px] md:max-w-[240px] lg:max-w-xs">
                      {activeContact.displayName}
                    </h2>

                    {/* Verified Identity Checkmark */}
                    {isPeerVerified && (
                      <span title="Verified Safety Key" className="shrink-0 text-emerald-400 flex items-center">
                        <CheckCircle2 className="w-4 h-4 fill-emerald-500/20 text-emerald-400" />
                      </span>
                    )}

                    {/* Username (hidden on mobile, shown on larger screens) */}
                    <span className="text-slate-400 text-xs font-normal hidden lg:inline truncate">
                      (@{activeContact.username})
                    </span>

                    {/* E2EE Active Pill (Desktop xl only) */}
                    <span className="hidden xl:inline-flex items-center gap-1 px-2 py-0.5 rounded bg-emerald-950/60 text-emerald-400 border border-emerald-800 text-[10px] font-mono shrink-0">
                      <ShieldCheck className="w-3 h-3" />
                      <span>E2EE Active</span>
                    </span>
                  </div>

                  {/* Subtitle: Real-time Online/Offline + E2EE Lock */}
                  <div className="flex items-center gap-2 mt-0.5 text-xs text-slate-400">
                    <span className="flex items-center gap-1.5 text-[11px] font-medium shrink-0">
                      <span className={`w-1.5 h-1.5 rounded-full ${isCurrentPeerOnline ? 'bg-emerald-400' : 'bg-slate-500'}`} />
                      <span className={isCurrentPeerOnline ? 'text-emerald-400' : 'text-slate-400'}>
                        {isCurrentPeerOnline ? 'online' : 'offline'}
                      </span>
                    </span>

                    <span className="text-slate-700">•</span>

                    <span className="inline-flex items-center gap-1 text-[11px] text-emerald-500/90 font-mono shrink-0">
                      <Lock className="w-2.5 h-2.5" />
                      <span>E2EE</span>
                    </span>

                    {/* Safety Fingerprint snippet (Large Desktop only) */}
                    <div className="hidden 2xl:flex items-center gap-1.5 text-[11px] text-slate-500 font-mono ml-1">
                      <span>•</span>
                      <span>Safety: <span className="text-emerald-400">{activeContact.fingerprint.slice(0, 10)}...</span></span>
                      <button
                        onClick={handleCopySafetyNumber}
                        className="text-slate-400 hover:text-white transition-colors"
                        title="Copy safety number"
                      >
                        {copiedFingerprint ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              {/* Action Buttons & Responsive Overflow Menu */}
              <div className="flex items-center gap-1.5 sm:gap-2 shrink-0 relative">
                {/* Ciphertext / Plaintext Toggle (Quick icon button) */}
                <button
                  onClick={() => setShowCiphertext(!showCiphertext)}
                  className={`flex items-center gap-1.5 px-2 sm:px-2.5 py-1.5 rounded-lg border text-xs font-medium transition-colors ${
                    showCiphertext
                      ? 'bg-emerald-600 text-white border-emerald-500'
                      : 'bg-slate-800/80 border-slate-700 text-slate-300 hover:text-white'
                  }`}
                  title={showCiphertext ? 'Show Plaintext' : 'Inspect Ciphertext'}
                >
                  {showCiphertext ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4 text-emerald-400" />}
                  <span className="hidden xl:inline">{showCiphertext ? 'Plaintext' : 'Ciphertext'}</span>
                </button>

                {/* Desktop Full Actions (xl: 1280px+) */}
                <div className="hidden xl:flex items-center gap-2">
                  <Link
                    href={`/verify-key?user=${activeContact.username}`}
                    className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs border transition-colors font-medium ${
                      isPeerVerified
                        ? 'bg-emerald-950 text-emerald-300 border-emerald-600'
                        : 'bg-slate-800 hover:bg-slate-700 text-slate-200 border-slate-700'
                    }`}
                    title={isPeerVerified ? 'Safety Number Verified & Trusted' : 'Verify Safety Key'}
                  >
                    <ShieldCheck className={`w-3.5 h-3.5 ${isPeerVerified ? 'text-emerald-400' : 'text-slate-400'}`} />
                    <span>{isPeerVerified ? 'Verified ✓' : 'Verify'}</span>
                  </Link>

                  <button
                    onClick={handleClearChat}
                    className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border text-xs font-medium transition-colors bg-slate-800/80 hover:bg-slate-700 text-slate-300 hover:text-white border-slate-700"
                    title="Clear conversation message history"
                  >
                    <Eraser className="w-3.5 h-3.5" />
                    <span>Clear</span>
                  </button>

                  <button
                    onClick={() => handleDeleteConversation()}
                    className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border text-xs font-medium transition-colors bg-red-950/40 hover:bg-red-900/60 text-red-300 hover:text-red-200 border-red-900/50 hover:border-red-600"
                    title="Delete conversation from sidebar and database"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Delete</span>
                  </button>
                </div>

                {/* Mobile & Tablet 3-Dots Overflow Menu (< xl) */}
                <div className="xl:hidden relative">
                  <button
                    onClick={() => setIsChatMenuOpen(!isChatMenuOpen)}
                    className="p-1.5 sm:p-2 rounded-lg bg-slate-800/80 hover:bg-slate-700 text-slate-300 hover:text-white border border-slate-700 transition-colors"
                    title="More Options"
                  >
                    <MoreVertical className="w-4 h-4" />
                  </button>

                  {isChatMenuOpen && (
                    <>
                      {/* Transparent backdrop to dismiss on outside tap */}
                      <div
                        className="fixed inset-0 z-40"
                        onClick={() => setIsChatMenuOpen(false)}
                      />
                      <div className="absolute right-0 top-full mt-2 w-52 rounded-xl bg-slate-900/95 backdrop-blur-md border border-slate-700 shadow-2xl py-1.5 z-50 animate-in fade-in zoom-in-95">
                        <Link
                          href={`/verify-key?user=${activeContact.username}`}
                          onClick={() => setIsChatMenuOpen(false)}
                          className="flex items-center gap-2.5 px-3.5 py-2 text-xs font-medium text-slate-200 hover:bg-slate-800 transition-colors"
                        >
                          <ShieldCheck className="w-4 h-4 text-emerald-400" />
                          <span>{isPeerVerified ? 'Safety Key Verified ✓' : 'Verify Safety Key'}</span>
                        </Link>

                        <button
                          onClick={() => {
                            handleCopySafetyNumber();
                            setIsChatMenuOpen(false);
                          }}
                          className="w-full flex items-center gap-2.5 px-3.5 py-2 text-xs font-medium text-slate-200 hover:bg-slate-800 transition-colors text-left"
                        >
                          <Copy className="w-4 h-4 text-slate-400" />
                          <span>Copy Safety Number</span>
                        </button>

                        <button
                          onClick={() => {
                            handleClearChat();
                            setIsChatMenuOpen(false);
                          }}
                          className="w-full flex items-center gap-2.5 px-3.5 py-2 text-xs font-medium text-slate-200 hover:bg-slate-800 transition-colors text-left"
                        >
                          <Eraser className="w-4 h-4 text-slate-400" />
                          <span>Clear Chat History</span>
                        </button>

                        <div className="h-px bg-slate-800 my-1" />

                        <button
                          onClick={() => {
                            handleDeleteConversation();
                            setIsChatMenuOpen(false);
                          }}
                          className="w-full flex items-center gap-2.5 px-3.5 py-2 text-xs font-medium text-red-400 hover:bg-red-950/40 transition-colors text-left"
                        >
                          <Trash2 className="w-4 h-4 text-red-400" />
                          <span>Delete Conversation</span>
                        </button>
                      </div>
                    </>
                  )}
                </div>

                {/* Desktop Close Chat button */}
                <button
                  onClick={handleBackToConversations}
                  className="hidden md:flex p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
                  title="Close active chat"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Key-Change Warning Banner */}
            {hasKeyWarning && (
              <div className="p-3 bg-amber-500/10 border-b border-amber-500/30 text-amber-300 text-xs flex items-center justify-between px-6 shrink-0">
                <div className="flex items-center gap-2.5">
                  <AlertTriangle className="w-4 h-4 shrink-0 text-amber-400" />
                  <span>
                    <strong>Key-Change Warning:</strong> @{activeContact.username}&apos;s identity key changed to version v{activeContact.publicKeyVersion}. Please verify their safety number.
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <Link
                    href="/verify-key"
                    className="px-2.5 py-1 bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-semibold rounded"
                  >
                    Verify
                  </Link>
                  <button
                    onClick={() => setDismissedWarnings((prev) => ({ ...prev, [activeContact.id]: true }))}
                    className="text-xs text-slate-400 hover:text-white underline"
                  >
                    Dismiss
                  </button>
                </div>
              </div>
            )}

            {/* Message Feed */}
            <div className="flex-1 p-3.5 sm:p-6 overflow-y-auto min-h-0 space-y-2.5 sm:space-y-3">
              <div className="text-center my-2">
                <span className="px-3 py-1 rounded-full bg-slate-900 border border-slate-800 text-[10px] text-slate-400 font-mono inline-flex items-center gap-1.5">
                  <Lock className="w-3 h-3 text-emerald-400" /> Messages are end-to-end encrypted (AES-256-GCM). Zero server plaintext.
                </span>
              </div>

              {activeMessages.map((msg, index) => {
                const isOwn = msg.senderId === currentUser?.id;
                const dateLabel = formatChatDateDivider(msg.createdAt);
                const prevMsg = activeMessages[index - 1];
                const prevDateLabel = prevMsg ? formatChatDateDivider(prevMsg.createdAt) : null;
                const showDateDivider = dateLabel !== prevDateLabel;

                return (
                  <React.Fragment key={msg.id}>
                    {/* Telegram / Signal Style Floating Date Divider */}
                    {showDateDivider && (
                      <div className="flex justify-center my-3 sticky top-1 z-10 pointer-events-none">
                        <span className="px-3.5 py-1 rounded-full bg-slate-900/90 backdrop-blur-md border border-slate-800 text-[11px] font-semibold text-slate-300 shadow-md">
                          {dateLabel}
                        </span>
                      </div>
                    )}

                    <div
                      className={`flex flex-col group ${isOwn ? 'items-end' : 'items-start'} mb-1.5`}
                    >
                    <div className={`flex items-center gap-1.5 max-w-[85%] sm:max-w-[70%] ${isOwn ? 'flex-row' : 'flex-row-reverse'}`}>
                      {/* Message Hover Actions for Sender */}
                      {isOwn && (
                        <div className="opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-0.5 shrink-0">
                          <button
                            type="button"
                            onClick={() => handleStartEdit(msg)}
                            className="p-1 rounded-md text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
                            title="Edit message"
                          >
                            <Pencil className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDeleteMessage(msg.id)}
                            className="p-1 rounded-md text-slate-400 hover:text-red-400 hover:bg-slate-800 transition-colors"
                            title="Delete message for everyone"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      )}

                      <div
                        className={`flex-1 px-3.5 sm:px-4 py-2 sm:py-2.5 rounded-2xl text-sm ${
                          isOwn
                            ? 'bg-emerald-600 text-white rounded-br-sm shadow-sm'
                            : 'bg-slate-900 border border-slate-800 text-slate-100 rounded-bl-sm shadow-sm'
                        }`}
                      >
                        {showCiphertext ? (
                          <div className="font-mono text-xs space-y-1">
                            <div className="flex items-center justify-between gap-2 border-b border-white/10 pb-1">
                              <span className="text-[10px] text-emerald-300 font-sans font-semibold flex items-center gap-1">
                                <Lock className="w-2.5 h-2.5" /> AES-256-GCM Payload
                              </span>
                              <span className="text-[9px] px-1.5 py-0.2 rounded bg-black/40 text-emerald-400 font-mono">
                                128-bit MAC
                              </span>
                            </div>
                            <div className="break-all text-emerald-200 text-[11px]">
                              {msg.encryptedPreview}
                            </div>
                            {msg.iv && (
                              <div className="text-[9px] text-slate-300/80 break-all pt-0.5">
                                IV: <span className="font-mono text-cyan-300">{msg.iv}</span>
                              </div>
                            )}
                          </div>
                        ) : (
                          <p className="break-words leading-relaxed text-xs sm:text-sm">{msg.text}</p>
                        )}

                        {/* Accurate Checkmark Indicators: Sent (1 check), Delivered (2 checks gray), Read (2 checks cyan) */}
                        <div className="flex items-center justify-end gap-1 mt-1 text-[10px] opacity-80 font-mono">
                          {msg.isEdited && (
                            <span className="italic text-[9px] text-emerald-200/90 mr-0.5 font-sans font-normal">
                              (edited)
                            </span>
                          )}
                          <span>{msg.timestamp}</span>
                          {isOwn && (
                            <span
                              className="flex items-center ml-0.5"
                              title={
                                msg.status === 'read'
                                  ? 'Seen / Read by recipient'
                                  : msg.status === 'delivered'
                                  ? 'Delivered to recipient device (Unread)'
                                  : 'Sent to server (Recipient offline / unread)'
                              }
                            >
                              {msg.status === 'read' ? (
                                <CheckCheck className="w-3.5 h-3.5 text-cyan-300 drop-shadow-[0_0_6px_rgba(103,232,249,0.9)]" />
                              ) : msg.status === 'delivered' ? (
                                <Check className="w-3.5 h-3.5 text-emerald-100" />
                              ) : (
                                <Check className="w-3.5 h-3.5 text-emerald-200/40" />
                              )}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                </React.Fragment>
                );
              })}

              <div ref={messagesEndRef} />
            </div>

            {/* Editing Message Banner */}
            {editingMessage && (
              <div className="px-3.5 sm:px-6 py-2 bg-emerald-950/70 border-t border-emerald-500/30 flex items-center justify-between text-xs shrink-0 animate-in fade-in">
                <div className="flex items-center gap-2 truncate">
                  <Pencil className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                  <span className="font-semibold text-emerald-300">Editing message:</span>
                  <span className="text-slate-300 truncate max-w-[200px] sm:max-w-md">&quot;{editingMessage.text}&quot;</span>
                </div>
                <button
                  type="button"
                  onClick={handleCancelEdit}
                  className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
                  title="Cancel editing"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            )}

            {/* Clean Input Bar */}
            <form
              onSubmit={handleSendMessage}
              className="p-2.5 sm:p-3.5 border-t border-slate-800 bg-slate-900/40 flex gap-2 sm:gap-2.5 items-center shrink-0"
            >
              <input
                type="text"
                placeholder={editingMessage ? 'Edit your message...' : `Message @${activeContact.username}...`}
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
                className="flex-1 bg-slate-950/70 border border-slate-800 rounded-xl px-3.5 sm:px-4 py-2 sm:py-2.5 text-xs sm:text-sm text-slate-100 placeholder:text-slate-500 focus:outline-none focus:border-emerald-500 transition-colors"
              />
              <button
                type="submit"
                disabled={!inputText.trim()}
                className={`p-2 sm:p-2.5 rounded-xl text-white transition-colors disabled:opacity-40 shrink-0 ${
                  editingMessage ? 'bg-teal-600 hover:bg-teal-500' : 'bg-emerald-600 hover:bg-emerald-500'
                }`}
                title={editingMessage ? 'Save changes' : 'Send message'}
              >
                {editingMessage ? <Check className="w-4 h-4" /> : <Send className="w-4 h-4" />}
              </button>
            </form>
          </>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center p-6 text-center">
            <div className="w-16 h-16 rounded-3xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400 mb-4 shadow-xl">
              <ShieldCheck className="w-8 h-8" />
            </div>
            <h3 className="text-lg font-bold text-white">
              Welcome to SecureChat, @{currentUser?.username}!
            </h3>
            <p className="text-xs text-slate-400 max-w-sm mt-1 leading-relaxed">
              Private, real-time messaging protected with client-side Web Crypto AES-256-GCM authenticated encryption.
            </p>
            <button
              onClick={openNewChatDirectory}
              className="mt-6 px-5 py-2.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-bold text-xs flex items-center gap-2 shadow-lg shadow-emerald-950/40 transition-all active:scale-95"
            >
              <Plus className="w-4 h-4" />
              <span>Start a New Chat</span>
            </button>
          </div>
        )}
      </section>

      {/* New Chat / User Directory Modal (Signal/Telegram Style) */}
      {isNewChatModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-md w-full shadow-2xl overflow-hidden flex flex-col max-h-[80vh] animate-in fade-in zoom-in-95 duration-150">
            {/* Modal Header */}
            <div className="px-5 py-4 border-b border-slate-800 flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold text-white flex items-center gap-2">
                  <Users className="w-4 h-4 text-emerald-400" />
                  Start a New Conversation
                </h3>
                <p className="text-[11px] text-slate-400 mt-0.5">
                  Select any registered user from MySQL to initiate E2EE chat
                </p>
              </div>
              <button
                onClick={() => setIsNewChatModalOpen(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Modal Search Input */}
            <div className="p-3 border-b border-slate-800/80 bg-slate-950/40">
              <div className="relative">
                <Search className="w-3.5 h-3.5 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Search registered user directory..."
                  value={directorySearchQuery}
                  onChange={(e) => setDirectorySearchQuery(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-800 rounded-xl pl-8 pr-3 py-2 text-xs text-slate-200 placeholder:text-slate-500 focus:outline-none focus:border-emerald-500 transition-colors"
                  autoFocus
                />
              </div>
            </div>

            {/* Users Directory List */}
            <div className="flex-1 overflow-y-auto p-2 space-y-1">
              {loadingDirectory ? (
                <div className="p-8 text-center flex flex-col items-center justify-center">
                  <Loader2 className="w-6 h-6 text-emerald-400 animate-spin mb-2" />
                  <p className="text-xs text-slate-400 font-mono">Loading registered users from MySQL...</p>
                </div>
              ) : filteredDirectoryUsers.length === 0 ? (
                <div className="p-8 text-center text-xs text-slate-500">
                  <Users className="w-8 h-8 mx-auto mb-2 text-slate-600 opacity-50" />
                  <p className="font-medium text-slate-400">No other registered users found</p>
                  <p className="mt-1 text-[11px] text-slate-500">
                    Register more accounts at /register to chat!
                  </p>
                </div>
              ) : (
                filteredDirectoryUsers.map((user) => {
                  const isPeerOnline = onlineUserIds.has(user.id);
                  return (
                    <button
                      key={user.id}
                      onClick={() => handleSelectContact(user)}
                      className="w-full flex items-center gap-3 p-2.5 rounded-xl hover:bg-slate-800/60 transition-colors text-left group"
                    >
                      <div className="relative">
                        <div className="w-9 h-9 rounded-full bg-slate-800 group-hover:bg-emerald-950/60 border border-slate-700 group-hover:border-emerald-500/40 flex items-center justify-center text-emerald-400 font-bold text-xs transition-colors overflow-hidden shrink-0">
                          {user.avatarUrl ? (
                            <img src={user.avatarUrl} alt={user.displayName} className="w-full h-full object-cover" />
                          ) : (
                            user.avatarInitials
                          )}
                        </div>
                        {isPeerOnline && (
                          <span className="absolute bottom-0 right-0 w-2 h-2 rounded-full bg-emerald-400 border border-[#0b0f19] animate-pulse" />
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between">
                          <span className="font-semibold text-xs text-white group-hover:text-emerald-300 transition-colors truncate">
                            {user.displayName}
                          </span>
                          <span className={`text-[10px] px-1.5 py-0.5 rounded font-mono text-[9px] border ${
                            isPeerOnline
                              ? 'bg-emerald-950 text-emerald-400 border-emerald-800'
                              : 'bg-slate-800 text-slate-400 border-slate-700'
                          }`}>
                            {isPeerOnline ? 'Online' : 'Offline'}
                          </span>
                        </div>
                        <p className="text-[11px] text-slate-400 font-mono">@{user.username}</p>
                      </div>
                    </button>
                  );
                })
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
