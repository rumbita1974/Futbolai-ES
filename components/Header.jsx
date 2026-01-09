'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import LanguageToggle from './LanguageToggle';

export default function Header() {
  const pathname = usePathname();
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  const navigation = [
    { name: 'Home', href: '/' },
    { name: 'World Cup 2026', href: '/world-cup' },
    { name: 'Teams', href: '/teams' },
    { name: 'Matches', href: '/matches' },
    { name: 'Predictions', href: '/predictions' },
    { name: 'Standings', href: '/standings' },
    { name: 'News', href: '/news' },
  ];

  return (
    <header className="sticky top-0 z-50 bg-gray-900/95 backdrop-blur-md border-b border-gray-800">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          {/* Logo */}
          <div className="flex-shrink-0">
            <Link href="/" className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-gradient-to-r from-blue-600 to-green-500 rounded-xl flex items-center justify-center">
                <span className="text-xl">⚽</span>
              </div>
              <div>
                <h1 className="text-xl font-bold bg-gradient-to-r from-blue-400 to-green-400 bg-clip-text text-transparent">
                  FutbolAI
                </h1>
                <p className="text-xs text-gray-400">World Cup 2026</p>
              </div>
            </Link>
          </div>

          {/* Desktop Navigation */}
          <nav className="hidden md:flex items-center space-x-1">
            {navigation.map((item) => (
              <Link
                key={item.name}
                href={item.href}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                  pathname === item.href
                    ? 'bg-gradient-to-r from-blue-600/20 to-green-500/20 text-white'
                    : 'text-gray-300 hover:bg-gray-800 hover:text-white'
                }`}
              >
                {item.name}
              </Link>
            ))}
            
            {/* Language Toggle */}
            <div className="ml-2">
              <LanguageToggle />
            </div>
            
            {/* Live Indicator */}
            <div className="ml-2 flex items-center space-x-2 px-3 py-1.5 bg-gradient-to-r from-red-600 to-pink-500 rounded-full">
              <div className="w-2 h-2 bg-white rounded-full animate-pulse"></div>
              <span className="text-xs font-bold text-white">LIVE</span>
            </div>
          </nav>

          {/* Mobile menu button and language toggle */}
          <div className="md:hidden flex items-center space-x-3">
            {/* Language Toggle for Mobile */}
            <LanguageToggle />
            
            {/* Mobile Menu Button */}
            <button
              onClick={() => setIsMenuOpen(!isMenuOpen)}
              className="inline-flex items-center justify-center p-2 rounded-md text-gray-400 hover:text-white hover:bg-gray-700 focus:outline-none"
            >
              <span className="sr-only">Open main menu</span>
              {isMenuOpen ? (
                <svg className="block h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              ) : (
                <svg className="block h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                </svg>
              )}
            </button>
          </div>
        </div>

        {/* Mobile menu */}
        {isMenuOpen && (
          <div className="md:hidden bg-gray-900 border-t border-gray-800">
            <div className="px-2 pt-2 pb-3 space-y-1">
              {navigation.map((item) => (
                <Link
                  key={item.name}
                  href={item.href}
                  onClick={() => setIsMenuOpen(false)}
                  className={`block px-3 py-2 rounded-md text-base font-medium ${
                    pathname === item.href
                      ? 'bg-gradient-to-r from-blue-600/30 to-green-500/30 text-white'
                      : 'text-gray-300 hover:bg-gray-800 hover:text-white'
                  }`}
                >
                  {item.name}
                </Link>
              ))}
              
              {/* Language Notice in Mobile Menu */}
              <div className="px-3 py-2 border-t border-gray-800 mt-2">
                <div className="flex items-center justify-between">
                  <span className="text-gray-400 text-sm">Language:</span>
                  <LanguageToggle />
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </header>
  );
}