import './globals.css';
import type { Metadata } from 'next';
import Link from 'next/link';
import { MessageSquare, KeyRound, User } from 'lucide-react';

import Navbar from '@/components/layout/Navbar';

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
        <Navbar />
        <main className="flex-1 flex flex-col">{children}</main>
      </body>
    </html>
  );
}

