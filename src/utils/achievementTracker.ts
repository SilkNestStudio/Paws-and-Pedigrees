import { ACHIEVEMENTS } from '../data/achievements';
import { Achievement, UserAchievement } from '../types/achievements';

/**
 * Check if an achievement has been unlocked
 */
export function isAchievementUnlocked(
  achievementId: string,
  userAchievements: UserAchievement[]
): boolean {
  return userAchievements.some(ua => ua.achievementId === achievementId);
}

/**
 * Check if an achievement's requirements are met
 */
export function areRequirementsMet(
  achievement: Achievement,
  userAchievements: UserAchievement[]
): boolean {
  if (!achievement.requires || achievement.requires.length === 0) {
    return true;
  }

  return achievement.requires.every(reqId =>
    isAchievementUnlocked(reqId, userAchievements)
  );
}

/**
 * Get progress for a tracking achievement
 */
export function getAchievementProgress(
  achievementId: string,
  userAchievements: UserAchievement[]
): { current: number; required: number } {
  const achievement = ACHIEVEMENTS[achievementId];
  const userAchievement = userAchievements.find(ua => ua.achievementId === achievementId);

  return {
    current: userAchievement?.progress || 0,
    required: achievement.targetValue || 1,
  };
}

/**
 * Check if a value meets the achievement target
 */
export function checkAchievementProgress(
  achievementId: string,
  currentValue: number,
  userAchievements: UserAchievement[]
): { unlocked: boolean; progress: number } {
  const achievement = ACHIEVEMENTS[achievementId];

  if (!achievement) {
    return { unlocked: false, progress: 0 };
  }

  // Check if already unlocked (and not repeatable)
  if (!achievement.isRepeatable && isAchievementUnlocked(achievementId, userAchievements)) {
    return { unlocked: true, progress: achievement.targetValue || 1 };
  }

  // Check if requirements are met
  if (!areRequirementsMet(achievement, userAchievements)) {
    return { unlocked: false, progress: 0 };
  }

  const targetValue = achievement.targetValue || 1;
  const unlocked = currentValue >= targetValue;

  return {
    unlocked,
    progress: Math.min(currentValue, targetValue),
  };
}

/**
 * Get all available achievements (not hidden or requirements met)
 */
export function getAvailableAchievements(
  userAchievements: UserAchievement[]
): Achievement[] {
  return Object.values(ACHIEVEMENTS).filter(achievement => {
    // Skip hidden achievements
    if (achievement.isHidden && !isAchievementUnlocked(achievement.id, userAchievements)) {
      return false;
    }

    // Include if requirements are met
    return areRequirementsMet(achievement, userAchievements);
  });
}

/**
 * Get achievements by category
 */
export function getAchievementsByCategory(
  category: string,
  userAchievements: UserAchievement[]
): Achievement[] {
  return getAvailableAchievements(userAchievements).filter(
    achievement => achievement.category === category
  );
}

/**
 * Get recently unlocked achievements
 */
export function getRecentlyUnlocked(
  userAchievements: UserAchievement[],
  limit: number = 5
): UserAchievement[] {
  return [...userAchievements]
    .sort((a, b) => new Date(b.unlockedAt).getTime() - new Date(a.unlockedAt).getTime())
    .slice(0, limit);
}

/**
 * Calculate total achievement completion percentage
 */
export function getCompletionPercentage(userAchievements: UserAchievement[]): number {
  const totalAchievements = Object.keys(ACHIEVEMENTS).length;
  const unlockedCount = userAchievements.length;

  if (totalAchievements === 0) return 0;

  return Math.round((unlockedCount / totalAchievements) * 100);
}

/**
 * Get achievements close to completion (80%+ progress)
 */
export function getAlmostComplete(userAchievements: UserAchievement[]): Achievement[] {
  return getAvailableAchievements(userAchievements).filter(achievement => {
    const progress = getAchievementProgress(achievement.id, userAchievements);
    const percentage = (progress.current / progress.required) * 100;

    return percentage >= 80 && percentage < 100;
  });
}
