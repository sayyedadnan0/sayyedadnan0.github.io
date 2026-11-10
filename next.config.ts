import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  turbopack: {},
  poweredByHeader: false,
  // Enable experimental features
  experimental: {
    // For server components
  },
  images: {
    remotePatterns: [],
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
