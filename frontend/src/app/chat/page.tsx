'use client';

import React, { useState, useEffect } from 'react';
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

  useEffect(() => {
    const raw = localStorage.getItem('securechat_user');
    if (raw) {
      try {
        setCurrentUser(JSON.parse(raw));
      } catch {}
    }
  }, []);

  const filteredContacts = contacts.filter(
    (c) =>
      c.username.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.displayName.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const activeMessages = messagesMap[activeContact.id] || [];

  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputText.trim()) return;

    const newMsg: MockMessage = {
      id: 'm-' + Date.now(),
      conversationId: `conv-${activeContact.id}`,
      senderId: currentUser.id,
      text: inputText.trim(),
      encryptedPreview: btoa(inputText.trim()).substring(0, 24) + '==',
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
    <div className="flex-1 flex overflow-hidden h-[calc(100vh-61px)]">
      {/* Sidebar: Contacts & Search */}
      <aside className="w-80 bg-[#082f2f]/40 border-r border-emerald-950 flex flex-col shrink-0">
        <div className="p-4 border-b border-emerald-950">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-bold text-white flex items-center gap-1.5">
              <MessageSquare className="w-4 h-4 text-emerald-400" />
              Encrypted Chats
            </h2>
            <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-950 text-emerald-400 border border-emerald-800">
              {contacts.length} Contacts
            </span>
          </div>

          <div className="relative">
            <Search className="w-4 h-4 text-emerald-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search contact by username..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-slate-950/70 border border-emerald-900/60 rounded-xl pl-9 pr-3 py-2 text-xs text-slate-200 placeholder:text-slate-500 focus:outline-none focus:border-emerald-500"
            />
          </div>
        </div>

        {/* Contact List */}
        <div className="flex-1 p-2 overflow-y-auto space-y-1">
          {filteredContacts.map((contact) => {
            const isSelected = activeContact.id === contact.id;
            return (
              <button
                key={contact.id}
                onClick={() => setActiveContact(contact)}
                className={`w-full flex items-center gap-3 p-3 rounded-xl transition-all text-left ${
                  isSelected
                    ? 'bg-emerald-500/15 border border-emerald-500/30 text-white'
                    : 'hover:bg-slate-900/60 text-slate-300'
                }`}
              >
                <div className="relative">
                  <div className="w-10 h-10 rounded-full bg-emerald-950 border border-emerald-800 flex items-center justify-center text-emerald-400 font-bold text-xs">
                    {contact.avatarInitials}
                  </div>
                  {contact.isOnline && (
                    <span className="absolute bottom-0 right-0 w-3 h-3 rounded-full bg-emerald-400 border-2 border-[#0b1120]" />
                  )}
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-xs truncate text-white">
                      {contact.displayName}
                    </span>
                    <span className="text-[10px] text-slate-500">@{contact.username}</span>
                  </div>
                  <div className="flex items-center gap-1 text-[10px] text-emerald-400 mt-0.5">
                    <Lock className="w-3 h-3" /> E2EE Active (v{contact.publicKeyVersion})
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      </aside>

      {/* Main Chat Workspace */}
      <section className="flex-1 flex flex-col bg-slate-950/50">
        {/* Header */}
        <div className="px-6 py-3.5 border-b border-emerald-950 bg-[#082f2f]/30 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-full bg-emerald-950 border border-emerald-800 flex items-center justify-center text-emerald-400 font-bold text-xs">
              {activeContact.avatarInitials}
            </div>
            <div>
              <h2 className="text-sm font-bold text-white flex items-center gap-1.5">
                {activeContact.displayName}
                <span className="text-slate-400 text-xs font-normal">(@{activeContact.username})</span>
                <ShieldCheck className="w-4 h-4 text-emerald-400" />
              </h2>
              <p className="text-[10px] text-emerald-400 font-mono">
                Fingerprint: {activeContact.fingerprint.substring(0, 19)}...
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {/* Ciphertext / Plaintext toggle */}
            <button
              onClick={() => setShowCiphertext(!showCiphertext)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-900 border border-emerald-900/60 text-xs text-slate-300 hover:text-white transition-colors"
            >
              {showCiphertext ? <EyeOff className="w-3.5 h-3.5 text-emerald-400" /> : <Eye className="w-3.5 h-3.5 text-emerald-400" />}
              {showCiphertext ? 'Show Decrypted' : 'Inspect Ciphertext'}
            </button>

            {/* Verify Keys Link */}
            <Link
              href="/verify-key"
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-600/20 border border-emerald-500/40 text-xs text-emerald-300 hover:bg-emerald-600/30 transition-colors font-medium"
            >
              <Shield className="w-3.5 h-3.5 text-emerald-400" />
              Verify Safety Number
            </Link>
          </div>
        </div>

        {/* Key-Change Warning Banner (Feature 10) */}
        {hasKeyWarning && (
          <div className="p-3 bg-amber-500/10 border-b border-amber-500/30 text-amber-300 text-xs flex items-center justify-between px-6">
            <div className="flex items-center gap-2.5">
              <AlertTriangle className="w-5 h-5 shrink-0 text-amber-400" />
              <span>
                <strong>Security Alert:</strong> @{activeContact.username}&apos;s identity key changed to version v{activeContact.publicKeyVersion}. Please verify their safety number before transmitting confidential secrets.
              </span>
            </div>
            <button
              onClick={() => setDismissedWarnings((prev) => ({ ...prev, [activeContact.id]: true }))}
              className="text-[11px] underline hover:text-white ml-4"
            >
              Dismiss
            </button>
          </div>
        )}

        {/* Message Feed */}
        <div className="flex-1 p-6 overflow-y-auto space-y-3">
          <div className="text-center my-3">
            <span className="px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-[11px] text-emerald-400 font-mono inline-flex items-center gap-1.5">
              <Lock className="w-3 h-3" /> Messages in this chat are protected by client-side AES-256-GCM.
            </span>
          </div>

          {activeMessages.map((msg) => {
            const isOwn = msg.senderId === currentUser.id;
            return (
              <div key={msg.id} className={`flex flex-col ${isOwn ? 'items-end' : 'items-start'}`}>
                <div
                  className={`max-w-[70%] px-4 py-2.5 rounded-2xl text-sm ${
                    isOwn
                      ? 'bg-emerald-600 text-white rounded-br-none shadow-md'
                      : 'bg-slate-900 border border-slate-800 text-slate-100 rounded-bl-none shadow-sm'
                  }`}
                >
                  {showCiphertext ? (
                    <div className="font-mono text-xs text-emerald-200">
                      <span className="opacity-70 text-[10px] block text-slate-400">AES-256-GCM Ciphertext Payload:</span>
                      {msg.encryptedPreview}
                    </div>
                  ) : (
                    <p className="break-words leading-relaxed">{msg.text}</p>
                  )}

                  <div className="flex items-center justify-end gap-1 mt-1 text-[10px] opacity-70">
                    <span>{msg.timestamp}</span>
                    {isOwn && <CheckCheck className="w-3 h-3 ml-0.5 text-white" />}
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Input Bar */}
        <form onSubmit={handleSendMessage} className="p-4 border-t border-emerald-950 bg-[#082f2f]/20 flex gap-3">
          <input
            type="text"
            placeholder={`Message @${activeContact.username} (Client-side encrypted)...`}
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
      </section>
    </div>
  );
}
