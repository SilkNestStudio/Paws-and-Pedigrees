import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { Dog, UserProfile } from '../types';

interface GameState {
  user: UserProfile | null;
  dogs: Dog[];
  selectedDog: Dog | null;
  hasAdoptedFirstDog: boolean;

  setUser: (user: UserProfile) => void;
  addDog: (dog: Dog) => void;
  updateDog: (dogId: string, updates: Partial<Dog>) => void;
  selectDog: (dog: Dog | null) => void;
  updateUserCash: (amount: number) => void;
  updateUserGems: (amount: number) => void;
  updateCompetitionWins: (tier: 'local' | 'regional' | 'national') => void;
  setHasAdoptedFirstDog: (value: boolean) => void;
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

      setUser: (user) => set({ user }),
      
      addDog: (dog) => set((state) => ({ 
        dogs: [...state.dogs, dog],
        selectedDog: dog 
      })),
      
      updateDog: (dogId, updates) => set((state) => ({
        dogs: state.dogs.map(dog => 
          dog.id === dogId ? { ...dog, ...updates } : dog
        ),
        selectedDog: state.selectedDog?.id === dogId 
          ? { ...state.selectedDog, ...updates }
          : state.selectedDog
      })),
      
      selectDog: (dog) => set({ selectedDog: dog }),
      
      updateUserCash: (amount) => set((state) => ({
        user: state.user ? { ...state.user, cash: state.user.cash + amount } : null
      })),
      
      updateUserGems: (amount) => set((state) => ({
        user: state.user ? { ...state.user, gems: state.user.gems + amount } : null
      })),

      updateCompetitionWins: (tier) => set((state) => {
        if (!state.user) return {};
        const updates: Partial<UserProfile> = {};
        if (tier === 'local') updates.competition_wins_local = (state.user.competition_wins_local || 0) + 1;
        if (tier === 'regional') updates.competition_wins_regional = (state.user.competition_wins_regional || 0) + 1;
        if (tier === 'national') updates.competition_wins_national = (state.user.competition_wins_national || 0) + 1;
        return { user: { ...state.user, ...updates } };
      }),

      setHasAdoptedFirstDog: (value) => set({ hasAdoptedFirstDog: value }),
    }),
    {
      name: 'paws-and-pedigrees-storage',
    }
  )
);