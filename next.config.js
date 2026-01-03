/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'export',  // CRITICAL: Enables static export
  
  // Disable image optimization for static export
  images: {
    unoptimized: true,
  },
  
  // Ignore ESLint during build
  eslint: {
    ignoreDuringBuilds: true,
  },
  
  // Ignore TypeScript errors during build
  typescript: {
    ignoreBuildErrors: true,
  },
  
  // Disable React strict mode if causing issues
  reactStrictMode: false,
  
  // Optional: Add trailing slash for better compatibility
  trailingSlash: false,
  
  // Optional: Configure redirects (static export compatible)
  async redirects() {
    return [
      {
        source: '/',
        destination: '/',
        permanent: true,
      },
    ];
  },
}

module.exports = nextConfig