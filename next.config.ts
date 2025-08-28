import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  typescript: { ignoreBuildErrors: true },
  eslint: { ignoreDuringBuilds: true },

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
    // ✅ Must live under `experimental`
    allowedDevOrigins: [
      'localhost',              // local dev
      '10.88.0.3',              // LAN IP shown in Next logs
      // paste the EXACT hostname shown in the console warning (no protocol/port)
      '3000-idx-studio-1746560064210.cluster-f4iwdviaqvc2ct6pgytzw4xqy4.cloudworkstations.dev',
      // wildcards are okay to keep if you bounce hosts often:
      '*.cloudworkstations.dev',
    ],
    // serverActions: { allowedOrigins: ['*.cloudworkstations.dev'] }, // only if you use SA cross-origin
  },
};

export default nextConfig;
