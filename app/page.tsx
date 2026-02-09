'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { searchWithGROQ, Player, Team, clearSearchCache } from '@/services/groqService';
import EnhancedSearchResults from '@/components/EnhancedSearchResults';
import { useTranslation } from '@/hooks/useTranslation';

interface SearchResult {
  players: Player[];
  teams: Team[];
  youtubeQuery: string;
  error?: string;
  message?: string;
  _metadata?: any;
}

interface CacheItem {
  data: SearchResult;
  timestamp: number;
  language: string;
}

export default function HomePage() {
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<SearchResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'player' | 'team'>('player');
  const [comingFromGroup, setComingFromGroup] = useState<string | null>(null);
  const [lastRefreshed, setLastRefreshed] = useState<Date | null>(null);
  
  const searchParams = useSearchParams();
  const router = useRouter();
  const { t, language } = useTranslation();
  
  const hasAutoSearchedRef = useRef(false);
  const lastSearchTimeRef = useRef<number>(0);

  // Simple team detection
  const detectTeamSearch = (query: string): boolean => {
    const queryLower = query.toLowerCase().trim();
    
    // Country names (national teams)
    const countries = [
      'argentina', 'brazil', 'uruguay', 'france', 'england', 'germany', 'spain', 
      'italy', 'portugal', 'netherlands', 'japan', 'morocco', 'mexico', 'usa',
      'venezuela', 'chile', 'colombia', 'ecuador', 'paraguay', 'peru'
    ];
    
    if (countries.some(country => queryLower.includes(country))) return true;
    
    // Team indicators
    const indicators = ['fc', 'united', 'city', 'cf', 'afc', 'as', 'real', 'fcb', 'ac'];
    if (indicators.some(indicator => queryLower.includes(indicator))) return true;
    
    return false;
  };

  // Cache management
  const getCachedResult = (query: string): SearchResult | null => {
    try {
      if (typeof window === 'undefined') return null;
      
      const cacheKey = `search_cache_${query.toLowerCase()}_${language}`;
      const cached = localStorage.getItem(cacheKey);
      if (!cached) return null;
      
      const cacheItem: CacheItem = JSON.parse(cached);
      const now = Date.now();
      
      // Cache valid for 30 minutes
      if (now - cacheItem.timestamp < 30 * 60 * 1000 && cacheItem.language === language) {
        return cacheItem.data;
      }
      
      localStorage.removeItem(cacheKey);
      return null;
    } catch (err) {
      return null;
    }
  };

  const setCachedResult = (query: string, data: SearchResult) => {
    try {
      if (typeof window === 'undefined') return;
      
      const cacheKey = `search_cache_${query.toLowerCase()}_${language}`;
      const cacheItem: CacheItem = {
        data,
        timestamp: Date.now(),
        language
      };
      localStorage.setItem(cacheKey, JSON.stringify(cacheItem));
    } catch (err) {
      console.error('Cache write error');
    }
  };

  const clearAllCache = () => {
    try {
      if (typeof window === 'undefined') return;
      
      // Clear localStorage cache
      const keysToRemove: string[] = [];
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key?.startsWith('search_cache_')) {
          keysToRemove.push(key);
        }
      }
      keysToRemove.forEach(key => localStorage.removeItem(key));
      
      // Clear service cache
      clearSearchCache();
      
      // Update UI
      setSearchResults(null);
      setSearchError('Cache cleared successfully.');
      
      setTimeout(() => {
        setSearchError(null);
      }, 3000);
      
    } catch (err) {
      console.error('Clear cache error');
    }
  };

  // Auto-search from URL params
  useEffect(() => {
    const groupParam = searchParams.get('group');
    const searchParam = searchParams.get('search');
    
    if (groupParam) setComingFromGroup(groupParam);
    
    if (searchParam && !hasAutoSearchedRef.current) {
      const now = Date.now();
      if (now - lastSearchTimeRef.current > 2000) {
        setSearchQuery(searchParam);
        const isTeam = detectTeamSearch(searchParam);
        if (isTeam) setActiveTab('team');
        hasAutoSearchedRef.current = true;
        lastSearchTimeRef.current = now;
        
        setTimeout(() => {
          handleSearchWithCache(searchParam, false, true);
        }, 300);
      }
    }
  }, [searchParams]);

  // Main search function
  const handleSearchWithCache = async (query: string, forceFresh: boolean = false, isAutoSearch = false) => {
    if (!query.trim()) return;
    
    setLoading(true);
    setSearchError(null);
    setSearchResults(null);
    
    try {
      // Use the activeTab state to determine search type
      const isTeamSearch = activeTab === 'team';
      
      console.log(`🔍 Searching: "${query}" as ${isTeamSearch ? 'TEAM' : 'PLAYER'}`);
      
      let result = null;
      
      // Check cache first
      if (!forceFresh) {
        result = getCachedResult(query);
      }
      
      // Fetch fresh if not cached or force refresh
      if (!result) {
        result = await searchWithGROQ(query, language, forceFresh, isTeamSearch);
        if (result && !result.error) {
          setCachedResult(query, result);
        }
      }
      
      if (result.error) {
        setSearchError(result.error);
      } else {
        // Ensure results have proper structure
        if (!result.players) result.players = [];
        if (!result.teams) result.teams = [];
        if (!result.youtubeQuery) result.youtubeQuery = `${query} ${isTeamSearch ? 'team' : 'player'} highlights 2025`;
        
        setSearchResults(result);
        setLastRefreshed(new Date());
      }
    } catch (error: any) {
      console.error('Search error:', error);
      setSearchError('Search failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchQuery.trim()) {
      setSearchResults(null);
      return;
    }
    handleSearchWithCache(searchQuery);
  };

  const handleRefreshSearch = () => {
    if (searchQuery) handleSearchWithCache(searchQuery, true);
  };

  const handleBackToGroup = () => {
    if (comingFromGroup) {
      router.push(`/world-cup?group=${comingFromGroup}`);
    } else {
      router.push('/world-cup');
    }
  };

  const navigateToFantasyOdds = () => {
    router.push('/fantasy-odds');
  };

  const handleExampleSearch = (term: string) => {
    setSearchQuery(term);
    const isTeam = detectTeamSearch(term);
    if (isTeam) setActiveTab('team');
    handleSearchWithCache(term);
  };

  const exampleSearches = {
    player: [
      { term: 'Lionel Messi', emoji: '🇦🇷' },
      { term: 'Cristiano Ronaldo', emoji: '🇵🇹' },
      { term: 'Kylian Mbappé', emoji: '🇫🇷' },
      { term: 'Erling Haaland', emoji: '🇳🇴' }
    ],
    team: [
      { term: 'Real Madrid', emoji: '⚪' },
      { term: 'Manchester City', emoji: '🔵' },
      { term: 'Argentina', emoji: '🇦🇷' },
      { term: 'Brazil', emoji: '🇧🇷' },
      { term: 'Uruguay', emoji: '🇺🇾' }
    ]
  };

  const getSearchPlaceholder = () => {
    return activeTab === 'team' 
      ? 'Search for a team (e.g., "Brazil", "Real Madrid")'
      : 'Search for a player (e.g., "Lionel Messi")';
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-50 to-blue-50">
      <div className="max-w-7xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-8">
          {comingFromGroup && (
            <div className="mb-6 bg-gradient-to-r from-blue-50 to-green-50 border border-blue-200 rounded-xl p-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="flex items-center">
                  <div className="w-10 h-10 bg-gradient-to-r from-blue-600 to-green-500 rounded-xl flex items-center justify-center mr-3">
                    <span className="text-xl">⚽</span>
                  </div>
                  <div>
                    <h3 className="font-bold text-gray-800">
                      Viewing group {comingFromGroup}
                    </h3>
                    <p className="text-gray-600 text-sm">World Cup 2026 group stage</p>
                  </div>
                </div>
                <button
                  onClick={handleBackToGroup}
                  className="flex items-center justify-center px-4 py-2 bg-gradient-to-r from-blue-600 to-green-500 text-white rounded-lg hover:opacity-90 transition font-medium"
                >
                  ← Back to Group
                </button>
              </div>
            </div>
          )}

          <div className="text-center">
            <h1 className="text-4xl font-bold text-gray-900 mb-3">
              FutbolAI ⚽
            </h1>
            <p className="text-lg text-gray-600 mb-6 max-w-3xl mx-auto">
              AI-powered football analytics with verified data sources
            </p>
            
            {/* Feature badges */}
            <div className="flex flex-wrap justify-center gap-2 mb-6">
              <span className="px-3 py-1 bg-blue-100 text-blue-700 rounded-full text-sm font-medium">
                🤖 AI Analysis
              </span>
              <span className="px-3 py-1 bg-green-100 text-green-700 rounded-full text-sm font-medium">
                📊 Verified Data
              </span>
              <span className="px-3 py-1 bg-purple-100 text-purple-700 rounded-full text-sm font-medium">
                🎲 Fantasy & Odds
              </span>
              <span className="px-3 py-1 bg-red-100 text-red-700 rounded-full text-sm font-medium">
                📺 Highlights
              </span>
            </div>
          </div>
        </div>

        {/* Search Section */}
        <div className="max-w-3xl mx-auto mb-8">
          {/* Tab Selection */}
          <div className="flex justify-center mb-6">
            <div className="inline-flex rounded-lg border border-gray-300 bg-white p-1">
              <button
                onClick={() => setActiveTab('player')}
                className={`px-4 py-2 rounded-md text-sm font-medium transition ${activeTab === 'player' ? 'bg-blue-600 text-white' : 'text-gray-700 hover:bg-gray-100'}`}
              >
                👤 Player Search
              </button>
              <button
                onClick={() => setActiveTab('team')}
                className={`px-4 py-2 rounded-md text-sm font-medium transition ${activeTab === 'team' ? 'bg-blue-600 text-white' : 'text-gray-700 hover:bg-gray-100'}`}
              >
                🏟️ Team Search
              </button>
            </div>
          </div>

          <form onSubmit={handleSearch} className="relative">
            <div className="flex flex-col sm:flex-row gap-3">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder={getSearchPlaceholder()}
                className="flex-1 px-4 py-3 text-gray-900 bg-white border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                disabled={loading}
                autoFocus
              />
              <button
                type="submit"
                disabled={loading || !searchQuery.trim()}
                className="px-6 py-3 bg-blue-600 text-white font-semibold rounded-xl hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? 'Searching...' : 'Search'}
              </button>
            </div>
          </form>

          {/* Cache Controls */}
          {(searchResults || searchQuery) && !loading && (
            <div className="mt-4 flex flex-wrap gap-2 justify-center">
              <button
                onClick={handleRefreshSearch}
                disabled={loading}
                className="px-3 py-1.5 text-sm bg-blue-100 text-blue-700 rounded-lg hover:bg-blue-200 transition"
              >
                🔄 Refresh Data
              </button>
              <button
                onClick={clearAllCache}
                className="px-3 py-1.5 text-sm bg-red-100 text-red-700 rounded-lg hover:bg-red-200 transition"
              >
                🗑️ Clear Cache
              </button>
            </div>
          )}

          {/* Example searches */}
          <div className="mt-6">
            <p className="text-gray-500 text-sm text-center mb-3">Try these examples:</p>
            <div className="flex flex-wrap justify-center gap-2">
              {exampleSearches[activeTab].map(({ term, emoji }) => (
                <button
                  key={term}
                  onClick={() => handleExampleSearch(term)}
                  className="px-3 py-2 text-sm bg-white border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition"
                >
                  {emoji} {term}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Error State */}
        {searchError && !loading && (
          <div className="max-w-3xl mx-auto bg-red-50 border border-red-200 rounded-xl p-6 mb-8">
            <div className="flex items-start">
              <div className="flex-shrink-0 pt-1">
                <span className="text-red-500">⚠️</span>
              </div>
              <div className="ml-3">
                <h3 className="font-medium text-red-800">Search Error</h3>
                <p className="text-red-700 mt-1">{searchError}</p>
                <button
                  onClick={() => setSearchError(null)}
                  className="mt-3 text-sm text-red-800 hover:text-red-900"
                >
                  Dismiss
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Loading State */}
        {loading && (
          <div className="max-w-3xl mx-auto text-center py-12">
            <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
            <p className="mt-4 text-gray-600">
              {activeTab === 'team' ? 'Analyzing team data...' : 'Analyzing player data...'}
            </p>
          </div>
        )}

        {/* Results */}
        {searchResults && !loading && (
          <EnhancedSearchResults
            players={searchResults.players || []}
            teams={searchResults.teams || []}
            youtubeQuery={searchResults.youtubeQuery || ''}
            searchTerm={searchQuery}
            _metadata={searchResults._metadata || {}}
          />
        )}

        {/* Features Section - Only when no results */}
        {!searchResults && !loading && !searchError && (
          <div className="max-w-6xl mx-auto mt-12">
            <h2 className="text-2xl font-bold text-center text-gray-800 mb-8">
              Football Intelligence Platform
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <a 
                href="/world-cup" 
                className="bg-white rounded-xl shadow-lg p-6 text-center hover:shadow-xl transition border border-gray-200"
              >
                <div className="text-blue-600 text-4xl mb-4">⚽</div>
                <h3 className="text-xl font-bold text-gray-800 mb-3">World Cup 2026</h3>
                <p className="text-gray-600 mb-4">Groups, schedule, and team analysis</p>
                <div className="inline-block px-4 py-2 bg-blue-600 text-white rounded-lg font-medium">
                  View Schedule
                </div>
              </a>
              
              <button
                onClick={navigateToFantasyOdds}
                className="bg-white rounded-xl shadow-lg p-6 text-center hover:shadow-xl transition border border-gray-200 cursor-pointer"
              >
                <div className="text-purple-600 text-4xl mb-4">🎲</div>
                <h3 className="text-xl font-bold text-gray-800 mb-3">AI Fantasy & Odds</h3>
                <p className="text-gray-600 mb-4">Match predictions and betting analysis</p>
                <div className="inline-block px-4 py-2 bg-purple-600 text-white rounded-lg font-medium">
                  View Predictions
                </div>
              </button>
              
              <a 
                href="/highlights" 
                className="bg-white rounded-xl shadow-lg p-6 text-center hover:shadow-xl transition border border-gray-200"
              >
                <div className="text-green-600 text-4xl mb-4">📊</div>
                <h3 className="text-xl font-bold text-gray-800 mb-3">Match Highlights</h3>
                <p className="text-gray-600 mb-4">Latest results and live scores</p>
                <div className="inline-block px-4 py-2 bg-green-600 text-white rounded-lg font-medium">
                  View Matches
                </div>
              </a>
            </div>

            {/* Data Source Info */}
            <div className="mt-8 bg-gradient-to-r from-blue-50 to-green-50 border border-blue-200 rounded-xl p-6">
              <div className="flex items-start">
                <div className="flex-shrink-0 pt-1">
                  <span className="text-2xl">✅</span>
                </div>
                <div className="ml-4">
                  <h3 className="text-lg font-bold text-gray-800">Verified Data Sources</h3>
                  <p className="text-gray-600 mt-1">
                    We prioritize verified sources (SportsDB, Wikipedia) before using AI. 
                    This ensures accurate and up-to-date information for the 2025/2026 season.
                  </p>
                  <div className="mt-3 flex flex-wrap gap-2">
                    <span className="px-2 py-1 bg-blue-100 text-blue-700 rounded text-xs">SportsDB</span>
                    <span className="px-2 py-1 bg-green-100 text-green-700 rounded text-xs">Wikipedia</span>
                    <span className="px-2 py-1 bg-yellow-100 text-yellow-700 rounded text-xs">AI Enhancement</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Footer */}
        <div className="mt-12 pt-8 border-t border-gray-200">
          <div className="text-center text-gray-500 text-sm">
            <p className="mb-2">
              ⚽ <span className="font-medium">FutbolAI - Your football analytics companion</span>
            </p>
            <p className="text-gray-400">
              Powered by verified data sources and AI analysis • 2025/2026 Season
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}