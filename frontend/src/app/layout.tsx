import './globals.css';
import type { Metadata } from 'next';
import Link from 'next/link';
import { Shield, MessageSquare, KeyRound, User, Lock, Terminal, Radio } from 'lucide-react';

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
      <body className="min-h-screen flex flex-col bg-[#030712] text-slate-100 antialiased selection:bg-emerald-500/30 selection:text-emerald-200">
        {/* Futuristic Cybernetic Header */}
        <header className="sticky top-0 z-50 px-6 py-2.5 bg-[#030712]/80 backdrop-blur-2xl border-b border-emerald-500/20 shadow-[0_4px_30px_rgba(0,0,0,0.6)] flex items-center justify-between">
          <Link href="/" className="flex items-center gap-3.5 group">
            <div className="relative">
              <div className="absolute -inset-1 rounded-full bg-gradient-to-r from-emerald-500 to-cyan-500 opacity-60 blur-sm group-hover:opacity-100 transition duration-300" />
              <img
                src="/logo.png"
                alt="SecureChat Logo"
                className="relative w-9 h-9 rounded-full object-cover border border-emerald-400 shadow-md transition-transform group-hover:scale-105"
              />
            </div>
            <div className="flex flex-col">
              <span className="font-extrabold text-lg tracking-tight bg-gradient-to-r from-white via-slate-100 to-emerald-400 bg-clip-text text-transparent group-hover:to-cyan-400 transition-colors">
                SecureChat
              </span>
              <span className="text-[9px] text-emerald-400/90 font-mono tracking-widest font-semibold flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" /> E2EE RELAY // 256-BIT
              </span>
            </div>
          </Link>

          {/* Central Security Radar Pill */}
          <div className="hidden lg:flex items-center gap-2.5 px-3.5 py-1 rounded-full bg-emerald-950/40 border border-emerald-500/30 text-[11px] font-mono text-emerald-300 shadow-[0_0_15px_rgba(16,185,129,0.15)]">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
            </span>
            <Lock className="w-3.5 h-3.5 text-emerald-400" />
            <span>ZERO SERVER PLAINTEXT // CLIENT CRYPTO ACTIVE</span>
          </div>

          <nav className="flex items-center gap-1.5 sm:gap-2 text-xs font-semibold">
            <Link
              href="/chat"
              className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-slate-300 hover:text-white hover:bg-emerald-950/40 hover:border-emerald-500/30 border border-transparent transition-all"
            >
              <MessageSquare className="w-4 h-4 text-emerald-400" />
              <span>Chat</span>
            </Link>
            <Link
              href="/verify-key"
              className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-slate-300 hover:text-white hover:bg-emerald-950/40 hover:border-emerald-500/30 border border-transparent transition-all"
            >
              <KeyRound className="w-4 h-4 text-emerald-400" />
              <span className="hidden sm:inline">Verify Keys</span>
            </Link>
            <Link
              href="/profile"
              className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-slate-300 hover:text-white hover:bg-emerald-950/40 hover:border-emerald-500/30 border border-transparent transition-all"
            >
              <User className="w-4 h-4 text-emerald-400" />
              <span className="hidden sm:inline">Profile</span>
            </Link>
            <Link
              href="/admin"
              className="text-[11px] px-3 py-1.5 rounded-xl bg-slate-900/80 text-emerald-400 border border-emerald-500/30 hover:bg-emerald-950/60 hover:border-emerald-400 transition-all font-mono"
            >
              Admin
            </Link>
            <Link
              href="/login"
              className="ml-2 px-4 py-1.5 rounded-xl bg-gradient-to-r from-emerald-500 via-teal-500 to-cyan-500 hover:from-emerald-400 hover:to-cyan-400 text-slate-950 font-bold text-xs shadow-[0_0_20px_rgba(16,185,129,0.35)] transition-all hover:scale-105 active:scale-95"
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
