'use client';

import { useState } from 'react';
// CORRECT IMPORT - from your actual file
import { searchWithGROQ } from '@/services/groqService';

// ... existing code ...

const handleSearch = async (query: string) => {
  if (!query.trim()) {
    setSearchResults(null);
    return;
  }

  setLoading(true);
  setSearchError(null);

  try {
    // Use the actual function from your service
    const result = await searchWithGROQ(query);
    
    // The result should already be properly formatted by groqService.ts
    if (result.error) {
      setSearchError(result.error);
      setSearchResults(null);
    } else {
      setSearchResults(result);
    }
  } catch (err: any) {
    console.error('Search error:', err);
    setSearchError('Failed to perform search. Please try again.');
    setSearchResults(null);
  } finally {
    setLoading(false);
  }
};

// In your JSX, display results like this:
{searchResults && (
  <div className="mt-8 space-y-6">
    {/* Players */}
    {searchResults.players && searchResults.players.length > 0 && (
      <div className="bg-white rounded-xl shadow p-6">
        <h3 className="text-xl font-bold text-gray-800 mb-4">Players</h3>
        <div className="space-y-4">
          {searchResults.players.map((player: any, index: number) => (
            <div key={index} className="border-b pb-4 last:border-0">
              <div className="font-semibold text-lg">{player.name}</div>
              <div className="text-gray-600">{player.team} • {player.position}</div>
              {player.wikipediaSummary && (
                <p className="text-gray-500 mt-2 text-sm">{player.wikipediaSummary}</p>
              )}
            </div>
          ))}
        </div>
      </div>
    )}
    
    {/* Teams */}
    {searchResults.teams && searchResults.teams.length > 0 && (
      <div className="bg-white rounded-xl shadow p-6">
        <h3 className="text-xl font-bold text-gray-800 mb-4">Teams</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {searchResults.teams.map((team: any, index: number) => (
            <div key={index} className="border rounded-lg p-4">
              <div className="font-semibold">{team.name}</div>
              <div className="text-gray-600 text-sm">{team.country}</div>
              <div className="text-gray-500 text-sm mt-2">Coach: {team.coach}</div>
              {team.fifaRanking && (
                <div className="mt-2">
                  <span className="px-2 py-1 bg-gray-100 text-gray-700 rounded text-xs">
                    FIFA Rank: #{team.fifaRanking}
                  </span>
                </div>
              )}
              {team.group && (
                <div className="mt-2">
                  <span className="px-2 py-1 bg-blue-100 text-blue-700 rounded text-xs">
                    Group {team.group} (2026 WC)
                  </span>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    )}
    
    {/* Error or message */}
    {searchResults.error && (
      <div className="bg-red-50 border border-red-200 rounded-xl p-6">
        <p className="text-red-800">{searchResults.error}</p>
      </div>
    )}
    
    {searchResults.message && (
      <div className="bg-blue-50 border border-blue-200 rounded-xl p-6">
        <p className="text-blue-800">{searchResults.message}</p>
      </div>
    )}
  </div>
)}