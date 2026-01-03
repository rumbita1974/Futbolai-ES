import GroupStageFixtures from '@/components/GroupStageFixtures';
import WorldCupCountdown from '@/components/WorldCupCountdown';

export default function WorldCupPage() {
  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-gray-900 mb-3">
            2026 FIFA World Cup
          </h1>
          <p className="text-gray-600 text-lg">
            Official group stage schedule with venues and dates
          </p>
        </div>

        {/* Countdown */}
        <div className="mb-10">
          <WorldCupCountdown />
        </div>

        {/* Quick Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-10">
          <div className="bg-white p-6 rounded-xl shadow">
            <div className="text-2xl font-bold text-blue-600">48</div>
            <div className="text-gray-700 font-medium">Teams</div>
            <div className="text-gray-500 text-sm mt-1">12 groups of 4 teams</div>
          </div>
          <div className="bg-white p-6 rounded-xl shadow">
            <div className="text-2xl font-bold text-green-600">72</div>
            <div className="text-gray-700 font-medium">Group Matches</div>
            <div className="text-gray-500 text-sm mt-1">June 11 - June 27, 2026</div>
          </div>
          <div className="bg-white p-6 rounded-xl shadow">
            <div className="text-2xl font-bold text-red-600">16</div>
            <div className="text-gray-700 font-medium">Host Cities</div>
            <div className="text-gray-500 text-sm mt-1">Across Canada, Mexico & USA</div>
          </div>
        </div>

        {/* Fixtures */}
        <div className="bg-white rounded-xl shadow-lg p-6">
          <h2 className="text-2xl font-bold text-gray-800 mb-2">Group Stage Fixtures</h2>
          <p className="text-gray-600 mb-6">All matches show "Not played yet" status as tournament hasn't started</p>
          <GroupStageFixtures />
        </div>

        {/* Note */}
        <div className="mt-8 p-4 bg-blue-50 rounded-lg border border-blue-200">
          <p className="text-blue-800 text-sm">
            ⚽ <span className="font-medium">Note:</span> This schedule reflects the official FIFA draw. 
            Playoff qualifiers (marked as Play-off 1, 2, etc.) will be determined in March 2026.
          </p>
        </div>
      </div>
    </div>
  );
}