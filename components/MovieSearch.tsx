import { useState } from 'react';
import axios from 'axios';

interface MovieSearchProps {
  onMovieSelect: (movie: any) => void;
  onTrailerFound: (url: string) => void;
  onLoadingChange: (isLoading: boolean) => void;
}

export default function MovieSearch({ onMovieSelect, onTrailerFound, onLoadingChange }: MovieSearchProps) {
  const [query, setQuery] = useState('');
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [searchError, setSearchError] = useState<string>('');
  const [searchSuggestions, setSearchSuggestions] = useState<string[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);

  const styles = {
    container: {
      background: 'linear-gradient(135deg, rgba(30, 41, 59, 0.9) 0%, rgba(15, 23, 42, 0.9) 100%)',
      borderRadius: '1.5rem',
      padding: '2rem',
      boxShadow: '0 20px 60px rgba(0, 0, 0, 0.3)',
      border: '1px solid rgba(255, 255, 255, 0.1)',
    },
    inputContainer: {
      position: 'relative' as const,
      marginBottom: '1rem',
    },
    input: {
      width: '100%',
      padding: '1rem 1.25rem',
      background: 'rgba(15, 23, 42, 0.7)',
      border: '2px solid rgba(139, 92, 246, 0.2)',
      borderRadius: '1rem',
      color: 'white',
      fontSize: '1.125rem',
      outline: 'none',
      transition: 'all 0.2s',
    },
    inputFocus: {
      borderColor: 'rgba(139, 92, 246, 0.5)',
      boxShadow: '0 0 0 3px rgba(139, 92, 246, 0.1)',
    },
    button: {
      padding: '1rem 2rem',
      background: 'linear-gradient(135deg, #8b5cf6 0%, #3b82f6 100%)',
      borderRadius: '1rem',
      fontWeight: 600,
      border: 'none',
      color: 'white',
      cursor: 'pointer',
      fontSize: '1.125rem',
      transition: 'all 0.2s',
      width: '100%',
      marginTop: '1rem',
    },
    buttonHover: {
      background: 'linear-gradient(135deg, #7c3aed 0%, #2563eb 100%)',
      transform: 'translateY(-1px)',
      boxShadow: '0 10px 25px rgba(139, 92, 246, 0.3)',
    },
    movieItem: {
      width: '100%',
      padding: '1.25rem',
      background: 'rgba(15, 23, 42, 0.6)',
      border: '1px solid rgba(255, 255, 255, 0.05)',
      borderRadius: '1rem',
      color: 'white',
      textAlign: 'left' as const,
      cursor: 'pointer',
      marginBottom: '0.75rem',
      transition: 'all 0.2s',
      display: 'flex',
      alignItems: 'center',
      gap: '1rem',
    },
    movieItemHover: {
      background: 'rgba(30, 41, 59, 0.8)',
      borderColor: 'rgba(139, 92, 246, 0.3)',
      transform: 'translateX(4px)',
    },
    resultsContainer: {
      maxHeight: '24rem',
      overflowY: 'auto' as const,
      marginTop: '1.5rem',
    },
    error: {
      background: 'rgba(220, 38, 38, 0.1)',
      color: '#fca5a5',
      padding: '1rem',
      borderRadius: '0.75rem',
      marginTop: '1rem',
      fontSize: '1rem',
      border: '1px solid rgba(220, 38, 38, 0.2)',
    },
    loading: {
      color: '#94a3b8',
      textAlign: 'center' as const,
      padding: '2rem',
      display: 'flex',
      flexDirection: 'column' as const,
      alignItems: 'center',
      gap: '1rem',
    },
    spinner: {
      width: '2.5rem',
      height: '2.5rem',
      border: '3px solid rgba(139, 92, 246, 0.2)',
      borderTopColor: '#8b5cf6',
      borderRadius: '50%',
      animation: 'spin 1s linear infinite',
    },
    suggestionsContainer: {
      background: 'rgba(59, 130, 246, 0.1)',
      borderRadius: '1rem',
      padding: '1.5rem',
      marginTop: '1rem',
      border: '1px solid rgba(59, 130, 246, 0.2)',
    },
    suggestionsTitle: {
      color: '#93c5fd',
      marginBottom: '1rem',
      fontWeight: 600,
      fontSize: '1.125rem',
      display: 'flex',
      alignItems: 'center',
      gap: '0.5rem',
    },
    suggestionItem: {
      background: 'rgba(59, 130, 246, 0.15)',
      border: '1px solid rgba(59, 130, 246, 0.3)',
      color: '#bfdbfe',
      padding: '0.75rem 1rem',
      borderRadius: '0.75rem',
      textAlign: 'left' as const,
      cursor: 'pointer',
      transition: 'all 0.2s',
      marginBottom: '0.5rem',
      width: '100%',
      fontSize: '1rem',
    },
    suggestionItemHover: {
      background: 'rgba(59, 130, 246, 0.25)',
      borderColor: 'rgba(59, 130, 246, 0.5)',
      transform: 'translateX(4px)',
    },
    helpText: {
      color: '#64748b',
      fontSize: '0.875rem',
      marginTop: '0.75rem',
      fontStyle: 'italic',
    },
  };

  const searchMovies = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!query.trim()) {
      setSearchError('Please enter a movie title');
      setSearchSuggestions([]);
      return;
    }

    setIsSearching(true);
    setSearchError('');
    setSearchSuggestions([]);
    setShowSuggestions(false);
    onLoadingChange(true);

    try {
      const searchResponse = await axios.get(`/api/ai?action=search&query=${encodeURIComponent(query)}`);
      
      if (searchResponse.data.success) {
        const results = searchResponse.data.results;
        
        if (results.length === 0) {
          // No results - show suggestions from API
          if (searchResponse.data.searchSuggestions) {
            setSearchSuggestions(searchResponse.data.searchSuggestions);
            setShowSuggestions(true);
          }
          
          setSearchError(searchResponse.data.suggestion || `No movies found for "${query}"`);
          
          if (searchResponse.data.helpText) {
            setSearchError(prev => prev + '. ' + searchResponse.data.helpText);
          }
        } else {
          setSearchResults(results);
          setSearchSuggestions([]);
          
          // Show suggestion if query was interpreted
          if (searchResponse.data.suggestion) {
            setSearchError(searchResponse.data.suggestion);
          }
        }
      } else {
        setSearchError(searchResponse.data.error || 'Search failed. Please try again.');
      }
    } catch (error: any) {
      console.error('Search error:', error);
      
      if (error.response?.status === 401) {
        setSearchError('API configuration error. Please check your TMDB API key.');
      } else if (error.response?.status === 500) {
        setSearchError('Server error. Please try again later.');
      } else {
        setSearchError('Failed to search movies. Please check your connection.');
      }
    } finally {
      setIsSearching(false);
      onLoadingChange(false);
    }
  };

  const handleMovieSelect = async (movie: any) => {
    setSearchError('');
    setSearchSuggestions([]);
    setShowSuggestions(false);
    onLoadingChange(true);
    onMovieSelect(movie);
    
    try {
      const response = await axios.get(`/api/ai?action=analyze&movieId=${movie.id}`);
      
      if (response.data.success) {
        onTrailerFound(response.data.trailerUrl || '');
        onMovieSelect({ 
          ...movie, 
          aiAnalysis: response.data.analysis,
          runtime: response.data.movie?.runtime || movie.runtime,
          vote_average: response.data.movie?.vote_average || movie.vote_average,
          release_date: response.data.movie?.release_date || movie.release_date,
          overview: response.data.movie?.overview || movie.overview,
          poster_path: response.data.movie?.poster_path || movie.poster_path
        });
      } else {
        console.error('API Error:', response.data.error);
        onMovieSelect({ 
          ...movie, 
          aiAnalysis: {
            summary: movie.overview || 'No summary available',
            review: 'Could not load AI analysis. ' + (response.data.error || 'Please try again.'),
            keyPoints: []
          }
        });
      }
    } catch (error: any) {
      console.error('Error fetching movie details:', error);
      onMovieSelect({ 
        ...movie, 
        aiAnalysis: {
          summary: movie.overview || 'No summary available',
          review: 'Error: ' + (error.response?.data?.error || error.message || 'Failed to load analysis'),
          keyPoints: ['Check API configuration', 'Try again later', 'Contact support if issue persists']
        }
      });
      
      if (movie.videos?.results?.[0]?.key) {
        onTrailerFound(`https://www.youtube.com/embed/${movie.videos.results[0].key}`);
      }
    } finally {
      onLoadingChange(false);
    }
    
    setSearchResults([]);
    setQuery(movie.title);
  };

  const handleSuggestionClick = (suggestion: string) => {
    setQuery(suggestion);
    setSearchSuggestions([]);
    setShowSuggestions(false);
    setSearchError('');
    
    // Auto-search when clicking suggestion
    const fakeEvent = { preventDefault: () => {} } as React.FormEvent;
    setTimeout(() => searchMovies(fakeEvent), 100);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setQuery(e.target.value);
    if (searchError) setSearchError('');
    if (showSuggestions) setShowSuggestions(false);
  };

  // Add CSS for spinner animation
  const spinnerStyle = `
    @keyframes spin {
      to { transform: rotate(360deg); }
    }
  `;

  return (
    <div style={styles.container}>
      <style>{spinnerStyle}</style>
      
      <form onSubmit={searchMovies}>
        <div style={styles.inputContainer}>
          <input
            type="text"
            value={query}
            onChange={handleInputChange}
            placeholder="Search for a movie title..."
            style={styles.input}
            disabled={isSearching}
            onFocus={(e) => e.target.style.cssText = Object.entries({...styles.input, ...styles.inputFocus}).map(([k, v]) => `${k}: ${v}`).join(';')}
            onBlur={(e) => e.target.style.cssText = Object.entries(styles.input).map(([k, v]) => `${k}: ${v}`).join(';')}
          />
        </div>
        
        <button
          type="submit"
          disabled={isSearching}
          style={styles.button}
          onMouseEnter={(e) => e.currentTarget.style.cssText = Object.entries({...styles.button, ...styles.buttonHover}).map(([k, v]) => `${k}: ${v}`).join(';')}
          onMouseLeave={(e) => e.currentTarget.style.cssText = Object.entries(styles.button).map(([k, v]) => `${k}: ${v}`).join(';')}
        >
          {isSearching ? 'Searching...' : 'Search Movies'}
        </button>
      </form>

      {searchError && (
        <div style={styles.error}>
          {searchError}
        </div>
      )}

      {showSuggestions && searchSuggestions.length > 0 && (
        <div style={styles.suggestionsContainer}>
          <div style={styles.suggestionsTitle}>
            <span>💡</span>
            <span>Try one of these popular movies:</span>
          </div>
          
          <div>
            {searchSuggestions.map((suggestion, index) => (
              <button
                key={index}
                onClick={() => handleSuggestionClick(suggestion)}
                style={styles.suggestionItem}
                onMouseEnter={(e) => e.currentTarget.style.cssText = Object.entries({...styles.suggestionItem, ...styles.suggestionItemHover}).map(([k, v]) => `${k}: ${v}`).join(';')}
                onMouseLeave={(e) => e.currentTarget.style.cssText = Object.entries(styles.suggestionItem).map(([k, v]) => `${k}: ${v}`).join(';')}
              >
                {suggestion}
              </button>
            ))}
          </div>
          
          <p style={styles.helpText}>
            Tip: Search for specific movie titles rather than descriptions for better results.
          </p>
        </div>
      )}

      {isSearching && searchResults.length === 0 && !showSuggestions && (
        <div style={styles.loading}>
          <div style={styles.spinner}></div>
          <div>Searching for "{query}"...</div>
        </div>
      )}

      {searchResults.length > 0 && (
        <div style={styles.resultsContainer}>
          {searchResults.map((movie) => (
            <button
              key={movie.id}
              onClick={() => handleMovieSelect(movie)}
              style={styles.movieItem}
              onMouseEnter={(e) => e.currentTarget.style.cssText = Object.entries({...styles.movieItem, ...styles.movieItemHover}).map(([k, v]) => `${k}: ${v}`).join(';')}
              onMouseLeave={(e) => e.currentTarget.style.cssText = Object.entries(styles.movieItem).map(([k, v]) => `${k}: ${v}`).join(';')}
            >
              {movie.poster_path ? (
                <img
                  src={`https://image.tmdb.org/t/p/w92${movie.poster_path}`}
                  alt={movie.title}
                  style={{ 
                    width: '3rem', 
                    height: '4.5rem', 
                    objectFit: 'cover', 
                    borderRadius: '0.5rem' 
                  }}
                />
              ) : (
                <div style={{
                  width: '3rem',
                  height: '4.5rem',
                  background: 'linear-gradient(135deg, #1e1b4b 0%, #0f172a 100%)',
                  borderRadius: '0.5rem',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: '#475569',
                  fontSize: '1.5rem'
                }}>
                  🎬
                </div>
              )}
              <div style={{ flex: 1 }}>
                <h3 style={{ fontWeight: 600, marginBottom: '0.25rem', fontSize: '1.125rem' }}>
                  {movie.title}
                </h3>
                <div style={{ display: 'flex', gap: '1rem', fontSize: '0.875rem' }}>
                  {movie.release_date && (
                    <span style={{ color: '#94a3b8' }}>
                      {movie.release_date.split('-')[0]}
                    </span>
                  )}
                  {movie.vote_average > 0 && (
                    <span style={{ color: '#fbbf24' }}>
                      ⭐ {movie.vote_average.toFixed(1)}
                    </span>
                  )}
                </div>
                {movie.overview && (
                  <p style={{
                    color: '#94a3b8',
                    fontSize: '0.75rem',
                    marginTop: '0.5rem',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    display: '-webkit-box',
                    WebkitLineClamp: 2,
                    WebkitBoxOrient: 'vertical'
                  }}>
                    {movie.overview}
                  </p>
                )}
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}