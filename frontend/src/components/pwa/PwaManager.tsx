'use client';

import React, { useEffect, useState } from 'react';
import { Download, Sparkles, X, Laptop } from 'lucide-react';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

export default function PwaManager() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [showInstallBanner, setShowInstallBanner] = useState(false);
  const [isDismissed, setIsDismissed] = useState(false);

  useEffect(() => {
    // 1. Register Service Worker on client load
    if (typeof window !== 'undefined' && 'serviceWorker' in navigator) {
      navigator.serviceWorker
        .register('/sw.js')
        .then((reg) => {
          // Check for service worker updates periodically
          reg.update().catch(() => {});
        })
        .catch((err) => {
          console.warn('PWA service worker registration notice:', err);
        });
    }

    // 2. Capture Chrome & Edge PWA install prompt
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      const promptEvent = e as BeforeInstallPromptEvent;
      setDeferredPrompt(promptEvent);

      // Notify other components (like Navbar) that app can be installed
      window.dispatchEvent(
        new CustomEvent('securechat_pwa_installable', {
          detail: promptEvent,
        })
      );

      // Show banner if not dismissed previously in this session
      const dismissed = sessionStorage.getItem('securechat_pwa_banner_dismissed');
      if (!dismissed) {
        setShowInstallBanner(true);
      }
    };

    // 3. Listen for successful installation
    const handleAppInstalled = () => {
      setDeferredPrompt(null);
      setShowInstallBanner(false);
      window.dispatchEvent(new Event('securechat_pwa_installed'));
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    window.addEventListener('appinstalled', handleAppInstalled);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('appinstalled', handleAppInstalled);
    };
  }, []);

  const handleInstallClick = async () => {
    if (!deferredPrompt) return;
    await deferredPrompt.prompt();
    const choice = await deferredPrompt.userChoice;
    if (choice.outcome === 'accepted') {
      setShowInstallBanner(false);
    }
    setDeferredPrompt(null);
  };

  const handleDismiss = () => {
    setShowInstallBanner(false);
    setIsDismissed(true);
    sessionStorage.setItem('securechat_pwa_banner_dismissed', 'true');
  };

  if (!showInstallBanner || !deferredPrompt || isDismissed) {
    return null;
  }

  return (
    <div className="fixed bottom-4 right-4 z-50 max-w-sm w-[calc(100%-2rem)] p-4 rounded-2xl bg-slate-900/95 border border-emerald-500/40 shadow-2xl backdrop-blur-md animate-in slide-in-from-bottom-5 duration-300">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center text-white shadow-lg shadow-emerald-500/20 shrink-0">
            <Laptop className="w-5 h-5" />
          </div>
          <div>
            <h4 className="text-xs font-bold text-white flex items-center gap-1.5">
              <span>Install SecureChat App</span>
              <span className="px-1.5 py-0.2 rounded bg-emerald-500/20 text-emerald-300 text-[9px] font-mono">
                PWA
              </span>
            </h4>
            <p className="text-[11px] text-slate-400 mt-0.5 leading-snug">
              Install directly onto Chrome/Windows for a standalone desktop window and instant launch.
            </p>
          </div>
        </div>
        <button
          onClick={handleDismiss}
          className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition-colors"
          title="Dismiss install banner"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      <div className="flex items-center gap-2 mt-3 pt-2 border-t border-slate-800">
        <button
          onClick={handleInstallClick}
          className="flex-1 py-1.5 px-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs flex items-center justify-center gap-1.5 transition-all shadow-md shadow-emerald-950/40 active:scale-95"
        >
          <Download className="w-3.5 h-3.5" />
          <span>Install Now</span>
        </button>
        <button
          onClick={handleDismiss}
          className="py-1.5 px-3 rounded-xl text-slate-400 hover:text-white text-xs hover:bg-slate-800 transition-colors font-medium"
        >
          Later
        </button>
      </div>
    </div>
  );
}
