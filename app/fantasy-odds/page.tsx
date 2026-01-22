// app/fantasy-odds/page.tsx

'use client';

import { useState, useEffect, useCallback } from 'react';
import type { MatchResult } from '@/services/matchesService';
import { 
  getUpcomingMatchesGrouped,
  clearMatchCache
} from '@/services/matchesService';
import { getMatchPredictions, getFantasyPicks, getValueBets } from '@/services/aiOddsService';

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

export default function FantasyOddsPage() {
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'predictions' | 'fantasy' | 'value'>('predictions');
  const [predictions, setPredictions] = useState<MatchPrediction[]>([]);
  const [fantasyPicks, setFantasyPicks] = useState<FantasyPick[]>([]);
  const [valueBets, setValueBets] = useState<ValueBet[]>([]);
  const [featuredMatch, setFeaturedMatch] = useState<MatchPrediction | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<string>('');

  const loadData = useCallback(async () => {
    setLoading(true);
    setError(null);
    
    console.log('[FantasyOdds] Loading data...');
    
    try {
      // Get upcoming matches
      const upcomingMatchesGrouped = await getUpcomingMatchesGrouped();
      
      // Flatten all upcoming matches
      const allMatches: MatchResult[] = [];
      Object.values(upcomingMatchesGrouped).forEach(league => {
        allMatches.push(...league.matches);
      });
      
      if (allMatches.length === 0) {
        setError('No upcoming matches found for analysis');
        setLoading(false);
        return;
      }
      
      // Get predictions for next 10 matches
      const matchesToAnalyze = allMatches.slice(0, 10);
      
      // Load all AI insights in parallel
      const [predictionsData, fantasyData, valueData] = await Promise.all([
        getMatchPredictions(matchesToAnalyze),
        getFantasyPicks(),
        getValueBets(matchesToAnalyze)
      ]);
      
      setPredictions(predictionsData);
      setFantasyPicks(fantasyData);
      setValueBets(valueData);
      
      // Set featured match (highest confidence prediction)
      if (predictionsData.length > 0) {
        const bestPrediction = predictionsData.reduce((best, current) => 
          current.prediction.confidence > best.prediction.confidence ? current : best
        );
        setFeaturedMatch(bestPrediction);
      }
      
      setLastUpdated(new Date().toLocaleTimeString());
      
    } catch (err: any) {
      console.error('[FantasyOdds] Failed to load data:', err);
      setError(err.message || 'Failed to load fantasy and odds data');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const formatDate = (dateString: string) => {
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString('en-US', {
        weekday: 'short',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch {
      return dateString;
    }
  };

  const getConfidenceColor = (confidence: number) => {
    if (confidence >= 80) return 'text-green-400';
    if (confidence >= 60) return 'text-yellow-400';
    return 'text-orange-400';
  };

  const getConfidenceBg = (confidence: number) => {
    if (confidence >= 80) return 'bg-green-900/30';
    if (confidence >= 60) return 'bg-yellow-900/30';
    return 'bg-orange-900/30';
  };

  const getValueColor = (value: number) => {
    if (value >= 20) return 'text-green-400';
    if (value >= 10) return 'text-yellow-400';
    return 'text-orange-400';
  };

  const getValueBg = (value: number) => {
    if (value >= 20) return 'bg-green-900/30';
    if (value >= 10) return 'bg-yellow-900/30';
    return 'bg-orange-900/30';
  };

  const getEdgeColor = (edge: number) => {
    if (edge >= 15) return 'text-green-400';
    if (edge >= 8) return 'text-yellow-400';
    return 'text-orange-400';
  };

  const getEdgeBg = (edge: number) => {
    if (edge >= 15) return 'bg-green-900/30';
    if (edge >= 8) return 'bg-yellow-900/30';
    return 'bg-orange-900/30';
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-gray-900 via-gray-800 to-black text-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <div className="text-center">
            <div className="animate-pulse">
              <div className="h-12 bg-gray-700 rounded mb-4 w-64 mx-auto"></div>
              <div className="space-y-4">
                {[1, 2, 3].map(i => (
                  <div key={i} className="h-24 bg-gray-800 rounded"></div>
                ))}
              </div>
            </div>
            <p className="text-gray-400 mt-8">Loading AI-powered predictions and odds...</p>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-gray-900 via-gray-800 to-black text-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <div className="mb-8 bg-gradient-to-r from-red-900/20 to-orange-900/20 border border-red-700/30 rounded-lg p-6">
            <div className="flex items-start gap-3">
              <div className="text-red-400 text-2xl">⚠️</div>
              <div>
                <h3 className="text-lg font-bold text-red-400 mb-2">Error Loading Data</h3>
                <p className="text-gray-300">{error}</p>
              </div>
            </div>
          </div>
          
          <div className="text-center">
            <button
              onClick={loadData}
              className="px-6 py-3 bg-blue-600 hover:bg-blue-700 rounded-lg font-semibold transition-colors"
            >
              Retry Loading Data
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-900 via-gray-800 to-black text-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl md:text-6xl font-bold mb-4">
            <span className="bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent">
              AI Fantasy & Odds
            </span>
          </h1>
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <p className="text-xl text-gray-300">
              AI-powered predictions, fantasy picks, and betting value analysis
            </p>
            <div className="flex items-center gap-3">
              <div className="px-3 py-1 rounded-full text-sm font-medium bg-green-900/30 text-green-400">
                🤖 AI Analysis
              </div>
              <div className="text-sm text-gray-400">
                Updated: {lastUpdated}
              </div>
            </div>
          </div>
        </div>

        {/* Featured Match Banner */}
        {featuredMatch && (
          <div className="mb-8 bg-gradient-to-r from-purple-900/20 to-pink-900/20 border border-purple-700/30 rounded-lg p-6">
            <div className="flex flex-col lg:flex-row gap-6">
              <div className="flex-1">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-2xl font-bold text-purple-400">🌟 Featured Match Analysis</h2>
                  <div className={`px-3 py-1 rounded-full text-sm font-medium ${getConfidenceBg(featuredMatch.prediction.confidence)} ${getConfidenceColor(featuredMatch.prediction.confidence)}`}>
                    {featuredMatch.prediction.confidence}% Confidence
                  </div>
                </div>
                
                <div className="bg-gray-800/40 rounded-lg p-4 mb-4">
                  <div className="flex items-center justify-between mb-4">
                    <div className="text-center flex-1">
                      <div className="font-bold text-xl text-white">{featuredMatch.homeTeam}</div>
                      <div className="text-sm text-gray-400">Home</div>
                    </div>
                    
                    <div className="mx-6 text-center">
                      <div className="text-4xl font-bold text-white">VS</div>
                      <div className="text-sm text-gray-500 mt-1">{featuredMatch.league}</div>
                      <div className="text-xs text-gray-500">{formatDate(featuredMatch.date)}</div>
                    </div>
                    
                    <div className="text-center flex-1">
                      <div className="font-bold text-xl text-white">{featuredMatch.awayTeam}</div>
                      <div className="text-sm text-gray-400">Away</div>
                    </div>
                  </div>
                  
                  {featuredMatch.prediction.predictedScore && (
                    <div className="text-center mb-4">
                      <div className="text-lg font-bold text-yellow-400">
                        Predicted Score: {featuredMatch.prediction.predictedScore}
                      </div>
                    </div>
                  )}
                  
                  <div className="grid grid-cols-3 gap-4 mb-4">
                    <div className="text-center p-3 bg-gray-800/60 rounded-lg">
                      <div className="text-2xl font-bold text-white">{featuredMatch.prediction.homeWin}%</div>
                      <div className="text-sm text-gray-400">Home Win</div>
                    </div>
                    <div className="text-center p-3 bg-gray-800/60 rounded-lg">
                      <div className="text-2xl font-bold text-white">{featuredMatch.prediction.draw}%</div>
                      <div className="text-sm text-gray-400">Draw</div>
                    </div>
                    <div className="text-center p-3 bg-gray-800/60 rounded-lg">
                      <div className="text-2xl font-bold text-white">{featuredMatch.prediction.awayWin}%</div>
                      <div className="text-sm text-gray-400">Away Win</div>
                    </div>
                  </div>
                  
                  {featuredMatch.xg && (
                    <div className="mb-4">
                      <h4 className="font-bold text-gray-300 mb-2">Expected Goals (xG):</h4>
                      <div className="flex items-center gap-4">
                        <div className="flex-1">
                          <div className="text-sm text-gray-400 mb-1">{featuredMatch.homeTeam}</div>
                          <div className="h-2 bg-gray-700 rounded-full overflow-hidden">
                            <div 
                              className="h-full bg-blue-500" 
                              style={{ width: `${Math.min(featuredMatch.xg.home * 100, 100)}%` }}
                            ></div>
                          </div>
                          <div className="text-sm text-white mt-1">{featuredMatch.xg.home.toFixed(2)}</div>
                        </div>
                        <div className="flex-1">
                          <div className="text-sm text-gray-400 mb-1">{featuredMatch.awayTeam}</div>
                          <div className="h-2 bg-gray-700 rounded-full overflow-hidden">
                            <div 
                              className="h-full bg-red-500" 
                              style={{ width: `${Math.min(featuredMatch.xg.away * 100, 100)}%` }}
                            ></div>
                          </div>
                          <div className="text-sm text-white mt-1">{featuredMatch.xg.away.toFixed(2)}</div>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
                
                {featuredMatch.valueBet && (
                  <div className={`p-4 rounded-lg ${getValueBg(featuredMatch.valueBet.value)} ${getValueColor(featuredMatch.valueBet.value)}`}>
                    <div className="flex items-center gap-3 mb-2">
                      <div className="text-2xl">💰</div>
                      <div>
                        <h4 className="font-bold">Value Bet Detected</h4>
                        <p className="text-sm opacity-90">Bet on {featuredMatch.valueBet.type.toUpperCase()} (+{featuredMatch.valueBet.value}% value)</p>
                      </div>
                    </div>
                    <p className="text-sm">{featuredMatch.valueBet.reasoning}</p>
                  </div>
                )}
              </div>
              
              <div className="lg:w-80">
                <h3 className="font-bold text-gray-300 mb-3">📊 Key Factors</h3>
                <ul className="space-y-2">
                  {featuredMatch.prediction.keyFactors.map((factor, index) => (
                    <li key={index} className="flex items-start gap-2 text-sm text-gray-300">
                      <span className="text-green-400 mt-1">•</span>
                      <span>{factor}</span>
                    </li>
                  ))}
                </ul>
                
                {featuredMatch.odds && (
                  <div className="mt-6 p-4 bg-gray-800/40 rounded-lg">
                    <h3 className="font-bold text-gray-300 mb-3">🎰 Market Odds</h3>
                    <div className="space-y-3">
                      <div className="flex justify-between items-center">
                        <span className="text-gray-400">Home Win</span>
                        <span className="font-bold text-white">{featuredMatch.odds.home.toFixed(2)}</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-gray-400">Draw</span>
                        <span className="font-bold text-white">{featuredMatch.odds.draw.toFixed(2)}</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-gray-400">Away Win</span>
                        <span className="font-bold text-white">{featuredMatch.odds.away.toFixed(2)}</span>
                      </div>
                      <div className="text-xs text-gray-500 mt-2">Provider: {featuredMatch.odds.provider}</div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Tabs */}
        <div className="flex gap-2 mb-8 border-b border-gray-700 pb-2">
          <button
            onClick={() => setActiveTab('predictions')}
            className={`px-4 py-3 font-semibold transition-all rounded-t-lg ${
              activeTab === 'predictions'
                ? 'text-purple-400 border-b-2 border-purple-400 bg-gray-800/30'
                : 'text-gray-400 hover:text-white hover:bg-gray-800/20'
            }`}
          >
            🔮 Match Predictions
          </button>
          <button
            onClick={() => setActiveTab('fantasy')}
            className={`px-4 py-3 font-semibold transition-all rounded-t-lg ${
              activeTab === 'fantasy'
                ? 'text-purple-400 border-b-2 border-purple-400 bg-gray-800/30'
                : 'text-gray-400 hover:text-white hover:bg-gray-800/20'
            }`}
          >
            🏆 Fantasy Picks
          </button>
          <button
            onClick={() => setActiveTab('value')}
            className={`px-4 py-3 font-semibold transition-all rounded-t-lg ${
              activeTab === 'value'
                ? 'text-purple-400 border-b-2 border-purple-400 bg-gray-800/30'
                : 'text-gray-400 hover:text-white hover:bg-gray-800/20'
            }`}
          >
            💰 Value Bets
          </button>
        </div>

        {/* Content */}
        <div className="space-y-6">
          {/* Match Predictions Tab */}
          {activeTab === 'predictions' && (
            <>
              <div className="flex justify-between items-center mb-6">
                <div>
                  <h2 className="text-2xl font-bold">AI Match Predictions</h2>
                  <p className="text-gray-400 text-sm">
                    Probability analysis for upcoming matches • {predictions.length} matches analyzed
                  </p>
                </div>
              </div>
              
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {predictions.map((prediction) => (
                  <div key={prediction.matchId} className="bg-gray-800/40 rounded-lg border border-gray-700 p-5">
                    <div className="flex justify-between items-start mb-4">
                      <div>
                        <h3 className="font-bold text-white text-lg">
                          {prediction.homeTeam} vs {prediction.awayTeam}
                        </h3>
                        <div className="flex items-center gap-2 mt-1">
                          <span className="text-xs px-2 py-1 bg-gray-700/50 rounded">
                            {prediction.league}
                          </span>
                          <span className="text-xs text-gray-400">
                            {formatDate(prediction.date)}
                          </span>
                        </div>
                      </div>
                      <div className={`px-3 py-1 rounded-full text-xs font-medium ${getConfidenceBg(prediction.prediction.confidence)} ${getConfidenceColor(prediction.prediction.confidence)}`}>
                        {prediction.prediction.confidence}%
                      </div>
                    </div>
                    
                    <div className="mb-4">
                      <div className="flex items-center justify-between mb-2">
                        <div className="text-sm text-gray-400">Win Probability</div>
                        <div className="text-xs text-gray-500">AI Analysis</div>
                      </div>
                      
                      <div className="space-y-2">
                        <div>
                          <div className="flex justify-between text-sm mb-1">
                            <span className="text-gray-300">{prediction.homeTeam}</span>
                            <span className="font-bold text-white">{prediction.prediction.homeWin}%</span>
                          </div>
                          <div className="h-2 bg-gray-700 rounded-full overflow-hidden">
                            <div 
                              className="h-full bg-blue-500" 
                              style={{ width: `${prediction.prediction.homeWin}%` }}
                            ></div>
                          </div>
                        </div>
                        
                        <div>
                          <div className="flex justify-between text-sm mb-1">
                            <span className="text-gray-300">Draw</span>
                            <span className="font-bold text-white">{prediction.prediction.draw}%</span>
                          </div>
                          <div className="h-2 bg-gray-700 rounded-full overflow-hidden">
                            <div 
                              className="h-full bg-gray-500" 
                              style={{ width: `${prediction.prediction.draw}%` }}
                            ></div>
                          </div>
                        </div>
                        
                        <div>
                          <div className="flex justify-between text-sm mb-1">
                            <span className="text-gray-300">{prediction.awayTeam}</span>
                            <span className="font-bold text-white">{prediction.prediction.awayWin}%</span>
                          </div>
                          <div className="h-2 bg-gray-700 rounded-full overflow-hidden">
                            <div 
                              className="h-full bg-red-500" 
                              style={{ width: `${prediction.prediction.awayWin}%` }}
                            ></div>
                          </div>
                        </div>
                      </div>
                    </div>
                    
                    {prediction.prediction.predictedScore && (
                      <div className="mb-4 p-3 bg-gray-800/60 rounded-lg">
                        <div className="text-center">
                          <div className="text-sm text-gray-400 mb-1">Predicted Score</div>
                          <div className="text-xl font-bold text-yellow-400">{prediction.prediction.predictedScore}</div>
                        </div>
                      </div>
                    )}
                    
                    <div className="mb-4">
                      <h4 className="font-bold text-gray-300 mb-2 text-sm">Key Factors:</h4>
                      <ul className="space-y-1">
                        {prediction.prediction.keyFactors.slice(0, 3).map((factor, index) => (
                          <li key={index} className="text-xs text-gray-400 flex items-start gap-2">
                            <span className="text-green-400 mt-1">•</span>
                            <span>{factor}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                    
                    {prediction.valueBet && (
                      <div className={`p-3 rounded-lg ${getValueBg(prediction.valueBet.value)} ${getValueColor(prediction.valueBet.value)}`}>
                        <div className="flex items-center justify-between">
                          <div>
                            <div className="font-bold">💰 Value Bet</div>
                            <div className="text-sm opacity-90">Bet on {prediction.valueBet.type}</div>
                          </div>
                          <div className="text-lg font-bold">+{prediction.valueBet.value}%</div>
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </>
          )}

          {/* Fantasy Picks Tab */}
          {activeTab === 'fantasy' && (
            <>
              <div className="flex justify-between items-center mb-6">
                <div>
                  <h2 className="text-2xl font-bold">AI Fantasy Team of the Week</h2>
                  <p className="text-gray-400 text-sm">
                    Optimal picks based on form, fixtures, and value • {fantasyPicks.length} players
                  </p>
                </div>
              </div>
              
              <div className="mb-8 p-6 bg-gradient-to-r from-blue-900/20 to-purple-900/20 border border-blue-700/30 rounded-lg">
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                  <div>
                    <h3 className="text-xl font-bold text-blue-400 mb-2">🏆 Fantasy Strategy</h3>
                    <p className="text-gray-300">
                      Our AI analyzes player form, upcoming fixtures, historical performance, and value metrics
                      to identify the best fantasy picks for the coming week.
                    </p>
                  </div>
                  <div className="text-center">
                    <div className="text-3xl font-bold text-white">11</div>
                    <div className="text-sm text-gray-400">Optimal Players</div>
                  </div>
                </div>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {fantasyPicks.map((pick, index) => (
                  <div key={index} className="bg-gray-800/40 rounded-lg border border-gray-700 p-5 hover:border-blue-500/30 transition-all">
                    <div className="flex justify-between items-start mb-4">
                      <div>
                        <div className="flex items-center gap-3 mb-2">
                          <div className="text-2xl">
                            {pick.position === 'GK' ? '🧤' : 
                             pick.position === 'DEF' ? '🛡️' : 
                             pick.position === 'MID' ? '⚙️' : '⚽'}
                          </div>
                          <div>
                            <h3 className="font-bold text-white text-lg">{pick.player}</h3>
                            <div className="text-sm text-gray-400">{pick.team} • {pick.position}</div>
                          </div>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-2xl font-bold text-yellow-400">{pick.points}</div>
                        <div className="text-xs text-gray-400">Projected</div>
                      </div>
                    </div>
                    
                    <div className="mb-4">
                      <div className="flex justify-between items-center mb-2">
                        <div className="text-sm text-gray-400">Value Score</div>
                        <div className="text-xs text-gray-500">Points per million</div>
                      </div>
                      <div className="h-2 bg-gray-700 rounded-full overflow-hidden">
                        <div 
                          className="h-full bg-green-500" 
                          style={{ width: `${Math.min(pick.value * 10, 100)}%` }}
                        ></div>
                      </div>
                      <div className="flex justify-between text-sm mt-1">
                        <span className="text-gray-300">{pick.value.toFixed(1)}</span>
                        <span className="text-gray-400">Price: £{pick.price}m</span>
                      </div>
                    </div>
                    
                    <div className="mb-4">
                      <div className="flex items-center justify-between mb-2">
                        <div className="text-sm text-gray-400">Form</div>
                        <div className="text-xs text-gray-500">Last 5 matches</div>
                      </div>
                      <div className="flex gap-1">
                        {Array.from({ length: 5 }).map((_, i) => (
                          <div 
                            key={i}
                            className={`h-2 flex-1 rounded ${i < pick.form ? 'bg-green-500' : 'bg-gray-700'}`}
                          ></div>
                        ))}
                      </div>
                    </div>
                    
                    <div>
                      <h4 className="font-bold text-gray-300 mb-2 text-sm">Why pick this player?</h4>
                      <p className="text-sm text-gray-400">{pick.reasoning}</p>
                    </div>
                    
                    <div className="mt-4 pt-4 border-t border-gray-700/50">
                      <div className="text-xs text-gray-500">
                        Next fixture: <span className="text-gray-300">{pick.fixture}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}

          {/* Value Bets Tab */}
          {activeTab === 'value' && (
            <>
              <div className="flex justify-between items-center mb-6">
                <div>
                  <h2 className="text-2xl font-bold">AI Value Bet Alerts</h2>
                  <p className="text-gray-400 text-sm">
                    Bets where market odds differ from AI probability analysis • {valueBets.length} opportunities
                  </p>
                </div>
              </div>
              
              <div className="mb-8 p-6 bg-gradient-to-r from-green-900/20 to-emerald-900/20 border border-green-700/30 rounded-lg">
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                  <div>
                    <h3 className="text-xl font-bold text-green-400 mb-2">💰 Value Betting Explained</h3>
                    <p className="text-gray-300">
                      Value betting occurs when the probability of an outcome is higher than what the odds imply.
                      Our AI compares its predicted probabilities with market odds to find these opportunities.
                    </p>
                  </div>
                  <div className="text-center">
                    <div className="text-3xl font-bold text-white">+{valueBets.reduce((sum, bet) => sum + bet.edge, 0).toFixed(1)}%</div>
                    <div className="text-sm text-gray-400">Total Edge</div>
                  </div>
                </div>
              </div>
              
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {valueBets.map((bet, index) => (
                  <div key={index} className="bg-gray-800/40 rounded-lg border border-gray-700 p-5">
                    <div className="flex justify-between items-start mb-4">
                      <div>
                        <h3 className="font-bold text-white text-lg">
                          {bet.homeTeam} vs {bet.awayTeam}
                        </h3>
                        <div className="flex items-center gap-2 mt-1">
                          <span className="text-xs px-2 py-1 bg-gray-700/50 rounded">
                            {bet.league}
                          </span>
                          <span className={`px-2 py-1 rounded text-xs font-medium ${getEdgeBg(bet.edge)} ${getEdgeColor(bet.edge)}`}>
                            +{bet.edge.toFixed(1)}% Edge
                          </span>
                          {bet.confidence === 'high' && (
                            <span className="px-2 py-1 bg-green-900/30 text-green-400 rounded text-xs">
                              High Confidence
                            </span>
                          )}
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-2xl font-bold text-yellow-400">{bet.odds.toFixed(2)}</div>
                        <div className="text-xs text-gray-400">Odds</div>
                      </div>
                    </div>
                    
                    <div className="mb-4">
                      <div className="flex items-center justify-between mb-2">
                        <div className="text-sm text-gray-400">Bet Type</div>
                        <div className="text-xs text-gray-500">Market vs AI Probability</div>
                      </div>
                      <div className="bg-gray-800/60 rounded-lg p-3">
                        <div className="flex justify-between items-center mb-2">
                          <div className="font-bold text-white">{bet.betType}</div>
                          <div className="text-sm">
                            <span className="text-gray-400">Value: </span>
                            <span className="font-bold text-green-400">+{bet.value.toFixed(1)}%</span>
                          </div>
                        </div>
                        <div className="flex items-center gap-4">
                          <div className="flex-1">
                            <div className="text-xs text-gray-400 mb-1">AI Probability</div>
                            <div className="text-lg font-bold text-white">{bet.probability.toFixed(1)}%</div>
                          </div>
                          <div className="text-gray-500">→</div>
                          <div className="flex-1">
                            <div className="text-xs text-gray-400 mb-1">Implied Probability</div>
                            <div className="text-lg font-bold text-gray-300">
                              {(100 / bet.odds).toFixed(1)}%
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                    
                    <div className="mb-4">
                      <h4 className="font-bold text-gray-300 mb-2 text-sm">AI Reasoning:</h4>
                      <p className="text-sm text-gray-400">{bet.reasoning}</p>
                    </div>
                    
                    <div className="flex items-center justify-between pt-4 border-t border-gray-700/50">
                      <div className="text-xs text-gray-500">
                        Confidence: 
                        <span className={`ml-2 px-2 py-1 rounded ${getConfidenceBg(
                          bet.confidence === 'high' ? 80 : bet.confidence === 'medium' ? 60 : 40
                        )} ${getConfidenceColor(
                          bet.confidence === 'high' ? 80 : bet.confidence === 'medium' ? 60 : 40
                        )}`}>
                          {bet.confidence.toUpperCase()}
                        </span>
                      </div>
                      <div className="text-xs text-gray-400">
                        Expected Value: +{(bet.edge * bet.odds / 100).toFixed(2)}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>

        {/* Footer Note */}
        <div className="mt-12 pt-8 border-t border-gray-800">
          <div className="text-center text-gray-500 text-sm">
            <p className="mb-2">
              ⚠️ <span className="font-medium">Disclaimer: For entertainment purposes only</span>
            </p>
            <p className="text-gray-400">
              AI predictions are based on statistical analysis and should not be considered financial advice.
              Betting involves risk. Please gamble responsibly.
            </p>
            <div className="mt-4">
              <button
                onClick={() => {
                  clearMatchCache();
                  localStorage.removeItem('ai_predictions');
                  localStorage.removeItem('fantasy_picks');
                  localStorage.removeItem('value_bets');
                  setLoading(true);
                  loadData();
                }}
                className="px-4 py-2 bg-gray-800 hover:bg-gray-700 rounded-lg text-sm transition-colors"
              >
                🔄 Refresh AI Analysis
              </button>
              <p className="text-gray-500 text-xs mt-2">
                Analysis updates every hour • Uses latest match data
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}