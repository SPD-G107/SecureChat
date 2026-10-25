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
  Copy,
  Terminal,
  Cpu,
  Radio,
  Fingerprint,
} from 'lucide-react';

export default function ChatPage() {
  const [currentUser, setCurrentUser] = useState<MockUser>(CURRENT_USER);
  const [contacts] = useState<MockUser[]>(MOCK_CONTACTS);
  const [activeContact, setActiveContact] = useState<MockUser>(MOCK_CONTACTS[0]);
  const [messagesMap, setMessagesMap] = useState<Record<string, MockMessage[]>>(INITIAL_MESSAGES);
  const [inputText, setInputText] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [showCiphertext, setShowCiphertext] = useState(false);
  const [dismissedWarnings, setDismissedWarnings] = useState<Record<string, boolean>>({});
  const [copiedFingerprint, setCopiedFingerprint] = useState(false);
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
  }, [messagesMap, activeContact]);

  const filteredContacts = contacts.filter(
    (c) =>
      c.username.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.displayName.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const activeMessages = messagesMap[activeContact.id] || [];

  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    const textToSend = inputText.trim();
    if (!textToSend) return;

    // Simulated AES-256-GCM ciphertext envelope
    const simulatedIV = '3f9a12c8b04e';
    const simulatedTag = 'a7e12c8419bf';
    const base64Cipher = btoa(encodeURIComponent(textToSend)).slice(0, 24) + '==';

    const newMsg: MockMessage = {
      id: 'm-' + Date.now(),
      conversationId: `conv-${activeContact.id}`,
      senderId: currentUser.id,
      text: textToSend,
      encryptedPreview: `${base64Cipher} [IV:${simulatedIV} TAG:${simulatedTag}]`,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      status: 'delivered',
    };

    setMessagesMap((prev) => ({
      ...prev,
      [activeContact.id]: [...(prev[activeContact.id] || []), newMsg],
    }));

    setInputText('');
  };

  const handleCopySafetyNumber = () => {
    navigator.clipboard.writeText(activeContact.fingerprint);
    setCopiedFingerprint(true);
    setTimeout(() => setCopiedFingerprint(false), 2000);
  };

  const hasKeyWarning = activeContact.publicKeyVersion > 1 && !dismissedWarnings[activeContact.id];

  return (
    <div className="flex-1 flex overflow-hidden h-[calc(100vh-58px)] bg-[#030712]">
      {/* Sidebar: Cyber Contacts & Search */}
      <aside className="w-80 sm:w-88 bg-[#060b18]/70 border-r border-emerald-500/20 backdrop-blur-2xl flex flex-col shrink-0">
        {/* Sidebar Header */}
        <div className="p-4 border-b border-emerald-500/20 bg-[#040e1e]/60">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg bg-emerald-500/10 border border-emerald-500/40 flex items-center justify-center text-emerald-400 shadow-[0_0_10px_rgba(16,185,129,0.2)]">
                <Terminal className="w-4 h-4" />
              </div>
              <div>
                <h2 className="text-xs font-bold text-white tracking-wider uppercase font-mono flex items-center gap-1.5">
                  Secure Contacts
                </h2>
                <span className="text-[9px] text-emerald-400 font-mono">CHANNEL_READY // E2EE</span>
              </div>
            </div>
            <span className="text-[10px] px-2.5 py-0.5 rounded-full bg-emerald-950/80 text-emerald-300 border border-emerald-500/30 font-mono font-bold shadow-inner">
              {filteredContacts.length} PEERS
            </span>
          </div>

          <div className="relative">
            <Search className="w-3.5 h-3.5 text-emerald-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Filter contacts..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-[#030712]/90 border border-emerald-900/50 rounded-xl pl-10 pr-3 py-2 text-xs text-slate-200 placeholder:text-slate-600 focus:outline-none focus:border-emerald-400 focus:ring-1 focus:ring-emerald-400/40 transition-all font-mono shadow-inner"
            />
          </div>
        </div>

        {/* Contact List */}
        <div className="flex-1 p-2.5 overflow-y-auto space-y-2">
          {filteredContacts.map((contact) => {
            const isSelected = activeContact.id === contact.id;
            const lastMsg = (messagesMap[contact.id] || []).slice(-1)[0];
            const hasAlert = contact.publicKeyVersion > 1 && !dismissedWarnings[contact.id];

            return (
              <button
                key={contact.id}
                onClick={() => setActiveContact(contact)}
                className={`w-full flex items-center gap-3 p-3 rounded-2xl transition-all text-left relative group ${
                  isSelected
                    ? 'bg-gradient-to-r from-emerald-500/20 via-teal-500/10 to-transparent border-l-4 border-l-emerald-400 border-y border-r border-emerald-500/30 text-white shadow-[0_0_20px_rgba(16,185,129,0.15)]'
                    : 'hover:bg-slate-900/60 text-slate-300 border border-transparent'
                }`}
              >
                <div className="relative">
                  <div
                    className={`w-11 h-11 rounded-2xl flex items-center justify-center text-xs font-bold transition-transform group-hover:scale-105 ${
                      isSelected
                        ? 'bg-gradient-to-br from-emerald-500 via-teal-600 to-cyan-600 text-slate-950 font-extrabold shadow-[0_0_15px_rgba(16,185,129,0.5)]'
                        : 'bg-slate-900 border border-emerald-900/60 text-emerald-300'
                    }`}
                  >
                    {contact.avatarInitials}
                  </div>
                  {contact.isOnline ? (
                    <span className="absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 rounded-full bg-emerald-400 border-2 border-[#030712] shadow-[0_0_8px_#10b981]" />
                  ) : (
                    <span className="absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 rounded-full bg-slate-600 border-2 border-[#030712]" />
                  )}
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-xs truncate text-white group-hover:text-emerald-300 transition-colors">
                      {contact.displayName}
                    </span>
                    <span className="text-[10px] text-slate-500 font-mono">
                      {lastMsg ? lastMsg.timestamp : ''}
                    </span>
                  </div>
                  <div className="flex items-center justify-between mt-1">
                    <span className="text-[11px] text-slate-400 truncate max-w-[140px] font-sans">
                      {lastMsg ? lastMsg.text : 'Direct encrypted link'}
                    </span>
                    {hasAlert ? (
                      <span className="px-1.5 py-0.5 rounded-md bg-amber-950 text-amber-300 border border-amber-500/60 text-[9px] font-mono font-bold animate-pulse shadow-[0_0_8px_rgba(245,158,11,0.4)]">
                        KEY_v{contact.publicKeyVersion}
                      </span>
                    ) : (
                      <span className="text-[10px] text-emerald-400 font-mono flex items-center gap-1">
                        <Lock className="w-2.5 h-2.5" /> P-256
                      </span>
                    )}
                  </div>
                </div>
              </button>
            );
          })}
        </div>

        {/* Current User Session Card */}
        <div className="p-3.5 border-t border-emerald-500/20 bg-[#040e1e]/70 backdrop-blur-md flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="relative">
              <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-emerald-500 to-cyan-500 flex items-center justify-center text-slate-950 font-extrabold text-xs shadow-[0_0_12px_rgba(16,185,129,0.4)]">
                {currentUser.avatarInitials || 'ME'}
              </div>
            </div>
            <div>
              <p className="text-xs font-bold text-white leading-none">@{currentUser.username}</p>
              <span className="text-[10px] text-emerald-400 flex items-center gap-1.5 mt-1 font-mono">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                ARGON2ID AUTHENTICATED
              </span>
            </div>
          </div>
          <Link
            href="/profile"
            className="p-2 rounded-xl text-slate-400 hover:text-emerald-400 hover:bg-slate-900 border border-transparent hover:border-emerald-500/30 transition-all"
            title="Profile & Identity Keys"
          >
            <User className="w-4 h-4" />
          </Link>
        </div>
      </aside>

      {/* Main Chat Workspace */}
      <section className="flex-1 flex flex-col bg-[#030712]/50 relative">
        {/* Chat Header */}
        <div className="px-6 py-3 border-b border-emerald-500/20 bg-[#060b18]/80 backdrop-blur-xl flex items-center justify-between shadow-md">
          <div className="flex items-center gap-3.5">
            <div className="relative">
              <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-emerald-500 via-teal-600 to-cyan-600 flex items-center justify-center text-slate-950 font-black text-xs shadow-[0_0_15px_rgba(16,185,129,0.35)]">
                {activeContact.avatarInitials}
              </div>
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-sm font-extrabold text-white tracking-tight">{activeContact.displayName}</h2>
                <span className="text-slate-400 text-xs font-mono">(@{activeContact.username})</span>
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-emerald-950/90 text-emerald-300 border border-emerald-500/40 text-[10px] font-mono font-bold shadow-[0_0_10px_rgba(16,185,129,0.2)]">
                  <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" /> E2EE ACTIVE // v{activeContact.publicKeyVersion}
                </span>
              </div>
              <div className="flex items-center gap-2 mt-0.5">
                <p className="text-[10px] text-slate-400 font-mono flex items-center gap-1">
                  <Fingerprint className="w-3 h-3 text-emerald-400" />
                  SAFETY NUMBER: <span className="text-emerald-300 font-bold select-all">{activeContact.fingerprint.slice(0, 24)}...</span>
                </p>
                <button
                  onClick={handleCopySafetyNumber}
                  className="text-[10px] text-slate-400 hover:text-emerald-300 transition-colors"
                  title="Copy full 64-char fingerprint"
                >
                  {copiedFingerprint ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                </button>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2.5">
            {/* Ciphertext / Plaintext Toggle (README Feature 4) */}
            <button
              onClick={() => setShowCiphertext(!showCiphertext)}
              className={`flex items-center gap-2 px-3.5 py-1.5 rounded-xl border text-xs font-mono font-bold transition-all ${
                showCiphertext
                  ? 'bg-gradient-to-r from-emerald-500 to-cyan-500 text-slate-950 border-emerald-400 shadow-[0_0_18px_rgba(16,185,129,0.4)]'
                  : 'bg-slate-900/90 border-emerald-900/60 text-slate-300 hover:text-white hover:border-emerald-500/50'
              }`}
            >
              {showCiphertext ? <EyeOff className="w-3.5 h-3.5 text-slate-950" /> : <Eye className="w-3.5 h-3.5 text-emerald-400" />}
              <span>{showCiphertext ? 'PLAINTEXT' : 'INSPECT CIPHERTEXT'}</span>
            </button>

            {/* Public-Key Verification Link (README Feature 5) */}
            <Link
              href="/verify-key"
              className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-emerald-950/70 border border-emerald-500/40 text-xs font-mono text-emerald-300 hover:bg-emerald-900/80 transition-all font-semibold shadow-[0_0_12px_rgba(16,185,129,0.15)]"
            >
              <Shield className="w-3.5 h-3.5 text-emerald-400" />
              <span>VERIFY KEY</span>
            </Link>
          </div>
        </div>

        {/* Key-Change Warning Banner (README Feature 5) */}
        {hasKeyWarning && (
          <div className="p-3.5 bg-gradient-to-r from-amber-500/20 via-amber-950/40 to-transparent border-b border-amber-500/40 text-amber-200 text-xs flex items-center justify-between px-6 backdrop-blur-md">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-xl bg-amber-500/20 border border-amber-500/50 flex items-center justify-center text-amber-400 shrink-0 shadow-[0_0_10px_rgba(245,158,11,0.3)] animate-pulse">
                <AlertTriangle className="w-4 h-4" />
              </div>
              <span className="font-sans">
                <strong className="text-amber-300 font-mono uppercase tracking-wide">Security Alert:</strong> @{activeContact.username}&apos;s identity key changed to version <strong>v{activeContact.publicKeyVersion}</strong>. Verify safety number to prevent MITM attacks.
              </span>
            </div>
            <div className="flex items-center gap-3">
              <Link
                href="/verify-key"
                className="px-3.5 py-1.5 bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-mono font-bold rounded-xl transition-colors shadow-md"
              >
                VERIFY NOW
              </Link>
              <button
                onClick={() => setDismissedWarnings((prev) => ({ ...prev, [activeContact.id]: true }))}
                className="text-xs text-slate-400 hover:text-white underline font-mono"
              >
                Dismiss
              </button>
            </div>
          </div>
        )}

        {/* Message Feed */}
        <div className="flex-1 p-6 overflow-y-auto space-y-4">
          <div className="text-center my-3">
            <span className="px-4 py-1.5 rounded-full bg-slate-900/80 border border-emerald-500/30 text-[11px] text-emerald-300 font-mono inline-flex items-center gap-2 shadow-[0_0_15px_rgba(16,185,129,0.12)]">
              <Lock className="w-3.5 h-3.5 text-emerald-400" />
              AUTHENTICATED ENCRYPTION ACTIVE // AES-256-GCM + ECDH P-256
            </span>
          </div>

          {activeMessages.map((msg) => {
            const isOwn = msg.senderId === currentUser.id;

            return (
              <div
                key={msg.id}
                className={`flex flex-col ${isOwn ? 'items-end' : 'items-start'} transition-all`}
              >
                <div
                  className={`max-w-[70%] sm:max-w-[65%] px-4 py-3 rounded-2xl text-sm transition-all relative ${
                    isOwn
                      ? 'bg-gradient-to-br from-emerald-600 via-teal-700 to-emerald-800 text-white rounded-br-sm shadow-[0_4px_20px_rgba(16,185,129,0.25)] border-t border-emerald-400/30'
                      : 'bg-[#0b1322]/90 border border-slate-800/90 text-slate-100 rounded-bl-sm shadow-md'
                  }`}
                >
                  {showCiphertext ? (
                    <div className="font-mono text-xs scanlines">
                      <span className="text-[10px] block text-emerald-300/80 font-mono mb-1 font-bold">
                        [CIPHERTEXT_AES_GCM_PAYLOAD]:
                      </span>
                      <p className="break-all text-emerald-300 bg-black/70 p-2.5 rounded-xl border border-emerald-500/30 select-all font-mono leading-relaxed">
                        {msg.encryptedPreview}
                      </p>
                    </div>
                  ) : (
                    <p className="break-words leading-relaxed">{msg.text}</p>
                  )}

                  <div className="flex items-center justify-end gap-1.5 mt-1.5 text-[10px] opacity-80 font-mono">
                    <span>{msg.timestamp}</span>
                    {isOwn && <CheckCheck className="w-3.5 h-3.5 text-cyan-300" />}
                  </div>
                </div>
              </div>
            );
          })}

          <div ref={messagesEndRef} />
        </div>

        {/* Floating Input Capsule */}
        <div className="p-4 bg-gradient-to-t from-[#030712] to-transparent">
          <form
            onSubmit={handleSendMessage}
            className="border border-emerald-500/30 bg-[#060b18]/90 backdrop-blur-xl rounded-2xl p-2 flex gap-3 items-center shadow-[0_0_25px_rgba(16,185,129,0.15)] focus-within:border-emerald-400 focus-within:ring-1 focus-within:ring-emerald-400/40 transition-all"
          >
            <div className="pl-3 text-emerald-400">
              <Lock className="w-4 h-4" />
            </div>
            <input
              type="text"
              placeholder={`Message @${activeContact.username} (Client-side encrypted before send)...`}
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              className="flex-1 bg-transparent border-none text-sm text-slate-100 placeholder:text-slate-600 focus:outline-none font-sans"
            />
            <button
              type="submit"
              disabled={!inputText.trim()}
              className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-emerald-500 to-cyan-500 hover:from-emerald-400 hover:to-cyan-400 text-slate-950 font-bold text-xs flex items-center gap-1.5 shadow-[0_0_15px_rgba(16,185,129,0.4)] transition-all active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <span>SEND</span>
              <Send className="w-3.5 h-3.5" />
            </button>
          </form>
        </div>
      </section>
    </div>
  );
}
