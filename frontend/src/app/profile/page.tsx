'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { ApiClient } from '@/lib/api-client';
import {
  User as UserIcon,
  LogOut,
  Shield,
  Key,
  Loader2,
  Camera,
  Trash2,
  Check,
  AlertCircle,
  Save,
  Sparkles,
} from 'lucide-react';
import { User } from '@/types';

export default function ProfilePage() {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [user, setUser] = useState<User | null>(null);
  const [displayName, setDisplayName] = useState('');
  const [loading, setLoading] = useState(true);
  const [savingProfile, setSavingProfile] = useState(false);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [statusMessage, setStatusMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  useEffect(() => {
    const raw = localStorage.getItem('securechat_user');
    const token = localStorage.getItem('securechat_jwt');

    if (!raw || !token) {
      router.replace('/login');
      return;
    }

    try {
      const parsed = JSON.parse(raw);
      setUser(parsed);
      setDisplayName(parsed.displayName || '');
    } catch {
      router.replace('/login');
      return;
    }

    ApiClient.get('/auth/me')
      .then((data) => {
        const liveUser = data?.user || data;
        if (liveUser && liveUser.id) {
          setUser(liveUser);
          setDisplayName(liveUser.displayName || '');
          localStorage.setItem('securechat_user', JSON.stringify(liveUser));
        }
      })
      .catch(() => {})
      .finally(() => {
        setLoading(false);
      });
  }, [router]);

  // Client-side image cropping & compression to 256x256 WebP/JPEG using Canvas (100% Local)
  const processImageFile = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (event) => {
        const img = new Image();
        img.onload = () => {
          const canvas = document.createElement('canvas');
          const size = 256;
          canvas.width = size;
          canvas.height = size;
          const ctx = canvas.getContext('2d');
          if (!ctx) {
            reject(new Error('Canvas context not available'));
            return;
          }

          // Center crop to a square
          const minDim = Math.min(img.width, img.height);
          const startX = (img.width - minDim) / 2;
          const startY = (img.height - minDim) / 2;

          ctx.drawImage(img, startX, startY, minDim, minDim, 0, 0, size, size);

          // Export as compressed WebP or JPEG
          const dataUrl = canvas.toDataURL('image/webp', 0.85);
          resolve(dataUrl);
        };
        img.onerror = () => reject(new Error('Failed to load selected image'));
        img.src = event.target?.result as string;
      };
      reader.onerror = () => reject(new Error('Failed to read file'));
      reader.readAsDataURL(file);
    });
  };

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      setStatusMessage({ type: 'error', text: 'Please select an image file (PNG, JPG, WebP)' });
      return;
    }

    setStatusMessage(null);
    setUploadingAvatar(true);

    try {
      const compressedDataUrl = await processImageFile(file);

      const res = await ApiClient.post('/users/avatar', {
        avatarUrl: compressedDataUrl,
      });

      if (res && res.user) {
        setUser(res.user);
        localStorage.setItem('securechat_user', JSON.stringify(res.user));
        if (typeof window !== 'undefined') {
          window.dispatchEvent(new Event('securechat_auth'));
        }
        setStatusMessage({ type: 'success', text: 'Profile photo updated successfully!' });
      }
    } catch (err: any) {
      setStatusMessage({ type: 'error', text: err.message || 'Failed to update profile photo' });
    } finally {
      setUploadingAvatar(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleRemoveAvatar = async () => {
    if (!user?.avatarUrl) return;
    setStatusMessage(null);
    setUploadingAvatar(true);

    try {
      const res = await ApiClient.delete('/users/avatar');
      if (res && res.user) {
        setUser(res.user);
        localStorage.setItem('securechat_user', JSON.stringify(res.user));
        if (typeof window !== 'undefined') {
          window.dispatchEvent(new Event('securechat_auth'));
        }
        setStatusMessage({ type: 'success', text: 'Profile photo removed' });
      }
    } catch (err: any) {
      setStatusMessage({ type: 'error', text: err.message || 'Failed to remove photo' });
    } finally {
      setUploadingAvatar(false);
    }
  };

  const handleSaveDisplayName = async (e: React.FormEvent) => {
    e.preventDefault();
    setStatusMessage(null);
    setSavingProfile(true);

    try {
      const res = await ApiClient.patch('/users/profile', {
        displayName: displayName.trim(),
      });

      if (res && res.user) {
        setUser(res.user);
        localStorage.setItem('securechat_user', JSON.stringify(res.user));
        if (typeof window !== 'undefined') {
          window.dispatchEvent(new Event('securechat_auth'));
        }
        setStatusMessage({ type: 'success', text: 'Display name saved successfully!' });
      }
    } catch (err: any) {
      setStatusMessage({ type: 'error', text: err.message || 'Failed to save display name' });
    } finally {
      setSavingProfile(false);
    }
  };

  const handleLogout = async () => {
    try {
      await ApiClient.post('/auth/logout');
    } catch {}
    localStorage.removeItem('securechat_jwt');
    localStorage.removeItem('securechat_user');
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new Event('securechat_auth'));
    }
    router.push('/login');
  };

  const initials = (user?.username || 'U').substring(0, 2).toUpperCase();

  if (loading && !user) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-6 bg-[#0b0f19]">
        <Loader2 className="w-8 h-8 text-emerald-400 animate-spin mb-3" />
        <p className="text-xs text-slate-400 font-mono">Loading user profile session...</p>
      </div>
    );
  }

  return (
    <div className="flex-1 max-w-2xl mx-auto w-full p-3.5 sm:p-6 py-6 sm:py-10 overflow-x-hidden min-w-0 box-border">
      <div className="mb-6 sm:mb-8">
        <h1 className="text-xl sm:text-2xl font-bold text-white flex items-center gap-2">
          <span>User Account & Profile</span>
        </h1>
        <p className="text-xs text-slate-400 mt-1">Manage session, profile picture, and cryptographic identity</p>
      </div>

      {statusMessage && (
        <div
          className={`mb-5 p-3.5 rounded-2xl text-xs flex items-center gap-2.5 animate-in fade-in ${
            statusMessage.type === 'success'
              ? 'bg-emerald-500/15 border border-emerald-500/30 text-emerald-300'
              : 'bg-red-500/15 border border-red-500/30 text-red-300'
          }`}
        >
          {statusMessage.type === 'success' ? (
            <Check className="w-4 h-4 text-emerald-400 shrink-0" />
          ) : (
            <AlertCircle className="w-4 h-4 text-red-400 shrink-0" />
          )}
          <span>{statusMessage.text}</span>
        </div>
      )}

      <div className="bg-slate-900/90 border border-emerald-950/60 rounded-3xl p-4 sm:p-7 shadow-2xl backdrop-blur-md space-y-6 w-full max-w-full overflow-hidden box-border">
        {/* Profile Avatar & Header */}
        <div className="flex flex-col sm:flex-row items-center sm:items-start gap-4 sm:gap-6 pb-6 border-b border-slate-800 text-center sm:text-left">
          {/* Avatar with Camera Trigger */}
          <div className="relative group shrink-0">
            <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-full bg-slate-950 border-2 border-emerald-500/40 flex items-center justify-center text-emerald-400 font-bold text-2xl shadow-xl overflow-hidden relative">
              {user?.avatarUrl ? (
                <img
                  src={user.avatarUrl}
                  alt={user.username}
                  className="w-full h-full object-cover transition-transform group-hover:scale-105"
                />
              ) : (
                <span className="font-mono tracking-wider">{initials}</span>
              )}

              {/* Hover overlay for desktop */}
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={uploadingAvatar}
                className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 flex flex-col items-center justify-center text-white transition-opacity cursor-pointer"
                title="Change Profile Photo"
              >
                <Camera className="w-5 h-5 mb-0.5 text-emerald-400" />
                <span className="text-[9px] font-semibold">Change</span>
              </button>
            </div>

            {/* Quick Upload Button on bottom-right of avatar */}
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={uploadingAvatar}
              className="absolute -bottom-1 -right-1 p-2 rounded-full bg-emerald-600 hover:bg-emerald-500 text-white shadow-lg shadow-emerald-950/50 border-2 border-slate-900 transition-all active:scale-95"
              title="Upload Photo"
            >
              {uploadingAvatar ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Camera className="w-3.5 h-3.5" />}
            </button>

            {/* Hidden native file input */}
            <input
              ref={fileInputRef}
              type="file"
              accept="image/png,image/jpeg,image/webp,image/gif"
              onChange={handleFileSelect}
              className="hidden"
            />
          </div>

          <div className="flex-1 min-w-0">
            <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-2">
              <h2 className="text-lg sm:text-xl font-bold text-white truncate">
                @{user?.username || 'user'}
              </h2>
              {user?.role === 'admin' && (
                <span className="inline-block text-[10px] px-2 py-0.5 rounded bg-purple-950 text-purple-300 border border-purple-800 font-bold w-fit mx-auto sm:mx-0">
                  ADMIN
                </span>
              )}
            </div>
            <p className="text-xs text-slate-400 mt-0.5">{user?.displayName || 'Standard User'}</p>

            {/* Action buttons for Avatar */}
            <div className="flex flex-wrap items-center gap-2 mt-3 justify-center sm:justify-start">
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={uploadingAvatar}
                className="px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold flex items-center gap-1.5 transition-all shadow-sm active:scale-95 disabled:opacity-50"
              >
                <Camera className="w-3.5 h-3.5" />
                <span>{user?.avatarUrl ? 'Change Photo' : 'Upload Photo'}</span>
              </button>

              {user?.avatarUrl && (
                <button
                  type="button"
                  onClick={handleRemoveAvatar}
                  disabled={uploadingAvatar}
                  className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-red-950/60 text-slate-300 hover:text-red-400 border border-slate-700/60 hover:border-red-800 text-xs font-medium flex items-center gap-1.5 transition-all active:scale-95 disabled:opacity-50"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Remove</span>
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Edit Display Name Form */}
        <form onSubmit={handleSaveDisplayName} className="space-y-3 pb-6 border-b border-slate-800 w-full max-w-full min-w-0">
          <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider text-[11px]">
            Display Name
          </label>
          <div className="flex items-center gap-2 w-full max-w-full min-w-0">
            <input
              type="text"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              placeholder="e.g. Seng Koemnan"
              className="flex-1 min-w-0 bg-slate-950/70 border border-slate-800 rounded-xl px-3 sm:px-4 py-2 sm:py-2.5 text-xs sm:text-sm text-slate-100 placeholder:text-slate-600 focus:outline-none focus:border-emerald-500 transition-colors"
            />
            <button
              type="submit"
              disabled={savingProfile || displayName.trim() === (user?.displayName || '')}
              className="px-3.5 sm:px-4 py-2 sm:py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold flex items-center justify-center gap-1.5 transition-all disabled:opacity-40 disabled:cursor-not-allowed shrink-0 shadow-sm"
            >
              {savingProfile ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
              <span>Save</span>
            </button>
          </div>
        </form>

        {/* Security Parameters */}
        <div className="space-y-3">
          <div className="p-3.5 rounded-2xl bg-slate-950/60 border border-slate-800 flex justify-between items-center text-xs">
            <span className="text-slate-400">Account Status</span>
            <span className="text-emerald-400 font-semibold uppercase">{user?.status || 'active'}</span>
          </div>

          <div className="p-3.5 rounded-2xl bg-slate-950/60 border border-slate-800 flex justify-between items-center text-xs">
            <span className="text-slate-400">E2EE Cryptographic Identity</span>
            <span className="text-slate-300 font-mono text-[11px]">ECDH P-256 (Client-Side)</span>
          </div>
        </div>

        {/* End Session Button */}
        <button
          onClick={handleLogout}
          className="w-full py-2.5 px-4 rounded-2xl bg-red-950/30 hover:bg-red-950/60 border border-red-900/40 text-red-400 text-xs font-semibold flex items-center justify-center gap-2 transition-colors active:scale-98"
        >
          <LogOut className="w-4 h-4" />
          <span>End Session & Log Out</span>
        </button>
      </div>
    </div>
  );
}
