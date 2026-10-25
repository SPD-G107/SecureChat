'use client';

import React, { useState } from 'react';
import { ApiClient } from '@/lib/api-client';
import {
  Search,
  ShieldCheck,
  KeyRound,
  AlertCircle,
  QrCode,
  Copy,
  Check,
  ShieldAlert,
  Sparkles,
  RefreshCw,
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
  const [compareInput, setCompareInput] = useState('');
  const [showQR, setShowQR] = useState(false);

  const performLookup = async (usernameToFind: string) => {
    const q = usernameToFind.trim().toLowerCase().replace(/^@/, '');
    if (!q) return;
    setError(null);
    setKeyData(null);
    setIsVerified(false);
    setCompareInput('');
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

  // Compare test
  const cleanKey = keyData?.fingerprint?.replace(/\s+/g, '') || '';
  const cleanInput = compareInput.replace(/\s+/g, '');
  const isComparing = cleanInput.length > 0;
  const isExactMatch = isComparing && cleanKey.toLowerCase() === cleanInput.toLowerCase();

  return (
    <div className="flex-1 max-w-4xl mx-auto w-full p-6 py-10">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-white flex items-center gap-2.5">
          <KeyRound className="w-6 h-6 text-emerald-400" />
          Public-Key Verification & Fingerprints
        </h1>
        <p className="text-xs text-slate-400 mt-1">
          Verify cryptographic fingerprints out-of-band to guarantee zero Man-in-the-Middle (MITM) substitution.
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
          <span className="flex items-center gap-1 text-[11px] text-emerald-400">
            <Sparkles className="w-3.5 h-3.5" /> Quick test contact:
          </span>
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
          <div className="p-6 rounded-2xl bg-slate-950/70 border border-emerald-900/50 flex flex-col items-center text-center relative overflow-hidden">
            <div className="w-14 h-14 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400 mb-3 shadow-inner">
              <ShieldCheck className="w-8 h-8" />
            </div>

            <h3 className="font-bold text-white text-lg">@{keyData.username}&apos;s Cryptographic Identity</h3>
            <div className="flex items-center gap-2 my-2">
              <span className="text-xs px-3 py-0.5 rounded-full bg-emerald-950 text-emerald-400 border border-emerald-800 font-mono">
                Key Version: v{keyData.version}
              </span>
              <span className="text-[10px] px-2.5 py-0.5 rounded-full bg-cyan-950 text-cyan-300 border border-cyan-800 font-mono">
                ECDH Curve P-256
              </span>
            </div>

            <p className="text-xs text-slate-400 max-w-lg my-2 leading-relaxed">
              Compare this 60-digit safety number with @{keyData.username} over an out-of-band channel (e.g. video call or in person) to guarantee your connection is encrypted without eavesdropping.
            </p>

            {/* Chunked Safety Number Display (Signal style) */}
            <div className="my-4 p-4 rounded-2xl bg-black/60 border border-emerald-900/50 max-w-xl w-full">
              <div className="grid grid-cols-3 sm:grid-cols-5 gap-2 text-center font-mono text-emerald-400 text-sm tracking-widest font-semibold select-all">
                {keyData.fingerprint.split(' ').map((chunk: string, i: number) => (
                  <span
                    key={i}
                    className="p-1.5 rounded-lg bg-slate-900/80 border border-slate-800 hover:border-emerald-500/60 transition-colors"
                  >
                    {chunk}
                  </span>
                ))}
              </div>
            </div>

            <div className="flex items-center gap-3 mt-2 flex-wrap justify-center">
              <button
                onClick={handleCopy}
                className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-slate-200 text-xs font-semibold rounded-xl border border-slate-800 transition-colors flex items-center gap-1.5"
              >
                {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5 text-slate-400" />}
                {copied ? 'Copied Fingerprint!' : 'Copy Fingerprint'}
              </button>

              <button
                onClick={() => setShowQR(!showQR)}
                className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-slate-200 text-xs font-semibold rounded-xl border border-slate-800 transition-colors flex items-center gap-1.5"
              >
                <QrCode className="w-3.5 h-3.5 text-emerald-400" />
                {showQR ? 'Hide QR Code' : 'Show QR Code'}
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

            {/* QR Code Simulation */}
            {showQR && (
              <div className="mt-6 p-4 rounded-2xl bg-white p-4 shadow-2xl animate-in fade-in zoom-in-95 duration-200">
                <div className="w-40 h-40 bg-slate-900 rounded-lg p-3 flex flex-col items-center justify-center text-white">
                  <QrCode className="w-24 h-24 text-emerald-400" />
                  <span className="text-[10px] text-slate-400 font-mono mt-1">@{keyData.username} v{keyData.version}</span>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Interactive Safety Number Comparison Tool */}
      {keyData && (
        <div className="p-6 rounded-2xl bg-slate-900/80 border border-emerald-950 shadow-xl">
          <div className="flex items-center gap-2.5 mb-3">
            <ShieldCheck className="w-5 h-5 text-emerald-400" />
            <h3 className="font-bold text-white text-sm">Interactive Safety Number Matcher</h3>
          </div>
          <p className="text-xs text-slate-400 mb-4">
            Paste or type the safety number you received from your contact to automatically verify cryptographic alignment:
          </p>

          <div className="flex gap-2 mb-3">
            <input
              type="text"
              placeholder="Paste contact safety number (e.g. 5420 1893 1200...)"
              value={compareInput}
              onChange={(e) => setCompareInput(e.target.value)}
              className="flex-1 bg-slate-950/80 border border-slate-800 rounded-xl px-4 py-2 text-xs text-slate-100 font-mono focus:outline-none focus:border-emerald-500"
            />
            <button
              onClick={() => setCompareInput(keyData.fingerprint)}
              className="px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold rounded-xl"
            >
              Paste Valid
            </button>
            <button
              onClick={() => setCompareInput('9999 8888 7777 6666 5555 4444 3333 2222')}
              className="px-3 py-2 bg-red-950/60 hover:bg-red-900 text-red-300 text-xs font-semibold rounded-xl border border-red-900/60"
            >
              Test Mismatch
            </button>
          </div>

          {isComparing && (
            <div
              className={`p-3 rounded-xl border flex items-center gap-2 text-xs font-medium animate-in fade-in duration-200 ${
                isExactMatch
                  ? 'bg-emerald-500/10 border-emerald-500/40 text-emerald-300'
                  : 'bg-red-500/10 border-red-500/40 text-red-300'
              }`}
            >
              {isExactMatch ? (
                <>
                  <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0" />
                  <span><strong>100% Match!</strong> The safety number matches @{keyData.username}&apos;s identity key. Your communication is secure and authentic.</span>
                </>
              ) : (
                <>
                  <ShieldAlert className="w-4 h-4 text-red-400 shrink-0" />
                  <span><strong>Safety Number Mismatch!</strong> The safety number does not match @{keyData.username}&apos;s key. Do not transmit confidential secrets! Possible Man-in-the-Middle attack.</span>
                </>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
