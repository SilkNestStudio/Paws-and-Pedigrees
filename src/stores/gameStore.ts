import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { Dog, UserProfile, TutorialProgress } from '../types';
import { StoryProgress } from '../types/story';
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
  REVIVAL_GEM_COST,
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

  // Shop actions
  purchaseBreed: (dog: Dog, cashCost: number, gemCost: number) => void;
  purchaseItem: (dogId: string, effects: any, cashCost: number, gemCost: number) => void;

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

  // Reset game
  resetGame: () => void;
}

export const useGameStore = create<GameState>()(
  persist(
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

      // Supabase sync methods
      loadFromSupabase: async (userId: string) => {
        set({ loading: true, error: null });
        try {
          const { profile, dogs, storyProgress } = await loadUserData(userId);

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
            set({
              user: profile,
              dogs: dogs || [],
              syncEnabled: true,
              hasAdoptedFirstDog: dogs.length > 0,
              loading: false,
              error: null,
              storyProgress: storyProgress || {
                completedChapters: [],
                currentChapter: null,
                objectiveProgress: {},
                claimedRewards: [],
              }
            });

            // Update all dog ages and health after loading
            const store = useGameStore.getState();
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
        if (!canAddDog(state.dogs.length, state.user?.kennel_level || 1)) {
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

      updateDog: (dogId: any, updates: any) => {
        set((state: any) => ({
          dogs: state.dogs.map((dog: any) =>
            dog.id === dogId ? { ...dog, ...updates } : dog
          ),
          selectedDog: state.selectedDog?.id === dogId
            ? { ...state.selectedDog, ...updates }
            : state.selectedDog
        }));
        // Save to Supabase if sync is enabled
        const state = useGameStore.getState();
        if (state.syncEnabled) {
          const updatedDog = state.dogs.find((d: any) => d.id === dogId);
          if (updatedDog) {
            debouncedSave(() => saveDog(updatedDog));
          }
        }
      },
      
      selectDog: (dog: any) => set({ selectedDog: dog }),

      updateUserCash: (amount: any) => {
        set((state: any) => ({
          user: state.user ? { ...state.user, cash: state.user.cash + amount } : null
        }));
        // Save to Supabase if sync is enabled
        const state = useGameStore.getState();
        if (state.syncEnabled && state.user) {
          debouncedSave(() => saveUserProfile(state.user!));
        }
      },

      updateUserGems: (amount: any) => {
        set((state: any) => ({
          user: state.user ? { ...state.user, gems: state.user.gems + amount } : null
        }));
        // Save to Supabase if sync is enabled
        const state = useGameStore.getState();
        if (state.syncEnabled && state.user) {
          debouncedSave(() => saveUserProfile(state.user!));
        }
      },

      updateUserXP: (amount: any) => {
        set((state: any) => ({
          user: state.user ? { ...state.user, xp: state.user.xp + amount } : null
        }));
        // Save to Supabase if sync is enabled
        const state = useGameStore.getState();
        if (state.syncEnabled && state.user) {
          debouncedSave(() => saveUserProfile(state.user!));
        }
      },

      updateCompetitionWins: (tier: any) => {
        set((state: any) => {
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

      setHasAdoptedFirstDog: (value: any) => set({ hasAdoptedFirstDog: value }),

      // Breeding actions
      breedDogs: (sireId: any, damId: any, litterSize: any) => set((state: any) => {
        const now = new Date().toISOString();
        const pregnancyDue = calculatePregnancyDue(); // Use time scaling system (24 hours)

        // Track story objective for breeding
        trackStoryAction('breed', { breedingAction: 'breed' });

        return {
          dogs: state.dogs.map((dog: any) => {
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

      giveBirth: (damId: any, puppies: any) => set((state: any) => {
        // Track story objective for birth (count each puppy)
        trackStoryAction('breed', { breedingAction: 'birth', amount: puppies.length });

        return {
          dogs: [
            ...state.dogs.map((dog: any) =>
              dog.id === damId
                ? { ...dog, is_pregnant: false, pregnancy_due: undefined, litter_size: undefined }
                : dog
            ),
            ...puppies,
          ],
        };
      }),

      sellPuppy: (puppyId: any, price: any) => set((state: any) => ({
        dogs: state.dogs.filter((dog: any) => dog.id !== puppyId),
        selectedDog: state.selectedDog?.id === puppyId ? null : state.selectedDog,
        user: state.user ? { ...state.user, cash: state.user.cash + price } : null,
      })),

      skipPregnancy: (damId: any, gemCost: any) => set((state: any) => {
        if (!state.user || state.user.gems < gemCost) return {};

        return {
          user: { ...state.user, gems: state.user.gems - gemCost },
          dogs: state.dogs.map((dog: any) =>
            dog.id === damId
              ? { ...dog, pregnancy_due: new Date().toISOString() } // Set due date to now
              : dog
          ),
        };
      }),

      removeDog: (dogId: any) => {
        set((state: any) => ({
          dogs: state.dogs.filter((dog: any) => dog.id !== dogId),
          selectedDog: state.selectedDog?.id === dogId ? null : state.selectedDog,
        }));
        // Delete from Supabase if sync is enabled
        const state = useGameStore.getState();
        if (state.syncEnabled) {
          deleteDogFromDb(dogId);
        }
      },

      // Shop actions
      purchaseBreed: (dog: any, cashCost: any, gemCost: any) => set((state: any) => {
        if (!state.user) return {};

        // Check if user has enough currency
        if (cashCost > 0 && state.user.cash < cashCost) return {};
        if (gemCost > 0 && state.user.gems < gemCost) return {};

        // Check kennel capacity
        if (!canAddDog(state.dogs.length, state.user.kennel_level)) {
          alert('Kennel is at capacity! Upgrade your kennel level to add more dogs.');
          return {};
        }

        // Track story objective for buying a breed
        trackStoryAction('shop', { shopAction: 'buy_breed' });

        return {
          dogs: [...state.dogs, dog],
          selectedDog: dog,
          user: {
            ...state.user,
            cash: state.user.cash - cashCost,
            gems: state.user.gems - gemCost,
          },
        };
      }),

      purchaseItem: (dogId: any, effects: any, cashCost: any, gemCost: any) => set((state: any) => {
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
          dogs: state.dogs.map((dog: any) => {
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

        set((state: any) => ({
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
      feedDog: (dogId: any) => {
        let result = { success: false, message: '' };

        set((state: any) => {
          if (!state.user) {
            result.message = 'No user found';
            return {};
          }

          const dog = state.dogs.find((d: any) => d.id === dogId);
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

          // Update dog stats and consume food storage
          const updatedDogs = state.dogs.map((d: any) => {
            if (d.id !== dogId) return d;
            return {
              ...d,
              hunger: 100, // Reset to full (hunger decays over time)
              energy_stat: Math.min(100, d.energy_stat + energyRestored),
              last_fed: new Date().toISOString(), // Reset hunger decay timer
            };
          });

          const updatedDog = updatedDogs.find((d: any) => d.id === dogId)!;

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

      waterDog: (dogId: any) => {
        let result = { success: false, message: '' };

        set((state: any) => {
          const dog = state.dogs.find((d: any) => d.id === dogId);
          if (!dog) {
            result.message = 'Dog not found';
            return {};
          }

          // Calculate thirst restoration
          const thirstRestored = calculateThirstRestoration(dog.size);

          // Update dog stats
          const updatedDogs = state.dogs.map((d: any) => {
            if (d.id !== dogId) return d;
            return {
              ...d,
              thirst: 100, // Reset to full
              last_watered: new Date().toISOString(), // Reset thirst decay timer
            };
          });

          const updatedDog = updatedDogs.find((d: any) => d.id === dogId)!;

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

      restDog: (dogId: any) => {
        let result = { success: false, message: '' };

        set((state: any) => {
          const dog = state.dogs.find((d: any) => d.id === dogId);
          if (!dog) {
            result.message = 'Dog not found';
            return {};
          }

          // Calculate energy restoration from resting
          const energyRestored = calculateEnergyFromResting();

          // Update dog stats
          const updatedDogs = state.dogs.map((d: any) => {
            if (d.id !== dogId) return d;
            return {
              ...d,
              energy_stat: Math.min(100, d.energy_stat + energyRestored),
            };
          });

          const updatedDog = updatedDogs.find((d: any) => d.id === dogId)!;

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

      refillTrainingPoints: (dogId: any) => {
        const BASE_GEM_COST = 10;
        let result = { success: false, message: '', gemCost: 0 };

        set((state: any) => {
          if (!state.user) {
            result.message = 'No user found';
            return {};
          }

          const dog = state.dogs.find((d: any) => d.id === dogId);
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
          const updatedDogs = state.dogs.map((d: any) => {
            if (d.id !== dogId) return d;
            return {
              ...d,
              training_points: 100, // Fully restore TP
              tp_refills_today: (d.tp_refills_today || 0) + 1,
            };
          });

          const updatedDog = updatedDogs.find((d: any) => d.id === dogId)!;

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

      claimDailyReward: () => set((state: any) => {
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
      startTutorial: (tutorialId: any) => set({ activeTutorial: tutorialId }),

      completeTutorial: (tutorialId: any) => set((state: any) => ({
        activeTutorial: null,
        tutorialProgress: {
          ...state.tutorialProgress,
          completedTutorials: [...state.tutorialProgress.completedTutorials, tutorialId]
        }
      })),

      skipTutorial: (tutorialId: any) => set((state: any) => ({
        activeTutorial: null,
        tutorialProgress: {
          ...state.tutorialProgress,
          skippedTutorials: [...state.tutorialProgress.skippedTutorials, tutorialId]
        }
      })),

      dismissHelp: (helpId: any) => set((state: any) => ({
        tutorialProgress: {
          ...state.tutorialProgress,
          dismissedHelp: [...state.tutorialProgress.dismissedHelp, helpId]
        }
      })),

      toggleHelpIcons: (show: any) => set((state: any) => ({
        tutorialProgress: { ...state.tutorialProgress, showHelpIcons: show }
      })),

      // Story mode actions
      updateObjectiveProgress: (chapterId: string, objectiveId: string, amount: number) => {
        set((state: any) => {
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
        set((state: any) => {
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

        set((state: any) => {
          // Check if rewards already claimed
          if (state.storyProgress.claimedRewards.includes(chapterId)) {
            result.message = 'Rewards already claimed for this chapter!';
            return {};
          }

          // Find the chapter
          const { storyChapters } = require('../data/storyChapters');
          const chapter = storyChapters.find((c: any) => c.id === chapterId);

          if (!chapter) {
            result.message = 'Chapter not found!';
            return {};
          }

          const rewards = chapter.rewards;
          const rewardParts: string[] = [];

          // Apply cash reward
          if (rewards.cash && rewards.cash > 0) {
            state.user.cash += rewards.cash;
            rewardParts.push(`$${rewards.cash}`);
          }

          // Apply gems reward
          if (rewards.gems && rewards.gems > 0) {
            state.user.gems += rewards.gems;
            rewardParts.push(`${rewards.gems} gems`);
          }

          // Apply XP reward
          if (rewards.xp && rewards.xp > 0) {
            state.user.xp += rewards.xp;
            rewardParts.push(`${rewards.xp} XP`);
          }

          // Note: Items would be added to inventory here when inventory system exists
          if (rewards.items && rewards.items.length > 0) {
            rewardParts.push(`${rewards.items.length} items`);
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

        // Save to Supabase if sync is enabled
        const state = useGameStore.getState();
        if (state.syncEnabled && state.user) {
          debouncedSave(() => saveUserProfile(state.user!));
          debouncedSave(() => saveStoryProgress(state.user!.id, state.storyProgress));
        }

        return result;
      },

      setCurrentChapter: (chapterId: string | null) => {
        set((state: any) => ({
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
      updateDogAgesAndHealth: () => set((state: any) => {
        const updatedDogs = state.dogs.map((dog: any) => {
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
          updatedDogs.forEach((dog: any) => {
            const originalDog = state.dogs.find((d: any) => d.id === dog.id);
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

      takeToVet: (dogId: any) => {
        let result = { success: false, message: '' };

        set((state: any) => {
          if (!state.user) {
            result.message = 'No user found';
            return {};
          }

          const dog = state.dogs.find((d: any) => d.id === dogId);
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
          const updatedDogs = state.dogs.map((d: any) => {
            if (d.id !== dogId) return d;
            return { ...d, ...vetUpdates };
          });

          const updatedDog = updatedDogs.find((d: any) => d.id === dogId)!;

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

      takeToEmergencyVet: (dogId: any) => {
        let result = { success: false, message: '' };

        set((state: any) => {
          if (!state.user) {
            result.message = 'No user found';
            return {};
          }

          const dog = state.dogs.find((d: any) => d.id === dogId);
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
          const updatedDogs = state.dogs.map((d: any) => {
            if (d.id !== dogId) return d;
            return { ...d, ...emergencyUpdates };
          });

          const updatedDog = updatedDogs.find((d: any) => d.id === dogId)!;

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

      reviveDeadDog: (dogId: any) => {
        let result = { success: false, message: '' };

        set((state: any) => {
          if (!state.user) {
            result.message = 'No user found';
            return {};
          }

          const dog = state.dogs.find((d: any) => d.id === dogId);
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
          const updatedDogs = state.dogs.map((d: any) => {
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

          const updatedDog = updatedDogs.find((d: any) => d.id === dogId)!;

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

      retireDog: (dogId: any) => {
        let result = { success: false, message: '' };

        set((state: any) => {
          const dog = state.dogs.find((d: any) => d.id === dogId);
          if (!dog) {
            result.message = 'Dog not found';
            return {};
          }

          // Remove the dog from the kennel
          const updatedDogs = state.dogs.filter((d: any) => d.id !== dogId);

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
      treatDogAilment: (dogId: any, cost: any) => {
        let result = { success: false, message: '' };

        set((state: any) => {
          if (!state.user) {
            result.message = 'No user found';
            return {};
          }

          const dog = state.dogs.find((d: any) => d.id === dogId);
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
          const updatedDogs = state.dogs.map((d: any) => {
            if (d.id !== dogId) return d;
            return { ...d, ...treatmentUpdates };
          });

          const updatedDog = updatedDogs.find((d: any) => d.id === dogId)!;

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

      checkForRandomIllness: (dogId: any) => set((state: any) => {
        const dog = state.dogs.find((d: any) => d.id === dogId);
        if (!dog) return {};

        // Don't check if already has ailment or recovering
        if (dog.current_ailment || dog.recovering_from) return {};

        const illness = checkForIllness(dog);
        if (illness) {
          const ailmentUpdates = applyAilment(dog, illness);
          const updatedDogs = state.dogs.map((d: any) => {
            if (d.id !== dogId) return d;
            return { ...d, ...ailmentUpdates };
          });

          const updatedDog = updatedDogs.find((d: any) => d.id === dogId)!;

          // Save to Supabase if sync is enabled
          if (state.syncEnabled) {
            debouncedSave(() => saveDog(updatedDog));
          }

          return { dogs: updatedDogs };
        }

        return {};
      }),

      applyInjuryToDog: (dogId: any, ailmentId: any) => set((state: any) => {
        const dog = state.dogs.find((d: any) => d.id === dogId);
        if (!dog) return {};

        // Don't apply if already has ailment
        if (dog.current_ailment || dog.recovering_from) return {};

        const injury = getAilmentById(ailmentId);
        if (!injury) return {};

        const ailmentUpdates = applyAilment(dog, injury);
        const updatedDogs = state.dogs.map((d: any) => {
          if (d.id !== dogId) return d;
          return { ...d, ...ailmentUpdates };
        });

        const updatedDog = updatedDogs.find((d: any) => d.id === dogId)!;

        // Save to Supabase if sync is enabled
        if (state.syncEnabled) {
          debouncedSave(() => saveDog(updatedDog));
        }

        return { dogs: updatedDogs };
      }),

      // Puppy training actions
      startPuppyTraining: (dogId: string, programId: string): { success: boolean; message: string } => {
        let result = { success: false, message: '' };

        set((state: any) => {
          if (!state.user) {
            result.message = 'No user found';
            return {};
          }

          const dog = state.dogs.find((d: any) => d.id === dogId);
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
          const userUpdates: any = { ...state.user };
          if (program.cost > 0) {
            userUpdates.cash = state.user.cash - program.cost;
          }
          if (program.gemCost > 0) {
            userUpdates.gems = state.user.gems - program.gemCost;
          }

          // Calculate completion time
          const completionTime = calculateCompletionTime(program.durationHours);

          // Update dog
          const updatedDogs = state.dogs.map((d: any) => {
            if (d.id !== dogId) return d;
            return {
              ...d,
              active_puppy_training: programId,
              training_completion_time: completionTime,
            };
          });

          const updatedDog = updatedDogs.find((d: any) => d.id === dogId)!;

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
        set((state: any) => {
          const dog = state.dogs.find((d: any) => d.id === dogId);
          if (!dog || !dog.active_puppy_training) return {};

          const program = PUPPY_TRAINING_PROGRAMS[dog.active_puppy_training];
          if (!program) return {};

          // Apply all bonuses from the program to the dog's stats
          const updates: Partial<Dog> = {
            active_puppy_training: undefined,
            training_completion_time: undefined,
            completed_puppy_training: [
              ...(dog.completed_puppy_training || []),
              dog.active_puppy_training,
            ],
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

          const updatedDogs = state.dogs.map((d: any) => {
            if (d.id !== dogId) return d;
            return { ...d, ...updates };
          });

          const updatedDog = updatedDogs.find((d: any) => d.id === dogId)!;

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

        set((state: any) => {
          if (!state.user) {
            result.message = 'No user found';
            return {};
          }

          const dog = state.dogs.find((d: any) => d.id === dogId);
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
          const updatedDogs = state.dogs.map((d: any) => {
            if (d.id !== dogId) return d;
            return {
              ...d,
              has_unlocked_third_slot: true,
            };
          });

          const updatedDog = updatedDogs.find((d: any) => d.id === dogId)!;

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
        const dog = state.dogs.find((d: any) => d.id === dogId);

        if (!dog || !dog.active_puppy_training || !dog.training_completion_time) {
          return;
        }

        if (isTrainingComplete(dog.training_completion_time)) {
          state.completePuppyTraining(dogId);
        }
      },

      // Reset game
      resetGame: () => set((state: any) => {
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
        };
      }),
    }),
    {
      name: 'paws-and-pedigrees-storage',
    }
  )
);