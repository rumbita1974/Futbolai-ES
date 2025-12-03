interface AIHostProps {
  movie: any;
  isLoading: boolean;
}

export default function AIHost({ movie, isLoading }: AIHostProps) {
  const styles = {
    container: {
      background: 'linear-gradient(135deg, rgba(30, 41, 59, 0.9) 0%, rgba(15, 23, 42, 0.9) 100%)',
      borderRadius: '1.5rem',
      padding: '2.5rem',
      boxShadow: '0 20px 60px rgba(0, 0, 0, 0.3)',
      border: '1px solid rgba(255, 255, 255, 0.1)',
      height: '100%',
      display: 'flex',
      flexDirection: 'column' as const,
    },
    loading: {
      display: 'flex',
      flexDirection: 'column' as const,
      alignItems: 'center',
      justifyContent: 'center',
      height: '100%',
      gap: '1.5rem',
    },
    spinner: {
      width: '4rem',
      height: '4rem',
      border: '4px solid rgba(139, 92, 246, 0.2)',
      borderTopColor: '#8b5cf6',
      borderRadius: '50%',
      animation: 'spin 1s linear infinite',
    },
    welcome: {
      textAlign: 'center' as const,
      padding: '3rem 2rem',
    },
    welcomeIcon: {
      fontSize: '5rem',
      marginBottom: '1.5rem',
      opacity: 0.8,
      filter: 'drop-shadow(0 4px 6px rgba(0, 0, 0, 0.3))',
    },
    welcomeTitle: {
      fontSize: '2.5rem',
      fontWeight: 700,
      marginBottom: '1rem',
      background: 'linear-gradient(to right, #8b5cf6, #3b82f6)',
      WebkitBackgroundClip: 'text',
      WebkitTextFillColor: 'transparent',
    },
    welcomeText: {
      color: '#cbd5e1',
      fontSize: '1.25rem',
      lineHeight: 1.6,
      maxWidth: '600px',
      margin: '0 auto',
    },
    movieLayout: {
      display: 'grid',
      gridTemplateColumns: '1fr',
      gap: '3rem',
      '@media (min-width: 768px)': {
        gridTemplateColumns: '300px 1fr',
        gap: '3rem',
      },
    },
    posterColumn: {
      display: 'flex',
      flexDirection: 'column' as const,
      alignItems: 'center',
    },
    poster: {
      width: '100%',
      maxWidth: '300px',
      height: '450px',
      objectFit: 'cover',
      borderRadius: '1rem',
      boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)',
      marginBottom: '1.5rem',
      border: '1px solid rgba(255, 255, 255, 0.1)',
    },
    posterPlaceholder: {
      width: '100%',
      maxWidth: '300px',
      height: '450px',
      background: 'linear-gradient(135deg, #1e1b4b 0%, #0f172a 100%)',
      borderRadius: '1rem',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      fontSize: '4rem',
      color: '#475569',
      boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)',
      marginBottom: '1.5rem',
      border: '2px dashed rgba(255, 255, 255, 0.1)',
    },
    infoColumn: {
      display: 'flex',
      flexDirection: 'column' as const,
      gap: '2.5rem',
    },
    movieHeader: {
      marginBottom: '0.5rem',
    },
    movieTitle: {
      fontSize: '2.5rem',
      fontWeight: 800,
      marginBottom: '0.75rem',
      color: '#f8fafc',
      lineHeight: 1.2,
    },
    movieMeta: {
      display: 'flex',
      flexWrap: 'wrap' as const,
      gap: '1rem',
      alignItems: 'center',
      marginBottom: '1.5rem',
    },
    yearBadge: {
      background: 'linear-gradient(to right, #8b5cf6, #3b82f6)',
      padding: '0.5rem 1.25rem',
      borderRadius: '2rem',
      fontWeight: 600,
      fontSize: '0.875rem',
    },
    rating: {
      display: 'flex',
      alignItems: 'center',
      gap: '0.5rem',
      color: '#fbbf24',
      fontWeight: 600,
      fontSize: '1.125rem',
    },
    runtime: {
      color: '#94a3b8',
      fontSize: '1rem',
      fontWeight: 500,
    },
    overview: {
      color: '#cbd5e1',
      fontSize: '1.125rem',
      lineHeight: 1.7,
      marginBottom: '2rem',
    },
    analysisSection: {
      display: 'flex',
      flexDirection: 'column' as const,
      gap: '2rem',
    },
    analysisCard: {
      background: 'rgba(15, 23, 42, 0.6)',
      borderRadius: '1rem',
      padding: '2rem',
      border: '1px solid rgba(255, 255, 255, 0.05)',
    },
    cardHeader: {
      display: 'flex',
      alignItems: 'center',
      gap: '1rem',
      marginBottom: '1.5rem',
    },
    iconContainer: {
      width: '3rem',
      height: '3rem',
      borderRadius: '50%',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      fontSize: '1.5rem',
    },
    summaryIcon: {
      background: 'linear-gradient(135deg, #8b5cf6 0%, #3b82f6 100%)',
    },
    reviewIcon: {
      background: 'linear-gradient(135deg, #10b981 0%, #3b82f6 100%)',
    },
    pointsIcon: {
      background: 'linear-gradient(135deg, #f59e0b 0%, #ec4899 100%)',
    },
    cardTitle: {
      fontSize: '1.5rem',
      fontWeight: 700,
      color: '#f8fafc',
    },
    cardContent: {
      color: '#cbd5e1',
      fontSize: '1.125rem',
      lineHeight: 1.7,
    },
    keyPointsList: {
      display: 'flex',
      flexDirection: 'column' as const,
      gap: '1rem',
      marginTop: '1rem',
    },
    keyPointItem: {
      display: 'flex',
      alignItems: 'flex-start',
      gap: '0.75rem',
      padding: '0.75rem',
      background: 'rgba(255, 255, 255, 0.03)',
      borderRadius: '0.75rem',
    },
    pointMarker: {
      color: '#8b5cf6',
      fontSize: '1.25rem',
      marginTop: '0.25rem',
    },
    pointText: {
      color: '#cbd5e1',
      fontSize: '1rem',
      lineHeight: 1.6,
      flex: 1,
    },
    genres: {
      display: 'flex',
      flexWrap: 'wrap' as const,
      gap: '0.75rem',
      marginTop: '1.5rem',
    },
    genreTag: {
      background: 'rgba(139, 92, 246, 0.1)',
      color: '#c4b5fd',
      padding: '0.5rem 1rem',
      borderRadius: '0.5rem',
      fontSize: '0.875rem',
      fontWeight: 500,
      border: '1px solid rgba(139, 92, 246, 0.2)',
    },
  };

  // Add CSS for spinner animation
  const spinnerStyle = `
    @keyframes spin {
      to { transform: rotate(360deg); }
    }
  `;

  if (!movie) {
    return (
      <div style={styles.container}>
        <style>{spinnerStyle}</style>
        <div style={styles.welcome}>
          <div style={styles.welcomeIcon}>🎬</div>
          <h2 style={styles.welcomeTitle}>Welcome to Movie AI Explorer</h2>
          <p style={styles.welcomeText}>
            Search for any movie to get AI-powered insights, detailed reviews, 
            and watch the official trailer. Discover new films or explore your favorites!
          </p>
        </div>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div style={styles.container}>
        <style>{spinnerStyle}</style>
        <div style={styles.loading}>
          <div style={styles.spinner}></div>
          <div style={{ textAlign: 'center' as const }}>
            <div style={{ fontSize: '1.5rem', fontWeight: 600, marginBottom: '0.5rem', color: '#f8fafc' }}>
              Analyzing "{movie.title}"...
            </div>
            <div style={{ color: '#94a3b8' }}>
              Fetching AI insights and trailer
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div style={styles.container}>
      <style>{spinnerStyle}</style>
      
      <div style={styles.movieLayout}>
        {/* Left Column: Poster */}
        <div style={styles.posterColumn}>
          {movie.poster_path ? (
            <img
              src={`https://image.tmdb.org/t/p/w500${movie.poster_path}`}
              alt={movie.title}
              style={styles.poster}
              onError={(e) => {
                e.currentTarget.style.display = 'none';
                const parent = e.currentTarget.parentElement;
                if (parent) {
                  const placeholder = document.createElement('div');
                  placeholder.style.cssText = Object.entries(styles.posterPlaceholder)
                    .map(([key, value]) => `${key}: ${value}`)
                    .join(';');
                  placeholder.textContent = '🎬';
                  parent.appendChild(placeholder);
                }
              }}
            />
          ) : (
            <div style={styles.posterPlaceholder}>
              🎬
            </div>
          )}
          
          {/* Movie stats below poster */}
          <div style={{
            display: 'flex',
            flexDirection: 'column',
            gap: '0.75rem',
            width: '100%',
            maxWidth: '300px',
          }}>
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              padding: '0.75rem',
              background: 'rgba(15, 23, 42, 0.5)',
              borderRadius: '0.75rem',
            }}>
              <span style={{ color: '#94a3b8', fontSize: '0.875rem' }}>Rating</span>
              <span style={{ color: '#fbbf24', fontWeight: 600 }}>
                ⭐ {movie.vote_average?.toFixed(1) || 'N/A'}/10
              </span>
            </div>
            
            {movie.runtime && (
              <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                padding: '0.75rem',
                background: 'rgba(15, 23, 42, 0.5)',
                borderRadius: '0.75rem',
              }}>
                <span style={{ color: '#94a3b8', fontSize: '0.875rem' }}>Runtime</span>
                <span style={{ color: '#cbd5e1', fontWeight: 500 }}>
                  {Math.floor(movie.runtime / 60)}h {movie.runtime % 60}m
                </span>
              </div>
            )}
            
            {movie.release_date && (
              <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                padding: '0.75rem',
                background: 'rgba(15, 23, 42, 0.5)',
                borderRadius: '0.75rem',
              }}>
                <span style={{ color: '#94a3b8', fontSize: '0.875rem' }}>Released</span>
                <span style={{ color: '#cbd5e1', fontWeight: 500 }}>
                  {new Date(movie.release_date).getFullYear()}
                </span>
              </div>
            )}
          </div>
        </div>

        {/* Right Column: Movie Info and AI Analysis */}
        <div style={styles.infoColumn}>
          {/* Movie Header */}
          <div>
            <div style={styles.movieHeader}>
              <h1 style={styles.movieTitle}>{movie.title}</h1>
              <div style={styles.movieMeta}>
                {movie.release_date && (
                  <span style={styles.yearBadge}>
                    {movie.release_date.split('-')[0]}
                  </span>
                )}
                {movie.vote_average > 0 && (
                  <span style={styles.rating}>
                    ⭐ {movie.vote_average.toFixed(1)}
                  </span>
                )}
                {movie.runtime && (
                  <span style={styles.runtime}>
                    • {movie.runtime} min
                  </span>
                )}
              </div>
            </div>
            
            {movie.overview && (
              <p style={styles.overview}>{movie.overview}</p>
            )}
            
            {movie.genres && movie.genres.length > 0 && (
              <div style={styles.genres}>
                {movie.genres.slice(0, 3).map((genre: any) => (
                  <span key={genre.id} style={styles.genreTag}>
                    {genre.name}
                  </span>
                ))}
              </div>
            )}
          </div>

          {/* AI Analysis Sections */}
          {movie.aiAnalysis && (
            <div style={styles.analysisSection}>
              {/* AI Summary */}
              <div style={styles.analysisCard}>
                <div style={styles.cardHeader}>
                  <div style={{ ...styles.iconContainer, ...styles.summaryIcon }}>
                    🤖
                  </div>
                  <h3 style={styles.cardTitle}>AI Summary</h3>
                </div>
                <p style={styles.cardContent}>
                  {movie.aiAnalysis.summary}
                </p>
              </div>

              {/* AI Review */}
              <div style={styles.analysisCard}>
                <div style={styles.cardHeader}>
                  <div style={{ ...styles.iconContainer, ...styles.reviewIcon }}>
                    ✍️
                  </div>
                  <h3 style={styles.cardTitle}>AI Review</h3>
                </div>
                <p style={styles.cardContent}>
                  {movie.aiAnalysis.review}
                </p>
              </div>

              {/* Key Points */}
              <div style={styles.analysisCard}>
                <div style={styles.cardHeader}>
                  <div style={{ ...styles.iconContainer, ...styles.pointsIcon }}>
                    🔑
                  </div>
                  <h3 style={styles.cardTitle}>Key Points</h3>
                </div>
                <div style={styles.keyPointsList}>
                  {movie.aiAnalysis.keyPoints?.map((point: string, index: number) => (
                    <div key={index} style={styles.keyPointItem}>
                      <span style={styles.pointMarker}>▸</span>
                      <span style={styles.pointText}>{point}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}