import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { Dog, UserProfile, TutorialProgress } from '../types';
import { supabase } from '../lib/supabase';
import {
  loadUserData,
  saveUserProfile,
  saveDog,
  deleteDog as deleteDogFromDb,
  debouncedSave
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
  isPregnancyComplete,
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
  getUpgradeCost,
  getKennelLevelInfo,
} from '../utils/kennelUpgrades';

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

  // Health & Vet actions
  updateDogAgesAndHealth: () => void;
  takeToVet: (dogId: string) => { success: boolean; message?: string };
  takeToEmergencyVet: (dogId: string) => { success: boolean; message?: string };
  reviveDeadDog: (dogId: string) => { success: boolean; message?: string };

  // Veterinary/Ailment actions
  treatDogAilment: (dogId: string, cost: number) => { success: boolean; message?: string };
  checkForRandomIllness: (dogId: string) => void;
  applyInjuryToDog: (dogId: string, ailmentId: string) => void;

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

      // Supabase sync methods
      loadFromSupabase: async (userId: string) => {
        set({ loading: true, error: null });
        try {
          const { profile, dogs } = await loadUserData(userId);

          // If profile doesn't exist, create a new one
          if (!profile) {
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
            await saveUserProfile(newProfile);

            set({
              user: newProfile,
              dogs: [],
              syncEnabled: true,
              hasAdoptedFirstDog: false,
              loading: false,
              error: null
            });
          } else {
            // Profile exists, load it normally
            set({
              user: profile,
              dogs: dogs || [],
              syncEnabled: true,
              hasAdoptedFirstDog: dogs.length > 0,
              loading: false,
              error: null
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

        set((state) => ({
          dogs: [...state.dogs, dog],
          selectedDog: dog
        }));

        // Save to Supabase if sync is enabled
        if (state.syncEnabled) {
          saveDog(dog);
        }
      },

      updateDog: (dogId, updates) => {
        set((state) => ({
          dogs: state.dogs.map(dog =>
            dog.id === dogId ? { ...dog, ...updates } : dog
          ),
          selectedDog: state.selectedDog?.id === dogId
            ? { ...state.selectedDog, ...updates }
            : state.selectedDog
        }));
        // Save to Supabase if sync is enabled
        const state = useGameStore.getState();
        if (state.syncEnabled) {
          const updatedDog = state.dogs.find(d => d.id === dogId);
          if (updatedDog) {
            debouncedSave(() => saveDog(updatedDog));
          }
        }
      },
      
      selectDog: (dog) => set({ selectedDog: dog }),
      
      updateUserCash: (amount) => {
        set((state) => ({
          user: state.user ? { ...state.user, cash: state.user.cash + amount } : null
        }));
        // Save to Supabase if sync is enabled
        const state = useGameStore.getState();
        if (state.syncEnabled && state.user) {
          debouncedSave(() => saveUserProfile(state.user!));
        }
      },

      updateUserGems: (amount) => {
        set((state) => ({
          user: state.user ? { ...state.user, gems: state.user.gems + amount } : null
        }));
        // Save to Supabase if sync is enabled
        const state = useGameStore.getState();
        if (state.syncEnabled && state.user) {
          debouncedSave(() => saveUserProfile(state.user!));
        }
      },

      updateUserXP: (amount) => {
        set((state) => ({
          user: state.user ? { ...state.user, xp: state.user.xp + amount } : null
        }));
        // Save to Supabase if sync is enabled
        const state = useGameStore.getState();
        if (state.syncEnabled && state.user) {
          debouncedSave(() => saveUserProfile(state.user!));
        }
      },

      updateCompetitionWins: (tier) => {
        set((state) => {
          if (!state.user) return {};
          const updates: Partial<UserProfile> = {};
          if (tier === 'local') updates.competition_wins_local = (state.user.competition_wins_local || 0) + 1;
          if (tier === 'regional') updates.competition_wins_regional = (state.user.competition_wins_regional || 0) + 1;
          if (tier === 'national') updates.competition_wins_national = (state.user.competition_wins_national || 0) + 1;
          return { user: { ...state.user, ...updates } };
        });
        // Save to Supabase if sync is enabled
        const state = useGameStore.getState();
        if (state.syncEnabled && state.user) {
          debouncedSave(() => saveUserProfile(state.user!));
        }
      },

      setHasAdoptedFirstDog: (value) => set({ hasAdoptedFirstDog: value }),

      // Breeding actions
      breedDogs: (sireId, damId, litterSize) => set((state) => {
        const now = new Date().toISOString();
        const pregnancyDue = calculatePregnancyDue(); // Use time scaling system (24 hours)

        return {
          dogs: state.dogs.map(dog => {
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

      giveBirth: (damId, puppies) => set((state) => ({
        dogs: [
          ...state.dogs.map(dog =>
            dog.id === damId
              ? { ...dog, is_pregnant: false, pregnancy_due: undefined, litter_size: undefined }
              : dog
          ),
          ...puppies,
        ],
      })),

      sellPuppy: (puppyId, price) => set((state) => ({
        dogs: state.dogs.filter(dog => dog.id !== puppyId),
        selectedDog: state.selectedDog?.id === puppyId ? null : state.selectedDog,
        user: state.user ? { ...state.user, cash: state.user.cash + price } : null,
      })),

      skipPregnancy: (damId, gemCost) => set((state) => {
        if (!state.user || state.user.gems < gemCost) return {};

        return {
          user: { ...state.user, gems: state.user.gems - gemCost },
          dogs: state.dogs.map(dog =>
            dog.id === damId
              ? { ...dog, pregnancy_due: new Date().toISOString() } // Set due date to now
              : dog
          ),
        };
      }),

      removeDog: (dogId) => {
        set((state) => ({
          dogs: state.dogs.filter(dog => dog.id !== dogId),
          selectedDog: state.selectedDog?.id === dogId ? null : state.selectedDog,
        }));
        // Delete from Supabase if sync is enabled
        const state = useGameStore.getState();
        if (state.syncEnabled) {
          deleteDogFromDb(dogId);
        }
      },

      // Shop actions
      purchaseBreed: (dog, cashCost, gemCost) => set((state) => {
        if (!state.user) return {};

        // Check if user has enough currency
        if (cashCost > 0 && state.user.cash < cashCost) return {};
        if (gemCost > 0 && state.user.gems < gemCost) return {};

        // Check kennel capacity
        if (!canAddDog(state.dogs.length, state.user.kennel_level)) {
          alert('Kennel is at capacity! Upgrade your kennel level to add more dogs.');
          return {};
        }

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

      purchaseItem: (dogId, effects, cashCost, gemCost) => set((state) => {
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

        return {
          dogs: state.dogs.map(dog => {
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
      upgradeKennel: () => {
        const state = useGameStore.getState();

        if (!state.user) {
          return { success: false, message: 'No user found' };
        }

        const currentLevel = state.user.kennel_level;
        const checkResult = canUpgradeKennel(currentLevel, state.user.cash);

        if (!checkResult.canUpgrade) {
          return { success: false, message: checkResult.reason };
        }

        const cost = checkResult.cost!;
        const newLevel = currentLevel + 1;
        const newLevelInfo = getKennelLevelInfo(newLevel);

        set((state) => ({
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
      feedDog: (dogId) => {
        let result = { success: false, message: '' };

        set((state) => {
          if (!state.user) {
            result.message = 'No user found';
            return {};
          }

          const dog = state.dogs.find(d => d.id === dogId);
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
          const updatedDogs = state.dogs.map(d => {
            if (d.id !== dogId) return d;
            return {
              ...d,
              hunger: Math.min(100, d.hunger + hungerRestored),
              energy_stat: Math.min(100, d.energy_stat + energyRestored),
              last_fed: new Date().toISOString(),
            };
          });

          const updatedDog = updatedDogs.find(d => d.id === dogId)!;

          // Save to Supabase if sync is enabled
          if (state.syncEnabled) {
            debouncedSave(() => saveDog(updatedDog));
          }

          result.success = true;
          result.message = `Fed ${dog.name}! +${hungerRestored} hunger, +${energyRestored} energy. Used ${foodNeeded} food units.`;

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

      waterDog: (dogId) => {
        let result = { success: false, message: '' };

        set((state) => {
          const dog = state.dogs.find(d => d.id === dogId);
          if (!dog) {
            result.message = 'Dog not found';
            return {};
          }

          // Calculate thirst restoration
          const thirstRestored = calculateThirstRestoration(dog.size);

          // Update dog stats
          const updatedDogs = state.dogs.map(d => {
            if (d.id !== dogId) return d;
            return {
              ...d,
              thirst: Math.min(100, d.thirst + thirstRestored),
            };
          });

          const updatedDog = updatedDogs.find(d => d.id === dogId)!;

          // Save to Supabase if sync is enabled
          if (state.syncEnabled) {
            debouncedSave(() => saveDog(updatedDog));
          }

          result.success = true;
          result.message = `Gave water to ${dog.name}! +${thirstRestored} thirst.`;

          return {
            dogs: updatedDogs,
            selectedDog: state.selectedDog?.id === dogId ? updatedDog : state.selectedDog,
          };
        });

        return result;
      },

      restDog: (dogId) => {
        let result = { success: false, message: '' };

        set((state) => {
          const dog = state.dogs.find(d => d.id === dogId);
          if (!dog) {
            result.message = 'Dog not found';
            return {};
          }

          // Calculate energy restoration from resting
          const energyRestored = calculateEnergyFromResting();

          // Update dog stats
          const updatedDogs = state.dogs.map(d => {
            if (d.id !== dogId) return d;
            return {
              ...d,
              energy_stat: Math.min(100, d.energy_stat + energyRestored),
            };
          });

          const updatedDog = updatedDogs.find(d => d.id === dogId)!;

          // Save to Supabase if sync is enabled
          if (state.syncEnabled) {
            debouncedSave(() => saveDog(updatedDog));
          }

          result.success = true;
          result.message = `${dog.name} rested! +${energyRestored} energy.`;

          return {
            dogs: updatedDogs,
            selectedDog: state.selectedDog?.id === dogId ? updatedDog : state.selectedDog,
          };
        });

        return result;
      },

      claimDailyReward: () => set((state) => {
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
      startTutorial: (tutorialId) => set({ activeTutorial: tutorialId }),

      completeTutorial: (tutorialId) => set((state) => ({
        activeTutorial: null,
        tutorialProgress: {
          ...state.tutorialProgress,
          completedTutorials: [...state.tutorialProgress.completedTutorials, tutorialId]
        }
      })),

      skipTutorial: (tutorialId) => set((state) => ({
        activeTutorial: null,
        tutorialProgress: {
          ...state.tutorialProgress,
          skippedTutorials: [...state.tutorialProgress.skippedTutorials, tutorialId]
        }
      })),

      dismissHelp: (helpId) => set((state) => ({
        tutorialProgress: {
          ...state.tutorialProgress,
          dismissedHelp: [...state.tutorialProgress.dismissedHelp, helpId]
        }
      })),

      toggleHelpIcons: (show) => set((state) => ({
        tutorialProgress: { ...state.tutorialProgress, showHelpIcons: show }
      })),

      // Health & Vet actions
      updateDogAgesAndHealth: () => set((state) => {
        const updatedDogs = state.dogs.map(dog => {
          // Calculate current age
          const ageWeeks = calculateAgeInWeeks(dog.birth_date);
          const ageYears = calculateAgeInYears(dog.birth_date);
          const lifeStage = getLifeStage(ageWeeks);

          // Calculate current health based on care
          const currentHealth = calculateHealthDecay(dog);

          // Check if dog has reached max age (natural death)
          const reachedMaxAge = hasReachedMaxAge(dog.birth_date);

          let updates: Partial<Dog> = {
            age_weeks: ageWeeks,
            age_years: ageYears,
            life_stage: lifeStage,
            health: currentHealth,
            // Mark as dead if reached max age or health is 0
            is_dead: reachedMaxAge || currentHealth <= 0,
          };

          // Check if recovery is complete
          if (dog.recovering_from && checkRecoveryComplete(dog)) {
            const recoveryUpdates = completeRecovery(dog);
            updates = { ...updates, ...recoveryUpdates };
          }

          // Random illness check (1% chance per check, modified by care quality)
          if (!dog.current_ailment && !dog.recovering_from && !dog.is_dead) {
            const illness = checkForIllness(dog);
            if (illness) {
              const ailmentUpdates = applyAilment(dog, illness);
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
          updatedDogs.forEach(dog => debouncedSave(() => saveDog(dog)));
        }

        return { dogs: updatedDogs };
      }),

      takeToVet: (dogId) => {
        let result = { success: false, message: '' };

        set((state) => {
          if (!state.user) {
            result.message = 'No user found';
            return {};
          }

          const dog = state.dogs.find(d => d.id === dogId);
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
          const vetUpdates = visitVet(dog);
          const updatedDogs = state.dogs.map(d => {
            if (d.id !== dogId) return d;
            return { ...d, ...vetUpdates };
          });

          const updatedDog = updatedDogs.find(d => d.id === dogId)!;

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

      takeToEmergencyVet: (dogId) => {
        let result = { success: false, message: '' };

        set((state) => {
          if (!state.user) {
            result.message = 'No user found';
            return {};
          }

          const dog = state.dogs.find(d => d.id === dogId);
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
          const updatedDogs = state.dogs.map(d => {
            if (d.id !== dogId) return d;
            return { ...d, ...emergencyUpdates };
          });

          const updatedDog = updatedDogs.find(d => d.id === dogId)!;

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

      reviveDeadDog: (dogId) => {
        let result = { success: false, message: '' };

        set((state) => {
          if (!state.user) {
            result.message = 'No user found';
            return {};
          }

          const dog = state.dogs.find(d => d.id === dogId);
          if (!dog) {
            result.message = 'Dog not found';
            return {};
          }

          // Check if user has enough gems
          if (state.user.gems < REVIVAL_GEM_COST) {
            result.message = `Not enough gems! Need ${REVIVAL_GEM_COST} gems, have ${state.user.gems}`;
            return {};
          }

          // Get health status
          const healthStatus = getHealthStatus(dog);
          if (!healthStatus.isDead) {
            result.message = `${dog.name} is not dead and doesn't need revival.`;
            return {};
          }

          if (!healthStatus.canRevive) {
            result.message = `${dog.name} has been gone too long and cannot be revived.`;
            return {};
          }

          // Apply revival (reduces stats significantly)
          const revivalUpdates = reviveDog(dog);
          const updatedDogs = state.dogs.map(d => {
            if (d.id !== dogId) return d;
            return { ...d, ...revivalUpdates, is_dead: false };
          });

          const updatedDog = updatedDogs.find(d => d.id === dogId)!;

          // Save to Supabase if sync is enabled
          if (state.syncEnabled) {
            debouncedSave(() => saveDog(updatedDog));
            debouncedSave(() => saveUserProfile({ ...state.user!, gems: state.user!.gems - REVIVAL_GEM_COST }));
          }

          result.success = true;
          result.message = `${dog.name} was revived! Health restored to 50% but stats were significantly reduced. Cost: ${REVIVAL_GEM_COST} gems`;

          return {
            dogs: updatedDogs,
            selectedDog: state.selectedDog?.id === dogId ? updatedDog : state.selectedDog,
            user: {
              ...state.user,
              gems: state.user.gems - REVIVAL_GEM_COST,
            },
          };
        });

        return result;
      },

      // Veterinary/Ailment actions
      treatDogAilment: (dogId, cost) => {
        let result = { success: false, message: '' };

        set((state) => {
          if (!state.user) {
            result.message = 'No user found';
            return {};
          }

          const dog = state.dogs.find(d => d.id === dogId);
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
          const updatedDogs = state.dogs.map(d => {
            if (d.id !== dogId) return d;
            return { ...d, ...treatmentUpdates };
          });

          const updatedDog = updatedDogs.find(d => d.id === dogId)!;

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

      checkForRandomIllness: (dogId) => set((state) => {
        const dog = state.dogs.find(d => d.id === dogId);
        if (!dog) return {};

        // Don't check if already has ailment or recovering
        if (dog.current_ailment || dog.recovering_from) return {};

        const illness = checkForIllness(dog);
        if (illness) {
          const ailmentUpdates = applyAilment(dog, illness);
          const updatedDogs = state.dogs.map(d => {
            if (d.id !== dogId) return d;
            return { ...d, ...ailmentUpdates };
          });

          const updatedDog = updatedDogs.find(d => d.id === dogId)!;

          // Save to Supabase if sync is enabled
          if (state.syncEnabled) {
            debouncedSave(() => saveDog(updatedDog));
          }

          return { dogs: updatedDogs };
        }

        return {};
      }),

      applyInjuryToDog: (dogId, ailmentId) => set((state) => {
        const dog = state.dogs.find(d => d.id === dogId);
        if (!dog) return {};

        // Don't apply if already has ailment
        if (dog.current_ailment || dog.recovering_from) return {};

        const injury = getAilmentById(ailmentId);
        if (!injury) return {};

        const ailmentUpdates = applyAilment(dog, injury);
        const updatedDogs = state.dogs.map(d => {
          if (d.id !== dogId) return d;
          return { ...d, ...ailmentUpdates };
        });

        const updatedDog = updatedDogs.find(d => d.id === dogId)!;

        // Save to Supabase if sync is enabled
        if (state.syncEnabled) {
          debouncedSave(() => saveDog(updatedDog));
        }

        return { dogs: updatedDogs };
      }),

      // Reset game
      resetGame: () => set((state) => {
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
        };
      }),
    }),
    {
      name: 'paws-and-pedigrees-storage',
    }
  )
);