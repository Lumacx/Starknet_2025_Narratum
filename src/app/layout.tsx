import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import GsiScript from "@/components/GsiScript";
import { StarknetProvider } from "@/components/Starknet/StarknetProviderComponent";
import { AuthProvider } from "@/context/AuthContext";
import Header from "@/components/header";
import Footer from "@/components/layout/Footer";
// ✅ add this import (client component)
import KeepAliveProvider from "@/app/providers/KeepAliveProvider";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Narratum",
  description: "Interactive storytelling with AI",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body className={inter.className}>
        <GsiScript />
        <StarknetProvider>
          <AuthProvider>
            {/* ⬇️ attaches listeners only when authenticated */}
            <KeepAliveProvider requireAuth rtdbPath="_meta/keepalive" firestoreDocPath="_meta/keepalive">
              <Header />
              {children}
              <Footer />
            </KeepAliveProvider>
          </AuthProvider>
        </StarknetProvider>
      </body>
    </html>
  );
}
