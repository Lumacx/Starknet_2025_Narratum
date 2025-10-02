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
      { protocol: 'https', hostname: 'img.youtube.com', pathname: '/**' },
      { protocol: 'https', hostname: 'i.ytimg.com', pathname: '/**' },
      { protocol: 'https', hostname: 'picsum.photos', pathname: '/**' },
      { protocol: 'https', hostname: 'placehold.co', pathname: '/**' },
    ],
  },

  async headers() {
    const CSP = `
  default-src 'self';
  base-uri 'self';
  object-src 'none';
  frame-ancestors 'self';

  script-src 'self' 'unsafe-inline' 'unsafe-eval' blob:
    https://www.paypal.com https://*.paypal.com https://*.paypalobjects.com
    https://www.gstatic.com https://www.googletagmanager.com https://www.googleapis.com
    https://accounts.google.com https://apis.google.com
    https://www.youtube.com https://s.ytimg.com;

  script-src-elem 'self' 'unsafe-inline' 'unsafe-eval' blob:
    https://www.paypal.com https://*.paypal.com https://*.paypalobjects.com
    https://www.gstatic.com https://www.googletagmanager.com https://www.googleapis.com
    https://accounts.google.com https://apis.google.com
    https://www.youtube.com https://s.ytimg.com;

  connect-src 'self'
    https://www.paypal.com https://*.paypal.com https://*.paypalobjects.com
    https://securetoken.googleapis.com
    https://identitytoolkit.googleapis.com
    https://oauth2.googleapis.com
    https://accounts.google.com https://apis.google.com
    https://firestore.googleapis.com
    https://firebasestorage.googleapis.com
    https://www.googleapis.com https://*.googleapis.com
    https://*.cloudfunctions.net
    https://*.firebaseio.com
    wss://*.firebaseio.com;

  img-src 'self' data: blob:
    https://*.paypal.com https://*.paypalobjects.com
    https://firebasestorage.googleapis.com https://storage.googleapis.com
    https://lh3.googleusercontent.com https://lh4.googleusercontent.com https://lh5.googleusercontent.com
    https://picsum.photos https://placehold.co
    https://accounts.google.com
    https://img.youtube.com https://i.ytimg.com;

  media-src 'self' data: blob:
    https://firebasestorage.googleapis.com https://storage.googleapis.com;

  frame-src 'self'
    https://www.paypal.com https://*.paypal.com https://*.paypalobjects.com
    https://accounts.google.com
    https://*.firebaseio.com
    https://www.youtube.com https://*.youtube.com https://youtu.be;

  style-src 'self' 'unsafe-inline' https://*.paypal.com https://fonts.googleapis.com
   https://accounts.google.com https://apis.google.com https://www.gstatic.com;
  font-src 'self' https://fonts.gstatic.com;

  worker-src 'self' blob:;
  form-action 'self' https://www.paypal.com https://*.paypal.com;

  block-all-mixed-content; upgrade-insecure-requests;
`.replace(/\s{2,}/g, ' ').trim();

    return [
      {
        source: '/(.*)',
        headers: [{ key: 'Content-Security-Policy', value: CSP }],
      },
    ];
  },

  webpack: (config, { dev }) => {
    if (!dev) {
      (config as any).cache = { type: 'filesystem', cacheDirectory: '/tmp/webpack-cache' };
    }
    (config as any).ignoreWarnings = [
      { module: /handlebars/ },
      { module: /require-in-the-middle/ },
      { module: /@whatwg-node\/fetch/ },
    ];
    return config;
  },
};

export default withBundleAnalyzer(nextConfig);
