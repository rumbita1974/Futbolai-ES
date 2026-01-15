/**
 * GROQ API Optimizer - Dramatically reduces token usage by using free data sources
 * 
 * Strategy: Use Football Data API + Wikipedia for verified data, call Groq only for:
 * - Query type detection (if not obvious)
 * - Historical context and interesting facts
 * - Player performance analysis
 * 
 * Eliminates Groq calls for:
 * ✗ Translations (use hardcoded maps)
 * ✗ Player photos (use Wikimedia + Wikipedia)
 * ✗ Current squad fetching (use Football Data API)
 * ✗ Manager verification (use official sources)
 * ✗ Trophy/achievement lists (use Wikipedia + hardcoded data)
 */

import { searchWithGROQ, GROQSearchResponse, Player, Team } from './groqService';
import { fetchVerifiedSquad, fetchWikipediaTeamData, translateTerm } from './optimizedDataService';
import { fetchWikimediaPlayerImage } from './optimizedDataService';

// ============================================================================
// INTELLIGENT QUERY ROUTER - Determine if Groq call is even needed
// ============================================================================

export interface QueryAnalysis {
  type: 'player' | 'team' | 'news' | 'stats' | 'comparison';
  needsGroq: boolean;
  reason: string;
  suggestedDataSources: string[];
}

/**
 * Analyze query to determine if Groq is even necessary
 * Returns true only if complex analysis is needed
 */
export const analyzeQueryNeeds = (query: string): QueryAnalysis => {
  const lowerQuery = query.toLowerCase();
  
  // Player profile queries - use Wikipedia + images
  if (
    lowerQuery.includes('stats') ||
    lowerQuery.includes('profile') ||
    lowerQuery.includes('career') ||
    // Match "FirstName LastName" format (supports accents by normalizing)
    lowerQuery
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .match(/^[a-z][a-z\s]*\s[a-z][a-z\s]*$/)
  ) {
    return {
      type: 'player',
      needsGroq: false,
      reason: 'Use Wikipedia + player image API',
      suggestedDataSources: ['Wikipedia', 'Wikimedia Commons', 'Football Data API'],
    };
  }

  // Team roster queries - use Football Data API
  if (
    lowerQuery.includes('squad') ||
    lowerQuery.includes('roster') ||
    lowerQuery.includes('lineup') ||
    lowerQuery.includes('players') ||
    lowerQuery.match(/(real madrid|barcelona|manchester|liverpool|bayern|psg|juventus|ac milan|arsenal|chelsea)/i)
  ) {
    return {
      type: 'team',
      needsGroq: false,
      reason: 'Use Football Data API for verified squad',
      suggestedDataSources: ['Football Data API', 'Wikipedia', 'Wikimedia Commons'],
    };
  }

  // News queries - use web scraping
  if (
    lowerQuery.includes('transfer') ||
    lowerQuery.includes('news') ||
    lowerQuery.includes('latest') ||
    lowerQuery.includes('injury')
  ) {
    return {
      type: 'news',
      needsGroq: false,
      reason: 'Use web scraping or specialized sports APIs',
      suggestedDataSources: ['ESPN', 'BBC Sport', 'Transfermarkt', 'Twitter/X'],
    };
  }

  // Statistical queries - use Football Data API
  if (
    lowerQuery.includes('top scorer') ||
    lowerQuery.includes('assists') ||
    lowerQuery.includes('stats') ||
    lowerQuery.includes('table') ||
    lowerQuery.includes('standings')
  ) {
    return {
      type: 'stats',
      needsGroq: false,
      reason: 'Use Football Data API or sports data providers',
      suggestedDataSources: ['Football Data API', 'ESPN', 'Rapid API'],
    };
  }

  // Complex queries that need analysis
  return {
    type: 'comparison',
    needsGroq: true,
    reason: 'Complex analysis required',
    suggestedDataSources: ['GROQ AI', 'Multiple data sources'],
  };
};

// ============================================================================
// HYBRID SEARCH - Combine free data sources with optional Groq enhancement
// ============================================================================

export interface OptimizedSearchResult extends GROQSearchResponse {
  _optimizationInfo?: {
    groqCallsAvoided: number;
    dataSourcesTokSavings: number;
    primarySource: string;
    fallbackUsed: boolean;
  };
}

/**
 * Main entry point - intelligent search that minimizes Groq usage
 */
export const optimizedSearch = async (
  query: string,
  language: string = 'en'
): Promise<OptimizedSearchResult> => {
  console.log(`\n🔍 [OPTIMIZED SEARCH] Query: "${query}" | Language: ${language}`);

  // Analyze if Groq is needed
  const analysis = analyzeQueryNeeds(query);
  console.log(`[ANALYSIS] Type: ${analysis.type}, Needs Groq: ${analysis.needsGroq}`);
  console.log(`[SOURCES] Suggested: ${analysis.suggestedDataSources.join(', ')}`);

  // For team/roster queries - use Football Data API instead of Groq
  if (analysis.type === 'team' && !analysis.needsGroq) {
    return await getTeamDataOptimized(query, language);
  }

  // For player queries - use Wikipedia + images instead of Groq
  if (analysis.type === 'player' && !analysis.needsGroq) {
    return await getPlayerDataOptimized(query, language);
  }

  // For complex queries, use Groq with enhanced prompts
  const groqResult = await searchWithGROQ(query, language);

  return {
    ...groqResult,
    _optimizationInfo: {
      groqCallsAvoided: analysis.needsGroq ? 0 : 1,
      dataSourcesTokSavings: analysis.needsGroq ? 0 : 500, // Rough token estimate
      primarySource: analysis.needsGroq ? 'GROQ AI' : 'Free APIs',
      fallbackUsed: false,
    },
  };
};

// ============================================================================
// OPTIMIZED TEAM DATA FETCHING
// ============================================================================

async function getTeamDataOptimized(query: string, language: string = 'en'): Promise<OptimizedSearchResult> {
  console.log(`[TEAM] Fetching optimized team data for: ${query}`);

  try {
    // Normalize query: remove common keywords like "squad", "team", etc.
    let normalizedQuery = query
      .replace(/\s+(squad|team|players|roster|lineup|fc|cf)?$/i, '')
      .trim();
    
    console.log(`[TEAM] Normalized query: "${normalizedQuery}"`);

    // 1. Fetch verified squad from Football Data API (NO Groq needed)
    const footballData = await fetchVerifiedSquad(normalizedQuery);

    if (!footballData) {
      console.warn(`[TEAM] Football Data API returned no data, falling back to Groq`);
      return await searchWithGROQ(query, language);
    }

    // 2. Fetch rich Wikipedia data (historical context, legends, etc.)
    const wikiData = await fetchWikipediaTeamData(normalizedQuery);

    // 3. Convert Football Data format to our format
    const team: Team = {
      name: footballData.name || query,
      type: 'club',
      country: footballData.address?.split(',').pop()?.trim() || '',
      stadium: footballData.venue,
      currentCoach: footballData.coach?.name || 'Unknown',
      foundedYear: footballData.founded,
      majorAchievements: {
        clubWorldCup: wikiData?.trophies.international || [],
        continental: wikiData?.trophies.european || [],
        domestic: wikiData?.trophies.leagues || [],
      },
      _source: 'Football Data API + Wikipedia',
      _lastVerified: new Date().toISOString(),
    };

    // 4. Build player list with images
    const players: Player[] = [];

    if (footballData.squad && Array.isArray(footballData.squad)) {
      console.log(`[TEAM] Processing ${footballData.squad.length} players from Football Data API`);

      for (let i = 0; i < footballData.squad.length; i++) {
        const squad = footballData.squad[i];

        // Fetch image from Wikimedia (not Groq!)
        let imageUrl: string | undefined;
        try {
          const result = await fetchWikimediaPlayerImage(squad.name);
          imageUrl = result || undefined;
        } catch (err) {
          console.log(`[IMAGE] Failed to fetch for ${squad.name}`);
        }

        players.push({
          name: squad.name,
          currentTeam: footballData.name || query,
          position: squad.position || 'Player',
          nationality: squad.nationality,
          age: squad.dateOfBirth
            ? Math.floor((new Date().getFullYear() - new Date(squad.dateOfBirth).getFullYear()))
            : undefined,
          careerGoals: 0, // Football Data doesn't provide this
          careerAssists: 0,
          internationalAppearances: 0,
          internationalGoals: 0,
          majorAchievements: [],
          careerSummary: `${squad.name} plays for ${footballData.name}`,
          imageUrl,
          _source: 'Football Data API',
          _lastVerified: new Date().toISOString(),
        });

        // Rate limiting: delay every 5 players
        if (i > 0 && i % 5 === 0) {
          await new Promise(resolve => setTimeout(resolve, 100));
        }
      }
    }

    const result: OptimizedSearchResult = {
      players: players.slice(0, 25), // Limit to 25 players
      teams: [team],
      youtubeQuery: `${query} highlights 2024/2025`,
      _metadata: {
        enhancedAt: new Date().toISOString(),
        analysis: {
          playerCount: players.length,
          source: 'Football Data API',
          photoSource: 'Wikimedia Commons',
        },
        appliedUpdates: ['Football Data API integration', 'Wikimedia image fetching'],
        dataSources: ['Football Data API', 'Wikipedia', 'Wikimedia Commons'],
        currentSeason: '2025/2026',
        dataCurrency: {
          aiCutoff: 'N/A',
          verifiedWith: 'Football Data Official API',
          confidence: 'very high',
          lastVerified: new Date().toISOString(),
        },
        disclaimer: 'Squad data verified from official Football Data API',
        recommendations: [],
      },
      _optimizationInfo: {
        groqCallsAvoided: 1,
        dataSourcesTokSavings: 2000, // ~2000 tokens saved per team query
        primarySource: 'Football Data API',
        fallbackUsed: false,
      },
    };

    console.log(`✅ [TEAM] Optimized: ${players.length} players, 0 Groq calls`);
    return result;
  } catch (error) {
    console.error(`[TEAM] Optimization failed:`, error);
    // Fallback to Groq
    return await searchWithGROQ(query, language);
  }
}

// ============================================================================
// OPTIMIZED PLAYER DATA FETCHING
// ============================================================================

async function getPlayerDataOptimized(query: string, language: string = 'en'): Promise<OptimizedSearchResult> {
  console.log(`\n[PLAYER_DEBUG] ========== PLAYER SEARCH ==========`);
  console.log(`[PLAYER_DEBUG] Query: "${query}" | Lang: ${language}`);

  try {
    // Try to find player in major teams' current squads using Football Data API
    const majorTeams = [
      'real madrid', 'barcelona', 'manchester city', 'liverpool', 'arsenal',
      'chelsea', 'manchester united', 'tottenham', 'ac milan', 'inter',
      'juventus', 'napoli', 'bayern', 'dortmund', 'psg'
    ];

    console.log(`[PLAYER_DEBUG] Searching ${majorTeams.length} teams...\n`);

    // Search for player in each major team's squad
    for (const team of majorTeams) {
      console.log(`[PLAYER_DEBUG] [${team}] Fetching squad...`);
      
      let squadData;
      try {
        squadData = await fetchVerifiedSquad(team);
      } catch (err) {
        console.log(`[PLAYER_DEBUG] [${team}] ERROR: ${(err as any).message}`);
        continue;
      }
      
      if (!squadData) {
        console.log(`[PLAYER_DEBUG] [${team}] Null response`);
        continue;
      }
      
      if (!squadData.squad) {
        console.log(`[PLAYER_DEBUG] [${team}] No squad array`);
        continue;
      }

      console.log(`[PLAYER_DEBUG] [${team}] ✓ Got ${squadData.squad.length} players`);

      // Look for player in this team's squad
      const foundPlayer = squadData.squad.find(p => {
        if (!p.name) return false;
        
        // Normalize strings: remove accents and convert to lowercase
        const normalize = (str: string) => 
          str.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
        
        const qNorm = normalize(query.trim());
        const pNorm = normalize(p.name);
        
        return pNorm.includes(qNorm) || qNorm.includes(pNorm);
      });

      if (foundPlayer) {
        console.log(`[PLAYER_DEBUG] [${team}] ✅ MATCH! ${query} = ${foundPlayer.name}`);
        
        // Fetch image from Wikimedia
        let imageUrl: string | null | undefined;
        try {
          imageUrl = await fetchWikimediaPlayerImage(foundPlayer.name);
        } catch (err) {
          console.log(`[IMAGE] Failed to fetch image for ${foundPlayer.name}`);
        }

        // Get Wikipedia data for rich context
        const wikiData = await fetchWikipediaTeamData(squadData.name);

        return {
          players: [{
            name: foundPlayer.name,
            currentTeam: squadData.name,
            position: foundPlayer.position || 'Player',
            nationality: foundPlayer.nationality,
            age: foundPlayer.dateOfBirth
              ? Math.floor((new Date().getFullYear() - new Date(foundPlayer.dateOfBirth).getFullYear()))
              : undefined,
            careerGoals: 0,
            careerAssists: 0,
            internationalAppearances: 0,
            internationalGoals: 0,
            majorAchievements: [],
            careerSummary: `${foundPlayer.name} currently plays for ${squadData.name}`,
            imageUrl: imageUrl || undefined,
            _source: 'Football Data API',
            _lastVerified: new Date().toISOString(),
          }],
          teams: [{
            name: squadData.name,
            type: 'club',
            country: squadData.address?.split(',').pop()?.trim() || '',
            stadium: squadData.venue,
            currentCoach: squadData.coach?.name || 'Unknown',
            foundedYear: squadData.founded,
            majorAchievements: {
              clubWorldCup: wikiData?.trophies.international || [],
              continental: wikiData?.trophies.european || [],
              domestic: wikiData?.trophies.leagues || [],
            },
            _source: 'Football Data API + Wikipedia',
            _lastVerified: new Date().toISOString(),
          }],
          youtubeQuery: `${query} highlights 2024/2025`,
          _optimizationInfo: {
            groqCallsAvoided: 1,
            dataSourcesTokSavings: 1500, // ~1500 tokens saved for player lookup
            primarySource: 'Football Data API',
            fallbackUsed: false,
          },
        };
      }
    }

    // If player not found in major teams, fall back to Groq for historical players or lesser-known players
    console.log(`\n[PLAYER_DEBUG] ❌ NOT FOUND in any major team`);
    console.log(`[PLAYER_DEBUG] Falling back to Groq...\n`);
    return await searchWithGROQ(query, language);
  } catch (error) {
    console.error(`\n[PLAYER_DEBUG] ❌ EXCEPTION:`, error);
    console.error(`[PLAYER_DEBUG] Falling back to Groq\n`);
    // Fallback to Groq on error
    return await searchWithGROQ(query, language);
  }
}

// ============================================================================
// TRANSLATION HELPER (No more Groq translation calls!)
// ============================================================================

export const optimizedTranslate = (text: string, language: string): string => {
  if (language === 'en') return text;

  // Use hardcoded translations instead of Groq
  return translateTerm(text, language, 'teams') || text;
};

// ============================================================================
// TOKEN SAVINGS CALCULATOR
// ============================================================================

export interface TokenSavingsReport {
  totalQueriesOptimized: number;
  groqCallsAvoided: number;
  estimatedTokensSaved: number;
  costSavingsUSD: number;
  breakdownByType: {
    teamQueries: number;
    playerQueries: number;
    translationQueries: number;
    imageQueries: number;
  };
}

const tokenSavingsStats = {
  totalQueries: 0,
  groqCallsAvoided: 0,
  teamQueries: 0,
  playerQueries: 0,
  translationQueries: 0,
  imageQueries: 0,
};

export const recordTokenSavings = (type: 'team' | 'player' | 'translation' | 'image') => {
  tokenSavingsStats.totalQueries++;
  tokenSavingsStats.groqCallsAvoided++;
  tokenSavingsStats[`${type}Queries`]++;
};

export const getTokenSavingsReport = (): TokenSavingsReport => {
  // Groq pricing: ~$0.05 per 1M input tokens
  // Average Groq call: ~500-1000 tokens
  // Average savings per optimized query: ~800 tokens
  const avgTokensSaved = 800;
  const totalTokensSaved = tokenSavingsStats.groqCallsAvoided * avgTokensSaved;
  const costPerMillion = 0.05; // $0.05 per 1M tokens
  const costSaved = (totalTokensSaved / 1000000) * costPerMillion;

  return {
    totalQueriesOptimized: tokenSavingsStats.totalQueries,
    groqCallsAvoided: tokenSavingsStats.groqCallsAvoided,
    estimatedTokensSaved: totalTokensSaved,
    costSavingsUSD: costSaved,
    breakdownByType: {
      teamQueries: tokenSavingsStats.teamQueries,
      playerQueries: tokenSavingsStats.playerQueries,
      translationQueries: tokenSavingsStats.translationQueries,
      imageQueries: tokenSavingsStats.imageQueries,
    },
  };
};

export default {
  optimizedSearch,
  optimizedTranslate,
  analyzeQueryNeeds,
  getTokenSavingsReport,
};
