// components/footballsearch.tsx - SIMPLIFIED, RELIES ON GROQSERVICE FOR VERIFICATION
'use client'

import { useState, useRef, useCallback, useEffect } from 'react';
import { useRouter } from 'next/navigation';

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
  const router = useRouter();
  const [query, setQuery] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isSearching, setIsSearching] = useState(false);
  const [confidence, setConfidence] = useState<number | null>(null);
  const [verificationSource, setVerificationSource] = useState<string | null>(null);
  
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
    setConfidence(null);
    setVerificationSource(null);
    setError(null);
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

  // Handle World Cup 2026 button click
  const handleWorldCup2026Click = () => {
    router.push('/worldcup-2026');
  };

  // Check if query is related to World Cup 2026
  const isWorldCup2026Query = (searchQuery: string): boolean => {
    const worldCupTerms = [
      '2026 fifa world cup',
      'fifa world cup 2026',
      'world cup 2026',
      'worldcup 2026',
      'fifa 2026',
      'copa mundial 2026',
      'mundial 2026',
      'world cup north america',
      'world cup usa canada mexico'
    ];
    
    const normalizedQuery = searchQuery.toLowerCase().trim();
    return worldCupTerms.some(term => normalizedQuery.includes(term));
  };

  // Confidence badge component
  const ConfidenceBadge = ({ score, source }: { score: number | null; source: string | null }) => {
    if (!score) return null;
    
    let color = 'gray';
    let text = 'Low Confidence';
    let icon = '❓';
    
    if (score >= 90) {
      color = 'green';
      text = 'Verified Database';
      icon = '✅';
    } else if (score >= 80) {
      color = 'green';
      text = 'SportsDB Verified';
      icon = '🔍';
    } else if (score >= 60) {
      color = 'yellow';
      text = 'Wikipedia';
      icon = '📚';
    } else if (score >= 30) {
      color = 'orange';
      text = 'AI Generated';
      icon = '🤖';
    } else {
      color = 'red';
      text = 'Error Fallback';
      icon = '⚠️';
    }
    
    return (
      <div style={{
        display: 'inline-flex',
        alignItems: 'center',
        padding: '0.25rem 0.75rem',
        background: `rgba(${color === 'green' ? '34, 197, 94' : color === 'yellow' ? '234, 179, 8' : color === 'orange' ? '255, 165, 0' : '239, 68, 68'}, 0.1)`,
        border: `1px solid rgba(${color === 'green' ? '34, 197, 94' : color === 'yellow' ? '234, 179, 8' : color === 'orange' ? '255, 165, 0' : '239, 68, 68'}, 0.3)`,
        borderRadius: '999px',
        fontSize: '0.75rem',
        fontWeight: 500,
        color: `rgb(${color === 'green' ? '34, 197, 94' : color === 'yellow' ? '234, 179, 8' : color === 'orange' ? '255, 165, 0' : '239, 68, 68'})`,
        marginLeft: '0.5rem'
      }}>
        <span style={{ marginRight: '0.25rem' }}>{icon}</span>
        {source ? `${text} (${source})` : text} • {score}%
      </div>
    );
  };

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!query.trim() || isSearching) return;

    console.log('🔍 [SEARCH] Starting search for:', query);
    
    // Check if this is a World Cup 2026 query
    if (isWorldCup2026Query(query)) {
      console.log('🌍 Detected World Cup 2026 query, redirecting...');
      handleWorldCup2026Click();
      return;
    }
    
    setIsSearching(true);
    onLoadingChange(true);
    setError(null);
    setConfidence(null);
    setVerificationSource(null);
    
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
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const data = await response.json();
      console.log('🔍 [API] Response received, success:', data.success);
      
      if (!searchControllerRef.current?.signal.aborted) {
        if (data.success) {
          console.log('✅ [API] Success! Type from API:', data.type);
          console.log('✅ [API] Metadata:', data._metadata);
          
          // Clear all data again before setting new data
          clearAllPreviousData();
          
          // Set confidence from metadata
          if (data._metadata?.confidence) {
            setConfidence(data._metadata.confidence);
            setVerificationSource(data._metadata.source || null);
          }
          
          if (data.type === 'player' && data.playerInfo) {
            console.log('👤 Setting player data:', data.playerInfo.name);
            
            // Process player achievements
            let playerAchievements = [];
            if (data.playerInfo.achievementsSummary) {
              const { achievementsSummary } = data.playerInfo;
              
              if (achievementsSummary.worldCupTitles > 0) {
                playerAchievements.push(`World Cup Titles: ${achievementsSummary.worldCupTitles}`);
              }
              if (achievementsSummary.continentalTitles > 0) {
                playerAchievements.push(`Continental Titles: ${achievementsSummary.continentalTitles}`);
              }
              if (achievementsSummary.clubDomesticTitles?.leagues > 0) {
                playerAchievements.push(`Domestic Leagues: ${achievementsSummary.clubDomesticTitles.leagues}`);
              }
              if (achievementsSummary.clubDomesticTitles?.cups > 0) {
                playerAchievements.push(`Domestic Cups: ${achievementsSummary.clubDomesticTitles.cups}`);
              }
              
              if (achievementsSummary.individualAwards && Array.isArray(achievementsSummary.individualAwards)) {
                achievementsSummary.individualAwards.forEach((award: string) => {
                  playerAchievements.push(award);
                });
              }
            }
            
            const playerData = {
              id: Date.now(),
              name: data.playerInfo.name || query,
              fullName: data.playerInfo.name || query,
              position: data.playerInfo.position || 'Unknown',
              nationality: data.playerInfo.nationality || 'Unknown',
              currentClub: data.playerInfo.currentClub || 'Unknown',
              age: data.playerInfo.age || null,
              careerStats: data.playerInfo.careerStats || null,
              goals: data.playerInfo.careerStats?.club?.totalGoals || 0,
              assists: data.playerInfo.careerStats?.club?.totalAssists || 0,
              appearances: data.playerInfo.careerStats?.club?.totalAppearances || 0,
              marketValue: data.playerInfo.marketValue || 'Unknown',
              achievementsSummary: data.playerInfo.achievementsSummary || null,
              achievements: playerAchievements,
              dateOfBirth: data.playerInfo.dateOfBirth || null,
              height: data.playerInfo.height || null,
              weight: data.playerInfo.weight || null,
              preferredFoot: data.playerInfo.preferredFoot || 'Unknown',
              playingStyle: data.playerInfo.playingStyle || '',
              internationalCaps: data.playerInfo.careerStats?.international?.caps || 0,
              internationalGoals: data.playerInfo.careerStats?.international?.goals || 0,
              internationalDebut: data.playerInfo.careerStats?.international?.debut,
              currentYear: data.playerInfo.currentYear || new Date().getFullYear(),
              lastUpdated: data.playerInfo.lastUpdated || new Date().toISOString(),
              language: data.language,
              isSpanish: data.isSpanish,
              _confidence: data._metadata?.confidence || 70,
              _source: data._metadata?.source || 'Unknown',
              _verified: data._metadata?.verified || false,
              _verificationSteps: data._metadata?.verificationSteps || []
            };
            
            console.log('👤 Enhanced player data prepared');
            onPlayerSelect(playerData);
          } 
          else if ((data.type === 'club' || data.type === 'national') && data.teamInfo) {
            console.log('🏟️ Setting team data:', data.teamInfo.name);
            console.log('🏟️ Source:', data._metadata?.source);
            console.log('🏟️ Confidence:', data._metadata?.confidence);
            console.log('🏟️ Verified:', data._metadata?.verified);
            
            // Clear player data
            onPlayerSelect(null);
            
            // Initialize achievements structure
            const majorAchievements = data.teamInfo.majorAchievements || {
              worldCup: [] as string[],
              international: [] as string[],
              continental: [] as string[],
              domestic: [] as string[]
            };
            
            // Process team achievements from Groq data
            let teamAchievements: string[] = data.teamInfo.achievements || [];
            
            // If no achievements array but we have majorAchievements, build it
            if (teamAchievements.length === 0) {
              teamAchievements = [
                ...(majorAchievements.worldCup || []),
                ...(majorAchievements.international || []),
                ...(majorAchievements.continental || []),
                ...(majorAchievements.domestic || [])
              ];
            }

            const teamData = {
              id: Date.now(),
              name: data.teamInfo.name || query,
              type: data.teamInfo.type || 'club',
              fifaRanking: data.teamInfo.fifaRanking,
              ranking: data.teamInfo.fifaRanking || 'N/A',
              currentManager: data.teamInfo.currentManager || null,
              currentCoach: data.teamInfo.currentCoach || 'Unknown',
              coach: data.teamInfo.currentCoach || 'Unknown',
              stadium: data.teamInfo.stadium || null,
              homeStadium: data.teamInfo.homeStadium || data.teamInfo.stadium,
              league: data.teamInfo.league || 'Unknown',
              founded: data.teamInfo.founded || 'Unknown',
              achievementsSummary: data.teamInfo.achievementsSummary || null,
              trophies: data.teamInfo.trophies || null,
              majorHonors: data.teamInfo.majorHonors || null,
              achievements: teamAchievements,
              majorAchievements,
              squad: data.teamInfo.squad || [],
              currentSeason: data.teamInfo.currentSeason || null,
              currentYear: data.teamInfo.currentYear || new Date().getFullYear(),
              lastUpdated: data.teamInfo.lastUpdated || new Date().toISOString(),
              playingStyle: data.teamInfo.playingStyle,
              confederation: data.teamInfo.confederation,
              fifaCode: data.teamInfo.fifaCode,
              language: data.language,
              isSpanish: data.isSpanish,
              _confidence: data._metadata?.confidence || 70,
              _source: data._metadata?.source || 'Unknown',
              _verified: data._metadata?.verified || false,
              _verificationSteps: data._metadata?.verificationSteps || [],
              _hasSquad: data._metadata?.hasSquad || false,
              _warning: data._metadata?.warning || null
            };
            
            console.log(`🏟️ Team data: ${teamData.name} | Confidence: ${teamData._confidence}% | Verified: ${teamData._verified} | Source: ${teamData._source}`);
            
            onTeamSelect(teamData);
          }
          else if (data.type === 'worldcup' && data.worldCupInfo) {
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
              details: data.worldCupInfo.details,
              currentYear: data.worldCupInfo.currentYear || new Date().getFullYear(),
              lastUpdated: data.worldCupInfo.lastUpdated || new Date().toISOString(),
              language: data.language,
              isSpanish: data.isSpanish
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
          
          // Update analysis
          if (data.analysis) {
            console.log('💭 Setting analysis');
            onAnalysisUpdate(data.analysis);
          }
          
          // Update video
          if (data.youtubeUrl) {
            console.log('🎥 Setting video URL:', data.youtubeUrl);
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
    if (example.toLowerCase().includes('2026')) {
      console.log('🌍 Quick search for World Cup 2026, redirecting...');
      handleWorldCup2026Click();
      return;
    }
    
    const trimmedExample = example.trim();
    setQuery(trimmedExample);
    setError(null);
    setConfidence(null);
    setVerificationSource(null);
    
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
      searchTimeoutRef.current = null;
    }
    
    if (searchControllerRef.current) {
      searchControllerRef.current.abort();
      searchControllerRef.current = null;
    }
    
    clearAllPreviousData();
    
    console.log('🔍 [QUICK SEARCH] Starting search for:', trimmedExample);
    setIsSearching(true);
    onLoadingChange(true);
    
    searchControllerRef.current = new AbortController();
    
    const performQuickSearch = async () => {
      try {
        const apiUrl = `/api/ai?action=search&query=${encodeURIComponent(trimmedExample)}`;
        console.log('🔍 [API] Quick search calling:', apiUrl);
        
        const response = await fetch(apiUrl, {
          signal: searchControllerRef.current?.signal,
          headers: { 'Accept': 'application/json' }
        });
        
        if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
        
        const data = await response.json();
        
        if (!searchControllerRef.current?.signal.aborted) {
          if (data.success) {
            console.log('✅ [API] Quick search success! Type:', data.type);
            console.log('✅ [API] Metadata:', data._metadata);
            
            clearAllPreviousData();
            
            if (data._metadata?.confidence) {
              setConfidence(data._metadata.confidence);
              setVerificationSource(data._metadata.source || null);
            }
            
            if (data.type === 'player' && data.playerInfo) {
              const playerData = {
                id: Date.now(),
                name: data.playerInfo.name || trimmedExample,
                position: data.playerInfo.position || 'Unknown',
                nationality: data.playerInfo.nationality || 'Unknown',
                currentClub: data.playerInfo.currentClub || 'Unknown',
                age: data.playerInfo.age || null,
                achievementsSummary: data.playerInfo.achievementsSummary || null,
                dateOfBirth: data.playerInfo.dateOfBirth || null,
                height: data.playerInfo.height || null,
                preferredFoot: data.playerInfo.preferredFoot || 'Unknown',
                playingStyle: data.playerInfo.playingStyle || '',
                careerStats: data.playerInfo.careerStats || null,
                _confidence: data._metadata?.confidence || 70,
                _source: data._metadata?.source || 'Unknown',
                _verified: data._metadata?.verified || false
              };
              
              onPlayerSelect(playerData);
            } 
            else if ((data.type === 'club' || data.type === 'national') && data.teamInfo) {
              const teamData = {
                id: Date.now(),
                name: data.teamInfo.name || trimmedExample,
                type: data.teamInfo.type || 'club',
                fifaRanking: data.teamInfo.fifaRanking,
                league: data.teamInfo.league || 'Unknown',
                founded: data.teamInfo.founded || 'Unknown',
                achievementsSummary: data.teamInfo.achievementsSummary || null,
                stadium: data.teamInfo.stadium || null,
                currentManager: data.teamInfo.currentManager || null,
                currentCoach: data.teamInfo.currentCoach || 'Unknown',
                coach: data.teamInfo.currentCoach || 'Unknown',
                trophies: data.teamInfo.trophies || null,
                squad: data.teamInfo.squad || [],
                achievements: data.teamInfo.achievements || [],
                majorAchievements: data.teamInfo.majorAchievements || {
                  worldCup: [], international: [], continental: [], domestic: []
                },
                _confidence: data._metadata?.confidence || 70,
                _source: data._metadata?.source || 'Unknown',
                _verified: data._metadata?.verified || false,
                _hasSquad: data._metadata?.hasSquad || false,
                _warning: data._metadata?.warning || null
              };
              
              onTeamSelect(teamData);
            }
            
            if (data.analysis) onAnalysisUpdate(data.analysis);
            if (data.youtubeUrl) onVideoFound(data.youtubeUrl);
            
          } else {
            setError(data.error || 'Failed to fetch data');
            onAnalysisUpdate(`Error: ${data.error || 'Failed to fetch data'}`);
          }
        }
      } catch (error: any) {
        if (error.name !== 'AbortError') {
          console.error('❌ Quick search failed:', error);
          setError('Search failed. Please try again.');
          onAnalysisUpdate('Search failed. Please try again.');
        }
      } finally {
        setIsSearching(false);
        onLoadingChange(false);
      }
    };
    
    performQuickSearch();
  };

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      cleanupSearch();
    };
  }, [cleanupSearch]);

  const quickSearches = [
    'Real Madrid', 
    'Argentina',
    'FC Barcelona',
    'Manchester City',
    'Brazil',
    'Bayern Munich',
    'Liverpool FC',
    'Paris Saint-Germain',
    'Selección Española',
    'Selección Brasileña',
    'Selección Argentina',
    'Copa Mundial 2026',
    'FIFA World Cup 2026'
  ];

  return (
    <div>
      <div style={{ 
        display: 'flex', 
        alignItems: 'center', 
        marginBottom: '1.5rem',
        flexWrap: 'wrap',
        gap: '0.5rem'
      }}>
        <h2 style={{ 
          fontSize: '1.75rem', 
          fontWeight: 700, 
          color: 'white', 
          margin: 0,
          display: 'flex',
          alignItems: 'center',
          gap: '0.5rem'
        }}>
          <span>⚽</span> Football AI Search
        </h2>
        <ConfidenceBadge score={confidence} source={verificationSource} />
      </div>
      
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
      
      {/* World Cup 2026 Banner */}
      <div style={{
        marginBottom: '1.5rem',
        padding: '1rem',
        background: 'linear-gradient(135deg, #0066b2 0%, #002244 50%, #DBA506 100%)',
        borderRadius: '0.75rem',
        border: '2px solid rgba(255, 255, 255, 0.3)',
        position: 'relative',
        overflow: 'hidden',
      }}>
        <div style={{
          position: 'absolute',
          top: 0,
          right: 0,
          bottom: 0,
          width: '100px',
          background: 'url("https://digitalhub.fifa.com/transform/8858ac27-b36a-4542-9505-76e3ee5d5d4d/Groups-and-match-ups-revealed-for-game-changing-FIFA-World-Cup-2026?focuspoint=0.52,0.5&io=transform:fill,width:300&quality=75")',
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          opacity: 0.3,
        }}></div>
        
        <div style={{ position: 'relative', zIndex: 2 }}>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '1rem',
            marginBottom: '0.75rem',
          }}>
            <div style={{
              fontSize: '2rem',
              background: 'rgba(255, 255, 255, 0.2)',
              padding: '0.5rem',
              borderRadius: '50%',
            }}>
              🏆
            </div>
            <div>
              <h3 style={{
                fontSize: '1.25rem',
                fontWeight: 700,
                color: 'white',
                marginBottom: '0.25rem',
              }}>
                2026 FIFA World Cup
              </h3>
              <p style={{
                fontSize: '0.875rem',
                color: 'rgba(255, 255, 255, 0.9)',
              }}>
                North America • June 11 - July 19, 2026
              </p>
            </div>
          </div>
          
          <button
            type="button"
            onClick={handleWorldCup2026Click}
            style={{
              padding: '0.75rem 1.5rem',
              background: 'linear-gradient(to right, #FFD700, #FFA500)',
              color: '#002244',
              border: 'none',
              borderRadius: '0.5rem',
              fontWeight: 700,
              cursor: 'pointer',
              transition: 'all 0.3s ease',
              fontSize: '1rem',
              width: '100%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '0.5rem',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.transform = 'translateY(-2px)';
              e.currentTarget.style.boxShadow = '0 10px 25px rgba(255, 215, 0, 0.3)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.transform = 'translateY(0)';
              e.currentTarget.style.boxShadow = 'none';
            }}
          >
            <span>🌍</span>
            <span>Explore Interactive World Cup 2026</span>
          </button>
          
          <div style={{
            marginTop: '0.75rem',
            fontSize: '0.75rem',
            color: 'rgba(255, 255, 255, 0.8)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '0.5rem',
          }}>
            <span>✨</span>
            <span>Interactive fixtures • Team rosters • Venue maps • Live updates</span>
          </div>
        </div>
      </div>
      
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
            placeholder="Search for any national team or football club..."
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
          {isSearching ? 'Searching...' : 'Search with AI'}
        </button>
      </form>
      
      <div style={{ marginTop: '1.5rem' }}>
        <p style={{ color: '#94a3b8', fontSize: '0.875rem', marginBottom: '0.75rem' }}>
          Try searching for verified teams with real squad data:
        </p>
        <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
          {quickSearches.map((term) => {
            const isWorldCup = term.toLowerCase().includes('2026');
            const isVerified = ['Real Madrid', 'Argentina', 'FC Barcelona', 'Manchester City', 'Brazil'].includes(term);
            
            return (
              <button
                key={term}
                type="button"
                onClick={() => handleExampleClick(term)}
                disabled={isSearching}
                style={{
                  padding: '0.5rem 1rem',
                  background: isWorldCup 
                    ? 'rgba(255, 215, 0, 0.2)' 
                    : isVerified
                      ? 'rgba(34, 197, 94, 0.1)'
                      : 'rgba(255, 255, 255, 0.1)',
                  border: isWorldCup
                    ? '1px solid rgba(255, 215, 0, 0.5)'
                    : isVerified
                      ? '1px solid rgba(34, 197, 94, 0.3)'
                      : '1px solid rgba(255, 255, 255, 0.2)',
                  borderRadius: '999px',
                  color: isWorldCup ? '#FFD700' : isVerified ? '#4ade80' : 'white',
                  fontSize: '0.875rem',
                  cursor: isSearching ? 'not-allowed' : 'pointer',
                  transition: 'all 0.2s ease',
                  whiteSpace: 'nowrap',
                  opacity: isSearching ? 0.6 : 1,
                }}
                onMouseEnter={(e) => {
                  if (!isSearching) {
                    e.currentTarget.style.background = isWorldCup
                      ? 'rgba(255, 215, 0, 0.3)'
                      : isVerified
                        ? 'rgba(34, 197, 94, 0.2)'
                        : 'rgba(74, 222, 128, 0.2)';
                  }
                }}
                onMouseLeave={(e) => {
                  if (!isSearching) {
                    e.currentTarget.style.background = isWorldCup 
                      ? 'rgba(255, 215, 0, 0.2)' 
                      : isVerified
                        ? 'rgba(34, 197, 94, 0.1)'
                        : 'rgba(255, 255, 255, 0.1)';
                  }
                }}
              >
                {term}
                {isVerified && <span style={{ marginLeft: '0.5rem', fontSize: '0.75rem' }}>✅</span>}
                {isWorldCup && <span style={{ marginLeft: '0.5rem', fontSize: '0.75rem' }}>🌍</span>}
              </button>
            );
          })}
        </div>
      </div>
      
      <div style={{ 
        marginTop: '1.5rem', 
        padding: '1rem',
        background: 'rgba(0, 0, 0, 0.3)',
        borderRadius: '0.75rem',
        border: '1px solid rgba(255, 255, 255, 0.1)'
      }}>
        <div style={{ 
          display: 'flex', 
          alignItems: 'center', 
          gap: '1rem', 
          flexWrap: 'wrap',
          fontSize: '0.75rem',
          color: '#94a3b8'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
            <span style={{ color: '#4ade80' }}>✅</span>
            <span>Verified Database (95% confidence)</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
            <span style={{ color: '#60a5fa' }}>🔍</span>
            <span>SportsDB API (80% confidence)</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
            <span style={{ color: '#fbbf24' }}>📚</span>
            <span>Wikipedia (60% confidence)</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
            <span style={{ color: '#f97316' }}>🤖</span>
            <span>AI Fallback (30% confidence)</span>
          </div>
        </div>
        <p style={{ marginTop: '0.75rem', fontSize: '0.75rem', color: '#64748b' }}>
          Powered by GROQ AI + TheSportsDB • Verified 2024-2025 data • Real squad data for top teams
        </p>
      </div>
    </div>
  );
}