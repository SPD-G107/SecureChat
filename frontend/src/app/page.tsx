import Link from 'next/link';
import { Shield, Lock, KeyRound, ServerOff, ArrowRight } from 'lucide-react';

export default function HomePage() {
  return (
    <div className="flex-1 flex flex-col items-center justify-center px-4 py-16 bg-[#0b0f19]">
      <div className="max-w-3xl mx-auto text-center">
        {/* Clean Logo */}
        <div className="flex justify-center mb-5">
          <img
            src="/logo.png"
            alt="SecureChat Logo"
            className="w-20 h-20 rounded-full object-cover border border-emerald-500/40 shadow-lg"
          />
        </div>

        {/* Clean Badge */}
        <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-emerald-950/60 border border-emerald-800/60 text-emerald-300 text-xs font-medium mb-5">
          <Shield className="w-3.5 h-3.5 text-emerald-400" />
          <span>University Capstone Project — Group 7</span>
        </div>

        {/* Clean, Readable Title */}
        <h1 className="text-3xl sm:text-5xl font-extrabold tracking-tight text-white mb-4 leading-tight">
          Private Messaging, <br />
          <span className="text-emerald-400">End-to-End Encrypted.</span>
        </h1>

        {/* Concise Subtitle */}
        <p className="text-sm sm:text-base text-slate-400 max-w-xl mx-auto mb-8 leading-relaxed">
          Messages are encrypted on your device using Web Crypto API (ECDH P-256 and AES-256-GCM). The server stores zero plaintext.
        </p>

        {/* Clean Call-to-Action Buttons */}
        <div className="flex items-center justify-center gap-3 mb-16">
          <Link
            href="/chat"
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-sm transition-colors shadow-sm"
          >
            Open Chat
            <ArrowRight className="w-4 h-4" />
          </Link>
          <Link
            href="/register"
            className="px-5 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700/80 font-medium text-sm transition-colors"
          >
            Create Account
          </Link>
          <Link
            href="/login"
            className="px-4 py-2.5 text-slate-400 hover:text-white font-medium text-sm transition-colors"
          >
            Sign In
          </Link>
        </div>
      </div>

      {/* 3 Clean Feature Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5 max-w-4xl mx-auto w-full">
        <div className="p-5 rounded-2xl bg-slate-900/60 border border-slate-800">
          <div className="w-9 h-9 rounded-xl bg-emerald-500/10 text-emerald-400 flex items-center justify-center mb-3">
            <Lock className="w-4 h-4" />
          </div>
          <h3 className="text-sm font-bold text-white mb-1.5">End-to-End Encryption</h3>
          <p className="text-xs text-slate-400 leading-relaxed">
            Client-side authenticated encryption (AES-256-GCM) with ECDH P-256 key establishment.
          </p>
        </div>

        <div className="p-5 rounded-2xl bg-slate-900/60 border border-slate-800">
          <div className="w-9 h-9 rounded-xl bg-emerald-500/10 text-emerald-400 flex items-center justify-center mb-3">
            <KeyRound className="w-4 h-4" />
          </div>
          <h3 className="text-sm font-bold text-white mb-1.5">Key Verification & Warnings</h3>
          <p className="text-xs text-slate-400 leading-relaxed">
            Cryptographic SHA-256 fingerprints with proactive warnings if a contact&apos;s key changes.
          </p>
        </div>

        <div className="p-5 rounded-2xl bg-slate-900/60 border border-slate-800">
          <div className="w-9 h-9 rounded-xl bg-emerald-500/10 text-emerald-400 flex items-center justify-center mb-3">
            <ServerOff className="w-4 h-4" />
          </div>
          <h3 className="text-sm font-bold text-white mb-1.5">Zero API Leakage</h3>
          <p className="text-xs text-slate-400 leading-relaxed">
            Internal self-managed libraries without reliance on third-party messaging or encryption APIs.
          </p>
        </div>
      </div>
    </div>
  );
}
