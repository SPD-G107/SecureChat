'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import {
  MessageSquare,
  KeyRound,
  User,
  Shield,
  LogOut,
  Settings,
  LogIn,
  UserPlus,
  Download,
} from 'lucide-react';
import { ApiClient } from '@/lib/api-client';

export default function Navbar() {
  const pathname = usePathname();
  const router = useRouter();
  const [currentUser, setCurrentUser] = useState<any | null>(null);
  const [isMounted, setIsMounted] = useState(false);
  const [installPrompt, setInstallPrompt] = useState<any>(null);

  const syncAuth = () => {
    if (typeof window === 'undefined') return;
    const raw = localStorage.getItem('securechat_user');
    const token = localStorage.getItem('securechat_jwt');
    if (raw && token) {
      try {
        setCurrentUser(JSON.parse(raw));
      } catch {
        setCurrentUser(null);
      }
    } else {
      setCurrentUser(null);
    }
  };

  useEffect(() => {
    setIsMounted(true);
    syncAuth();

    // Verify session integrity with live backend
    const token = localStorage.getItem('securechat_jwt');
    if (token) {
      ApiClient.get('/auth/me')
        .then((res) => {
          const liveUser = res?.user || res;
          if (liveUser && liveUser.id) {
            setCurrentUser(liveUser);
            localStorage.setItem('securechat_user', JSON.stringify(liveUser));
          }
        })
        .catch((err) => {
          if (err?.message?.includes('401') || err?.message?.includes('denied') || err?.message?.includes('Invalid')) {
            localStorage.removeItem('securechat_jwt');
            localStorage.removeItem('securechat_user');
            setCurrentUser(null);
          }
        });
    }

    const handleAuthChange = () => syncAuth();
    window.addEventListener('storage', handleAuthChange);
    window.addEventListener('securechat_auth', handleAuthChange);

    const handlePwaInstallable = (e: any) => {
      setInstallPrompt(e.detail);
    };
    const handlePwaInstalled = () => {
      setInstallPrompt(null);
    };
    window.addEventListener('securechat_pwa_installable', handlePwaInstallable);
    window.addEventListener('securechat_pwa_installed', handlePwaInstalled);

    return () => {
      window.removeEventListener('storage', handleAuthChange);
      window.removeEventListener('securechat_auth', handleAuthChange);
      window.removeEventListener('securechat_pwa_installable', handlePwaInstallable);
      window.removeEventListener('securechat_pwa_installed', handlePwaInstalled);
    };
  }, [pathname]);

  const handleInstallApp = async () => {
    if (!installPrompt) return;
    await installPrompt.prompt();
    const choice = await installPrompt.userChoice;
    if (choice.outcome === 'accepted') {
      setInstallPrompt(null);
    }
  };

  const handleLogout = async () => {
    try {
      await ApiClient.post('/auth/logout');
    } catch {}
    localStorage.removeItem('securechat_jwt');
    localStorage.removeItem('securechat_user');
    window.dispatchEvent(new Event('securechat_auth'));
    setCurrentUser(null);
    router.push('/login');
  };

  const getInitials = (name?: string) => {
    if (!name) return 'U';
    return name.slice(0, 2).toUpperCase();
  };

  return (
    <header className="sticky top-0 z-50 h-14 px-4 sm:px-6 bg-[#0b0f19]/90 backdrop-blur-md border-b border-slate-800/80 flex items-center justify-between shrink-0">
      {/* Brand Logo */}
      <Link href="/" className="flex items-center gap-2.5 group">
        <div className="relative">
          <img
            src="/logo.png"
            alt="SecureChat Logo"
            className="w-8 h-8 rounded-full object-cover border border-emerald-500/40 group-hover:border-emerald-400 transition-colors"
          />
          <span className="absolute bottom-0 right-0 w-2 h-2 rounded-full bg-emerald-400 border border-[#0b0f19]" />
        </div>
        <div className="flex flex-col">
          <span className="font-bold text-base sm:text-lg text-white tracking-tight leading-none">
            SecureChat
          </span>
          <span className="text-[9px] font-mono text-emerald-400/90 tracking-wider">
            E2EE ACTIVE
          </span>
        </div>
      </Link>

      {/* Navigation Links */}
      <nav className="flex items-center gap-1 sm:gap-2 text-xs font-medium">
        {currentUser && (
          <Link
            href="/chat"
            className={`flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-lg transition-colors ${
              pathname === '/chat'
                ? 'bg-emerald-500/15 text-emerald-300 font-semibold border border-emerald-500/30'
                : 'text-slate-300 hover:text-white hover:bg-slate-800/60'
            }`}
            title="Encrypted Chat Workspace"
          >
            <MessageSquare className="w-4 h-4 text-emerald-400" />
            <span className="hidden sm:inline">Chat</span>
          </Link>
        )}

        <Link
          href="/verify-key"
          className={`flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-lg transition-colors ${
            pathname === '/verify-key'
              ? 'bg-emerald-500/15 text-emerald-300 font-semibold border border-emerald-500/30'
              : 'text-slate-300 hover:text-white hover:bg-slate-800/60'
          }`}
          title="Verify Contact Safety Numbers"
        >
          <KeyRound className="w-4 h-4 text-emerald-400" />
          <span className="hidden sm:inline">Verify Keys</span>
        </Link>

        {currentUser && (
          <Link
            href="/settings"
            className={`hidden md:flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-colors ${
              pathname === '/settings'
                ? 'bg-emerald-500/15 text-emerald-300 font-semibold border border-emerald-500/30'
                : 'text-slate-300 hover:text-white hover:bg-slate-800/60'
            }`}
            title="Cryptographic Settings"
          >
            <Settings className="w-4 h-4 text-emerald-400" />
            <span>Settings</span>
          </Link>
        )}

        {/* Role-Protected Admin Tab */}
        {currentUser?.role === 'admin' && (
          <Link
            href="/admin"
            className={`flex items-center gap-1 text-[11px] px-2 py-1.5 rounded-lg font-semibold transition-colors ${
              pathname.startsWith('/admin')
                ? 'bg-purple-950/80 text-purple-300 border border-purple-700/80'
                : 'bg-purple-950/40 text-purple-400 border border-purple-900/50 hover:bg-purple-900/50 hover:text-purple-200'
            }`}
            title="Admin Security Center"
          >
            <Shield className="w-3.5 h-3.5 text-purple-400" />
            <span className="hidden sm:inline">Admin</span>
          </Link>
        )}

        {/* PWA Install Button when Chrome/Edge is installable */}
        {installPrompt && (
          <button
            onClick={handleInstallApp}
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-emerald-500/15 hover:bg-emerald-500/25 text-emerald-300 border border-emerald-500/40 text-xs font-semibold transition-all shadow-sm shadow-emerald-950/40 animate-pulse"
            title="Install SecureChat as Desktop App on Chrome / Edge"
          >
            <Download className="w-3.5 h-3.5 text-emerald-400" />
            <span className="hidden sm:inline">Install App</span>
          </button>
        )}

        {/* Dynamic User Authentication State */}
        {isMounted && currentUser ? (
          <div className="flex items-center gap-1 sm:gap-2 pl-1.5 sm:pl-2 ml-1 border-l border-slate-800">
            {/* Active User Badge */}
            <Link
              href="/profile"
              className={`flex items-center gap-1.5 sm:gap-2 px-2 sm:px-2.5 py-1 rounded-xl border transition-colors ${
                pathname === '/profile'
                  ? 'bg-emerald-950/60 border-emerald-500/50 text-white'
                  : 'bg-slate-900/80 hover:bg-slate-800 border-slate-800 text-slate-200'
              }`}
              title="View Account Profile"
            >
              <div className="w-6 h-6 rounded-full bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center text-emerald-400 font-bold text-[10px] overflow-hidden shrink-0">
                {currentUser?.avatarUrl ? (
                  <img src={currentUser.avatarUrl} alt="Avatar" className="w-full h-full object-cover" />
                ) : (
                  getInitials(currentUser.username)
                )}
              </div>
              <span className="font-semibold text-xs text-white max-w-[80px] sm:max-w-[100px] truncate hidden sm:inline">
                @{currentUser.username}
              </span>
            </Link>

            {/* Real Logout Action */}
            <button
              onClick={handleLogout}
              className="p-1.5 rounded-lg text-slate-400 hover:text-red-400 hover:bg-red-950/30 transition-colors"
              title="Sign Out"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        ) : isMounted ? (
          <div className="flex items-center gap-2 pl-2 ml-1 border-l border-slate-800">
            <Link
              href="/login"
              className="px-3.5 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-xs transition-colors shadow-sm flex items-center gap-1.5"
            >
              <LogIn className="w-3.5 h-3.5" />
              <span>Sign In</span>
            </Link>
            <Link
              href="/register"
              className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800/80 hover:bg-slate-700 text-slate-200 font-medium text-xs transition-colors border border-slate-700/60"
            >
              <UserPlus className="w-3.5 h-3.5 text-emerald-400" />
              <span>Register</span>
            </Link>
          </div>
        ) : (
          <div className="w-20 h-7" />
        )}
      </nav>
    </header>
  );
}
