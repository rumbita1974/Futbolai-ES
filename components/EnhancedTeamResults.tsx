// components/EnhancedTeamResults.tsx
'use client';

import { useState, useEffect } from 'react';
import { searchYouTubeHighlights, YouTubeVideo } from '@/services/youtubeService';
import { Team, Player, needsDataVerification, getDataSourceInfo } from '@/services/groqService';
import { getDataCurrencyBadge } from '@/services/dataEnhancerService';

interface EnhancedTeamResultsProps {
  teams: Team[];
  players: Player[];
  youtubeQuery: string;
  searchTerm: string;
  getTeamFlagUrl: (teamName: string, teamType: string, country?: string) => string;
}

export default function EnhancedTeamResults({
  teams,
  players,
  youtubeQuery,
  searchTerm,
  getTeamFlagUrl
}: EnhancedTeamResultsProps) {
  const [youtubeVideos, setYoutubeVideos] = useState<YouTubeVideo[]>([]);
  const [loadingVideos, setLoadingVideos] = useState(false);
  const [videoError, setVideoError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'overview' | 'squad' | 'achievements' | 'history' | 'videos'>('overview');

  // Get data from metadata if available
  const team = teams[0];
  const teamMetadata = team?._dataCurrency;

  // Fetch YouTube videos when component mounts or query changes
  useEffect(() => {
    const fetchVideos = async () => {
      if (!youtubeQuery) return;

      setLoadingVideos(true);
      setVideoError(null);

      const apiKey = process.env.NEXT_PUBLIC_YOUTUBE_API_KEY;
      const result = await searchYouTubeHighlights(youtubeQuery, apiKey || '');

      if (result.error) {
        setVideoError(result.error);
      } else {
        setYoutubeVideos(result.videos);
      }

      setLoadingVideos(false);
    };

    fetchVideos();
  }, [youtubeQuery]);

  // Helper component for player cards in squad tab
  const PlayerCard = ({ player, index }: { player: Player; index: number }) => (
    <div className="bg-gradient-to-br from-gray-900 to-gray-800 border border-gray-700 rounded-xl p-4 hover:border-blue-500/50 transition-all hover:-translate-y-1">
      <div className="flex items-start gap-4">
        {/* Player photo placeholder (Wikipedia would go here) */}
        <div className="flex-shrink-0">
          <div className="w-16 h-16 rounded-lg bg-gradient-to-br from-gray-800 to-gray-900 border border-gray-700 flex items-center justify-center">
            <span className="text-2xl">👤</span>
          </div>
        </div>
        
        {/* Player info */}
        <div className="flex-1">
          <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-2 mb-2">
            <h4 className="font-bold text-white text-lg">{player.name}</h4>
            <span className="px-2 py-1 bg-blue-900/50 text-blue-300 text-xs rounded-full">
              #{index + 1}
            </span>
          </div>
          
          <div className="grid grid-cols-2 gap-2 text-sm">
            <div>
              <div className="text-gray-400 text-xs">Position</div>
              <div className="text-white font-medium">{player.position}</div>
            </div>
            <div>
              <div className="text-gray-400 text-xs">Age</div>
              <div className="text-white font-medium">{player.age || 'N/A'}</div>
            </div>
            <div>
              <div className="text-gray-400 text-xs">Nationality</div>
              <div className="text-white font-medium">{player.nationality}</div>
            </div>
            <div>
              <div className="text-gray-400 text-xs">Goals</div>
              <div className="text-white font-medium">{player.careerGoals || 'N/A'}</div>
            </div>
          </div>
          
          {player.currentTeam && (
            <div className="mt-3 pt-3 border-t border-gray-700">
              <div className="text-gray-400 text-xs">Current Club</div>
              <div className="text-white font-medium text-sm">{player.currentTeam}</div>
            </div>
          )}
        </div>
      </div>
    </div>
  );

  // Helper component for achievement items
  const AchievementItem = ({ achievement, index }: { achievement: string; index: number }) => (
    <div className="flex items-start gap-3 p-3 bg-gradient-to-r from-gray-900 to-gray-800 border border-gray-700 rounded-lg hover:border-yellow-500/50 transition">
      <div className="flex-shrink-0 pt-1">
        <span className="text-yellow-500">🏆</span>
      </div>
      <div className="flex-1">
        <p className="text-white text-sm">{achievement}</p>
      </div>
    </div>
  );

  // Helper component for historical player cards
  const HistoricalPlayerCard = ({ player, era }: { player: string; era: string }) => (
    <div className="bg-gradient-to-br from-gray-900 to-gray-800 border border-gray-700 rounded-xl p-4 hover:border-purple-500/50 transition">
      <div className="flex items-center gap-3 mb-3">
        <div className="w-12 h-12 rounded-full bg-gradient-to-br from-purple-900 to-purple-800 flex items-center justify-center">
          <span className="text-xl">⭐</span>
        </div>
        <div>
          <h4 className="font-bold text-white">{player}</h4>
          <p className="text-gray-400 text-sm">{era}</p>
        </div>
      </div>
      <div className="text-xs text-gray-300 line-clamp-2">
        Legendary player who made significant contributions to the team's history.
      </div>
    </div>
  );

  // Format date for YouTube videos
  const formatDate = (dateString: string) => {
    try {
      const date = new Date(dateString);
      const now = new Date();
      const diffTime = Math.abs(now.getTime() - date.getTime());
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

      if (diffDays <= 7) {
        return `${diffDays} day${diffDays !== 1 ? 's' : ''} ago`;
      } else if (diffDays <= 30) {
        const weeks = Math.floor(diffDays / 7);
        return `${weeks} week${weeks !== 1 ? 's' : ''} ago`;
      } else {
        return date.toLocaleDateString('en-US', {
          year: 'numeric',
          month: 'short',
          day: 'numeric'
        });
      }
    } catch (e) {
      return dateString;
    }
  };

  if (teams.length === 0) {
    return (
      <div className="max-w-3xl mx-auto bg-gray-900/40 border border-gray-800 rounded-2xl p-8 text-center">
        <div className="text-5xl mb-4">🏟️</div>
        <h3 className="text-xl font-bold text-gray-200 mb-3">No Team Found</h3>
        <p className="text-gray-400">
          No detailed team information found for "{searchTerm}". Try searching for a specific club or national team.
        </p>
      </div>
    );
  }

  // Format achievements
  const allAchievements = [
    ...(team.majorAchievements?.worldCup || []),
    ...(team.majorAchievements?.continental || []),
    ...(team.majorAchievements?.domestic || [])
  ];

  // Calculate team type display
  const teamTypeDisplay = team.type === 'national' ? 'National Team' : 'Football Club';
  const teamColor = team.type === 'national' ? 'from-blue-500 to-green-500' : 'from-purple-500 to-pink-500';

  // Historical players data (would normally come from API)
  const historicalPlayers = [
    { name: "Team Legend 1", era: "1990s-2000s" },
    { name: "Team Legend 2", era: "2000s-2010s" },
    { name: "Team Legend 3", era: "2010s-2020s" },
    { name: "Team Legend 4", era: "Golden Era" },
    { name: "Team Legend 5", era: "Record Holder" },
    { name: "Team Legend 6", era: "Fan Favorite" }
  ];

  // Most successful squad (would normally come from API)
  const successfulSquad = {
    era: "Golden Generation",
    years: "2010-2020",
    achievements: ["Multiple League Titles", "Champions League Winner", "Historic Treble"],
    keyPlayers: ["Star Player 1", "Star Player 2", "Star Player 3", "Star Player 4"]
  };

  return (
    <div className="max-w-6xl mx-auto space-y-8 animate-fadeIn">
      {/* Team Header */}
      <div className="bg-gradient-to-r from-gray-900 to-gray-800 rounded-2xl border border-gray-700 p-6 md:p-8">
        <div className="flex flex-col md:flex-row items-start md:items-center gap-6">
          {/* Team Flag/Crest */}
          <div className="flex-shrink-0">
            <div className="w-24 h-24 md:w-32 md:h-32 rounded-xl bg-gradient-to-br from-gray-800 to-gray-900 border-2 border-gray-700 flex items-center justify-center p-2">
              <img
                src={getTeamFlagUrl(team.name, team.type, team.country)}
                alt={`${team.name} flag`}
                className="w-full h-full object-contain"
                onError={(e) => {
                  e.currentTarget.src = 'https://img.icons8.com/color/96/soccer-ball--v1.png';
                }}
              />
            </div>
          </div>

          {/* Team Info */}
          <div className="flex-1">
            <div className="flex flex-wrap items-center gap-3 mb-4">
              <h2 className="text-3xl md:text-4xl font-bold text-white">
                {team.name}
              </h2>
              <span className={`px-3 py-1 rounded-full text-sm font-medium bg-gradient-to-r ${teamColor} text-white`}>
                {teamTypeDisplay}
              </span>
              {team.country && team.type === 'club' && (
                <span className="px-3 py-1 rounded-full text-sm font-medium bg-gray-800 text-gray-300">
                  {team.country}
                </span>
              )}
            </div>

            {/* Basic Info */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
              {team.currentCoach && (
                <div className="bg-gray-800/50 rounded-lg p-3">
                  <div className="text-xs text-gray-400 mb-1">Current Manager</div>
                  <div className="font-medium text-white">{team.currentCoach}</div>
                </div>
              )}
              
              {team.foundedYear && (
                <div className="bg-gray-800/50 rounded-lg p-3">
                  <div className="text-xs text-gray-400 mb-1">Founded</div>
                  <div className="font-medium text-white">{team.foundedYear}</div>
                  <div className="text-xs text-gray-500">
                    ({new Date().getFullYear() - team.foundedYear} years)
                  </div>
                </div>
              )}
              
              {team.stadium && (
                <div className="bg-gray-800/50 rounded-lg p-3">
                  <div className="text-xs text-gray-400 mb-1">Stadium</div>
                  <div className="font-medium text-white">{team.stadium}</div>
                </div>
              )}
              
              <div className="bg-gray-800/50 rounded-lg p-3">
                <div className="text-xs text-gray-400 mb-1">Total Achievements</div>
                <div className="font-medium text-green-400">{allAchievements.length}+ Trophies</div>
              </div>
            </div>

            {/* Quick Stats */}
            <div className="flex flex-wrap gap-2">
              <div className="px-3 py-1.5 bg-blue-900/30 text-blue-300 rounded-full text-sm border border-blue-700/30">
                {allAchievements.length}+ Achievements
              </div>
              {team.type === 'national' && team.country && (
                <div className="px-3 py-1.5 bg-green-900/30 text-green-300 rounded-full text-sm border border-green-700/30">
                  {team.country}
                </div>
              )}
              <div className="px-3 py-1.5 bg-purple-900/30 text-purple-300 rounded-full text-sm border border-purple-700/30">
                {players.length > 0 ? `${players.length} Players` : 'Full Squad'}
              </div>
              <div className="px-3 py-1.5 bg-yellow-900/30 text-yellow-300 rounded-full text-sm border border-yellow-700/30">
                AI Analysis
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="sticky top-4 z-10 bg-gray-900/95 backdrop-blur-md border border-gray-800 rounded-xl p-1">
        <div className="flex flex-wrap gap-1">
          <button
            onClick={() => setActiveTab('overview')}
            className={`px-4 py-2 rounded-lg font-medium transition flex-1 min-w-[120px] text-center ${activeTab === 'overview' ? 'bg-gradient-to-r from-blue-600 to-green-500 text-white' : 'bg-gray-800 text-gray-300 hover:bg-gray-700'}`}
          >
            📋 Overview
          </button>
          <button
            onClick={() => setActiveTab('squad')}
            className={`px-4 py-2 rounded-lg font-medium transition flex-1 min-w-[120px] text-center ${activeTab === 'squad' ? 'bg-gradient-to-r from-blue-600 to-green-500 text-white' : 'bg-gray-800 text-gray-300 hover:bg-gray-700'}`}
          >
            👥 Current Squad
          </button>
          <button
            onClick={() => setActiveTab('achievements')}
            className={`px-4 py-2 rounded-lg font-medium transition flex-1 min-w-[120px] text-center ${activeTab === 'achievements' ? 'bg-gradient-to-r from-blue-600 to-green-500 text-white' : 'bg-gray-800 text-gray-300 hover:bg-gray-700'}`}
          >
            🏆 Achievements
          </button>
          <button
            onClick={() => setActiveTab('history')}
            className={`px-4 py-2 rounded-lg font-medium transition flex-1 min-w-[120px] text-center ${activeTab === 'history' ? 'bg-gradient-to-r from-blue-600 to-green-500 text-white' : 'bg-gray-800 text-gray-300 hover:bg-gray-700'}`}
          >
            📜 History
          </button>
          <button
            onClick={() => setActiveTab('videos')}
            className={`px-4 py-2 rounded-lg font-medium transition flex-1 min-w-[120px] text-center ${activeTab === 'videos' ? 'bg-gradient-to-r from-blue-600 to-green-500 text-white' : 'bg-gray-800 text-gray-300 hover:bg-gray-700'}`}
          >
            🎥 Highlights
          </button>
        </div>
      </div>

      {/* Tab Content */}
      <div className="bg-gradient-to-br from-gray-900 to-gray-800 rounded-2xl border border-gray-700 p-6 md:p-8">
        {/* Overview Tab */}
        {activeTab === 'overview' && (
          <div className="space-y-8">
            {/* Team Summary */}
            <div>
              <h3 className="text-2xl font-bold text-white mb-4 flex items-center">
                <span className="mr-3">📊</span> Team Overview
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="bg-gray-800/50 rounded-xl p-6">
                  <h4 className="text-lg font-semibold text-white mb-3">Team Profile</h4>
                  <div className="space-y-3">
                    <div className="flex justify-between">
                      <span className="text-gray-400">Team Type:</span>
                      <span className="text-white font-medium">{teamTypeDisplay}</span>
                    </div>
                    {team.country && (
                      <div className="flex justify-between">
                        <span className="text-gray-400">Country:</span>
                        <span className="text-white font-medium">{team.country}</span>
                      </div>
                    )}
                    {team.foundedYear && (
                      <div className="flex justify-between">
                        <span className="text-gray-400">Founded:</span>
                        <span className="text-white font-medium">{team.foundedYear} ({new Date().getFullYear() - team.foundedYear} years)</span>
                      </div>
                    )}
                    {team.currentCoach && (
                      <div className="flex justify-between">
                        <span className="text-gray-400">Current Manager:</span>
                        <span className="text-white font-medium">{team.currentCoach}</span>
                      </div>
                    )}
                    {team.stadium && (
                      <div className="flex justify-between">
                        <span className="text-gray-400">Home Stadium:</span>
                        <span className="text-white font-medium">{team.stadium}</span>
                      </div>
                    )}
                  </div>
                </div>

                <div className="bg-gray-800/50 rounded-xl p-6">
                  <h4 className="text-lg font-semibold text-white mb-3">Achievements Summary</h4>
                  <div className="space-y-4">
                    <div>
                      <div className="flex justify-between mb-1">
                        <span className="text-gray-400">World Cup Titles:</span>
                        <span className="text-yellow-400 font-medium">{team.majorAchievements.worldCup?.length || 0}</span>
                      </div>
                      <div className="w-full bg-gray-700 rounded-full h-2">
                        <div 
                          className="bg-yellow-500 h-2 rounded-full" 
                          style={{ width: `${Math.min(100, (team.majorAchievements.worldCup?.length || 0) * 20)}%` }}
                        ></div>
                      </div>
                    </div>
                    <div>
                      <div className="flex justify-between mb-1">
                        <span className="text-gray-400">Continental Titles:</span>
                        <span className="text-blue-400 font-medium">{team.majorAchievements.continental?.length || 0}</span>
                      </div>
                      <div className="w-full bg-gray-700 rounded-full h-2">
                        <div 
                          className="bg-blue-500 h-2 rounded-full" 
                          style={{ width: `${Math.min(100, (team.majorAchievements.continental?.length || 0) * 10)}%` }}
                        ></div>
                      </div>
                    </div>
                    <div>
                      <div className="flex justify-between mb-1">
                        <span className="text-gray-400">Domestic Titles:</span>
                        <span className="text-green-400 font-medium">{team.majorAchievements.domestic?.length || 0}</span>
                      </div>
                      <div className="w-full bg-gray-700 rounded-full h-2">
                        <div 
                          className="bg-green-500 h-2 rounded-full" 
                          style={{ width: `${Math.min(100, (team.majorAchievements.domestic?.length || 0) * 5)}%` }}
                        ></div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Team Data Source */}
            {teamMetadata && (
              <div className="bg-gradient-to-r from-purple-900/20 to-blue-900/20 border border-purple-700/30 rounded-xl p-6">
                <h4 className="text-lg font-semibold text-white mb-3 flex items-center">
                  <span className="mr-2">🤖</span> AI Analysis Information
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="text-gray-400">Data Source:</span>
                    <span className="ml-2 text-white font-medium">
                      {teamMetadata.verification?.source || 'GROQ AI + Wikipedia'}
                    </span>
                  </div>
                  <div>
                    <span className="text-gray-400">Confidence Level:</span>
                    <span className={`ml-2 font-medium ${
                      teamMetadata.verification?.confidence === 'high' ? 'text-green-400' :
                      teamMetadata.verification?.confidence === 'medium' ? 'text-yellow-400' :
                      'text-red-400'
                    }`}>
                      {teamMetadata.verification?.confidence?.toUpperCase() || 'MEDIUM'}
                    </span>
                  </div>
                  <div>
                    <span className="text-gray-400">Last Updated:</span>
                    <span className="ml-2 text-white font-medium">
                      {teamMetadata.lastTrained ? new Date(teamMetadata.lastTrained).toLocaleDateString() : '2024'}
                    </span>
                  </div>
                  <div>
                    <span className="text-gray-400">Current Season:</span>
                    <span className="ml-2 text-white font-medium">
                      {teamMetadata.currentSeason || '2024/2025'}
                    </span>
                  </div>
                </div>
                {teamMetadata.disclaimer && (
                  <p className="text-gray-400 text-sm mt-4 italic">{teamMetadata.disclaimer}</p>
                )}
              </div>
            )}
          </div>
        )}

        {/* Squad Tab */}
        {activeTab === 'squad' && (
          <div className="space-y-8">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6">
              <div>
                <h3 className="text-2xl font-bold text-white mb-2">Current Squad</h3>
                <p className="text-gray-400">
                  {players.length > 0 
                    ? `Showing ${players.length} key players for ${team.name}`
                    : 'Squad information will be displayed here'}
                </p>
              </div>
              <div className="flex items-center gap-3">
                <button className="px-4 py-2 bg-gray-800 text-gray-300 rounded-lg hover:bg-gray-700 text-sm">
                  Filter by Position
                </button>
                <button className="px-4 py-2 bg-gradient-to-r from-blue-600 to-green-500 text-white rounded-lg hover:opacity-90 text-sm">
                  View Full Roster
                </button>
              </div>
            </div>

            {players.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {players.map((player, index) => (
                  <PlayerCard key={index} player={player} index={index} />
                ))}
              </div>
            ) : (
              <div className="text-center py-12 bg-gray-800/30 rounded-xl">
                <div className="text-5xl mb-4">👥</div>
                <h4 className="text-xl font-semibold text-white mb-2">Squad Data Loading</h4>
                <p className="text-gray-400 max-w-md mx-auto">
                  Detailed squad information is being fetched. This includes player photos, statistics, and current club details.
                </p>
                <div className="mt-6 flex justify-center">
                  <div className="animate-pulse flex space-x-2">
                    <div className="w-3 h-3 bg-blue-500 rounded-full"></div>
                    <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                    <div className="w-3 h-3 bg-purple-500 rounded-full"></div>
                  </div>
                </div>
              </div>
            )}

            {/* Squad Statistics */}
            {players.length > 0 && (
              <div className="mt-8 pt-8 border-t border-gray-700">
                <h4 className="text-xl font-bold text-white mb-6">Squad Statistics</h4>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="bg-gray-800/50 rounded-xl p-4 text-center">
                    <div className="text-2xl font-bold text-blue-400">
                      {players.reduce((avg, p) => avg + (p.age || 0), 0) / players.length || 0 | 0}
                    </div>
                    <div className="text-gray-400 text-sm mt-1">Average Age</div>
                  </div>
                  <div className="bg-gray-800/50 rounded-xl p-4 text-center">
                    <div className="text-2xl font-bold text-green-400">
                      {players.filter(p => p.position?.toLowerCase().includes('forward')).length}
                    </div>
                    <div className="text-gray-400 text-sm mt-1">Forwards</div>
                  </div>
                  <div className="bg-gray-800/50 rounded-xl p-4 text-center">
                    <div className="text-2xl font-bold text-yellow-400">
                      {players.filter(p => p.position?.toLowerCase().includes('midfielder')).length}
                    </div>
                    <div className="text-gray-400 text-sm mt-1">Midfielders</div>
                  </div>
                  <div className="bg-gray-800/50 rounded-xl p-4 text-center">
                    <div className="text-2xl font-bold text-red-400">
                      {players.filter(p => p.position?.toLowerCase().includes('defender') || p.position?.toLowerCase().includes('goalkeeper')).length}
                    </div>
                    <div className="text-gray-400 text-sm mt-1">Defenders + GK</div>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Achievements Tab */}
        {activeTab === 'achievements' && (
          <div className="space-y-8">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6">
              <div>
                <h3 className="text-2xl font-bold text-white mb-2">Team Achievements</h3>
                <p className="text-gray-400">
                  Complete trophy history and major accomplishments
                </p>
              </div>
              <div className="flex items-center gap-2">
                <span className="px-3 py-1 bg-yellow-900/30 text-yellow-300 rounded-full text-sm">
                  {team.majorAchievements.worldCup?.length || 0} World Cup
                </span>
                <span className="px-3 py-1 bg-blue-900/30 text-blue-300 rounded-full text-sm">
                  {team.majorAchievements.continental?.length || 0} Continental
                </span>
                <span className="px-3 py-1 bg-green-900/30 text-green-300 rounded-full text-sm">
                  {team.majorAchievements.domestic?.length || 0} Domestic
                </span>
              </div>
            </div>

            {/* Achievement Categories */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* World Cup Achievements */}
              <div className="bg-gradient-to-br from-yellow-900/20 to-gray-900 border border-yellow-700/30 rounded-xl p-6">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-12 h-12 rounded-full bg-gradient-to-br from-yellow-900 to-yellow-800 flex items-center justify-center">
                    <span className="text-2xl">🌍</span>
                  </div>
                  <div>
                    <h4 className="text-lg font-bold text-white">World Cup</h4>
                    <p className="text-yellow-300 text-sm">{team.majorAchievements.worldCup?.length || 0} titles</p>
                  </div>
                </div>
                {team.majorAchievements.worldCup?.length > 0 ? (
                  <div className="space-y-3">
                    {team.majorAchievements.worldCup.map((achievement, index) => (
                      <AchievementItem key={index} achievement={achievement} index={index} />
                    ))}
                  </div>
                ) : (
                  <p className="text-gray-400 text-sm italic">No World Cup achievements</p>
                )}
              </div>

              {/* Continental Achievements */}
              <div className="bg-gradient-to-br from-blue-900/20 to-gray-900 border border-blue-700/30 rounded-xl p-6">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-12 h-12 rounded-full bg-gradient-to-br from-blue-900 to-blue-800 flex items-center justify-center">
                    <span className="text-2xl">🗺️</span>
                  </div>
                  <div>
                    <h4 className="text-lg font-bold text-white">Continental</h4>
                    <p className="text-blue-300 text-sm">{team.majorAchievements.continental?.length || 0} titles</p>
                  </div>
                </div>
                {team.majorAchievements.continental?.length > 0 ? (
                  <div className="space-y-3">
                    {team.majorAchievements.continental.map((achievement, index) => (
                      <AchievementItem key={index} achievement={achievement} index={index} />
                    ))}
                  </div>
                ) : (
                  <p className="text-gray-400 text-sm italic">No continental achievements</p>
                )}
              </div>

              {/* Domestic Achievements */}
              <div className="bg-gradient-to-br from-green-900/20 to-gray-900 border border-green-700/30 rounded-xl p-6">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-12 h-12 rounded-full bg-gradient-to-br from-green-900 to-green-800 flex items-center justify-center">
                    <span className="text-2xl">🏠</span>
                  </div>
                  <div>
                    <h4 className="text-lg font-bold text-white">Domestic</h4>
                    <p className="text-green-300 text-sm">{team.majorAchievements.domestic?.length || 0} titles</p>
                  </div>
                </div>
                {team.majorAchievements.domestic?.length > 0 ? (
                  <div className="space-y-3">
                    {team.majorAchievements.domestic.map((achievement, index) => (
                      <AchievementItem key={index} achievement={achievement} index={index} />
                    ))}
                  </div>
                ) : (
                  <p className="text-gray-400 text-sm italic">No domestic achievements</p>
                )}
              </div>
            </div>
          </div>
        )}

        {/* History Tab */}
        {activeTab === 'history' && (
          <div className="space-y-8">
            <div>
              <h3 className="text-2xl font-bold text-white mb-4">Historical Legacy</h3>
              <p className="text-gray-400 mb-8">
                Explore the legendary players and most successful eras in {team.name}'s history
              </p>
            </div>

            {/* Most Successful Squad */}
            <div className="bg-gradient-to-r from-purple-900/20 to-gray-900 border border-purple-700/30 rounded-xl p-6 mb-8">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-14 h-14 rounded-full bg-gradient-to-br from-purple-900 to-purple-800 flex items-center justify-center">
                  <span className="text-3xl">👑</span>
                </div>
                <div>
                  <h4 className="text-xl font-bold text-white">Most Successful Squad</h4>
                  <p className="text-purple-300">{successfulSquad.era} ({successfulSquad.years})</p>
                </div>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <h5 className="text-lg font-semibold text-white mb-3">Key Achievements</h5>
                  <div className="space-y-2">
                    {successfulSquad.achievements.map((achievement, index) => (
                      <div key={index} className="flex items-start gap-2">
                        <span className="text-purple-400 mt-1">✓</span>
                        <span className="text-gray-300">{achievement}</span>
                      </div>
                    ))}
                  </div>
                </div>
                
                <div>
                  <h5 className="text-lg font-semibold text-white mb-3">Legendary Players</h5>
                  <div className="grid grid-cols-2 gap-3">
                    {successfulSquad.keyPlayers.map((player, index) => (
                      <div key={index} className="bg-gray-800/50 rounded-lg p-3 text-center">
                        <div className="text-white font-medium">{player}</div>
                        <div className="text-gray-400 text-xs mt-1">Icon</div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            {/* Historical Players */}
            <div>
              <h4 className="text-xl font-bold text-white mb-6">Historical Players</h4>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {historicalPlayers.map((player, index) => (
                  <HistoricalPlayerCard key={index} player={player.name} era={player.era} />
                ))}
              </div>
            </div>

            {/* Timeline Placeholder */}
            <div className="mt-8 pt-8 border-t border-gray-700">
              <h4 className="text-xl font-bold text-white mb-6">Team Timeline</h4>
              <div className="relative">
                <div className="absolute left-4 top-0 bottom-0 w-0.5 bg-gradient-to-b from-blue-500 to-green-500"></div>
                {[
                  { year: team.foundedYear || '1900', event: 'Team Founded' },
                  { year: '1950', event: 'First Major Trophy' },
                  { year: '1980', event: 'Golden Era Begins' },
                  { year: '2000', event: 'Modern Success' },
                  { year: '2024', event: 'Current Season' }
                ].map((item, index) => (
                  <div key={index} className="relative pl-12 pb-8 last:pb-0">
                    <div className="absolute left-0 w-8 h-8 rounded-full bg-gradient-to-r from-blue-600 to-green-500 flex items-center justify-center">
                      <span className="text-white text-sm">{index + 1}</span>
                    </div>
                    <div className="bg-gray-800/50 rounded-lg p-4">
                      <div className="text-blue-400 font-bold">{item.year}</div>
                      <div className="text-white mt-1">{item.event}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Videos Tab */}
        {activeTab === 'videos' && (
          <div className="space-y-8">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6">
              <div>
                <h3 className="text-2xl font-bold text-white mb-2">Video Highlights</h3>
                <p className="text-gray-400">
                  {youtubeQuery ? `Search: "${youtubeQuery}"` : 'Team highlights and matches'}
                </p>
              </div>
              <div className="flex items-center">
                {loadingVideos ? (
                  <div className="flex items-center text-gray-400">
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-500 mr-2"></div>
                    Loading videos...
                  </div>
                ) : youtubeVideos.length > 0 && (
                  <span className="text-sm text-gray-400">
                    {youtubeVideos.length} video{youtubeVideos.length !== 1 ? 's' : ''} found
                  </span>
                )}
              </div>
            </div>

            {videoError ? (
              <div className="bg-red-900/20 border border-red-700/30 rounded-xl p-6 text-center">
                <p className="text-red-300">{videoError}</p>
                <p className="text-red-400 text-sm mt-2">
                  Make sure you have added <code className="bg-red-900/50 px-2 py-1 rounded">NEXT_PUBLIC_YOUTUBE_API_KEY</code> to your .env.local file
                </p>
              </div>
            ) : loadingVideos ? (
              <div className="flex justify-center items-center h-48">
                <div className="text-center">
                  <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto"></div>
                  <p className="mt-4 text-gray-400">Searching for highlights...</p>
                </div>
              </div>
            ) : youtubeVideos.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {youtubeVideos.map((video) => (
                  <div key={video.id} className="border border-gray-700 rounded-xl overflow-hidden hover:border-blue-500/50 transition">
                    <a
                      href={`https://www.youtube.com/watch?v=${video.id}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="block"
                    >
                      <div className="aspect-video relative overflow-hidden bg-gray-900">
                        <img
                          src={video.thumbnail}
                          alt={video.title}
                          className="w-full h-full object-cover hover:scale-105 transition duration-300"
                          onError={(e) => {
                            (e.target as HTMLImageElement).src = 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" width="100" height="100" viewBox="0 0 100 100"><rect width="100" height="100" fill="%231f2937"/><text x="50" y="50" font-family="Arial" font-size="14" fill="%239ca3af" text-anchor="middle" dy=".3em">Video</text></svg>';
                          }}
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-black/70 to-transparent"></div>
                        <div className="absolute top-3 right-3 bg-red-600 text-white text-xs px-2 py-1 rounded">
                          YouTube
                        </div>
                        <div className="absolute bottom-3 left-3 text-white text-xs bg-black/70 px-2 py-1 rounded">
                          {formatDate(video.publishedAt)}
                        </div>
                      </div>
                      <div className="p-4 bg-gray-900/50">
                        <h4 className="font-semibold text-white line-clamp-2 mb-2 text-sm">
                          {video.title}
                        </h4>
                        <div className="flex justify-between items-center text-xs text-gray-400">
                          <span className="truncate mr-2">{video.channelTitle}</span>
                          <span className="flex-shrink-0">▶️ Play</span>
                        </div>
                      </div>
                    </a>
                  </div>
                ))}
              </div>
            ) : youtubeQuery ? (
              <div className="text-center py-12 bg-gray-800/30 rounded-xl">
                <div className="text-gray-500 mb-4 text-5xl">
                  🎥
                </div>
                <p className="text-gray-300">No videos found for this search.</p>
                <p className="text-gray-500 text-sm mt-2">Try a different search term or check your YouTube API key.</p>
              </div>
            ) : (
              <div className="text-center py-12 bg-gray-800/30 rounded-xl">
                <div className="text-gray-500 mb-4 text-5xl">
                  📹
                </div>
                <p className="text-gray-300">Search for a team to see video highlights</p>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Data Source Footer */}
      <div className="text-center text-gray-500 text-sm pt-8 border-t border-gray-800">
        <p>
          ⚽ Team analysis powered by GROQ AI and Wikipedia • Data updated for 2024-2025 season
        </p>
        <p className="text-gray-400 text-xs mt-2">
          Note: Player photos and detailed squad information would be fetched from Wikipedia API in production
        </p>
      </div>
    </div>
  );
}