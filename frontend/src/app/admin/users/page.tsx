'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { ApiClient } from '@/lib/api-client';
import { Shield, Check, X, AlertCircle, Loader2, ArrowLeft, Trash2 } from 'lucide-react';

export default function AdminUsersPage() {
  const [users, setUsers] = useState<any[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  useEffect(() => {
    ApiClient.get('/admin/users')
      .then((res) => {
        setUsers(res.users || []);
      })
      .catch((err) => {
        setError(err.message || 'Administrator privilege required to view user directory.');
      })
      .finally(() => {
        setLoading(false);
      });
  }, []);

  const handleToggleStatus = async (id: string, currentStatus: string) => {
    const nextStatus = currentStatus === 'active' ? 'suspended' : 'active';
    setUpdatingId(id);
    try {
      await ApiClient.patch(`/admin/users/${id}/status`, { status: nextStatus });
      setUsers((prev) =>
        prev.map((u) => (u.id === id ? { ...u, status: nextStatus } : u))
      );
    } catch (err: any) {
      setError(err.message || 'Failed to update user account status.');
    } finally {
      setUpdatingId(null);
    }
  };

  const handleDeleteUser = async (id: string, username: string) => {
    if (!window.confirm(`Are you sure you want to permanently delete user @${username}? This will remove all their keys, chats, and messages from MySQL.`)) {
      return;
    }
    setDeletingId(id);
    setError(null);
    try {
      await ApiClient.delete(`/admin/users/${id}`);
      setUsers((prev) => prev.filter((u) => u.id !== id));
      setSuccessMsg(`User @${username} has been permanently deleted.`);
      setTimeout(() => setSuccessMsg(null), 4000);
    } catch (err: any) {
      setError(err.message || 'Failed to delete user account.');
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <div className="flex-1 max-w-5xl mx-auto w-full p-6 py-10">
      <div className="mb-8 flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Link
              href="/admin"
              className="text-xs text-slate-400 hover:text-white flex items-center gap-1 transition-colors"
            >
              <ArrowLeft className="w-3.5 h-3.5" /> Back to Security Center
            </Link>
          </div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2.5">
            <Shield className="w-6 h-6 text-purple-400" /> Administrator User Management
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Live MySQL accounts, cryptographic roles, and real access enforcement
          </p>
        </div>
      </div>

      {error && (
        <div className="p-3 mb-6 rounded-xl bg-red-500/10 border border-red-500/30 text-red-400 text-xs flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {successMsg && (
        <div className="p-3 mb-6 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs flex items-center gap-2">
          <Check className="w-4 h-4 shrink-0" />
          <span>{successMsg}</span>
        </div>
      )}

      {loading ? (
        <div className="p-12 text-center flex flex-col items-center justify-center">
          <Loader2 className="w-8 h-8 text-emerald-400 animate-spin mb-2" />
          <p className="text-xs text-slate-400 font-mono">Querying live MySQL user directory...</p>
        </div>
      ) : (
        <div className="bg-slate-900/80 border border-emerald-950 rounded-2xl overflow-hidden shadow-xl">
          <table className="w-full text-left text-xs text-slate-300">
            <thead className="bg-[#082f2f]/60 text-emerald-400 uppercase font-semibold border-b border-emerald-950">
              <tr>
                <th className="px-6 py-3.5">Username</th>
                <th className="px-6 py-3.5">Display Name</th>
                <th className="px-6 py-3.5">Role</th>
                <th className="px-6 py-3.5">Status</th>
                <th className="px-6 py-3.5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800">
              {users.map((u) => (
                <tr key={u.id} className="hover:bg-slate-800/40 transition-colors">
                  <td className="px-6 py-4 font-semibold text-white">@{u.username}</td>
                  <td className="px-6 py-4 text-slate-300">{u.display_name || u.displayName || u.username}</td>
                  <td className="px-6 py-4">
                    <span
                      className={`px-2 py-0.5 rounded font-mono font-bold text-[10px] ${
                        u.role === 'admin'
                          ? 'bg-purple-950 text-purple-300 border border-purple-800'
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
                    <div className="flex items-center justify-end gap-2">
                      <button
                        onClick={() => handleToggleStatus(u.id, u.status)}
                        disabled={updatingId === u.id}
                        className="px-3 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-200 font-medium transition-colors disabled:opacity-50"
                      >
                        {updatingId === u.id
                          ? 'Updating...'
                          : u.status === 'active'
                          ? 'Suspend'
                          : 'Activate'}
                      </button>
                      <button
                        onClick={() => handleDeleteUser(u.id, u.username)}
                        disabled={deletingId === u.id || u.role === 'admin'}
                        className="px-2.5 py-1 rounded bg-red-950/60 hover:bg-red-900 border border-red-800/60 text-red-300 font-medium transition-colors disabled:opacity-30 disabled:cursor-not-allowed flex items-center gap-1"
                        title={u.role === 'admin' ? 'Cannot delete admin account' : 'Permanently delete account'}
                      >
                        {deletingId === u.id ? (
                          <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        ) : (
                          <Trash2 className="w-3.5 h-3.5" />
                        )}
                        <span>Delete</span>
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
