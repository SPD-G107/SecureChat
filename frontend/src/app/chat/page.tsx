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

  const hasKeyWarning = activeContact.publicKeyVersion > 1 && !dismissedWarnings[activeContact.id];

  return (
    <div className="flex-1 flex overflow-hidden h-[calc(100vh-61px)] bg-[#0b1120]">
      {/* Sidebar: Contacts & Search */}
      <aside className="w-80 bg-[#082f2f]/35 border-r border-emerald-950 flex flex-col shrink-0">
        <div className="p-4 border-b border-emerald-950/80 bg-[#062424]/40">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-bold text-white flex items-center gap-2">
              <MessageSquare className="w-4 h-4 text-emerald-400" />
              Contacts & Chats
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
                      {lastMsg ? lastMsg.text : 'No messages yet'}
                    </span>
                    {hasAlert && (
                      <span className="px-1.5 py-0.2 rounded bg-amber-950 text-amber-400 border border-amber-800 text-[9px] font-bold">
                        Key v{contact.publicKeyVersion}
                      </span>
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
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" /> Identity Key Active
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
                  <ShieldCheck className="w-3 h-3" /> E2EE Active (v{activeContact.publicKeyVersion})
                </span>
              </div>
              <p className="text-[10px] text-emerald-400 font-mono mt-0.5">
                Safety Number: {activeContact.fingerprint.slice(0, 24)}...
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2.5">
            {/* Ciphertext / Plaintext Toggle (README Feature 4 requirement) */}
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

            {/* Public-Key Verification Link (README Feature 5 requirement) */}
            <Link
              href="/verify-key"
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-950/70 border border-emerald-800/80 text-xs text-emerald-300 hover:bg-emerald-900 transition-colors font-medium"
            >
              <Shield className="w-3.5 h-3.5 text-emerald-400" />
              Verify Safety Number
            </Link>
          </div>
        </div>

        {/* Key-Change Warning Banner (README Feature 5: Public-Key Verification and Key-Change Warning) */}
        {hasKeyWarning && (
          <div className="p-3 bg-amber-500/10 border-b border-amber-500/30 text-amber-200 text-xs flex items-center justify-between px-6">
            <div className="flex items-center gap-3">
              <AlertTriangle className="w-5 h-5 shrink-0 text-amber-400" />
              <span>
                <strong>Key-Change Warning:</strong> @{activeContact.username}&apos;s identity key changed to version v{activeContact.publicKeyVersion}. Verify their safety number before transmitting sensitive data.
              </span>
            </div>
            <div className="flex items-center gap-3">
              <Link
                href="/verify-key"
                className="px-3 py-1 bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-bold rounded-lg transition-colors"
              >
                Verify Key
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
        <div className="flex-1 p-6 overflow-y-auto space-y-4">
          <div className="text-center my-2">
            <span className="px-4 py-1.5 rounded-full bg-emerald-950/60 border border-emerald-800/60 text-[11px] text-emerald-300 font-mono inline-flex items-center gap-2 shadow-inner">
              <Lock className="w-3.5 h-3.5 text-emerald-400" />
              End-to-End Encrypted (AES-256-GCM). The server stores only ciphertext.
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
                  className={`max-w-[70%] px-4 py-3 rounded-2xl text-sm transition-all ${
                    isOwn
                      ? 'bg-emerald-600 text-white rounded-br-none shadow-md shadow-emerald-950/40'
                      : 'bg-slate-900 border border-slate-800/80 text-slate-100 rounded-bl-none shadow-sm'
                  }`}
                >
                  {showCiphertext ? (
                    <div className="font-mono text-xs">
                      <span className="opacity-70 text-[10px] block text-emerald-200 font-sans mb-1">
                        Encrypted Payload (AES-256-GCM):
                      </span>
                      <p className="break-all text-emerald-300 bg-black/40 p-2 rounded-lg border border-emerald-900/40 select-all">
                        {msg.encryptedPreview}
                      </p>
                    </div>
                  ) : (
                    <p className="break-words leading-relaxed">{msg.text}</p>
                  )}

                  <div className="flex items-center justify-end gap-1.5 mt-1.5 text-[10px] opacity-75">
                    <span>{msg.timestamp}</span>
                    {isOwn && <CheckCheck className="w-3 h-3 text-white" />}
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
          className="p-4 border-t border-emerald-950 bg-[#082f2f]/20 flex gap-3 items-center"
        >
          <input
            type="text"
            placeholder={`Type a message to @${activeContact.username} (Encrypted before transmission)...`}
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
    </div>
  );
}
