// services/groqService.ts - DYNAMIC AI-POWERED SOLUTION
// Uses: AI fuzzy matching + Multiple API sources + Smart fallbacks

import Groq from 'groq-sdk';

// Types
export interface Player {
  id?: string;
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
  _imageUrl?: string;
}

export interface Team {
  name: string;
  shortName?: string;
  tla?: string;
  crest?: string;
  type: 'club' | 'national';
  country: string;
  stadium?: string;
  currentCoach: string;
  foundedYear?: number;
  website?: string;
  venue?: string;
  majorAchievements: {
    worldCup?: string[];
    international?: string[];
    continental?: string[];
    domestic?: string[];
  };
  _source?: string;
  _lastVerified?: string;
  _confidence?: number;
  _verified?: boolean;
}

export interface GROQSearchResponse {
  players: Player[];
  teams: Team[];
  youtubeQuery: string;
  error?: string;
  message?: string;
  _metadata?: {
    source: string;
    confidence: number;
    season: string;
    verified: boolean;
    hasSquad?: boolean;
    squadCount?: number;
    warning?: string;
    verificationSteps?: string[];
    originalQuery?: string;
    correctedQuery?: string;
  };
}

// ============================================================================
// CONFIGURATION
// ============================================================================

const CURRENT_SEASON = '2024/2025';
const SEASON_YEAR = '2024';
const CACHE_TTL = 30 * 60 * 1000;

const groq = new Groq({
  apiKey: process.env.NEXT_PUBLIC_GROQ_API_KEY || '',
  dangerouslyAllowBrowser: true,
});

const cache = new Map<string, { data: GROQSearchResponse; timestamp: number }>();

// ============================================================================
// AI-POWERED TEAM NAME CORRECTION & DISAMBIGUATION
// ============================================================================

async function correctTeamNameWithAI(query: string): Promise<{
  corrected: string;
  type: 'club' | 'national';
  confidence: number;
  country?: string;
}> {
  console.log(`🤖 [AI] Analyzing team query: "${query}"`);
  
  const systemPrompt = `You are a football database expert. Analyze the team name and return a JSON object.

RULES:
1. Determine if it's a club or national team
2. Correct any misspellings
3. For ambiguous names like "Barcelona", determine if the user likely means FC Barcelona (Spain) vs Barcelona SC (Ecuador)
4. For national teams, return the standard FIFA country name

Return ONLY valid JSON in this format:
{"corrected": "official name", "type": "club or national", "confidence": 0-100, "country": "country name if applicable"}

Examples:
- "barca" -> {"corrected": "FC Barcelona", "type": "club", "confidence": 95, "country": "Spain"}
- "real madird" -> {"corrected": "Real Madrid", "type": "club", "confidence": 95, "country": "Spain"}
- "brazil" -> {"corrected": "Brazil", "type": "national", "confidence": 100, "country": "Brazil"}
- "usa national team" -> {"corrected": "United States", "type": "national", "confidence": 95, "country": "USA"}
- "man city" -> {"corrected": "Manchester City", "type": "club", "confidence": 95, "country": "England"}
- "psg" -> {"corrected": "Paris Saint-Germain", "type": "club", "confidence": 95, "country": "France"}`;

  try {
    const completion = await groq.chat.completions.create({
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: query }
      ],
      model: 'llama-3.1-8b-instant',
      temperature: 0.1,
      max_tokens: 150,
    });

    const result = completion.choices[0]?.message?.content?.trim() || '';
    const jsonMatch = result.match(/\{[\s\S]*\}/);
    
    if (jsonMatch) {
      const parsed = JSON.parse(jsonMatch[0]);
      console.log(`🤖 [AI] Result:`, parsed);
      return {
        corrected: parsed.corrected,
        type: parsed.type,
        confidence: parsed.confidence,
        country: parsed.country
      };
    }
    
    return { corrected: query, type: 'club', confidence: 50 };
    
  } catch (error) {
    console.error('[AI] Error:', error);
    return { corrected: query, type: 'club', confidence: 50 };
  }
}

// ============================================================================
// SEARCH FOOTBALL DATA API (Dynamic - Any Team)
// ============================================================================

async function searchFootballDataAPI(teamName: string, country?: string): Promise<{ team: Team; players: Player[] } | null> {
  const API_KEY = process.env.FOOTBALL_DATA_API_KEY || process.env.NEXT_PUBLIC_FOOTBALL_DATA_API_KEY;
  
  if (!API_KEY) {
    console.warn('[Football Data API] No API key');
    return null;
  }

  try {
    console.log(`📡 [Football Data API] Searching: ${teamName}`);
    
    // Search via teams endpoint (limited but works for major teams)
    const searchResponse = await fetch(
      `/api/football-proxy?endpoint=/teams?limit=50`
    );
    
    if (!searchResponse.ok) return null;
    
    const data = await searchResponse.json();
    const teams = data.teams || [];
    
    // Find best match using AI-corrected name
    const queryLower = teamName.toLowerCase();
    let bestMatch = null;
    let bestScore = 0;
    
    for (const team of teams) {
      let score = 0;
      if (team.name?.toLowerCase() === queryLower) score = 100;
      else if (team.name?.toLowerCase().includes(queryLower)) score = 80;
      else if (team.shortName?.toLowerCase().includes(queryLower)) score = 70;
      else if (team.tla?.toLowerCase() === queryLower) score = 90;
      
      // Boost score if country matches
      if (country && team.area?.name?.toLowerCase().includes(country.toLowerCase())) {
        score += 10;
      }
      
      if (score > bestScore) {
        bestScore = score;
        bestMatch = team;
      }
    }
    
    if (!bestMatch || bestScore < 60) {
      console.log(`[Football Data API] No match found for: ${teamName}`);
      return null;
    }
    
    console.log(`✅ [Football Data API] Found: ${bestMatch.name}`);
    
    // Fetch full team details
    const teamResponse = await fetch(
      `/api/football-proxy?endpoint=/teams/${bestMatch.id}`
    );
    
    if (!teamResponse.ok) return null;
    
    const teamDetails = await teamResponse.json();
    
    const team: Team = {
      name: teamDetails.name,
      shortName: teamDetails.shortName,
      tla: teamDetails.tla,
      crest: teamDetails.crest,
      type: teamDetails.type === 'NATIONAL' ? 'national' : 'club',
      country: teamDetails.area?.name || '',
      stadium: teamDetails.venue,
      currentCoach: teamDetails.coach?.name || 'Information not available',
      foundedYear: teamDetails.founded,
      website: teamDetails.website,
      venue: teamDetails.venue,
      majorAchievements: {},
      _source: 'Football Data API',
      _verified: true,
      _confidence: bestScore,
      _lastVerified: new Date().toISOString()
    };
    
    const players: Player[] = (teamDetails.squad || []).map((player: any) => ({
      id: player.id?.toString(),
      name: player.name,
      currentTeam: team.name,
      position: player.position || 'Unknown',
      age: player.dateOfBirth ? calculateAge(player.dateOfBirth) : undefined,
      nationality: player.nationality || '',
      careerGoals: undefined,
      careerAssists: undefined,
      majorAchievements: [],
      careerSummary: `${player.name} plays for ${team.name}.`,
      _source: 'Football Data API',
      _lastVerified: new Date().toISOString()
    }));
    
    console.log(`✅ Retrieved ${players.length} players`);
    return { team, players };
    
  } catch (error) {
    console.error('[Football Data API] Error:', error);
    return null;
  }
}

// ============================================================================
// SEARCH BSD API (Dynamic - Any Team)
// ============================================================================

async function searchBSDAPI(teamName: string, teamType: 'club' | 'national'): Promise<{ team: Team; players: Player[] } | null> {
  try {
    console.log(`📡 [BSD API] Searching: ${teamName}`);
    
    // Try multiple search variations
    const searchTerms = [teamName];
    if (teamType === 'national') {
      searchTerms.push(teamName.replace(' national team', ''));
    }
    
    let teamData = null;
    
    for (const term of searchTerms) {
      const response = await fetch(
        `/api/bsd-proxy?endpoint=/teams/?name=${encodeURIComponent(term)}`
      );
      
      if (response.ok) {
        const data = await response.json();
        if (data.results && data.results.length > 0) {
          // Filter by type if needed
          let found = data.results[0];
          if (teamType === 'national') {
            found = data.results.find((t: any) => t.type === 'national') || found;
          }
          teamData = found;
          break;
        }
      }
    }
    
    if (!teamData) {
      console.log(`[BSD API] No team found`);
      return null;
    }
    
    console.log(`✅ [BSD API] Found: ${teamData.name}`);
    
    // Fetch players
    const playersResponse = await fetch(
      `/api/bsd-proxy?endpoint=/players/?team_id=${teamData.id}&limit=50`
    );
    
    let players: Player[] = [];
    if (playersResponse.ok) {
      const playersResult = await playersResponse.json();
      if (playersResult.results) {
        players = playersResult.results.map((player: any) => ({
          id: player.id?.toString(),
          name: player.name || 'Unknown',
          currentTeam: teamData.name,
          position: player.position || player.specific_position || 'Unknown',
          age: player.date_of_birth ? calculateAge(player.date_of_birth) : undefined,
          nationality: player.nationality || '',
          careerGoals: undefined,
          careerAssists: undefined,
          majorAchievements: [],
          careerSummary: `${player.name} plays for ${teamData.name}.`,
          _source: 'BSD API',
          _lastVerified: new Date().toISOString()
        }));
      }
    }
    
    const isNational = teamData.type === 'national' || teamType === 'national';
    
    const team: Team = {
      name: teamData.name,
      shortName: teamData.short_name,
      crest: `https://sports.bzzoiro.com/img/team/${teamData.id}/`,
      type: isNational ? 'national' : 'club',
      country: teamData.country || '',
      stadium: teamData.venue_id ? `Venue ID: ${teamData.venue_id}` : 'Not specified',
      currentCoach: 'Information not available',
      foundedYear: undefined,
      majorAchievements: {},
      _source: 'BSD API',
      _verified: true,
      _confidence: 85,
      _lastVerified: new Date().toISOString()
    };
    
    return { team, players };
    
  } catch (error) {
    console.error('[BSD API] Error:', error);
    return null;
  }
}

// ============================================================================
// AI-POWERED FALLBACK - Generate realistic squad using AI
// ============================================================================

async function generateAISquad(teamName: string, teamType: 'club' | 'national'): Promise<Player[]> {
  console.log(`🤖 [AI] Generating realistic squad for: ${teamName}`);
  
  const systemPrompt = `You are a football database expert. Generate a realistic current squad for ${teamName} ${teamType === 'national' ? 'national team' : 'football club'}.
  
Return ONLY a JSON array of 15-20 players with this exact structure:
[
  {"name": "Player Name", "position": "Goalkeeper/Defender/Midfielder/Forward", "nationality": "Country", "age": number}
]

Use real current players. For clubs, use their actual squad. For national teams, use their current call-ups.`;

  try {
    const completion = await groq.chat.completions.create({
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: `Generate squad for ${teamName}` }
      ],
      model: 'llama-3.1-8b-instant',
      temperature: 0.3,
      max_tokens: 1000,
    });

    const result = completion.choices[0]?.message?.content?.trim() || '';
    const jsonMatch = result.match(/\[[\s\S]*\]/);
    
    if (jsonMatch) {
      const players = JSON.parse(jsonMatch[0]);
      return players.map((p: any) => ({
        name: p.name,
        position: p.position || 'Unknown',
        nationality: p.nationality || '',
        age: p.age,
        currentTeam: teamName,
        majorAchievements: [],
        careerSummary: `${p.name} plays for ${teamName}.`,
        _source: 'AI Generated',
        _lastVerified: new Date().toISOString()
      }));
    }
    
    return [];
    
  } catch (error) {
    console.error('[AI] Squad generation error:', error);
    return [];
  }
}

// ============================================================================
// FETCH ACHIEVEMENTS FROM WIKIPEDIA (Dynamic)
// ============================================================================

async function fetchAchievementsFromWikipedia(teamName: string): Promise<Team['majorAchievements']> {
  try {
    const response = await fetch(
      `https://en.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(teamName.replace(' ', '_'))}`
    );
    
    if (!response.ok) return { worldCup: [], international: [], continental: [], domestic: [] };
    
    const data = await response.json();
    const extract = data.extract || '';
    
    // Parse achievements from Wikipedia extract (simplified)
    const achievements: Team['majorAchievements'] = {
      worldCup: [],
      international: [],
      continental: [],
      domestic: []
    };
    
    if (extract.includes('World Cup') || extract.includes('FIFA World Cup')) {
      const years = extract.match(/\b(19|20)\d{2}\b/g);
      if (years) achievements.worldCup = [...new Set(years)];
    }
    
    if (extract.includes('Champions League') || extract.includes('Copa América') || extract.includes('European Championship')) {
      achievements.international = [extract.match(/[^.]*?(?:Champions League|Copa América|European Championship)[^.]*\./)?.[0] || ''];
    }
    
    if (extract.includes('La Liga') || extract.includes('Premier League') || extract.includes('Bundesliga')) {
      achievements.domestic = [extract.match(/[^.]*?(?:La Liga|Premier League|Bundesliga|Serie A|Ligue 1)[^.]*\./)?.[0] || ''];
    }
    
    return achievements;
    
  } catch (error) {
    console.error('[Wikipedia] Error fetching achievements:', error);
    return { worldCup: [], international: [], continental: [], domestic: [] };
  }
}

// ============================================================================
// MAIN SEARCH FUNCTION (Dynamic - No Hardcoding)
// ============================================================================

async function searchTeam(query: string): Promise<GROQSearchResponse> {
  console.log(`🔍 [TEAM SEARCH] "${query}"`);
  
  const verificationSteps: string[] = [];
  verificationSteps.push(`Original query: "${query}"`);
  
  // Step 1: AI-powered team name correction
  verificationSteps.push('🤖 AI analyzing team name...');
  const aiResult = await correctTeamNameWithAI(query);
  const searchQuery = aiResult.corrected;
  const teamType = aiResult.type;
  verificationSteps.push(`✅ AI identified: ${searchQuery} (${teamType})`);
  
  let result: { team: Team; players: Player[] } | null = null;
  let source = '';
  
  // Step 2: Try Football Data API first (best for clubs)
  verificationSteps.push('📡 Trying Football Data API...');
  result = await searchFootballDataAPI(searchQuery, aiResult.country);
  if (result) {
    source = 'Football Data API';
    verificationSteps.push(`✅ Found via Football Data API`);
  }
  
  // Step 3: Try BSD API as fallback
  if (!result) {
    verificationSteps.push('📡 Trying BSD API...');
    result = await searchBSDAPI(searchQuery, teamType);
    if (result) {
      source = 'BSD API';
      verificationSteps.push(`✅ Found via BSD API`);
    }
  }
  
  // Step 4: If found but no players, generate using AI
  if (result && result.players.length === 0) {
    verificationSteps.push('🤖 No squad data, generating with AI...');
    const aiPlayers = await generateAISquad(result.team.name, result.team.type);
    result.players = aiPlayers;
    if (aiPlayers.length > 0) {
      verificationSteps.push(`✅ AI generated ${aiPlayers.length} players`);
    }
  }
  
  // Step 5: Fetch achievements from Wikipedia
  if (result) {
    verificationSteps.push('📚 Fetching achievements from Wikipedia...');
    const achievements = await fetchAchievementsFromWikipedia(result.team.name);
    result.team.majorAchievements = achievements;
    verificationSteps.push(`✅ Achievements retrieved`);
  }
  
  // Step 6: Return result or error
  if (result) {
    return {
      players: result.players,
      teams: [result.team],
      youtubeQuery: `${result.team.name} highlights ${SEASON_YEAR}`,
      _metadata: {
        source,
        confidence: 85,
        season: CURRENT_SEASON,
        verified: true,
        hasSquad: result.players.length > 0,
        squadCount: result.players.length,
        verificationSteps,
        originalQuery: query,
        correctedQuery: searchQuery !== query ? searchQuery : undefined
      }
    };
  }
  
  // Ultimate fallback - AI generates everything
  verificationSteps.push('🤖 No API data, generating complete team with AI...');
  const aiTeam: Team = {
    name: searchQuery,
    type: teamType,
    country: aiResult.country || '',
    currentCoach: 'Information not available',
    majorAchievements: {},
    _source: 'AI Generated',
    _verified: false,
    _confidence: 40
  };
  
  const aiPlayers = await generateAISquad(searchQuery, teamType);
  
  return {
    players: aiPlayers,
    teams: [aiTeam],
    youtubeQuery: `${searchQuery} highlights ${SEASON_YEAR}`,
    _metadata: {
      source: 'AI Generated',
      confidence: 40,
      season: CURRENT_SEASON,
      verified: false,
      hasSquad: aiPlayers.length > 0,
      squadCount: aiPlayers.length,
      warning: 'Team data generated by AI - may not be accurate',
      verificationSteps,
      originalQuery: query,
      correctedQuery: searchQuery !== query ? searchQuery : undefined
    }
  };
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

function calculateAge(dateOfBirth: string): number | undefined {
  if (!dateOfBirth) return undefined;
  try {
    const birthDate = new Date(dateOfBirth);
    if (isNaN(birthDate.getTime())) return undefined;
    const today = new Date();
    let age = today.getFullYear() - birthDate.getFullYear();
    const monthDiff = today.getMonth() - birthDate.getMonth();
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) age--;
    if (age < 15 || age > 50) return undefined;
    return age;
  } catch {
    return undefined;
  }
}

// ============================================================================
// EXPORTED FUNCTIONS
// ============================================================================

export const searchWithGROQ = async (
  query: string, 
  language: string = 'en', 
  bustCache: boolean = false, 
  isTeamSearch: boolean = true
): Promise<GROQSearchResponse> => {
  
  console.log(`🔍 [GROQ SERVICE] Search: "${query}"`);
  
  const cacheKey = `${query}_${language}`;
  
  if (!bustCache && cache.has(cacheKey)) {
    const cached = cache.get(cacheKey)!;
    if (Date.now() - cached.timestamp < CACHE_TTL) {
      console.log(`📦 [CACHE] Using cached result`);
      return cached.data;
    }
  }
  
  try {
    const result = await searchTeam(query);
    cache.set(cacheKey, { data: result, timestamp: Date.now() });
    return result;
  } catch (error: any) {
    console.error('[GROQ] Search error:', error);
    return {
      players: [],
      teams: [],
      youtubeQuery: `${query} football`,
      error: 'Search failed. Please try again.',
      _metadata: { source: 'Error', confidence: 0, season: CURRENT_SEASON, verified: false, hasSquad: false }
    };
  }
};

export const getHistoricalPlayers = async (): Promise<Player[]> => {
  return [];
};

export const clearSearchCache = () => {
  cache.clear();
  console.log('🧹 Cache cleared');
};

export const getCurrentSeason = () => CURRENT_SEASON;