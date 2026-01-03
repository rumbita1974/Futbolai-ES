'use client';

import { useState, useEffect } from 'react';
import { searchYouTubeHighlights, YouTubeVideo } from '@/services/youtubeService';
import { Player, Team } from '@/services/groqService';

interface EnhancedResultsProps {
  players: Player[];
  teams: Team[];
  youtubeQuery: string;
  searchTerm: string;
}

export default function EnhancedSearchResults({
  players,
  teams,
  youtubeQuery,
  searchTerm
}: EnhancedResultsProps) {
  const [youtubeVideos, setYoutubeVideos] = useState<YouTubeVideo[]>([]);
  const [loadingVideos, setLoadingVideos] = useState(false);
  const [videoError, setVideoError] = useState<string | null>(null);

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

  // Helper component for stat boxes
  const StatBox = ({ label, value }: { label: string; value?: number }) => (
    <div className="bg-gradient-to-br from-gray-50 to-gray-100 p-4 rounded-xl text-center border border-gray-200 hover:shadow-md transition">
      <div className="text-2xl font-bold text-gray-800">{value !== undefined ? value : '-'}</div>
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
    color?: 'blue' | 'green' | 'purple' | 'yellow' 
  }) => {
    const colorClasses = {
      blue: 'border-blue-200 bg-blue-50 hover:bg-blue-100',
      green: 'border-green-200 bg-green-50 hover:bg-green-100',
      purple: 'border-purple-200 bg-purple-50 hover:bg-purple-100',
      yellow: 'border-yellow-200 bg-yellow-50 hover:bg-yellow-100'
    };

    return (
      <div className={`border rounded-lg p-4 ${colorClasses[color]} transition`}>
        <h4 className="font-semibold text-gray-800 mb-3 flex items-center">
          <span className={`w-3 h-3 rounded-full mr-2 ${
            color === 'blue' ? 'bg-blue-500' :
            color === 'green' ? 'bg-green-500' :
            color === 'purple' ? 'bg-purple-500' : 'bg-yellow-500'
          }`}></span>
          {title}
        </h4>
        {achievements.length > 0 ? (
          <ul className="space-y-2">
            {achievements.map((achievement, idx) => (
              <li key={idx} className="text-sm text-gray-700 flex items-start">
                <span className="text-gray-400 mr-2">•</span>
                {achievement}
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-sm text-gray-500 italic">No {title.toLowerCase()} achievements</p>
        )}
      </div>
    );
  };

  // Format date for YouTube videos
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { 
      year: 'numeric', 
      month: 'short', 
      day: 'numeric' 
    });
  };

  return (
    <div className="space-y-8 mt-8 animate-fadeIn">
      {/* Player Results */}
      {players.length > 0 && players.map((player, idx) => (
        <div key={idx} className="bg-white rounded-2xl shadow-xl overflow-hidden border border-gray-100">
          <div className="p-8">
            {/* Player Header */}
            <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center mb-8">
              <div>
                <h2 className="text-3xl font-bold text-gray-900">{player.name}</h2>
                <div className="flex flex-wrap items-center gap-3 mt-3">
                  <span className="px-3 py-1 bg-blue-100 text-blue-700 rounded-full text-sm font-medium">
                    {player.position}
                  </span>
                  <span className="px-3 py-1 bg-gray-100 text-gray-700 rounded-full text-sm font-medium">
                    {player.currentTeam}
                  </span>
                  <span className="px-3 py-1 bg-green-100 text-green-700 rounded-full text-sm font-medium">
                    {player.nationality}
                  </span>
                  {player.age && (
                    <span className="px-3 py-1 bg-purple-100 text-purple-700 rounded-full text-sm font-medium">
                      Age: {player.age}
                    </span>
                  )}
                </div>
              </div>
              
              {/* Player Stats Grid */}
              <div className="mt-6 lg:mt-0 grid grid-cols-2 lg:grid-cols-4 gap-4">
                <StatBox label="Career Goals" value={player.careerGoals} />
                <StatBox label="Career Assists" value={player.careerAssists} />
                <StatBox label="Int'l Caps" value={player.internationalAppearances} />
                <StatBox label="Int'l Goals" value={player.internationalGoals} />
              </div>
            </div>

            {/* Achievements */}
            {player.majorAchievements.length > 0 && (
              <div className="mb-8">
                <h3 className="text-xl font-bold text-gray-800 mb-4 flex items-center">
                  <span className="mr-2">🏆</span> Major Achievements
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {player.majorAchievements.map((achievement, idx) => (
                    <div 
                      key={idx} 
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
              <p className="text-gray-700 leading-relaxed">{player.careerSummary}</p>
            </div>
          </div>
        </div>
      ))}

      {/* Team Results */}
      {teams.length > 0 && teams.map((team, idx) => (
        <div key={idx} className="bg-white rounded-2xl shadow-xl overflow-hidden border border-gray-100">
          <div className="p-8">
            {/* Team Header */}
            <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center mb-8">
              <div>
                <h2 className="text-3xl font-bold text-gray-900">{team.name}</h2>
                <div className="flex flex-wrap items-center gap-3 mt-3">
                  <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                    team.type === 'national' 
                      ? 'bg-red-100 text-red-700' 
                      : 'bg-blue-100 text-blue-700'
                  }`}>
                    {team.type === 'national' ? 'National Team' : 'Football Club'}
                  </span>
                  <span className="px-3 py-1 bg-gray-100 text-gray-700 rounded-full text-sm font-medium">
                    {team.country}
                  </span>
                  {team.stadium && (
                    <span className="px-3 py-1 bg-green-100 text-green-700 rounded-full text-sm font-medium">
                      🏟️ {team.stadium}
                    </span>
                  )}
                  <span className="px-3 py-1 bg-purple-100 text-purple-700 rounded-full text-sm font-medium">
                    👨‍🏫 Coach: {team.currentCoach}
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
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <AchievementSection 
                  title="World Cup" 
                  achievements={team.majorAchievements.worldCup} 
                  color="yellow" 
                />
                <AchievementSection 
                  title="Continental" 
                  achievements={team.majorAchievements.continental} 
                  color="blue" 
                />
                <AchievementSection 
                  title="Domestic" 
                  achievements={team.majorAchievements.domestic} 
                  color="green" 
                />
              </div>
            </div>
          </div>
        </div>
      ))}

      {/* YouTube Highlights Section */}
      <div className="bg-white rounded-2xl shadow-xl overflow-hidden border border-gray-100">
        <div className="p-8">
          <div className="flex justify-between items-center mb-6">
            <h3 className="text-2xl font-bold text-gray-800 flex items-center">
              <span className="mr-3">📺</span> Video Highlights
              {youtubeQuery && (
                <span className="ml-4 text-sm font-normal text-gray-500">
                  (Search: "{youtubeQuery}")
                </span>
              )}
            </h3>
            <div className="flex items-center">
              {loadingVideos ? (
                <div className="flex items-center text-gray-500">
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600 mr-2"></div>
                  Loading videos...
                </div>
              ) : youtubeVideos.length > 0 && (
                <span className="text-sm text-gray-600">
                  {youtubeVideos.length} video{youtubeVideos.length !== 1 ? 's' : ''} found
                </span>
              )}
            </div>
          </div>

          {videoError ? (
            <div className="bg-red-50 border border-red-200 rounded-lg p-6 text-center">
              <p className="text-red-800">{videoError}</p>
              <p className="text-red-600 text-sm mt-2">
                Make sure you have added <code className="bg-red-100 px-2 py-1 rounded">NEXT_PUBLIC_YOUTUBE_API_KEY</code> to your .env.local file
              </p>
            </div>
          ) : loadingVideos ? (
            <div className="flex justify-center items-center h-64">
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
                    <div className="aspect-video relative overflow-hidden">
                      <img 
                        src={video.thumbnail} 
                        alt={video.title}
                        className="w-full h-full object-cover hover:scale-105 transition duration-300"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent"></div>
                      <div className="absolute top-2 right-2 bg-red-600 text-white text-xs px-2 py-1 rounded">
                        YouTube
                      </div>
                    </div>
                    <div className="p-4">
                      <h4 className="font-semibold text-gray-800 line-clamp-2 mb-2">
                        {video.title}
                      </h4>
                      <p className="text-sm text-gray-600 line-clamp-2 mb-3">
                        {video.description}
                      </p>
                      <div className="flex justify-between items-center text-xs text-gray-500">
                        <span>{video.channelTitle}</span>
                        <span>{formatDate(video.publishedAt)}</span>
                      </div>
                    </div>
                  </a>
                </div>
              ))}
            </div>
          ) : youtubeQuery ? (
            <div className="text-center py-12 bg-gray-50 rounded-lg">
              <div className="text-gray-400 mb-4">
                <svg className="w-16 h-16 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                </svg>
              </div>
              <p className="text-gray-700">No videos found for this search.</p>
              <p className="text-gray-500 text-sm mt-2">Try a different search term or check your YouTube API key.</p>
            </div>
          ) : null}
        </div>
      </div>

      {/* No Results Message */}
      {players.length === 0 && teams.length === 0 && youtubeVideos.length === 0 && !loadingVideos && (
        <div className="text-center py-16 bg-gradient-to-br from-gray-50 to-blue-50 rounded-2xl border border-gray-200">
          <div className="text-gray-400 mb-6">
            <svg className="w-20 h-20 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <h3 className="text-2xl font-medium text-gray-700 mb-3">No results found for "{searchTerm}"</h3>
          <p className="text-gray-500 max-w-md mx-auto">
            Try searching for a specific player (e.g., "Cristiano Ronaldo"), team (e.g., "Manchester United"), or tournament.
          </p>
        </div>
      )}
    </div>
  );
}