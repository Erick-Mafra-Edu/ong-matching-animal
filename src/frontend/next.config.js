/** @type {import('next').NextConfig} */
const { dotenv } = require('dotenv').config({path:'../../.env.local'});
// Carrega as variáveis da raiz do monorepo


console.log(process.env.NEXT_PUBLIC_SUPABASE_URL);
const nextConfig = {
  reactStrictMode: true,
  async rewrites() {
    if (process.env.NODE_ENV === 'development') {
      return {
        beforeFiles: [
          {
            source: '/api/:path*',
            destination: 'http://localhost:3001/api/:path*',
          },
        ],
      };
    }
    return [];
  },
};

module.exports = nextConfig;

