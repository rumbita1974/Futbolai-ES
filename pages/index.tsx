import { useState } from 'react';
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

  const styles = {
    container: {
      minHeight: '100vh',
      background: `linear-gradient(rgba(0, 60, 0, 0.9), rgba(0, 80, 0, 0.95)), 
                   url('https://images.unsplash.com/photo-1575361204480-aadea25e6e68?q=80&w=2071')`,
      backgroundSize: 'cover',
      backgroundPosition: 'center',
      backgroundRepeat: 'no-repeat',
      backgroundAttachment: 'fixed',
      color: 'white',
      padding: '2rem',
      fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, sans-serif",
      position: 'relative' as const,
    },
    header: {
      textAlign: 'center' as const,
      marginBottom: '3rem',
      maxWidth: '800px',
      marginLeft: 'auto',
      marginRight: 'auto',
      position: 'relative' as const,
      zIndex: 2,
    },
    title: {
      fontSize: '3.5rem',
      fontWeight: 800,
      marginBottom: '1rem',
      background: 'linear-gradient(to right, #4ade80, #ffffff, #22d3ee)',
      WebkitBackgroundClip: 'text',
      WebkitTextFillColor: 'transparent',
      lineHeight: 1.2,
      letterSpacing: '-0.025em',
      textShadow: '0 2px 10px rgba(0, 0, 0, 0.3)',
    },
    subtitle: {
      color: '#e2e8f0',
      fontSize: '1.25rem',
      lineHeight: 1.6,
      opacity: 0.95,
      textShadow: '0 1px 3px rgba(0, 0, 0, 0.5)',
    },
    mainGrid: {
      display: 'grid',
      gridTemplateColumns: '1fr',
      gap: '2rem',
      maxWidth: '1400px',
      margin: '0 auto',
      position: 'relative' as const,
      zIndex: 2,
    },
    topSection: {
      display: 'grid',
      gridTemplateColumns: '1fr',
      gap: '2rem',
    },
    searchContainer: {
      background: 'rgba(10, 30, 10, 0.85)',
      backdropFilter: 'blur(10px)',
      borderRadius: '1.5rem',
      padding: '2rem',
      boxShadow: '0 20px 60px rgba(0, 0, 0, 0.5)',
      border: '2px solid rgba(74, 222, 128, 0.3)',
    },
    aiContainer: {
      background: 'rgba(10, 30, 10, 0.85)',
      backdropFilter: 'blur(10px)',
      borderRadius: '1.5rem',
      padding: '2.5rem',
      boxShadow: '0 20px 60px rgba(0, 0, 0, 0.5)',
      border: '2px solid rgba(34, 211, 238, 0.3)',
      minHeight: '500px',
    },
    videoSection: {
      background: 'rgba(10, 30, 10, 0.85)',
      backdropFilter: 'blur(10px)',
      borderRadius: '1.5rem',
      padding: '2rem',
      boxShadow: '0 20px 60px rgba(0, 0, 0, 0.5)',
      border: '2px solid rgba(251, 191, 36, 0.3)',
      marginTop: '2rem',
    },
    videoHeader: {
      fontSize: '2rem',
      fontWeight: 700,
      marginBottom: '1.5rem',
      display: 'flex',
      alignItems: 'center',
      gap: '1rem',
      background: 'linear-gradient(to right, #4ade80, #3b82f6)',
      WebkitBackgroundClip: 'text',
      WebkitTextFillColor: 'transparent',
    },
    videoContainer: {
      position: 'relative' as const,
      width: '100%',
      paddingBottom: '56.25%',
      borderRadius: '1rem',
      overflow: 'hidden',
      background: 'linear-gradient(135deg, #0a2e1a 0%, #1a5c36 100%)',
      marginBottom: '1.5rem',
      boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.7)',
      border: '2px solid rgba(255, 255, 255, 0.1)',
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
      padding: '4rem 2rem',
      textAlign: 'center' as const,
      background: 'rgba(15, 40, 15, 0.6)',
      borderRadius: '1rem',
      border: '2px dashed rgba(74, 222, 128, 0.3)',
    },
    placeholderIcon: {
      fontSize: '4rem',
      marginBottom: '1.5rem',
      opacity: 0.8,
      filter: 'drop-shadow(0 4px 8px rgba(0, 0, 0, 0.4))',
    },
    placeholderText: {
      color: '#cbd5e1',
      fontSize: '1.25rem',
      fontWeight: 500,
    },
    placeholderSubtext: {
      color: '#94a3b8',
      fontSize: '1rem',
      marginTop: '0.75rem',
    },
    videoNote: {
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      gap: '0.75rem',
      fontSize: '0.875rem',
      color: '#cbd5e1',
      padding: '1rem',
      background: 'rgba(15, 40, 15, 0.6)',
      borderRadius: '0.75rem',
      border: '1px solid rgba(74, 222, 128, 0.2)',
    },
    loadingOverlay: {
      position: 'absolute' as const,
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      background: 'rgba(10, 30, 10, 0.9)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      borderRadius: '1rem',
      zIndex: 10,
    },
    loadingSpinner: {
      width: '50px',
      height: '50px',
      border: '4px solid rgba(74, 222, 128, 0.3)',
      borderTopColor: '#4ade80',
      borderRadius: '50%',
      animation: 'spin 1s linear infinite',
    },
    footer: {
      marginTop: '4rem',
      paddingTop: '2rem',
      borderTop: '2px solid rgba(74, 222, 128, 0.2)',
      position: 'relative' as const,
      zIndex: 2,
    },
    footerContainer: {
      maxWidth: '1400px',
      margin: '0 auto',
      display: 'flex',
      flexDirection: 'column' as const,
      alignItems: 'center',
      gap: '1.5rem',
    },
    footerContent: {
      display: 'flex',
      flexDirection: 'column' as const,
      alignItems: 'center',
      gap: '1rem',
      width: '100%',
    },
    attribution: {
      textAlign: 'center' as const,
      padding: '0 1rem',
    },
    developer: {
      fontSize: '1rem',
      color: '#e2e8f0',
      marginBottom: '0.5rem',
    },
    developerName: {
      fontWeight: 600,
      color: '#ffffff',
      background: 'linear-gradient(to right, #4ade80, #22d3ee)',
      WebkitBackgroundClip: 'text',
      WebkitTextFillColor: 'transparent',
    },
    copyright: {
      fontSize: '0.875rem',
      color: '#cbd5e1',
    },
    disclaimerContainer: {
      maxWidth: '600px',
      textAlign: 'center' as const,
      padding: '1rem',
      background: 'rgba(15, 40, 15, 0.6)',
      borderRadius: '0.75rem',
      border: '1px solid rgba(74, 222, 128, 0.2)',
    },
    disclaimerTitle: {
      fontSize: '0.875rem',
      fontWeight: 600,
      color: '#e2e8f0',
      marginBottom: '0.5rem',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      gap: '0.5rem',
    },
    disclaimerText: {
      fontSize: '0.75rem',
      color: '#cbd5e1',
      lineHeight: 1.5,
    },
    separator: {
      height: '2px',
      width: '80px',
      background: 'linear-gradient(to right, transparent, #4ade80, transparent)',
      margin: '0.5rem 0',
    },
    pitchOverlay: {
      position: 'absolute' as const,
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      background: `url('data:image/svg+xml,<svg width="100" height="100" xmlns="http://www.w3.org/2000/svg"><defs><pattern id="grid" width="10" height="10" patternUnits="userSpaceOnUse"><path d="M 10 0 L 0 0 0 10" fill="none" stroke="rgba(74,222,128,0.1)" stroke-width="1"/></pattern></defs><rect width="100" height="100" fill="url(%23grid)"/></svg>')`,
      opacity: 0.3,
      pointerEvents: 'none' as const,
    },
  };

  return (
    <div style={styles.container}>
      {/* Football pitch overlay pattern */}
      <div style={styles.pitchOverlay}></div>
      
      <style>{`
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
        
        /* Glow effect for containers */
        .glow {
          box-shadow: 0 0 20px rgba(74, 222, 128, 0.3);
        }
        
        /* Pulse animation for loading */
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.7; }
        }
        
        .pulse {
          animation: pulse 2s infinite;
        }
      `}</style>
      
      <div style={{ maxWidth: '1400px', margin: '0 auto', position: 'relative', zIndex: 2 }}>
        <header style={styles.header}>
          <h1 style={styles.title}>FutbolAI - Football Intelligence</h1>
          <p style={styles.subtitle}>
            AI-powered football insights, World Cup 2026 coverage, and expert analysis.
            <br />
            <span style={{ color: '#4ade80', fontWeight: 600 }}>Now with aggressive AI filtering for accurate results!</span>
          </p>
        </header>

        <div style={styles.mainGrid}>
          <div style={styles.topSection}>
            <div style={styles.searchContainer} className="glow">
              <FootballSearch
                onPlayerSelect={setSelectedPlayer}
                onTeamSelect={setSelectedTeam}
                onVideoFound={setVideoUrl}
                onLoadingChange={setIsLoading}
                onAnalysisUpdate={setAnalysis}
                onTeamsUpdate={setTeams}
                onWorldCupUpdate={setWorldCupInfo}
              />
            </div>
            
            <div style={styles.aiContainer} className="glow">
              <FootballAI
                player={selectedPlayer}
                team={selectedTeam}
                isLoading={isLoading}
                analysis={analysis}
                teams={teams}
                worldCupInfo={worldCupInfo}
              />
            </div>
          </div>

          <div style={styles.videoSection} className="glow">
            <div style={styles.videoHeader}>
              <span className="pulse">⚽</span>
              <span>Football Highlights</span>
            </div>
            
            {isLoading ? (
              <div style={{ position: 'relative', minHeight: '200px' }}>
                <div style={styles.videoContainer}>
                  <div style={styles.loadingOverlay}>
                    <div style={styles.loadingSpinner}></div>
                    <p style={{ marginLeft: '1rem', color: '#4ade80' }}>Loading highlights...</p>
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
                    <span>⚡</span>
                    <span>AI Filtering Active</span>
                  </div>
                  <p style={styles.disclaimerText}>
                    Using aggressive AI filtering to ensure correct categorization. 
                    Country queries show team data only. Player queries show player data only.
                    No mixed responses guaranteed.
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