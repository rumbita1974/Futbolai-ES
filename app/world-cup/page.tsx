'use client';
import WorldCupCountdown from '@/components/WorldCupCountdown';
import GroupStageFixtures from '@/components/GroupStageFixtures';
import { useTranslation } from '@/hooks/useTranslation';

export default function WorldCupPage() {
  const { t } = useTranslation();

  // Helper function to safely get translations with fallbacks
  const getTranslation = (key: string): string => {
    const translation = t(`worldCup.${key}`);
    // Return translation if found, otherwise return a reasonable default
    return translation && translation !== `worldCup.${key}` ? translation : getDefaultTranslation(key);
  };

  // Default English translations as fallback
  const getDefaultTranslation = (key: string): string => {
    const defaults: Record<string, string> = {
      'title': 'FIFA World Cup 2026',
      'subtitle': 'The biggest football tournament in North America',
      'groupMatches': 'Group Stage Matches',
      'groupMatchesDates': 'June 11 - July 2, 2026',
      'teams': 'Teams',
      'hostCities': 'Host Cities',
      'teamsDescription': '48 teams from around the world',
      'viewingGroup': 'Currently viewing group',
      'tournamentFormat': 'Tournament Format',
      'groupStage': 'Group Stage',
      'groupStageDescription': '12 groups of 4 teams each, top 2 advance',
      'knockoutRound': 'Knockout Round',
      'knockoutDescription': 'Round of 32 to the Final',
      'final': 'Final',
      'finalDescription': 'July 19, 2026 at MetLife Stadium',
      'hostNations': 'Host Nations',
      'usaCities': '11 cities',
      'usaMatches': '60 matches',
      'canadaCities': '3 cities',
      'canadaMatches': '13 matches',
      'mexicoCities': '3 cities',
      'mexicoMatches': '13 matches',
      'note': 'Information',
      'noteDescription': 'Schedule and teams subject to change. Last updated: December 2024',
      'tag1': 'North America',
      'tag2': '48 Teams',
      'tag3': '16 Cities'
    };
    return defaults[key] || key;
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-900 via-gray-800 to-black text-white pb-16 md:pb-0">
      {/* Hero Section */}
      <div className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-r from-blue-900/30 via-transparent to-green-900/30"></div>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 md:py-20 relative">
          <div className="text-center">
            <h1 className="text-4xl md:text-6xl font-bold mb-4">
              <span className="bg-gradient-to-r from-blue-400 to-green-400 bg-clip-text text-transparent">
                {getTranslation('title')}
              </span>
            </h1>
            <p className="text-xl md:text-2xl text-gray-300 mb-8 max-w-3xl mx-auto">
              {getTranslation('subtitle')}
            </p>
            
            {/* World Cup Countdown */}
            <div className="mb-12">
              <WorldCupCountdown />
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-12">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Left Column - Fixtures */}
          <div className="lg:col-span-2">
            <GroupStageFixtures />
          </div>

          {/* Right Column - Info Cards */}
          <div className="space-y-8">
            {/* Calendar Card */}
            <div className="bg-gradient-to-br from-blue-900/20 to-green-900/20 rounded-2xl p-6 border border-blue-800/30">
              <div className="flex items-center mb-4">
                <div className="w-10 h-10 bg-gradient-to-r from-blue-500 to-green-500 rounded-xl flex items-center justify-center mr-3">
                  <span className="text-xl">📅</span>
                </div>
                <h2 className="text-xl font-bold text-white">
                  {getTranslation('groupMatches')}
                </h2>
              </div>
              <p className="text-gray-300 mb-4">
                {getTranslation('groupMatchesDates')}
              </p>
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-400">{getTranslation('teams')}</p>
                  <p className="text-2xl font-bold text-white">48</p>
                </div>
                <div>
                  <p className="text-sm text-gray-400">{getTranslation('groupMatches')}</p>
                  <p className="text-2xl font-bold text-white">72</p>
                </div>
                <div>
                  <p className="text-sm text-gray-400">{getTranslation('hostCities')}</p>
                  <p className="text-2xl font-bold text-white">16</p>
                </div>
              </div>
            </div>

            {/* Groups Overview */}
            <div className="bg-gray-900/40 rounded-2xl p-6 border border-gray-800">
              <div className="flex items-center mb-4">
                <div className="w-10 h-10 bg-gradient-to-r from-purple-500 to-pink-500 rounded-xl flex items-center justify-center mr-3">
                  <span className="text-xl">🏆</span>
                </div>
                <h2 className="text-xl font-bold text-white">
                  {getTranslation('teams')}
                </h2>
              </div>
              <p className="text-gray-400 mb-4">
                {getTranslation('teamsDescription')}
              </p>
              <div className="grid grid-cols-3 gap-2 mb-4">
                {['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J', 'K', 'L'].map((group) => (
                  <div key={group} className="bg-gray-800/50 rounded-lg p-3 text-center">
                    <span className="text-lg font-bold text-white">Group {group}</span>
                    <p className="text-xs text-gray-400 mt-1">4 {getTranslation('teams').toLowerCase()}</p>
                  </div>
                ))}
              </div>
              <p className="text-sm text-gray-500">
                {getTranslation('viewingGroup')}: <span className="text-blue-400 font-medium">A</span>
              </p>
            </div>

            {/* Tournament Format */}
            <div className="bg-gradient-to-br from-purple-900/20 to-pink-900/20 rounded-2xl p-6 border border-purple-800/30">
              <h2 className="text-xl font-bold text-white mb-4">
                {getTranslation('tournamentFormat')}
              </h2>
              <div className="space-y-4">
                <div className="bg-gray-900/40 rounded-xl p-4">
                  <h3 className="font-bold text-white mb-1">
                    {getTranslation('groupStage')}
                  </h3>
                  <p className="text-gray-400 text-sm">
                    {getTranslation('groupStageDescription')}
                  </p>
                </div>
                <div className="bg-gray-900/40 rounded-xl p-4">
                  <h3 className="font-bold text-white mb-1">
                    {getTranslation('knockoutRound')}
                  </h3>
                  <p className="text-gray-400 text-sm">
                    {getTranslation('knockoutDescription')}
                  </p>
                </div>
                <div className="bg-gray-900/40 rounded-xl p-4">
                  <h3 className="font-bold text-white mb-1">
                    {getTranslation('final')}
                  </h3>
                  <p className="text-gray-400 text-sm">
                    {getTranslation('finalDescription')}
                  </p>
                </div>
              </div>
            </div>

            {/* Host Nations */}
            <div className="bg-gradient-to-br from-yellow-900/20 to-red-900/20 rounded-2xl p-6 border border-yellow-800/30">
              <h2 className="text-xl font-bold text-white mb-6">
                {getTranslation('hostNations')}
              </h2>
              <div className="space-y-6">
                <div className="flex items-center">
                  <div className="w-12 h-12 bg-gradient-to-r from-blue-600 to-white rounded-full flex items-center justify-center mr-4">
                    <span className="text-2xl">🇺🇸</span>
                  </div>
                  <div className="flex-1">
                    <h3 className="font-bold text-white">United States</h3>
                    <div className="flex justify-between text-sm text-gray-400">
                      <span>{getTranslation('usaCities')}</span>
                      <span>{getTranslation('usaMatches')}</span>
                    </div>
                  </div>
                </div>
                <div className="flex items-center">
                  <div className="w-12 h-12 bg-gradient-to-r from-red-600 to-white rounded-full flex items-center justify-center mr-4">
                    <span className="text-2xl">🇨🇦</span>
                  </div>
                  <div className="flex-1">
                    <h3 className="font-bold text-white">Canada</h3>
                    <div className="flex justify-between text-sm text-gray-400">
                      <span>{getTranslation('canadaCities')}</span>
                      <span>{getTranslation('canadaMatches')}</span>
                    </div>
                  </div>
                </div>
                <div className="flex items-center">
                  <div className="w-12 h-12 bg-gradient-to-r from-green-600 to-white rounded-full flex items-center justify-center mr-4">
                    <span className="text-2xl">🇲🇽</span>
                  </div>
                  <div className="flex-1">
                    <h3 className="font-bold text-white">Mexico</h3>
                    <div className="flex justify-between text-sm text-gray-400">
                      <span>{getTranslation('mexicoCities')}</span>
                      <span>{getTranslation('mexicoMatches')}</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Note Card */}
            <div className="bg-gradient-to-br from-gray-800 to-gray-900 rounded-2xl p-6 border border-gray-700">
              <div className="flex items-start">
                <div className="w-10 h-10 bg-yellow-500/20 rounded-xl flex items-center justify-center mr-3 flex-shrink-0">
                  <span className="text-xl text-yellow-400">ℹ️</span>
                </div>
                <div>
                  <h3 className="font-bold text-white mb-2">
                    {getTranslation('note')}
                  </h3>
                  <p className="text-gray-400 text-sm">
                    {getTranslation('noteDescription')}
                  </p>
                </div>
              </div>
            </div>

            {/* Tags */}
            <div className="flex flex-wrap gap-2">
              <span className="px-3 py-1.5 bg-blue-900/30 text-blue-300 rounded-full text-sm font-medium border border-blue-800/50">
                {getTranslation('tag1')}
              </span>
              <span className="px-3 py-1.5 bg-green-900/30 text-green-300 rounded-full text-sm font-medium border border-green-800/50">
                {getTranslation('tag2')}
              </span>
              <span className="px-3 py-1.5 bg-purple-900/30 text-purple-300 rounded-full text-sm font-medium border border-purple-800/50">
                {getTranslation('tag3')}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}