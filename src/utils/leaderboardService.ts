// Leaderboard and rankings service
import { supabase } from '../lib/supabase';
import type {
  CompetitionScore,
  DogChampionshipStats,
  UserLeaderboardStats,
  DogLeaderboardEntry,
  UserLeaderboardEntry,
  LeaderboardFilters,
  CompetitionType,
  CompetitionTier,
} from '../types/leaderboard';

// Submit a competition score
export async function submitCompetitionScore(
  userId: string,
  dogId: string,
  competitionType: CompetitionType,
  tier: CompetitionTier,
  score: number,
  placement: number,
  minigameScore: number,
  eventId?: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const { error } = await supabase.from('competition_scores').insert({
      user_id: userId,
      dog_id: dogId,
      competition_type: competitionType,
      tier,
      score,
      placement,
      minigame_score: minigameScore,
      event_id: eventId,
    });

    if (error) throw error;

    return { success: true };
  } catch (error) {
    console.error('Error submitting competition score:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to submit score',
    };
  }
}

// Get dog leaderboard with filters
export async function getDogLeaderboard(
  filters: LeaderboardFilters
): Promise<DogLeaderboardEntry[]> {
  try {
    let query = supabase
      .from('dog_championship_stats')
      .select(
        `
        *,
        dogs!inner (
          name,
          breed_id,
          user_id,
          users (username, kennel_name)
        )
      `
      )
      .order('total_points', { ascending: false });

    // Apply limit
    if (filters.limit) {
      query = query.limit(filters.limit);
    } else {
      query = query.limit(100); // Default to top 100
    }

    const { data, error } = await query;

    if (error) throw error;

    // Transform data to include dog/user details
    const leaderboard: DogLeaderboardEntry[] = (data || []).map((entry: any) => ({
      ...entry,
      dog_name: entry.dogs?.name || 'Unknown',
      dog_breed: entry.dogs?.breed_id || 'unknown',
      user_name: entry.dogs?.users?.username || entry.dogs?.users?.kennel_name,
    }));

    // Filter by breed if specified
    if (filters.breed) {
      return leaderboard.filter((entry) => entry.dog_breed === filters.breed);
    }

    // Filter by competition type
    if (filters.competition_type) {
      // Sort by specific competition type's best score
      return leaderboard.sort((a, b) => {
        const scoreA = getCompetitionBestScore(a, filters.competition_type!);
        const scoreB = getCompetitionBestScore(b, filters.competition_type!);
        return scoreB - scoreA;
      });
    }

    return leaderboard;
  } catch (error) {
    console.error('Error fetching dog leaderboard:', error);
    return [];
  }
}

// Get user leaderboard
export async function getUserLeaderboard(
  filters: LeaderboardFilters
): Promise<UserLeaderboardEntry[]> {
  try {
    let query = supabase
      .from('user_leaderboard_stats')
      .select(
        `
        *,
        users!inner (username, kennel_name)
      `
      )
      .order('total_championship_points', { ascending: false });

    // Apply limit
    if (filters.limit) {
      query = query.limit(filters.limit);
    } else {
      query = query.limit(100);
    }

    const { data, error } = await query;

    if (error) throw error;

    const leaderboard: UserLeaderboardEntry[] = (data || []).map((entry: any) => ({
      ...entry,
      user_name: entry.users?.username || 'Anonymous',
      kennel_name: entry.users?.kennel_name,
    }));

    return leaderboard;
  } catch (error) {
    console.error('Error fetching user leaderboard:', error);
    return [];
  }
}

// Get competition history for a dog
export async function getDogCompetitionHistory(
  dogId: string,
  limit: number = 20
): Promise<CompetitionScore[]> {
  try {
    const { data, error } = await supabase
      .from('competition_scores')
      .select('*')
      .eq('dog_id', dogId)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) throw error;

    return data || [];
  } catch (error) {
    console.error('Error fetching dog competition history:', error);
    return [];
  }
}

// Get championship stats for a dog
export async function getDogChampionshipStats(
  dogId: string
): Promise<DogChampionshipStats | null> {
  try {
    const { data, error } = await supabase
      .from('dog_championship_stats')
      .select('*')
      .eq('dog_id', dogId)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        // No stats yet - return null
        return null;
      }
      throw error;
    }

    return data;
  } catch (error) {
    console.error('Error fetching dog championship stats:', error);
    return null;
  }
}

// Get leaderboard stats for a user
export async function getUserLeaderboardStats(
  userId: string
): Promise<UserLeaderboardStats | null> {
  try {
    const { data, error } = await supabase
      .from('user_leaderboard_stats')
      .select('*')
      .eq('user_id', userId)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        // No stats yet - return null
        return null;
      }
      throw error;
    }

    return data;
  } catch (error) {
    console.error('Error fetching user leaderboard stats:', error);
    return null;
  }
}

// Get recent competition winners
export async function getRecentWinners(
  competitionType?: CompetitionType,
  limit: number = 10
): Promise<CompetitionScore[]> {
  try {
    let query = supabase
      .from('competition_scores')
      .select('*')
      .eq('placement', 1)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (competitionType) {
      query = query.eq('competition_type', competitionType);
    }

    const { data, error } = await query;

    if (error) throw error;

    return data || [];
  } catch (error) {
    console.error('Error fetching recent winners:', error);
    return [];
  }
}

// Helper: Get best score for a specific competition type
function getCompetitionBestScore(
  stats: DogChampionshipStats,
  type: CompetitionType
): number {
  switch (type) {
    case 'agility':
      return stats.agility_best_score;
    case 'racing':
      return stats.racing_best_score;
    case 'obedience':
      return stats.obedience_best_score;
    case 'weight_pull':
      return stats.weight_pull_best_score;
    default:
      return 0;
  }
}

// Calculate global rankings (run periodically server-side ideally)
export async function calculateGlobalRankings(): Promise<void> {
  try {
    // Fetch all dog stats ordered by total points
    const { data: dogStats, error: dogError } = await supabase
      .from('dog_championship_stats')
      .select('id, dog_id, total_points')
      .order('total_points', { ascending: false });

    if (dogError) throw dogError;

    // Update ranks
    if (dogStats) {
      for (let i = 0; i < dogStats.length; i++) {
        await supabase
          .from('dog_championship_stats')
          .update({ global_rank: i + 1 })
          .eq('id', dogStats[i].id);
      }
    }

    // Fetch all user stats ordered by total championship points
    const { data: userStats, error: userError } = await supabase
      .from('user_leaderboard_stats')
      .select('id, user_id, total_championship_points')
      .order('total_championship_points', { ascending: false });

    if (userError) throw userError;

    // Update ranks
    if (userStats) {
      for (let i = 0; i < userStats.length; i++) {
        await supabase
          .from('user_leaderboard_stats')
          .update({ global_rank: i + 1 })
          .eq('id', userStats[i].id);
      }
    }
  } catch (error) {
    console.error('Error calculating global rankings:', error);
  }
}
