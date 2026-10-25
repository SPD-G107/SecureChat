'use client';

import React from 'react';
import Link from 'next/link';
import { Shield, Users, ArrowUpRight, Activity } from 'lucide-react';

export default function AdminDashboardPage() {
  return (
    <div className="flex-1 max-w-5xl mx-auto w-full p-6 py-10">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-white">Administrator Control Panel</h1>
        <p className="text-xs text-slate-400 mt-1">Review user accounts and system security status</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
        <div className="p-6 rounded-2xl bg-slate-900/80 border border-emerald-950 shadow-xl">
          <div className="flex items-center justify-between mb-4">
            <span className="text-xs font-semibold text-emerald-400 uppercase tracking-wider">Registered Accounts</span>
            <Users className="w-5 h-5 text-emerald-400" />
          </div>
          <p className="text-3xl font-bold text-white">Active</p>
          <p className="text-xs text-slate-400 mt-2">All accounts protected by Argon2id</p>
        </div>

        <div className="p-6 rounded-2xl bg-slate-900/80 border border-emerald-950 shadow-xl">
          <div className="flex items-center justify-between mb-4">
            <span className="text-xs font-semibold text-emerald-400 uppercase tracking-wider">Message Confidentiality</span>
            <Activity className="w-5 h-5 text-emerald-400" />
          </div>
          <p className="text-3xl font-bold text-emerald-400">100% Ciphertext</p>
          <p className="text-xs text-slate-400 mt-2">Zero plaintext messages accessible to administrator</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Link
          href="/admin/users"
          className="p-6 rounded-2xl bg-slate-900/80 border border-emerald-950 hover:border-emerald-500/50 transition-colors flex items-center justify-between group"
        >
          <div>
            <h3 className="font-bold text-white text-base group-hover:text-emerald-400 transition-colors">
              User Management
            </h3>
            <p className="text-xs text-slate-400 mt-1">Audit accounts and suspend or activate users</p>
          </div>
          <ArrowUpRight className="w-5 h-5 text-slate-400 group-hover:text-emerald-400 transition-colors" />
        </Link>
      </div>
    </div>
  );
}
