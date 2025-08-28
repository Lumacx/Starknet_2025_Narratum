import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  typescript: { ignoreBuildErrors: true },
  eslint: { ignoreDuringBuilds: true },

  // ✅ Allow cross-origin dev requests (Cloud Workstations, localhost, etc.)
  // Use hostnames/wildcards, no protocol or port.
  allowedDevOrigins: [
    '*.cloudworkstations.dev',
    'localhost',
    '10.88.0.3', // if you access via the LAN IP shown in Next logs
  ],

  images: {
    remotePatterns: [
      { protocol: 'https', hostname: 'picsum.photos', pathname: '/**' },
      { protocol: 'https', hostname: 'placehold.co', pathname: '/**' },
      { protocol: 'https', hostname: 'lh3.googleusercontent.com', pathname: '/**' },
      { protocol: 'https', hostname: 'lh4.googleusercontent.com', pathname: '/**' },
      { protocol: 'https', hostname: 'lh5.googleusercontent.com', pathname: '/**' },
      { protocol: 'https', hostname: 'firebasestorage.googleapis.com', pathname: '/v0/b/**' },
      { protocol: 'https', hostname: 'storage.googleapis.com', pathname: '/**' },
    ],
  },

  experimental: {
    // Only if you call Server Actions from a different origin:
    // serverActions: { allowedOrigins: ['*.cloudworkstations.dev'] },
  },
};

export default nextConfig;
