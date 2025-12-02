/**
 * Testing Utilities
 *
 * Helper functions and utilities for testing React components
 */

// @ts-nocheck - Test utilities require @testing-library/react which is not installed
import { ReactElement } from 'react';
import { render, RenderOptions } from '@testing-library/react';
import { Dog, UserProfile, Breed } from '../types';

/**
 * Custom render function with providers
 */
export function renderWithProviders(
  ui: ReactElement,
  options?: Omit<RenderOptions, 'wrapper'>
) {
  return render(ui, { ...options });
}

/**
 * Create mock dog for testing
 */
export function createMockDog(overrides?: Partial<Dog>): Dog {
  const baseDate = new Date('2024-01-01').toISOString();

  return {
    id: 'test-dog-1',
    user_id: 'test-user-1',
    breed_id: 1,
    name: 'Test Dog',
    gender: 'male',
    birth_date: baseDate,
    size: 50,
    energy: 75,
    friendliness: 80,
    trainability: 70,
    intelligence: 75,
    speed: 65,
    agility: 70,
    strength: 60,
    endurance: 65,
    prey_drive: 50,
    protectiveness: 55,
    speed_trained: 10,
    agility_trained: 15,
    strength_trained: 12,
    endurance_trained: 14,
    obedience_trained: 20,
    coat_type: 'short',
    coat_color: 'brown',
    coat_pattern: 'solid',
    eye_color: 'brown',
    hunger: 30,
    thirst: 25,
    happiness: 85,
    energy_stat: 90,
    health: 95,
    training_points: 50,
    training_sessions_today: 2,
    last_training_reset: baseDate,
    tp_refills_today: 0,
    bond_level: 5,
    bond_xp: 250,
    is_rescue: false,
    age_weeks: 104, // 2 years
    life_stage: 'adult',
    created_at: baseDate,
    last_fed: baseDate,
    last_watered: baseDate,
    last_played: baseDate,
    ...overrides,
  };
}

/**
 * Create mock user profile for testing
 */
export function createMockUser(overrides?: Partial<UserProfile>): UserProfile {
  const baseDate = new Date('2024-01-01').toISOString();

  return {
    id: 'test-user-1',
    username: 'testuser',
    kennel_name: 'Test Kennel',
    cash: 5000,
    gems: 100,
    level: 10,
    xp: 1500,
    training_skill: 50,
    care_knowledge: 45,
    breeding_expertise: 40,
    competition_strategy: 55,
    business_acumen: 50,
    kennel_level: 3,
    food_storage: 75,
    created_at: baseDate,
    last_login: baseDate,
    login_streak: 5,
    competition_wins_local: 12,
    competition_wins_regional: 5,
    competition_wins_national: 2,
    inventory: [],
    achievements: [],
    staff: [],
    prestigePoints: 150,
    ...overrides,
  };
}

/**
 * Create mock breed for testing
 */
export function createMockBreed(overrides?: Partial<Breed>): Breed {
  return {
    id: 1,
    name: 'Test Breed',
    tier: 'common',
    unlock_level: 1,
    purchase_price: 1000,
    size_min: 40,
    size_max: 60,
    energy_min: 60,
    energy_max: 90,
    friendliness_min: 70,
    friendliness_max: 90,
    trainability_min: 60,
    trainability_max: 85,
    intelligence_min: 65,
    intelligence_max: 85,
    speed_min: 50,
    speed_max: 80,
    agility_min: 55,
    agility_max: 85,
    strength_min: 50,
    strength_max: 75,
    endurance_min: 55,
    endurance_max: 80,
    prey_drive_min: 40,
    prey_drive_max: 70,
    protectiveness_min: 45,
    protectiveness_max: 75,
    coat_types: ['short', 'medium'],
    description: 'A test breed for testing purposes',
    ...overrides,
  };
}

/**
 * Wait for a specific condition with timeout
 */
export function waitForCondition(
  condition: () => boolean,
  timeout = 5000
): Promise<void> {
  return new Promise((resolve, reject) => {
    const startTime = Date.now();

    const check = () => {
      if (condition()) {
        resolve();
      } else if (Date.now() - startTime > timeout) {
        reject(new Error('Condition timeout'));
      } else {
        setTimeout(check, 100);
      }
    };

    check();
  });
}

/**
 * Mock localStorage for testing
 */
export class MockLocalStorage {
  private store: Map<string, string> = new Map();

  getItem(key: string): string | null {
    return this.store.get(key) || null;
  }

  setItem(key: string, value: string): void {
    this.store.set(key, value);
  }

  removeItem(key: string): void {
    this.store.delete(key);
  }

  clear(): void {
    this.store.clear();
  }

  get length(): number {
    return this.store.size;
  }

  key(index: number): string | null {
    return Array.from(this.store.keys())[index] || null;
  }
}

/**
 * Mock Date for consistent testing
 */
export class MockDate {
  private static originalDate = Date;
  private static mockedTime: number | null = null;

  static set(dateString: string): void {
    this.mockedTime = new Date(dateString).getTime();
    (global as any).Date = class extends this.originalDate {
      constructor(...args: any[]) {
        if (args.length === 0) {
          super(MockDate.mockedTime!);
        } else {
          super(...args);
        }
      }

      static now() {
        return MockDate.mockedTime!;
      }
    };
  }

  static reset(): void {
    (global as any).Date = this.originalDate;
    this.mockedTime = null;
  }
}

/**
 * Simulate time passing
 */
export function advanceTime(ms: number): void {
  const now = Date.now();
  MockDate.set(new Date(now + ms).toISOString());
}

/**
 * Test assertions for dogs
 */
export const dogAssertions = {
  isHealthy(dog: Dog): boolean {
    return dog.health >= 80;
  },

  isHappy(dog: Dog): boolean {
    return dog.happiness >= 70;
  },

  needsCare(dog: Dog): boolean {
    return (
      dog.hunger > 70 ||
      dog.thirst > 70 ||
      dog.happiness < 50 ||
      dog.health < 70 ||
      dog.energy_stat < 30
    );
  },

  canTrain(dog: Dog): boolean {
    return (
      dog.training_points > 0 &&
      dog.energy_stat >= 20 &&
      dog.health >= 50
    );
  },

  canBreed(dog: Dog): boolean {
    return (
      dog.age_weeks >= 52 &&
      dog.health >= 80 &&
      !dog.is_pregnant &&
      !dog.is_dead
    );
  },

  canCompete(dog: Dog): boolean {
    return (
      dog.health >= 70 &&
      dog.energy_stat >= 50 &&
      dog.happiness >= 60 &&
      dog.age_weeks >= 52
    );
  },
};

/**
 * Generate random test data
 */
export const testDataGenerator = {
  randomInt(min: number, max: number): number {
    return Math.floor(Math.random() * (max - min + 1)) + min;
  },

  randomChoice<T>(array: T[]): T {
    return array[Math.floor(Math.random() * array.length)];
  },

  randomDog(): Dog {
    const genders: Array<'male' | 'female'> = ['male', 'female'];
    const coatTypes = ['short', 'medium', 'long'];
    const coatColors = ['black', 'brown', 'white', 'golden', 'gray'];

    return createMockDog({
      id: `test-dog-${this.randomInt(1000, 9999)}`,
      name: `Dog ${this.randomInt(1, 100)}`,
      gender: this.randomChoice(genders),
      coat_type: this.randomChoice(coatTypes),
      coat_color: this.randomChoice(coatColors),
      speed: this.randomInt(50, 100),
      agility: this.randomInt(50, 100),
      strength: this.randomInt(50, 100),
      endurance: this.randomInt(50, 100),
      intelligence: this.randomInt(50, 100),
    });
  },

  randomDogs(count: number): Dog[] {
    return Array.from({ length: count }, () => this.randomDog());
  },
};

/**
 * Setup and teardown helpers
 */
export const testSetup = {
  beforeEach: () => {
    // Setup localStorage mock
    const mockLocalStorage = new MockLocalStorage();
    Object.defineProperty(window, 'localStorage', {
      value: mockLocalStorage,
      writable: true,
    });

    // Mock console methods to reduce test noise
    jest.spyOn(console, 'log').mockImplementation(() => {});
    jest.spyOn(console, 'warn').mockImplementation(() => {});
    jest.spyOn(console, 'error').mockImplementation(() => {});
  },

  afterEach: () => {
    // Restore console methods
    jest.restoreAllMocks();

    // Reset Date mock
    MockDate.reset();

    // Clear localStorage
    localStorage.clear();
  },
};

/**
 * Performance testing helpers
 */
export const performanceTests = {
  measureRenderTime(renderFn: () => void): number {
    const start = performance.now();
    renderFn();
    const end = performance.now();
    return end - start;
  },

  expectRenderUnder(renderFn: () => void, maxMs: number): void {
    const duration = this.measureRenderTime(renderFn);
    if (duration > maxMs) {
      throw new Error(
        `Render took ${duration.toFixed(2)}ms, expected under ${maxMs}ms`
      );
    }
  },
};
