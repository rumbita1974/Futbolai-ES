'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

const Header = () => {
  const pathname = usePathname();

  return (
    <header className="bg-gradient-to-r from-blue-900 to-blue-800 shadow-lg">
      <div className="container mx-auto px-4 py-4">
        <div className="flex items-center justify-between">
          {/* Logo/Brand */}
          <div className="flex items-center">
            <Link 
              href="/" 
              className="text-white text-2xl font-bold hover:text-blue-200 transition-colors"
            >
              ⚽ FutbolAI
            </Link>
            <span className="ml-3 text-sm text-blue-200 bg-blue-700 px-2 py-1 rounded">
              2026 WC Explorer
            </span>
          </div>

          {/* Main Navigation */}
          <nav className="hidden md:flex items-center space-x-6">
            <Link 
              href="/" 
              className={`px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                pathname === '/' 
                  ? 'bg-blue-700 text-white' 
                  : 'text-blue-100 hover:bg-blue-700/50 hover:text-white'
              }`}
            >
              Home
            </Link>
            
            <Link 
              href="/world-cup"
              className={`px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                pathname === '/world-cup' || pathname === '/worldcup-2026'
                  ? 'bg-blue-700 text-white' 
                  : 'text-blue-100 hover:bg-blue-700/50 hover:text-white'
              }`}
            >
              World Cup 2026
            </Link>
            
            <Link 
              href="/teams" 
              className={`px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                pathname === '/teams' 
                  ? 'bg-blue-700 text-white' 
                  : 'text-blue-100 hover:bg-blue-700/50 hover:text-white'
              }`}
            >
              Teams
            </Link>
            
            <Link 
              href="/schedule" 
              className={`px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                pathname === '/schedule' 
                  ? 'bg-blue-700 text-white' 
                  : 'text-blue-100 hover:bg-blue-700/50 hover:text-white'
              }`}
            >
              Schedule
            </Link>
            
            <Link 
              href="/venues" 
              className={`px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                pathname === '/venues' 
                  ? 'bg-blue-700 text-white' 
                  : 'text-blue-100 hover:bg-blue-700/50 hover:text-white'
              }`}
            >
              Venues
            </Link>
          </nav>

          {/* Mobile menu button */}
          <div className="md:hidden">
            <button className="text-blue-100 hover:text-white">
              <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            </button>
          </div>

          {/* User/AI Status */}
          <div className="hidden md:flex items-center space-x-4">
            <div className="text-xs text-blue-200 bg-green-900/30 px-3 py-1 rounded-full">
              GROQ AI: Online
            </div>
          </div>
        </div>

        {/* Mobile Navigation (hidden by default) */}
        <div className="md:hidden mt-4 pb-2 border-t border-blue-700 pt-4">
          <div className="flex flex-col space-y-2">
            <Link 
              href="/" 
              className={`px-3 py-2 rounded-md text-sm font-medium ${
                pathname === '/' 
                  ? 'bg-blue-700 text-white' 
                  : 'text-blue-100 hover:bg-blue-700'
              }`}
            >
              Home
            </Link>
            
            <Link 
              href="/world-cup"
              className={`px-3 py-2 rounded-md text-sm font-medium ${
                pathname === '/world-cup' || pathname === '/worldcup-2026'
                  ? 'bg-blue-700 text-white' 
                  : 'text-blue-100 hover:bg-blue-700'
              }`}
            >
              World Cup 2026
            </Link>
            
            <Link 
              href="/teams" 
              className={`px-3 py-2 rounded-md text-sm font-medium ${
                pathname === '/teams' 
                  ? 'bg-blue-700 text-white' 
                  : 'text-blue-100 hover:bg-blue-700'
              }`}
            >
              Teams
            </Link>
            
            <Link 
              href="/schedule" 
              className={`px-3 py-2 rounded-md text-sm font-medium ${
                pathname === '/schedule' 
                  ? 'bg-blue-700 text-white' 
                  : 'text-blue-100 hover:bg-blue-700'
              }`}
            >
              Schedule
            </Link>
          </div>
        </div>
      </div>
    </header>
  );
};

export default Header;