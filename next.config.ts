import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  typescript: { ignoreBuildErrors: true },
  eslint: { ignoreDuringBuilds: true },
  images: {
    remotePatterns: [
      { protocol: 'https', hostname: 'picsum.photos', pathname: '/**' },
      { protocol: 'https', hostname: 'placehold.co', pathname: '/**' },
      // Google profile photos
      { protocol: 'https', hostname: 'lh3.googleusercontent.com', pathname: '/**' },
      { protocol: 'https', hostname: 'lh4.googleusercontent.com', pathname: '/**' },
      { protocol: 'https', hostname: 'lh5.googleusercontent.com', pathname: '/**' },
      // Firebase Storage public URLs
      { protocol: 'https', hostname: 'firebasestorage.googleapis.com', pathname: '/v0/b/**' },
      { protocol: 'https', hostname: 'storage.googleapis.com', pathname: '/**' },
    ],
  },
  experimental: {
    allowedDevOrigins: [
      'https://3000-idx-studio-1746560064210.cluster-f4iwdviaqvc2ct6pgytzw4xqy4.cloudworkstations.dev',
      'https://9003-idx-studio-1746560064210.cluster-f4iwdviaqvc2ct6pgytzw4xqy4.cloudworkstations.dev',
      'http://localhost:3000', // Added for completeness
    ],
  },
};

export default nextConfig;
