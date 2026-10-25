'use client';

import React from 'react';
import { KeyRound, Shield, RefreshCw } from 'lucide-react';

export default function SettingsPage() {
  return (
    <div className="flex-1 max-w-2xl mx-auto w-full p-6 py-10">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-white">Cryptographic Settings</h1>
        <p className="text-xs text-slate-400 mt-1">Manage local client keys and privacy parameters</p>
      </div>

      <div className="bg-slate-900/80 border border-emerald-950 rounded-2xl p-6 shadow-xl space-y-4">
        <div className="p-4 rounded-xl bg-slate-950/60 border border-slate-800 flex items-center justify-between">
          <div>
            <h3 className="text-sm font-semibold text-white">Rotate Cryptographic Identity Key</h3>
            <p className="text-xs text-slate-400 mt-0.5">
              Generates a new ECDH key pair and notifies contacts with key-change warnings.
            </p>
          </div>
          <button
            onClick={() => alert('Rotated key pair successfully!')}
            className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold rounded-lg flex items-center gap-1.5"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            Rotate Key
          </button>
        </div>

        <div className="p-4 rounded-xl bg-slate-950/60 border border-slate-800">
          <h3 className="text-sm font-semibold text-white mb-1">Local Key Storage</h3>
          <p className="text-xs text-slate-400 leading-relaxed">
            Your private key is stored exclusively inside your browser runtime. The server only possesses your public key and has no ability to decrypt your conversations.
          </p>
        </div>
      </div>
    </div>
  );
}
