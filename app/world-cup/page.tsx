'use client';
import WorldCupCountdown from '@/components/WorldCupCountdown';
import GroupStageFixtures from '@/components/GroupStageFixtures';
import { useTranslation } from '@/hooks/useTranslation';

export default function WorldCupPage() {
  const { t } = useTranslation();

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-900 via-gray-800 to-black text-white pb-16 md:pb-0">
      {/* Hero Section */}
      <div className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-r from-blue-900/30 via-transparent to-green-900/30"></div>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 md:py-20 relative">
          <div className="text-center">
            <h1 className="text-4xl md:text-6xl font-bold mb-4">
              <span className="bg-gradient-to-r from-blue-400 to-green-400 bg-clip-text text-transparent">
                {t('worldCup.title')}
              </span>
            </h1>
            <p className="text-xl md:text-2xl text-gray-300 mb-8 max-w-3xl mx-auto">
              {t('worldCup.subtitle')}
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
                  {t('worldCup.groupMatches')}
                </h2>
              </div>
              <p className="text-gray-300 mb-4">
                {t('worldCup.groupMatchesDates')}
              </p>
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-400">{t('worldCup.teams')}</p>
                  <p className="text-2xl font-bold text-white">48</p>
                </div>
                <div>
                  <p className="text-sm text-gray-400">{t('worldCup.groupMatches')}</p>
                  <p className="text-2xl font-bold text-white">72</p>
                </div>
                <div>
                  <p className="text-sm text-gray-400">{t('worldCup.hostCities')}</p>
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
                  {t('worldCup.teams')}
                </h2>
              </div>
              <p className="text-gray-400 mb-4">
                {t('worldCup.teamsDescription')}
              </p>
              <div className="grid grid-cols-3 gap-2 mb-4">
                {['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J', 'K', 'L'].map((group) => (
                  <div key={group} className="bg-gray-800/50 rounded-lg p-3 text-center">
                    <span className="text-lg font-bold text-white">Group {group}</span>
                    <p className="text-xs text-gray-400 mt-1">4 {t('worldCup.teams').toLowerCase()}</p>
                  </div>
                ))}
              </div>
              <p className="text-sm text-gray-500">
                {t('worldCup.viewingGroup')}: <span className="text-blue-400 font-medium">A</span>
              </p>
            </div>

            {/* Tournament Format */}
            <div className="bg-gradient-to-br from-purple-900/20 to-pink-900/20 rounded-2xl p-6 border border-purple-800/30">
              <h2 className="text-xl font-bold text-white mb-4">
                {t('worldCup.tournamentFormat')}
              </h2>
              <div className="space-y-4">
                <div className="bg-gray-900/40 rounded-xl p-4">
                  <h3 className="font-bold text-white mb-1">
                    {t('worldCup.groupStage')}
                  </h3>
                  <p className="text-gray-400 text-sm">
                    {t('worldCup.groupStageDescription')}
                  </p>
                </div>
                <div className="bg-gray-900/40 rounded-xl p-4">
                  <h3 className="font-bold text-white mb-1">
                    {t('worldCup.knockoutRound')}
                  </h3>
                  <p className="text-gray-400 text-sm">
                    {t('worldCup.knockoutDescription')}
                  </p>
                </div>
                <div className="bg-gray-900/40 rounded-xl p-4">
                  <h3 className="font-bold text-white mb-1">
                    {t('worldCup.final')}
                  </h3>
                  <p className="text-gray-400 text-sm">
                    {t('worldCup.finalDescription')}
                  </p>
                </div>
              </div>
            </div>

            {/* Host Nations */}
            <div className="bg-gradient-to-br from-yellow-900/20 to-red-900/20 rounded-2xl p-6 border border-yellow-800/30">
              <h2 className="text-xl font-bold text-white mb-6">
                {t('worldCup.hostNations')}
              </h2>
              <div className="space-y-6">
                <div className="flex items-center">
                  <div className="w-12 h-12 bg-gradient-to-r from-blue-600 to-white rounded-full flex items-center justify-center mr-4">
                    <span className="text-2xl">🇺🇸</span>
                  </div>
                  <div className="flex-1">
                    <h3 className="font-bold text-white">United States</h3>
                    <div className="flex justify-between text-sm text-gray-400">
                      <span>{t('worldCup.usaCities')}</span>
                      <span>{t('worldCup.usaMatches')}</span>
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
                      <span>{t('worldCup.canadaCities')}</span>
                      <span>{t('worldCup.canadaMatches')}</span>
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
                      <span>{t('worldCup.mexicoCities')}</span>
                      <span>{t('worldCup.mexicoMatches')}</span>
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
                    {t('worldCup.note')}
                  </h3>
                  <p className="text-gray-400 text-sm">
                    {t('worldCup.noteDescription')}
                  </p>
                </div>
              </div>
            </div>

            {/* Tags */}
            <div className="flex flex-wrap gap-2">
              <span className="px-3 py-1.5 bg-blue-900/30 text-blue-300 rounded-full text-sm font-medium border border-blue-800/50">
                {t('worldCup.tag1')}
              </span>
              <span className="px-3 py-1.5 bg-green-900/30 text-green-300 rounded-full text-sm font-medium border border-green-800/50">
                {t('worldCup.tag2')}
              </span>
              <span className="px-3 py-1.5 bg-purple-900/30 text-purple-300 rounded-full text-sm font-medium border border-purple-800/50">
                {t('worldCup.tag3')}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}