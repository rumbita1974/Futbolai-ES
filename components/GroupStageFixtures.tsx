"use client";

import { useState, useEffect } from "react";
import { useTranslation } from "@/hooks/useTranslation";

interface Match {
  id: number;
  date: string;
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

interface WorldCupData {
  success: boolean;
  tournamentStart: string;
  groups: Group[];
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
  
  // Use the translation hook
  const { t, language } = useTranslation();

  useEffect(() => {
    fetchWorldCupData();
  }, []);

  // Update selected group when defaultGroup prop changes
  useEffect(() => {
    if (defaultGroup && defaultGroup !== selectedGroup) {
      setSelectedGroup(defaultGroup);
    }
  }, [defaultGroup]);

  const fetchWorldCupData = async () => {
    try {
      setLoading(true);
      const response = await fetch("/api/worldcup");
      if (!response.ok)
        throw new Error(`HTTP error! status: ${response.status}`);
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
  };

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

  // Function to get team flag emoji
  const getTeamFlag = (teamName: string) => {
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
      'Qatar': '🇶🇦', 'United Arab Emirates': '🇦🇪',
      'Costa Rica': '🇨🇷', 'Panama': '🇵🇦', 'Jamaica': '🇯🇲',
      'Honduras': '🇭🇳', 'El Salvador': '🇸🇻', 'Peru': '🇵🇪',
      'Ecuador': '🇪🇨', 'Paraguay': '🇵🇾', 'Bolivia': '🇧🇴',
      'Venezuela': '🇻🇪', 'Russia': '🇷🇺', 'Ukraine': '🇺🇦',
      'Poland': '🇵🇱', 'Czech Republic': '🇨🇿', 'Slovakia': '🇸🇰',
      'Hungary': '🇭🇺', 'Romania': '🇷🇴', 'Bulgaria': '🇧🇬',
      'Serbia': '🇷🇸', 'Bosnia': '🇧🇦', 'Slovenia': '🇸🇮',
      'North Macedonia': '🇲🇰', 'Albania': '🇦🇱', 'Greece': '🇬🇷',
      'Turkey': '🇹🇷', 'Israel': '🇮🇱', 'Scotland': '🏴󠁧󠁢󠁳󠁣󠁴󠁿',
      'Wales': '🏴󠁧󠁢󠁷󠁬󠁳󠁿', 'Northern Ireland': '🇬🇧',
      'Republic of Ireland': '🇮🇪', 'Finland': '🇫🇮',
      'Iceland': '🇮🇸', 'Faroe Islands': '🇫🇴'
    };
    
    // Check for exact match first
    if (flags[teamName]) return flags[teamName];
    
    // Check for partial matches
    const teamKeys = Object.keys(flags);
    for (let i = 0; i < teamKeys.length; i++) {
      const country = teamKeys[i];
      if (teamName.includes(country)) return flags[country];
    }
    
    return '⚽';
  };

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
        <h2 className="text-xl md:text-2xl font-bold text-white mb-2">
          {t('worldCup.fixturesTitle')}
        </h2>
        <p className="text-gray-400 text-sm md:text-base">
          {t('worldCup.fixturesDescription')}
        </p>
        <div className="mt-4 p-3 bg-blue-900/20 rounded-lg border border-blue-800/30">
          <p className="text-blue-300 text-sm md:text-base">
            <span className="font-semibold">{t('common.tip')}:</span> {t('worldCup.tapHint')}
          </p>
        </div>
      </div>

      {/* Group Selector - Mobile Scrollable */}
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

      {/* Group Teams - Interactive Team Cards */}
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
            ?.teams.map((team, index) => (
              <a
                key={team}
                href={`/?search=${encodeURIComponent(team)}&group=${selectedGroup}`}
                className="group bg-gray-800/30 p-4 rounded-xl border border-gray-700/50 text-center hover:bg-gray-700/40 hover:border-blue-500/50 transition-all duration-200 hover:scale-[1.02] block"
              >
                <div className="text-2xl mb-2 transform group-hover:scale-110 transition-transform duration-200">
                  {getTeamFlag(team)}
                </div>
                <span className="font-medium text-white text-sm md:text-base block">
                  {team}
                </span>
                <div className="mt-2 flex items-center justify-center">
                  <span className="text-xs text-blue-400 opacity-0 group-hover:opacity-100 transition-opacity duration-200 flex items-center">
                    {t('worldCup.searchPlayers')}
                    <svg className="w-3 h-3 ml-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
                    </svg>
                  </span>
                  <span className="text-xs text-gray-500 group-hover:hidden">
                    {t('worldCup.team')}
                  </span>
                </div>
              </a>
            ))}
        </div>
        
        {/* Group Navigation Hint */}
        <div className="text-center mb-4">
          <p className="text-xs text-gray-500">
            {t('worldCup.groupHint', { group: selectedGroup })}
          </p>
        </div>
      </div>

      {/* Matches Table - Mobile Scrollable */}
      <div className="overflow-x-auto rounded-xl border border-gray-800 -mx-2 px-2">
        <table className="min-w-full divide-y divide-gray-800">
          <thead className="bg-gray-900/60">
            <tr>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                {t('worldCup.date')}
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                {t('worldCup.match')}
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                {t('worldCup.venue')}
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                {t('worldCup.status')}
              </th>
            </tr>
          </thead>
          <tbody className="bg-gray-900/30 divide-y divide-gray-800">
            {getGroupMatches().map((match) => (
              <tr key={match.id} className="hover:bg-gray-800/40 transition">
                <td className="px-4 py-3 whitespace-nowrap">
                  <div className="text-xs md:text-sm font-medium text-white">
                    {formatDate(match.date)}
                  </div>
                </td>
                <td className="px-4 py-3">
                  <div className="flex items-center space-x-2 md:space-x-4">
                    <div className="flex-1 text-right">
                      <a 
                        href={`/?search=${encodeURIComponent(match.team1)}&group=${selectedGroup}`}
                        className="font-bold text-white text-sm md:text-base hover:text-blue-300 transition"
                      >
                        {match.team1}
                      </a>
                    </div>
                    <div className="flex flex-col items-center min-w-[60px] md:min-w-[80px]">
                      <div className="px-2 md:px-3 py-1 bg-gray-800/50 rounded-lg">
                        <span className="font-bold text-gray-300 text-xs md:text-sm">
                          VS
                        </span>
                      </div>
                      <div className="text-xs text-gray-500 mt-1 hidden md:block">
                        {t('worldCup.notPlayed')}
                      </div>
                    </div>
                    <div className="flex-1">
                      <a 
                        href={`/?search=${encodeURIComponent(match.team2)}&group=${selectedGroup}`}
                        className="font-bold text-white text-sm md:text-base hover:text-blue-300 transition"
                      >
                        {match.team2}
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
                  <span className="inline-flex items-center px-2 md:px-3 py-1 rounded-full text-xs font-medium bg-yellow-900/30 text-yellow-300 border border-yellow-800/50">
                    <span className="w-2 h-2 bg-yellow-500 rounded-full mr-1 md:mr-2"></span>
                    {t('worldCup.scheduled')}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Footer Info - Mobile Stacked */}
      <div className="mt-6 p-4 bg-gray-800/30 rounded-xl border border-gray-700/50">
        <div className="flex flex-col md:flex-row md:justify-between md:items-center gap-4">
          <div>
            <p className="text-xs md:text-sm text-gray-400">
              <span className="font-medium text-gray-300">
                {t('worldCup.totalMatches', { group: selectedGroup })}
              </span>{" "}
              {getGroupMatches().length}
            </p>
            <p className="text-xs md:text-sm text-gray-400 mt-1">
              <span className="font-medium text-gray-300">{t('worldCup.tournamentStarts')}</span>{" "}
              {formatDate(data.tournamentStart)}
            </p>
          </div>
          <div className="flex flex-col sm:flex-row gap-2">
            <button
              onClick={fetchWorldCupData}
              className="px-3 md:px-4 py-2 text-xs md:text-sm bg-gray-800/60 text-gray-300 rounded-lg hover:bg-gray-700/60 transition font-medium"
            >
              {t('worldCup.refreshData')}
            </button>
            <a
              href="/api/worldcup"
              target="_blank"
              className="px-3 md:px-4 py-2 text-xs md:text-sm bg-gradient-to-r from-blue-600 to-green-500 text-white rounded-lg hover:opacity-90 transition font-medium text-center"
            >
              {t('worldCup.viewAPI')}
            </a>
            <a
              href="/"
              className="px-3 md:px-4 py-2 text-xs md:text-sm bg-gradient-to-r from-purple-600 to-pink-500 text-white rounded-lg hover:opacity-90 transition font-medium text-center"
            >
              {t('worldCup.backToSearch')}
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}