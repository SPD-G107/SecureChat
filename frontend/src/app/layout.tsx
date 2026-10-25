import './globals.css';
import type { Metadata } from 'next';
import Link from 'next/link';
import { Shield, MessageSquare, KeyRound, User, Lock, ExternalLink } from 'lucide-react';

export const metadata: Metadata = {
  title: 'SecureChat — End-to-End Encrypted Private Messaging',
  description: 'Private, real-time messaging with client-side Web Crypto E2EE and zero API leakage.',
  icons: {
    icon: '/favicon.png',
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="dark">
      <body className="min-h-screen flex flex-col bg-[#080d1a] text-slate-100 antialiased selection:bg-emerald-500/30 selection:text-emerald-200">
        {/* Glassmorphic Navigation Bar matching README specifications */}
        <header className="glass-nav px-6 py-3 flex items-center justify-between sticky top-0 z-50 transition-all shadow-[0_4px_20px_rgba(0,0,0,0.25)]">
          <Link href="/" className="flex items-center gap-3 group">
            <div className="relative">
              <img
                src="/logo.png"
                alt="SecureChat Logo"
                className="w-9 h-9 rounded-full object-cover border border-emerald-400/40 shadow-lg shadow-emerald-950/60 group-hover:scale-105 group-hover:border-emerald-300 transition-all duration-300"
              />
              <span className="absolute -top-0.5 -right-0.5 w-2.5 h-2.5 rounded-full bg-emerald-400 ring-2 ring-[#082f2f] animate-pulse" />
            </div>
            <div className="flex flex-col">
              <span className="font-extrabold text-lg tracking-tight bg-gradient-to-r from-white via-slate-100 to-emerald-300 bg-clip-text text-transparent leading-none">
                SecureChat
              </span>
              <span className="text-[10px] text-emerald-400/80 font-mono tracking-wider font-semibold">
                E2EE Private Messaging
              </span>
            </div>
          </Link>

          {/* Security Status Pill */}
          <div className="hidden md:flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-950/50 border border-emerald-500/20 text-[11px] font-mono text-emerald-300 shadow-inner">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
            <Lock className="w-3 h-3 text-emerald-400" />
            <span>Zero Server Plaintext</span>
          </div>

          <nav className="flex items-center gap-1.5 sm:gap-3 text-xs font-semibold">
            <Link
              href="/chat"
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-slate-300 hover:text-white hover:bg-slate-800/60 transition-all"
            >
              <MessageSquare className="w-4 h-4 text-emerald-400" />
              <span>Chat</span>
            </Link>
            <Link
              href="/verify-key"
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-slate-300 hover:text-white hover:bg-slate-800/60 transition-all"
            >
              <KeyRound className="w-4 h-4 text-emerald-400" />
              <span className="hidden sm:inline">Verify Keys</span>
            </Link>
            <Link
              href="/profile"
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-slate-300 hover:text-white hover:bg-slate-800/60 transition-all"
            >
              <User className="w-4 h-4 text-emerald-400" />
              <span className="hidden sm:inline">Profile</span>
            </Link>
            <Link
              href="/admin"
              className="text-[11px] px-2.5 py-1 rounded-lg bg-emerald-950/60 text-emerald-300 border border-emerald-800/50 hover:bg-emerald-900/60 transition-all font-mono"
            >
              Admin
            </Link>
            <Link
              href="/login"
              className="ml-1 px-4 py-1.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white shadow-md shadow-emerald-950/40 hover:shadow-emerald-900/60 transition-all font-semibold active:scale-95"
            >
              Sign In
            </Link>
          </nav>
        </header>

        <main className="flex-1 flex flex-col">{children}</main>
      </body>
    </html>
  );
}
