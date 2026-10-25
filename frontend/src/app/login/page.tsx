'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Shield, Lock, User, ArrowRight, AlertCircle, Sparkles } from 'lucide-react';
import { CURRENT_USER } from '@/lib/mock-data';

export default function LoginPage() {
  const router = useRouter();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    setTimeout(() => {
      if (password.length < 6) {
        setError('Password must be at least 6 characters');
        setLoading(false);
        return;
      }

      // Store mock session
      const user = username.toLowerCase() === 'admin'
        ? { ...CURRENT_USER, username: 'admin', role: 'admin' as const, displayName: 'University Admin' }
        : { ...CURRENT_USER, username: username || 'alice' };

      localStorage.setItem('securechat_user', JSON.stringify(user));
      localStorage.setItem('securechat_jwt', 'mock_jwt_token_phase_2');
      router.push('/chat');
    }, 600);
  };

  const handleQuickFill = (role: 'alice' | 'admin') => {
    if (role === 'alice') {
      setUsername('alice');
      setPassword('Password123!');
    } else {
      setUsername('admin');
      setPassword('AdminPass2026!');
    }
  };

  return (
    <div className="flex-1 flex items-center justify-center p-4">
      <div className="max-w-md w-full p-8 rounded-2xl bg-slate-900/90 border border-emerald-950 shadow-2xl backdrop-blur-md">
        <div className="text-center mb-6">
          <div className="w-12 h-12 rounded-xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400 mx-auto mb-3 shadow-inner">
            <Shield className="w-6 h-6" />
          </div>
          <h1 className="text-xl font-bold text-white">Sign In to SecureChat</h1>
          <p className="text-xs text-slate-400 mt-1">Authenticate session via Argon2id verification</p>
        </div>

        {error && (
          <div className="mb-4 p-3 rounded-xl bg-red-500/10 border border-red-500/30 text-red-400 text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleLogin} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">Username</label>
            <div className="relative">
              <User className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                required
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="alice or admin"
                className="w-full bg-slate-950/70 border border-slate-800 rounded-xl pl-10 pr-3 py-2.5 text-sm text-slate-200 placeholder:text-slate-600 focus:outline-none focus:border-emerald-500 transition-colors"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">Password</label>
            <div className="relative">
              <Lock className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••••••"
                className="w-full bg-slate-950/70 border border-slate-800 rounded-xl pl-10 pr-3 py-2.5 text-sm text-slate-200 placeholder:text-slate-600 focus:outline-none focus:border-emerald-500 transition-colors"
              />
            </div>
          </div>

          {/* Demo helper */}
          <div className="flex items-center gap-2 pt-1 pb-1">
            <span className="text-[11px] text-slate-400 flex items-center gap-1">
              <Sparkles className="w-3 h-3 text-emerald-400" /> Demo:
            </span>
            <button
              type="button"
              onClick={() => handleQuickFill('alice')}
              className="text-[10px] px-2 py-0.5 rounded bg-emerald-950 text-emerald-300 border border-emerald-800/60 hover:bg-emerald-900"
            >
              Fill Alice
            </button>
            <button
              type="button"
              onClick={() => handleQuickFill('admin')}
              className="text-[10px] px-2 py-0.5 rounded bg-purple-950 text-purple-300 border border-purple-800/60 hover:bg-purple-900"
            >
              Fill Admin
            </button>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-2.5 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-sm font-semibold flex items-center justify-center gap-2 transition-all disabled:opacity-60 shadow-md shadow-emerald-950/40"
          >
            {loading ? 'Authenticating...' : 'Sign In'}
            <ArrowRight className="w-4 h-4" />
          </button>
        </form>

        <p className="text-center text-xs text-slate-400 mt-6">
          Need an account?{' '}
          <Link href="/register" className="text-emerald-400 hover:underline font-medium">
            Register now
          </Link>
        </p>
      </div>
    </div>
  );
}
