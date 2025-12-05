import type { NextApiRequest, NextApiResponse } from 'next';
import axios from 'axios';
import { Groq } from 'groq-sdk';

// Initialize Groq client
function getGroqClient() {
  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) {
    throw new Error('GROQ_API_KEY is required. Add it in Vercel environment variables.');
  }
  return new Groq({ apiKey });
}

// Query normalization to help AI distinguish
function normalizeQuery(query: string): { normalized: string; likelyType: string } {
  const q = query.toLowerCase().trim();
  
  // Country names → TEAM (national team)
  const countries = [
    'germany', 'brazil', 'argentina', 'france', 'spain', 'portugal', 
    'england', 'italy', 'netherlands', 'belgium', 'mexico', 'usa'
  ];
  
  // Club names → TEAM (club team)
  const clubs = [
    'real madrid', 'barcelona', 'manchester city', 'manchester united',
    'bayern munich', 'chelsea', 'liverpool', 'arsenal', 'psg', 'juventus'
  ];
  
  // World Cup terms → WORLD CUP
  const worldCup = ['world cup', 'fifa world cup', 'worldcup'];
  
  // Check for countries
  for (const country of countries) {
    if (q === country || q.includes(`${country} national`) || q.includes(`${country} team`)) {
      return { 
        normalized: `${country} national football team`, 
        likelyType: 'team' 
      };
    }
  }
  
  // Check for clubs
  for (const club of clubs) {
    if (q.includes(club)) {
      return { normalized: q, likelyType: 'team' };
    }
  }
  
  // Check for World Cup
  for (const wc of worldCup) {
    if (q.includes(wc)) {
      return { normalized: q, likelyType: 'worldCup' };
    }
  }
  
  return { normalized: q, likelyType: 'general' };
}

// Use Groq to analyze query and generate football insights
async function analyzeFootballQuery(query: string) {
  console.log('🤖 Starting AI analysis for:', query);
  const groq = getGroqClient();
  
  const normalized = normalizeQuery(query);
  console.log(`📊 Normalized: "${normalized.normalized}", likely type: ${normalized.likelyType}`);
  
  const prompt = `You are FutbolAI, an expert football analyst. Analyze: "${normalized.normalized}"

CRITICAL RULES:
1. Return data for ONLY ONE category. NEVER mix categories.
2. If query is a COUNTRY (Brazil, Germany, etc.) → RETURN TEAM DATA ONLY (national team)
3. If query is a CLUB (Real Madrid, etc.) → RETURN TEAM DATA ONLY (club)
4. If query is a PLAYER (Messi, Benzema, etc.) → RETURN PLAYER DATA ONLY
5. If query mentions "World Cup" → RETURN WORLD CUP DATA ONLY
6. Otherwise → RETURN GENERAL ANALYSIS ONLY

EXAMPLES:
- "Brazil" → TEAM DATA ONLY (Brazil national team)
- "Real Madrid" → TEAM DATA ONLY (Real Madrid club)
- "Messi" → PLAYER DATA ONLY (Lionel Messi)
- "World Cup 2026" → WORLD CUP DATA ONLY
- "Football tactics" → GENERAL ANALYSIS ONLY

Return ONLY valid JSON with ONE of these structures:

FOR PLAYER (ONLY):
{
  "playerInfo": {
    "name": "Lionel Messi",
    "position": "Forward",
    "nationality": "Argentinian",
    "currentClub": "Inter Miami",
    "stats": {"goals": 821, "assists": 361, "appearances": 1043},
    "marketValue": "€35M",
    "achievements": ["World Cup 2022", "7 Ballon d'Or", "4 Champions League"]
  },
  "teamInfo": null,
  "worldCupInfo": null,
  "analysis": "Lionel Messi is considered one of the greatest footballers...",
  "videoSearchTerm": "Lionel Messi highlights 2024",
  "confidenceScore": 0.95
}

FOR TEAM (ONLY):
{
  "playerInfo": null,
  "teamInfo": {
    "name": "Brazil National Football Team",
    "ranking": "1st in FIFA Rankings",
    "coach": "Tite", 
    "stadium": "Various (national team)",
    "league": "International",
    "founded": 1914,
    "achievements": ["5 World Cup titles", "9 Copa América titles"],
    "keyPlayers": ["Neymar", "Vinícius Júnior", "Alisson Becker"]
  },
  "worldCupInfo": null,
  "analysis": "Brazil is the most successful national team in FIFA World Cup history...",
  "videoSearchTerm": "Brazil national team highlights 2024",
  "confidenceScore": 0.95
}

FOR WORLD CUP (ONLY):
{
  "playerInfo": null,
  "teamInfo": null,
  "worldCupInfo": {
    "year": 2026,
    "host": "USA, Canada, Mexico",
    "details": "2026 FIFA World Cup will be the first to feature 48 teams...",
    "qualifiedTeams": ["USA", "Canada", "Mexico", "Argentina", "France", "Brazil"],
    "venues": ["MetLife Stadium", "SoFi Stadium", "Azteca Stadium"]
  },
  "analysis": "The 2026 FIFA World Cup will be hosted across North America...",
  "videoSearchTerm": "World Cup 2026",
  "confidenceScore": 0.95
}

FOR GENERAL QUERIES (ONLY):
{
  "playerInfo": null,
  "teamInfo": null,
  "worldCupInfo": null,
  "analysis": "Analysis about general football topics...",
  "videoSearchTerm": "football highlights 2024",
  "confidenceScore": 0.8
}

Return ONLY JSON. Never mix playerInfo, teamInfo, and worldCupInfo.`;

  try {
    console.log('🚀 Calling Groq with model: llama-3.3-70b-versatile');
    const completion = await groq.chat.completions.create({
      messages: [{ role: 'user', content: prompt }],
      model: 'llama-3.3-70b-versatile',
      temperature: 0.2, // Very low temperature for strict responses
      max_tokens: 800,
    });

    const content = completion.choices[0]?.message?.content || '{}';
    console.log('📄 Full AI response:', content);
    
    // Try to parse
    const parsed = JSON.parse(content);
    
    // Validate only one data type is present
    const dataTypes = [
      parsed.playerInfo ? 'player' : null,
      parsed.teamInfo ? 'team' : null,
      parsed.worldCupInfo ? 'worldCup' : null
    ].filter(Boolean);
    
    if (dataTypes.length > 1) {
      console.warn('⚠️ WARNING: AI returned multiple data types:', dataTypes);
      // Force only one type - keep the first one
      if (dataTypes.includes('team')) {
        parsed.playerInfo = null;
        parsed.worldCupInfo = null;
      } else if (dataTypes.includes('player')) {
        parsed.teamInfo = null;
        parsed.worldCupInfo = null;
      } else if (dataTypes.includes('worldCup')) {
        parsed.playerInfo = null;
        parsed.teamInfo = null;
      }
    }
    
    console.log('✅ JSON parsed. Final data:', {
      type: parsed.playerInfo ? 'player' : parsed.teamInfo ? 'team' : parsed.worldCupInfo ? 'worldCup' : 'general',
      hasPlayer: !!parsed.playerInfo,
      hasTeam: !!parsed.teamInfo,
      hasWorldCup: !!parsed.worldCupInfo
    });
    
    return parsed;
    
  } catch (error: any) {
    console.error('❌ Groq error:', error.message);
    return {
      playerInfo: null,
      teamInfo: null,
      worldCupInfo: null,
      analysis: `Analysis for "${query}".`,
      videoSearchTerm: query,
      confidenceScore: 0.5
    };
  }
}

// Search YouTube for relevant videos
async function searchYouTube(searchTerm: string) {
  try {
    const apiKey = process.env.YOUTUBE_API_KEY;
    
    if (!apiKey) {
      console.warn('YouTube API key not set, using fallback');
      return generateFallbackVideoUrl(searchTerm);
    }

    const response = await axios.get('https://www.googleapis.com/youtube/v3/search', {
      params: {
        part: 'snippet',
        q: `${searchTerm} football highlights`,
        type: 'video',
        maxResults: 1,
        key: apiKey,
        videoEmbeddable: 'true',
        safeSearch: 'strict',
      },
    });

    if (response.data.items?.length > 0) {
      const videoId = response.data.items[0].id.videoId;
      return `https://www.youtube.com/embed/${videoId}`;
    }
  } catch (error) {
    console.error('YouTube search error:', error);
  }
  
  return generateFallbackVideoUrl(searchTerm);
}

// Generate fallback video URL based on query
function generateFallbackVideoUrl(query: string) {
  const queryLower = query.toLowerCase();
  
  const videoMap: Record<string, string> = {
    // National Teams
    'brazil': 'https://www.youtube.com/embed/eJXWcJeGXlM',
    'argentina': 'https://www.youtube.com/embed/eJXWcJeGXlM',
    'france': 'https://www.youtube.com/embed/J8LcQOHtQKs',
    'germany': 'https://www.youtube.com/embed/XfyZ6EueJx8',
    'spain': 'https://www.youtube.com/embed/6MfLJBHjK0k',
    
    // Clubs
    'real madrid': 'https://www.youtube.com/embed/XfyZ6EueJx8',
    'barcelona': 'https://www.youtube.com/embed/3X7XG5KZiUY',
    
    // World Cup
    'world cup': 'https://www.youtube.com/embed/dZqkf1ZnQh4',
  };

  for (const [key, url] of Object.entries(videoMap)) {
    if (queryLower.includes(key)) {
      return url;
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
    console.log(`\n=== NEW REQUEST: "${query}" ===`);
    
    try {
      // Try AI analysis
      const aiAnalysis = await analyzeFootballQuery(query);
      
      // Determine response type
      let responseType = 'general';
      if (aiAnalysis.playerInfo) responseType = 'player';
      if (aiAnalysis.teamInfo) responseType = 'team';
      if (aiAnalysis.worldCupInfo) responseType = 'worldCup';
      
      console.log(`📊 Final response type: ${responseType.toUpperCase()}`);
      
      const searchTerm = aiAnalysis.videoSearchTerm || query;
      const youtubeUrl = await searchYouTube(searchTerm);
      
      const response = {
        success: true,
        query: query,
        timestamp: new Date().toISOString(),
        type: responseType, // CRITICAL: Include type field
        data: aiAnalysis.playerInfo || aiAnalysis.teamInfo || aiAnalysis.worldCupInfo || null,
        playerInfo: aiAnalysis.playerInfo || null,
        teamInfo: aiAnalysis.teamInfo || null,
        worldCupInfo: aiAnalysis.worldCupInfo || null,
        youtubeUrl: youtubeUrl,
        analysis: aiAnalysis.analysis || `Analysis of ${query}`,
        confidence: aiAnalysis.confidenceScore || 0.8,
        source: 'Groq AI'
      };

      console.log('📤 Sending clean response with type:', responseType);
      
      return res.status(200).json(response);
      
    } catch (error: any) {
      console.error('❌ API CATCH BLOCK ERROR:', error.message);
      
      return res.status(200).json({
        success: false,
        query: query,
        type: 'error',
        error: 'Failed to process query',
        timestamp: new Date().toISOString(),
        youtubeUrl: generateFallbackVideoUrl(query),
        analysis: `Could not analyze "${query}". Please try a different search.`
      });
    }
  }

  // API docs
  res.status(200).json({
    message: 'FutbolAI API v2.2 is running! 🏆',
    version: '2.2',
    improvements: ['Strict single data type responses', 'Better query handling'],
    endpoints: {
      search: 'GET /api/ai?action=search&query=your-query',
      examples: [
        '/api/ai?action=search&query=Germany',
        '/api/ai?action=search&query=Real%20Madrid',
        '/api/ai?action=search&query=World%20Cup%202026'
      ]
    }
  });
}