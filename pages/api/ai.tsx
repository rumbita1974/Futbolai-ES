import type { NextApiRequest, NextApiResponse } from 'next';
import axios from 'axios';
import { Groq } from 'groq-sdk';

// Initialize Groq client
function getGroqClient() {
  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) {
    throw new Error('GROQ_API_KEY is required.');
  }
  return new Groq({ apiKey });
}

// Smart query type detection
function detectQueryType(query: string): string {
  const q = query.toLowerCase().trim();
  
  // Common country names
  const countries = [
    'argentina', 'brazil', 'spain', 'france', 'germany', 'england', 'portugal',
    'italy', 'netherlands', 'belgium', 'mexico', 'usa', 'canada', 'uruguay',
    'colombia', 'chile', 'peru', 'ecuador', 'croatia', 'switzerland', 'japan'
  ];
  
  // Common club names
  const clubs = [
    'real madrid', 'barcelona', 'manchester', 'bayern', 'chelsea', 'liverpool',
    'arsenal', 'tottenham', 'psg', 'juventus', 'milan', 'inter', 'atletico'
  ];
  
  // Check for exact country match
  for (const country of countries) {
    if (q === country || q === `${country} team` || q === `${country} national`) {
      return 'team';
    }
  }
  
  // Check for clubs
  for (const club of clubs) {
    if (q.includes(club)) {
      return 'team';
    }
  }
  
  // Check for World Cup
  if (q.includes('world cup') || q.includes('worldcup')) {
    return 'worldCup';
  }
  
  // Default to general (AI will decide between player/general)
  return 'general';
}

// Enhanced prompt for better AI responses
async function analyzeFootballQuery(query: string) {
  console.log('🤖 AI Analysis for:', query);
  const groq = getGroqClient();
  
  const queryType = detectQueryType(query);
  console.log('📊 Detected query type:', queryType);
  
  const prompt = `You are FutbolAI, an expert football analyst with deep knowledge.

USER QUERY: "${query}"

CRITICAL INSTRUCTIONS:
1. Provide RICH, DETAILED analysis with specific facts, statistics, and context
2. Include CURRENT information (2023-2024 season data when relevant)
3. For players: Include recent form, key stats, and recent achievements
4. For teams: Include current squad, recent performances, and tactical style
5. For World Cup: Include latest qualifying news and tournament details

QUERY TYPE HINT: This appears to be a ${queryType.toUpperCase()} query.

Return ONLY valid JSON with this structure:

{
  "playerInfo": ${queryType === 'player' ? `{
    "name": "Full Name",
    "position": "Specific Position (e.g., 'Center Forward', 'Defensive Midfielder')",
    "nationality": "Nationality",
    "currentClub": "Current Club (2024)",
    "stats": {
      "goals": "Career goals (include 2023/24 season)",
      "assists": "Career assists",
      "appearances": "Total appearances"
    },
    "marketValue": "Current market value (e.g., '€80M')",
    "achievements": ["Specific achievement 1", "Specific achievement 2", "Recent achievement 3"]
  }` : 'null'},
  
  "teamInfo": ${queryType === 'team' ? `{
    "name": "Team Full Name",
    "ranking": "Current ranking (e.g., '1st in La Liga, 3rd in UEFA rankings')",
    "coach": "Current Manager/Coach",
    "stadium": "Home Stadium with capacity",
    "league": "Current League/Competition",
    "founded": "Year founded",
    "achievements": ["Major trophy 1", "Major trophy 2", "Recent achievement"],
    "keyPlayers": ["Current star 1", "Current star 2", "Rising talent"],
    "recentPerformance": "Recent form or notable match"
  }` : 'null'},
  
  "worldCupInfo": ${queryType === 'worldCup' ? `{
    "year": 2026,
    "host": "Host Countries",
    "details": "Detailed tournament information including format changes",
    "qualifiedTeams": ["Already qualified teams", "Top contenders"],
    "venues": ["Key stadiums", "Capacity information"],
    "favorites": ["Tournament favorites with odds"],
    "schedule": "Key dates and phases"
  }` : 'null'},
  
  "analysis": "COMPREHENSIVE analysis (minimum 3-4 detailed paragraphs). Include:
  - Historical context and significance
  - Current status/performance
  - Key statistics and records
  - Recent developments (2023-2024)
  - Future prospects
  - Interesting facts or trivia",
  
  "videoSearchTerm": "Specific search term for highlights (include player/team name + '2024 highlights best moments')",
  "confidenceScore": 0.95
}

IMPORTANT: Make the analysis ENGAGING and INFORMATIVE. Use specific numbers, dates, and facts.`;

  try {
    console.log('🚀 Calling Groq with enhanced prompt');
    const completion = await groq.chat.completions.create({
      messages: [
        { 
          role: 'system', 
          content: 'You are an expert football analyst. Provide detailed, accurate, and engaging analysis.' 
        },
        { role: 'user', content: prompt }
      ],
      model: 'llama-3.3-70b-versatile',
      temperature: 0.3, // Lower for more factual responses
      max_tokens: 1200, // More tokens for detailed analysis
    });

    const content = completion.choices[0]?.message?.content || '{}';
    console.log('📄 Raw AI response length:', content.length);
    
    let parsed;
    try {
      parsed = JSON.parse(content);
      console.log('✅ JSON parsed successfully');
    } catch (e) {
      console.error('❌ JSON parse failed, using enhanced fallback');
      // Enhanced fallback
      parsed = {
        playerInfo: null,
        teamInfo: null,
        worldCupInfo: null,
        analysis: `Detailed analysis of ${query}. As a football expert, I can tell you this is a fascinating topic in the world of football with rich history and current relevance.`,
        videoSearchTerm: `${query} 2024 highlights best moments`,
        confidenceScore: 0.7
      };
    }
    
    return parsed;
    
  } catch (error: any) {
    console.error('❌ Groq error:', error.message);
    throw error;
  }
}

// Enhanced YouTube search with multiple fallbacks
async function searchYouTube(searchTerm: string) {
  console.log('🔍 YouTube search for:', searchTerm);
  
  const apiKey = process.env.YOUTUBE_API_KEY;
  
  if (!apiKey) {
    console.warn('No YouTube API key, using enhanced fallback');
    return generateEnhancedFallbackVideo(searchTerm);
  }

  try {
    // Try multiple search variations
    const searchVariations = [
      `${searchTerm} highlights 2024`,
      `${searchTerm} best moments 2023`,
      `${searchTerm} football skills`,
      `${searchTerm} recent matches`
    ];

    for (const variation of searchVariations) {
      try {
        console.log('Trying search:', variation);
        const response = await axios.get('https://www.googleapis.com/youtube/v3/search', {
          params: {
            part: 'snippet',
            q: variation,
            type: 'video',
            maxResults: 1,
            key: apiKey,
            videoEmbeddable: 'true',
            safeSearch: 'strict',
            videoDuration: 'medium', // 4-20 minutes
            relevanceLanguage: 'en',
            order: 'relevance'
          },
          timeout: 5000 // 5 second timeout
        });

        if (response.data.items?.length > 0) {
          const videoId = response.data.items[0].id.videoId;
          const url = `https://www.youtube.com/embed/${videoId}?rel=0&modestbranding=1`;
          console.log('✅ Found YouTube video:', url);
          return url;
        }
      } catch (err) {
        console.log('Search variation failed:', variation);
        continue;
      }
    }
    
    console.log('No YouTube results found, using fallback');
    return generateEnhancedFallbackVideo(searchTerm);
    
  } catch (error: any) {
    console.error('❌ YouTube API error:', error.message);
    return generateEnhancedFallbackVideo(searchTerm);
  }
}

// Enhanced fallback with more options
function generateEnhancedFallbackVideo(query: string) {
  const q = query.toLowerCase();
  
  const enhancedVideoMap: Record<string, string> = {
    // Players - updated 2024 highlights
    'messi': 'https://www.youtube.com/embed/tKqYfL4hU2c', // Messi 2024 highlights
    'ronaldo': 'https://www.youtube.com/embed/5Z5Ltwfqz94', // Ronaldo 2024
    'mbappe': 'https://www.youtube.com/embed/RdGpDPLT5Q4',
    'haaland': 'https://www.youtube.com/embed/4XqQpQ8KZg4',
    'neymar': 'https://www.youtube.com/embed/qp2DMhuBdgg',
    'benzema': 'https://www.youtube.com/embed/1G8V_5EMwSg',
    'carvajal': 'https://www.youtube.com/embed/J_8Tlq-kqDs',
    'modric': 'https://www.youtube.com/embed/fzSSQd9s8k8',
    'kane': 'https://www.youtube.com/embed/g5JDiknIpx0',
    
    // Teams - recent highlights
    'real madrid': 'https://www.youtube.com/embed/tKqYfL4hU2c',
    'barcelona': 'https://www.youtube.com/embed/3X7XG5KZiUY',
    'manchester city': 'https://www.youtube.com/embed/KXwHEvDE2-U',
    'liverpool': 'https://www.youtube.com/embed/J_8Tlq-kqDs',
    'arsenal': 'https://www.youtube.com/embed/WVb4FZBK7Gs',
    'bayern': 'https://www.youtube.com/embed/HO3NxVEoaAE',
    
    // National teams
    'argentina': 'https://www.youtube.com/embed/eJXWcJeGXlM',
    'brazil': 'https://www.youtube.com/embed/9ILbr0XBp2o',
    'france': 'https://www.youtube.com/embed/J8LcQOHtQKs',
    'spain': 'https://www.youtube.com/embed/L_ffKp-5DjE',
    'england': 'https://www.youtube.com/embed/9ILbr0XBp2o',
    'portugal': 'https://www.youtube.com/embed/9ILbr0XBp2o',
    'germany': 'https://www.youtube.com/embed/L_ffKp-5DjE',
    'italy': 'https://www.youtube.com/embed/L_ffKp-5DjE',
    
    // World Cup
    'world cup': 'https://www.youtube.com/embed/dZqkf1ZnQh4',
    'world cup 2026': 'https://www.youtube.com/embed/dZqkf1ZnQh4',
    
    // Competitions
    'champions league': 'https://www.youtube.com/embed/tKqYfL4hU2c',
    'premier league': 'https://www.youtube.com/embed/J_8Tlq-kqDs',
    'la liga': 'https://www.youtube.com/embed/tKqYfL4hU2c',
    'bundesliga': 'https://www.youtube.com/embed/HO3NxVEoaAE',
  };

  // Check for partial matches
  for (const [key, url] of Object.entries(enhancedVideoMap)) {
    if (q.includes(key)) {
      console.log(`✅ Using fallback video for: ${key}`);
      return url;
    }
  }

  // Football highlights compilation as final fallback
  console.log('⚠️ Using general football highlights fallback');
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
      console.log('✅ AI Analysis complete');
      
      // Determine response type
      let responseType = 'general';
      if (aiAnalysis.playerInfo) responseType = 'player';
      if (aiAnalysis.teamInfo) responseType = 'team';
      if (aiAnalysis.worldCupInfo) responseType = 'worldCup';
      
      console.log(`📊 Final type: ${responseType}`);
      
      const searchTerm = aiAnalysis.videoSearchTerm || `${query} highlights 2024`;
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
        analysis: aiAnalysis.analysis || `Comprehensive analysis of ${query}`,
        confidence: aiAnalysis.confidenceScore || 0.8,
        source: 'Groq AI Enhanced',
        features: ['Detailed analysis', 'Smart video search', '2024 data']
      };

      console.log('📤 Sending enhanced response');
      
      return res.status(200).json(response);
      
    } catch (error: any) {
      console.error('❌ API error:', error.message);
      
      return res.status(200).json({
        success: false,
        query: query,
        type: 'error',
        error: 'Failed to process query',
        timestamp: new Date().toISOString(),
        youtubeUrl: generateEnhancedFallbackVideo(query),
        analysis: `We encountered an issue analyzing "${query}". Please try again with a different search term.`,
        features: ['Fallback mode active']
      });
    }
  }

  // API docs
  res.status(200).json({
    message: 'FutbolAI Enhanced API v3.0 🏆',
    version: '3.0',
    improvements: [
      'Enhanced AI prompts for detailed analysis',
      'Smart YouTube search with multiple fallbacks',
      'Better query type detection',
      '2023-2024 season data',
      'Rich factual responses'
    ],
    endpoints: {
      search: 'GET /api/ai?action=search&query=your-query',
      examples: [
        '/api/ai?action=search&query=Jude%20Bellingham',
        '/api/ai?action=search&query=Manchester%20City%202024',
        '/api/ai?action=search&query=World%20Cup%20qualifiers'
      ]
    }
  });
}