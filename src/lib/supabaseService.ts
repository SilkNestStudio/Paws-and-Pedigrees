import { supabase } from './supabase';
import { Dog, UserProfile } from '../types';
import { StoryProgress } from '../types/story';

// ============ USER PROFILE ============

export async function loadUserProfile(userId: string): Promise<UserProfile | null> {
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', userId)
    .maybeSingle(); // Use maybeSingle() instead of single() to handle 0 rows gracefully

  if (error) {
    console.error('Error loading user profile:', error);
    return null;
  }

  // If no profile exists, return null (will be created by the game)
  return data as UserProfile | null;
}

export async function saveUserProfile(profile: UserProfile): Promise<boolean> {
  console.log('Attempting to save profile:', { id: profile.id, username: profile.username });

  const { data, error } = await supabase
    .from('profiles')
    .upsert(profile, { onConflict: 'id' });

  if (error) {
    console.error('❌ ERROR saving user profile:', {
      message: error.message,
      details: error.details,
      hint: error.hint,
      code: error.code,
      profile_id: profile.id
    });

    // Check for common RLS issues
    if (error.code === '42501' || error.message.includes('permission denied') || error.message.includes('policy')) {
      console.error('🔒 RLS POLICY ERROR: The profiles table has Row Level Security enabled but no policy allows this insert/update.');
      console.error('💡 FIX: Go to Supabase Dashboard → Authentication → Policies and add an INSERT/UPDATE policy for the profiles table');
    }

    return false;
  }

  console.log('✅ Profile saved successfully:', data);
  return true;
}

// ============ DOGS ============

export async function loadUserDogs(userId: string): Promise<Dog[]> {
  const { data, error } = await supabase
    .from('dogs')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Error loading dogs:', error);
    return [];
  }

  return data as Dog[];
}

export async function saveDog(dog: Dog): Promise<boolean> {
  // Remove computed fields that don't exist in the database
  const { age_years, ...dogWithoutComputedFields } = dog as any;

  const { error } = await supabase
    .from('dogs')
    .upsert(dogWithoutComputedFields, { onConflict: 'id' });

  if (error) {
    console.error('Error saving dog:', error);
    return false;
  }

  return true;
}

export async function deleteDog(dogId: string): Promise<boolean> {
  const { error } = await supabase
    .from('dogs')
    .delete()
    .eq('id', dogId);

  if (error) {
    console.error('Error deleting dog:', error);
    return false;
  }

  return true;
}

// ============ COMPETITION RESULTS ============

export async function saveCompetitionResult(result: {
  user_id: string;
  dog_id: string;
  competition_type: string;
  tier: string;
  placement: number;
  score: number;
  prize_money: number;
}): Promise<boolean> {
  const { error } = await supabase
    .from('competition_results')
    .insert(result);

  if (error) {
    console.error('Error saving competition result:', error);
    return false;
  }

  return true;
}

export async function loadCompetitionResults(userId: string) {
  const { data, error } = await supabase
    .from('competition_results')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(50);

  if (error) {
    console.error('Error loading competition results:', error);
    return [];
  }

  return data;
}

// ============ STORY PROGRESS ============

export async function loadStoryProgress(userId: string): Promise<StoryProgress | null> {
  const { data, error } = await supabase
    .from('story_progress')
    .select('*')
    .eq('user_id', userId)
    .maybeSingle();

  if (error) {
    console.error('Error loading story progress:', error);
    return null;
  }

  if (!data) {
    // Return default story progress if none exists
    return {
      completedChapters: [],
      currentChapter: null,
      objectiveProgress: {},
      claimedRewards: [],
    };
  }

  // Transform database format to client format
  return {
    completedChapters: data.completed_chapters || [],
    currentChapter: data.current_chapter || null,
    objectiveProgress: data.chapter_objectives || {},
    claimedRewards: data.claimed_rewards || [],
  };
}

export async function saveStoryProgress(userId: string, progress: StoryProgress): Promise<boolean> {
  console.log('Attempting to save story progress:', { userId, progress });

  // Transform client format to database format
  const dbProgress = {
    user_id: userId,
    current_chapter: progress.currentChapter,
    completed_chapters: progress.completedChapters,
    chapter_objectives: progress.objectiveProgress,
    claimed_rewards: progress.claimedRewards,
    story_completed: progress.completedChapters.length >= 10, // Assuming 10 chapters total
  };

  const { data, error } = await supabase
    .from('story_progress')
    .upsert(dbProgress, { onConflict: 'user_id' });

  if (error) {
    console.error('❌ ERROR saving story progress:', {
      message: error.message,
      details: error.details,
      hint: error.hint,
      code: error.code,
      userId
    });

    if (error.code === '42501' || error.message.includes('permission denied') || error.message.includes('policy')) {
      console.error('🔒 RLS POLICY ERROR: The story_progress table has Row Level Security enabled but no policy allows this insert/update.');
      console.error('💡 FIX: Go to Supabase Dashboard → Authentication → Policies and add an INSERT/UPDATE policy for the story_progress table');
    }

    return false;
  }

  console.log('✅ Story progress saved successfully:', data);
  return true;
}

// ============ SYNC HELPERS ============

/**
 * Load all user data from Supabase
 */
export async function loadUserData(userId: string) {
  const [profile, dogs, storyProgress] = await Promise.all([
    loadUserProfile(userId),
    loadUserDogs(userId),
    loadStoryProgress(userId),
  ]);

  return { profile, dogs, storyProgress };
}

/**
 * Sync local state to Supabase (debounced save)
 */
let saveTimeout: NodeJS.Timeout;
export function debouncedSave(fn: () => Promise<any>, delay: number = 1000) {
  clearTimeout(saveTimeout);
  saveTimeout = setTimeout(fn, delay);
}
