'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import GroupStageFixtures from '@/components/GroupStageFixtures';
import TeamDetailsPanel from '@/components/TeamDetailsPanel';
import type { WorldCupData, Team } from '@/services/groqService';

export default function WorldCupPage() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<'groups' | 'matches' | 'teams'>('groups');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [worldCupData, setWorldCupData] = useState<WorldCupData | null>(null);
  const [selectedTeam, setSelectedTeam] = useState<Team | null>(null);
  const [lastUpdated, setLastUpdated] = useState<string>('');

  // Fetch data from API route (matches your homepage pattern)
  const fetchWorldCupData = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    
    try {
      console.log('[World Cup Page] Fetching from /api/worldcup');
      const response = await fetch('/api/worldcup', {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Cache-Control': 'no-cache'
        }
      });
      
      const result = await response.json();
      
      if (!response.ok || !result.success) {
        console.error('[World Cup Page] API error:', result);
        throw new Error(result.error || `API returned status ${response.status}`);
      }
      
      console.log('[World Cup Page] Data loaded successfully:', result.source);
      setWorldCupData(result.data);
      setLastUpdated(result.timestamp);
      
    } catch (err: any) {
      console.error('[World Cup Page] Fetch failed:', err);
      setError(`Failed to load data: ${err.message}`);
      
      // Use minimal fallback to keep UI working
      setWorldCupData({
        groups: [],
        matches: [],
        lastUpdated: new Date().toISOString(),
        source: 'Error - Check console for details'
      });
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Initial fetch
  useEffect(() => {
    fetchWorldCupData();
  }, [fetchWorldCupData]);

  const handleTeamClick = (teamName: string) => {
    const team = worldCupData?.groups
      .flatMap(g => g.teams)
      .find(t => t.name === teamName);
    
    if (team) {
      setSelectedTeam(team);
    }
  };

  const handleRefresh = () => {
    fetchWorldCupData();
  };

  // Loading state
  if (isLoading && !worldCupData) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 to-blue-900 flex items-center justify-center p-4">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-16 w-16 border-4 border-blue-500 border-t-transparent"></div>
          <p className="mt-6 text-xl text-white font-medium">Loading 2026 World Cup Data</p>
          <p className="mt-2 text-gray-300">Fetching live information from Wikipedia via GROQ AI</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 to-blue-900">
      {/* Navigation Header */}
      <header className="border-b border-gray-800 bg-gray-900/80 backdrop-blur-sm">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-8">
              <Link 
                href="/" 
                className="text-white font-bold text-xl hover:text-blue-400 transition-colors"
              >
                ← Back to Home
              </Link>
              
              <div className="hidden md:flex items-center gap-6">
                <Link 
                  href="/world-cup" 
                  className="text-white font-semibold hover:text-blue-400 transition-colors border-b-2 border-blue-500 pb-1"
                >
                  World Cup 2026
                </Link>
                <Link 
                  href="/teams" 
                  className="text-gray-400 font-semibold hover:text-white transition-colors"
                >
                  Teams
                </Link>
                <Link 
                  href="/schedule" 
                  className="text-gray-400 font-semibold hover:text-white transition-colors"
                >
                  Schedule
                </Link>
              </div>
            </div>
            
            <div className="flex items-center gap-4">
              <button
                onClick={handleRefresh}
                disabled={isLoading}
                className="px-5 py-2.5 bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 disabled:opacity-50 text-white font-semibold rounded-xl transition-all flex items-center gap-3 shadow-lg"
              >
                {isLoading ? (
                  <>
                    <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                    Loading...
                  </>
                ) : (
                  <>
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                    </svg>
                    Refresh Data
                  </>
                )}
              </button>
              
              {lastUpdated && (
                <div className="text-sm text-gray-400 hidden md:block">
                  Updated: {new Date(lastUpdated).toLocaleTimeString([], { 
                    hour: '2-digit', 
                    minute: '2-digit' 
                  })}
                </div>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-8">
        {/* Page Header */}
        <div className="mb-10 text-center">
          <h1 className="text-5xl md:text-6xl font-bold text-white mb-4">
            2026 FIFA World Cup
          </h1>
          <p className="text-2xl text-gray-300 mb-6">
            United States • Canada • Mexico
          </p>
          
          <div className="flex flex-wrap justify-center gap-4 mb-8">
            <div className="bg-white/10 backdrop-blur-sm rounded-2xl px-6 py-3">
              <p className="text-white font-medium">June 11 - July 19, 2026</p>
            </div>
            <div className="bg-white/10 backdrop-blur-sm rounded-2xl px-6 py-3">
              <p className="text-white font-medium">48 Teams • 16 Host Cities</p>
            </div>
            {worldCupData?.source && (
              <div className="bg-blue-500/20 backdrop-blur-sm rounded-2xl px-6 py-3 border border-blue-500/30">
                <p className="text-blue-300 font-medium">
                  Source: {worldCupData.source}
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Error Display */}
        {error && (
          <div className="mb-8 bg-red-900/30 border border-red-700/50 rounded-2xl p-6">
            <div className="flex items-start">
              <div className="flex-shrink-0 pt-0.5">
                <svg className="w-6 h-6 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <div className="ml-4">
                <h3 className="text-lg font-semibold text-white">Unable to Load Live Data</h3>
                <p className="text-red-200 mt-1">{error}</p>
                <p className="text-red-300 text-sm mt-3">
                  The page is showing fallback information. Click "Refresh Data" to try again.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Content Tabs */}
        <div className="flex flex-wrap gap-2 mb-8 bg-gray-800/50 rounded-2xl p-2">
          <button
            onClick={() => setActiveTab('groups')}
            className={`px-6 py-3 rounded-xl font-semibold transition-all flex-1 md:flex-none ${
              activeTab === 'groups'
                ? 'bg-gradient-to-r from-blue-600 to-blue-700 text-white shadow-lg'
                : 'bg-gray-700/50 text-gray-300 hover:bg-gray-600/50'
            }`}
          >
            Groups & Teams
          </button>
          <button
            onClick={() => setActiveTab('matches')}
            className={`px-6 py-3 rounded-xl font-semibold transition-all flex-1 md:flex-none ${
              activeTab === 'matches'
                ? 'bg-gradient-to-r from-blue-600 to-blue-700 text-white shadow-lg'
                : 'bg-gray-700/50 text-gray-300 hover:bg-gray-600/50'
            }`}
          >
            Match Schedule
          </button>
          <button
            onClick={() => setActiveTab('teams')}
            className={`px-6 py-3 rounded-xl font-semibold transition-all flex-1 md:flex-none ${
              activeTab === 'teams'
                ? 'bg-gradient-to-r from-blue-600 to-blue-700 text-white shadow-lg'
                : 'bg-gray-700/50 text-gray-300 hover:bg-gray-600/50'
            }`}
          >
            All Teams
          </button>
        </div>

        {/* Content Area */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main Content */}
          <div className="lg:col-span-2">
            {activeTab === 'groups' && worldCupData && (
              <div className="bg-gray-800/30 backdrop-blur-sm rounded-2xl border border-gray-700/50 p-6">
                <div className="flex items-center justify-between mb-8">
                  <div>
                    <h2 className="text-2xl font-bold text-white">Group Stage</h2>
                    <p className="text-gray-400 mt-1">48 teams across 12 groups (A-L)</p>
                  </div>
                  <div className="text-sm text-gray-400">
                    Click teams for details
                  </div>
                </div>
                
                <GroupStageFixtures 
                  groups={worldCupData.groups}
                  onTeamClick={handleTeamClick}
                />
              </div>
            )}

            {activeTab === 'matches' && worldCupData && (
              <div className="bg-gray-800/30 backdrop-blur-sm rounded-2xl border border-gray-700/50 p-6">
                <h2 className="text-2xl font-bold text-white mb-8">Match Schedule</h2>
                
                {worldCupData.matches && worldCupData.matches.length > 0 ? (
                  <div className="space-y-4">
                    {worldCupData.matches.slice(0, 8).map((match, index) => (
                      <div 
                        key={index} 
                        className="bg-gray-900/50 rounded-xl p-5 border border-gray-700/30 hover:border-blue-500/30 transition-colors"
                      >
                        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                          <div className="flex-1">
                            <div className="flex items-center gap-4 mb-3">
                              <span className="font-semibold text-white">
                                {new Date(match.date).toLocaleDateString('en-US', { 
                                  weekday: 'short', 
                                  month: 'short', 
                                  day: 'numeric',
                                  year: 'numeric'
                                })}
                              </span>
                              <span className="text-sm text-gray-400 bg-gray-800/50 px-3 py-1 rounded-full">
                                {match.stage}
                              </span>
                              {match.group && (
                                <span className="text-sm text-blue-400 bg-blue-900/30 px-3 py-1 rounded-full">
                                  {match.group}
                                </span>
                              )}
                            </div>
                            
                            <div className="flex items-center justify-center gap-6">
                              <button
                                onClick={() => handleTeamClick(match.team1)}
                                className="text-xl font-bold text-white hover:text-blue-400 transition-colors"
                              >
                                {match.team1}
                              </button>
                              <div className="text-gray-500 text-lg">vs</div>
                              <button
                                onClick={() => handleTeamClick(match.team2)}
                                className="text-xl font-bold text-white hover:text-blue-400 transition-colors"
                              >
                                {match.team2}
                              </button>
                            </div>
                          </div>
                          
                          <div className="md:w-64 border-t md:border-t-0 md:border-l border-gray-700/50 pt-4 md:pt-0 md:pl-6">
                            <div className="text-gray-400 text-sm mb-1">Venue</div>
                            <div className="text-white font-medium">{match.venue}</div>
                            <div className="text-gray-500 text-sm">{match.city}, {match.country}</div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-12">
                    <div className="inline-block p-4 bg-gray-800/50 rounded-2xl mb-4">
                      <svg className="w-12 h-12 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                      </svg>
                    </div>
                    <h3 className="text-xl font-semibold text-gray-300 mb-2">Schedule Coming Soon</h3>
                    <p className="text-gray-500">The 2026 World Cup match schedule will be announced closer to the tournament.</p>
                  </div>
                )}
              </div>
            )}

            {activeTab === 'teams' && worldCupData && (
              <div className="bg-gray-800/30 backdrop-blur-sm rounded-2xl border border-gray-700/50 p-6">
                <h2 className="text-2xl font-bold text-white mb-8">All Teams</h2>
                
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {worldCupData.groups.flatMap(group => group.teams).map((team, index) => (
                    <div
                      key={index}
                      onClick={() => handleTeamClick(team.name)}
                      className={`bg-gray-900/50 rounded-xl p-4 border cursor-pointer transition-all hover:scale-[1.02] ${
                        team.qualified 
                          ? 'border-green-800/50 hover:border-green-600/50' 
                          : 'border-gray-700/50 hover:border-blue-600/50'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <span className="text-3xl">{team.flagEmoji}</span>
                          <div>
                            <h3 className="font-semibold text-white">{team.name}</h3>
                            <div className="flex items-center gap-3 text-sm">
                              <span className="text-gray-400">{team.fifaCode}</span>
                              <span className="text-blue-400">{team.group}</span>
                            </div>
                          </div>
                        </div>
                        <div className={`w-3 h-3 rounded-full ${team.qualified ? 'bg-green-500' : 'bg-yellow-500'}`}></div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Sidebar - Team Details */}
          <div className="lg:col-span-1">
            <div className="sticky top-8">
              {selectedTeam ? (
                <div className="bg-gray-800/30 backdrop-blur-sm rounded-2xl border border-gray-700/50 p-6">
                  <TeamDetailsPanel 
                    team={selectedTeam}
                    onViewDetails={() => router.push(`/team/${selectedTeam.name.toLowerCase().replace(/\s+/g, '-')}`)}
                  />
                </div>
              ) : (
                <div className="bg-gray-800/30 backdrop-blur-sm rounded-2xl border border-gray-700/50 p-6">
                  <div className="text-center">
                    <div className="inline-block p-4 bg-blue-900/20 rounded-2xl mb-4">
                      <svg className="w-12 h-12 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                      </svg>
                    </div>
                    <h3 className="text-xl font-semibold text-white mb-3">Select a Team</h3>
                    <p className="text-gray-400 mb-6">
                      Click on any team in the groups or matches to see detailed information here.
                    </p>
                    
                    <div className="bg-gradient-to-r from-blue-900/30 to-blue-800/20 rounded-xl p-4 border border-blue-800/30">
                      <h4 className="font-medium text-blue-300 mb-2">Data Information</h4>
                      <p className="text-sm text-blue-200/80">
                        All data is fetched live from Wikipedia using GROQ AI with the llama-3.3-70b-versatile model.
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="mt-12 border-t border-gray-800 pt-8 pb-6">
        <div className="container mx-auto px-4">
          <div className="text-center text-gray-500 text-sm">
            <p>FutbolAI Explorer • 2026 FIFA World Cup Intelligence Platform</p>
            <p className="mt-2">
              Data powered by GROQ AI fetching current information from Wikipedia
              {worldCupData?.source && ` • ${worldCupData.source}`}
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}