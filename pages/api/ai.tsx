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
    'england', 'italy', 'netherlands', 'belgium', 'mexico', 'usa',
    'uruguay', 'colombia', 'chile', 'peru', 'croatia', 'switzerland',
    'japan', 'south korea', 'australia', 'morocco', 'egypt', 'nigeria'
  ];
  
  // Club names → TEAM (club team)
  const clubs = [
    'real madrid', 'barcelona', 'manchester city', 'manchester united',
    'bayern munich', 'bayern', 'chelsea', 'liverpool', 'arsenal', 
    'tottenham', 'psg', 'paris saint', 'juventus', 'ac milan', 
    'inter milan', 'atletico madrid', 'borussia dortmund', 'ajax'
  ];
  
  // World Cup terms → WORLD CUP
  const worldCup = ['world cup', 'fifa world cup', 'worldcup', 'wc '];
  
  // Player names → PLAYER (help disambiguate)
  const players = [
    'messi', 'ronaldo', 'mbappe', 'haaland', 'neymar', 'benzema',
    'kane', 'lewandowski', 'modric', 'de bruyne', 'salah', 'mane'
  ];
  
  // Check for countries
  for (const country of countries) {
    if (q === country || 
        q.includes(`${country} national`) || 
        q.includes(`${country} team`) ||
        q === `${country} nt`) {
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
  
  // Check for known players
  for (const player of players) {
    if (q === player || q.includes(player)) {
      return { normalized: q, likelyType: 'player' };
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

CRITICAL RULES - READ CAREFULLY:
1. COUNTRY NAMES (Germany, Brazil, Argentina, France, Spain, etc.) → ALWAYS TEAM (national team)
2. CLUB NAMES (Real Madrid, Manchester City, Bayern Munich) → ALWAYS TEAM (club)
3. PLAYER NAMES (Messi, Benzema, Mbappé) → ALWAYS PLAYER
4. "World Cup" or "FIFA World Cup" → ALWAYS WORLD CUP
5. If query includes "team" or "national", it's a TEAM

EXAMPLES TO FOLLOW:
- "Germany" → German national football team (TEAM)
- "Brazil" → Brazilian national football team (TEAM)  
- "argentina" → Argentina national football team (TEAM)
- "france" → France national football team (TEAM)
- "spain" → Spain national football team (TEAM)
- "belgium" → Belgium national football team (TEAM)
- "real madrid" → Real Madrid CF (club TEAM)
- "manchester city" → Manchester City FC (club TEAM)
- "bayern munich" → Bayern Munich (club TEAM)
- "Messi" → Lionel Messi (PLAYER)
- "Benzema" → Karim Benzema (PLAYER - French, NOT France team)
- "Mbappé" → Kylian Mbappé (PLAYER - French, NOT France team)
- "World Cup 2026" → FIFA World Cup 2026 (WORLD CUP)
- "World Cup" → FIFA World Cup (WORLD CUP)

DO NOT CONFUSE:
- "Germany" → TEAM (NOT player Manuel Neuer)
- "France" → TEAM (NOT player Kylian Mbappé)
- "Benzema" → PLAYER (French striker, NOT France team)
- "Messi" → PLAYER (Argentinian, NOT Argentina team)

Return ONLY valid JSON with ONE of these structures:

FOR PLAYER:
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
  "analysis": "Lionel Messi is considered one of the greatest footballers of all time...",
  "videoSearchTerm": "Lionel Messi highlights 2024",
  "confidenceScore": 0.95
}

FOR TEAM (NATIONAL TEAM):
{
  "playerInfo": null,
  "teamInfo": {
    "name": "Germany National Football Team",
    "ranking": "16th in FIFA Rankings",
    "coach": "Julian Nagelsmann", 
    "stadium": "Various (national team)",
    "league": "International",
    "founded": 1900,
    "achievements": ["4 World Cup titles", "3 European Championships"],
    "keyPlayers": ["İlkay Gündoğan", "Joshua Kimmich", "Manuel Neuer"]
  },
  "worldCupInfo": null,
  "analysis": "The Germany national football team is one of the most successful...",
  "videoSearchTerm": "Germany national team highlights 2024",
  "confidenceScore": 0.95
}

FOR TEAM (CLUB):
{
  "playerInfo": null,
  "teamInfo": {
    "name": "Real Madrid",
    "ranking": "1st in La Liga",
    "coach": "Carlo Ancelotti", 
    "stadium": "Santiago Bernabéu",
    "league": "La Liga",
    "founded": 1902,
    "achievements": ["14 Champions League titles", "35 La Liga titles"],
    "keyPlayers": ["Vinicius Junior", "Jude Bellingham", "Thibaut Courtois"]
  },
  "worldCupInfo": null,
  "analysis": "Real Madrid is one of the most successful football clubs in history...",
  "videoSearchTerm": "Real Madrid highlights 2024",
  "confidenceScore": 0.95
}

FOR WORLD CUP:
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

Return ONLY JSON, no extra text. Remember the rules!`;

  try {
    console.log('🚀 Calling Groq with model: llama-3.3-70b-versatile');
    const completion = await groq.chat.completions.create({
      messages: [{ role: 'user', content: prompt }],
      model: 'llama-3.3-70b-versatile',
      temperature: 0.3, // Lower temperature for more consistent responses
      max_tokens: 1000,
    });

    const content = completion.choices[0]?.message?.content || '{}';
    console.log('📄 Raw AI response:', content.substring(0, 200) + '...');
    
    // Try to parse
    const parsed = JSON.parse(content);
    console.log('✅ JSON parsed successfully');
    console.log('📊 Parsed type:', 
      parsed.playerInfo ? 'PLAYER' : 
      parsed.teamInfo ? 'TEAM' : 
      parsed.worldCupInfo ? 'WORLD_CUP' : 'GENERAL'
    );
    
    return parsed;
    
  } catch (error: any) {
    console.error('❌ Groq error:', error.message);
    // Return a fallback structure
    return {
      playerInfo: null,
      teamInfo: null,
      worldCupInfo: null,
      analysis: `Could not analyze "${query}" properly.`,
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
    // Players
    'messi': 'https://www.youtube.com/embed/ZO0d8r_2qGI',
    'ronaldo': 'https://www.youtube.com/embed/OUKGsb8CpF8',
    'mbappe': 'https://www.youtube.com/embed/RdGpDPLT5Q4',
    'haaland': 'https://www.youtube.com/embed/4XqQpQ8KZg4',
    'neymar': 'https://www.youtube.com/embed/FIYzK8PSLpA',
    'benzema': 'https://www.youtube.com/embed/6kl7AOKVpCM',
    'carvajal': 'https://www.youtube.com/embed/6MfLJBHjK0k',
    
    // National Teams
    'germany': 'https://www.youtube.com/embed/XfyZ6EueJx8',
    'brazil': 'https://www.youtube.com/embed/eJXWcJeGXlM',
    'argentina': 'https://www.youtube.com/embed/eJXWcJeGXlM',
    'france': 'https://www.youtube.com/embed/J8LcQOHtQKs',
    'spain': 'https://www.youtube.com/embed/6MfLJBHjK0k',
    'portugal': 'https://www.youtube.com/embed/6MfLJBHjK0k',
    'england': 'https://www.youtube.com/embed/6MfLJBHjK0k',
    'italy': 'https://www.youtube.com/embed/6MfLJBHjK0k',
    
    // Clubs
    'real madrid': 'https://www.youtube.com/embed/XfyZ6EueJx8',
    'barcelona': 'https://www.youtube.com/embed/3X7XG5KZiUY',
    'manchester city': 'https://www.youtube.com/embed/KXwHEvDE2-U',
    'bayern': 'https://www.youtube.com/embed/6MfLJBHjK0k',
    
    // World Cup
    'world cup': 'https://www.youtube.com/embed/dZqkf1ZnQh4',
    'world cup 2026': 'https://www.youtube.com/embed/dZqkf1ZnQh4',
  };

  for (const [key, url] of Object.entries(videoMap)) {
    if (queryLower.includes(key)) {
      return url;
    }
  }

  return 'https://www.youtube.com/embed/dZqkf1ZnQh4'; // Default football highlights
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
        type: responseType,
        data: aiAnalysis.playerInfo || aiAnalysis.teamInfo || aiAnalysis.worldCupInfo || null,
        playerInfo: aiAnalysis.playerInfo || null,
        teamInfo: aiAnalysis.teamInfo || null,
        worldCupInfo: aiAnalysis.worldCupInfo || null,
        youtubeUrl: youtubeUrl,
        analysis: aiAnalysis.analysis || `Analysis of ${query}`,
        confidence: aiAnalysis.confidenceScore || 0.8,
        source: 'Groq AI',
        debug: {
          normalizedQuery: normalizeQuery(query).normalized,
          likelyType: normalizeQuery(query).likelyType,
          finalType: responseType
        }
      };

      console.log('📤 Sending response with:', { 
        type: responseType,
        dataKeys: Object.keys(response.data || {})
      });
      
      return res.status(200).json(response);
      
    } catch (error: any) {
      console.error('❌ API CATCH BLOCK ERROR:', error.message);
      
      // Return fallback response
      return res.status(200).json({
        success: false,
        query: query,
        type: 'error',
        error: 'Failed to process query',
        timestamp: new Date().toISOString(),
        youtubeUrl: generateFallbackVideoUrl(query),
        analysis: `Could not analyze "${query}". Please try a different search.`,
        debug: {
          error: error.message,
          normalizedQuery: normalizeQuery(query).normalized
        }
      });
    }
  }

  // API docs
  res.status(200).json({
    message: 'FutbolAI API v2.1 is running! 🏆',
    version: '2.1',
    improvements: ['Better team/player distinction', 'Query normalization', 'Enhanced prompts'],
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