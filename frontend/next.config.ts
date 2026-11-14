import type { NextConfig } from 'next';

const backendUrl = process.env.BACKEND_URL || 'http://127.0.0.1:8001';

const config: NextConfig = {
  allowedDevOrigins: ['192.168.1.208'],
  // Illustrator (.ai) uploads go through the /api proxy and can be up to 50 MB; the default cap is 10 MB.
  experimental: { proxyClientMaxBodySize: '55mb' },
  async rewrites() {
    return [{ source: '/api/:path*', destination: `${backendUrl}/:path*` }];
  },
};

export default config;
