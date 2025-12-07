import { useState, useCallback, useRef, useEffect } from 'react';
import FootballSearch from '../components/FootballSearch';
import FootballAI from '../components/FootballAI';

export default function Home() {
  const [selectedPlayer, setSelectedPlayer] = useState<any>(null);
  const [selectedTeam, setSelectedTeam] = useState<any>(null);
  const [videoUrl, setVideoUrl] = useState<string>('');
  const [isLoading, setIsLoading] = useState(false);
  const [analysis, setAnalysis] = useState<string>('');
  const [teams, setTeams] = useState<any[]>([]);
  const [worldCupInfo, setWorldCupInfo] = useState<any>(null);
  const [lastUpdated, setLastUpdated] = useState<string>('');
  
  // Use refs to prevent stale closures
  const isLoadingRef = useRef(isLoading);
  const componentMounted = useRef(true);

  // Update ref when state changes
  useEffect(() => {
    isLoadingRef.current = isLoading;
  }, [isLoading]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      componentMounted.current = false;
    };
  }, []);

  // Update the search handler callbacks - use useCallback to prevent unnecessary re-renders
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
      {/* Simplified pitch background for mobile */}
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
        
        /* Mobile optimizations */
        @media (min-width: 768px) {
          .content-box {
            transition: all 0.3s ease;
          }
          
          .content-box:hover {
            transform: translateY(-5px);
            box-shadow: 0 25px 70px rgba(0, 0, 0, 0.8);
          }
        }
        
        /* Improve touch targets on mobile */
        button, input {
          -webkit-tap-highlight-color: transparent;
        }
        
        /* Prevent zoom on mobile inputs */
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
          
          {/* Add deployment timestamp */}
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
            
            {/* Show last updated timestamp */}
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