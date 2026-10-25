'use client';

import React, { useState } from 'react';
import { ApiClient } from '@/lib/api-client';
import { Search, ShieldCheck, KeyRound, AlertCircle } from 'lucide-react';

export default function VerifyKeyPage() {
  const [searchUsername, setSearchUsername] = useState('');
  const [keyData, setKeyData] = useState<any | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleLookup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchUsername.trim()) return;
    setError(null);
    setKeyData(null);
    setLoading(true);

    try {
      const searchRes = await ApiClient.get(`/users/search?q=${encodeURIComponent(searchUsername.trim())}`);
      const found = searchRes.users?.find((u: any) => u.username.toLowerCase() === searchUsername.trim().toLowerCase());

      if (!found) {
        throw new Error(`Contact @${searchUsername} not found`);
      }

      const keyRes = await ApiClient.get(`/users/${found.id}/public-key`);
      setKeyData({ ...keyRes, username: found.username });
    } catch (err: any) {
      setError(err.message || 'Key lookup failed');
    } finally {
      setLoading(false);
    }
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

      <div className="bg-slate-900/80 border border-emerald-950 rounded-2xl p-6 shadow-xl">
        <form onSubmit={handleLookup} className="flex gap-3 mb-6">
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-emerald-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search contact username (e.g. bob)"
              value={searchUsername}
              onChange={(e) => setSearchUsername(e.target.value)}
              className="w-full bg-slate-950/70 border border-slate-800 rounded-xl pl-10 pr-4 py-2.5 text-sm text-slate-200 focus:outline-none focus:border-emerald-500"
            />
          </div>
          <button
            type="submit"
            disabled={loading}
            className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white font-medium text-sm rounded-xl transition-colors disabled:opacity-60"
          >
            {loading ? 'Searching...' : 'Lookup Key'}
          </button>
        </form>

        {error && (
          <div className="p-3 mb-4 rounded-xl bg-red-500/10 border border-red-500/30 text-red-400 text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4" />
            <span>{error}</span>
          </div>
        )}

        {keyData && (
          <div className="p-6 rounded-xl bg-slate-950/60 border border-emerald-900/50 flex flex-col items-center text-center">
            <div className="w-12 h-12 rounded-full bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400 mb-3">
              <ShieldCheck className="w-6 h-6" />
            </div>

            <h3 className="font-bold text-white text-base">@{keyData.username}&apos;s Identity Key</h3>
            <span className="text-[11px] px-2.5 py-0.5 rounded-full bg-emerald-950 text-emerald-400 border border-emerald-800 my-2 font-mono">
              Key Version: v{keyData.version}
            </span>

            <p className="text-xs text-slate-400 max-w-md my-2">
              Compare this 64-character SHA-256 fingerprint with your contact over a trusted channel.
            </p>

            <div className="p-3 bg-black/60 rounded-xl border border-slate-800 font-mono text-emerald-400 text-xs tracking-wider select-all break-all my-3 max-w-lg">
              {keyData.fingerprint}
            </div>

            <button
              onClick={() => alert(`Verified safety number for @${keyData.username}!`)}
              className="mt-3 px-5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold rounded-xl transition-colors"
            >
              Mark Safety Number as Verified
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
