'use client';

import { useState, useEffect } from 'react';

export default function WorldCupCountdown() {
  const [timeRemaining, setTimeRemaining] = useState({ days: 0, hours: 0, minutes: 0, seconds: 0 });
  const [userTimezone, setUserTimezone] = useState('');
  const [cetTime, setCetTime] = useState('');

  // Opening match: June 11, 2026 at 21:00 CEST (UTC+2)
  // Using UTC+2 for Central European Summer Time
  const getTargetDate = () => {
    return new Date('2026-06-11T21:00:00+02:00');
  };

  useEffect(() => {
    const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
    setUserTimezone(tz);
    
    const target = getTargetDate();
    
    // Get CET reference time
    const cetTimeString = target.toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      timeZone: 'Europe/Paris',
      timeZoneName: 'short'
    });
    setCetTime(cetTimeString);

    const timer = setInterval(() => {
      const now = new Date();
      const difference = target.getTime() - now.getTime();
      
      if (difference <= 0) {
        setTimeRemaining({ days: 0, hours: 0, minutes: 0, seconds: 0 });
      } else {
        setTimeRemaining({
          days: Math.floor(difference / (1000 * 60 * 60 * 24)),
          hours: Math.floor((difference / (1000 * 60 * 60)) % 24),
          minutes: Math.floor((difference / (1000 * 60)) % 60),
          seconds: Math.floor((difference / 1000) % 60)
        });
      }
    }, 1000);
    
    return () => clearInterval(timer);
  }, []);

  return (
    <div className="bg-gradient-to-r from-blue-900/30 to-green-900/30 rounded-2xl p-6 border border-blue-700/30">
      <h3 className="text-lg font-semibold text-white mb-3 text-center">
        Countdown to World Cup 2026 Opening Match
      </h3>
      <div className="grid grid-cols-4 gap-2 sm:gap-4 mb-4">
        <div className="bg-gray-900/80 rounded-xl p-3 text-center">
          <div className="text-2xl sm:text-3xl md:text-4xl font-bold text-blue-400">
            {timeRemaining.days}
          </div>
          <div className="text-xs text-gray-400">DAYS</div>
        </div>
        <div className="bg-gray-900/80 rounded-xl p-3 text-center">
          <div className="text-2xl sm:text-3xl md:text-4xl font-bold text-blue-400">
            {timeRemaining.hours}
          </div>
          <div className="text-xs text-gray-400">HOURS</div>
        </div>
        <div className="bg-gray-900/80 rounded-xl p-3 text-center">
          <div className="text-2xl sm:text-3xl md:text-4xl font-bold text-blue-400">
            {timeRemaining.minutes}
          </div>
          <div className="text-xs text-gray-400">MINUTES</div>
        </div>
        <div className="bg-gray-900/80 rounded-xl p-3 text-center">
          <div className="text-2xl sm:text-3xl md:text-4xl font-bold text-blue-400">
            {timeRemaining.seconds}
          </div>
          <div className="text-xs text-gray-400">SECONDS</div>
        </div>
      </div>
      
      {/* Timezone Info */}
      <div className="text-center space-y-1">
        <p className="text-sm text-blue-300">
          Opening Match: Mexico vs South Africa • June 11, 2026 • 21:00 CET (9:00 PM)
        </p>
        <p className="text-xs text-gray-400">
          🕐 CET reference: {cetTime || '21:00 CEST'} | Central European Time (UTC+1/UTC+2)
        </p>
        <p className="text-xs text-gray-500">
          Your local timezone: {userTimezone || 'loading...'}
        </p>
      </div>
    </div>
  );
}