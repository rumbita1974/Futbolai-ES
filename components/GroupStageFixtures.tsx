"use client";

import { useState, useEffect, useCallback } from "react";
import { useLanguage } from "@/context/LanguageContext";
import { useTranslation } from "@/hooks/useTranslation";
import { isPlaceholderTeam } from "@/services/translationService";

interface Match {
  id: number;
  date: string;
  time: string;
  group: string;
  team1: string;
  team2: string;
  venue: string;
  city: string;
  status: "scheduled" | "live" | "completed";
  score1?: number;
  score2?: number;
}

interface Group {
  id: string;
  name: string;
  teams: string[];
  matches: Match[];
}

interface KnockoutMatch {
  id: number;
  stage: string;
  team1: string;
  team2: string;
  date: string;
  time: string;
  venue: string;
  city: string;
  status: "scheduled" | "live" | "completed";
  score1?: number;
  score2?: number;
}

interface WorldCupData {
  success: boolean;
  tournamentStart: string;
  groups: Group[];
  knockout?: KnockoutMatch[];
  totalMatches: number;
  lastUpdated: string;
}

interface GroupStageFixturesProps {
  defaultGroup?: string;
}

export default function GroupStageFixtures({ defaultGroup = "A" }: GroupStageFixturesProps) {
  const [data, setData] = useState<WorldCupData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedGroup, setSelectedGroup] = useState<string>(defaultGroup);
  const [userTimezone, setUserTimezone] = useState<string>("");
  const [mounted, setMounted] = useState(false);
  const [autoRefreshEnabled, setAutoRefreshEnabled] = useState(true);
  const [view, setView] = useState<'groups' | 'knockout'>('groups');
  
  const { language } = useLanguage();
  const { t } = useTranslation();

  useEffect(() => {
    setMounted(true);
    setUserTimezone(Intl.DateTimeFormat().resolvedOptions().timeZone);
    fetchWorldCupData();
  }, []);

  useEffect(() => {
    if (defaultGroup && defaultGroup !== selectedGroup) {
      setSelectedGroup(defaultGroup);
    }
  }, [defaultGroup]);

  useEffect(() => {
    if (!mounted || !autoRefreshEnabled) return;
    
    const interval = setInterval(() => {
      const hasLiveMatches = data?.groups?.some(group =>
        group.matches.some(match => match.status === 'live')
      ) || data?.knockout?.some(match => match.status === 'live');
      
      if (hasLiveMatches) {
        console.log('[WorldCup] Auto-refreshing live scores...');
        fetchWorldCupData();
      }
    }, 60000);
    
    return () => clearInterval(interval);
  }, [mounted, autoRefreshEnabled, data]);

  const fetchWorldCupData = useCallback(async () => {
    try {
      setLoading(true);
      const response = await fetch("/api/worldcup");
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      const result = await response.json();

      if (!result.success) {
        throw new Error(result.error || t('worldCup.fetchError'));
      }

      console.log("Fetched World Cup data:", result);
      setData(result);
    } catch (err) {
      console.error("Error fetching World Cup data:", err);
      setError(err instanceof Error ? err.message : t('common.unknownError'));
    } finally {
      setLoading(false);
    }
  }, [t]);

  const formatDate = (dateString: string) => {
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString(language === 'es' ? 'es-ES' : 'en-US', {
        weekday: "short",
        month: "short",
        day: "numeric",
        year: "numeric",
      });
    } catch (e) {
      return dateString;
    }
  };

  const getGroupMatches = () => {
    if (!data) return [];
    const group = data.groups.find((g) => g.id === selectedGroup);
    return group ? group.matches : [];
  };

  const getKnockoutMatches = () => {
    if (!data || !data.knockout) return [];
    return data.knockout;
  };

  const translateTeam = (teamName: string) => {
    // Check if it's a placeholder team
    if (isPlaceholderTeam(teamName)) {
      // Format placeholder nicely
      if (teamName.match(/^[W|L]\d{3}$/)) {
        const type = teamName.startsWith('W') ? 'Winner' : 'Loser';
        const num = teamName.substring(1);
        return `${type} ${num}`;
      }
      return teamName;
    }
    
    const translated = t(`teams.${teamName}`);
    if (translated && !translated.includes('teams.')) {
      return translated;
    }
    return teamName;
  };

  const getTeamFlag = (teamName: string) => {
    // Don't show flags for placeholder teams
    if (isPlaceholderTeam(teamName)) {
      return '⚽';
    }
    
    const flags: { [key: string]: string } = {
      'Mexico': '🇲🇽', 'USA': '🇺🇸', 'Canada': '🇨🇦',
      'Brazil': '🇧🇷', 'Argentina': '🇦🇷', 'Germany': '🇩🇪',
      'France': '🇫🇷', 'Spain': '🇪🇸', 'England': '🏴󠁧󠁢󠁥󠁮󠁧󠁿',
      'Portugal': '🇵🇹', 'Italy': '🇮🇹', 'Netherlands': '🇳🇱',
      'Japan': '🇯🇵', 'South Korea': '🇰🇷', 'Australia': '🇦🇺',
      'Morocco': '🇲🇦', 'Senegal': '🇸🇳', 'Egypt': '🇪🇬',
      'Uruguay': '🇺🇾', 'Chile': '🇨🇱', 'Colombia': '🇨🇴',
      'Belgium': '🇧🇪', 'Croatia': '🇭🇷', 'Switzerland': '🇨🇭',
      'Denmark': '🇩🇰', 'Sweden': '🇸🇪', 'Norway': '🇳🇴',
      'South Africa': '🇿🇦', 'Nigeria': '🇳🇬', 'Ghana': '🇬🇭',
      'Ivory Coast': '🇨🇮', 'Cameroon': '🇨🇲', 'Algeria': '🇩🇿',
      'Tunisia': '🇹🇳', 'Saudi Arabia': '🇸🇦', 'Iran': '🇮🇷',
      'Qatar': '🇶🇦', 'Ecuador': '🇪🇨', 'Paraguay': '🇵🇾',
      'Turkey': '🇹🇷', 'Türkiye': '🇹🇷', 'Scotland': '🏴󠁧󠁢󠁳󠁣󠁴󠁿',
      'Korea Republic': '🇰🇷', 'Haiti': '🇭🇹', 'Cabo Verde': '🇨🇻',
      'Curaçao': '🇨🇼', 'Côte d\'Ivoire': '🇨🇮', 'Congo DR': '🇨🇩',
      'DR Congo': '🇨🇩', 'Uzbekistan': '🇺🇿', 'Jordan': '🇯🇴', 'Panama': '🇵🇦',
      'Czechia': '🇨🇿', 'Bosnia and Herzegovina': '🇧🇦',
      'Bosnia & Herzegovina': '🇧🇦', 'Cape Verde': '🇨🇻',
      'Ivory Coast': '🇨🇮', 'Czech Republic': '🇨🇿'
    };
    
    if (flags[teamName]) return flags[teamName];
    
    const teamKeys = Object.keys(flags);
    for (let i = 0; i < teamKeys.length; i++) {
      const country = teamKeys[i];
      if (teamName.includes(country)) return flags[country];
    }
    return '⚽';
  };

  const renderStatus = (match: Match) => {
    if (match.status === 'live') {
      return (
        <span className="inline-flex items-center px-2 md:px-3 py-1 rounded-full text-xs font-medium bg-green-900/30 text-green-300 border border-green-800/50">
          <span className="w-2 h-2 bg-green-500 rounded-full mr-1 md:mr-2 animate-pulse"></span>
          {match.score1 !== undefined && match.score2 !== undefined ? (
            `${match.score1} - ${match.score2} • LIVE`
          ) : (
            'LIVE'
          )}
        </span>
      );
    }
    
    if (match.status === 'completed') {
      return (
        <span className="inline-flex items-center px-2 md:px-3 py-1 rounded-full text-xs font-medium bg-blue-900/30 text-blue-300 border border-blue-800/50">
          {match.score1 !== undefined && match.score2 !== undefined ? (
            `${match.score1} - ${match.score2} • FT`
          ) : (
            'Completed'
          )}
        </span>
      );
    }
    
    return (
      <span className="inline-flex items-center px-2 md:px-3 py-1 rounded-full text-xs font-medium bg-yellow-900/30 text-yellow-300 border border-yellow-800/50">
        <span className="w-2 h-2 bg-yellow-500 rounded-full mr-1 md:mr-2"></span>
        Scheduled
      </span>
    );
  };

  const handleGroupChange = (groupId: string) => {
    setSelectedGroup(groupId);
    setView('groups');
  };

  // Check if any matches are live
  const hasLiveMatches = data?.groups?.some(group =>
    group.matches.some(match => match.status === 'live')
  ) || data?.knockout?.some(match => match.status === 'live');

  if (!mounted) {
    return (
      <div className="bg-gray-900/40 rounded-2xl p-4 md:p-6 border border-gray-800">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-800 rounded mb-4 w-1/3"></div>
          <div className="h-64 bg-gray-800/50 rounded"></div>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-[300px] md:min-h-[400px]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-300 text-sm md:text-base">
            {t('worldCup.loadingFixtures')}
          </p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-900/20 border border-red-700/50 rounded-xl p-4 md:p-6 text-center">
        <h3 className="text-red-300 font-semibold text-lg md:text-xl">
          {t('worldCup.errorLoading')}
        </h3>
        <p className="text-red-400/80 mt-2 text-sm md:text-base">{error}</p>
        <button
          onClick={fetchWorldCupData}
          className="mt-4 px-4 py-2 bg-red-700/80 text-white rounded-lg hover:bg-red-600 transition text-sm md:text-base"
        >
          {t('common.retry')}
        </button>
      </div>
    );
  }

  if (!data || !data.groups || data.groups.length === 0) {
    return (
      <div className="bg-yellow-900/20 border border-yellow-700/50 rounded-xl p-4 md:p-6 text-center">
        <h3 className="text-yellow-300 font-semibold text-lg md:text-xl">
          {t('worldCup.noData')}
        </h3>
        <p className="text-yellow-400/80 mt-2 text-sm md:text-base">
          {t('worldCup.failedToLoad')}
        </p>
        <button
          onClick={fetchWorldCupData}
          className="mt-4 px-4 py-2 bg-yellow-700/80 text-white rounded-lg hover:bg-yellow-600 transition text-sm md:text-base"
        >
          {t('common.tryAgain')}
        </button>
      </div>
    );
  }

  return (
    <div className="bg-gray-900/40 rounded-2xl p-4 md:p-6 border border-gray-800">
      <div className="mb-6 md:mb-8">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <h2 className="text-xl md:text-2xl font-bold text-white mb-1">
              {view === 'groups' ? 'Group Stage Fixtures' : 'Knockout Stage'}
            </h2>
            <p className="text-gray-400 text-sm md:text-base">
              {view === 'groups' 
                ? 'Official group stage schedule with venues and dates'
                : 'Round of 32 • Round of 16 • Quarter-finals • Semi-finals • Final'
              }
            </p>
          </div>
          {hasLiveMatches && (
            <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-green-900/40 text-green-300 border border-green-700/50 animate-pulse">
              <span className="w-2 h-2 bg-green-500 rounded-full mr-2"></span>
              LIVE NOW
            </span>
          )}
        </div>
        
        {/* View Toggle */}
        <div className="mt-4 flex gap-2">
          <button
            onClick={() => setView('groups')}
            className={`px-4 py-2 rounded-lg font-medium transition ${
              view === 'groups'
                ? 'bg-gradient-to-r from-blue-600 to-green-500 text-white'
                : 'bg-gray-800 text-gray-300 hover:bg-gray-700'
            }`}
          >
            📋 Groups
          </button>
          <button
            onClick={() => setView('knockout')}
            className={`px-4 py-2 rounded-lg font-medium transition ${
              view === 'knockout'
                ? 'bg-gradient-to-r from-blue-600 to-green-500 text-white'
                : 'bg-gray-800 text-gray-300 hover:bg-gray-700'
            }`}
          >
            🏆 Knockout
          </button>
        </div>
        
        {/* Timezone Info Bar */}
        <div className="mt-4 p-3 bg-blue-900/20 rounded-lg border border-blue-800/30 flex flex-wrap items-center justify-between gap-2">
          <p className="text-blue-300 text-sm md:text-base">
            <span className="font-semibold">{t('common.tip')}:</span> Tap on team cards to search for players
          </p>
          <div className="flex items-center gap-3">
            <div className="text-xs text-blue-400 bg-blue-900/30 px-2 py-1 rounded">
              🕐 Your timezone: {userTimezone}
            </div>
            {hasLiveMatches && (
              <div className="text-xs text-green-400 bg-green-900/30 px-2 py-1 rounded animate-pulse">
                ⚡ Auto-refreshing
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Group Selector - Only show in groups view */}
      {view === 'groups' && (
        <>
          <div className="mb-6 md:mb-8">
            <h3 className="text-base md:text-lg font-semibold text-gray-300 mb-3">
              {t('worldCup.selectGroup')}
            </h3>
            <div className="flex flex-nowrap gap-2 overflow-x-auto pb-2 -mx-1 px-1">
              {data.groups.map((group) => (
                <button
                  key={group.id}
                  onClick={() => setSelectedGroup(group.id)}
                  className={`px-4 py-2 rounded-lg transition font-medium whitespace-nowrap flex-shrink-0 ${
                    selectedGroup === group.id
                      ? "bg-gradient-to-r from-blue-600 to-green-500 text-white shadow-lg"
                      : "bg-gray-800/60 text-gray-300 hover:bg-gray-700/60"
                  }`}
                >
                  {group.name}
                </button>
              ))}
            </div>
          </div>

          {/* Group Teams */}
          <div className="mb-6">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-lg md:text-xl font-bold text-white">
                {data.groups.find((g) => g.id === selectedGroup)?.name}
              </h3>
              <span className="text-xs text-gray-400 bg-gray-800/50 px-2 py-1 rounded">
                {t('worldCup.tapHintShort')}
              </span>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-4 gap-3 mb-4">
              {data.groups
                .find((g) => g.id === selectedGroup)
                ?.teams.map((team) => (
                  <a
                    key={team}
                    href={`/?search=${encodeURIComponent(team)}&group=${selectedGroup}`}
                    className="group bg-gray-800/30 p-4 rounded-xl border border-gray-700/50 text-center hover:bg-gray-700/40 hover:border-blue-500/50 transition-all duration-200 hover:scale-[1.02] block"
                  >
                    <div className="text-2xl mb-2 transform group-hover:scale-110 transition-transform duration-200">
                      {getTeamFlag(team)}
                    </div>
                    <span className="font-medium text-white text-sm md:text-base block">
                      {translateTeam(team)}
                    </span>
                    <div className="mt-2 flex items-center justify-center">
                      <span className="text-xs text-blue-400 opacity-0 group-hover:opacity-100 transition-opacity duration-200 flex items-center">
                        {t('worldCup.searchPlayers')}
                        <svg className="w-3 h-3 ml-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
                        </svg>
                      </span>
                      <span className="text-xs text-gray-500 group-hover:hidden">
                        Team
                      </span>
                    </div>
                  </a>
                ))}
            </div>
            
            <div className="text-center mb-4">
              <p className="text-xs text-gray-500">
                {t('worldCup.groupHint', { group: selectedGroup })}
              </p>
            </div>
          </div>

          {/* CET Reference Bar */}
          <div className="mb-4 p-2 bg-green-900/20 rounded-lg border border-green-800/30 text-center">
            <p className="text-xs text-green-400">
              🕐 CET Reference: Central European Time (UTC+1) / Central European Summer Time (UTC+2)
            </p>
          </div>

          {/* Group Matches Table */}
          <div className="overflow-x-auto rounded-xl border border-gray-800 -mx-2 px-2">
            <table className="min-w-full divide-y divide-gray-800">
              <thead className="bg-gray-900/60">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                    Date
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                    Match
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                    Venue
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                    Status
                  </th>
                </tr>
              </thead>
              <tbody className="bg-gray-900/30 divide-y divide-gray-800">
                {getGroupMatches().map((match) => (
                  <tr key={match.id} className={`hover:bg-gray-800/40 transition ${match.status === 'live' ? 'bg-green-900/10' : ''}`}>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <div className="text-xs md:text-sm font-medium text-white">
                        {formatDate(match.date)}
                      </div>
                      <div className="text-xs text-green-400">
                        {match.time}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center space-x-2 md:space-x-4">
                        <div className="flex-1 text-right">
                          <a 
                            href={`/?search=${encodeURIComponent(match.team1)}&group=${selectedGroup}`}
                            className={`font-bold text-sm md:text-base transition hover:text-blue-300 ${
                              match.status === 'live' && match.score1 !== undefined && match.score2 !== undefined && match.score1 > match.score2
                                ? 'text-green-400'
                                : 'text-white'
                            }`}
                          >
                            {getTeamFlag(match.team1)} {translateTeam(match.team1)}
                          </a>
                        </div>
                        <div className="flex flex-col items-center min-w-[50px] md:min-w-[70px]">
                          {match.status === 'live' || match.status === 'completed' ? (
                            <div className="font-bold text-white text-sm md:text-base">
                              {match.score1 ?? 0} - {match.score2 ?? 0}
                            </div>
                          ) : (
                            <div className="px-2 md:px-3 py-1 bg-gray-800/50 rounded-lg">
                              <span className="font-bold text-gray-300 text-xs md:text-sm">
                                VS
                              </span>
                            </div>
                          )}
                        </div>
                        <div className="flex-1">
                          <a 
                            href={`/?search=${encodeURIComponent(match.team2)}&group=${selectedGroup}`}
                            className={`font-bold text-sm md:text-base transition hover:text-blue-300 ${
                              match.status === 'live' && match.score1 !== undefined && match.score2 !== undefined && match.score2 > match.score1
                                ? 'text-green-400'
                                : 'text-white'
                            }`}
                          >
                            {translateTeam(match.team2)} {getTeamFlag(match.team2)}
                          </a>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <div>
                        <div className="text-xs md:text-sm font-medium text-white">
                          {match.venue}
                        </div>
                        <div className="text-xs text-gray-400">{match.city}</div>
                      </div>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      {renderStatus(match)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}

      {/* Knockout View */}
      {view === 'knockout' && (
        <div className="overflow-x-auto rounded-xl border border-gray-800 -mx-2 px-2">
          <table className="min-w-full divide-y divide-gray-800">
            <thead className="bg-gray-900/60">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                  Stage
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                  Date
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                  Match
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                  Venue
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                  Status
                </th>
              </tr>
            </thead>
            <tbody className="bg-gray-900/30 divide-y divide-gray-800">
              {getKnockoutMatches().map((match) => {
                const isPlaceholder1 = isPlaceholderTeam(match.team1);
                const isPlaceholder2 = isPlaceholderTeam(match.team2);
                
                return (
                  <tr key={match.id} className={`hover:bg-gray-800/40 transition ${match.status === 'live' ? 'bg-green-900/10' : ''}`}>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <span className="inline-flex items-center px-2 py-1 rounded text-xs font-medium bg-purple-900/30 text-purple-300 border border-purple-800/50">
                        {match.stage || 'Knockout'}
                      </span>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <div className="text-xs md:text-sm font-medium text-white">
                        {formatDate(match.date)}
                      </div>
                      <div className="text-xs text-green-400">
                        {match.time}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center space-x-2 md:space-x-4">
                        <div className="flex-1 text-right">
                          <span className={`font-bold text-sm md:text-base ${
                            match.status === 'live' && match.score1 !== undefined && match.score2 !== undefined && match.score1 > match.score2
                              ? 'text-green-400'
                              : 'text-white'
                          }`}>
                            {!isPlaceholder1 && getTeamFlag(match.team1)} {translateTeam(match.team1)}
                          </span>
                        </div>
                        <div className="flex flex-col items-center min-w-[50px] md:min-w-[70px]">
                          {match.status === 'live' || match.status === 'completed' ? (
                            <div className="font-bold text-white text-sm md:text-base">
                              {match.score1 ?? 0} - {match.score2 ?? 0}
                            </div>
                          ) : (
                            <div className="px-2 md:px-3 py-1 bg-gray-800/50 rounded-lg">
                              <span className="font-bold text-gray-300 text-xs md:text-sm">
                                VS
                              </span>
                            </div>
                          )}
                        </div>
                        <div className="flex-1">
                          <span className={`font-bold text-sm md:text-base ${
                            match.status === 'live' && match.score1 !== undefined && match.score2 !== undefined && match.score2 > match.score1
                              ? 'text-green-400'
                              : 'text-white'
                          }`}>
                            {translateTeam(match.team2)} {!isPlaceholder2 && getTeamFlag(match.team2)}
                          </span>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <div>
                        <div className="text-xs md:text-sm font-medium text-white">
                          {match.venue}
                        </div>
                        <div className="text-xs text-gray-400">{match.city}</div>
                      </div>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      {renderStatus(match)}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Footer Info */}
      <div className="mt-6 p-4 bg-gray-800/30 rounded-xl border border-gray-700/50">
        <div className="flex flex-col md:flex-row md:justify-between md:items-center gap-4">
          <div>
            {view === 'groups' ? (
              <>
                <p className="text-xs md:text-sm text-gray-400">
                  <span className="font-medium text-gray-300">
                    Total matches in Group {selectedGroup}:
                  </span>{" "}
                  {getGroupMatches().length}
                </p>
                <p className="text-xs md:text-sm text-gray-400 mt-1">
                  <span className="font-medium text-gray-300">Tournament starts:</span>{" "}
                  {formatDate(data.tournamentStart)}
                </p>
              </>
            ) : (
              <p className="text-xs md:text-sm text-gray-400">
                <span className="font-medium text-gray-300">Knockout matches:</span>{" "}
                {getKnockoutMatches().length} matches
              </p>
            )}
            <p className="text-xs text-gray-500 mt-2">
              🕐 All times shown in CET (Central European Time)
              {hasLiveMatches && ' • Scores update automatically'}
            </p>
          </div>
          <div className="flex flex-col sm:flex-row gap-2">
            <button
              onClick={fetchWorldCupData}
              className="px-3 md:px-4 py-2 text-xs md:text-sm bg-green-700/80 text-white rounded-lg hover:bg-green-600 transition font-medium"
            >
              🔄 {t('worldCup.refreshNow') || 'Refresh Now'}
            </button>
            <button
              onClick={() => setAutoRefreshEnabled(!autoRefreshEnabled)}
              className={`px-3 md:px-4 py-2 text-xs md:text-sm rounded-lg transition font-medium ${
                autoRefreshEnabled
                  ? 'bg-blue-700/60 text-blue-300 hover:bg-blue-600'
                  : 'bg-gray-700/60 text-gray-400 hover:bg-gray-600'
              }`}
            >
              {autoRefreshEnabled ? '⏸ Auto-refresh ON' : '▶ Auto-refresh OFF'}
            </button>
            <a
              href="/api/worldcup"
              target="_blank"
              className="px-3 md:px-4 py-2 text-xs md:text-sm bg-gradient-to-r from-blue-600 to-green-500 text-white rounded-lg hover:opacity-90 transition font-medium text-center"
            >
              View API Data
            </a>
            <a
              href="/"
              className="px-3 md:px-4 py-2 text-xs md:text-sm bg-gradient-to-r from-purple-600 to-pink-500 text-white rounded-lg hover:opacity-90 transition font-medium text-center"
            >
              Back to Search
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}