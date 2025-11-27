import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { Dog, UserProfile } from '../types';
import {
  loadUserData,
  saveUserProfile,
  saveDog,
  deleteDog as deleteDogFromDb,
  debouncedSave
} from '../lib/supabaseService';

interface GameState {
  user: UserProfile | null;
  dogs: Dog[];
  selectedDog: Dog | null;
  hasAdoptedFirstDog: boolean;
  syncEnabled: boolean;

  // Supabase sync methods
  loadFromSupabase: (userId: string) => Promise<void>;
  setSyncEnabled: (enabled: boolean) => void;

  setUser: (user: UserProfile) => void;
  addDog: (dog: Dog) => void;
  updateDog: (dogId: string, updates: Partial<Dog>) => void;
  selectDog: (dog: Dog | null) => void;
  updateUserCash: (amount: number) => void;
  updateUserGems: (amount: number) => void;
  updateCompetitionWins: (tier: 'local' | 'regional' | 'national') => void;
  setHasAdoptedFirstDog: (value: boolean) => void;

  // Breeding actions
  breedDogs: (sireId: string, damId: string, litterSize: number, pregnancyDue: string) => void;
  giveBirth: (damId: string, puppies: Dog[]) => void;
  sellPuppy: (puppyId: string, price: number) => void;
  skipPregnancy: (damId: string, gemCost: number) => void;
  removeDog: (dogId: string) => void;

  // Shop actions
  purchaseBreed: (dog: Dog, cashCost: number, gemCost: number) => void;
  purchaseItem: (dogId: string, effects: any, cashCost: number, gemCost: number) => void;
}

export const useGameStore = create<GameState>()(
  persist(
    (set) => ({
      user: {
        id: 'temp-user-id',
        username: 'Player',
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
      },
      dogs: [],
      selectedDog: null,
      hasAdoptedFirstDog: false,
      syncEnabled: false,

      // Supabase sync methods
      loadFromSupabase: async (userId: string) => {
        try {
          const { profile, dogs } = await loadUserData(userId);
          if (profile) {
            set({
              user: profile,
              dogs: dogs || [],
              syncEnabled: true,
              hasAdoptedFirstDog: dogs.length > 0
            });
          }
        } catch (error) {
          console.error('Error loading from Supabase:', error);
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
        set((state) => ({
          dogs: [...state.dogs, dog],
          selectedDog: dog
        }));
        // Save to Supabase if sync is enabled
        const state = useGameStore.getState();
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
      breedDogs: (sireId, damId, litterSize, pregnancyDue) => set((state) => {
        const now = new Date().toISOString();
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

        return {
          dogs: state.dogs.map(dog => {
            if (dog.id !== dogId) return dog;

            // Apply effects to dog
            const updates: Partial<Dog> = {};
            if (effects.hunger !== undefined) {
              updates.hunger = Math.min(100, dog.hunger + effects.hunger);
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
          },
        };
      }),
    }),
    {
      name: 'paws-and-pedigrees-storage',
    }
  )
);