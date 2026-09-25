const path = require('path');
const { buildSecurityHeaders } = require('./src/lib/securityHeaders.cjs');

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  transpilePackages: ['@nepally/shared'],

  // Pin Turbopack's workspace root to the monorepo root. Without this Next.js
  // infers the root by walking up for a lockfile and can pick a stray
  // package-lock.json outside the repo (e.g. in the user's home directory),
  // which breaks resolution of hoisted deps and @nepally/shared.
  turbopack: {
    root: path.join(__dirname, '..', '..'),
  },

  // Only treat *.page.tsx/ts/jsx/js files as Next.js routes.
  // This prevents colocated *.test.tsx files in src/pages/ from being
  // picked up as routes during `next build`.
  pageExtensions: ['page.tsx', 'page.ts', 'page.jsx', 'page.js'],

  // Use remotePatterns instead of deprecated domains
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'res.cloudinary.com',
      },
      {
        protocol: 'https',
        hostname: '**.supabase.co',
        pathname: '/storage/v1/object/public/**',
      },
      {
        protocol: 'https',
        hostname: 'picsum.photos',
      },
    ],
  },

  async headers() {
    return [
      {
        source: '/:path*',
        headers: buildSecurityHeaders({
          supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL,
          isDev: process.env.NODE_ENV !== 'production',
        }),
      },
    ];
  },
};

module.exports = nextConfig;
