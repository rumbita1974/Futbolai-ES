import type { NextApiRequest, NextApiResponse } from 'next';
import axios from 'axios';
import { Groq } from 'groq-sdk';

// Initialize Groq client
function getGroqClient() {
  const GROQ_API_KEY = process.env.GROQ_API_KEY;
  if (!GROQ_API_KEY) {
    throw new Error('GROQ_API_KEY not configured');
  }
  return new Groq({ apiKey: GROQ_API_KEY });
}

// AI-powered query understanding with robust JSON parsing
async function understandSearchQuery(query: string, groq: Groq): Promise<{
  intent: 'specific_movie' | 'actor_movies' | 'genre_movies' | 'director_movies' | 'keyword_movies';
  movieTitle?: string;
  actor?: string;
  genre?: string;
  director?: string;
  keywords?: string[];
  year?: number;
  originalQuery: string;
}> {
  try {
    const prompt = `Analyze this movie search query and extract the intent. Return ONLY a JSON object.

QUERY: "${query}"

Return a JSON object with these fields:
- "intent": Must be one of: "specific_movie", "actor_movies", "genre_movies", "director_movies", "keyword_movies"
- "movieTitle": Only if the user is searching for a specific movie (e.g., "Iron Man 2")
- "actor": Only if the user wants movies with a specific actor (e.g., "Matthew McConaughey")
- "genre": Only if the user wants movies of a specific genre (e.g., "romantic comedy")
- "director": Only if the user wants movies by a specific director (e.g., "Christopher Nolan")
- "keywords": Array of main search keywords (e.g., ["space", "exploration"])
- "year": Only if a specific year is mentioned (e.g., 2023)

IMPORTANT: Return ONLY the JSON object, no other text, no code blocks, no explanations.

EXAMPLES:
For "iron man 2" → {"intent":"specific_movie","movieTitle":"Iron Man 2","keywords":["iron","man","2"],"originalQuery":"iron man 2"}
For "matthew mcconaughey movies" → {"intent":"actor_movies","actor":"Matthew McConaughey","keywords":["matthew","mcconaughey"],"originalQuery":"matthew mcconaughey movies"}
For "romantic comedies" → {"intent":"genre_movies","genre":"romantic comedy","keywords":["romantic","comedies"],"originalQuery":"romantic comedies"}
For "christopher nolan films" → {"intent":"director_movies","director":"Christopher Nolan","keywords":["christopher","nolan"],"originalQuery":"christopher nolan films"}
For "movies about space" → {"intent":"keyword_movies","keywords":["space"],"originalQuery":"movies about space"}
For "best movies of 2023" → {"intent":"keyword_movies","keywords":["best","movies"],"year":2023,"originalQuery":"best movies of 2023"}

Now analyze: "${query}"`;

    console.log('Sending query to Groq for understanding:', query);
    
    const completion = await groq.chat.completions.create({
      messages: [{ 
        role: "user", 
        content: prompt 
      }],
      model: "llama-3.3-70b-versatile",
      temperature: 0.1,
      max_tokens: 300,
      response_format: { type: "json_object" },
    });

    const response = completion.choices[0]?.message?.content || '{}';
    console.log('Raw AI response:', response);
    
    // Clean the response - remove any markdown code blocks or extra text
    let cleanResponse = response.trim();
    
    // Remove JSON code blocks if present
    if (cleanResponse.startsWith('```json')) {
      cleanResponse = cleanResponse.substring(7);
    }
    if (cleanResponse.startsWith('```')) {
      cleanResponse = cleanResponse.substring(3);
    }
    if (cleanResponse.endsWith('```')) {
      cleanResponse = cleanResponse.substring(0, cleanResponse.length - 3);
    }
    
    cleanResponse = cleanResponse.trim();
    
    // Parse the JSON
    const parsed = JSON.parse(cleanResponse);
    
    // Ensure originalQuery is set
    parsed.originalQuery = query;
    
    console.log('Parsed query understanding:', parsed);
    return parsed;
    
  } catch (error: any) {
    console.error('AI query understanding failed:', error.message);
    console.error('Error stack:', error.stack);
    
    // Comprehensive fallback logic
    return getQueryUnderstandingFallback(query);
  }
}

// Fallback query understanding without AI
function getQueryUnderstandingFallback(query: string) {
  const lowerQuery = query.toLowerCase().trim();
  
  console.log('Using fallback query understanding for:', query);
  
  // Remove common filler words
  const fillerWords = [
    'suggest', 'recommend', 'show', 'find', 'search', 'look', 
    'movie', 'movies', 'film', 'films', 'about', 'with', 'starring',
    'featuring', 'by', 'directed', 'good', 'best', 'top', 'popular'
  ];
  
  let cleanQuery = lowerQuery;
  fillerWords.forEach(word => {
    const regex = new RegExp(`\\b${word}\\b`, 'gi');
    cleanQuery = cleanQuery.replace(regex, '');
  });
  
  cleanQuery = cleanQuery.replace(/\s+/g, ' ').trim();
  
  // Check for actor names (case-insensitive)
  const actorPatterns = [
    { name: 'Matthew McConaughey', patterns: ['mcconaughey', 'matthew mcconaughey'] },
    { name: 'Leonardo DiCaprio', patterns: ['dicaprio', 'leonardo dicaprio', 'leo dicaprio'] },
    { name: 'Tom Hanks', patterns: ['tom hanks', 'hanks'] },
    { name: 'Meryl Streep', patterns: ['meryl streep', 'streep'] },
    { name: 'Jennifer Lawrence', patterns: ['jennifer lawrence', 'lawrence'] },
    { name: 'Brad Pitt', patterns: ['brad pitt', 'pitt'] },
    { name: 'Robert Downey Jr', patterns: ['robert downey', 'downey', 'iron man'] },
    { name: 'Chris Hemsworth', patterns: ['chris hemsworth', 'hemsworth', 'thor'] },
    { name: 'Scarlett Johansson', patterns: ['scarlett johansson', 'johansson', 'black widow'] },
    { name: 'Dwayne Johnson', patterns: ['dwayne johnson', 'the rock'] },
    { name: 'Keanu Reeves', patterns: ['keanu reeves', 'reeves'] },
    { name: 'Johnny Depp', patterns: ['johnny depp', 'depp'] },
    { name: 'Tom Cruise', patterns: ['tom cruise', 'cruise'] }
  ];
  
  for (const actor of actorPatterns) {
    for (const pattern of actor.patterns) {
      if (lowerQuery.includes(pattern)) {
        return {
          intent: 'actor_movies' as const,
          actor: actor.name,
          keywords: [actor.name.toLowerCase()],
          originalQuery: query
        };
      }
    }
  }
  
  // Check for genres
  const genrePatterns = [
    { genre: 'romantic comedy', patterns: ['romantic', 'rom com', 'romcom', 'love story', 'romance'] },
    { genre: 'comedy', patterns: ['comedy', 'funny', 'humor'] },
    { genre: 'action', patterns: ['action', 'adventure'] },
    { genre: 'drama', patterns: ['drama', 'emotional'] },
    { genre: 'horror', patterns: ['horror', 'scary', 'terror'] },
    { genre: 'thriller', patterns: ['thriller', 'suspense'] },
    { genre: 'sci-fi', patterns: ['sci-fi', 'science fiction', 'space', 'alien'] },
    { genre: 'fantasy', patterns: ['fantasy', 'magic'] }
  ];
  
  for (const genre of genrePatterns) {
    for (const pattern of genre.patterns) {
      if (lowerQuery.includes(pattern)) {
        return {
          intent: 'genre_movies' as const,
          genre: genre.genre,
          keywords: [genre.genre],
          originalQuery: query
        };
      }
    }
  }
  
  // Check for specific movie titles/franchises
  const moviePatterns = [
    { title: 'Iron Man', patterns: ['iron man', 'ironman'] },
    { title: 'The Avengers', patterns: ['avengers', 'marvel'] },
    { title: 'Spider-Man', patterns: ['spider-man', 'spiderman'] },
    { title: 'Batman', patterns: ['batman', 'dark knight'] },
    { title: 'Superman', patterns: ['superman'] },
    { title: 'Star Wars', patterns: ['star wars'] },
    { title: 'Harry Potter', patterns: ['harry potter'] },
    { title: 'Lord of the Rings', patterns: ['lord of the rings'] },
    { title: 'Avatar', patterns: ['avatar'] },
    { title: 'Titanic', patterns: ['titanic'] },
    { title: 'Inception', patterns: ['inception'] },
    { title: 'The Matrix', patterns: ['matrix'] }
  ];
  
  for (const movie of moviePatterns) {
    for (const pattern of movie.patterns) {
      if (lowerQuery.includes(pattern)) {
        return {
          intent: 'specific_movie' as const,
          movieTitle: movie.title,
          keywords: [movie.title.toLowerCase()],
          originalQuery: query
        };
      }
    }
  }
  
  // Check for year
  const yearMatch = lowerQuery.match(/\b(19|20)\d{2}\b/);
  const year = yearMatch ? parseInt(yearMatch[0]) : undefined;
  
  // Default to keyword search
  const keywords = cleanQuery.split(' ').filter(w => w.length > 0);
  
  return {
    intent: 'keyword_movies' as const,
    keywords: keywords.length > 0 ? keywords : [query],
    year,
    originalQuery: query
  };
}

// Search movies based on understood intent
async function searchMoviesByIntent(
  intentData: any,
  TMDB_API_KEY: string
): Promise<{ results: any[]; suggestions: string[] }> {
  let results: any[] = [];
  let suggestions: string[] = [];
  
  try {
    console.log('Searching with intent:', intentData.intent);
    
    switch (intentData.intent) {
      case 'specific_movie':
        if (intentData.movieTitle) {
          const searchRes = await axios.get(
            `https://api.themoviedb.org/3/search/movie?api_key=${TMDB_API_KEY}&query=${encodeURIComponent(intentData.movieTitle)}&language=en-US&page=1`
          );
          results = searchRes.data.results || [];
          console.log(`Found ${results.length} results for specific movie: ${intentData.movieTitle}`);
        }
        break;
        
      case 'actor_movies':
        if (intentData.actor) {
          // Search for actor
          const actorSearch = await axios.get(
            `https://api.themoviedb.org/3/search/person?api_key=${TMDB_API_KEY}&query=${encodeURIComponent(intentData.actor)}&language=en-US&page=1`
          );
          
          if (actorSearch.data.results.length > 0) {
            const actorId = actorSearch.data.results[0].id;
            const actorName = actorSearch.data.results[0].name;
            
            console.log(`Found actor: ${actorName} (ID: ${actorId})`);
            
            // Get actor's movie credits
            const actorMovies = await axios.get(
              `https://api.themoviedb.org/3/person/${actorId}/movie_credits?api_key=${TMDB_API_KEY}&language=en-US`
            );
            
            results = (actorMovies.data.cast || [])
              .filter((movie: any) => movie.title && movie.poster_path)
              .sort((a: any, b: any) => b.popularity - a.popularity)
              .slice(0, 15);
            
            // Get suggestions from top movies
            suggestions = results.slice(0, 5).map((m: any) => m.title);
            
            console.log(`Found ${results.length} movies for actor ${actorName}`);
          }
        }
        break;
        
      case 'genre_movies':
        if (intentData.genre) {
          // Get genre list
          const genresRes = await axios.get(
            `https://api.themoviedb.org/3/genre/movie/list?api_key=${TMDB_API_KEY}&language=en-US`
          );
          
          // Map genre names to IDs
          const genreMap: Record<string, number> = {};
          genresRes.data.genres.forEach((g: any) => {
            genreMap[g.name.toLowerCase()] = g.id;
          });
          
          // Try to find matching genre
          const genreName = intentData.genre.toLowerCase();
          const genreId = genreMap[genreName] || 
                         genreMap['romance'] || // Default for romantic
                         genreMap['comedy'];   // Default for comedy
          
          if (genreId) {
            const discoverRes = await axios.get(
              `https://api.themoviedb.org/3/discover/movie?api_key=${TMDB_API_KEY}&with_genres=${genreId}&sort_by=popularity.desc&language=en-US&page=1`
            );
            results = discoverRes.data.results || [];
            console.log(`Found ${results.length} movies for genre ID ${genreId}`);
          }
        }
        break;
        
      case 'director_movies':
        if (intentData.director) {
          // Search for director
          const directorSearch = await axios.get(
            `https://api.themoviedb.org/3/search/person?api_key=${TMDB_API_KEY}&query=${encodeURIComponent(intentData.director)}&language=en-US&page=1`
          );
          
          if (directorSearch.data.results.length > 0) {
            const directorId = directorSearch.data.results[0].id;
            
            // Get director's credits
            const directorCredits = await axios.get(
              `https://api.themoviedb.org/3/person/${directorId}/movie_credits?api_key=${TMDB_API_KEY}&language=en-US`
            );
            
            results = (directorCredits.data.crew || [])
              .filter((job: any) => job.job === 'Director')
              .sort((a: any, b: any) => b.popularity - a.popularity)
              .slice(0, 10);
          }
        }
        break;
        
      case 'keyword_movies':
      default:
        // Use keywords for search
        const keywords = intentData.keywords || [intentData.originalQuery];
        const keyword = keywords.join(' ').trim();
        
        if (keyword) {
          const searchRes = await axios.get(
            `https://api.themoviedb.org/3/search/movie?api_key=${TMDB_API_KEY}&query=${encodeURIComponent(keyword)}&language=en-US&page=1`
          );
          results = searchRes.data.results || [];
          console.log(`Found ${results.length} results for keywords: ${keyword}`);
        }
        break;
    }
    
    // If no results, try a broader search
    if (results.length === 0) {
      const fallbackKeyword = intentData.keywords?.[0] || intentData.originalQuery;
      if (fallbackKeyword) {
        const fallbackRes = await axios.get(
          `https://api.themoviedb.org/3/search/movie?api_key=${TMDB_API_KEY}&query=${encodeURIComponent(fallbackKeyword)}&language=en-US&page=1`
        );
        results = fallbackRes.data.results || [];
      }
    }
    
    // Get popular movies for suggestions if still no results
    if (results.length === 0) {
      try {
        const popularRes = await axios.get(
          `https://api.themoviedb.org/3/movie/popular?api_key=${TMDB_API_KEY}&language=en-US&page=1`
        );
        suggestions = popularRes.data.results
          .slice(0, 5)
          .map((m: any) => m.title);
      } catch (error) {
        suggestions = ['Avatar', 'The Avengers', 'Titanic', 'Inception', 'The Dark Knight'];
      }
    }
    
  } catch (error: any) {
    console.error('Error in intent-based search:', error.message);
  }
  
  return { results: results.slice(0, 10), suggestions: suggestions.slice(0, 5) };
}

// Main AI analysis function for movie details
async function getAIAnalysis(movieData: any, groq: Groq) {
  console.log(`Getting AI analysis for: ${movieData.title}`);
  
  try {
    const prompt = `You are a film critic analyzing "${movieData.title}" (${movieData.release_date?.split('-')[0] || 'N/A'}).

IMPORTANT: DO NOT repeat or paraphrase this plot overview: "${movieData.overview || 'No overview'}"

Provide your own original analysis with this EXACT format:

SUMMARY: [Write a fresh 2-3 sentence summary that captures the essence of the film]
REVIEW: [Write a one-sentence critical review]
KEY POINTS:
• [First interesting fact]
• [Second interesting fact]
• [Third interesting fact]
• [Fourth interesting fact]
• [Fifth interesting fact]

Return ONLY the text in the format above, with each section labeled exactly as shown.`;

    const completion = await groq.chat.completions.create({
      messages: [{ role: "user", content: prompt }],
      model: "llama-3.3-70b-versatile",
      temperature: 0.8,
      max_tokens: 600,
    });

    const aiResponse = completion.choices[0]?.message?.content || '';
    console.log('AI analysis received, length:', aiResponse.length);
    
    return parseAIResponse(aiResponse, movieData.overview);
    
  } catch (error: any) {
    console.error('Groq API Error for analysis:', error.message);
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
      error: 'TMDB API key not configured. Please add TMDB_API_KEY to .env.local' 
    });
  }

  if (!GROQ_API_KEY) {
    return res.status(500).json({ 
      success: false, 
      error: 'Groq API key not configured. Please add GROQ_API_KEY to .env.local' 
    });
  }

  try {
    if (action === 'search') {
      if (!query || typeof query !== 'string') {
        return res.status(400).json({ success: false, error: 'Query parameter is required' });
      }

      console.log('🔍 Processing search query:', query);
      
      const groq = getGroqClient();
      
      // Step 1: Understand query intent using AI
      let intentData;
      try {
        intentData = await understandSearchQuery(query, groq);
      } catch (aiError) {
        console.error('AI understanding failed, using fallback:', aiError);
        intentData = getQueryUnderstandingFallback(query);
      }
      
      console.log('🎯 Query intent:', intentData);
      
      // Step 2: Search based on intent
      const { results, suggestions } = await searchMoviesByIntent(intentData, TMDB_API_KEY);
      
      // Step 3: Prepare response
      const response: any = {
        success: true,
        results: results.slice(0, 10),
        queryType: intentData.intent,
        interpretedAs: {
          intent: intentData.intent,
          ...(intentData.movieTitle && { movieTitle: intentData.movieTitle }),
          ...(intentData.actor && { actor: intentData.actor }),
          ...(intentData.genre && { genre: intentData.genre })
        }
      };
      
      if (results.length === 0 && suggestions.length > 0) {
        response.searchSuggestions = suggestions;
        response.suggestion = `No movies found for "${query}". Try one of these:`;
      } else if (results.length > 0) {
        response.suggestion = `Found ${results.length} movies matching your search`;
      }
      
      return res.status(200).json(response);
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
      console.log(`🎬 Analyzing movie: ${movieData.title}`);

      // Get trailer
      let trailerUrl = '';
      const trailerVideo = movieData.videos?.results?.find(
        (video: any) => video.site === 'YouTube' && (video.type === 'Trailer' || video.type === 'Teaser')
      );
      
      if (trailerVideo) {
        trailerUrl = `https://www.youtube.com/embed/${trailerVideo.key}`;
        console.log(`🎥 Found trailer: ${trailerVideo.key}`);
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
    console.error('❌ API Error:', error.message);
    
    if (error.response?.status === 401) {
      return res.status(401).json({ 
        success: false, 
        error: 'Invalid API key. Please check your TMDB API key.' 
      });
    }
    
    return res.status(error.response?.status || 500).json({ 
      success: false, 
      error: error.response?.data?.status_message || error.message || 'Internal server error'
    });
  }
}