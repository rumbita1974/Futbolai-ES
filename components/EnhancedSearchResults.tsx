'use client';

import { useState, useEffect } from 'react';
import { searchYouTubeHighlights, YouTubeVideo } from '@/services/youtubeService';
import { Player, Team, needsDataVerification, getDataSourceInfo } from '@/services/groqService';
import { getDataQualityBadge as getDataBadge } from '@/services/dataEnhancerService';

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
  players,
  teams,
  youtubeQuery,
  searchTerm,
  _metadata
}: EnhancedResultsProps) {
  const [youtubeVideos, setYoutubeVideos] = useState<YouTubeVideo[]>([]);
  const [loadingVideos, setLoadingVideos] = useState(false);
  const [videoError, setVideoError] = useState<string | null>(null);
  const [showRefresh, setShowRefresh] = useState(false);
  
  // Get data badge
  const dataBadge = getDataBadge(_metadata);
  const needsVerification = needsDataVerification({ players, teams, youtubeQuery, _metadata } as any);
  const dataSourceInfo = getDataSourceInfo({ players, teams, youtubeQuery, _metadata } as any);

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

  // Check if we should show refresh button (if data is stale or incomplete)
  useEffect(() => {
    const hasIncompleteData = 
      (teams.length > 0 && (!teams[0].currentCoach || teams[0].currentCoach === 'Unknown')) ||
      (players.length > 0 && players.length < 3) ||
      (_metadata?.confidenceScore && _metadata.confidenceScore < 60);
    
    setShowRefresh(hasIncompleteData);
  }, [teams, players, _metadata]);

  // Helper function to handle refresh
  const handleRefresh = () => {
    if (typeof window !== 'undefined') {
      // Clear cache for this search
      const cacheKey = `search_cache_v2.1_${searchTerm.toLowerCase()}_en`;
      localStorage.removeItem(cacheKey);
      
      // Also clear all versions of this cache
      for (let i = localStorage.length - 1; i >= 0; i--) {
        const key = localStorage.key(i);
        if (key?.includes(`_${searchTerm.toLowerCase()}_`) && key?.startsWith('search_cache_')) {
          localStorage.removeItem(key);
        }
      }
      
      // Reload the page with cache busting
      window.location.href = `/?search=${encodeURIComponent(searchTerm)}&refresh=${Date.now()}`;
    }
  };

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

  // Helper function to detect missing major trophies for top clubs
  const getMissingAchievementsNotice = (teamName: string, achievements: MajorAchievements, isNationalTeam: boolean): string | null => {
    const nameLower = teamName.toLowerCase();
    
    // Check for major clubs known to have continental/international trophies
    const majorClubs = [
      { name: 'manchester city', hasChampionsLeague: true, hasClubWorldCup: true },
      { name: 'real madrid', hasChampionsLeague: true, hasClubWorldCup: true },
      { name: 'barcelona', hasChampionsLeague: true, hasClubWorldCup: true },
      { name: 'bayern munich', hasChampionsLeague: true, hasClubWorldCup: true },
      { name: 'liverpool', hasChampionsLeague: true, hasClubWorldCup: true },
      { name: 'ac milan', hasChampionsLeague: true, hasClubWorldCup: true },
      { name: 'inter milan', hasChampionsLeague: true, hasClubWorldCup: true },
      { name: 'juventus', hasChampionsLeague: true, hasClubWorldCup: true },
      { name: 'manchester united', hasChampionsLeague: true, hasClubWorldCup: true },
      { name: 'chelsea', hasChampionsLeague: true, hasClubWorldCup: true }
    ];
    
    const clubMatch = majorClubs.find(club => nameLower.includes(club.name));
    
    if (clubMatch && !isNationalTeam) {
      const hasContinental = achievements.continental && achievements.continental.length > 0;
      const hasInternational = achievements.international && achievements.international.length > 0;
      
      if (!hasContinental && clubMatch.hasChampionsLeague) {
        return `${teamName} has won the UEFA Champions League. Data may be incomplete.`;
      }
      if (!hasInternational && clubMatch.hasClubWorldCup) {
        return `${teamName} has won the FIFA Club World Cup. Data may be incomplete.`;
      }
    }
    
    return null;
  };

  // CRITICAL FIX: Enhanced achievement categorization for national teams
  const categorizeAchievementsForDisplay = (achievements: MajorAchievements, isNationalTeam: boolean) => {
    // Start with a clean copy
    const result = { ...achievements };
    
    if (isNationalTeam) {
      // For national teams, ensure domestic is ALWAYS empty
      if (result.domestic && result.domestic.length > 0) {
        console.warn(`[NATIONAL-TEAM-FIX] Moving ${result.domestic.length} domestic achievements to international for national team:`, result.domestic);
        
        // Move all domestic achievements to international for national teams
        result.international = [...(result.international || []), ...result.domestic];
        result.domestic = [];
      }
      
      // Ensure World Cup trophies are in the right place (check international first)
      if (result.international && result.international.length > 0) {
        const worldCupTrophies = result.international.filter(a => 
          a.toLowerCase().includes('world cup') && !a.toLowerCase().includes('club')
        );
        
        if (worldCupTrophies.length > 0) {
          // Remove World Cup from international
          result.international = result.international.filter(a => 
            !a.toLowerCase().includes('world cup') || a.toLowerCase().includes('club')
          );
          // Add to worldCup
          result.worldCup = [...(result.worldCup || []), ...worldCupTrophies];
        }
      }
      
      // Also check domestic (in case any slipped through) for World Cup
      if (result.domestic && result.domestic.length > 0) {
        const worldCupTrophies = result.domestic.filter(a => 
          a.toLowerCase().includes('world cup') && !a.toLowerCase().includes('club')
        );
        
        if (worldCupTrophies.length > 0) {
          result.domestic = result.domestic.filter(a => 
            !a.toLowerCase().includes('world cup') || a.toLowerCase().includes('club')
          );
          result.worldCup = [...(result.worldCup || []), ...worldCupTrophies];
        }
      }
      
      // Move Copa América, Euro, etc. from domestic to international
      if (result.domestic && result.domestic.length > 0) {
        const internationalTrophies = result.domestic.filter(a => {
          const aLower = a.toLowerCase();
          return (
            aLower.includes('copa américa') ||
            aLower.includes('euro') ||
            aLower.includes('confederations cup') ||
            aLower.includes('conmebol') ||
            aLower.includes('africa cup') ||
            aLower.includes('asian cup') ||
            aLower.includes('gold cup') ||
            aLower.includes('continental')
          );
        });
        
        if (internationalTrophies.length > 0) {
          result.domestic = result.domestic.filter(a => {
            const aLower = a.toLowerCase();
            return !(
              aLower.includes('copa américa') ||
              aLower.includes('euro') ||
              aLower.includes('confederations cup') ||
              aLower.includes('conmebol') ||
              aLower.includes('africa cup') ||
              aLower.includes('asian cup') ||
              aLower.includes('gold cup') ||
              aLower.includes('continental')
            );
          });
          result.international = [...(result.international || []), ...internationalTrophies];
        }
      }
      
      // For national teams, we should have NO domestic achievements left
      if (result.domestic && result.domestic.length > 0) {
        console.warn(`[NATIONAL-TEAM-FIX] Still have domestic achievements for national team, moving all to international:`, result.domestic);
        result.international = [...(result.international || []), ...result.domestic];
        result.domestic = [];
      }
      
      // Ensure continental is empty for national teams
      if (result.continental && result.continental.length > 0) {
        console.warn(`[NATIONAL-TEAM-FIX] Moving continental achievements to international for national team:`, result.continental);
        result.international = [...(result.international || []), ...result.continental];
        result.continental = [];
      }
      
      return result;
    }
    
    // For club teams
    // Ensure worldCup is undefined (clubs don't win World Cups)
    if (result.worldCup && result.worldCup.length > 0) {
      // Check if these are actually Club World Cup achievements
      const clubWorldCupTrophies = result.worldCup.filter(a => 
        a.toLowerCase().includes('club world cup') || a.toLowerCase().includes('club')
      );
      const actualWorldCup = result.worldCup.filter(a => 
        !a.toLowerCase().includes('club world cup') && !a.toLowerCase().includes('club')
      );
      
      if (clubWorldCupTrophies.length > 0) {
        result.international = [...(result.international || []), ...clubWorldCupTrophies];
      }
      
      if (actualWorldCup.length > 0) {
        console.warn(`[CLUB-FIX] Removing World Cup achievements from club team:`, actualWorldCup);
      }
      
      delete result.worldCup;
    }
    
    return result;
  };

  // Wikipedia Source Badge Component
  const WikipediaSourceBadge = ({ team, player }: { team?: Team; player?: Player }) => {
    const source = team?._source || (player as any)?._source;
    const lastVerified = team?._lastVerified || (player as any)?._lastVerified;
    const wikiSummary = team?._wikiSummary || (player as any)?._wikiSummary;
    const updateReason = team?._updateReason;
    
    if (!source) return null;
    
    const isCriticalUpdate = source.includes('Critical');
    const isWikipedia = source.includes('Wikipedia');
    
    if (!isCriticalUpdate && !isWikipedia) return null;
    
    return (
      <div className={`mt-3 p-3 rounded-lg border ${
        isCriticalUpdate 
          ? 'bg-purple-50 border-purple-200' 
          : 'bg-blue-50 border-blue-200'
      }`}>
        <div className="flex items-start">
          <div className="flex-shrink-0 pt-1">
            {isCriticalUpdate ? (
              <span className="text-purple-600 text-lg">🔧</span>
            ) : (
              <span className="text-blue-600 text-lg">🌐</span>
            )}
          </div>
          <div className="ml-3 flex-1">
            <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-2">
              <div>
                <span className={`text-xs font-medium px-2 py-1 rounded ${
                  isCriticalUpdate 
                    ? 'bg-purple-100 text-purple-800' 
                    : 'bg-blue-100 text-blue-800'
                }`}>
                  {source}
                </span>
                {updateReason && (
                  <p className="text-xs text-gray-600 mt-2">{updateReason}</p>
                )}
              </div>
              {lastVerified && (
                <div className="text-xs text-gray-500 flex items-center">
                  <span className="hidden sm:inline mr-1">Verified:</span>
                  {new Date(lastVerified).toLocaleDateString()}
                </div>
              )}
            </div>
            
            {wikiSummary && (
              <p className="text-xs text-gray-600 mt-2 line-clamp-2">
                {wikiSummary}
              </p>
            )}
            
            {team?._dataCurrency?.disclaimer && (
              <p className="text-xs text-gray-500 mt-2">
                {team._dataCurrency.disclaimer}
              </p>
            )}
          </div>
        </div>
      </div>
    );
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

  // Data Source Indicator
  const DataSourceIndicator = () => (
    <div className="flex flex-wrap items-center justify-between gap-3 mb-4 p-3 bg-gray-50 rounded-lg">
      <div className="flex items-center gap-2">
        <span className={`px-2 py-1 rounded ${
          dataSourceInfo.color === 'green' ? 'bg-green-100 text-green-800' :
          dataSourceInfo.color === 'blue' ? 'bg-blue-100 text-blue-800' :
          dataSourceInfo.color === 'purple' ? 'bg-purple-100 text-purple-800' :
          dataSourceInfo.color === 'orange' ? 'bg-orange-100 text-orange-800' :
          'bg-gray-100 text-gray-800'
        }`}>
          {dataSourceInfo.icon} {dataSourceInfo.source}
        </span>
        {_metadata?.currentSeason && (
          <span className="text-gray-500">Season: {_metadata.currentSeason}</span>
        )}
      </div>
      
      {showRefresh && (
        <button
          onClick={handleRefresh}
          className="flex items-center gap-2 px-3 py-1.5 text-sm bg-white border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 hover:border-gray-400 transition"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
          </svg>
          Refresh Data
        </button>
      )}
    </div>
  );

  // Filter out players that are actually team names
  const isTeamSearch = searchTerm.length > 0 && 
    (searchTerm.toLowerCase().includes('fc') || 
     searchTerm.toLowerCase().includes('united') || 
     searchTerm.toLowerCase().includes('city') ||
     teams.length > 0);
  
  const filteredPlayers = isTeamSearch 
    ? players.filter(p => 
        !p.name.toLowerCase().includes(searchTerm.toLowerCase()) &&
        p.name !== searchTerm
      )
    : players;

  return (
    <div className="space-y-8 mt-8 animate-fadeIn">
      {/* Data Source Indicator with Refresh Button */}
      <DataSourceIndicator />
      
      {/* TEAM RESULTS - Show FIRST for team searches */}
      {teams.length > 0 && teams.map((team, idx) => {
        // Safely extract achievements with defaults
        const achievements: MajorAchievements = team.majorAchievements || {};
        
        // DETERMINE TEAM TYPE - CRITICAL FIX
        const isNationalTeam = team.type === 'national' || 
                               team.name.toLowerCase().includes('national') ||
                               (team.country && team.name === team.country) ||
                               // Check for country names in team name
                               ['Argentina', 'Brazil', 'Uruguay', 'France', 'England', 'Germany', 
                                'Spain', 'Italy', 'Portugal', 'Netherlands', 'Japan', 'Morocco',
                                'Ecuador', 'Paraguay', 'Chile', 'Colombia', 'Mexico', 'USA',
                                'Canada', 'Australia', 'South Korea', 'China', 'Egypt', 'Senegal',
                                'Ghana', 'Nigeria', 'Croatia', 'Switzerland', 'Sweden', 'Norway',
                                'Denmark', 'Poland', 'Belgium']
                                 .some(country => team.name.includes(country));
        
        // Categorize achievements correctly based on team type
        const categorizedAchievements = categorizeAchievementsForDisplay(achievements, isNationalTeam);
        
        // Check if data appears incomplete for known major clubs
        const missingAchievementsNotice = getMissingAchievementsNotice(team.name, categorizedAchievements, isNationalTeam);
        
        // Debug log for troubleshooting
        console.log('EnhancedSearchResults Debug:', {
          teamName: team.name,
          teamType: team.type,
          isNationalTeam,
          originalAchievements: achievements,
          categorizedAchievements,
          hasWorldCup: categorizedAchievements.worldCup?.length > 0,
          hasInternational: categorizedAchievements.international?.length > 0,
          hasDomestic: categorizedAchievements.domestic?.length > 0,
        });
        
        return (
          <div key={idx} className="bg-white rounded-2xl shadow-xl overflow-hidden border border-gray-100">
            <div className="p-6 sm:p-8">
              {/* Team Header */}
              <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center mb-8">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-3">
                    <h2 className="text-2xl sm:text-3xl font-bold text-gray-900">{team.name}</h2>
                    {needsVerification && (
                      <span className="text-xs px-2 py-1 bg-yellow-100 text-yellow-800 rounded-full">
                        Verify Coach
                      </span>
                    )}
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
                      {team.country}
                    </span>
                    {team.stadium && !isNationalTeam && (
                      <span className="px-3 py-1 bg-green-100 text-green-700 rounded-full text-sm font-medium">
                        🏟️ {team.stadium}
                      </span>
                    )}
                    {team.stadium && isNationalTeam && (
                      <span className="px-3 py-1 bg-green-100 text-green-700 rounded-full text-sm font-medium">
                        🏟️ Home Stadium: {team.stadium}
                      </span>
                    )}
                    <span className="px-3 py-1 bg-purple-100 text-purple-700 rounded-full text-sm font-medium">
                      👨‍🏫 {team.currentCoach}
                    </span>
                    {team.foundedYear && (
                      <span className="px-3 py-1 bg-yellow-100 text-yellow-700 rounded-full text-sm font-medium">
                        📅 Founded: {team.foundedYear}
                      </span>
                    )}
                  </div>
                  <WikipediaSourceBadge team={team} />
                  
                  {team._dataCurrency?.disclaimer && (
                    <p className="text-xs text-gray-500 mt-2">{team._dataCurrency.disclaimer}</p>
                  )}
                </div>
              </div>

              {/* Achievements Grid - Display with proper categorization */}
              <div className="mb-8">
                <h3 className="text-xl font-bold text-gray-800 mb-4 flex items-center">
                  <span className="mr-2">🏅</span> Trophy Cabinet
                </h3>
                
                {/* Show notice if data appears incomplete for major clubs */}
                {missingAchievementsNotice && (
                  <div className="mb-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                    <p className="text-sm text-yellow-800 flex items-center">
                      <span className="mr-2">⚠️</span>
                      {missingAchievementsNotice}
                    </p>
                  </div>
                )}
                
                {/* Show warning if national team has domestic achievements */}
                {isNationalTeam && categorizedAchievements.domestic && categorizedAchievements.domestic.length > 0 && (
                  <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg">
                    <p className="text-sm text-red-800 flex items-center">
                      <span className="mr-2">🚨</span>
                      Data categorization issue detected. Domestic trophies shown for national team.
                      <button
                        onClick={handleRefresh}
                        className="ml-2 text-red-600 underline hover:text-red-800"
                      >
                        Click to refresh and fix
                      </button>
                    </p>
                  </div>
                )}
                
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
                  {/* World Cup (national teams only) - RED for World Cup */}
                  {categorizedAchievements.worldCup && categorizedAchievements.worldCup.length > 0 && (
                    <AchievementSection 
                      title="World Cup" 
                      achievements={categorizedAchievements.worldCup} 
                      color="red"
                    />
                  )}
                  
                  {/* International trophies - PURPLE */}
                  {categorizedAchievements.international && categorizedAchievements.international.length > 0 && (
                    <AchievementSection 
                      title={isNationalTeam ? "International" : "International"} 
                      achievements={categorizedAchievements.international} 
                      color="purple"
                    />
                  )}
                  
                  {/* Continental trophies - BLUE (for club teams) */}
                  {!isNationalTeam && categorizedAchievements.continental && categorizedAchievements.continental.length > 0 && (
                    <AchievementSection 
                      title="Continental" 
                      achievements={categorizedAchievements.continental} 
                      color="blue"
                    />
                  )}
                  
                  {/* Domestic trophies - GREEN (only for club teams) */}
                  {!isNationalTeam && categorizedAchievements.domestic && categorizedAchievements.domestic.length > 0 && (
                    <AchievementSection 
                      title="Domestic" 
                      achievements={categorizedAchievements.domestic} 
                      color="green"
                    />
                  )}
                  
                  {/* For national teams: Show message if domestic section exists (shouldn't happen) */}
                  {isNationalTeam && categorizedAchievements.domestic && categorizedAchievements.domestic.length > 0 && (
                    <div className="col-span-4">
                      <div className="border border-yellow-200 bg-yellow-50 rounded-lg p-4">
                        <p className="text-sm text-yellow-800">
                          <strong>Data Issue:</strong> Domestic achievements shown for national team.
                          This usually means trophies like Copa América are in the wrong category.
                          <button
                            onClick={handleRefresh}
                            className="ml-2 text-blue-600 hover:text-blue-800 underline"
                          >
                            Click here to refresh and get properly categorized data
                          </button>
                        </p>
                      </div>
                    </div>
                  )}
                </div>
                
                {/* If NO achievements at all */}
                {(!categorizedAchievements.worldCup || categorizedAchievements.worldCup.length === 0) &&
                 (!categorizedAchievements.international || categorizedAchievements.international.length === 0) &&
                 (!categorizedAchievements.continental || categorizedAchievements.continental.length === 0) &&
                 (!categorizedAchievements.domestic || categorizedAchievements.domestic.length === 0) && (
                  <div className="bg-gray-50 border border-gray-200 rounded-lg p-6 text-center">
                    <p className="text-gray-500 italic">Achievement data not available. Try refreshing or check back later.</p>
                  </div>
                )}
                
                {/* Show a message if only domestic trophies for a major club */}
                {!isNationalTeam && 
                 categorizedAchievements.domestic && categorizedAchievements.domestic.length > 0 &&
                 (!categorizedAchievements.international || categorizedAchievements.international.length === 0) &&
                 (!categorizedAchievements.continental || categorizedAchievements.continental.length === 0) && (
                  <div className="col-span-4 mt-4">
                    <div className="border border-gray-200 bg-gray-50 rounded-lg p-4">
                      <h4 className="font-semibold text-gray-800 mb-2">Note about Trophy Data</h4>
                      <p className="text-sm text-gray-600">
                        Only domestic trophies are shown. International and continental trophy data 
                        may be missing from the current data source. Try refreshing or using 
                        different search terms.
                      </p>
                      <button
                        onClick={handleRefresh}
                        className="mt-3 text-sm text-blue-600 hover:text-blue-800 underline"
                      >
                        Click here to refresh and get full trophy data
                      </button>
                    </div>
                  </div>
                )}
              </div>
              
              {/* Data Currency Info */}
              {team._dataCurrency && (
                <div className="bg-gray-50 rounded-xl p-4 mt-6">
                  <h4 className="font-semibold text-gray-700 mb-2">Data Information</h4>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
                    <div>
                      <span className="text-gray-500">Last trained data:</span>
                      <span className="ml-2 font-medium">{team._dataCurrency.lastTrained || '2024'}</span>
                    </div>
                    <div>
                      <span className="text-gray-500">Enhanced:</span>
                      <span className="ml-2 font-medium">
                        {team._dataCurrency.enhanced ? 
                          new Date(team._dataCurrency.enhanced).toLocaleDateString() : 
                          'No'
                        }
                      </span>
                    </div>
                    <div>
                      <span className="text-gray-500">Updates applied:</span>
                      <span className="ml-2 font-medium">{team._dataCurrency.updatesApplied?.length || 0}</span>
                    </div>
                    <div>
                      <span className="text-gray-500">Confidence:</span>
                      <span className={`ml-2 font-medium ${
                        team._dataCurrency.verification?.confidence === 'high' ? 'text-green-600' :
                        team._dataCurrency.verification?.confidence === 'medium' ? 'text-yellow-600' :
                        'text-red-600'
                      }`}>
                        {team._dataCurrency.verification?.confidence || 'medium'}
                      </span>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        );
      })}

      {/* PLAYER RESULTS - Show AFTER teams for team searches, show FIRST for player searches */}
      {!isTeamSearch && filteredPlayers.length > 0 && filteredPlayers.map((player, idx) => (
        <div key={idx} className="bg-white rounded-2xl shadow-xl overflow-hidden border border-gray-100">
          <div className="p-6 sm:p-8">
            {/* Player Header */}
            <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center mb-8">
              <div className="flex-1">
                <div className="flex items-center gap-3 mb-3">
                  <h2 className="text-2xl sm:text-3xl font-bold text-gray-900">{player.name}</h2>
                  {needsVerification && (
                    <span className="text-xs px-2 py-1 bg-yellow-100 text-yellow-800 rounded-full">
                      Verify
                    </span>
                  )}
                </div>
                <div className="flex flex-wrap items-center gap-2 mb-4">
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
                <WikipediaSourceBadge player={player} />
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
              <p className="text-gray-700 leading-relaxed">{player.careerSummary}</p>
              {player.age && player.age > 35 && (
                <p className="text-sm text-gray-500 mt-3 italic">
                  Note: Player age and current team should be verified with latest sources.
                </p>
              )}
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
              {youtubeQuery && (
                <p className="text-gray-600 mt-1">
                  Search: <span className="font-medium">"{youtubeQuery}"</span>
                </p>
              )}
            </div>
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
                      <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent"></div>
                      <div className="absolute top-2 right-2 bg-red-600 text-white text-xs px-2 py-1 rounded">
                        YouTube
                      </div>
                      <div className="absolute bottom-2 left-2 text-white text-xs bg-black/60 px-2 py-1 rounded">
                        {formatDate(video.publishedAt)}
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