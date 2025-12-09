import { useState, useCallback } from 'react';
import FootballSearch from '../components/FootballSearch';
import FootballAI from '../components/FootballAI';

// Video Player Component
function VideoPlayer({ url, title = "Football Highlights" }: { url: string; title?: string }) {
  const [hasError, setHasError] = useState(false);
  
  // Check if URL is a valid YouTube embed URL
  const isValidYouTubeUrl = url && url.startsWith('https://www.youtube.com/embed/');
  
  // Extract video ID for fallback
  const getVideoId = (url: string) => {
    try {
      const match = url.match(/embed\/([a-zA-Z0-9_-]+)/);
      return match ? match[1] : null;
    } catch {
      return null;
    }
  };

  const videoId = getVideoId(url);
  
  // Fallback URL using YouTube nocookie domain
  const fallbackUrl = videoId 
    ? `https://www.youtube-nocookie.com/embed/${videoId}?rel=0&modestbranding=1&autoplay=0`
    : 'https://www.youtube.com/embed/dZqkf1ZnQh4';

  const handleIframeError = () => {
    console.log('❌ Iframe failed to load');
    setHasError(true);
  };

  if (!url || !isValidYouTubeUrl) {
    return (
      <div style={{
        width: '100%',
        paddingBottom: '56.25%',
        position: 'relative',
        borderRadius: '0.75rem',
        overflow: 'hidden',
        background: 'rgba(0, 0, 0, 0.4)',
        border: '2px solid rgba(239, 68, 68, 0.5)',
      }}>
        <div style={{
          position: 'absolute',
          top: 0,
          left: 0,
          width: '100%',
          height: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          flexDirection: 'column',
          gap: '1rem',
          color: '#ef4444',
        }}>
          <div style={{ fontSize: '2rem' }}>❌</div>
          <p>Invalid video URL</p>
        </div>
      </div>
    );
  }

  return (
    <div style={{ width: '100%' }}>
      <div style={{
        position: 'relative',
        width: '100%',
        paddingBottom: '56.25%',
        borderRadius: '0.75rem',
        overflow: 'hidden',
        background: 'rgba(0, 0, 0, 0.4)',
        border: '2px solid rgba(74, 222, 128, 0.5)',
      }}>
        <iframe
          key={hasError ? fallbackUrl : url}
          src={hasError ? fallbackUrl : url}
          title={title}
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
          allowFullScreen
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            width: '100%',
            height: '100%',
            border: 'none',
          }}
          loading="lazy"
          referrerPolicy="no-referrer-when-downgrade"
          sandbox="allow-scripts allow-same-origin allow-presentation allow-popups"
          onError={handleIframeError}
        />
      </div>
      
      <div style={{
        marginTop: '1rem',
        padding: '0.75rem',
        background: 'rgba(0, 0, 0, 0.3)',
        borderRadius: '0.5rem',
        border: '1px solid rgba(74, 222, 128, 0.3)',
        fontSize: '0.75rem',
        color: '#94a3b8',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: '0.5rem',
      }}>
        <span>💡</span>
        <span>If video doesn't load, try refreshing the page</span>
      </div>
    </div>
  );
}

// Footer styles
const styles = {
  footer: {
    marginTop: '3rem',
    padding: '1.5rem',
    background: 'rgba(10, 30, 10, 0.7)',
    backdropFilter: 'blur(10px)',
    borderRadius: '1rem',
    border: '1px solid rgba(74, 222, 128, 0.3)',
    boxShadow: '0 5px 20px rgba(0, 0, 0, 0.3)',
  },
  footerContainer: {
    maxWidth: '1200px',
    margin: '0 auto',
  },
  footerContent: {
    display: 'flex',
    flexDirection: 'column' as const,
    alignItems: 'center',
    gap: '1.5rem',
    textAlign: 'center' as const,
  },
  attribution: {
    display: 'flex',
    flexDirection: 'column' as const,
    alignItems: 'center',
    gap: '0.75rem',
  },
  developer: {
    color: '#e2e8f0',
    fontSize: '0.9375rem',
    margin: 0,
  },
  developerName: {
    color: '#4ade80',
    fontWeight: 600,
  },
  separator: {
    width: '30px',
    height: '1px',
    background: 'rgba(74, 222, 128, 0.5)',
    margin: '0.5rem 0',
  },
  copyright: {
    color: '#94a3b8',
    fontSize: '0.8125rem',
    margin: 0,
    opacity: 0.9,
  },
  disclaimerContainer: {
    background: 'rgba(0, 0, 0, 0.3)',
    padding: '1rem',
    borderRadius: '0.75rem',
    border: '1px solid rgba(251, 191, 36, 0.2)',
    maxWidth: '600px',
  },
  disclaimerTitle: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.5rem',
    marginBottom: '0.75rem',
    color: '#fbbf24',
    fontSize: '0.875rem',
    fontWeight: 600,
  },
  disclaimerText: {
    color: '#cbd5e1',
    fontSize: '0.8125rem',
    lineHeight: 1.5,
    margin: 0,
    opacity: 0.9,
  },
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

  return (
    <div style={{
      minHeight: '100vh',
      background: '#0a3e1a',
      color: 'white',
      padding: '1rem',
      fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, sans-serif",
      position: 'relative',
      overflow: 'hidden',
    }}>
      {/* Pitch background */}
      <div style={{
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        background: 'linear-gradient(160deg, #0a5c2a 0%, #1a7c3a 30%, #0a5c2a 70%, #094522 100%)',
        opacity: 0.9,
        pointerEvents: 'none',
      }}></div>
      
      <div style={{
        position: 'relative',
        zIndex: 2,
        maxWidth: '1400px',
        margin: '0 auto',
      }}>
        <header style={{
          textAlign: 'center',
          marginBottom: '2rem',
          maxWidth: '800px',
          marginLeft: 'auto',
          marginRight: 'auto',
          position: 'relative',
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
            AI-Powered Football Intelligence • Real-time Analysis • Wikipedia Integration
          </p>
        </header>

        <div style={{
          display: 'grid',
          gridTemplateColumns: '1fr',
          gap: '1.5rem',
          position: 'relative',
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
            position: 'relative',
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
              {videoUrl && (
                <span style={{
                  fontSize: '0.875rem',
                  background: 'rgba(74, 222, 128, 0.2)',
                  padding: '0.25rem 0.75rem',
                  borderRadius: '999px',
                  color: '#4ade80',
                  marginLeft: 'auto',
                }}>
                  🎬 Playing
                </span>
              )}
            </div>
            
            {isLoading ? (
              <div style={{ position: 'relative', minHeight: '150px' }}>
                <div style={{
                  position: 'relative',
                  width: '100%',
                  paddingBottom: '56.25%',
                  borderRadius: '0.75rem',
                  overflow: 'hidden',
                  background: 'rgba(0, 0, 0, 0.4)',
                  marginBottom: '1rem',
                }}>
                  <div style={{
                    position: 'absolute',
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
                    flexDirection: 'column',
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
                <VideoPlayer url={videoUrl} />
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
                textAlign: 'center',
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

          {/* ADDED: Footer Section (Simplified) */}
          <div style={styles.footer}>
            <div style={styles.footerContainer}>
              <div style={styles.footerContent}>
                {/* Attribution */}
                <div style={styles.attribution}>
                  <p style={styles.developer}>
                    Developed by <span style={styles.developerName}>A. Guillen</span>
                  </p>
                  <div style={styles.separator}></div>
                  <p style={styles.copyright}>
                    © {new Date().getFullYear()} FutbolAI Explorer
                  </p>
                </div>
                
                {/* Simplified Disclaimer */}
                <div style={styles.disclaimerContainer}>
                  <div style={styles.disclaimerTitle}>
                    <span>⚽</span>
                    <span>Content Copyright Notice</span>
                  </div>
                  <p style={styles.disclaimerText}>
                    Football highlights and videos are property of their respective owners.
                    All trademarks and registered trademarks are the property of their respective owners.
                    This application uses AI-generated content for analysis purposes.
                  </p>
                </div>
              </div>
            </div>
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