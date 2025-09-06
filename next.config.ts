import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  // Mantén esto si ya lo necesitas
  typescript: { ignoreBuildErrors: true },
  eslint: { ignoreDuringBuilds: true },

  // <Image/> podrá servir imágenes remotas desde estos hosts
  images: {
    remotePatterns: [
      { protocol: 'https', hostname: 'firebasestorage.googleapis.com', pathname: '/v0/b/**' },
      { protocol: 'https', hostname: 'storage.googleapis.com', pathname: '/**' },
      { protocol: 'https', hostname: 'lh3.googleusercontent.com', pathname: '/**' },
      { protocol: 'https', hostname: 'lh4.googleusercontent.com', pathname: '/**' },
      { protocol: 'https', hostname: 'lh5.googleusercontent.com', pathname: '/**' },
      { protocol: 'https', hostname: 'picsum.photos', pathname: '/**' },
      { protocol: 'https', hostname: 'placehold.co', pathname: '/**' },
    ],
  },

  experimental: {
    /**
     * Habilita abrir la app desde dominios externos de dev (Cloud Workstations).
     * Usa orígenes completos. Si cambia el subdominio, añade el nuevo aquí.
     */
    allowedDevOrigins: [
      'http://localhost:3000',
      'http://10.88.0.3:3000', // la IP que te muestra Next en consola
      'https://3000-idx-studio-1746560064210.cluster-f4iwdviaqvc2ct6pgytzw4xqy4.cloudworkstations.dev'
      // Si tu instancia cambia mucho de subdominio, añade el nuevo valor cuando aparezca en el warning
    ],
    // Si llegas a usar Server Actions cross-origin, podrías necesitar:
    // serverActions: { allowedOrigins: ['https://3000-idx-studio-...cloudworkstations.dev'] },
  },
};

export default nextConfig;
