import type { NextApiRequest, NextApiResponse } from 'next';
import axios from 'axios';
import { Groq } from 'groq-sdk';

// Simple in-memory cache
const cache = new Map();
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

function getFromCache(key: string): any | null {
  const cached = cache.get(key);
  if (!cached) return null;
  
  const { data, timestamp } = cached;
  if (Date.now() - timestamp > CACHE_DURATION) {
    cache.delete(key);
    return null;
  }
  
  return data;
}

function setInCache(key: string, data: any): void {
  cache.set(key, {
    data,
    timestamp: Date.now()
  });
}

// Initialize Groq client
function getGroqClient() {
  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) {
    throw new Error('GROQ_API_KEY is required.');
  }
  return new Groq({ apiKey });
}

// Smart type detection using AI
async function detectQueryTypeWithAI(query: string): Promise<string> {
  const groq = getGroqClient();
  
  const prompt = `Analyze this football query: "${query}"
  
Is this query about:
1. A football PLAYER (individual person)
2. A football CLUB (team like Real Madrid, Barcelona, Manchester United)
3. A NATIONAL TEAM (country like Brazil, Argentina, Spain)
4. WORLD CUP (tournament)

Return ONLY one word: "player", "club", "national", or "worldCup"
Do not include any explanations or additional text.`;

  try {
    const completion = await groq.chat.completions.create({
      messages: [{ role: 'user', content: prompt }],
      model: 'llama-3.3-70b-versatile',
      temperature: 0.1,
      max_tokens: 10,
    });

    const response = completion.choices[0]?.message?.content?.toLowerCase().trim() || 'player';
    
    // Validate response
    const validTypes = ['player', 'club', 'national', 'worldcup'];
    const cleanResponse = response.replace(/"/g, '').replace(/'/g, '');
    
    if (validTypes.includes(cleanResponse)) {
      return cleanResponse;
    }
    
    // Fallback based on keywords
    const queryLower = query.toLowerCase();
    if (queryLower.includes('world cup')) return 'worldCup';
    if (queryLower.includes('fc') || queryLower.includes('cf ') || queryLower.includes(' united') || 
        queryLower.includes(' city') || queryLower.includes(' club')) return 'club';
    
    return 'player'; // Default
  } catch (error) {
    console.error('AI type detection error, using fallback:', error);
    // Fallback to simple detection
    const queryLower = query.toLowerCase();
    if (queryLower.includes('world cup')) return 'worldCup';
    return 'player'; // Default to player for simplicity
  }
}

// Simple JSON parsing
function safeParseJSON(content: string, query: string) {
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
Return a JSON object with these fields:
- name (string): Full name
- position (string): Playing position
- nationality (string): Country
- currentClub (string): Current team
- age (number): Age if known
- achievementsSummary (object): { worldCupTitles: number, continentalTitles: number, clubDomesticTitles: { leagues: number, cups: number } }
- analysis (string): 80 words about career highlights and playing style
- videoSearchTerm (string): Search term for YouTube highlights

Make the analysis factual and concise. If you don't know specific details, say "Information not available" rather than making it up.`;
  }
  else if (type === 'club') {
    prompt = `Analyze football club: "${query}"
Return a JSON object with these fields:
- name (string): Club name
- type (string): Always "club"
- founded (string/number): Year founded
- league (string): Current league
- achievementsSummary (object): { continentalTitles: number, domesticTitles: { leagues: number, cups: number } }
- analysis (string): 80 words about history, playing style, and achievements
- videoSearchTerm (string): Search term for YouTube highlights

Make the analysis factual and concise. If you don't know specific details, say "Information not available" rather than making it up.`;
  }
  else if (type === 'national') {
    prompt = `Analyze national football team: "${query}"
Return a JSON object with these fields:
- name (string): Country name
- type (string): Always "national"
- fifaRanking (string/number): Current FIFA ranking if known
- achievementsSummary (object): { worldCupTitles: number, continentalTitles: number }
- analysis (string): 80 words about achievements, playing style, and notable players
- videoSearchTerm (string): Search term for YouTube highlights

Make the analysis factual and concise. If you don't know specific details, say "Information not available" rather than making it up.`;
  }
  else { // worldCup
    prompt = `Analyze: "${query}"
Return a JSON object with these fields:
- worldCupInfo (object): { year: number, host: string, defendingChampion: string }
- analysis (string): 80 words about the tournament
- videoSearchTerm (string): Search term for YouTube highlights

Make the analysis factual and concise.`;
  }
  
  try {
    const completion = await groq.chat.completions.create({
      messages: [{ role: 'user', content: prompt }],
      model: 'llama-3.3-70b-versatile',
      temperature: 0.1,
      max_tokens: 1000,
    });

    const content = completion.choices[0]?.message?.content || '{}';
    return safeParseJSON(content, query);
    
  } catch (error) {
    console.error('Groq error:', error);
    return { 
      analysis: "Data temporarily unavailable. Please try again.",
      videoSearchTerm: query 
    };
  }
}

// YouTube search
async function searchYouTube(searchTerm: string) {
  const cacheKey = `youtube_${searchTerm}`;
  const cached = getFromCache(cacheKey);
  if (cached) return cached as string;

  try {
    const apiKey = process.env.YOUTUBE_API_KEY;
    
    if (!apiKey) {
      const fallback = 'https://www.youtube.com/embed/dZqkf1ZnQh4'; // Generic football
      setInCache(cacheKey, fallback);
      return fallback;
    }

    const response = await axios.get('https://www.googleapis.com/youtube/v3/search', {
      params: {
        part: 'snippet',
        q: `${searchTerm} football highlights`,
        type: 'video',
        maxResults: 1,
        key: apiKey,
        videoEmbeddable: 'true',
        order: 'viewCount',
      },
      timeout: 5000,
    });

    if (response.data.items?.length > 0) {
      const videoId = response.data.items[0].id.videoId;
      const url = `https://www.youtube.com/embed/${videoId}`;
      setInCache(cacheKey, url);
      return url;
    }
    
    const fallback = 'https://www.youtube.com/embed/dZqkf1ZnQh4';
    setInCache(cacheKey, fallback);
    return fallback;
    
  } catch (error) {
    console.error('YouTube API error:', error);
    const fallback = 'https://www.youtube.com/embed/dZqkf1ZnQh4';
    setInCache(cacheKey, fallback);
    return fallback;
  }
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
    const cachedResponse = getFromCache(cacheKey);
    if (cachedResponse) {
      console.log('✅ Returning cached response');
      return res.status(200).json(cachedResponse);
    }
    
    try {
      // DETECT TYPE WITH AI
      const detectedType = await detectQueryTypeWithAI(query);
      console.log('🎯 AI detected type:', detectedType);
      
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
      } else if (detectedType === 'worldcup') {
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
        worldCupInfo: detectedType === 'worldcup' ? responseData : null,
        youtubeUrl: youtubeUrl,
        analysis: aiAnalysis.analysis || `Analysis of ${query}`,
        confidence: 0.9,
        source: 'Groq AI'
      };

      // Cache the response
      setInCache(cacheKey, response);
      
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
        youtubeUrl: 'https://www.youtube.com/embed/dZqkf1ZnQh4',
        analysis: `Please try again.`,
      };
      
      return res.status(200).json(errorResponse);
    }
  }

  res.status(200).json({
    message: 'FutbolAI API - AI-Powered Football Intelligence',
    version: '3.0'
  });
}