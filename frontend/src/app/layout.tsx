import './globals.css';
import type { Metadata } from 'next';
import Link from 'next/link';
import { Shield, MessageSquare, KeyRound, User, LogOut } from 'lucide-react';

export const metadata: Metadata = {
  title: 'SecureChat — End-to-End Encrypted Private Messaging',
  description: 'Private, real-time messaging with client-side Web Crypto E2EE and zero API leakage.',
  icons: {
    icon: '/favicon.png',
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="min-h-screen flex flex-col bg-[#0b1120] text-slate-100 antialiased">
        {/* Dark Teal Navigation Bar matching README Section 11 */}
        <header className="bg-[#082f2f] border-b border-emerald-950 px-6 py-3 flex items-center justify-between sticky top-0 z-50 shadow-md">
          <Link href="/" className="flex items-center gap-3 font-bold text-xl text-white group">
            <img
              src="/logo.png"
              alt="SecureChat Logo"
              className="w-9 h-9 rounded-full object-cover border border-emerald-400/50 shadow-md shadow-emerald-950 group-hover:scale-105 transition-transform"
            />
            <span className="tracking-tight font-extrabold bg-gradient-to-r from-white via-slate-100 to-emerald-300 bg-clip-text text-transparent">
              SecureChat
            </span>
          </Link>

          <nav className="flex items-center gap-5 text-sm font-medium">
            <Link href="/chat" className="flex items-center gap-1.5 text-slate-200 hover:text-emerald-400 transition-colors">
              <MessageSquare className="w-4 h-4" />
              Chat
            </Link>
            <Link href="/verify-key" className="flex items-center gap-1.5 text-slate-200 hover:text-emerald-400 transition-colors">
              <KeyRound className="w-4 h-4" />
              Verify Keys
            </Link>
            <Link href="/profile" className="flex items-center gap-1.5 text-slate-200 hover:text-emerald-400 transition-colors">
              <User className="w-4 h-4" />
              Profile
            </Link>
            <Link href="/admin" className="text-xs px-2.5 py-1 rounded bg-emerald-950 text-emerald-300 border border-emerald-800/60 font-semibold hover:bg-emerald-900 transition-colors">
              Admin
            </Link>
            <Link href="/login" className="px-3.5 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white transition-colors text-xs font-semibold shadow-sm">
              Sign In
            </Link>
          </nav>
        </header>

        <main className="flex-1 flex flex-col">{children}</main>
      </body>
    </html>
  );
}
