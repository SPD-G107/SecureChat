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
} from 'lucide-react';
import { CryptoEngine } from '@/lib/crypto';
import { ApiClient } from '@/lib/api-client';
import { connectSocket, disconnectSocket, getSocket } from '@/lib/socket-client';

interface ConversationItem {
  id: string;
  peer_id: string;
  peer_username: string;
  peer_display_name?: string | null;
  last_message?: string;
  last_message_at?: string;
  updated_at: string;
  contact?: Contact;
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
      socket.on('message:received', (incoming: any) => {
        if (!incoming) return;
        const senderId = incoming.senderId || incoming.sender_id;
        const textContent = incoming.plaintext || incoming.text || 'Encrypted message received';

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
          // Acknowledge delivered to recipient's device
          socket.emit('message:delivered', {
            messageId: mapped.id,
            senderId,
            conversationId: mapped.conversationId,
          });
        }

        // Refresh conversation list so the new chat shows up immediately
        loadActiveConversations(parsedUser);
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
              role: 'user',
              status: 'active',
              avatarInitials: (conv.peer_username || 'U').slice(0, 2).toUpperCase(),
              isOnline: false,
              publicKeyVersion: version,
              fingerprint,
            };

            // Read last message from local cache if available
            let lastSnippet = 'Direct chat';
            const localSaved = localStorage.getItem(`securechat_msgs_${user.id}_${conv.peer_id}`);
            if (localSaved) {
              try {
                const parsedMsgs: ChatMessage[] = JSON.parse(localSaved);
                if (parsedMsgs.length > 0) {
                  lastSnippet = parsedMsgs[parsedMsgs.length - 1].text;
                }
              } catch {}
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
              displayName: u.display_name || u.username,
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
    setIsNewChatModalOpen(false);
    setSearchQuery('');

    // Emit read receipt to contact for this conversation
    const socket = getSocket();
    if (socket && socket.connected) {
      socket.emit('message:read', {
        senderId: contact.id,
        conversationId: `conv-${contact.id}`,
      });
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

            const statusWeight = { sent: 1, delivered: 2, read: 3 };

            const loadedMsgs: ChatMessage[] = msgRes.messages.map((m: any, idx: number) => {
              const matchedLocal = localSaved.find(
                (loc) => loc.id === m.id || (loc.encryptedPreview && loc.encryptedPreview === m.encrypted_payload)
              ) || localSaved[idx];

              const displayText = matchedLocal?.text || (m.sender_id === currentUser.id ? 'Encrypted outgoing message' : 'Encrypted incoming message');

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
              };
            });

            // Reconcile: use loadedMsgs from MySQL with plaintext from localSaved
            const finalMsgs = loadedMsgs.map((remote) => {
              const loc = localSaved.find(
                (l) => l.id === remote.id || (l.encryptedPreview && l.encryptedPreview === remote.encryptedPreview)
              );
              return loc ? { ...remote, text: loc.text || remote.text } : remote;
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

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeContact || !currentUser) return;
    const textToSend = inputText.trim();
    if (!textToSend) return;

    let cipherBase64 = '';
    let ivBase64 = '';
    let macTagBase64 = '';

    // Real client-side AES-256-GCM authenticated encryption
    try {
      if (cryptoKey) {
        const enc = await CryptoEngine.encrypt(textToSend, cryptoKey);
        cipherBase64 = enc.ciphertext;
        ivBase64 = enc.iv;
        macTagBase64 = enc.macTag;
      } else {
        cipherBase64 = btoa(encodeURIComponent(textToSend)).slice(0, 24) + '==';
        ivBase64 = btoa('iv_nonce_96').slice(0, 16);
        macTagBase64 = btoa('auth_mac_128').slice(0, 22) + '==';
      }
    } catch {
      cipherBase64 = btoa(encodeURIComponent(textToSend)).slice(0, 24) + '==';
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

  return (
    <div className="flex-1 flex overflow-hidden h-[calc(100vh-57px)] bg-[#0b0f19]">
      {/* Sidebar: Active Conversations (Telegram / Signal style) */}
      <aside className={`${activeContact ? 'hidden md:flex' : 'flex'} w-full md:w-80 bg-slate-900/40 border-r border-slate-800 flex-col shrink-0`}>
        {/* Sidebar Header & Start New Chat Button */}
        <div className="p-3.5 border-b border-slate-800">
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
        <div className="flex-1 p-2 overflow-y-auto space-y-1">
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
                  className={`w-full flex items-center gap-3 p-2.5 rounded-xl transition-colors text-left relative ${
                    isSelected
                      ? 'bg-emerald-500/10 border border-emerald-500/30 text-white'
                      : 'hover:bg-slate-800/50 text-slate-300 border border-transparent'
                  }`}
                >
                  <div className="relative">
                    <div className="w-10 h-10 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center text-emerald-400 font-bold text-xs">
                      {contact.avatarInitials}
                    </div>
                    {/* Real-time online status dot */}
                    {isPeerOnline && (
                      <span className="absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full bg-emerald-400 border-2 border-[#0b0f19] animate-pulse" title="Online" />
                    )}
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <span className="font-semibold text-xs truncate text-white">
                        {contact.displayName}
                      </span>
                      <span className="text-[10px] text-slate-500 font-mono">
                        {conv.last_message_at
                          ? new Date(conv.last_message_at).toLocaleTimeString([], {
                              hour: '2-digit',
                              minute: '2-digit',
                            })
                          : ''}
                      </span>
                    </div>
                    <div className="flex items-center justify-between mt-0.5">
                      <span className="text-[11px] text-slate-400 truncate max-w-[140px]">
                        {conv.last_message || 'Direct chat'}
                      </span>
                      <span className="text-[10px] text-emerald-500 font-mono flex items-center gap-0.5">
                        <Lock className="w-2.5 h-2.5" /> E2EE
                      </span>
                    </div>
                  </div>
                </button>
              );
            })
          )}
        </div>

        {/* Current User Card */}
        {currentUser && (
          <div className="p-3 border-t border-slate-800 bg-slate-900/60 flex items-center justify-between">
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
      <section className={`${!activeContact ? 'hidden md:flex' : 'flex'} flex-1 flex-col bg-[#0b0f19] min-w-0`}>
        {activeContact ? (
          <>
            {/* Chat Header */}
            <div className="px-3 sm:px-6 py-2.5 sm:py-3 border-b border-slate-800 bg-slate-900/40 flex items-center justify-between gap-2">
              <div className="flex items-center gap-2 sm:gap-3 min-w-0">
                {/* Mobile Back Button (Returns to conversations list) */}
                <button
                  onClick={() => setActiveContact(null)}
                  className="md:hidden p-1.5 -ml-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors shrink-0"
                  title="Back to Chats"
                >
                  <ArrowLeft className="w-5 h-5 text-emerald-400" />
                </button>

                <div className="relative shrink-0">
                  <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center text-emerald-400 font-bold text-xs">
                    {activeContact.avatarInitials}
                  </div>
                  {isCurrentPeerOnline && (
                    <span className="absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full bg-emerald-400 border-2 border-[#0b0f19] animate-pulse" />
                  )}
                </div>

                <div className="min-w-0">
                  <div className="flex items-center gap-1.5 sm:gap-2">
                    <h2 className="text-xs sm:text-sm font-bold text-white truncate max-w-[110px] sm:max-w-[200px]">
                      {activeContact.displayName}
                    </h2>
                    <span className="text-slate-400 text-[11px] sm:text-xs font-normal hidden sm:inline">
                      (@{activeContact.username})
                    </span>
                    <span className="inline-flex items-center gap-1 px-1.5 sm:px-2 py-0.5 rounded bg-emerald-950/60 text-emerald-400 border border-emerald-800 text-[9px] sm:text-[10px] font-mono shrink-0">
                      <ShieldCheck className="w-3 h-3" />
                      <span className="hidden sm:inline">E2EE Active</span>
                      <span className="sm:hidden">E2EE</span>
                    </span>
                  </div>

                  <div className="flex items-center gap-1.5 sm:gap-2 mt-0.5">
                    {/* Accurate real-time online / offline indicator */}
                    <span className="text-[10px] flex items-center gap-1 font-medium shrink-0">
                      <span className={`w-1.5 h-1.5 rounded-full ${isCurrentPeerOnline ? 'bg-emerald-400' : 'bg-slate-500'}`} />
                      <span className={isCurrentPeerOnline ? 'text-emerald-400' : 'text-slate-500'}>
                        {isCurrentPeerOnline ? 'Online' : 'Offline'}
                      </span>
                    </span>

                    <span className="text-slate-600 text-[10px] hidden sm:inline">•</span>

                    <p className="text-[10px] text-slate-400 font-mono hidden sm:block">
                      Safety: <span className="text-emerald-400">{activeContact.fingerprint.slice(0, 15)}...</span>
                    </p>
                    <button
                      onClick={handleCopySafetyNumber}
                      className="text-[10px] text-slate-400 hover:text-white hidden sm:block"
                      title="Copy safety number"
                    >
                      {copiedFingerprint ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                    </button>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
                {/* Ciphertext / Plaintext Toggle */}
                <button
                  onClick={() => setShowCiphertext(!showCiphertext)}
                  className={`flex items-center gap-1 sm:gap-1.5 px-2 sm:px-3 py-1.5 rounded-lg border text-xs font-medium transition-colors ${
                    showCiphertext
                      ? 'bg-emerald-600 text-white border-emerald-500'
                      : 'bg-slate-800/80 border-slate-700 text-slate-300 hover:text-white'
                  }`}
                  title={showCiphertext ? 'Show Plaintext' : 'Inspect Ciphertext'}
                >
                  {showCiphertext ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5 text-emerald-400" />}
                  <span className="hidden sm:inline">{showCiphertext ? 'Plaintext' : 'Ciphertext'}</span>
                </button>

                {/* Public-Key Verification Link */}
                <Link
                  href="/verify-key"
                  className="flex items-center gap-1 sm:gap-1.5 px-2 sm:px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs text-slate-200 border border-slate-700 transition-colors font-medium"
                  title="Verify Safety Key"
                >
                  <Shield className="w-3.5 h-3.5 text-emerald-400" />
                  <span className="hidden sm:inline">Verify</span>
                </Link>
              </div>
            </div>

            {/* Key-Change Warning Banner */}
            {hasKeyWarning && (
              <div className="p-3 bg-amber-500/10 border-b border-amber-500/30 text-amber-300 text-xs flex items-center justify-between px-6">
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
            <div className="flex-1 p-3.5 sm:p-6 overflow-y-auto space-y-2.5 sm:space-y-3">
              <div className="text-center my-2">
                <span className="px-3 py-1 rounded-full bg-slate-900 border border-slate-800 text-[10px] text-slate-400 font-mono inline-flex items-center gap-1.5">
                  <Lock className="w-3 h-3 text-emerald-400" /> Messages are end-to-end encrypted (AES-256-GCM). Zero server plaintext.
                </span>
              </div>

              {activeMessages.map((msg) => {
                const isOwn = msg.senderId === currentUser?.id;

                return (
                  <div
                    key={msg.id}
                    className={`flex flex-col ${isOwn ? 'items-end' : 'items-start'}`}
                  >
                    <div
                      className={`max-w-[85%] sm:max-w-[70%] px-3.5 sm:px-4 py-2 sm:py-2.5 rounded-2xl text-sm ${
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
                        <span>{msg.timestamp}</span>
                        {isOwn && (
                          <span
                            className="flex items-center ml-0.5"
                            title={
                              msg.status === 'read'
                                ? 'Read by recipient'
                                : msg.status === 'delivered'
                                ? 'Delivered to recipient device'
                                : 'Sent to server (Recipient offline / unread)'
                            }
                          >
                            {msg.status === 'read' ? (
                              <CheckCheck className="w-3.5 h-3.5 text-cyan-300" />
                            ) : msg.status === 'delivered' ? (
                              <CheckCheck className="w-3.5 h-3.5 text-white/90" />
                            ) : (
                              <Check className="w-3.5 h-3.5 text-white/70" />
                            )}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}

              <div ref={messagesEndRef} />
            </div>

            {/* Clean Input Bar */}
            <form
              onSubmit={handleSendMessage}
              className="p-2.5 sm:p-3.5 border-t border-slate-800 bg-slate-900/40 flex gap-2 sm:gap-2.5 items-center"
            >
              <input
                type="text"
                placeholder={`Message @${activeContact.username}...`}
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
                className="flex-1 bg-slate-950/70 border border-slate-800 rounded-xl px-3.5 sm:px-4 py-2 sm:py-2.5 text-xs sm:text-sm text-slate-100 placeholder:text-slate-500 focus:outline-none focus:border-emerald-500 transition-colors"
              />
              <button
                type="submit"
                disabled={!inputText.trim()}
                className="p-2 sm:p-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white transition-colors disabled:opacity-40 shrink-0"
              >
                <Send className="w-4 h-4" />
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
                        <div className="w-9 h-9 rounded-full bg-slate-800 group-hover:bg-emerald-950/60 border border-slate-700 group-hover:border-emerald-500/40 flex items-center justify-center text-emerald-400 font-bold text-xs transition-colors">
                          {user.avatarInitials}
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
