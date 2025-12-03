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

  const searchMovies = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!query.trim()) return;

    setIsSearching(true);
    onLoadingChange(true);

    try {
      // Search movies on TMDB
      const searchResponse = await axios.get(`/api/ai?action=search&query=${encodeURIComponent(query)}`);
      
      if (searchResponse.data.success) {
        setSearchResults(searchResponse.data.results);
      }
    } catch (error) {
      console.error('Search error:', error);
    } finally {
      setIsSearching(false);
    }
  };

  const handleMovieSelect = async (movie: any) => {
    onLoadingChange(true);
    onMovieSelect(movie);
    
    try {
      // Get trailer and AI analysis
      const response = await axios.get(`/api/ai?action=analyze&movieId=${movie.id}`);
      
      if (response.data.success) {
        onTrailerFound(response.data.trailerUrl);
        onMovieSelect({ ...movie, aiAnalysis: response.data.analysis });
      }
    } catch (error) {
      console.error('Error fetching movie details:', error);
    } finally {
      onLoadingChange(false);
    }
    
    setSearchResults([]);
    setQuery(movie.title);
  };

  return (
    <div className="bg-gray-800 rounded-xl p-6 shadow-2xl">
      <form onSubmit={searchMovies} className="mb-6">
        <div className="flex gap-2">
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search for a movie..."
            className="flex-grow px-4 py-3 bg-gray-900 border border-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 text-white"
          />
          <button
            type="submit"
            disabled={isSearching}
            className="px-6 py-3 bg-gradient-to-r from-purple-600 to-pink-600 rounded-lg font-semibold hover:opacity-90 transition-opacity disabled:opacity-50"
          >
            {isSearching ? 'Searching...' : 'Search'}
          </button>
        </div>
      </form>

      {searchResults.length > 0 && (
        <div className="max-h-96 overflow-y-auto space-y-2">
          {searchResults.map((movie) => (
            <button
              key={movie.id}
              onClick={() => handleMovieSelect(movie)}
              className="w-full p-4 bg-gray-900 hover:bg-gray-700 rounded-lg transition-colors text-left"
            >
              <div className="flex items-center gap-4">
                {movie.poster_path && (
                  <img
                    src={`https://image.tmdb.org/t/p/w92${movie.poster_path}`}
                    alt={movie.title}
                    className="w-12 h-18 object-cover rounded"
                  />
                )}
                <div>
                  <h3 className="font-semibold">{movie.title}</h3>
                  <p className="text-sm text-gray-400">
                    {movie.release_date?.split('-')[0]} • ⭐ {movie.vote_average?.toFixed(1)}
                  </p>
                </div>
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}