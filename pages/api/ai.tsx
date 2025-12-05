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

// AGGRESSIVE cleaning - force correct data types
function aggressivelyCleanResponse(parsed: any, query: string): any {
  console.log('⚠️ AGGRESSIVE CLEANING for query:', query);
  
  const q = query.toLowerCase().trim();
  
  // Define all country names
  const countries = [
    'canada', 'uruguay', 'brazil', 'argentina', 'spain', 'france', 'germany',
    'england', 'portugal', 'italy', 'netherlands', 'belgium', 'mexico', 'usa',
    'ecuador', 'colombia', 'chile', 'peru', 'croatia', 'switzerland', 'japan',
    'south korea', 'australia', 'morocco', 'egypt', 'nigeria', 'ghana',
    'senegal', 'tunisia', 'cameroon', 'costarica', 'costarica', 'paraguay',
    'venezuela', 'bolivia', 'qatar', 'saudi arabia', 'iran', 'iraq'
  ];
  
  // Define all common player names
  const commonPlayers = [
    'suarez', 'messi', 'ronaldo', 'mbappe', 'neymar', 'haaland', 'kane',
    'lewandowski', 'benzema', 'modric', 'debruyne', 'salah', 'mane',
    'vinicius', 'bellingham', 'pedri', 'gavi', 'valverde', 'davies',
    'david', 'pulisic', 'mckennie', 'pogba', 'griezmann', 'kimmich',
    'gundogan', 'kroos', 'modric', 'courtois', 'oblak', 'alisson'
  ];
  
  // Define club names
  const clubs = [
    'real madrid', 'barcelona', 'manchester', 'bayern', 'chelsea',
    'liverpool', 'arsenal', 'tottenham', 'psg', 'juventus', 'milan',
    'inter', 'atletico', 'dortmund', 'ajax', 'benfica', 'porto'
  ];
  
  // Determine query type AGGRESSIVELY
  const isCountry = countries.some(country => q === country || q.includes(` ${country}`) || q.includes(`${country} `));
  const isClub = clubs.some(club => q.includes(club));
  const isPlayer = commonPlayers.some(player => q.includes(player));
  const isWorldCup = q.includes('world cup') || q.includes('worldcup');
  
  console.log('Query analysis:', { isCountry, isClub, isPlayer, isWorldCup, query: q });
  
  // COUNTRY QUERY: Force team data, delete player data
  if (isCountry) {
    console.log('✅ Query is COUNTRY. Forcing team data only.');
    
    // If AI returned player data for country, REPLACE it
    if (parsed.playerInfo && !parsed.teamInfo) {
      console.log('❌ AI returned player for country. Creating team data.');
      const countryName = query.charAt(0).toUpperCase() + query.slice(1);
      return {
        playerInfo: null,
        teamInfo: {
          name: `${countryName} National Football Team`,
          ranking: 'N/A',
          coach: 'Unknown',
          stadium: 'Various stadiums',
          league: 'International',
          founded: 'Unknown',
          achievements: [`${countryName} national team achievements`],
          keyPlayers: [`Key players from ${countryName}`]
        },
        worldCupInfo: isWorldCup ? parsed.worldCupInfo : null,
        analysis: parsed.analysis || `Analysis of ${countryName} national football team.`,
        videoSearchTerm: `${countryName} national team highlights`,
        confidenceScore: 0.9
      };
    }
    
    // Clear any player data that might be present
    return {
      ...parsed,
      playerInfo: null,
      worldCupInfo: isWorldCup ? parsed.worldCupInfo : null
    };
  }
  
  // PLAYER QUERY: Force player data, delete team data
  if (isPlayer) {
    console.log('✅ Query is PLAYER. Forcing player data only.');
    
    // If AI returned team data for player, REPLACE it
    if (parsed.teamInfo && !parsed.playerInfo) {
      console.log('❌ AI returned team for player. Creating player data.');
      return {
        playerInfo: {
          name: query,
          position: 'Footballer',
          nationality: 'Unknown',
          currentClub: 'Unknown',
          stats: { goals: 0, assists: 0, appearances: 0 },
          marketValue: 'Unknown',
          achievements: ['Professional footballer']
        },
        teamInfo: null,
        worldCupInfo: null,
        analysis: parsed.analysis || `Analysis of footballer ${query}.`,
        videoSearchTerm: `${query} highlights`,
        confidenceScore: 0.9
      };
    }
    
    // Clear any team/worldcup data
    return {
      ...parsed,
      teamInfo: null,
      worldCupInfo: null
    };
  }
  
  // CLUB QUERY: Force team data
  if (isClub) {
    console.log('✅ Query is CLUB. Forcing team data only.');
    return {
      ...parsed,
      playerInfo: null,
      worldCupInfo: null
    };
  }
  
  // WORLD CUP QUERY: Force world cup data
  if (isWorldCup) {
    console.log('✅ Query is WORLD CUP. Forcing world cup data only.');
    return {
      ...parsed,
      playerInfo: null,
      teamInfo: null
    };
  }
  
  // GENERAL QUERY: Clear everything
  console.log('✅ Query is GENERAL. Clearing specific data.');
  return {
    ...parsed,
    playerInfo: null,
    teamInfo: null,
    worldCupInfo: null
  };
}

// Use Groq to analyze query
async function analyzeFootballQuery(query: string) {
  console.log('🤖 Starting AI analysis for:', query);
  const groq = getGroqClient();
  
  const prompt = `QUERY: "${query}"

INSTRUCTIONS:
1. If query is a COUNTRY (Canada, Uruguay, Brazil, etc.) → RETURN TEAM DATA ONLY
2. If query is a PLAYER (Luis Suarez, Messi, etc.) → RETURN PLAYER DATA ONLY  
3. If query is a CLUB (Real Madrid, Barcelona, etc.) → RETURN TEAM DATA ONLY
4. If query includes "World Cup" → RETURN WORLD CUP DATA ONLY
5. Otherwise → RETURN GENERAL ANALYSIS ONLY

CRITICAL: Return ONLY ONE data type. Never mix.

Return JSON with this structure (fill only ONE section):

{
  "playerInfo": null OR {
    "name": "Full Name",
    "position": "Position",
    "nationality": "Nationality", 
    "currentClub": "Current Club",
    "stats": {"goals": 0, "assists": 0, "appearances": 0},
    "marketValue": "Value",
    "achievements": ["Achievement1", "Achievement2"]
  },
  "teamInfo": null OR {
    "name": "Team Name",
    "ranking": "Ranking",
    "coach": "Coach",
    "stadium": "Stadium",
    "league": "League",
    "founded": 1900,
    "achievements": ["Achievement1", "Achievement2"],
    "keyPlayers": ["Player1", "Player2"]
  },
  "worldCupInfo": null OR {
    "year": 2026,
    "host": "Host Countries",
    "details": "Details",
    "qualifiedTeams": ["Team1", "Team2"],
    "venues": ["Venue1", "Venue2"]
  },
  "analysis": "Detailed analysis text here",
  "videoSearchTerm": "Search term for videos",
  "confidenceScore": 0.95
}`;

  try {
    console.log('🚀 Calling Groq API');
    const completion = await groq.chat.completions.create({
      messages: [{ role: 'user', content: prompt }],
      model: 'llama-3.3-70b-versatile',
      temperature: 0.1,
      max_tokens: 800,
    });

    const content = completion.choices[0]?.message?.content || '{}';
    console.log('📄 Raw AI response:', content.substring(0, 200) + '...');
    
    let parsed;
    try {
      parsed = JSON.parse(content);
      console.log('✅ JSON parsed. Raw data:', {
        hasPlayer: !!parsed.playerInfo,
        hasTeam: !!parsed.teamInfo,
        hasWorldCup: !!parsed.worldCupInfo
      });
    } catch (e) {
      console.error('❌ JSON parse failed, using empty structure');
      parsed = {
        playerInfo: null,
        teamInfo: null,
        worldCupInfo: null,
        analysis: `Analysis of ${query}.`,
        videoSearchTerm: query,
        confidenceScore: 0.5
      };
    }
    
    // Apply AGGRESSIVE cleaning
    const cleaned = aggressivelyCleanResponse(parsed, query);
    
    console.log('🧹 After aggressive cleaning:', {
      type: cleaned.playerInfo ? 'PLAYER' : cleaned.teamInfo ? 'TEAM' : cleaned.worldCupInfo ? 'WORLD_CUP' : 'GENERAL',
      playerName: cleaned.playerInfo?.name,
      teamName: cleaned.teamInfo?.name
    });
    
    return cleaned;
    
  } catch (error: any) {
    console.error('❌ Groq error:', error.message);
    return {
      playerInfo: null,
      teamInfo: null,
      worldCupInfo: null,
      analysis: `AI analysis for "${query}".`,
      videoSearchTerm: query,
      confidenceScore: 0.5
    };
  }
}

// Search YouTube
async function searchYouTube(searchTerm: string) {
  try {
    const apiKey = process.env.YOUTUBE_API_KEY;
    
    if (!apiKey) {
      console.warn('No YouTube API key, using fallback');
      return generateFallbackVideoUrl(searchTerm);
    }

    const response = await axios.get('https://www.googleapis.com/youtube/v3/search', {
      params: {
        part: 'snippet',
        q: `${searchTerm} football highlights 2024`,
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
    console.error('YouTube error:', error);
  }
  
  return generateFallbackVideoUrl(searchTerm);
}

// Fallback videos
function generateFallbackVideoUrl(query: string) {
  const q = query.toLowerCase();
  
  const videoMap: Record<string, string> = {
    'canada': 'https://www.youtube.com/embed/6MfLJBHjK0k',
    'uruguay': 'https://www.youtube.com/embed/9ILbr0XBp2o',
    'brazil': 'https://www.youtube.com/embed/eJXWcJeGXlM',
    'argentina': 'https://www.youtube.com/embed/eJXWcJeGXlM',
    'spain': 'https://www.youtube.com/embed/6MfLJBHjK0k',
    'france': 'https://www.youtube.com/embed/J8LcQOHtQKs',
    'germany': 'https://www.youtube.com/embed/XfyZ6EueJx8',
    'suarez': 'https://www.youtube.com/embed/6kl7AOKVpCM',
    'messi': 'https://www.youtube.com/embed/ZO0d8r_2qGI',
    'world cup': 'https://www.youtube.com/embed/dZqkf1ZnQh4',
  };

  for (const [key, url] of Object.entries(videoMap)) {
    if (q.includes(key)) {
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
      const aiAnalysis = await analyzeFootballQuery(query);
      
      let responseType = 'general';
      if (aiAnalysis.playerInfo) responseType = 'player';
      if (aiAnalysis.teamInfo) responseType = 'team';
      if (aiAnalysis.worldCupInfo) responseType = 'worldCup';
      
      console.log(`🎯 Final type: ${responseType.toUpperCase()}`);
      
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
        source: 'Groq AI + Aggressive Filtering'
      };

      console.log('📤 Sending aggressively cleaned response');
      
      return res.status(200).json(response);
      
    } catch (error: any) {
      console.error('❌ API error:', error.message);
      
      return res.status(200).json({
        success: false,
        query: query,
        type: 'error',
        error: 'Failed to process query',
        timestamp: new Date().toISOString(),
        youtubeUrl: generateFallbackVideoUrl(query),
        analysis: `Could not analyze "${query}". Please try again.`
      });
    }
  }

  // API docs
  res.status(200).json({
    message: 'FutbolAI API v3.1 is running! 🏆',
    version: '3.1',
    improvements: ['Aggressive data cleaning', 'Force single data type', 'Better country detection'],
    endpoints: {
      search: 'GET /api/ai?action=search&query=your-query',
      examples: [
        '/api/ai?action=search&query=Canada',
        '/api/ai?action=search&query=Luis%20Suarez',
        '/api/ai?action=search&query=World%20Cup'
      ]
    }
  });
}