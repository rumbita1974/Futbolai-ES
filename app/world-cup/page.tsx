'use client';

import { useSearchParams } from 'next/navigation';
import { useTranslation } from '@/hooks/useTranslation';
import GroupStageFixtures from '@/components/GroupStageFixtures';
import WorldCupCountdown from '@/components/WorldCupCountdown';

export default function WorldCupPage() {
  const searchParams = useSearchParams();
  const groupParam = searchParams.get('group');
  const { t, language } = useTranslation();  // ← ADD THIS LINE!

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-900 via-gray-800 to-black text-white">
      {/* Header Section - Mobile Optimized */}
      <div className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-r from-blue-900/20 via-green-900/10 to-transparent z-0" />

        <div className="relative z-10 max-w-7xl mx-auto px-4 py-6 sm:py-8 sm:px-6 lg:px-8">
          <div className="text-center">
            <h1 className="text-3xl sm:text-4xl md:text-5xl font-bold mb-3 sm:mb-4 bg-gradient-to-r from-blue-400 to-green-400 bg-clip-text text-transparent">
              {t('worldCup.title')}
            </h1>
            <p className="text-gray-300 text-sm sm:text-base md:text-lg max-w-2xl mx-auto">
              {t('worldCup.subtitle')}
            </p>

            {/* Group Navigation Hint */}
            {groupParam && (
              <div className="mt-4 inline-flex items-center px-4 py-2 bg-gradient-to-r from-blue-900/40 to-green-900/40 rounded-full border border-blue-700/30">
                <span className="text-sm text-blue-300">
                  {t('worldCup.viewingGroup')} {groupParam}
                </span>
              </div>
            )}
          </div>

          {/* Countdown - Mobile Responsive */}
          <div className="mt-6 sm:mt-8 mb-6 sm:mb-10">
            <WorldCupCountdown />
          </div>

          {/* Quick Stats - Mobile Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 sm:gap-4 mb-8 sm:mb-10">
            <div className="bg-gray-800/40 p-4 sm:p-5 rounded-xl border border-gray-700/50 backdrop-blur-sm">
              <div className="text-2xl sm:text-3xl font-bold text-blue-400">48</div>
              <div className="text-gray-200 font-medium text-sm sm:text-base">
                {t('worldCup.teams')}
              </div>
              <div className="text-gray-400 text-xs sm:text-sm mt-1">
                {t('worldCup.teamsDescription')}
              </div>
            </div>
            <div className="bg-gray-800/40 p-4 sm:p-5 rounded-xl border border-gray-700/50 backdrop-blur-sm">
              <div className="text-2xl sm:text-3xl font-bold text-green-400">72</div>
              <div className="text-gray-200 font-medium text-sm sm:text-base">
                {t('worldCup.groupMatches')}
              </div>
              <div className="text-gray-400 text-xs sm:text-sm mt-1">
                {t('worldCup.groupMatchesDates')}
              </div>
            </div>
            <div className="bg-gray-800/40 p-4 sm:p-5 rounded-xl border border-gray-700/50 backdrop-blur-sm">
              <div className="text-2xl sm:text-3xl font-bold text-red-400">16</div>
              <div className="text-gray-200 font-medium text-sm sm:text-base">
                {t('worldCup.hostCities')}
              </div>
              <div className="text-gray-400 text-xs sm:text-sm mt-1">
                {t('worldCup.hostCitiesDescription')}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 pb-20 sm:px-6 lg:px-8">
        {/* Fixtures Section - Mobile Optimized */}
        <div className="bg-gray-900/30 rounded-2xl p-4 sm:p-6 border border-gray-800 backdrop-blur-sm">
          <div className="mb-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-4">
              <div>
                <h2 className="text-xl sm:text-2xl font-bold text-white mb-1">
                  {t('worldCup.fixturesTitle')}
                </h2>
                <p className="text-gray-400 text-sm sm:text-base">
                  {t('worldCup.fixturesDescription')}
                </p>
              </div>
              <div className="flex items-center">
                <span className="text-xs text-gray-400 bg-gray-800/50 px-3 py-1.5 rounded-full">
                  {t('worldCup.tapHint')}
                </span>
              </div>
            </div>
          </div>

          {/* GroupStageFixtures Component with default group */}
          <GroupStageFixtures defaultGroup={groupParam || 'A'} />
        </div>

        {/* Tournament Info - Mobile Stacked */}
        <div className="mt-6 sm:mt-8 grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
          {/* Tournament Format */}
          <div className="bg-gradient-to-br from-blue-900/20 to-transparent rounded-xl p-4 sm:p-5 border border-blue-800/30">
            <h3 className="text-lg sm:text-xl font-bold text-blue-300 mb-3 flex items-center">
              <span className="mr-2">⚽</span> {t('worldCup.tournamentFormat')}
            </h3>
            <ul className="space-y-2 sm:space-y-3">
              <li className="flex items-start">
                <div className="w-2 h-2 bg-green-500 rounded-full mt-2 mr-3 flex-shrink-0" />
                <span className="text-gray-300 text-sm sm:text-base">
                  <span className="font-medium">{t('worldCup.groupStage')}:</span> {t('worldCup.groupStageDescription')}
                </span>
              </li>
              <li className="flex items-start">
                <div className="w-2 h-2 bg-yellow-500 rounded-full mt-2 mr-3 flex-shrink-0" />
                <span className="text-gray-300 text-sm sm:text-base">
                  <span className="font-medium">{t('worldCup.knockoutRound')}:</span> {t('worldCup.knockoutDescription')}
                </span>
              </li>
              <li className="flex items-start">
                <div className="w-2 h-2 bg-red-500 rounded-full mt-2 mr-3 flex-shrink-0" />
                <span className="text-gray-300 text-sm sm:text-base">
                  <span className="font-medium">{t('worldCup.final')}:</span> {t('worldCup.finalDescription')}
                </span>
              </li>
            </ul>
          </div>

          {/* Host Nations */}
          <div className="bg-gradient-to-br from-green-900/20 to-transparent rounded-xl p-4 sm:p-5 border border-green-800/30">
            <h3 className="text-lg sm:text-xl font-bold text-green-300 mb-3 flex items-center">
              <span className="mr-2">🏟️</span> {t('worldCup.hostNations')}
            </h3>
            <div className="grid grid-cols-3 gap-3 sm:gap-4">
              <div className="text-center p-3 bg-gray-800/30 rounded-lg">
                <div className="text-blue-400 font-bold text-lg sm:text-xl">USA</div>
                <div className="text-gray-300 text-xs sm:text-sm">{t('worldCup.usaCities')}</div>
                <div className="text-gray-400 text-xs mt-1">{t('worldCup.usaMatches')}</div>
              </div>
              <div className="text-center p-3 bg-gray-800/30 rounded-lg">
                <div className="text-green-400 font-bold text-lg sm:text-xl">Canada</div>
                <div className="text-gray-300 text-xs sm:text-sm">{t('worldCup.canadaCities')}</div>
                <div className="text-gray-400 text-xs mt-1">{t('worldCup.canadaMatches')}</div>
              </div>
              <div className="text-center p-3 bg-gray-800/30 rounded-lg">
                <div className="text-red-400 font-bold text-lg sm:text-xl">Mexico</div>
                <div className="text-gray-300 text-xs sm:text-sm">{t('worldCup.mexicoCities')}</div>
                <div className="text-gray-400 text-xs mt-1">{t('worldCup.mexicoMatches')}</div>
              </div>
            </div>
          </div>
        </div>

        {/* Note Section - Mobile Responsive */}
        <div className="mt-6 sm:mt-8 p-4 sm:p-5 bg-blue-900/20 rounded-xl border border-blue-800/30">
          <p className="text-blue-300 text-sm sm:text-base">
            <span className="font-bold">ℹ️ {t('worldCup.note')}:</span> {t('worldCup.noteDescription')}
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            <span className="px-3 py-1 bg-gray-800/50 rounded-full text-xs text-gray-300">
              {t('worldCup.tag1')}
            </span>
            <span className="px-3 py-1 bg-gray-800/50 rounded-full text-xs text-gray-300">
              {t('worldCup.tag2')}
            </span>
            <span className="px-3 py-1 bg-gray-800/50 rounded-full text-xs text-gray-300">
              {t('worldCup.tag3')}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}