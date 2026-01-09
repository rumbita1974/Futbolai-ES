import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import MobileNav from '@/components/MobileNav';
import LanguageToggle from '@/components/LanguageToggle';
import { LanguageProvider } from '@/context/LanguageContext';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: {
    default: 'FutbolAI Explorer | AI-Powered Football Intelligence',
    template: '%s | FutbolAI Explorer',
  },
  description: 'AI-powered football intelligence with detailed stats, achievements, and video highlights for World Cup 2026. Real-time analysis powered by GROQ AI and Wikipedia.',
  keywords: [
    'football',
    'soccer',
    'World Cup 2026',
    'AI analysis',
    'player stats',
    'team analysis',
    'football highlights',
    'Cristiano Ronaldo',
    'Lionel Messi',
    'Kylian Mbappé',
    'football statistics',
    'football intelligence',
    'soccer analytics'
  ],
  authors: [{ name: 'A. Guillen' }],
  creator: 'FutbolAI',
  publisher: 'FutbolAI',
  formatDetection: {
    email: false,
    address: false,
    telephone: false,
  },
  metadataBase: new URL('https://www.futbolai.org'),
  alternates: {
    canonical: '/',
    languages: {
      'en': 'https://www.futbolai.org/en',
      'es': 'https://www.futbolai.org/es',
    },
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-video-preview': -1,
      'max-image-preview': 'large',
      'max-snippet': -1,
    },
  },
  openGraph: {
    type: 'website',
    locale: 'en_US',
    url: 'https://www.futbolai.org',
    title: 'FutbolAI Explorer | AI-Powered Football Intelligence',
    description: 'AI-powered football intelligence with detailed stats, achievements, and video highlights for World Cup 2026',
    siteName: 'FutbolAI Explorer',
    images: [
      {
        url: 'https://www.futbolai.org/og-image.png',
        width: 1200,
        height: 630,
        alt: 'FutbolAI Explorer - AI-Powered Football Intelligence Platform',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'FutbolAI Explorer | AI-Powered Football Intelligence',
    description: 'AI-powered football intelligence with detailed stats, achievements, and video highlights for World Cup 2026',
    images: ['https://www.futbolai.org/og-image.png'],
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <head>
        <link rel="icon" href="/favicon.ico" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        
        {/* CRITICAL SEO TAGS */}
        <meta name="robots" content="index, follow, max-image-preview:large, max-snippet:-1, max-video-preview:-1" />
        <meta name="googlebot" content="index, follow, max-snippet:-1, max-image-preview:large, max-video-preview:-1" />
        <meta name="bingbot" content="index, follow, max-snippet:-1, max-image-preview:large, max-video-preview:-1" />
        <link rel="canonical" href="https://www.futbolai.org" />
        
        {/* FIXED: hrefLang tags for multilingual SEO - React uses camelCase */}
        <link rel="alternate" href="https://www.futbolai.org/en" hrefLang="en" />
        <link rel="alternate" href="https://www.futbolai.org/es" hrefLang="es" />
        <link rel="alternate" href="https://www.futbolai.org" hrefLang="x-default" />
        
        {/* Structured Data for SEO */}
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              '@context': 'https://schema.org',
              '@type': 'WebSite',
              'name': 'FutbolAI Explorer',
              'description': 'AI-powered football intelligence platform',
              'url': 'https://www.futbolai.org',
              'inLanguage': {
                '@type': 'Language',
                'name': 'English',
                'alternateName': 'en'
              },
              'potentialAction': {
                '@type': 'SearchAction',
                'target': 'https://www.futbolai.org/?q={search_term_string}',
                'query-input': 'required name=search_term_string'
              }
            })
          }}
        />
        
        {/* Additional Sports schema */}
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              '@context': 'https://schema.org',
              '@type': 'SportsOrganization',
              'name': 'FutbolAI Football Intelligence',
              'url': 'https://www.futbolai.org',
              'description': 'AI-powered football analysis and statistics for World Cup 2026',
              'sport': 'Association football',
              'knowsAbout': ['Football statistics', 'Player analysis', 'Team tactics', 'World Cup 2026'],
            })
          }}
        />
      </head>
      <body className={`${inter.className} bg-gradient-to-b from-gray-900 via-gray-800 to-black min-h-screen text-white pb-16 md:pb-0`}>
        <LanguageProvider>
          {/* Main Navigation - CORRECTED URLs */}
          <nav className="sticky top-0 z-50 bg-gray-900/95 backdrop-blur-md border-b border-gray-800">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
              <div className="flex justify-between items-center h-16">
                {/* Logo */}
                <div className="flex-shrink-0 flex items-center">
                  <a href="/" className="flex items-center">
                    <div className="w-10 h-10 bg-gradient-to-r from-blue-600 to-green-500 rounded-xl flex items-center justify-center mr-3">
                      <span className="text-xl">⚽</span>
                    </div>
                    <div>
                      <h1 className="text-xl font-bold bg-gradient-to-r from-blue-400 to-green-400 bg-clip-text text-transparent">
                        FutbolAI
                      </h1>
                      <p className="text-xs text-gray-400">AI-Powered Football Intelligence</p>
                    </div>
                  </a>
                </div>

                {/* Desktop Navigation - CORRECTED TO MATCH YOUR ACTUAL ROUTES */}
                <div className="hidden md:flex items-center space-x-4">
                  <a href="/" className="text-gray-300 hover:text-white font-medium px-3 py-2 rounded-lg hover:bg-gray-800/50 transition-colors">
                    Home
                  </a>
                  <a href="/world-cup" className="text-gray-300 hover:text-white font-medium px-3 py-2 rounded-lg hover:bg-gray-800/50 transition-colors">
                    World Cup 2026
                  </a>
                  <a href="/players" className="text-gray-300 hover:text-white font-medium px-3 py-2 rounded-lg hover:bg-gray-800/50 transition-colors">
                    Players
                  </a>
                  <a href="/teams" className="text-gray-300 hover:text-white font-medium px-3 py-2 rounded-lg hover:bg-gray-800/50 transition-colors">
                    Teams
                  </a>
                  <a href="/highlights" className="text-gray-300 hover:text-white font-medium px-3 py-2 rounded-lg hover:bg-gray-800/50 transition-colors">
                    Highlights
                  </a>
                  
                  {/* Language Toggle - Added here */}
                  <div className="ml-4">
                    <LanguageToggle />
                  </div>
                  
                  {/* Live Indicator */}
                  <div className="flex items-center space-x-2 px-3 py-1.5 bg-gradient-to-r from-red-600 to-pink-500 rounded-full animate-pulse">
                    <div className="w-2 h-2 bg-white rounded-full"></div>
                    <span className="text-xs font-bold text-white">LIVE</span>
                  </div>
                </div>

                {/* Mobile Menu Button and Language Toggle */}
                <div className="md:hidden flex items-center space-x-3">
                  {/* Language Toggle for Mobile */}
                  <LanguageToggle />
                  
                  {/* Mobile Menu Button */}
                  <button className="text-gray-400 hover:text-white p-2">
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                    </svg>
                  </button>
                </div>
              </div>
            </div>
          </nav>

          {/* Main Content */}
          <main className="flex-grow">
            {children}
          </main>

          {/* Mobile Bottom Navigation */}
          <MobileNav />

          {/* Footer */}
          <footer className="border-t border-gray-800 bg-gray-900/50 py-8 mt-16">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
              <div className="text-center">
                <p className="text-gray-500 text-sm">
                  © 2024-2026 FutbolAI Explorer. All rights reserved.
                </p>
                <p className="text-gray-500 text-sm mt-2">
                  Football highlights and videos are property of their respective owners.
                  All trademarks and registered trademarks are the property of their respective owners.
                </p>
                <p className="text-gray-500 text-sm mt-2">
                  AI-powered analysis using GROQ + Wikipedia • Current 2024-2026 data
                </p>
                <p className="text-gray-500 text-sm mt-2">
                  Developed by A. Guillen
                </p>
                
                {/* Language Notice */}
                <p className="text-gray-500 text-sm mt-4">
                  Available in: <span className="text-blue-400">English</span> • <span className="text-green-400">Español</span>
                </p>
                
                {/* SEO Footer Links - REMOVED /en and /es links since we don't use URL prefixes */}
                <div className="mt-4 flex flex-wrap justify-center gap-4 text-xs text-gray-500">
                  <a href="https://www.futbolai.org/sitemap.xml" className="hover:text-gray-300">Sitemap</a>
                  <span aria-hidden="true">•</span>
                  <a href="https://www.futbolai.org/robots.txt" className="hover:text-gray-300">Robots.txt</a>
                </div>
              </div>
            </div>
          </footer>
        </LanguageProvider>
      </body>
    </html>
  );
}