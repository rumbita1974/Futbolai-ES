'use client'

import { useState, useRef, useCallback } from 'react';

interface FootballSearchProps {
  onPlayerSelect: (player: any) => void;
  onTeamSelect: (team: any) => void;
  onVideoFound: (url: string) => void;
  onLoadingChange: (loading: boolean) => void;
  onAnalysisUpdate: (analysis: string) => void;
  onTeamsUpdate: (teams: any[]) => void;
  onWorldCupUpdate: (worldCupInfo: any) => void;
}

export default function FootballSearch({
  onPlayerSelect,
  onTeamSelect,
  onVideoFound,
  onLoadingChange,
  onAnalysisUpdate,
  onTeamsUpdate,
  onWorldCupUpdate,
}: FootballSearchProps) {
  const [query, setQuery] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isSearching, setIsSearching] = useState(false);
  
  // Use refs to track the current search and prevent race conditions
  const searchControllerRef = useRef<AbortController | null>(null);
  const searchTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Function to clear ALL previous data
  const clearAllPreviousData = useCallback(() => {
    console.log('🧹 Clearing all previous data...');
    onPlayerSelect(null);
    onTeamSelect(null);
    onWorldCupUpdate(null);
    onTeamsUpdate([]);
    onVideoFound('');
    onAnalysisUpdate('');
  }, [onPlayerSelect, onTeamSelect, onWorldCupUpdate, onTeamsUpdate, onVideoFound, onAnalysisUpdate]);

  // Cleanup function
  const cleanupSearch = useCallback(() => {
    // Cancel any pending timeout
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
      searchTimeoutRef.current = null;
    }
    
    // Abort any ongoing fetch request
    if (searchControllerRef.current) {
      searchControllerRef.current.abort();
      searchControllerRef.current = null;
    }
    
    setIsSearching(false);
  }, []);

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!query.trim() || isSearching) return;

    console.log('🔍 [SEARCH] Starting search for:', query);
    setIsSearching(true);
    onLoadingChange(true);
    setError(null);
    
    // Clean up any previous search
    cleanupSearch();
    
    // Create new abort controller
    searchControllerRef.current = new AbortController();
    
    // Clear ALL previous selections
    clearAllPreviousData();
    
    try {
      const apiUrl = `/api/ai?action=search&query=${encodeURIComponent(query.trim())}`;
      console.log('🔍 [API] Calling:', apiUrl);
      
      const response = await fetch(apiUrl, {
        signal: searchControllerRef.current.signal,
        headers: {
          'Accept': 'application/json',
        }
      });
      
      console.log('🔍 [API] Response status:', response.status);
      
      // Check if response is ok
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const data = await response.json();
      console.log('🔍 [API] Response received, success:', data.success);
      
      // Check if component is still mounted and this is still the current search
      if (!searchControllerRef.current?.signal.aborted) {
        if (data.success) {
          console.log('✅ [API] Success! Type from API:', data.type);
          console.log('📊 Data received:', {
            playerInfo: !!data.playerInfo,
            teamInfo: !!data.teamInfo,
            worldCupInfo: !!data.worldCupInfo,
            teamType: data.teamInfo?.type
          });
          
          // Use the type from API response, but also check the data
          let responseType = data.type || 'general';
          
          // Double-check the type based on actual data
          if (!responseType || responseType === 'general') {
            if (data.playerInfo) {
              responseType = 'player';
            } else if (data.teamInfo) {
              responseType = data.teamInfo.type === 'national' ? 'national' : 'club';
            } else if (data.worldCupInfo) {
              responseType = 'worldCup';
            }
          }
          
          console.log('🎯 Final processing type:', responseType);
          
          // Clear all data again before setting new data (just to be sure)
          clearAllPreviousData();
          
          if (responseType === 'player' && data.playerInfo) {
            console.log('👤 Setting player data:', data.playerInfo.name);
            
            // Process player achievements from achievementsSummary
            let playerAchievements = [];
            if (data.playerInfo.achievementsSummary) {
              const { achievementsSummary } = data.playerInfo;
              
              if (achievementsSummary.worldCupTitles > 0) {
                playerAchievements.push(`World Cup Titles: ${achievementsSummary.worldCupTitles}`);
              }
              if (achievementsSummary.continentalTitles > 0) {
                playerAchievements.push(`Continental Titles: ${achievementsSummary.continentalTitles}`);
              }
              if (achievementsSummary.clubContinentalTitles > 0) {
                playerAchievements.push(`Club Continental Titles: ${achievementsSummary.clubContinentalTitles}`);
              }
              if (achievementsSummary.clubDomesticTitles?.leagues > 0) {
                playerAchievements.push(`Domestic Leagues: ${achievementsSummary.clubDomesticTitles.leagues}`);
              }
              if (achievementsSummary.clubDomesticTitles?.cups > 0) {
                playerAchievements.push(`Domestic Cups: ${achievementsSummary.clubDomesticTitles.cups}`);
              }
            }
            
            // Add individual awards
            if (data.playerInfo.individualAwards) {
              playerAchievements = [...playerAchievements, ...data.playerInfo.individualAwards];
            }
            
            // Add team honors
            if (data.playerInfo.teamHonors) {
              data.playerInfo.teamHonors.forEach((honor: any) => {
                playerAchievements.push(`${honor.competition}: ${honor.wins} wins`);
              });
            }
            
            const playerData = {
              id: Date.now(),
              name: data.playerInfo.name || query,
              fullName: data.playerInfo.fullName || data.playerInfo.name || query,
              position: data.playerInfo.position || 'Unknown',
              nationality: data.playerInfo.nationality || 'Unknown',
              club: data.playerInfo.currentClub || 'Unknown',
              age: data.playerInfo.age || null,
              
              // Extract stats from careerStats
              goals: data.playerInfo.careerStats?.club?.totalGoals || 
                    data.playerInfo.careerStats?.totalGoals || 0,
              assists: data.playerInfo.careerStats?.club?.totalAssists || 
                      data.playerInfo.careerStats?.totalAssists || 0,
              appearances: data.playerInfo.careerStats?.club?.totalAppearances || 
                          data.playerInfo.careerStats?.totalAppearances || 0,
              
              marketValue: data.playerInfo.marketValue || 'Unknown',
              
              // Enhanced achievements structure
              achievementsSummary: data.playerInfo.achievementsSummary || null,
              achievements: playerAchievements,
              individualAwards: data.playerInfo.individualAwards || [],
              teamHonors: data.playerInfo.teamHonors || [],
              
              // Enhanced fields
              dateOfBirth: data.playerInfo.dateOfBirth || null,
              height: data.playerInfo.height || null,
              weight: data.playerInfo.weight || null,
              preferredFoot: data.playerInfo.preferredFoot || 'Unknown',
              playingStyle: data.playerInfo.playingStyle || '',
              
              // International stats
              internationalCaps: data.playerInfo.careerStats?.international?.caps || 0,
              internationalGoals: data.playerInfo.careerStats?.international?.goals || 0,
              internationalDebut: data.playerInfo.careerStats?.international?.debut,
              
              // Career data
              careerStats: data.playerInfo.careerStats || null,
              clubCareer: data.playerInfo.clubCareer || [],
              internationalCareer: data.playerInfo.internationalCareer || null,
              
              // Current season
              currentSeason: data.playerInfo.currentSeason || null,
              
              // Additional info
              clubNumber: data.playerInfo.clubNumber,
              positions: data.playerInfo.positions || []
            };
            
            console.log('👤 Enhanced player data prepared with achievementsSummary');
            onPlayerSelect(playerData);
          } 
          else if (responseType === 'team' && data.teamInfo) {
            console.log('🏟️ Setting team data:', data.teamInfo.name);
            
            // Clear player data if switching from player to team
            onPlayerSelect(null);
            
            // Process team achievements from achievementsSummary
            let teamAchievements = [];
            const isNationalTeam = data.teamInfo.type === 'national';
            
            if (data.teamInfo.achievementsSummary) {
              const { achievementsSummary } = data.teamInfo;
              
              if (isNationalTeam) {
                if (achievementsSummary.worldCupTitles > 0) {
                  teamAchievements.push(`World Cup Titles: ${achievementsSummary.worldCupTitles}`);
                }
                if (achievementsSummary.continentalTitles > 0) {
                  teamAchievements.push(`Continental Titles: ${achievementsSummary.continentalTitles}`);
                }
              } else {
                // Club team
                if (achievementsSummary.continentalTitles > 0) {
                  teamAchievements.push(`Continental Titles: ${achievementsSummary.continentalTitles}`);
                }
                if (achievementsSummary.internationalTitles > 0) {
                  teamAchievements.push(`International Titles: ${achievementsSummary.internationalTitles}`);
                }
                if (achievementsSummary.domesticTitles?.leagues > 0) {
                  teamAchievements.push(`Domestic Leagues: ${achievementsSummary.domesticTitles.leagues}`);
                }
                if (achievementsSummary.domesticTitles?.cups > 0) {
                  teamAchievements.push(`Domestic Cups: ${achievementsSummary.domesticTitles.cups}`);
                }
              }
            }
            
            // Add trophy details
            if (data.teamInfo.trophies) {
              const { trophies } = data.teamInfo;
              
              // Continental trophies
              if (trophies.continental) {
                trophies.continental.forEach((trophy: any) => {
                  teamAchievements.push(`${trophy.competition}: ${trophy.wins}`);
                });
              }
              
              // International trophies
              if (trophies.international) {
                trophies.international.forEach((trophy: any) => {
                  teamAchievements.push(`${trophy.competition}: ${trophy.wins}`);
                });
              }
              
              // Domestic league trophies
              if (trophies.domestic?.league) {
                trophies.domestic.league.forEach((trophy: any) => {
                  teamAchievements.push(`${trophy.competition}: ${trophy.wins}`);
                });
              }
              
              // Domestic cup trophies
              if (trophies.domestic?.cup) {
                trophies.domestic.cup.forEach((trophy: any) => {
                  teamAchievements.push(`${trophy.competition}: ${trophy.wins}`);
                });
              }
            }
            
            // Add major honors for national teams
            if (data.teamInfo.majorHonors) {
              data.teamInfo.majorHonors.forEach((honor: any) => {
                teamAchievements.push(`${honor.competition}: ${honor.titles} titles`);
              });
            }
            
            const teamData = {
              id: Date.now(),
              name: data.teamInfo.name,
              type: data.teamInfo.type || 'club',
              nicknames: data.teamInfo.nicknames || [],
              
              // Ranking
              fifaRanking: data.teamInfo.fifaRanking,
              ranking: data.teamInfo.fifaRanking || 'N/A',
              
              // Manager/Coach
              currentManager: data.teamInfo.currentManager,
              currentCoach: data.teamInfo.currentCoach,
              coach: data.teamInfo.currentManager?.name || 
                    data.teamInfo.currentCoach?.name || 'Unknown',
              
              // Stadium
              stadium: data.teamInfo.stadium || null,
              homeStadium: data.teamInfo.homeStadium,
              
              // Location
              location: data.teamInfo.location,
              
              // Basic info
              league: data.teamInfo.league || 'Unknown',
              founded: data.teamInfo.founded || 'Unknown',
              
              // Achievements - new structured format
              achievementsSummary: data.teamInfo.achievementsSummary || null,
              trophies: data.teamInfo.trophies || null,
              majorHonors: data.teamInfo.majorHonors || null,
              achievements: teamAchievements,
              
              // Squad
              currentSquad: data.teamInfo.currentSquad || null,
              keyPlayers: data.teamInfo.currentSquad?.keyPlayers || 
                        data.teamInfo.keyPlayers || [],
              captain: data.teamInfo.currentSquad?.captain,
              
              // Rivalries
              mainRivalries: data.teamInfo.mainRivalries || [],
              
              // Financial
              clubValue: data.teamInfo.clubValue,
              
              // National team specific
              fifaCode: data.teamInfo.fifaCode,
              confederation: data.teamInfo.confederation,
              playingStyle: data.teamInfo.playingStyle,
              
              // Records
              records: data.teamInfo.records || null,
              
              // Current season
              currentSeason: data.teamInfo.currentSeason || null
            };
            
            console.log('🏟️ Enhanced team data prepared with detailed trophies');
            console.log('📊 Trophy structure:', {
              continental: teamData.trophies?.continental?.length || 0,
              international: teamData.trophies?.international?.length || 0,
              domesticLeagues: teamData.trophies?.domestic?.league?.length || 0,
              domesticCups: teamData.trophies?.domestic?.cup?.length || 0
            });
            
            onTeamSelect(teamData);
          }
          else if (responseType === 'worldCup' && data.worldCupInfo) {
            console.log('🌍 Setting World Cup data');
            
            // Clear player and team data if switching to World Cup
            onPlayerSelect(null);
            onTeamSelect(null);
            
            const worldCupData = {
              year: data.worldCupInfo.year,
              edition: data.worldCupInfo.edition,
              host: data.worldCupInfo.host,
              hostCities: data.worldCupInfo.hostCities || [],
              qualifiedTeams: data.worldCupInfo.qualifiedTeams || [],
              venues: data.worldCupInfo.venues || [],
              defendingChampion: data.worldCupInfo.defendingChampion,
              mostTitles: data.worldCupInfo.mostTitles,
              details: data.worldCupInfo.details
            };
            
            console.log('🌍 World Cup data prepared');
            onWorldCupUpdate(worldCupData);
          }
          else {
            console.log('📝 General query - only showing analysis');
            // Clear all data for general queries
            onPlayerSelect(null);
            onTeamSelect(null);
            onWorldCupUpdate(null);
          }
          
          // Update analysis
          if (data.analysis) {
            console.log('💭 Setting analysis');
            onAnalysisUpdate(data.analysis);
          }
          
          // Update video
          if (data.youtubeUrl) {
            console.log('🎥 Setting video URL');
            onVideoFound(data.youtubeUrl);
          }
        } else {
          console.error('❌ API Error from response:', data.error);
          setError(data.error || 'Failed to fetch data');
          onAnalysisUpdate(`Error: ${data.error || 'Failed to fetch data'}`);
        }
      }
    } catch (error: any) {
      // Only show error if it's not an abort error
      if (error.name !== 'AbortError') {
        console.error('❌ Search failed:', error);
        setError('Network error. Please check your connection.');
        onAnalysisUpdate('Network error. Please check your connection and try again.');
      }
    } finally {
      cleanupSearch();
      onLoadingChange(false);
    }
  };

  const handleExampleClick = (example: string) => {
    // Trim the example query to remove any trailing spaces
    const trimmedExample = example.trim();
    setQuery(trimmedExample);
    setError(null);
    
    // Cancel any existing timeout
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }
    
    // Use setTimeout to ensure state is updated before search
    searchTimeoutRef.current = setTimeout(() => {
      const fakeEvent = { 
        preventDefault: () => {},
        currentTarget: { checkValidity: () => true }
      } as unknown as React.FormEvent<Element>;
      
      handleSearch(fakeEvent);
    }, 100);
  };

  // Cleanup on unmount
  useState(() => {
    return () => {
      cleanupSearch();
    };
  });

  const quickSearches = [
    'Messi', 
    'Cristiano Ronaldo',
    'Real Madrid', 
    'Barcelona',
    'Spain',
    'Brazil',
    'Argentina',
    'World Cup 2026',
    'Manchester City',
    'Bayern Munich',
    'Liverpool',
    'PSG'
  ];

  return (
    <div>
      <h2 style={{ fontSize: '1.75rem', fontWeight: 700, marginBottom: '1.5rem', color: 'white' }}>
        ⚽ Football AI Search
      </h2>
      
      {error && (
        <div style={{
          padding: '1rem',
          background: 'rgba(239, 68, 68, 0.1)',
          border: '1px solid rgba(239, 68, 68, 0.3)',
          borderRadius: '0.75rem',
          marginBottom: '1.5rem',
          color: '#ef4444',
          fontSize: '0.875rem',
        }}>
          ⚠️ {error}
        </div>
      )}
      
      <form onSubmit={handleSearch} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
        <div style={{ flex: 1, position: 'relative' }}>
          <div style={{
            position: 'absolute',
            left: '1rem',
            top: '50%',
            transform: 'translateY(-50%)',
            color: '#94a3b8',
            fontSize: '1.25rem',
            zIndex: 1,
          }}>
            🔍
          </div>
          <input
            type="text"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setError(null);
            }}
            placeholder="Search players, teams, World Cup 2026..."
            disabled={isSearching}
            style={{
              width: '100%',
              padding: '0.875rem 0.875rem 0.875rem 3rem',
              background: 'rgba(255, 255, 255, 0.1)',
              border: error ? '1px solid rgba(239, 68, 68, 0.5)' : '1px solid rgba(255, 255, 255, 0.2)',
              borderRadius: '0.75rem',
              color: 'white',
              fontSize: '1rem',
              outline: 'none',
              opacity: isSearching ? 0.7 : 1,
              cursor: isSearching ? 'not-allowed' : 'text',
            }}
          />
        </div>
        <button
          type="submit"
          disabled={isSearching}
          style={{
            padding: '0.875rem 1.5rem',
            background: isSearching 
              ? 'linear-gradient(to right, #64748b, #475569)' 
              : 'linear-gradient(to right, #4ade80, #22d3ee)',
            color: 'white',
            border: 'none',
            borderRadius: '0.75rem',
            fontWeight: 600,
            cursor: isSearching ? 'not-allowed' : 'pointer',
            transition: 'all 0.3s ease',
            fontSize: '1rem',
            width: '100%',
            opacity: isSearching ? 0.7 : 1,
          }}
          onMouseEnter={(e) => {
            if (!isSearching) {
              e.currentTarget.style.transform = 'translateY(-2px)';
              e.currentTarget.style.boxShadow = '0 10px 25px rgba(74, 222, 128, 0.3)';
            }
          }}
          onMouseLeave={(e) => {
            if (!isSearching) {
              e.currentTarget.style.transform = 'translateY(0)';
              e.currentTarget.style.boxShadow = 'none';
            }
          }}
        >
          {isSearching ? 'Searching...' : 'Search'}
        </button>
      </form>
      
      <div style={{ marginTop: '1.5rem' }}>
        <p style={{ color: '#94a3b8', fontSize: '0.875rem', marginBottom: '0.75rem' }}>
          Quick searches:
        </p>
        <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
          {quickSearches.map((term) => (
            <button
              key={term}
              type="button"
              onClick={() => handleExampleClick(term)}
              disabled={isSearching}
              style={{
                padding: '0.5rem 1rem',
                background: 'rgba(255, 255, 255, 0.1)',
                border: '1px solid rgba(255, 255, 255, 0.2)',
                borderRadius: '999px',
                color: 'white',
                fontSize: '0.875rem',
                cursor: isSearching ? 'not-allowed' : 'pointer',
                transition: 'all 0.2s ease',
                whiteSpace: 'nowrap',
                opacity: isSearching ? 0.6 : 1,
              }}
              onMouseEnter={(e) => {
                if (!isSearching) {
                  e.currentTarget.style.background = 'rgba(74, 222, 128, 0.2)';
                  e.currentTarget.style.borderColor = '#4ade80';
                }
              }}
              onMouseLeave={(e) => {
                if (!isSearching) {
                  e.currentTarget.style.background = 'rgba(255, 255, 255, 0.1)';
                  e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.2)';
                }
              }}
            >
              {term}
            </button>
          ))}
        </div>
      </div>
      
      <div style={{ marginTop: '1rem', fontSize: '0.875rem', color: '#94a3b8' }}>
        <p>Get detailed stats, trophy counts, current managers, and AI analysis</p>
        <p style={{ marginTop: '0.5rem', fontSize: '0.75rem', color: '#64748b' }}>
          Includes: Player stats • Club trophies • National team achievements • Video highlights
        </p>
      </div>
    </div>
  );
}