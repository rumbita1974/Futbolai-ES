'use client';
import { useTranslation } from '@/hooks/useTranslation';

export default function PlayersPage() {
  const { t } = useTranslation();

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-900 via-gray-800 to-black text-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 md:py-20">
        <div className="text-center">
          <h1 className="text-4xl md:text-6xl font-bold mb-4">
            <span className="bg-gradient-to-r from-blue-400 to-green-400 bg-clip-text text-transparent">
              {t('players.title')}
            </span>
          </h1>
          <p className="text-xl md:text-2xl text-gray-300 mb-8 max-w-3xl mx-auto">
            {t('players.subtitle')}
          </p>
          <div className="bg-gray-900/40 rounded-2xl p-8 border border-gray-800 max-w-3xl mx-auto">
            <p className="text-xl text-gray-300 mb-4">
              {t('players.comingSoon')}
            </p>
            <p className="text-gray-400">
              {t('players.description')}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}