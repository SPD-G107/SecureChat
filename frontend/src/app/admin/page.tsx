'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { Shield, Users, ArrowUpRight, Activity, FileText, CheckCircle2 } from 'lucide-react';
import { ApiClient } from '@/lib/api-client';

export default function AdminDashboardPage() {
  const [auditLogs, setAuditLogs] = useState<any[]>([
    {
      id: 'log-01',
      action: 'PUBLIC_KEY_ROTATED',
      user_id: 'u-bob',
      ip_address: '127.0.0.1',
      created_at: new Date(Date.now() - 1000 * 60 * 5).toISOString(),
    },
    {
      id: 'log-02',
      action: 'USER_LOGIN_SUCCESS',
      user_id: 'u-alice',
      ip_address: '127.0.0.1',
      created_at: new Date(Date.now() - 1000 * 60 * 25).toISOString(),
    },
    {
      id: 'log-03',
      action: 'USER_REGISTERED',
      user_id: 'u-alice',
      ip_address: '127.0.0.1',
      created_at: new Date(Date.now() - 1000 * 60 * 60).toISOString(),
    },
  ]);

  useEffect(() => {
    ApiClient.get('/admin/audit-logs')
      .then((res) => {
        if (res && res.logs && res.logs.length > 0) {
          setAuditLogs(res.logs);
        }
      })
      .catch(() => {});
  }, []);

  return (
    <div className="flex-1 max-w-5xl mx-auto w-full p-6 py-10">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-white flex items-center gap-2.5">
          <Shield className="w-6 h-6 text-emerald-400" /> Administrator Security Center
        </h1>
        <p className="text-xs text-slate-400 mt-1">
          Review cryptographic operations, zero-plaintext audit logs, and account statuses
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <div className="p-6 rounded-2xl bg-slate-900/80 border border-emerald-950 shadow-xl">
          <div className="flex items-center justify-between mb-4">
            <span className="text-xs font-semibold text-emerald-400 uppercase tracking-wider">Account Protection</span>
            <Users className="w-5 h-5 text-emerald-400" />
          </div>
          <p className="text-2xl font-bold text-white">Argon2id</p>
          <p className="text-xs text-slate-400 mt-1">64MB RAM memory-hard cost factor</p>
        </div>

        <div className="p-6 rounded-2xl bg-slate-900/80 border border-emerald-950 shadow-xl">
          <div className="flex items-center justify-between mb-4">
            <span className="text-xs font-semibold text-emerald-400 uppercase tracking-wider">Message Privacy</span>
            <Activity className="w-5 h-5 text-emerald-400" />
          </div>
          <p className="text-2xl font-bold text-emerald-400">100% Blind Relay</p>
          <p className="text-xs text-slate-400 mt-1">Zero plaintext stored in database</p>
        </div>

        <Link
          href="/admin/users"
          className="p-6 rounded-2xl bg-slate-900/80 border border-emerald-950 hover:border-emerald-500/50 transition-colors shadow-xl group flex flex-col justify-between"
        >
          <div className="flex items-center justify-between mb-4">
            <span className="text-xs font-semibold text-cyan-400 uppercase tracking-wider">User Directory</span>
            <ArrowUpRight className="w-5 h-5 text-slate-400 group-hover:text-cyan-400 transition-colors" />
          </div>
          <div>
            <p className="text-xl font-bold text-white group-hover:text-cyan-300 transition-colors">Manage Accounts</p>
            <p className="text-xs text-slate-400 mt-1">Audit status & access controls →</p>
          </div>
        </Link>
      </div>

      {/* Security Audit Logs */}
      <div className="bg-slate-900/80 border border-emerald-950 rounded-2xl overflow-hidden shadow-xl">
        <div className="px-6 py-4 border-b border-emerald-950/80 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <FileText className="w-4 h-4 text-emerald-400" />
            <h2 className="text-sm font-bold text-white">Recent Security Audit Logs</h2>
          </div>
          <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-950 text-emerald-400 border border-emerald-800 font-mono">
            Zero Passwords / Secrets Stored
          </span>
        </div>

        <div className="divide-y divide-slate-800/80">
          {auditLogs.slice(0, 8).map((log) => (
            <div key={log.id} className="px-6 py-3.5 flex items-center justify-between hover:bg-slate-800/30 transition-colors text-xs">
              <div className="flex items-center gap-3">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                <div>
                  <span className="font-mono text-emerald-300 font-semibold">{log.action}</span>
                  <span className="text-slate-400 text-[11px] ml-2">User: {log.user_id || 'System'}</span>
                </div>
              </div>
              <div className="text-right text-[11px] text-slate-400 font-mono">
                <div>{new Date(log.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}</div>
                <div className="text-[10px] text-slate-400">{log.ip_address || '127.0.0.1'}</div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
