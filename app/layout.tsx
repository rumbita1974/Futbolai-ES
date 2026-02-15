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
  description: 'AI-powered football intelligence with detailed stats, achievements, and video highlights for World Cup 2026. Real-time analysis powered by GROQ AI and Wikipedia. Available in English and Spanish.',
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
    'soccer analytics',
    'fútbol', // Added Spanish keyword
    'mundial 2026' // Added Spanish keyword
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
    canonical: '/', // This ensures all pages canonical to themselves, not to root
    // REMOVED languages section - you don't have separate URLs
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
  // Add verification for Google Search Console if you haven't already
  // verification: {
  //   google: 'your-google-verification-code',
  // },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en"> {/* Default language */}
      <head>
        <link rel="icon" href="/favicon.ico" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        
        {/* CRITICAL SEO TAGS */}
        <meta name="robots" content="index, follow, max-image-preview:large, max-snippet:-1, max-video-preview:-1" />
        <meta name="googlebot" content="index, follow, max-snippet:-1, max-image-preview:large, max-video-preview:-1" />
        <meta name="bingbot" content="index, follow, max-snippet:-1, max-image-preview:large, max-video-preview:-1" />
        
        {/* IMPORTANT: Remove all hreflang tags - they're causing the issue */}
        {/* DO NOT add <link rel="alternate" hrefLang="en" ...> since you don't have separate URLs */}
        
        {/* Add language meta tag to indicate available languages */}
        <meta name="language" content="en, es" />
        
        {/* Structured Data for SEO - Updated for single site with language toggle */}
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              '@context': 'https://schema.org',
              '@type': 'WebSite',
              'name': 'FutbolAI Explorer',
              'description': 'AI-powered football intelligence platform available in English and Spanish',
              'url': 'https://www.futbolai.org',
              'inLanguage': ['en', 'es'],
              'potentialAction': {
                '@type': 'SearchAction',
                'target': {
                  '@type': 'EntryPoint',
                  'urlTemplate': 'https://www.futbolai.org/?q={search_term_string}'
                },
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
              'description': 'AI-powered football analysis and statistics for World Cup 2026. Bilingual platform (English/Spanish).',
              'sport': 'Association football',
              'knowsAbout': ['Football statistics', 'Player analysis', 'Team tactics', 'World Cup 2026'],
            })
          }}
        />
      </head>
      <body className={`${inter.className} bg-gradient-to-b from-gray-900 via-gray-800 to-black min-h-screen text-white pb-16 md:pb-0`}>
        <LanguageProvider>
          {/* Main Navigation */}
          <nav className="sticky top-0 z-50 bg-gray-900/95 backdrop-blur-md border-b border-gray-800">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
              <div className="flex justify-between items-center h-16">
                {/* Logo */}
                <div className="flex-shrink-0 flex items-center">
                  <a href="/" className="flex items-center" rel="home">
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

                {/* Desktop Navigation */}
                <div className="hidden md:flex items-center space-x-4">
                  <a href="/" className="text-gray-300 hover:text-white font-medium px-3 py-2 rounded-lg hover:bg-gray-800/50 transition-colors">
                    Home
                  </a>
                  <a href="/world-cup" className="text-gray-300 hover:text-white font-medium px-3 py-2 rounded-lg hover:bg-gray-800/50 transition-colors">
                    World Cup 2026
                  </a>
                  <a href="/fantasy-odds" className="text-gray-300 hover:text-white font-medium px-3 py-2 rounded-lg hover:bg-gray-800/50 transition-colors">
                    Fantasy & Odds
                  </a>
                  <a href="/teams" className="text-gray-300 hover:text-white font-medium px-3 py-2 rounded-lg hover:bg-gray-800/50 transition-colors">
                    Teams
                  </a>
                  <a href="/highlights" className="text-gray-300 hover:text-white font-medium px-3 py-2 rounded-lg hover:bg-gray-800/50 transition-colors">
                    Highlights
                  </a>
                  
                  {/* Language Toggle - client-side only, no URL change */}
                  <div className="ml-4">
                    <LanguageToggle />
                  </div>
                  
                  {/* Live Indicator */}
                  <div className="flex items-center space-x-2 px-3 py-1.5 bg-gradient-to-r from-red-600 to-pink-500 rounded-full animate-pulse">
                    <div className="w-2 h-2 bg-white rounded-full"></div>
                    <span className="text-xs font-bold text-white">LIVE</span>
                  </div>
                </div>

                {/* Mobile: Language Toggle Only */}
                <div className="md:hidden flex items-center">
                  <LanguageToggle />
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
              
              {/* Minimal Gambling Disclaimer */}
              <div className="mb-6 p-4 bg-gray-800/30 rounded-lg text-center">
                <p className="text-gray-300 text-sm">
                  <strong>Disclaimer:</strong> This site is for informational purposes only. 
                  The developers are not responsible for any use of this information for gambling purposes.
                </p>
              </div>
              
              <div className="text-center">
                <p className="text-gray-500 text-sm">
                  © 2026 FutbolAI Explorer. All rights reserved.
                </p>
                <p className="text-gray-500 text-sm mt-2">
                  Football highlights and videos are property of their respective owners.
                  All trademarks and registered trademarks are the property of their respective owners.
                </p>
                <p className="text-gray-500 text-sm mt-2">
                  AI-powered analysis using GROQ + Wikipedia • Current 2024-2026 data
                </p>
                <p className="text-gray-500 text-sm mt-2 flex items-center justify-center gap-2">
                  <span className="text-lg" title="Venezuela">🇻🇪</span>
                  Developed by A. Guillen
                  <span className="text-lg" title="Spain">🇪🇸</span>
                </p>
                
                <p className="text-gray-500 text-sm mt-4">
                  Contact us at admin@futbolai.org
                </p>
                
                {/* Language Notice - Updated to reflect client-side toggle */}
                <p className="text-gray-500 text-sm mt-4">
                  🌐 This site is available in: <span className="text-blue-400">English</span> • <span className="text-green-400">Español</span>
                  <br />
                  <span className="text-xs text-gray-600">(Use the language toggle in the navigation bar)</span>
                </p>
                
                {/* SEO Footer Links - Keep these pointing to your actual URLs */}
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