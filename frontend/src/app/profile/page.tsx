'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { ApiClient } from '@/lib/api-client';
import { User as UserIcon, LogOut, Shield, Key, Loader2 } from 'lucide-react';
import { User } from '@/types';

export default function ProfilePage() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const raw = localStorage.getItem('securechat_user');
    const token = localStorage.getItem('securechat_jwt');

    if (!raw || !token) {
      router.replace('/login');
      return;
    }

    try {
      setUser(JSON.parse(raw));
    } catch {
      router.replace('/login');
      return;
    }

    ApiClient.get('/auth/me')
      .then((data) => {
        const liveUser = data?.user || data;
        if (liveUser && liveUser.id) {
          setUser(liveUser);
          localStorage.setItem('securechat_user', JSON.stringify(liveUser));
        }
      })
      .catch(() => {})
      .finally(() => {
        setLoading(false);
      });
  }, [router]);

  const handleLogout = async () => {
    try {
      await ApiClient.post('/auth/logout');
    } catch {}
    localStorage.removeItem('securechat_jwt');
    localStorage.removeItem('securechat_user');
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new Event('securechat_auth'));
    }
    router.push('/login');
  };

  if (loading && !user) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-6 bg-[#0b0f19]">
        <Loader2 className="w-8 h-8 text-emerald-400 animate-spin mb-3" />
        <p className="text-xs text-slate-400 font-mono">Loading user profile session...</p>
      </div>
    );
  }

  return (
    <div className="flex-1 max-w-2xl mx-auto w-full p-6 py-10">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-white">User Account & Profile</h1>
        <p className="text-xs text-slate-400 mt-1">Manage session and cryptographic identity parameters</p>
      </div>

      <div className="bg-slate-900/80 border border-emerald-950 rounded-2xl p-6 shadow-xl space-y-6">
        <div className="flex items-center gap-4 pb-6 border-b border-slate-800">
          <div className="w-14 h-14 rounded-full bg-emerald-950 border border-emerald-800 flex items-center justify-center text-emerald-400 font-bold text-xl">
            {(user?.username || 'U').substring(0, 2).toUpperCase()}
          </div>
          <div>
            <h2 className="text-lg font-bold text-white flex items-center gap-2">
              @{user?.username || 'user'}
              {user?.role === 'admin' && (
                <span className="text-[10px] px-2 py-0.5 rounded bg-purple-950 text-purple-300 border border-purple-800 font-bold">
                  ADMIN
                </span>
              )}
            </h2>
            <p className="text-xs text-slate-400">{user?.displayName || 'Standard User'}</p>
          </div>
        </div>

        <div className="space-y-3">
          <div className="p-3.5 rounded-xl bg-slate-950/60 border border-slate-800 flex justify-between items-center">
            <span className="text-xs text-slate-400">Account Status</span>
            <span className="text-xs text-emerald-400 font-semibold uppercase">{user?.status || 'active'}</span>
          </div>

          <div className="p-3.5 rounded-xl bg-slate-950/60 border border-slate-800 flex justify-between items-center">
            <span className="text-xs text-slate-400">E2EE Identity</span>
            <span className="text-xs text-slate-300 font-mono">ECDH P-256 (Client-Generated)</span>
          </div>
        </div>

        <button
          onClick={handleLogout}
          className="w-full py-2.5 px-4 rounded-xl bg-red-950/40 hover:bg-red-950/70 border border-red-900/40 text-red-400 text-xs font-semibold flex items-center justify-center gap-2 transition-colors"
        >
          <LogOut className="w-4 h-4" />
          End Session & Log Out
        </button>
      </div>
    </div>
  );
}
