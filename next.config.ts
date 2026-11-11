import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  turbopack: {},
  ...(process.env.STATIC_EXPORT === 'true' ? { output: 'export' as const, trailingSlash: true } : {}),
  poweredByHeader: false,
  // Enable experimental features
  experimental: {
    // For server components
  },
  images: {
    unoptimized: process.env.STATIC_EXPORT === 'true',
    remotePatterns: process.env.SUPABASE_URL ? [{ protocol: 'https', hostname: new URL(process.env.SUPABASE_URL).hostname, pathname: '/storage/v1/object/public/portfolio-media/**' }] : [],
    formats: ['image/avif', 'image/webp'],
  },
  // For Three.js and WebGL
  webpack: (config, { isServer }) => {
    if (!isServer) {
      config.resolve.fallback = {
        ...config.resolve.fallback,
        fs: false,
        net: false,
        tls: false,
      };
    }
    // Allow GLSL shader imports
    config.module.rules.push({
      test: /\.(glsl|vs|fs|vert|frag)$/,
      use: ['raw-loader'],
    });
    return config;
  },
  // Headers for security
  async headers() {
    if (process.env.STATIC_EXPORT === 'true') return []
    return [
      {
        source: '/admin/:path*',
        headers: [
          {
            key: 'X-Robots-Tag',
            value: 'noindex, nofollow',
          },
        ],
      },
      {
        source: '/api/:path*',
        headers: [
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff',
          },
        ],
      },
    ];
  },
};

export default nextConfig;
