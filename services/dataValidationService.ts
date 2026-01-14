/**
 * Data Validation Service - Validates football data for quality
 */

import { Player, Team } from './groqService';

export interface ValidatedPlayer extends Player {
  _validationScore: number; // 0-100
  _issues: string[];
  _imageUrl?: string;
}

export interface ValidationResult {
  isValid: boolean;
  score: number; // 0-100
  issues: string[];
  warnings: string[];
}

/**
 * Validate player age (reasonable range: 16-42)
 */
const validateAge = (age?: number): { valid: boolean; issues: string[] } => {
  const issues: string[] = [];
  
  if (!age) return { valid: true, issues: [] };
  
  if (age < 16) {
    issues.push(`Age ${age} is too young for professional football`);
  } else if (age > 42) {
    issues.push(`Age ${age} is unusually old for active player`);
  } else if (age < 18 || age > 40) {
    // Warning, not issue
  }
  
  return { valid: issues.length === 0, issues };
};

/**
 * Validate player position
 */
const validatePosition = (position: string): { valid: boolean; issues: string[] } => {
  const validPositions = [
    'Goalkeeper',
    'Defender',
    'Left Back',
    'Right Back',
    'Centre Back',
    'Midfielder',
    'Defensive Midfielder',
    'Central Midfielder',
    'Attacking Midfielder',
    'Left Midfielder',
    'Right Midfielder',
    'Forward',
    'Striker',
    'Winger',
    'Left Winger',
    'Right Winger',
    'Player' // Sometimes generic
  ];
  
  const issues: string[] = [];
  
  if (!position || position.trim() === '') {
    issues.push('Position is missing');
  } else if (!validPositions.some(p => p.toLowerCase() === position.toLowerCase())) {
    issues.push(`Position "${position}" is not recognized`);
  }
  
  return { valid: issues.length === 0, issues };
};

/**
 * Validate career stats
 */
const validateCareerStats = (goals?: number, assists?: number): { valid: boolean; issues: string[] } => {
  const issues: string[] = [];
  
  // Historical max goals: ~900 (Messi)
  if ((goals || 0) > 900) {
    issues.push(`Career goals ${goals} seems unrealistic (max ~900)`);
  }
  
  // Historical max assists: ~300+ (Messi, Ronaldo era)
  if ((assists || 0) > 300) {
    issues.push(`Career assists ${assists} seems unrealistic (max ~300)`);
  }
  
  if ((goals || 0) < 0 || (assists || 0) < 0) {
    issues.push('Negative career stats detected');
  }
  
  return { valid: issues.length === 0, issues };
};

/**
 * Validate international appearances
 */
const validateInternationalStats = (appearances?: number, goals?: number): { valid: boolean; issues: string[] } => {
  const issues: string[] = [];
  
  // Max international appearances: ~200 (very rare)
  if ((appearances || 0) > 200) {
    issues.push(`International appearances ${appearances} exceeds realistic range`);
  }
  
  // Goals should be less than appearances
  if ((goals || 0) > (appearances || 0)) {
    issues.push(`International goals (${goals}) exceeds appearances (${appearances})`);
  }
  
  return { valid: issues.length === 0, issues };
};

/**
 * Validate team data
 */
export const validateTeam = (team: Team): ValidationResult => {
  const issues: string[] = [];
  const warnings: string[] = [];
  let score = 100;
  
  // Check team name
  if (!team.name || team.name.trim() === '') {
    issues.push('Team name is missing');
    score -= 30;
  }
  
  // Check coach
  if (!team.currentCoach || team.currentCoach === 'Unknown') {
    warnings.push('Coach information is missing');
    score -= 10;
  }
  
  // Check founded year (reasonable: 1860-2025)
  if (team.foundedYear) {
    if (team.foundedYear < 1850 || team.foundedYear > 2025) {
      issues.push(`Founded year ${team.foundedYear} seems unrealistic`);
      score -= 20;
    }
  }
  
  // Check for required fields
  if (!team.type || !['club', 'national'].includes(team.type)) {
    issues.push(`Invalid team type: ${team.type}`);
    score -= 20;
  }
  
  return {
    isValid: issues.length === 0,
    score: Math.max(0, score),
    issues,
    warnings
  };
};

/**
 * Validate player data and return score
 */
export const validatePlayer = (player: Player): ValidatedPlayer => {
  const issues: string[] = [];
  let score = 100;
  
  // Validate age
  const ageValidation = validateAge(player.age);
  if (!ageValidation.valid) {
    issues.push(...ageValidation.issues);
    score -= 15;
  }
  
  // Validate position
  const positionValidation = validatePosition(player.position);
  if (!positionValidation.valid) {
    issues.push(...positionValidation.issues);
    score -= 20;
  }
  
  // Validate career stats
  const statsValidation = validateCareerStats(player.careerGoals, player.careerAssists);
  if (!statsValidation.valid) {
    issues.push(...statsValidation.issues);
    score -= 25;
  }
  
  // Validate international stats
  const intlValidation = validateInternationalStats(
    player.internationalAppearances,
    player.internationalGoals
  );
  if (!intlValidation.valid) {
    issues.push(...intlValidation.issues);
    score -= 20;
  }
  
  // Check name
  if (!player.name || player.name.trim() === '') {
    issues.push('Player name is missing');
    score -= 30;
  }
  
  // Check nationality
  if (!player.nationality || player.nationality === '') {
    issues.push('Nationality is missing');
    score -= 10;
  }
  
  // Ensure score is between 0-100
  score = Math.max(0, Math.min(100, score));
  
  return {
    ...player,
    _validationScore: score,
    _issues: issues
  };
};

/**
 * Validate array of players
 */
export const validatePlayers = (players: Player[]): ValidatedPlayer[] => {
  return players.map(player => validatePlayer(player));
};

/**
 * Get validation summary for display
 */
export const getValidationSummary = (players: ValidatedPlayer[]): {
  totalPlayers: number;
  validPlayers: number;
  averageScore: number;
  playersByQuality: {
    excellent: number;
    good: number;
    fair: number;
    poor: number;
  };
  topIssues: string[];
} => {
  const validPlayers = players.filter(p => p._issues.length === 0).length;
  const avgScore = players.reduce((sum, p) => sum + p._validationScore, 0) / players.length;
  
  const playersByQuality = {
    excellent: players.filter(p => p._validationScore >= 90).length,
    good: players.filter(p => p._validationScore >= 75 && p._validationScore < 90).length,
    fair: players.filter(p => p._validationScore >= 50 && p._validationScore < 75).length,
    poor: players.filter(p => p._validationScore < 50).length
  };
  
  // Count issues
  const issueCounts = new Map<string, number>();
  players.forEach(player => {
    player._issues.forEach(issue => {
      issueCounts.set(issue, (issueCounts.get(issue) || 0) + 1);
    });
  });
  
  // Get top 5 most common issues
  const topIssues = Array.from(issueCounts.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([issue, count]) => `${issue} (${count} players)`);
  
  return {
    totalPlayers: players.length,
    validPlayers,
    averageScore: Math.round(avgScore),
    playersByQuality,
    topIssues
  };
};

/**
 * Filter out invalid or suspicious players
 */
export const filterValidPlayers = (players: ValidatedPlayer[], minScore: number = 50): ValidatedPlayer[] => {
  return players.filter(p => p._validationScore >= minScore);
};
