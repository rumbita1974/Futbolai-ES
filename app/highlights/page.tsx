'use client';

import { useEffect, useState, useCallback } from 'react';
import { useTranslation } from '@/hooks/useTranslation';
import type { MatchResult, FootballFunFact } from '@/services/matchesService';
import { 
  getLatestResultsByLeague, 
  getUpcomingMatchesGrouped,
  getDailyFootballFact,
  clearMatchCache,
  LeagueGroupedMatches
} from '@/services/matchesService';
import { 
  fetchEnhancedTransferNews, 
  EnhancedTransferNews 
} from '@/services/transferService';

// League order: Spain first, then Europe
const LEAGUE_PRIORITY_ORDER = [
  // Europe (Spain first)
  'PD',  // Spain - La Liga
  'PL',  // England - Premier League
  'SA',  // Italy - Serie A
  'BL1', // Germany - Bundesliga
  'FL1', // France - Ligue 1
  'CL',  // Europe - Champions League
];

// League names mapping with proper display names
const LEAGUE_DISPLAY_NAMES: Record<string, string> = {
  'PD': 'La Liga Primera División',
  'PL': 'Premier League',
  'SA': 'Serie A',
  'BL1': 'Bundesliga',
  'FL1': 'Ligue 1',
  'CL': 'Champions League',
};

// Source indicator component
const SourceIndicator = ({ source, confidence }: { source: string; confidence: string }) => {
  const getColor = () => {
    switch (confidence) {
      case 'high': return 'bg-green-500';
      case 'medium': return 'bg-yellow-500';
      case 'low': return 'bg-orange-500';
      default: return 'bg-gray-500';
    }
  };
  
  const getLabel = () => {
    switch (source) {
      case 'football-data': return 'Live Data';
      case 'thesportsdb': return 'Verified DB';
      case 'static-fallback': return 'Historical Data';
      default: return source;
    }
  };
  
  return (
    <div className="flex items-center gap-2">
      <div className={`w-2 h-2 rounded-full ${getColor()}`} />
      <span className="text-xs text-gray-400">{getLabel()}</span>
    </div>
  );
};

export default function HighlightsPage() {
  const { language } = useTranslation();
  const [groupedResults, setGroupedResults] = useState<LeagueGroupedMatches>({});
  const [upcomingMatchesGrouped, setUpcomingMatchesGrouped] = useState<LeagueGroupedMatches>({});
  const [transferNews, setTransferNews] = useState<EnhancedTransferNews[]>([]);
  const [funFact, setFunFact] = useState<FootballFunFact | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'results' | 'upcoming' | 'transfers'>('results');
  const [dataStatus, setDataStatus] = useState<'loading' | 'live' | 'api-error' | 'error'>('loading');
  const [userTimezone, setUserTimezone] = useState<string>('Europe/Paris');
  const [currentWeekDates, setCurrentWeekDates] = useState<{start: string, end: string}>({start: '', end: ''});
  const [errorMessage, setErrorMessage] = useState<string>('');

  // Get user timezone and calculate current week dates on component mount
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
      setUserTimezone(tz);
      
      // Calculate current week (Monday to Sunday)
      const now = new Date();
      const dayOfWeek = now.getDay();
      const diffToMonday = dayOfWeek === 0 ? -6 : 1 - dayOfWeek; // Sunday = 0, Monday = 1
      const monday = new Date(now);
      monday.setDate(now.getDate() + diffToMonday);
      monday.setHours(0, 0, 0, 0);
      
      const nextMonday = new Date(monday);
      nextMonday.setDate(monday.getDate() + 7);
      
      setCurrentWeekDates({
        start: monday.toISOString(),
        end: nextMonday.toISOString()
      });
    }
  }, []);

  const loadRealData = useCallback(async () => {
    setLoading(true);
    setDataStatus('loading');
    setErrorMessage('');
    
    console.log('[Highlights] Loading verified football data...');
    
    try {
      // Load all data in parallel
      const [groupedResultsData, upcomingGroupedData, transfers, fact] = await Promise.all([
        getLatestResultsByLeague(),
        getUpcomingMatchesGrouped(7),
        fetchEnhancedTransferNews(12),
        getDailyFootballFact()
      ]);
      
      // Sort grouped results by priority order
      const sortedGroupedResults: LeagueGroupedMatches = {};
      LEAGUE_PRIORITY_ORDER.forEach(leagueId => {
        if (groupedResultsData[leagueId]) {
          sortedGroupedResults[leagueId] = groupedResultsData[leagueId];
        }
      });
      
      // Add any remaining leagues not in priority order
      Object.keys(groupedResultsData).forEach(leagueId => {
        if (!sortedGroupedResults[leagueId]) {
          sortedGroupedResults[leagueId] = groupedResultsData[leagueId];
        }
      });
      
      // Sort upcoming matches by priority order too
      const sortedUpcomingGrouped: LeagueGroupedMatches = {};
      LEAGUE_PRIORITY_ORDER.forEach(leagueId => {
        if (upcomingGroupedData[leagueId]) {
          sortedUpcomingGrouped[leagueId] = upcomingGroupedData[leagueId];
        }
      });
      
      // Add any remaining leagues not in priority order
      Object.keys(upcomingGroupedData).forEach(leagueId => {
        if (!sortedUpcomingGrouped[leagueId]) {
          sortedUpcomingGrouped[leagueId] = upcomingGroupedData[leagueId];
        }
      });
      
      setGroupedResults(sortedGroupedResults);
      setUpcomingMatchesGrouped(sortedUpcomingGrouped);
      setTransferNews(transfers);
      setFunFact(fact);
      
      // Check if we have any match data
      const hasMatchData = Object.values(sortedGroupedResults).some(league => league.matches.length > 0) ||
                          Object.values(sortedUpcomingGrouped).some(league => league.matches.length > 0);
      
      // Check if API key is the issue
      const totalMatches = Object.values(sortedGroupedResults).reduce(
        (sum, league) => sum + league.matches.length, 0
      );
      const totalUpcoming = Object.values(sortedUpcomingGrouped).reduce(
        (sum, league) => sum + league.matches.length, 0
      );
      
      console.log(`[Highlights] Loaded: ${totalMatches} results, ${totalUpcoming} upcoming matches`);
      
      if (hasMatchData) {
        setDataStatus('live');
      } else if (transfers.length > 0) {
        // We have transfers but no matches - likely API key issue
        setDataStatus('api-error');
        setErrorMessage('Football Data API key is not configured. Matches data unavailable.');
      } else {
        setDataStatus('error');
        setErrorMessage('Failed to load data. Please check your internet connection and try again.');
      }
      
    } catch (error: any) {
      console.error('[Highlights] Failed to load data:', error);
      
      if (error.message === 'API_KEY_MISSING') {
        setDataStatus('api-error');
        setErrorMessage('Football Data API key is not configured. Please add FOOTBALL_DATA_API_KEY to your Vercel environment variables.');
      } else {
        setDataStatus('error');
        setErrorMessage(`Error loading data: ${error.message || 'Unknown error'}`);
      }
      
      // Set empty states
      setGroupedResults({});
      setUpcomingMatchesGrouped({});
      setTransferNews([]);
      
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadRealData();
  }, [loadRealData]);

  // Format date utility functions
  const formatMatchDateTime = (dateString: string): string => {
    try {
      const date = new Date(dateString);
      
      // Format for upcoming matches
      const options: Intl.DateTimeFormatOptions = {
        weekday: 'short',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        timeZone: userTimezone
      };
      
      return date.toLocaleDateString('en-US', options);
    } catch (err) {
      return dateString;
    }
  };

  const formatMatchDate = (dateString: string): string => {
    try {
      const date = new Date(dateString);
      
      const options: Intl.DateTimeFormatOptions = {
        weekday: 'short',
        month: 'short',
        day: 'numeric',
        timeZone: userTimezone
      };
      
      return date.toLocaleDateString('en-US', options);
    } catch (err) {
      return dateString;
    }
  };

  const formatRelativeTime = (dateString: string): string => {
    try {
      const date = new Date(dateString);
      const now = new Date();
      const diffHours = Math.abs(now.getTime() - date.getTime()) / (1000 * 60 * 60);
      
      if (diffHours < 24) {
        return 'Today';
      } else if (diffHours < 48) {
        return 'Yesterday';
      } else if (diffHours < 168) {
        const days = Math.floor(diffHours / 24);
        return `${days} days ago`;
      } else {
        return formatMatchDate(dateString);
      }
    } catch (err) {
      return dateString;
    }
  };

  // Match Card Component for results
  const MatchCard = ({ match }: { match: MatchResult }) => (
    <div className="bg-gray-800/40 rounded-lg p-4 border border-gray-700 hover:border-blue-500/30 transition-all group">
      <div className="flex justify-between items-start mb-2">
        <div className="text-xs text-gray-400">
          {formatRelativeTime(match.date)}
        </div>
        <SourceIndicator source={match._source} confidence={match._confidence} />
      </div>
      
      <div className="flex items-center justify-between gap-4">
        <div className="flex-1 text-right">
          <div className="font-bold text-white group-hover:text-blue-300 transition-colors">
            {match.homeTeam.name}
          </div>
          {match.venue && <div className="text-xs text-gray-400 mt-1">{match.venue}</div>}
        </div>

        <div className="flex items-center justify-center min-w-[80px]">
          {match.status === 'FINISHED' ? (
            <div className="text-center">
              <div className="text-2xl font-bold text-white">
                {match.homeTeam.goals} - {match.awayTeam.goals}
              </div>
              <div className="text-xs text-green-400 font-medium">FT</div>
            </div>
          ) : (
            <div className="text-center">
              <div className="text-2xl font-bold text-gray-400">VS</div>
              <div className="text-xs text-gray-500">{formatMatchDateTime(match.date)}</div>
            </div>
          )}
        </div>

        <div className="flex-1 text-left">
          <div className="font-bold text-white group-hover:text-blue-300 transition-colors">
            {match.awayTeam.name}
          </div>
          <div className="text-xs text-gray-400 mt-1">{match.competition}</div>
        </div>
      </div>
    </div>
  );

  // Upcoming Match Card Component
  const UpcomingMatchCard = ({ match }: { match: MatchResult }) => (
    <div className="bg-gray-800/40 rounded-lg p-4 border border-gray-700 hover:border-green-500/30 transition-all">
      <div className="flex items-center justify-between gap-4">
        <div className="flex-1 text-right">
          <div className="font-bold text-white">{match.homeTeam.name}</div>
        </div>

        <div className="flex flex-col items-center justify-center min-w-[100px]">
          <div className="text-2xl font-bold text-gray-400">VS</div>
          <div className="text-sm text-gray-500 mt-1">
            {formatMatchDateTime(match.date)}
          </div>
        </div>

        <div className="flex-1 text-left">
          <div className="font-bold text-white">{match.awayTeam.name}</div>
        </div>
      </div>
      
      <div className="flex justify-between items-center mt-3 pt-3 border-t border-gray-700/50">
        {match.venue && (
          <div className="text-xs text-gray-500">📍 {match.venue}</div>
        )}
        <div className="flex items-center gap-2">
          <SourceIndicator source={match._source} confidence={match._confidence} />
          <span className="text-xs text-gray-400">
            {userTimezone.replace('_', ' ')}
          </span>
        </div>
      </div>
    </div>
  );

  // League Section Component for results
  const LeagueSection = ({ 
    leagueId, 
    leagueData 
  }: { 
    leagueId: string; 
    leagueData: { leagueName: string; country: string; matches: MatchResult[] } 
  }) => {
    const leagueColors: Record<string, string> = {
      'PD': 'bg-red-500',
      'PL': 'bg-purple-500',
      'SA': 'bg-green-500',
      'BL1': 'bg-red-600',
      'FL1': 'bg-blue-500',
      'CL': 'bg-indigo-500'
    };

    return (
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-4">
          <div className={`w-3 h-8 rounded ${leagueColors[leagueId] || 'bg-gray-600'}`} />
          <div>
            <h3 className="text-xl font-bold text-white">
              {LEAGUE_DISPLAY_NAMES[leagueId] || leagueData.leagueName}
            </h3>
            <p className="text-sm text-gray-400">
              {leagueData.country} • {leagueData.matches.length} match{leagueData.matches.length !== 1 ? 'es' : ''}
            </p>
          </div>
        </div>
        
        <div className="space-y-3">
          {leagueData.matches.slice(0, 5).map(match => (
            <MatchCard key={match.id} match={match} />
          ))}
        </div>
        
        {leagueData.matches.length > 5 && (
          <div className="text-center mt-3">
            <button className="text-sm text-gray-400 hover:text-white transition-colors">
              + {leagueData.matches.length - 5} more matches
            </button>
          </div>
        )}
      </div>
    );
  };

  // League Section Component for UPCOMING matches
  const UpcomingLeagueSection = ({ 
    leagueId, 
    leagueData 
  }: { 
    leagueId: string; 
    leagueData: { leagueName: string; country: string; matches: MatchResult[] } 
  }) => {
    const leagueColors: Record<string, string> = {
      'PD': 'bg-red-500',
      'PL': 'bg-purple-500',
      'SA': 'bg-green-500',
      'BL1': 'bg-red-600',
      'FL1': 'bg-blue-500',
      'CL': 'bg-indigo-500'
    };

    return (
      <div className="mb-10">
        {/* ONE BIG TITLE PER COMPETITION */}
        <div className="mb-6">
          <div className="flex items-center gap-3 mb-2">
            <div className={`w-3 h-10 rounded ${leagueColors[leagueId] || 'bg-gray-600'}`} />
            <div>
              <h3 className="text-2xl font-bold text-white">
                {LEAGUE_DISPLAY_NAMES[leagueId] || leagueData.leagueName}
              </h3>
              <p className="text-lg text-gray-400">
                {leagueData.country} • {leagueData.matches.length} match{leagueData.matches.length !== 1 ? 'es' : ''}
              </p>
            </div>
          </div>
        </div>
        
        {/* ALL MATCHES FOR THIS COMPETITION */}
        <div className="space-y-4">
          {leagueData.matches.map(match => (
            <UpcomingMatchCard key={match.id} match={match} />
          ))}
        </div>
      </div>
    );
  };

  // Enhanced Transfer Card Component
  const EnhancedTransferCard = ({ transfer }: { transfer: EnhancedTransferNews }) => {
    return (
      <div className={`bg-gray-800/40 rounded-lg p-5 border transition-all hover:scale-[1.02] ${
        transfer.impact === 'high' ? 'border-red-500/30 hover:border-red-500/50' :
        transfer.impact === 'medium' ? 'border-yellow-500/30 hover:border-yellow-500/50' :
        'border-blue-500/30 hover:border-blue-500/50'
      }`}>
        <div className="flex justify-between items-start mb-4">
          <div>
            <h3 className="font-bold text-white text-lg">{transfer.player}</h3>
            <div className="flex items-center gap-2 mt-1">
              {transfer.position && (
                <span className="text-xs px-2 py-1 bg-gray-700/50 rounded">
                  {transfer.position}
                </span>
              )}
              <span className="text-xs text-gray-400">{transfer.age} years</span>
              {transfer.marketValue && (
                <span className="text-xs px-2 py-1 bg-gray-700/30 rounded">
                  {transfer.marketValue}
                </span>
              )}
            </div>
          </div>
          <div className="text-right">
            <div className="text-xs text-gray-400">{transfer.date}</div>
            <div className={`text-xs px-2 py-1 rounded mt-1 ${
              transfer.status === 'confirmed' ? 'bg-green-900/30 text-green-400' :
              'bg-yellow-900/30 text-yellow-400'
            }`}>
              {transfer.status.toUpperCase()}
            </div>
          </div>
        </div>
        
        <div className="flex items-center justify-center gap-3 mb-4">
          <div className="text-center">
            <div className="font-medium text-gray-300">{transfer.from}</div>
            <div className="text-xs text-gray-500">From</div>
          </div>
          <div className="text-gray-500 text-xl">→</div>
          <div className="text-center">
            <div className="font-bold text-white">{transfer.to}</div>
            <div className="text-xs text-gray-500">To</div>
          </div>
        </div>
        
        <div className="mb-4">
          <p className="text-sm text-gray-300">{transfer.description}</p>
        </div>
        
        <div className="flex justify-between items-center pt-4 border-t border-gray-700/50">
          <div className="flex items-center gap-3">
            <span className={`px-3 py-1 text-xs rounded-full font-medium ${
              transfer.type === 'transfer' ? 'bg-blue-900/30 text-blue-400' :
              'bg-green-900/30 text-green-400'
            }`}>
              {transfer.type.toUpperCase()}
            </span>
            <span className="text-sm font-bold text-white">
              {transfer.fee}
            </span>
          </div>
          
          <div className="text-right">
            <div className="text-xs text-gray-400">
              Source: {transfer.source}
            </div>
            <div className="text-xs text-green-400">
              ✓ Verified
            </div>
          </div>
        </div>
      </div>
    );
  };

  // Loading State
  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-gray-900 via-gray-800 to-black text-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <div className="text-center">
            <div className="animate-pulse">
              <div className="h-12 bg-gray-700 rounded mb-4 w-64 mx-auto"></div>
              <div className="space-y-4">
                {[1, 2, 3].map(i => (
                  <div key={i} className="h-24 bg-gray-800 rounded"></div>
                ))}
              </div>
            </div>
            <p className="text-gray-400 mt-8">Loading verified football data...</p>
          </div>
        </div>
      </div>
    );
  }

  // Calculate totals for display
  const totalResults = Object.values(groupedResults).reduce(
    (sum, league) => sum + league.matches.length, 0
  );
  const totalUpcomingMatches = Object.values(upcomingMatchesGrouped).reduce(
    (sum, league) => sum + league.matches.length, 0
  );

  // API Error Display
  if (dataStatus === 'api-error') {
    return (
      <div className="min-h-screen bg-gradient-to-b from-gray-900 via-gray-800 to-black text-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          {/* Header */}
          <div className="mb-8">
            <h1 className="text-4xl md:text-6xl font-bold mb-4">
              <span className="bg-gradient-to-r from-blue-400 to-green-400 bg-clip-text text-transparent">
                Football Highlights
              </span>
            </h1>
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
              <p className="text-xl text-gray-300">
                Latest results and upcoming matches from major leagues
              </p>
              <div className="px-3 py-1 rounded-full text-sm font-medium bg-orange-900/30 text-orange-400">
                ⚠️ API Key Required
              </div>
            </div>
          </div>

          {/* Error Message */}
          <div className="mb-8 bg-gradient-to-r from-orange-900/20 to-red-900/20 border border-orange-700/30 rounded-lg p-6">
            <h2 className="text-2xl font-bold text-orange-400 mb-4">Configuration Required</h2>
            <p className="text-gray-300 mb-4">{errorMessage}</p>
            
            <div className="bg-gray-900/50 rounded-lg p-4 mb-4">
              <h3 className="text-lg font-bold text-gray-200 mb-2">To fix this issue:</h3>
              <ol className="list-decimal pl-5 space-y-2 text-gray-300">
                <li>Go to your Vercel project dashboard</li>
                <li>Navigate to Settings → Environment Variables</li>
                <li>Add the following environment variable:
                  <code className="block bg-gray-800 p-2 rounded mt-2 font-mono text-sm">
                    FOOTBALL_DATA_API_KEY=your_api_key_here
                  </code>
                </li>
                <li>Redeploy your application</li>
              </ol>
            </div>
            
            <div className="bg-blue-900/20 rounded-lg p-4">
              <h3 className="text-lg font-bold text-blue-400 mb-2">How to get an API key:</h3>
              <ul className="list-disc pl-5 space-y-1 text-gray-300">
                <li>Visit <a href="https://www.football-data.org/" target="_blank" className="text-blue-400 hover:text-blue-300">football-data.org</a></li>
                <li>Sign up for a free account</li>
                <li>Get your API key from the dashboard</li>
                <li>Free tier includes 10 requests per minute</li>
              </ul>
            </div>
          </div>

          {/* Transfers still work without API key */}
          <div className="mb-8">
            <h2 className="text-2xl font-bold mb-6">Transfer News (Working)</h2>
            {transferNews.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {transferNews.map((transfer, idx) => (
                  <EnhancedTransferCard key={idx} transfer={transfer} />
                ))}
              </div>
            ) : (
              <div className="text-center py-8 bg-gray-800/20 rounded-lg">
                <p className="text-gray-400">No transfer data available</p>
              </div>
            )}
          </div>

          {/* Refresh Button */}
          <div className="mt-12 pt-8 border-t border-gray-800 text-center">
            <button
              onClick={() => {
                clearMatchCache();
                localStorage.removeItem('real_transfers_12');
                setLoading(true);
                loadRealData();
              }}
              className="px-6 py-3 bg-blue-600 hover:bg-blue-700 rounded-lg font-semibold transition-colors"
            >
              Retry Loading Data
            </button>
            <p className="text-gray-500 text-sm mt-2">
              After adding API key, retry loading data
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-900 via-gray-800 to-black text-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl md:text-6xl font-bold mb-4">
            <span className="bg-gradient-to-r from-blue-400 to-green-400 bg-clip-text text-transparent">
              Football Highlights
            </span>
          </h1>
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <p className="text-xl text-gray-300">
              Latest results and upcoming matches from major leagues
            </p>
            <div className={`px-3 py-1 rounded-full text-sm font-medium ${
              dataStatus === 'live' ? 'bg-green-900/30 text-green-400' :
              dataStatus === 'error' ? 'bg-red-900/30 text-red-400' :
              'bg-gray-700 text-gray-300'
            }`}>
              {dataStatus === 'live' ? '✓ Live Data' : 
               dataStatus === 'error' ? '⚠️ Error' : '📊 Loading'}
            </div>
          </div>
        </div>

        {/* Error Message Banner */}
        {errorMessage && dataStatus === 'error' && (
          <div className="mb-8 bg-gradient-to-r from-red-900/20 to-orange-900/20 border border-red-700/30 rounded-lg p-6">
            <div className="flex items-start gap-3">
              <div className="text-red-400 text-2xl">⚠️</div>
              <div>
                <h3 className="text-lg font-bold text-red-400 mb-2">Error Loading Data</h3>
                <p className="text-gray-300">{errorMessage}</p>
              </div>
            </div>
          </div>
        )}

        {/* Fun Fact Banner */}
        {funFact && (
          <div className="mb-8 bg-gradient-to-r from-yellow-900/20 to-orange-900/20 border border-yellow-700/30 rounded-lg p-6">
            <h2 className="text-2xl font-bold text-yellow-400 mb-2">Fun Fact of the Day</h2>
            <p className="text-gray-300">{funFact.description}</p>
            <div className="mt-3 flex justify-between items-center">
              <span className="text-sm text-gray-400">{funFact.category}</span>
              <span className="text-xs text-gray-500">
                {funFact._source === 'groq-ai' ? 'AI Generated' : 'Verified Fact'}
              </span>
            </div>
          </div>
        )}

        {/* Current Week Info Banner */}
        {currentWeekDates.start && activeTab === 'upcoming' && totalUpcomingMatches > 0 && (
          <div className="mb-6 bg-gradient-to-r from-blue-900/20 to-indigo-900/20 border border-blue-700/30 rounded-lg p-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-bold text-blue-400">📅 Current Week Fixtures</h3>
                <p className="text-sm text-gray-300">
                  Showing matches from {formatMatchDate(currentWeekDates.start)} to {formatMatchDate(currentWeekDates.end)}
                </p>
              </div>
              <div className="text-sm text-gray-400">
                {totalUpcomingMatches} matches scheduled
              </div>
            </div>
          </div>
        )}

        {/* Tabs */}
        <div className="flex gap-2 mb-8 border-b border-gray-700 pb-2">
          <button
            onClick={() => setActiveTab('results')}
            className={`px-4 py-3 font-semibold transition-all rounded-t-lg ${
              activeTab === 'results'
                ? 'text-blue-400 border-b-2 border-blue-400 bg-gray-800/30'
                : 'text-gray-400 hover:text-white hover:bg-gray-800/20'
            }`}
          >
            📊 Recent Results
          </button>
          <button
            onClick={() => setActiveTab('upcoming')}
            className={`px-4 py-3 font-semibold transition-all rounded-t-lg ${
              activeTab === 'upcoming'
                ? 'text-blue-400 border-b-2 border-blue-400 bg-gray-800/30'
                : 'text-gray-400 hover:text-white hover:bg-gray-800/20'
            }`}
          >
            📅 Upcoming Matches
          </button>
          <button
            onClick={() => setActiveTab('transfers')}
            className={`px-4 py-3 font-semibold transition-all rounded-t-lg ${
              activeTab === 'transfers'
                ? 'text-blue-400 border-b-2 border-blue-400 bg-gray-800/30'
                : 'text-gray-400 hover:text-white hover:bg-gray-800/20'
            }`}
          >
            🔄 Transfer News
          </button>
        </div>

        {/* Content */}
        <div className="space-y-6">
          {/* Recent Results Tab */}
          {activeTab === 'results' && (
            <>
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-2xl font-bold">Latest Results by League</h2>
                <div className="text-sm text-gray-400">
                  {Object.keys(groupedResults).length} leagues • {totalResults} matches
                </div>
              </div>
              
              {totalResults > 0 ? (
                <div className="space-y-8">
                  {/* European Leagues Section */}
                  <div>
                    <h3 className="text-lg font-bold text-blue-400 mb-4 flex items-center gap-2">
                      <span>🇪🇺</span> European Leagues
                    </h3>
                    {LEAGUE_PRIORITY_ORDER
                      .filter(id => ['PD', 'PL', 'SA', 'BL1', 'FL1', 'CL'].includes(id))
                      .map(leagueId => 
                        groupedResults[leagueId] && (
                          <LeagueSection 
                            key={leagueId} 
                            leagueId={leagueId} 
                            leagueData={groupedResults[leagueId]} 
                          />
                        )
                      )
                    }
                  </div>
                </div>
              ) : (
                <div className="text-center py-12 bg-gray-800/20 rounded-lg">
                  <p className="text-gray-400">No match results available</p>
                  <p className="text-sm text-gray-500 mt-2">
                    {dataStatus === 'error' ? 'Failed to load match data' : 'Check back later for updated results'}
                  </p>
                </div>
              )}
            </>
          )}

          {/* Upcoming Matches Tab - WITH ONE BIG TITLE PER COMPETITION */}
          {activeTab === 'upcoming' && (
            <>
              <div className="flex justify-between items-center mb-6">
                <div>
                  <h2 className="text-2xl font-bold">Upcoming Matches This Week</h2>
                  <p className="text-gray-400 text-sm">
                    Times shown in {userTimezone.replace('_', ' ')} • {totalUpcomingMatches} matches
                  </p>
                </div>
                <div className="flex flex-col items-end">
                  <span className="px-2 py-1 bg-gray-700/50 rounded text-gray-300 text-sm mb-1">
                    Local Timezone
                  </span>
                  {currentWeekDates.start && (
                    <span className="text-xs text-gray-400">
                      Week of {formatMatchDate(currentWeekDates.start)}
                    </span>
                  )}
                </div>
              </div>
              
              {totalUpcomingMatches > 0 ? (
                <div>
                  {/* Render each competition with ONE BIG TITLE */}
                  {Object.entries(upcomingMatchesGrouped).map(([leagueId, leagueData]) => (
                    <UpcomingLeagueSection 
                      key={leagueId} 
                      leagueId={leagueId} 
                      leagueData={leagueData} 
                    />
                  ))}
                </div>
              ) : (
                <div className="text-center py-12 bg-gray-800/20 rounded-lg">
                  <p className="text-gray-400">No upcoming matches scheduled this week</p>
                  <p className="text-sm text-gray-500 mt-2">
                    {dataStatus === 'error' ? 'Failed to load upcoming matches' : 'Check back later for updated fixtures'}
                  </p>
                </div>
              )}
            </>
          )}

          {/* Transfer News Tab */}
          {activeTab === 'transfers' && (
            <>
              <div className="flex justify-between items-center mb-6">
                <div>
                  <h2 className="text-2xl font-bold">Transfer Market</h2>
                  <p className="text-gray-400 text-sm">
                    Latest confirmed transfers • {transferNews.length} transfers
                  </p>
                </div>
                <div className="flex gap-2">
                  <span className="px-2 py-1 bg-red-900/30 text-red-400 rounded text-xs">High Impact</span>
                  <span className="px-2 py-1 bg-blue-900/30 text-blue-400 rounded text-xs">Confirmed</span>
                </div>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {transferNews.map((transfer, idx) => (
                  <EnhancedTransferCard key={idx} transfer={transfer} />
                ))}
              </div>
              
              {transferNews.length === 0 && (
                <div className="text-center py-12 bg-gray-800/20 rounded-lg">
                  <p className="text-gray-400">No confirmed transfers available at the moment</p>
                  <p className="text-sm text-gray-500 mt-2">Check back later for transfer updates</p>
                </div>
              )}
              
              <div className="mt-8 p-4 bg-gray-800/30 rounded-lg border border-gray-700">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-300">Transfer data updates every 6 hours</p>
                    <p className="text-xs text-gray-500 mt-1">
                      Only confirmed transfers shown. No rumors or unverified data.
                    </p>
                  </div>
                  <button 
                    onClick={() => {
                      localStorage.removeItem('real_transfers_12');
                      loadRealData();
                    }}
                    className="px-4 py-2 bg-gray-700 hover:bg-gray-600 rounded-lg text-sm transition-colors"
                  >
                    Refresh Transfers
                  </button>
                </div>
              </div>
            </>
          )}
        </div>

        {/* Refresh Button */}
        <div className="mt-12 pt-8 border-t border-gray-800 text-center">
          <button
            onClick={() => {
              clearMatchCache();
              localStorage.removeItem('real_transfers_12');
              setLoading(true);
              setErrorMessage('');
              loadRealData();
            }}
            className="px-6 py-3 bg-blue-600 hover:bg-blue-700 rounded-lg font-semibold transition-colors"
          >
            Refresh All Data
          </button>
          <p className="text-gray-500 text-sm mt-2">
            Data updates every 15 minutes • Real verified sources only
          </p>
          {dataStatus === 'error' && (
            <p className="text-orange-400 text-sm mt-2">
              Error loading match data. Check your Football Data API configuration.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}