// Leaderboard and rankings types

export type CompetitionType = 'agility' | 'racing' | 'obedience' | 'weight_pull' | 'conformation';
export type CompetitionTier = 'local' | 'regional' | 'national';

export interface CompetitionScore {
  id: string;
  user_id: string;
  dog_id: string;
  competition_type: CompetitionType;
  tier: CompetitionTier;
  score: number;
  placement: number;
  minigame_score: number;
  created_at: string;
  event_id?: string;
}

export interface DogChampionshipStats {
  id: string;
  dog_id: string;

  // Overall stats
  total_competitions: number;
  total_wins: number;
  total_points: number;

  // Agility stats
  agility_competitions: number;
  agility_wins: number;
  agility_best_score: number;

  // Racing stats
  racing_competitions: number;
  racing_wins: number;
  racing_best_score: number;

  // Obedience stats
  obedience_competitions: number;
  obedience_wins: number;
  obedience_best_score: number;

  // Weight pull stats
  weight_pull_competitions: number;
  weight_pull_wins: number;
  weight_pull_best_score: number;

  // Conformation stats
  conformation_competitions: number;
  conformation_wins: number;
  conformation_best_score: number;

  // Rankings
  global_rank?: number;
  breed_rank?: number;

  updated_at: string;
}

export interface UserLeaderboardStats {
  id: string;
  user_id: string;

  // Overall stats
  total_competitions: number;
  total_wins: number;
  total_championship_points: number;
  total_prize_money: number;

  // Per-competition wins
  agility_wins: number;
  racing_wins: number;
  obedience_wins: number;
  weight_pull_wins: number;
  conformation_wins: number;

  // Champions owned
  champions_owned: number;
  grand_champions_owned: number;

  // Ranking
  global_rank?: number;

  updated_at: string;
}

// Leaderboard entry with dog/user details
export interface DogLeaderboardEntry extends DogChampionshipStats {
  dog_name: string;
  dog_breed: string;
  user_name?: string;
}

export interface UserLeaderboardEntry extends UserLeaderboardStats {
  user_name: string;
  kennel_name?: string;
}

// Leaderboard filter options
export type LeaderboardCategory = 'global' | 'breed' | 'competition_type';
export type LeaderboardTimeframe = 'all_time' | 'this_month' | 'this_week';

export interface LeaderboardFilters {
  category: LeaderboardCategory;
  competition_type?: CompetitionType;
  breed?: string;
  timeframe: LeaderboardTimeframe;
  limit?: number;
}
