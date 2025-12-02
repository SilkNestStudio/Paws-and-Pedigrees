// Dog Personality System Types

export type PersonalityTrait =
  | 'playful' | 'calm' | 'energetic' | 'lazy'
  | 'social' | 'independent' | 'loyal' | 'stubborn'
  | 'brave' | 'timid' | 'curious' | 'cautious'
  | 'gentle' | 'rowdy' | 'focused' | 'easily_distracted';

export interface PersonalityTraitData {
  id: PersonalityTrait;
  name: string;
  description: string;
  icon: string;
  effects: PersonalityEffects;
  rarity: 'common' | 'uncommon' | 'rare';
}

export interface PersonalityEffects {
  // Training effects (multipliers, 1.0 = normal)
  trainingSpeed?: number;
  obedienceBonus?: number;
  focusBonus?: number;

  // Competition effects
  competitionConfidence?: number;
  stressResistance?: number;

  // Care effects
  happinessDecayRate?: number;
  energyDecayRate?: number;
  bondGainRate?: number;

  // Social effects
  breedingSuccess?: number;
  playfulness?: number;
}

export interface DogPersonality {
  primaryTrait: PersonalityTrait;
  secondaryTrait?: PersonalityTrait;
  quirks: string[]; // Fun flavor text like "loves belly rubs" or "afraid of thunder"
}

// Personality generation based on breed and genetics
export interface PersonalityWeights {
  [key: string]: number; // Trait ID -> probability weight
}
