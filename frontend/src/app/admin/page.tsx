'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { Shield, Users, ArrowUpRight, Activity, FileText, CheckCircle2, Loader2, AlertCircle } from 'lucide-react';
import { ApiClient } from '@/lib/api-client';

export default function AdminDashboardPage() {
  const [auditLogs, setAuditLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    ApiClient.get('/admin/audit-logs')
      .then((res) => {
        if (res && Array.isArray(res.logs)) {
          setAuditLogs(res.logs);
        }
      })
      .catch((err) => {
        setError(err.message || 'Administrator access required to review audit logs.');
      })
      .finally(() => {
        setLoading(false);
      });
  }, []);

  return (
    <div className="flex-1 max-w-5xl mx-auto w-full p-6 py-10">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-white flex items-center gap-2.5">
          <Shield className="w-6 h-6 text-purple-400" /> Administrator Security Center
        </h1>
        <p className="text-xs text-slate-400 mt-1">
          Review cryptographic operations, zero-plaintext audit logs, and account statuses
        </p>
      </div>

      {error && (
        <div className="p-3 mb-6 rounded-xl bg-red-500/10 border border-red-500/30 text-red-400 text-xs flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

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

        {loading ? (
          <div className="p-8 text-center flex flex-col items-center justify-center">
            <Loader2 className="w-6 h-6 text-emerald-400 animate-spin mb-2" />
            <p className="text-xs text-slate-400 font-mono">Loading real audit log stream...</p>
          </div>
        ) : auditLogs.length === 0 ? (
          <div className="p-8 text-center text-xs text-slate-500">
            No audit log events recorded in the database yet.
          </div>
        ) : (
          <div className="divide-y divide-slate-800/80">
            {auditLogs.slice(0, 15).map((log) => (
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
        )}
      </div>
    </div>
  );
}
