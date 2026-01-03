'use client';

import { useState, useEffect } from 'react';

interface Match {
  id: number;
  date: string;
  group: string;
  team1: string;
  team2: string;
  venue: string;
  city: string;
  status: 'scheduled' | 'live' | 'completed';
  score1?: number;
  score2?: number;
}

interface Group {
  id: string;
  name: string;
  teams: string[];
  matches: Match[];
}

interface WorldCupData {
  success: boolean;
  tournamentStart: string;
  groups: Group[];
  totalMatches: number;
  lastUpdated: string;
}

export default function GroupStageFixtures() {
  const [data, setData] = useState<WorldCupData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedGroup, setSelectedGroup] = useState<string>('A');

  useEffect(() => {
    fetchWorldCupData();
  }, []);

  const fetchWorldCupData = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/worldcup');
      if (!response.ok) throw new Error('Failed to fetch data');
      const result = await response.json();
      setData(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  };

  const getGroupMatches = () => {
    if (!data) return [];
    const group = data.groups.find(g => g.id === selectedGroup);
    return group ? group.matches : [];
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading World Cup fixtures...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-6 text-center">
        <h3 className="text-red-700 font-semibold">Error loading fixtures</h3>
        <p className="text-red-600 mt-2">{error}</p>
        <button
          onClick={fetchWorldCupData}
          className="mt-4 px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 transition"
        >
          Retry
        </button>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl shadow-lg p-6">
      <div className="mb-8">
        <h2 className="text-2xl font-bold text-gray-800 mb-2">2026 FIFA World Cup Group Stage</h2>
        <p className="text-gray-600">Official match schedule with venues and dates</p>
        <div className="mt-4 p-3 bg-blue-50 rounded-lg">
          <p className="text-blue-700 text-sm">
            <span className="font-semibold">Status:</span> All matches are scheduled. Tournament starts June 11, 2026.
          </p>
        </div>
      </div>

      {/* Group Selector */}
      <div className="mb-8">
        <h3 className="text-lg font-semibold text-gray-700 mb-3">Select Group</h3>
        <div className="flex flex-wrap gap-2">
          {data?.groups.map(group => (
            <button
              key={group.id}
              onClick={() => setSelectedGroup(group.id)}
              className={`px-4 py-2 rounded-lg transition ${selectedGroup === group.id
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
            >
              {group.name}
            </button>
          ))}
        </div>
      </div>

      {/* Group Info */}
      <div className="mb-6">
        <h3 className="text-xl font-bold text-gray-800 mb-2">
          {data?.groups.find(g => g.id === selectedGroup)?.name}
        </h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-2 mb-4">
          {data?.groups
            .find(g => g.id === selectedGroup)
            ?.teams.map((team, index) => (
              <div
                key={team}
                className="bg-gray-50 p-3 rounded-lg border text-center"
              >
                <span className="font-medium text-gray-800">{team}</span>
              </div>
            ))}
        </div>
      </div>

      {/* Matches Table */}
      <div className="overflow-x-auto rounded-lg border">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Date
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Match
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Venue
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Status
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {getGroupMatches().map(match => (
              <tr key={match.id} className="hover:bg-gray-50">
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="text-sm font-medium text-gray-900">
                    {formatDate(match.date)}
                  </div>
                </td>
                <td className="px-6 py-4">
                  <div className="flex items-center space-x-4">
                    <div className="flex-1 text-right">
                      <span className="font-medium">{match.team1}</span>
                    </div>
                    <div className="flex flex-col items-center">
                      <div className="px-3 py-1 bg-gray-100 rounded">
                        <span className="font-bold">vs</span>
                      </div>
                      <div className="text-xs text-gray-500 mt-1">Not played yet</div>
                    </div>
                    <div className="flex-1">
                      <span className="font-medium">{match.team2}</span>
                    </div>
                  </div>
                </td>
                <td className="px-6 py-4">
                  <div>
                    <div className="text-sm font-medium text-gray-900">{match.venue}</div>
                    <div className="text-sm text-gray-500">{match.city}</div>
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-yellow-100 text-yellow-800">
                    Scheduled
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Summary */}
      <div className="mt-6 p-4 bg-gray-50 rounded-lg">
        <div className="flex justify-between items-center">
          <div>
            <p className="text-sm text-gray-600">
              Total matches in {selectedGroup}: {getGroupMatches().length}
            </p>
            <p className="text-sm text-gray-600 mt-1">
              Tournament starts: {data?.tournamentStart ? formatDate(data.tournamentStart) : 'June 11, 2026'}
            </p>
          </div>
          <button
            onClick={fetchWorldCupData}
            className="px-4 py-2 text-sm bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition"
          >
            Refresh Data
          </button>
        </div>
      </div>
    </div>
  );
}