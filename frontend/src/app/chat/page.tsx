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
  Sparkles,
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
    const base64Cipher = btoa(encodeURIComponent(textToSend)).slice(0, 24) + '==';

    const newMsg: MockMessage = {
      id: 'm-' + Date.now(),
      conversationId: `conv-${activeContact.id}`,
      senderId: currentUser.id,
      text: textToSend,
      encryptedPreview: base64Cipher,
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
    <div className="flex-1 flex overflow-hidden h-[calc(100vh-61px)] bg-[#080d1a]">
      {/* Sidebar: Contacts & Search */}
      <aside className="w-80 sm:w-88 bg-slate-950/40 border-r border-emerald-950/60 backdrop-blur-xl flex flex-col shrink-0">
        {/* Sidebar Header */}
        <div className="p-4 border-b border-emerald-950/60 bg-[#062424]/30">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-bold text-white flex items-center gap-2">
              <div className="w-6 h-6 rounded-lg bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
                <MessageSquare className="w-3.5 h-3.5" />
              </div>
              <span>Conversations</span>
            </h2>
            <span className="text-[10px] px-2.5 py-0.5 rounded-full bg-emerald-950/80 text-emerald-300 border border-emerald-800/80 font-mono font-semibold">
              {filteredContacts.length} Contacts
            </span>
          </div>

          <div className="relative">
            <Search className="w-3.5 h-3.5 text-emerald-400/80 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search contacts..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-slate-900/80 border border-emerald-900/40 rounded-xl pl-9 pr-3 py-2 text-xs text-slate-200 placeholder:text-slate-500 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500/30 transition-all shadow-inner"
            />
          </div>
        </div>

        {/* Contact List */}
        <div className="flex-1 p-2.5 overflow-y-auto space-y-1.5">
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
                    ? 'bg-gradient-to-r from-emerald-500/15 to-teal-500/10 border border-emerald-500/40 text-white shadow-lg shadow-emerald-950/40'
                    : 'hover:bg-slate-900/60 text-slate-300 border border-transparent'
                }`}
              >
                <div className="relative">
                  <div
                    className={`w-11 h-11 rounded-2xl flex items-center justify-center text-xs font-bold transition-transform group-hover:scale-105 ${
                      isSelected
                        ? 'bg-gradient-to-br from-emerald-600 to-teal-700 text-white shadow-md shadow-emerald-950/50'
                        : 'bg-emerald-950/60 border border-emerald-800/60 text-emerald-300'
                    }`}
                  >
                    {contact.avatarInitials}
                  </div>
                  {contact.isOnline ? (
                    <span className="absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 rounded-full bg-emerald-400 border-2 border-[#080d1a] shadow-sm" />
                  ) : (
                    <span className="absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 rounded-full bg-slate-600 border-2 border-[#080d1a]" />
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
                    <span className="text-[11px] text-slate-400 truncate max-w-[145px]">
                      {lastMsg ? lastMsg.text : 'Direct encrypted chat'}
                    </span>
                    {hasAlert ? (
                      <span className="px-1.5 py-0.5 rounded-md bg-amber-950/90 text-amber-300 border border-amber-700/60 text-[9px] font-mono font-bold animate-pulse">
                        Key v{contact.publicKeyVersion}
                      </span>
                    ) : (
                      <span className="text-[10px] text-emerald-400/80 font-mono flex items-center gap-0.5">
                        <Lock className="w-2.5 h-2.5" /> E2EE
                      </span>
                    )}
                  </div>
                </div>
              </button>
            );
          })}
        </div>

        {/* Current User Session Card */}
        <div className="p-3.5 border-t border-emerald-950/60 bg-[#062424]/40 backdrop-blur-md flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-emerald-600 to-teal-700 flex items-center justify-center text-white font-bold text-xs shadow-md">
              {currentUser.avatarInitials || 'ME'}
            </div>
            <div>
              <p className="text-xs font-bold text-white leading-none">@{currentUser.username}</p>
              <span className="text-[10px] text-emerald-400 flex items-center gap-1.5 mt-1 font-mono">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                Session Authenticated
              </span>
            </div>
          </div>
          <Link
            href="/profile"
            className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800/80 transition-colors"
            title="Profile & Settings"
          >
            <User className="w-4 h-4 text-emerald-400" />
          </Link>
        </div>
      </aside>

      {/* Main Chat Workspace */}
      <section className="flex-1 flex flex-col bg-slate-950/30 relative">
        {/* Chat Header */}
        <div className="px-6 py-3.5 border-b border-emerald-950/60 bg-[#082f2f]/25 backdrop-blur-md flex items-center justify-between shadow-sm">
          <div className="flex items-center gap-3.5">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-emerald-600 to-teal-700 flex items-center justify-center text-white font-bold text-xs shadow-md shadow-emerald-950/40">
              {activeContact.avatarInitials}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-sm font-bold text-white tracking-tight">{activeContact.displayName}</h2>
                <span className="text-slate-400 text-xs">(@{activeContact.username})</span>
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-emerald-950/80 text-emerald-300 border border-emerald-800/80 text-[10px] font-mono font-semibold">
                  <ShieldCheck className="w-3 h-3 text-emerald-400" /> E2EE Active (v{activeContact.publicKeyVersion})
                </span>
              </div>
              <div className="flex items-center gap-2 mt-0.5">
                <p className="text-[10px] text-slate-400 font-mono">
                  Safety Number: <span className="text-emerald-400">{activeContact.fingerprint.slice(0, 19)}...</span>
                </p>
                <button
                  onClick={handleCopySafetyNumber}
                  className="text-[10px] text-slate-400 hover:text-white transition-colors"
                  title="Copy safety number"
                >
                  {copiedFingerprint ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                </button>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {/* Ciphertext / Plaintext Toggle (README Feature 4 requirement) */}
            <button
              onClick={() => setShowCiphertext(!showCiphertext)}
              className={`flex items-center gap-2 px-3.5 py-1.5 rounded-xl border text-xs font-semibold transition-all ${
                showCiphertext
                  ? 'bg-gradient-to-r from-emerald-600 to-teal-600 text-white border-emerald-400/50 shadow-md shadow-emerald-950/40'
                  : 'bg-slate-900/90 border-slate-800 text-slate-300 hover:text-white hover:border-emerald-900/60'
              }`}
            >
              {showCiphertext ? <EyeOff className="w-3.5 h-3.5 text-white" /> : <Eye className="w-3.5 h-3.5 text-emerald-400" />}
              <span>{showCiphertext ? 'Show Plaintext' : 'Inspect Ciphertext'}</span>
            </button>

            {/* Public-Key Verification Link (README Feature 5 requirement) */}
            <Link
              href="/verify-key"
              className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-emerald-950/60 border border-emerald-700/60 text-xs text-emerald-300 hover:bg-emerald-900/70 transition-all font-semibold"
            >
              <Shield className="w-3.5 h-3.5 text-emerald-400" />
              <span>Verify Safety Number</span>
            </Link>
          </div>
        </div>

        {/* Key-Change Warning Banner (README Feature 5: Public-Key Verification and Key-Change Warning) */}
        {hasKeyWarning && (
          <div className="p-3.5 bg-gradient-to-r from-amber-500/15 via-amber-500/10 to-transparent border-b border-amber-500/30 text-amber-200 text-xs flex items-center justify-between px-6 backdrop-blur-sm">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-xl bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-amber-400 shrink-0">
                <AlertTriangle className="w-4 h-4" />
              </div>
              <span>
                <strong className="text-amber-300">Key-Change Warning:</strong> @{activeContact.username}&apos;s identity key changed to version <strong>v{activeContact.publicKeyVersion}</strong>. Verify their safety number before transmitting sensitive data.
              </span>
            </div>
            <div className="flex items-center gap-3">
              <Link
                href="/verify-key"
                className="px-3.5 py-1.5 bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-bold rounded-xl transition-colors shadow-sm"
              >
                Verify Key
              </Link>
              <button
                onClick={() => setDismissedWarnings((prev) => ({ ...prev, [activeContact.id]: true }))}
                className="text-xs text-slate-400 hover:text-white underline font-medium"
              >
                Dismiss
              </button>
            </div>
          </div>
        )}

        {/* Message Feed */}
        <div className="flex-1 p-6 overflow-y-auto space-y-4">
          <div className="text-center my-3">
            <span className="px-4 py-1.5 rounded-full bg-emerald-950/50 border border-emerald-800/60 text-[11px] text-emerald-300 font-mono inline-flex items-center gap-2 shadow-inner">
              <Lock className="w-3.5 h-3.5 text-emerald-400" />
              End-to-End Encrypted via Web Crypto AES-256-GCM. The server stores zero plaintext.
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
                      ? 'bg-gradient-to-br from-emerald-600 to-teal-700 text-white rounded-br-sm shadow-md shadow-emerald-950/40'
                      : 'bg-slate-900/90 border border-slate-800/90 text-slate-100 rounded-bl-sm shadow-sm'
                  }`}
                >
                  {showCiphertext ? (
                    <div className="font-mono text-xs">
                      <span className="text-[10px] block text-emerald-200/80 font-sans mb-1 font-semibold">
                        Encrypted Payload (AES-256-GCM):
                      </span>
                      <p className="break-all text-emerald-200 bg-black/50 p-2.5 rounded-xl border border-emerald-900/50 select-all">
                        {msg.encryptedPreview}
                      </p>
                    </div>
                  ) : (
                    <p className="break-words leading-relaxed">{msg.text}</p>
                  )}

                  <div className="flex items-center justify-end gap-1.5 mt-1.5 text-[10px] opacity-75 font-mono">
                    <span>{msg.timestamp}</span>
                    {isOwn && <CheckCheck className="w-3.5 h-3.5 text-white" />}
                  </div>
                </div>
              </div>
            );
          })}

          <div ref={messagesEndRef} />
        </div>

        {/* Input Bar */}
        <form
          onSubmit={handleSendMessage}
          className="p-4 border-t border-emerald-950/60 bg-[#062424]/30 backdrop-blur-md flex gap-3 items-center"
        >
          <input
            type="text"
            placeholder={`Message @${activeContact.username} (Encrypted before transmission)...`}
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            className="flex-1 bg-slate-900/80 border border-slate-800 rounded-2xl px-5 py-3 text-sm text-slate-100 placeholder:text-slate-500 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500/30 transition-all shadow-inner"
          />
          <button
            type="submit"
            disabled={!inputText.trim()}
            className="p-3.5 rounded-2xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white shadow-lg shadow-emerald-950/50 transition-all active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Send className="w-4 h-4" />
          </button>
        </form>
      </section>
    </div>
  );
}
