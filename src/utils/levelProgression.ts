/**
 * Level progression system for user experience (XP) and levels
 * Defines XP requirements for each level and provides utility functions
 */

/**
 * Calculate XP required for a specific level
 * Uses a progressive formula: baseXP * level^1.5
 * This creates a smooth curve that increases gradually
 */
export function getXPForLevel(level: number): number {
  if (level <= 1) return 0;

  // Formula: 200 * (level - 1)^1.5
  // This creates a smooth progression (approximately 2x slower than before):
  // Level 2: 200 XP
  // Level 3: 566 XP
  // Level 4: 1,039 XP
  // Level 5: 1,600 XP
  // Level 6: 2,236 XP
  // Level 10: 5,692 XP
  // Level 20: 16,547 XP
  // Level 50: 68,600 XP
  const baseXP = 200;
  const exponent = 1.5;
  return Math.floor(baseXP * Math.pow(level - 1, exponent));
}

/**
 * Calculate current level based on total XP
 * Returns the highest level the user has achieved
 */
export function getLevelFromXP(xp: number): number {
  if (xp < 0) return 1;

  let level = 1;
  while (getXPForLevel(level + 1) <= xp) {
    level++;
  }

  return level;
}

/**
 * Get XP progress towards next level
 * Returns current XP in current level and XP needed for next level
 */
export function getLevelProgress(xp: number): {
  currentLevel: number;
  nextLevel: number;
  currentLevelXP: number;
  nextLevelXP: number;
  xpInCurrentLevel: number;
  xpNeededForNext: number;
  progressPercent: number;
} {
  const currentLevel = getLevelFromXP(xp);
  const nextLevel = currentLevel + 1;
  const currentLevelXP = getXPForLevel(currentLevel);
  const nextLevelXP = getXPForLevel(nextLevel);
  const xpInCurrentLevel = xp - currentLevelXP;
  const xpNeededForNext = nextLevelXP - currentLevelXP;
  const progressPercent = Math.min(100, (xpInCurrentLevel / xpNeededForNext) * 100);

  return {
    currentLevel,
    nextLevel,
    currentLevelXP,
    nextLevelXP,
    xpInCurrentLevel,
    xpNeededForNext,
    progressPercent,
  };
}

/**
 * Check if user leveled up and return rewards
 */
export function checkLevelUp(oldXP: number, newXP: number): {
  leveledUp: boolean;
  oldLevel: number;
  newLevel: number;
  levelsGained: number;
  rewards: {
    cash: number;
    gems: number;
    kennelSlots: number;
  };
} | null {
  const oldLevel = getLevelFromXP(oldXP);
  const newLevel = getLevelFromXP(newXP);

  if (newLevel <= oldLevel) {
    return null;
  }

  const levelsGained = newLevel - oldLevel;

  // Calculate rewards for leveling up
  const cashPerLevel = 100;
  const gemsPerLevel = 5;
  const slotsEvery5Levels = Math.floor(newLevel / 5) - Math.floor(oldLevel / 5);

  return {
    leveledUp: true,
    oldLevel,
    newLevel,
    levelsGained,
    rewards: {
      cash: cashPerLevel * levelsGained,
      gems: gemsPerLevel * levelsGained,
      kennelSlots: slotsEvery5Levels,
    },
  };
}
