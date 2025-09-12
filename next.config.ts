// next.config.ts
import type { NextConfig } from 'next';
const withBundleAnalyzer = require('@next/bundle-analyzer')({
  enabled: process.env.ANALYZE === 'true',
});

const isDev = process.env.NODE_ENV !== 'production';
const cloudWorkstationsOrigin = process.env.DEV_ORIGIN;
const extraOrigins = (process.env.ALLOWED_DEV_ORIGINS || '')
  .split(',').map((s) => s.trim()).filter(Boolean);

const nextConfig: NextConfig = {
  // Keep speed-ups
  typescript: { ignoreBuildErrors: true },
  eslint: { ignoreDuringBuilds: true },

  /**
   * Reduce client bundle size by rewriting common libs to per-module imports.
   * (Huge impact if using many icons/utilities.)
   */
  experimental: {
    allowedDevOrigins: [
      'http://localhost:3000',
      'http://127.0.0.1:3000',
      'http://10.88.0.3:3000',
      ...(cloudWorkstationsOrigin ? [cloudWorkstationsOrigin] : []),
      ...extraOrigins,
    ],
    optimizePackageImports: ['lucide-react', 'date-fns', 'lodash-es'], // <- helps treeshake
  },

  /**
   * Automatic per-icon imports to avoid bundling all of lucide-react.
   * (If you already import from 'lucide-react/icons/...', you can skip this.)
   */
  modularizeImports: {
    'lucide-react': {
      transform: 'lucide-react/icons/{{member}}',
    },
  },

  images: {
    unoptimized: isDev || process.env.NEXT_IMAGE_UNOPTIMIZED === 'true',
    formats: ['image/avif', 'image/webp'],
    minimumCacheTTL: 60,
    remotePatterns: [
      { protocol: 'https', hostname: 'firebasestorage.googleapis.com', pathname: '/v0/b/**' },
      { protocol: 'https', hostname: 'storage.googleapis.com', pathname: '/**' },
      { protocol: 'https', hostname: 'lh3.googleusercontent.com', pathname: '/**' },
      { protocol: 'https', hostname: 'lh4.googleusercontent.com', pathname: '/**' },
      { protocol: 'https', hostname: 'lh5.googleusercontent.com', pathname: '/**' },
      { protocol: 'https', hostname: 'picsum.photos', pathname: '/**' },
      { protocol: 'https', hostname: 'placehold.co', pathname: '/**' },
    ],
    contentSecurityPolicy: "script-src 'none'; frame-src 'none'; worker-src 'self';",
  },

  env: {
    FIREBASE_PROJECT_ID: process.env.FIREBASE_PROJECT_ID as string,
    FIREBASE_CLIENT_EMAIL: process.env.FIREBASE_CLIENT_EMAIL as string,
    FIREBASE_PRIVATE_KEY: process.env.FIREBASE_PRIVATE_KEY as string,
  },
};

export default withBundleAnalyzer(nextConfig);
