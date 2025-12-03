import type { NextApiRequest, NextApiResponse } from 'next';
import axios from 'axios';
import { Groq } from 'groq-sdk';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const { action, query, movieId } = req.query;

  // Get API keys
  const TMDB_API_KEY = process.env.NEXT_PUBLIC_TMDB_KEY || process.env.TMDB_API_KEY;
  const GROQ_API_KEY = process.env.GROQ_API_KEY;

  // Check API keys
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

      // Search movies on TMDB
      const searchRes = await axios.get(
        `https://api.themoviedb.org/3/search/movie?api_key=${TMDB_API_KEY}&query=${encodeURIComponent(query)}&language=en-US&page=1`
      );
      
      return res.status(200).json({
        success: true,
        results: searchRes.data.results.slice(0, 10)
      });
    }

    if (action === 'analyze' && movieId) {
      if (!movieId || typeof movieId !== 'string') {
        return res.status(400).json({ success: false, error: 'Movie ID parameter is required' });
      }

      // Initialize Groq
      const groq = new Groq({
        apiKey: GROQ_API_KEY
      });

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

async function getAIAnalysis(movieData: any, groq: Groq) {
  try {
    const prompt = `Please analyze the movie "${movieData.title}" (${movieData.release_date?.split('-')[0] || 'N/A'}) and provide:

1. SUMMARY: A 2-3 sentence summary that is DIFFERENT from this overview: "${movieData.overview || 'No overview provided'}"
2. REVIEW: A brief critical review discussing what works and what doesn't
3. KEY POINTS: 3-5 interesting facts or highlights about the movie

FORMAT YOUR RESPONSE EXACTLY LIKE THIS:
SUMMARY: [your summary here]
REVIEW: [your review here]
KEY POINTS:
• [first point]
• [second point]
• [third point]
• [fourth point]
• [fifth point]`;

    const completion = await groq.chat.completions.create({
      messages: [{ role: "user", content: prompt }],
      model: "mixtral-8x7b-32768",
      temperature: 0.7,
      max_tokens: 600,
    });

    const aiResponse = completion.choices[0]?.message?.content || '';
    console.log('AI Response received');
    
    return parseAIResponse(aiResponse, movieData.overview);
    
  } catch (error) {
    console.error('Groq API Error:', error);
    return {
      summary: movieData.overview || 'No summary available',
      review: 'AI review temporarily unavailable. Please try again.',
      keyPoints: getFallbackKeyPoints(movieData)
    };
  }
}

function parseAIResponse(response: string, fallbackOverview: string) {
  // Default values
  let summary = fallbackOverview || 'No summary available';
  let review = 'Review not available';
  const keyPoints: string[] = [];
  
  // Clean up response
  const cleanResponse = response.trim();
  
  // Try to parse SUMMARY
  const summaryMatch = cleanResponse.match(/SUMMARY:\s*(.+?)(?=\s*REVIEW:|$)/is);
  if (summaryMatch) {
    summary = summaryMatch[1].trim();
  }
  
  // Try to parse REVIEW
  const reviewMatch = cleanResponse.match(/REVIEW:\s*(.+?)(?=\s*KEY POINTS:|$)/is);
  if (reviewMatch) {
    review = reviewMatch[1].trim();
  }
  
  // Try to parse KEY POINTS
  const keyPointsSection = cleanResponse.match(/KEY POINTS:(.+?)(?=\s*[A-Z]+:|$)/is);
  if (keyPointsSection) {
    const pointsText = keyPointsSection[1];
    // Extract bullet points
    const bulletRegex = /[•\-*]\s*(.+?)(?=\n[•\-*]|\n\n|$)/g;
    let match;
    while ((match = bulletRegex.exec(pointsText)) !== null) {
      keyPoints.push(match[1].trim());
    }
  }
  
  // If no bullet points found, try numbered points
  if (keyPoints.length === 0) {
    const numberedRegex = /\d\.\s*(.+?)(?=\n\d\.|\n\n|$)/g;
    let match;
    while ((match = numberedRegex.exec(cleanResponse)) !== null) {
      keyPoints.push(match[1].trim());
    }
  }
  
  // Ensure we have at least 3 key points
  while (keyPoints.length < 3) {
    keyPoints.push(`Interesting aspect ${keyPoints.length + 1}`);
  }
  
  // Limit to 5 points
  const finalKeyPoints = keyPoints.slice(0, 5);
  
  return {
    summary,
    review: review || 'Review generated by AI',
    keyPoints: finalKeyPoints
  };
}

function getFallbackKeyPoints(movieData: any): string[] {
  const year = movieData.release_date?.split('-')[0] || '';
  const rating = movieData.vote_average ? `${movieData.vote_average}/10` : '';
  const genres = movieData.genres?.map((g: any) => g.name).slice(0, 2).join(', ') || '';
  
  return [
    `Released in ${year}`,
    rating ? `Rated ${rating}` : 'Popular film',
    genres ? `Genres: ${genres}` : 'Feature film',
    'Critically acclaimed',
    'Worth watching'
  ].filter(Boolean);
}