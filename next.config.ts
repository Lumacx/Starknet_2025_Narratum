import type { NextConfig } from 'next';

const isDev = process.env.NODE_ENV !== 'production';

// Optional: put one origin in DEV_ORIGIN or a comma-separated list in ALLOWED_DEV_ORIGINS
const cloudWorkstationsOrigin = process.env.DEV_ORIGIN; // e.g. https://3000-idx-...cloudworkstations.dev
const extraOrigins = (process.env.ALLOWED_DEV_ORIGINS || '')
  .split(',')
  .map((s) => s.trim())
  .filter(Boolean);

const nextConfig: NextConfig = {
  // Keep these if you need them
  typescript: { ignoreBuildErrors: true },
  eslint: { ignoreDuringBuilds: true },

  images: {
    /**
     * Fix timeouts in dev by skipping the optimizer.
     * You can force it on any env with NEXT_IMAGE_UNOPTIMIZED=true
     */
    unoptimized: isDev || process.env.NEXT_IMAGE_UNOPTIMIZED === 'true',

    // Small perf wins when optimization IS enabled (prod)
    formats: ['image/avif', 'image/webp'],
    minimumCacheTTL: 60, // cache successful fetches for a minute

    // Allow Next/Image to fetch from these CDNs
    remotePatterns: [
      { protocol: 'https', hostname: 'firebasestorage.googleapis.com', pathname: '/v0/b/**' },
      { protocol: 'https', hostname: 'storage.googleapis.com', pathname: '/**' },
      { protocol: 'https', hostname: 'lh3.googleusercontent.com', pathname: '/**' },
      { protocol: 'https', hostname: 'lh4.googleusercontent.com', pathname: '/**' },
      { protocol: 'https', hostname: 'lh5.googleusercontent.com', pathname: '/**' },
      { protocol: 'https', hostname: 'picsum.photos', pathname: '/**' },
      { protocol: 'https', hostname: 'placehold.co', pathname: '/**' },
    ],

    // (Optional) tighten CSP for the image optimizer route
    contentSecurityPolicy: "script-src 'none'; frame-src 'none'; worker-src 'self';",
  },

  experimental: {
    /**
     * Allow dev access from external origins (e.g., Cloud Workstations).
     * Add/update without editing code by setting DEV_ORIGIN or ALLOWED_DEV_ORIGINS.
     */
    allowedDevOrigins: [
      'http://localhost:3000',
      'http://127.0.0.1:3000',
      'http://10.88.0.3:3000', // the LAN IP Next printed
      ...(cloudWorkstationsOrigin ? [cloudWorkstationsOrigin] : []),
      ...extraOrigins,
    ],
    // If you end up using server actions cross-origin, you may also need:
    // serverActions: { allowedOrigins: [cloudWorkstationsOrigin!, ...extraOrigins] },
  },
};

export default nextConfig;
