// next.config.ts
import type { NextConfig } from 'next';
const withBundleAnalyzer = require('@next/bundle-analyzer')({
  enabled: process.env.ANALYZE === 'true',
});

const isDev = process.env.NODE_ENV !== 'production';
const cloudWorkstationsOrigin = process.env.DEV_ORIGIN;
const extraOrigins = (process.env.ALLOWED_DEV_ORIGINS || '')
  .split(',')
  .map((s) => s.trim())
  .filter(Boolean);

const computedAllowed = [
  'http://localhost:3000',
  'http://127.0.0.1:3000',
  'http://10.88.0.3:3000',
  ...(cloudWorkstationsOrigin ? [cloudWorkstationsOrigin] : []),
  ...extraOrigins,
];

// helpful debug: see the exact list on boot
// (safe in dev; remove if noisy)
if (isDev) {
  // eslint-disable-next-line no-console
  console.log('[next.config] allowedDevOrigins:', computedAllowed);
}

const nextConfig: NextConfig = {
  typescript: { ignoreBuildErrors: true },
  eslint: { ignoreDuringBuilds: true },

  serverExternalPackages: [
    'graphql-yoga',
    '@whatwg-node/fetch',
    'genkit',
    '@genkit-ai/core',
    '@opentelemetry/api',
    '@opentelemetry/instrumentation',
    '@opentelemetry/sdk-node',
    'require-in-the-middle',
    'handlebars',
    'dotprompt',
  ],

  experimental: {
    allowedDevOrigins: computedAllowed,
    optimizePackageImports: ['lucide-react', 'date-fns', 'lodash-es'],
  },

  modularizeImports: {
    'lucide-react': { transform: 'lucide-react/icons/{{member}}' },
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

  webpack: (config, { dev }) => {
    if (!dev) {
      config.cache = { type: 'filesystem', cacheDirectory: '/tmp/webpack-cache' };
    }
    config.ignoreWarnings = [
      { module: /handlebars/ },
      { module: /require-in-the-middle/ },
      { module: /@whatwg-node\/fetch/ },
    ];
    return config;
  },
};

export default withBundleAnalyzer(nextConfig);
