'use client';

import React, { useState, useEffect } from 'react';
import { ApiClient } from '@/lib/api-client';
import { CryptoEngine } from '@/lib/crypto';
import {
  Search,
  ShieldCheck,
  KeyRound,
  AlertCircle,
  Copy,
  Check,
  Loader2,
  Users,
  Shield,
  ArrowRightLeft,
} from 'lucide-react';

export default function VerifyKeyPage() {
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [myFingerprint, setMyFingerprint] = useState<string>('');
  const [searchUsername, setSearchUsername] = useState('');
  const [keyData, setKeyData] = useState<any | null>(null);
  const [mutualSafetyNumber, setMutualSafetyNumber] = useState<string>('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [isVerified, setIsVerified] = useState(false);
  const [copiedMutual, setCopiedMutual] = useState(false);
  const [copiedPeer, setCopiedPeer] = useState(false);
  const [recentUsers, setRecentUsers] = useState<string[]>([]);

  // Load current user, their key, and all registered users from MySQL on mount
  useEffect(() => {
    if (typeof window === 'undefined') return;

    let activeUser: any = null;
    const raw = localStorage.getItem('securechat_user');
    if (raw) {
      try {
        activeUser = JSON.parse(raw);
        setCurrentUser(activeUser);

        // Fetch current user's own identity key
        ApiClient.get(`/keys/${activeUser.id}`)
          .then((k) => {
            if (k && k.fingerprint) {
              setMyFingerprint(k.fingerprint);
            }
          })
          .catch(() => {});
      } catch {}
    }

    // Check URL query parameter ?user=xxx
    const params = new URLSearchParams(window.location.search);
    const targetUser = params.get('user');

    ApiClient.get('/users/search')
      .then((res) => {
        if (res && Array.isArray(res.users)) {
          const names = res.users.map((u: any) => u.username);
          setRecentUsers(names);

          if (targetUser && names.includes(targetUser.toLowerCase())) {
            setSearchUsername(targetUser);
            performLookup(targetUser, activeUser);
          } else if (names.length > 0) {
            // Pick first user who is not self
            const other = names.find((n: string) => n.toLowerCase() !== activeUser?.username?.toLowerCase()) || names[0];
            setSearchUsername(other);
            performLookup(other, activeUser);
          }
        }
      })
      .catch(() => {});
  }, []);

  const performLookup = async (usernameToFind: string, activeUsr = currentUser) => {
    const q = usernameToFind.trim().toLowerCase().replace(/^@/, '');
    if (!q) return;
    setError(null);
    setKeyData(null);
    setMutualSafetyNumber('');
    setIsVerified(false);
    setLoading(true);

    try {
      const searchRes = await ApiClient.get(`/users/search?q=${encodeURIComponent(q)}`);
      const found = searchRes.users?.find((u: any) => u.username.toLowerCase() === q);

      if (!found) {
        throw new Error(`Contact @${q} was not found in the live user directory.`);
      }

      const keyRes = await ApiClient.get(`/keys/${found.id}`);
      if (!keyRes || !keyRes.fingerprint) {
        throw new Error(`No cryptographic public key registered for @${q}.`);
      }

      // Retrieve current user fingerprint if not yet loaded
      let myFp = myFingerprint;
      if (!myFp && activeUsr?.id) {
        try {
          const myKey = await ApiClient.get(`/keys/${activeUsr.id}`);
          if (myKey && myKey.fingerprint) {
            myFp = myKey.fingerprint;
            setMyFingerprint(myFp);
          }
        } catch {}
      }

      // Compute pairwise mutual safety number (identical on both devices!)
      let mutual = '';
      if (myFp && keyRes.fingerprint) {
        mutual = await CryptoEngine.computeMutualSafetyNumber(myFp, keyRes.fingerprint);
      }

      // Check if previously marked as verified in LocalStorage
      let verifiedStatus = false;
      if (typeof window !== 'undefined' && activeUsr?.id) {
        const savedFp = localStorage.getItem(`securechat_verified_${activeUsr.id}_${found.id}`);
        if (savedFp && savedFp === keyRes.fingerprint) {
          verifiedStatus = true;
        }
      }
      setIsVerified(verifiedStatus);

      setMutualSafetyNumber(mutual);
      setKeyData({
        userId: found.id,
        username: found.username,
        version: keyRes.version || 1,
        fingerprint: keyRes.fingerprint,
        publicKey: keyRes.publicKey,
      });
    } catch (err: any) {
      setError(err.message || `Failed to retrieve public key for @${q}.`);
    } finally {
      setLoading(false);
    }
  };

  const handleToggleVerify = () => {
    if (!keyData || !currentUser?.id) return;
    const nextStatus = !isVerified;
    setIsVerified(nextStatus);
    if (nextStatus) {
      localStorage.setItem(`securechat_verified_${currentUser.id}_${keyData.userId}`, keyData.fingerprint);
    } else {
      localStorage.removeItem(`securechat_verified_${currentUser.id}_${keyData.userId}`);
    }
  };

  const handleLookup = (e: React.FormEvent) => {
    e.preventDefault();
    performLookup(searchUsername);
  };

  const handleCopyMutual = () => {
    if (!mutualSafetyNumber) return;
    navigator.clipboard.writeText(mutualSafetyNumber);
    setCopiedMutual(true);
    setTimeout(() => setCopiedMutual(false), 2000);
  };

  const handleCopyPeer = () => {
    if (!keyData) return;
    navigator.clipboard.writeText(keyData.fingerprint);
    setCopiedPeer(true);
    setTimeout(() => setCopiedPeer(false), 2000);
  };

  return (
    <div className="flex-1 max-w-3xl mx-auto w-full p-4 sm:p-6 py-8 sm:py-10">
      <div className="mb-6 sm:mb-8">
        <h1 className="text-xl sm:text-2xl font-bold text-white flex items-center gap-2.5">
          <KeyRound className="w-6 h-6 text-emerald-400" />
          Public-Key Verification & Safety Numbers
        </h1>
        <p className="text-xs text-slate-400 mt-1">
          Verify cryptographic ECDH P-256 identities out-of-band to prevent Man-in-the-Middle (MITM) attacks.
        </p>
      </div>

      <div className="bg-slate-900/80 border border-emerald-950 rounded-2xl p-4 sm:p-6 shadow-xl mb-6">
        <form onSubmit={handleLookup} className="flex flex-col sm:flex-row gap-3 mb-4">
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-emerald-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search contact username (e.g. nan, lang, alice, bob)"
              value={searchUsername}
              onChange={(e) => setSearchUsername(e.target.value)}
              className="w-full bg-slate-950/70 border border-slate-800 rounded-xl pl-10 pr-4 py-2.5 text-sm text-slate-200 focus:outline-none focus:border-emerald-500 transition-colors"
            />
          </div>
          <button
            type="submit"
            disabled={loading || !searchUsername.trim()}
            className="w-full sm:w-auto px-5 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white font-medium text-sm rounded-xl transition-colors disabled:opacity-60 shadow-md shadow-emerald-950/30 flex items-center justify-center gap-2"
          >
            {loading && <Loader2 className="w-4 h-4 animate-spin" />}
            <span>{loading ? 'Searching...' : 'Lookup Key'}</span>
          </button>
        </form>

        {/* Real registered contacts quick-select */}
        {recentUsers.length > 0 && (
          <div className="flex items-center gap-2 mb-6 text-xs text-slate-400 flex-wrap">
            <span className="text-[11px] text-slate-400">Registered users:</span>
            {recentUsers.map((name) => (
              <button
                key={name}
                type="button"
                onClick={() => {
                  setSearchUsername(name);
                  performLookup(name);
                }}
                className={`px-3 py-1 rounded-lg border font-mono text-[11px] transition-colors ${
                  keyData?.username === name
                    ? 'bg-emerald-950 text-emerald-300 border-emerald-600'
                    : 'bg-slate-800/80 hover:bg-emerald-950 hover:text-emerald-300 border-slate-700/60'
                }`}
              >
                @{name}
              </button>
            ))}
          </div>
        )}

        {error && (
          <div className="p-3 mb-4 rounded-xl bg-red-500/10 border border-red-500/30 text-red-400 text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {keyData && (
          <div className="space-y-6">
            {/* Primary Signal/WhatsApp Mutual Pairwise Safety Number Box */}
            <div className="p-5 sm:p-6 rounded-2xl bg-slate-950/90 border border-emerald-500/30 shadow-lg flex flex-col items-center text-center">
              <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400 mb-2.5 shadow-inner">
                <ShieldCheck className="w-6 h-6" />
              </div>

              <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-950/80 border border-emerald-800 text-emerald-300 text-xs font-semibold mb-2">
                <ArrowRightLeft className="w-3.5 h-3.5 text-emerald-400" />
                <span>Mutual Safety Number</span>
              </div>

              <h3 className="font-bold text-white text-base sm:text-lg">
                @{currentUser?.username || 'You'} <span className="text-emerald-400">↔</span> @{keyData.username}
              </h3>

              <p className="text-xs text-slate-300 max-w-lg mt-1 mb-3 leading-relaxed">
                ✨ <strong className="text-emerald-400">Identical on both screens:</strong> When @{keyData.username} views this page, both of your devices will display this <strong className="text-white">exact matching number</strong>!
              </p>

              {/* Formatted Mutual Safety Number */}
              <div className="my-2 p-4 rounded-2xl bg-black/80 border border-emerald-500/40 max-w-xl w-full shadow-inner">
                <p className="font-mono text-emerald-300 text-xs sm:text-sm tracking-widest font-bold select-all break-all leading-loose">
                  {mutualSafetyNumber || 'Computing mutual safety number...'}
                </p>
              </div>

              <p className="text-[11px] text-slate-400 mt-1 mb-4 max-w-md">
                Compare these numbers in person or over a trusted phone call. If they match, your communication is 100% private and protected from MITM interception.
              </p>

              <div className="flex flex-wrap items-center justify-center gap-3">
                <button
                  onClick={handleCopyMutual}
                  className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-slate-200 text-xs font-semibold rounded-xl border border-slate-800 transition-colors flex items-center gap-1.5"
                >
                  {copiedMutual ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5 text-slate-400" />}
                  {copiedMutual ? 'Copied Number!' : 'Copy Safety Number'}
                </button>

                <button
                  onClick={handleToggleVerify}
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

            {/* Secondary Technical Breakdown: Individual Identity Keys */}
            <div className="p-4 sm:p-5 rounded-2xl bg-slate-950/60 border border-slate-800">
              <h4 className="text-xs font-bold text-slate-300 uppercase tracking-wider mb-3 flex items-center gap-1.5">
                <KeyRound className="w-3.5 h-3.5 text-emerald-400" />
                Individual Cryptographic Public Key Fingerprints
              </h4>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-left">
                {/* Peer Key */}
                <div className="p-3.5 rounded-xl bg-slate-900/80 border border-slate-800">
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-xs font-bold text-emerald-400">@{keyData.username}&apos;s Key</span>
                    <span className="text-[10px] px-2 py-0.5 rounded bg-emerald-950 text-emerald-400 border border-emerald-800 font-mono">
                      v{keyData.version}
                    </span>
                  </div>
                  <p className="font-mono text-[11px] text-slate-300 break-all select-all bg-black/40 p-2 rounded-lg">
                    {keyData.fingerprint}
                  </p>
                  <button
                    onClick={handleCopyPeer}
                    className="mt-2 text-[10px] text-slate-400 hover:text-white flex items-center gap-1 transition-colors"
                  >
                    {copiedPeer ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                    <span>{copiedPeer ? 'Copied' : 'Copy Key Fingerprint'}</span>
                  </button>
                </div>

                {/* Own Key */}
                <div className="p-3.5 rounded-xl bg-slate-900/80 border border-slate-800">
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-xs font-bold text-cyan-400">Your Key (@{currentUser?.username || 'You'})</span>
                    <span className="text-[10px] px-2 py-0.5 rounded bg-cyan-950 text-cyan-300 border border-cyan-800 font-mono">
                      v1
                    </span>
                  </div>
                  <p className="font-mono text-[11px] text-slate-300 break-all select-all bg-black/40 p-2 rounded-lg">
                    {myFingerprint || 'Loading your key...'}
                  </p>
                  <p className="mt-2 text-[10px] text-slate-500">
                    Your on-device ECDH P-256 public identity key
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
