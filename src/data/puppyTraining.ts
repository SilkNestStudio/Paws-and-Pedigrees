/**
 * Puppy Training System
 *
 * Special training programs available only for puppies (under 52 weeks)
 * Provides permanent bonuses and traits
 */

export interface PuppyTrainingProgram {
  id: string;
  name: string;
  description: string;
  cost: number; // Cash cost (0 for gem-only)
  gemCost: number; // Gem cost (0 for cash-only)
  durationHours: number; // Real-time hours
  isPremium: boolean;
  icon: string;

  // Bonuses (permanent)
  bonuses: {
    happinessBaseline?: number; // % increase to happiness baseline
    bondGainRate?: number; // % increase to bond XP gain
    trainingEffectiveness?: number; // % increase to training gains
    energyRegen?: number; // % increase to energy regeneration
    competitionBonus?: number; // % increase to competition scores
    breedingValue?: number; // % increase to breeding value
    statBonus?: number; // Flat bonus to all stats

    // Specific competition bonuses
    agilityBonus?: number;
    obedienceBonus?: number;
    conformationBonus?: number;
  };

  // Unlocks
  unlocks?: {
    trait?: string; // Special trait name
    jobType?: string; // Unlocks specific job
    ability?: string; // Special ability
  };
}

export const PUPPY_TRAINING_PROGRAMS: Record<string, PuppyTrainingProgram> = {
  socialization: {
    id: 'socialization',
    name: 'Socialization Training',
    description: 'Expose your puppy to new people, places, and experiences. Builds confidence and reduces anxiety.',
    cost: 200,
    gemCost: 0,
    durationHours: 4,
    isPremium: false,
    icon: '🤝',
    bonuses: {
      happinessBaseline: 10,
      bondGainRate: 25,
      competitionBonus: 5,
    },
  },

  basicObedience: {
    id: 'basicObedience',
    name: 'Basic Obedience',
    description: 'Teach fundamental commands and good manners. Foundation for all future training.',
    cost: 300,
    gemCost: 0,
    durationHours: 6,
    isPremium: false,
    icon: '📚',
    bonuses: {
      trainingEffectiveness: 15,
      competitionBonus: 5,
      obedienceBonus: 10,
    },
    unlocks: {
      trait: 'Well-Behaved',
    },
  },

  crateTraining: {
    id: 'crateTraining',
    name: 'Crate Training',
    description: 'Create a safe space for your puppy. Improves rest quality and reduces separation anxiety.',
    cost: 150,
    gemCost: 0,
    durationHours: 3,
    isPremium: false,
    icon: '🏠',
    bonuses: {
      energyRegen: 20,
      happinessBaseline: 5,
    },
  },

  leashTraining: {
    id: 'leashTraining',
    name: 'Leash Training',
    description: 'Teach polite walking and leash manners. Opens up new opportunities.',
    cost: 150,
    gemCost: 0,
    durationHours: 2,
    isPremium: false,
    icon: '🦮',
    bonuses: {
      agilityBonus: 10,
    },
    unlocks: {
      jobType: 'Walk',
      ability: 'Enhanced Walking',
    },
  },

  earlySocialization: {
    id: 'earlySocialization',
    name: 'Early Socialization (Dog Park)',
    description: 'Meet other dogs in a controlled environment. Builds social skills and confidence.',
    cost: 100,
    gemCost: 0,
    durationHours: 2,
    isPremium: false,
    icon: '🐕',
    bonuses: {
      statBonus: 3,
      happinessBaseline: 5,
    },
    unlocks: {
      trait: 'Social',
    },
  },

  biteInhibition: {
    id: 'biteInhibition',
    name: 'Bite Inhibition',
    description: 'Teach gentle mouth control. Prevents bad habits and improves temperament.',
    cost: 200,
    gemCost: 0,
    durationHours: 4,
    isPremium: false,
    icon: '🦷',
    bonuses: {
      breedingValue: 15,
      obedienceBonus: 10,
    },
    unlocks: {
      trait: 'Gentle',
    },
  },

  championsFoundation: {
    id: 'championsFoundation',
    name: "Champion's Foundation",
    description: 'Elite, intensive training program that sets your puppy up for championship success. The ultimate early investment.',
    cost: 0,
    gemCost: 500,
    durationHours: 8,
    isPremium: true,
    icon: '👑',
    bonuses: {
      statBonus: 10,
      trainingEffectiveness: 25,
      competitionBonus: 20,
      breedingValue: 50,
      bondGainRate: 30,
    },
    unlocks: {
      trait: 'Elite Champion',
    },
  },
};

// Constants
export const MAX_FREE_PUPPY_TRAINING_SLOTS = 2;
export const THIRD_SLOT_GEM_COST = 100;
export const PUPPY_AGE_WARNING_WEEKS = 48; // Warn at week 48 (4 weeks before adult)
export const PUPPY_MAX_AGE_WEEKS = 52; // Must complete before week 52

/**
 * Get all standard (non-premium) programs
 */
export function getStandardPrograms(): PuppyTrainingProgram[] {
  return Object.values(PUPPY_TRAINING_PROGRAMS).filter(p => !p.isPremium);
}

/**
 * Get premium program
 */
export function getPremiumProgram(): PuppyTrainingProgram {
  return PUPPY_TRAINING_PROGRAMS.championsFoundation;
}

/**
 * Check if puppy can still do training
 */
export function canDoPuppyTraining(ageWeeks: number): boolean {
  return ageWeeks < PUPPY_MAX_AGE_WEEKS;
}

/**
 * Check if should show warning
 */
export function shouldShowAgeWarning(ageWeeks: number): boolean {
  return ageWeeks >= PUPPY_AGE_WARNING_WEEKS && ageWeeks < PUPPY_MAX_AGE_WEEKS;
}

/**
 * Get weeks remaining for puppy training
 */
export function getWeeksRemaining(ageWeeks: number): number {
  return Math.max(0, PUPPY_MAX_AGE_WEEKS - ageWeeks);
}

/**
 * Calculate training completion time
 */
export function calculateCompletionTime(durationHours: number): string {
  const completionTime = Date.now() + (durationHours * 60 * 60 * 1000);
  return new Date(completionTime).toISOString();
}

/**
 * Check if training is complete
 */
export function isTrainingComplete(completionTime: string): boolean {
  return Date.now() >= new Date(completionTime).getTime();
}

/**
 * Get hours remaining for active training
 */
export function getHoursRemaining(completionTime: string): number {
  const remaining = new Date(completionTime).getTime() - Date.now();
  return Math.max(0, remaining / (60 * 60 * 1000));
}
