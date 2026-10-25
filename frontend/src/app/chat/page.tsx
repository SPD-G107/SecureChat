'use client';

import React, { useState, useEffect } from 'react';
import { ApiClient } from '@/lib/api-client';
import { connectSocket, getSocket } from '@/lib/socket-client';
import { CryptoEngine } from '@/lib/crypto';
import { User, Conversation, EncryptedMessageEnvelope, PublicKeyInfo } from '@/types';
import { Search, Send, Lock, ShieldCheck, AlertTriangle, Plus, User as UserIcon } from 'lucide-react';

export default function ChatPage() {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [activeConversation, setActiveConversation] = useState<Conversation | null>(null);
  const [messages, setMessages] = useState<EncryptedMessageEnvelope[]>([]);
  const [inputText, setInputText] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [keyWarning, setKeyWarning] = useState<string | null>(null);
  const [cachedPeerKey, setCachedPeerKey] = useState<PublicKeyInfo | null>(null);

  // Load current user
  useEffect(() => {
    const raw = localStorage.getItem('securechat_user');
    if (raw) setCurrentUser(JSON.parse(raw));

    ApiClient.get('/conversations')
      .then((res) => {
        setConversations(res.conversations || []);
        if (res.conversations?.length > 0) setActiveConversation(res.conversations[0]);
      })
      .catch(() => {});
  }, []);

  // Connect socket and register listeners
  useEffect(() => {
    const socket = connectSocket();

    const handleReceived = async (msg: EncryptedMessageEnvelope) => {
      if (activeConversation && msg.conversation_id === activeConversation.id) {
        // Attempt local decryption
        try {
          const userRaw = localStorage.getItem('securechat_user');
          const myUsername = userRaw ? JSON.parse(userRaw).username : '';
          const privKeyBase64 = localStorage.getItem(`securechat_privkey_${myUsername}`);

          if (privKeyBase64 && cachedPeerKey) {
            const privKeyBytes = new Uint8Array(
              atob(privKeyBase64)
                .split('')
                .map((c) => c.charCodeAt(0))
            );
            const myPrivateKey = await window.crypto.subtle.importKey(
              'pkcs8',
              privKeyBytes.buffer,
              { name: 'ECDH', namedCurve: 'P-256' },
              true,
              ['deriveKey', 'deriveBits']
            );

            const peerPublicKey = await CryptoEngine.importPublicKey(cachedPeerKey.publicKey);
            const symKey = await CryptoEngine.deriveSymmetricKey(myPrivateKey, peerPublicKey);
            msg.decryptedContent = await CryptoEngine.decrypt(
              msg.encrypted_payload,
              msg.initialization_vector,
              msg.mac_tag,
              symKey
            );
          }
        } catch {
          msg.decryptedContent = '[Decryption failed: signature/key mismatch]';
        }

        setMessages((prev) => [...prev, msg]);
      }
    };

    socket.on('message:received', handleReceived);
    return () => {
      socket.off('message:received', handleReceived);
    };
  }, [activeConversation, cachedPeerKey]);

  // When active conversation changes, load messages and verify contact public key
  useEffect(() => {
    if (!activeConversation) return;
    setKeyWarning(null);

    // 1. Fetch encrypted message history
    ApiClient.get(`/messages/${activeConversation.id}`)
      .then((res) => setMessages(res.messages || []))
      .catch(() => {});

    // 2. Fetch contact's public key & check for unexpected key change (Feature 5)
    ApiClient.get(`/users/${activeConversation.peer_id}/public-key`)
      .then((keyInfo: PublicKeyInfo) => {
        setCachedPeerKey(keyInfo);

        // Check if cached version differs from previous
        const savedVersion = localStorage.getItem(`peer_key_ver_${keyInfo.userId}`);
        if (savedVersion && parseInt(savedVersion, 10) !== keyInfo.version) {
          setKeyWarning(
            `Security Warning: ${activeConversation.peer_username}'s public identity key has changed from v${savedVersion} to v${keyInfo.version}. Verify their safety number before transmitting sensitive secrets!`
          );
        }
        localStorage.setItem(`peer_key_ver_${keyInfo.userId}`, String(keyInfo.version));
      })
      .catch(() => {});
  }, [activeConversation]);

  // Contact Search (Feature 2)
  const handleSearch = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const q = e.target.value;
    setSearchQuery(q);
    if (!q.trim()) {
      setSearchResults([]);
      return;
    }
    try {
      const res = await ApiClient.get(`/users/search?q=${encodeURIComponent(q)}`);
      setSearchResults(res.users || []);
    } catch {
      setSearchResults([]);
    }
  };

  const startChatWith = async (contactId: string) => {
    try {
      const res = await ApiClient.post('/conversations', { contactId });
      setSearchQuery('');
      setSearchResults([]);

      const listRes = await ApiClient.get('/conversations');
      setConversations(listRes.conversations || []);
      const newActive = listRes.conversations.find((c: any) => c.id === res.conversation.id);
      if (newActive) setActiveConversation(newActive);
    } catch (err: any) {
      alert(err.message || 'Failed to start chat');
    }
  };

  // Encrypt and Send Message (Features 3 & 4)
  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputText.trim() || !activeConversation || !currentUser || !cachedPeerKey) return;

    try {
      const myPrivBase64 = localStorage.getItem(`securechat_privkey_${currentUser.username}`);
      if (!myPrivBase64) {
        alert('Cryptographic identity key missing from device storage');
        return;
      }

      // 1. Import sender private key & peer public key
      const privBytes = new Uint8Array(
        atob(myPrivBase64)
          .split('')
          .map((c) => c.charCodeAt(0))
      );
      const myPrivateKey = await window.crypto.subtle.importKey(
        'pkcs8',
        privBytes.buffer,
        { name: 'ECDH', namedCurve: 'P-256' },
        true,
        ['deriveKey', 'deriveBits']
      );

      const peerPublicKey = await CryptoEngine.importPublicKey(cachedPeerKey.publicKey);

      // 2. Derive shared symmetric key (ECDH + HKDF)
      const symKey = await CryptoEngine.deriveSymmetricKey(myPrivateKey, peerPublicKey);

      // 3. Encrypt payload with AES-256-GCM
      const encrypted = await CryptoEngine.encrypt(inputText, symKey);

      // 4. Send encrypted envelope over Socket.IO
      const socket = getSocket();
      socket.emit('message:send', {
        conversationId: activeConversation.id,
        recipientId: activeConversation.peer_id,
        encryptedPayload: encrypted.ciphertext,
        iv: encrypted.iv,
        macTag: encrypted.macTag,
      });

      // Optimistic update
      const localEnvelope: EncryptedMessageEnvelope = {
        id: 'local_' + Date.now(),
        conversation_id: activeConversation.id,
        sender_id: currentUser.id,
        encrypted_payload: encrypted.ciphertext,
        initialization_vector: encrypted.iv,
        mac_tag: encrypted.macTag,
        delivery_status: 'sent',
        created_at: new Date().toISOString(),
        decryptedContent: inputText,
      };

      setMessages((prev) => [...prev, localEnvelope]);
      setInputText('');
    } catch (err: any) {
      alert('Encryption failed: ' + err.message);
    }
  };

  return (
    <div className="flex-1 flex overflow-hidden h-[calc(100vh-61px)]">
      {/* Sidebar: Contacts & Search */}
      <aside className="w-80 bg-[#082f2f]/40 border-r border-emerald-950 flex flex-col">
        <div className="p-4 border-b border-emerald-950">
          <div className="relative">
            <Search className="w-4 h-4 text-emerald-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search registered contacts..."
              value={searchQuery}
              onChange={handleSearch}
              className="w-full bg-slate-950/70 border border-emerald-900/60 rounded-xl pl-9 pr-3 py-2 text-xs text-slate-200 placeholder:text-slate-500 focus:outline-none focus:border-emerald-500"
            />
          </div>

          {searchResults.length > 0 && (
            <div className="mt-2 bg-slate-900 border border-emerald-900 rounded-xl p-2 space-y-1 shadow-xl">
              <span className="text-[10px] text-emerald-400 font-bold uppercase tracking-wider px-2">Contacts</span>
              {searchResults.map((u) => (
                <button
                  key={u.id}
                  onClick={() => startChatWith(u.id)}
                  className="w-full flex items-center justify-between p-2 rounded-lg hover:bg-emerald-950/60 text-left text-xs transition-colors"
                >
                  <span className="font-semibold text-slate-200">@{u.username}</span>
                  <Plus className="w-3.5 h-3.5 text-emerald-400" />
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="flex-1 p-2 overflow-y-auto space-y-1">
          {conversations.map((conv) => {
            const isSelected = activeConversation?.id === conv.id;
            return (
              <button
                key={conv.id}
                onClick={() => setActiveConversation(conv)}
                className={`w-full flex items-center gap-3 p-3 rounded-xl transition-all text-left ${
                  isSelected
                    ? 'bg-emerald-500/15 border border-emerald-500/30 text-white'
                    : 'hover:bg-slate-900/60 text-slate-300'
                }`}
              >
                <div className="w-10 h-10 rounded-full bg-emerald-950 border border-emerald-800 flex items-center justify-center text-emerald-400 font-bold text-xs">
                  {conv.peer_username.substring(0, 2).toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-sm truncate">@{conv.peer_username}</span>
                  </div>
                  <span className="text-[10px] text-emerald-400 flex items-center gap-1 mt-0.5">
                    <Lock className="w-3 h-3" /> End-to-End Encrypted
                  </span>
                </div>
              </button>
            );
          })}
        </div>
      </aside>

      {/* Main Chat Feed */}
      <section className="flex-1 flex flex-col bg-slate-950/50">
        {activeConversation ? (
          <>
            {/* Header */}
            <div className="px-6 py-3.5 border-b border-emerald-950 bg-[#082f2f]/30 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-full bg-emerald-950 border border-emerald-800 flex items-center justify-center text-emerald-400 font-bold text-xs">
                  {activeConversation.peer_username.substring(0, 2).toUpperCase()}
                </div>
                <div>
                  <h2 className="text-sm font-bold text-white flex items-center gap-1.5">
                    @{activeConversation.peer_username}
                    <ShieldCheck className="w-4 h-4 text-emerald-400" />
                  </h2>
                  <p className="text-[10px] text-emerald-400 font-mono">
                    FP: {cachedPeerKey?.fingerprint?.substring(0, 16)}...
                  </p>
                </div>
              </div>
            </div>

            {/* Key-Change Warning Banner (Feature 5) */}
            {keyWarning && (
              <div className="p-3 bg-amber-500/10 border-b border-amber-500/30 text-amber-300 text-xs flex items-center gap-2.5">
                <AlertTriangle className="w-5 h-5 shrink-0 text-amber-400" />
                <span>{keyWarning}</span>
              </div>
            )}

            {/* Messages Feed */}
            <div className="flex-1 p-6 overflow-y-auto space-y-3">
              {messages.map((m, idx) => {
                const isOwn = m.sender_id === currentUser?.id;
                return (
                  <div key={m.id || idx} className={`flex flex-col ${isOwn ? 'items-end' : 'items-start'}`}>
                    <div
                      className={`max-w-[70%] px-4 py-2.5 rounded-2xl text-sm ${
                        isOwn
                          ? 'bg-emerald-600 text-white rounded-br-none'
                          : 'bg-slate-900 border border-slate-800 text-slate-100 rounded-bl-none'
                      }`}
                    >
                      {m.decryptedContent ? (
                        <p className="break-words">{m.decryptedContent}</p>
                      ) : (
                        <p className="text-xs font-mono opacity-80 flex items-center gap-1">
                          <Lock className="w-3.5 h-3.5" /> [Encrypted: {m.encrypted_payload.substring(0, 16)}...]
                        </p>
                      )}
                      <span className="block text-[9px] opacity-70 text-right mt-1">
                        {new Date(m.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Input Bar */}
            <form onSubmit={handleSendMessage} className="p-4 border-t border-emerald-950 bg-[#082f2f]/20 flex gap-3">
              <input
                type="text"
                placeholder="Type an end-to-end encrypted message..."
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
                className="flex-1 bg-slate-950/80 border border-slate-800 rounded-xl px-4 py-2.5 text-sm text-slate-100 placeholder:text-slate-500 focus:outline-none focus:border-emerald-500"
              />
              <button
                type="submit"
                className="p-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white shadow-md shadow-emerald-950/30 transition-transform active:scale-95"
              >
                <Send className="w-4 h-4" />
              </button>
            </form>
          </>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center p-6 text-center text-slate-400">
            <Lock className="w-10 h-10 text-emerald-500/40 mb-3" />
            <p className="text-sm font-semibold">Select a contact to begin encrypted messaging</p>
          </div>
        )}
      </section>
    </div>
  );
}
