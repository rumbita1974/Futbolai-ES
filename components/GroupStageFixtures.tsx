import React from 'react';
import { Trophy, Users, Flag } from 'lucide-react';

interface Team {
  name: string;
  fifaCode: string;
  flagEmoji: string;
  qualified: boolean;
  previousAppearances?: number;
  bestResult?: string;
  group: string;
}

interface Group {
  name: string;
  teams: Team[];
}

interface GroupStageFixturesProps {
  groups: Group[];
  onTeamClick: (teamName: string) => void;
}

const GroupStageFixtures: React.FC<GroupStageFixturesProps> = ({ groups, onTeamClick }) => {
  if (!groups || groups.length === 0) {
    return (
      <div className="text-center py-12">
        <Trophy className="w-16 h-16 text-gray-300 mx-auto mb-4" />
        <h3 className="text-xl font-semibold text-gray-600 mb-2">Groups Being Finalized</h3>
        <p className="text-gray-500">2026 World Cup groups will be determined after qualification.</p>
      </div>
    );
  }

  return (
    <div>
      <div className="mb-6">
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-lg font-semibold text-gray-700">2026 World Cup Groups</h3>
          <div className="flex items-center gap-4 text-sm">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 bg-green-500 rounded-full"></div>
              <span className="text-gray-600">Qualified</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 bg-yellow-500 rounded-full"></div>
              <span className="text-gray-600">Not Qualified</span>
            </div>
          </div>
        </div>
        <p className="text-gray-500 text-sm">12 groups with 4 teams each (Groups A-L)</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {groups.map((group) => (
          <div 
            key={group.name}
            className="border border-gray-200 rounded-xl p-5 bg-white hover:shadow-md transition-shadow"
          >
            <div className="flex items-center justify-between mb-4">
              <h4 className="text-xl font-bold text-gray-800">{group.name}</h4>
              <div className="flex items-center gap-2 text-gray-500">
                <Users className="w-4 h-4" />
                <span className="text-sm">
                  {group.teams.filter(t => t.qualified).length}/4 qualified
                </span>
              </div>
            </div>

            <div className="space-y-3">
              {group.teams.map((team, index) => (
                <div
                  key={`${group.name}-${team.fifaCode}-${index}`}
                  onClick={() => onTeamClick(team.name)}
                  className={`flex items-center justify-between p-3 rounded-lg cursor-pointer transition-all hover:bg-gray-50 ${
                    team.qualified ? 'bg-green-50 border border-green-100' : 'bg-gray-50 border border-gray-100'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div className="text-2xl">
                      {team.flagEmoji || <Flag className="w-6 h-6 text-gray-400" />}
                    </div>
                    <div>
                      <div className="font-semibold text-gray-800">{team.name}</div>
                      <div className="flex items-center gap-2 text-sm">
                        <span className="text-gray-600">{team.fifaCode}</span>
                        {team.previousAppearances && (
                          <span className="text-blue-600">
                            {team.previousAppearances} appearances
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex flex-col items-end">
                    <div className={`w-3 h-3 rounded-full ${team.qualified ? 'bg-green-500' : 'bg-yellow-500'}`}></div>
                    {team.bestResult && (
                      <div className="text-xs text-gray-500 mt-1 text-right">
                        Best: {team.bestResult}
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>

            {group.name === 'Group A' && (
              <div className="mt-4 pt-4 border-t border-gray-200">
                <p className="text-xs text-gray-500">
                  <strong>Note:</strong> Group A includes host countries USA, Canada, and Mexico
                </p>
              </div>
            )}
          </div>
        ))}
      </div>

      <div className="mt-8 bg-gray-50 rounded-xl p-6">
        <h4 className="text-lg font-semibold text-gray-800 mb-3">Tournament Format</h4>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-white p-4 rounded-lg border">
            <div className="text-blue-600 font-semibold">48 Teams</div>
            <div className="text-gray-600 text-sm">Expanded from 32 teams</div>
          </div>
          <div className="bg-white p-4 rounded-lg border">
            <div className="text-green-600 font-semibold">12 Groups</div>
            <div className="text-gray-600 text-sm">4 teams each (A-L)</div>
          </div>
          <div className="bg-white p-4 rounded-lg border">
            <div className="text-purple-600 font-semibold">Top 32 Advance</div>
            <div className="text-gray-600 text-sm">Top 2 from each group + 8 best 3rd</div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default GroupStageFixtures;