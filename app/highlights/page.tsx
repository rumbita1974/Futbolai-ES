// app/highlights/page.tsx - ENHANCED VERSION WITH PROPER FALLBACK HANDLING
'use client';

import { useEffect, useState, useCallback } from 'react';
import { useTranslation } from '@/hooks/useTranslation';
import type { MatchResult, FootballFunFact } from '@/services/matchesService';
import { 
  getLatestResultsByLeague, 
  getUpcomingMatchesGrouped,
  getDailyFootballFact,
  clearMatchCache
} from '@/services/matchesService';

// Competition mapping with proper display names
const COMPETITION_NAMES: Record<string, { en: string; es: string; color: string }> = {
  'CL': { en: 'UEFA Champions League', es: 'Liga de Campeones', color: 'bg-indigo-500' },
  'PD': { en: 'La Liga', es: 'La Liga', color: 'bg-red-500' },
  'PL': { en: 'Premier League', es: 'Premier League', color: 'bg-purple-500' },
  'SA': { en: 'Serie A', es: 'Serie A', color: 'bg-green-500' },
  'BL1': { en: 'Bundesliga', es: 'Bundesliga', color: 'bg-red-600' },
  'FL1': { en: 'Ligue 1', es: 'Ligue 1', color: 'bg-blue-500' },
  'CDR': { en: 'Copa del Rey', es: 'Copa del Rey', color: 'bg-red-700' },
  'FAC': { en: 'FA Cup', es: 'FA Cup', color: 'bg-red-800' },
  'ELC': { en: 'Carabao Cup', es: 'Carabao Cup', color: 'bg-blue-600' },
  'CI': { en: 'Coppa Italia', es: 'Coppa Italia', color: 'bg-green-600' },
  'DFB': { en: 'DFB-Pokal', es: 'DFB-Pokal', color: 'bg-black' },
  'FRC': { en: 'Coupe de France', es: 'Coupe de France', color: 'bg-blue-700' }
};

// Priority order for display
const COMPETITION_PRIORITY = ['CL', 'CDR', 'PD', 'PL', 'FAC', 'ELC', 'SA', 'CI', 'BL1', 'DFB', 'FL1', 'FRC'];

export default function HighlightsPage() {
  const { t, language } = useTranslation();
  const [groupedResults, setGroupedResults] = useState<any>({});
  const [upcomingMatchesGrouped, setUpcomingMatchesGrouped] = useState<any>({});
  const [funFact, setFunFact] = useState<FootballFunFact | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'results' | 'upcoming'>('results');
  const [expandedLeagues, setExpandedLeagues] = useState<Record<string, boolean>>({});

  const loadData = useCallback(async () => {
    setLoading(true);
    console.log('Loading football data...');
    
    try {
      // Load all data in parallel
      const [results, upcoming, fact] = await Promise.all([
        getLatestResultsByLeague(),
        getUpcomingMatchesGrouped(),
        getDailyFootballFact()
      ]);
      
      // Filter out competitions with no matches
      const filteredResults: any = {};
      const filteredUpcoming: any = {};
      
      Object.entries(results || {}).forEach(([compId, leagueData]: [string, any]) => {
        if (leagueData?.matches?.length > 0) {
          filteredResults[compId] = leagueData;
        }
      });
      
      Object.entries(upcoming || {}).forEach(([compId, leagueData]: [string, any]) => {
        if (leagueData?.matches?.length > 0) {
          filteredUpcoming[compId] = leagueData;
        }
      });
      
      setGroupedResults(filteredResults);
      setUpcomingMatchesGrouped(filteredUpcoming);
      setFunFact(fact);
      
      // Initialize expanded state only for competitions with data
      const initialExpanded: Record<string, boolean> = {};
      COMPETITION_PRIORITY.forEach(compId => {
        if (filteredResults[compId]?.matches?.length > 0 || filteredUpcoming[compId]?.matches?.length > 0) {
          initialExpanded[compId] = true;
        }
      });
      setExpandedLeagues(initialExpanded);
      
      console.log('Football data loaded successfully', {
        resultsCount: Object.keys(filteredResults).length,
        upcomingCount: Object.keys(filteredUpcoming).length
      });
      
    } catch (error) {
      console.error('Failed to load football data:', error);
      setGroupedResults({});
      setUpcomingMatchesGrouped({});
      setFunFact({
        title: 'Football Fact',
        description: 'UEFA Champions League is the most prestigious club competition in European football.',
        category: 'champions-league',
        _source: 'error'
      });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Format date
  const formatDate = (dateString: string) => {
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString(language === 'es' ? 'es-ES' : 'en-US', {
        weekday: 'short',
        month: 'short',
        day: 'numeric'
      });
    } catch {
      return dateString;
    }
  };

  // Format date and time
  const formatDateTime = (dateString: string) => {
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString(language === 'es' ? 'es-ES' : 'en-US', {
        weekday: 'short',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch {
      return dateString;
    }
  };

  // Get competition display name
  const getCompetitionName = (compId: string) => {
    const comp = COMPETITION_NAMES[compId];
    if (!comp) return compId;
    return language === 'es' ? comp.es : comp.en;
  };

  // Filter competitions that have data for the current tab
  const getCompetitionsWithData = () => {
    const dataSource = activeTab === 'results' ? groupedResults : upcomingMatchesGrouped;
    return COMPETITION_PRIORITY.filter(compId => 
      dataSource[compId]?.matches?.length > 0
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
            <p className="text-gray-400 mt-8">Loading football highlights...</p>
          </div>
        </div>
      </div>
    );
  }

  // Calculate totals
  const totalResults = Object.values(groupedResults).reduce(
    (sum: number, league: any) => sum + (league?.matches?.length || 0), 0
  );
  const totalUpcoming = Object.values(upcomingMatchesGrouped).reduce(
    (sum: number, league: any) => sum + (league?.matches?.length || 0), 0
  );

  const competitionsWithData = getCompetitionsWithData();

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
          <p className="text-xl text-gray-300">
            Live scores, upcoming fixtures, and football facts
          </p>
        </div>

        {/* Fun Fact Banner */}
        {funFact && (
          <div className="mb-8 bg-gradient-to-r from-yellow-900/20 to-orange-900/20 border border-yellow-700/30 rounded-lg p-6">
            <h2 className="text-2xl font-bold text-yellow-400">Fun Fact of the Day</h2>
            <p className="text-gray-300 mt-2">{funFact.description}</p>
            <div className="mt-3 flex justify-between items-center">
              <span className="text-sm text-gray-400">{funFact.category}</span>
              <span className="text-xs text-gray-500">
                {funFact._source === 'groq-ai' ? '🤖 AI Generated' : 
                 funFact._source === 'static' ? '📚 Historical Fact' : '📊 Verified Fact'}
              </span>
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
            Recent Results ({totalResults})
          </button>
          <button
            onClick={() => setActiveTab('upcoming')}
            className={`px-4 py-3 font-semibold transition-all rounded-t-lg ${
              activeTab === 'upcoming'
                ? 'text-blue-400 border-b-2 border-blue-400 bg-gray-800/30'
                : 'text-gray-400 hover:text-white hover:bg-gray-800/20'
            }`}
          >
            Upcoming Matches ({totalUpcoming})
          </button>
        </div>

        {/* Content */}
        <div className="space-y-6">
          {/* Recent Results Tab */}
          {activeTab === 'results' && (
            <>
              <div className="flex justify-between items-center mb-6">
                <div>
                  <h2 className="text-2xl font-bold">Latest Results</h2>
                  <p className="text-gray-400 text-sm">
                    Showing matches from last 14 days • {competitionsWithData.length} competitions
                  </p>
                </div>
                <div className="text-sm text-gray-400">
                  {totalResults} matches total
                </div>
              </div>
              
              {totalResults > 0 ? (
                <div className="space-y-6">
                  {competitionsWithData.map((compId) => {
                      const leagueData = groupedResults[compId];
                      const isExpanded = expandedLeagues[compId];
                      
                      return (
                        <div key={compId} className="mb-6">
                          {/* Competition Header */}
                          <div className="mb-4 p-3 bg-gray-800/50 rounded-lg border border-gray-700">
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-3">
                                <div className={`w-3 h-8 rounded ${COMPETITION_NAMES[compId]?.color || 'bg-gray-600'}`} />
                                <div>
                                  <h3 className="text-lg font-bold text-white">
                                    {getCompetitionName(compId)}
                                  </h3>
                                  <p className="text-sm text-gray-400">
                                    {leagueData.country} • {leagueData.matches.length} matches
                                  </p>
                                </div>
                              </div>
                              <button
                                onClick={() => setExpandedLeagues(prev => ({
                                  ...prev,
                                  [compId]: !prev[compId]
                                }))}
                                className="text-sm text-gray-400 hover:text-white transition-colors px-3 py-1 bg-gray-700/50 rounded"
                              >
                                {isExpanded ? '▲ Collapse' : '▼ Expand'}
                              </button>
                            </div>
                          </div>
                          
                          {/* Matches */}
                          {isExpanded && (
                            <div className="space-y-2">
                              {leagueData.matches.map((match: MatchResult) => (
                                <div key={match.id} className="bg-gray-800/40 rounded-lg p-3 border border-gray-700 hover:border-blue-500/30 transition-all">
                                  <div className="flex items-center justify-between gap-4">
                                    <div className="flex-1 text-right">
                                      <div className="font-bold text-white">{match.homeTeam.name}</div>
                                    </div>
                                    <div className="flex flex-col items-center justify-center min-w-[80px]">
                                      <div className="text-xl font-bold text-white">
                                        {match.homeTeam.goals} - {match.awayTeam.goals}
                                      </div>
                                      <div className="text-xs text-green-400 font-medium mt-1">FT</div>
                                    </div>
                                    <div className="flex-1 text-left">
                                      <div className="font-bold text-white">{match.awayTeam.name}</div>
                                    </div>
                                  </div>
                                  <div className="text-xs text-gray-400 mt-2 pt-2 border-t border-gray-700/50">
                                    {formatDate(match.date)} • {match.competition}
                                  </div>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      );
                    })}
                </div>
              ) : (
                <div className="text-center py-12 bg-gray-800/20 rounded-lg">
                  <p className="text-gray-400">No match results available for this period</p>
                  <p className="text-sm text-gray-500 mt-2">
                    Check back later for recent match results
                  </p>
                </div>
              )}
            </>
          )}

          {/* Upcoming Matches Tab */}
          {activeTab === 'upcoming' && (
            <>
              <div className="flex justify-between items-center mb-6">
                <div>
                  <h2 className="text-2xl font-bold">Upcoming Matches</h2>
                  <p className="text-gray-400 text-sm">
                    Showing matches for next 7 days • {competitionsWithData.length} competitions
                  </p>
                </div>
                <div className="text-sm text-gray-400">
                  {totalUpcoming} matches total
                </div>
              </div>
              
              {totalUpcoming > 0 ? (
                <div className="space-y-6">
                  {competitionsWithData.map((compId) => {
                      const leagueData = upcomingMatchesGrouped[compId];
                      const isExpanded = expandedLeagues[compId];
                      
                      return (
                        <div key={compId} className="mb-6">
                          {/* Competition Header */}
                          <div className="mb-4 p-3 bg-gray-800/50 rounded-lg border border-gray-700">
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-3">
                                <div className={`w-3 h-8 rounded ${COMPETITION_NAMES[compId]?.color || 'bg-gray-600'}`} />
                                <div>
                                  <h3 className="text-lg font-bold text-white">
                                    {getCompetitionName(compId)}
                                  </h3>
                                  <p className="text-sm text-gray-400">
                                    {leagueData.country} • {leagueData.matches.length} matches
                                  </p>
                                </div>
                              </div>
                              <button
                                onClick={() => setExpandedLeagues(prev => ({
                                  ...prev,
                                  [compId]: !prev[compId]
                                }))}
                                className="text-sm text-gray-400 hover:text-white transition-colors px-3 py-1 bg-gray-700/50 rounded"
                              >
                                {isExpanded ? '▲ Collapse' : '▼ Expand'}
                              </button>
                            </div>
                          </div>
                          
                          {/* Matches */}
                          {isExpanded && (
                            <div className="space-y-2">
                              {leagueData.matches.map((match: MatchResult) => (
                                <div key={match.id} className="bg-gray-800/40 rounded-lg p-3 border border-gray-700 hover:border-green-500/30 transition-all">
                                  <div className="flex items-center justify-between gap-4">
                                    <div className="flex-1 text-right">
                                      <div className="font-bold text-white">{match.homeTeam.name}</div>
                                    </div>
                                    <div className="flex flex-col items-center justify-center min-w-[80px]">
                                      <div className="text-xl font-bold text-gray-400">VS</div>
                                      <div className="text-xs text-gray-500 mt-1">
                                        {formatDateTime(match.date)}
                                      </div>
                                    </div>
                                    <div className="flex-1 text-left">
                                      <div className="font-bold text-white">{match.awayTeam.name}</div>
                                    </div>
                                  </div>
                                  <div className="text-xs text-gray-400 mt-2 pt-2 border-t border-gray-700/50">
                                    {match.competition}
                                    {match.venue && ` • 📍 ${match.venue}`}
                                  </div>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      );
                    })}
                </div>
              ) : (
                <div className="text-center py-12 bg-gray-800/20 rounded-lg">
                  <p className="text-gray-400">No upcoming matches scheduled</p>
                  <p className="text-sm text-gray-500 mt-2">
                    Check back later for upcoming fixtures
                  </p>
                </div>
              )}
            </>
          )}
        </div>

        {/* Information about missing competitions */}
        {(activeTab === 'results' && totalResults > 0) || (activeTab === 'upcoming' && totalUpcoming > 0) ? (
          <div className="mt-8 p-4 bg-gray-800/30 rounded-lg border border-gray-700">
            <p className="text-sm text-gray-400">
              <span className="font-medium">Note:</span> Some cup competitions may not be displayed if they're not currently in season or if no matches are scheduled.
              Currently showing {competitionsWithData.length} out of {COMPETITION_PRIORITY.length} supported competitions.
            </p>
          </div>
        ) : null}

        {/* Refresh Button */}
        <div className="mt-12 pt-8 border-t border-gray-800 text-center">
          <button
            onClick={() => {
              clearMatchCache();
              setLoading(true);
              loadData();
            }}
            className="px-6 py-3 bg-blue-600 hover:bg-blue-700 rounded-lg font-semibold transition-colors"
          >
            Refresh All Data
          </button>
          <p className="text-gray-500 text-sm mt-2">
            Data updates every 15 minutes • Last updated: {new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
          </p>
        </div>
      </div>
    </div>
  );
}