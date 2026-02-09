'use client';

import { useState, useEffect } from 'react';
import { searchYouTubeHighlights, YouTubeVideo } from '@/services/youtubeService';
import { Player, Team } from '@/services/groqService';

interface EnhancedResultsProps {
  players: Player[];
  teams: Team[];
  youtubeQuery: string;
  searchTerm: string;
  _metadata?: any;
}

interface MajorAchievements {
  worldCup?: string[];
  international?: string[];
  continental?: string[];
  domestic?: string[];
  [key: string]: any;
}

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
  
  // Safely handle props
  const safePlayers = Array.isArray(players) ? players : [];
  const safeTeams = Array.isArray(teams) ? teams : [];
  const safeYoutubeQuery = youtubeQuery || `${searchTerm} football highlights 2025`;
  const safeMetadata = _metadata || {};

  // Fetch YouTube videos
  useEffect(() => {
    const fetchVideos = async () => {
      if (!safeYoutubeQuery) return;
      
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
  }, [safeYoutubeQuery]);

  // Helper component for stat boxes
  const StatBox = ({ label, value }: { label: string; value?: number }) => (
    <div className="bg-gradient-to-br from-gray-50 to-gray-100 p-4 rounded-xl text-center border border-gray-200 hover:shadow-md transition">
      <div className="text-2xl font-bold text-gray-800">{value !== undefined && value !== null ? value : '-'}</div>
      <div className="text-sm text-gray-600 mt-1">{label}</div>
    </div>
  );

  // Helper component for achievement sections
  const AchievementSection = ({ 
    title, 
    achievements, 
    color = 'blue'
  }: { 
    title: string; 
    achievements: string[];
    color?: 'blue' | 'green' | 'purple' | 'yellow' | 'orange' | 'red';
  }) => {
    const colorClasses = {
      blue: 'border-blue-200 bg-blue-50 hover:bg-blue-100',
      green: 'border-green-200 bg-green-50 hover:bg-green-100',
      purple: 'border-purple-200 bg-purple-50 hover:bg-purple-100',
      yellow: 'border-yellow-200 bg-yellow-50 hover:bg-yellow-100',
      orange: 'border-orange-200 bg-orange-50 hover:bg-orange-100',
      red: 'border-red-200 bg-red-50 hover:bg-red-100'
    };

    const colorIcons = {
      blue: '🔵',
      green: '🟢',
      purple: '🟣',
      yellow: '🟡',
      orange: '🟠',
      red: '🔴'
    };

    // Safely handle achievements array
    const achievementList = Array.isArray(achievements) ? achievements : [];
    
    // Don't show empty sections
    if (achievementList.length === 0) return null;

    return (
      <div className={`border rounded-lg p-4 ${colorClasses[color]} transition h-full`}>
        <h4 className="font-semibold text-gray-800 mb-3 flex items-center">
          <span className="mr-2">{colorIcons[color]}</span>
          {title}
        </h4>
        <ul className="space-y-2">
          {achievementList.map((achievement, idx) => (
            <li key={idx} className="text-sm text-gray-700 flex items-start">
              <span className="text-gray-400 mr-2">•</span>
              <span>{achievement}</span>
            </li>
          ))}
        </ul>
      </div>
    );
  };

  // Categorize achievements for display
  const categorizeAchievementsForDisplay = (achievements: MajorAchievements, isNationalTeam: boolean) => {
    if (!achievements) {
      return {
        worldCup: [],
        international: [],
        continental: [],
        domestic: []
      };
    }
    
    const result = { ...achievements };
    
    if (isNationalTeam) {
      // For national teams, ensure domestic is empty
      if (result.domestic) result.domestic = [];
      if (result.continental) result.continental = [];
    } else {
      // For club teams, ensure worldCup is empty
      if (result.worldCup) result.worldCup = [];
    }
    
    return result;
  };

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

  // Filter out players that are actually team names
  const isTeamSearch = searchTerm.length > 0 && 
    (searchTerm.toLowerCase().includes('fc') || 
     searchTerm.toLowerCase().includes('united') || 
     searchTerm.toLowerCase().includes('city') ||
     safeTeams.length > 0);
  
  const filteredPlayers = isTeamSearch 
    ? safePlayers.filter(p => 
        !p.name.toLowerCase().includes(searchTerm.toLowerCase()) &&
        p.name !== searchTerm
      )
    : safePlayers;

  return (
    <div className="space-y-8 mt-8 animate-fadeIn">
      {/* TEAM RESULTS */}
      {safeTeams.length > 0 && safeTeams.map((team, idx) => {
        // Safely extract achievements with defaults
        const achievements: MajorAchievements = team.majorAchievements || {};
        
        // Determine team type
        const isNationalTeam = team.type === 'national' || 
                               team.name.toLowerCase().includes('national') ||
                               (team.country && team.name === team.country);
        
        // Categorize achievements
        const categorizedAchievements = categorizeAchievementsForDisplay(achievements, isNationalTeam);
        
        return (
          <div key={idx} className="bg-white rounded-2xl shadow-xl overflow-hidden border border-gray-100">
            <div className="p-6 sm:p-8">
              {/* Team Header */}
              <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center mb-8">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-3">
                    <h2 className="text-2xl sm:text-3xl font-bold text-gray-900">{team.name}</h2>
                  </div>
                  <div className="flex flex-wrap items-center gap-2 mb-4">
                    <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                      isNationalTeam 
                        ? 'bg-red-100 text-red-700' 
                        : 'bg-blue-100 text-blue-700'
                    }`}>
                      {isNationalTeam ? 'National Team' : 'Football Club'}
                    </span>
                    <span className="px-3 py-1 bg-gray-100 text-gray-700 rounded-full text-sm font-medium">
                      {team.country || 'Unknown'}
                    </span>
                    {team.stadium && (
                      <span className="px-3 py-1 bg-green-100 text-green-700 rounded-full text-sm font-medium">
                        🏟️ {team.stadium}
                      </span>
                    )}
                    <span className="px-3 py-1 bg-purple-100 text-purple-700 rounded-full text-sm font-medium">
                      👨‍🏫 {team.currentCoach || 'Unknown'}
                    </span>
                    {team.foundedYear && (
                      <span className="px-3 py-1 bg-yellow-100 text-yellow-700 rounded-full text-sm font-medium">
                        📅 Founded: {team.foundedYear}
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {/* Achievements Grid */}
              <div className="mb-8">
                <h3 className="text-xl font-bold text-gray-800 mb-4 flex items-center">
                  <span className="mr-2">🏅</span> Trophy Cabinet
                </h3>
                
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
                  {/* World Cup (national teams only) */}
                  {categorizedAchievements.worldCup && categorizedAchievements.worldCup.length > 0 && (
                    <AchievementSection 
                      title="World Cup" 
                      achievements={categorizedAchievements.worldCup} 
                      color="red"
                    />
                  )}
                  
                  {/* International trophies */}
                  {categorizedAchievements.international && categorizedAchievements.international.length > 0 && (
                    <AchievementSection 
                      title="International" 
                      achievements={categorizedAchievements.international} 
                      color="purple"
                    />
                  )}
                  
                  {/* Continental trophies (club teams) */}
                  {!isNationalTeam && categorizedAchievements.continental && categorizedAchievements.continental.length > 0 && (
                    <AchievementSection 
                      title="Continental" 
                      achievements={categorizedAchievements.continental} 
                      color="blue"
                    />
                  )}
                  
                  {/* Domestic trophies (club teams) */}
                  {!isNationalTeam && categorizedAchievements.domestic && categorizedAchievements.domestic.length > 0 && (
                    <AchievementSection 
                      title="Domestic" 
                      achievements={categorizedAchievements.domestic} 
                      color="green"
                    />
                  )}
                </div>
                
                {/* If NO achievements at all */}
                {(!categorizedAchievements.worldCup || categorizedAchievements.worldCup.length === 0) &&
                 (!categorizedAchievements.international || categorizedAchievements.international.length === 0) &&
                 (!categorizedAchievements.continental || categorizedAchievements.continental.length === 0) &&
                 (!categorizedAchievements.domestic || categorizedAchievements.domestic.length === 0) && (
                  <div className="bg-gray-50 border border-gray-200 rounded-lg p-6 text-center">
                    <p className="text-gray-500 italic">Achievement data not available.</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        );
      })}

      {/* PLAYER RESULTS */}
      {!isTeamSearch && filteredPlayers.length > 0 && filteredPlayers.map((player, idx) => (
        <div key={idx} className="bg-white rounded-2xl shadow-xl overflow-hidden border border-gray-100">
          <div className="p-6 sm:p-8">
            {/* Player Header */}
            <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center mb-8">
              <div className="flex-1">
                <div className="flex items-center gap-3 mb-3">
                  <h2 className="text-2xl sm:text-3xl font-bold text-gray-900">{player.name}</h2>
                </div>
                <div className="flex flex-wrap items-center gap-2 mb-4">
                  <span className="px-3 py-1 bg-blue-100 text-blue-700 rounded-full text-sm font-medium">
                    {player.position || 'Player'}
                  </span>
                  <span className="px-3 py-1 bg-gray-100 text-gray-700 rounded-full text-sm font-medium">
                    {player.currentTeam || 'Unknown'}
                  </span>
                  <span className="px-3 py-1 bg-green-100 text-green-700 rounded-full text-sm font-medium">
                    {player.nationality || 'Unknown'}
                  </span>
                  {player.age && (
                    <span className="px-3 py-1 bg-purple-100 text-purple-700 rounded-full text-sm font-medium">
                      Age: {player.age}
                    </span>
                  )}
                </div>
              </div>
              
              {/* Player Stats Grid */}
              <div className="mt-6 lg:mt-0 lg:ml-6 grid grid-cols-2 lg:grid-cols-4 gap-3">
                <StatBox label="Career Goals" value={player.careerGoals} />
                <StatBox label="Career Assists" value={player.careerAssists} />
                <StatBox label="Int'l Caps" value={player.internationalAppearances} />
                <StatBox label="Int'l Goals" value={player.internationalGoals} />
              </div>
            </div>

            {/* Achievements */}
            {player.majorAchievements && Array.isArray(player.majorAchievements) && player.majorAchievements.length > 0 && (
              <div className="mb-8">
                <h3 className="text-xl font-bold text-gray-800 mb-4 flex items-center">
                  <span className="mr-2">🏆</span> Major Achievements
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {player.majorAchievements.map((achievement, achievementIdx) => (
                    <div 
                      key={achievementIdx} 
                      className="bg-gradient-to-r from-yellow-50 to-orange-50 border border-yellow-200 rounded-lg p-4 hover:shadow-sm transition"
                    >
                      <div className="flex items-start">
                        <span className="text-yellow-500 mr-3">✓</span>
                        <span className="text-gray-800">{achievement}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Career Summary */}
            <div className="bg-gray-50 rounded-xl p-6">
              <h3 className="text-xl font-bold text-gray-800 mb-3">Career Overview</h3>
              <p className="text-gray-700 leading-relaxed">{player.careerSummary || 'No career summary available.'}</p>
            </div>
          </div>
        </div>
      ))}

      {/* YouTube Highlights Section */}
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
          ) : youtubeVideos.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {youtubeVideos.map((video) => (
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
                        onError={(e) => {
                          (e.target as HTMLImageElement).src = 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" width="100" height="100" viewBox="0 0 100 100"><rect width="100" height="100" fill="%23f3f4f6"/><text x="50" y="50" font-family="Arial" font-size="14" fill="%236b7280" text-anchor="middle" dy=".3em">Video</text></svg>';
                        }}
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
          ) : safeYoutubeQuery ? (
            <div className="text-center py-12 bg-gray-50 rounded-lg">
              <p className="text-gray-700">No videos found for this search.</p>
            </div>
          ) : null}
        </div>
      </div>

      {/* No Results Message */}
      {safePlayers.length === 0 && safeTeams.length === 0 && youtubeVideos.length === 0 && !loadingVideos && (
        <div className="text-center py-16 bg-gradient-to-br from-gray-50 to-blue-50 rounded-2xl border border-gray-200">
          <h3 className="text-2xl font-medium text-gray-700 mb-3">No results found for "{searchTerm}"</h3>
          <p className="text-gray-500 max-w-md mx-auto">
            Try searching for a specific player, team, or tournament.
          </p>
        </div>
      )}
    </div>
  );
}