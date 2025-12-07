import { useState, useCallback, useRef, useEffect } from 'react';
import FootballAI from '../components/FootballAI';

// FootballSearch component with proper async handling
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
  
  // Refs for cleanup
  const searchControllerRef = useRef<AbortController | null>(null);
  const searchTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const componentMounted = useRef(true);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      componentMounted.current = false;
      cleanupSearch();
    };
  }, []);

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
    // Clear timeout
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
      searchTimeoutRef.current = null;
    }
    
    // Abort fetch request
    if (searchControllerRef.current) {
      searchControllerRef.current.abort();
      searchControllerRef.current = null;
    }
    
    setIsSearching(false);
  }, []);

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const searchQuery = query.trim();
    if (!searchQuery || isSearching) return;

    console.log('🔍 [SEARCH] Starting search for:', searchQuery);
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
      const apiUrl = `/api/ai?action=search&query=${encodeURIComponent(searchQuery)}`;
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
      
      // Check if component is still mounted and search wasn't aborted
      if (!componentMounted.current || searchControllerRef.current?.signal.aborted) {
        return;
      }
      
      if (data.success) {
        console.log('✅ [API] Success! Type:', data.type);
        
        // Clear data again before setting new data
        clearAllPreviousData();
        
        // Handle response based on type
        const responseType = data.type;
        
        if (responseType === 'player' && data.playerInfo) {
          console.log('👤 Setting player data:', data.playerInfo.name);
          
          // Process player data
          const playerData = {
            id: Date.now(),
            name: data.playerInfo.name || searchQuery,
            position: data.playerInfo.position || 'Unknown',
            nationality: data.playerInfo.nationality || 'Unknown',
            currentClub: data.playerInfo.currentClub || 'Unknown',
            age: data.playerInfo.age || null,
            achievementsSummary: data.playerInfo.achievementsSummary || null,
            dateOfBirth: data.playerInfo.dateOfBirth || null,
            height: data.playerInfo.height || null,
            preferredFoot: data.playerInfo.preferredFoot || 'Unknown',
            playingStyle: data.playerInfo.playingStyle || '',
          };
          
          onPlayerSelect(playerData);
        } 
        else if ((responseType === 'club' || responseType === 'national') && data.teamInfo) {
          console.log('🏟️ Setting team data:', data.teamInfo.name);
          
          // Process team data
          const teamData = {
            id: Date.now(),
            name: data.teamInfo.name || searchQuery,
            type: data.teamInfo.type || 'club',
            fifaRanking: data.teamInfo.fifaRanking,
            league: data.teamInfo.league || 'Unknown',
            founded: data.teamInfo.founded || 'Unknown',
            achievementsSummary: data.teamInfo.achievementsSummary || null,
            stadium: data.teamInfo.stadium || null,
          };
          
          onTeamSelect(teamData);
        }
        else if (responseType === 'worldcup' && data.worldCupInfo) {
          console.log('🌍 Setting World Cup data');
          
          const worldCupData = {
            year: data.worldCupInfo.year,
            host: data.worldCupInfo.host,
            defendingChampion: data.worldCupInfo.defendingChampion,
          };
          
          onWorldCupUpdate(worldCupData);
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
        console.error('❌ API Error:', data.error);
        setError(data.error || 'Failed to fetch data');
        onAnalysisUpdate(`Error: ${data.error || 'Failed to fetch data'}`);
      }
    } catch (error: any) {
      // Only show error if it's not an abort error
      if (error.name !== 'AbortError' && componentMounted.current) {
        console.error('❌ Search failed:', error);
        setError('Search failed. Please try again.');
        onAnalysisUpdate('Search failed. Please try again.');
      }
    } finally {
      if (componentMounted.current) {
        cleanupSearch();
        onLoadingChange(false);
      }
    }
  };

  const handleExampleClick = (example: string) => {
    const trimmedExample = example.trim();
    setQuery(trimmedExample);
    setError(null);
    
    // Clear any existing timeout
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }
    
    // Trigger search after a short delay
    searchTimeoutRef.current = setTimeout(() => {
      const fakeEvent = { 
        preventDefault: () => {},
        currentTarget: { checkValidity: () => true }
      } as unknown as React.FormEvent<Element>;
      
      handleSearch(fakeEvent);
    }, 100);
  };

  // Simple examples without hardcoded logic
  const quickSearches = [
    'Messi',
    'Cristiano Ronaldo',
    'Real Madrid',
    'Brazil',
    'World Cup',
    'Premier League'
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
            placeholder="Search any player, team, or tournament..."
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
          Try these examples:
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
        <p>AI-powered football intelligence. Get instant analysis of players, teams, and tournaments.</p>
        <p style={{ marginTop: '0.5rem', fontSize: '0.75rem', color: '#64748b' }}>
          Powered by Groq AI • Real-time analysis • No hardcoded data
        </p>
      </div>
    </div>
  );
};

// Main Home component
export default function Home() {
  const [selectedPlayer, setSelectedPlayer] = useState<any>(null);
  const [selectedTeam, setSelectedTeam] = useState<any>(null);
  const [videoUrl, setVideoUrl] = useState<string>('');
  const [isLoading, setIsLoading] = useState(false);
  const [analysis, setAnalysis] = useState<string>('');
  const [teams, setTeams] = useState<any[]>([]);
  const [worldCupInfo, setWorldCupInfo] = useState<any>(null);
  const [lastUpdated, setLastUpdated] = useState<string>('');
  
  // Memoized callbacks
  const handlePlayerSelect = useCallback((player: any) => {
    setSelectedPlayer(player);
    setSelectedTeam(null);
    setWorldCupInfo(null);
    setLastUpdated(new Date().toLocaleString());
  }, []);

  const handleTeamSelect = useCallback((team: any) => {
    setSelectedTeam(team);
    setSelectedPlayer(null);
    setWorldCupInfo(null);
    setLastUpdated(new Date().toLocaleString());
  }, []);

  const handleVideoFound = useCallback((url: string) => {
    setVideoUrl(url);
  }, []);

  const handleLoadingChange = useCallback((loading: boolean) => {
    setIsLoading(loading);
  }, []);

  const handleAnalysisUpdate = useCallback((newAnalysis: string) => {
    setAnalysis(newAnalysis);
  }, []);

  const handleTeamsUpdate = useCallback((newTeams: any[]) => {
    setTeams(newTeams);
  }, []);

  const handleWorldCupUpdate = useCallback((worldCupInfo: any) => {
    setWorldCupInfo(worldCupInfo);
    setSelectedPlayer(null);
    setSelectedTeam(null);
    setLastUpdated(new Date().toLocaleString());
  }, []);

  // Styles (same as your original)
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
    // ... (keep all your existing styles exactly as they were)
    // Just copy the styles from your original file here
  };

  return (
    <div style={styles.container}>
      {/* Pitch background */}
      <div style={{
        position: 'absolute' as const,
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        background: `
          linear-gradient(160deg, #0a5c2a 0%, #1a7c3a 30%, #0a5c2a 70%, #094522 100%)
        `,
        opacity: 0.9,
        pointerEvents: 'none' as const,
      }}></div>
      
      <div style={{
        position: 'relative' as const,
        zIndex: 2,
        maxWidth: '1400px',
        margin: '0 auto',
      }}>
        <header style={{
          textAlign: 'center' as const,
          marginBottom: '2rem',
          maxWidth: '800px',
          marginLeft: 'auto',
          marginRight: 'auto',
          position: 'relative' as const,
          zIndex: 3,
        }}>
          <h1 style={{
            fontSize: '2.5rem',
            fontWeight: 800,
            marginBottom: '0.75rem',
            background: 'linear-gradient(to right, #4ade80, #ffffff, #22d3ee)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            lineHeight: 1.2,
            letterSpacing: '-0.025em',
            textShadow: '0 2px 10px rgba(0, 0, 0, 0.5)',
          }}>
            ⚽ FutbolAI
          </h1>
          <p style={{
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
          }}>
            AI-Powered Football Intelligence • Real-time Analysis
          </p>
        </header>

        <div style={{
          display: 'grid',
          gridTemplateColumns: '1fr',
          gap: '1.5rem',
          position: 'relative' as const,
          zIndex: 3,
        }}>
          {/* Search Section */}
          <div style={{
            background: 'rgba(10, 30, 10, 0.85)',
            backdropFilter: 'blur(10px)',
            borderRadius: '1rem',
            padding: '1.5rem',
            boxShadow: '0 10px 30px rgba(0, 0, 0, 0.5), inset 0 0 0 1px rgba(74, 222, 128, 0.3)',
            border: '1px solid rgba(74, 222, 128, 0.5)',
          }}>
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
          
          {/* AI Analysis Section */}
          <div style={{
            background: 'rgba(10, 30, 10, 0.85)',
            backdropFilter: 'blur(10px)',
            borderRadius: '1rem',
            padding: '1.5rem',
            boxShadow: '0 10px 30px rgba(0, 0, 0, 0.5), inset 0 0 0 1px rgba(34, 211, 238, 0.3)',
            border: '1px solid rgba(34, 211, 238, 0.5)',
            minHeight: '400px',
            position: 'relative' as const,
          }}>
            <FootballAI
              player={selectedPlayer}
              team={selectedTeam}
              isLoading={isLoading}
              analysis={analysis}
              teams={teams}
              worldCupInfo={worldCupInfo}
            />
            
            {lastUpdated && (
              <div style={{
                marginTop: '1rem',
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
              }}>
                <span style={{ color: '#4ade80' }}>⏱️</span>
                <span style={{ color: '#e2e8f0' }}>
                  Last updated: {lastUpdated}
                </span>
              </div>
            )}
          </div>

          {/* Video Section */}
          <div style={{
            background: 'rgba(10, 30, 10, 0.85)',
            backdropFilter: 'blur(10px)',
            borderRadius: '1rem',
            padding: '1.5rem',
            boxShadow: '0 10px 30px rgba(0, 0, 0, 0.5), inset 0 0 0 1px rgba(251, 191, 36, 0.3)',
            border: '1px solid rgba(251, 191, 36, 0.5)',
            marginTop: '1.5rem',
          }}>
            <div style={{
              fontSize: '1.5rem',
              fontWeight: 700,
              marginBottom: '1rem',
              display: 'flex',
              alignItems: 'center',
              gap: '0.75rem',
              background: 'linear-gradient(to right, #4ade80, #3b82f6)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
            }}>
              <span>📺</span>
              <span>Football Highlights</span>
            </div>
            
            {isLoading ? (
              <div style={{ position: 'relative', minHeight: '150px' }}>
                <div style={{
                  position: 'relative' as const,
                  width: '100%',
                  paddingBottom: '56.25%',
                  borderRadius: '0.75rem',
                  overflow: 'hidden',
                  background: 'rgba(0, 0, 0, 0.4)',
                  marginBottom: '1rem',
                }}>
                  <div style={{
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
                  }}>
                    <div style={{
                      width: '40px',
                      height: '40px',
                      border: '3px solid rgba(74, 222, 128, 0.3)',
                      borderTopColor: '#4ade80',
                      borderRadius: '50%',
                      animation: 'spin 1s linear infinite',
                    }}></div>
                    <p style={{ color: '#4ade80', fontSize: '0.875rem', textAlign: 'center' }}>
                      Loading highlights...
                    </p>
                  </div>
                </div>
              </div>
            ) : videoUrl ? (
              <>
                <div style={{
                  position: 'relative' as const,
                  width: '100%',
                  paddingBottom: '56.25%',
                  borderRadius: '0.75rem',
                  overflow: 'hidden',
                  background: 'rgba(0, 0, 0, 0.4)',
                  marginBottom: '1rem',
                }}>
                  <iframe
                    src={videoUrl}
                    title="Football Highlights"
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                    allowFullScreen
                    style={{
                      position: 'absolute' as const,
                      top: 0,
                      left: 0,
                      width: '100%',
                      height: '100%',
                      border: 'none',
                    }}
                  ></iframe>
                </div>
                <div style={{
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
                }}>
                  <span>🔊</span>
                  <span>Click fullscreen for best viewing experience</span>
                </div>
              </>
            ) : (
              <div style={{
                padding: '2rem 1rem',
                textAlign: 'center' as const,
                background: 'rgba(0, 0, 0, 0.5)',
                borderRadius: '0.75rem',
                border: '2px dashed rgba(74, 222, 128, 0.5)',
              }}>
                <div style={{ fontSize: '3rem', marginBottom: '1rem', opacity: 0.8 }}>⚽</div>
                <p style={{ color: '#e2e8f0', fontSize: '1.125rem', fontWeight: 500 }}>
                  Search for a player or team above to see highlights
                </p>
                <p style={{ color: '#cbd5e1', fontSize: '0.875rem', marginTop: '0.5rem' }}>
                  Video highlights will appear here
                </p>
              </div>
            )}
          </div>
        </div>
        
        <style jsx>{`
          @keyframes spin {
            to { transform: rotate(360deg); }
          }
        `}</style>
      </div>
    </div>
  );
}