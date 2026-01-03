'use client';

import { useState } from 'react';
import { searchWithGROQ } from '@/services/groqService';

interface Player {
  name: string;
  team: string;
  position: string;
  wikipediaSummary?: string;
}

interface Team {
  name: string;
  country: string;
  coach: string;
  fifaRanking?: number;
  group?: string;
}

interface SearchResults {
  players?: Player[];
  teams?: Team[];
  videoHighlights?: any[];
  teamAnalysis?: any;
  error?: string;
  message?: string;
}

export default function HomePage() {
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<SearchResults | null>(null);
  const [loading, setLoading] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);

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

  const exampleSearches = [
    { term: 'Lionel Messi', type: 'player' },
    { term: 'Argentina', type: 'team' },
    { term: 'World Cup 2026', type: 'tournament' },
    { term: 'Brazil national team', type: 'team' },
    { term: 'Premier League', type: 'league' }
  ];

  const handleExampleSearch = (term: string) => {
    setSearchQuery(term);
    // Trigger search after a brief delay
    setTimeout(() => {
      const form = document.querySelector('form');
      if (form) {
        const submitEvent = new Event('submit', { bubbles: true, cancelable: true });
        form.dispatchEvent(submitEvent);
      }
    }, 100);
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-50 to-blue-50">
      <div className="max-w-7xl mx-auto px-4 py-12">
        {/* Header */}
        <div className="text-center mb-12">
          <h1 className="text-5xl font-bold text-gray-900 mb-4">
            FutbolAI Explorer
          </h1>
          <p className="text-xl text-gray-600 mb-8">
            AI-powered football intelligence for the 2026 FIFA World Cup
          </p>
        </div>

        {/* Search Section */}
        <div className="max-w-3xl mx-auto mb-12">
          <form onSubmit={handleSearch} className="relative">
            <div className="flex gap-4">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search players, teams, or football terms..."
                className="flex-1 px-6 py-4 text-lg text-gray-900 bg-white border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent placeholder-gray-500"
                disabled={loading}
              />
              <button
                type="submit"
                disabled={loading || !searchQuery.trim()}
                className="px-8 py-4 bg-blue-600 text-white font-semibold rounded-xl hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition"
              >
                {loading ? (
                  <span className="flex items-center">
                    <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
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
          <div className="mt-6 text-center">
            <p className="text-gray-500 text-sm mb-2">Try searching for:</p>
            <div className="flex flex-wrap justify-center gap-2">
              {exampleSearches.map(({ term, type }) => (
                <button
                  key={term}
                  onClick={() => handleExampleSearch(term)}
                  className={`px-3 py-1.5 text-sm rounded-lg transition ${
                    type === 'player' 
                      ? 'bg-blue-100 text-blue-700 hover:bg-blue-200' 
                      : type === 'team'
                      ? 'bg-green-100 text-green-700 hover:bg-green-200'
                      : 'bg-purple-100 text-purple-700 hover:bg-purple-200'
                  }`}
                >
                  {term}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Error State */}
        {searchError && !loading && (
          <div className="max-w-3xl mx-auto bg-red-50 border border-red-200 rounded-xl p-6 mb-8">
            <h3 className="text-red-800 font-semibold mb-2">Search Error</h3>
            <p className="text-red-600">{searchError}</p>
            <div className="mt-4 text-sm text-red-700">
              <p>Common issues:</p>
              <ul className="list-disc pl-5 mt-1">
                <li>Check if GROQ_API_KEY is set in .env.local</li>
                <li>Verify your internet connection</li>
                <li>Try a different search term</li>
              </ul>
            </div>
          </div>
        )}

        {/* Results Display */}
        {searchResults && !loading && (
          <div className="max-w-7xl mx-auto">
            {/* Message */}
            {searchResults.message && (
              <div className="mb-6 bg-blue-50 border border-blue-200 rounded-xl p-6">
                <p className="text-blue-800">{searchResults.message}</p>
              </div>
            )}

            {/* Players */}
            {searchResults.players && searchResults.players.length > 0 && (
              <div className="mb-8">
                <h2 className="text-2xl font-bold text-gray-800 mb-4">Players</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {searchResults.players.map((player, index) => (
                    <div key={index} className="bg-white rounded-lg shadow-md p-4 border border-gray-200 hover:shadow-lg transition">
                      <h3 className="font-bold text-lg text-gray-800">{player.name}</h3>
                      <div className="flex items-center justify-between mt-2">
                        <span className="text-gray-700 font-medium">{player.team}</span>
                        <span className="px-2 py-1 bg-gray-100 text-gray-700 rounded text-sm font-medium">
                          {player.position}
                        </span>
                      </div>
                      {player.wikipediaSummary && (
                        <p className="text-gray-600 text-sm mt-3 line-clamp-3">{player.wikipediaSummary}</p>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Teams */}
            {searchResults.teams && searchResults.teams.length > 0 && (
              <div className="mb-8">
                <h2 className="text-2xl font-bold text-gray-800 mb-4">Teams</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {searchResults.teams.map((team, index) => (
                    <div key={index} className="bg-white rounded-lg shadow-md p-4 border border-gray-200 hover:shadow-lg transition">
                      <div className="flex justify-between items-start">
                        <div>
                          <h3 className="font-bold text-lg text-gray-800">{team.name}</h3>
                          <p className="text-gray-700">{team.country}</p>
                          <p className="text-gray-600 text-sm mt-1">Coach: {team.coach}</p>
                        </div>
                        {team.fifaRanking && (
                          <div className="text-right">
                            <div className="text-xs text-gray-500">FIFA Rank</div>
                            <div className="text-xl font-bold text-blue-600">#{team.fifaRanking}</div>
                          </div>
                        )}
                      </div>
                      {team.group && (
                        <div className="mt-3 pt-3 border-t border-gray-200">
                          <span className="px-3 py-1 bg-blue-100 text-blue-700 rounded-full text-sm font-medium">
                            Group {team.group} • 2026 World Cup
                          </span>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* No results */}
            {(!searchResults.players || searchResults.players.length === 0) &&
             (!searchResults.teams || searchResults.teams.length === 0) &&
             !searchResults.message && !searchResults.error && (
              <div className="text-center py-12 bg-white rounded-xl shadow border border-gray-200">
                <div className="text-gray-400 mb-4">
                  <svg className="w-16 h-16 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <h3 className="text-lg font-medium text-gray-700 mb-2">No results found</h3>
                <p className="text-gray-500">Try different search terms or check the spelling.</p>
              </div>
            )}
          </div>
        )}

        {/* Features Section - Only show when no search results */}
        {!searchResults && !loading && !searchError && (
          <div className="max-w-6xl mx-auto mt-16">
            <h2 className="text-3xl font-bold text-center text-gray-800 mb-10">Features</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              <a 
                href="/world-cup" 
                className="bg-white rounded-xl shadow-lg p-6 text-center hover:shadow-xl transition hover:-translate-y-1"
              >
                <div className="text-blue-600 text-4xl mb-4">⚽</div>
                <h3 className="text-xl font-bold text-gray-800 mb-3">World Cup 2026</h3>
                <p className="text-gray-600">Official schedule, groups, and match information</p>
                <div className="inline-block mt-4 px-4 py-2 bg-blue-600 text-white rounded-lg font-medium">
                  View Schedule
                </div>
              </a>
              
              <div className="bg-white rounded-xl shadow-lg p-6 text-center">
                <div className="text-green-600 text-4xl mb-4">📊</div>
                <h3 className="text-xl font-bold text-gray-800 mb-3">Player Stats</h3>
                <p className="text-gray-600">AI-powered player analysis and statistics</p>
                <div className="inline-block mt-4 px-4 py-2 bg-green-600 text-white rounded-lg font-medium">
                  Coming Soon
                </div>
              </div>
              
              <div className="bg-white rounded-xl shadow-lg p-6 text-center">
                <div className="text-red-600 text-4xl mb-4">🎥</div>
                <h3 className="text-xl font-bold text-gray-800 mb-3">Video Highlights</h3>
                <p className="text-gray-600">Match highlights and player compilations</p>
                <div className="inline-block mt-4 px-4 py-2 bg-red-600 text-white rounded-lg font-medium">
                  Coming Soon
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}