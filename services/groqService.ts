import Groq from 'groq-sdk';

const groq = new Groq({
  apiKey: process.env.NEXT_PUBLIC_GROQ_API_KEY || '',
  dangerouslyAllowBrowser: true,
});

export const searchWithGROQ = async (query: string): Promise<any> => {
  if (!query.trim()) {
    return {
      players: [],
      teams: [],
      videoHighlights: [],
      teamAnalysis: null,
      message: 'Please enter a search query'
    };
  }

  // Check for API key
  if (!process.env.NEXT_PUBLIC_GROQ_API_KEY) {
    console.error('Missing GROQ API key');
    return {
      error: 'API key not configured. Please check your .env.local file.',
      players: [],
      teams: [],
      videoHighlights: [],
      teamAnalysis: null
    };
  }

  try {
    const completion = await groq.chat.completions.create({
      messages: [
        {
          role: 'system',
          content: `You are a football expert. Respond with valid JSON only.
          
          Required JSON structure:
          {
            "players": [{"name": "string", "team": "string", "position": "string", "wikipediaSummary": "string"}],
            "teams": [{"name": "string", "country": "string", "coach": "string", "fifaRanking": number, "group": "string"}],
            "videoHighlights": [{"title": "string", "url": "string", "duration": "string"}],
            "teamAnalysis": {"teamName": "string", "strengths": ["string"], "weaknesses": ["string"], "keyPlayers": ["string"], "formation": "string"},
            "message": "string"
          }
          
          For 2026 World Cup: Include group letters (A-L) for qualified teams.
          Keep responses factual. If no data, return empty arrays.`
        },
        {
          role: 'user',
          content: `Search football: ${query}`
        }
      ],
      model: 'mixtral-8x7b-32768',
      temperature: 0.3,
      max_tokens: 1000,
      response_format: { type: 'json_object' }
    });

    const response = completion.choices[0]?.message?.content;
    
    if (!response) {
      return {
        error: 'Empty response from AI',
        players: [],
        teams: [],
        videoHighlights: [],
        teamAnalysis: null
      };
    }

    try {
      const result = JSON.parse(response);
      
      // Ensure proper structure
      return {
        players: Array.isArray(result.players) ? result.players : [],
        teams: Array.isArray(result.teams) ? result.teams : [],
        videoHighlights: Array.isArray(result.videoHighlights) ? result.videoHighlights : [],
        teamAnalysis: result.teamAnalysis || null,
        message: result.message || `Results for "${query}"`,
        error: result.error || null
      };
      
    } catch (parseError) {
      console.error('JSON parse error:', parseError);
      return {
        error: 'Failed to parse AI response',
        players: [],
        teams: [],
        videoHighlights: [],
        teamAnalysis: null
      };
    }

  } catch (error: any) {
    console.error('GROQ API error:', error);
    
    if (error?.status === 401) {
      return {
        error: 'Invalid API key',
        players: [],
        teams: [],
        videoHighlights: [],
        teamAnalysis: null
      };
    }
    
    if (error?.status === 429) {
      return {
        error: 'Rate limit exceeded',
        players: [],
        teams: [],
        videoHighlights: [],
        teamAnalysis: null
      };
    }
    
    return {
      error: error.message || 'Search failed',
      players: [],
      teams: [],
      videoHighlights: [],
      teamAnalysis: null
    };
  }
};

// For backward compatibility
export const GROQSearch = searchWithGROQ;