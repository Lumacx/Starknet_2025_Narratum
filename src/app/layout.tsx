'use client';

import type { Metadata } from 'next';
import { usePathname } from 'next/navigation';
import './globals.css'; 
import { AuthProvider } from '@/context/AuthContext';
import Footer from '@/components/layout/Footer';
import Header from '@/components/header';
import { StarknetProviderComponent } from "@/components/Starknet/StarknetProviderComponent";

interface RootLayoutProps {
  children: React.ReactNode;
}

export default function RootLayout({ children }: RootLayoutProps) {
  const pathname = usePathname();
  const showHeader = pathname === '/';

  return (
    <html lang="en">
      <head>
        <title>Narratum</title>
        <meta name="description" content="Where your words come to life" />
        <link 
            rel="stylesheet" 
            href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.1/css/all.min.css" 
            integrity="sha512-DTOQO9RWCH3ppGqcWaEA1BIZOC6xxalwEsw9c2QQeAIftl+Vegovlnee1c9QX4TctnWMn13TZye+giMm8e2LwA==" 
            crossOrigin="anonymous" 
            referrerPolicy="no-referrer" 
          />
      </head>
      <body>
        <AuthProvider>
          <StarknetProviderComponent>
            <div className="flex flex-col min-h-screen">
              {showHeader && <Header />}
              <main className={`flex-grow ${!showHeader ? 'pt-0' : ''}`}>
                {children}
              </main>
              <Footer />
            </div>
          </StarknetProviderComponent>
        </AuthProvider>
      </body>
    </html>
  );
}
