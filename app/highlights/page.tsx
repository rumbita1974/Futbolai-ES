'use client';

import { useEffect, useState, useCallback } from 'react';
import { useTranslation } from '@/hooks/useTranslation';
import type { MatchResult, WeeklyMatches, FootballFunFact } from '@/services/matchesService';
import { 
  getWeeklyMatches, 
  getLatestResultsByLeague, 
  getUpcomingMatchesByWeek,
  getDailyFootballFact,
  clearMatchCache,
  LeagueGroupedMatches,
  SUPPORTED_COMPETITIONS
} from '@/services/matchesService';
import { 
  fetchEnhancedTransferNews, 
  EnhancedTransferNews 
} from '@/services/transferService';

// League order: Spain first, then Europe, then Latin America
const LEAGUE_PRIORITY_ORDER = [
  // Europe (Spain first)
  'PD',  // Spain - La Liga
  'PL',  // England - Premier League
  'SA',  // Italy - Serie A
  'BL1', // Germany - Bundesliga
  'FL1', // France - Ligue 1
  'CL',  // Europe - Champions League
  
  // Latin America
  'BSA', // Brazil - Brasileirão
  'ARG', // Argentina - Liga Profesional
  'MEX', // Mexico - Liga MX
  'COL', // Colombia - Primera A
  'VEN', // Venezuela - Primera División
  'CHI', // Chile - Primera División
  'PER', // Peru - Liga 1
  'CLI'  // South America - Copa Libertadores
];

// League names mapping with proper display names
const LEAGUE_DISPLAY_NAMES: Record<string, string> = {
  'PD': 'La Liga Primera División',
  'PL': 'Premier League',
  'SA': 'Serie A',
  'BL1': 'Bundesliga',
  'FL1': 'Ligue 1',
  'CL': 'Champions League',
  'BSA': 'Brasileirão Série A',
  'ARG': 'Liga Profesional Argentina',
  'MEX': 'Liga MX',
  'COL': 'Primera A Colombia',
  'VEN': 'Primera División Venezuela',
  'CHI': 'Primera División Chile',
  'PER': 'Liga 1 Perú',
  'CLI': 'Copa Libertadores'
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
  const [matches, setMatches] = useState<WeeklyMatches | null>(null);
  const [groupedResults, setGroupedResults] = useState<LeagueGroupedMatches>({});
  const [upcomingMatches, setUpcomingMatches] = useState<MatchResult[]>([]);
  const [transferNews, setTransferNews] = useState<EnhancedTransferNews[]>([]);
  const [funFact, setFunFact] = useState<FootballFunFact | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'results' | 'upcoming' | 'transfers'>('results');
  const [dataStatus, setDataStatus] = useState<'loading' | 'live' | 'fallback'>('loading');
  const [userTimezone, setUserTimezone] = useState<string>('Europe/Paris');
  const [currentWeekDates, setCurrentWeekDates] = useState<{start: string, end: string}>({start: '', end: ''});

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
    
    console.log('[Highlights] Loading verified football data...');
    
    try {
      const [groupedResultsData, upcoming, transfers, fact] = await Promise.all([
        getLatestResultsByLeague(),
        getUpcomingMatchesByWeek(),
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
      
      setGroupedResults(sortedGroupedResults);
      setUpcomingMatches(upcoming);
      setTransferNews(transfers);
      setFunFact(fact);
      
      // Count total matches
      const totalMatches = Object.values(sortedGroupedResults).reduce(
        (sum, league) => sum + league.matches.length, 0
      );
      
      // Determine data status based on sources
      const hasFootballData = Object.values(sortedGroupedResults).some(league => 
        league.matches.some(match => match._source === 'football-data')
      );
      
      setDataStatus(hasFootballData ? 'live' : 'fallback');
      
      console.log(`[Highlights] Loaded: ${totalMatches} results (grouped), ${upcoming.length} upcoming`);
      
    } catch (error) {
      console.error('[Highlights] Failed to load data:', error);
      setDataStatus('fallback');
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
      <div className="text-xs text-gray-400 mb-2">
        {match.competition}
      </div>
      
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

  // League Section Component
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
      'CL': 'bg-indigo-500',
      'BSA': 'bg-yellow-500',
      'ARG': 'bg-sky-500',
      'MEX': 'bg-emerald-500',
      'COL': 'bg-orange-500',
      'VEN': 'bg-amber-500',
      'CHI': 'bg-rose-500',
      'PER': 'bg-pink-500',
      'CLI': 'bg-violet-500'
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

  // Enhanced Transfer Card Component (FIXED VERSION)
  const EnhancedTransferCard = ({ transfer }: { transfer: EnhancedTransferNews }) => {
    // Clean up the age field - remove "years" text if present
    const cleanAge = transfer.age?.toString().replace('years', '').replace('year', '').trim() || 'N/A';
    
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
                  {transfer.position.replace(' years', '').replace('year', '')}
                </span>
              )}
              <span className="text-xs text-gray-400">{cleanAge} years</span>
              {transfer.marketValue && (
                <span className="text-xs px-2 py-1 bg-gray-700/30 rounded">
                  {transfer.marketValue.replace(' years', '').replace('year', '')}
                </span>
              )}
            </div>
          </div>
          <div className="text-right">
            <div className="text-xs text-gray-400">{transfer.date}</div>
            <div className={`text-xs px-2 py-1 rounded mt-1 ${
              transfer.status === 'confirmed' ? 'bg-green-900/30 text-green-400' :
              transfer.status === 'completed' ? 'bg-blue-900/30 text-blue-400' :
              transfer.status === 'medical' ? 'bg-purple-900/30 text-purple-400' :
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
              transfer.type === 'loan' ? 'bg-purple-900/30 text-purple-400' :
              transfer.type === 'free' ? 'bg-green-900/30 text-green-400' :
              'bg-yellow-900/30 text-yellow-400'
            }`}>
              {transfer.type.toUpperCase()}
            </span>
            <span className="text-sm font-bold text-white">
              {transfer.fee.replace(' years', '').replace('year', '')}
            </span>
          </div>
          
          <div className="text-right">
            <div className="text-xs text-gray-400">
              Source: {transfer.source.replace(' years', '').replace('year', '')}
            </div>
            <div className={`text-xs ${transfer.verified ? 'text-green-400' : 'text-yellow-400'}`}>
              {transfer.verified ? '✓ Verified' : '⚠️ Unconfirmed'}
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
              dataStatus === 'fallback' ? 'bg-orange-900/30 text-orange-400' :
              'bg-gray-700 text-gray-300'
            }`}>
              {dataStatus === 'live' ? '✓ Live Data' : '📊 Verified Data'}
            </div>
          </div>
        </div>

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
        {currentWeekDates.start && activeTab === 'upcoming' && (
          <div className="mb-6 bg-gradient-to-r from-blue-900/20 to-indigo-900/20 border border-blue-700/30 rounded-lg p-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-bold text-blue-400">📅 Current Week Fixtures</h3>
                <p className="text-sm text-gray-300">
                  Showing matches from {formatMatchDate(currentWeekDates.start)} to {formatMatchDate(currentWeekDates.end)}
                </p>
              </div>
              <div className="text-sm text-gray-400">
                {upcomingMatches.length} matches scheduled
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
                  {Object.keys(groupedResults).length} leagues • {
                    Object.values(groupedResults).reduce((sum, league) => sum + league.matches.length, 0)
                  } matches
                </div>
              </div>
              
              {Object.keys(groupedResults).length > 0 ? (
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
                  
                  {/* Latin American Leagues Section */}
                  <div>
                    <h3 className="text-lg font-bold text-green-400 mb-4 flex items-center gap-2">
                      <span>🌎</span> Latin American Leagues
                    </h3>
                    {LEAGUE_PRIORITY_ORDER
                      .filter(id => ['BSA', 'ARG', 'MEX', 'COL', 'VEN', 'CHI', 'PER', 'CLI'].includes(id))
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
                  <p className="text-gray-400">No results available</p>
                </div>
              )}
            </>
          )}

          {/* Upcoming Matches Tab */}
          {activeTab === 'upcoming' && (
            <>
              <div className="flex justify-between items-center mb-6">
                <div>
                  <h2 className="text-2xl font-bold">Upcoming Matches This Week</h2>
                  <p className="text-gray-400 text-sm">
                    Times shown in {userTimezone.replace('_', ' ')} • {upcomingMatches.length} matches
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
              
              {upcomingMatches.length > 0 ? (
                <div className="space-y-4">
                  {upcomingMatches.map(match => (
                    <UpcomingMatchCard key={match.id} match={match} />
                  ))}
                </div>
              ) : (
                <div className="text-center py-12 bg-gray-800/20 rounded-lg">
                  <p className="text-gray-400">No upcoming matches scheduled this week</p>
                  <p className="text-sm text-gray-500 mt-2">Check back later for updated fixtures</p>
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
                    Latest moves and rumors • {transferNews.length} transfers
                  </p>
                </div>
                <div className="flex gap-2">
                  <span className="px-2 py-1 bg-red-900/30 text-red-400 rounded text-xs">High Impact</span>
                  <span className="px-2 py-1 bg-blue-900/30 text-blue-400 rounded text-xs">Confirmed</span>
                  <span className="px-2 py-1 bg-yellow-900/30 text-yellow-400 rounded text-xs">Rumors</span>
                </div>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {transferNews.map((transfer, idx) => (
                  <EnhancedTransferCard key={idx} transfer={transfer} />
                ))}
              </div>
              
              <div className="mt-8 p-4 bg-gray-800/30 rounded-lg border border-gray-700">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-300">Transfer data updates every 6 hours</p>
                    <p className="text-xs text-gray-500 mt-1">
                      Verified transfers marked with ✓, rumors are unconfirmed. Data cleaned from AI formatting issues.
                    </p>
                  </div>
                  <button 
                    onClick={() => {
                      localStorage.removeItem('enhanced_transfers_12');
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
              localStorage.removeItem('enhanced_transfers_12');
              setLoading(true);
              loadRealData();
            }}
            className="px-6 py-3 bg-blue-600 hover:bg-blue-700 rounded-lg font-semibold transition-colors"
          >
            Refresh All Data
          </button>
          <p className="text-gray-500 text-sm mt-2">
            Data updates every 15 minutes • Real verified sources only
          </p>
          {dataStatus === 'fallback' && (
            <p className="text-orange-400 text-sm mt-2">
              Using verified historical data. Configure API keys for live updates.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}