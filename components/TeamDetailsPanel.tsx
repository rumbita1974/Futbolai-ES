// components/TeamDetailsPanel.tsx
'use client';

import { useTeam } from '@/context/TeamContext';
import { useEffect, useState } from 'react';

interface Player {
  name: string;
  position: string;
  age: number;
  dob: string;
  club: string;
  caps: number;
  goals: number;
  photoUrl: string;
  wikipediaUrl: string;
}

// Helper to calculate age from DOB
function calculateAge(dob: string): number {
  if (!dob) return 0;
  try {
    const birthDate = new Date(dob);
    const ageDifMs = Date.now() - birthDate.getTime();
    const ageDate = new Date(ageDifMs);
    return Math.abs(ageDate.getUTCFullYear() - 1970);
  } catch (e) { return 0; }
}

// Real API integration to fetch squad data
async function fetchTeamRoster(teamName: string): Promise<Player[]> {
  let players: Player[] = [];
  
  try {
    // 1. Try AI API with specific season context for better accuracy
    const response = await fetch(`/api/ai?action=search&query=${encodeURIComponent(`current squad of ${teamName} 2024-2025`)}`);
    
    if (response.ok) {
      const data = await response.json();
      if (data.success) {
        if (data.teamInfo?.squad && Array.isArray(data.teamInfo.squad)) {
          players = data.teamInfo.squad.map(mapToPlayer);
        } else if (data.players && Array.isArray(data.players)) {
          players = data.players.map(mapToPlayer);
        }
      }
    }
  } catch (error) {
    console.error("Error fetching team roster from AI:", error);
  }

  // 2. Fallback to SportsDB if AI returned no players (Robustness improvement)
  if (players.length === 0) {
    try {
      const sdbResponse = await fetch(`https://www.thesportsdb.com/api/v1/json/3/searchplayers.php?t=${encodeURIComponent(teamName)}`);
      if (sdbResponse.ok) {
        const sdbData = await sdbResponse.json();
        if (sdbData.player && Array.isArray(sdbData.player)) {
          players = sdbData.player.map((p: any) => ({
            name: p.strPlayer || 'Unknown',
            position: p.strPosition || 'Unknown',
            age: calculateAge(p.dateBorn),
            dob: p.dateBorn || 'N/A',
            club: p.strTeam || teamName,
            caps: 0,
            goals: 0,
            photoUrl: p.strCutout || p.strThumb || '',
            wikipediaUrl: `https://en.wikipedia.org/wiki/${encodeURIComponent(p.strPlayer || '')}`
          }));
        }
      }
    } catch (e) {
      console.error("SportsDB fallback failed:", e);
    }
  }

  return players;
}

// Helper to map API response to Player interface
function mapToPlayer(p: any): Player {
  return {
    name: p.name || 'Unknown',
    position: p.position || 'Unknown',
    age: p.age || 0,
    dob: p.dateOfBirth || p.dob || 'N/A',
    club: p.currentClub || p.club || 'Unknown',
    caps: p.internationalCaps || p.caps || 0,
    goals: p.internationalGoals || p.goals || 0,
    photoUrl: p.image || p.photoUrl || p.imageUrl || '',
    wikipediaUrl: p.wikipediaUrl || `https://en.wikipedia.org/wiki/${encodeURIComponent(p.name || '')}`
  };
}

export default function TeamDetailsPanel() {
  const { selectedTeam, isLoading } = useTeam();
  const [players, setPlayers] = useState<Player[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [selectedPosition, setSelectedPosition] = useState<string>('all');
  const [loadingPlayers, setLoadingPlayers] = useState(false);

  useEffect(() => {
    async function loadTeamData() {
      if (!selectedTeam) {
        setPlayers([]);
        return;
      }

      // Use squad data from context if available (passed from FootballSearch)
      if ((selectedTeam as any).squad && Array.isArray((selectedTeam as any).squad) && (selectedTeam as any).squad.length > 0) {
        setPlayers((selectedTeam as any).squad.map(mapToPlayer));
        return;
      }

      setLoadingPlayers(true);
      setError(null);
      setSelectedPosition('all');
      
      try {
        const teamPlayers = await fetchTeamRoster(selectedTeam.name);
        setPlayers(teamPlayers);
      } catch (err) {
        setError('Failed to load team data. Please try again.');
        console.error(err);
      } finally {
        setLoadingPlayers(false);
      }
    }

    loadTeamData();
  }, [selectedTeam]);

  // Filter players by position
  const filteredPlayers = selectedPosition === 'all' 
    ? players 
    : players.filter(player => player.position.toLowerCase().includes(selectedPosition.toLowerCase()));

  // Get unique positions - FIXED: Use Array.from instead of spread
  const positions = ['all', ...Array.from(new Set(players.map(p => p.position)))];

  // Calculate stats
  const averageAge = players.length > 0 
    ? Math.round(players.reduce((sum, p) => sum + p.age, 0) / players.length)
    : 0;
  
  const totalCaps = players.reduce((sum, p) => sum + p.caps, 0);
  const totalGoals = players.reduce((sum, p) => sum + p.goals, 0);

  if (!selectedTeam) {
    return (
      <div id="team-details-panel" className="text-center py-12 bg-gradient-to-br from-gray-50 to-blue-50 rounded-xl">
        <div className="inline-block p-4 bg-blue-100 rounded-full mb-4">
          <svg className="w-12 h-12 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
          </svg>
        </div>
        <h3 className="text-xl font-semibold text-gray-700 mb-2">No Team Selected</h3>
        <p className="text-gray-500 max-w-md mx-auto">
          Click on any team name in the fixtures or search for a team to view their roster and details.
        </p>
        <div className="mt-6 p-4 bg-gradient-to-r from-blue-50 to-green-50 rounded-lg border border-blue-200 max-w-lg mx-auto">
          <h4 className="font-bold text-gray-700 mb-2">💡 Quick Tip</h4>
          <p className="text-sm text-gray-600">
            Try clicking on Argentina, Brazil, United States, or any other team in the fixtures table above to see their squad details.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div id="team-details-panel" className="animate-fadeIn">
      {/* Team Header */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between mb-8 pb-6 border-b">
        <div className="flex items-center space-x-4 mb-4 md:mb-0">
          {selectedTeam.flagUrl && (
            <img
              src={selectedTeam.flagUrl}
              alt={`${selectedTeam.name} flag`}
              className="w-16 h-12 object-cover rounded-lg shadow-lg border-2 border-gray-200"
            />
          )}
          <div>
            <h2 className="text-2xl font-bold text-gray-800">{selectedTeam.name}</h2>
            <div className="flex flex-wrap items-center gap-2 mt-2">
              <span className="px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-sm font-medium">
                Group {selectedTeam.group}
              </span>
              <span className="px-3 py-1 bg-gray-100 text-gray-700 rounded-full text-sm font-medium">
                FIFA Ranking: #{selectedTeam.fifaRanking || 'N/A'}
              </span>
            </div>
          </div>
        </div>
        
        <div className="text-right">
          <h4 className="font-semibold text-gray-700 mb-2">📍 Host City</h4>
          <div className="flex flex-wrap gap-2 justify-end">
            <span className="px-3 py-1 bg-gradient-to-r from-green-100 to-emerald-100 text-green-800 rounded-full text-sm font-medium border border-green-200">
              {selectedTeam.venue || 'N/A'}
            </span>
          </div>
        </div>
      </div>

      {/* Team Quick Stats */}
      <div className="mb-8">
        <h3 className="text-lg font-bold text-gray-800 mb-4">Team Overview</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-gradient-to-br from-blue-50 to-blue-100 p-4 rounded-xl border border-blue-200">
            <div className="text-sm text-blue-600 font-medium mb-1">Average Age</div>
            <div className="text-2xl font-bold text-blue-800">{averageAge}</div>
            <div className="text-xs text-blue-500 mt-1">years</div>
          </div>
          <div className="bg-gradient-to-br from-green-50 to-green-100 p-4 rounded-xl border border-green-200">
            <div className="text-sm text-green-600 font-medium mb-1">Total Caps</div>
            <div className="text-2xl font-bold text-green-800">{totalCaps}</div>
            <div className="text-xs text-green-500 mt-1">international appearances</div>
          </div>
          <div className="bg-gradient-to-br from-yellow-50 to-yellow-100 p-4 rounded-xl border border-yellow-200">
            <div className="text-sm text-yellow-600 font-medium mb-1">Total Goals</div>
            <div className="text-2xl font-bold text-yellow-800">{totalGoals}</div>
            <div className="text-xs text-yellow-500 mt-1">international goals</div>
          </div>
          <div className="bg-gradient-to-br from-purple-50 to-purple-100 p-4 rounded-xl border border-purple-200">
            <div className="text-sm text-purple-600 font-medium mb-1">Squad Size</div>
            <div className="text-2xl font-bold text-purple-800">{players.length}</div>
            <div className="text-xs text-purple-500 mt-1">players in squad</div>
          </div>
        </div>
      </div>

      {/* Loading State */}
      {(loadingPlayers || isLoading) && (
        <div className="text-center py-12">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500 mb-4"></div>
          <p className="text-gray-600">Loading team roster from Wikipedia...</p>
          <p className="text-sm text-gray-500 mt-2">Fetching real-time player data and photos</p>
        </div>
      )}

      {/* Error State */}
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-6">
          <div className="flex items-center">
            <svg className="w-5 h-5 mr-2" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
            </svg>
            <p className="font-medium">Error Loading Data</p>
          </div>
          <p className="mt-1">{error}</p>
        </div>
      )}

      {/* Player Roster */}
      {!loadingPlayers && !isLoading && players.length > 0 && (
        <>
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
            <h3 className="text-xl font-bold text-gray-800">Team Roster</h3>
            <div className="flex items-center space-x-4">
              <div className="text-sm text-gray-500">
                {players.length} players • Live Data
              </div>
              
              {/* Position Filter */}
              <div className="relative">
                <select
                  value={selectedPosition}
                  onChange={(e) => setSelectedPosition(e.target.value)}
                  className="px-3 py-2 bg-white border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  {positions.map(position => (
                    <option key={position} value={position}>
                      {position === 'all' ? 'All Positions' : position}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {/* Position Summary */}
          <div className="mb-6 p-4 bg-gray-50 rounded-lg">
            <div className="flex flex-wrap gap-2">
              {positions.filter(p => p !== 'all').map(position => {
                const count = players.filter(p => p.position === position).length;
                return (
                  <button
                    key={position}
                    onClick={() => setSelectedPosition(position)}
                    className={`px-3 py-1 rounded-full text-sm font-medium transition-colors ${
                      selectedPosition === position
                        ? 'bg-blue-600 text-white'
                        : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                    }`}
                  >
                    {position} ({count})
                  </button>
                );
              })}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {filteredPlayers.map((player, index) => (
              <div
                key={index}
                className="bg-white border border-gray-200 rounded-xl shadow-sm hover:shadow-md transition-all duration-300 overflow-hidden hover:scale-[1.02]"
              >
                {/* Player Photo */}
                <div className="relative h-48 overflow-hidden bg-gradient-to-br from-gray-100 to-gray-200">
                  <img
                    src={player.photoUrl}
                    alt={player.name}
                    className="w-full h-full object-cover hover:scale-105 transition-transform duration-500"
                    onError={(e) => {
                      const target = e.target as HTMLImageElement;
                      target.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(player.name)}&background=4f46e5&color=fff&size=400`;
                      target.className = "w-full h-full object-contain p-4";
                    }}
                  />
                  <div className="absolute top-3 right-3 bg-gradient-to-r from-blue-600 to-blue-500 text-white px-3 py-1 rounded-full text-xs font-bold shadow-lg">
                    {player.position}
                  </div>
                  <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/70 to-transparent p-4">
                    <h4 className="font-bold text-lg text-white">{player.name}</h4>
                    <p className="text-white/90 text-sm">{player.club}</p>
                  </div>
                </div>

                {/* Player Info */}
                <div className="p-4">
                  <div className="space-y-3 mb-4">
                    <div className="flex justify-between items-center">
                      <span className="text-gray-500 text-sm">Age</span>
                      <span className="font-medium text-gray-800">{player.age}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-gray-500 text-sm">Date of Birth</span>
                      <span className="font-medium text-gray-800">{player.dob}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-gray-500 text-sm">Club</span>
                      <span className="font-medium text-gray-800 truncate ml-2">{player.club}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-gray-500 text-sm">Int'l Caps</span>
                      <span className="font-medium text-gray-800">{player.caps}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-gray-500 text-sm">Int'l Goals</span>
                      <span className="font-medium text-gray-800">{player.goals}</span>
                    </div>
                    {player.goals > 0 && player.caps > 0 && (
                      <div className="flex justify-between items-center">
                        <span className="text-gray-500 text-sm">Goal Ratio</span>
                        <span className="font-medium text-gray-800">
                          {(player.goals / player.caps).toFixed(2)}
                        </span>
                      </div>
                    )}
                  </div>

                  {/* Wikipedia Link */}
                  <a
                    href={player.wikipediaUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="block w-full text-center bg-gradient-to-r from-gray-50 to-gray-100 hover:from-gray-100 hover:to-gray-200 text-gray-700 font-medium py-2.5 px-4 rounded-lg transition-all duration-300 text-sm border border-gray-200 hover:border-gray-300 hover:shadow-sm"
                  >
                    <div className="flex items-center justify-center gap-2">
                      <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M24 4.557c-.883.392-1.832.656-2.828.775 1.017-.609 1.798-1.574 2.165-2.724-.951.564-2.005.974-3.127 1.195-.897-.957-2.178-1.555-3.594-1.555-3.179 0-5.515 2.966-4.797 6.045-4.091-.205-7.719-2.165-10.148-5.144-1.29 2.213-.669 5.108 1.523 6.574-.806-.026-1.566-.247-2.229-.616-.054 2.281 1.581 4.415 3.949 4.89-.693.188-1.452.232-2.224.084.626 1.956 2.444 3.379 4.6 3.419-2.07 1.623-4.678 2.348-7.29 2.04 2.179 1.397 4.768 2.212 7.548 2.212 9.142 0 14.307-7.721 13.995-14.646.962-.695 1.797-1.562 2.457-2.549z"/>
                      </svg>
                      View on Wikipedia
                    </div>
                  </a>
                </div>
              </div>
            ))}
          </div>

          {/* Squad Summary */}
          <div className="mt-8 pt-6 border-t">
            <h4 className="font-bold text-lg text-gray-800 mb-4">Squad Composition</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="bg-white border border-gray-200 rounded-xl p-4">
                <h5 className="font-semibold text-gray-700 mb-3">Position Distribution</h5>
                <div className="space-y-3">
                  {positions.filter(p => p !== 'all').map(position => {
                    const count = players.filter(p => p.position === position).length;
                    const percentage = (count / players.length) * 100;
                    return (
                      <div key={position} className="space-y-1">
                        <div className="flex justify-between text-sm">
                          <span className="text-gray-600">{position}</span>
                          <span className="font-medium text-gray-800">{count} ({percentage.toFixed(0)}%)</span>
                        </div>
                        <div className="w-full bg-gray-200 rounded-full h-2">
                          <div 
                            className="bg-blue-600 h-2 rounded-full" 
                            style={{ width: `${percentage}%` }}
                          ></div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
              
              <div className="bg-white border border-gray-200 rounded-xl p-4">
                <h5 className="font-semibold text-gray-700 mb-3">Top Performers</h5>
                <div className="space-y-3">
                  <div className="flex items-center justify-between p-2 bg-blue-50 rounded-lg">
                    <span className="text-sm text-gray-600">Most Caps</span>
                    <span className="font-medium text-gray-800">
                      {players.reduce((prev, current) => (prev.caps > current.caps) ? prev : current).name}
                    </span>
                  </div>
                  <div className="flex items-center justify-between p-2 bg-green-50 rounded-lg">
                    <span className="text-sm text-gray-600">Top Scorer</span>
                    <span className="font-medium text-gray-800">
                      {players.reduce((prev, current) => (prev.goals > current.goals) ? prev : current).name}
                    </span>
                  </div>
                  <div className="flex items-center justify-between p-2 bg-yellow-50 rounded-lg">
                    <span className="text-sm text-gray-600">Best Goal Ratio</span>
                    <span className="font-medium text-gray-800">
                      {players.filter(p => p.caps > 0).reduce((prev, current) => 
                        (prev.goals/prev.caps > current.goals/current.caps) ? prev : current).name
                      }
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </>
      )}

      {/* Empty Roster State */}
      {!loadingPlayers && !isLoading && players.length === 0 && !error && (
        <div className="text-center py-12">
          <div className="inline-block p-4 bg-gradient-to-br from-gray-100 to-gray-200 rounded-full mb-4">
            <svg className="w-16 h-16 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 14l9-5-9-5-9 5 9 5z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 14l9-5-9-5-9 5 9 5z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 14v6l9-5M12 20l-9-5" />
            </svg>
          </div>
          <h4 className="text-lg font-semibold text-gray-600 mb-2">Roster Data Unavailable</h4>
          <p className="text-gray-500 max-w-md mx-auto mb-4 text-sm">
            Player data for {selectedTeam.name} could not be retrieved. This might be due to API limits or data availability.
          </p>
          <div className="mt-4 p-4 bg-gradient-to-r from-blue-50 to-green-50 rounded-lg border border-blue-200 max-w-md mx-auto">
            <p className="text-sm text-gray-600">
              <span className="font-medium">Note:</span> We are using Groq AI + Wikipedia to fetch the latest squad data.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
