/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  transpilePackages: ['@nusa/shared'],

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
    ],
  },

};

module.exports = nextConfig;
