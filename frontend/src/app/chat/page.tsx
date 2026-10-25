'use client';

import React, { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import {
  MOCK_CONTACTS,
  INITIAL_MESSAGES,
  CURRENT_USER,
  MockUser,
  MockMessage,
} from '@/lib/mock-data';
import {
  Search,
  Send,
  Lock,
  ShieldCheck,
  AlertTriangle,
  Eye,
  EyeOff,
  User,
  Check,
  CheckCheck,
  Shield,
  MessageSquare,
  Sparkles,
  Info,
  X,
  Smile,
  RefreshCw,
  Copy,
  Terminal,
} from 'lucide-react';

export default function ChatPage() {
  const [currentUser, setCurrentUser] = useState<MockUser>(CURRENT_USER);
  const [contacts, setContacts] = useState<MockUser[]>(MOCK_CONTACTS);
  const [activeContact, setActiveContact] = useState<MockUser>(MOCK_CONTACTS[0]);
  const [messagesMap, setMessagesMap] = useState<Record<string, MockMessage[]>>(INITIAL_MESSAGES);
  const [inputText, setInputText] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [showCiphertext, setShowCiphertext] = useState(false);
  const [dismissedWarnings, setDismissedWarnings] = useState<Record<string, boolean>>({});
  const [isTyping, setIsTyping] = useState(false);
  const [inspectedMessage, setInspectedMessage] = useState<MockMessage | null>(null);
  const [showKeyWarningModal, setShowKeyWarningModal] = useState(false);
  const [activeReactionMsgId, setActiveReactionMsgId] = useState<string | null>(null);
  const [messageReactions, setMessageReactions] = useState<Record<string, string[]>>({});
  const [copiedKey, setCopiedKey] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const raw = localStorage.getItem('securechat_user');
    if (raw) {
      try {
        setCurrentUser(JSON.parse(raw));
      } catch {}
    }
  }, []);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messagesMap, isTyping, activeContact]);

  const filteredContacts = contacts.filter(
    (c) =>
      c.username.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.displayName.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const activeMessages = messagesMap[activeContact.id] || [];

  const handleSendMessage = (e?: React.FormEvent, customText?: string) => {
    if (e) e.preventDefault();
    const textToSend = (customText || inputText).trim();
    if (!textToSend) return;

    // Generate simulated AES-256-GCM ciphertext
    const simulatedIV = Array.from({ length: 12 }, () =>
      Math.floor(Math.random() * 256).toString(16).padStart(2, '0')
    ).join('');
    const simulatedTag = Array.from({ length: 16 }, () =>
      Math.floor(Math.random() * 256).toString(16).padStart(2, '0')
    ).join('');
    const base64Cipher = btoa(encodeURIComponent(textToSend)).slice(0, 24) + '==';

    const newMsg: MockMessage = {
      id: 'm-' + Date.now(),
      conversationId: `conv-${activeContact.id}`,
      senderId: currentUser.id,
      text: textToSend,
      encryptedPreview: `${base64Cipher} (IV: ${simulatedIV.slice(0, 8)}... Tag: ${simulatedTag.slice(0, 8)}...)`,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      status: 'delivered',
    };

    setMessagesMap((prev) => ({
      ...prev,
      [activeContact.id]: [...(prev[activeContact.id] || []), newMsg],
    }));

    if (!customText) setInputText('');

    // Trigger interactive simulated response from contact
    triggerSimulatedReply(textToSend, activeContact);
  };

  const triggerSimulatedReply = (userText: string, contact: MockUser) => {
    setIsTyping(true);
    setTimeout(() => {
      setIsTyping(false);
      let replyText = `Received! Decrypted your message via client ECDH P-256. 🔒`;
      if (userText.toLowerCase().includes('hello') || userText.toLowerCase().includes('hi')) {
        replyText = `Hello @${currentUser.username}! Our end-to-end encrypted session is active and verified.`;
      } else if (userText.toLowerCase().includes('key') || userText.toLowerCase().includes('fingerprint')) {
        replyText = `My current safety number starts with ${contact.fingerprint.slice(0, 19)}. Compare it anytime!`;
      } else if (userText.toLowerCase().includes('secret') || userText.toLowerCase().includes('password')) {
        replyText = `Got your confidential data. The relay server cannot read this plaintext! 🛡️`;
      }

      const replyMsg: MockMessage = {
        id: 'reply-' + Date.now(),
        conversationId: `conv-${contact.id}`,
        senderId: contact.id,
        text: replyText,
        encryptedPreview: btoa(encodeURIComponent(replyText)).slice(0, 24) + '==',
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        status: 'read',
      };

      setMessagesMap((prev) => ({
        ...prev,
        [contact.id]: [...(prev[contact.id] || []), replyMsg],
      }));
    }, 1400);
  };

  const handleAddReaction = (msgId: string, emoji: string) => {
    setMessageReactions((prev) => ({
      ...prev,
      [msgId]: [...(prev[msgId] || []).filter((e) => e !== emoji), emoji],
    }));
    setActiveReactionMsgId(null);
  };

  const handleAcceptKeyRotation = () => {
    setContacts((prev) =>
      prev.map((c) =>
        c.id === activeContact.id ? { ...c, publicKeyVersion: 2, status: 'active' } : c
      )
    );
    setDismissedWarnings((prev) => ({ ...prev, [activeContact.id]: true }));
    setShowKeyWarningModal(false);
  };

  const hasKeyWarning = activeContact.publicKeyVersion > 1 && !dismissedWarnings[activeContact.id];

  return (
    <div className="flex-1 flex overflow-hidden h-[calc(100vh-61px)] bg-[#0b1120]">
      {/* Sidebar: Contacts & Search */}
      <aside className="w-80 bg-[#082f2f]/35 border-r border-emerald-950 flex flex-col shrink-0">
        <div className="p-4 border-b border-emerald-950/80 bg-[#062424]/40">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-bold text-white flex items-center gap-2">
              <MessageSquare className="w-4 h-4 text-emerald-400" />
              Encrypted Chats
            </h2>
            <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-950/80 text-emerald-400 border border-emerald-800 font-mono">
              {filteredContacts.length} Contacts
            </span>
          </div>

          <div className="relative">
            <Search className="w-3.5 h-3.5 text-emerald-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search contacts..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-slate-950/70 border border-emerald-900/50 rounded-xl pl-9 pr-3 py-2 text-xs text-slate-200 placeholder:text-slate-500 focus:outline-none focus:border-emerald-500 transition-colors"
            />
          </div>
        </div>

        {/* Contact List */}
        <div className="flex-1 p-2 overflow-y-auto space-y-1.5">
          {filteredContacts.map((contact) => {
            const isSelected = activeContact.id === contact.id;
            const lastMsg = (messagesMap[contact.id] || []).slice(-1)[0];
            const hasAlert = contact.publicKeyVersion > 1 && !dismissedWarnings[contact.id];

            return (
              <button
                key={contact.id}
                onClick={() => setActiveContact(contact)}
                className={`w-full flex items-center gap-3 p-3 rounded-xl transition-all text-left relative group ${
                  isSelected
                    ? 'bg-emerald-500/15 border border-emerald-500/40 text-white shadow-lg shadow-emerald-950/40'
                    : 'hover:bg-slate-900/60 text-slate-300 border border-transparent'
                }`}
              >
                <div className="relative">
                  <div className="w-10 h-10 rounded-full bg-emerald-950 border border-emerald-700/60 flex items-center justify-center text-emerald-300 font-bold text-xs shadow-inner">
                    {contact.avatarInitials}
                  </div>
                  {contact.isOnline ? (
                    <span className="absolute bottom-0 right-0 w-3 h-3 rounded-full bg-emerald-400 border-2 border-[#082f2f]" />
                  ) : (
                    <span className="absolute bottom-0 right-0 w-3 h-3 rounded-full bg-slate-600 border-2 border-[#082f2f]" />
                  )}
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-xs truncate text-white group-hover:text-emerald-300 transition-colors">
                      {contact.displayName}
                    </span>
                    <span className="text-[10px] text-slate-500">
                      {lastMsg ? lastMsg.timestamp : ''}
                    </span>
                  </div>
                  <div className="flex items-center justify-between mt-1">
                    <span className="text-[11px] text-slate-400 truncate max-w-[140px]">
                      {lastMsg ? lastMsg.text : 'Start encrypted conversation'}
                    </span>
                    {hasAlert && (
                      <span className="w-2 h-2 rounded-full bg-amber-400 animate-ping" />
                    )}
                  </div>
                </div>
              </button>
            );
          })}
        </div>

        {/* User Card at bottom of sidebar */}
        <div className="p-3 border-t border-emerald-950/80 bg-[#062424]/60 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-full bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center text-emerald-400 font-bold text-xs">
              {currentUser.avatarInitials || 'ME'}
            </div>
            <div>
              <p className="text-xs font-bold text-white leading-none">@{currentUser.username}</p>
              <span className="text-[10px] text-emerald-400 flex items-center gap-1 mt-0.5">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" /> E2EE Active
              </span>
            </div>
          </div>
          <Link
            href="/settings"
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <Shield className="w-4 h-4 text-emerald-400" />
          </Link>
        </div>
      </aside>

      {/* Main Chat Workspace */}
      <section className="flex-1 flex flex-col bg-slate-950/60 relative">
        {/* Header */}
        <div className="px-6 py-3.5 border-b border-emerald-950/80 bg-[#082f2f]/30 backdrop-blur-sm flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-emerald-950 border border-emerald-700/60 flex items-center justify-center text-emerald-300 font-bold text-xs">
              {activeContact.avatarInitials}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-sm font-bold text-white">{activeContact.displayName}</h2>
                <span className="text-slate-400 text-xs">(@{activeContact.username})</span>
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-950/80 text-emerald-400 border border-emerald-800 text-[10px] font-mono">
                  <ShieldCheck className="w-3 h-3" /> P-256 v{activeContact.publicKeyVersion}
                </span>
              </div>
              <p className="text-[10px] text-emerald-400 font-mono mt-0.5">
                Fingerprint: {activeContact.fingerprint.slice(0, 24)}...
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2.5">
            <button
              onClick={() => setShowCiphertext(!showCiphertext)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-xs font-medium transition-all ${
                showCiphertext
                  ? 'bg-emerald-600 text-white border-emerald-500 shadow-md shadow-emerald-950/40'
                  : 'bg-slate-900/90 border-emerald-900/60 text-slate-300 hover:text-white'
              }`}
            >
              {showCiphertext ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5 text-emerald-400" />}
              {showCiphertext ? 'Show Plaintext' : 'Inspect Ciphertext'}
            </button>

            <Link
              href="/verify-key"
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-950/70 border border-emerald-800/80 text-xs text-emerald-300 hover:bg-emerald-900 transition-colors font-medium"
            >
              <Shield className="w-3.5 h-3.5 text-emerald-400" />
              Safety Number
            </Link>
          </div>
        </div>

        {/* Key-Change Warning Banner (Feature 5) */}
        {hasKeyWarning && (
          <div className="p-3 bg-amber-500/10 border-b border-amber-500/30 text-amber-200 text-xs flex items-center justify-between px-6">
            <div className="flex items-center gap-3">
              <AlertTriangle className="w-5 h-5 shrink-0 text-amber-400 animate-bounce" />
              <span>
                <strong>Cryptographic Key Change Warning:</strong> @{activeContact.username}&apos;s identity key changed to <strong>v{activeContact.publicKeyVersion}</strong>. Verify safety number to prevent Man-in-the-Middle attacks.
              </span>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setShowKeyWarningModal(true)}
                className="px-3 py-1 bg-amber-500 text-slate-950 text-xs font-bold rounded-lg hover:bg-amber-400 transition-colors"
              >
                Review & Verify
              </button>
              <button
                onClick={() => setDismissedWarnings((prev) => ({ ...prev, [activeContact.id]: true }))}
                className="text-xs text-slate-400 hover:text-white px-2 py-1"
              >
                Dismiss
              </button>
            </div>
          </div>
        )}

        {/* Message Feed */}
        <div className="flex-1 p-6 overflow-y-auto space-y-4">
          <div className="text-center my-2">
            <span className="px-4 py-1.5 rounded-full bg-emerald-950/60 border border-emerald-800/60 text-[11px] text-emerald-300 font-mono inline-flex items-center gap-2 shadow-inner">
              <Lock className="w-3.5 h-3.5 text-emerald-400" />
              Messages in this chat are protected by client-side AES-256-GCM.
            </span>
          </div>

          {activeMessages.map((msg) => {
            const isOwn = msg.senderId === currentUser.id;
            const reactions = messageReactions[msg.id] || [];

            return (
              <div
                key={msg.id}
                className={`flex flex-col ${isOwn ? 'items-end' : 'items-start'} group relative`}
              >
                <div
                  className={`max-w-[72%] px-4 py-3 rounded-2xl text-sm transition-all relative ${
                    isOwn
                      ? 'bg-emerald-600 text-white rounded-br-none shadow-lg shadow-emerald-950/40'
                      : 'bg-slate-900 border border-slate-800/80 text-slate-100 rounded-bl-none shadow-md'
                  }`}
                >
                  {showCiphertext ? (
                    <div className="font-mono text-xs">
                      <span className="opacity-70 text-[10px] block text-emerald-300 font-sans mb-1">
                        Encrypted Envelope (AES-256-GCM):
                      </span>
                      <p className="break-all text-emerald-200 bg-black/40 p-2 rounded-lg border border-emerald-900/40 select-all">
                        {msg.encryptedPreview}
                      </p>
                    </div>
                  ) : (
                    <p className="break-words leading-relaxed">{msg.text}</p>
                  )}

                  <div className="flex items-center justify-end gap-1.5 mt-1.5 text-[10px] opacity-75">
                    <span>{msg.timestamp}</span>
                    {isOwn && <CheckCheck className="w-3 h-3 text-white" />}
                    <button
                      onClick={() => setInspectedMessage(msg)}
                      title="Inspect Cryptographic Envelope"
                      className="ml-1 opacity-0 group-hover:opacity-100 transition-opacity hover:text-emerald-300"
                    >
                      <Terminal className="w-3 h-3" />
                    </button>
                  </div>
                </div>

                {/* Reactions badge */}
                {reactions.length > 0 && (
                  <div className="flex items-center gap-1 mt-1 px-2 py-0.5 rounded-full bg-slate-900 border border-slate-800 text-xs">
                    {reactions.map((r, i) => (
                      <span key={i}>{r}</span>
                    ))}
                  </div>
                )}

                {/* Hover Quick Emoji Bar */}
                <div
                  className={`absolute top-0 ${
                    isOwn ? 'right-full mr-2' : 'left-full ml-2'
                  } hidden group-hover:flex items-center gap-1 bg-slate-900/90 border border-slate-800 px-2 py-1 rounded-xl shadow-xl z-20 backdrop-blur-sm`}
                >
                  {['🔒', '👍', '🛡️', '❤️', '🔥'].map((emoji) => (
                    <button
                      key={emoji}
                      onClick={() => handleAddReaction(msg.id, emoji)}
                      className="hover:scale-125 transition-transform text-xs p-1"
                    >
                      {emoji}
                    </button>
                  ))}
                  <button
                    onClick={() => setInspectedMessage(msg)}
                    className="p-1 hover:text-emerald-400 text-slate-400"
                    title="Inspect Packet"
                  >
                    <Info className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            );
          })}

          {/* Typing Indicator */}
          {isTyping && (
            <div className="flex items-center gap-2 text-xs text-emerald-400 pl-2 py-1">
              <div className="w-6 h-6 rounded-full bg-emerald-950 flex items-center justify-center font-bold text-[10px]">
                {activeContact.avatarInitials}
              </div>
              <span className="italic">@{activeContact.username} is encrypting response...</span>
              <span className="flex gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-bounce" />
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-bounce [animation-delay:0.2s]" />
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-bounce [animation-delay:0.4s]" />
              </span>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* Quick Test Prompt Chips */}
        <div className="px-6 py-2 border-t border-emerald-950/50 bg-[#082f2f]/10 flex items-center gap-2 overflow-x-auto text-xs text-slate-400">
          <span className="flex items-center gap-1 shrink-0 text-[11px] font-semibold text-emerald-400">
            <Sparkles className="w-3.5 h-3.5" /> Quick Test:
          </span>
          {[
            'Hi Bob! Is our session E2EE verified?',
            'Checking your safety number fingerprint 🔑',
            'Testing encrypted payload delivery 🛡️',
            'Hello! Can the server read this message?',
          ].map((prompt, i) => (
            <button
              key={i}
              type="button"
              onClick={() => handleSendMessage(undefined, prompt)}
              className="px-3 py-1 rounded-lg bg-slate-900/80 hover:bg-emerald-950 hover:text-emerald-300 border border-slate-800 text-[11px] truncate shrink-0 transition-colors"
            >
              {prompt}
            </button>
          ))}
        </div>

        {/* Input Bar */}
        <form
          onSubmit={(e) => handleSendMessage(e)}
          className="p-4 border-t border-emerald-950 bg-[#082f2f]/20 flex gap-3 items-center"
        >
          <input
            type="text"
            placeholder={`Message @${activeContact.username} (Encrypted via AES-256-GCM)...`}
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            className="flex-1 bg-slate-950/80 border border-slate-800 rounded-xl px-4 py-3 text-sm text-slate-100 placeholder:text-slate-500 focus:outline-none focus:border-emerald-500 transition-colors shadow-inner"
          />
          <button
            type="submit"
            disabled={!inputText.trim()}
            className="p-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white shadow-lg shadow-emerald-950/40 transition-all active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Send className="w-4 h-4" />
          </button>
        </form>
      </section>

      {/* Interactive Cryptographic Envelope Inspector Modal */}
      {inspectedMessage && (
        <div className="fixed inset-0 bg-black/75 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="max-w-xl w-full bg-slate-900 border border-emerald-500/40 rounded-2xl p-6 shadow-2xl relative animate-in fade-in zoom-in-95 duration-200">
            <button
              onClick={() => setInspectedMessage(null)}
              className="absolute top-4 right-4 text-slate-400 hover:text-white"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-2.5 mb-4">
              <div className="w-9 h-9 rounded-xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
                <Terminal className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-bold text-white text-base">E2EE Cryptographic Packet Inspector</h3>
                <p className="text-xs text-slate-400">Payload envelope transmitted across the network</p>
              </div>
            </div>

            <div className="space-y-3 text-xs font-mono">
              <div className="p-3 rounded-xl bg-slate-950 border border-slate-800">
                <span className="text-slate-400 text-[10px] block uppercase font-sans">1. Ciphertext Payload (Base64)</span>
                <p className="text-emerald-400 break-all select-all mt-1">{inspectedMessage.encryptedPreview}</p>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="p-3 rounded-xl bg-slate-950 border border-slate-800">
                  <span className="text-slate-400 text-[10px] block uppercase font-sans">2. Authenticated Algorithm</span>
                  <p className="text-white mt-1">AES-256-GCM (128-bit Tag)</p>
                </div>
                <div className="p-3 rounded-xl bg-slate-950 border border-slate-800">
                  <span className="text-slate-400 text-[10px] block uppercase font-sans">3. Key Exchange Protocol</span>
                  <p className="text-white mt-1">ECDH Curve P-256 + HKDF</p>
                </div>
              </div>

              <div className="p-3 rounded-xl bg-emerald-950/30 border border-emerald-800/60 text-emerald-300">
                <span className="text-slate-400 text-[10px] block uppercase font-sans">4. Server-Side Visibility (Zero-Plaintext Proof)</span>
                <p className="text-xs font-sans mt-1">
                  The MySQL database and Express relay only witness the base64 ciphertext and IV. Plaintext <strong>(&quot;{inspectedMessage.text}&quot;)</strong> exists exclusively inside the client browser memory.
                </p>
              </div>
            </div>

            <button
              onClick={() => setInspectedMessage(null)}
              className="mt-6 w-full py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white font-semibold rounded-xl text-xs transition-colors"
            >
              Close Packet Inspector
            </button>
          </div>
        </div>
      )}

      {/* Interactive Key Rotation Review Modal */}
      {showKeyWarningModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="max-w-lg w-full bg-slate-900 border border-amber-500/50 rounded-2xl p-6 shadow-2xl relative animate-in fade-in zoom-in-95 duration-200">
            <button
              onClick={() => setShowKeyWarningModal(false)}
              className="absolute top-4 right-4 text-slate-400 hover:text-white"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-xl bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-amber-400">
                <AlertTriangle className="w-6 h-6" />
              </div>
              <div>
                <h3 className="font-bold text-white text-base">Key Change Verification Review</h3>
                <p className="text-xs text-slate-400">Verify @{activeContact.username}&apos;s new cryptographic identity</p>
              </div>
            </div>

            <p className="text-xs text-slate-300 mb-4 leading-relaxed">
              Your contact generated a new ECDH P-256 key pair. This could occur if they reinstalled the app, cleared their local browser storage, or if an attacker is attempting a Man-in-the-Middle (MITM) substitution.
            </p>

            <div className="space-y-3 text-xs mb-6 font-mono">
              <div className="p-3 rounded-xl bg-slate-950 border border-slate-800">
                <span className="text-slate-400 text-[10px] block font-sans">New Key Version (v2) Safety Number:</span>
                <p className="text-emerald-400 break-all select-all mt-1">{activeContact.fingerprint}</p>
              </div>
            </div>

            <div className="flex gap-3">
              <button
                onClick={handleAcceptKeyRotation}
                className="flex-1 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold rounded-xl transition-colors flex items-center justify-center gap-1.5"
              >
                <Check className="w-4 h-4" />
                Trust & Verify New Key
              </button>
              <button
                onClick={() => setShowKeyWarningModal(false)}
                className="px-4 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold rounded-xl transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
