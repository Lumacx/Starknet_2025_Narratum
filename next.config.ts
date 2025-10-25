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
    const scriptSrc = [
      "'self'",
      "'unsafe-inline'",
      ...(isDev ? ["'unsafe-eval'"] : []), // dev-only for Fast Refresh
      'blob:',
      // PayPal SDK
      'https://www.paypal.com',
      'https://www.sandbox.paypal.com',
      'https://www.paypalobjects.com',
      // Firebase + GSI
      'https://*.firebaseio.com',
      'https://www.gstatic.com',
      'https://accounts.google.com',
      'https://apis.google.com',
      // YouTube (some SDKs touch these)
      'https://www.youtube.com',
      'https://s.ytimg.com',
    ].join(' ');

    const scriptSrcElem = scriptSrc;

    const connectSrc = [
      "'self'",
      // PayPal APIs
      'https://api-m.paypal.com',
      'https://api-m.sandbox.paypal.com',
      'https://www.paypal.com',
      'https://www.paypalobjects.com',
      // Firebase / Google
      'https://securetoken.googleapis.com',
      'https://identitytoolkit.googleapis.com',
      'https://firestore.googleapis.com',
      'https://firebasestorage.googleapis.com',
      'https://storage.googleapis.com',
      'https://www.googleapis.com',
      'https://*.googleapis.com',
      'https://*.firebaseio.com',
      'wss://*.firebaseio.com',
      // Cloud Functions (narratum, us-central1)
      'https://us-central1-narratum.cloudfunctions.net',
      // ElevenLabs
      'https://api.elevenlabs.io',
      'https://*.elevenlabs.io',
    ].join(' ');

    const imgSrc = [
      "'self'",
      'data:',
      'blob:',
      'https://www.paypal.com',
      'https://www.paypalobjects.com',
      'https://firebasestorage.googleapis.com',
      'https://storage.googleapis.com',
      'https://lh3.googleusercontent.com',
      'https://lh4.googleusercontent.com',
      'https://lh5.googleusercontent.com',
      'https://img.youtube.com',
      'https://i.ytimg.com',
      'https://picsum.photos',
      'https://placehold.co',
      'https://accounts.google.com',
    ].join(' ');

    const frameSrc = [
      "'self'",
      // PayPal buttons/frames
      'https://www.paypal.com',
      'https://www.sandbox.paypal.com',
      // YouTube embeds
      'https://www.youtube.com',
      'https://youtube.com',
      'https://youtu.be',
      // **Fix:** Firebase RTDB hidden iframe + GSI iframes
      'https://*.firebaseio.com',
      'https://accounts.google.com',
    ].join(' ');

    const styleSrc = [
      "'self'",
      "'unsafe-inline'",
      'https://fonts.googleapis.com',
      'https://www.gstatic.com',
      'https://accounts.google.com',
      'https://apis.google.com',
      'https://www.paypal.com',
    ].join(' ');

    const csp = [
      "default-src 'self'",
      "base-uri 'self'",
      "object-src 'none'",
      "frame-ancestors 'self'",
      `script-src ${scriptSrc}`,
      `script-src-elem ${scriptSrcElem}`,
      `connect-src ${connectSrc}`,
      `img-src ${imgSrc}`,
      "media-src 'self' data: blob: https://firebasestorage.googleapis.com https://storage.googleapis.com",
      `frame-src ${frameSrc}`,
      `style-src ${styleSrc}`,
      "font-src 'self' https://fonts.gstatic.com",
      "worker-src 'self' blob:",
      "form-action 'self' https://www.paypal.com https://www.sandbox.paypal.com",
      'upgrade-insecure-requests',
    ].join('; ');

    const permissions = [
      'geolocation=()',
      'camera=()',
      'microphone=()',
      'payment=(self "https://www.paypal.com" "https://www.sandbox.paypal.com")',
    ].join(', ');

    return [
      {
        source: '/:path*',
        headers: [
          { key: 'Content-Security-Policy', value: csp },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'X-Frame-Options', value: 'SAMEORIGIN' },
          { key: 'Permissions-Policy', value: permissions },
        ],
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
