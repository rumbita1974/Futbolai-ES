// services/liveMatchesService.ts - NEW FILE
import { Groq } from 'groq-sdk';

interface MatchSource {
  footballDataApi?: any;
  groqAI?: any;
  wikipedia?: any;
  lastVerified: Date;
  confidence: 'high' | 'medium' | 'low';
}

export const fetchVerifiedMatches = async (
  competitionId: string,
  matchType: 'results' | 'upcoming' | 'live'
): Promise<MatchSource> => {
  const sources: MatchSource = {
    lastVerified: new Date(),
    confidence: 'low'
  };

  // 1. Try Football Data API first (highest priority)
  try {
    const footballData = await fetchFootballDataMatches(competitionId, matchType);
    if (footballData) {
      sources.footballDataApi = footballData;
      sources.confidence = 'high';
    }
  } catch (error) {
    console.log('[Matches] Football Data API failed, trying GROQ...');
  }

  // 2. If API fails, use GROQ AI as fallback
  if (!sources.footballDataApi) {
    try {
      const groqMatches = await fetchGROQMatches(competitionId, matchType);
      if (groqMatches) {
        sources.groqAI = groqMatches;
        sources.confidence = 'medium';
      }
    } catch (error) {
      console.log('[Matches] GROQ failed, using Wikipedia...');
    }
  }

  // 3. Final fallback: Wikipedia for basic info
  if (!sources.footballDataApi && !sources.groqAI) {
    const wikiData = await fetchWikipediaMatches(competitionId);
    if (wikiData) {
      sources.wikipedia = wikiData;
    }
  }

  return sources;
};