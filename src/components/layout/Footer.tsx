'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

const Footer: React.FC = () => {
  const pathname = usePathname();

  // Hide footer on auth pages like login/signup, or dashboard if it has its own layout
  if (['/login', '/signup'].includes(pathname)) {
    return null;
  }

  return (
    <footer className="fixed bottom-0 left-0 right-0 bg-gray-800 text-white p-4 flex justify-around items-center shadow-lg z-50">
      <Link href="/about" className="flex flex-col items-center text-sm font-semibold text-gray-300 hover:text-white transition-colors duration-200">
        <i className="fas fa-info-circle text-xl mb-1"></i>
        <span>About Us</span>
      </Link>
      <Link href="/subscription" className="flex flex-col items-center text-sm font-semibold text-gray-300 hover:text-white transition-colors duration-200">
        <i className="fas fa-dollar-sign text-xl mb-1"></i>
        <span>Subscription</span>
      </Link>
      <Link href="/dashboard" className="flex flex-col items-center text-sm font-semibold text-gray-300 hover:text-white transition-colors duration-200">
        <i className="fas fa-tachometer-alt text-xl mb-1"></i>
        <span>Dashboard</span>
      </Link>
      <Link href="/legal" className="flex flex-col items-center text-sm font-semibold text-gray-300 hover:text-white transition-colors duration-200">
        <i className="fas fa-balance-scale text-xl mb-1"></i>
        <span>Legal</span>
      </Link>
    </footer>
  );
};

export default Footer;
