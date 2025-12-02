// Achievement System Types

export type AchievementCategory =
  | 'kennel'      // Kennel management achievements
  | 'training'    // Training achievements
  | 'competition' // Competition achievements
  | 'breeding'    // Breeding achievements
  | 'collection'  // Collect breeds/items
  | 'care'        // Care and bonding achievements
  | 'progression' // Level/XP achievements
  | 'special';    // Special/secret achievements

export type AchievementRarity = 'common' | 'uncommon' | 'rare' | 'epic' | 'legendary';

export interface AchievementReward {
  cash?: number;
  gems?: number;
  xp?: number;
  items?: { itemId: string; quantity: number }[];
}

export interface AchievementProgress {
  current: number;
  required: number;
}

export interface Achievement {
  id: string;
  category: AchievementCategory;
  name: string;
  description: string;
  icon: string;
  rarity: AchievementRarity;
  reward: AchievementReward;

  // Progress tracking
  isHidden?: boolean;      // Hidden until unlocked
  isRepeatable?: boolean;  // Can be earned multiple times
  requires?: string[];     // Achievement IDs that must be unlocked first

  // For tracking achievements (e.g., "win 10 competitions")
  targetValue?: number;
}

export interface UserAchievement {
  achievementId: string;
  unlockedAt: string;
  progress: number;      // For tracking achievements (0-targetValue)
  timesEarned?: number;  // For repeatable achievements
  rewardClaimed: boolean;
}
