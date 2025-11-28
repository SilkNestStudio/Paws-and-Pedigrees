import { Dog, Breed } from '../types';
import { BREEDING_CONSTANTS } from '../data/breedingConstants';
import { analyzeInbreeding } from './pedigreeAnalysis';
import {
  createGeneticsFromPhenotype,
  getRandomAllele,
  expressTrait,
  calculateGeneStatModifier,
  COAT_COLOR_DOMINANCE,
  COAT_PATTERN_DOMINANCE,
  EYE_COLOR_DOMINANCE,
  COAT_LENGTH_DOMINANCE,
  DogGenetics,
} from '../types/genetics';
import { checkSizeCompatibility } from '../data/sizeCompatibility';
import {
  calculatePuppyComposition,
  createPurebredComposition,
} from '../data/breedComposition';

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
  inbreeding: {
    isInbred: boolean;
    coefficient: number;
    relationship: string | null;
    penalty: number;
  } | null;
}

/**
 * Check if two dogs are eligible to breed together
 */
export function checkBreedingEligibility(
  dog1: Dog,
  dog2: Dog,
  userCash: number,
  allDogs?: Dog[]
): BreedingEligibility {
  const reasons: string[] = [];

  // Determine sire and dam
  const sire = dog1.gender === 'male' ? dog1 : dog2;
  const dam = dog1.gender === 'female' ? dog1 : dog2;

  // Check size compatibility (warning or blocking)
  const sizeCheck = checkSizeCompatibility(
    { avgWeight: sire.size, sex: sire.gender },
    { avgWeight: dam.size, sex: dam.gender }
  );

  if (sizeCheck.warningLevel === 'blocked') {
    reasons.push(sizeCheck.message);
  } else if (sizeCheck.warningLevel === 'warning' || sizeCheck.warningLevel === 'caution') {
    reasons.push(sizeCheck.message);
  }

  // Check for inbreeding (warning only, doesn't prevent breeding)
  if (allDogs && allDogs.length > 0) {
    const inbreeding = analyzeInbreeding(dog1, dog2, allDogs);
    if (inbreeding.isInbred && inbreeding.coefficient > 0.5) {
      reasons.push(`⚠️ WARNING: Dogs are ${inbreeding.relationship} (${(inbreeding.coefficient * 100).toFixed(0)}% inbreeding) - puppies will have reduced stats`);
    }
  }

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
export function previewGenetics(dog1: Dog, dog2: Dog, allDogs?: Dog[]): GeneticsPreview {
  const statNames = ['speed', 'agility', 'strength', 'endurance', 'intelligence', 'trainability'] as const;

  // Check for inbreeding
  let inbreedingData = null;
  let inbreedingPenalty = 0;
  if (allDogs && allDogs.length > 0) {
    const analysis = analyzeInbreeding(dog1, dog2, allDogs);
    if (analysis.isInbred) {
      inbreedingData = {
        isInbred: analysis.isInbred,
        coefficient: analysis.coefficient,
        relationship: analysis.relationship,
        penalty: analysis.penalty,
      };
      inbreedingPenalty = analysis.penalty;
    }
  }

  const statRanges = {} as GeneticsPreview['statRanges'];

  statNames.forEach((stat) => {
    const parent1Stat = dog1[stat];
    const parent2Stat = dog2[stat];
    const average = (parent1Stat + parent2Stat) / 2;
    const variance = average * BREEDING_CONSTANTS.STAT_VARIANCE;

    // Apply inbreeding penalty to the ranges
    const penaltyMultiplier = 1 - (inbreedingPenalty / 100);

    statRanges[stat] = {
      min: Math.round(Math.max(1, (average - variance) * penaltyMultiplier)),
      max: Math.round(Math.min(100, (average + variance) * penaltyMultiplier)),
    };
  });

  // Get genetics from both parents (create if they don't have it)
  const dog1Genetics = (dog1.genetics as DogGenetics) || createGeneticsFromPhenotype(
    dog1.coat_color,
    dog1.coat_pattern,
    dog1.eye_color,
    dog1.coat_type,
    {
      speed: dog1.speed,
      agility: dog1.agility,
      strength: dog1.strength,
      endurance: dog1.endurance,
      intelligence: dog1.intelligence,
      friendliness: dog1.friendliness,
      energy: dog1.energy,
      trainability: dog1.trainability,
    }
  );

  const dog2Genetics = (dog2.genetics as DogGenetics) || createGeneticsFromPhenotype(
    dog2.coat_color,
    dog2.coat_pattern,
    dog2.eye_color,
    dog2.coat_type,
    {
      speed: dog2.speed,
      agility: dog2.agility,
      strength: dog2.strength,
      endurance: dog2.endurance,
      intelligence: dog2.intelligence,
      friendliness: dog2.friendliness,
      energy: dog2.energy,
      trainability: dog2.trainability,
    }
  );

  // Possible colors based on genetics
  const possibleColors = Array.from(new Set([
    dog1Genetics.coatColor.allele1,
    dog1Genetics.coatColor.allele2,
    dog2Genetics.coatColor.allele1,
    dog2Genetics.coatColor.allele2,
  ]));

  // Possible patterns based on genetics
  const possiblePatterns = Array.from(new Set([
    dog1Genetics.coatPattern.allele1,
    dog1Genetics.coatPattern.allele2,
    dog2Genetics.coatPattern.allele1,
    dog2Genetics.coatPattern.allele2,
  ]));

  return {
    statRanges,
    possibleColors,
    possiblePatterns,
    litterSize: {
      min: BREEDING_CONSTANTS.LITTER_SIZE_MIN,
      max: BREEDING_CONSTANTS.LITTER_SIZE_MAX,
    },
    inbreeding: inbreedingData,
  };
}

/**
 * Generate a single puppy from two parent dogs
 */
export function generatePuppy(
  sire: Dog,
  dam: Dog,
  sireBreed: Breed,
  damBreed: Breed,
  userId: string,
  name?: string,
  allDogs?: Dog[]
): Dog {
  const gender: 'male' | 'female' = Math.random() > 0.5 ? 'male' : 'female';

  // Check for inbreeding and calculate penalty
  let inbreedingPenalty = 0;
  if (allDogs && allDogs.length > 0) {
    const analysis = analyzeInbreeding(sire, dam, allDogs);
    inbreedingPenalty = analysis.penalty;
  }

  const penaltyMultiplier = 1 - (inbreedingPenalty / 100);

  // Calculate breed composition
  // Get parent compositions (create if not existing - legacy dogs)
  const sireComposition = sire.breed_composition || createPurebredComposition(sire.breed_id, sireBreed.name);
  const damComposition = dam.breed_composition || createPurebredComposition(dam.breed_id, damBreed.name);

  // Calculate puppy composition
  const puppyComposition = calculatePuppyComposition(
    sireComposition,
    damComposition,
    sire.breed_id,
    dam.breed_id,
    sireBreed.name,
    damBreed.name
  );

  // Get primary breed ID for database purposes
  const puppyBreedId = puppyComposition.portions[0].breedId;

  // Check for hybrid vigor bonus (applies to F1 designer breeds)
  let hybridVigorBonus = 1.0; // Default multiplier
  if (puppyComposition.isDesignerBreed && puppyComposition.designerBreedInfo) {
    const bonusPercentage = puppyComposition.designerBreedInfo.hybridVigorBonus;
    hybridVigorBonus = 1 + (bonusPercentage / 100);
  }

  // Get genetics from both parents (create if they don't have it)
  const sireGenetics = (sire.genetics as DogGenetics) || createGeneticsFromPhenotype(
    sire.coat_color,
    sire.coat_pattern,
    sire.eye_color,
    sire.coat_type,
    {
      speed: sire.speed,
      agility: sire.agility,
      strength: sire.strength,
      endurance: sire.endurance,
      intelligence: sire.intelligence,
      friendliness: sire.friendliness,
      energy: sire.energy,
      trainability: sire.trainability,
    }
  );

  const damGenetics = (dam.genetics as DogGenetics) || createGeneticsFromPhenotype(
    dam.coat_color,
    dam.coat_pattern,
    dam.eye_color,
    dam.coat_type,
    {
      speed: dam.speed,
      agility: dam.agility,
      strength: dam.strength,
      endurance: dam.endurance,
      intelligence: dam.intelligence,
      friendliness: dam.friendliness,
      energy: dam.energy,
      trainability: dam.trainability,
    }
  );

  // Create puppy genetics by combining parent alleles
  const puppyGenetics: DogGenetics = {
    coatColor: {
      trait: 'coatColor',
      allele1: getRandomAllele(sireGenetics.coatColor),
      allele2: getRandomAllele(damGenetics.coatColor),
      dominance: COAT_COLOR_DOMINANCE,
    },
    coatPattern: {
      trait: 'coatPattern',
      allele1: getRandomAllele(sireGenetics.coatPattern),
      allele2: getRandomAllele(damGenetics.coatPattern),
      dominance: COAT_PATTERN_DOMINANCE,
    },
    coatLength: {
      trait: 'coatLength',
      allele1: getRandomAllele(sireGenetics.coatLength),
      allele2: getRandomAllele(damGenetics.coatLength),
      dominance: COAT_LENGTH_DOMINANCE,
    },
    eyeColor: {
      trait: 'eyeColor',
      allele1: getRandomAllele(sireGenetics.eyeColor),
      allele2: getRandomAllele(damGenetics.eyeColor),
      dominance: EYE_COLOR_DOMINANCE,
    },
    sizeGene: {
      trait: 'size',
      allele1: getRandomAllele(sireGenetics.sizeGene),
      allele2: getRandomAllele(damGenetics.sizeGene),
      dominance: {},
    },
    speedGene: {
      trait: 'speed',
      allele1: getRandomAllele(sireGenetics.speedGene),
      allele2: getRandomAllele(damGenetics.speedGene),
      dominance: sireGenetics.speedGene.dominance,
    },
    agilityGene: {
      trait: 'agility',
      allele1: getRandomAllele(sireGenetics.agilityGene),
      allele2: getRandomAllele(damGenetics.agilityGene),
      dominance: sireGenetics.agilityGene.dominance,
    },
    strengthGene: {
      trait: 'strength',
      allele1: getRandomAllele(sireGenetics.strengthGene),
      allele2: getRandomAllele(damGenetics.strengthGene),
      dominance: sireGenetics.strengthGene.dominance,
    },
    enduranceGene: {
      trait: 'endurance',
      allele1: getRandomAllele(sireGenetics.enduranceGene),
      allele2: getRandomAllele(damGenetics.enduranceGene),
      dominance: sireGenetics.enduranceGene.dominance,
    },
    intelligenceGene: {
      trait: 'intelligence',
      allele1: getRandomAllele(sireGenetics.intelligenceGene),
      allele2: getRandomAllele(damGenetics.intelligenceGene),
      dominance: sireGenetics.intelligenceGene.dominance,
    },
    friendlinessGene: {
      trait: 'friendliness',
      allele1: getRandomAllele(sireGenetics.friendlinessGene),
      allele2: getRandomAllele(damGenetics.friendlinessGene),
      dominance: sireGenetics.friendlinessGene.dominance,
    },
    energyGene: {
      trait: 'energy',
      allele1: getRandomAllele(sireGenetics.energyGene),
      allele2: getRandomAllele(damGenetics.energyGene),
      dominance: sireGenetics.energyGene.dominance,
    },
    trainabilityGene: {
      trait: 'trainability',
      allele1: getRandomAllele(sireGenetics.trainabilityGene),
      allele2: getRandomAllele(damGenetics.trainabilityGene),
      dominance: sireGenetics.trainabilityGene.dominance,
    },
  };

  // Express phenotype from genotype
  const coatColor = expressTrait(
    puppyGenetics.coatColor.allele1,
    puppyGenetics.coatColor.allele2,
    COAT_COLOR_DOMINANCE
  );
  const coatPattern = expressTrait(
    puppyGenetics.coatPattern.allele1,
    puppyGenetics.coatPattern.allele2,
    COAT_PATTERN_DOMINANCE
  );
  const eyeColor = expressTrait(
    puppyGenetics.eyeColor.allele1,
    puppyGenetics.eyeColor.allele2,
    EYE_COLOR_DOMINANCE
  );
  const coatLength = expressTrait(
    puppyGenetics.coatLength.allele1,
    puppyGenetics.coatLength.allele2,
    COAT_LENGTH_DOMINANCE
  );

  // Map coat length to coat type
  const coatTypeMap: Record<string, string> = {
    'short': 'short',
    'medium': 'medium',
    'long': 'long',
  };
  const coatType = coatTypeMap[coatLength] || 'short';

  // Inherit stats with genetics and variance
  const inheritStat = (stat1: number, stat2: number, gene: { allele1: string; allele2: string }): number => {
    const average = (stat1 + stat2) / 2;
    const variance = average * BREEDING_CONSTANTS.STAT_VARIANCE;
    const min = Math.max(1, average - variance);
    const max = Math.min(100, average + variance);

    // Get base value
    let value = Math.round(min + Math.random() * (max - min));

    // Apply gene modifier
    const geneModifier = calculateGeneStatModifier(gene.allele1, gene.allele2);
    value = Math.round(value * geneModifier);

    // Apply hybrid vigor bonus (before penalties)
    value = Math.round(value * hybridVigorBonus);

    // Apply inbreeding penalty
    value = Math.round(value * penaltyMultiplier);

    return Math.max(1, Math.min(100, value));
  };

  // Generate puppy name if not provided
  const puppyName = name || `Puppy ${crypto.randomUUID().slice(0, 4)}`;

  return {
    id: crypto.randomUUID(),
    user_id: userId,
    breed_id: puppyBreedId, // Use primary breed from composition
    name: puppyName,
    gender,
    birth_date: new Date().toISOString(),

    // Inherited stats using genetics
    size: inheritStat(sire.size, dam.size, puppyGenetics.sizeGene),
    energy: inheritStat(sire.energy, dam.energy, puppyGenetics.energyGene),
    friendliness: inheritStat(sire.friendliness, dam.friendliness, puppyGenetics.friendlinessGene),
    trainability: inheritStat(sire.trainability, dam.trainability, puppyGenetics.trainabilityGene),
    intelligence: inheritStat(sire.intelligence, dam.intelligence, puppyGenetics.intelligenceGene),
    speed: inheritStat(sire.speed, dam.speed, puppyGenetics.speedGene),
    agility: inheritStat(sire.agility, dam.agility, puppyGenetics.agilityGene),
    strength: inheritStat(sire.strength, dam.strength, puppyGenetics.strengthGene),
    endurance: inheritStat(sire.endurance, dam.endurance, puppyGenetics.enduranceGene),
    prey_drive: Math.round((inheritStat(sire.prey_drive, dam.prey_drive, puppyGenetics.energyGene))),
    protectiveness: Math.round((inheritStat(sire.protectiveness, dam.protectiveness, puppyGenetics.strengthGene))),

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
    thirst: 100,
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

    // Breed composition (track breed percentages and designer breeds)
    breed_composition: puppyComposition,

    // Genetics (store the full genetics object)
    genetics: puppyGenetics,

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
  userId: string,
  allDogs?: Dog[]
): Dog[] {
  const litterSize =
    BREEDING_CONSTANTS.LITTER_SIZE_MIN +
    Math.floor(Math.random() * (BREEDING_CONSTANTS.LITTER_SIZE_MAX - BREEDING_CONSTANTS.LITTER_SIZE_MIN + 1));

  const puppies: Dog[] = [];

  for (let i = 0; i < litterSize; i++) {
    puppies.push(generatePuppy(sire, dam, sireBreed, damBreed, userId, undefined, allDogs));
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
