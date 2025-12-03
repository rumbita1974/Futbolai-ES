interface AIHostProps {
  movie: any;
  isLoading: boolean;
}

export default function AIHost({ movie, isLoading }: AIHostProps) {
  if (!movie) {
    return (
      <div className="bg-gradient-to-br from-gray-800 to-gray-900 rounded-2xl p-8 shadow-2xl h-full flex flex-col justify-center">
        <div className="text-center">
          <div className="text-6xl mb-6">🎬</div>
          <h2 className="text-3xl font-bold mb-4">Welcome to Movie AI Explorer</h2>
          <p className="text-gray-300">
            Search for a movie to get AI-powered insights, reviews, and watch the trailer!
          </p>
        </div>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="bg-gradient-to-br from-gray-800 to-gray-900 rounded-2xl p-8 shadow-2xl h-full flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-t-2 border-b-2 border-purple-500 mx-auto mb-4"></div>
          <p className="text-xl">Analyzing {movie.title}...</p>
          <p className="text-gray-400 mt-2">Fetching AI insights and trailer</p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-gradient-to-br from-gray-800 to-gray-900 rounded-2xl p-8 shadow-2xl h-full">
      <div className="flex items-start gap-6 mb-8">
        {movie.poster_path && (
          <img
            src={`https://image.tmdb.org/t/p/w300${movie.poster_path}`}
            alt={movie.title}
            className="w-40 h-60 object-cover rounded-xl shadow-lg"
          />
        )}
        <div>
          <h1 className="text-3xl font-bold mb-2">{movie.title}</h1>
          <div className="flex items-center gap-4 mb-4">
            <span className="px-3 py-1 bg-purple-600 rounded-full text-sm">
              {movie.release_date?.split('-')[0]}
            </span>
            <span className="text-yellow-400">⭐ {movie.vote_average?.toFixed(1)}</span>
            <span className="text-gray-400">{movie.runtime} min</span>
          </div>
          <p className="text-gray-300">{movie.overview}</p>
        </div>
      </div>

      {movie.aiAnalysis && (
        <div className="space-y-6">
          <div className="bg-gray-900/50 rounded-xl p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-8 h-8 bg-gradient-to-r from-purple-500 to-pink-500 rounded-full flex items-center justify-center">
                🤖
              </div>
              <h3 className="text-xl font-bold">AI Summary</h3>
            </div>
            <p className="text-gray-200 leading-relaxed">{movie.aiAnalysis.summary}</p>
          </div>

          <div className="bg-gray-900/50 rounded-xl p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-8 h-8 bg-gradient-to-r from-blue-500 to-cyan-500 rounded-full flex items-center justify-center">
                ✍️
              </div>
              <h3 className="text-xl font-bold">AI Review</h3>
            </div>
            <p className="text-gray-200 leading-relaxed">{movie.aiAnalysis.review}</p>
          </div>

          {movie.aiAnalysis.keyPoints && (
            <div className="bg-gray-900/50 rounded-xl p-6">
              <h3 className="text-xl font-bold mb-4">Key Points</h3>
              <ul className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {movie.aiAnalysis.keyPoints.map((point: string, index: number) => (
                  <li key={index} className="flex items-center gap-2">
                    <span className="text-purple-400">▸</span>
                    <span>{point}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
    </div>
  );
}