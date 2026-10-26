'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  Shield,
  Lock,
  User,
  ArrowRight,
  AlertCircle,
  Key,
  CheckCircle2,
  Check,
  X,
  Eye,
  EyeOff,
  ShieldCheck,
  Sparkles,
} from 'lucide-react';
import { CryptoEngine } from '@/lib/crypto';
import { ApiClient } from '@/lib/api-client';

export default function RegisterPage() {
  const router = useRouter();
  const [username, setUsername] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [stepMsg, setStepMsg] = useState<string | null>(null);
  const [currentUser, setCurrentUser] = useState<any | null>(null);
  const [isCheckingAuth, setIsCheckingAuth] = useState(true);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const token = localStorage.getItem('securechat_jwt');
      const raw = localStorage.getItem('securechat_user');
      if (token && raw) {
        try {
          const user = JSON.parse(raw);
          if (user && user.id) {
            setCurrentUser(user);
            router.replace('/chat');
            return;
          }
        } catch {}
      }
      setIsCheckingAuth(false);
    }
  }, [router]);

  // Username validation
  const cleanUsername = username.trim().toLowerCase();
  const isUsernameValid = cleanUsername.length >= 3 && cleanUsername.length <= 30 && /^[a-zA-Z0-9_-]+$/.test(cleanUsername);
  const isUsernameStarted = username.length > 0;
  const usernameError = isUsernameStarted && !isUsernameValid
    ? cleanUsername.length < 3
      ? 'Username must be at least 3 characters'
      : cleanUsername.length > 30
      ? 'Username must not exceed 30 characters'
      : 'Username can only contain letters, numbers, underscores, and dashes'
    : null;

  // Passphrase strength criteria
  const criteria = {
    length: password.length >= 8,
    hasUpper: /[A-Z]/.test(password),
    hasLower: /[a-z]/.test(password),
    hasNumber: /[0-9]/.test(password),
    hasSpecial: /[^A-Za-z0-9]/.test(password),
  };

  const passedCriteriaCount = Object.values(criteria).filter(Boolean).length;

  // Passphrase strength score (0 to 4)
  const strengthScore = password.length === 0 ? 0 : passedCriteriaCount <= 2 ? 1 : passedCriteriaCount === 3 ? 2 : passedCriteriaCount === 4 ? 3 : 4;

  const strengthLabels = ['Empty', 'Weak', 'Moderate', 'Good', 'Strong & Secure'];
  const strengthColors = [
    'bg-slate-800',
    'bg-red-500',
    'bg-amber-500',
    'bg-yellow-400',
    'bg-emerald-400',
  ];
  const strengthTextColors = [
    'text-slate-500',
    'text-red-400',
    'text-amber-400',
    'text-yellow-300',
    'text-emerald-400',
  ];

  // Confirm password validation
  const isConfirmStarted = confirmPassword.length > 0;
  const isPasswordMatch = isConfirmStarted && password === confirmPassword;
  const isPasswordMismatch = isConfirmStarted && password !== confirmPassword;

  // Complete form validity
  const isFormValid =
    isUsernameValid &&
    criteria.length &&
    criteria.hasUpper &&
    criteria.hasLower &&
    criteria.hasNumber &&
    criteria.hasSpecial &&
    isPasswordMatch &&
    !loading;

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!isUsernameValid) {
      setError(usernameError || 'Please enter a valid username');
      return;
    }

    if (!criteria.length) {
      setError('Passphrase must be at least 8 characters long');
      return;
    }

    if (!criteria.hasUpper || !criteria.hasLower || !criteria.hasNumber || !criteria.hasSpecial) {
      setError('Please fulfill all strong passphrase requirements (uppercase, lowercase, number, symbol)');
      return;
    }

    if (password !== confirmPassword) {
      setError('Passphrase and Confirm Passphrase do not match');
      return;
    }

    setLoading(true);

    try {
      setStepMsg('1/4: Generating client-side ECDH P-256 keypair in browser...');
      const keypair = await CryptoEngine.generateIdentityKeyPair();
      const pubKey = await CryptoEngine.exportPublicKey(keypair.publicKey);
      const privKey = await CryptoEngine.exportPrivateKey(keypair.privateKey);

      setStepMsg('2/4: Computing cryptographic SHA-256 fingerprint...');
      const fingerprint = await CryptoEngine.computeFingerprint(pubKey);

      setStepMsg('3/4: Storing private key locally on this device only...');
      CryptoEngine.saveLocalIdentity(cleanUsername, privKey, pubKey, fingerprint);

      setStepMsg('4/4: Registering account with Argon2id on server...');
      const res = await ApiClient.post('/auth/register', {
        username: cleanUsername,
        password,
        displayName: displayName.trim() || cleanUsername,
        publicKey: pubKey,
        fingerprint,
      });

      if (res && res.token && res.user) {
        localStorage.setItem('securechat_jwt', res.token);
        localStorage.setItem('securechat_user', JSON.stringify(res.user));
        if (typeof window !== 'undefined') {
          window.dispatchEvent(new Event('securechat_auth'));
        }
        setStepMsg(null);
        router.push('/chat');
        return;
      }
    } catch (err: any) {
      setError(err.message || 'Registration failed. Please check backend connection.');
    } finally {
      setLoading(false);
      setStepMsg(null);
    }
  };

  if (isCheckingAuth && currentUser) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-4 bg-[#0b0f19] text-center">
        <div className="w-10 h-10 rounded-full border-2 border-emerald-500 border-t-transparent animate-spin mb-4" />
        <p className="text-sm font-semibold text-white">
          Already signed in as <span className="text-emerald-400">@{currentUser.username}</span>
        </p>
        <p className="text-xs text-slate-400 mt-1">Redirecting to your encrypted messages...</p>
      </div>
    );
  }

  return (
    <div className="flex-1 flex items-center justify-center p-4 py-8 bg-[#0b0f19]">
      <div className="max-w-md w-full p-6 sm:p-8 rounded-3xl bg-slate-900/90 border border-slate-800 shadow-2xl backdrop-blur-md">
        {/* Header */}
        <div className="text-center mb-6">
          <div className="relative inline-block mb-3">
            <img
              src="/logo.png"
              alt="SecureChat Logo"
              className="w-16 h-16 rounded-full object-cover shadow-xl shadow-emerald-500/25 border-2 border-emerald-400/50"
            />
            <span className="absolute -bottom-0.5 -right-0.5 w-4 h-4 rounded-full bg-emerald-400 border-2 border-slate-900" />
          </div>
          <h1 className="text-2xl font-extrabold text-white tracking-tight">Create Private Account</h1>
          <p className="text-xs text-slate-400 mt-1 font-medium">
            Generates on-device ECDH cryptographic keys automatically
          </p>
        </div>

        {/* Global Error Banner */}
        {error && (
          <div className="mb-5 p-3.5 rounded-2xl bg-red-500/10 border border-red-500/30 text-red-300 text-xs flex items-center gap-2.5 animate-in fade-in duration-200">
            <AlertCircle className="w-4 h-4 shrink-0 text-red-400" />
            <span>{error}</span>
          </div>
        )}

        {/* Key Generation Step Banner */}
        {stepMsg && (
          <div className="mb-5 p-3.5 rounded-2xl bg-emerald-500/15 border border-emerald-500/40 text-emerald-300 text-xs flex items-center gap-2.5 animate-pulse shadow-md shadow-emerald-950/40">
            <Key className="w-4 h-4 shrink-0 text-emerald-400 animate-spin" />
            <span className="font-mono text-[11px] font-semibold">{stepMsg}</span>
          </div>
        )}

        <form onSubmit={handleRegister} className="space-y-4">
          {/* USERNAME */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-xs font-bold text-slate-300 uppercase tracking-wider text-[11px]">
                Username
              </label>
              {isUsernameStarted && (
                <span className={`text-[10px] font-mono flex items-center gap-1 ${isUsernameValid ? 'text-emerald-400' : 'text-red-400'}`}>
                  {isUsernameValid ? (
                    <>
                      <Check className="w-3 h-3" /> Available format
                    </>
                  ) : (
                    <>
                      <X className="w-3 h-3" /> Invalid format
                    </>
                  )}
                </span>
              )}
            </div>
            <div className="relative">
              <User className="w-4 h-4 text-slate-400 absolute left-4 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                required
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="alice"
                className={`w-full bg-slate-950/70 border rounded-2xl pl-11 pr-4 py-2.5 sm:py-3 text-sm text-slate-100 placeholder:text-slate-600 focus:outline-none transition-all shadow-inner ${
                  usernameError
                    ? 'border-red-500/60 focus:border-red-500 focus:ring-1 focus:ring-red-500/30'
                    : isUsernameValid
                    ? 'border-emerald-500/60 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500/30'
                    : 'border-slate-800 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500/30'
                }`}
              />
            </div>
            {usernameError && (
              <p className="text-[11px] text-red-400 mt-1 ml-1">{usernameError}</p>
            )}
          </div>

          {/* DISPLAY NAME (OPTIONAL) */}
          <div>
            <label className="block text-xs font-bold text-slate-300 mb-1.5 uppercase tracking-wider text-[11px]">
              Display Name (Optional)
            </label>
            <input
              type="text"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              placeholder="Alice Wonderland"
              className="w-full bg-slate-950/70 border border-slate-800 rounded-2xl px-4 py-2.5 sm:py-3 text-sm text-slate-100 placeholder:text-slate-600 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500/30 transition-all shadow-inner"
            />
          </div>

          {/* PASSPHRASE */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-xs font-bold text-slate-300 uppercase tracking-wider text-[11px]">
                Passphrase (Strong Required)
              </label>
              {password.length > 0 && (
                <span className={`text-[10px] font-semibold font-mono ${strengthTextColors[strengthScore]}`}>
                  {strengthLabels[strengthScore]}
                </span>
              )}
            </div>

            <div className="relative">
              <Lock className="w-4 h-4 text-slate-400 absolute left-4 top-1/2 -translate-y-1/2" />
              <input
                type={showPassword ? 'text' : 'password'}
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••••••"
                className="w-full bg-slate-950/70 border border-slate-800 rounded-2xl pl-11 pr-11 py-2.5 sm:py-3 text-sm text-slate-100 placeholder:text-slate-600 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500/30 transition-all shadow-inner"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white transition-colors"
                title={showPassword ? 'Hide passphrase' : 'Show passphrase'}
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>

            {/* Dynamic 4-Level Strength Meter Bar */}
            {password.length > 0 && (
              <div className="mt-2 space-y-1.5">
                <div className="grid grid-cols-4 gap-1.5 h-1.5 w-full">
                  {[1, 2, 3, 4].map((level) => (
                    <div
                      key={level}
                      className={`h-full rounded-full transition-all duration-300 ${
                        strengthScore >= level ? strengthColors[strengthScore] : 'bg-slate-800'
                      }`}
                    />
                  ))}
                </div>

                {/* Criteria Checklist Pills */}
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5 pt-1 text-[10px]">
                  <span className={`flex items-center gap-1 font-mono ${criteria.length ? 'text-emerald-400 font-semibold' : 'text-slate-500'}`}>
                    <Check className={`w-3 h-3 ${criteria.length ? 'text-emerald-400' : 'text-slate-600'}`} />
                    8+ Chars
                  </span>
                  <span className={`flex items-center gap-1 font-mono ${criteria.hasUpper ? 'text-emerald-400 font-semibold' : 'text-slate-500'}`}>
                    <Check className={`w-3 h-3 ${criteria.hasUpper ? 'text-emerald-400' : 'text-slate-600'}`} />
                    Upper (A-Z)
                  </span>
                  <span className={`flex items-center gap-1 font-mono ${criteria.hasLower ? 'text-emerald-400 font-semibold' : 'text-slate-500'}`}>
                    <Check className={`w-3 h-3 ${criteria.hasLower ? 'text-emerald-400' : 'text-slate-600'}`} />
                    Lower (a-z)
                  </span>
                  <span className={`flex items-center gap-1 font-mono ${criteria.hasNumber ? 'text-emerald-400 font-semibold' : 'text-slate-500'}`}>
                    <Check className={`w-3 h-3 ${criteria.hasNumber ? 'text-emerald-400' : 'text-slate-600'}`} />
                    Number (0-9)
                  </span>
                  <span className={`flex items-center gap-1 font-mono col-span-2 sm:col-span-2 ${criteria.hasSpecial ? 'text-emerald-400 font-semibold' : 'text-slate-500'}`}>
                    <Check className={`w-3 h-3 ${criteria.hasSpecial ? 'text-emerald-400' : 'text-slate-600'}`} />
                    Symbol (!@#$%^&*)
                  </span>
                </div>
              </div>
            )}
          </div>

          {/* CONFIRM PASSPHRASE */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-xs font-bold text-slate-300 uppercase tracking-wider text-[11px]">
                Confirm Passphrase
              </label>
              {isConfirmStarted && (
                <span className={`text-[10px] font-mono flex items-center gap-1 ${isPasswordMatch ? 'text-emerald-400' : 'text-red-400'}`}>
                  {isPasswordMatch ? (
                    <>
                      <Check className="w-3 h-3" /> Passphrases match
                    </>
                  ) : (
                    <>
                      <X className="w-3 h-3" /> Passphrases mismatch
                    </>
                  )}
                </span>
              )}
            </div>

            <div className="relative">
              <ShieldCheck className="w-4 h-4 text-slate-400 absolute left-4 top-1/2 -translate-y-1/2" />
              <input
                type={showConfirmPassword ? 'text' : 'password'}
                required
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="••••••••••••"
                className={`w-full bg-slate-950/70 border rounded-2xl pl-11 pr-11 py-2.5 sm:py-3 text-sm text-slate-100 placeholder:text-slate-600 focus:outline-none transition-all shadow-inner ${
                  isPasswordMismatch
                    ? 'border-red-500/60 focus:border-red-500 focus:ring-1 focus:ring-red-500/30'
                    : isPasswordMatch
                    ? 'border-emerald-500/60 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500/30'
                    : 'border-slate-800 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500/30'
                }`}
              />
              <button
                type="button"
                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white transition-colors"
                title={showConfirmPassword ? 'Hide confirm passphrase' : 'Show confirm passphrase'}
              >
                {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
            {isPasswordMismatch && (
              <p className="text-[11px] text-red-400 mt-1 ml-1">
                Passphrases do not match. Please re-check both fields.
              </p>
            )}
          </div>

          {/* Zero-Knowledge Cryptographic Notice */}
          <div className="p-3 rounded-2xl bg-emerald-950/30 border border-emerald-800/40 text-emerald-300/90 text-[11px] space-y-1 leading-relaxed">
            <div className="flex items-center gap-1.5 font-semibold text-emerald-300">
              <Shield className="w-3.5 h-3.5" />
              <span>Zero-Knowledge Cryptographic Security</span>
            </div>
            <p className="text-slate-400 text-[10px]">
              Your ECDH P-256 private key is generated directly in your browser. Passphrase is authenticated using memory-hard Argon2id. Zero server plaintext.
            </p>
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            disabled={!isFormValid || loading}
            className="w-full py-3 px-4 rounded-2xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white text-sm font-bold flex items-center justify-center gap-2 transition-all shadow-lg shadow-emerald-950/50 hover:shadow-emerald-900/70 active:scale-[0.98] disabled:opacity-40 disabled:cursor-not-allowed mt-2"
          >
            {loading ? (
              <span className="flex items-center gap-2">
                <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                Generating Keys & Registering...
              </span>
            ) : (
              <>
                <span>Register & Generate Identity Key</span>
                <ArrowRight className="w-4 h-4" />
              </>
            )}
          </button>
        </form>

        <p className="text-center text-xs text-slate-400 mt-6 font-medium">
          Already have an account?{' '}
          <Link href="/login" className="text-emerald-400 hover:text-emerald-300 font-bold transition-colors">
            Sign in
          </Link>
        </p>
      </div>
    </div>
  );
}
