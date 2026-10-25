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
  Terminal,
  Cpu,
  Layers,
} from 'lucide-react';

export default function HomePage() {
  return (
    <div className="flex-1 flex flex-col items-center justify-center px-4 py-16 relative overflow-hidden bg-[#030712]">
      {/* Background Cybernetic Spotlight */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[700px] h-[350px] bg-gradient-to-r from-emerald-500/15 via-teal-500/10 to-cyan-500/15 blur-[140px] rounded-full pointer-events-none" />

      <div className="max-w-4xl mx-auto text-center relative z-10">
        {/* Holographic Logo Container */}
        <div className="flex justify-center mb-7">
          <div className="relative group">
            <div className="absolute -inset-2 rounded-full bg-gradient-to-r from-emerald-500 via-teal-400 to-cyan-500 opacity-60 blur-md group-hover:opacity-100 transition duration-500 animate-pulse" />
            <img
              src="/logo.png"
              alt="SecureChat Official Logo"
              className="relative w-32 h-32 rounded-full object-cover border-2 border-emerald-400 shadow-[0_0_35px_rgba(16,185,129,0.4)] group-hover:scale-105 transition-transform duration-300"
            />
          </div>
        </div>

        {/* Security Badge */}
        <div className="inline-flex items-center gap-2.5 px-4 py-1.5 rounded-full bg-emerald-950/60 border border-emerald-500/40 text-emerald-300 text-xs font-mono font-bold mb-6 shadow-[0_0_20px_rgba(16,185,129,0.2)]">
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
          <Shield className="w-4 h-4 text-emerald-400" />
          <span>CAPSTONE GROUP 7 // CLIENT-SIDE WEB CRYPTO E2EE</span>
        </div>

        {/* Main Hero Heading */}
        <h1 className="text-4xl sm:text-6xl font-black tracking-tight text-white mb-6 leading-tight">
          Secure and End-to-End Encrypted <br />
          <span className="bg-gradient-to-r from-emerald-400 via-teal-300 to-cyan-400 bg-clip-text text-transparent drop-shadow-[0_0_30px_rgba(16,185,129,0.3)]">
            Private Messaging Web Application
          </span>
        </h1>

        <p className="text-base sm:text-lg text-slate-300 max-w-2xl mx-auto mb-10 leading-relaxed font-sans">
          Messages are encrypted on your device using ECDH P-256 and AES-256-GCM. 
          The backend runs internal self-managed libraries with complete zero-knowledge relay architecture.
        </p>

        {/* Action Buttons */}
        <div className="flex flex-wrap items-center justify-center gap-4 mb-20">
          <Link
            href="/register"
            className="inline-flex items-center gap-2.5 px-7 py-3.5 rounded-2xl bg-gradient-to-r from-emerald-500 via-teal-500 to-cyan-500 hover:from-emerald-400 hover:to-cyan-400 text-slate-950 font-extrabold text-sm transition-all shadow-[0_0_25px_rgba(16,185,129,0.4)] hover:scale-105 active:scale-95"
          >
            Create Secure Account
            <ArrowRight className="w-4 h-4" />
          </Link>
          <Link
            href="/chat"
            className="inline-flex items-center gap-2.5 px-7 py-3.5 rounded-2xl bg-slate-900/90 hover:bg-slate-800 text-slate-100 border border-emerald-500/30 hover:border-emerald-400 font-bold text-sm transition-all shadow-lg hover:scale-105 active:scale-95 font-mono"
          >
            Launch Chat Workspace
          </Link>
          <Link
            href="/login"
            className="inline-flex items-center gap-2 px-5 py-3.5 rounded-2xl bg-[#040e1e]/60 text-slate-300 hover:text-white border border-slate-800 hover:border-emerald-500/30 font-semibold text-sm transition-all font-mono"
          >
            Sign In
          </Link>
        </div>
      </div>

      {/* Cybernetic Feature Highlights */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-5xl mx-auto w-full relative z-10">
        <div className="p-7 rounded-3xl cyber-panel transition-all duration-300 hover:-translate-y-1">
          <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 flex items-center justify-center mb-5 shadow-[0_0_15px_rgba(16,185,129,0.25)]">
            <Lock className="w-6 h-6" />
          </div>
          <h3 className="text-base font-extrabold text-white mb-2 tracking-tight">End-to-End Encryption</h3>
          <p className="text-xs text-slate-400 leading-relaxed">
            Client-side Web Crypto authenticated encryption (AES-256-GCM) with ECDH P-256 key establishment and 128-bit MAC tags.
          </p>
        </div>

        <div className="p-7 rounded-3xl cyber-panel transition-all duration-300 hover:-translate-y-1">
          <div className="w-12 h-12 rounded-2xl bg-cyan-500/10 border border-cyan-500/30 text-cyan-400 flex items-center justify-center mb-5 shadow-[0_0_15px_rgba(6,182,212,0.25)]">
            <KeyRound className="w-6 h-6" />
          </div>
          <h3 className="text-base font-extrabold text-white mb-2 tracking-tight">Key Verification & Warnings</h3>
          <p className="text-xs text-slate-400 leading-relaxed">
            Cryptographic SHA-256 fingerprints / safety numbers with proactive user warnings when contact keys change unexpectedly.
          </p>
        </div>

        <div className="p-7 rounded-3xl cyber-panel transition-all duration-300 hover:-translate-y-1">
          <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 flex items-center justify-center mb-5 shadow-[0_0_15px_rgba(16,185,129,0.25)]">
            <ServerOff className="w-6 h-6" />
          </div>
          <h3 className="text-base font-extrabold text-white mb-2 tracking-tight">Zero API Leakage</h3>
          <p className="text-xs text-slate-400 leading-relaxed">
            Self-managed backend and MySQL database without reliance on external hosted messaging or encryption APIs.
          </p>
        </div>
      </div>
    </div>
  );
}
