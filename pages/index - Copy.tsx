import { useState } from 'react';
import MovieSearch from '../components/MovieSearch';
import AIHost from '../components/AIHost';

export default function Home() {
  const [selectedMovie, setSelectedMovie] = useState<any>(null);
  const [trailerUrl, setTrailerUrl] = useState<string>('');
  const [isLoading, setIsLoading] = useState(false);

  const styles = {
    container: {
      minHeight: '100vh',
      background: 'linear-gradient(135deg, #0f172a 0%, #1e1b4b 100%)',
      color: 'white',
      padding: '2rem',
      fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, sans-serif",
    },
    header: {
      textAlign: 'center' as const,
      marginBottom: '3rem',
      maxWidth: '800px',
      marginLeft: 'auto',
      marginRight: 'auto',
    },
    title: {
      fontSize: '3.5rem',
      fontWeight: 800,
      marginBottom: '1rem',
      background: 'linear-gradient(to right, #8b5cf6, #ec4899, #f59e0b)',
      WebkitBackgroundClip: 'text',
      WebkitTextFillColor: 'transparent',
      lineHeight: 1.2,
      letterSpacing: '-0.025em',
    },
    subtitle: {
      color: '#cbd5e1',
      fontSize: '1.25rem',
      lineHeight: 1.6,
      opacity: 0.9,
    },
    mainGrid: {
      display: 'grid',
      gridTemplateColumns: '1fr',
      gap: '2rem',
      maxWidth: '1400px',
      margin: '0 auto',
    },
    topSection: {
      display: 'grid',
      gridTemplateColumns: '1fr',
      gap: '2rem',
    },
    searchContainer: {
      background: 'rgba(30, 41, 59, 0.7)',
      backdropFilter: 'blur(10px)',
      borderRadius: '1.5rem',
      padding: '2rem',
      boxShadow: '0 20px 60px rgba(0, 0, 0, 0.3)',
      border: '1px solid rgba(255, 255, 255, 0.1)',
    },
    aiContainer: {
      background: 'rgba(30, 41, 59, 0.7)',
      backdropFilter: 'blur(10px)',
      borderRadius: '1.5rem',
      padding: '2.5rem',
      boxShadow: '0 20px 60px rgba(0, 0, 0, 0.3)',
      border: '1px solid rgba(255, 255, 255, 0.1)',
      minHeight: '500px',
    },
    trailerSection: {
      background: 'rgba(30, 41, 59, 0.7)',
      backdropFilter: 'blur(10px)',
      borderRadius: '1.5rem',
      padding: '2rem',
      boxShadow: '0 20px 60px rgba(0, 0, 0, 0.3)',
      border: '1px solid rgba(255, 255, 255, 0.1)',
      marginTop: '2rem',
    },
    trailerHeader: {
      fontSize: '2rem',
      fontWeight: 700,
      marginBottom: '1.5rem',
      display: 'flex',
      alignItems: 'center',
      gap: '1rem',
      background: 'linear-gradient(to right, #8b5cf6, #3b82f6)',
      WebkitBackgroundClip: 'text',
      WebkitTextFillColor: 'transparent',
    },
    videoContainer: {
      position: 'relative' as const,
      width: '100%',
      paddingBottom: '56.25%', // 16:9 aspect ratio
      borderRadius: '1rem',
      overflow: 'hidden',
      background: 'linear-gradient(135deg, #1e1b4b 0%, #0f172a 100%)',
      marginBottom: '1.5rem',
      boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)',
    },
    iframe: {
      position: 'absolute' as const,
      top: 0,
      left: 0,
      width: '100%',
      height: '100%',
      border: 'none',
    },
    noTrailer: {
      padding: '4rem 2rem',
      textAlign: 'center' as const,
      background: 'rgba(15, 23, 42, 0.5)',
      borderRadius: '1rem',
      border: '2px dashed rgba(255, 255, 255, 0.1)',
    },
    placeholderIcon: {
      fontSize: '4rem',
      marginBottom: '1.5rem',
      opacity: 0.7,
      filter: 'drop-shadow(0 4px 6px rgba(0, 0, 0, 0.3))',
    },
    placeholderText: {
      color: '#94a3b8',
      fontSize: '1.25rem',
      fontWeight: 500,
    },
    placeholderSubtext: {
      color: '#64748b',
      fontSize: '1rem',
      marginTop: '0.75rem',
    },
    videoNote: {
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      gap: '0.75rem',
      fontSize: '0.875rem',
      color: '#94a3b8',
      padding: '1rem',
      background: 'rgba(15, 23, 42, 0.5)',
      borderRadius: '0.75rem',
      border: '1px solid rgba(255, 255, 255, 0.05)',
    },
    loadingOverlay: {
      position: 'absolute' as const,
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      background: 'rgba(15, 23, 42, 0.8)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      borderRadius: '1rem',
      zIndex: 10,
    },
    loadingSpinner: {
      width: '50px',
      height: '50px',
      border: '4px solid rgba(139, 92, 246, 0.3)',
      borderTopColor: '#8b5cf6',
      borderRadius: '50%',
      animation: 'spin 1s linear infinite',
    },
  };

  return (
    <div style={styles.container}>
      {/* Add CSS animation for spinner */}
      <style>{`
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
      `}</style>
      
      <div style={{ maxWidth: '1400px', margin: '0 auto' }}>
        <header style={styles.header}>
          <h1 style={styles.title}>Movie AI Explorer</h1>
          <p style={styles.subtitle}>
            Discover movies with AI-powered insights. Get summaries, reviews, and watch trailers instantly.
          </p>
        </header>

        <div style={styles.mainGrid}>
          {/* Top Section: Search + AI Analysis Side by Side */}
          <div style={styles.topSection}>
            <div style={styles.searchContainer}>
              <MovieSearch
                onMovieSelect={setSelectedMovie}
                onTrailerFound={setTrailerUrl}
                onLoadingChange={setIsLoading}
              />
            </div>
            
            <div style={styles.aiContainer}>
              <AIHost
                movie={selectedMovie}
                isLoading={isLoading}
              />
            </div>
          </div>

          {/* Bottom Section: Trailer (Full Width) */}
          <div style={styles.trailerSection}>
            <div style={styles.trailerHeader}>
              <span>🎬</span>
              <span>Official Trailer</span>
            </div>
            
            {isLoading ? (
              <div style={{ position: 'relative', minHeight: '200px' }}>
                <div style={styles.videoContainer}>
                  <div style={styles.loadingOverlay}>
                    <div style={styles.loadingSpinner}></div>
                  </div>
                </div>
              </div>
            ) : trailerUrl ? (
              <>
                <div style={styles.videoContainer}>
                  <iframe
                    src={trailerUrl}
                    title="Movie Trailer"
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                    allowFullScreen
                    style={styles.iframe}
                  ></iframe>
                </div>
                <div style={styles.videoNote}>
                  <span>🔊</span>
                  <span>Click the fullscreen button for the best viewing experience</span>
                </div>
              </>
            ) : selectedMovie ? (
              <div style={styles.noTrailer}>
                <div style={styles.placeholderIcon}>🎥</div>
                <p style={styles.placeholderText}>
                  No trailer available for "{selectedMovie.title}"
                </p>
                <p style={styles.placeholderSubtext}>
                  Try searching for another movie or check YouTube directly
                </p>
              </div>
            ) : (
              <div style={styles.noTrailer}>
                <div style={styles.placeholderIcon}>📽️</div>
                <p style={styles.placeholderText}>
                  Search for a movie above to see its trailer here
                </p>
                <p style={styles.placeholderSubtext}>
                  The trailer will appear in this section once you select a movie
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}