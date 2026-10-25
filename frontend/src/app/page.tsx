import Link from 'next/link';
import {
  Shield,
  Lock,
  KeyRound,
  ServerOff,
  ArrowRight,
  Database,
  Radio,
  UserCheck,
} from 'lucide-react';

export default function HomePage() {
  return (
    <div className="flex-1 flex flex-col items-center justify-center px-4 py-16 relative overflow-hidden bg-[#0b1120]">
      {/* Background soft glow */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[550px] h-[300px] bg-emerald-500/10 blur-[130px] rounded-full pointer-events-none" />

      <div className="max-w-4xl mx-auto text-center relative z-10">
        <div className="flex justify-center mb-6">
          <img
            src="/logo.png"
            alt="SecureChat Official Logo"
            className="w-28 h-28 rounded-full object-cover shadow-2xl shadow-emerald-500/25 border-2 border-emerald-400/50 hover:scale-105 transition-transform"
          />
        </div>

        <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs font-semibold mb-6">
          <Shield className="w-4 h-4" /> University Capstone Project — Group 7
        </div>

        <h1 className="text-4xl sm:text-6xl font-extrabold tracking-tight text-white mb-6">
          Secure and End-to-End Encrypted <br />
          <span className="text-emerald-400">Private Messaging Web Application</span>
        </h1>

        <p className="text-base sm:text-lg text-slate-300 max-w-2xl mx-auto mb-10 leading-relaxed">
          Messages are encrypted on the sender&apos;s device and decrypted exclusively on the intended recipient&apos;s device using Web Crypto API. The backend operates with zero knowledge of message plaintexts.
        </p>

        <div className="flex flex-wrap items-center justify-center gap-4 mb-16">
          <Link
            href="/register"
            className="inline-flex items-center gap-2 px-6 py-3.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-sm transition-all shadow-lg shadow-emerald-950/40"
          >
            Create Secure Account
            <ArrowRight className="w-4 h-4" />
          </Link>
          <Link
            href="/login"
            className="inline-flex items-center gap-2 px-6 py-3.5 rounded-xl bg-[#082f2f] hover:bg-[#0c4444] text-slate-200 border border-emerald-900/60 font-semibold text-sm transition-colors"
          >
            Sign In
          </Link>
          <Link
            href="/chat"
            className="inline-flex items-center gap-2 px-6 py-3.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-200 border border-slate-800 font-semibold text-sm transition-colors"
          >
            Chat Workspace
          </Link>
        </div>
      </div>

      {/* Core Technical Highlights matching README specifications */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-5xl mx-auto w-full relative z-10">
        <div className="p-6 rounded-2xl bg-slate-900/70 border border-slate-800/80">
          <div className="w-10 h-10 rounded-xl bg-emerald-500/10 text-emerald-400 flex items-center justify-center mb-4">
            <Lock className="w-5 h-5" />
          </div>
          <h3 className="text-base font-bold text-white mb-2">End-to-End Encryption</h3>
          <p className="text-xs text-slate-400 leading-relaxed">
            Client-side Web Crypto authenticated encryption (AES-256-GCM) with ECDH P-256 key establishment and 128-bit MAC tags.
          </p>
        </div>

        <div className="p-6 rounded-2xl bg-slate-900/70 border border-slate-800/80">
          <div className="w-10 h-10 rounded-xl bg-emerald-500/10 text-emerald-400 flex items-center justify-center mb-4">
            <KeyRound className="w-5 h-5" />
          </div>
          <h3 className="text-base font-bold text-white mb-2">Key Verification & Warnings</h3>
          <p className="text-xs text-slate-400 leading-relaxed">
            Cryptographic SHA-256 fingerprints / safety numbers with proactive user warnings when contact keys change.
          </p>
        </div>

        <div className="p-6 rounded-2xl bg-slate-900/70 border border-slate-800/80">
          <div className="w-10 h-10 rounded-xl bg-emerald-500/10 text-emerald-400 flex items-center justify-center mb-4">
            <ServerOff className="w-5 h-5" />
          </div>
          <h3 className="text-base font-bold text-white mb-2">Zero API Leakage</h3>
          <p className="text-xs text-slate-400 leading-relaxed">
            Self-managed backend and MySQL database without reliance on external hosted messaging or encryption APIs.
          </p>
        </div>
      </div>
    </div>
  );
}
