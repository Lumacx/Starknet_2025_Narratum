import type {NextConfig} from 'next';

const nextConfig: NextConfig = {
  /* config options here */
  typescript: {
    ignoreBuildErrors: true,
  },
  eslint: {
    ignoreDuringBuilds: true,
  },
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'picsum.photos',
        port: '',
        pathname: '/**',
      },
    ],
  },
  experimental: {
    allowedDevOrigins: ["3000-idx-studio-1746560064210.cluster-f4iwdviaqvc2ct6pgytzw4xqy4.cloudworkstations.dev", "9003-idx-studio-1746560064210.cluster-f4iwdviaqvc2ct6pgytzw4xqy4.cloudworkstations.dev"],
  },
};

export default nextConfig;