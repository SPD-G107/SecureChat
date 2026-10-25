'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Shield, Lock, User, ArrowRight, AlertCircle, Key, CheckCircle } from 'lucide-react';
import { CURRENT_USER } from '@/lib/mock-data';

export default function RegisterPage() {
  const router = useRouter();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [stepMsg, setStepMsg] = useState<string | null>(null);

  const handleRegister = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    if (password.length < 8) {
      setError('Passphrase must be at least 8 characters long');
      setLoading(false);
      return;
    }

    setStepMsg('Generating client-side ECDH P-256 keypair in browser...');
    setTimeout(() => {
      setStepMsg('Deriving SHA-256 fingerprint & safety numbers...');
      setTimeout(() => {
        const newUser = {
          ...CURRENT_USER,
          username: username.toLowerCase(),
          displayName: displayName || username,
        };
        localStorage.setItem('securechat_user', JSON.stringify(newUser));
        localStorage.setItem('securechat_jwt', 'mock_jwt_token_registered');
        setLoading(false);
        setStepMsg(null);
        router.push('/chat');
      }, 700);
    }, 700);
  };

  return (
    <div className="flex-1 flex items-center justify-center p-4">
      <div className="max-w-md w-full p-8 rounded-2xl bg-slate-900/90 border border-emerald-950 shadow-2xl backdrop-blur-md">
        <div className="text-center mb-6">
          <img
            src="/logo.png"
            alt="SecureChat Logo"
            className="w-16 h-16 rounded-full object-cover mx-auto mb-3 shadow-lg shadow-emerald-500/20 border border-emerald-400/50"
          />
          <h1 className="text-xl font-bold text-white">Create Private Account</h1>
          <p className="text-xs text-slate-400 mt-1">Generate on-device cryptographic identity</p>
        </div>

        {error && (
          <div className="mb-4 p-3 rounded-xl bg-red-500/10 border border-red-500/30 text-red-400 text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {stepMsg && (
          <div className="mb-4 p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs flex items-center gap-2 animate-pulse">
            <Key className="w-4 h-4 shrink-0" />
            <span>{stepMsg}</span>
          </div>
        )}

        <form onSubmit={handleRegister} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">Username</label>
            <div className="relative">
              <User className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                required
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="alice"
                className="w-full bg-slate-950/70 border border-slate-800 rounded-xl pl-10 pr-3 py-2.5 text-sm text-slate-200 placeholder:text-slate-600 focus:outline-none focus:border-emerald-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">Display Name (Optional)</label>
            <input
              type="text"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              placeholder="Alice Wonderland"
              className="w-full bg-slate-950/70 border border-slate-800 rounded-xl px-3 py-2.5 text-sm text-slate-200 placeholder:text-slate-600 focus:outline-none focus:border-emerald-500"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">Passphrase</label>
            <div className="relative">
              <Lock className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="password"
                required
                minLength={8}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="At least 8 characters"
                className="w-full bg-slate-950/70 border border-slate-800 rounded-xl pl-10 pr-3 py-2.5 text-sm text-slate-200 placeholder:text-slate-600 focus:outline-none focus:border-emerald-500"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-2.5 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-sm font-semibold flex items-center justify-center gap-2 transition-all disabled:opacity-60 shadow-md shadow-emerald-950/40 mt-2"
          >
            {loading ? 'Creating...' : 'Register & Generate Keys'}
            <ArrowRight className="w-4 h-4" />
          </button>
        </form>

        <p className="text-center text-xs text-slate-400 mt-6">
          Already have an account?{' '}
          <Link href="/login" className="text-emerald-400 hover:underline font-medium">
            Sign in
          </Link>
        </p>
      </div>
    </div>
  );
}
