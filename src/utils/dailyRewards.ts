import { apprenticeshipComplete } from './firstRibbon';
import type { TutorialProgress } from '../types';
import { UserProfile } from '../types';

export interface DailyReward {
  day: number;
  cash: number;
  gems: number;
  xp: number;
  bonus?: string;
}

// Daily reward tiers - scales with streak
export const DAILY_REWARDS: DailyReward[] = Array.from({length:30},(_,i)=>({
  day:i+1, cash:(i+1)%7===0?75:20+Math.floor(i/7)*5, gems:(i+1)%7===0?2:0, xp:10,
  ...((i+1)%7===0?{bonus:'A week of care'}:{})
}));
export function dailyRewardUnlocked(progress:TutorialProgress, now=new Date()):boolean {
 const completion = progress.fieldClub?.completedAt ?? progress.firstRibbon?.graduatedAt;
 if(!apprenticeshipComplete(progress)||!completion)return false;
 const graduated=new Date(completion);graduated.setHours(0,0,0,0);
 const today=new Date(now);today.setHours(0,0,0,0);return graduated<today;
}

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
  const day = Math.min(Math.max(streakDay, 1), 30);
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
