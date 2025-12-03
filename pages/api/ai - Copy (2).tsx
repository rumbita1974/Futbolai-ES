import type { NextApiRequest, NextApiResponse } from 'next';
import axios from 'axios';
import { Groq } from 'groq-sdk';

// Initialize Groq for query understanding
function getGroqClient() {
  const GROQ_API_KEY = process.env.GROQ_API_KEY;
  if (!GROQ_API_KEY) {
    throw new Error('GROQ_API_KEY not configured');
  }
  return new Groq({ apiKey: GROQ_API_KEY });
}

// Use AI to understand the search intent
async function understandSearchQuery(query: string, groq: Groq): Promise<{
  intent: 'specific_movie' | 'actor_movies' | 'genre_movies' | 'director_movies' | 'keyword_movies';
  movieTitle?: string;
  actor?: string;
  genre?: string;
  director?: string;
  keywords?: string[];
  year?: number;
}> {
  try {
    const prompt = `Analyze this movie search query and extract the intent:

Query: "${query}"

Respond with a JSON object containing:
1. "intent": One of: "specific_movie", "actor_movies", "genre_movies", "director_movies", "keyword_movies"
2. If intent is "specific_movie", include "movieTitle" (the exact movie title being searched)
3. If intent is "actor_movies", include "actor" (actor's name)
4. If intent is "genre_movies", include "genre" (movie genre)
5. If intent is "director_movies", include "director" (director's name)
6. If intent is "keyword_movies", include "keywords" (array of relevant keywords)
7. If a year is mentioned, include "year" (number)

Examples:
- "iron man 2" → {"intent":"specific_movie","movieTitle":"Iron Man 2"}
- "matthew mcconaughey movies" → {"intent":"actor_movies","actor":"Matthew McConaughey"}
- "romantic comedies" → {"intent":"genre_movies","genre":"romantic comedy"}
- "christopher nolan films" → {"intent":"director_movies","director":"Christopher Nolan"}
- "movies about space exploration" → {"intent":"keyword_movies","keywords":["space","exploration"]}
- "best movies of 2023" → {"intent":"keyword_movies","keywords":["best"],"year":2023}

Now analyze: "${query}"`;

    const completion = await groq.chat.completions.create({
      messages: [{ role: "user", content: prompt }],
      model: "llama-3.3-70b-versatile",
      temperature: 0.3,
      max_tokens: 300,
    });

    const response = completion.choices[0]?.message?.content || '{}';
    const parsed = JSON.parse(response);
    
    console.log('Query understanding:', parsed);
    return parsed;
    
  } catch (error) {
    console.error('Error understanding query:', error);
    // Fallback to simple search
    return { intent: 'keyword_movies', keywords: [query] };
  }
}

// Search movies based on understood intent
async function searchMoviesByIntent(
  intentData: any,
  TMDB_API_KEY: string
): Promise<any[]> {
  try {
    let results: any[] = [];
    
    switch (intentData.intent) {
      case 'specific_movie':
        // Search for specific movie title
        if (intentData.movieTitle) {
          const searchRes = await axios.get(
            `https://api.themoviedb.org/3/search/movie?api_key=${TMDB_API_KEY}&query=${encodeURIComponent(intentData.movieTitle)}&language=en-US&page=1`
          );
          results = searchRes.data.results || [];
        }
        break;
        
      case 'actor_movies':
        // Search for actor, then get their movies
        if (intentData.actor) {
          // First, find the actor
          const actorSearch = await axios.get(
            `https://api.themoviedb.org/3/search/person?api_key=${TMDB_API_KEY}&query=${encodeURIComponent(intentData.actor)}&language=en-US&page=1`
          );
          
          if (actorSearch.data.results.length > 0) {
            const actorId = actorSearch.data.results[0].id;
            
            // Get actor's movie credits
            const actorMovies = await axios.get(
              `https://api.themoviedb.org/3/person/${actorId}/movie_credits?api_key=${TMDB_API_KEY}&language=en-US`
            );
            
            results = (actorMovies.data.cast || [])
              .sort((a: any, b: any) => b.popularity - a.popularity)
              .slice(0, 10);
          }
        }
        break;
        
      case 'genre_movies':
        // Discover movies by genre
        if (intentData.genre) {
          // First, get genre ID
          const genresRes = await axios.get(
            `https://api.themoviedb.org/3/genre/movie/list?api_key=${TMDB_API_KEY}&language=en-US`
          );
          
          const genreMap: Record<string, number> = {};
          genresRes.data.genres.forEach((g: any) => {
            genreMap[g.name.toLowerCase()] = g.id;
          });
          
          // Map common genre names to TMDB genres
          const genreMapping: Record<string, string> = {
            'romantic': 'romance',
            'rom com': 'romance',
            'romantic comedy': 'romance',
            'comedy': 'comedy',
            'action': 'action',
            'adventure': 'adventure',
            'drama': 'drama',
            'horror': 'horror',
            'scifi': 'science fiction',
            'science fiction': 'science fiction',
            'thriller': 'thriller',
            'mystery': 'mystery',
            'fantasy': 'fantasy',
          };
          
          const mappedGenre = genreMapping[intentData.genre.toLowerCase()] || intentData.genre.toLowerCase();
          const genreId = genreMap[mappedGenre];
          
          if (genreId) {
            const discoverRes = await axios.get(
              `https://api.themoviedb.org/3/discover/movie?api_key=${TMDB_API_KEY}&with_genres=${genreId}&sort_by=popularity.desc&language=en-US&page=1`
            );
            results = discoverRes.data.results || [];
          }
        }
        break;
        
      case 'director_movies':
        // Search for director's movies
        if (intentData.director) {
          // Find the director
          const directorSearch = await axios.get(
            `https://api.themoviedb.org/3/search/person?api_key=${TMDB_API_KEY}&query=${encodeURIComponent(intentData.director)}&language=en-US&page=1`
          );
          
          if (directorSearch.data.results.length > 0) {
            const directorId = directorSearch.data.results[0].id;
            
            // Get movies directed by this person
            const directorMovies = await axios.get(
              `https://api.themoviedb.org/3/person/${directorId}/movie_credits?api_key=${TMDB_API_KEY}&language=en-US`
            );
            
            results = (directorMovies.data.crew || [])
              .filter((job: any) => job.job === 'Director')
              .sort((a: any, b: any) => b.popularity - a.popularity)
              .slice(0, 10);
          }
        }
        break;
        
      case 'keyword_movies':
      default:
        // Use keywords for discovery
        const keywords = intentData.keywords || [intentData.query || ''];
        const keyword = keywords.join(' ');
        
        if (intentData.year) {
          // Search with year filter
          const discoverRes = await axios.get(
            `https://api.themoviedb.org/3/discover/movie?api_key=${TMDB_API_KEY}&primary_release_year=${intentData.year}&sort_by=popularity.desc&language=en-US&page=1`
          );
          results = discoverRes.data.results || [];
        } else if (keyword.trim()) {
          // Regular keyword search
          const searchRes = await axios.get(
            `https://api.themoviedb.org/3/search/movie?api_key=${TMDB_API_KEY}&query=${encodeURIComponent(keyword)}&language=en-US&page=1`
          );
          results = searchRes.data.results || [];
        }
        break;
    }
    
    return results.slice(0, 10);
    
  } catch (error) {
    console.error('Error in intent-based search:', error);
    return [];
  }
}

// Get popular movies for suggestions
async function getPopularMovies(TMDB_API_KEY: string): Promise<string[]> {
  try {
    const popularRes = await axios.get(
      `https://api.themoviedb.org/3/movie/popular?api_key=${TMDB_API_KEY}&language=en-US&page=1`
    );
    
    return (popularRes.data.results || [])
      .slice(0, 5)
      .map((movie: any) => movie.title);
  } catch (error) {
    return ['Avatar', 'The Avengers', 'Titanic', 'Inception', 'The Dark Knight'];
  }
}

// Get actor's popular movies for suggestions
async function getActorMovies(actorName: string, TMDB_API_KEY: string): Promise<string[]> {
  try {
    const actorSearch = await axios.get(
      `https://api.themoviedb.org/3/search/person?api_key=${TMDB_API_KEY}&query=${encodeURIComponent(actorName)}&language=en-US&page=1`
    );
    
    if (actorSearch.data.results.length > 0) {
      const actorId = actorSearch.data.results[0].id;
      const actorMovies = await axios.get(
        `https://api.themoviedb.org/3/person/${actorId}/movie_credits?api_key=${TMDB_API_KEY}&language=en-US`
      );
      
      return (actorMovies.data.cast || [])
        .sort((a: any, b: any) => b.popularity - a.popularity)
        .slice(0, 5)
        .map((movie: any) => movie.title);
    }
  } catch (error) {
    // Fallback based on actor name
    if (actorName.toLowerCase().includes('mcconaughey')) {
      return ['Interstellar', 'Dallas Buyers Club', 'The Wolf of Wall Street', 'True Detective', 'Mud'];
    }
    if (actorName.toLowerCase().includes('dicaprio')) {
      return ['Titanic', 'Inception', 'The Revenant', 'The Wolf of Wall Street', 'Shutter Island'];
    }
  }
  
  return [];
}

// Main AI analysis function (same as before, but I'll include it for completeness)
async function getAIAnalysis(movieData: any, groq: Groq) {
  console.log(`Getting AI analysis for: ${movieData.title}`);
  
  try {
    const prompt = `You are a film critic analyzing "${movieData.title}" (${movieData.release_date?.split('-')[0] || 'N/A'}).

DO NOT repeat or paraphrase this plot overview: "${movieData.overview || 'No overview'}"

Instead, provide your own original analysis with this EXACT format:

SUMMARY: [Write a fresh 2-3 sentence summary that captures the essence of the film without repeating the plot above]
REVIEW: [Write a one-sentence critical review mentioning strengths and/or weaknesses]
KEY POINTS:
• [First interesting fact or highlight]
• [Second interesting fact or highlight]
• [Third interesting fact or highlight]
• [Fourth interesting fact or highlight]
• [Fifth interesting fact or highlight]

Make sure each section starts on a new line and uses the exact labels above.`;

    const completion = await groq.chat.completions.create({
      messages: [{ role: "user", content: prompt }],
      model: "llama-3.3-70b-versatile",
      temperature: 0.8,
      max_tokens: 600,
    });

    const aiResponse = completion.choices[0]?.message?.content || '';
    
    return parseAIResponse(aiResponse, movieData.overview);
    
  } catch (error: any) {
    console.error('Groq API Error:', error.message);
    return getMockAnalysis(movieData);
  }
}

function parseAIResponse(response: string, fallbackOverview: string) {
  const cleanResponse = response.trim();
  
  let summary = fallbackOverview;
  let review = 'AI review generated';
  let keyPoints: string[] = [];
  
  // Extract SUMMARY
  const summaryMatch = cleanResponse.match(/SUMMARY:\s*(.+?)(?=\s*(?:REVIEW:|KEY POINTS:|$))/is);
  if (summaryMatch && summaryMatch[1]) {
    summary = summaryMatch[1].trim();
  }
  
  // Extract REVIEW
  const reviewMatch = cleanResponse.match(/REVIEW:\s*(.+?)(?=\s*(?:KEY POINTS:|•|-|\d\.|$))/is);
  if (reviewMatch && reviewMatch[1]) {
    review = reviewMatch[1].trim();
  }
  
  // Extract KEY POINTS
  const keyPointsSection = cleanResponse.match(/KEY POINTS:(.+?)(?=\s*(?:[A-Z]+:|$))/is);
  if (keyPointsSection && keyPointsSection[1]) {
    const pointsText = keyPointsSection[1];
    const bulletRegex = /[•\-*]\s*(.+?)(?=\n[•\-*]|\n\n|$)/g;
    let match;
    
    while ((match = bulletRegex.exec(pointsText)) !== null) {
      if (match[1].trim().length > 5) {
        keyPoints.push(match[1].trim());
      }
    }
  }
  
  // Ensure we have key points
  if (keyPoints.length < 3) {
    keyPoints = [
      'Engaging narrative structure',
      'Memorable character development',
      'Strong visual presentation',
      'Effective use of genre conventions',
      'Worthwhile viewing experience'
    ].slice(0, 5);
  }
  
  return {
    summary: summary || fallbackOverview || 'No summary available',
    review: review || 'Critical review generated by AI analysis',
    keyPoints: keyPoints.slice(0, 5)
  };
}

function getMockAnalysis(movieData: any) {
  const title = movieData.title.toLowerCase();
  
  if (title.includes('avatar')) {
    return {
      summary: 'James Cameron\'s groundbreaking sci-fi epic revolutionized 3D cinema with its immersive world of Pandora.',
      review: 'A visual masterpiece that set new standards for CGI and 3D filmmaking.',
      keyPoints: [
        'Pioneered new motion capture and 3D technologies',
        'Highest-grossing film worldwide for over a decade',
        'Strong environmental and anti-colonial themes',
        'Developed its own Na\'vi language',
        'Took over four years of production'
      ]
    };
  }
  
  return {
    summary: `${movieData.title} presents a compelling cinematic experience.`,
    review: 'Critically praised for its strong filmmaking and impactful scenes.',
    keyPoints: [
      `Released in ${movieData.release_date?.split('-')[0] || 'N/A'}`,
      `Rated ${movieData.vote_average?.toFixed(1) || 'N/A'}/10`,
      'Feature-length presentation',
      'Available across multiple platforms',
      'Worthwhile viewing experience'
    ]
  };
}

// Main API handler
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const { action, query, movieId } = req.query;

  // Get API keys
  const TMDB_API_KEY = process.env.NEXT_PUBLIC_TMDB_KEY || process.env.TMDB_API_KEY;
  const GROQ_API_KEY = process.env.GROQ_API_KEY;

  if (!TMDB_API_KEY) {
    return res.status(500).json({ 
      success: false, 
      error: 'TMDB API key not configured' 
    });
  }

  if (!GROQ_API_KEY) {
    return res.status(500).json({ 
      success: false, 
      error: 'Groq API key not configured' 
    });
  }

  try {
    if (action === 'search') {
      if (!query || typeof query !== 'string') {
        return res.status(400).json({ success: false, error: 'Query parameter is required' });
      }

      console.log('Processing search query:', query);
      
      const groq = getGroqClient();
      
      // Step 1: Understand the query intent using AI
      const intentData = await understandSearchQuery(query, groq);
      console.log('Understood intent:', intentData);
      
      // Step 2: Search based on intent
      let results = await searchMoviesByIntent(intentData, TMDB_API_KEY);
      
      // Step 3: If no results, try a direct search as fallback
      if (results.length === 0) {
        const fallbackRes = await axios.get(
          `https://api.themoviedb.org/3/search/movie?api_key=${TMDB_API_KEY}&query=${encodeURIComponent(query)}&language=en-US&page=1`
        );
        results = fallbackRes.data.results || [];
      }
      
      // Step 4: Get suggestions based on intent
      let searchSuggestions: string[] = [];
      
      if (results.length === 0) {
        if (intentData.actor) {
          searchSuggestions = await getActorMovies(intentData.actor, TMDB_API_KEY);
        } else {
          searchSuggestions = await getPopularMovies(TMDB_API_KEY);
        }
      }
      
      return res.status(200).json({
        success: true,
        results: results.slice(0, 10),
        queryType: intentData.intent,
        searchSuggestions: searchSuggestions.slice(0, 5),
        suggestion: results.length === 0 
          ? `No movies found for "${query}". Try one of these:`
          : `Found ${results.length} movies matching your search`,
        interpretedAs: intentData
      });
    }

    if (action === 'analyze' && movieId) {
      if (!movieId || typeof movieId !== 'string') {
        return res.status(400).json({ success: false, error: 'Movie ID parameter is required' });
      }

      const groq = getGroqClient();

      // Get movie details from TMDB
      const movieRes = await axios.get(
        `https://api.themoviedb.org/3/movie/${movieId}?api_key=${TMDB_API_KEY}&append_to_response=videos,credits`
      );
      
      const movieData = movieRes.data;

      // Get trailer
      let trailerUrl = '';
      const trailerVideo = movieData.videos?.results?.find(
        (video: any) => video.site === 'YouTube' && (video.type === 'Trailer' || video.type === 'Teaser')
      );
      
      if (trailerVideo) {
        trailerUrl = `https://www.youtube.com/embed/${trailerVideo.key}`;
      }

      // Get AI analysis
      const analysis = await getAIAnalysis(movieData, groq);

      return res.status(200).json({
        success: true,
        movie: movieData,
        trailerUrl: trailerUrl || null,
        analysis
      });
    }

    return res.status(400).json({ success: false, error: 'Invalid action' });
  } catch (error: any) {
    console.error('API Error:', error.message);
    
    return res.status(error.response?.status || 500).json({ 
      success: false, 
      error: error.response?.data?.status_message || error.message || 'Internal server error'
    });
  }
}