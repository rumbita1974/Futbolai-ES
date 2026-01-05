"use client";

import { useState, useEffect } from "react";

interface Match {
  id: number;
  date: string;
  group: string;
  team1: string;
  team2: string;
  venue: string;
  city: string;
  status: "scheduled" | "live" | "completed";
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
  const [selectedGroup, setSelectedGroup] = useState<string>("A");

  useEffect(() => {
    fetchWorldCupData();
  }, []);

  const fetchWorldCupData = async () => {
    try {
      setLoading(true);
      const response = await fetch("/api/worldcup");
      if (!response.ok)
        throw new Error(`HTTP error! status: ${response.status}`);
      const result = await response.json();

      if (!result.success) {
        throw new Error(result.error || "Failed to fetch data");
      }

      console.log("Fetched World Cup data:", result);
      setData(result);
    } catch (err) {
      console.error("Error fetching World Cup data:", err);
      setError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString: string) => {
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString("en-US", {
        weekday: "short",
        month: "short",
        day: "numeric",
        year: "numeric",
      });
    } catch (e) {
      return dateString;
    }
  };

  const getGroupMatches = () => {
    if (!data) return [];
    const group = data.groups.find((g) => g.id === selectedGroup);
    return group ? group.matches : [];
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-[300px] md:min-h-[400px]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-300 text-sm md:text-base">
            Loading World Cup fixtures...
          </p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-900/20 border border-red-700/50 rounded-xl p-4 md:p-6 text-center">
        <h3 className="text-red-300 font-semibold text-lg md:text-xl">
          Error loading fixtures
        </h3>
        <p className="text-red-400/80 mt-2 text-sm md:text-base">{error}</p>
        <button
          onClick={fetchWorldCupData}
          className="mt-4 px-4 py-2 bg-red-700/80 text-white rounded-lg hover:bg-red-600 transition text-sm md:text-base"
        >
          Retry
        </button>
      </div>
    );
  }

  if (!data || !data.groups || data.groups.length === 0) {
    return (
      <div className="bg-yellow-900/20 border border-yellow-700/50 rounded-xl p-4 md:p-6 text-center">
        <h3 className="text-yellow-300 font-semibold text-lg md:text-xl">
          No data available
        </h3>
        <p className="text-yellow-400/80 mt-2 text-sm md:text-base">
          Failed to load World Cup fixtures data.
        </p>
        <button
          onClick={fetchWorldCupData}
          className="mt-4 px-4 py-2 bg-yellow-700/80 text-white rounded-lg hover:bg-yellow-600 transition text-sm md:text-base"
        >
          Try Again
        </button>
      </div>
    );
  }

  return (
    <div className="bg-gray-900/40 rounded-2xl p-4 md:p-6 border border-gray-800">
      <div className="mb-6 md:mb-8">
        <h2 className="text-xl md:text-2xl font-bold text-white mb-2">
          2026 FIFA World Cup Group Stage
        </h2>
        <p className="text-gray-400 text-sm md:text-base">
          Official match schedule with venues and dates
        </p>
        <div className="mt-4 p-3 bg-blue-900/20 rounded-lg border border-blue-800/30">
          <p className="text-blue-300 text-sm md:text-base">
            <span className="font-semibold">Status:</span> All matches are
            scheduled. Tournament starts June 11, 2026.
          </p>
        </div>
      </div>

      {/* Group Selector - Mobile Scrollable */}
      <div className="mb-6 md:mb-8">
        <h3 className="text-base md:text-lg font-semibold text-gray-300 mb-3">
          Select Group
        </h3>
        <div className="flex flex-nowrap gap-2 overflow-x-auto pb-2 -mx-1 px-1">
          {data.groups.map((group) => (
            <button
              key={group.id}
              onClick={() => setSelectedGroup(group.id)}
              className={`px-4 py-2 rounded-lg transition font-medium whitespace-nowrap flex-shrink-0 ${
                selectedGroup === group.id
                  ? "bg-gradient-to-r from-blue-600 to-green-500 text-white shadow-lg"
                  : "bg-gray-800/60 text-gray-300 hover:bg-gray-700/60"
              }`}
            >
              {group.name}
            </button>
          ))}
        </div>
      </div>

      {/* Group Teams - Mobile Grid */}
      <div className="mb-6">
        <h3 className="text-lg md:text-xl font-bold text-white mb-3">
          {data.groups.find((g) => g.id === selectedGroup)?.name}
        </h3>
        <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-4 gap-2 mb-4">
          {data.groups
            .find((g) => g.id === selectedGroup)
            ?.teams.map((team, index) => (
              <div
                key={team}
                className="bg-gray-800/30 p-3 rounded-xl border border-gray-700/50 text-center hover:bg-gray-700/40 transition"
              >
                <span className="font-medium text-white text-sm md:text-base">
                  {team}
                </span>
              </div>
            ))}
        </div>
      </div>

      {/* Matches Table - Mobile Scrollable */}
      <div className="overflow-x-auto rounded-xl border border-gray-800 -mx-2 px-2">
        <table className="min-w-full divide-y divide-gray-800">
          <thead className="bg-gray-900/60">
            <tr>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                Date
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                Match
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                Venue
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                Status
              </th>
            </tr>
          </thead>
          <tbody className="bg-gray-900/30 divide-y divide-gray-800">
            {getGroupMatches().map((match) => (
              <tr key={match.id} className="hover:bg-gray-800/40 transition">
                <td className="px-4 py-3 whitespace-nowrap">
                  <div className="text-xs md:text-sm font-medium text-white">
                    {formatDate(match.date)}
                  </div>
                </td>
                <td className="px-4 py-3">
                  <div className="flex items-center space-x-2 md:space-x-4">
                    <div className="flex-1 text-right">
                      <span className="font-bold text-white text-sm md:text-base">
                        {match.team1}
                      </span>
                    </div>
                    <div className="flex flex-col items-center min-w-[60px] md:min-w-[80px]">
                      <div className="px-2 md:px-3 py-1 bg-gray-800/50 rounded-lg">
                        <span className="font-bold text-gray-300 text-xs md:text-sm">
                          VS
                        </span>
                      </div>
                      <div className="text-xs text-gray-500 mt-1 hidden md:block">
                        Not played yet
                      </div>
                    </div>
                    <div className="flex-1">
                      <span className="font-bold text-white text-sm md:text-base">
                        {match.team2}
                      </span>
                    </div>
                  </div>
                </td>
                <td className="px-4 py-3">
                  <div>
                    <div className="text-xs md:text-sm font-medium text-white">
                      {match.venue}
                    </div>
                    <div className="text-xs text-gray-400">{match.city}</div>
                  </div>
                </td>
                <td className="px-4 py-3 whitespace-nowrap">
                  <span className="inline-flex items-center px-2 md:px-3 py-1 rounded-full text-xs font-medium bg-yellow-900/30 text-yellow-300 border border-yellow-800/50">
                    <span className="w-2 h-2 bg-yellow-500 rounded-full mr-1 md:mr-2"></span>
                    Scheduled
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Footer Info - Mobile Stacked */}
      <div className="mt-6 p-4 bg-gray-800/30 rounded-xl border border-gray-700/50">
        <div className="flex flex-col md:flex-row md:justify-between md:items-center gap-4">
          <div>
            <p className="text-xs md:text-sm text-gray-400">
              <span className="font-medium text-gray-300">
                Total matches in {selectedGroup}:
              </span>{" "}
              {getGroupMatches().length}
            </p>
            <p className="text-xs md:text-sm text-gray-400 mt-1">
              <span className="font-medium text-gray-300">Tournament starts:</span>{" "}
              {formatDate(data.tournamentStart)}
            </p>
          </div>
          <div className="flex gap-2">
            <button
              onClick={fetchWorldCupData}
              className="px-3 md:px-4 py-2 text-xs md:text-sm bg-gray-800/60 text-gray-300 rounded-lg hover:bg-gray-700/60 transition font-medium"
            >
              Refresh Data
            </button>
            <a
              href="/api/worldcup"
              target="_blank"
              className="px-3 md:px-4 py-2 text-xs md:text-sm bg-gradient-to-r from-blue-600 to-green-500 text-white rounded-lg hover:opacity-90 transition font-medium"
            >
              View API Data
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}