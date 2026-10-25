import './globals.css';
import type { Metadata } from 'next';
import Link from 'next/link';
import { MessageSquare, KeyRound, User } from 'lucide-react';

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
      <body className="min-h-screen flex flex-col bg-[#0b0f19] text-slate-100 antialiased selection:bg-emerald-500/30 selection:text-emerald-200">
        {/* Clean, Elegant Header */}
        <header className="sticky top-0 z-50 px-6 py-3 bg-[#0b0f19]/90 backdrop-blur-md border-b border-slate-800/80 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2.5">
            <img
              src="/logo.png"
              alt="SecureChat Logo"
              className="w-8 h-8 rounded-full object-cover border border-emerald-500/40"
            />
            <span className="font-bold text-lg text-white tracking-tight">
              SecureChat
            </span>
          </Link>

          <nav className="flex items-center gap-1 sm:gap-2 text-xs font-medium">
            <Link
              href="/chat"
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-slate-300 hover:text-white hover:bg-slate-800/60 transition-colors"
            >
              <MessageSquare className="w-4 h-4 text-emerald-400" />
              <span>Chat</span>
            </Link>
            <Link
              href="/verify-key"
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-slate-300 hover:text-white hover:bg-slate-800/60 transition-colors"
            >
              <KeyRound className="w-4 h-4 text-emerald-400" />
              <span className="hidden sm:inline">Verify Keys</span>
            </Link>
            <Link
              href="/profile"
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-slate-300 hover:text-white hover:bg-slate-800/60 transition-colors"
            >
              <User className="w-4 h-4 text-emerald-400" />
              <span className="hidden sm:inline">Profile</span>
            </Link>
            <Link
              href="/admin"
              className="text-[11px] px-2.5 py-1 rounded-md bg-slate-800/80 text-slate-300 hover:text-white hover:bg-slate-700 transition-colors"
            >
              Admin
            </Link>
            <Link
              href="/login"
              className="ml-2 px-3.5 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-xs transition-colors shadow-sm"
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
