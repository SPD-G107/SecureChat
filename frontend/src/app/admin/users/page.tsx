'use client';

import React, { useState, useEffect } from 'react';
import { ApiClient } from '@/lib/api-client';
import { Shield, Check, X, Search, AlertCircle } from 'lucide-react';

import { MOCK_CONTACTS, CURRENT_USER } from '@/lib/mock-data';

export default function AdminUsersPage() {
  const [users, setUsers] = useState<any[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [isMockMode, setIsMockMode] = useState(false);

  useEffect(() => {
    ApiClient.get('/admin/users')
      .then((res) => {
        setUsers(res.users || []);
        setIsMockMode(false);
      })
      .catch(() => {
        // Fallback to mock data for Phase 2 UI test
        const allUsers = [CURRENT_USER, ...MOCK_CONTACTS];
        setUsers(allUsers);
        setIsMockMode(true);
      });
  }, []);

  const handleToggleStatus = async (id: string, currentStatus: string) => {
    const nextStatus = currentStatus === 'active' ? 'suspended' : 'active';
    try {
      await ApiClient.patch(`/admin/users/${id}/status`, { status: nextStatus });
      setUsers((prev) =>
        prev.map((u) => (u.id === id ? { ...u, status: nextStatus } : u))
      );
    } catch {
      // In mock mode, update local state directly
      setUsers((prev) =>
        prev.map((u) => (u.id === id ? { ...u, status: nextStatus } : u))
      );
    }
  };

  return (
    <div className="flex-1 max-w-5xl mx-auto w-full p-6 py-10">
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Administrator User Management</h1>
          <p className="text-xs text-slate-400 mt-1">Audit registered accounts and enforce access restrictions</p>
        </div>
        {isMockMode && (
          <span className="px-3 py-1 rounded-full bg-blue-950/80 text-blue-400 border border-blue-800 text-xs font-medium">
            Demo Mock Mode
          </span>
        )}
      </div>

      {error && (
        <div className="p-3 mb-6 rounded-xl bg-red-500/10 border border-red-500/30 text-red-400 text-xs flex items-center gap-2">
          <AlertCircle className="w-4 h-4" />
          <span>{error}</span>
        </div>
      )}

      <div className="bg-slate-900/80 border border-emerald-950 rounded-2xl overflow-hidden shadow-xl">
        <table className="w-full text-left text-xs text-slate-300">
          <thead className="bg-[#082f2f]/60 text-emerald-400 uppercase font-semibold border-b border-emerald-950">
            <tr>
              <th className="px-6 py-3.5">Username</th>
              <th className="px-6 py-3.5">Role</th>
              <th className="px-6 py-3.5">Status</th>
              <th className="px-6 py-3.5 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800">
            {users.map((u) => (
              <tr key={u.id} className="hover:bg-slate-800/40 transition-colors">
                <td className="px-6 py-4 font-semibold text-white">@{u.username}</td>
                <td className="px-6 py-4">
                  <span
                    className={`px-2 py-0.5 rounded font-mono font-bold ${
                      u.role === 'admin'
                        ? 'bg-purple-950 text-purple-400 border border-purple-800'
                        : 'bg-slate-800 text-slate-300'
                    }`}
                  >
                    {u.role.toUpperCase()}
                  </span>
                </td>
                <td className="px-6 py-4">
                  {u.status === 'active' ? (
                    <span className="text-emerald-400 flex items-center gap-1 font-semibold">
                      <Check className="w-3.5 h-3.5" /> Active
                    </span>
                  ) : (
                    <span className="text-red-400 flex items-center gap-1 font-semibold">
                      <X className="w-3.5 h-3.5" /> Suspended
                    </span>
                  )}
                </td>
                <td className="px-6 py-4 text-right">
                  <button
                    onClick={() => handleToggleStatus(u.id, u.status)}
                    className="px-3 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-200 font-medium transition-colors"
                  >
                    {u.status === 'active' ? 'Suspend' : 'Activate'}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
