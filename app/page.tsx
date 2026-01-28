'use client';

import { useState, useEffect, useRef } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { searchWithGROQ, Player, Team, searchFresh, clearSearchCache } from '@/services/groqService';
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

// Cache interface
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
  const [cacheStatus, setCacheStatus] = useState<'fresh' | 'cached' | 'none'>('none');
  const [lastRefreshed, setLastRefreshed] = useState<Date | null>(null);
  const [refreshCount, setRefreshCount] = useState(0);
  const [isTeamSearch, setIsTeamSearch] = useState(false);
  
  const searchParams = useSearchParams();
  const router = useRouter();
  const { t, language } = useTranslation();
  
  // Refs to track state without triggering re-renders
  const hasAutoSearchedRef = useRef(false);
  const lastSearchTimeRef = useRef<number>(0);

  // Debug: Log current language and test translation
  useEffect(() => {
    console.log('Current language:', language);
    console.log('Test translation (homepage.title):', t('homepage.title'));
  }, [language, t]);

  // Get current language translations using the hook
  const getTranslation = (key: string): string => {
    return t(`homepage.${key}`);
  };

  // Detect if search is likely a team search
  const detectTeamSearch = (query: string): boolean => {
    const queryLower = query.toLowerCase().trim();
    
    // Comprehensive list of country names (national teams)
    const countryNames = [
      'argentina', 'brazil', 'uruguay', 'paraguay', 'ecuador', 'chile', 'colombia',
      'peru', 'bolivia', 'venezuela', 'mexico', 'usa', 'canada', 'costa rica',
      'france', 'england', 'germany', 'spain', 'italy', 'portugal', 'netherlands',
      'belgium', 'switzerland', 'sweden', 'norway', 'denmark', 'poland', 'croatia',
      'serbia', 'russia', 'ukraine', 'turkey', 'greece', 'japan', 'south korea',
      'china', 'australia', 'new zealand', 'morocco', 'egypt', 'senegal', 'ghana',
      'nigeria', 'ivory coast', 'cameroon', 'algeria', 'tunisia', 'south africa',
      'saudi arabia', 'iran', 'iraq', 'uae', 'qatar', 'wales', 'scotland', 'ireland',
      'finland', 'austria', 'hungary', 'czech', 'slovakia', 'slovenia'
    ];
    
    // Check if query contains a country name
    if (countryNames.some(country => queryLower.includes(country))) {
      console.log(`[TEAM-DETECT] Detected national team search: ${query}`);
      return true;
    }
    
    // Team indicators
    const teamIndicators = ['fc', 'united', 'city', 'cf', 'afc', 'as', 'real', 'fcb', 'cf', 'ac', 'as roma', 'olympique'];
    if (teamIndicators.some(indicator => queryLower.includes(indicator))) {
      console.log(`[TEAM-DETECT] Detected club team search: ${query}`);
      return true;
    }
    
    // If query is exactly a common team name
    const commonTeams = ['barcelona', 'real madrid', 'manchester city', 'bayern munich', 'liverpool', 
                        'chelsea', 'arsenal', 'tottenham', 'psg', 'juventus', 'ac milan', 'inter milan'];
    if (commonTeams.some(team => queryLower === team.toLowerCase())) {
      console.log(`[TEAM-DETECT] Detected common team search: ${query}`);
      return true;
    }
    
    return false;
  };

  // Clear old cache on initial load
  useEffect(() => {
    const clearOldCache = () => {
      try {
        if (typeof window === 'undefined') return;
        
        const keysToRemove: string[] = [];
        const now = Date.now();
        
        for (let i = 0; i < localStorage.length; i++) {
          const key = localStorage.key(i);
          if (key?.startsWith('search_cache_')) {
            try {
              const item = localStorage.getItem(key);
              if (item) {
                const cacheItem = JSON.parse(item);
                const cacheAge = now - cacheItem.timestamp;
                
                // Clear very old cache (24+ hours) or old versions
                if (cacheAge > 24 * 60 * 60 * 1000 || !key.includes('v2.2')) {
                  keysToRemove.push(key);
                }
              }
            } catch (err) {
              // If parsing fails, remove the key
              keysToRemove.push(key);
            }
          }
        }
        
        keysToRemove.forEach(key => localStorage.removeItem(key));
        if (keysToRemove.length > 0) {
          console.log('Cleared old homepage cache:', keysToRemove.length, 'items');
        }
      } catch (err) {
        console.error('Clear cache error:', err);
      }
    };
    
    // Clear cache when page loads
    if (typeof window !== 'undefined') {
      clearOldCache();
    }
  }, []);

  // Local cache implementation with versioning
  const getCachedResult = (query: string, forceFresh: boolean = false): SearchResult | null => {
    if (forceFresh) {
      console.log('Force fresh search, ignoring cache for:', query);
      return null;
    }
    
    try {
      if (typeof window === 'undefined') return null;
      
      // Versioned cache key - increment when making data structure changes
      const CACHE_VERSION = 'v2.2'; // Updated version with national team fixes
      const cacheKey = `search_cache_${CACHE_VERSION}_${query.toLowerCase()}_${language}`;
      
      const cached = localStorage.getItem(cacheKey);
      if (!cached) return null;
      
      const cacheItem: CacheItem = JSON.parse(cached);
      const now = Date.now();
      const cacheAge = now - cacheItem.timestamp;
      
      // Cache valid for 1 hour (3600000 ms)
      if (cacheAge < 3600000 && cacheItem.language === language) {
        console.log('Using cached result for:', query, `(${Math.floor(cacheAge/1000)}s old)`);
        setCacheStatus('cached');
        
        // Check if cached data has proper national team categorization
        if (cacheItem.data.teams && cacheItem.data.teams.length > 0) {
          const team = cacheItem.data.teams[0];
          const isNationalTeam = team.type === 'national';
          console.log(`[CACHE-CHECK] Cached team: ${team.name}, type: ${team.type}, isNational: ${isNationalTeam}`);
          
          // If it's a national team but type is wrong, we should refresh
          if (detectTeamSearch(query) && team.type === 'club') {
            console.log(`[CACHE-FIX] Cached national team has wrong type, forcing refresh`);
            localStorage.removeItem(cacheKey);
            return null;
          }
        }
        
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
      if (typeof window !== 'undefined') {
        // Versioned cache key
        const CACHE_VERSION = 'v2.2';
        const cacheKey = `search_cache_${CACHE_VERSION}_${query.toLowerCase()}_${language}`;
        
        const cacheItem: CacheItem = {
          data,
          timestamp: Date.now(),
          language
        };
        localStorage.setItem(cacheKey, JSON.stringify(cacheItem));
        console.log(`[CACHE] Saved result for: ${query}`);
      }
    } catch (err) {
      console.error('Cache write error:', err);
    }
  };

  // Clear cache for specific query
  const clearCachedResult = (query: string) => {
    try {
      if (typeof window !== 'undefined') {
        // Clear all versions
        const keysToRemove: string[] = [];
        for (let i = 0; i < localStorage.length; i++) {
          const key = localStorage.key(i);
          if (key?.includes(`_${query.toLowerCase()}_`) && key?.startsWith('search_cache_')) {
            keysToRemove.push(key);
          }
        }
        
        keysToRemove.forEach(key => localStorage.removeItem(key));
        console.log('Cleared cache for:', query, keysToRemove.length, 'items');
      }
    } catch (err) {
      console.error('Cache clear error:', err);
    }
  };

  // Clear all cache
  const clearAllCache = () => {
    try {
      if (typeof window === 'undefined') return;
      
      let clearedCount = 0;
      for (let i = localStorage.length - 1; i >= 0; i--) {
        const key = localStorage.key(i);
        if (key?.startsWith('search_cache_')) {
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

  // Check if coming from a group page
  useEffect(() => {
    const groupParam = searchParams.get('group');
    const searchParam = searchParams.get('search');
    
    if (groupParam) {
      setComingFromGroup(groupParam);
    }
    
    // FIXED: Check if we should auto-search - only if there's a search param AND we haven't searched yet
    if (searchParam && !hasAutoSearchedRef.current) {
      const now = Date.now();
      const timeSinceLastAutoSearch = now - lastSearchTimeRef.current;
      
      // Prevent rapid consecutive auto-searches
      if (timeSinceLastAutoSearch > 5000) { // 5 second cooldown
        console.log('Auto-searching for:', searchParam);
        setSearchQuery(searchParam);
        
        // Detect if this is a team search
        const isTeam = detectTeamSearch(searchParam);
        setIsTeamSearch(isTeam);
        if (isTeam) {
          setActiveTab('team');
        }
        
        hasAutoSearchedRef.current = true;
        lastSearchTimeRef.current = now;
        
        // Check cache first
        const cached = getCachedResult(searchParam);
        if (cached) {
          console.log('Using cached auto-search result for:', searchParam);
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
  }, [searchParams]); // Removed searchQuery from dependencies

  // OPTIMIZED: Unified search function with caching
  const handleSearchWithCache = async (query: string, forceFresh: boolean = false, isAutoSearch = false) => {
    const now = Date.now();
    const timeSinceLastSearch = now - lastSearchTimeRef.current;
    
    // Debounce: Prevent searches within 1 second
    if (timeSinceLastSearch < 1000 && !isAutoSearch && !forceFresh) {
      console.log('Search debounced, too soon since last search');
      return;
    }
    
    // Detect if this is a team search
    const isTeam = detectTeamSearch(query);
    setIsTeamSearch(isTeam);
    if (isTeam) {
      setActiveTab('team');
    }
    
    // Check cache first (except for auto-searches that already checked)
    if (!forceFresh && !isAutoSearch) {
      const cached = getCachedResult(query, forceFresh);
      if (cached) {
        console.log('Using cached result for:', query);
        setSearchResults(cached);
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
      console.log(`${forceFresh ? 'FRESH ' : ''}${isAutoSearch ? 'Auto-' : ''}Searching for:`, query);
      console.log(`[SEARCH-TYPE] ${isTeam ? 'Team search detected' : 'Player search detected'}`);
      
      // Add metadata for team searches to ensure proper national team detection
      const searchOptions = {
        isTeamSearch: isTeam,
        language,
        forceNationalTeamDetection: isTeam // Force detection for team searches
      };
      
      // Use searchFresh for cache busting, or regular search otherwise
      const result = forceFresh 
        ? await searchFresh(query)
        : await searchWithGROQ(query, language);
      
      console.log(`${forceFresh ? 'FRESH ' : ''}${isAutoSearch ? 'Auto-' : ''}Search result:`, result);
      
      if (result.error) {
        setSearchError(result.error);
        setCacheStatus('none');
      } else {
        // Check if team type is correct for national teams
        if (isTeam && result.teams && result.teams.length > 0) {
          const team = result.teams[0];
          const shouldBeNational = detectTeamSearch(query);
          
          if (shouldBeNational && team.type === 'club') {
            console.warn(`[TEAM-TYPE-FIX] Team should be national but is club: ${team.name}`);
            
            // Add warning to metadata
            result._metadata = {
              ...result._metadata,
              teamTypeWarning: `Team "${team.name}" was detected as club but should be national. This may affect trophy categorization.`,
              recommendations: [
                ...(result._metadata?.recommendations || []),
                'Team type may be incorrect. Try refreshing for proper national team categorization.'
              ]
            };
          }
        }
        
        setSearchResults(result);
        setLastRefreshed(new Date());
        
        // Cache successful results (unless it's a fresh search)
        if (!forceFresh && !result.error) {
          setCachedResult(query, result);
        }
      }
    } catch (err: any) {
      console.error('Search error:', err);
      setSearchError(isAutoSearch ? 'Failed to perform auto-search.' : 'Failed to perform search. Please try again.');
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

  const handleBackToGroup = () => {
    if (comingFromGroup) {
      router.push(`/world-cup?group=${comingFromGroup}`);
    } else {
      router.push('/world-cup');
    }
  };

  // Navigate to Fantasy & Odds page
  const navigateToFantasyOdds = () => {
    router.push('/fantasy-odds');
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
      { term: 'Brazil', emoji: '🇧🇷' },
      { term: 'Uruguay', emoji: '🇺🇾' },
      { term: 'Japan', emoji: '🇯🇵' },
      { term: 'Morocco', emoji: '🇲🇦' }
    ]
  };

  const handleExampleSearch = (term: string) => {
    setSearchQuery(term);
    
    // Detect if this is a team search
    const isTeam = detectTeamSearch(term);
    setIsTeamSearch(isTeam);
    if (isTeam) {
      setActiveTab('team');
    }
    
    handleSearchWithCache(term);
  };

  // Get appropriate placeholder based on active tab
  const getSearchPlaceholder = () => {
    if (activeTab === 'team') {
      return 'Search for a team (e.g., "Brazil", "Real Madrid")';
    }
    return 'Search for a player (e.g., "Lionel Messi")';
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-50 to-blue-50">
      <div className="max-w-7xl mx-auto px-4 py-8 sm:py-12">
        {/* Header with Back Button */}
        <div className="mb-8 sm:mb-12">
          {comingFromGroup && (
            <div className="mb-6 bg-gradient-to-r from-blue-50 to-green-50 border border-blue-200 rounded-xl p-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <div className="flex items-center">
                    <div className="w-10 h-10 bg-gradient-to-r from-blue-600 to-green-500 rounded-xl flex items-center justify-center mr-3">
                      <span className="text-xl">⚽</span>
                    </div>
                    <div>
                      <h3 className="font-bold text-gray-800">
                        {getTranslation('fromGroup')} {comingFromGroup}
                      </h3>
                      <p className="text-gray-600 text-sm">{getTranslation('groupBack')}</p>
                    </div>
                  </div>
                </div>
                <button
                  onClick={handleBackToGroup}
                  className="flex items-center justify-center px-4 py-2 bg-gradient-to-r from-blue-600 to-green-500 text-white rounded-lg hover:opacity-90 transition font-medium shadow-sm whitespace-nowrap"
                >
                  <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                  </svg>
                  {getTranslation('backToGroup')} {comingFromGroup}
                </button>
              </div>
            </div>
          )}

          <div className="text-center">
            <h1 className="text-4xl sm:text-5xl font-bold text-gray-900 mb-3 sm:mb-4">
              {getTranslation('title')}
            </h1>
            <p className="text-lg sm:text-xl text-gray-600 mb-6 sm:mb-8 max-w-3xl mx-auto px-4">
              {getTranslation('subtitle')}
            </p>
            
            {/* Feature Badges */}
            <div className="flex flex-wrap justify-center gap-3 mb-6">
              <span className="px-3 py-1.5 bg-blue-100 text-blue-700 rounded-full text-sm font-medium flex items-center">
                <span className="mr-1">🤖</span> {getTranslation('aiAnalysis')}
              </span>
              <span className="px-3 py-1.5 bg-green-100 text-green-700 rounded-full text-sm font-medium flex items-center">
                <span className="mr-1">📊</span> {getTranslation('detailedStats')}
              </span>
              <span className="px-3 py-1.5 bg-purple-100 text-purple-700 rounded-full text-sm font-medium flex items-center">
                <span className="mr-1">🎲</span> Fantasy & Odds
              </span>
              <span className="px-3 py-1.5 bg-red-100 text-red-700 rounded-full text-sm font-medium flex items-center">
                <span className="mr-1">📺</span> {getTranslation('videoHighlights')}
              </span>
              <span className="px-3 py-1.5 bg-yellow-100 text-yellow-700 rounded-full text-sm font-medium flex items-center">
                <span className="mr-1">🏆</span> Trophy Data Fix
              </span>
            </div>
          </div>
        </div>

        {/* Search Section */}
        <div className="max-w-3xl mx-auto mb-8 sm:mb-12">
          {/* Tab Selection */}
          <div className="flex justify-center mb-6">
            <div className="inline-flex rounded-lg border border-gray-300 bg-white p-1">
              <button
                onClick={() => {
                  setActiveTab('player');
                  setIsTeamSearch(false);
                }}
                className={`px-4 sm:px-6 py-2 rounded-md text-sm font-medium transition ${activeTab === 'player' ? 'bg-blue-600 text-white shadow' : 'text-gray-700 hover:bg-gray-100'}`}
              >
                👤 {getTranslation('playerSearch')}
              </button>
              <button
                onClick={() => {
                  setActiveTab('team');
                  setIsTeamSearch(true);
                }}
                className={`px-4 sm:px-6 py-2 rounded-md text-sm font-medium transition ${activeTab === 'team' ? 'bg-blue-600 text-white shadow' : 'text-gray-700 hover:bg-gray-100'}`}
              >
                🏟️ {getTranslation('teamSearch')}
              </button>
            </div>
          </div>

          <form onSubmit={handleSearch} className="relative">
            <div className="flex flex-col sm:flex-row gap-3 sm:gap-4">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder={getSearchPlaceholder()}
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
                    {getTranslation('searching')}
                  </span>
                ) : getTranslation('searchButton')}
              </button>
            </div>
            
            {/* Search type indicator */}
            {searchQuery && (
              <div className="mt-2 text-sm text-gray-500 flex items-center">
                {isTeamSearch ? (
                  <>
                    <span className="inline-block w-2 h-2 bg-blue-500 rounded-full mr-2"></span>
                    Detected as team search
                  </>
                ) : (
                  <>
                    <span className="inline-block w-2 h-2 bg-green-500 rounded-full mr-2"></span>
                    Detected as player search
                  </>
                )}
              </div>
            )}
          </form>

          {/* Cache Status and Controls */}
          {(searchResults || cacheStatus !== 'none') && !loading && (
            <div className="mt-4 mb-4">
              <div className="flex flex-wrap items-center justify-between gap-2 bg-blue-50 border border-blue-200 rounded-lg p-3">
                <div className="flex items-center gap-2">
                  <div className={`w-2 h-2 rounded-full ${
                    cacheStatus === 'fresh' ? 'bg-green-500 animate-pulse' :
                    cacheStatus === 'cached' ? 'bg-yellow-500' : 'bg-gray-500'
                  }`} />
                  <span className="text-sm text-gray-700">
                    {cacheStatus === 'fresh' ? '🔄 Fresh data loaded' :
                     cacheStatus === 'cached' ? '💾 Using cached data' :
                     '⚡ Live search'}
                  </span>
                  {lastRefreshed && (
                    <span className="text-xs text-gray-500 ml-2">
                      • Last updated: {lastRefreshed.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                    </span>
                  )}
                </div>
                
                <div className="flex items-center gap-2">
                  <button
                    onClick={handleRefreshSearch}
                    disabled={loading || !searchQuery}
                    className="px-3 py-1.5 text-sm bg-blue-100 border border-blue-300 text-blue-700 rounded-lg hover:bg-blue-200 hover:border-blue-400 disabled:opacity-50 disabled:cursor-not-allowed transition flex items-center"
                    title="Refresh with latest data"
                  >
                    <span className="mr-1">🔄</span>
                    Refresh
                  </button>
                  
                  <button
                    onClick={handleForceRefreshAll}
                    disabled={loading}
                    className="px-3 py-1.5 text-sm bg-red-100 border border-red-300 text-red-700 rounded-lg hover:bg-red-200 hover:border-red-400 disabled:opacity-50 disabled:cursor-not-allowed transition flex items-center"
                    title="Clear all cache and refresh"
                  >
                    <span className="mr-1">🗑️</span>
                    Clear Cache
                  </button>
                </div>
              </div>
              
              {/* Cache Stats and Team Type Warning */}
              <div className="text-xs text-gray-500 mt-2 text-center">
                {searchResults?._metadata?.teamTypeWarning && (
                  <div className="text-yellow-600 mb-1">
                    ⚠️ {searchResults._metadata.teamTypeWarning}
                  </div>
                )}
                Cache busted {refreshCount} time{refreshCount !== 1 ? 's' : ''} this session
                {refreshCount > 0 && ' • Refresh to get latest data with trophy fixes'}
              </div>
            </div>
          )}

          {/* Example searches */}
          <div className="mt-6">
            <p className="text-gray-500 text-sm text-center mb-3">{getTranslation('tryExamples')}</p>
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
            
            {/* National team detection notice */}
            {activeTab === 'team' && (
              <div className="mt-4 text-center text-xs text-gray-500">
                <p>ℹ️ National teams (like Brazil, Argentina, Japan) now show proper trophy categorization</p>
              </div>
            )}
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
                <h3 className="text-sm sm:text-base font-medium text-red-800">{getTranslation('searchError')}</h3>
                <div className="mt-2 text-sm text-red-700">
                  <p>{searchError}</p>
                  <div className="mt-3">
                    <p className="font-medium">Troubleshooting:</p>
                    <ul className="list-disc pl-5 mt-1 space-y-1">
                      <li>Check if API keys are set in <code className="bg-red-100 px-1 py-0.5 rounded">.env.local</code></li>
                      <li>Verify your internet connection</li>
                      <li>Try a different search term</li>
                      <li>Click "Refresh" button to clear cache</li>
                      <li>For national teams, try refreshing to fix trophy categorization</li>
                    </ul>
                  </div>
                </div>
                <div className="mt-4">
                  <button
                    onClick={() => setSearchError(null)}
                    className="text-sm font-medium text-red-800 hover:text-red-900"
                  >
                    {getTranslation('dismissError')}
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
            <p className="mt-4 text-gray-600 text-lg">
              {isTeamSearch ? 'Analyzing team data...' : getTranslation('analyzing')}
            </p>
            <p className="text-gray-500 text-sm mt-2">{getTranslation('fetching')}</p>
            {cacheStatus === 'fresh' && (
              <p className="text-green-600 text-sm mt-2">
                ⚡ Getting fresh data with national team trophy fixes...
              </p>
            )}
            {isTeamSearch && (
              <p className="text-blue-600 text-sm mt-2">
                🏆 Ensuring proper trophy categorization for national teams...
              </p>
            )}
          </div>
        )}

        {/* Enhanced Results */}
        {searchResults && !loading && (
          <EnhancedSearchResults
            players={searchResults.players}
            teams={searchResults.teams}
            youtubeQuery={searchResults.youtubeQuery}
            searchTerm={searchQuery}
            _metadata={searchResults._metadata}
          />
        )}

        {/* Features Section - Only show when no search results */}
        {!searchResults && !loading && !searchError && (
          <div className="max-w-6xl mx-auto mt-12 sm:mt-16">
            <h2 className="text-2xl sm:text-3xl font-bold text-center text-gray-800 mb-8 sm:mb-10">
              {getTranslation('featuresTitle')}
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 sm:gap-8">
              <a 
                href="/world-cup" 
                className="group bg-white rounded-xl shadow-lg p-6 text-center hover:shadow-xl transition hover:-translate-y-1 border border-gray-200"
              >
                <div className="text-blue-600 text-4xl sm:text-5xl mb-4 group-hover:scale-110 transition">⚽</div>
                <h3 className="text-xl font-bold text-gray-800 mb-3">{getTranslation('worldCupTitle')}</h3>
                <p className="text-gray-600 mb-4">{getTranslation('worldCupDesc')}</p>
                <div className="inline-block mt-2 px-4 py-2 bg-blue-600 text-white rounded-lg font-medium group-hover:bg-blue-700 transition">
                  {getTranslation('viewSchedule')}
                </div>
              </a>
              
              <button
                onClick={navigateToFantasyOdds}
                className="group bg-white rounded-xl shadow-lg p-6 text-center hover:shadow-xl transition hover:-translate-y-1 border border-gray-200 cursor-pointer"
              >
                <div className="text-purple-600 text-4xl sm:text-5xl mb-4 group-hover:scale-110 transition">🎲</div>
                <h3 className="text-xl font-bold text-gray-800 mb-3">AI Fantasy & Odds</h3>
                <p className="text-gray-600 mb-4">AI-powered match predictions, fantasy team picks, and betting value analysis</p>
                <div className="inline-block mt-2 px-4 py-2 bg-purple-600 text-white rounded-lg font-medium group-hover:bg-purple-700 transition">
                  View Predictions
                </div>
              </button>
              
              <a 
                href="/highlights" 
                className="group bg-white rounded-xl shadow-lg p-6 text-center hover:shadow-xl transition hover:-translate-y-1 border border-gray-200"
              >
                <div className="text-green-600 text-4xl sm:text-5xl mb-4 group-hover:scale-110 transition">📊</div>
                <h3 className="text-xl font-bold text-gray-800 mb-3">Match Highlights</h3>
                <p className="text-gray-600 mb-4">Latest results, upcoming fixtures, and live scores from major leagues</p>
                <div className="inline-block mt-2 px-4 py-2 bg-green-600 text-white rounded-lg font-medium group-hover:bg-green-700 transition">
                  View Matches
                </div>
              </a>
            </div>

            {/* National Team Fix Notice */}
            <div className="mt-8 bg-gradient-to-r from-red-50 to-blue-50 border border-red-200 rounded-xl p-6">
              <div className="flex items-start">
                <div className="flex-shrink-0 pt-1">
                  <span className="text-2xl">🏆</span>
                </div>
                <div className="ml-4">
                  <h3 className="text-lg font-bold text-gray-800">National Team Trophy Fix</h3>
                  <p className="text-gray-600 mt-1">
                    We've fixed an issue where national teams like <strong>Brazil, Argentina, Uruguay, Japan, Morocco</strong> 
                    were showing trophies incorrectly. Copa América and other international tournaments now appear 
                    in the proper "International" section instead of "Domestic".
                  </p>
                  <div className="mt-3 flex flex-wrap gap-2">
                    <span className="px-2 py-1 bg-red-100 text-red-700 rounded text-xs">National Team</span>
                    <span className="px-2 py-1 bg-purple-100 text-purple-700 rounded text-xs">International Trophies</span>
                    <span className="px-2 py-1 bg-red-100 text-red-700 rounded text-xs">World Cup</span>
                    <span className="px-2 py-1 bg-blue-100 text-blue-700 rounded text-xs">Club Trophies</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Quick Stats */}
            <div className="mt-8 sm:mt-12 bg-gradient-to-r from-blue-600 to-green-600 rounded-2xl p-6 sm:p-8 text-white">
              <h3 className="text-xl sm:text-2xl font-bold mb-6 text-center">📈 Football Data Coverage</h3>
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
                  <div className="text-2xl sm:text-3xl font-bold">200+</div>
                  <div className="text-blue-100 text-sm mt-1">National Teams</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl sm:text-3xl font-bold">100+</div>
                  <div className="text-blue-100 text-sm mt-1">Countries</div>
                </div>
              </div>
              <div className="mt-4 text-center text-blue-100 text-sm">
                <p>✅ National teams now properly categorized with correct trophy display</p>
              </div>
            </div>

            {/* Quick Links */}
            <div className="mt-8 sm:mt-12 text-center">
              <h3 className="text-xl font-bold text-gray-800 mb-6">Quick Access</h3>
              <div className="flex flex-wrap justify-center gap-3">
                <a href="/world-cup" className="px-4 sm:px-6 py-3 bg-blue-100 text-blue-700 rounded-lg hover:bg-blue-200 font-medium">
                  World Cup 2026
                </a>
                <button
                  onClick={navigateToFantasyOdds}
                  className="px-4 sm:px-6 py-3 bg-purple-100 text-purple-700 rounded-lg hover:bg-purple-200 font-medium"
                >
                  Fantasy & Odds
                </button>
                <a href="/highlights" className="px-4 sm:px-6 py-3 bg-green-100 text-green-700 rounded-lg hover:bg-green-200 font-medium">
                  Match Highlights
                </a>
                <button
                  onClick={() => handleExampleSearch('Brazil')}
                  className="px-4 sm:px-6 py-3 bg-red-100 text-red-700 rounded-lg hover:bg-red-200 font-medium"
                >
                  National Teams
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Footer Note */}
        <div className="mt-8 sm:mt-12 pt-8 border-t border-gray-200">
          <div className="text-center text-gray-500 text-sm">
            <p className="mb-2">
              ⚽ <span className="font-medium">Your AI-powered football analytics companion</span>
            </p>
            <p className="text-gray-400 mb-3">
              Powered by real-time data and AI analysis • National team trophy categorization fixed
            </p>
            <div className="mt-4 text-xs text-gray-400">
              <p>© {new Date().getFullYear()} FutbolAI. All rights reserved.</p>
              <div className="mt-2 flex flex-wrap justify-center gap-2">
                <button
                  onClick={handleForceRefreshAll}
                  className="text-blue-500 hover:text-blue-700 underline"
                >
                  Clear all cache
                </button>
                <span>•</span>
                <button
                  onClick={() => handleExampleSearch('Brazil')}
                  className="text-red-500 hover:text-red-700 underline"
                >
                  Test national team fix
                </button>
                <span>•</span>
                <button
                  onClick={() => handleExampleSearch('Real Madrid')}
                  className="text-green-500 hover:text-green-700 underline"
                >
                  Test club team
                </button>
              </div>
              {refreshCount > 0 && (
                <p className="mt-2">
                  Cache cleared {refreshCount} time{refreshCount !== 1 ? 's' : ''} this session
                </p>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}