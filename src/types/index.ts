export interface Breed {
  id: number;
  name: string;
  tier: 'rescue' | 'common' | 'uncommon' | 'rare' | 'exotic' | 'legendary';
  unlock_level: number;
  purchase_price?: number;
  gem_price?: number;
  size_min: number;
  size_max: number;
  energy_min: number;
  energy_max: number;
  friendliness_min: number;
  friendliness_max: number;
  trainability_min: number;
  trainability_max: number;
  intelligence_min: number;
  intelligence_max: number;
  speed_min: number;
  speed_max: number;
  agility_min: number;
  agility_max: number;
  strength_min: number;
  strength_max: number;
  endurance_min: number;
  endurance_max: number;
  prey_drive_min: number;
  prey_drive_max: number;
  protectiveness_min: number;
  protectiveness_max: number;
  coat_types: string[];
  color_genes?: any;
  description: string;
  history?: string;
  img_sitting?: string;
  img_standing?: string;
  img_playing?: string;
}

export interface Dog {
  id: string;
  user_id: string;
  breed_id: number;
  name: string;
  gender: 'male' | 'female';
  birth_date: string;
  size: number;
  energy: number;
  friendliness: number;
  trainability: number;
  intelligence: number;
  speed: number;
  agility: number;
  strength: number;
  endurance: number;
  prey_drive: number;
  protectiveness: number;
  speed_trained: number;
  agility_trained: number;
  strength_trained: number;
  endurance_trained: number;
  obedience_trained: number;
  coat_type: string;
  coat_color: string;
  coat_pattern: string;
  eye_color: string;
  genetics?: any;
  hunger: number;
  happiness: number;
  energy_stat: number;
  health: number;
  training_points: number;
  training_sessions_today: number;
  last_training_reset: string;
  bond_level: number;
  bond_xp: number;
  is_rescue: boolean;
  rescue_story?: string;
  parent1_id?: string;
  parent2_id?: string;

  // Breeding fields
  age_weeks: number;
  is_pregnant?: boolean;
  pregnancy_due?: string;
  last_bred?: string;
  litter_size?: number;

  created_at: string;
  last_fed: string;
  last_played: string;
}

export interface UserProfile {
  id: string;
  username: string;
  kennel_name: string;
  cash: number;
  gems: number;
  level: number;
  xp: number;
  training_skill: number;
  care_knowledge: number;
  breeding_expertise: number;
  competition_strategy: number;
  business_acumen: number;
  kennel_level: number;
  created_at: string;
  last_login: string;
  login_streak: number;
  competition_wins_local: number;
  competition_wins_regional: number;
  competition_wins_national: number;
  last_streak_claim?: string;
}

export interface TrainingSession {
  id: number;
  dog_id: string;
  user_id: string;
  training_type: 'speed' | 'agility' | 'strength' | 'endurance' | 'obedience';
  points_gained: number;
  trainer_type: 'self' | 'basic_npc' | 'professional_npc';
  cost: number;
  completed_at: string;
}

export interface Competition {
  id: number;
  dog_id: string;
  user_id: string;
  competition_type: 'agility' | 'obedience' | 'show' | 'weight_pull';
  competition_tier: 'local' | 'regional' | 'national' | 'championship';
  score: number;
  placement: number;
  prize_money: number;
  entry_fee: number;
  manual_play: boolean;
  completed_at: string;
}

export interface ShopItem {
  id: string;
  name: string;
  category: 'food' | 'toy' | 'health' | 'energy' | 'training';
  description: string;
  price: number;
  gem_price?: number;
  icon: string;
  effect: {
    hunger?: number;
    happiness?: number;
    health?: number;
    energy_stat?: number;
    training_points?: number;
  };
  unlock_level: number;
}

// Tutorial System Types
export interface TutorialProgress {
  completedTutorials: string[];
  skippedTutorials: string[];
  dismissedHelp: string[];
  showHelpIcons: boolean;
}

export interface TutorialStep {
  id: string;
  title: string;
  content: string;
  targetSelector?: string;
  spotlightMode: boolean;
  position?: 'center' | 'top' | 'bottom' | 'left' | 'right';
  canSkip: boolean;
}

export interface Tutorial {
  id: string;
  name: string;
  triggerType: 'auto' | 'prompt' | 'manual';
  triggerCondition?: string;
  steps: TutorialStep[];
}

export interface HelpContent {
  id: string;
  title: string;
  content: string;
  tutorialId?: string;
}
