'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { KeyRound, Shield, RefreshCw, CheckCircle, AlertCircle, Copy, Check } from 'lucide-react';
import { CryptoEngine } from '@/lib/crypto';
import { ApiClient } from '@/lib/api-client';
import { User } from '@/types';

export default function SettingsPage() {
  const router = useRouter();
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [keyVersion, setKeyVersion] = useState<number>(1);
  const [fingerprint, setFingerprint] = useState<string>('');
  const [isRotating, setIsRotating] = useState(false);
  const [statusMsg, setStatusMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    const raw = localStorage.getItem('securechat_user');
    const token = localStorage.getItem('securechat_jwt');

    if (!raw || !token) {
      router.replace('/login');
      return;
    }

    try {
      const u = JSON.parse(raw);
      setCurrentUser(u);
      setKeyVersion(u.publicKeyVersion || 1);
      if (u.fingerprint) {
        setFingerprint(u.fingerprint);
      } else {
        // Query server for latest public key
        ApiClient.get(`/keys/${u.id}`)
          .then((res) => {
            if (res && res.fingerprint) {
              setFingerprint(res.fingerprint);
              setKeyVersion(res.version || 1);
            }
          })
          .catch(() => {});
      }
    } catch {
      router.replace('/login');
    }
  }, [router]);

  const handleRotateKey = async () => {
    if (!currentUser) return;
    setIsRotating(true);
    setStatusMsg(null);

    try {
      // 1. Generate new ECDH P-256 identity key pair
      const keypair = await CryptoEngine.generateIdentityKeyPair();
      const pubKey = await CryptoEngine.exportPublicKey(keypair.publicKey);
      const privKey = await CryptoEngine.exportPrivateKey(keypair.privateKey);

      // 2. Derive SHA-256 fingerprint
      const rawHex = await CryptoEngine.computeFingerprint(pubKey);
      const formattedFingerprint = CryptoEngine.formatFingerprintDisplay(rawHex);

      // 3. Save locally in client storage
      CryptoEngine.saveLocalIdentity(currentUser.username, privKey, pubKey, formattedFingerprint);

      // 4. Publish to backend server
      const newVersion = keyVersion + 1;
      await ApiClient.post('/keys/publish', {
        publicKey: pubKey,
        fingerprint: formattedFingerprint,
      });

      // 5. Update local state
      const updatedUser = {
        ...currentUser,
        publicKeyVersion: newVersion,
        fingerprint: formattedFingerprint,
      };
      localStorage.setItem('securechat_user', JSON.stringify(updatedUser));
      setCurrentUser(updatedUser);
      setKeyVersion(newVersion);
      setFingerprint(formattedFingerprint);

      setStatusMsg({
        type: 'success',
        text: `Cryptographic identity rotated to v${newVersion}! Peer contacts will see a Key-Change Safety Notice.`,
      });
    } catch (err: any) {
      setStatusMsg({
        type: 'error',
        text: err.message || 'Failed to rotate cryptographic keys.',
      });
    } finally {
      setIsRotating(false);
    }
  };

  const handleCopyFingerprint = () => {
    if (!fingerprint) return;
    navigator.clipboard.writeText(fingerprint);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="flex-1 max-w-2xl mx-auto w-full p-6 py-10">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-white flex items-center gap-2.5">
          <KeyRound className="w-6 h-6 text-emerald-400" /> Cryptographic Settings
        </h1>
        <p className="text-xs text-slate-400 mt-1">Manage local client keys, key rotation, and privacy parameters</p>
      </div>

      {statusMsg && (
        <div
          className={`mb-6 p-4 rounded-xl text-xs flex items-center gap-3 animate-in fade-in ${
            statusMsg.type === 'success'
              ? 'bg-emerald-500/15 border border-emerald-500/40 text-emerald-300'
              : 'bg-red-500/15 border border-red-500/40 text-red-300'
          }`}
        >
          {statusMsg.type === 'success' ? (
            <CheckCircle className="w-4 h-4 shrink-0 text-emerald-400" />
          ) : (
            <AlertCircle className="w-4 h-4 shrink-0 text-red-400" />
          )}
          <span>{statusMsg.text}</span>
        </div>
      )}

      <div className="bg-slate-900/80 border border-emerald-950 rounded-2xl p-6 shadow-xl space-y-6">
        <div className="p-4 rounded-xl bg-slate-950/60 border border-slate-800 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <h3 className="text-sm font-semibold text-white">Rotate Cryptographic Identity Key</h3>
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-950 text-emerald-400 border border-emerald-800 font-mono">
                Version: v{keyVersion}
              </span>
            </div>
            <p className="text-xs text-slate-400 leading-relaxed">
              Generates a brand new ECDH P-256 keypair in your browser and publishes the new public identity. Contacts will be prompted with a Key-Change warning.
            </p>
          </div>
          <button
            onClick={handleRotateKey}
            disabled={isRotating}
            className="w-full sm:w-auto px-4 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold rounded-xl flex items-center justify-center gap-2 transition-colors disabled:opacity-50 shrink-0 shadow-md shadow-emerald-950/40"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isRotating ? 'animate-spin' : ''}`} />
            {isRotating ? 'Generating...' : 'Rotate Key'}
          </button>
        </div>

        <div className="p-4 rounded-xl bg-slate-950/60 border border-slate-800">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-xs font-semibold text-slate-300 uppercase tracking-wider">
              Current SHA-256 Fingerprint
            </h3>
            <button
              onClick={handleCopyFingerprint}
              className="text-[11px] text-slate-400 hover:text-emerald-400 flex items-center gap-1 transition-colors"
            >
              {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
              {copied ? 'Copied' : 'Copy'}
            </button>
          </div>
          <div className="p-3 rounded-lg bg-black/50 border border-slate-800">
            <p className="font-mono text-emerald-400 text-xs tracking-wider break-all select-all">
              {fingerprint || 'Computing fingerprint...'}
            </p>
          </div>
        </div>

        <div className="p-4 rounded-xl bg-slate-950/60 border border-slate-800">
          <h3 className="text-sm font-semibold text-white mb-1 flex items-center gap-2">
            <Shield className="w-4 h-4 text-emerald-400" /> Local Key Storage Protection
          </h3>
          <p className="text-xs text-slate-400 leading-relaxed">
            Your private key is stored exclusively inside your browser runtime and is never transmitted across the network. The server acts as a blind relay and possesses only public identity keys.
          </p>
        </div>
      </div>
    </div>
  );
}
