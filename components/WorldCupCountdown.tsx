'use client';

import { useState, useEffect } from 'react';
import { useLanguage } from '@/context/LanguageContext';
import { useTranslation } from '@/hooks/useTranslation';

interface Match {
  id: number;
  date: string;
  time: string;
  group: string;
  team1: string;
  team2: string;
  venue: string;
  city: string;
  status: 'scheduled' | 'live' | 'completed';
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
  status: 'scheduled' | 'live' | 'completed';
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

export default function WorldCupCountdown() {
  const [todayMatches, setTodayMatches] = useState<Match[]>([]);
  const [loading, setLoading] = useState(true);
  const [userTimezone, setUserTimezone] = useState('');
  const [currentDate, setCurrentDate] = useState('');
  const { language } = useLanguage();
  const { t } = useTranslation();

  useEffect(() => {
    const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
    setUserTimezone(tz);
    
    // Set current date
    const now = new Date();
    setCurrentDate(now.toLocaleDateString(language === 'es' ? 'es-ES' : 'en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    }));
    
    fetchTodayMatches();
    
    // Refresh every 60 seconds when matches are live
    const interval = setInterval(() => {
      fetchTodayMatches();
    }, 60000);
    
    return () => clearInterval(interval);
  }, [language]);

  const fetchTodayMatches = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/worldcup');
      if (!response.ok) return;
      
      const data: WorldCupData = await response.json();
      
      // Get today's date in YYYY-MM-DD format
      const today = new Date();
      const todayStr = today.toISOString().split('T')[0];
      
      // Find all matches scheduled for today
      const matches: Match[] = [];
      
      // Group stage matches
      if (data.groups) {
        data.groups.forEach(group => {
          group.matches.forEach(match => {
            if (match.date === todayStr) {
              matches.push({ ...match, group: group.id });
            }
          });
        });
      }
      
      // Knockout stage matches
      if (data.knockout && Array.isArray(data.knockout)) {
        data.knockout.forEach((match: any) => {
          if (match.date === todayStr) {
            // Only show knockout matches that have actual team names (not placeholders)
            if (!match.team1.includes('Winner') && !match.team2.includes('Winner')) {
              matches.push({
                ...match,
                group: match.stage || 'Knockout',
                group: match.stage || 'Knockout'
              });
            }
          }
        });
      }
      
      // Sort by time
      matches.sort((a, b) => a.time.localeCompare(b.time));
      setTodayMatches(matches);
    } catch (error) {
      console.error('Error fetching today\'s matches:', error);
    } finally {
      setLoading(false);
    }
  };

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
      'Qatar': '🇶🇦', 'Ecuador': '🇪🇨', 'Paraguay': '🇵🇾',
      'Turkey': '🇹🇷', 'Scotland': '🏴󠁧󠁢󠁳󠁣󠁴󠁿',
      'Korea Republic': '🇰🇷', 'Haiti': '🇭🇹', 'Cabo Verde': '🇨🇻',
      'Curaçao': '🇨🇼', 'Côte d\'Ivoire': '🇨🇮', 'Congo DR': '🇨🇩',
      'Uzbekistan': '🇺🇿', 'Jordan': '🇯🇴', 'Panama': '🇵🇦',
      'Czechia': '🇨🇿', 'Bosnia and Herzegovina': '🇧🇦',
      'Cape Verde': '🇨🇻', 'Ivory Coast': '🇨🇮'
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
        <span className="inline-flex items-center text-xs font-medium text-green-400">
          <span className="w-2 h-2 bg-green-500 rounded-full mr-1 animate-pulse"></span>
          LIVE
        </span>
      );
    }
    if (match.status === 'completed') {
      return (
        <span className="text-xs font-medium text-blue-400">
          FT
        </span>
      );
    }
    return (
      <span className="text-xs font-medium text-yellow-400">
        Scheduled
      </span>
    );
  };

  const translateTeam = (teamName: string) => {
    const translated = t(`teams.${teamName}`);
    if (translated && !translated.includes('teams.')) {
      return translated;
    }
    return teamName;
  };

  if (loading) {
    return (
      <div className="bg-gradient-to-r from-blue-900/30 to-green-900/30 rounded-2xl p-6 border border-blue-700/30">
        <div className="animate-pulse">
          <div className="h-6 bg-gray-700 rounded w-1/3 mb-4 mx-auto"></div>
          <div className="space-y-3">
            <div className="h-16 bg-gray-800/50 rounded"></div>
            <div className="h-16 bg-gray-800/50 rounded"></div>
          </div>
        </div>
      </div>
    );
  }

  if (todayMatches.length === 0) {
    return (
      <div className="bg-gradient-to-r from-blue-900/30 to-green-900/30 rounded-2xl p-6 border border-blue-700/30 text-center">
        <div className="text-4xl mb-3">📅</div>
        <h3 className="text-lg font-semibold text-white mb-1">
          No Matches Today
        </h3>
        <p className="text-gray-400 text-sm">
          {currentDate}
        </p>
        <p className="text-gray-500 text-xs mt-2">
          Check back tomorrow for upcoming World Cup matches
        </p>
        <p className="text-gray-500 text-xs mt-1">
          Your timezone: {userTimezone}
        </p>
      </div>
    );
  }

  return (
    <div className="bg-gradient-to-r from-blue-900/30 to-green-900/30 rounded-2xl p-6 border border-blue-700/30">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-lg font-semibold text-white">
            📅 Today's Matches
          </h3>
          <p className="text-gray-400 text-sm">
            {currentDate}
          </p>
        </div>
        <div className="text-right">
          <span className="text-xs text-gray-500">
            {todayMatches.length} match{todayMatches.length !== 1 ? 'es' : ''}
          </span>
          <p className="text-xs text-gray-500">
            🕐 {userTimezone}
          </p>
        </div>
      </div>

      <div className="space-y-3 max-h-[400px] overflow-y-auto pr-1 scrollbar-thin scrollbar-thumb-gray-700 scrollbar-track-transparent">
        {todayMatches.map((match) => (
          <a
            key={match.id}
            href={`/?search=${encodeURIComponent(match.team1)}&group=${match.group}`}
            className={`block p-3 rounded-xl border transition-all hover:scale-[1.01] ${
              match.status === 'live'
                ? 'bg-green-900/20 border-green-700/50 hover:border-green-500/70'
                : match.status === 'completed'
                ? 'bg-gray-800/30 border-gray-700/50 hover:border-blue-500/30'
                : 'bg-gray-800/30 border-gray-700/50 hover:border-yellow-500/30'
            }`}
          >
            <div className="flex items-center justify-between gap-3">
              <div className="flex-1 text-right">
                <div className="flex items-center justify-end gap-2">
                  <span className="font-medium text-white text-sm">
                    {translateTeam(match.team1)}
                  </span>
                  <span className="text-lg">
                    {getTeamFlag(match.team1)}
                  </span>
                </div>
              </div>

              <div className="flex flex-col items-center min-w-[60px]">
                <div className="font-bold text-white text-sm">
                  {match.status === 'live' || match.status === 'completed' ? (
                    <span className="text-lg">
                      {match.score1 ?? 0} - {match.score2 ?? 0}
                    </span>
                  ) : (
                    <span className="text-gray-400 text-xs font-normal">VS</span>
                  )}
                </div>
                <div className="text-xs text-gray-500 mt-0.5">
                  {renderStatus(match)}
                </div>
              </div>

              <div className="flex-1 text-left">
                <div className="flex items-center gap-2">
                  <span className="text-lg">
                    {getTeamFlag(match.team2)}
                  </span>
                  <span className="font-medium text-white text-sm">
                    {translateTeam(match.team2)}
                  </span>
                </div>
              </div>
            </div>

            <div className="flex items-center justify-between mt-2 pt-2 border-t border-gray-700/30 text-xs text-gray-500">
              <span>{match.time}</span>
              <span>{match.group}</span>
              <span>{match.venue}</span>
            </div>
          </a>
        ))}
      </div>

      <div className="mt-4 pt-3 border-t border-gray-700/30 text-center">
        <p className="text-xs text-gray-500">
          🕐 All times shown in your local timezone ({userTimezone})
          {todayMatches.some(m => m.status === 'live') && ' • 🔴 Live updates active'}
        </p>
      </div>
    </div>
  );
}