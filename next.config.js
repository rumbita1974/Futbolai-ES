/** @type {import('next').NextConfig} */
const nextConfig = {
  // REMOVED: output: 'export', - This was causing API routes to fail
  
  images: {
    // Allow remote images from TheSportsDB and other sources
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'www.thesportsdb.com',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'img.a.transfermarkt.technology',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'flagcdn.com',
        pathname: '/**',
      },
    ],
  },

  eslint: {
    ignoreDuringBuilds: true,
  },

  typescript: {
    ignoreBuildErrors: true,
  },

  reactStrictMode: false,

  trailingSlash: false,
}

module.exports = nextConfig