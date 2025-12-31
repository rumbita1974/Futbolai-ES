'use client';

import { useState } from 'react';
import { Search, Trophy, Users, Globe, Brain, Film, MapPin } from 'lucide-react';

export default function Home() {
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [searchResults, setSearchResults] = useState<any>(null);

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchQuery.trim()) return;
    
    setIsSearching(true);
    setSearchResults(null);
    
    try {
      const response = await fetch('/api/search', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query: searchQuery })
      });
      
      const result = await response.json();
      
      if (result.success) {
        setSearchResults(result.data);
        console.log('Search results:', result.data);
      } else {
        alert(`Search failed: ${result.error || 'Unknown error'}`);
      }
    } catch (error) {
      console.error('Search error:', error);
      alert('Search failed. Please try again.');
    } finally {
      setIsSearching(false);
    }
  };

  const featureExamples = [
    'Lionel Messi stats 2024',
    'Manchester City trophies',
    'World Cup 2026 predictions',
    'Cristiano Ronaldo highlights',
    'Premier League standings'
  ];

  const features = [
    {
      icon: <Trophy className="w-8 h-8" />,
      title: 'Player Stats',
      description: 'Detailed statistics, career history, and current form analysis'
    },
    {
      icon: <Users className="w-8 h-8" />,
      title: 'Team Analysis',
      description: 'Complete team profiles, tactics, and performance metrics'
    },
    {
      icon: <Globe className="w-8 h-8" />,
      title: 'World Cup',
      description: '2026 FIFA World Cup predictions, groups, and live updates'
    },
    {
      icon: <Brain className="w-8 h-8" />,
      title: 'AI Powered',
      description: 'Intelligent insights and predictions using GROQ AI'
    },
    {
      icon: <Film className="w-8 h-8" />,
      title: 'Video Highlights',
      description: 'Recent matches, goals, and key moments'
    },
    {
      icon: <MapPin className="w-8 h-8" />,
      title: 'Stadium Info',
      description: 'Venue details, capacity, and historical data'
    }
  ];

  return (
    <div className="min-h-screen">
      {/* Hero Section */}
      <div className="relative overflow-hidden bg-gradient-to-br from-gray-900 via-black to-gray-900">
        <div className="max-w-7xl mx-auto px-4 py-24 sm:px-6 lg:px-8">
          <div className="text-center">
            <div className="inline-block mb-6">
              <div className="w-20 h-20 bg-gradient-to-r from-blue-600 to-green-500 rounded-2xl flex items-center justify-center mx-auto">
                <span className="text-4xl">⚽</span>
              </div>
            </div>
            
            <h1 className="text-5xl md:text-7xl font-bold mb-6">
              <span className="bg-gradient-to-r from-blue-500 via-green-400 to-yellow-500 bg-clip-text text-transparent">
                FutbolAI
              </span>
            </h1>
            
            <p className="text-xl md:text-2xl text-gray-300 mb-8 max-w-3xl mx-auto">
              AI-Powered Football Intelligence • Real-time Analysis • Wikipedia Integration
            </p>
          </div>
        </div>
      </div>

      {/* Search Section */}
      <div className="max-w-4xl mx-auto px-4 -mt-12 relative z-10">
        <div className="bg-gray-800/50 backdrop-blur-sm rounded-2xl p-8 border border-gray-700 shadow-2xl">
          <h2 className="text-2xl font-bold text-center mb-6">
            <Search className="inline-block w-6 h-6 mr-2" />
            Football AI Search
          </h2>
          
          <form onSubmit={handleSearch} className="mb-6">
            <div className="relative">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Try current examples: 'Lionel Messi stats 2024' or 'Manchester City trophies'"
                className="w-full px-6 py-4 bg-gray-900/70 border border-gray-600 rounded-xl text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-lg"
                disabled={isSearching}
              />
              <button
                type="submit"
                disabled={isSearching}
                className="absolute right-2 top-2 px-6 py-2 bg-gradient-to-r from-blue-600 to-green-500 hover:from-blue-700 hover:to-green-600 text-white font-semibold rounded-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isSearching ? 'Searching...' : 'Search'}
              </button>
            </div>
          </form>

          <div className="mb-6">
            <p className="text-gray-400 text-sm mb-3 flex items-center">
              <span className="w-2 h-2 bg-green-500 rounded-full mr-2 animate-pulse"></span>
              Try current examples (2024):
            </p>
            <div className="flex flex-wrap gap-2">
              {featureExamples.map((example, index) => (
                <button
                  key={index}
                  onClick={() => {
                    setSearchQuery(example);
                    handleSearch(new Event('submit') as any);
                  }}
                  className="px-4 py-2 bg-gray-900/50 hover:bg-gray-800 border border-gray-700 rounded-lg text-sm text-gray-300 hover:text-white transition-colors"
                  disabled={isSearching}
                >
                  {example}
                </button>
              ))}
            </div>
          </div>

          {/* Search Results Display */}
          {searchResults && (
            <div className="mb-6 mt-6 p-4 bg-gradient-to-r from-blue-900/20 to-green-900/20 border border-blue-700/30 rounded-xl">
              <h3 className="text-lg font-bold text-white mb-3">Search Results:</h3>
              <div className="space-y-3">
                {searchResults.title && (
                  <div>
                    <h4 className="font-semibold text-blue-300">{searchResults.title}</h4>
                    {searchResults.summary && (
                      <p className="text-gray-300 mt-1">{searchResults.summary}</p>
                    )}
                  </div>
                )}
                
                {searchResults.stats && Array.isArray(searchResults.stats) && searchResults.stats.length > 0 && (
                  <div>
                    <h4 className="font-semibold text-green-300">Statistics:</h4>
                    <ul className="list-disc list-inside text-gray-300 mt-1 ml-2">
                      {searchResults.stats.map((stat: string, index: number) => (
                        <li key={index}>{stat}</li>
                      ))}
                    </ul>
                  </div>
                )}
                
                {searchResults.achievements && Array.isArray(searchResults.achievements) && searchResults.achievements.length > 0 && (
                  <div>
                    <h4 className="font-semibold text-yellow-300">Achievements:</h4>
                    <ul className="list-disc list-inside text-gray-300 mt-1 ml-2">
                      {searchResults.achievements.map((achievement: string, index: number) => (
                        <li key={index}>{achievement}</li>
                      ))}
                    </ul>
                  </div>
                )}
                
                {searchResults.currentStatus && (
                  <div>
                    <h4 className="font-semibold text-purple-300">Current Status (2024):</h4>
                    <p className="text-gray-300 mt-1">{searchResults.currentStatus}</p>
                  </div>
                )}
                
                <div className="text-sm text-gray-400 mt-2">
                  Source: {searchResults.source || 'GROQ AI + Wikipedia'}
                </div>
              </div>
            </div>
          )}

          <div className="bg-blue-900/20 border border-blue-700/30 rounded-xl p-4">
            <p className="text-blue-300 text-sm flex items-center">
              <Globe className="w-4 h-4 mr-2" />
              🌐 Spanish searches will use Spanish Wikipedia for accurate data
            </p>
            <p className="text-gray-400 text-sm mt-2">
              Powered by Groq AI + Wikipedia • Current 2024 data • Video highlights
            </p>
          </div>
        </div>
      </div>

      {/* Features Grid */}
      <div className="max-w-7xl mx-auto px-4 py-16 sm:px-6 lg:px-8">
        <h2 className="text-3xl font-bold text-center mb-12">
          FootballAI Analysis
        </h2>
        <p className="text-gray-400 text-center mb-12 max-w-2xl mx-auto">
          Search for players, teams, or tournaments to get comprehensive AI-powered football analysis.
        </p>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {features.map((feature, index) => (
            <div
              key={index}
              className="bg-gray-800/30 backdrop-blur-sm rounded-2xl p-8 border border-gray-700 hover:border-blue-500/50 transition-all hover:shadow-xl hover:shadow-blue-500/10 group"
            >
              <div className="w-16 h-16 bg-gradient-to-br from-blue-600/20 to-green-500/20 rounded-xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                <div className="text-blue-400">
                  {feature.icon}
                </div>
              </div>
              <h3 className="text-xl font-bold text-white mb-3">{feature.title}</h3>
              <p className="text-gray-400">{feature.description}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Video Highlights Section */}
      <div className="max-w-7xl mx-auto px-4 py-16 sm:px-6 lg:px-8">
        <div className="bg-gray-800/30 backdrop-blur-sm rounded-2xl p-8 border border-gray-700">
          <h2 className="text-2xl font-bold mb-6 flex items-center">
            <Film className="w-6 h-6 mr-2" />
            📺 Football Highlights
          </h2>
          
          <div className="text-center py-12">
            <div className="w-24 h-24 bg-gray-900/50 rounded-full flex items-center justify-center mx-auto mb-6">
              <span className="text-4xl">⚽</span>
            </div>
            <p className="text-gray-400 text-lg mb-4">
              Search for a player or team above to see highlights
            </p>
            <div className="bg-gray-900/50 rounded-xl p-8 border-2 border-dashed border-gray-700">
              <p className="text-gray-500">
                Video highlights will appear here
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Bottom CTA */}
      <div className="max-w-7xl mx-auto px-4 pb-16 sm:px-6 lg:px-8">
        <div className="text-center">
          <div className="inline-block px-6 py-3 bg-gradient-to-r from-blue-600/20 to-green-500/20 rounded-full border border-blue-500/30">
            <p className="text-sm text-blue-300">
              ⚽ Content Copyright Notice
            </p>
          </div>
          <p className="text-gray-500 text-sm mt-4 max-w-2xl mx-auto">
            Football highlights and videos are property of their respective owners. 
            All trademarks and registered trademarks are the property of their respective owners. 
            This application uses AI-generated content for analysis purposes.
          </p>
        </div>
      </div>
    </div>
  );
}