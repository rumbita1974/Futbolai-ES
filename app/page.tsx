'use client';

import { useState, useEffect } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { searchWithGROQ, Player, Team } from '@/services/groqService';
import EnhancedSearchResults from '@/components/EnhancedSearchResults';
import { useTranslation } from '@/hooks/useTranslation';

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
  const [comingFromGroup, setComingFromGroup] = useState<string | null>(null);
  
  const searchParams = useSearchParams();
  const router = useRouter();
  const { t, language } = useTranslation();

  // Debug: Log current language and test translation
  useEffect(() => {
    console.log('Current language:', language);
    console.log('Test translation (homepage.title):', t('homepage.title'));
  }, [language, t]);

  // Get current language translations using the hook
  const getTranslation = (key: string): string => {
    return t(`homepage.${key}`);
  };

  // Check if coming from a group page
  useEffect(() => {
    const groupParam = searchParams.get('group');
    const searchParam = searchParams.get('search');
    
    if (groupParam) {
      setComingFromGroup(groupParam);
    }
    
    // Auto-search if search param is present
    if (searchParam && !searchQuery) {
      setSearchQuery(searchParam);
      // Auto-trigger search after a short delay
      const timer = setTimeout(() => {
        handleAutoSearch(searchParam);
      }, 100);
      
      return () => clearTimeout(timer);
    }
  }, [searchParams]);

  const handleAutoSearch = async (query: string) => {
    setLoading(true);
    setSearchError(null);
    setSearchResults(null);

    try {
      console.log('Auto-searching for:', query);
      const result = await searchWithGROQ(query, language);
      console.log('Auto-search result:', result);
      
      if (result.error) {
        setSearchError(result.error);
      } else {
        setSearchResults(result);
      }
    } catch (err: any) {
      console.error('Auto-search error:', err);
      setSearchError('Failed to perform auto-search.');
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

    setLoading(true);
    setSearchError(null);
    setSearchResults(null);

    try {
      console.log('Searching for:', searchQuery);
      const result = await searchWithGROQ(searchQuery, language);
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

  const handleBackToGroup = () => {
    if (comingFromGroup) {
      router.push(`/world-cup?group=${comingFromGroup}`);
    } else {
      router.push('/world-cup');
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

  // Function to get team flag emoji
  const getTeamFlag = (teamName: string) => {
    const flags: Record<string, string> = {
      'Mexico': '🇲🇽', 'USA': '🇺🇸', 'Canada': '🇨🇦',
      'Brazil': '🇧🇷', 'Argentina': '🇦🇷', 'Germany': '🇩🇪',
      'France': '🇫🇷', 'Spain': '🇪🇸', 'England': '🏴󠁧󠁢󠁥󠁮󠁧󠁿',
      'Portugal': '🇵🇹', 'Italy': '🇮🇹', 'Netherlands': '🇳🇱',
      'Japan': '🇯🇵', 'South Korea': '🇰🇷', 'Australia': '🇦🇺',
      'Morocco': '🇲🇦', 'Senegal': '🇸🇳', 'Egypt': '🇪🇬',
      'Uruguay': '🇺🇾', 'Chile': '🇨🇱', 'Colombia': '🇨🇴',
      'Belgium': '🇧🇪', 'Croatia': '🇭🇷', 'Switzerland': '🇨🇭',
      'Denmark': '🇩🇰', 'Sweden': '🇸🇪', 'Norway': '🇳🇴'
    };
    
    // Check for exact match first
    if (flags[teamName]) return flags[teamName];
    
    // Check for partial matches
    for (const [country, flag] of Object.entries(flags)) {
      if (teamName.includes(country)) return flag;
    }
    
    return '⚽'; // Default football emoji
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
                <span className="mr-1">🏆</span> {getTranslation('achievements')}
              </span>
              <span className="px-3 py-1.5 bg-red-100 text-red-700 rounded-full text-sm font-medium flex items-center">
                <span className="mr-1">📺</span> {getTranslation('videoHighlights')}
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
                onClick={() => setActiveTab('player')}
                className={`px-4 sm:px-6 py-2 rounded-md text-sm font-medium transition ${activeTab === 'player' ? 'bg-blue-600 text-white shadow' : 'text-gray-700 hover:bg-gray-100'}`}
              >
                👤 {getTranslation('playerSearch')}
              </button>
              <button
                onClick={() => setActiveTab('team')}
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
                placeholder={activeTab === 'player' ? getTranslation('searchPlaceholderPlayer') : getTranslation('searchPlaceholderTeam')}
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
                    <svg className="animate-spin -ml-1 mr-2 sm:mr-3 h-4 w-4 sm:h-5 sm:w-5 text-white" xmlns="http://www.w3.org2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    {getTranslation('searching')}
                  </span>
                ) : getTranslation('searchButton')}
              </button>
            </div>
          </form>

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
            <p className="mt-4 text-gray-600 text-lg">{getTranslation('analyzing')}</p>
            <p className="text-gray-500 text-sm mt-2">{getTranslation('fetching')}</p>
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
              
              <div className="group bg-white rounded-xl shadow-lg p-6 text-center hover:shadow-xl transition hover:-translate-y-1 border border-gray-200">
                <div className="text-green-600 text-4xl sm:text-5xl mb-4 group-hover:scale-110 transition">📊</div>
                <h3 className="text-xl font-bold text-gray-800 mb-3">{getTranslation('analyticsTitle')}</h3>
                <p className="text-gray-600 mb-4">{getTranslation('analyticsDesc')}</p>
                <div className="inline-block mt-2 px-4 py-2 bg-green-600 text-white rounded-lg font-medium">
                  {getTranslation('searchAbove')}
                </div>
              </div>
              
              <div className="group bg-white rounded-xl shadow-lg p-6 text-center hover:shadow-xl transition hover:-translate-y-1 border border-gray-200">
                <div className="text-red-600 text-4xl sm:text-5xl mb-4 group-hover:scale-110 transition">🎥</div>
                <h3 className="text-xl font-bold text-gray-800 mb-3">{getTranslation('videosTitle')}</h3>
                <p className="text-gray-600 mb-4">{getTranslation('videosDesc')}</p>
                <div className="inline-block mt-2 px-4 py-2 bg-red-600 text-white rounded-lg font-medium">
                  {getTranslation('trySearch')}
                </div>
              </div>
            </div>

            {/* Quick Stats */}
            <div className="mt-12 sm:mt-16 bg-gradient-to-r from-blue-600 to-green-600 rounded-2xl p-6 sm:p-8 text-white">
              <h3 className="text-xl sm:text-2xl font-bold mb-6 text-center">{getTranslation('dataCoverage')}</h3>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                <div className="text-center">
                  <div className="text-2xl sm:text-3xl font-bold">10,000+</div>
                  <div className="text-blue-100 text-sm mt-1">{getTranslation('players')}</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl sm:text-3xl font-bold">500+</div>
                  <div className="text-blue-100 text-sm mt-1">{getTranslation('teams')}</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl sm:text-3xl font-bold">50+</div>
                  <div className="text-blue-100 text-sm mt-1">{getTranslation('leagues')}</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl sm:text-3xl font-bold">100+</div>
                  <div className="text-blue-100 text-sm mt-1">{getTranslation('countries')}</div>
                </div>
              </div>
            </div>

            {/* Quick Links */}
            <div className="mt-12 text-center">
              <h3 className="text-xl font-bold text-gray-800 mb-6">{getTranslation('quickAccess')}</h3>
              <div className="flex flex-wrap justify-center gap-3">
                <a href="/world-cup" className="px-4 sm:px-6 py-3 bg-blue-100 text-blue-700 rounded-lg hover:bg-blue-200 font-medium">
                  {getTranslation('worldCupSchedule')}
                </a>
                <a href="/api/worldcup" target="_blank" className="px-4 sm:px-6 py-3 bg-green-100 text-green-700 rounded-lg hover:bg-green-200 font-medium">
                  {getTranslation('apiData')}
                </a>
                <button className="px-4 sm:px-6 py-3 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 font-medium">
                  {getTranslation('playerDatabase')}
                </button>
                <button className="px-4 sm:px-6 py-3 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 font-medium">
                  {getTranslation('teamAnalysis')}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Footer Note */}
        <div className="mt-12 sm:mt-16 pt-8 border-t border-gray-200">
          <div className="text-center text-gray-500 text-sm">
            <p className="mb-2">
              ⚽ <span className="font-medium">{getTranslation('footerNote')}</span>
            </p>
            <p className="text-gray-400">
              {getTranslation('dataSource')}
            </p>
            <div className="mt-4 text-xs text-gray-400">
              <p>{getTranslation('copyright').replace('{year}', new Date().getFullYear().toString())}</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}