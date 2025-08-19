import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  // ⚠️ Deja esto si lo necesitas para avanzar en dev
  typescript: { ignoreBuildErrors: true },
  eslint: { ignoreDuringBuilds: true },

  // 🖼️ Soporte para imágenes remotas (si usas <Image />)
  images: {
    remotePatterns: [
      { protocol: 'https', hostname: 'picsum.photos', port: '', pathname: '/**' },
      { protocol: 'https', hostname: 'placehold.co', port: '', pathname: '/**' },
      // Google profile pictures pueden venir de lh3, lh4 o lh5
      { protocol: 'https', hostname: 'lh3.googleusercontent.com', port: '', pathname: '/**' },
      { protocol: 'https', hostname: 'lh4.googleusercontent.com', port: '', pathname: '/**' },
      { protocol: 'https', hostname: 'lh5.googleusercontent.com', port: '', pathname: '/**' },
    ],
  },

  experimental: {
    // ✅ Permite tus orígenes proxied en dev (Cloud Workstations)
    allowedDevOrigins: [
      'https://3000-idx-studio-1746560064210.cluster-f4iwdviaqvc2ct6pgytzw4xqy4.cloudworkstations.dev',
      'https://9003-idx-studio-1746560064210.cluster-f4iwdviaqvc2ct6pgytzw4xqy4.cloudworkstations.dev',
    ],
    // (Opcional) solo si usas Server Actions llamadas desde ese origen
    // serverActions: { allowedOrigins: ['https://3000-idx-studio-1746...cloudworkstations.dev'] },
  },
};

export default nextConfig;
