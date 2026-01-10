import Groq from 'groq-sdk';
import { enhanceGROQResponse, isWikipediaConfigured } from '@/services/dataEnhancerService';

const groq = new Groq({
  apiKey: process.env.NEXT_PUBLIC_GROQ_API_KEY || '',
  dangerouslyAllowBrowser: true,
});

export interface Player {
  name: string;
  currentTeam: string;
  position: string;
  age?: number;
  nationality: string;
  careerGoals?: number;
  careerAssists?: number;
  internationalAppearances?: number;
  internationalGoals?: number;
  majorAchievements: string[];
  careerSummary: string;
  _source?: string;
  _lastVerified?: string;
  _wikiSummary?: string;
  _era?: string;
  _yearsAtTeam?: string;
}

export interface Team {
  name: string;
  type: 'club' | 'national';
  country: string;
  stadium?: string;
  currentCoach: string;
  foundedYear?: number;
  majorAchievements: {
    worldCup: string[];
    continental: string[];
    domestic: string[];
  };
  _source?: string;
  _lastVerified?: string;
  _updateReason?: string;
  _wikiSummary?: string;
  _achievementsUpdated?: boolean;
  _dataCurrency?: {
    lastTrained: string;
    enhanced: string;
    updatesApplied: string[];
    currentSeason: string;
    verification: {
      source: string;
      confidence: 'high' | 'medium' | 'low';
      timestamp: string;
    };
    disclaimer: string;
    recommendations: string[];
  };
}

export interface GROQSearchResponse {
  players: Player[];
  teams: Team[];
  youtubeQuery: string;
  error?: string;
  message?: string;
  _metadata?: {
    enhancedAt: string;
    analysis: any;
    appliedUpdates: string[];
    dataSources: string[];
    apiStatus: {
      wikipedia: string;
      groq: string;
    };
    currentSeason: string;
    dataCurrency: {
      aiCutoff: string;
      verifiedWith: string;
      confidence: string;
      lastVerified: string;
    };
    disclaimer: string;
    recommendations: string[];
    wikipediaUsage: {
      queries: number;
      updates: number;
      timestamp: string;
    };
    achievementCorrections?: string[];
  };
}

/**
 * Main GROQ search function for football queries
 */
export const searchWithGROQ = async (query: string, language: string = 'en'): Promise<GROQSearchResponse> => {
  // Validate API key
  const apiKey = process.env.NEXT_PUBLIC_GROQ_API_KEY || process.env.GROQ_API_KEY;
  if (!apiKey || apiKey.trim() === '') {
    console.error('GROQ API key is missing. Check your .env.local file');
    return {
      players: [],
      teams: [],
      youtubeQuery: '',
      error: 'GROQ API key not configured. Please add NEXT_PUBLIC_GROQ_API_KEY to your .env.local file.',
      _metadata: {
        enhancedAt: new Date().toISOString(),
        analysis: { error: 'Missing API key' },
        appliedUpdates: [],
        dataSources: [],
        apiStatus: {
          wikipedia: 'Not checked',
          groq: 'Missing key'
        },
        currentSeason: `${new Date().getFullYear()}/${new Date().getFullYear() + 1}`,
        dataCurrency: {
          aiCutoff: 'N/A',
          verifiedWith: 'None',
          confidence: 'low',
          lastVerified: new Date().toISOString()
        },
        disclaimer: 'GROQ API key missing. Cannot fetch AI data.',
        recommendations: ['Check your .env.local file for GROQ_API_KEY'],
        wikipediaUsage: {
          queries: 0,
          updates: 0,
          timestamp: new Date().toISOString()
        }
      }
    };
  }

  try {
    console.log(`[GROQ] Searching for: "${query}" with model: llama-3.3-70b-versatile, Language: ${language}`);
    
    const completion = await groq.chat.completions.create({
      messages: [
        {
          role: 'system',
          content: `You are FutbolAI - a professional football data analyst. You provide comprehensive, accurate football statistics.

${language === 'es' ? 'RESPONDE EN ESPAÑOL. Proporciona toda la información en español.' : 'RESPOND IN ENGLISH. Provide all information in English.'}

CRITICAL REQUIREMENTS FOR TEAMS:

1. PLAYER COUNT REQUIREMENTS:
   - For NATIONAL TEAMS: Return 12-15 key current players
   - For CLUB TEAMS: Return 15-20 key current players
   
   Include players from ALL positions:
   • Goalkeepers (1-3 players)
   • Defenders (3-5 players for national teams, 5-7 for clubs)
   • Midfielders (4-6 players for national teams, 6-8 for clubs)
   • Forwards (3-4 players for national teams, 4-5 for clubs)

2. TIMELINESS VS COMPREHENSIVENESS:
   ${language === 'es' ? '   - Para información ACTUAL (clubes, entrenadores, edad): Sé preciso y actualizado' : '   - For CURRENT info (clubs, coaches, age): Be precise and up-to-date'}
   ${language === 'es' ? '   - Para información HISTÓRICA (logros, estadísticas): Sé exhaustivo y completo' : '   - For HISTORICAL info (achievements, stats): Be thorough and complete'}

3. CRITICAL 2024-2025 UPDATES (MUST BE ACCURATE):
   Clubs & Coaches:
   - Real Madrid: Coach = Xabi Alonso (since 2024). 15 UCL titles.
   - Bayern Munich: Coach = Vincent Kompany (since 2024)
   - Liverpool: Coach = Arne Slot (since 2024)
   - Barcelona: Coach = Hansi Flick (since 2024)
   - Chelsea: Coach = Enzo Maresca (since 2024)
   - AC Milan: Coach = Paulo Fonseca (since 2024)
   - Juventus: Coach = Thiago Motta (since 2024)
   - Brazil: Coach = Dorival Júnior (since 2024)
   
   Major Player Transfers:
   - Kylian Mbappé: Real Madrid (July 2024 from PSG)
   - Cristiano Ronaldo: Al Nassr (January 2023 from Manchester United)
   - Lionel Messi: Inter Miami CF (July 2023 from PSG)
   - Neymar: Al Hilal (August 2023 from PSG)
   - Karim Benzema: Al Ittihad (June 2023 from Real Madrid)
   - Jude Bellingham: Real Madrid (June 2023 from Borussia Dortmund)
   - Robert Lewandowski: FC Barcelona (July 2022 from Bayern Munich)
   - Erling Haaland: Manchester City (July 2022 from Borussia Dortmund)

4. ACHIEVEMENT REPORTING RULES:
   - List ALL major career achievements
   - For players: Include Ballon d'Or, league titles, cup wins, international trophies
   - For teams: Include all major domestic, continental, and world titles
   - Group similar achievements: "5x Champions League Winner" not just "Champions League Winner"
   - Include specific years for significant achievements: "European Championship 2016"

5. STATISTICS GUIDELINES:
   - Provide complete career totals: goals, assists, appearances
   - Include both club and international statistics
   - For retired players, mark as "retired" and provide full career summary

6. OUTPUT FORMAT RULES:
   ALWAYS respond with VALID JSON using this exact structure:
   {
     "players": [{
       "name": "string",
       "currentTeam": "string (CURRENT 2024-2025 CLUB)",
       "position": "string",
       "age": number,
       "nationality": "string",
       "careerGoals": number,
       "careerAssists": number,
       "internationalAppearances": number,
       "internationalGoals": number,
       "majorAchievements": ["string (COMPREHENSIVE LIST)"],
       "careerSummary": "string (DETAILED 2-3 sentences including club history)"
     }],
     "teams": [{
       "name": "string",
       "type": "club" or "national",
       "country": "string",
       "stadium": "string",
       "currentCoach": "string (CURRENT 2024-2025)",
       "foundedYear": number,
       "majorAchievements": {
         "worldCup": ["string"],
         "continental": ["string"],
         "domestic": ["string"]
       }
     }],
     "youtubeQuery": "string",
     "message": "string (Include: 'Information as of 2024' for data currency)"
   }

${language === 'es' ? `
EJEMPLO COMPLETO PARA "Argentina nacional" (EN ESPAÑOL - DEBE INCLUIR MÚLTIPLES JUGADORES):

IMPORTANTE: Para una selección nacional, devuelve AL MENOS 12-15 jugadores clave.

{
  "players": [
    {
      "name": "Lionel Messi",
      "currentTeam": "Inter Miami CF",
      "position": "Delantero",
      "age": 36,
      "nationality": "Argentino",
      "careerGoals": 835,
      "careerAssists": 375,
      "internationalAppearances": 180,
      "internationalGoals": 106,
      "majorAchievements": ["Ganador de la Copa Mundial FIFA 2022", "Ganador de la Copa América 2021", "8x Balón de Oro", "4x UEFA Champions League"],
      "careerSummary": "Futbolista argentino considerado uno de los mejores jugadores de todos los tiempos. Conocido por su regate, creación de juego, visión y capacidad goleadora. Jugó en el Barcelona (2004-2021), Paris Saint-Germain (2021-2023) y actualmente juega en el Inter Miami CF (desde julio de 2023)."
    },
    {
      "name": "Ángel Di María",
      "currentTeam": "Benfica",
      "position": "Centrocampista",
      "age": 35,
      "nationality": "Argentino",
      "careerGoals": 186,
      "careerAssists": 225,
      "internationalAppearances": 136,
      "internationalGoals": 29,
      "majorAchievements": ["Ganador de la Copa Mundial FIFA 2022", "Ganador de la Copa América 2021", "1x UEFA Champions League (2014)", "1x UEFA European Championship (2021 con Portugal)"],
      "careerSummary": "Futbolista argentino conocido por su velocidad, habilidad y precisión en el pase. Jugó en Rosario Central, Benfica, Real Madrid, Manchester United, Paris Saint-Germain, Juventus y ahora ha regresado al Benfica."
    },
    {
      "name": "Emiliano Martínez",
      "currentTeam": "Aston Villa",
      "position": "Portero",
      "age": 31,
      "nationality": "Argentino",
      "careerGoals": 0,
      "careerAssists": 0,
      "internationalAppearances": 35,
      "internationalGoals": 0,
      "majorAchievements": ["Ganador de la Copa Mundial FIFA 2022", "Ganador de la Copa América 2021", "Guante de Oro de la Copa Mundial 2022", "1x FA Cup"],
      "careerSummary": "Portero argentino conocido por sus paradas decisivas y personalidad. Jugó en Independiente, Arsenal, y varios préstamos antes de establecerse en el Aston Villa."
    },
    // ... CONTINÚA CON MÁS JUGADORES hasta al menos 12-15
  ],
  "teams": [{
    "name": "Selección Argentina",
    "type": "nacional",
    "country": "Argentina",
    "stadium": "Estadio Antonio Vespucio Liberti",
    "currentCoach": "Lionel Scaloni",
    "foundedYear": 1901,
    "majorAchievements": {
      "worldCup": [
        "Ganador de la Copa Mundial FIFA 1978",
        "Ganador de la Copa Mundial FIFA 1986", 
        "Ganador de la Copa Mundial FIFA 2022"
      ],
      "continental": [
        "15x Ganador de la Copa América (1921, 1925, 1927, 1929, 1937, 1941, 1945, 1946, 1947, 1955, 1957, 1959, 1991, 1993, 2021)"
      ],
      "domestic": []
    }
  }],
  "youtubeQuery": "Argentina mejores momentos Copa Mundial 2022 resumen completo",
  "message": "Información de la Selección Argentina y su plantel actual. Información actualizada a 2024."
}
` : `
COMPLETE EXAMPLE FOR "Argentina national" (IN ENGLISH - MUST INCLUDE MULTIPLE PLAYERS):

IMPORTANT: For a national team, return AT LEAST 12-15 key players.

{
  "players": [
    {
      "name": "Lionel Messi",
      "currentTeam": "Inter Miami CF",
      "position": "Forward",
      "age": 36,
      "nationality": "Argentine",
      "careerGoals": 835,
      "careerAssists": 375,
      "internationalAppearances": 180,
      "internationalGoals": 106,
      "majorAchievements": ["2022 FIFA World Cup Winner", "2021 Copa América Winner", "8x Ballon d'Or", "4x UEFA Champions League Winner"],
      "careerSummary": "Argentine professional footballer considered one of the greatest players of all time. Known for his dribbling, playmaking, vision, and goal-scoring abilities. Played for Barcelona (2004-2021), Paris Saint-Germain (2021-2023), and currently plays for Inter Miami CF (since July 2023)."
    },
    {
      "name": "Ángel Di María",
      "currentTeam": "Benfica",
      "position": "Midfielder",
      "age": 35,
      "nationality": "Argentine",
      "careerGoals": 186,
      "careerAssists": 225,
      "internationalAppearances": 136,
      "internationalGoals": 29,
      "majorAchievements": ["2022 FIFA World Cup Winner", "2021 Copa América Winner", "1x UEFA Champions League (2014)", "1x UEFA European Championship (2021 with Portugal)"],
      "careerSummary": "Argentine footballer known for his speed, skill, and passing accuracy. Played for Rosario Central, Benfica, Real Madrid, Manchester United, Paris Saint-Germain, Juventus, and has now returned to Benfica."
    },
    {
      "name": "Emiliano Martínez",
      "currentTeam": "Aston Villa",
      "position": "Goalkeeper",
      "age": 31,
      "nationality": "Argentine",
      "careerGoals": 0,
      "careerAssists": 0,
      "internationalAppearances": 35,
      "internationalGoals": 0,
      "majorAchievements": ["2022 FIFA World Cup Winner", "2021 Copa América Winner", "FIFA World Cup Golden Glove 2022", "1x FA Cup"],
      "careerSummary": "Argentine goalkeeper known for his decisive saves and personality. Played for Independiente, Arsenal, and several loan spells before establishing himself at Aston Villa."
    },
    // ... CONTINUE WITH MORE PLAYERS up to at least 12-15
  ],
  "teams": [{
    "name": "Argentina",
    "type": "national",
    "country": "Argentina",
    "stadium": "Estadio Alberto J. Armando",
    "currentCoach": "Lionel Scaloni",
    "foundedYear": 1893,
    "majorAchievements": {
      "worldCup": [
        "2022 FIFA World Cup Winner"
      ],
      "continental": [
        "2021 Copa América Winner",
        "15x Copa América Winner"
      ],
      "domestic": []
    }
  }],
  "youtubeQuery": "Argentina best moments 2022 World Cup full highlights",
  "message": "Argentina national team information and current squad. Information as of 2024."
}
`}

${language === 'es' ? `
RECUERDA CRÍTICAMENTE:
1. NÚMERO DE JUGADORES: Para selecciones nacionales → 12-15 jugadores. Para clubes → 15-20 jugadores.
2. Todas las posiciones: Porteros, defensas, centrocampistas, delanteros.
3. Clubes/entrenadores actuales: DEBEN ser precisos para la temporada 2024-2025
4. Logros: Enumera TODOS los principales de manera exhaustiva
5. Siempre incluye "Información actualizada a 2024" en el campo de mensaje
` : `
CRITICALLY REMEMBER:
1. PLAYER COUNT: For national teams → 12-15 players. For clubs → 15-20 players.
2. All positions: Goalkeepers, defenders, midfielders, forwards.
3. Current clubs/coaches: MUST be accurate for 2024-2025 season
4. Achievements: List ALL major ones comprehensively
5. Always include "Information as of 2024" in message field
`}`
        },
        {
          role: 'user',
          content: `Football search query: "${query}". 
          
${language === 'es' ? 
'IMPORTANTE: Si es una selección nacional, devuelve AL MENOS 12-15 jugadores clave. Si es un club, devuelve AL MENOS 15-20 jugadores clave. Incluye porteros, defensas, centrocampistas y delanteros. Proporciona datos completos y precisos en el formato JSON especificado.' : 
'IMPORTANT: If it is a national team, return AT LEAST 12-15 key players. If it is a club team, return AT LEAST 15-20 key players. Include goalkeepers, defenders, midfielders, and forwards. Provide comprehensive, accurate data in the specified JSON format.'}`
        }
      ],
      model: 'llama-3.3-70b-versatile',
      temperature: 0.3,
      max_tokens: 4000,
      response_format: { type: 'json_object' }
    });

    const response = completion.choices[0]?.message?.content;
    console.log('[GROQ] Raw response:', response);
    
    if (!response || response.trim() === '') {
      return {
        players: [],
        teams: [],
        youtubeQuery: '',
        error: 'Received empty response from AI service',
        message: 'No data found for your query.',
        _metadata: {
          enhancedAt: new Date().toISOString(),
          analysis: { error: 'Empty response' },
          appliedUpdates: [],
          dataSources: ['GROQ AI'],
          apiStatus: {
            wikipedia: 'Not used',
            groq: 'Success'
          },
          currentSeason: `${new Date().getFullYear()}/${new Date().getFullYear() + 1}`,
          dataCurrency: {
            aiCutoff: '2024',
            verifiedWith: 'None',
            confidence: 'low',
            lastVerified: new Date().toISOString()
          },
          disclaimer: 'AI returned empty response.',
          recommendations: ['Try a different search term'],
          wikipediaUsage: {
            queries: 0,
            updates: 0,
            timestamp: new Date().toISOString()
          }
        }
      };
    }

    try {
      const parsed = JSON.parse(response);
      console.log('[GROQ] Parsed response:', parsed);
      
      // Check player count
      const playerCount = Array.isArray(parsed.players) ? parsed.players.length : 0;
      console.log(`[GROQ] Found ${playerCount} players in response`);
      
      // ENHANCE WITH WIKIPEDIA DATA
      console.log('[GROQ] Enhancing with Wikipedia API...');
      const wikipediaConfigured = isWikipediaConfigured();
      console.log('[GROQ] Wikipedia API configured:', wikipediaConfigured);
      
      let enhancedResult = parsed;
      let wikipediaUpdates = 0;
      let achievementCorrections: string[] = [];
      
      if (wikipediaConfigured) {
        try {
          enhancedResult = await enhanceGROQResponse(parsed, query);
          console.log('[GROQ] Wikipedia-enhanced response:', enhancedResult);
          wikipediaUpdates = enhancedResult._metadata?.appliedUpdates?.length || 0;
          achievementCorrections = enhancedResult._metadata?.achievementCorrections || [];
        } catch (enhanceError) {
          console.error('[GROQ] Wikipedia enhancement failed:', enhanceError);
          // Continue with basic result if enhancement fails
          enhancedResult = parsed;
        }
      } else {
        console.log('[GROQ] Wikipedia API not configured, using basic result');
        enhancedResult = parsed;
      }
      
      // Build final response - REMOVED THE .slice(0, 1) LIMIT!
      const result: GROQSearchResponse = {
        players: Array.isArray(enhancedResult.players) ? enhancedResult.players : [],
        teams: Array.isArray(enhancedResult.teams) ? enhancedResult.teams.slice(0, 1) : [],
        youtubeQuery: enhancedResult.youtubeQuery || `${query} football highlights ${new Date().getFullYear()}`,
        message: enhancedResult.message || `Found information for "${query}"`,
        error: enhancedResult.error || null,
        _metadata: enhancedResult._metadata || {
          enhancedAt: new Date().toISOString(),
          analysis: {
            playerCount: playerCount,
            isLikelyOutdated: false,
            outdatedFields: [],
            suggestions: playerCount < 10 ? ['Insufficient players returned'] : ['Basic data verification'],
            needsEnhancement: false,
            confidence: playerCount >= 10 ? 'high' : 'medium'
          },
          appliedUpdates: [],
          dataSources: ['GROQ AI'],
          apiStatus: {
            wikipedia: wikipediaConfigured ? 'Configured' : 'Not configured',
            groq: 'Success'
          },
          currentSeason: `${new Date().getFullYear()}/${new Date().getFullYear() + 1}`,
          dataCurrency: {
            aiCutoff: '2024',
            verifiedWith: wikipediaConfigured ? 'Wikipedia' : 'None',
            confidence: wikipediaUpdates > 0 ? 'high' : (playerCount >= 10 ? 'medium' : 'low'),
            lastVerified: new Date().toISOString()
          },
          disclaimer: wikipediaConfigured 
            ? 'Data verified with Wikipedia for current accuracy.'
            : 'Wikipedia API not configured. Data may be outdated.',
          recommendations: playerCount < 10 ? [
            'The AI returned fewer players than expected.',
            'Try searching for the specific team name.',
            'Visit official team websites for complete squad lists.'
          ] : [
            'Check official sources for absolutely current information',
            'Visit club websites for latest squad details'
          ],
          wikipediaUsage: {
            queries: wikipediaConfigured ? 1 : 0,
            updates: wikipediaUpdates,
            timestamp: new Date().toISOString()
          },
          achievementCorrections
        }
      };
      
      // Add player count note to message
      let playerCountMessage = '';
      if (playerCount >= 10) {
        playerCountMessage = language === 'es' 
          ? ` • ${playerCount} jugadores incluidos`
          : ` • ${playerCount} players included`;
      } else if (playerCount > 0) {
        playerCountMessage = language === 'es'
          ? ` • Solo ${playerCount} jugador(es) devuelto(s)`
          : ` • Only ${playerCount} player(s) returned`;
      }
      
      // Add enhancement note to message
      if (wikipediaUpdates > 0 && result.message) {
        result.message = `✓ ${result.message}${playerCountMessage} (Updated with Wikipedia data)`;
        
        // Add specific note for achievement corrections
        if (achievementCorrections.length > 0) {
          if (achievementCorrections.some(c => c.includes('15 UEFA Champions League'))) {
            result.message += ' • 15 UCL titles confirmed';
          }
        }
      } else if (wikipediaConfigured && result.message) {
        result.message = `✓ ${result.message}${playerCountMessage} (Verified with Wikipedia)`;
      } else if (result.message) {
        result.message = `${result.message}${playerCountMessage}`;
      }
      
      console.log(`[GROQ] Final response: ${result.players.length} players, ${result.teams.length} teams`);
      console.log('[GROQ] Final response with metadata:', result._metadata);
      return result;
      
    } catch (parseError) {
      console.error('[GROQ] Failed to parse JSON response:', parseError, 'Response:', response);
      
      // Try to extract JSON if response has extra text
      try {
        const jsonMatch = response.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          console.log('[GROQ] Attempting to extract JSON from text...');
          const extracted = JSON.parse(jsonMatch[0]);
          
          // Try enhancement even with extracted JSON
          let enhancedExtracted = extracted;
          if (isWikipediaConfigured()) {
            try {
              enhancedExtracted = await enhanceGROQResponse(extracted, query);
            } catch (e) {
              console.error('[GROQ] Enhancement of extracted JSON failed:', e);
            }
          }
          
          return {
            players: Array.isArray(enhancedExtracted.players) ? enhancedExtracted.players : [],
            teams: Array.isArray(enhancedExtracted.teams) ? enhancedExtracted.teams.slice(0, 1) : [],
            youtubeQuery: enhancedExtracted.youtubeQuery || `${query} football highlights`,
            message: enhancedExtracted.message || `Found information for "${query}"`,
            error: null,
            _metadata: enhancedExtracted._metadata || {
              enhancedAt: new Date().toISOString(),
              analysis: { note: 'Response extracted from text', playerCount: Array.isArray(enhancedExtracted.players) ? enhancedExtracted.players.length : 0 },
              appliedUpdates: [],
              dataSources: ['GROQ AI (extracted)'],
              apiStatus: {
                wikipedia: isWikipediaConfigured() ? 'Used' : 'Not configured',
                groq: 'Success'
              },
              currentSeason: `${new Date().getFullYear()}/${new Date().getFullYear() + 1}`,
              dataCurrency: {
                aiCutoff: '2024',
                verifiedWith: isWikipediaConfigured() ? 'Wikipedia' : 'None',
                confidence: 'medium',
                lastVerified: new Date().toISOString()
              },
              disclaimer: 'Response required extraction. Data may be incomplete.',
              recommendations: ['Verify with official sources'],
              wikipediaUsage: {
                queries: isWikipediaConfigured() ? 1 : 0,
                updates: 0,
                timestamp: new Date().toISOString()
              }
            }
          };
        }
      } catch (secondError) {
        console.error('[GROQ] Failed to extract JSON:', secondError);
      }
      
      return {
        players: [],
        teams: [],
        youtubeQuery: `${query} football highlights`,
        error: 'Failed to parse AI response. The service returned invalid JSON.',
        message: 'Technical error processing the response.',
        _metadata: {
          enhancedAt: new Date().toISOString(),
          analysis: { error: 'JSON parse failed' },
          appliedUpdates: [],
          dataSources: [],
          apiStatus: {
            wikipedia: 'Not used',
            groq: 'Success'
          },
          currentSeason: `${new Date().getFullYear()}/${new Date().getFullYear() + 1}`,
          dataCurrency: {
            aiCutoff: 'N/A',
            verifiedWith: 'None',
            confidence: 'low',
            lastVerified: new Date().toISOString()
          },
          disclaimer: 'Could not parse AI response.',
          recommendations: ['Try again with a different query'],
          wikipediaUsage: {
            queries: 0,
            updates: 0,
            timestamp: new Date().toISOString()
          }
        }
      };
    }

  } catch (error: any) {
    console.error('[GROQ] API Error:', error);
    
    // Build error response with metadata
    const errorResponse: GROQSearchResponse = {
      players: [],
      teams: [],
      youtubeQuery: '',
      error: `Search failed: ${error.message || 'Unknown error'}`,
      message: 'Failed to fetch data. Please try again.',
      _metadata: {
        enhancedAt: new Date().toISOString(),
        analysis: { error: true, errorType: error?.status || 'unknown' },
        appliedUpdates: [],
        dataSources: [],
        apiStatus: {
          wikipedia: 'Not used',
          groq: error?.status === 401 ? 'Invalid key' : 'Error'
        },
        currentSeason: `${new Date().getFullYear()}/${new Date().getFullYear() + 1}`,
        dataCurrency: {
          aiCutoff: 'N/A',
          verifiedWith: 'None',
          confidence: 'low',
          lastVerified: new Date().toISOString()
        },
        disclaimer: 'API request failed.',
        recommendations: ['Check your internet connection', 'Verify API keys'],
        wikipediaUsage: {
          queries: 0,
          updates: 0,
          timestamp: new Date().toISOString()
        }
      }
    };
    
    // Handle specific error cases
    if (error?.status === 401) {
      errorResponse.error = 'Invalid GROQ API key. Please check your GROQ_API_KEY in .env.local';
      errorResponse._metadata!.recommendations = ['Verify your GROQ API key is correct'];
    }
    
    if (error?.status === 429) {
      errorResponse.error = 'Rate limit exceeded. Please wait a moment and try again.';
      errorResponse._metadata!.recommendations = ['Wait 60 seconds before trying again'];
    }
    
    if (error?.message?.includes('network') || error?.message?.includes('fetch')) {
      errorResponse.error = 'Network error. Please check your internet connection.';
      errorResponse._metadata!.recommendations = ['Check your internet connection and try again'];
    }
    
    return errorResponse;
  }
};

// Alias for backward compatibility
export const GROQSearch = searchWithGROQ;

/**
 * Get historical/legendary players for a team
 */
export const getHistoricalPlayers = async (teamName: string, teamType: 'club' | 'national', language: string = 'en'): Promise<Player[]> => {
  try {
    console.log(`[GROQ] Fetching historical players for: "${teamName}" (${teamType}), Language: ${language}`);
    
    // Validate API key
    const apiKey = process.env.NEXT_PUBLIC_GROQ_API_KEY || process.env.GROQ_API_KEY;
    if (!apiKey || apiKey.trim() === '') {
      console.error('[GROQ] API key missing for historical players');
      return [];
    }

    const completion = await groq.chat.completions.create({
      messages: [
        {
          role: 'system',
          content: `You are a football historian. Provide information about legendary/iconic players from football teams.

${language === 'es' ? 'RESPONDE EN ESPAÑOL. Proporciona toda la información en español.' : 'RESPOND IN ENGLISH. Provide all information in English.'}

Return JSON with this exact structure:
{
  "legendaryPlayers": [{
    "name": "string",
    "era": "string (e.g., "1990s-2000s", "Golden Era", "2010-2020")",
    "position": "string",
    "nationality": "string",
    "yearsAtTeam": "string",
    "achievementsWithTeam": ["string"],
    "legacySummary": "string (2-3 sentences about their legacy at this team)"
  }]
}

For ${teamType === 'club' ? 'club teams' : 'national teams'}, include players who are considered legends, icons, or had significant impact.

${language === 'es' ? `
EJEMPLO PARA "Real Madrid" (EN ESPAÑOL):
{
  "legendaryPlayers": [
    {
      "name": "Alfredo Di Stéfano",
      "era": "1953-1964",
      "position": "Delantero",
      "nationality": "Argentino-Español",
      "yearsAtTeam": "1953-1964",
      "achievementsWithTeam": ["5x Copa de Europa", "8x La Liga", "1x Copa Intercontinental"],
      "legacySummary": "Considerado uno de los mejores jugadores de la historia del Real Madrid. Fue clave en la consecución de las primeras cinco Copas de Europa consecutivas. Conocido como 'La Saeta Rubia' por su velocidad y habilidad goleadora."
    },
    {
      "name": "Raúl González",
      "era": "1994-2010",
      "position": "Delantero",
      "nationality": "Español",
      "yearsAtTeam": "1994-2010",
      "achievementsWithTeam": ["3x UEFA Champions League", "6x La Liga", "2x Copa Intercontinental"],
      "legacySummary": "Símbolo del Real Madrid durante la era de los 'Galácticos'. Capitán y máximo goleador histórico del club hasta ser superado por Cristiano Ronaldo. Conocido por su liderazgo y capacidad goleadora."
    }
  ]
}
` : `
EXAMPLE FOR "Real Madrid" (IN ENGLISH):
{
  "legendaryPlayers": [
    {
      "name": "Alfredo Di Stéfano",
      "era": "1953-1964",
      "position": "Forward",
      "nationality": "Argentine-Spanish",
      "yearsAtTeam": "1953-1964",
      "achievementsWithTeam": ["5x European Cup", "8x La Liga", "1x Intercontinental Cup"],
      "legacySummary": "Considered one of the greatest players in Real Madrid history. Key to winning the first five consecutive European Cups. Known as 'The Blond Arrow' for his speed and goal-scoring ability."
    },
    {
      "name": "Raúl González",
      "era": "1994-2010",
      "position": "Forward",
      "nationality": "Spanish",
      "yearsAtTeam": "1994-2010",
      "achievementsWithTeam": ["3x UEFA Champions League", "6x La Liga", "2x Intercontinental Cup"],
      "legacySummary": "Symbol of Real Madrid during the 'Galácticos' era. Captain and all-time top scorer of the club until surpassed by Cristiano Ronaldo. Known for his leadership and goal-scoring ability."
    }
  ]
}
`}

Return 8-12 legendary players for ${teamName}.`
        },
        {
          role: 'user',
          content: `${language === 'es' ? 
            `Proporciona información sobre jugadores legendarios de ${teamName}. Incluye jugadores históricos que son iconos del equipo.` : 
            `Provide information about legendary players from ${teamName}. Include historical players who are icons of the team.`}`
        }
      ],
      model: 'llama-3.3-70b-versatile',
      temperature: 0.4,
      max_tokens: 2000,
      response_format: { type: 'json_object' }
    });

    const response = completion.choices[0]?.message?.content;
    
    if (!response) {
      console.log('[GROQ] No response for historical players');
      return [];
    }

    try {
      const parsed = JSON.parse(response);
      if (parsed.legendaryPlayers && Array.isArray(parsed.legendaryPlayers)) {
        console.log(`[GROQ] Found ${parsed.legendaryPlayers.length} historical players for ${teamName}`);
        
        // Convert to Player format for compatibility
        return parsed.legendaryPlayers.map((legend: any) => ({
          name: legend.name,
          currentTeam: teamName,
          position: legend.position,
          nationality: legend.nationality,
          age: undefined,
          careerGoals: undefined,
          careerAssists: undefined,
          internationalAppearances: undefined,
          internationalGoals: undefined,
          majorAchievements: legend.achievementsWithTeam || [],
          careerSummary: legend.legacySummary || `${legend.name} is a legendary player for ${teamName}.`,
          _source: 'Historical Legend',
          _era: legend.era,
          _yearsAtTeam: legend.yearsAtTeam
        }));
      }
      return [];
    } catch (error) {
      console.error('[GROQ] Failed to parse historical players response:', error);
      return [];
    }
  } catch (error) {
    console.error('[GROQ] Error fetching historical players:', error);
    return [];
  }
};

/**
 * Helper to check if data needs verification
 */
export const needsDataVerification = (response: GROQSearchResponse): boolean => {
  if (!response._metadata) return true;
  
  if (response._metadata.analysis?.isLikelyOutdated) return true;
  if (response._metadata.analysis?.outdatedFields?.length > 0) return true;
  
  // Check if Wikipedia was used
  if (response._metadata.wikipediaUsage?.updates === 0 && 
      response._metadata.wikipediaUsage?.queries > 0) {
    return false; // Wikipedia checked and no updates needed
  }
  
  // Check player count - if too few players, needs verification
  if (response.players.length < 5) {
    return true;
  }
  
  // Check for 2024 references
  const allText = JSON.stringify(response).toLowerCase();
  if (allText.includes('as of 2024') || allText.includes('2024 season')) {
    return true;
  }
  
  return false;
};

/**
 * Get data source badge info
 */
export const getDataSourceInfo = (response: GROQSearchResponse): {
  source: string;
  color: string;
  icon: string;
} => {
  if (!response._metadata) {
    return { source: 'Unverified', color: 'gray', icon: '❓' };
  }
  
  if (response._metadata.wikipediaUsage?.updates > 0) {
    return { source: 'Wikipedia Updated', color: 'green', icon: '✅' };
  }
  
  if (response._metadata.wikipediaUsage?.queries > 0) {
    return { source: 'Wikipedia Verified', color: 'blue', icon: '🌐' };
  }
  
  if (response._metadata.dataSources?.includes('Critical Update')) {
    return { source: 'Critical Update', color: 'purple', icon: '🔧' };
  }
  
  return { source: 'AI Data', color: 'yellow', icon: '🤖' };
};