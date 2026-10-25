import Link from 'next/link';
import { Shield, Lock, KeyRound, ServerOff, ArrowRight } from 'lucide-react';

export default function HomePage() {
  return (
    <div className="flex-1 flex flex-col items-center justify-center px-4 py-16 relative">
      <div className="max-w-4xl mx-auto text-center relative z-10">
        <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs font-semibold mb-6">
          <Shield className="w-4 h-4" /> Client-Side Web Crypto E2EE & Argon2id
        </div>

        <h1 className="text-4xl sm:text-6xl font-extrabold tracking-tight text-white mb-6">
          Private, Real-Time Messaging <br />
          <span className="text-emerald-400">Zero Server-Side Plaintext</span>
        </h1>

        <p className="text-base sm:text-lg text-slate-300 max-w-2xl mx-auto mb-10 leading-relaxed">
          Messages are encrypted on your device and decrypted exclusively by your contact. 
          The backend runs internal self-managed libraries with complete protection against API and secret leakage.
        </p>

        <div className="flex flex-wrap items-center justify-center gap-4">
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
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-5xl mx-auto mt-20">
        <div className="p-6 rounded-2xl bg-slate-900/70 border border-slate-800">
          <div className="w-10 h-10 rounded-xl bg-emerald-500/10 text-emerald-400 flex items-center justify-center mb-4">
            <Lock className="w-5 h-5" />
          </div>
          <h3 className="text-base font-bold text-white mb-2">Authenticated E2EE</h3>
          <p className="text-xs text-slate-400 leading-relaxed">
            AES-256-GCM symmetric encryption with 128-bit authentication tags and ECDH P-256 key agreement.
          </p>
        </div>

        <div className="p-6 rounded-2xl bg-slate-900/70 border border-slate-800">
          <div className="w-10 h-10 rounded-xl bg-emerald-500/10 text-emerald-400 flex items-center justify-center mb-4">
            <KeyRound className="w-5 h-5" />
          </div>
          <h3 className="text-base font-bold text-white mb-2">Public-Key Verification</h3>
          <p className="text-xs text-slate-400 leading-relaxed">
            Cryptographic SHA-256 safety numbers and proactive warnings if a contact&apos;s identity key changes.
          </p>
        </div>

        <div className="p-6 rounded-2xl bg-slate-900/70 border border-slate-800">
          <div className="w-10 h-10 rounded-xl bg-emerald-500/10 text-emerald-400 flex items-center justify-center mb-4">
            <ServerOff className="w-5 h-5" />
          </div>
          <h3 className="text-base font-bold text-white mb-2">Zero API Leakage</h3>
          <p className="text-xs text-slate-400 leading-relaxed">
            Self-managed backend and MySQL services without third-party hosted APIs or credential exposure.
          </p>
        </div>
      </div>
    </div>
  );
}
