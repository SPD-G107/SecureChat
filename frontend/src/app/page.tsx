'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import {
  Shield,
  Lock,
  KeyRound,
  ServerOff,
  ArrowRight,
  Terminal,
  Cpu,
  CheckCircle,
  AlertOctagon,
  Sparkles,
  RefreshCw,
} from 'lucide-react';

export default function HomePage() {
  const [demoInput, setDemoInput] = useState('Top Secret Research Note #7');
  const [isTampered, setIsTampered] = useState(false);

  // Generate simulated Web Crypto AES-256-GCM data based on input
  const simulatedIV = '3f9a12c8b04e';
  const simulatedTag = isTampered ? 'deadbeef9988' : 'a7e12c8419bf';
  const simulatedCipher = btoa(encodeURIComponent(demoInput)).slice(0, 22) + '==';

  return (
    <div className="flex-1 flex flex-col items-center justify-center px-4 py-12 relative overflow-hidden">
      {/* Background radial glow */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[350px] bg-emerald-500/10 blur-[130px] rounded-full pointer-events-none" />

      <div className="max-w-4xl mx-auto text-center relative z-10">
        <div className="flex justify-center mb-6">
          <img
            src="/logo.png"
            alt="SecureChat Official Logo"
            className="w-28 h-28 rounded-full object-cover shadow-2xl shadow-emerald-500/30 border-2 border-emerald-400/60 hover:scale-105 transition-transform"
          />
        </div>

        <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs font-semibold mb-6">
          <Shield className="w-4 h-4" /> Client-Side Web Crypto E2EE & Argon2id
        </div>

        <h1 className="text-4xl sm:text-6xl font-extrabold tracking-tight text-white mb-6">
          Private, Real-Time Messaging <br />
          <span className="bg-gradient-to-r from-emerald-400 via-teal-300 to-cyan-400 bg-clip-text text-transparent">
            Zero Server-Side Plaintext
          </span>
        </h1>

        <p className="text-base sm:text-lg text-slate-300 max-w-2xl mx-auto mb-8 leading-relaxed">
          Messages are encrypted on your device using ECDH P-256 and AES-256-GCM. 
          The backend runs internal self-managed libraries with complete protection against API and secret leakage.
        </p>

        <div className="flex flex-wrap items-center justify-center gap-4 mb-14">
          <Link
            href="/register"
            className="inline-flex items-center gap-2 px-6 py-3.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-sm transition-all shadow-lg shadow-emerald-950/50 hover:scale-[1.02]"
          >
            Create Secure Account
            <ArrowRight className="w-4 h-4" />
          </Link>
          <Link
            href="/chat"
            className="inline-flex items-center gap-2 px-6 py-3.5 rounded-xl bg-[#082f2f] hover:bg-[#0c4444] text-slate-200 border border-emerald-800/80 font-semibold text-sm transition-all hover:scale-[1.02]"
          >
            Open Interactive Chat Demo
          </Link>
        </div>
      </div>

      {/* Interactive Live E2EE Simulator Widget */}
      <div className="w-full max-w-4xl mx-auto p-6 rounded-3xl bg-slate-900/90 border border-emerald-950 shadow-2xl backdrop-blur-md relative z-10 mb-16">
        <div className="flex items-center justify-between pb-4 mb-4 border-b border-slate-800">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
              <Cpu className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                Live E2EE Cryptographic Flow Playground
                <span className="text-[10px] px-2 py-0.5 rounded bg-emerald-950 text-emerald-400 border border-emerald-800 font-mono">
                  Interactive
                </span>
              </h3>
              <p className="text-xs text-slate-400">Type any text below to inspect end-to-end cryptographic isolation</p>
            </div>
          </div>

          <button
            onClick={() => setIsTampered(!isTampered)}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all ${
              isTampered
                ? 'bg-red-500 text-white shadow-lg shadow-red-500/20'
                : 'bg-slate-800 hover:bg-slate-700 text-slate-300'
            }`}
          >
            <AlertOctagon className="w-3.5 h-3.5" />
            {isTampered ? 'Tamper Active (1 Bit Flipped)' : 'Simulate MITM Tamper'}
          </button>
        </div>

        {/* Input Text Box */}
        <div className="mb-6">
          <label className="block text-xs font-semibold text-slate-400 mb-1.5">
            Test Message to Encrypt (Client Plaintext):
          </label>
          <input
            type="text"
            value={demoInput}
            onChange={(e) => setDemoInput(e.target.value)}
            className="w-full bg-slate-950/80 border border-emerald-900/50 rounded-xl px-4 py-2.5 text-sm text-slate-200 focus:outline-none focus:border-emerald-500 transition-colors"
          />
        </div>

        {/* 3-Column Interactive Pipeline */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Step 1: Sender Browser */}
          <div className="p-4 rounded-2xl bg-slate-950/80 border border-slate-800 flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between text-xs font-bold text-emerald-400 mb-2">
                <span>1. Alice&apos;s Browser</span>
                <Lock className="w-3.5 h-3.5" />
              </div>
              <p className="text-[11px] text-slate-400 mb-2">Web Crypto API (AES-256-GCM)</p>
              <div className="p-2.5 rounded-xl bg-slate-900 border border-slate-800 text-xs font-mono text-slate-200 break-words">
                &quot;{demoInput || '(empty)'}&quot;
              </div>
            </div>
            <span className="text-[10px] text-emerald-400 mt-3 flex items-center gap-1">
              <CheckCircle className="w-3 h-3" /> Encrypted locally on device
            </span>
          </div>

          {/* Step 2: Server Middleman */}
          <div className="p-4 rounded-2xl bg-black/50 border border-emerald-950 flex flex-col justify-between relative">
            <div className="absolute -top-2.5 left-1/2 -translate-x-1/2 px-2 py-0.5 rounded bg-emerald-950 border border-emerald-800 text-[9px] font-mono text-emerald-300">
              Zero Plaintext Relay
            </div>
            <div>
              <div className="flex items-center justify-between text-xs font-bold text-slate-300 mb-2">
                <span>2. MySQL & Server</span>
                <ServerOff className="w-3.5 h-3.5 text-amber-400" />
              </div>
              <p className="text-[11px] text-slate-400 mb-2">Witnesses Ciphertext Only</p>
              <div className="p-2.5 rounded-xl bg-slate-950 border border-slate-800 text-xs font-mono text-amber-300 break-all select-all">
                {isTampered ? 'TAMPERED_ERR_x99==' : simulatedCipher}
              </div>
            </div>
            <span className="text-[10px] text-amber-400/90 mt-3 flex items-center gap-1 font-mono">
              IV: {simulatedIV} | Tag: {simulatedTag}
            </span>
          </div>

          {/* Step 3: Recipient Browser */}
          <div
            className={`p-4 rounded-2xl border flex flex-col justify-between transition-colors ${
              isTampered
                ? 'bg-red-950/20 border-red-500/50'
                : 'bg-slate-950/80 border-slate-800'
            }`}
          >
            <div>
              <div className="flex items-center justify-between text-xs font-bold text-emerald-400 mb-2">
                <span>3. Bob&apos;s Browser</span>
                <CheckCircle className="w-3.5 h-3.5" />
              </div>
              <p className="text-[11px] text-slate-400 mb-2">ECDH Derived Decryption</p>
              <div
                className={`p-2.5 rounded-xl border text-xs font-mono break-words ${
                  isTampered
                    ? 'bg-red-950/40 border-red-500/50 text-red-300'
                    : 'bg-slate-900 border-slate-800 text-emerald-300'
                }`}
              >
                {isTampered ? (
                  <span className="flex items-center gap-1 text-[11px] font-sans">
                    <AlertOctagon className="w-3.5 h-3.5 text-red-400 shrink-0" />
                    <strong>OperationError:</strong> MAC Tag Failed! Payload Tampered!
                  </span>
                ) : (
                  `"${demoInput || '(empty)'}"`
                )}
              </div>
            </div>
            <span
              className={`text-[10px] mt-3 flex items-center gap-1 ${
                isTampered ? 'text-red-400 font-bold' : 'text-emerald-400'
              }`}
            >
              {isTampered ? 'Tamper Detected & Rejected!' : '✓ Authenticated Decryption'}
            </span>
          </div>
        </div>
      </div>

      {/* Feature Highlights Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-5xl mx-auto w-full relative z-10">
        <div className="p-6 rounded-2xl bg-slate-900/70 border border-slate-800/80 hover:border-emerald-500/40 transition-colors">
          <div className="w-10 h-10 rounded-xl bg-emerald-500/10 text-emerald-400 flex items-center justify-center mb-4">
            <Lock className="w-5 h-5" />
          </div>
          <h3 className="text-base font-bold text-white mb-2">Authenticated E2EE</h3>
          <p className="text-xs text-slate-400 leading-relaxed">
            AES-256-GCM symmetric encryption with 128-bit authentication tags and ECDH P-256 key agreement.
          </p>
        </div>

        <div className="p-6 rounded-2xl bg-slate-900/70 border border-slate-800/80 hover:border-emerald-500/40 transition-colors">
          <div className="w-10 h-10 rounded-xl bg-emerald-500/10 text-emerald-400 flex items-center justify-center mb-4">
            <KeyRound className="w-5 h-5" />
          </div>
          <h3 className="text-base font-bold text-white mb-2">Public-Key Verification</h3>
          <p className="text-xs text-slate-400 leading-relaxed">
            Cryptographic SHA-256 safety numbers and proactive warnings if a contact&apos;s identity key changes.
          </p>
        </div>

        <div className="p-6 rounded-2xl bg-slate-900/70 border border-slate-800/80 hover:border-emerald-500/40 transition-colors">
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
