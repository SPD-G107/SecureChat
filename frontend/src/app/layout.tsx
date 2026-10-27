import './globals.css';
import type { Metadata, Viewport } from 'next';
import Navbar from '@/components/layout/Navbar';
import PwaManager from '@/components/pwa/PwaManager';

export const metadata: Metadata = {
  title: 'SecureChat — End-to-End Encrypted Private Messaging',
  description: 'Private, real-time messaging with client-side Web Crypto E2EE and zero API leakage.',
  manifest: '/manifest.json',
  icons: {
    icon: '/favicon.png',
    apple: '/icons/icon-192.png',
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: 'black-translucent',
    title: 'SecureChat',
  },
};

export const viewport: Viewport = {
  themeColor: '#059669',
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="dark">
      <head>
        <link rel="manifest" href="/manifest.json" />
        <meta name="theme-color" content="#059669" />
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
        {/* Shield application against third-party Chrome extension injected errors (e.g. Urban VPN, adblockers) */}
        <script
          dangerouslySetInnerHTML={{
            __html: `
              (function() {
                if (typeof window === 'undefined') return;
                function isExtensionError(err, url) {
                  var str = (url || '') + ' ' + ((err && (err.stack || err.message)) || '');
                  return str.indexOf('chrome-extension://') !== -1 || str.indexOf('moz-extension://') !== -1 || str.indexOf('M_ID') !== -1;
                }
                window.addEventListener('error', function(e) {
                  if (isExtensionError(e.error, e.filename)) {
                    e.stopImmediatePropagation();
                    e.preventDefault();
                    return true;
                  }
                }, true);
                window.addEventListener('unhandledrejection', function(e) {
                  if (isExtensionError(e.reason, '')) {
                    e.stopImmediatePropagation();
                    e.preventDefault();
                    return true;
                  }
                }, true);
              })();
            `,
          }}
        />
      </head>
      <body className="h-screen overflow-hidden flex flex-col bg-[#0b0f19] text-slate-100 antialiased selection:bg-emerald-500/30 selection:text-emerald-200">
        <Navbar />
        <main className="flex-1 flex flex-col min-h-0 h-[calc(100dvh-3.5rem)] max-h-[calc(100dvh-3.5rem)] overflow-y-auto">{children}</main>
        <PwaManager />
      </body>
    </html>
  );
}
