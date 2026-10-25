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
  CheckCheck,
  Shield,
  MessageSquare,
  Copy,
  Check,
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
    <div className="flex-1 flex overflow-hidden h-[calc(100vh-57px)] bg-[#0b0f19]">
      {/* Sidebar: Contacts */}
      <aside className="w-80 bg-slate-900/40 border-r border-slate-800 flex flex-col shrink-0">
        {/* Sidebar Header & Search */}
        <div className="p-3.5 border-b border-slate-800">
          <div className="flex items-center justify-between mb-2.5">
            <h2 className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
              <MessageSquare className="w-3.5 h-3.5 text-emerald-400" />
              Contacts
            </h2>
            <span className="text-[10px] px-2 py-0.5 rounded-full bg-slate-800 text-slate-300 font-mono">
              {filteredContacts.length}
            </span>
          </div>

          <div className="relative">
            <Search className="w-3.5 h-3.5 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search contacts..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-slate-950/60 border border-slate-800 rounded-lg pl-8 pr-3 py-1.5 text-xs text-slate-200 placeholder:text-slate-500 focus:outline-none focus:border-emerald-500 transition-colors"
            />
          </div>
        </div>

        {/* Contact List */}
        <div className="flex-1 p-2 overflow-y-auto space-y-1">
          {filteredContacts.map((contact) => {
            const isSelected = activeContact.id === contact.id;
            const lastMsg = (messagesMap[contact.id] || []).slice(-1)[0];
            const hasAlert = contact.publicKeyVersion > 1 && !dismissedWarnings[contact.id];

            return (
              <button
                key={contact.id}
                onClick={() => setActiveContact(contact)}
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
                  {contact.isOnline && (
                    <span className="absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full bg-emerald-400 border-2 border-[#0b0f19]" />
                  )}
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-xs truncate text-white">
                      {contact.displayName}
                    </span>
                    <span className="text-[10px] text-slate-500 font-mono">
                      {lastMsg ? lastMsg.timestamp : ''}
                    </span>
                  </div>
                  <div className="flex items-center justify-between mt-0.5">
                    <span className="text-[11px] text-slate-400 truncate max-w-[140px]">
                      {lastMsg ? lastMsg.text : 'Direct chat'}
                    </span>
                    {hasAlert ? (
                      <span className="px-1.5 py-0.2 rounded bg-amber-950 text-amber-400 border border-amber-800 text-[9px] font-bold">
                        Key v{contact.publicKeyVersion}
                      </span>
                    ) : (
                      <span className="text-[10px] text-emerald-500 font-mono flex items-center gap-0.5">
                        <Lock className="w-2.5 h-2.5" /> E2EE
                      </span>
                    )}
                  </div>
                </div>
              </button>
            );
          })}
        </div>

        {/* Current User Card */}
        <div className="p-3 border-t border-slate-800 bg-slate-900/60 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-full bg-emerald-950 border border-emerald-800 flex items-center justify-center text-emerald-400 font-bold text-xs">
              {currentUser.avatarInitials || 'ME'}
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
            <User className="w-4 h-4 text-emerald-400" />
          </Link>
        </div>
      </aside>

      {/* Main Chat Workspace */}
      <section className="flex-1 flex flex-col bg-[#0b0f19]">
        {/* Chat Header */}
        <div className="px-6 py-3 border-b border-slate-800 bg-slate-900/40 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center text-emerald-400 font-bold text-xs">
              {activeContact.avatarInitials}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-sm font-bold text-white">{activeContact.displayName}</h2>
                <span className="text-slate-400 text-xs font-normal">(@{activeContact.username})</span>
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-emerald-950/60 text-emerald-400 border border-emerald-800 text-[10px] font-mono">
                  <ShieldCheck className="w-3 h-3" /> E2EE Active
                </span>
              </div>
              <div className="flex items-center gap-2 mt-0.5">
                <p className="text-[10px] text-slate-400 font-mono">
                  Safety Number: <span className="text-emerald-400">{activeContact.fingerprint.slice(0, 19)}...</span>
                </p>
                <button
                  onClick={handleCopySafetyNumber}
                  className="text-[10px] text-slate-400 hover:text-white"
                  title="Copy safety number"
                >
                  {copiedFingerprint ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                </button>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Ciphertext / Plaintext Toggle */}
            <button
              onClick={() => setShowCiphertext(!showCiphertext)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-medium transition-colors ${
                showCiphertext
                  ? 'bg-emerald-600 text-white border-emerald-500'
                  : 'bg-slate-800/80 border-slate-700 text-slate-300 hover:text-white'
              }`}
            >
              {showCiphertext ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5 text-emerald-400" />}
              <span>{showCiphertext ? 'Show Plaintext' : 'Inspect Ciphertext'}</span>
            </button>

            {/* Public-Key Verification Link */}
            <Link
              href="/verify-key"
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs text-slate-200 border border-slate-700 transition-colors font-medium"
            >
              <Shield className="w-3.5 h-3.5 text-emerald-400" />
              <span>Verify Key</span>
            </Link>
          </div>
        </div>

        {/* Key-Change Warning Banner (Feature 5) */}
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
        <div className="flex-1 p-6 overflow-y-auto space-y-3">
          <div className="text-center my-2">
            <span className="px-3 py-1 rounded-full bg-slate-900 border border-slate-800 text-[10px] text-slate-400 font-mono inline-flex items-center gap-1.5">
              <Lock className="w-3 h-3 text-emerald-400" /> Messages are end-to-end encrypted (AES-256-GCM). Zero server plaintext.
            </span>
          </div>

          {activeMessages.map((msg) => {
            const isOwn = msg.senderId === currentUser.id;

            return (
              <div
                key={msg.id}
                className={`flex flex-col ${isOwn ? 'items-end' : 'items-start'}`}
              >
                <div
                  className={`max-w-[70%] px-4 py-2.5 rounded-2xl text-sm ${
                    isOwn
                      ? 'bg-emerald-600 text-white rounded-br-sm shadow-sm'
                      : 'bg-slate-900 border border-slate-800 text-slate-100 rounded-bl-sm shadow-sm'
                  }`}
                >
                  {showCiphertext ? (
                    <div className="font-mono text-xs text-emerald-200">
                      <span className="opacity-70 text-[10px] block text-slate-400 font-sans mb-0.5">
                        AES-256-GCM Ciphertext:
                      </span>
                      {msg.encryptedPreview}
                    </div>
                  ) : (
                    <p className="break-words leading-relaxed">{msg.text}</p>
                  )}

                  <div className="flex items-center justify-end gap-1 mt-1 text-[10px] opacity-70 font-mono">
                    <span>{msg.timestamp}</span>
                    {isOwn && <CheckCheck className="w-3 h-3 text-white" />}
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
          className="p-3.5 border-t border-slate-800 bg-slate-900/40 flex gap-2.5 items-center"
        >
          <input
            type="text"
            placeholder={`Message @${activeContact.username}...`}
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            className="flex-1 bg-slate-950/70 border border-slate-800 rounded-xl px-4 py-2.5 text-sm text-slate-100 placeholder:text-slate-500 focus:outline-none focus:border-emerald-500 transition-colors"
          />
          <button
            type="submit"
            disabled={!inputText.trim()}
            className="p-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white transition-colors disabled:opacity-40"
          >
            <Send className="w-4 h-4" />
          </button>
        </form>
      </section>
    </div>
  );
}
