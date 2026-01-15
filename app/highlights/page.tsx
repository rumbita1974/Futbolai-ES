'use client';

import { useEffect, useState } from 'react';
import { useTranslation } from '@/hooks/useTranslation';
import type { MatchResult, WeeklyMatches } from '@/services/matchesService';
import { getWeeklyMatches, getLatestResults, getUpcomingMatches } from '@/services/matchesService';

export default function HighlightsPage() {
  const { t, language } = useTranslation();
  const [matches, setMatches] = useState<WeeklyMatches | null>(null);
  const [latestResults, setLatestResults] = useState<MatchResult[]>([]);
  const [upcomingMatches, setUpcomingMatches] = useState<MatchResult[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'results' | 'upcoming' | 'stats'>('results');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadMatches = async () => {
      try {
        setLoading(true);
        setError(null);

        const [weeklyData, latest, upcoming] = await Promise.all([
          getWeeklyMatches(),
          getLatestResults(10),
          getUpcomingMatches(30),
        ]);

        setMatches(weeklyData);
        setLatestResults(latest);
        setUpcomingMatches(upcoming);
      } catch (err) {
        console.error('Error loading matches:', err);
        setError(t('highlights.error') || 'Failed to load matches');
      } finally {
        setLoading(false);
      }
    };

    loadMatches();
  }, [language, t]);

  const formatDate = (dateString: string): string => {
    const date = new Date(dateString);
    const options: Intl.DateTimeFormatOptions = {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    };
    return date.toLocaleDateString(language === 'es' ? 'es-ES' : 'en-US', options);
  };

  const MatchCard = ({ match }: { match: MatchResult }) => (
    <div className="bg-gray-800/40 rounded-lg p-4 border border-gray-700 hover:border-blue-500/50 transition-all">
      <div className="text-xs text-gray-400 mb-2">
        {match.competition}
        {match.round && ` • ${match.round}`}
      </div>
      
      <div className="flex items-center justify-between gap-4">
        <div className="flex-1 text-right">
          <div className="font-bold text-white">{match.homeTeam.name}</div>
          <div className="text-sm text-gray-400">{formatDate(match.date)}</div>
        </div>

        <div className="flex items-center justify-center min-w-[80px]">
          {match.status === 'FINISHED' ? (
            <div className="text-center">
              <div className="text-2xl font-bold text-white">
                {match.homeTeam.goals} - {match.awayTeam.goals}
              </div>
              <div className="text-xs text-green-400">FT</div>
            </div>
          ) : match.status === 'LIVE' ? (
            <div className="text-center animate-pulse">
              <div className="text-2xl font-bold text-red-400">
                {match.homeTeam.goals} - {match.awayTeam.goals}
              </div>
              <div className="text-xs text-red-400">LIVE</div>
            </div>
          ) : (
            <div className="text-center">
              <div className="text-2xl font-bold text-gray-400">VS</div>
              <div className="text-xs text-gray-500">TBD</div>
            </div>
          )}
        </div>

        <div className="flex-1 text-left">
          <div className="font-bold text-white">{match.awayTeam.name}</div>
          <div className="text-sm text-gray-400">{match.venue || 'TBA'}</div>
        </div>
      </div>
    </div>
  );

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-gray-900 via-gray-800 to-black text-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <div className="text-center">
            <div className="animate-pulse">
              <div className="h-12 bg-gray-700 rounded mb-4 w-64 mx-auto"></div>
              <div className="h-4 bg-gray-700 rounded mb-8 w-96 mx-auto"></div>
              <div className="space-y-4">
                {[1, 2, 3, 4, 5].map((i) => (
                  <div key={i} className="h-24 bg-gray-800 rounded"></div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-gray-900 via-gray-800 to-black text-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <div className="text-center">
            <h1 className="text-3xl font-bold text-red-400 mb-4">Error</h1>
            <p className="text-gray-300 mb-8">{error}</p>
            <button
              onClick={() => window.location.reload()}
              className="px-6 py-2 bg-blue-600 hover:bg-blue-700 rounded-lg font-semibold transition-colors"
            >
              {t('common.retry') || 'Retry'}
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-900 via-gray-800 to-black text-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 md:py-20">
        {/* Header */}
        <div className="mb-12">
          <h1 className="text-4xl md:text-6xl font-bold mb-4">
            <span className="bg-gradient-to-r from-blue-400 to-green-400 bg-clip-text text-transparent">
              {t('highlights.title') || 'Live Matches & Highlights'}
            </span>
          </h1>
          <p className="text-xl text-gray-300">
            {t('highlights.subtitle') || 'Latest results and upcoming matches from major European leagues'}
          </p>
        </div>

        {/* Statistics */}
        {matches && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-12">
            <div className="bg-gradient-to-br from-blue-900/40 to-blue-800/20 rounded-lg p-6 border border-blue-700/50">
              <div className="text-sm text-blue-300 mb-2">{t('highlights.totalMatches') || 'Total Matches'}</div>
              <div className="text-4xl font-bold text-white">{matches.statistics.totalMatches}</div>
            </div>
            <div className="bg-gradient-to-br from-green-900/40 to-green-800/20 rounded-lg p-6 border border-green-700/50">
              <div className="text-sm text-green-300 mb-2">{t('highlights.goalsScored') || 'Goals Scored'}</div>
              <div className="text-4xl font-bold text-white">{Math.round(matches.statistics.goalsScored)}</div>
            </div>
            <div className="bg-gradient-to-br from-purple-900/40 to-purple-800/20 rounded-lg p-6 border border-purple-700/50">
              <div className="text-sm text-purple-300 mb-2">{t('highlights.avgGoals') || 'Avg Goals/Match'}</div>
              <div className="text-4xl font-bold text-white">{matches.statistics.averageGoalsPerMatch.toFixed(2)}</div>
            </div>
          </div>
        )}

        {/* Tabs */}
        <div className="flex gap-4 mb-8 border-b border-gray-700">
          <button
            onClick={() => setActiveTab('results')}
            className={`px-6 py-3 font-semibold transition-all ${
              activeTab === 'results'
                ? 'text-blue-400 border-b-2 border-blue-400'
                : 'text-gray-400 hover:text-white'
            }`}
          >
            {t('highlights.results') || 'Recent Results'} ({latestResults.length})
          </button>
          <button
            onClick={() => setActiveTab('upcoming')}
            className={`px-6 py-3 font-semibold transition-all ${
              activeTab === 'upcoming'
                ? 'text-blue-400 border-b-2 border-blue-400'
                : 'text-gray-400 hover:text-white'
            }`}
          >
            {t('highlights.upcoming') || 'Upcoming Matches'} ({upcomingMatches.length})
          </button>
          <button
            onClick={() => setActiveTab('stats')}
            className={`px-6 py-3 font-semibold transition-all ${
              activeTab === 'stats'
                ? 'text-blue-400 border-b-2 border-blue-400'
                : 'text-gray-400 hover:text-white'
            }`}
          >
            {t('highlights.statistics') || 'Statistics'}
          </button>
        </div>

        {/* Content */}
        <div className="space-y-4">
          {activeTab === 'results' && (
            <>
              <h2 className="text-2xl font-bold mb-4">{t('highlights.latestResults') || 'Latest Results'}</h2>
              {latestResults.length > 0 ? (
                latestResults.map((match) => <MatchCard key={match.id} match={match} />)
              ) : (
                <div className="text-center py-8 text-gray-400">
                  {t('highlights.noMatches') || 'No recent matches found'}
                </div>
              )}
            </>
          )}

          {activeTab === 'upcoming' && (
            <>
              <h2 className="text-2xl font-bold mb-4">{t('highlights.upcomingMatches') || 'Upcoming Matches (Next 30 Days)'}</h2>
              {upcomingMatches.length > 0 ? (
                upcomingMatches.map((match) => <MatchCard key={match.id} match={match} />)
              ) : (
                <div className="text-center py-8 text-gray-400">
                  {t('highlights.noMatches') || 'No upcoming matches found'}
                </div>
              )}
            </>
          )}

          {activeTab === 'stats' && matches && (
            <>
              <h2 className="text-2xl font-bold mb-4">{t('highlights.weeklyStats') || 'This Week\'s Statistics'}</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="bg-gray-800/40 rounded-lg p-6 border border-gray-700">
                  <h3 className="text-lg font-bold mb-4">{t('highlights.currentWeek') || 'Current Week'}</h3>
                  <div className="text-3xl font-bold text-blue-400 mb-2">{matches.currentWeek.length}</div>
                  <p className="text-gray-400">{t('highlights.matchesPlayed') || 'matches played'}</p>
                </div>
                <div className="bg-gray-800/40 rounded-lg p-6 border border-gray-700">
                  <h3 className="text-lg font-bold mb-4">{t('highlights.nextMonth') || 'Next 30 Days'}</h3>
                  <div className="text-3xl font-bold text-green-400 mb-2">{matches.upcomingMonth.length}</div>
                  <p className="text-gray-400">{t('highlights.matchesScheduled') || 'matches scheduled'}</p>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}