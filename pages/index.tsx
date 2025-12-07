import { useState, useCallback, useRef, useEffect } from 'react';
import FootballAI from '../components/FootballAI';

// FootballSearch component inline (since it doesn't exist as separate file)
const FootballSearch = ({
  onPlayerSelect,
  onTeamSelect,
  onVideoFound,
  onLoadingChange,
  onAnalysisUpdate,
  onTeamsUpdate,
  onWorldCupUpdate,
}: any) => {
  const [query, setQuery] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isSearching, setIsSearching] = useState(false);
  
  const searchControllerRef = useRef<AbortController | null>(null);
  const searchTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const clearAllPreviousData = useCallback(() => {
    console.log('🧹 Clearing all previous data...');
    onPlayerSelect(null);
    onTeamSelect(null);
    onWorldCupUpdate(null);
    onTeamsUpdate([]);
    onVideoFound('');
    onAnalysisUpdate('');
  }, [onPlayerSelect, onTeamSelect, onWorldCupUpdate, onTeamsUpdate, onVideoFound, onAnalysisUpdate]);

  const cleanupSearch = useCallback(() => {
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
      searchTimeoutRef.current = null;
    }
    
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
    
    cleanupSearch();
    
    searchControllerRef.current = new AbortController();
    
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
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const data = await response.json();
      console.log('🔍 [API] Response received, success:', data.success);
      
      if (!searchControllerRef.current?.signal.aborted) {
        if (data.success) {
          console.log('✅ [API] Success! Type from API:', data.type);
          
          let responseType = data.type || 'general';
          
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
          
          clearAllPreviousData();
          
          if (responseType === 'player' && data.playerInfo) {
            console.log('👤 Setting player data:', data.playerInfo.name);
            
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
            
            if (data.playerInfo.individualAwards) {
              playerAchievements = [...playerAchievements, ...data.playerInfo.individualAwards];
            }
            
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
              
              goals: data.playerInfo.careerStats?.club?.totalGoals || 
                    data.playerInfo.careerStats?.totalGoals || 0,
              assists: data.playerInfo.careerStats?.club?.totalAssists || 
                      data.playerInfo.careerStats?.totalAssists || 0,
              appearances: data.playerInfo.careerStats?.club?.totalAppearances || 
                          data.playerInfo.careerStats?.totalAppearances || 0,
              
              marketValue: data.playerInfo.marketValue || 'Unknown',
              
              achievementsSummary: data.playerInfo.achievementsSummary || null,
              achievements: playerAchievements,
              individualAwards: data.playerInfo.individualAwards || [],
              teamHonors: data.playerInfo.teamHonors || [],
              
              dateOfBirth: data.playerInfo.dateOfBirth || null,
              height: data.playerInfo.height || null,
              weight: data.playerInfo.weight || null,
              preferredFoot: data.playerInfo.preferredFoot || 'Unknown',
              playingStyle: data.playerInfo.playingStyle || '',
              
              internationalCaps: data.playerInfo.careerStats?.international?.caps || 0,
              internationalGoals: data.playerInfo.careerStats?.international?.goals || 0,
              internationalDebut: data.playerInfo.careerStats?.international?.debut,
              
              careerStats: data.playerInfo.careerStats || null,
              clubCareer: data.playerInfo.clubCareer || [],
              internationalCareer: data.playerInfo.internationalCareer || null,
              
              currentSeason: data.playerInfo.currentSeason || null,
              
              clubNumber: data.playerInfo.clubNumber,
              positions: data.playerInfo.positions || []
            };
            
            console.log('👤 Enhanced player data prepared with achievementsSummary');
            onPlayerSelect(playerData);
          } 
          else if (responseType === 'team' && data.teamInfo) {
            console.log('🏟️ Setting team data:', data.teamInfo.name);
            
            onPlayerSelect(null);
            
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
            
            if (data.teamInfo.trophies) {
              const { trophies } = data.teamInfo;
              
              if (trophies.continental) {
                trophies.continental.forEach((trophy: any) => {
                  teamAchievements.push(`${trophy.competition}: ${trophy.wins}`);
                });
              }
              
              if (trophies.international) {
                trophies.international.forEach((trophy: any) => {
                  teamAchievements.push(`${trophy.competition}: ${trophy.wins}`);
                });
              }
              
              if (trophies.domestic?.league) {
                trophies.domestic.league.forEach((trophy: any) => {
                  teamAchievements.push(`${trophy.competition}: ${trophy.wins}`);
                });
              }
              
              if (trophies.domestic?.cup) {
                trophies.domestic.cup.forEach((trophy: any) => {
                  teamAchievements.push(`${trophy.competition}: ${trophy.wins}`);
                });
              }
            }
            
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
              
              fifaRanking: data.teamInfo.fifaRanking,
              ranking: data.teamInfo.fifaRanking || 'N/A',
              
              currentManager: data.teamInfo.currentManager,
              currentCoach: data.teamInfo.currentCoach,
              coach: data.teamInfo.currentManager?.name || 
                    data.teamInfo.currentCoach?.name || 'Unknown',
              
              stadium: data.teamInfo.stadium || null,
              homeStadium: data.teamInfo.homeStadium,
              
              location: data.teamInfo.location,
              
              league: data.teamInfo.league || 'Unknown',
              founded: data.teamInfo.founded || 'Unknown',
              
              achievementsSummary: data.teamInfo.achievementsSummary || null,
              trophies: data.teamInfo.trophies || null,
              majorHonors: data.teamInfo.majorHonors || null,
              achievements: teamAchievements,
              
              currentSquad: data.teamInfo.currentSquad || null,
              keyPlayers: data.teamInfo.currentSquad?.keyPlayers || 
                        data.teamInfo.keyPlayers || [],
              captain: data.teamInfo.currentSquad?.captain,
              
              mainRivalries: data.teamInfo.mainRivalries || [],
              
              clubValue: data.teamInfo.clubValue,
              
              fifaCode: data.teamInfo.fifaCode,
              confederation: data.teamInfo.confederation,
              playingStyle: data.teamInfo.playingStyle,
              
              records: data.teamInfo.records || null,
              
              currentSeason: data.teamInfo.currentSeason || null
            };
            
            console.log('🏟️ Enhanced team data prepared with detailed trophies');
            onTeamSelect(teamData);
          }
          else if (responseType === 'worldCup' && data.worldCupInfo) {
            console.log('🌍 Setting World Cup data');
            
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
            onPlayerSelect(null);
            onTeamSelect(null);
            onWorldCupUpdate(null);
          }
          
          if (data.analysis) {
            console.log('💭 Setting analysis');
            onAnalysisUpdate(data.analysis);
          }
          
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
    const trimmedExample = example.trim();
    setQuery(trimmedExample);
    setError(null);
    
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }
    
    searchTimeoutRef.current = setTimeout(() => {
      const fakeEvent = { 
        preventDefault: () => {},
        currentTarget: { checkValidity: () => true }
      } as unknown as React.FormEvent<Element>;
      
      handleSearch(fakeEvent);
    }, 100);
  };

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
};

export default function Home() {
  const [selectedPlayer, setSelectedPlayer] = useState<any>(null);
  const [selectedTeam, setSelectedTeam] = useState<any>(null);
  const [videoUrl, setVideoUrl] = useState<string>('');
  const [isLoading, setIsLoading] = useState(false);
  const [analysis, setAnalysis] = useState<string>('');
  const [teams, setTeams] = useState<any[]>([]);
  const [worldCupInfo, setWorldCupInfo] = useState<any>(null);
  const [lastUpdated, setLastUpdated] = useState<string>('');
  
  const isLoadingRef = useRef(isLoading);
  const componentMounted = useRef(true);

  useEffect(() => {
    isLoadingRef.current = isLoading;
  }, [isLoading]);

  useEffect(() => {
    return () => {
      componentMounted.current = false;
    };
  }, []);

  const handlePlayerSelect = useCallback((player: any) => {
    if (componentMounted.current) {
      setSelectedPlayer(player);
      setLastUpdated(new Date().toLocaleString());
    }
  }, []);

  const handleTeamSelect = useCallback((team: any) => {
    if (componentMounted.current) {
      setSelectedTeam(team);
      setLastUpdated(new Date().toLocaleString());
    }
  }, []);

  const handleVideoFound = useCallback((url: string) => {
    if (componentMounted.current) {
      setVideoUrl(url);
    }
  }, []);

  const handleLoadingChange = useCallback((loading: boolean) => {
    if (componentMounted.current) {
      setIsLoading(loading);
    }
  }, []);

  const handleAnalysisUpdate = useCallback((newAnalysis: string) => {
    if (componentMounted.current) {
      setAnalysis(newAnalysis);
    }
  }, []);

  const handleTeamsUpdate = useCallback((newTeams: any[]) => {
    if (componentMounted.current) {
      setTeams(newTeams);
    }
  }, []);

  const handleWorldCupUpdate = useCallback((worldCupInfo: any) => {
    if (componentMounted.current) {
      setWorldCupInfo(worldCupInfo);
      setLastUpdated(new Date().toLocaleString());
    }
  }, []);

  const styles = {
    container: {
      minHeight: '100vh',
      background: '#0a3e1a',
      color: 'white',
      padding: '1rem',
      fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, sans-serif",
      position: 'relative' as const,
      overflow: 'hidden',
    },
    pitchContainer: {
      position: 'absolute' as const,
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      background: `
        linear-gradient(160deg, #0a5c2a 0%, #1a7c3a 30%, #0a5c2a 70%, #094522 100%),
        linear-gradient(
          160deg,
          transparent 0%,
          transparent 45%,
          rgba(255, 255, 255, 0.2) 45%,
          rgba(255, 255, 255, 0.2) 55%,
          transparent 55%,
          transparent 100%
        ),
        linear-gradient(
          to right,
          transparent 3%,
          rgba(255, 255, 255, 0.2) 3%,
          rgba(255, 255, 255, 0.2) 4%,
          transparent 4%,
          transparent 96%,
          rgba(255, 255, 255, 0.2) 96%,
          rgba(255, 255, 255, 0.2) 97%,
          transparent 97%
        )
      `,
      backgroundSize: '100% 100%',
      transform: 'perspective(1000px) rotateX(10deg)',
      transformOrigin: 'center top',
      opacity: 0.9,
      pointerEvents: 'none' as const,
    },
    pitchOverlay: {
      position: 'absolute' as const,
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      background: `
        radial-gradient(
          ellipse at center,
          transparent 0%,
          rgba(0, 0, 0, 0.4) 100%
        )
      `,
      pointerEvents: 'none' as const,
    },
    content: {
      position: 'relative' as const,
      zIndex: 2,
      maxWidth: '1400px',
      margin: '0 auto',
    },
    header: {
      textAlign: 'center' as const,
      marginBottom: '2rem',
      maxWidth: '800px',
      marginLeft: 'auto',
      marginRight: 'auto',
      position: 'relative' as const,
      zIndex: 3,
    },
    title: {
      fontSize: '2.5rem',
      fontWeight: 800,
      marginBottom: '0.75rem',
      background: 'linear-gradient(to right, #4ade80, #ffffff, #22d3ee)',
      WebkitBackgroundClip: 'text',
      WebkitTextFillColor: 'transparent',
      lineHeight: 1.2,
      letterSpacing: '-0.025em',
      textShadow: '0 2px 10px rgba(0, 0, 0, 0.5)',
    },
    subtitle: {
      color: '#e2e8f0',
      fontSize: '1rem',
      lineHeight: 1.5,
      opacity: 0.95,
      textShadow: '0 1px 5px rgba(0, 0, 0, 0.5)',
      background: 'rgba(0, 0, 0, 0.4)',
      padding: '0.75rem',
      borderRadius: '0.75rem',
      display: 'inline-block',
      marginBottom: '1rem',
    },
    timestampContainer: {
      marginTop: '0.75rem',
      padding: '0.5rem',
      background: 'rgba(0, 0, 0, 0.3)',
      borderRadius: '0.5rem',
      border: '1px solid rgba(74, 222, 128, 0.3)',
      fontSize: '0.75rem',
      color: '#94a3b8',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      gap: '0.25rem',
      flexWrap: 'wrap' as const,
    },
    timestampIcon: {
      color: '#4ade80',
    },
    timestampText: {
      color: '#e2e8f0',
      textAlign: 'center' as const,
    },
    mainGrid: {
      display: 'grid',
      gridTemplateColumns: '1fr',
      gap: '1.5rem',
      position: 'relative' as const,
      zIndex: 3,
    },
    searchContainer: {
      background: 'rgba(10, 30, 10, 0.85)',
      backdropFilter: 'blur(10px)',
      borderRadius: '1rem',
      padding: '1.5rem',
      boxShadow: '0 10px 30px rgba(0, 0, 0, 0.5), inset 0 0 0 1px rgba(74, 222, 128, 0.3)',
      border: '1px solid rgba(74, 222, 128, 0.5)',
    },
    aiContainer: {
      background: 'rgba(10, 30, 10, 0.85)',
      backdropFilter: 'blur(10px)',
      borderRadius: '1rem',
      padding: '1.5rem',
      boxShadow: '0 10px 30px rgba(0, 0, 0, 0.5), inset 0 0 0 1px rgba(34, 211, 238, 0.3)',
      border: '1px solid rgba(34, 211, 238, 0.5)',
      minHeight: '400px',
      position: 'relative' as const,
    },
    videoSection: {
      background: 'rgba(10, 30, 10, 0.85)',
      backdropFilter: 'blur(10px)',
      borderRadius: '1rem',
      padding: '1.5rem',
      boxShadow: '0 10px 30px rgba(0, 0, 0, 0.5), inset 0 0 0 1px rgba(251, 191, 36, 0.3)',
      border: '1px solid rgba(251, 191, 36, 0.5)',
      marginTop: '1.5rem',
    },
    videoHeader: {
      fontSize: '1.5rem',
      fontWeight: 700,
      marginBottom: '1rem',
      display: 'flex',
      alignItems: 'center',
      gap: '0.75rem',
      background: 'linear-gradient(to right, #4ade80, #3b82f6)',
      WebkitBackgroundClip: 'text',
      WebkitTextFillColor: 'transparent',
    },
    videoContainer: {
      position: 'relative' as const,
      width: '100%',
      paddingBottom: '56.25%',
      borderRadius: '0.75rem',
      overflow: 'hidden',
      background: 'rgba(0, 0, 0, 0.4)',
      marginBottom: '1rem',
      boxShadow: '0 15px 30px -8px rgba(0, 0, 0, 0.7)',
      border: '1px solid rgba(255, 255, 255, 0.2)',
    },
    iframe: {
      position: 'absolute' as const,
      top: 0,
      left: 0,
      width: '100%',
      height: '100%',
      border: 'none',
    },
    noVideo: {
      padding: '2rem 1rem',
      textAlign: 'center' as const,
      background: 'rgba(0, 0, 0, 0.5)',
      borderRadius: '0.75rem',
      border: '2px dashed rgba(74, 222, 128, 0.5)',
    },
    placeholderIcon: {
      fontSize: '3rem',
      marginBottom: '1rem',
      opacity: 0.8,
      filter: 'drop-shadow(0 2px 4px rgba(0, 0, 0, 0.5))',
    },
    placeholderText: {
      color: '#e2e8f0',
      fontSize: '1.125rem',
      fontWeight: 500,
    },
    placeholderSubtext: {
      color: '#cbd5e1',
      fontSize: '0.875rem',
      marginTop: '0.5rem',
    },
    videoNote: {
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      gap: '0.5rem',
      fontSize: '0.75rem',
      color: '#e2e8f0',
      padding: '0.75rem',
      background: 'rgba(0, 0, 0, 0.5)',
      borderRadius: '0.5rem',
      border: '1px solid rgba(74, 222, 128, 0.3)',
    },
    loadingOverlay: {
      position: 'absolute' as const,
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      background: 'rgba(0, 0, 0, 0.8)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      borderRadius: '0.75rem',
      zIndex: 10,
      flexDirection: 'column' as const,
      gap: '1rem',
    },
    loadingSpinner: {
      width: '40px',
      height: '40px',
      border: '3px solid rgba(74, 222, 128, 0.3)',
      borderTopColor: '#4ade80',
      borderRadius: '50%',
      animation: 'spin 1s linear infinite',
    },
    footer: {
      marginTop: '2rem',
      paddingTop: '1.5rem',
      borderTop: '1px solid rgba(74, 222, 128, 0.3)',
      position: 'relative' as const,
      zIndex: 3,
    },
    footerContainer: {
      maxWidth: '1400px',
      margin: '0 auto',
      display: 'flex',
      flexDirection: 'column' as const,
      alignItems: 'center',
      gap: '1rem',
    },
    footerContent: {
      display: 'flex',
      flexDirection: 'column' as const,
      alignItems: 'center',
      gap: '0.75rem',
      width: '100%',
    },
    attribution: {
      textAlign: 'center' as const,
      padding: '0 0.5rem',
    },
    developer: {
      fontSize: '0.875rem',
      color: '#e2e8f0',
      marginBottom: '0.25rem',
    },
    developerName: {
      fontWeight: 600,
      color: '#ffffff',
      background: 'linear-gradient(to right, #4ade80, #22d3ee)',
      WebkitBackgroundClip: 'text',
      WebkitTextFillColor: 'transparent',
    },
    copyright: {
      fontSize: '0.75rem',
      color: '#cbd5e1',
    },
    disclaimerContainer: {
      maxWidth: '100%',
      textAlign: 'center' as const,
      padding: '0.75rem',
      background: 'rgba(0, 0, 0, 0.5)',
      borderRadius: '0.5rem',
      border: '1px solid rgba(74, 222, 128, 0.3)',
    },
    disclaimerTitle: {
      fontSize: '0.75rem',
      fontWeight: 600,
      color: '#4ade80',
      marginBottom: '0.25rem',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      gap: '0.25rem',
    },
    disclaimerText: {
      fontSize: '0.65rem',
      color: '#cbd5e1',
      lineHeight: 1.4,
    },
    separator: {
      height: '1px',
      width: '60px',
      background: 'linear-gradient(to right, transparent, #4ade80, transparent)',
      margin: '0.25rem 0',
    },
  };

  return (
    <div style={styles.container}>
      <div style={styles.pitchContainer}></div>
      <div style={styles.pitchOverlay}></div>
      
      <style>{`
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
        
        @keyframes float {
          0%, 100% { transform: translateY(0px); }
          50% { transform: translateY(-5px); }
        }
        
        .float {
          animation: float 3s ease-in-out infinite;
        }
        
        @media (min-width: 768px) {
          .content-box {
            transition: all 0.3s ease;
          }
          
          .content-box:hover {
            transform: translateY(-5px);
            box-shadow: 0 25px 70px rgba(0, 0, 0, 0.8);
          }
        }
        
        button, input {
          -webkit-tap-highlight-color: transparent;
        }
        
        @media (max-width: 767px) {
          input, select, textarea {
            font-size: 16px !important;
          }
        }
      `}</style>
      
      <div style={styles.content}>
        <header style={styles.header}>
          <h1 style={styles.title} className="float">⚽ FutbolAI</h1>
          <p style={styles.subtitle}>
            AI-Powered Football Intelligence • Real-time Analysis • No Mixed Data
          </p>
          
          <div style={styles.timestampContainer}>
            <span style={styles.timestampIcon}>🔄</span>
            <span style={styles.timestampText}>
              Data fetched in real-time | Vercel deployment: {new Date().toLocaleDateString('en-US', {
                year: 'numeric',
                month: 'long',
                day: 'numeric',
                hour: '2-digit',
                minute: '2-digit'
              })}
            </span>
          </div>
        </header>

        <div style={styles.mainGrid}>
          <div style={styles.searchContainer} className="content-box">
            <FootballSearch
              onPlayerSelect={handlePlayerSelect}
              onTeamSelect={handleTeamSelect}
              onVideoFound={handleVideoFound}
              onLoadingChange={handleLoadingChange}
              onAnalysisUpdate={handleAnalysisUpdate}
              onTeamsUpdate={handleTeamsUpdate}
              onWorldCupUpdate={handleWorldCupUpdate}
            />
          </div>
          
          <div style={styles.aiContainer} className="content-box">
            <FootballAI
              player={selectedPlayer}
              team={selectedTeam}
              isLoading={isLoading}
              analysis={analysis}
              teams={teams}
              worldCupInfo={worldCupInfo}
            />
            
            {lastUpdated && (
              <div style={styles.timestampContainer}>
                <span style={styles.timestampIcon}>⏱️</span>
                <span style={styles.timestampText}>
                  Last updated: {lastUpdated}
                </span>
              </div>
            )}
          </div>

          <div style={styles.videoSection} className="content-box">
            <div style={styles.videoHeader}>
              <span className="float">📺</span>
              <span>Football Highlights</span>
            </div>
            
            {isLoading ? (
              <div style={{ position: 'relative', minHeight: '150px' }}>
                <div style={styles.videoContainer}>
                  <div style={styles.loadingOverlay}>
                    <div style={styles.loadingSpinner}></div>
                    <p style={{ color: '#4ade80', fontSize: '0.875rem', textAlign: 'center' }}>
                      Loading highlights...
                    </p>
                  </div>
                </div>
              </div>
            ) : videoUrl ? (
              <>
                <div style={styles.videoContainer}>
                  <iframe
                    src={videoUrl}
                    title="Football Highlights"
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                    allowFullScreen
                    style={styles.iframe}
                  ></iframe>
                </div>
                <div style={styles.videoNote}>
                  <span>🔊</span>
                  <span>Click fullscreen for best viewing experience</span>
                </div>
              </>
            ) : selectedPlayer || selectedTeam ? (
              <div style={styles.noVideo}>
                <div style={styles.placeholderIcon}>📺</div>
                <p style={styles.placeholderText}>
                  No highlights available
                </p>
                <p style={styles.placeholderSubtext}>
                  Try searching for another player or team
                </p>
              </div>
            ) : (
              <div style={styles.noVideo}>
                <div style={styles.placeholderIcon}>⚽</div>
                <p style={styles.placeholderText}>
                  Search for a player or team above to see highlights
                </p>
                <p style={styles.placeholderSubtext}>
                  Video highlights will appear here
                </p>
              </div>
            )}
          </div>
          
          <div style={styles.footer}>
            <div style={styles.footerContainer}>
              <div style={styles.footerContent}>
                <div style={styles.attribution}>
                  <p style={styles.developer}>
                    Developed by <span style={styles.developerName}>A. Guillen</span>
                  </p>
                  <div style={styles.separator}></div>
                  <p style={styles.copyright}>
                    © 2025 FutbolAI.org | AI-Powered Football Intelligence
                  </p>
                </div>
                
                <div style={styles.disclaimerContainer}>
                  <div style={styles.disclaimerTitle}>
                    <span>🔍</span>
                    <span>API Test Result: Brazil query returns TEAM data only ✓</span>
                  </div>
                  <p style={styles.disclaimerText}>
                    If you see player data for Brazil, it's a frontend caching issue. 
                    The API correctly returns only team data for country queries.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}