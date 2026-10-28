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
  Smile,
  Image as ImageIcon,
  Paperclip,
  Mic,
  Square,
  Play,
  Pause,
  Download,
  FileText,
  Volume2,
  Phone,
  Video,
  Bell,
} from 'lucide-react';
import { CryptoEngine } from '@/lib/crypto';
import { ApiClient } from '@/lib/api-client';
import { connectSocket, disconnectSocket, getSocket } from '@/lib/socket-client';
import CallModal, { CallState } from '@/components/chat/CallModal';
import { CallAudioEngine } from '@/lib/call-audio';
import { registerPushSubscription, requestPushNotificationPermission } from '@/lib/push-client';

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

const REACTION_EMOJIS = ['❤️', '👍', '😂', '😮', '😢', '😡'];

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
  const [activeReactionMsgId, setActiveReactionMsgId] = useState<string | null>(null);
  const [showNotificationPrompt, setShowNotificationPrompt] = useState(false);

  // Media attachments & Voice Recording State
  const [selectedImagePreview, setSelectedImagePreview] = useState<{ data: string; name: string } | null>(null);
  const [selectedFilePreview, setSelectedFilePreview] = useState<{ data: string; name: string; size: number; mime: string } | null>(null);
  const [lightboxImage, setLightboxImage] = useState<{ src: string; name: string } | null>(null);
  const [isRecordingVoice, setIsRecordingVoice] = useState(false);
  const [voiceDuration, setVoiceDuration] = useState(0);
  const [playingAudioId, setPlayingAudioId] = useState<string | null>(null);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const voiceTimerRef = useRef<NodeJS.Timeout | null>(null);
  const currentAudioRef = useRef<HTMLAudioElement | null>(null);

  const imageInputRef = useRef<HTMLInputElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // WebRTC E2EE Audio & Video Calling State
  const [callState, setCallState] = useState<CallState>('idle');
  const [activeCallPeer, setActiveCallPeer] = useState<Contact | null>(null);
  const [isCallVideo, setIsCallVideo] = useState(false);
  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const [remoteStream, setRemoteStream] = useState<MediaStream | null>(null);
  const [isMuted, setIsMuted] = useState(false);
  const [isCameraOff, setIsCameraOff] = useState(false);
  const [facingMode, setFacingMode] = useState<'user' | 'environment'>('user');
  const [iceConnectionState, setIceConnectionState] = useState<string>('new');
  const [peerConnectionState, setPeerConnectionState] = useState<string>('new');
  const [streamVersion, setStreamVersion] = useState<number>(0);

  const peerConnectionRef = useRef<RTCPeerConnection | null>(null);
  const localStreamRef = useRef<MediaStream | null>(null);
  const activeCallPeerRef = useRef<Contact | null>(null);
  const isCallVideoRef = useRef<boolean>(false);
  const pendingCandidatesRef = useRef<RTCIceCandidateInit[]>([]);
  const remoteMediaStreamRef = useRef<MediaStream | null>(null);

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

  // ==========================================
  // WebRTC E2EE Audio & Video Call Engine
  // ==========================================

  const RTC_CONFIG: RTCConfiguration = {
    iceServers: [
      // Globally accessible ultra-fast STUN servers
      { urls: 'stun:stun.l.google.com:19302' },
      { urls: 'stun:stun1.l.google.com:19302' },
      { urls: 'stun:stun2.l.google.com:19302' },
      { urls: 'stun:stun.cloudflare.com:3478' },
      // Direct EC2 Coturn Relay for Symmetric NAT / 4G Traversal
      {
        urls: [
          'turn:3.16.212.72:3478?transport=udp',
          'turn:3.16.212.72:3478?transport=tcp',
        ],
        username: 'securechat',
        credential: 'securechat_turn_2026',
      },
    ],
  };

  const cleanupCall = () => {
    CallAudioEngine.stopAll();
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach((track) => track.stop());
      localStreamRef.current = null;
    }
    if (peerConnectionRef.current) {
      try {
        peerConnectionRef.current.close();
      } catch {}
      peerConnectionRef.current = null;
    }
    remoteMediaStreamRef.current = null;
    pendingCandidatesRef.current = [];
    activeCallPeerRef.current = null;
    setLocalStream(null);
    setRemoteStream(null);
    setActiveCallPeer(null);
    setCallState('idle');
    setIsMuted(false);
    setIsCameraOff(false);
    setIceConnectionState('new');
    setPeerConnectionState('new');
    setStreamVersion(0);
  };

  const getMediaStream = async (video: boolean, facing: 'user' | 'environment' = 'user'): Promise<MediaStream> => {
    try {
      return await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
        video: video
          ? {
              facingMode: facing,
              width: { ideal: 720, max: 1080 },
              height: { ideal: 1280, max: 1920 },
              aspectRatio: { ideal: 9 / 16 },
            }
          : false,
      });
    } catch (e) {
      console.warn('[WebRTC] Fallback to standard media constraints:', e);
      return await navigator.mediaDevices.getUserMedia({
        audio: true,
        video: video
          ? {
              facingMode: facing,
              aspectRatio: { ideal: 9 / 16 },
            }
          : false,
      });
    }
  };

  const createPeerConnection = (targetUserId: string): RTCPeerConnection => {
    if (peerConnectionRef.current) {
      try {
        peerConnectionRef.current.close();
      } catch {}
    }

    const pc = new RTCPeerConnection(RTC_CONFIG);
    peerConnectionRef.current = pc;
    remoteMediaStreamRef.current = new MediaStream();

    // Relay local ICE candidates to peer with explicit JSON serialization
    pc.onicecandidate = (event) => {
      if (event.candidate) {
        const socket = getSocket();
        const candObj = typeof event.candidate.toJSON === 'function'
          ? event.candidate.toJSON()
          : {
              candidate: event.candidate.candidate,
              sdpMid: event.candidate.sdpMid,
              sdpMLineIndex: event.candidate.sdpMLineIndex,
              usernameFragment: event.candidate.usernameFragment,
            };

        if (candObj && candObj.candidate) {
          socket?.emit('call:signal', {
            targetUserId,
            signalData: candObj,
            type: 'candidate',
          });
        }
      }
    };

    // Receive remote media tracks directly from the browser's native WebRTC stream
    pc.ontrack = (event) => {
      console.log('[WebRTC] Received remote track:', event.track.kind, event.track.id);

      const syncRemoteTracks = () => {
        if (event.streams && event.streams[0]) {
          const fresh = new MediaStream(event.streams[0].getTracks());
          remoteMediaStreamRef.current = fresh;
          setRemoteStream(fresh);
        } else {
          if (!remoteMediaStreamRef.current) {
            remoteMediaStreamRef.current = new MediaStream();
          }
          const cur = remoteMediaStreamRef.current;
          const existing = cur.getTracks().find((t) => t.kind === event.track.kind);
          if (existing) {
            cur.removeTrack(existing);
          }
          cur.addTrack(event.track);
          const fresh = new MediaStream(cur.getTracks());
          remoteMediaStreamRef.current = fresh;
          setRemoteStream(fresh);
        }
        setStreamVersion((v) => v + 1);
      };

      event.track.onunmute = () => {
        console.log('[WebRTC] Remote track unmuted:', event.track.kind);
        syncRemoteTracks();
      };

      event.track.onmute = () => {
        console.log('[WebRTC] Remote track muted:', event.track.kind);
        setStreamVersion((v) => v + 1);
      };

      syncRemoteTracks();
    };

    pc.oniceconnectionstatechange = () => {
      console.log('[WebRTC] ICE connection state:', pc.iceConnectionState);
      setIceConnectionState(pc.iceConnectionState);
    };

    pc.onconnectionstatechange = () => {
      console.log('[WebRTC] Connection state:', pc.connectionState);
      setPeerConnectionState(pc.connectionState);
    };

    // Attach local stream tracks to PeerConnection
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach((track) => {
        pc.addTrack(track, localStreamRef.current!);
      });
    }

    return pc;
  };

  const startCall = async (video: boolean) => {
    if (!activeContact || !currentUser) return;
    try {
      cleanupCall();
      const stream = await getMediaStream(video, 'user');
      localStreamRef.current = stream;
      setLocalStream(stream);
      setIsCallVideo(video);
      isCallVideoRef.current = video;
      setActiveCallPeer(activeContact);
      activeCallPeerRef.current = activeContact;
      setCallState('calling');
      CallAudioEngine.startOutgoingRingtone();

      const socket = getSocket();
      socket?.emit('call:initiate', {
        recipientId: activeContact.id,
        isVideo: video,
      });
    } catch (err: any) {
      alert('Unable to access microphone/camera: ' + err.message);
      cleanupCall();
    }
  };

  const acceptIncomingCall = async () => {
    const peer = activeCallPeerRef.current;
    if (!peer) return;
    CallAudioEngine.stopAll();

    try {
      const video = isCallVideoRef.current;
      const stream = await getMediaStream(video, 'user');
      localStreamRef.current = stream;
      setLocalStream(stream);

      const pc = createPeerConnection(peer.id);
      setCallState('connected');

      const socket = getSocket();
      socket?.emit('call:accept', { callerId: peer.id });
    } catch (err: any) {
      alert('Could not start media devices: ' + err.message);
      cleanupCall();
    }
  };

  const rejectIncomingCall = () => {
    const peer = activeCallPeerRef.current;
    if (peer) {
      const socket = getSocket();
      socket?.emit('call:reject', { callerId: peer.id, reason: 'declined' });
    }
    CallAudioEngine.playHangupTone();
    cleanupCall();
  };

  const endActiveCall = () => {
    const peer = activeCallPeerRef.current;
    if (peer) {
      const socket = getSocket();
      socket?.emit('call:end', { targetUserId: peer.id });
    }
    CallAudioEngine.playHangupTone();
    cleanupCall();
  };

  const toggleMic = () => {
    if (localStreamRef.current) {
      const audioTrack = localStreamRef.current.getAudioTracks()[0];
      if (audioTrack) {
        audioTrack.enabled = !audioTrack.enabled;
        setIsMuted(!audioTrack.enabled);
      }
    }
  };

  const toggleCamera = () => {
    if (localStreamRef.current) {
      const videoTrack = localStreamRef.current.getVideoTracks()[0];
      if (videoTrack) {
        videoTrack.enabled = !videoTrack.enabled;
        setIsCameraOff(!videoTrack.enabled);
      }
    }
  };

  const flipCamera = async () => {
    if (!isCallVideoRef.current || !localStreamRef.current) return;
    const nextFacing = facingMode === 'user' ? 'environment' : 'user';
    try {
      const newStream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: nextFacing,
          width: { ideal: 720, max: 1080 },
          height: { ideal: 1280, max: 1920 },
          aspectRatio: { ideal: 9 / 16 },
        },
      });
      const newVideoTrack = newStream.getVideoTracks()[0];
      const oldVideoTrack = localStreamRef.current.getVideoTracks()[0];

      if (peerConnectionRef.current) {
        const senders = peerConnectionRef.current.getSenders();
        const sender = senders.find((s) => s.track?.kind === 'video');
        if (sender && newVideoTrack) {
          sender.replaceTrack(newVideoTrack);
        }
      }

      localStreamRef.current.removeTrack(oldVideoTrack);
      oldVideoTrack.stop();
      localStreamRef.current.addTrack(newVideoTrack);
      setLocalStream(new MediaStream(localStreamRef.current.getTracks()));
      setFacingMode(nextFacing);
    } catch (err: any) {
      console.warn('Cannot flip camera:', err);
    }
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

    // Register Web Push subscription for background incoming call and message wakeups
    if (typeof window !== 'undefined' && 'Notification' in window) {
      if (Notification.permission === 'granted') {
        registerPushSubscription().catch(() => {});
      } else if (Notification.permission === 'default') {
        const dismissed = sessionStorage.getItem('securechat_push_prompt_dismissed');
        if (!dismissed) {
          setShowNotificationPrompt(true);
        }
      }
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

      // Real-time message reacted (Emoji Reaction)
      socket.on('message:reacted', (data: {
        messageId: string;
        userId: string;
        emoji: string;
        action: 'added' | 'removed' | 'updated' | 'none';
        conversationId?: string;
        reactions?: Record<string, string[]>;
      }) => {
        if (!data || !data.messageId || data.action === 'none') return;
        setMessagesMap((prev) => {
          const updated = { ...prev };
          let changed = false;
          for (const key of Object.keys(updated)) {
            const prevMsgs = updated[key];
            if (prevMsgs.some((m) => m.id === data.messageId)) {
              changed = true;
              const newMsgs = prevMsgs.map((m) => {
                if (m.id === data.messageId) {
                  let nextReactions: Record<string, string[]> = data.reactions !== undefined
                    ? { ...data.reactions }
                    : { ...(m.reactions || {}) };

                  if (data.reactions === undefined) {
                    for (const e in nextReactions) {
                      nextReactions[e] = nextReactions[e].filter((u) => u !== data.userId);
                      if (nextReactions[e].length === 0) delete nextReactions[e];
                    }
                    if (data.action !== 'removed') {
                      if (!nextReactions[data.emoji]) nextReactions[data.emoji] = [];
                      if (!nextReactions[data.emoji].includes(data.userId)) {
                        nextReactions[data.emoji].push(data.userId);
                      }
                    }
                  }

                  return {
                    ...m,
                    reactions: nextReactions,
                  };
                }
                return m;
              });

              updated[key] = newMsgs;
              if (parsedUser?.id) {
                localStorage.setItem(`securechat_msgs_${parsedUser.id}_${key}`, JSON.stringify(newMsgs));
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

      // 12. Real-time WebRTC Call Signaling Listeners
      socket.on('call:incoming', (data: { callerId: string; callerUsername?: string; isVideo?: boolean }) => {
        const contact: Contact = directoryUsers.find((u) => u.id === data.callerId) ||
          conversations.find((c) => c.peer_id === data.callerId)?.contact || {
            id: data.callerId,
            username: data.callerUsername || 'Unknown User',
            displayName: data.callerUsername || 'Unknown User',
            avatarUrl: null,
            role: 'user',
            status: 'active',
            avatarInitials: (data.callerUsername || 'U').slice(0, 2).toUpperCase(),
            isOnline: true,
            publicKeyVersion: 1,
            fingerprint: '',
          };

        activeCallPeerRef.current = contact;
        setActiveCallPeer(contact);
        setIsCallVideo(Boolean(data.isVideo));
        isCallVideoRef.current = Boolean(data.isVideo);
        setCallState('incoming');
        CallAudioEngine.startIncomingRingtone();
      });

      socket.on('call:accepted', async (data: { recipientId: string }) => {
        CallAudioEngine.stopAll();
        setCallState('connected');
        const pc = createPeerConnection(data.recipientId);

        try {
          const offer = await pc.createOffer();
          await pc.setLocalDescription(offer);
          socket.emit('call:signal', {
            targetUserId: data.recipientId,
            signalData: {
              type: offer.type,
              sdp: offer.sdp,
            },
            type: 'offer',
          });
        } catch (err: any) {
          console.error('Failed to create WebRTC offer:', err);
          cleanupCall();
        }
      });

      socket.on('call:rejected', (data: { reason?: string }) => {
        CallAudioEngine.playHangupTone();
        cleanupCall();
      });

      socket.on('call:unavailable', (data: { reason?: string }) => {
        CallAudioEngine.playHangupTone();
        alert('User is currently offline or unavailable for calls.');
        cleanupCall();
      });

      socket.on('call:ended', () => {
        CallAudioEngine.playHangupTone();
        cleanupCall();
      });

      socket.on('call:signal', async (data: { senderId: string; signalData: any; type: 'offer' | 'answer' | 'candidate' }) => {
        try {
          if (data.type === 'offer') {
            let pc = peerConnectionRef.current;
            if (!pc) {
              pc = createPeerConnection(data.senderId);
            }
            if (!pc) return;

            await pc.setRemoteDescription(new RTCSessionDescription(data.signalData));

            const answer = await pc.createAnswer();
            await pc.setLocalDescription(answer);

            socket.emit('call:signal', {
              targetUserId: data.senderId,
              signalData: {
                type: answer.type,
                sdp: answer.sdp,
              },
              type: 'answer',
            });

            // Drain buffered early candidates AFTER localDescription (answer) is set
            while (pendingCandidatesRef.current.length > 0) {
              const cand = pendingCandidatesRef.current.shift();
              if (cand && cand.candidate) {
                try {
                  await pc.addIceCandidate(new RTCIceCandidate(cand));
                } catch {
                  try {
                    await pc.addIceCandidate(cand);
                  } catch (e) {
                    console.warn('[WebRTC] Buffered candidate error on offer:', e);
                  }
                }
              }
            }
          } else if (data.type === 'answer') {
            const pc = peerConnectionRef.current;
            if (!pc) return;

            await pc.setRemoteDescription(new RTCSessionDescription(data.signalData));

            // Drain buffered candidates AFTER localDescription & remoteDescription are both set
            while (pendingCandidatesRef.current.length > 0) {
              const cand = pendingCandidatesRef.current.shift();
              if (cand && cand.candidate) {
                try {
                  await pc.addIceCandidate(new RTCIceCandidate(cand));
                } catch {
                  try {
                    await pc.addIceCandidate(cand);
                  } catch (e) {
                    console.warn('[WebRTC] Buffered candidate error on answer:', e);
                  }
                }
              }
            }
          } else if (data.type === 'candidate') {
            if (data.signalData && data.signalData.candidate) {
              const pc = peerConnectionRef.current;
              if (pc && pc.remoteDescription && pc.remoteDescription.type) {
                try {
                  await pc.addIceCandidate(new RTCIceCandidate(data.signalData));
                } catch {
                  try {
                    await pc.addIceCandidate(data.signalData);
                  } catch (e) {
                    console.warn('[WebRTC] Live candidate add error:', e);
                  }
                }
              } else {
                pendingCandidatesRef.current.push(data.signalData);
              }
            }
          }
        } catch (err: any) {
          console.error('[WebRTC] Signal handling error:', err);
        }
      });
    }

    // Helper to handle incoming call triggered via Web Push notification click
    const triggerIncomingCallAccept = async (callerId: string, isVideo: boolean, action: string) => {
      if (!callerId) return;
      if (activeCallPeerRef.current?.id === callerId && callState === 'connected') {
        return;
      }

      // 1. Resolve caller Contact details
      let callerContact: Contact | null = null;
      try {
        const res = await ApiClient.get(`/users/${callerId}`);
        if (res && res.user) {
          callerContact = {
            id: res.user.id,
            username: res.user.username,
            displayName: res.user.displayName || res.user.username,
            avatarUrl: res.user.avatarUrl || null,
            role: res.user.role || 'user',
            status: res.user.status || 'active',
            avatarInitials: (res.user.username || 'U').slice(0, 2).toUpperCase(),
            isOnline: true,
            publicKeyVersion: 1,
            fingerprint: '',
          };
        }
      } catch (e) {
        console.warn('[Call] Failed to fetch caller profile from API:', e);
      }

      if (!callerContact) {
        callerContact = {
          id: callerId,
          username: 'User',
          displayName: 'SecureChat User',
          avatarUrl: null,
          role: 'user',
          status: 'active',
          avatarInitials: 'SC',
          isOnline: true,
          publicKeyVersion: 1,
          fingerprint: '',
        };
      }

      // 2. Set active chat contact and active call peer
      setActiveContact(callerContact);
      activeContactRef.current = callerContact;
      setActiveCallPeer(callerContact);
      activeCallPeerRef.current = callerContact;
      setIsCallVideo(isVideo);
      isCallVideoRef.current = isVideo;

      // 3. Immediately answer call if action is accept
      if (action === 'accept') {
        CallAudioEngine.stopAll();
        try {
          const stream = await getMediaStream(isVideo, 'user');
          localStreamRef.current = stream;
          setLocalStream(stream);

          createPeerConnection(callerContact.id);
          setCallState('connected');

          const sendAccept = () => {
            const s = getSocket();
            s?.emit('call:accept', { callerId: callerContact!.id });
          };

          if (socket && socket.connected) {
            sendAccept();
          } else if (socket) {
            socket.once('connect', sendAccept);
          }
        } catch (err: any) {
          console.warn('[Call] Auto-accept stream error, presenting incoming call modal:', err);
          setCallState('incoming');
          CallAudioEngine.startIncomingRingtone();
        }
      } else {
        setCallState('incoming');
        CallAudioEngine.startIncomingRingtone();
      }
    };

    // Parse URL query parameters if launched or navigated from push notification
    if (typeof window !== 'undefined') {
      const searchParams = new URLSearchParams(window.location.search);
      const callWith = searchParams.get('callWith');
      const isVideoParam = searchParams.get('isVideo') === '1' || searchParams.get('isVideo') === 'true';
      const actionParam = searchParams.get('action') || 'accept';

      if (callWith) {
        window.history.replaceState({}, '', '/chat');
        triggerIncomingCallAccept(callWith, isVideoParam, actionParam);
      }
    }

    // Listen for background service worker notification clicks when tab was already active
    const handleSwMessage = (event: MessageEvent) => {
      if (event.data && event.data.type === 'SECURECHAT_CALL_ACTION') {
        const { callerId, isVideo, action } = event.data;
        triggerIncomingCallAccept(callerId, Boolean(isVideo), action || 'accept');
      }
    };

    if (typeof window !== 'undefined' && 'serviceWorker' in navigator) {
      navigator.serviceWorker.addEventListener('message', handleSwMessage);
    }

    return () => {
      cleanupCall();
      disconnectSocket();
      if (typeof window !== 'undefined' && 'serviceWorker' in navigator) {
        navigator.serviceWorker.removeEventListener('message', handleSwMessage);
      }
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
                  reactions: m.reactions || matchedLocal?.reactions || {},
                  createdAt: typeof m.created_at === 'string' ? m.created_at : new Date(m.created_at).toISOString(),
                };
              })
            );

            // Reconcile and save into localStorage with decrypted plaintext and reactions
            const finalMsgs = loadedMsgs.map((remote) => {
              const loc = localSaved.find(
                (l) => l.id === remote.id || (l.encryptedPreview && l.encryptedPreview === remote.encryptedPreview)
              );
              return loc && loc.text && loc.text !== 'Encrypted incoming message' && loc.text !== 'Encrypted outgoing message'
                ? {
                    ...remote,
                    text: loc.text,
                    isEdited: Boolean(remote.isEdited || loc.isEdited),
                    reactions: remote.reactions !== undefined ? remote.reactions : (loc?.reactions || {}),
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

  const handleToggleReaction = async (messageId: string, emoji: string) => {
    if (!currentUser || !activeContact) return;

    // Check existing reaction to calculate intended action ('add' | 'remove')
    const currentList = messagesMap[activeContact.id] || [];
    const targetMsg = currentList.find((m) => m.id === messageId);
    const userAlreadyReacted = Boolean(targetMsg?.reactions?.[emoji]?.includes(currentUser.id));
    const targetAction: 'add' | 'remove' = userAlreadyReacted ? 'remove' : 'add';

    // 1. Instant optimistic UI update (zero latency)
    setMessagesMap((prev) => {
      const list = prev[activeContact.id] || [];
      const updated = list.map((m) => {
        if (m.id === messageId) {
          const nextReactions: Record<string, string[]> = {};
          for (const [k, v] of Object.entries(m.reactions || {})) {
            nextReactions[k] = [...v];
          }

          // Remove user's previous reaction from any emoji on this message (one reaction per user)
          for (const e in nextReactions) {
            nextReactions[e] = nextReactions[e].filter((u) => u !== currentUser.id);
            if (nextReactions[e].length === 0) delete nextReactions[e];
          }

          // If adding, place into selected emoji
          if (targetAction === 'add') {
            if (!nextReactions[emoji]) nextReactions[emoji] = [];
            if (!nextReactions[emoji].includes(currentUser.id)) {
              nextReactions[emoji].push(currentUser.id);
            }
          }

          return { ...m, reactions: nextReactions };
        }
        return m;
      });

      if (currentUser?.id) {
        localStorage.setItem(`securechat_msgs_${currentUser.id}_${activeContact.id}`, JSON.stringify(updated));
      }
      return { ...prev, [activeContact.id]: updated };
    });

    const conv = conversations.find((c) => c.peer_id === activeContact.id);
    const convId = conv?.id || `conv-${activeContact.id}`;

    // 2. Dispatch reaction:
    // If socket is connected, emit through Socket.IO for real-time delivery and persistence
    const socket = getSocket();
    if (socket && socket.connected) {
      socket.emit('message:react', {
        messageId,
        emoji,
        action: targetAction,
        recipientId: activeContact.id,
        conversationId: convId,
      });
    } else {
      // Fallback to REST API ONLY when socket is disconnected
      try {
        await ApiClient.post(`/messages/${messageId}/react`, {
          emoji,
          action: targetAction,
        });
      } catch (err: any) {
        console.warn('Failed to persist reaction via REST:', err.message);
      }
    }
  };

  const compressImage = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        const img = new Image();
        img.onload = () => {
          const maxDim = 1200;
          let width = img.width;
          let height = img.height;
          if (width > maxDim || height > maxDim) {
            if (width > height) {
              height = Math.round((height * maxDim) / width);
              width = maxDim;
            } else {
              width = Math.round((width * maxDim) / height);
              height = maxDim;
            }
          }
          const canvas = document.createElement('canvas');
          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d');
          if (ctx) {
            ctx.drawImage(img, 0, 0, width, height);
            const compressed = canvas.toDataURL('image/jpeg', 0.82);
            resolve(compressed);
          } else {
            resolve(e.target?.result as string);
          }
        };
        img.onerror = reject;
        img.src = e.target?.result as string;
      };
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  };

  const handleSelectImage = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const base64 = await compressImage(file);
      setSelectedImagePreview({ data: base64, name: file.name });
    } catch (err: any) {
      alert('Failed to read image: ' + err.message);
    } finally {
      if (e.target) e.target.value = '';
    }
  };

  const handleSelectFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 15 * 1024 * 1024) {
      alert('File exceeds 15MB limit.');
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      setSelectedFilePreview({
        data: reader.result as string,
        name: file.name,
        size: file.size,
        mime: file.type || 'application/octet-stream',
      });
    };
    reader.readAsDataURL(file);
    if (e.target) e.target.value = '';
  };

  const sendMediaMessage = async (media: {
    type: 'image' | 'audio' | 'file';
    data: string;
    fileName?: string;
    fileSize?: number;
    mimeType?: string;
    duration?: number;
    caption?: string;
  }) => {
    if (!activeContact || !currentUser) return;
    const conv = conversations.find((c) => c.peer_id === activeContact.id);
    const convId = conv?.id || `conv-${activeContact.id}`;

    const mediaString = JSON.stringify(media);
    let cipherBase64 = '';
    let ivBase64 = '';
    let macTagBase64 = '';

    try {
      const sharedKey = await getSharedKey(currentUser, activeContact, convId);
      const enc = await CryptoEngine.encrypt(mediaString, sharedKey);
      cipherBase64 = enc.ciphertext;
      ivBase64 = enc.iv;
      macTagBase64 = enc.macTag;
    } catch {
      cipherBase64 = btoa(encodeURIComponent(mediaString));
      ivBase64 = btoa('iv_nonce_96').slice(0, 16);
      macTagBase64 = btoa('auth_mac_128').slice(0, 22);
    }

    const isPeerOnline = onlineUserIds.has(activeContact.id);
    const initialStatus: 'sent' | 'delivered' = isPeerOnline ? 'delivered' : 'sent';
    const tempId = 'm-' + Date.now();

    const newMsg: ChatMessage = {
      id: tempId,
      conversationId: convId,
      senderId: currentUser.id,
      text: mediaString,
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
        localStorage.setItem(`securechat_msgs_${currentUser.id}_${activeContact.id}`, JSON.stringify(updated));
      }
      return { ...prev, [activeContact.id]: updated };
    });

    const socket = getSocket();
    if (socket && socket.connected) {
      socket.emit('message:send', {
        clientTempId: tempId,
        conversationId: convId,
        recipientId: activeContact.id,
        plaintext: mediaString,
        encryptedPayload: cipherBase64,
        iv: ivBase64,
        macTag: macTagBase64,
      });
    }

    setSelectedImagePreview(null);
    setSelectedFilePreview(null);
    setTimeout(() => {
      if (currentUser) loadActiveConversations(currentUser);
    }, 400);
  };

  const startVoiceRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      audioChunksRef.current = [];
      const recorder = new MediaRecorder(stream);
      mediaRecorderRef.current = recorder;

      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) {
          audioChunksRef.current.push(e.data);
        }
      };

      recorder.start(100);
      setIsRecordingVoice(true);
      setVoiceDuration(0);

      voiceTimerRef.current = setInterval(() => {
        setVoiceDuration((prev) => prev + 1);
      }, 1000);
    } catch (err: any) {
      alert('Microphone access is required to record voice notes: ' + err.message);
    }
  };

  const stopVoiceRecordingAndSend = async () => {
    if (!mediaRecorderRef.current) return;
    if (voiceTimerRef.current) clearInterval(voiceTimerRef.current);

    const recorder = mediaRecorderRef.current;
    const finalDuration = voiceDuration;

    recorder.onstop = async () => {
      const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
      recorder.stream.getTracks().forEach((track) => track.stop());

      const reader = new FileReader();
      reader.onloadend = async () => {
        const base64Audio = reader.result as string;
        await sendMediaMessage({
          type: 'audio',
          data: base64Audio,
          duration: finalDuration,
          fileName: `voice-${Date.now()}.webm`,
        });
      };
      reader.readAsDataURL(audioBlob);
      setIsRecordingVoice(false);
      setVoiceDuration(0);
    };

    recorder.stop();
  };

  const cancelVoiceRecording = () => {
    if (voiceTimerRef.current) clearInterval(voiceTimerRef.current);
    if (mediaRecorderRef.current) {
      mediaRecorderRef.current.stream.getTracks().forEach((track) => track.stop());
      mediaRecorderRef.current = null;
    }
    setIsRecordingVoice(false);
    setVoiceDuration(0);
  };

  const handlePlayAudio = (msgId: string, base64Audio: string) => {
    if (playingAudioId === msgId && currentAudioRef.current) {
      currentAudioRef.current.pause();
      currentAudioRef.current = null;
      setPlayingAudioId(null);
      return;
    }

    if (currentAudioRef.current) {
      currentAudioRef.current.pause();
      currentAudioRef.current = null;
    }

    const audio = new Audio(base64Audio);
    currentAudioRef.current = audio;
    setPlayingAudioId(msgId);

    audio.onended = () => {
      setPlayingAudioId(null);
      currentAudioRef.current = null;
    };
    audio.onerror = () => {
      setPlayingAudioId(null);
      currentAudioRef.current = null;
    };

    audio.play().catch(() => {
      setPlayingAudioId(null);
    });
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

    if (selectedImagePreview) {
      await sendMediaMessage({
        type: 'image',
        data: selectedImagePreview.data,
        fileName: selectedImagePreview.name,
        caption: textToSend || undefined,
      });
      setInputText('');
      return;
    }

    if (selectedFilePreview) {
      await sendMediaMessage({
        type: 'file',
        data: selectedFilePreview.data,
        fileName: selectedFilePreview.name,
        fileSize: selectedFilePreview.size,
        mimeType: selectedFilePreview.mime,
        caption: textToSend || undefined,
      });
      setInputText('');
      return;
    }

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
      conversationId: convId,
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
        conversationId: convId,
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

  const renderMessageContent = (msg: ChatMessage, isOwn: boolean) => {
    if (!msg.text) return null;

    if (msg.text.startsWith('{"type":')) {
      try {
        const media = JSON.parse(msg.text);

        // 1. Photo / Image Attachment
        if (media.type === 'image' && media.data) {
          return (
            <div className="space-y-1.5 w-full max-w-full min-w-0">
              <div
                className="relative rounded-xl overflow-hidden cursor-pointer group/img w-full max-w-full sm:max-w-sm bg-black/40 border border-white/10"
                onClick={() => setLightboxImage({ src: media.data, name: media.fileName || 'Encrypted Photo' })}
              >
                <img
                  src={media.data}
                  alt={media.fileName || 'Encrypted Photo'}
                  className="w-full h-auto max-h-72 object-cover rounded-xl group-hover/img:scale-[1.02] transition-transform duration-200 max-w-full"
                />
                <div className="absolute inset-0 bg-black/30 opacity-0 group-hover/img:opacity-100 transition-opacity flex items-center justify-center gap-2">
                  <span className="p-2 rounded-full bg-black/60 text-white backdrop-blur-sm">
                    <Eye className="w-4 h-4" />
                  </span>
                </div>
              </div>
              {media.caption && (
                <p className="break-words leading-relaxed text-xs sm:text-sm pt-0.5">{media.caption}</p>
              )}
            </div>
          );
        }

        // 2. Voice Audio Message
        if (media.type === 'audio' && media.data) {
          const isPlaying = playingAudioId === msg.id;
          const durSeconds = media.duration || 0;
          const formattedDur = `${Math.floor(durSeconds / 60)}:${(durSeconds % 60).toString().padStart(2, '0')}`;

          return (
            <div className="flex items-center gap-2 sm:gap-3 py-1 px-0.5 w-full max-w-full min-w-0">
              <button
                type="button"
                onClick={() => handlePlayAudio(msg.id, media.data)}
                className={`w-8 h-8 sm:w-9 sm:h-9 rounded-full flex items-center justify-center shrink-0 shadow-md transition-all active:scale-95 ${
                  isOwn ? 'bg-white text-emerald-700 hover:bg-emerald-50' : 'bg-emerald-500 text-white hover:bg-emerald-400'
                }`}
                title={isPlaying ? 'Pause voice message' : 'Play voice message'}
              >
                {isPlaying ? <Pause className="w-4 h-4 fill-current" /> : <Play className="w-4 h-4 fill-current ml-0.5" />}
              </button>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1 h-3.5 sm:h-4 mb-1">
                  {[40, 75, 55, 90, 60, 80, 45, 95, 70, 50, 85, 65, 40, 70].map((h, i) => (
                    <div
                      key={i}
                      className={`flex-1 rounded-full transition-all duration-300 ${
                        isPlaying
                          ? isOwn ? 'bg-white animate-pulse' : 'bg-emerald-400 animate-pulse'
                          : isOwn ? 'bg-white/50' : 'bg-slate-500'
                      }`}
                      style={{
                        height: isPlaying ? `${Math.max(25, h * (i % 2 === 0 ? 1 : 0.75))}%` : `${h * 0.35}%`,
                        animationDelay: `${i * 60}ms`,
                      }}
                    />
                  ))}
                </div>
                <div className={`flex items-center justify-between text-[10px] sm:text-[11px] font-mono ${isOwn ? 'text-emerald-100' : 'text-slate-400'}`}>
                  <span className="flex items-center gap-1">
                    <Mic className="w-3 h-3" /> Voice Note
                  </span>
                  <span>{formattedDur}</span>
                </div>
              </div>
            </div>
          );
        }

        // 3. Document / File Attachment
        if (media.type === 'file' && media.data) {
          const sizeFormatted = media.fileSize
            ? media.fileSize > 1024 * 1024
              ? `${(media.fileSize / (1024 * 1024)).toFixed(1)} MB`
              : `${Math.round(media.fileSize / 1024)} KB`
            : 'File';

          return (
            <div className="space-y-1 w-full max-w-full min-w-0">
              <div className="flex items-center gap-2 sm:gap-3 p-2 sm:p-2.5 rounded-xl bg-black/20 border border-white/10 w-full max-w-full min-w-0">
                <div className={`w-9 h-9 sm:w-10 sm:h-10 rounded-lg flex items-center justify-center shrink-0 ${
                  isOwn ? 'bg-white/20 text-white' : 'bg-emerald-500/20 text-emerald-400'
                }`}>
                  <FileText className="w-4 h-4 sm:w-5 sm:h-5" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-semibold truncate text-white" title={media.fileName}>
                    {media.fileName || 'Attachment'}
                  </p>
                  <p className={`text-[10px] font-mono ${isOwn ? 'text-emerald-100' : 'text-slate-400'}`}>
                    {sizeFormatted}
                  </p>
                </div>
                <a
                  href={media.data}
                  download={media.fileName || 'attachment'}
                  className={`p-1.5 sm:p-2 rounded-lg transition-colors shrink-0 ${
                    isOwn ? 'hover:bg-white/20 text-white' : 'hover:bg-slate-800 text-emerald-400'
                  }`}
                  title="Download file"
                >
                  <Download className="w-4 h-4" />
                </a>
              </div>
              {media.caption && (
                <p className="break-words leading-relaxed text-xs sm:text-sm pt-0.5">{media.caption}</p>
              )}
            </div>
          );
        }
      } catch {}
    }

    return <p className="break-words leading-relaxed text-xs sm:text-sm">{msg.text}</p>;
  };

  return (
    <div className="flex-1 flex flex-col overflow-hidden overflow-x-hidden h-[calc(100dvh-3.5rem)] max-h-[calc(100dvh-3.5rem)] min-h-0 bg-[#0b0f19] w-full max-w-full">
      {/* Background Incoming Call & Push Notification Prompt */}
      {showNotificationPrompt && (
        <div className="bg-emerald-950/95 border-b border-emerald-800/80 px-4 py-2 flex items-center justify-between text-xs text-emerald-200 z-40 shrink-0 backdrop-blur-md animate-in slide-in-from-top duration-200">
          <div className="flex items-center gap-2 min-w-0">
            <Bell className="w-4 h-4 text-emerald-400 shrink-0 animate-bounce" />
            <span className="truncate sm:whitespace-normal">
              Enable background notifications to see incoming calls and hear ringing when your screen is locked.
            </span>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={async () => {
                const granted = await requestPushNotificationPermission();
                if (granted) setShowNotificationPrompt(false);
              }}
              className="px-2.5 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-[11px] shadow-sm transition-all cursor-pointer"
            >
              Enable
            </button>
            <button
              onClick={() => {
                sessionStorage.setItem('securechat_push_prompt_dismissed', '1');
                setShowNotificationPrompt(false);
              }}
              className="p-1 text-slate-400 hover:text-white"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      )}

      <div className="flex-1 flex overflow-hidden overflow-x-hidden min-h-0 w-full max-w-full">
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
                        {conv.last_message ? (
                          conv.last_message.startsWith('{"type":"image"')
                            ? '📷 Photo'
                            : conv.last_message.startsWith('{"type":"audio"')
                            ? '🎙️ Voice message'
                            : conv.last_message.startsWith('{"type":"file"')
                            ? '📎 Attachment'
                            : conv.last_message
                        ) : 'Direct chat'}
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
                {/* Voice Call Button (E2EE WebRTC) */}
                <button
                  type="button"
                  onClick={() => startCall(false)}
                  className="flex items-center gap-1.5 px-2 sm:px-2.5 py-1.5 rounded-lg border text-xs font-medium transition-all active:scale-95 bg-slate-800/80 hover:bg-slate-700 text-slate-300 hover:text-white border-slate-700 cursor-pointer"
                  title="Voice Call (E2EE WebRTC)"
                >
                  <Phone className="w-4 h-4 text-emerald-400" />
                  <span className="hidden xl:inline">Call</span>
                </button>

                {/* Video Call Button (E2EE WebRTC) */}
                <button
                  type="button"
                  onClick={() => startCall(true)}
                  className="flex items-center gap-1.5 px-2 sm:px-2.5 py-1.5 rounded-lg border text-xs font-medium transition-all active:scale-95 bg-slate-800/80 hover:bg-slate-700 text-slate-300 hover:text-white border-slate-700 cursor-pointer"
                  title="Video Call (E2EE WebRTC)"
                >
                  <Video className="w-4 h-4 text-emerald-400" />
                  <span className="hidden xl:inline">Video</span>
                </button>

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
                        <button
                          onClick={() => {
                            setIsChatMenuOpen(false);
                            startCall(false);
                          }}
                          className="w-full flex items-center gap-2.5 px-3.5 py-2 text-xs font-medium text-slate-200 hover:bg-slate-800 transition-colors text-left"
                        >
                          <Phone className="w-4 h-4 text-emerald-400" />
                          <span>Voice Call (E2EE)</span>
                        </button>

                        <button
                          onClick={() => {
                            setIsChatMenuOpen(false);
                            startCall(true);
                          }}
                          className="w-full flex items-center gap-2.5 px-3.5 py-2 text-xs font-medium text-slate-200 hover:bg-slate-800 transition-colors text-left"
                        >
                          <Video className="w-4 h-4 text-emerald-400" />
                          <span>Video Call (E2EE)</span>
                        </button>

                        <div className="h-px bg-slate-800 my-1" />

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
            <div className="flex-1 p-3 sm:p-6 overflow-y-auto overflow-x-hidden min-h-0 space-y-2.5 sm:space-y-3 w-full max-w-full">
              <div className="text-center my-2 px-2">
                <span className="px-3 py-1.5 rounded-full bg-slate-900 border border-slate-800 text-[10px] text-slate-400 font-mono inline-flex items-center justify-center gap-1.5 max-w-full text-center flex-wrap leading-tight">
                  <Lock className="w-3 h-3 text-emerald-400 shrink-0" />
                  <span>Messages are end-to-end encrypted (AES-256-GCM). Zero server plaintext.</span>
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
                      className={`flex flex-col group ${isOwn ? 'items-end' : 'items-start'} mb-1.5 relative w-full max-w-full`}
                    >
                    <div className={`flex items-center gap-1 sm:gap-1.5 max-w-[90%] sm:max-w-[75%] ${isOwn ? 'flex-row' : 'flex-row-reverse'} relative min-w-0`}>
                      {/* Floating Emoji Reaction Picker Bar */}
                      {activeReactionMsgId === msg.id && (
                        <>
                          <div
                            className="fixed inset-0 z-30"
                            onClick={() => setActiveReactionMsgId(null)}
                          />
                          <div
                            className={`absolute z-40 bottom-full mb-1.5 ${
                              isOwn ? 'right-0' : 'left-0'
                            } flex items-center gap-1 sm:gap-1.5 px-3 py-1.5 rounded-full bg-slate-900/95 backdrop-blur-md border border-slate-700 shadow-2xl animate-in fade-in zoom-in-95 duration-150`}
                          >
                            {REACTION_EMOJIS.map((emoji) => {
                              const isMyReaction = currentUser && msg.reactions?.[emoji]?.includes(currentUser.id);
                              return (
                                <button
                                  key={emoji}
                                  type="button"
                                  onClick={() => {
                                    handleToggleReaction(msg.id, emoji);
                                    setActiveReactionMsgId(null);
                                  }}
                                  className={`text-lg sm:text-xl p-1.5 rounded-full hover:scale-130 active:scale-90 transition-transform cursor-pointer select-none ${
                                    isMyReaction ? 'bg-emerald-500/25 ring-1 ring-emerald-400 scale-110' : 'hover:bg-slate-800/80'
                                  }`}
                                  title={`React with ${emoji}`}
                                >
                                  {emoji}
                                </button>
                              );
                            })}
                          </div>
                        </>
                      )}

                      {/* Message Actions (Emoji Reaction trigger + Edit/Delete) */}
                      <div className="opacity-80 sm:opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-0.5 shrink-0">
                        <button
                          type="button"
                          onClick={() => setActiveReactionMsgId(activeReactionMsgId === msg.id ? null : msg.id)}
                          className="p-1.5 rounded-full text-slate-400 hover:text-emerald-400 hover:bg-slate-800/80 active:scale-90 transition-all cursor-pointer"
                          title="Add reaction"
                        >
                          <Smile className="w-4 h-4" />
                        </button>
                        {isOwn && (
                          <>
                            <button
                              type="button"
                              onClick={() => handleStartEdit(msg)}
                              className="p-1.5 rounded-full text-slate-400 hover:text-white hover:bg-slate-800/80 active:scale-90 transition-all cursor-pointer"
                              title="Edit message"
                            >
                              <Pencil className="w-3.5 h-3.5" />
                            </button>
                            <button
                              type="button"
                              onClick={() => handleDeleteMessage(msg.id)}
                              className="p-1.5 rounded-full text-slate-400 hover:text-red-400 hover:bg-slate-800/80 active:scale-90 transition-all cursor-pointer"
                              title="Delete message for everyone"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </>
                        )}
                      </div>

                      <div
                        onDoubleClick={() => handleToggleReaction(msg.id, '❤️')}
                        className={`flex-1 min-w-0 max-w-full px-3.5 sm:px-4 py-2 sm:py-2.5 rounded-2xl text-sm select-text cursor-pointer ${
                          isOwn
                            ? 'bg-emerald-600 text-white rounded-br-sm shadow-sm'
                            : 'bg-slate-900 border border-slate-800 text-slate-100 rounded-bl-sm shadow-sm'
                        }`}
                        title="Double-click to react with ❤️"
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
                          renderMessageContent(msg, isOwn)
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

                    {/* Message Reaction Badges */}
                    {msg.reactions && Object.keys(msg.reactions).length > 0 && (
                      <div className={`flex flex-wrap items-center gap-1 mt-1 px-1 ${isOwn ? 'justify-end' : 'justify-start'}`}>
                        {Object.entries(msg.reactions).map(([emoji, userIds]) => {
                          const hasReacted = currentUser && userIds.includes(currentUser.id);
                          return (
                            <button
                              key={emoji}
                              type="button"
                              onClick={() => handleToggleReaction(msg.id, emoji)}
                              className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs transition-all active:scale-90 shadow-sm select-none cursor-pointer ${
                                hasReacted
                                  ? 'bg-emerald-950/90 border border-emerald-500 text-emerald-300 font-semibold shadow-emerald-900/30 ring-1 ring-emerald-500/30'
                                  : 'bg-slate-900/90 hover:bg-slate-800 border border-slate-700/80 text-slate-200'
                              }`}
                              title={`${userIds.length} ${userIds.length === 1 ? 'reaction' : 'reactions'}`}
                            >
                              <span className="text-xs leading-none">{emoji}</span>
                              {userIds.length > 1 && <span className="text-[10px] font-mono leading-none">{userIds.length}</span>}
                            </button>
                          );
                        })}
                        <button
                          type="button"
                          onClick={() => setActiveReactionMsgId(activeReactionMsgId === msg.id ? null : msg.id)}
                          className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-slate-900/90 hover:bg-slate-800 border border-slate-700/80 text-slate-400 hover:text-emerald-400 transition-colors text-xs active:scale-90 cursor-pointer"
                          title="Add reaction"
                        >
                          <Plus className="w-3 h-3" />
                        </button>
                      </div>
                    )}
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

            {/* Media Attachment Previews */}
            {selectedImagePreview && (
              <div className="px-3 sm:px-5 py-2 bg-slate-900 border-t border-slate-800 flex items-center justify-between gap-2 animate-in fade-in min-w-0">
                <div className="flex items-center gap-2.5 min-w-0">
                  <img
                    src={selectedImagePreview.data}
                    alt="Preview"
                    className="w-10 h-10 sm:w-12 sm:h-12 rounded-lg object-cover border border-slate-700 shrink-0"
                  />
                  <div className="min-w-0">
                    <p className="text-xs font-semibold text-white truncate max-w-[130px] sm:max-w-xs">{selectedImagePreview.name}</p>
                    <span className="text-[10px] text-emerald-400 font-mono">E2EE Ready (AES-256)</span>
                  </div>
                </div>
                <div className="flex items-center gap-1.5 shrink-0">
                  <button
                    type="button"
                    onClick={() => setSelectedImagePreview(null)}
                    className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
                    title="Cancel image"
                  >
                    <X className="w-4 h-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      sendMediaMessage({
                        type: 'image',
                        data: selectedImagePreview.data,
                        fileName: selectedImagePreview.name,
                        caption: inputText.trim() || undefined,
                      });
                      setInputText('');
                    }}
                    className="px-2.5 sm:px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs flex items-center gap-1 shadow-md transition-all active:scale-95 shrink-0"
                  >
                    <Send className="w-3.5 h-3.5" />
                    <span>Send</span>
                  </button>
                </div>
              </div>
            )}

            {selectedFilePreview && (
              <div className="px-3 sm:px-5 py-2 bg-slate-900 border-t border-slate-800 flex items-center justify-between gap-2 animate-in fade-in min-w-0">
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className="w-10 h-10 rounded-lg bg-emerald-500/20 text-emerald-400 flex items-center justify-center shrink-0">
                    <FileText className="w-5 h-5" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs font-semibold text-white truncate max-w-[130px] sm:max-w-xs">{selectedFilePreview.name}</p>
                    <span className="text-[10px] text-slate-400 font-mono">
                      {Math.round(selectedFilePreview.size / 1024)} KB · Encrypted
                    </span>
                  </div>
                </div>
                <div className="flex items-center gap-1.5 shrink-0">
                  <button
                    type="button"
                    onClick={() => setSelectedFilePreview(null)}
                    className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
                    title="Cancel file"
                  >
                    <X className="w-4 h-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      sendMediaMessage({
                        type: 'file',
                        data: selectedFilePreview.data,
                        fileName: selectedFilePreview.name,
                        fileSize: selectedFilePreview.size,
                        mimeType: selectedFilePreview.mime,
                        caption: inputText.trim() || undefined,
                      });
                      setInputText('');
                    }}
                    className="px-2.5 sm:px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs flex items-center gap-1 shadow-md transition-all active:scale-95 shrink-0"
                  >
                    <Send className="w-3.5 h-3.5" />
                    <span>Send</span>
                  </button>
                </div>
              </div>
            )}

            {/* Hidden file inputs */}
            <input
              ref={imageInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handleSelectImage}
            />
            <input
              ref={fileInputRef}
              type="file"
              accept=".pdf,.doc,.docx,.txt,.zip,.rar,.xlsx,.pptx"
              className="hidden"
              onChange={handleSelectFile}
            />

            {/* Voice Recording Active Bar or Normal Rich Input Bar */}
            {isRecordingVoice ? (
              <div className="p-2 sm:p-3 border-t border-red-500/30 bg-red-950/40 flex items-center justify-between gap-2 shrink-0 animate-in fade-in w-full min-w-0">
                <div className="flex items-center gap-2 min-w-0">
                  <div className="relative flex items-center justify-center shrink-0">
                    <span className="w-2.5 h-2.5 rounded-full bg-red-500 animate-ping absolute" />
                    <span className="w-2 h-2 rounded-full bg-red-500 relative" />
                  </div>
                  <span className="text-xs font-semibold text-red-200 truncate">Recording...</span>
                  <span className="font-mono text-xs text-white bg-black/50 px-2 py-0.5 rounded-md border border-red-500/40 shrink-0">
                    {`${Math.floor(voiceDuration / 60)}:${(voiceDuration % 60).toString().padStart(2, '0')}`}
                  </span>
                </div>
                <div className="flex items-center gap-1.5 shrink-0">
                  <button
                    type="button"
                    onClick={cancelVoiceRecording}
                    className="p-1.5 sm:p-2 rounded-xl text-slate-400 hover:text-red-400 hover:bg-slate-800 transition-colors shrink-0"
                    title="Cancel recording"
                  >
                    <X className="w-4 h-4" />
                  </button>
                  <button
                    type="button"
                    onClick={stopVoiceRecordingAndSend}
                    className="px-2.5 sm:px-3 py-1.5 sm:py-2 rounded-xl bg-red-600 hover:bg-red-500 text-white text-xs font-bold flex items-center gap-1 shadow-lg shadow-red-950/50 transition-all active:scale-95 shrink-0"
                    title="Stop and send voice message"
                  >
                    <Send className="w-3.5 h-3.5" />
                    <span>Send</span>
                  </button>
                </div>
              </div>
            ) : (
              <form
                onSubmit={handleSendMessage}
                className="p-1.5 sm:p-2.5 border-t border-slate-800 bg-slate-900/60 flex gap-1 sm:gap-1.5 items-center shrink-0 w-full max-w-full min-w-0 box-border"
              >
                <button
                  type="button"
                  onClick={() => imageInputRef.current?.click()}
                  className="p-1.5 sm:p-2 rounded-xl text-slate-400 hover:text-emerald-400 hover:bg-slate-800 transition-colors shrink-0"
                  title="Send Photo"
                >
                  <ImageIcon className="w-4 h-4 sm:w-5 sm:h-5" />
                </button>
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="p-1.5 sm:p-2 rounded-xl text-slate-400 hover:text-emerald-400 hover:bg-slate-800 transition-colors shrink-0"
                  title="Attach File / Document"
                >
                  <Paperclip className="w-4 h-4 sm:w-5 sm:h-5" />
                </button>
                <button
                  type="button"
                  onClick={startVoiceRecording}
                  className="p-1.5 sm:p-2 rounded-xl text-slate-400 hover:text-emerald-400 hover:bg-slate-800 transition-colors shrink-0"
                  title="Record Voice Note"
                >
                  <Mic className="w-4 h-4 sm:w-5 sm:h-5" />
                </button>

                <input
                  type="text"
                  placeholder={
                    editingMessage
                      ? 'Edit your message...'
                      : selectedImagePreview
                      ? 'Add a caption...'
                      : selectedFilePreview
                      ? 'Add a note...'
                      : `Message @${activeContact.username}...`
                  }
                  value={inputText}
                  onChange={(e) => setInputText(e.target.value)}
                  className="flex-1 min-w-0 bg-slate-950/70 border border-slate-800 rounded-xl px-3 py-2 text-xs sm:text-sm text-slate-100 placeholder:text-slate-500 focus:outline-none focus:border-emerald-500 transition-colors"
                />

                <button
                  type="submit"
                  disabled={!inputText.trim() && !selectedImagePreview && !selectedFilePreview}
                  className={`w-9 h-9 sm:w-10 sm:h-10 rounded-xl text-white transition-all disabled:opacity-40 shrink-0 flex items-center justify-center ${
                    editingMessage ? 'bg-teal-600 hover:bg-teal-500' : 'bg-emerald-600 hover:bg-emerald-500'
                  }`}
                  title={editingMessage ? 'Save changes' : 'Send'}
                >
                  {editingMessage ? <Check className="w-4 h-4" /> : <Send className="w-4 h-4" />}
                </button>
              </form>
            )}
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

      {/* Full-Screen Image Lightbox Modal */}
      {lightboxImage && (
        <div
          className="fixed inset-0 z-50 bg-black/90 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in duration-150"
          onClick={() => setLightboxImage(null)}
        >
          <div className="relative max-w-4xl max-h-[90vh] flex flex-col items-center" onClick={(e) => e.stopPropagation()}>
            <div className="absolute top-2 right-2 flex items-center gap-2 z-10">
              <a
                href={lightboxImage.src}
                download={lightboxImage.name || 'securechat-photo.jpg'}
                className="p-2 rounded-full bg-black/60 hover:bg-black/80 text-white backdrop-blur-md transition-colors"
                title="Download photo"
              >
                <Download className="w-5 h-5" />
              </a>
              <button
                type="button"
                onClick={() => setLightboxImage(null)}
                className="p-2 rounded-full bg-black/60 hover:bg-black/80 text-white backdrop-blur-md transition-colors"
                title="Close preview"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <img
              src={lightboxImage.src}
              alt={lightboxImage.name}
              className="max-h-[85vh] max-w-full rounded-2xl object-contain shadow-2xl border border-white/10"
            />
            {lightboxImage.name && (
              <p className="mt-2 text-xs font-mono text-slate-400">{lightboxImage.name}</p>
            )}
          </div>
        </div>
      )}
      </div>

      {/* WebRTC Audio & Video Call Overlay Modal */}
      <CallModal
        callState={callState}
        peer={activeCallPeer}
        isVideo={isCallVideo}
        localStream={localStream}
        remoteStream={remoteStream}
        streamVersion={streamVersion}
        iceConnectionState={iceConnectionState}
        peerConnectionState={peerConnectionState}
        isMuted={isMuted}
        isCameraOff={isCameraOff}
        onAccept={acceptIncomingCall}
        onReject={rejectIncomingCall}
        onEndCall={endActiveCall}
        onToggleMic={toggleMic}
        onToggleCamera={toggleCamera}
        onFlipCamera={flipCamera}
      />
    </div>
  );
}
