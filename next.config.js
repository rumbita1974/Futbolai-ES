/** @type {import('next').NextConfig} */
const nextConfig = {
  // REMOVED i18n configuration - causing conflict with custom LanguageContext
  // Your custom LanguageContext handles translations, so Next.js i18n is not needed
  
  // Disable image optimization if needed
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
  
  // REMOVED: redirects function since it's not needed and causes warnings
  // async redirects() {
  //   return [
  //     {
  //       source: '/',
  //       destination: '/',
  //       permanent: true,
  //     },
  //   ];
  // },
}

module.exports = nextConfig;