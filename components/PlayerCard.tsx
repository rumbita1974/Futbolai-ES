/**
 * Player Card Component - Displays player with image, position, and stats
 * Handles loading states, image errors, and validation issues
 */

'use client';

import { Player } from '@/services/groqService';
import { ValidatedPlayer } from '@/services/dataValidationService';
import { useState } from 'react';

interface PlayerCardProps {
  player: ValidatedPlayer | Player;
  imageUrl?: string;
  loading?: boolean;
  showValidationScore?: boolean;
}

export default function PlayerCard({
  player,
  imageUrl,
  loading = false,
  showValidationScore = true
}: PlayerCardProps) {
  const [imageError, setImageError] = useState(false);
  const [imageLoading, setImageLoading] = useState(true);
  
  // Use provided image or fall back to placeholder
  const displayImageUrl = imageUrl || '/images/player-placeholder.svg';
  
  const isValidated = '_validationScore' in player;
  const validatedPlayer = player as ValidatedPlayer;
  const score = isValidated ? validatedPlayer._validationScore : 100;
  const issues = isValidated ? validatedPlayer._issues : [];
  
  // Determine quality color
  const getQualityColor = (score: number) => {
    if (score >= 90) return 'bg-green-100 border-green-300';
    if (score >= 75) return 'bg-blue-100 border-blue-300';
    if (score >= 50) return 'bg-yellow-100 border-yellow-300';
    return 'bg-red-100 border-red-300';
  };
  
  // Determine quality badge
  const getQualityBadge = (score: number) => {
    if (score >= 90) return { text: '✓ Verified', color: 'bg-green-500' };
    if (score >= 75) return { text: '◐ Good', color: 'bg-blue-500' };
    if (score >= 50) return { text: '△ Fair', color: 'bg-yellow-500' };
    return { text: '✗ Low', color: 'bg-red-500' };
  };
  
  const qualityBadge = getQualityBadge(score);
  
  return (
    <div className={`player-card border-2 rounded-lg p-4 transition-all ${getQualityColor(score)}`}>
      {/* Image Container - Panini-style (portrait 3:4 aspect, face centered) */}
      <div className="relative mb-3 bg-gray-200 rounded-md overflow-hidden aspect-[3/4] flex items-center justify-center">
        {loading || imageLoading ? (
          <div className="absolute inset-0 bg-gradient-to-r from-gray-300 to-gray-200 animate-pulse" />
        ) : null}
        
        {!imageError ? (
          <img
            src={displayImageUrl}
            alt={player.name}
            className="min-w-full min-h-full object-cover object-center"
            onLoad={() => setImageLoading(false)}
            onError={() => {
              setImageError(true);
              setImageLoading(false);
            }}
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center bg-gray-300">
            <div className="text-center">
              <span className="text-4xl">⚽</span>
              <p className="text-sm text-gray-600 mt-2">No image</p>
            </div>
          </div>
        )}
        
        {/* Quality Badge */}
        {showValidationScore && (
          <div className={`absolute top-2 right-2 ${qualityBadge.color} text-white text-xs font-bold px-2 py-1 rounded`}>
            {qualityBadge.text}
          </div>
        )}
        
        {/* Score Indicator */}
        {showValidationScore && (
          <div className="absolute bottom-2 left-2 bg-white rounded-full w-8 h-8 flex items-center justify-center text-xs font-bold">
            {score}%
          </div>
        )}
      </div>
      
      {/* Player Info */}
      <div className="space-y-2">
        <h3 className="font-bold text-lg text-gray-900 truncate">
          {player.name}
        </h3>
        
        <div className="flex items-center justify-between text-sm">
          <span className="text-gray-700 font-semibold">{player.position}</span>
          {player.age && (
            <span className="text-gray-600">
              {player.age} years old
            </span>
          )}
        </div>
        
        <p className="text-xs text-gray-600">
          {player.nationality}
        </p>
        
        {/* Stats */}
        <div className="grid grid-cols-2 gap-2 text-xs mt-3 pt-3 border-t border-gray-300">
          <div className="text-center">
            <span className="text-lg font-bold text-green-600">{player.careerGoals || 0}</span>
            <p className="text-gray-600">Goals</p>
          </div>
          <div className="text-center">
            <span className="text-lg font-bold text-blue-600">{player.careerAssists || 0}</span>
            <p className="text-gray-600">Assists</p>
          </div>
          <div className="text-center">
            <span className="text-lg font-bold text-purple-600">{player.internationalAppearances || 0}</span>
            <p className="text-gray-600">Caps</p>
          </div>
          <div className="text-center">
            <span className="text-lg font-bold text-orange-600">{player.internationalGoals || 0}</span>
            <p className="text-gray-600">Int'l Goals</p>
          </div>
        </div>
        
        {/* Validation Issues */}
        {issues.length > 0 && (
          <div className="mt-3 pt-3 border-t border-yellow-300">
            <p className="text-xs font-semibold text-yellow-700 mb-1">
              ⚠️ {issues.length} Data Issue{issues.length > 1 ? 's' : ''}:
            </p>
            <ul className="text-xs text-yellow-700 space-y-1">
              {issues.slice(0, 2).map((issue, idx) => (
                <li key={idx} className="flex items-start">
                  <span className="mr-1">•</span>
                  <span>{issue}</span>
                </li>
              ))}
              {issues.length > 2 && (
                <li className="text-yellow-600 italic">
                  +{issues.length - 2} more issues...
                </li>
              )}
            </ul>
          </div>
        )}
        
        {/* Source Info */}
        {player._source && (
          <p className="text-xs text-gray-500 mt-2">
            Source: {player._source}
          </p>
        )}
      </div>
    </div>
  );
}
