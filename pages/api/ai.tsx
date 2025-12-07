import type { NextApiRequest, NextApiResponse } from 'next';
import axios from 'axios';
import { Groq } from 'groq-sdk';
import NodeCache from 'node-cache';

// Add caching to prevent duplicate processing
const cache = new NodeCache({ stdTTL: 300 }); // 5 minute cache

// Initialize Groq client
function getGroqClient() {
  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) {
    throw new Error('GROQ_API_KEY is required.');
  }
  return new Groq({ apiKey });
}

// HARDCODED TYPE DETECTION - MOST RELIABLE
function detectQueryType(query: string): string {
  const queryLower = query.toLowerCase().trim();
  
  // World Cup queries
  if (queryLower.includes('world cup')) {
    return 'worldCup';
  }
  
  // National teams (countries)
  const countries = [
    'spain', 'brazil', 'argentina', 'france', 'germany', 'italy', 'england',
    'portugal', 'netherlands', 'belgium', 'colombia', 'uruguay', 'mexico',
    'usa', 'canada', 'japan', 'south korea', 'australia'
  ];
  
  if (countries.some(country => queryLower.includes(country))) {
    return 'national';
  }
  
  // Clubs
  const clubs = [
    'real madrid', 'barcelona', 'manchester', 'bayern', 'psg', 'juventus',
    'chelsea', 'arsenal', 'liverpool', 'ac milan', 'inter milan', 'atletico',
    'borussia', 'roma', 'napoli', 'tottenham', 'leicester', 'sevilla'
  ];
  
  if (clubs.some(club => queryLower.includes(club))) {
    return 'club';
  }
  
  // Players (default if not team or world cup)
  return 'player';
}

// Simple JSON parsing
function safeParseJSON(content: string) {
  try {
    let cleaned = content.trim();
    
    // Remove markdown
    if (cleaned.startsWith('```json')) cleaned = cleaned.substring(7);
    if (cleaned.startsWith('```')) cleaned = cleaned.substring(3);
    if (cleaned.endsWith('```')) cleaned = cleaned.substring(0, cleaned.length - 3);
    
    // Find JSON
    const jsonStart = cleaned.indexOf('{');
    const jsonEnd = cleaned.lastIndexOf('}') + 1;
    
    if (jsonStart !== -1 && jsonEnd > jsonStart) {
      cleaned = cleaned.substring(jsonStart, jsonEnd);
    }
    
    return JSON.parse(cleaned);
  } catch (error) {
    console.error('JSON parse error:', error);
    return { 
      analysis: "Analysis available", 
      videoSearchTerm: query 
    };
  }
}

// Different prompts for different types
async function analyzeWithPrompt(query: string, type: string) {
  const groq = getGroqClient();
  
  let prompt = '';
  
  if (type === 'player') {
    prompt = `Analyze football player: "${query}"
Return JSON with: name, position, nationality, currentClub, age, achievementsSummary with worldCupTitles, continentalTitles, clubDomesticTitles.
Analysis: 80 words about career.
videoSearchTerm: "${query} football highlights"`;
  }
  else if (type === 'club') {
    prompt = `Analyze football club: "${query}"
Return JSON with: name, type: "club", founded, league, achievementsSummary with continentalTitles, domesticTitles.
Analysis: 80 words about history and trophies.
videoSearchTerm: "${query} football highlights"`;
  }
  else if (type === 'national') {
    prompt = `Analyze national team: "${query}"
Return JSON with: name, type: "national", fifaRanking, achievementsSummary with worldCupTitles, continentalTitles.
Analysis: 80 words about achievements.
videoSearchTerm: "${query} national team football"`;
  }
  else { // worldCup
    prompt = `Analyze: "${query}"
Return JSON with worldCupInfo: year, host, defendingChampion.
Analysis: 80 words about tournament.
videoSearchTerm: "World Cup football highlights"`;
  }
  
  try {
    const completion = await groq.chat.completions.create({
      messages: [{ role: 'user', content: prompt }],
      model: 'llama-3.3-70b-versatile',
      temperature: 0.1,
      max_tokens: 1000,
    });

    const content = completion.choices[0]?.message?.content || '{}';
    return safeParseJSON(content);
    
  } catch (error) {
    console.error('Groq error:', error);
    return { 
      analysis: "Data temporarily unavailable. Please try again.",
      videoSearchTerm: query 
    };
  }
}

// YouTube search with better error handling
async function searchYouTube(searchTerm: string) {
  const cacheKey = `youtube_${searchTerm}`;
  const cached = cache.get(cacheKey);
  if (cached) return cached as string;

  try {
    const apiKey = process.env.YOUTUBE_API_KEY;
    
    if (!apiKey) {
      const fallback = getPublicYouTubeFallback(searchTerm);
      cache.set(cacheKey, fallback);
      return fallback;
    }

    const response = await axios.get('https://www.googleapis.com/youtube/v3/search', {
      params: {
        part: 'snippet',
        q: `${searchTerm} football`,
        type: 'video',
        maxResults: 1,
        key: apiKey,
        videoEmbeddable: 'true',
        order: 'viewCount',
      },
      timeout: 5000, // Increased timeout
    });

    if (response.data.items?.length > 0) {
      const videoId = response.data.items[0].id.videoId;
      const url = `https://www.youtube.com/embed/${videoId}`;
      cache.set(cacheKey, url);
      return url;
    }
    
    const fallback = getPublicYouTubeFallback(searchTerm);
    cache.set(cacheKey, fallback);
    return fallback;
    
  } catch (error) {
    console.error('YouTube API error:', error);
    const fallback = getPublicYouTubeFallback(searchTerm);
    cache.set(cacheKey, fallback);
    return fallback;
  }
}

function getPublicYouTubeFallback(searchTerm: string) {
  const term = searchTerm.toLowerCase();
  const videos: Record<string, string> = {
    'real madrid': 'XfyZ6EueJx8',
    'barcelona': '3X7XG5KZiUY',
    'messi': 'ZO0d8r_2qGI',
    'ronaldo': 'OUKGsb8CpF8',
    'world cup': 'dZqkf1ZnQh4',
    'spain': 'eJXWcJeGXlM',
    'brazil': 'eJXWcJeGXlM',
    'bayern': 'HfQmI1Q5LQc',
    'argentina': 'mokNgn4i51A',
    'colombia': 'eJXWcJeGXlM',
    'carvajal': 'Taq8krKk7_4',
  };

  for (const [key, videoId] of Object.entries(videos)) {
    if (term.includes(key)) {
      return `https://www.youtube.com/embed/${videoId}`;
    }
  }

  return 'https://www.youtube.com/embed/dZqkf1ZnQh4';
}

// Main API handler
export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  // CORS headers
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
  res.setHeader('Access-Control-Allow-Headers', 'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version');

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  const { action, query } = req.query;

  if (action === 'search' && query && typeof query === 'string') {
    console.log(`\n=== SEARCH: "${query}" ===`);
    
    // Check cache first
    const cacheKey = `search_${query.toLowerCase()}`;
    const cachedResponse = cache.get(cacheKey);
    if (cachedResponse) {
      console.log('✅ Returning cached response');
      return res.status(200).json(cachedResponse);
    }
    
    try {
      // DETECT TYPE FIRST (most reliable part)
      const detectedType = detectQueryType(query);
      console.log('🎯 Detected type:', detectedType);
      
      // Get AI analysis
      const aiAnalysis = await analyzeWithPrompt(query, detectedType);
      console.log('✅ Got AI analysis');
      
      // Build response based on detected type
      let responseData: any = {
        name: query,
        ...aiAnalysis
      };
      
      // Ensure consistent structure
      if (detectedType === 'club') {
        responseData.type = 'club';
      } else if (detectedType === 'national') {
        responseData.type = 'national';
      } else if (detectedType === 'worldCup') {
        responseData.worldCupInfo = { year: 2026, ...aiAnalysis };
      }
      
      // Get video
      const videoSearchTerm = aiAnalysis.videoSearchTerm || query;
      const youtubeUrl = await searchYouTube(videoSearchTerm);
      
      // Build final response
      const response = {
        success: true,
        query: query,
        timestamp: new Date().toISOString(),
        type: detectedType,
        data: responseData,
        playerInfo: detectedType === 'player' ? responseData : null,
        teamInfo: (detectedType === 'club' || detectedType === 'national') ? responseData : null,
        worldCupInfo: detectedType === 'worldCup' ? responseData : null,
        youtubeUrl: youtubeUrl,
        analysis: aiAnalysis.analysis || `Analysis of ${query}`,
        confidence: 0.9,
        source: 'Groq AI'
      };

      // Cache the response
      cache.set(cacheKey, response);
      
      console.log('🚀 Sending response with type:', detectedType);
      return res.status(200).json(response);
      
    } catch (error) {
      console.error('API error:', error);
      
      const errorResponse = {
        success: false,
        query: query,
        type: 'error',
        error: 'Service issue',
        timestamp: new Date().toISOString(),
        youtubeUrl: getPublicYouTubeFallback(query),
        analysis: `Please try again.`,
      };
      
      return res.status(200).json(errorResponse);
    }
  }

  res.status(200).json({
    message: 'FutbolAI API - Reliable Version',
    version: '2.0'
  });
}