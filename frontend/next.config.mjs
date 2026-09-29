const backendUrl =
  process.env.BACKEND_URL || 'http://127.0.0.1:8000';

export default {
  allowedDevOrigins: ['192.168.1.208'],

  async rewrites() {
    return [
      {
        source: '/api/:path*',
        destination: `${backendUrl}/:path*`,
      },
    ];
  },
};