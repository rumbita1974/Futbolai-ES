'use client';

import { useState } from 'react';
import { searchWithGROQ, Player, Team } from '@/services/groqService';
import EnhancedSearchResults from '@/components/EnhancedSearchResults';

interface SearchResult {
  players: Player[];
  teams: Team[];
  youtubeQuery: string;
  error?: string;
  message?: string;
}

export default function HomePage() {
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<SearchResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'player' | 'team'>('player');

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchQuery.trim()) {
      setSearchResults(null);
      return;
    }

    setLoading(true);
    setSearchError(null);
    setSearchResults(null);

    try {
      console.log('Searching for:', searchQuery);
      const result = await searchWithGROQ(searchQuery);
      console.log('Search result:', result);
      
      if (result.error) {
        setSearchError(result.error);
      } else {
        setSearchResults(result);
      }
    } catch (err: any) {
      console.error('Search error:', err);
      setSearchError('Failed to perform search. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const exampleSearches = {
    player: [
      { term: 'Lionel Messi', emoji: '🇦🇷' },
      { term: 'Cristiano Ronaldo', emoji: '🇵🇹' },
      { term: 'Kylian Mbappé', emoji: '🇫🇷' },
      { term: 'Kevin De Bruyne', emoji: '🇧🇪' },
      { term: 'Erling Haaland', emoji: '🇳🇴' }
    ],
    team: [
      { term: 'Real Madrid', emoji: '⚪' },
      { term: 'Manchester City', emoji: '🔵' },
      { term: 'Argentina', emoji: '🇦🇷' },
      { term: 'FC Barcelona', emoji: '🔴🔵' },
      { term: 'Brazil', emoji: '🇧🇷' }
    ]
  };

  const handleExampleSearch = (term: string) => {
    setSearchQuery(term);
    // Create a form submit event
    const fakeEvent = {
      preventDefault: () => {},
      currentTarget: document.createElement('form')
    } as React.FormEvent;
    handleSearch(fakeEvent);
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-50 to-blue-50">
      <div className="max-w-7xl mx-auto px-4 py-8 sm:py-12">
        {/* Header */}
        <div className="text-center mb-8 sm:mb-12">
          <h1 className="text-4xl sm:text-5xl font-bold text-gray-900 mb-3 sm:mb-4">
            FutbolAI Explorer
          </h1>
          <p className="text-lg sm:text-xl text-gray-600 mb-6 sm:mb-8 max-w-3xl mx-auto px-4">
            AI-powered football intelligence with detailed stats, achievements, and video highlights
          </p>
          
          {/* Feature Badges */}
          <div className="flex flex-wrap justify-center gap-3 mb-6">
            <span className="px-3 py-1.5 bg-blue-100 text-blue-700 rounded-full text-sm font-medium flex items-center">
              <span className="mr-1">🤖</span> AI Analysis
            </span>
            <span className="px-3 py-1.5 bg-green-100 text-green-700 rounded-full text-sm font-medium flex items-center">
              <span className="mr-1">📊</span> Detailed Stats
            </span>
            <span className="px-3 py-1.5 bg-purple-100 text-purple-700 rounded-full text-sm font-medium flex items-center">
              <span className="mr-1">🏆</span> Achievements
            </span>
            <span className="px-3 py-1.5 bg-red-100 text-red-700 rounded-full text-sm font-medium flex items-center">
              <span className="mr-1">📺</span> Video Highlights
            </span>
          </div>
        </div>

        {/* Search Section */}
        <div className="max-w-3xl mx-auto mb-8 sm:mb-12">
          {/* Tab Selection */}
          <div className="flex justify-center mb-6">
            <div className="inline-flex rounded-lg border border-gray-300 bg-white p-1">
              <button
                onClick={() => setActiveTab('player')}
                className={`px-4 sm:px-6 py-2 rounded-md text-sm font-medium transition ${activeTab === 'player' ? 'bg-blue-600 text-white shadow' : 'text-gray-700 hover:bg-gray-100'}`}
              >
                👤 Player Search
              </button>
              <button
                onClick={() => setActiveTab('team')}
                className={`px-4 sm:px-6 py-2 rounded-md text-sm font-medium transition ${activeTab === 'team' ? 'bg-blue-600 text-white shadow' : 'text-gray-700 hover:bg-gray-100'}`}
              >
                🏟️ Team Search
              </button>
            </div>
          </div>

          <form onSubmit={handleSearch} className="relative">
            <div className="flex flex-col sm:flex-row gap-3 sm:gap-4">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder={`Search for a ${activeTab === 'player' ? 'player (e.g., Lionel Messi)' : 'team (e.g., Real Madrid)'}...`}
                className="flex-1 px-4 sm:px-6 py-3 sm:py-4 text-base sm:text-lg text-gray-900 bg-white border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent placeholder-gray-500 shadow-sm"
                disabled={loading}
                autoFocus
              />
              <button
                type="submit"
                disabled={loading || !searchQuery.trim()}
                className="px-6 sm:px-8 py-3 sm:py-4 bg-blue-600 text-white font-semibold rounded-xl hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition shadow-sm"
              >
                {loading ? (
                  <span className="flex items-center justify-center">
                    <svg className="animate-spin -ml-1 mr-2 sm:mr-3 h-4 w-4 sm:h-5 sm:w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Searching...
                  </span>
                ) : 'Search'}
              </button>
            </div>
          </form>

          {/* Example searches */}
          <div className="mt-6">
            <p className="text-gray-500 text-sm text-center mb-3">Try these examples:</p>
            <div className="flex flex-wrap justify-center gap-2">
              {exampleSearches[activeTab].map(({ term, emoji }) => (
                <button
                  key={term}
                  onClick={() => handleExampleSearch(term)}
                  className="px-3 py-2 text-sm bg-white border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 hover:border-gray-400 transition flex items-center shadow-sm"
                >
                  <span className="mr-2">{emoji}</span>
                  {term}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Error State */}
        {searchError && !loading && (
          <div className="max-w-3xl mx-auto bg-red-50 border border-red-200 rounded-xl p-4 sm:p-6 mb-8">
            <div className="flex items-start">
              <div className="flex-shrink-0">
                <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                </svg>
              </div>
              <div className="ml-3">
                <h3 className="text-sm sm:text-base font-medium text-red-800">Search Error</h3>
                <div className="mt-2 text-sm text-red-700">
                  <p>{searchError}</p>
                  <div className="mt-3">
                    <p className="font-medium">Troubleshooting:</p>
                    <ul className="list-disc pl-5 mt-1 space-y-1">
                      <li>Check if API keys are set in <code className="bg-red-100 px-1 py-0.5 rounded">.env.local</code></li>
                      <li>Verify your internet connection</li>
                      <li>Try a different search term</li>
                    </ul>
                  </div>
                </div>
                <div className="mt-4">
                  <button
                    onClick={() => setSearchError(null)}
                    className="text-sm font-medium text-red-800 hover:text-red-900"
                  >
                    Dismiss error
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Loading State */}
        {loading && (
          <div className="max-w-3xl mx-auto text-center py-12 sm:py-16">
            <div className="inline-block animate-spin rounded-full h-12 w-12 sm:h-16 sm:w-16 border-b-2 border-blue-600"></div>
            <p className="mt-4 text-gray-600 text-lg">Analyzing football data...</p>
            <p className="text-gray-500 text-sm mt-2">Fetching stats, achievements, and highlights</p>
          </div>
        )}

        {/* Enhanced Results */}
        {searchResults && !loading && (
          <EnhancedSearchResults
            players={searchResults.players}
            teams={searchResults.teams}
            youtubeQuery={searchResults.youtubeQuery}
            searchTerm={searchQuery}
          />
        )}

        {/* Features Section - Only show when no search results */}
        {!searchResults && !loading && !searchError && (
          <div className="max-w-6xl mx-auto mt-12 sm:mt-16">
            <h2 className="text-2xl sm:text-3xl font-bold text-center text-gray-800 mb-8 sm:mb-10">Explore Football Intelligence</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 sm:gap-8">
              <a 
                href="/world-cup" 
                className="group bg-white rounded-xl shadow-lg p-6 text-center hover:shadow-xl transition hover:-translate-y-1 border border-gray-200"
              >
                <div className="text-blue-600 text-4xl sm:text-5xl mb-4 group-hover:scale-110 transition">⚽</div>
                <h3 className="text-xl font-bold text-gray-800 mb-3">World Cup 2026</h3>
                <p className="text-gray-600 mb-4">Official schedule, groups, and match information for the upcoming tournament</p>
                <div className="inline-block mt-2 px-4 py-2 bg-blue-600 text-white rounded-lg font-medium group-hover:bg-blue-700 transition">
                  View Schedule →
                </div>
              </a>
              
              <div className="group bg-white rounded-xl shadow-lg p-6 text-center hover:shadow-xl transition hover:-translate-y-1 border border-gray-200">
                <div className="text-green-600 text-4xl sm:text-5xl mb-4 group-hover:scale-110 transition">📊</div>
                <h3 className="text-xl font-bold text-gray-800 mb-3">Detailed Analytics</h3>
                <p className="text-gray-600 mb-4">Player stats, team achievements, career summaries, and performance metrics</p>
                <div className="inline-block mt-2 px-4 py-2 bg-green-600 text-white rounded-lg font-medium">
                  Search Above ↑
                </div>
              </div>
              
              <div className="group bg-white rounded-xl shadow-lg p-6 text-center hover:shadow-xl transition hover:-translate-y-1 border border-gray-200">
                <div className="text-red-600 text-4xl sm:text-5xl mb-4 group-hover:scale-110 transition">🎥</div>
                <h3 className="text-xl font-bold text-gray-800 mb-3">Video Highlights</h3>
                <p className="text-gray-600 mb-4">AI-curated YouTube highlights for every player and team search result</p>
                <div className="inline-block mt-2 px-4 py-2 bg-red-600 text-white rounded-lg font-medium">
                  Try a Search ↑
                </div>
              </div>
            </div>

            {/* Quick Stats */}
            <div className="mt-12 sm:mt-16 bg-gradient-to-r from-blue-600 to-green-600 rounded-2xl p-6 sm:p-8 text-white">
              <h3 className="text-xl sm:text-2xl font-bold mb-6 text-center">Football Data Coverage</h3>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                <div className="text-center">
                  <div className="text-2xl sm:text-3xl font-bold">10,000+</div>
                  <div className="text-blue-100 text-sm mt-1">Players</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl sm:text-3xl font-bold">500+</div>
                  <div className="text-blue-100 text-sm mt-1">Teams</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl sm:text-3xl font-bold">50+</div>
                  <div className="text-blue-100 text-sm mt-1">Leagues</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl sm:text-3xl font-bold">100+</div>
                  <div className="text-blue-100 text-sm mt-1">Countries</div>
                </div>
              </div>
            </div>

            {/* Quick Links */}
            <div className="mt-12 text-center">
              <h3 className="text-xl font-bold text-gray-800 mb-6">Quick Access</h3>
              <div className="flex flex-wrap justify-center gap-3">
                <a href="/world-cup" className="px-4 sm:px-6 py-3 bg-blue-100 text-blue-700 rounded-lg hover:bg-blue-200 font-medium">
                  World Cup Schedule
                </a>
                <a href="/api/worldcup" target="_blank" className="px-4 sm:px-6 py-3 bg-green-100 text-green-700 rounded-lg hover:bg-green-200 font-medium">
                  API Data
                </a>
                <button className="px-4 sm:px-6 py-3 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 font-medium">
                  Player Database
                </button>
                <button className="px-4 sm:px-6 py-3 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 font-medium">
                  Team Analysis
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Footer Note */}
        <div className="mt-12 sm:mt-16 pt-8 border-t border-gray-200">
          <div className="text-center text-gray-500 text-sm">
            <p className="mb-2">
              ⚽ <span className="font-medium">FutbolAI Explorer</span> • AI-powered football intelligence platform
            </p>
            <p className="text-gray-400">
              Data is powered by GROQ AI with llama-3.3-70b-versatile model. Video highlights from YouTube API.
            </p>
            <div className="mt-4 text-xs text-gray-400">
              <p>© {new Date().getFullYear()} FutbolAI Explorer • All football data and videos are property of their respective owners</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}