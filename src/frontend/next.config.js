/** @type {import('next').NextConfig} */
const path = require('path');
require('dotenv').config({ path: '../../.env.local' });
// Carrega as variáveis da raiz do monorepo

const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL?.replace(/\/+$/, '');

const connectSources = ["'self'"];

if (backendUrl) {
  connectSources.push(backendUrl);
}

if (process.env.NEXT_PUBLIC_SUPABASE_URL) {
  connectSources.push(process.env.NEXT_PUBLIC_SUPABASE_URL);
}

const contentSecurityPolicy = [
  "default-src 'self'",
  "base-uri 'self'",
  "frame-ancestors 'none'",
  "form-action 'self'",
  "object-src 'none'",
  "img-src 'self' data: blob: https:",
  "font-src 'self' data:",
  "style-src 'self' 'unsafe-inline'",
  `script-src 'self' 'unsafe-inline'${process.env.NODE_ENV === 'development' ? " 'unsafe-eval'" : ''}`,
  `connect-src ${connectSources.join(' ')}`,
].join('; ');

const securityHeaders = [
  {
    key: 'Content-Security-Policy',
    value: contentSecurityPolicy,
  },
  {
    key: 'X-Content-Type-Options',
    value: 'nosniff',
  },
  {
    key: 'X-Frame-Options',
    value: 'DENY',
  },
  {
    key: 'Referrer-Policy',
    value: 'strict-origin-when-cross-origin',
  },
  {
    key: 'Permissions-Policy',
    value: 'camera=(), microphone=(), geolocation=(), payment=()',
  },
];

const nextConfig = {
  reactStrictMode: true,
  skipMiddlewareUrlNormalize: true,
  async headers() {
    return [
      {
        source: '/:path*',
        headers: securityHeaders,
      },
    ];
  },
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
    }else{
      return {
        beforeFiles: [
          {
            source: '/api/:path*',
            destination: `${process.env.NEXT_PUBLIC_BACKEND_URL}/api/:path*`,
          },
        ],
      };
    }

  },
  webpack(config) {
    config.resolve.alias['@vercel/flags-definitions'] = path.resolve(__dirname, 'lib/flags-definitions.ts');
    return config;
  },
};

module.exports = nextConfig;

