// components/ChampionBanner.tsx
'use client';

import { useState, useEffect } from 'react';

interface ChampionBannerProps {
  champion: string;
  year: string;
  score?: string;
}

export default function ChampionBanner({ champion, year, score }: ChampionBannerProps) {
  const [show, setShow] = useState(true);

  useEffect(() => {
    // Hide after 30 seconds
    const timer = setTimeout(() => {
      setShow(false);
    }, 30000);
    return () => clearTimeout(timer);
  }, []);

  if (!show) return null;

  return (
    <div className="fixed top-0 left-0 right-0 z-50 pointer-events-none">
      {/* Fireworks particles */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        {[...Array(30)].map((_, i) => (
          <div
            key={i}
            className="absolute w-2 h-2 rounded-full animate-firework"
            style={{
              left: `${Math.random() * 100}%`,
              top: `${Math.random() * 100}%`,
              animationDelay: `${Math.random() * 3}s`,
              animationDuration: `${2 + Math.random() * 2}s`,
              backgroundColor: ['#FFD700', '#FF6B6B', '#4ECDC4', '#45B7D1', '#FFA07A', '#98D8C8', '#F7DC6F', '#BB8FCE'][Math.floor(Math.random() * 8)],
              width: `${4 + Math.random() * 8}px`,
              height: `${4 + Math.random() * 8}px`,
            }}
          />
        ))}
        {[...Array(20)].map((_, i) => (
          <div
            key={`sparkle-${i}`}
            className="absolute text-xl animate-sparkle"
            style={{
              left: `${Math.random() * 100}%`,
              top: `${Math.random() * 100}%`,
              animationDelay: `${Math.random() * 4}s`,
              animationDuration: `${1 + Math.random() * 2}s`,
            }}
          >
            ✨
          </div>
        ))}
      </div>

      {/* Banner */}
      <div className="relative mx-4 mt-4 p-4 bg-gradient-to-r from-yellow-500 via-yellow-300 to-yellow-500 rounded-2xl shadow-2xl border-4 border-yellow-400 pointer-events-auto animate-banner">
        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent animate-shimmer"></div>
        <div className="relative text-center">
          <div className="text-3xl md:text-5xl font-bold text-red-600 animate-pulse">
            🏆 {champion} {year} FIFA WORLD CHAMPIONS 🏆
          </div>
          {score && (
            <div className="text-xl md:text-2xl font-semibold text-white mt-2">
              {score}
            </div>
          )}
          <div className="text-sm md:text-base text-white/80 mt-1">
            🇪🇸 ¡Campeones del Mundo! 🇪🇸
          </div>
          <button
            onClick={() => setShow(false)}
            className="absolute top-2 right-4 text-white/60 hover:text-white text-xl pointer-events-auto"
          >
            ✕
          </button>
        </div>
      </div>

      <style jsx>{`
        @keyframes firework {
          0% {
            transform: translateY(0) scale(0);
            opacity: 1;
          }
          100% {
            transform: translateY(-200px) scale(2);
            opacity: 0;
          }
        }
        @keyframes sparkle {
          0%, 100% {
            opacity: 0;
            transform: scale(0) rotate(0deg);
          }
          50% {
            opacity: 1;
            transform: scale(1.5) rotate(180deg);
          }
        }
        @keyframes banner {
          0% {
            transform: translateY(-100px) scale(0.8);
            opacity: 0;
          }
          60% {
            transform: translateY(10px) scale(1.02);
          }
          100% {
            transform: translateY(0) scale(1);
            opacity: 1;
          }
        }
        @keyframes shimmer {
          0% {
            transform: translateX(-100%);
          }
          100% {
            transform: translateX(100%);
          }
        }
        .animate-firework {
          animation: firework linear forwards;
        }
        .animate-sparkle {
          animation: sparkle ease-in-out infinite;
        }
        .animate-banner {
          animation: banner 0.8s ease-out forwards;
        }
        .animate-shimmer {
          animation: shimmer 2s infinite;
        }
      `}</style>
    </div>
  );
}