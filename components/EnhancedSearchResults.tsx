// components/EnhancedSearchResults.tsx
'use client';

import { useState, useEffect } from 'react';
import { searchYouTubeHighlights, YouTubeVideo } from '@/services/youtubeService';
import { Player, Team } from '@/services/groqService';
import { getDataSourceInfo } from '@/services/groqService';

interface EnhancedResultsProps {
  players: Player[];
  teams: Team[];
  youtubeQuery: string;
  searchTerm: string;
  _metadata?: any;
}

// Extend the Player interface locally for the UI
interface ExtendedPlayer extends Player {
  preferredPosition?: string;
  preferredFoot?: string;
  careerTimeline?: Array<{
    team: string;
    years: string;
    appearances?: number;
    goals?: number;
  }>;
  transferHistory?: Array<{
    fromTeam: string;
    toTeam: string;
    date: string;
    fee: string;
  }>;
  latestTransfer?: {
    fromTeam: string;
    toTeam: string;
    date: string;
    fee: string;
  };
}

// RELIABLE MANAGER DATABASE (fallback when APIs fail)
const MANAGER_DATABASE: Record<string, string> = {
  // Premier League
  'Manchester City': 'Pep Guardiola',
  'Manchester United': 'Ruben Amorim',
  'Liverpool': 'Arne Slot',
  'Arsenal': 'Mikel Arteta',
  'Chelsea': 'Enzo Maresca',
  'Tottenham': 'Ange Postecoglou',
  'Aston Villa': 'Unai Emery',
  'Newcastle': 'Eddie Howe',
  
  // La Liga
  'Real Madrid': 'Carlo Ancelotti',
  'Barcelona': 'Hansi Flick',
  'Atletico Madrid': 'Diego Simeone',
  'Athletic Bilbao': 'Ernesto Valverde',
  'Real Sociedad': 'Imanol Alguacil',
  'Valencia': 'Carlos Corberán',
  'Sevilla': 'García Pimienta',
  
  // Bundesliga
  'Bayern Munich': 'Vincent Kompany',
  'Borussia Dortmund': 'Niko Kovač',
  'Bayer Leverkusen': 'Xabi Alonso',
  'RB Leipzig': 'Marco Rose',
  
  // Serie A
  'Inter Milan': 'Simone Inzaghi',
  'AC Milan': 'Sérgio Conceição',
  'Juventus': 'Thiago Motta',
  'Napoli': 'Antonio Conte',
  'Roma': 'Claudio Ranieri',
  'Lazio': 'Marco Baroni',
  
  // Ligue 1
  'Paris Saint-Germain': 'Luis Enrique',
  'Marseille': 'Roberto De Zerbi',
  'Monaco': 'Adi Hütter',
  'Lyon': 'Pierre Sage',
  
  // National Teams
  'Argentina': 'Lionel Scaloni',
  'Brazil': 'Dorival Júnior',
  'France': 'Didier Deschamps',
  'Germany': 'Julian Nagelsmann',
  'Italy': 'Luciano Spalletti',
  'Spain': 'Luis de la Fuente',
  'England': 'Thomas Tuchel',
  'Portugal': 'Roberto Martínez',
  'Netherlands': 'Ronald Koeman',
  'Belgium': 'Domenico Tedesco',
  'Uruguay': 'Marcelo Bielsa',
  'Croatia': 'Zlatko Dalić',
  'Morocco': 'Walid Regragui',
  'Japan': 'Hajime Moriyasu',
  'USA': 'Mauricio Pochettino',
  'Mexico': 'Javier Aguirre',
  'Canada': 'Jesse Marsch',
  'Colombia': 'Néstor Lorenzo',
  'Chile': 'Ricardo Gareca',
  'Peru': 'Óscar Ibáñez',
  'Ecuador': 'Sebastián Beccacece',
  'Paraguay': 'Gustavo Alfaro',
  'Venezuela': 'Fernando Batista'
};

export default function EnhancedSearchResults({
  players = [],
  teams = [],
  youtubeQuery = '',
  searchTerm = '',
  _metadata = {}
}: EnhancedResultsProps) {
  const [youtubeVideos, setYoutubeVideos] = useState<YouTubeVideo[]>([]);
  const [loadingVideos, setLoadingVideos] = useState(false);
  const [videoError, setVideoError] = useState<string | null>(null);
  const [expandedPlayer, setExpandedPlayer] = useState<string | null>(null);
  const [expandedTeam, setExpandedTeam] = useState<string | null>(null);
  const [mounted, setMounted] = useState(false);
  
  // Handle hydration - only render after mount
  useEffect(() => {
    setMounted(true);
  }, []);

  // Safely handle props
  const safePlayers = Array.isArray(players) ? players : [];
  const safeTeams = Array.isArray(teams) ? teams : [];
  const safeYoutubeQuery = youtubeQuery || `${searchTerm} football highlights 2025`;

  // CASCADING MANAGER LOOKUP - Priority order:
  // 1. From players array (TheSportsDB)
  // 2. From team.currentCoach (football-data)
  // 3. From Wikipedia/GROQ (through _metadata)
  // 4. From reliable local database (fallback)
  // 5. Unknown
  const getTeamManager = (team: Team): string => {
    if (!team) return 'Unknown';
    
    const teamName = team.name;
    const teamNameLower = teamName.toLowerCase();
    
    // PRIORITY 1: Check players array from TheSportsDB
    if (safePlayers.length > 0) {
      // Look for someone explicitly marked as manager/coach
      const managerFromPlayers = safePlayers.find(p => {
        const position = p.position?.toLowerCase() || '';
        const name = p.name?.toLowerCase() || '';
        
        // Check position
        if (position.includes('manager') || position.includes('coach') || position.includes('trainer')) {
          // Check if they belong to this team
          const playerTeam = p.currentTeam?.toLowerCase() || '';
          return playerTeam.includes(teamNameLower) || teamNameLower.includes(playerTeam);
        }
        
        // Check for known manager names
        const managerNames = [
          'ancelotti', 'guardiola', 'klopp', 'arteta', 'emery', 'mourinho',
          'simeone', 'deschamps', 'southgate', 'flick', 'tuchel', 'nagelsmann',
          'xavi', 'inzaghi', 'spalletti', 'scaloni', 'arbeloa', 'ten hag',
          'enrique', 'rodgers', 'conte', 'allegri', 'pochettino', 'zidane',
          'kompany', 'alonso', 'motta', 'conceição', 'maresca', 'slot',
          'postecoglou', 'howe', 'valverde', 'alguacil', 'corberán', 'pimienta',
          'rose', 'baroni', 'ranieri', 'hütter', 'sage', 'dorival', 'battista'
        ];
        
        return managerNames.some(manager => name.includes(manager)) &&
               (p.currentTeam?.toLowerCase().includes(teamNameLower) || teamNameLower.includes(p.currentTeam?.toLowerCase() || ''));
      });
      
      if (managerFromPlayers) {
        console.log(`✅ [MANAGER] Found in TheSportsDB: ${managerFromPlayers.name} for ${teamName}`);
        return managerFromPlayers.name;
      }
    }
    
    // PRIORITY 2: Check team.currentCoach from football-data
    if (team.currentCoach && team.currentCoach !== 'Unknown' && team.currentCoach !== '') {
      console.log(`✅ [MANAGER] Found in football-data: ${team.currentCoach} for ${teamName}`);
      return team.currentCoach;
    }
    
    // PRIORITY 3: Check Wikipedia/GROQ data in _metadata
    if (_metadata?.managers && _metadata.managers[teamName]) {
      console.log(`✅ [MANAGER] Found in Wikipedia/GROQ: ${_metadata.managers[teamName]} for ${teamName}`);
      return _metadata.managers[teamName];
    }
    
    // PRIORITY 4: Check local database (fallback)
    const exactMatch = MANAGER_DATABASE[teamName];
    if (exactMatch) {
      console.log(`✅ [MANAGER] Found in local database: ${exactMatch} for ${teamName}`);
      return exactMatch;
    }
    
    // Try partial match for local database
    for (const [key, value] of Object.entries(MANAGER_DATABASE)) {
      if (teamNameLower.includes(key.toLowerCase()) || key.toLowerCase().includes(teamNameLower)) {
        console.log(`✅ [MANAGER] Found in local database (partial): ${value} for ${teamName}`);
        return value;
      }
    }
    
    // PRIORITY 5: Unknown
    console.log(`❌ [MANAGER] No manager found for ${teamName}`);
    return 'Unknown';
  };

  // Fetch YouTube videos
  useEffect(() => {
    const fetchVideos = async () => {
      if (!safeYoutubeQuery || !mounted) return;
      
      setLoadingVideos(true);
      setVideoError(null);
      
      try {
        const apiKey = process.env.NEXT_PUBLIC_YOUTUBE_API_KEY;
        const result = await searchYouTubeHighlights(safeYoutubeQuery, apiKey || '');
        
        if (result.error) {
          setVideoError(result.error);
        } else {
          setYoutubeVideos(Array.isArray(result.videos) ? result.videos : []);
        }
      } catch (error) {
        setVideoError('Failed to load videos');
      } finally {
        setLoadingVideos(false);
      }
    };

    fetchVideos();
  }, [safeYoutubeQuery, mounted]);

  // ENHANCED: Player data enrichment for display
  const enrichPlayerData = (player: Player): ExtendedPlayer => {
    const enriched: ExtendedPlayer = { ...player };
    
    // Add preferred position based on player name
    const playerEnhancements: Record<string, Partial<ExtendedPlayer>> = {
      'Lionel Messi': {
        preferredPosition: 'Right Winger / False 9',
        preferredFoot: 'Left',
        careerTimeline: [
          { team: 'Barcelona', years: '2004-2021', appearances: 778, goals: 672 },
          { team: 'Paris Saint-Germain', years: '2021-2023', appearances: 75, goals: 32 },
          { team: 'Inter Miami', years: '2023-', appearances: 34, goals: 28 }
        ],
        latestTransfer: {
          fromTeam: 'Paris Saint-Germain',
          toTeam: 'Inter Miami',
          date: '2023-07-15',
          fee: 'Free Transfer'
        }
      },
      'Cristiano Ronaldo': {
        preferredPosition: 'Left Winger / Striker',
        preferredFoot: 'Right',
        careerTimeline: [
          { team: 'Sporting CP', years: '2002-2003', appearances: 31, goals: 5 },
          { team: 'Manchester United', years: '2003-2009', appearances: 292, goals: 118 },
          { team: 'Real Madrid', years: '2009-2018', appearances: 438, goals: 450 },
          { team: 'Juventus', years: '2018-2021', appearances: 134, goals: 101 },
          { team: 'Manchester United', years: '2021-2022', appearances: 54, goals: 27 },
          { team: 'Al-Nassr', years: '2023-', appearances: 45, goals: 44 }
        ],
        latestTransfer: {
          fromTeam: 'Manchester United',
          toTeam: 'Al-Nassr',
          date: '2023-01-01',
          fee: 'Free Transfer'
        }
      },
      'Kylian Mbappé': {
        preferredPosition: 'Left Winger / Striker',
        preferredFoot: 'Right',
        careerTimeline: [
          { team: 'Monaco', years: '2015-2017', appearances: 60, goals: 27 },
          { team: 'Paris Saint-Germain', years: '2017-2024', appearances: 308, goals: 256 },
          { team: 'Real Madrid', years: '2024-', appearances: 48, goals: 44 }
        ],
        latestTransfer: {
          fromTeam: 'Paris Saint-Germain',
          toTeam: 'Real Madrid',
          date: '2024-07-01',
          fee: 'Free Transfer'
        }
      },
      'Erling Haaland': {
        preferredPosition: 'Center Forward',
        preferredFoot: 'Left',
        careerTimeline: [
          { team: 'Molde', years: '2017-2019', appearances: 50, goals: 20 },
          { team: 'Red Bull Salzburg', years: '2019-2020', appearances: 27, goals: 29 },
          { team: 'Borussia Dortmund', years: '2020-2022', appearances: 89, goals: 86 },
          { team: 'Manchester City', years: '2022-', appearances: 105, goals: 98 }
        ],
        latestTransfer: {
          fromTeam: 'Borussia Dortmund',
          toTeam: 'Manchester City',
          date: '2022-07-01',
          fee: '€60M'
        }
      },
      'Vinícius Júnior': {
        preferredPosition: 'Left Winger',
        preferredFoot: 'Right',
        careerTimeline: [
          { team: 'Flamengo', years: '2017-2018', appearances: 50, goals: 11 },
          { team: 'Real Madrid', years: '2018-', appearances: 245, goals: 72 }
        ],
        latestTransfer: {
          fromTeam: 'Flamengo',
          toTeam: 'Real Madrid',
          date: '2018-07-12',
          fee: '€45M'
        }
      },
      'Jude Bellingham': {
        preferredPosition: 'Midfielder',
        preferredFoot: 'Right',
        careerTimeline: [
          { team: 'Birmingham City', years: '2019-2020', appearances: 44, goals: 4 },
          { team: 'Borussia Dortmund', years: '2020-2023', appearances: 132, goals: 24 },
          { team: 'Real Madrid', years: '2023-', appearances: 55, goals: 23 }
        ],
        latestTransfer: {
          fromTeam: 'Borussia Dortmund',
          toTeam: 'Real Madrid',
          date: '2023-07-01',
          fee: '€103M'
        }
      }
    };

    // Apply enhancements if available
    const enhancement = playerEnhancements[player.name];
    if (enhancement) {
      Object.assign(enriched, enhancement);
    } else {
      // Default enhancements based on position
      enriched.preferredPosition = player.position || 'Unknown';
      enriched.preferredFoot = 'Right'; // Default
    }

    return enriched;
  };

  // Helper component for stat boxes
  const StatBox = ({ label, value }: { label: string; value?: number }) => (
    <div className="bg-gradient-to-br from-gray-50 to-gray-100 p-3 rounded-lg text-center border border-gray-200">
      <div className="text-xl font-bold text-gray-800">{value !== undefined && value !== null ? value : '-'}</div>
      <div className="text-xs text-gray-600 mt-1">{label}</div>
    </div>
  );

  // Helper to check if a team is national
  const isNationalTeam = (team: Team): boolean => {
    return team.type === 'national' || 
           (team.country && team.name === team.country) ||
           ['Argentina', 'Brazil', 'Uruguay', 'France', 'England', 'Germany', 
            'Spain', 'Italy', 'Portugal', 'Netherlands', 'Belgium'].includes(team.name);
  };

  // Get FIFA ranking for national teams
  const getFifaRanking = (teamName: string): number | undefined => {
    const rankings: Record<string, number> = {
      'Argentina': 1,
      'France': 2,
      'Brazil': 3,
      'England': 4,
      'Belgium': 5,
      'Portugal': 6,
      'Netherlands': 7,
      'Spain': 8,
      'Italy': 9,
      'Germany': 10,
      'Uruguay': 11,
      'Croatia': 12,
      'Morocco': 13,
      'Switzerland': 14,
      'USA': 15,
      'Mexico': 16,
      'Japan': 17,
      'Senegal': 18,
      'Iran': 19,
      'South Korea': 20
    };
    return rankings[teamName];
  };

  // Get IFFHS ranking for club teams
  const getIffhsRanking = (teamName: string): { world: number; continent: number; year: number } | undefined => {
    const rankings: Record<string, { world: number; continent: number; year: number }> = {
      'Real Madrid': { world: 1, continent: 1, year: 2025 },
      'Manchester City': { world: 2, continent: 1, year: 2025 },
      'Bayern Munich': { world: 3, continent: 2, year: 2025 },
      'Inter Milan': { world: 4, continent: 3, year: 2025 },
      'Paris Saint-Germain': { world: 5, continent: 2, year: 2025 },
      'Barcelona': { world: 6, continent: 3, year: 2025 },
      'Liverpool': { world: 7, continent: 4, year: 2025 },
      'Arsenal': { world: 8, continent: 5, year: 2025 },
      'Atletico Madrid': { world: 9, continent: 4, year: 2025 },
      'Manchester United': { world: 10, continent: 6, year: 2025 }
    };
    return rankings[teamName];
  };

  // Parse achievements into sections
  const parseAchievements = (team: Team) => {
    const achievements = team.majorAchievements || {};
    const isNational = isNationalTeam(team);
    
    return {
      worldCup: isNational && achievements.worldCup ? achievements.worldCup : [],
      international: achievements.international || [],
      continental: achievements.continental || [],
      domestic: achievements.domestic || []
    };
  };

  // Determine if this is a team search (has teams)
  const isTeamSearch = safeTeams.length > 0;

  // Don't render anything until mounted (prevents hydration errors)
  if (!mounted) {
    return null;
  }

  // If this is a team search, only show teams
  if (isTeamSearch) {
    return (
      <div className="space-y-8 mt-8">
        {/* Data Source Info */}
        {_metadata && Object.keys(_metadata).length > 0 && (
          <div className="bg-white rounded-xl shadow-md p-4 mb-4 border border-gray-200">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <span className="text-2xl">{getDataSourceInfo(_metadata).icon}</span>
                <div>
                  <p className="text-sm font-medium text-gray-700">
                    Source: <span className="text-blue-600">{getDataSourceInfo(_metadata).source}</span>
                  </p>
                  <p className="text-xs text-gray-500">
                    Confidence: {getDataSourceInfo(_metadata).confidence}% • Season: {getDataSourceInfo(_metadata).season}
                  </p>
                </div>
              </div>
              {_metadata.correctedQuery && (
                <div className="text-sm bg-yellow-50 px-3 py-1 rounded-full">
                  🔄 Did you mean: <span className="font-bold">{_metadata.correctedQuery}</span>?
                </div>
              )}
            </div>
          </div>
        )}

        {/* TEAM RESULTS */}
        {safeTeams.map((team, idx) => {
          const isNational = isNationalTeam(team);
          const fifaRanking = isNational ? getFifaRanking(team.name) : undefined;
          const iffhsRanking = !isNational ? getIffhsRanking(team.name) : undefined;
          const achievements = parseAchievements(team);
          const isExpanded = expandedTeam === team.name;
          
          // CASCADING MANAGER LOOKUP
          const managerName = getTeamManager(team);
          
          return (
            <div key={idx} className="bg-white rounded-2xl shadow-xl overflow-hidden border border-gray-100">
              <div className="p-6 sm:p-8">
                {/* Team Header */}
                <div className="flex flex-col lg:flex-row justify-between items-start gap-6">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-3">
                      <h2 className="text-2xl sm:text-3xl font-bold text-gray-900">{team.name}</h2>
                    </div>
                    
                    <div className="flex flex-wrap items-center gap-2 mb-4">
                      <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                        isNational 
                          ? 'bg-red-100 text-red-700' 
                          : 'bg-blue-100 text-blue-700'
                      }`}>
                        {isNational ? '🏆 National Team' : '⚽ Football Club'}
                      </span>
                      
                      <span className="px-3 py-1 bg-gray-100 text-gray-700 rounded-full text-sm font-medium">
                        {team.country || 'Unknown'}
                      </span>
                      
                      {/* Show manager name from cascading lookup */}
                      <span className="px-3 py-1 bg-purple-100 text-purple-700 rounded-full text-sm font-medium">
                        👨‍🏫 {managerName}
                      </span>
                      
                      {team.foundedYear && (
                        <span className="px-3 py-1 bg-yellow-100 text-yellow-700 rounded-full text-sm font-medium">
                          📅 Founded: {team.foundedYear}
                        </span>
                      )}
                    </div>

                    {/* Rankings Section */}
                    <div className="flex flex-wrap gap-4 mt-4">
                      {isNational && fifaRanking && (
                        <div className="bg-gradient-to-r from-red-50 to-orange-50 border border-red-200 rounded-lg px-4 py-2">
                          <div className="flex items-center gap-3">
                            <span className="text-2xl">🏆</span>
                            <div>
                              <span className="text-xs text-gray-600 block">FIFA World Ranking</span>
                              <span className="text-xl font-bold text-red-600">#{fifaRanking}</span>
                            </div>
                          </div>
                        </div>
                      )}
                      
                      {!isNational && iffhsRanking && (
                        <div className="bg-gradient-to-r from-blue-50 to-purple-50 border border-blue-200 rounded-lg px-4 py-2">
                          <div className="flex items-center gap-3">
                            <span className="text-2xl">🌍</span>
                            <div>
                              <span className="text-xs text-gray-600 block">IFFHS World Ranking {iffhsRanking.year}</span>
                              <span className="text-xl font-bold text-blue-600">#{iffhsRanking.world}</span>
                              <span className="text-xs text-gray-500 ml-2">(#{iffhsRanking.continent} in Europe)</span>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Team Summary (Expandable) */}
                    <div className="mt-6">
                      <button
                        onClick={() => setExpandedTeam(isExpanded ? null : team.name)}
                        className="text-left w-full"
                      >
                        <div className="flex items-center justify-between text-gray-700 hover:text-blue-600 transition">
                          <h3 className="text-lg font-semibold flex items-center gap-2">
                            <span>📋</span> Team Summary
                          </h3>
                          <span>{isExpanded ? '▲' : '▼'}</span>
                        </div>
                      </button>
                      
                      {isExpanded && (
                        <div className="mt-3 bg-gray-50 rounded-lg p-5 border border-gray-200">
                          <p className="text-gray-700 leading-relaxed">
                            {team.name} is a {isNational ? 'national team' : 'football club'} from {team.country || 'their home country'}.
                            {team.foundedYear && ` Founded in ${team.foundedYear}.`}
                            {` Currently managed by ${managerName}.`}
                            {team.stadium && ` Home matches are played at ${team.stadium}.`}
                          </p>
                          
                          {/* Achievement Summary */}
                          {Object.values(achievements).flat().length > 0 && (
                            <div className="mt-4 pt-4 border-t border-gray-200">
                              <p className="text-sm font-medium text-gray-600 mb-2">🏆 Major Achievements:</p>
                              <div className="flex flex-wrap gap-2">
                                {achievements.worldCup?.map((a, i) => (
                                  <span key={i} className="px-2 py-1 bg-red-100 text-red-700 rounded text-xs">🌍 {a}</span>
                                ))}
                                {achievements.international?.map((a, i) => (
                                  <span key={i} className="px-2 py-1 bg-purple-100 text-purple-700 rounded text-xs">🌎 {a}</span>
                                ))}
                                {achievements.continental?.map((a, i) => (
                                  <span key={i} className="px-2 py-1 bg-blue-100 text-blue-700 rounded text-xs">⚽ {a}</span>
                                ))}
                                {achievements.domestic?.map((a, i) => (
                                  <span key={i} className="px-2 py-1 bg-green-100 text-green-700 rounded text-xs">🏆 {a}</span>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* Data Source */}
                {team._source && (
                  <div className="mt-4 pt-4 border-t border-gray-100 text-xs text-gray-400">
                    Source: {team._source} • Last verified: {team._lastVerified ? new Date(team._lastVerified).toLocaleDateString() : 'N/A'}
                  </div>
                )}
              </div>
            </div>
          );
        })}

        {/* YouTube Highlights Section */}
        {youtubeVideos.length > 0 && (
          <div className="bg-white rounded-2xl shadow-xl overflow-hidden border border-gray-100">
            <div className="p-6 sm:p-8">
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-4">
                <div>
                  <h3 className="text-2xl font-bold text-gray-800 flex items-center">
                    <span className="mr-3">📺</span> Video Highlights
                  </h3>
                  {safeYoutubeQuery && (
                    <p className="text-gray-600 mt-1">
                      Search: <span className="font-medium">"{safeYoutubeQuery}"</span>
                    </p>
                  )}
                </div>
              </div>

              {videoError ? (
                <div className="bg-red-50 border border-red-200 rounded-lg p-6 text-center">
                  <p className="text-red-800">{videoError}</p>
                </div>
              ) : loadingVideos ? (
                <div className="flex justify-center items-center h-48">
                  <div className="text-center">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
                    <p className="mt-4 text-gray-600">Searching for highlights...</p>
                  </div>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  {youtubeVideos.slice(0, 6).map((video) => (
                    <div key={video.id} className="border border-gray-200 rounded-xl overflow-hidden hover:shadow-lg transition">
                      <a 
                        href={`https://www.youtube.com/watch?v=${video.id}`} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="block"
                      >
                        <div className="aspect-video relative overflow-hidden bg-gray-100">
                          <img 
                            src={video.thumbnail} 
                            alt={video.title}
                            className="w-full h-full object-cover hover:scale-105 transition duration-300"
                            loading="lazy"
                          />
                          <div className="absolute top-2 right-2 bg-red-600 text-white text-xs px-2 py-1 rounded">
                            YouTube
                          </div>
                        </div>
                        <div className="p-4">
                          <h4 className="font-semibold text-gray-800 line-clamp-2 mb-2 text-sm">
                            {video.title}
                          </h4>
                          <div className="flex justify-between items-center text-xs text-gray-500">
                            <span className="truncate mr-2">{video.channelTitle}</span>
                            <span className="flex-shrink-0">▶️ Play</span>
                          </div>
                        </div>
                      </a>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    );
  }

  // PLAYER SEARCH - Only show players
  return (
    <div className="space-y-8 mt-8">
      {/* Data Source Info */}
      {_metadata && Object.keys(_metadata).length > 0 && (
        <div className="bg-white rounded-xl shadow-md p-4 mb-4 border border-gray-200">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <span className="text-2xl">{getDataSourceInfo(_metadata).icon}</span>
              <div>
                <p className="text-sm font-medium text-gray-700">
                  Source: <span className="text-blue-600">{getDataSourceInfo(_metadata).source}</span>
                </p>
                <p className="text-xs text-gray-500">
                  Confidence: {getDataSourceInfo(_metadata).confidence}% • Season: {getDataSourceInfo(_metadata).season}
                </p>
              </div>
            </div>
            {_metadata.correctedQuery && (
              <div className="text-sm bg-yellow-50 px-3 py-1 rounded-full">
                🔄 Did you mean: <span className="font-bold">{_metadata.correctedQuery}</span>?
              </div>
            )}
          </div>
        </div>
      )}

      {/* PLAYER RESULTS */}
      {safePlayers.length > 0 ? (
        safePlayers.map((player, idx) => {
          const enrichedPlayer = enrichPlayerData(player);
          const isExpanded = expandedPlayer === player.name;
          
          return (
            <div key={idx} className="bg-white rounded-2xl shadow-xl overflow-hidden border border-gray-100">
              <div className="p-6 sm:p-8">
                {/* Player Header */}
                <div className="flex flex-col lg:flex-row justify-between items-start gap-6">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-3">
                      <h2 className="text-2xl sm:text-3xl font-bold text-gray-900">{enrichedPlayer.name}</h2>
                    </div>
                    
                    <div className="flex flex-wrap items-center gap-2 mb-4">
                      <span className="px-3 py-1 bg-blue-100 text-blue-700 rounded-full text-sm font-medium">
                        {enrichedPlayer.position || 'Player'}
                      </span>
                      
                      <span className="px-3 py-1 bg-gray-100 text-gray-700 rounded-full text-sm font-medium">
                        {enrichedPlayer.currentTeam || 'Unknown'}
                      </span>
                      
                      <span className="px-3 py-1 bg-green-100 text-green-700 rounded-full text-sm font-medium">
                        {enrichedPlayer.nationality || 'Unknown'}
                      </span>
                      
                      {enrichedPlayer.age && (
                        <span className="px-3 py-1 bg-purple-100 text-purple-700 rounded-full text-sm font-medium">
                          Age: {enrichedPlayer.age}
                        </span>
                      )}
                      
                      {/* Preferred Position & Foot */}
                      {enrichedPlayer.preferredPosition && (
                        <span className="px-3 py-1 bg-orange-100 text-orange-700 rounded-full text-sm font-medium">
                          ⚽ {enrichedPlayer.preferredPosition}
                        </span>
                      )}
                      
                      {enrichedPlayer.preferredFoot && (
                        <span className="px-3 py-1 bg-indigo-100 text-indigo-700 rounded-full text-sm font-medium">
                          {enrichedPlayer.preferredFoot === 'Left' ? '👈' : enrichedPlayer.preferredFoot === 'Right' ? '👉' : '👐'} {enrichedPlayer.preferredFoot} Foot
                        </span>
                      )}
                    </div>

                    {/* Player Stats Grid */}
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
                      <StatBox label="Career Goals" value={enrichedPlayer.careerGoals} />
                      <StatBox label="Career Assists" value={enrichedPlayer.careerAssists} />
                      <StatBox label="Int'l Caps" value={enrichedPlayer.internationalAppearances} />
                      <StatBox label="Int'l Goals" value={enrichedPlayer.internationalGoals} />
                    </div>

                    {/* Career Overview (Expandable) */}
                    <div>
                      <button
                        onClick={() => setExpandedPlayer(isExpanded ? null : player.name)}
                        className="text-left w-full"
                      >
                        <div className="flex items-center justify-between text-gray-700 hover:text-blue-600 transition">
                          <h3 className="text-lg font-semibold flex items-center gap-2">
                            <span>📋</span> Career Overview
                          </h3>
                          <span>{isExpanded ? '▲' : '▼'}</span>
                        </div>
                      </button>
                      
                      {isExpanded && (
                        <div className="mt-3 space-y-4">
                          {/* Career Summary */}
                          <div className="bg-gray-50 rounded-lg p-5 border border-gray-200">
                            <p className="text-gray-700 leading-relaxed">{enrichedPlayer.careerSummary || 'No career summary available.'}</p>
                          </div>
                          
                          {/* Career Timeline */}
                          {enrichedPlayer.careerTimeline && enrichedPlayer.careerTimeline.length > 0 && (
                            <div className="bg-blue-50 rounded-lg p-5 border border-blue-200">
                              <h4 className="font-semibold text-gray-800 mb-3 flex items-center gap-2">
                                <span>📅</span> Career Timeline
                              </h4>
                              <div className="space-y-3">
                                {enrichedPlayer.careerTimeline.map((period, i) => (
                                  <div key={i} className="flex flex-wrap items-center justify-between bg-white bg-opacity-50 p-3 rounded-lg">
                                    <div className="flex items-center gap-2">
                                      <span className="font-medium text-gray-800">{period.team}</span>
                                      <span className="text-sm text-gray-500">{period.years}</span>
                                    </div>
                                    <div className="flex gap-3 text-sm">
                                      {period.appearances && (
                                        <span className="text-blue-600">{period.appearances} apps</span>
                                      )}
                                      {period.goals && (
                                        <span className="text-green-600">{period.goals} goals</span>
                                      )}
                                    </div>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}
                          
                          {/* Latest Transfer */}
                          {enrichedPlayer.latestTransfer && (
                            <div className="bg-purple-50 rounded-lg p-5 border border-purple-200">
                              <h4 className="font-semibold text-gray-800 mb-3 flex items-center gap-2">
                                <span>🔄</span> Latest Transfer
                              </h4>
                              <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
                                <div>
                                  <span className="text-xs text-gray-500 block">From</span>
                                  <span className="font-medium text-gray-800">{enrichedPlayer.latestTransfer.fromTeam}</span>
                                </div>
                                <div>
                                  <span className="text-xs text-gray-500 block">To</span>
                                  <span className="font-medium text-gray-800">{enrichedPlayer.latestTransfer.toTeam}</span>
                                </div>
                                <div>
                                  <span className="text-xs text-gray-500 block">Date</span>
                                  <span className="font-medium text-gray-800">{enrichedPlayer.latestTransfer.date}</span>
                                </div>
                                <div>
                                  <span className="text-xs text-gray-500 block">Fee</span>
                                  <span className="font-bold text-green-600">{enrichedPlayer.latestTransfer.fee}</span>
                                </div>
                              </div>
                            </div>
                          )}
                          
                          {/* Achievements */}
                          {enrichedPlayer.majorAchievements && enrichedPlayer.majorAchievements.length > 0 && (
                            <div className="bg-yellow-50 rounded-lg p-5 border border-yellow-200">
                              <h4 className="font-semibold text-gray-800 mb-3 flex items-center gap-2">
                                <span>🏆</span> Major Achievements
                              </h4>
                              <div className="space-y-2">
                                {enrichedPlayer.majorAchievements.map((achievement, i) => (
                                  <div key={i} className="flex items-start gap-2">
                                    <span className="text-yellow-600">✓</span>
                                    <span className="text-gray-700">{achievement}</span>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* Data Source */}
                {enrichedPlayer._source && (
                  <div className="mt-4 pt-4 border-t border-gray-100 text-xs text-gray-400">
                    Source: {enrichedPlayer._source} • Last verified: {enrichedPlayer._lastVerified ? new Date(enrichedPlayer._lastVerified).toLocaleDateString() : 'N/A'}
                    {enrichedPlayer._era && ` • Era: ${enrichedPlayer._era}`}
                  </div>
                )}
              </div>
            </div>
          );
        })
      ) : (
        // No Players Found
        <div className="text-center py-16 bg-gradient-to-br from-gray-50 to-blue-50 rounded-2xl border border-gray-200">
          <h3 className="text-2xl font-medium text-gray-700 mb-3">No player found for "{searchTerm}"</h3>
          <p className="text-gray-500 max-w-md mx-auto">
            Try searching for a different player name.
          </p>
        </div>
      )}

      {/* YouTube Highlights Section */}
      {youtubeVideos.length > 0 && (
        <div className="bg-white rounded-2xl shadow-xl overflow-hidden border border-gray-100">
          <div className="p-6 sm:p-8">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-4">
              <div>
                <h3 className="text-2xl font-bold text-gray-800 flex items-center">
                  <span className="mr-3">📺</span> Video Highlights
                </h3>
                {safeYoutubeQuery && (
                  <p className="text-gray-600 mt-1">
                    Search: <span className="font-medium">"{safeYoutubeQuery}"</span>
                  </p>
                )}
              </div>
            </div>

            {videoError ? (
              <div className="bg-red-50 border border-red-200 rounded-lg p-6 text-center">
                <p className="text-red-800">{videoError}</p>
              </div>
            ) : loadingVideos ? (
              <div className="flex justify-center items-center h-48">
                <div className="text-center">
                  <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
                  <p className="mt-4 text-gray-600">Searching for highlights...</p>
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {youtubeVideos.slice(0, 6).map((video) => (
                  <div key={video.id} className="border border-gray-200 rounded-xl overflow-hidden hover:shadow-lg transition">
                    <a 
                      href={`https://www.youtube.com/watch?v=${video.id}`} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="block"
                    >
                      <div className="aspect-video relative overflow-hidden bg-gray-100">
                        <img 
                          src={video.thumbnail} 
                          alt={video.title}
                          className="w-full h-full object-cover hover:scale-105 transition duration-300"
                          loading="lazy"
                        />
                        <div className="absolute top-2 right-2 bg-red-600 text-white text-xs px-2 py-1 rounded">
                          YouTube
                        </div>
                      </div>
                      <div className="p-4">
                        <h4 className="font-semibold text-gray-800 line-clamp-2 mb-2 text-sm">
                          {video.title}
                        </h4>
                        <div className="flex justify-between items-center text-xs text-gray-500">
                          <span className="truncate mr-2">{video.channelTitle}</span>
                          <span className="flex-shrink-0">▶️ Play</span>
                        </div>
                      </div>
                    </a>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}