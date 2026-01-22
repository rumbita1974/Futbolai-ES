// services/aiOddsService.ts

import { MatchResult } from './matchesService';

interface MatchPrediction {
  matchId: string;
  homeTeam: string;
  awayTeam: string;
  league: string;
  date: string;
  prediction: {
    homeWin: number;
    draw: number;
    awayWin: number;
    confidence: number;
    predictedScore?: string;
    keyFactors: string[];
  };
  odds?: {
    home: number;
    draw: number;
    away: number;
    provider: string;
  };
  valueBet?: {
    type: 'home' | 'draw' | 'away';
    value: number;
    reasoning: string;
  };
  xg?: {
    home: number;
    away: number;
  };
}

interface FantasyPick {
  player: string;
  team: string;
  position: string;
  points: number;
  price: number;
  value: number;
  reasoning: string;
  form: number;
  fixture: string;
}

interface ValueBet {
  matchId: string;
  homeTeam: string;
  awayTeam: string;
  league: string;
  betType: string;
  odds: number;
  probability: number;
  value: number;
  edge: number;
  reasoning: string;
  confidence: 'high' | 'medium' | 'low';
}

// Cache for AI results
const CACHE_DURATION = 3600000; // 1 hour

const getCachedData = <T>(key: string): T | null => {
  try {
    const cached = localStorage.getItem(key);
    if (!cached) return null;
    
    const { data, timestamp } = JSON.parse(cached);
    const now = Date.now();
    
    if (now - timestamp < CACHE_DURATION) {
      return data;
    }
  } catch (err) {
    console.error('Cache read error:', err);
  }
  return null;
};

const setCachedData = <T>(key: string, data: T) => {
  try {
    const cacheItem = {
      data,
      timestamp: Date.now()
    };
    localStorage.setItem(key, JSON.stringify(cacheItem));
  } catch (err) {
    console.error('Cache write error:', err);
  }
};

// Generate realistic odds based on team names and league
const generateOdds = (homeTeam: string, awayTeam: string, league: string) => {
  // Simple algorithm based on team name "strength" and league
  const homeStrength = homeTeam.length % 5 + 3;
  const awayStrength = awayTeam.length % 5 + 3;
  const totalStrength = homeStrength + awayStrength;
  
  const homeWinProb = (homeStrength / totalStrength) * 0.4 + 0.3;
  const drawProb = 0.25;
  const awayWinProb = (awayStrength / totalStrength) * 0.4 + 0.3;
  
  // Convert to decimal odds
  const margin = 1.05; // 5% bookmaker margin
  return {
    home: (1 / homeWinProb * margin).toFixed(2),
    draw: (1 / drawProb * margin).toFixed(2),
    away: (1 / awayWinProb * margin).toFixed(2),
    provider: 'Bet365'
  };
};

// Generate xG based on team names
const generateXG = (homeTeam: string, awayTeam: string) => {
  const homeMod = (homeTeam.length % 10) / 10;
  const awayMod = (awayTeam.length % 10) / 10;
  
  return {
    home: 1.2 + homeMod * 0.8,
    away: 1.0 + awayMod * 0.6
  };
};

// Generate key factors for analysis
const generateKeyFactors = (homeTeam: string, awayTeam: string, league: string) => {
  const factors = [
    `${homeTeam} has strong home form this season`,
    `${awayTeam} struggles away from home`,
    `Key players returning from injury for ${homeTeam}`,
    `Recent head-to-head record favors ${Math.random() > 0.5 ? homeTeam : awayTeam}`,
    `${league} matches tend to be high-scoring`,
    `Weather conditions could affect playing style`,
    `Both teams have attacking lineups`,
    `Defensive vulnerabilities identified in recent matches`
  ];
  
  // Shuffle and take 3-5 factors
  return factors
    .sort(() => Math.random() - 0.5)
    .slice(0, 3 + Math.floor(Math.random() * 3));
};

// Generate AI predictions for matches
export const getMatchPredictions = async (matches: MatchResult[]): Promise<MatchPrediction[]> => {
  const cacheKey = `ai_predictions_${matches.length}`;
  const cached = getCachedData<MatchPrediction[]>(cacheKey);
  if (cached) {
    console.log('[AI Odds] Using cached predictions');
    return cached;
  }
  
  console.log('[AI Odds] Generating predictions for', matches.length, 'matches');
  
  // Simulate AI processing delay
  await new Promise(resolve => setTimeout(resolve, 1000));
  
  const predictions: MatchPrediction[] = matches.map(match => {
    const homeStrength = match.homeTeam.name.length % 10;
    const awayStrength = match.awayTeam.name.length % 10;
    const total = homeStrength + awayStrength;
    
    const homeWin = 30 + (homeStrength / total * 40);
    const draw = 20 + (Math.random() * 20);
    const awayWin = 30 + (awayStrength / total * 40);
    
    // Normalize to 100%
    const totalProb = homeWin + draw + awayWin;
    const normalizedHome = (homeWin / totalProb * 100);
    const normalizedDraw = (draw / totalProb * 100);
    const normalizedAway = (awayWin / totalProb * 100);
    
    const confidence = 60 + Math.random() * 30;
    const predictedScore = `${Math.floor(normalizedHome / 33) + 1}-${Math.floor(normalizedAway / 33)}`;
    
    const odds = generateOdds(match.homeTeam.name, match.awayTeam.name, match.competition);
    const xg = generateXG(match.homeTeam.name, match.awayTeam.name);
    const keyFactors = generateKeyFactors(match.homeTeam.name, match.awayTeam.name, match.competition);
    
    // Sometimes add a value bet
    let valueBet;
    if (Math.random() > 0.7) {
      const types: Array<'home' | 'draw' | 'away'> = ['home', 'draw', 'away'];
      const type = types[Math.floor(Math.random() * 3)];
      valueBet = {
        type,
        value: 5 + Math.random() * 25,
        reasoning: `Market underestimates ${match[type === 'home' ? 'homeTeam' : 'awayTeam'].name}'s chances based on recent form`
      };
    }
    
    return {
      matchId: match.id,
      homeTeam: match.homeTeam.name,
      awayTeam: match.awayTeam.name,
      league: match.competition,
      date: match.date,
      prediction: {
        homeWin: parseFloat(normalizedHome.toFixed(1)),
        draw: parseFloat(normalizedDraw.toFixed(1)),
        awayWin: parseFloat(normalizedAway.toFixed(1)),
        confidence: parseFloat(confidence.toFixed(1)),
        predictedScore,
        keyFactors
      },
      odds: {
        home: parseFloat(odds.home),
        draw: parseFloat(odds.draw),
        away: parseFloat(odds.away),
        provider: odds.provider
      },
      valueBet,
      xg
    };
  });
  
  setCachedData(cacheKey, predictions);
  return predictions;
};

// Generate fantasy picks
export const getFantasyPicks = async (): Promise<FantasyPick[]> => {
  const cacheKey = 'fantasy_picks';
  const cached = getCachedData<FantasyPick[]>(cacheKey);
  if (cached) {
    console.log('[AI Odds] Using cached fantasy picks');
    return cached;
  }
  
  console.log('[AI Odds] Generating fantasy picks');
  
  // Simulate AI processing delay
  await new Promise(resolve => setTimeout(resolve, 800));
  
  const players = [
    { name: 'Erling Haaland', team: 'Manchester City', position: 'FWD', price: 14.0 },
    { name: 'Mohamed Salah', team: 'Liverpool', position: 'MID', price: 12.5 },
    { name: 'Kevin De Bruyne', team: 'Manchester City', position: 'MID', price: 10.5 },
    { name: 'Harry Kane', team: 'Bayern Munich', position: 'FWD', price: 11.0 },
    { name: 'Kylian Mbappé', team: 'Paris SG', position: 'FWD', price: 13.0 },
    { name: 'Vinicius Junior', team: 'Real Madrid', position: 'MID', price: 9.5 },
    { name: 'Jude Bellingham', team: 'Real Madrid', position: 'MID', price: 9.0 },
    { name: 'Alisson Becker', team: 'Liverpool', position: 'GK', price: 5.5 },
    { name: 'Trent Alexander-Arnold', team: 'Liverpool', position: 'DEF', price: 8.0 },
    { name: 'Virgil van Dijk', team: 'Liverpool', position: 'DEF', price: 6.5 },
    { name: 'Rodri', team: 'Manchester City', position: 'MID', price: 7.5 },
    { name: 'Bukayo Saka', team: 'Arsenal', position: 'MID', price: 8.5 }
  ];
  
  const picks: FantasyPick[] = players.map(player => {
    const points = 4 + Math.random() * 12;
    const value = points / player.price;
    const form = 2 + Math.floor(Math.random() * 4);
    
    const reasonings = [
      `In excellent form with ${form} goals/assists in last 5 matches`,
      `Favorable fixture against weaker opposition`,
      `On set-piece duty and penalty responsibilities`,
      `Consistent performer with high ceiling`,
      `Team attacking form creates multiple opportunities`,
      `Defensive vulnerabilities in opponent's back line`,
      `Historically performs well in this fixture`,
      `Recent tactical change benefits attacking output`
    ];
    
    const reasoning = reasonings[Math.floor(Math.random() * reasonings.length)];
    
    const fixtures = [
      'vs Newcastle (H)',
      'at Aston Villa (A)',
      'vs Chelsea (H)',
      'at Tottenham (A)',
      'vs Manchester United (H)',
      'at Everton (A)'
    ];
    
    return {
      player: player.name,
      team: player.team,
      position: player.position,
      points: parseFloat(points.toFixed(1)),
      price: player.price,
      value: parseFloat(value.toFixed(2)),
      reasoning,
      form,
      fixture: fixtures[Math.floor(Math.random() * fixtures.length)]
    };
  }).sort((a, b) => b.value - a.value).slice(0, 12); // Top 12 by value
  
  setCachedData(cacheKey, picks);
  return picks;
};

// Generate value bets
export const getValueBets = async (matches: MatchResult[]): Promise<ValueBet[]> => {
  const cacheKey = `value_bets_${matches.length}`;
  const cached = getCachedData<ValueBet[]>(cacheKey);
  if (cached) {
    console.log('[AI Odds] Using cached value bets');
    return cached;
  }
  
  console.log('[AI Odds] Generating value bets');
  
  // Simulate AI processing delay
  await new Promise(resolve => setTimeout(resolve, 1200));
  
  const valueBets: ValueBet[] = [];
  
  matches.slice(0, 6).forEach(match => {
    // Only generate value bets for some matches
    if (Math.random() > 0.3) return;
    
    const betTypes = [
      `${match.homeTeam.name} to win`,
      `${match.awayTeam.name} to win`,
      'Draw',
      'Over 2.5 goals',
      'Both teams to score',
      `${match.homeTeam.name} win & BTTS`
    ];
    
    const betType = betTypes[Math.floor(Math.random() * betTypes.length)];
    const odds = 1.8 + Math.random() * 3;
    const probability = 40 + Math.random() * 40;
    const value = ((probability / (100 / odds)) - 1) * 100;
    
    if (value > 5) { // Only show bets with >5% value
      const edge = value * 0.8; // Conservative estimate
      const confidence = edge > 15 ? 'high' : edge > 8 ? 'medium' : 'low';
      
      const reasonings = [
        `Market overreacting to recent poor form`,
        `Statistical models show higher probability than odds suggest`,
        `Injuries to key players not fully priced in`,
        `Historical data favors this outcome more than current odds`,
        `Team has strong underlying metrics despite recent results`,
        `Opponent's defensive vulnerabilities not accounted for`,
        `Home/away advantage underestimated by bookmakers`,
        `Recent tactical changes improve chances significantly`
      ];
      
      valueBets.push({
        matchId: match.id,
        homeTeam: match.homeTeam.name,
        awayTeam: match.awayTeam.name,
        league: match.competition,
        betType,
        odds: parseFloat(odds.toFixed(2)),
        probability: parseFloat(probability.toFixed(1)),
        value: parseFloat(value.toFixed(1)),
        edge: parseFloat(edge.toFixed(1)),
        reasoning: reasonings[Math.floor(Math.random() * reasonings.length)],
        confidence
      });
    }
  });
  
  // Sort by edge (best value first)
  valueBets.sort((a, b) => b.edge - a.edge);
  
  setCachedData(cacheKey, valueBets);
  return valueBets;
};