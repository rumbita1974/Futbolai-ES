'use client';

import { useState, useEffect, useRef } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { searchWithGROQ, Team, Player, searchFresh, clearSearchCache } from '@/services/groqService';
import { useTranslation } from '@/hooks/useTranslation';
import { translateTeamData } from '@/services/translationService';
import EnhancedTeamResults from '@/components/EnhancedTeamResults';

interface SearchResult {
  players: Player[];
  teams: Team[];
  youtubeQuery: string;
  error?: string;
  message?: string;
  _metadata?: any;
}

// Cache interface
interface CacheItem {
  data: SearchResult;
  timestamp: number;
  language: string;
}

export default function TeamsPage() {
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<SearchResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);
  const { t, language } = useTranslation();
  
  // Cache busting states
  const [cacheStatus, setCacheStatus] = useState<'fresh' | 'cached' | 'none'>('none');
  const [lastRefreshed, setLastRefreshed] = useState<Date | null>(null);
  const [refreshCount, setRefreshCount] = useState(0);
  
  const searchParams = useSearchParams();
  const router = useRouter();
  
  // Refs to track state without triggering re-renders
  const hasAutoSearchedRef = useRef(false);
  const lastSearchTimeRef = useRef<number>(0);

  // Clear cache on initial load (helps with mobile cache issues)
  useEffect(() => {
    const clearCacheOnLoad = () => {
      try {
        // Only run in browser
        if (typeof window === 'undefined') return;
        
        // Clear all team search cache
        const keysToRemove: string[] = [];
        for (let i = 0; i < localStorage.length; i++) {
          const key = localStorage.key(i);
          if (key?.startsWith('teams_search_cache_')) {
            keysToRemove.push(key);
          }
        }
        
        keysToRemove.forEach(key => localStorage.removeItem(key));
        console.log('Cleared cache on load:', keysToRemove.length, 'items');
        setRefreshCount(0);
      } catch (err) {
        console.error('Clear cache on load error:', err);
      }
    };
    
    // Clear cache when page loads
    if (typeof window !== 'undefined') {
      clearCacheOnLoad();
    }
    
    // Also clear cache periodically
    const interval = setInterval(() => {
      if (typeof window !== 'undefined') {
        clearCacheOnLoad();
      }
    }, 10 * 60 * 1000); // Clear every 10 minutes
    
    return () => clearInterval(interval);
  }, []);

  // Get current language translations using the hook
  const getTranslation = (key: string): string => {
    return t(`teams.${key}`);
  };

  // Local cache implementation with cache busting support
  const getCachedResult = (query: string, forceFresh: boolean = false): SearchResult | null => {
    if (forceFresh) {
      console.log('Force fresh search, ignoring cache for:', query);
      return null;
    }
    
    try {
      // Check if we're in browser environment
      if (typeof window === 'undefined') return null;
      
      const cacheKey = `teams_search_cache_${query.toLowerCase()}_${language}`;
      const cached = localStorage.getItem(cacheKey);
      if (!cached) return null;
      
      const cacheItem: CacheItem = JSON.parse(cached);
      const now = Date.now();
      const cacheAge = now - cacheItem.timestamp;
      
      // Cache valid for 30 minutes (1800000 ms)
      if (cacheAge < 1800000 && cacheItem.language === language) {
        console.log('Using cached team result for:', query, `(${Math.floor(cacheAge/1000)}s old)`);
        setCacheStatus('cached');
        return cacheItem.data;
      } else {
        console.log('Cache expired for:', query, `(${Math.floor(cacheAge/1000)}s old)`);
        localStorage.removeItem(cacheKey); // Remove expired cache
      }
    } catch (err) {
      console.error('Cache read error:', err);
    }
    return null;
  };

  const setCachedResult = (query: string, data: SearchResult) => {
    try {
      // Only run in browser
      if (typeof window === 'undefined') return;
      
      const cacheKey = `teams_search_cache_${query.toLowerCase()}_${language}`;
      const cacheItem: CacheItem = {
        data,
        timestamp: Date.now(),
        language
      };
      localStorage.setItem(cacheKey, JSON.stringify(cacheItem));
    } catch (err) {
      console.error('Cache write error:', err);
    }
  };

  // Clear cache for specific query
  const clearCachedResult = (query: string) => {
    try {
      if (typeof window !== 'undefined') {
        const cacheKey = `teams_search_cache_${query.toLowerCase()}_${language}`;
        localStorage.removeItem(cacheKey);
        console.log('Cleared cache for:', query);
      }
    } catch (err) {
      console.error('Cache clear error:', err);
    }
  };

  // Clear all cache
  const clearAllCache = () => {
    try {
      // Only clear if cache exists
      
      let clearedCount = 0;
      for (let i = localStorage.length - 1; i >= 0; i--) {
        const key = localStorage.key(i);
        if (key?.startsWith('teams_search_cache_')) {
          localStorage.removeItem(key);
          clearedCount++;
        }
      }
      
      // Also clear the in-memory cache in groqService
      clearSearchCache();
      
      console.log(`[CACHE] Cleared ${clearedCount} items`);
      setCacheStatus('none');
      setRefreshCount(prev => prev + 1);
      
      // Show success message
      alert(`Cleared ${clearedCount} cached items`);
      
    } catch (err) {
      console.error('Clear all cache error:', err);
      alert('Error clearing cache');
    }
  };

  // Check for auto-search from URL params
  useEffect(() => {
    const searchParam = searchParams.get('search');
    
    // Auto-search if search param is present
    if (searchParam && !searchQuery) {
      const now = Date.now();
      const timeSinceLastAutoSearch = now - lastSearchTimeRef.current;
      
      // Prevent rapid consecutive auto-searches
      if (timeSinceLastAutoSearch > 5000 && !hasAutoSearchedRef.current) { // 5 second cooldown
        setSearchQuery(searchParam);
        hasAutoSearchedRef.current = true;
        lastSearchTimeRef.current = now;
        
        // Check cache first
        const cached = getCachedResult(searchParam);
        if (cached) {
          console.log('Using cached auto-search team result for:', searchParam);
          setSearchResults(cached);
          return;
        }
        
        // Auto-trigger search after a short delay
        const timer = setTimeout(() => {
          handleSearchWithCache(searchParam, false, true);
        }, 500);
        
        return () => clearTimeout(timer);
      }
    }
  }, [searchParams]);

  // Unified search function with caching and cache busting - FIXED VERSION
  const handleSearchWithCache = async (query: string, forceFresh: boolean = false, isAutoSearch = false) => {
    const now = Date.now();
    const timeSinceLastSearch = now - lastSearchTimeRef.current;
    
    // Debounce: Prevent searches within 1 second
    if (timeSinceLastSearch < 1000 && !isAutoSearch && !forceFresh) {
      console.log('Search debounced, too soon since last search');
      return;
    }
    
    // Check cache first (unless forcing fresh)
    if (!forceFresh && !isAutoSearch) {
      const cached = getCachedResult(query, forceFresh);
      if (cached) {
        console.log('Using cached team result for:', query);
        setSearchResults(cached);
        setCacheStatus('cached');
        return;
      }
    }
    
    // Clear cache if forcing fresh
    if (forceFresh) {
      clearCachedResult(query);
      setCacheStatus('fresh');
    }
    
    setLoading(true);
    setSearchError(null);
    if (!isAutoSearch) {
      setSearchResults(null);
    }

    try {
      console.log(`${forceFresh ? 'FRESH ' : ''}${isAutoSearch ? 'Auto-' : ''}Searching team for:`, query);
      
      // FIXED: Use searchWithGROQ with isTeamSearch = true for ALL searches on the teams page
      const result = await searchWithGROQ(query, language, forceFresh, true);
      
      // Translate the results if not in English
      const translatedResult = language !== 'en' 
        ? translateTeamData(result, language)
        : result;
      
      console.log(`${forceFresh ? 'FRESH ' : ''}${isAutoSearch ? 'Auto-' : ''}Team search result:`, translatedResult);
      
      if (result.error) {
        setSearchError(result.error);
        setCacheStatus('none');
      } else {
        setSearchResults(translatedResult); // Use translated result
        setLastRefreshed(new Date());
        
        // Cache successful results (unless it's a fresh search)
        if (!forceFresh && !result.error) {
          setCachedResult(query, translatedResult); // Cache translated result
        }
      }
    } catch (err: any) {
      console.error('Team search error:', err);
      setSearchError(isAutoSearch ? getTranslation('searchFailed') : getTranslation('searchError'));
      setCacheStatus('none');
    } finally {
      setLoading(false);
      lastSearchTimeRef.current = Date.now();
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

  // Refresh current search with cache busting
  const handleRefreshSearch = () => {
    if (searchQuery) {
      console.log('Refreshing search with cache busting:', searchQuery);
      handleSearchWithCache(searchQuery, true);
    }
  };

  // Force refresh all cache
  const handleForceRefreshAll = () => {
    clearAllCache();
    if (searchQuery) {
      handleSearchWithCache(searchQuery, true);
    }
  };

  const exampleTeams = [
    { term: 'Real Madrid', type: 'club', emoji: '🏆' },
    { term: 'Argentina', type: 'national', emoji: '🇦🇷' },
    { term: 'Manchester City', type: 'club', emoji: '🔵' },
    { term: 'Brazil', type: 'national', emoji: '🇧🇷' },
    { term: 'FC Barcelona', type: 'club', emoji: '🔴🔵' },
    { term: 'France', type: 'national', emoji: '🇫🇷' },
    { term: 'Bayern Munich', type: 'club', emoji: '🔴' },
    { term: 'Germany', type: 'national', emoji: '🇩🇪' },
    { term: 'Liverpool', type: 'club', emoji: '🔴' },
    { term: 'Italy', type: 'national', emoji: '🇮🇹' }
  ];

  const handleExampleSearch = (term: string) => {
    setSearchQuery(term);
    handleSearchWithCache(term);
  };

  // Function to get team flag image URL
  const getTeamFlagUrl = (teamName: string, teamType: string, country?: string): string => {
    // Map country names to ISO codes
    const countryCodes: Record<string, string> = {
      'argentina': 'ar',
      'brazil': 'br',
      'france': 'fr',
      'germany': 'de',
      'italy': 'it',
      'spain': 'es',
      'england': 'gb-eng',
      'portugal': 'pt',
      'netherlands': 'nl',
      'belgium': 'be',
      'uruguay': 'uy',
      'chile': 'cl',
      'colombia': 'co',
      'mexico': 'mx',
      'usa': 'us',
      'canada': 'ca',
      'japan': 'jp',
      'south korea': 'kr',
      'australia': 'au',
      'morocco': 'ma',
      'senegal': 'sn',
      'egypt': 'eg',
      'ghana': 'gh',
      'nigeria': 'ng',
      'croatia': 'hr',
      'switzerland': 'ch',
      'sweden': 'se',
      'denmark': 'dk',
      'norway': 'no'
    };

    if (teamType === 'national' && country) {
      const countryLower = country.toLowerCase();
      for (const [countryName, code] of Object.entries(countryCodes)) {
        if (countryLower.includes(countryName) || countryName.includes(countryLower)) {
          return `https://flagcdn.com/w80/${code}.png`;
        }
      }
    }

    // For clubs, try to get country from team name or use default
    if (teamType === 'club') {
      for (const [countryName, code] of Object.entries(countryCodes)) {
        if (teamName.toLowerCase().includes(countryName)) {
          return `https://flagcdn.com/w40/${code}.png`;
        }
      }
      
      // Major club leagues mapping
      if (teamName.toLowerCase().includes('real madrid') || teamName.toLowerCase().includes('barcelona')) {
        return `https://flagcdn.com/w40/es.png`;
      } else if (teamName.toLowerCase().includes('manchester') || teamName.toLowerCase().includes('liverpool') || teamName.toLowerCase().includes('chelsea')) {
        return `https://flagcdn.com/w40/gb-eng.png`;
      } else if (teamName.toLowerCase().includes('bayern') || teamName.toLowerCase().includes('dortmund')) {
        return `https://flagcdn.com/w40/de.png`;
      } else if (teamName.toLowerCase().includes('juventus') || teamName.toLowerCase().includes('milan')) {
        return `https://flagcdn.com/w40/it.png`;
      } else if (teamName.toLowerCase().includes('psg')) {
        return `https://flagcdn.com/w40/fr.png`;
      }
    }

    // Default football icon
    return 'https://img.icons8.com/color/96/soccer-ball--v1.png';
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-900 via-gray-800 to-black text-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 md:py-12">
        {/* Header */}
        <div className="text-center mb-8 md:mb-12">
          <h1 className="text-4xl md:text-5xl font-bold mb-4">
            <span className="bg-gradient-to-r from-blue-400 to-green-400 bg-clip-text text-transparent">
              {getTranslation('title') || 'Team Analysis'}
            </span>
          </h1>
          <p className="text-xl md:text-2xl text-gray-300 mb-6 max-w-3xl mx-auto">
            {getTranslation('subtitle') || 'Comprehensive analysis of football teams with squad details, achievements, and historical data'}
          </p>
          
          {/* Feature Badges */}
          <div className="flex flex-wrap justify-center gap-3 mb-6">
            <span className="px-3 py-1.5 bg-blue-100/10 text-blue-400 rounded-full text-sm font-medium flex items-center border border-blue-400/30">
              <span className="mr-1">👥</span> {getTranslation('currentSquad') || 'Current Squad'}
            </span>
            <span className="px-3 py-1.5 bg-green-100/10 text-green-400 rounded-full text-sm font-medium flex items-center border border-green-400/30">
              <span className="mr-1">🏆</span> {getTranslation('achievements') || 'Achievements'}
            </span>
            <span className="px-3 py-1.5 bg-purple-100/10 text-purple-400 rounded-full text-sm font-medium flex items-center border border-purple-400/30">
              <span className="mr-1">📊</span> {getTranslation('stats') || 'Statistics'}
            </span>
            <span className="px-3 py-1.5 bg-red-100/10 text-red-400 rounded-full text-sm font-medium flex items-center border border-red-400/30">
              <span className="mr-1">🎥</span> {getTranslation('highlights') || 'Highlights'}
            </span>
          </div>
        </div>

        {/* Search Section */}
        <div className="max-w-3xl mx-auto mb-8 md:mb-12">
          <form onSubmit={handleSearch} className="relative">
            <div className="flex flex-col sm:flex-row gap-3 sm:gap-4">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder={getTranslation('searchPlaceholder') || 'Search for any national team or football club...'}
                className="flex-1 px-4 sm:px-6 py-3 sm:py-4 text-base sm:text-lg text-gray-900 bg-white border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent placeholder-gray-500 shadow-sm"
                disabled={loading}
                autoFocus
              />
              <button
                type="submit"
                disabled={loading || !searchQuery.trim()}
                className="px-6 sm:px-8 py-3 sm:py-4 bg-gradient-to-r from-blue-600 to-green-500 text-white font-semibold rounded-xl hover:opacity-90 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition shadow-sm"
              >
                {loading ? (
                  <span className="flex items-center justify-center">
                    <svg className="animate-spin -ml-1 mr-2 sm:mr-3 h-4 w-4 sm:h-5 sm:w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    {getTranslation('searching') || 'Analyzing...'}
                  </span>
                ) : (
                  <>
                    🔍 {getTranslation('searchButton') || 'Analyze Team'}
                    {cacheStatus === 'cached' && <span className="ml-2 text-xs bg-yellow-500/20 text-yellow-300 px-2 py-0.5 rounded">CACHED</span>}
                  </>
                )}
              </button>
            </div>
          </form>

          {/* Cache Status and Controls */}
          {(searchResults || cacheStatus !== 'none') && !loading && (
            <div className="mt-4 mb-4">
              <div className="flex flex-wrap items-center justify-between gap-2 bg-gray-900/30 border border-gray-700 rounded-lg p-3">
                <div className="flex items-center gap-2">
                  <div className={`w-2 h-2 rounded-full ${
                    cacheStatus === 'fresh' ? 'bg-green-500 animate-pulse' :
                    cacheStatus === 'cached' ? 'bg-yellow-500' : 'bg-gray-500'
                  }`} />
                  <span className="text-sm text-gray-300">
                    {cacheStatus === 'fresh' ? '🔄 Fresh data loaded' :
                     cacheStatus === 'cached' ? '💾 Using cached data' :
                     '⚡ Live search'}
                  </span>
                  {lastRefreshed && (
                    <span className="text-xs text-gray-400 ml-2">
                      • Last updated: {lastRefreshed.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                    </span>
                  )}
                </div>
                
                <div className="flex items-center gap-2">
                  <button
                    onClick={handleRefreshSearch}
                    disabled={loading || !searchQuery}
                    className="px-3 py-1.5 text-sm bg-blue-900/40 border border-blue-700 text-blue-300 rounded-lg hover:bg-blue-800 hover:border-blue-600 disabled:opacity-50 disabled:cursor-not-allowed transition flex items-center"
                    title="Refresh with latest data"
                  >
                    <span className="mr-1">🔄</span>
                    Refresh
                  </button>
                  
                  <button
                    onClick={handleForceRefreshAll}
                    disabled={loading}
                    className="px-3 py-1.5 text-sm bg-red-900/40 border border-red-700 text-red-300 rounded-lg hover:bg-red-800 hover:border-red-600 disabled:opacity-50 disabled:cursor-not-allowed transition flex items-center"
                    title="Clear all cache and refresh"
                  >
                    <span className="mr-1">🗑️</span>
                    Clear Cache
                  </button>
                </div>
              </div>
              
              {/* Cache Stats */}
              <div className="text-xs text-gray-500 mt-2 text-center">
                Cache busted {refreshCount} time{refreshCount !== 1 ? 's' : ''} this session
                {refreshCount > 0 && ' • Refresh to get latest 2024/2025 data'}
              </div>
            </div>
          )}

          {/* Example searches */}
          <div className="mt-6">
            <p className="text-gray-400 text-sm text-center mb-3">
              {getTranslation('tryExamples') || 'Try searching for:'}
            </p>
            <div className="flex flex-wrap justify-center gap-2">
              {exampleTeams.map(({ term, type, emoji }) => (
                <button
                  key={term}
                  onClick={() => handleExampleSearch(term)}
                  className="px-3 py-2 text-sm bg-gray-900/50 border border-gray-700 text-gray-300 rounded-lg hover:bg-gray-800 hover:border-gray-600 hover:text-white transition flex items-center shadow-sm"
                >
                  <span className="mr-2">{emoji}</span>
                  {term}
                  <span className="ml-2 text-xs px-1.5 py-0.5 rounded bg-gray-800">
                    {type === 'national' ? '🇺🇳' : '🏟️'}
                  </span>
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Error State */}
        {searchError && !loading && (
          <div className="max-w-3xl mx-auto bg-red-900/20 border border-red-700 rounded-xl p-4 sm:p-6 mb-8">
            <div className="flex items-start">
              <div className="flex-shrink-0">
                <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                </svg>
              </div>
              <div className="ml-3">
                <h3 className="text-sm sm:text-base font-medium text-red-300">
                  {getTranslation('searchError') || 'Search Error'}
                </h3>
                <div className="mt-2 text-sm text-red-200">
                  <p>{searchError}</p>
                  <div className="mt-3">
                    <p className="font-medium">Troubleshooting:</p>
                    <ul className="list-disc pl-5 mt-1 space-y-1">
                      <li>Check if API keys are set in <code className="bg-red-900/50 px-1 py-0.5 rounded">.env.local</code></li>
                      <li>Verify your internet connection</li>
                      <li>Try a different search term</li>
                      <li>Click "Refresh" button to clear cache</li>
                    </ul>
                  </div>
                </div>
                <div className="mt-4">
                  <button
                    onClick={() => setSearchError(null)}
                    className="text-sm font-medium text-red-300 hover:text-red-200"
                  >
                    {getTranslation('dismissError') || 'Dismiss'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Loading State */}
        {loading && (
          <div className="max-w-3xl mx-auto text-center py-12 sm:py-16">
            <div className="inline-block animate-spin rounded-full h-12 w-12 sm:h-16 sm:w-16 border-b-2 border-blue-400"></div>
            <p className="mt-4 text-gray-300 text-lg">
              {getTranslation('analyzing') || 'Analyzing team data...'}
            </p>
            <p className="text-gray-400 text-sm mt-2">
              {getTranslation('fetching') || 'Fetching squad details, achievements, and statistics...'}
            </p>
            {cacheStatus === 'fresh' && (
              <p className="text-green-400 text-sm mt-2">
                ⚡ Getting fresh 2024/2025 season data...
              </p>
            )}
          </div>
        )}

        {/* Enhanced Team Results */}
        {searchResults && !loading && (
          <EnhancedTeamResults
            teams={searchResults.teams}
            players={searchResults.players}
            youtubeQuery={searchResults.youtubeQuery}
            searchTerm={searchQuery}
            getTeamFlagUrl={getTeamFlagUrl}
            language={language}
            cacheStatus={cacheStatus}
            lastRefreshed={lastRefreshed}
          />
        )}

        {/* Features Section - Only show when no search results */}
        {!searchResults && !loading && !searchError && (
          <div className="max-w-6xl mx-auto mt-12 md:mt-16">
            <h2 className="text-2xl md:text-3xl font-bold text-center text-gray-200 mb-8 md:mb-10">
              {getTranslation('featuresTitle') || 'Comprehensive Team Analysis'}
            </h2>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 md:gap-8 mb-12">
              {/* Feature 1 */}
              <div className="group bg-gray-900/40 rounded-xl border border-gray-800 p-6 hover:border-blue-500/50 transition-all hover:-translate-y-1">
                <div className="text-blue-400 text-4xl md:text-5xl mb-4 group-hover:scale-110 transition">👥</div>
                <h3 className="text-xl font-bold text-white mb-3">
                  {getTranslation('currentSquadTitle') || 'Current Squad'}
                </h3>
                <p className="text-gray-400 mb-4">
                  {getTranslation('currentSquadDesc') || 'Detailed roster with player photos, positions, age, current clubs, and appearances'}
                </p>
                <div className="mt-4 text-sm text-blue-300">
                  <span className="font-medium">Includes:</span> Player profiles, statistics, formation analysis
                </div>
              </div>

              {/* Feature 2 */}
              <div className="group bg-gray-900/40 rounded-xl border border-gray-800 p-6 hover:border-green-500/50 transition-all hover:-translate-y-1">
                <div className="text-green-400 text-4xl md:text-5xl mb-4 group-hover:scale-110 transition">🏆</div>
                <h3 className="text-xl font-bold text-white mb-3">
                  {getTranslation('achievementsTitle') || 'Team Achievements'}
                </h3>
                <p className="text-gray-400 mb-4">
                  {getTranslation('achievementsDesc') || 'Complete list of domestic, continental, and international trophies'}
                </p>
                <div className="mt-4 text-sm text-green-300">
                  <span className="font-medium">Covers:</span> World Cups, Champions League, league titles, cups
                </div>
              </div>

              {/* Feature 3 */}
              <div className="group bg-gray-900/40 rounded-xl border border-gray-800 p-6 hover:border-purple-500/50 transition-all hover:-translate-y-1">
                <div className="text-purple-400 text-4xl md:text-5xl mb-4 group-hover:scale-110 transition">📜</div>
                <h3 className="text-xl font-bold text-white mb-3">
                  {getTranslation('historyTitle') || 'Historical Legacy'}
                </h3>
                <p className="text-gray-400 mb-4">
                  {getTranslation('historyDesc') || 'Historical players, legendary squads, key moments, and team evolution'}
                </p>
                <div className="mt-4 text-sm text-purple-300">
                  <span className="font-medium">Features:</span> Legendary players, golden eras, iconic matches
                </div>
              </div>
            </div>

            {/* Team Categories */}
            <div className="bg-gradient-to-r from-gray-900 to-gray-800 rounded-2xl border border-gray-700 p-6 md:p-8">
              <h3 className="text-xl md:text-2xl font-bold text-center text-white mb-6">
                {getTranslation('teamCategories') || 'Explore Teams By Category'}
              </h3>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <button
                  onClick={() => handleExampleSearch('Brazil')}
                  className="bg-gradient-to-br from-green-900/30 to-yellow-900/30 border border-green-700/30 rounded-xl p-4 text-center hover:border-green-500 transition group"
                >
                  <div className="text-2xl mb-2">🇧🇷</div>
                  <div className="font-medium text-green-300">South America</div>
                  <div className="text-xs text-gray-400 mt-1">Brazil, Argentina, Uruguay</div>
                </button>
                
                <button
                  onClick={() => handleExampleSearch('France')}
                  className="bg-gradient-to-br from-blue-900/30 to-white/30 border border-blue-700/30 rounded-xl p-4 text-center hover:border-blue-500 transition group"
                >
                  <div className="text-2xl mb-2">🇫🇷</div>
                  <div className="font-medium text-blue-300">Europe</div>
                  <div className="text-xs text-gray-400 mt-1">France, Germany, Spain</div>
                </button>
                
                <button
                  onClick={() => handleExampleSearch('Real Madrid')}
                  className="bg-gradient-to-br from-purple-900/30 to-white/30 border border-purple-700/30 rounded-xl p-4 text-center hover:border-purple-500 transition group"
                >
                  <div className="text-2xl mb-2">🏆</div>
                  <div className="font-medium text-purple-300">Top Clubs</div>
                  <div className="text-xs text-gray-400 mt-1">Real Madrid, Barcelona, Bayern</div>
                </button>
                
                <button
                  onClick={() => handleExampleSearch('Manchester City')}
                  className="bg-gradient-to-br from-red-900/30 to-sky-900/30 border border-red-700/30 rounded-xl p-4 text-center hover:border-red-500 transition group"
                >
                  <div className="text-2xl mb-2">🏟️</div>
                  <div className="font-medium text-red-300">Premier League</div>
                  <div className="text-xs text-gray-400 mt-1">Man City, Liverpool, Arsenal</div>
                </button>
              </div>
            </div>

            {/* Quick Stats */}
            <div className="mt-12 text-center">
              <h3 className="text-xl font-bold text-gray-200 mb-6">
                {getTranslation('dataCoverage') || 'Extensive Team Database'}
              </h3>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="bg-gray-900/50 rounded-xl p-4">
                  <div className="text-2xl md:text-3xl font-bold text-blue-400">200+</div>
                  <div className="text-gray-400 text-sm mt-1">National Teams</div>
                </div>
                <div className="bg-gray-900/50 rounded-xl p-4">
                  <div className="text-2xl md:text-3xl font-bold text-green-400">500+</div>
                  <div className="text-gray-400 text-sm mt-1">Clubs</div>
                </div>
                <div className="bg-gray-900/50 rounded-xl p-4">
                  <div className="text-2xl md:text-3xl font-bold text-purple-400">50+</div>
                  <div className="text-gray-400 text-sm mt-1">Leagues</div>
                </div>
                <div className="bg-gray-900/50 rounded-xl p-4">
                  <div className="text-2xl md:text-3xl font-bold text-red-400">10K+</div>
                  <div className="text-gray-400 text-sm mt-1">Player Profiles</div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Footer Note */}
        <div className="mt-12 md:mt-16 pt-8 border-t border-gray-800">
          <div className="text-center text-gray-500 text-sm">
            <p className="mb-2">
              ⚽ <span className="font-medium text-gray-400">
                {getTranslation('footerNote') || 'AI-powered team analysis with up-to-date statistics'}
              </span>
            </p>
            <p className="text-gray-400">
              {getTranslation('dataSource') || 'Data enhanced with Wikipedia and GROQ AI'}
            </p>
            <p className="text-gray-500 text-xs mt-2">
              ⚡ Click "Refresh" button to get latest 2024/2025 season data
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}