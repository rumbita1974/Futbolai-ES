import { useEffect, useState } from 'react';

export default function WorldCupCountdown() {
  const [timeLeft, setTimeLeft] = useState({
    days: 0,
    hours: 0,
    minutes: 0,
    seconds: 0,
  });

  useEffect(() => {
    // Official tournament start: June 11, 2026
    const tournamentStart = new Date('2026-06-11T17:00:00Z').getTime(); // 5 PM UTC

    const updateCountdown = () => {
      const now = new Date().getTime();
      const difference = tournamentStart - now;

      if (difference > 0) {
        setTimeLeft({
          days: Math.floor(difference / (1000 * 60 * 60 * 24)),
          hours: Math.floor((difference % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60)),
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

  return (
    <div className="w-full bg-gradient-to-r from-blue-900 to-green-800 rounded-2xl p-6 shadow-2xl">
      <div className="text-center mb-6">
        <h2 className="text-3xl font-bold text-white mb-2">Countdown to World Cup 2026</h2>
        <p className="text-blue-200">Tournament starts: June 11, 2026</p>
        <p className="text-blue-100 text-sm mt-1">Mexico vs South Africa • Estadio Azteca</p>
      </div>

      <div className="grid grid-cols-4 gap-4 mb-6">
        <div className="bg-white/20 backdrop-blur-sm rounded-xl p-4 text-center">
          <div className="text-4xl font-bold text-white">{String(timeLeft.days).padStart(2, '0')}</div>
          <div className="text-blue-100 font-medium mt-1">DAYS</div>
        </div>
        <div className="bg-white/20 backdrop-blur-sm rounded-xl p-4 text-center">
          <div className="text-4xl font-bold text-white">{String(timeLeft.hours).padStart(2, '0')}</div>
          <div className="text-blue-100 font-medium mt-1">HOURS</div>
        </div>
        <div className="bg-white/20 backdrop-blur-sm rounded-xl p-4 text-center">
          <div className="text-4xl font-bold text-white">{String(timeLeft.minutes).padStart(2, '0')}</div>
          <div className="text-blue-100 font-medium mt-1">MINUTES</div>
        </div>
        <div className="bg-white/20 backdrop-blur-sm rounded-xl p-4 text-center">
          <div className="text-4xl font-bold text-white">{String(timeLeft.seconds).padStart(2, '0')}</div>
          <div className="text-blue-100 font-medium mt-1">SECONDS</div>
        </div>
      </div>

      <div className="border-t border-white/20 pt-4">
        <div className="flex justify-between items-center">
          <div className="text-white">
            <div className="font-semibold">Opening Match</div>
            <div className="text-sm text-blue-100">Group A • June 11, 2026</div>
          </div>
          <div className="text-right">
            <div className="text-white font-medium">Mexico vs South Africa</div>
            <div className="text-sm text-blue-100">Estadio Azteca, Mexico City</div>
          </div>
        </div>
      </div>
    </div>
  );
}