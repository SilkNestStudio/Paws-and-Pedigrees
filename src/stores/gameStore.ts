import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { Dog, UserProfile, TutorialProgress } from '../types';
import { StoryProgress, StoryChapter } from '../types/story';
import { ShopItemEffect } from '../types/effects';
import { supabase } from '../lib/supabase';
import {
  loadUserData,
  saveUserProfile,
  saveDog,
  deleteDog as deleteDogFromDb,
  debouncedSave,
  saveStoryProgress
} from '../lib/supabaseService';
import { calculateLoginStreak, getDailyReward } from '../utils/dailyRewards';
import {
  calculateFoodConsumption,
  calculateHungerRestoration,
  calculateThirstRestoration,
  calculateEnergyFromEating,
  calculateEnergyFromResting,
} from '../utils/careCalculations';
import { canAddDog } from '../utils/kennelCapacity';
import { checkBondLevelUp, calculateBondXpGain } from '../utils/bondSystem';
import {
  calculateAgeInWeeks,
  calculateAgeInYears,
  getLifeStage,
  hasReachedMaxAge,
  calculatePregnancyDue,
} from '../utils/timeScaling';
import {
  calculateHealthDecay,
  getHealthStatus,
  visitVet,
  visitEmergencyVet,
  reviveDog,
  VET_COST,
  EMERGENCY_VET_COST,
  // REVIVAL_GEM_COST,
} from '../utils/healthDecay';
import { applyHungerThirstDecay } from '../utils/hungerThirstDecay';
import {
  checkForIllness,
  checkRecoveryComplete,
  completeRecovery,
  applyAilment,
  treatAilment,
  getAilmentById,
} from '../utils/veterinarySystem';
import {
  canUpgradeKennel,
  getKennelLevelInfo,
} from '../utils/kennelUpgrades';
import {
  PUPPY_TRAINING_PROGRAMS,
  MAX_FREE_PUPPY_TRAINING_SLOTS,
  THIRD_SLOT_GEM_COST,
  calculateCompletionTime,
  isTrainingComplete,
} from '../data/puppyTraining';
import { trackStoryAction } from '../utils/storyObjectiveTracking';
import { storyChapters } from '../data/storyChapters';
import { getItem } from '../data/items';
import type { InventoryItem } from '../types';
import { showToast } from '../lib/toast';
import { checkLevelUp, getLevelFromXP } from '../utils/levelProgression';
import { initializeWeather, updateWeather } from '../utils/weatherSystem';
import type { CompetitionEvent, EventRegistration, ChampionshipProgress } from '../types/competition';
import {
  generateEventsForPeriod,
  updateEventStatuses,
  pruneOldEvents,
  getAvailableEvents,
} from '../utils/eventScheduler';
import {
  calculateChampionshipPoints,
  updateChampionshipProgressAfterCompetition,
  calculateChampionshipProgress,
  // checkTitleEarned,
  TITLE_REQUIREMENTS,
} from '../utils/championshipCalculations';

// Helper function for ordinal suffixes (1st, 2nd, 3rd, 4th)
function getOrdinalSuffix(num: number): string {
  const j = num % 10;
  const k = num % 100;
  if (j === 1 && k !== 11) return 'st';
  if (j === 2 && k !== 12) return 'nd';
  if (j === 3 && k !== 13) return 'rd';
  return 'th';
}

interface GameState {
  user: UserProfile | null;
  dogs: Dog[];
  selectedDog: Dog | null;
  hasAdoptedFirstDog: boolean;
  syncEnabled: boolean;
  loading: boolean;
  error: string | null;

  // Tutorial state
  tutorialProgress: TutorialProgress;
  activeTutorial: string | null;

  // Story mode state
  storyProgress: StoryProgress;

  // Competition event system
  competitionEvents: CompetitionEvent[];
  eventRegistrations: EventRegistration[];
  championshipProgress: Record<string, ChampionshipProgress>;

  // Supabase sync methods
  loadFromSupabase: (userId: string) => Promise<void>;
  setSyncEnabled: (enabled: boolean) => void;

  setUser: (user: UserProfile) => void;
  addDog: (dog: Dog) => void;
  updateDog: (dogId: string, updates: Partial<Dog>) => void;
  selectDog: (dog: Dog | null) => void;
  updateUserCash: (amount: number) => void;
  updateUserGems: (amount: number) => void;
  updateUserXP: (amount: number) => void;
  updateCompetitionWins: (tier: 'local' | 'regional' | 'national') => void;
  updateGameWeather: () => void; // Update weather based on real time
  setHasAdoptedFirstDog: (value: boolean) => void;
  claimDailyReward: () => void;

  // Tutorial actions
  startTutorial: (tutorialId: string) => void;
  completeTutorial: (tutorialId: string) => void;
  skipTutorial: (tutorialId: string) => void;
  dismissHelp: (helpId: string) => void;
  toggleHelpIcons: (show: boolean) => void;

  // Story mode actions
  updateObjectiveProgress: (chapterId: string, objectiveId: string, amount: number) => void;
  completeChapter: (chapterId: string) => void;
  claimChapterRewards: (chapterId: string) => { success: boolean; message: string };
  setCurrentChapter: (chapterId: string | null) => void;

  // Breeding actions
  breedDogs: (sireId: string, damId: string, litterSize: number) => void;
  giveBirth: (damId: string, puppies: Dog[]) => void;
  sellPuppy: (puppyId: string, price: number) => void;
  skipPregnancy: (damId: string, gemCost: number) => void;
  removeDog: (dogId: string) => void;
  sellDog: (dogId: string) => { success: boolean; message?: string; price?: number };

  // Shop actions
  purchaseBreed: (dog: Dog, cashCost: number, gemCost: number) => { success: boolean; message?: string };
  purchaseItem: (dogId: string, effects: ShopItemEffect, cashCost: number, gemCost: number) => void;

  // Kennel upgrade
  upgradeKennel: () => { success: boolean; message?: string; newLevel?: number };

  // Care actions
  feedDog: (dogId: string) => { success: boolean; message?: string };
  waterDog: (dogId: string) => { success: boolean; message?: string };
  restDog: (dogId: string) => { success: boolean; message?: string };
  refillTrainingPoints: (dogId: string) => { success: boolean; message?: string; gemCost?: number };

  // Health & Vet actions
  updateDogAgesAndHealth: () => void;
  takeToVet: (dogId: string) => { success: boolean; message?: string };
  takeToEmergencyVet: (dogId: string) => { success: boolean; message?: string };
  reviveDeadDog: (dogId: string) => { success: boolean; message?: string };
  retireDog: (dogId: string) => { success: boolean; message?: string };

  // Veterinary/Ailment actions
  treatDogAilment: (dogId: string, cost: number) => { success: boolean; message?: string };
  checkForRandomIllness: (dogId: string) => void;
  applyInjuryToDog: (dogId: string, ailmentId: string) => void;

  // Puppy training actions
  startPuppyTraining: (dogId: string, programId: string) => { success: boolean; message: string };
  completePuppyTraining: (dogId: string) => void;
  unlockThirdTrainingSlot: (dogId: string) => { success: boolean; message: string };
  checkPuppyTrainingCompletion: (dogId: string) => void;

  // Inventory actions
  addItemToInventory: (itemId: string, quantity: number) => void;
  removeItemFromInventory: (itemId: string, quantity: number) => boolean;
  useItem: (itemId: string, dogId?: string) => { success: boolean; message: string };
  getInventoryItem: (itemId: string) => { itemId: string; quantity: number } | undefined;

  // Competition event actions
  initializeEventSystem: () => void;
  updateEventSystem: () => void;
  registerForEvent: (eventId: string, dogId: string) => { success: boolean; message: string };
  withdrawFromEvent: (eventId: string, dogId: string) => { success: boolean; message: string };
  getAvailableEventsForDisplay: () => CompetitionEvent[];
  getDogRegistrations: (dogId: string) => EventRegistration[];
  awardChampionshipPoints: (
    dogId: string,
    eventId: string,
    placement: number,
    score: number
  ) => { success: boolean; message: string; titleEarned?: string };

  // Reset game
  resetGame: () => void;
}

export const useGameStore = create<GameState>()(
  persist(
    // @ts-ignore - Complex Zustand type inference issue
    (set) => ({
      user: {
        id: 'temp-user-id',
        username: 'Player',
        kennel_name: 'My Kennel',
        cash: 500,
        gems: 50,
        level: 1,
        xp: 0,
        training_skill: 1,
        care_knowledge: 1,
        breeding_expertise: 1,
        competition_strategy: 1,
        business_acumen: 1,
        kennel_level: 1,
        food_storage: 0, // Start with empty food storage
        created_at: new Date().toISOString(),
        last_login: new Date().toISOString(),
        login_streak: 1,
        competition_wins_local: 0,
        competition_wins_regional: 0,
        competition_wins_national: 0,
        weather: initializeWeather(), // Initialize weather system
      },
      dogs: [],
      selectedDog: null,
      hasAdoptedFirstDog: false,
      syncEnabled: false,
      loading: false,
      error: null,
      tutorialProgress: {
        completedTutorials: [],
        skippedTutorials: [],
        dismissedHelp: [],
        showHelpIcons: true,
      },
      activeTutorial: null,
      storyProgress: {
        completedChapters: [],
        currentChapter: null,
        objectiveProgress: {},
        claimedRewards: [],
      },
      competitionEvents: [],
      eventRegistrations: [],
      championshipProgress: {},

      // Supabase sync methods
      loadFromSupabase: async (userId: string) => {
        set({ loading: true, error: null });
        try {
          const { profile, dogs, storyProgress } = await loadUserData(userId);

          // Track dogs that need training auto-completion
          const dogsToAutoComplete: string[] = [];

          // If profile doesn't exist, create a new one
          if (!profile) {
            console.log('No profile found for user, creating new profile...');

            // Get auth user metadata for username and kennel name
            const { data: { user: authUser } } = await supabase.auth.getUser();
            const username = authUser?.user_metadata?.username || 'Player';
            const kennelName = authUser?.user_metadata?.kennel_name || 'My Kennel';

            // Create default profile
            const newProfile: UserProfile = {
              id: userId,
              username,
              kennel_name: kennelName,
              cash: 1000,
              gems: 50,
              level: 1,
              xp: 0,
              training_skill: 1,
              care_knowledge: 1,
              breeding_expertise: 1,
              competition_strategy: 1,
              business_acumen: 1,
              kennel_level: 1,
              food_storage: 0,
              created_at: new Date().toISOString(),
              last_login: new Date().toISOString(),
              login_streak: 1,
              competition_wins_local: 0,
              competition_wins_regional: 0,
              competition_wins_national: 0,
              weather: initializeWeather(),
            };

            // Save the new profile to Supabase
            console.log('Saving new profile to Supabase...', newProfile);
            const saveSuccess = await saveUserProfile(newProfile);

            if (!saveSuccess) {
              console.error('Failed to save profile to Supabase!');
              throw new Error('Failed to create user profile. Check browser console (F12) for details. This is usually a database permissions issue.');
            }

            console.log('Profile created successfully!');
            set({
              user: newProfile,
              dogs: [],
              syncEnabled: true,
              hasAdoptedFirstDog: false,
              loading: false,
              error: null,
              storyProgress: storyProgress || {
                completedChapters: [],
                currentChapter: null,
                objectiveProgress: {},
                claimedRewards: [],
              }
            });
          } else {
            // Profile exists, load it normally
            // Fix level if it doesn't match XP (for existing users)
            const correctLevel = getLevelFromXP(profile.xp);
            const profileWithCorrectLevel = {
              ...profile,
              level: correctLevel,
            };

            // Save corrected level if it changed
            if (correctLevel !== profile.level) {
              console.log(`Correcting user level from ${profile.level} to ${correctLevel} based on ${profile.xp} XP`);
              await saveUserProfile(profileWithCorrectLevel);
            }

            // Clean up duplicate puppy training entries (migration for existing users)
            const cleanedDogs = (dogs || []).map(dog => {
              let updatedDog = { ...dog };
              let needsUpdate = false;

              // Remove duplicate completed training entries
              if (dog.completed_puppy_training && dog.completed_puppy_training.length > 0) {
                const uniquePrograms = [...new Set(dog.completed_puppy_training)];
                if (uniquePrograms.length !== dog.completed_puppy_training.length) {
                  console.log(`Removing ${dog.completed_puppy_training.length - uniquePrograms.length} duplicate puppy training entries from ${dog.name}`);
                  updatedDog.completed_puppy_training = uniquePrograms;
                  needsUpdate = true;
                }
              }

              // Handle puppy training completion
              if (dog.active_puppy_training) {
                const isAlreadyCompleted = dog.completed_puppy_training?.includes(dog.active_puppy_training);
                const isPastCompletionTime = dog.training_completion_time && new Date(dog.training_completion_time) < new Date();

                if (isAlreadyCompleted) {
                  // Training already completed, just clear the active state
                  console.log(`Clearing duplicate puppy training state from ${dog.name}`);
                  updatedDog.active_puppy_training = undefined;
                  updatedDog.training_completion_time = undefined;
                  needsUpdate = true;
                } else if (isPastCompletionTime) {
                  // Training time elapsed - need to complete it properly
                  console.log(`Auto-completing expired puppy training for ${dog.name}`);

                  // We can't call completePuppyTraining here because we're in loadFromSupabase
                  // Instead, we'll mark this dog to be completed after load
                  dogsToAutoComplete.push(dog.id);
                }
              }

              return needsUpdate ? updatedDog : dog;
            });

            // Save cleaned dogs if any were modified
            for (let i = 0; i < cleanedDogs.length; i++) {
              if (cleanedDogs[i] !== (dogs || [])[i]) {
                await saveDog(cleanedDogs[i]);
              }
            }

            set({
              user: profileWithCorrectLevel,
              dogs: cleanedDogs,
              syncEnabled: true,
              hasAdoptedFirstDog: cleanedDogs.length > 0,
              loading: false,
              error: null,
              storyProgress: storyProgress || {
                completedChapters: [],
                currentChapter: null,
                objectiveProgress: {},
                claimedRewards: [],
              }
            });

            // Auto-complete any expired puppy training
            const store = useGameStore.getState();
            for (const dogId of dogsToAutoComplete) {
              console.log(`Auto-completing training for dog ${dogId}`);
              store.completePuppyTraining(dogId);
            }

            // Update all dog ages and health after loading
            store.updateDogAgesAndHealth();
          }
        } catch (error) {
          console.error('Error loading from Supabase:', error);
          set({
            loading: false,
            error: error instanceof Error ? error.message : 'Failed to load game data'
          });
        }
      },

      setSyncEnabled: (enabled: boolean) => set({ syncEnabled: enabled }),

      setUser: (user) => {
        set({ user });
        // Save to Supabase if sync is enabled
        const state = useGameStore.getState();
        if (state.syncEnabled && user) {
          debouncedSave(() => saveUserProfile(user));
        }
      },
      
      addDog: (dog) => {
        const state = useGameStore.getState();

        // Check kennel capacity before adding
        if (!canAddDog(state.dogs.length, state.user?.level || 1)) {
          console.warn('Kennel is at capacity! Cannot add more dogs.');
          return;
        }

        set((state: GameState) => ({
          dogs: [...state.dogs, dog],
          selectedDog: dog
        }));

        // Save to Supabase if sync is enabled
        if (state.syncEnabled) {
          saveDog(dog);
        }
      },

      updateDog: (dogId: string, updates: Partial<Dog>) => {
        set((state: GameState) => ({
          dogs: state.dogs.map((dog: Dog) =>
            dog.id === dogId ? { ...dog, ...updates } : dog
          ),
          selectedDog: state.selectedDog?.id === dogId
            ? { ...state.selectedDog, ...updates }
            : state.selectedDog
        }));
        // Save to Supabase if sync is enabled
        const state = useGameStore.getState();
        if (state.syncEnabled) {
          const updatedDog = state.dogs.find((d: Dog) => d.id === dogId);
          if (updatedDog) {
            debouncedSave(() => saveDog(updatedDog));
          }
        }
      },

      // @ts-ignore - Type mismatch with Dog | null
      selectDog: (dog: Dog) => set({ selectedDog: dog }),

      updateUserCash: (amount: number) => {
        set((state: GameState) => ({
          user: state.user ? { ...state.user, cash: state.user.cash + amount } : null
        }));
        // Save to Supabase if sync is enabled
        const state = useGameStore.getState();
        if (state.syncEnabled && state.user) {
          debouncedSave(() => saveUserProfile(state.user!));
        }
      },

      updateUserGems: (amount: number) => {
        set((state: GameState) => ({
          user: state.user ? { ...state.user, gems: state.user.gems + amount } : null
        }));
        // Save to Supabase if sync is enabled
        const state = useGameStore.getState();
        if (state.syncEnabled && state.user) {
          debouncedSave(() => saveUserProfile(state.user!));
        }
      },

      updateUserXP: (amount: number) => {
        const currentState = useGameStore.getState();
        if (!currentState.user) return;

        const oldXP = currentState.user.xp;
        const newXP = oldXP + amount;

        // Check for level up
        const levelUpResult = checkLevelUp(oldXP, newXP);

        set((state: GameState) => {
          if (!state.user) return {};

          const updates: Partial<UserProfile> = {
            xp: newXP,
          };

          // Apply level up rewards if leveled up
          if (levelUpResult) {
            updates.level = levelUpResult.newLevel;
            updates.cash = state.user.cash + levelUpResult.rewards.cash;
            updates.gems = state.user.gems + levelUpResult.rewards.gems;

            // Show level up notification
            showToast.levelUp(
              `Level Up! You reached Level ${levelUpResult.newLevel}! +${levelUpResult.rewards.cash} cash, +${levelUpResult.rewards.gems} gems`
            );

            // Show kennel slot reward if applicable
            if (levelUpResult.rewards.kennelSlots > 0) {
              showToast.reward(
                `Kennel expanded! +${levelUpResult.rewards.kennelSlots} dog slots`
              );
            }
          }

          return {
            user: { ...state.user, ...updates },
          };
        });

        // Save to Supabase if sync is enabled
        const state = useGameStore.getState();
        if (state.syncEnabled && state.user) {
          debouncedSave(() => saveUserProfile(state.user!));
        }
      },

      updateCompetitionWins: (tier: 'local' | 'regional' | 'national') => {
        set((state: GameState) => {
          if (!state.user) return {};
          const updates: Partial<UserProfile> = {};
          if (tier === 'local') updates.competition_wins_local = (state.user.competition_wins_local || 0) + 1;
          if (tier === 'regional') updates.competition_wins_regional = (state.user.competition_wins_regional || 0) + 1;
          if (tier === 'national') updates.competition_wins_national = (state.user.competition_wins_national || 0) + 1;
          return { user: { ...state.user, ...updates } };
        });

        // Track story objective for competition wins
        trackStoryAction('compete', { competitionTier: tier, competitionWon: true });

        // Save to Supabase if sync is enabled
        const state = useGameStore.getState();
        if (state.syncEnabled && state.user) {
          debouncedSave(() => saveUserProfile(state.user!));
        }
      },

      updateGameWeather: () => {
        set((state: GameState) => {
          if (!state.user) return {};

          // Initialize weather if it doesn't exist (for existing users)
          if (!state.user.weather) {
            return {
              user: {
                ...state.user,
                weather: initializeWeather(),
              },
            };
          }

          // Update weather based on time elapsed
          const updatedWeather = updateWeather(state.user.weather);

          // Only update if weather actually changed (prevent infinite loop)
          if (updatedWeather === state.user.weather) {
            return {}; // No change needed
          }

          return {
            user: {
              ...state.user,
              weather: updatedWeather,
            },
          };
        });

        // Save to Supabase if sync is enabled
        const state = useGameStore.getState();
        if (state.syncEnabled && state.user) {
          debouncedSave(() => saveUserProfile(state.user!));
        }
      },

      setHasAdoptedFirstDog: (value: boolean) => set({ hasAdoptedFirstDog: value }),

      // Breeding actions
      breedDogs: (sireId: string, damId: string, litterSize: number) => set((state: GameState) => {
        const now = new Date().toISOString();
        const pregnancyDue = calculatePregnancyDue(); // Use time scaling system (24 hours)

        // Track story objective for breeding
        trackStoryAction('breed', { breedingAction: 'breed' });

        return {
          dogs: state.dogs.map((dog: Dog) => {
            if (dog.id === damId) {
              return {
                ...dog,
                is_pregnant: true,
                pregnancy_due: pregnancyDue,
                last_bred: now,
                litter_size: litterSize,
              };
            }
            if (dog.id === sireId) {
              return {
                ...dog,
                last_bred: now,
              };
            }
            return dog;
          }),
        };
      }),

      giveBirth: (damId: string, puppies: Dog[]) => set((state: GameState) => {
        // Track story objective for birth (count each puppy)
        trackStoryAction('breed', { breedingAction: 'birth', amount: puppies.length });

        return {
          dogs: [
            ...state.dogs.map((dog: Dog) =>
              dog.id === damId
                ? { ...dog, is_pregnant: false, pregnancy_due: undefined, litter_size: undefined }
                : dog
            ),
            ...puppies,
          ],
        };
      }),

      sellPuppy: (puppyId: string, price: number) => set((state: GameState) => ({
        dogs: state.dogs.filter((dog: Dog) => dog.id !== puppyId),
        selectedDog: state.selectedDog?.id === puppyId ? null : state.selectedDog,
        user: state.user ? { ...state.user, cash: state.user.cash + price } : null,
      })),

      skipPregnancy: (damId: string, gemCost: number) => set((state: GameState) => {
        if (!state.user || state.user.gems < gemCost) return {};

        return {
          user: { ...state.user, gems: state.user.gems - gemCost },
          dogs: state.dogs.map((dog: Dog) =>
            dog.id === damId
              ? { ...dog, pregnancy_due: new Date().toISOString() } // Set due date to now
              : dog
          ),
        };
      }),

      removeDog: (dogId: string) => {
        set((state: GameState) => ({
          dogs: state.dogs.filter((dog: Dog) => dog.id !== dogId),
          selectedDog: state.selectedDog?.id === dogId ? null : state.selectedDog,
        }));
        // Delete from Supabase if sync is enabled
        const state = useGameStore.getState();
        if (state.syncEnabled) {
          deleteDogFromDb(dogId);
        }
      },

      sellDog: (dogId: string): { success: boolean; message?: string; price?: number } => {
        const state = useGameStore.getState();
        const dog = state.dogs.find((d: Dog) => d.id === dogId);

        if (!dog) {
          return { success: false, message: 'Dog not found' };
        }

        if (!state.user) {
          return { success: false, message: 'No user found' };
        }

        // Start with base stats value
        const baseStats = (dog.speed + dog.agility + dog.strength + dog.intelligence + dog.trainability) / 5;
        let sellPrice = baseStats * 15; // $15 per base stat point

        // Add HUGE value for trained stats (this is your investment!)
        const trainedStats = (dog.speed_trained || 0) + (dog.agility_trained || 0) + (dog.strength_trained || 0);
        sellPrice += trainedStats * 50; // $50 per trained stat point (training is valuable!)

        // Add value for competition experience
        // Note: competition_wins are tracked on UserProfile, not Dog
        // const totalWins = (dog.competition_wins_local || 0) +
        //                   (dog.competition_wins_regional || 0) * 2 +
        //                   (dog.competition_wins_national || 0) * 5;
        // sellPrice += totalWins * 100; // $100 per local win, $200 regional, $500 national

        // Add value for certifications and titles
        if (dog.certifications && dog.certifications.length > 0) {
          sellPrice += dog.certifications.length * 300; // $300 per certification
        }

        // Add value for prestige points
        if (dog.prestigePoints && dog.prestigePoints > 0) {
          sellPrice += dog.prestigePoints * 50; // $50 per prestige point
        }

        // Add value for obedience training
        if (dog.obedience_trained && dog.obedience_trained > 0) {
          sellPrice += dog.obedience_trained * 20; // $20 per obedience point
        }

        // Add value for specialization progress
        if (dog.specialization && dog.specialization.tier > 1) {
          sellPrice += (dog.specialization.tier - 1) * 500; // $500 per specialization tier
        }

        // Add value for completed puppy training programs
        if (dog.completed_puppy_training && dog.completed_puppy_training.length > 0) {
          sellPrice += dog.completed_puppy_training.length * 200; // $200 per program
        }

        // Age factor (prime age dogs are worth more)
        const ageYears = (dog.age_weeks || 0) / 52;
        let ageFactor = 1.0;
        if (ageYears < 1) ageFactor = 0.8; // Puppies not fully trained yet
        else if (ageYears >= 1 && ageYears < 7) ageFactor = 1.2; // Prime age - worth MORE
        else if (ageYears >= 7) ageFactor = 0.8; // Senior dogs

        sellPrice *= ageFactor;

        // Health penalty (only if very unhealthy)
        if (dog.health < 50) {
          sellPrice *= 0.7; // 30% reduction for poor health
        } else if (dog.health < 80) {
          sellPrice *= 0.9; // 10% reduction for moderate health
        }

        // Small bond bonus (well-bonded dogs are more desirable!)
        const bondBonus = 1 + (dog.bond_level * 0.02); // 2% bonus per bond level
        sellPrice *= bondBonus;

        // Minimum floor price based on base stats (always worth something)
        const minPrice = Math.max(100, baseStats * 10);
        sellPrice = Math.max(minPrice, Math.floor(sellPrice));

        // Remove dog and add cash
        set((state: GameState) => ({
          dogs: state.dogs.filter((d: Dog) => d.id !== dogId),
          selectedDog: state.selectedDog?.id === dogId ? null : state.selectedDog,
          user: state.user ? {
            ...state.user,
            cash: state.user.cash + sellPrice
          } : null,
        }));

        // Delete from Supabase if sync is enabled
        if (state.syncEnabled) {
          deleteDogFromDb(dogId);
          if (state.user) {
            debouncedSave(() => saveUserProfile(state.user!));
          }
        }

        return { success: true, price: sellPrice };
      },

      // Shop actions
      purchaseBreed: (dog: Dog, cashCost: number, gemCost: number): { success: boolean; message?: string } => {
        const state = useGameStore.getState();

        if (!state.user) {
          return { success: false, message: 'No user found' };
        }

        // Check if user has enough currency
        if (cashCost > 0 && state.user.cash < cashCost) {
          return { success: false, message: `Not enough cash! Need $${cashCost}` };
        }
        if (gemCost > 0 && state.user.gems < gemCost) {
          return { success: false, message: `Not enough gems! Need ${gemCost} gems` };
        }

        // Check kennel capacity
        if (!canAddDog(state.dogs.length, state.user.level)) {
          return { success: false, message: 'Kennel is at capacity! Level up to add more dogs.' };
        }

        // Track story objective for buying a breed
        trackStoryAction('shop', { shopAction: 'buy_breed' });

        set((state: GameState) => ({
          dogs: [...state.dogs, dog],
          selectedDog: dog,
          user: state.user ? {
            ...state.user,
            cash: state.user.cash - cashCost,
            gems: state.user.gems - gemCost,
          } : null,
        }));

        return { success: true };
      },

      purchaseItem: (dogId: string, effects: ShopItemEffect, cashCost: number, gemCost: number) => set((state: GameState) => {
        if (!state.user) return {};

        // Check if user has enough currency
        if (cashCost > 0 && state.user.cash < cashCost) return {};
        if (gemCost > 0 && state.user.gems < gemCost) return {};

        // Check if adding food storage would exceed max capacity
        if (effects.food_storage !== undefined) {
          const newStorage = (state.user.food_storage ?? 0) + effects.food_storage;
          if (newStorage > 100) {
            // Don't allow purchase if it would overflow storage
            return {};
          }
        }

        // Track story objective for buying food
        if (effects.food_storage !== undefined) {
          trackStoryAction('shop', { shopAction: 'buy_food' });
        }

        return {
          dogs: state.dogs.map((dog: Dog) => {
            if (dog.id !== dogId) return dog;

            // Apply effects to dog
            const updates: Partial<Dog> = {};
            if (effects.hunger !== undefined) {
              updates.hunger = Math.min(100, dog.hunger + effects.hunger);
            }
            if (effects.thirst !== undefined) {
              updates.thirst = Math.min(100, dog.thirst + effects.thirst);
            }
            if (effects.happiness !== undefined) {
              updates.happiness = Math.min(100, dog.happiness + effects.happiness);
            }
            if (effects.health !== undefined) {
              updates.health = Math.min(100, dog.health + effects.health);
            }
            if (effects.energy_stat !== undefined) {
              updates.energy_stat = Math.min(100, dog.energy_stat + effects.energy_stat);
            }
            if (effects.training_points !== undefined) {
              updates.training_points = dog.training_points + effects.training_points;
            }

            return { ...dog, ...updates };
          }),
          selectedDog: state.selectedDog?.id === dogId
            ? {
                ...state.selectedDog,
                ...(effects.hunger !== undefined && { hunger: Math.min(100, state.selectedDog.hunger + effects.hunger) }),
                ...(effects.thirst !== undefined && { thirst: Math.min(100, state.selectedDog.thirst + effects.thirst) }),
                ...(effects.happiness !== undefined && { happiness: Math.min(100, state.selectedDog.happiness + effects.happiness) }),
                ...(effects.health !== undefined && { health: Math.min(100, state.selectedDog.health + effects.health) }),
                ...(effects.energy_stat !== undefined && { energy_stat: Math.min(100, state.selectedDog.energy_stat + effects.energy_stat) }),
                ...(effects.training_points !== undefined && { training_points: state.selectedDog.training_points + effects.training_points }),
              }
            : state.selectedDog,
          user: {
            ...state.user,
            cash: state.user.cash - cashCost,
            gems: state.user.gems - gemCost,
            // Add food storage if item provides it
            ...(effects.food_storage !== undefined && {
              food_storage: Math.min(100, (state.user.food_storage ?? 0) + effects.food_storage)
            }),
          },
        };
      }),

      // Kennel upgrade
      upgradeKennel: (): { success: boolean; message?: string; newLevel?: number } => {
        const state = useGameStore.getState();

        if (!state.user) {
          return { success: false, message: 'No user found' };
        }

        const currentLevel: number = state.user.kennel_level;
        const checkResult = canUpgradeKennel(currentLevel, state.user.cash);

        if (!checkResult.canUpgrade) {
          return { success: false, message: checkResult.reason };
        }

        const cost: number = checkResult.cost!;
        const newLevel: number = currentLevel + 1;
        const newLevelInfo = getKennelLevelInfo(newLevel);

        set((state: GameState) => ({
          user: state.user ? {
            ...state.user,
            kennel_level: newLevel,
            cash: state.user.cash - cost,
          } : null,
        }));

        // Save to Supabase if sync is enabled
        const updatedState = useGameStore.getState();
        if (updatedState.syncEnabled && updatedState.user) {
          debouncedSave(() => saveUserProfile(updatedState.user!));
        }

        return {
          success: true,
          message: `Upgraded to ${newLevelInfo.name}! You can now house ${newLevelInfo.dogCapacity} dogs.`,
          newLevel,
        };
      },

      // Care actions
      feedDog: (dogId: string) => {
        let result = { success: false, message: '' };

        set((state: GameState) => {
          if (!state.user) {
            result.message = 'No user found';
            return {};
          }

          const dog = state.dogs.find((d: Dog) => d.id === dogId);
          if (!dog) {
            result.message = 'Dog not found';
            return {};
          }

          // Calculate food consumption based on dog size
          const foodNeeded = calculateFoodConsumption(dog.size);

          // Check if enough food in storage
          if (state.user.food_storage < foodNeeded) {
            result.message = `Not enough food! Need ${foodNeeded} units, have ${state.user.food_storage.toFixed(1)}. Buy dog food from the shop!`;
            return {};
          }

          // Calculate restoration amounts
          const hungerRestored = calculateHungerRestoration(dog.size);
          const energyRestored = calculateEnergyFromEating(dog.size);

          // Calculate bond XP gain (2 XP base for feeding)
          const bondXpGain = calculateBondXpGain(2, dog.is_rescue || false);
          const newBondXp = dog.bond_xp + bondXpGain;
          const bondLevelUp = checkBondLevelUp({ ...dog, bond_xp: newBondXp });

          // Update dog stats and consume food storage
          const updatedDogs = state.dogs.map((d: Dog) => {
            if (d.id !== dogId) return d;
            return {
              ...d,
              hunger: 100, // Reset to full (hunger decays over time)
              energy_stat: Math.min(100, d.energy_stat + energyRestored),
              last_fed: new Date().toISOString(), // Reset hunger decay timer
              bond_xp: (bondLevelUp?.bond_xp ?? newBondXp) as number,
              bond_level: (bondLevelUp?.bond_level ?? d.bond_level) as number,
            };
          });

          const updatedDog = updatedDogs.find((d: Dog) => d.id === dogId)!;

          // Save to Supabase if sync is enabled
          if (state.syncEnabled) {
            debouncedSave(() => saveDog(updatedDog));
          }

          result.success = true;
          result.message = `Fed ${dog.name}! +${hungerRestored} hunger, +${energyRestored} energy. Used ${foodNeeded} food units.`;

          // Track story objective
          trackStoryAction('care', { action: 'feed' });

          return {
            dogs: updatedDogs,
            selectedDog: state.selectedDog?.id === dogId ? updatedDog : state.selectedDog,
            user: {
              ...state.user,
              food_storage: state.user.food_storage - foodNeeded,
            },
          };
        });

        return result;
      },

      waterDog: (dogId: string) => {
        let result = { success: false, message: '' };

        set((state: GameState) => {
          const dog = state.dogs.find((d: Dog) => d.id === dogId);
          if (!dog) {
            result.message = 'Dog not found';
            return {};
          }

          // Calculate thirst restoration
          const thirstRestored = calculateThirstRestoration(dog.size);

          // Calculate bond XP gain (2 XP base for watering)
          const bondXpGain = calculateBondXpGain(2, dog.is_rescue || false);
          const newBondXp = dog.bond_xp + bondXpGain;
          const bondLevelUp = checkBondLevelUp({ ...dog, bond_xp: newBondXp });

          // Update dog stats
          const updatedDogs = state.dogs.map((d: Dog) => {
            if (d.id !== dogId) return d;
            return {
              ...d,
              thirst: 100, // Reset to full
              last_watered: new Date().toISOString(), // Reset thirst decay timer
              bond_xp: (bondLevelUp?.bond_xp ?? newBondXp) as number,
              bond_level: (bondLevelUp?.bond_level ?? d.bond_level) as number,
            };
          });

          const updatedDog = updatedDogs.find((d: Dog) => d.id === dogId)!;

          // Save to Supabase if sync is enabled
          if (state.syncEnabled) {
            debouncedSave(() => saveDog(updatedDog));
          }

          result.success = true;
          result.message = `Gave water to ${dog.name}! +${thirstRestored} thirst.`;

          // Track story objective
          trackStoryAction('care', { action: 'water' });

          return {
            dogs: updatedDogs,
            selectedDog: state.selectedDog?.id === dogId ? updatedDog : state.selectedDog,
          };
        });

        return result;
      },

      restDog: (dogId: string) => {
        let result = { success: false, message: '' };

        set((state: GameState) => {
          const dog = state.dogs.find((d: Dog) => d.id === dogId);
          if (!dog) {
            result.message = 'Dog not found';
            return {};
          }

          // Calculate energy restoration from resting
          const energyRestored = calculateEnergyFromResting();

          // Calculate bond XP gain (1 XP base for resting - peaceful time together)
          const bondXpGain = calculateBondXpGain(1, dog.is_rescue || false);
          const newBondXp = dog.bond_xp + bondXpGain;
          const bondLevelUp = checkBondLevelUp({ ...dog, bond_xp: newBondXp });

          // Update dog stats
          const updatedDogs = state.dogs.map((d: Dog) => {
            if (d.id !== dogId) return d;
            return {
              ...d,
              energy_stat: Math.min(100, d.energy_stat + energyRestored),
              bond_xp: (bondLevelUp?.bond_xp ?? newBondXp) as number,
              bond_level: (bondLevelUp?.bond_level ?? d.bond_level) as number,
            };
          });

          const updatedDog = updatedDogs.find((d: Dog) => d.id === dogId)!;

          // Save to Supabase if sync is enabled
          if (state.syncEnabled) {
            debouncedSave(() => saveDog(updatedDog));
          }

          result.success = true;
          result.message = `${dog.name} rested! +${energyRestored} energy.`;

          // Track story objective
          trackStoryAction('care', { action: 'rest' });

          return {
            dogs: updatedDogs,
            selectedDog: state.selectedDog?.id === dogId ? updatedDog : state.selectedDog,
          };
        });

        return result;
      },

      refillTrainingPoints: (dogId: string) => {
        const BASE_GEM_COST = 10;
        let result = { success: false, message: '', gemCost: 0 };

        set((state: GameState) => {
          if (!state.user) {
            result.message = 'No user found';
            return {};
          }

          const dog = state.dogs.find((d: Dog) => d.id === dogId);
          if (!dog) {
            result.message = 'Dog not found';
            return {};
          }

          // Calculate gem cost: increases by BASE_GEM_COST each time (10, 20, 30, 40...)
          const gemCost = BASE_GEM_COST * ((dog.tp_refills_today || 0) + 1);
          result.gemCost = gemCost;

          // Check if user has enough gems
          if (state.user.gems < gemCost) {
            result.message = `Not enough gems! Need ${gemCost} gems.`;
            return {};
          }

          // Refill TP and increment refill counter
          const updatedDogs = state.dogs.map((d: Dog) => {
            if (d.id !== dogId) return d;
            return {
              ...d,
              training_points: 100, // Fully restore TP
              tp_refills_today: (d.tp_refills_today || 0) + 1,
            };
          });

          const updatedDog = updatedDogs.find((d: Dog) => d.id === dogId)!;

          // Deduct gems from user
          const updatedUser = {
            ...state.user,
            gems: state.user.gems - gemCost,
          };

          // Save to Supabase if sync is enabled
          if (state.syncEnabled) {
            debouncedSave(() => saveDog(updatedDog));
            debouncedSave(() => saveUserProfile(updatedUser));
          }

          result.success = true;
          result.message = `Refilled ${dog.name}'s training points for ${gemCost} gems! Next refill: ${BASE_GEM_COST * ((updatedDog.tp_refills_today || 0) + 1)} gems.`;

          return {
            dogs: updatedDogs,
            selectedDog: state.selectedDog?.id === dogId ? updatedDog : state.selectedDog,
            user: updatedUser,
          };
        });

        return result;
      },

      claimDailyReward: () => set((state: GameState) => {
        if (!state.user) return {};

        // Calculate new streak
        const newStreak = calculateLoginStreak(state.user) + 1;
        const reward = getDailyReward(newStreak);

        const updatedUser = {
          ...state.user,
          cash: state.user.cash + reward.cash,
          gems: state.user.gems + reward.gems,
          xp: state.user.xp + reward.xp,
          login_streak: newStreak,
          last_login: new Date().toISOString(),
          last_streak_claim: new Date().toISOString(),
        };

        // Save to Supabase if sync is enabled
        if (state.syncEnabled) {
          debouncedSave(() => saveUserProfile(updatedUser));
        }

        return { user: updatedUser };
      }),

      // Tutorial actions
      startTutorial: (tutorialId: string) => set({ activeTutorial: tutorialId }),

      completeTutorial: (tutorialId: string) => set((state: GameState) => ({
        activeTutorial: null,
        tutorialProgress: {
          ...state.tutorialProgress,
          completedTutorials: [...state.tutorialProgress.completedTutorials, tutorialId]
        }
      })),

      skipTutorial: (tutorialId: string) => set((state: GameState) => ({
        activeTutorial: null,
        tutorialProgress: {
          ...state.tutorialProgress,
          skippedTutorials: [...state.tutorialProgress.skippedTutorials, tutorialId]
        }
      })),

      dismissHelp: (helpId: string) => set((state: GameState) => ({
        tutorialProgress: {
          ...state.tutorialProgress,
          dismissedHelp: [...state.tutorialProgress.dismissedHelp, helpId]
        }
      })),

      toggleHelpIcons: (show: boolean) => set((state: GameState) => ({
        tutorialProgress: { ...state.tutorialProgress, showHelpIcons: show }
      })),

      // Story mode actions
      updateObjectiveProgress: (chapterId: string, objectiveId: string, amount: number) => {
        set((state: GameState) => {
          const currentProgress = state.storyProgress.objectiveProgress[chapterId]?.[objectiveId] || 0;
          const newProgress = currentProgress + amount;

          return {
            storyProgress: {
              ...state.storyProgress,
              objectiveProgress: {
                ...state.storyProgress.objectiveProgress,
                [chapterId]: {
                  ...(state.storyProgress.objectiveProgress[chapterId] || {}),
                  [objectiveId]: newProgress,
                },
              },
            },
          };
        });

        // Save to Supabase if sync is enabled
        const state = useGameStore.getState();
        if (state.syncEnabled && state.user) {
          debouncedSave(() => saveStoryProgress(state.user!.id, state.storyProgress));
        }
      },

      completeChapter: (chapterId: string) => {
        set((state: GameState) => {
          if (state.storyProgress.completedChapters.includes(chapterId)) {
            return {};
          }

          return {
            storyProgress: {
              ...state.storyProgress,
              completedChapters: [...state.storyProgress.completedChapters, chapterId],
            },
          };
        });

        // Automatically claim rewards when chapter completes
        const store = useGameStore.getState();
        store.claimChapterRewards(chapterId);

        // Save to Supabase if sync is enabled
        if (store.syncEnabled && store.user) {
          debouncedSave(() => saveStoryProgress(store.user!.id, store.storyProgress));
        }
      },

      claimChapterRewards: (chapterId: string) => {
        let result = { success: false, message: '' };
        let itemsToAdd: string[] = [];

        set((state: GameState) => {
          // Check if rewards already claimed
          if (state.storyProgress.claimedRewards.includes(chapterId)) {
            result.message = 'Rewards already claimed for this chapter!';
            return {};
          }

          // Find the chapter
          const chapter = storyChapters.find((c: StoryChapter) => c.id === chapterId);

          if (!chapter) {
            result.message = 'Chapter not found!';
            return {};
          }

          const rewards = chapter.rewards;
          const rewardParts: string[] = [];

          // Apply cash reward
          if (rewards.cash && rewards.cash > 0 && state.user) {
            state.user.cash += rewards.cash;
            rewardParts.push(`$${rewards.cash}`);
          }

          // Apply gems reward
          if (rewards.gems && rewards.gems > 0 && state.user) {
            state.user.gems += rewards.gems;
            rewardParts.push(`${rewards.gems} gems`);
          }

          // Apply XP reward
          if (rewards.xp && rewards.xp > 0 && state.user) {
            state.user.xp += rewards.xp;
            rewardParts.push(`${rewards.xp} XP`);
          }

          // Save items to add after set() completes
          if (rewards.items && rewards.items.length > 0) {
            itemsToAdd = rewards.items;
            rewardParts.push(`${rewards.items.length} item${rewards.items.length > 1 ? 's' : ''}`);
          }

          // Note: Feature unlocks would be handled here
          if (rewards.unlock_feature) {
            rewardParts.push(`Unlocked: ${rewards.unlock_feature.replace(/_/g, ' ')}`);
          }

          result.success = true;
          result.message = `Rewards claimed: ${rewardParts.join(', ')}`;

          return {
            user: state.user,
            storyProgress: {
              ...state.storyProgress,
              claimedRewards: [...state.storyProgress.claimedRewards, chapterId],
            },
          };
        });

        // Add items to inventory after set() completes
        if (itemsToAdd.length > 0) {
          const state = useGameStore.getState();
          itemsToAdd.forEach((itemId: string) => {
            state.addItemToInventory(itemId, 1);
          });
        }

        // Save to Supabase if sync is enabled
        const state = useGameStore.getState();
        if (state.syncEnabled && state.user) {
          debouncedSave(() => saveUserProfile(state.user!));
          debouncedSave(() => saveStoryProgress(state.user!.id, state.storyProgress));
        }

        return result;
      },

      setCurrentChapter: (chapterId: string | null) => {
        set((state: GameState) => ({
          storyProgress: {
            ...state.storyProgress,
            currentChapter: chapterId,
          },
        }));

        // Save to Supabase if sync is enabled
        const state = useGameStore.getState();
        if (state.syncEnabled && state.user) {
          debouncedSave(() => saveStoryProgress(state.user!.id, state.storyProgress));
        }
      },

      // Health & Vet actions
      updateDogAgesAndHealth: () => set((state: GameState) => {
        const updatedDogs = state.dogs.map((dog: Dog) => {
          // Skip death updates if already dead
          if (dog.is_dead) {
            return dog;
          }

          // Calculate current age
          const ageWeeks = calculateAgeInWeeks(dog.birth_date);
          const ageYears = calculateAgeInYears(dog.birth_date);
          const lifeStage = getLifeStage(ageWeeks);

          // Apply hunger/thirst decay and penalties
          const hungerThirstUpdates = applyHungerThirstDecay(dog);
          const dogWithDecay = { ...dog, ...hungerThirstUpdates };

          // Calculate current health based on care (using updated hunger/thirst)
          const currentHealth = calculateHealthDecay(dogWithDecay);

          // Check if dog has reached max age (natural death)
          const reachedMaxAge = hasReachedMaxAge(dog.birth_date);

          let updates: Partial<Dog> = {
            age_weeks: ageWeeks,
            age_years: ageYears,
            life_stage: lifeStage,
            health: currentHealth,
            ...hungerThirstUpdates, // Apply hunger/thirst decay updates
          };

          // Determine death cause if dying
          let deathCause: 'old_age' | 'illness' | 'starvation' | 'dehydration' | 'neglect' | undefined;
          let isDying = false;

          if (reachedMaxAge) {
            isDying = true;
            deathCause = 'old_age';
          } else if (currentHealth <= 0) {
            isDying = true;
            // Determine specific cause of death based on stats (use updated values)
            if (dogWithDecay.hunger <= 10) {
              deathCause = 'starvation';
            } else if (dogWithDecay.thirst <= 10) {
              deathCause = 'dehydration';
            } else if (dogWithDecay.current_ailment) {
              deathCause = 'illness';
            } else if (dogWithDecay.happiness <= 20) {
              deathCause = 'neglect';
            } else {
              deathCause = 'illness'; // Default to illness if health is 0
            }
          }

          if (isDying) {
            updates.is_dead = true;
            updates.death_cause = deathCause;
            updates.death_date = new Date().toISOString();
          }

          // Check if recovery is complete
          if (dogWithDecay.recovering_from && checkRecoveryComplete(dogWithDecay)) {
            const recoveryUpdates = completeRecovery(dogWithDecay);
            updates = { ...updates, ...recoveryUpdates };
          }

          // Random illness check (1% chance per check, modified by care quality)
          if (!dogWithDecay.current_ailment && !dogWithDecay.recovering_from && !dogWithDecay.is_dead) {
            const illness = checkForIllness(dogWithDecay);
            if (illness) {
              const ailmentUpdates = applyAilment(dogWithDecay, illness);
              updates = { ...updates, ...ailmentUpdates };
            }
          }

          return {
            ...dog,
            ...updates,
          };
        });

        // Save updated dogs to Supabase if sync is enabled
        if (state.syncEnabled) {
          updatedDogs.forEach((dog: Dog) => {
            const originalDog = state.dogs.find((d: Dog) => d.id === dog.id);
            // Save immediately if dog died (critical operation)
            if (dog.is_dead && !originalDog?.is_dead) {
              saveDog(dog);
            } else {
              // Regular health updates can be debounced
              debouncedSave(() => saveDog(dog));
            }
          });
        }

        return { dogs: updatedDogs };
      }),

      takeToVet: (dogId: string) => {
        let result = { success: false, message: '' };

        set((state: GameState) => {
          if (!state.user) {
            result.message = 'No user found';
            return {};
          }

          const dog = state.dogs.find((d: Dog) => d.id === dogId);
          if (!dog) {
            result.message = 'Dog not found';
            return {};
          }

          // Check if user has enough cash
          if (state.user.cash < VET_COST) {
            result.message = `Not enough cash! Need $${VET_COST}, have $${state.user.cash}`;
            return {};
          }

          // Get health status
          const healthStatus = getHealthStatus(dog);
          if (!healthStatus.needsVet) {
            result.message = `${dog.name} doesn't need vet care right now.`;
            return {};
          }

          // Apply vet treatment
          const vetUpdates = visitVet();
          const updatedDogs = state.dogs.map((d: Dog) => {
            if (d.id !== dogId) return d;
            return { ...d, ...vetUpdates };
          });

          const updatedDog = updatedDogs.find((d: Dog) => d.id === dogId)!;

          // Save to Supabase if sync is enabled
          if (state.syncEnabled) {
            debouncedSave(() => saveDog(updatedDog));
            debouncedSave(() => saveUserProfile({ ...state.user!, cash: state.user!.cash - VET_COST }));
          }

          result.success = true;
          result.message = `${dog.name} was treated at the vet! Health restored to 100%. Cost: $${VET_COST}`;

          return {
            dogs: updatedDogs,
            selectedDog: state.selectedDog?.id === dogId ? updatedDog : state.selectedDog,
            user: {
              ...state.user,
              cash: state.user.cash - VET_COST,
            },
          };
        });

        return result;
      },

      takeToEmergencyVet: (dogId: string) => {
        let result = { success: false, message: '' };

        set((state: GameState) => {
          if (!state.user) {
            result.message = 'No user found';
            return {};
          }

          const dog = state.dogs.find((d: Dog) => d.id === dogId);
          if (!dog) {
            result.message = 'Dog not found';
            return {};
          }

          // Check if user has enough cash
          if (state.user.cash < EMERGENCY_VET_COST) {
            result.message = `Not enough cash! Need $${EMERGENCY_VET_COST}, have $${state.user.cash}`;
            return {};
          }

          // Get health status
          const healthStatus = getHealthStatus(dog);
          if (!healthStatus.needsEmergencyVet) {
            result.message = `${dog.name} doesn't need emergency vet care right now.`;
            return {};
          }

          // Apply emergency vet treatment (reduces stats)
          const emergencyUpdates = visitEmergencyVet(dog);
          const updatedDogs = state.dogs.map((d: Dog) => {
            if (d.id !== dogId) return d;
            return { ...d, ...emergencyUpdates };
          });

          const updatedDog = updatedDogs.find((d: Dog) => d.id === dogId)!;

          // Save to Supabase if sync is enabled
          if (state.syncEnabled) {
            debouncedSave(() => saveDog(updatedDog));
            debouncedSave(() => saveUserProfile({ ...state.user!, cash: state.user!.cash - EMERGENCY_VET_COST }));
          }

          result.success = true;
          result.message = `${dog.name} received emergency care! Health restored but stats were reduced by 5 points. Cost: $${EMERGENCY_VET_COST}`;

          return {
            dogs: updatedDogs,
            selectedDog: state.selectedDog?.id === dogId ? updatedDog : state.selectedDog,
            user: {
              ...state.user,
              cash: state.user.cash - EMERGENCY_VET_COST,
            },
          };
        });

        return result;
      },

      reviveDeadDog: (dogId: string) => {
        let result = { success: false, message: '' };

        set((state: GameState) => {
          if (!state.user) {
            result.message = 'No user found';
            return {};
          }

          const dog = state.dogs.find((d: Dog) => d.id === dogId);
          if (!dog) {
            result.message = 'Dog not found';
            return {};
          }

          if (!dog.is_dead) {
            result.message = `${dog.name} is not dead and doesn't need revival.`;
            return {};
          }

          // Calculate revival cost based on revival count
          // First revival = FREE, Second = 50, Third = 150, Fourth+ = 300
          const revivalCount = dog.revival_count || 0;
          let revivalCost = 0;
          if (revivalCount === 1) revivalCost = 50;
          else if (revivalCount === 2) revivalCost = 150;
          else if (revivalCount >= 3) revivalCost = 300;
          // revivalCount === 0 means first revival, which is FREE

          // Check if user has enough gems (skip check if free)
          if (revivalCost > 0 && state.user.gems < revivalCost) {
            result.message = `Not enough gems! Need ${revivalCost} gems, have ${state.user.gems}`;
            return {};
          }

          // Apply revival (reduces stats significantly)
          const revivalUpdates = reviveDog(dog);
          const updatedDogs = state.dogs.map((d: Dog) => {
            if (d.id !== dogId) return d;
            return {
              ...d,
              ...revivalUpdates,
              is_dead: false,
              death_cause: undefined, // Clear death cause
              death_date: undefined, // Clear death date
              revival_count: revivalCount + 1, // Increment revival count
            };
          });

          const updatedDog = updatedDogs.find((d: Dog) => d.id === dogId)!;

          // Deduct gems if not free
          const updatedUser = revivalCost > 0
            ? { ...state.user, gems: state.user.gems - revivalCost }
            : state.user;

          // Save to Supabase immediately (critical operation - no debounce)
          if (state.syncEnabled) {
            saveDog(updatedDog);
            if (revivalCost > 0) {
              saveUserProfile(updatedUser);
            }
          }

          result.success = true;
          result.message = revivalCost === 0
            ? `${dog.name} was revived for FREE! Health restored to 50% but stats were reduced.`
            : `${dog.name} was revived! Health restored to 50% but stats were reduced. Cost: ${revivalCost} gems`;

          return {
            dogs: updatedDogs,
            selectedDog: state.selectedDog?.id === dogId ? updatedDog : state.selectedDog,
            user: updatedUser,
          };
        });

        return result;
      },

      retireDog: (dogId: string) => {
        let result = { success: false, message: '' };

        set((state: GameState) => {
          const dog = state.dogs.find((d: Dog) => d.id === dogId);
          if (!dog) {
            result.message = 'Dog not found';
            return {};
          }

          // Remove the dog from the kennel
          const updatedDogs = state.dogs.filter((d: Dog) => d.id !== dogId);

          // Clear selected dog if it was the retired one
          const updatedSelectedDog = state.selectedDog?.id === dogId ? null : state.selectedDog;

          // Delete from Supabase if sync is enabled
          if (state.syncEnabled) {
            deleteDogFromDb(dogId);
          }

          result.success = true;
          result.message = `${dog.name} has been retired from your kennel. Rest in peace, good friend.`;

          return {
            dogs: updatedDogs,
            selectedDog: updatedSelectedDog,
          };
        });

        return result;
      },

      // Veterinary/Ailment actions
      treatDogAilment: (dogId: string, cost: number) => {
        let result = { success: false, message: '' };

        set((state: GameState) => {
          if (!state.user) {
            result.message = 'No user found';
            return {};
          }

          const dog = state.dogs.find((d: Dog) => d.id === dogId);
          if (!dog || !dog.current_ailment) {
            result.message = 'Dog not found or has no ailment';
            return {};
          }

          if (state.user.cash < cost) {
            result.message = `Not enough cash! Need $${cost}, have $${state.user.cash}`;
            return {};
          }

          const ailment = getAilmentById(dog.current_ailment);
          if (!ailment) {
            result.message = 'Unknown ailment';
            return {};
          }

          // Apply treatment
          const treatmentUpdates = treatAilment(dog, ailment);
          const updatedDogs = state.dogs.map((d: Dog) => {
            if (d.id !== dogId) return d;
            return { ...d, ...treatmentUpdates };
          });

          const updatedDog = updatedDogs.find((d: Dog) => d.id === dogId)!;

          // Save to Supabase if sync is enabled
          if (state.syncEnabled) {
            debouncedSave(() => saveDog(updatedDog));
            debouncedSave(() => saveUserProfile({ ...state.user!, cash: state.user!.cash - cost }));
          }

          result.success = true;
          result.message = `${dog.name} is being treated for ${ailment.name}! Recovery will take ${ailment.recoveryTime} hours. Cost: $${cost}`;

          return {
            dogs: updatedDogs,
            selectedDog: state.selectedDog?.id === dogId ? updatedDog : state.selectedDog,
            user: {
              ...state.user,
              cash: state.user.cash - cost,
            },
          };
        });

        return result;
      },

      checkForRandomIllness: (dogId: string) => set((state: GameState) => {
        const dog = state.dogs.find((d: Dog) => d.id === dogId);
        if (!dog) return {};

        // Don't check if already has ailment or recovering
        if (dog.current_ailment || dog.recovering_from) return {};

        const illness = checkForIllness(dog);
        if (illness) {
          const ailmentUpdates = applyAilment(dog, illness);
          const updatedDogs = state.dogs.map((d: Dog) => {
            if (d.id !== dogId) return d;
            return { ...d, ...ailmentUpdates };
          });

          const updatedDog = updatedDogs.find((d: Dog) => d.id === dogId)!;

          // Save to Supabase if sync is enabled
          if (state.syncEnabled) {
            debouncedSave(() => saveDog(updatedDog));
          }

          return { dogs: updatedDogs };
        }

        return {};
      }),

      applyInjuryToDog: (dogId: string, ailmentId: string) => set((state: GameState) => {
        const dog = state.dogs.find((d: Dog) => d.id === dogId);
        if (!dog) return {};

        // Don't apply if already has ailment
        if (dog.current_ailment || dog.recovering_from) return {};

        const injury = getAilmentById(ailmentId);
        if (!injury) return {};

        const ailmentUpdates = applyAilment(dog, injury);
        const updatedDogs = state.dogs.map((d: Dog) => {
          if (d.id !== dogId) return d;
          return { ...d, ...ailmentUpdates };
        });

        const updatedDog = updatedDogs.find((d: Dog) => d.id === dogId)!;

        // Save to Supabase if sync is enabled
        if (state.syncEnabled) {
          debouncedSave(() => saveDog(updatedDog));
        }

        return { dogs: updatedDogs };
      }),

      // Puppy training actions
      startPuppyTraining: (dogId: string, programId: string): { success: boolean; message: string } => {
        let result = { success: false, message: '' };

        set((state: GameState) => {
          if (!state.user) {
            result.message = 'No user found';
            return {};
          }

          const dog = state.dogs.find((d: Dog) => d.id === dogId);
          if (!dog) {
            result.message = 'Dog not found';
            return {};
          }

          // Get the training program
          const program = PUPPY_TRAINING_PROGRAMS[programId];
          if (!program) {
            result.message = 'Training program not found';
            return {};
          }

          // Check if dog is a puppy
          if (dog.age_weeks >= 52) {
            result.message = `${dog.name} is too old for puppy training! Puppy training is only available for dogs under 52 weeks old.`;
            return {};
          }

          // Check if training is already in progress
          if (dog.active_puppy_training) {
            result.message = `${dog.name} is already in training!`;
            return {};
          }

          // Check max training count
          const completedCount = dog.completed_puppy_training?.length || 0;
          const maxSlots = dog.has_unlocked_third_slot ? 3 : MAX_FREE_PUPPY_TRAINING_SLOTS;

          if (completedCount >= maxSlots) {
            result.message = `${dog.name} has already completed the maximum number of puppy training programs (${maxSlots})!`;
            return {};
          }

          // Check if this program was already completed (prevent duplicates)
          if (dog.completed_puppy_training?.includes(programId)) {
            result.message = `${dog.name} has already completed ${program.name}! Choose a different training program.`;
            return {};
          }

          // Check if user has enough cash
          if (program.cost > 0 && state.user.cash < program.cost) {
            result.message = `Not enough cash! Need $${program.cost}, have $${state.user.cash}`;
            return {};
          }

          // Check if user has enough gems
          if (program.gemCost > 0 && state.user.gems < program.gemCost) {
            result.message = `Not enough gems! Need ${program.gemCost} gems, have ${state.user.gems}`;
            return {};
          }

          // Deduct cost
          const userUpdates = { ...state.user } as UserProfile;
          if (program.cost > 0) {
            userUpdates.cash = state.user.cash - program.cost;
          }
          if (program.gemCost > 0) {
            userUpdates.gems = state.user.gems - program.gemCost;
          }

          // Calculate completion time
          const completionTime = calculateCompletionTime(program.durationHours);

          // Update dog
          const updatedDogs = state.dogs.map((d: Dog) => {
            if (d.id !== dogId) return d;
            return {
              ...d,
              active_puppy_training: programId,
              training_completion_time: completionTime,
            };
          });

          const updatedDog = updatedDogs.find((d: Dog) => d.id === dogId)!;

          // Save to Supabase if sync is enabled
          if (state.syncEnabled) {
            debouncedSave(() => saveDog(updatedDog));
            debouncedSave(() => saveUserProfile(userUpdates));
          }

          result.success = true;
          result.message = `${dog.name} started ${program.name}! Will complete in ${program.durationHours} hour(s).`;

          return {
            dogs: updatedDogs,
            selectedDog: state.selectedDog?.id === dogId ? updatedDog : state.selectedDog,
            user: userUpdates,
          };
        });

        return result;
      },

      completePuppyTraining: (dogId: string) => {
        set((state: GameState) => {
          const dog = state.dogs.find((d: Dog) => d.id === dogId);
          if (!dog || !dog.active_puppy_training) return {};

          const program = PUPPY_TRAINING_PROGRAMS[dog.active_puppy_training];
          if (!program) return {};

          // Apply all bonuses from the program to the dog's stats
          // Prevent duplicates by checking if program is already completed
          const currentCompleted = dog.completed_puppy_training || [];
          const newCompleted = currentCompleted.includes(dog.active_puppy_training)
            ? currentCompleted  // Already completed, don't add again
            : [...currentCompleted, dog.active_puppy_training]; // Add to list

          const updates: Partial<Dog> = {
            active_puppy_training: undefined,
            training_completion_time: undefined,
            completed_puppy_training: newCompleted,
          };

          // Apply stat bonuses directly to the dog
          if (program.bonuses.statBonus) {
            const bonus = program.bonuses.statBonus;
            updates.speed = Math.min(100, (dog.speed || 0) + bonus);
            updates.agility = Math.min(100, (dog.agility || 0) + bonus);
            updates.endurance = Math.min(100, (dog.endurance || 0) + bonus);
            updates.strength = Math.min(100, (dog.strength || 0) + bonus);
            updates.intelligence = Math.min(100, (dog.intelligence || 0) + bonus);
            updates.friendliness = Math.min(100, (dog.friendliness || 0) + bonus);
          }

          // Apply specific bonuses
          if (program.bonuses.agilityBonus) {
            updates.agility = Math.min(100, (updates.agility || dog.agility || 0) + program.bonuses.agilityBonus);
          }
          if (program.bonuses.obedienceBonus) {
            updates.obedience_trained = Math.min(100, (dog.obedience_trained || 0) + program.bonuses.obedienceBonus);
          }

          // Apply happiness bonus if present
          if (program.bonuses.happinessBaseline) {
            updates.happiness = Math.min(100, (dog.happiness || 0) + program.bonuses.happinessBaseline);
          }

          // Note: Other bonuses (bondGainRate, trainingEffectiveness, energyRegen, competitionBonus, breedingValue)
          // should be applied by the systems that use them by checking the dog's completed_puppy_training array

          const updatedDogs = state.dogs.map((d: Dog) => {
            if (d.id !== dogId) return d;
            return { ...d, ...updates };
          });

          const updatedDog = updatedDogs.find((d: Dog) => d.id === dogId)!;

          // Save to Supabase if sync is enabled
          if (state.syncEnabled) {
            debouncedSave(() => saveDog(updatedDog));
          }

          return {
            dogs: updatedDogs,
            selectedDog: state.selectedDog?.id === dogId ? updatedDog : state.selectedDog,
          };
        });
      },

      unlockThirdTrainingSlot: (dogId: string): { success: boolean; message: string } => {
        let result = { success: false, message: '' };

        set((state: GameState) => {
          if (!state.user) {
            result.message = 'No user found';
            return {};
          }

          const dog = state.dogs.find((d: Dog) => d.id === dogId);
          if (!dog) {
            result.message = 'Dog not found';
            return {};
          }

          // Check if already unlocked
          if (dog.has_unlocked_third_slot) {
            result.message = `${dog.name} already has the third training slot unlocked!`;
            return {};
          }

          // Check if user has enough gems
          if (state.user.gems < THIRD_SLOT_GEM_COST) {
            result.message = `Not enough gems! Need ${THIRD_SLOT_GEM_COST} gems, have ${state.user.gems}`;
            return {};
          }

          // Deduct gems
          const updatedUser = {
            ...state.user,
            gems: state.user.gems - THIRD_SLOT_GEM_COST,
          };

          // Update dog
          const updatedDogs = state.dogs.map((d: Dog) => {
            if (d.id !== dogId) return d;
            return {
              ...d,
              has_unlocked_third_slot: true,
            };
          });

          const updatedDog = updatedDogs.find((d: Dog) => d.id === dogId)!;

          // Save to Supabase if sync is enabled
          if (state.syncEnabled) {
            debouncedSave(() => saveDog(updatedDog));
            debouncedSave(() => saveUserProfile(updatedUser));
          }

          result.success = true;
          result.message = `Unlocked third training slot for ${dog.name}! You can now complete 3 puppy training programs.`;

          return {
            dogs: updatedDogs,
            selectedDog: state.selectedDog?.id === dogId ? updatedDog : state.selectedDog,
            user: updatedUser,
          };
        });

        return result;
      },

      checkPuppyTrainingCompletion: (dogId: string) => {
        const state = useGameStore.getState();
        const dog = state.dogs.find((d: Dog) => d.id === dogId);

        if (!dog || !dog.active_puppy_training || !dog.training_completion_time) {
          return;
        }

        if (isTrainingComplete(dog.training_completion_time)) {
          state.completePuppyTraining(dogId);
        }
      },

      // Inventory actions
      addItemToInventory: (itemId: string, quantity: number) => {
        set((state: GameState) => {
          if (!state.user) return {};

          // Initialize inventory if it doesn't exist
          const inventory: InventoryItem[] = state.user.inventory || [];

          // Check if item already exists in inventory
          const existingItemIndex = inventory.findIndex((item: InventoryItem) => item.itemId === itemId);

          let updatedInventory: InventoryItem[];
          if (existingItemIndex >= 0) {
            // Update quantity of existing item
            updatedInventory = inventory.map((item: InventoryItem, index: number) =>
              index === existingItemIndex
                ? { ...item, quantity: item.quantity + quantity }
                : item
            );
          } else {
            // Add new item to inventory
            updatedInventory = [...inventory, { itemId, quantity }];
          }

          const updatedUser = {
            ...state.user,
            inventory: updatedInventory,
          };

          // Save to Supabase if sync is enabled
          if (state.syncEnabled) {
            debouncedSave(() => saveUserProfile(updatedUser));
          }

          return { user: updatedUser };
        });
      },

      removeItemFromInventory: (itemId: string, quantity: number): boolean => {
        let success = false;

        set((state: GameState) => {
          if (!state.user || !state.user.inventory) {
            return {};
          }

          const inventory: InventoryItem[] = state.user.inventory;
          const existingItemIndex = inventory.findIndex((item: InventoryItem) => item.itemId === itemId);

          if (existingItemIndex === -1) {
            return {}; // Item not found
          }

          const existingItem = inventory[existingItemIndex];
          if (existingItem.quantity < quantity) {
            return {}; // Not enough quantity
          }

          let updatedInventory: InventoryItem[];
          if (existingItem.quantity === quantity) {
            // Remove item completely
            updatedInventory = inventory.filter((item: InventoryItem) => item.itemId !== itemId);
          } else {
            // Decrease quantity
            updatedInventory = inventory.map((item: InventoryItem) =>
              item.itemId === itemId
                ? { ...item, quantity: item.quantity - quantity }
                : item
            );
          }

          const updatedUser = {
            ...state.user,
            inventory: updatedInventory,
          };

          // Save to Supabase if sync is enabled
          if (state.syncEnabled) {
            debouncedSave(() => saveUserProfile(updatedUser));
          }

          success = true;
          return { user: updatedUser };
        });

        return success;
      },

      useItem: (itemId: string, dogId?: string): { success: boolean; message: string } => {
        const itemDef = getItem(itemId);

        if (!itemDef) {
          return { success: false, message: 'Item not found!' };
        }

        // Check if user has the item
        const state = useGameStore.getState();
        const inventoryItem = state.user?.inventory?.find((item: InventoryItem) => item.itemId === itemId);

        if (!inventoryItem || inventoryItem.quantity < 1) {
          return { success: false, message: `You don't have any ${itemDef.name}!` };
        }

        // If the item requires a dog, check if dog is provided and valid
        if (itemDef.effects.energy || itemDef.effects.happiness || itemDef.effects.health || itemDef.effects.bond_xp) {
          if (!dogId) {
            return { success: false, message: 'Please select a dog to use this item on!' };
          }

          const dog = state.dogs.find((d: Dog) => d.id === dogId);
          if (!dog) {
            return { success: false, message: 'Dog not found!' };
          }

          // Apply effects to the dog
          const updates: Partial<Dog> = {};

          if (itemDef.effects.energy) {
            updates.energy_stat = Math.min(100, (dog.energy_stat || 0) + itemDef.effects.energy);
          }
          if (itemDef.effects.happiness) {
            updates.happiness = Math.min(100, (dog.happiness || 0) + itemDef.effects.happiness);
          }
          if (itemDef.effects.health) {
            updates.health = Math.min(100, (dog.health || 0) + itemDef.effects.health);
          }
          if (itemDef.effects.hunger) {
            updates.hunger = Math.max(0, Math.min(100, (dog.hunger || 0) + itemDef.effects.hunger));
          }
          if (itemDef.effects.bond_xp) {
            updates.bond_xp = (dog.bond_xp || 0) + itemDef.effects.bond_xp;
          }

          state.updateDog(dogId, updates);
        }

        // Handle training boost items
        if (itemDef.effects.training_boost && itemDef.effects.duration) {
          if (!dogId) {
            return { success: false, message: 'Please select a dog to use this item on!' };
          }

          const expiresAt = new Date();
          expiresAt.setMinutes(expiresAt.getMinutes() + itemDef.effects.duration);

          // Update inventory item with active boost
          set((storeState: GameState) => {
            if (!storeState.user || !storeState.user.inventory) return {};

            const updatedInventory = storeState.user.inventory.map((item: InventoryItem) => {
              if (item.itemId === itemId) {
                return {
                  ...item,
                  activeBoost: {
                    multiplier: itemDef.effects.training_boost!,
                    expiresAt: expiresAt.toISOString(),
                  },
                };
              }
              return item;
            });

            const updatedUser = {
              ...storeState.user,
              inventory: updatedInventory,
            };

            // Save to Supabase if sync is enabled
            if (storeState.syncEnabled) {
              debouncedSave(() => saveUserProfile(updatedUser));
            }

            return { user: updatedUser };
          });
        }

        // Remove the item from inventory
        const removed = state.removeItemFromInventory(itemId, 1);

        if (!removed) {
          return { success: false, message: 'Failed to use item!' };
        }

        return {
          success: true,
          message: dogId
            ? `You ${itemDef.usageText}`
            : `Used ${itemDef.name}!`
        };
      },

      getInventoryItem: (itemId: string): { itemId: string; quantity: number } | undefined => {
        const state = useGameStore.getState();
        const inventoryItem = state.user?.inventory?.find((item: InventoryItem) => item.itemId === itemId);
        return inventoryItem ? { itemId: inventoryItem.itemId, quantity: inventoryItem.quantity } : undefined;
      },

      // Competition event system
      initializeEventSystem: () => {
        const state = useGameStore.getState();

        // Only initialize if events array is empty
        if (state.competitionEvents.length === 0) {
          const now = new Date();
          const events = generateEventsForPeriod(now, 4); // Generate 4 weeks of events
          set({ competitionEvents: events });
          console.log(`Initialized ${events.length} competition events`);
        }
      },

      updateEventSystem: () => {
        const state = useGameStore.getState();
        let events = state.competitionEvents;

        // Update event statuses
        events = updateEventStatuses(events);

        // Prune old completed events
        events = pruneOldEvents(events, 7);

        // Check if we need to generate more events (if we have less than 2 weeks of future events)
        const now = new Date();
        const twoWeeksFromNow = new Date(now.getTime() + 14 * 24 * 60 * 60 * 1000);
        const futureEvents = events.filter(e => new Date(e.eventDate) > now && new Date(e.eventDate) < twoWeeksFromNow);

        if (futureEvents.length < 10) {
          // Generate more events starting from 2 weeks from now
          const newEvents = generateEventsForPeriod(twoWeeksFromNow, 4);
          events = [...events, ...newEvents];
          console.log(`Generated ${newEvents.length} additional events`);
        }

        set({ competitionEvents: events });
      },

      registerForEvent: (eventId: string, dogId: string) => {
        const state = useGameStore.getState();
        const event = state.competitionEvents.find(e => e.id === eventId);
        const dog = state.dogs.find(d => d.id === dogId);
        const user = state.user;

        if (!event) {
          return { success: false, message: 'Event not found!' };
        }

        if (!dog) {
          return { success: false, message: 'Dog not found!' };
        }

        if (!user) {
          return { success: false, message: 'User not found!' };
        }

        // Check if registration is open
        if (event.status !== 'registration') {
          return { success: false, message: 'Registration is not currently open for this event!' };
        }

        // Check if already registered
        const alreadyRegistered = state.eventRegistrations.some(
          r => r.eventId === eventId && r.dogId === dogId
        );

        if (alreadyRegistered) {
          return { success: false, message: `${dog.name} is already registered for this event!` };
        }

        // Check entry requirements
        if (user.level < event.minLevel) {
          return { success: false, message: `You need to be level ${event.minLevel} to enter this event!` };
        }

        const dogAgeWeeks = calculateAgeInWeeks(dog.birth_date);
        if (dogAgeWeeks < event.minAge) {
          return { success: false, message: `${dog.name} must be at least ${event.minAge} weeks old!` };
        }

        // Check entry fee
        if (user.cash < event.entryFee) {
          return { success: false, message: `Not enough cash! Entry fee is $${event.entryFee}.` };
        }

        // Check if event is full
        if (event.currentEntries >= event.maxEntries) {
          return { success: false, message: 'This event is full!' };
        }

        // Create registration
        const registration: EventRegistration = {
          id: `reg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
          eventId,
          userId: user.id,
          dogId,
          status: 'registered',
          registeredAt: new Date().toISOString(),
        };

        // Deduct entry fee
        const newCash = user.cash - event.entryFee;

        // Update state
        set((state: GameState) => ({
          eventRegistrations: [...state.eventRegistrations, registration],
          competitionEvents: state.competitionEvents.map(e =>
            e.id === eventId ? { ...e, currentEntries: e.currentEntries + 1 } : e
          ),
          user: state.user ? { ...state.user, cash: newCash } : state.user,
        }));

        // Save to Supabase if sync is enabled
        if (state.syncEnabled && user) {
          debouncedSave(() => saveUserProfile({ ...user, cash: newCash }));
        }

        return {
          success: true,
          message: `${dog.name} registered for ${event.name}! Entry fee: $${event.entryFee}`
        };
      },

      withdrawFromEvent: (eventId: string, dogId: string) => {
        const state = useGameStore.getState();
        const event = state.competitionEvents.find(e => e.id === eventId);
        const registration = state.eventRegistrations.find(
          r => r.eventId === eventId && r.dogId === dogId
        );
        const dog = state.dogs.find(d => d.id === dogId);

        if (!event || !registration || !dog) {
          return { success: false, message: 'Registration not found!' };
        }

        // Check if withdrawal is allowed (before registration closes)
        const now = new Date();
        const registrationCloses = new Date(event.registrationCloses);

        if (now >= registrationCloses) {
          return { success: false, message: 'Cannot withdraw after registration has closed!' };
        }

        // Refund 50% of entry fee
        const refund = Math.floor(event.entryFee * 0.5);

        // Update state
        set((state: GameState) => ({
          eventRegistrations: state.eventRegistrations.filter(r => r.id !== registration.id),
          competitionEvents: state.competitionEvents.map(e =>
            e.id === eventId ? { ...e, currentEntries: Math.max(0, e.currentEntries - 1) } : e
          ),
          user: state.user ? { ...state.user, cash: state.user.cash + refund } : state.user,
        }));

        // Save to Supabase if sync is enabled
        const user = state.user;
        if (state.syncEnabled && user) {
          debouncedSave(() => saveUserProfile({ ...user, cash: user.cash + refund }));
        }

        return {
          success: true,
          message: `Withdrew ${dog.name} from ${event.name}. Refunded $${refund}.`
        };
      },

      getAvailableEventsForDisplay: () => {
        const state = useGameStore.getState();
        return getAvailableEvents(state.competitionEvents);
      },

      getDogRegistrations: (dogId: string) => {
        const state = useGameStore.getState();
        return state.eventRegistrations.filter(r => r.dogId === dogId && r.status === 'registered');
      },

      awardChampionshipPoints: (
        dogId: string,
        eventId: string,
        placement: number,
        _score: number
      ) => {
        const state = useGameStore.getState();
        const dog = state.dogs.find(d => d.id === dogId);
        const event = state.competitionEvents.find(e => e.id === eventId);

        if (!dog) {
          return { success: false, message: 'Dog not found!' };
        }

        if (!event) {
          return { success: false, message: 'Event not found!' };
        }

        // Only award points for top 4 placements
        if (placement < 1 || placement > 4) {
          return { success: false, message: 'Invalid placement!' };
        }

        // Calculate championship points
        const pointCalc = calculateChampionshipPoints(event, placement, event.currentEntries);
        const pointsAwarded = pointCalc.finalPoints;
        const isMajor = pointCalc.isMajor;

        // Get current championship progress
        const currentProgress = calculateChampionshipProgress(dog);

        // Update progress with new results
        const updatedProgress = updateChampionshipProgressAfterCompetition(
          currentProgress,
          event,
          placement,
          pointsAwarded,
          isMajor,
          event.judgeId
        );

        // Check if title was earned
        const oldTitle = dog.championship_title || 'none';
        const newTitle = updatedProgress.currentTitle;
        const titleEarned = oldTitle !== newTitle;

        // Calculate prize money
        const placementPrizes = [
          event.prizes.first,
          event.prizes.second,
          event.prizes.third,
          event.prizes.participation,
        ];
        const prizeMoney = placementPrizes[placement - 1];

        // Update dog with new championship data
        const dogUpdates: Partial<Dog> = {
          championship_title: updatedProgress.currentTitle,
          championship_points: updatedProgress.totalPoints,
          major_wins: updatedProgress.majorWins,
          judges_won_under: updatedProgress.judgesWonUnder,
          discipline_points: updatedProgress.disciplinePoints,
          specialty_wins: updatedProgress.specialtyWins,
          group_wins: updatedProgress.groupWins,
          all_breed_wins: updatedProgress.allBreedWins,
          best_in_show_wins: updatedProgress.bestInShowWins,
        };

        // Update championship progress in store
        set((state: GameState) => ({
          championshipProgress: {
            ...state.championshipProgress,
            [dogId]: updatedProgress,
          },
        }));

        // Update dog and user cash
        state.updateDog(dogId, dogUpdates);
        state.updateUserCash(prizeMoney);

        // Update event registration status
        set((state: GameState) => ({
          eventRegistrations: state.eventRegistrations.map(r =>
            r.eventId === eventId && r.dogId === dogId
              ? { ...r, status: 'competed' as const }
              : r
          ),
        }));

        // Build result message
        let message = `${dog.name} placed ${placement}${getOrdinalSuffix(placement)} in ${event.name}!`;

        if (pointsAwarded > 0) {
          message += ` Earned ${pointsAwarded} championship ${pointsAwarded === 1 ? 'point' : 'points'}`;
          if (isMajor && placement === 1) {
            message += ' (MAJOR WIN! ⭐)';
          }
          message += '.';
        }

        if (prizeMoney > 0) {
          message += ` Prize: $${prizeMoney}.`;
        }

        if (titleEarned) {
          const titleInfo = TITLE_REQUIREMENTS[newTitle];
          showToast.success(
            `🏆 ${dog.name} earned the title: ${titleInfo.icon} ${titleInfo.displayName}!`,
            5000
          );
        }

        return {
          success: true,
          message,
          titleEarned: titleEarned ? newTitle : undefined,
        };
      },

      // Reset game
      resetGame: () => set((state: GameState) => {
        // Keep user id, username, and kennel_name but reset everything else
        const userId = state.user?.id || 'temp-user-id';
        const username = state.user?.username || 'Player';
        const kennelName = state.user?.kennel_name || 'My Kennel';

        return {
          user: {
            id: userId,
            username: username,
            kennel_name: kennelName,
            cash: 500,
            gems: 50,
            level: 1,
            xp: 0,
            training_skill: 1,
            care_knowledge: 1,
            breeding_expertise: 1,
            competition_strategy: 1,
            business_acumen: 1,
            kennel_level: 1,
            created_at: new Date().toISOString(),
            last_login: new Date().toISOString(),
            login_streak: 1,
            competition_wins_local: 0,
            competition_wins_regional: 0,
            competition_wins_national: 0,
            food_storage: 0,
            weather: initializeWeather(),
          },
          dogs: [],
          selectedDog: null,
          hasAdoptedFirstDog: false,
          tutorialProgress: {
            completedTutorials: [],
            skippedTutorials: [],
            dismissedHelp: [],
            showHelpIcons: true,
          },
          activeTutorial: null,
          storyProgress: {
            completedChapters: [],
            currentChapter: null,
            objectiveProgress: {},
            claimedRewards: [],
          },
          competitionEvents: [],
          eventRegistrations: [],
          championshipProgress: {},
        };
      }),
    }),
    {
      name: 'paws-and-pedigrees-storage',
    }
  )
);