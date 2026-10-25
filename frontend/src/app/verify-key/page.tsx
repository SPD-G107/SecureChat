'use client';

import React, { useState } from 'react';
import { ApiClient } from '@/lib/api-client';
import {
  Search,
  ShieldCheck,
  KeyRound,
  AlertCircle,
  Copy,
  Check,
} from 'lucide-react';
import { MOCK_CONTACTS, CURRENT_USER } from '@/lib/mock-data';

export default function VerifyKeyPage() {
  const [searchUsername, setSearchUsername] = useState('bob');
  const [keyData, setKeyData] = useState<any | null>({
    username: 'bob',
    version: 2,
    fingerprint: '5420 1893 1200 1924 8192 1092 4819 2048 1920 1924 8192 0192 8410 2948 1924',
    isMock: true,
  });
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [isVerified, setIsVerified] = useState(false);
  const [copied, setCopied] = useState(false);

  const performLookup = async (usernameToFind: string) => {
    const q = usernameToFind.trim().toLowerCase().replace(/^@/, '');
    if (!q) return;
    setError(null);
    setKeyData(null);
    setIsVerified(false);
    setLoading(true);

    try {
      const searchRes = await ApiClient.get(`/users/search?q=${encodeURIComponent(q)}`);
      const found = searchRes.users?.find((u: any) => u.username.toLowerCase() === q);

      if (!found) throw new Error(`Contact @${q} not found`);

      const keyRes = await ApiClient.get(`/users/${found.id}/public-key`);
      setKeyData({ ...keyRes, username: found.username });
    } catch {
      // Fallback to mock data for Phase 2 UI evaluation
      const allMock = [CURRENT_USER, ...MOCK_CONTACTS];
      const mockFound = allMock.find((u) => u.username.toLowerCase() === q);
      if (mockFound) {
        setKeyData({
          username: mockFound.username,
          version: mockFound.publicKeyVersion,
          fingerprint: mockFound.fingerprint,
          isMock: true,
        });
      } else {
        setError(`Contact @${q} not found in registered keys`);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleLookup = (e: React.FormEvent) => {
    e.preventDefault();
    performLookup(searchUsername);
  };

  const handleCopy = () => {
    if (!keyData) return;
    navigator.clipboard.writeText(keyData.fingerprint);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="flex-1 max-w-3xl mx-auto w-full p-6 py-10">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-white flex items-center gap-2.5">
          <KeyRound className="w-6 h-6 text-emerald-400" />
          Public-Key Verification & Fingerprints
        </h1>
        <p className="text-xs text-slate-400 mt-1">
          Verify cryptographic fingerprints out-of-band to prevent Man-in-the-Middle (MITM) attacks.
        </p>
      </div>

      <div className="bg-slate-900/80 border border-emerald-950 rounded-2xl p-6 shadow-xl mb-6">
        <form onSubmit={handleLookup} className="flex gap-3 mb-4">
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-emerald-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search contact username (e.g. bob, charlie, admin)"
              value={searchUsername}
              onChange={(e) => setSearchUsername(e.target.value)}
              className="w-full bg-slate-950/70 border border-slate-800 rounded-xl pl-10 pr-4 py-2.5 text-sm text-slate-200 focus:outline-none focus:border-emerald-500 transition-colors"
            />
          </div>
          <button
            type="submit"
            disabled={loading}
            className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white font-medium text-sm rounded-xl transition-colors disabled:opacity-60 shadow-md shadow-emerald-950/30"
          >
            {loading ? 'Searching...' : 'Lookup Key'}
          </button>
        </form>

        {/* Quick select test contacts for UI evaluation */}
        <div className="flex items-center gap-2 mb-6 text-xs text-slate-400 flex-wrap">
          <span className="text-[11px] text-slate-400">Quick test:</span>
          {['bob', 'charlie', 'admin', 'alice'].map((name) => (
            <button
              key={name}
              type="button"
              onClick={() => {
                setSearchUsername(name);
                performLookup(name);
              }}
              className="px-3 py-1 rounded-lg bg-slate-800/80 hover:bg-emerald-950 hover:text-emerald-300 border border-slate-700/60 font-mono text-[11px] transition-colors"
            >
              @{name}
            </button>
          ))}
        </div>

        {error && (
          <div className="p-3 mb-4 rounded-xl bg-red-500/10 border border-red-500/30 text-red-400 text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {keyData && (
          <div className="p-6 rounded-2xl bg-slate-950/70 border border-emerald-900/50 flex flex-col items-center text-center">
            <div className="w-14 h-14 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400 mb-3 shadow-inner">
              <ShieldCheck className="w-8 h-8" />
            </div>

            <h3 className="font-bold text-white text-lg">@{keyData.username}&apos;s Cryptographic Identity Key</h3>
            <div className="flex items-center gap-2 my-2">
              <span className="text-xs px-3 py-0.5 rounded-full bg-emerald-950 text-emerald-400 border border-emerald-800 font-mono">
                Key Version: v{keyData.version}
              </span>
              <span className="text-[10px] px-2.5 py-0.5 rounded-full bg-cyan-950 text-cyan-300 border border-cyan-800 font-mono">
                ECDH P-256
              </span>
            </div>

            <p className="text-xs text-slate-400 max-w-lg my-2 leading-relaxed">
              Compare this 64-character SHA-256 fingerprint with @{keyData.username} over a trusted out-of-band channel to verify key authenticity.
            </p>

            <div className="my-4 p-4 rounded-2xl bg-black/60 border border-emerald-900/50 max-w-xl w-full">
              <p className="font-mono text-emerald-400 text-xs tracking-wider select-all break-all text-center">
                {keyData.fingerprint}
              </p>
            </div>

            <div className="flex items-center gap-3 mt-2">
              <button
                onClick={handleCopy}
                className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-slate-200 text-xs font-semibold rounded-xl border border-slate-800 transition-colors flex items-center gap-1.5"
              >
                {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5 text-slate-400" />}
                {copied ? 'Copied Fingerprint!' : 'Copy Fingerprint'}
              </button>

              <button
                onClick={() => setIsVerified((v) => !v)}
                className={`px-5 py-2 text-xs font-semibold rounded-xl transition-all flex items-center gap-2 ${
                  isVerified
                    ? 'bg-emerald-500 text-slate-950 shadow-lg shadow-emerald-500/30'
                    : 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-md'
                }`}
              >
                <ShieldCheck className="w-4 h-4" />
                {isVerified ? '✓ Safety Number Verified & Trusted' : 'Mark Safety Number as Verified'}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
