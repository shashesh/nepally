/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  transpilePackages: ['@unhn/shared'],
  images: {
    domains: ['res.cloudinary.com'], // Cloudinary for image hosting
  },
  // Enable experimental features for better performance
  experimental: {
    optimizeCss: true,
  },
};

module.exports = nextConfig;
