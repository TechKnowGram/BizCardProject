import type { NextConfig } from 'next';

const backendUrl = process.env.BACKEND_URL || 'http://127.0.0.1:8001';

const config: NextConfig = {
  allowedDevOrigins: ['192.168.1.208'],
  async rewrites() {
    return [{ source: '/api/:path*', destination: `${backendUrl}/:path*` }];
  },
};

export default config;
