"use client";

import { useEffect, useState } from "react";
import { useTranslation } from "@/hooks/useTranslation";

export default function WorldCupCountdown() {
  const [timeLeft, setTimeLeft] = useState({
    days: 0,
    hours: 0,
    minutes: 0,
    seconds: 0,
  });

  const { t, language } = useTranslation();

  useEffect(() => {
    // Tournament starts June 11, 2026 at 5 PM UTC
    const tournamentStart = new Date("2026-06-11T17:00:00Z").getTime();

    const updateCountdown = () => {
      const now = new Date().getTime();
      const difference = tournamentStart - now;

      if (difference > 0) {
        setTimeLeft({
          days: Math.floor(difference / (1000 * 60 * 60 * 24)),
          hours: Math.floor(
            (difference % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60)
          ),
          minutes: Math.floor((difference % (1000 * 60 * 60)) / (1000 * 60)),
          seconds: Math.floor((difference % (1000 * 60)) / 1000),
        });
      } else {
        // Tournament has started
        setTimeLeft({ days: 0, hours: 0, minutes: 0, seconds: 0 });
      }
    };

    updateCountdown();
    const intervalId = setInterval(updateCountdown, 1000);

    return () => clearInterval(intervalId);
  }, []);

  // Format date based on language
  const formatDate = (dateString: string) => {
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString(language === 'es' ? 'es-ES' : 'en-US', {
        month: "long",
        day: "numeric",
        year: "numeric",
      });
    } catch (e) {
      return dateString;
    }
  };

  return (
    <div className="w-full bg-gradient-to-r from-blue-900/80 to-green-800/80 rounded-2xl p-4 sm:p-6 shadow-2xl border border-blue-700/30">
      <div className="text-center mb-4 sm:mb-6">
        <h2 className="text-xl sm:text-2xl md:text-3xl font-bold text-white mb-2">
          {t('worldCupCountdown.title')}
        </h2>
        <p className="text-blue-200 text-sm sm:text-base">
          {t('worldCupCountdown.tournamentStarts')}: {formatDate("2026-06-11")}
        </p>
        <p className="text-blue-100 text-xs sm:text-sm mt-1">
          {t('worldCupCountdown.openingMatch')}
        </p>
      </div>

      {/* Countdown Grid - Mobile Stacked */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-3 md:gap-4 mb-4 sm:mb-6">
        <div className="bg-white/10 backdrop-blur-sm rounded-xl p-3 sm:p-4 text-center">
          <div className="text-2xl sm:text-3xl md:text-4xl font-bold text-white">
            {String(timeLeft.days).padStart(2, "0")}
          </div>
          <div className="text-blue-100 font-medium mt-1 text-xs sm:text-sm">
            {t('worldCupCountdown.days')}
          </div>
        </div>
        <div className="bg-white/10 backdrop-blur-sm rounded-xl p-3 sm:p-4 text-center">
          <div className="text-2xl sm:text-3xl md:text-4xl font-bold text-white">
            {String(timeLeft.hours).padStart(2, "0")}
          </div>
          <div className="text-blue-100 font-medium mt-1 text-xs sm:text-sm">
            {t('worldCupCountdown.hours')}
          </div>
        </div>
        <div className="bg-white/10 backdrop-blur-sm rounded-xl p-3 sm:p-4 text-center">
          <div className="text-2xl sm:text-3xl md:text-4xl font-bold text-white">
            {String(timeLeft.minutes).padStart(2, "0")}
          </div>
          <div className="text-blue-100 font-medium mt-1 text-xs sm:text-sm">
            {t('worldCupCountdown.minutes')}
          </div>
        </div>
        <div className="bg-white/10 backdrop-blur-sm rounded-xl p-3 sm:p-4 text-center">
          <div className="text-2xl sm:text-3xl md:text-4xl font-bold text-white">
            {String(timeLeft.seconds).padStart(2, "0")}
          </div>
          <div className="text-blue-100 font-medium mt-1 text-xs sm:text-sm">
            {t('worldCupCountdown.seconds')}
          </div>
        </div>
      </div>

      {/* Opening Match Info - Mobile Stacked */}
      <div className="border-t border-white/20 pt-3 sm:pt-4">
        <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3 sm:gap-0">
          <div className="text-white">
            <div className="font-semibold text-sm sm:text-base">
              {t('worldCupCountdown.openingMatchTitle')}
            </div>
            <div className="text-xs sm:text-sm text-blue-100">
              {t('worldCupCountdown.groupA')} • {formatDate("2026-06-11")}
            </div>
          </div>
          <div className="text-left sm:text-right">
            <div className="text-white font-medium text-sm sm:text-base">
              {t('worldCupCountdown.teams')}
            </div>
            <div className="text-xs sm:text-sm text-blue-100">
              {t('worldCupCountdown.venue')}
            </div>
          </div>
        </div>

        {/* Progress Bar - Mobile */}
        <div className="mt-4">
          <div className="flex justify-between text-xs sm:text-sm text-white/80 mb-1">
            <span>{t('worldCupCountdown.timeToKickoff')}</span>
            <span>
              {timeLeft.days}{t('worldCupCountdown.daysShort')} {timeLeft.hours}{t('worldCupCountdown.hoursShort')} {timeLeft.minutes}{t('worldCupCountdown.minutesShort')}
            </span>
          </div>
          <div className="w-full bg-gray-700/50 rounded-full h-2">
            <div
              className="bg-gradient-to-r from-blue-500 to-green-400 h-2 rounded-full transition-all duration-1000"
              style={{
                width: `${Math.min(
                  100,
                  (timeLeft.days / 500) * 100
                )}%`,
              }}
            ></div>
          </div>
        </div>
      </div>
    </div>
  );
}