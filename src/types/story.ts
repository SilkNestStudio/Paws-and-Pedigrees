/**
 * Story Mode / Campaign Types
 */

export interface StoryChapter {
  id: string;
  chapter_number: number;
  title: string;
  subtitle: string;
  story_text: string[];
  image_url?: string;
  icon: string;
  objectives: StoryObjective[];
  rewards: StoryReward;
  unlock_requirement?: {
    previous_chapter?: string;
    min_level?: number;
    min_dogs?: number;
  };
}

export interface StoryObjective {
  id: string;
  description: string;
  type: 'care' | 'train' | 'compete' | 'breed' | 'bond' | 'shop' | 'level' | 'custom';
  target_value: number;
  current_value?: number;
  completed: boolean;
  hint?: string;
  // Optional type-specific properties
  action?: string; // For care type: 'feed', 'water', 'rest'
  competition_tier?: 'local' | 'regional' | 'national'; // For compete type
  competition_requirement?: 'win' | 'participate'; // For compete type
  breeding_action?: 'breed' | 'birth'; // For breed type
  shop_action?: 'buy_food' | 'buy_breed'; // For shop type
  custom_id?: string; // For custom type
}

export interface StoryReward {
  cash?: number;
  gems?: number;
  xp?: number;
  items?: string[];
  unlock_feature?: string;
}

// Client-side story progress state (simplified for in-memory use)
export interface StoryProgress {
  completedChapters: string[];
  currentChapter: string | null;
  objectiveProgress: Record<string, Record<string, number>>; // chapter_id -> objective_id -> progress
  claimedRewards: string[];
}

// Database story progress (for Supabase persistence)
export interface StoryProgressDb {
  user_id: string;
  current_chapter: string;
  completed_chapters: string[];
  chapter_objectives: Record<string, Record<string, number>>; // chapter_id -> objective_id -> progress
  story_completed: boolean;
  started_at: string;
  completed_at?: string;
}
