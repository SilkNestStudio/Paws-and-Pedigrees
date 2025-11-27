import { UserProfile } from '../types';

export interface DailyReward {
  day: number;
  cash: number;
  gems: number;
  xp: number;
  bonus?: string;
}

// Daily reward tiers - scales with streak
export const DAILY_REWARDS: DailyReward[] = [
  { day: 1, cash: 100, gems: 0, xp: 10 },
  { day: 2, cash: 150, gems: 0, xp: 15 },
  { day: 3, cash: 200, gems: 5, xp: 20, bonus: 'First gems!' },
  { day: 4, cash: 250, gems: 0, xp: 25 },
  { day: 5, cash: 300, gems: 10, xp: 30, bonus: 'Keep it up!' },
  { day: 6, cash: 400, gems: 0, xp: 40 },
  { day: 7, cash: 500, gems: 25, xp: 50, bonus: '🎉 Week Complete!' },
  { day: 8, cash: 600, gems: 0, xp: 60 },
  { day: 9, cash: 700, gems: 15, xp: 70 },
  { day: 10, cash: 800, gems: 20, xp: 80 },
  { day: 11, cash: 900, gems: 0, xp: 90 },
  { day: 12, cash: 1000, gems: 25, xp: 100 },
  { day: 13, cash: 1100, gems: 0, xp: 110 },
  { day: 14, cash: 1500, gems: 50, xp: 150, bonus: '🔥 Two Weeks!' },
  { day: 15, cash: 1200, gems: 30, xp: 120 },
  { day: 16, cash: 1300, gems: 0, xp: 130 },
  { day: 17, cash: 1400, gems: 35, xp: 140 },
  { day: 18, cash: 1500, gems: 0, xp: 150 },
  { day: 19, cash: 1600, gems: 40, xp: 160 },
  { day: 20, cash: 1700, gems: 45, xp: 170 },
  { day: 21, cash: 2500, gems: 100, xp: 250, bonus: '💎 Three Weeks!' },
  { day: 22, cash: 2000, gems: 50, xp: 200 },
  { day: 23, cash: 2100, gems: 55, xp: 210 },
  { day: 24, cash: 2200, gems: 60, xp: 220 },
  { day: 25, cash: 2300, gems: 65, xp: 230 },
  { day: 26, cash: 2400, gems: 70, xp: 240 },
  { day: 27, cash: 2500, gems: 75, xp: 250 },
  { day: 28, cash: 3000, gems: 150, xp: 300 },
  { day: 29, cash: 2800, gems: 80, xp: 280 },
  { day: 30, cash: 5000, gems: 250, xp: 500, bonus: '🏆 MONTHLY LEGEND!' },
];

/**
 * Check if user can claim daily reward
 */
export function canClaimDailyReward(user: UserProfile): boolean {
  // No last claim = can claim
  if (!user.last_streak_claim) return true;

  const lastClaim = new Date(user.last_streak_claim);
  const now = new Date();

  // Reset time to start of day for comparison
  lastClaim.setHours(0, 0, 0, 0);
  now.setHours(0, 0, 0, 0);

  // Can claim if last claim was before today
  return lastClaim < now;
}

/**
 * Calculate current login streak
 */
export function calculateLoginStreak(user: UserProfile): number {
  const lastLogin = new Date(user.last_login);
  const now = new Date();

  // Reset to start of day
  lastLogin.setHours(0, 0, 0, 0);
  now.setHours(0, 0, 0, 0);

  const daysDiff = Math.floor((now.getTime() - lastLogin.getTime()) / (1000 * 60 * 60 * 24));

  // If logged in today or yesterday, continue streak
  if (daysDiff <= 1) {
    return user.login_streak;
  }

  // Missed a day, reset streak
  return 0;
}

/**
 * Get reward for current streak day
 */
export function getDailyReward(streakDay: number): DailyReward {
  // Cap at day 30, repeat day 30 rewards after
  const day = Math.min(streakDay, 30);
  return DAILY_REWARDS[day - 1] || DAILY_REWARDS[29]; // Fallback to day 30
}

/**
 * Get preview of next 7 days rewards
 */
export function getUpcomingRewards(currentStreak: number): DailyReward[] {
  const rewards: DailyReward[] = [];
  for (let i = 0; i < 7; i++) {
    const day = currentStreak + i + 1;
    rewards.push(getDailyReward(day));
  }
  return rewards;
}
