// src/app/layout.tsx
import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import GsiScript from "@/components/GsiScript";
import { StarknetProvider } from "@/components/Starknet/StarknetProviderComponent";
import { AuthProvider } from "@/context/AuthContext";
import Header from "@/components/header";
import Footer from "@/components/layout/Footer";
import KeepAliveProvider from "@/app/providers/KeepAliveProvider";
import PayPalProviderClient from "@/components/PayPalProviderClient";
import { Suspense } from "react";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Narratum",
  description: "Interactive storytelling with AI",
  // Optional: icon, themeColor, etc.
};

const initialPayPalOptions = {
  clientId: process.env.NEXT_PUBLIC_PAYPAL_CLIENT_ID ?? "test",
  currency: "USD",
  intent: "capture",
} as const;

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const isProd = process.env.NODE_ENV === "production";

  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        {/* basic meta for consistent layout on all devices */}
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        {/* preconnects to speed up fonts and common CDNs */}
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://firebasestorage.googleapis.com" />
        <link rel="preconnect" href="https://storage.googleapis.com" />
      </head>

      <body className={inter.className}>
        {/* Hide chrome in reader-mode */}
        <style
          // eslint-disable-next-line react/no-danger
          dangerouslySetInnerHTML={{
            __html: `
              html.reader-mode .site-header,
              html.reader-mode .site-footer,
              html.reader-mode .subscriptions-bar,
              html.reader-mode .global-toolbar,
              html.reader-mode .floating-toolbar {
                display: none !important;
              }
            `,
          }}
        />

        {/* Dev-only: surface silent client errors that can cause "Loading..." forever */}
        {!isProd && (
          <script
            // eslint-disable-next-line react/no-danger
            dangerouslySetInnerHTML={{
              __html: `
                (function () {
                  if (window.__dbgHooks) return; window.__dbgHooks = true;
                  window.addEventListener('error', e => {
                    console.log('[window error]', e.error || e.message);
                  });
                  window.addEventListener('unhandledrejection', e => {
                    console.log('[unhandledrejection]', e.reason);
                  });
                })();
              `,
            }}
          />
        )}

        {/* Google Identity Services (client) */}
        <GsiScript />

        {/* App providers */}
        <StarknetProvider>
          <AuthProvider>
            {/* KeepAlive needs client; keep it inside Auth */}
            <KeepAliveProvider requireAuth rtdbPath="_meta/keepalive">
              <div className="site-header">
                <Suspense fallback={<div style={{ height: 56 }} />}>
                  <Header />
                </Suspense>
              </div>

              {/* PayPal provider is client-only; options are safe (public clientId) */}
              <PayPalProviderClient options={initialPayPalOptions}>
                <Suspense fallback={<div className="min-h-[40vh] flex items-center justify-center">Loading…</div>}>
                  {children}
                </Suspense>
              </PayPalProviderClient>

              <div className="site-footer">
                <Suspense fallback={null}>
                  <Footer />
                </Suspense>
              </div>
            </KeepAliveProvider>
          </AuthProvider>
        </StarknetProvider>
      </body>
    </html>
  );
}
