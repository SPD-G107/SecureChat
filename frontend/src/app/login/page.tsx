'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Shield, Lock, User, ArrowRight, AlertCircle, Sparkles, KeyRound } from 'lucide-react';
import { ApiClient } from '@/lib/api-client';
import { CURRENT_USER } from '@/lib/mock-data';

export default function LoginPage() {
  const router = useRouter();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    if (password.length < 6) {
      setError('Password must be at least 6 characters');
      setLoading(false);
      return;
    }

    try {
      const res = await ApiClient.post('/auth/login', {
        username: username.trim(),
        password,
      });

      if (res && res.token && res.user) {
        localStorage.setItem('securechat_jwt', res.token);
        localStorage.setItem('securechat_user', JSON.stringify(res.user));
        router.push('/chat');
        return;
      }
    } catch (err: any) {
      setError(err.message || 'Invalid username or password. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex-1 flex items-center justify-center p-4 bg-[#0b0f19]">
      <div className="max-w-md w-full p-8 rounded-2xl bg-slate-900/80 border border-slate-800 shadow-xl">
        <div className="text-center mb-7">
          <div className="relative inline-block mb-3">
            <img
              src="/logo.png"
              alt="SecureChat Logo"
              className="w-16 h-16 rounded-full object-cover shadow-xl shadow-emerald-500/25 border-2 border-emerald-400/50"
            />
            <span className="absolute -bottom-0.5 -right-0.5 w-4 h-4 rounded-full bg-emerald-400 border-2 border-slate-900" />
          </div>
          <h1 className="text-2xl font-extrabold text-white tracking-tight">Sign In to SecureChat</h1>
          <p className="text-xs text-slate-400 mt-1 font-medium">
            Session protected by Argon2id password verification
          </p>
        </div>

        {error && (
          <div className="mb-5 p-3.5 rounded-2xl bg-red-500/10 border border-red-500/30 text-red-300 text-xs flex items-center gap-2.5 animate-in fade-in duration-200">
            <AlertCircle className="w-4 h-4 shrink-0 text-red-400" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleLogin} className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-slate-300 mb-1.5 uppercase tracking-wider text-[11px]">
              Username
            </label>
            <div className="relative">
              <User className="w-4 h-4 text-slate-400 absolute left-4 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                required
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="alice, bob, charlie, or admin"
                className="w-full bg-slate-950/70 border border-slate-800 rounded-2xl pl-11 pr-4 py-3 text-sm text-slate-100 placeholder:text-slate-600 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500/30 transition-all shadow-inner"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-300 mb-1.5 uppercase tracking-wider text-[11px]">
              Password
            </label>
            <div className="relative">
              <Lock className="w-4 h-4 text-slate-400 absolute left-4 top-1/2 -translate-y-1/2" />
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••••••"
                className="w-full bg-slate-950/70 border border-slate-800 rounded-2xl pl-11 pr-4 py-3 text-sm text-slate-100 placeholder:text-slate-600 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500/30 transition-all shadow-inner"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 px-4 rounded-2xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white text-sm font-bold flex items-center justify-center gap-2 transition-all shadow-lg shadow-emerald-950/50 hover:shadow-emerald-900/70 active:scale-[0.98] disabled:opacity-60"
          >
            {loading ? 'Authenticating Session...' : 'Sign In'}
            <ArrowRight className="w-4 h-4" />
          </button>
        </form>

        <p className="text-center text-xs text-slate-400 mt-6 font-medium">
          Need an account?{' '}
          <Link href="/register" className="text-emerald-400 hover:text-emerald-300 font-bold transition-colors">
            Register for SecureChat
          </Link>
        </p>
      </div>
    </div>
  );
}
