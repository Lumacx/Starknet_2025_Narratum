import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import GsiScript from "@/components/GsiScript";
import { StarknetProvider } from "@/components/Starknet/StarknetProviderComponent";
import { AuthProvider } from "@/context/AuthContext";
import Header from "@/components/header";
import Footer from "@/components/layout/Footer";
import KeepAliveProvider from "@/app/providers/KeepAliveProvider"; // client
import { PayPalScriptProvider } from "@paypal/react-paypal-js"; // Import PayPalScriptProvider

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Narratum",
  description: "Interactive storytelling with AI",
};

const initialPayPalOptions = {
  clientId: process.env.NEXT_PUBLIC_PAYPAL_CLIENT_ID || "YOUR_PAYPAL_CLIENT_ID", // Replace with your actual client ID or environment variable
  currency: "USD",
  intent: "capture",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={inter.className}>
        {/* Oculta Header/Footer y toolbars cuando el StoryReader aplica html.reader-mode */}
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

        <GsiScript />
        <StarknetProvider>
          <PayPalScriptProvider options={initialPayPalOptions}> {/* Wrap with PayPalScriptProvider */}
            <AuthProvider>
              {/* ⚠️ Tu KeepAliveProvider sólo acepta requireAuth y rtdbPath */}
              <KeepAliveProvider requireAuth rtdbPath="_meta/keepalive">
                <div className="site-header">
                  <Header />
                </div>

                {children}

                <div className="site-footer">
                  <Footer />
                </div>
              </KeepAliveProvider>
            </AuthProvider>
          </PayPalScriptProvider>
        </StarknetProvider>
      </body>
    </html>
  );
}
