/** @type {import('next').NextConfig} */
const nextConfig = {
  // Required for Railway/Vercel deployment
  output: 'standalone',

  // Allow images from anywhere (app uses raw <img> tags throughout)
  images: {
    unoptimized: true,
  },

  // Environment variable validation at build time
  env: {
    NEXT_PUBLIC_API_URL: process.env.NEXT_PUBLIC_API_URL,
  },

  // ── Bundle optimisation ──────────────────────────────────────────
  // Without explicit cache groups, webpack creates a separate copy of
  // lucide-react (~400 KB) and recharts (~200 KB) inside EVERY page
  // chunk that imports them.  Declaring shared groups here tells
  // webpack to extract them into one vendor chunk that all routes
  // reuse, so the browser downloads and parses each library only once.
  webpack(config, { isServer }) {
    if (!isServer) {
      const existing = config.optimization.splitChunks?.cacheGroups ?? {}
      config.optimization.splitChunks = {
        ...config.optimization.splitChunks,
        cacheGroups: {
          ...existing,
          // lucide-react: icon library used in every page and Sidebar
          lucide: {
            test: /[\\/]node_modules[\\/]lucide-react[\\/]/,
            name: 'vendor-lucide',
            chunks: 'all',
            priority: 30,
            reuseExistingChunk: true,
          },
          // recharts: charting library used in overview, analytics, payroll
          recharts: {
            test: /[\\/]node_modules[\\/](recharts|d3-[a-z-]+|victory-vendor)[\\/]/,
            name: 'vendor-recharts',
            chunks: 'all',
            priority: 25,
            reuseExistingChunk: true,
          },
          // socket.io-client: real-time library used in several dashboard pages
          socketio: {
            test: /[\\/]node_modules[\\/](socket\.io-client|engine\.io-client|@socket\.io)[\\/]/,
            name: 'vendor-socketio',
            chunks: 'all',
            priority: 20,
            reuseExistingChunk: true,
          },
        },
      }
    }
    return config
  },
}

module.exports = nextConfig
