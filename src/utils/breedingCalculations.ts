import { Dog, Breed } from '../types';
import { BREEDING_CONSTANTS } from '../data/breedingConstants';

export interface BreedingEligibility {
  canBreed: boolean;
  reasons: string[];
}

export interface GeneticsPreview {
  statRanges: {
    speed: { min: number; max: number };
    agility: { min: number; max: number };
    strength: { min: number; max: number };
    endurance: { min: number; max: number };
    intelligence: { min: number; max: number };
    trainability: { min: number; max: number };
  };
  possibleColors: string[];
  possiblePatterns: string[];
  litterSize: { min: number; max: number };
}

/**
 * Check if two dogs are eligible to breed together
 */
export function checkBreedingEligibility(
  dog1: Dog,
  dog2: Dog,
  userCash: number
): BreedingEligibility {
  const reasons: string[] = [];

  // Must be different dogs
  if (dog1.id === dog2.id) {
    reasons.push('Cannot breed a dog with itself');
  }

  // Must be opposite genders
  if (dog1.gender === dog2.gender) {
    reasons.push('Must be male and female to breed');
  }

  // Both must be old enough (52 weeks = 1 year)
  if (dog1.age_weeks < BREEDING_CONSTANTS.MIN_BREEDING_AGE) {
    reasons.push(`${dog1.name} is too young (needs ${BREEDING_CONSTANTS.MIN_BREEDING_AGE} weeks, has ${dog1.age_weeks})`);
  }
  if (dog2.age_weeks < BREEDING_CONSTANTS.MIN_BREEDING_AGE) {
    reasons.push(`${dog2.name} is too young (needs ${BREEDING_CONSTANTS.MIN_BREEDING_AGE} weeks, has ${dog2.age_weeks})`);
  }

  // Both must have high enough bond
  if (dog1.bond_level < BREEDING_CONSTANTS.MIN_BOND_LEVEL) {
    reasons.push(`${dog1.name} needs bond level ${BREEDING_CONSTANTS.MIN_BOND_LEVEL} (has ${dog1.bond_level})`);
  }
  if (dog2.bond_level < BREEDING_CONSTANTS.MIN_BOND_LEVEL) {
    reasons.push(`${dog2.name} needs bond level ${BREEDING_CONSTANTS.MIN_BOND_LEVEL} (has ${dog2.bond_level})`);
  }

  // Both must have high enough health
  if (dog1.health < BREEDING_CONSTANTS.MIN_HEALTH) {
    reasons.push(`${dog1.name} needs ${BREEDING_CONSTANTS.MIN_HEALTH}% health (has ${dog1.health}%)`);
  }
  if (dog2.health < BREEDING_CONSTANTS.MIN_HEALTH) {
    reasons.push(`${dog2.name} needs ${BREEDING_CONSTANTS.MIN_HEALTH}% health (has ${dog2.health}%)`);
  }

  // Female cannot already be pregnant
  const female = dog1.gender === 'female' ? dog1 : dog2;
  if (female.is_pregnant) {
    reasons.push(`${female.name} is already pregnant`);
  }

  // Check cooldowns
  const male = dog1.gender === 'male' ? dog1 : dog2;
  if (female.last_bred) {
    const weeksSinceBreed = getWeeksSince(female.last_bred);
    if (weeksSinceBreed < BREEDING_CONSTANTS.FEMALE_COOLDOWN) {
      const weeksRemaining = BREEDING_CONSTANTS.FEMALE_COOLDOWN - weeksSinceBreed;
      reasons.push(`${female.name} needs to wait ${Math.ceil(weeksRemaining)} more weeks`);
    }
  }
  if (male.last_bred) {
    const weeksSinceBreed = getWeeksSince(male.last_bred);
    if (weeksSinceBreed < BREEDING_CONSTANTS.MALE_COOLDOWN) {
      const weeksRemaining = BREEDING_CONSTANTS.MALE_COOLDOWN - weeksSinceBreed;
      reasons.push(`${male.name} needs to wait ${Math.ceil(weeksRemaining)} more weeks`);
    }
  }

  // Must have enough cash
  if (userCash < BREEDING_CONSTANTS.BREEDING_FEE) {
    reasons.push(`Need $${BREEDING_CONSTANTS.BREEDING_FEE} (have $${userCash})`);
  }

  return {
    canBreed: reasons.length === 0,
    reasons,
  };
}

/**
 * Calculate weeks since a date
 */
function getWeeksSince(dateString: string): number {
  const then = new Date(dateString);
  const now = new Date();
  const msDiff = now.getTime() - then.getTime();
  const daysDiff = msDiff / (1000 * 60 * 60 * 24);
  return daysDiff / 7;
}

/**
 * Preview genetics of potential offspring
 */
export function previewGenetics(dog1: Dog, dog2: Dog): GeneticsPreview {
  const statNames = ['speed', 'agility', 'strength', 'endurance', 'intelligence', 'trainability'] as const;

  const statRanges = {} as GeneticsPreview['statRanges'];

  statNames.forEach((stat) => {
    const parent1Stat = dog1[stat];
    const parent2Stat = dog2[stat];
    const average = (parent1Stat + parent2Stat) / 2;
    const variance = average * BREEDING_CONSTANTS.STAT_VARIANCE;

    statRanges[stat] = {
      min: Math.round(Math.max(1, average - variance)),
      max: Math.round(Math.min(100, average + variance)),
    };
  });

  // Possible colors - combine both parents' colors
  const possibleColors = Array.from(new Set([dog1.coat_color, dog2.coat_color]));

  // Possible patterns - combine both parents' patterns
  const possiblePatterns = Array.from(new Set([dog1.coat_pattern, dog2.coat_pattern]));

  return {
    statRanges,
    possibleColors,
    possiblePatterns,
    litterSize: {
      min: BREEDING_CONSTANTS.LITTER_SIZE_MIN,
      max: BREEDING_CONSTANTS.LITTER_SIZE_MAX,
    },
  };
}

/**
 * Generate a single puppy from two parent dogs
 */
export function generatePuppy(
  sire: Dog,
  dam: Dog,
  sireBre: Breed,
  damBreed: Breed,
  userId: string,
  name?: string
): Dog {
  const gender: 'male' | 'female' = Math.random() > 0.5 ? 'male' : 'female';

  // Inherit stats with variance
  const inheritStat = (stat1: number, stat2: number): number => {
    const average = (stat1 + stat2) / 2;
    const variance = average * BREEDING_CONSTANTS.STAT_VARIANCE;
    const min = Math.max(1, average - variance);
    const max = Math.min(100, average + variance);
    return Math.round(min + Math.random() * (max - min));
  };

  // Randomly choose coat attributes from parents
  const coatColor = Math.random() > 0.5 ? sire.coat_color : dam.coat_color;
  const coatPattern = Math.random() > 0.5 ? sire.coat_pattern : dam.coat_pattern;
  const coatType = Math.random() > 0.5 ? sire.coat_type : dam.coat_type;
  const eyeColor = Math.random() > 0.5 ? sire.eye_color : dam.eye_color;

  // Generate puppy name if not provided
  const puppyName = name || `Puppy ${crypto.randomUUID().slice(0, 4)}`;

  return {
    id: crypto.randomUUID(),
    user_id: userId,
    breed_id: sire.breed_id, // Use sire's breed (or could randomly choose)
    name: puppyName,
    gender,
    birth_date: new Date().toISOString(),

    // Inherited stats
    size: inheritStat(sire.size, dam.size),
    energy: inheritStat(sire.energy, dam.energy),
    friendliness: inheritStat(sire.friendliness, dam.friendliness),
    trainability: inheritStat(sire.trainability, dam.trainability),
    intelligence: inheritStat(sire.intelligence, dam.intelligence),
    speed: inheritStat(sire.speed, dam.speed),
    agility: inheritStat(sire.agility, dam.agility),
    strength: inheritStat(sire.strength, dam.strength),
    endurance: inheritStat(sire.endurance, dam.endurance),
    prey_drive: inheritStat(sire.prey_drive, dam.prey_drive),
    protectiveness: inheritStat(sire.protectiveness, dam.protectiveness),

    // Trained stats (start at 0)
    speed_trained: 0,
    agility_trained: 0,
    strength_trained: 0,
    endurance_trained: 0,
    obedience_trained: 0,

    // Appearance (inherited from parents)
    coat_type: coatType,
    coat_color: coatColor,
    coat_pattern: coatPattern,
    eye_color: eyeColor,

    // Care stats (puppies start healthy and happy)
    hunger: 100,
    happiness: 100,
    energy_stat: 100,
    health: 100,

    // Training
    training_points: 100,
    training_sessions_today: 0,
    last_training_reset: new Date().toISOString(),

    // Bond (start at 1 since born into your kennel)
    bond_level: 1,
    bond_xp: 0,

    // Origin (bred, not rescue)
    is_rescue: false,
    rescue_story: undefined,
    parent1_id: sire.id,
    parent2_id: dam.id,

    // Breeding fields (puppy starts at 0 weeks)
    age_weeks: 0,
    is_pregnant: false,
    pregnancy_due: undefined,
    last_bred: undefined,
    litter_size: undefined,

    created_at: new Date().toISOString(),
    last_fed: new Date().toISOString(),
    last_played: new Date().toISOString(),
  };
}

/**
 * Generate a full litter of puppies
 */
export function generateLitter(
  sire: Dog,
  dam: Dog,
  sireBreed: Breed,
  damBreed: Breed,
  userId: string
): Dog[] {
  const litterSize =
    BREEDING_CONSTANTS.LITTER_SIZE_MIN +
    Math.floor(Math.random() * (BREEDING_CONSTANTS.LITTER_SIZE_MAX - BREEDING_CONSTANTS.LITTER_SIZE_MIN + 1));

  const puppies: Dog[] = [];

  for (let i = 0; i < litterSize; i++) {
    puppies.push(generatePuppy(sire, dam, sireBreed, damBreed, userId));
  }

  return puppies;
}

/**
 * Calculate pregnancy due date
 */
export function calculatePregnancyDueDate(): string {
  const now = new Date();
  const dueDate = new Date(now.getTime() + BREEDING_CONSTANTS.PREGNANCY_DURATION * 7 * 24 * 60 * 60 * 1000);
  return dueDate.toISOString();
}

/**
 * Check if pregnancy is complete
 */
export function isPregnancyComplete(pregnancyDue: string): boolean {
  const dueDate = new Date(pregnancyDue);
  const now = new Date();
  return now >= dueDate;
}

/**
 * Get weeks remaining in pregnancy
 */
export function getWeeksRemaining(pregnancyDue: string): number {
  const dueDate = new Date(pregnancyDue);
  const now = new Date();
  const msDiff = dueDate.getTime() - now.getTime();
  const daysDiff = msDiff / (1000 * 60 * 60 * 24);
  return Math.max(0, Math.ceil(daysDiff / 7));
}
