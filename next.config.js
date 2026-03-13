/** @type {import('next').NextConfig} */
const nextConfig = {
  // Required for Railway/Vercel deployment
  output: 'standalone',
  
  // Allow images from anywhere
  images: {
    unoptimized: true,
  },

  // Environment variable validation at build time
  env: {
    NEXT_PUBLIC_API_URL: process.env.NEXT_PUBLIC_API_URL,
  },
}

module.exports = nextConfig
